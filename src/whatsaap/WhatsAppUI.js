// src/whatsapp/WhatsAppUI.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Box,
  Stack,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Paper,
  CircularProgress,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Chip,
  Autocomplete,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import { io } from "socket.io-client";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

/* -----------------------------
   Helpers
------------------------------ */
function digitsOnly(v = "") {
  return String(v || "").replace(/\D/g, "");
}
function phoneLabel(v = "") {
  const p = digitsOnly(v);
  return p.length >= 10 ? p.slice(-10) : p;
}
function roomForPhone10(p10) {
  return `wa:${String(p10 || "").slice(-10)}`;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || `Request failed: ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatLastActive(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusChipProps(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s.includes("APPROV"))
    return { label: "APPROVED", sx: { bgcolor: "#e7fbf2", color: "#1b7f4b" } };
  if (s.includes("REJECT"))
    return { label: "REJECTED", sx: { bgcolor: "#ffeceb", color: "#b42318" } };
  if (s.includes("PEND") || s.includes("SUBMIT") || s.includes("REVIEW"))
    return { label: "PENDING", sx: { bgcolor: "#fff3dc", color: "#a15c07" } };
  return { label: s || "UNKNOWN", sx: { bgcolor: "#f4f6f8", color: "#344054" } };
}

function pickBodyTextFromTemplate(tpl) {
  if (!tpl) return "";
  if (tpl.body) return String(tpl.body || "");
  const comps =
    (Array.isArray(tpl.components) && tpl.components) ||
    (Array.isArray(tpl.raw360?.components) && tpl.raw360.components) ||
    (Array.isArray(tpl.raw360?.template?.components) && tpl.raw360.template.components) ||
    [];
  const body = comps.find((c) => String(c?.type || "").toUpperCase() === "BODY");
  return String(body?.text || "");
}

function extractVarIndexes(bodyText = "") {
  const text = String(bodyText || "");
  const set = new Set();
  for (const m of text.matchAll(/{{\s*(\d+)\s*}}/g)) {
    const n = Number(m[1] || 0);
    if (n > 0) set.add(n);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function applyVarsToBody(bodyText = "", varsMap = {}) {
  let out = String(bodyText || "");
  for (const [k, v] of Object.entries(varsMap)) {
    const idx = Number(k);
    if (!idx) continue;
    const safe = String(v ?? "");
    out = out.replace(new RegExp(`{{\\s*${idx}\\s*}}`, "g"), safe || `{{${idx}}}`);
  }
  return out;
}

function msgKey(m) {
  return m?.waId || m?._id || `${m?.direction || "X"}_${m?.timestamp || ""}_${m?.text || ""}`;
}

/* -----------------------------
   Name helpers
------------------------------ */
function nameInitials(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return (parts[0][0] || "?").toUpperCase();
  return `${(parts[0][0] || "").toUpperCase()}${(parts[parts.length - 1][0] || "").toUpperCase()}`;
}
function chatDisplayName(chat) {
  return chat?.displayName || phoneLabel(chat?.phone);
}
function assignedToText(chat) {
  return `Assigned To: ${chat?.assignedToLabel || "—"}`;
}

/* -----------------------------
   Unread badge (WhatsApp-like)
------------------------------ */
function UnreadBadge({ count }) {
  const n = Number(count || 0);
  if (!n) return null;
  const label = n > 99 ? "99+" : String(n);
  return (
    <Box
      sx={{
        ml: 1,
        minWidth: 22,
        height: 22,
        px: 0.75,
        borderRadius: 999,
        bgcolor: "#25D366",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 900,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {label}
    </Box>
  );
}

/* =========================================================
   Component
========================================================= */
export default function WhatsAppUI() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [search, setSearch] = useState("");
  const [errorChats, setErrorChats] = useState("");
  const [errorMessages, setErrorMessages] = useState("");

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [newChatError, setNewChatError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const [tplVars, setTplVars] = useState({});

  const bottomRef = useRef(null);
  const prevLenRef = useRef(0);

  // WhatsApp-like scroll behavior
  const isNearBottomRef = useRef(true);

  // "Unread highlight" cutoff
  const openedCutoffRef = useRef(0);

  // Socket
  const socketRef = useRef(null);
  const joinedRoomRef = useRef(null);

  const activePhoneDigits = useMemo(() => digitsOnly(activeChat?.phone), [activeChat?.phone]);
  const activePhone10 = useMemo(() => phoneLabel(activeChat?.phone), [activeChat?.phone]);

  const activeConversation = useMemo(() => {
    if (!activeChat?.phone) return null;
    const p = phoneLabel(activeChat.phone);
    return conversations.find((c) => phoneLabel(c.phone) === p) || null;
  }, [activeChat?.phone, conversations]);

  const activeHeaderTitle = useMemo(() => {
    if (!activeChat?.phone) return "Select a chat";
    const name = activeConversation ? chatDisplayName(activeConversation) : phoneLabel(activeChat.phone);
    const num = phoneLabel(activeChat.phone);
    if (!name || name === num) return num || "—";
    return `${name} (${num})`;
  }, [activeChat?.phone, activeConversation]);

  const filteredConversations = useMemo(() => {
    const s10 = phoneLabel(search);
    const q = String(search || "").trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const p = phoneLabel(c.phone);
      const nm = String(c.displayName || "").toLowerCase();
      return p.includes(s10) || nm.includes(q);
    });
  }, [conversations, search]);

  const canShowQuickChat = useMemo(() => phoneLabel(search).length === 10, [search]);

  const sortedConversations = useMemo(() => {
    const list = filteredConversations.slice();
    list.sort((a, b) => {
      const au = Number(a?.unreadCount || 0) > 0 ? 1 : 0;
      const bu = Number(b?.unreadCount || 0) > 0 ? 1 : 0;
      if (au !== bu) return bu - au;
      const at = new Date(a?.lastMessageAt || 0).getTime();
      const bt = new Date(b?.lastMessageAt || 0).getTime();
      return bt - at;
    });
    return list;
  }, [filteredConversations]);

  /* -----------------------------
     Fetch: Conversations (no interval)
  ------------------------------ */
  const refreshConversations = useCallback(async (selectPhone = null, { silent = false } = {}) => {
    setErrorChats("");
    if (!silent) setLoadingChats(true);

    try {
      const sessionData = sessionStorage.getItem("user");
      const userObj = sessionData ? JSON.parse(sessionData) : null;

      const userName = userObj?.fullName || "";
      const userRole = userObj?.role || "";

      const queryParams = new URLSearchParams({ role: userRole, userName }).toString();
      const data = (await api(`/api/whatsapp/conversations?${queryParams}`)) || [];
      const list = Array.isArray(data) ? data : [];

      setConversations((prev) => {
        // prevent “refresh flicker” if same data
        const prevKey = prev.map((c) => `${phoneLabel(c.phone)}:${c.lastMessageAt}:${c.unreadCount}`).join("|");
        const nextKey = list.map((c) => `${phoneLabel(c.phone)}:${c.lastMessageAt}:${c.unreadCount}`).join("|");
        if (prevKey === nextKey) return prev;
        return list;
      });

      if (selectPhone) setActiveChat({ phone: selectPhone });
      else if (!activeChat?.phone && list.length) setActiveChat({ phone: digitsOnly(list[0].phone) });
    } catch (e) {
      setErrorChats(e.message || "Failed to load conversations");
      if (!silent) setConversations([]);
    } finally {
      if (!silent) setLoadingChats(false);
    }
  }, [activeChat?.phone]);

  /* -----------------------------
     Fetch: Messages (only on open)
  ------------------------------ */
  const loadMessagesInitial = useCallback(async (phoneAnyDigits) => {
    const q = digitsOnly(phoneAnyDigits);
    if (!q) return;

    setErrorMessages("");
    setLoadingMessages(true);
    try {
      const data = (await api(`/api/whatsapp/messages?phone=${encodeURIComponent(q)}`)) || [];
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setErrorMessages(e.message || "Failed to load messages");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  /* -----------------------------
     Templates
  ------------------------------ */
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const data = await api(`/api/whatsapp/templates`);
      setTemplates(Array.isArray(data) ? data : data?.templates || []);
    } catch (e) {
      console.error("Fetch templates failed:", e);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  /* -----------------------------
     Mark read (optimistic)
  ------------------------------ */
  const markConversationRead = useCallback(async (phoneDigits, { optimisticOnly = false } = {}) => {
    const p10 = phoneLabel(phoneDigits);
    const nowIso = new Date().toISOString();

    setConversations((prev) =>
      prev.map((c) =>
        phoneLabel(c.phone) === p10 ? { ...c, unreadCount: 0, lastReadAt: nowIso } : c
      )
    );

    if (optimisticOnly) return;

    try {
      await api(`/api/whatsapp/conversations/mark-read`, {
        method: "POST",
        body: JSON.stringify({ phone: phoneDigits }),
      });
    } catch {
      // ignore
    }
  }, []);

  /* -----------------------------
     Boot: initial fetch
  ------------------------------ */
  useEffect(() => {
    refreshConversations(null, { silent: false });
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -----------------------------
     Socket: connect once
  ------------------------------ */
  useEffect(() => {
    const s = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = s;

    return () => {
      try {
        s.disconnect();
      } catch {}
      socketRef.current = null;
      joinedRoomRef.current = null;
    };
  }, []);

  /* -----------------------------
     Socket: join/leave room on active chat change
  ------------------------------ */
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const p10 = activePhone10;
    const nextRoom = p10 ? roomForPhone10(p10) : null;

    // leave previous
    if (joinedRoomRef.current && joinedRoomRef.current !== nextRoom) {
      s.emit("wa:leave", { phone10: joinedRoomRef.current.replace("wa:", "") });
      joinedRoomRef.current = null;
    }

    // join new
    if (nextRoom && joinedRoomRef.current !== nextRoom) {
      s.emit("wa:join", { phone10: p10 });
      joinedRoomRef.current = nextRoom;
    }
  }, [activePhone10]);

  /* -----------------------------
     Socket: listeners
  ------------------------------ */
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onMessage = (msg) => {
      // message belongs to active chat?
      const msgP10 = phoneLabel(msg?.to || msg?.from);
      if (!activePhone10 || msgP10 !== activePhone10) {
        // still update sidebar preview + unread counts via conversation patch events ideally
        // but if backend doesn't send patch, do minimal here:
        setConversations((prev) => {
          const idx = prev.findIndex((c) => phoneLabel(c.phone) === msgP10);
          if (idx === -1) return prev;
          const next = [...prev];
          const existing = next[idx];
          const isInbound = msg?.direction === "INBOUND";
          next[idx] = {
            ...existing,
            lastMessageAt: msg?.timestamp || new Date().toISOString(),
            lastMessageText: String(msg?.text || "").slice(0, 200),
            unreadCount: isInbound ? Number(existing?.unreadCount || 0) + 1 : existing?.unreadCount || 0,
          };
          return next;
        });
        return;
      }

      // append message
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => msgKey(m)));
        const k = msgKey(msg);
        if (seen.has(k)) return prev;
        return [...prev, msg];
      });

      // if inbound and open chat -> mark read
      if (msg?.direction === "INBOUND") {
        markConversationRead(activePhone10, { optimisticOnly: false });
      }

      // update preview
      setConversations((prev) =>
        prev.map((c) =>
          phoneLabel(c.phone) === activePhone10
            ? {
                ...c,
                lastMessageAt: msg?.timestamp || new Date().toISOString(),
                lastMessageText: String(msg?.text || "").slice(0, 200),
              }
            : c
        )
      );
    };

    const onStatus = ({ waId, status }) => {
      setMessages((prev) => prev.map((m) => (m.waId === waId ? { ...m, status } : m)));
    };

    const onConversation = ({ phone, patch }) => {
      const p10 = phoneLabel(phone);
      setConversations((prev) => prev.map((c) => (phoneLabel(c.phone) === p10 ? { ...c, ...patch } : c)));
    };

    s.on("wa:message", onMessage);
    s.on("wa:status", onStatus);
    s.on("wa:conversation", onConversation);

    return () => {
      s.off("wa:message", onMessage);
      s.off("wa:status", onStatus);
      s.off("wa:conversation", onConversation);
    };
  }, [activePhone10, markConversationRead]);

  /* -----------------------------
     When active chat changes: load messages once
  ------------------------------ */
  useEffect(() => {
    if (!activePhoneDigits) return;
    setSessionExpired(false);
    setErrorMessages("");
    setMessages([]);
    loadMessagesInitial(activePhoneDigits);
  }, [activePhoneDigits, loadMessagesInitial]);

  /* -----------------------------
     Auto-scroll only when new arrives AND user near bottom
  ------------------------------ */
  useEffect(() => {
    if (messages.length > prevLenRef.current && isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  const onChatScroll = (e) => {
    const el = e.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distance < 120;
  };

  /* -----------------------------
     Mark read after initial load (open chat)
  ------------------------------ */
  useEffect(() => {
    if (!activePhoneDigits) return;
    if (loadingMessages) return;
    const unread = Number(activeConversation?.unreadCount || 0);
    if (unread > 0) markConversationRead(activePhoneDigits);
  }, [activePhoneDigits, loadingMessages, activeConversation?.unreadCount, markConversationRead]);

  /* -----------------------------
     UI actions
  ------------------------------ */
  const openChat = (phone) => {
    const p = digitsOnly(phone);
    if (!p) return;

    const conv = conversations.find((c) => phoneLabel(c.phone) === phoneLabel(p));
    openedCutoffRef.current = conv?.lastReadAt ? new Date(conv.lastReadAt).getTime() : 0;

    setActiveChat({ phone: p });
    setSearch("");
  };

  const updateConversationPreviewLocal = (phoneDigits, lastMessageText) => {
    const nowIso = new Date().toISOString();
    setConversations((prev) => {
      const pLabel = phoneLabel(phoneDigits);
      const idx = prev.findIndex((c) => phoneLabel(c.phone) === pLabel);

      if (idx === -1) {
        return [
          {
            phone: phoneDigits,
            lastMessageAt: nowIso,
            lastMessageText: lastMessageText?.slice?.(0, 200) || "",
            unreadCount: 0,
          },
          ...prev,
        ];
      }

      const next = [...prev];
      next[idx] = {
        ...next[idx],
        phone: next[idx].phone || phoneDigits,
        lastMessageAt: nowIso,
        lastMessageText: lastMessageText?.slice?.(0, 200) || next[idx].lastMessageText || "",
      };

      const [item] = next.splice(idx, 1);
      return [item, ...next];
    });
  };

  const sendText = async () => {
    const to = digitsOnly(activeChat?.phone);
    const text = input.trim();
    if (!to || !text) return;

    const optimistic = {
      _id: `tmp_${Date.now()}`,
      direction: "OUTBOUND",
      text,
      timestamp: new Date().toISOString(),
      status: "sent",
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    updateConversationPreviewLocal(to, text);

    try {
      await api(`/api/whatsapp/send-text`, {
        method: "POST",
        body: JSON.stringify({ to, text }),
      });

      // No polling needed. Backend emits wa:message and/or wa:conversation patch.
      // If provider response isn't pushing immediately, do ONE silent sync:
      refreshConversations(null, { silent: true });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setInput(text);

      if (e.data?.code === "SESSION_EXPIRED") {
        setSessionExpired(true);
        setErrorMessages("Session expired. Please send a template message.");
      } else {
        setErrorMessages(e.message || "Send failed");
      }
    }
  };

  const templateOptions = useMemo(() => {
    const list = Array.isArray(templates) ? templates : [];
    return list.sort((a, b) => {
      const as = String(a?.status || "").toUpperCase();
      const bs = String(b?.status || "").toUpperCase();
      const aApproved = as.includes("APPROV") ? 1 : 0;
      const bApproved = bs.includes("APPROV") ? 1 : 0;
      if (aApproved !== bApproved) return bApproved - aApproved;
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });
  }, [templates]);

  useEffect(() => {
    const body = pickBodyTextFromTemplate(selectedTemplate);
    const idxs = extractVarIndexes(body);
    const next = {};
    idxs.forEach((i) => (next[String(i)] = ""));
    setTplVars(next);
  }, [selectedTemplate]);

  const previewBody = useMemo(() => {
    const body = pickBodyTextFromTemplate(selectedTemplate);
    return applyVarsToBody(body, tplVars);
  }, [selectedTemplate, tplVars]);

  const startNewChatWithTemplate = async () => {
    const to = digitsOnly(newChatPhone);
    if (!to) return setNewChatError("Enter phone number");
    if (!selectedTemplate) return setNewChatError("Select a template");

    const body = pickBodyTextFromTemplate(selectedTemplate);
    const idxs = extractVarIndexes(body);
    const params = idxs.map((i) => tplVars[String(i)]?.trim());
    if (params.some((v) => !v)) return setNewChatError("Fill all template variables");

    setCreatingChat(true);
    setNewChatError("");

    try {
      await api(`/api/whatsapp/send-template`, {
        method: "POST",
        body: JSON.stringify({
          to,
          templateName: selectedTemplate.name,
          parameters: params,
        }),
      });

      setNewChatOpen(false);
      setNewChatPhone("");
      setSelectedTemplate(null);
      setTplVars({});

      updateConversationPreviewLocal(to, `[TEMPLATE] ${selectedTemplate.name}`);
      setActiveChat({ phone: to });

      // load once
      await loadMessagesInitial(to);

      // sidebar refresh (silent)
      refreshConversations(null, { silent: true });
    } catch (e) {
      setNewChatError(e.message || "Failed to send template");
    } finally {
      setCreatingChat(false);
    }
  };

  /* =========================================================
     Render
  ========================================================= */
  return (
    <Box height="93vh" display="flex" bgcolor="#ece5dd">
      {/* LEFT SIDEBAR */}
      <Box width={360} bgcolor="#fff" display="flex" flexDirection="column" borderRight="1px solid #ddd">
        <Box px={2} py={1.5} display="flex" alignItems="center" justifyContent="space-between">
          <Typography fontWeight={700} fontSize={18}>
            WhatsApp
          </Typography>

          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={() => setNewChatOpen(true)} title="New chat">
              <AddIcon fontSize="small" />
            </IconButton>

            <IconButton
              size="small"
              onClick={() => {
                refreshConversations(null, { silent: false });
                fetchTemplates();
              }}
              title="Refresh"
              disabled={loadingChats}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Box px={2} pb={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search / type phone to open chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />

        <Box flex={1} overflow="auto">
          {loadingChats ? (
            <Stack alignItems="center" mt={4}>
              <CircularProgress size={24} />
            </Stack>
          ) : errorChats ? (
            <Box px={2} py={2}>
              <Typography color="error" fontSize={13}>
                {errorChats}
              </Typography>
            </Box>
          ) : (
            <>
              {canShowQuickChat && (
                <Box
                  px={2}
                  py={1.25}
                  onClick={() => openChat(digitsOnly(search))}
                  sx={{
                    cursor: "pointer",
                    bgcolor: phoneLabel(activeChat?.phone) === phoneLabel(search) ? "#f0f2f5" : "transparent",
                    "&:hover": { bgcolor: "#f5f5f5" },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar>{phoneLabel(search).slice(-2)}</Avatar>
                    <Box flex={1}>
                      <Typography fontSize={14} fontWeight={600}>
                        Chat with {phoneLabel(search)}
                      </Typography>
                      <Typography fontSize={12} color="text.secondary">
                        Open chat
                      </Typography>
                    </Box>
                    <Chip size="small" label="Open" />
                  </Stack>
                </Box>
              )}

              {sortedConversations.map((chat) => {
                const isActive = phoneLabel(activeChat?.phone) === phoneLabel(chat.phone);
                const unread = Number(chat?.unreadCount || 0);

                return (
                  <Box
                    key={chat._id || chat.phone}
                    px={2}
                    py={1.25}
                    onClick={() => openChat(chat.phone)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: isActive ? "#f0f2f5" : "transparent",
                      "&:hover": { bgcolor: "#f5f5f5" },
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar>{nameInitials(chatDisplayName(chat))}</Avatar>

                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                          <Typography fontSize={14} fontWeight={unread > 0 ? 900 : 600} noWrap>
                            {chatDisplayName(chat)}
                          </Typography>
                          <UnreadBadge count={unread} />
                        </Stack>

                        <Typography
                          fontSize={12}
                          color="text.secondary"
                          noWrap
                          sx={{ fontWeight: unread > 0 ? 800 : 400 }}
                        >
                          {assignedToText(chat)}
                        </Typography>

                        <Typography fontSize={11} color="text.secondary" noWrap>
                          Last active: {formatLastActive(chat.lastMessageAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                );
              })}

              {!sortedConversations.length && !canShowQuickChat && (
                <Box px={2} py={2}>
                  <Typography fontSize={13} color="text.secondary">
                    No conversations found. (Webhook must receive messages to create chats.)
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* CHAT WINDOW */}
      <Box flex={1} display="flex" flexDirection="column">
        <Box px={2} py={1.5} bgcolor="#f0f2f5" borderBottom="1px solid #ddd">
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar>
                {activeConversation
                  ? nameInitials(chatDisplayName(activeConversation))
                  : phoneLabel(activeChat?.phone).slice(-2) || "—"}
              </Avatar>

              <Box>
                <Typography fontWeight={700}>{activeHeaderTitle}</Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>

        <Box
          flex={1}
          p={2}
          overflow="auto"
          onScroll={onChatScroll}
          sx={{ backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-light.png')" }}
        >
          {!activeChat?.phone ? (
            <Stack alignItems="center" justifyContent="center" height="100%">
              <Typography color="text.secondary">Select a chat from left</Typography>
            </Stack>
          ) : loadingMessages ? (
            <Stack alignItems="center" mt={4}>
              <CircularProgress size={24} />
            </Stack>
          ) : errorMessages ? (
            <Box px={1} py={1}>
              <Typography color="error" fontSize={13}>
                {errorMessages}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {messages.map((msg) => {
                const isOutbound = msg.direction === "OUTBOUND";
                const cutoff = openedCutoffRef.current || 0;
                const ts = new Date(msg.timestamp || 0).getTime();
                const wasUnread = !isOutbound && cutoff && ts > cutoff;

                return (
                  <Box key={msgKey(msg)} alignSelf={isOutbound ? "flex-end" : "flex-start"}>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5,
                        py: 1,
                        maxWidth: 520,
                        bgcolor: isOutbound ? "#dcf8c6" : "#fff",
                        border: wasUnread
                          ? "1px solid rgba(37,211,102,0.65)"
                          : "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <Typography fontSize={14} whiteSpace="pre-wrap" sx={{ fontWeight: wasUnread ? 800 : 400 }}>
                        {msg.text || ""}
                      </Typography>

                      <Typography fontSize={10} textAlign="right" color="text.secondary">
                        {formatTime(msg.timestamp)}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
              <div ref={bottomRef} />
            </Stack>
          )}
        </Box>

        <Box p={1.5} bgcolor="#f0f2f5">
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder={sessionExpired ? "Session expired. Send a template to reopen chat" : "Type a message"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendText()}
              disabled={!activeChat?.phone || sessionExpired}
            />
            <IconButton color="primary" onClick={sendText} disabled={!activeChat?.phone || !input.trim() || sessionExpired}>
              <SendIcon />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      {/* New Chat Dialog */}
      <Dialog
        open={newChatOpen}
        onClose={() => (creatingChat ? null : setNewChatOpen(false))}
        maxWidth="md"
        fullWidth
        onEntered={() => fetchTemplates()}
      >
        <DialogTitle>Start New Chat (Template)</DialogTitle>

        <DialogContent>
          <Stack spacing={2} pt={1}>
            {newChatError ? (
              <Typography color="error" fontSize={13}>
                {newChatError}
              </Typography>
            ) : null}

            <TextField
              label="Phone (10 digits or 91xxxxxxxxxx)"
              size="small"
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
              placeholder="e.g. 9694638351 or 919694638351"
              inputProps={{ inputMode: "numeric" }}
              disabled={creatingChat}
            />

            <Autocomplete
              loading={loadingTemplates}
              options={templateOptions}
              value={selectedTemplate}
              onChange={(e, val) => setSelectedTemplate(val)}
              getOptionLabel={(opt) => String(opt?.name || "")}
              isOptionEqualToValue={(a, b) => String(a?.name) === String(b?.name)}
              renderOption={(props, opt) => {
                const st = statusChipProps(opt?.status);
                return (
                  <li {...props} key={opt?._id || opt?.name}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                      <Typography sx={{ flex: 1 }} fontWeight={700} noWrap>
                        {opt?.name}
                      </Typography>
                      <Chip size="small" label={st.label} sx={st.sx} />
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField {...params} label="Search Template" size="small" placeholder="Search Template" />
              )}
              disabled={creatingChat}
            />

            <Box display="flex" gap={3} mt={1}>
              <Box flex={1} minWidth={280}>
                <Typography fontWeight={700} mb={1}>
                  Template Body (Preview)
                </Typography>

                <Box
                  sx={{
                    bgcolor: "#e7f6f2",
                    borderRadius: 2,
                    p: 2,
                    border: "1px solid rgba(0,0,0,0.08)",
                    maxWidth: 360,
                  }}
                >
                  <Typography fontSize={14} whiteSpace="pre-wrap">
                    {previewBody || "Select a template to preview"}
                  </Typography>
                </Box>

                {!pickBodyTextFromTemplate(selectedTemplate) && selectedTemplate ? (
                  <Typography mt={1} fontSize={12} color="error">
                    Body text not available in DB for this template. Fix sync to store BODY text.
                  </Typography>
                ) : null}
              </Box>

              <Box flex={1} minWidth={320}>
                <Typography fontWeight={700} mb={1}>
                  Input Variables
                </Typography>

                {selectedTemplate ? (
                  (() => {
                    const body = pickBodyTextFromTemplate(selectedTemplate);
                    const idxs = extractVarIndexes(body);

                    if (!body) {
                      return (
                        <Typography fontSize={13} color="text.secondary">
                          No body found for this template.
                        </Typography>
                      );
                    }

                    if (!idxs.length) {
                      return (
                        <Typography fontSize={13} color="text.secondary">
                          No input variables detected in body.
                        </Typography>
                      );
                    }

                    return (
                      <Stack spacing={1.5}>
                        <Typography fontSize={12} color="text.secondary">
                          Body
                        </Typography>
                        {idxs.map((i) => (
                          <TextField
                            key={i}
                            size="small"
                            placeholder="Enter Variable"
                            value={tplVars[String(i)] || ""}
                            onChange={(e) =>
                              setTplVars((prev) => ({
                                ...prev,
                                [String(i)]: e.target.value,
                              }))
                            }
                            InputProps={{
                              startAdornment: <InputAdornment position="start">{`{{${i}}}`}</InputAdornment>,
                            }}
                            disabled={creatingChat}
                          />
                        ))}
                      </Stack>
                    );
                  })()
                ) : (
                  <Typography fontSize={13} color="text.secondary">
                    Select a template to see variables.
                  </Typography>
                )}
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setNewChatOpen(false)} disabled={creatingChat}>
            Cancel
          </Button>
          <Button variant="contained" onClick={startNewChatWithTemplate} disabled={creatingChat}>
            {creatingChat ? "Sending..." : "Send"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

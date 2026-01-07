import React, { useEffect, useMemo, useRef, useState } from "react";
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
  if (s.includes("APPROV")) return { label: "APPROVED", sx: { bgcolor: "#e7fbf2", color: "#1b7f4b" } };
  if (s.includes("REJECT")) return { label: "REJECTED", sx: { bgcolor: "#ffeceb", color: "#b42318" } };
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
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return (parts[0][0] || "?").toUpperCase();
  return `${(parts[0][0] || "").toUpperCase()}${(parts[parts.length - 1][0] || "").toUpperCase()}`;
}

function chatDisplayName(chat) {
  // backend should send displayName, else fallback to phone
  return chat?.displayName || phoneLabel(chat?.phone);
}

function assignedToText(chat) {
  // backend should send assignedToLabel
  return `Assigned To: ${chat?.assignedToLabel || "—"}`;
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
  const pollingRef = useRef(false);

  const activePhoneDigits = useMemo(() => digitsOnly(activeChat?.phone), [activeChat?.phone]);

  const activeConversation = useMemo(() => {
    if (!activeChat?.phone) return null;
    const p = phoneLabel(activeChat.phone);
    return conversations.find((c) => phoneLabel(c.phone) === p) || null;
  }, [activeChat?.phone, conversations]);

  // Chatbox title format: Name(number)
  const activeHeaderTitle = useMemo(() => {
    if (!activeChat?.phone) return "Select a chat";
    const name = activeConversation ? chatDisplayName(activeConversation) : phoneLabel(activeChat.phone);
    const num = phoneLabel(activeChat.phone);
    // if name already equals number, don't duplicate
    if (!name || name === num) return num || "—";
    return `${name} (${num})`;
  }, [activeChat?.phone, activeConversation]);

  const filteredConversations = useMemo(() => {
    const s = phoneLabel(search);
    if (!s) return conversations;
    return conversations.filter((c) => phoneLabel(c.phone).includes(s));
  }, [conversations, search]);

  const canShowQuickChat = useMemo(() => phoneLabel(search).length === 10, [search]);

  /* -----------------------------
     Fetch: Conversations
  ------------------------------ */
  const refreshConversations = async (selectPhone = null) => {
  setErrorChats("");
  setLoadingChats(true);
  try {
    // 1. Fetch the user object from session storage
    const sessionData = sessionStorage.getItem("user");
    const userObj = sessionData ? JSON.parse(sessionData) : null;

    // 2. Extract fullName and role
    const userName = userObj?.fullName || ""; 
    const userRole = userObj?.role || "";

    // 3. Pass these to the API as query parameters
    // Encode parameters to handle spaces in names (e.g., "Asha Kaushik")
    const queryParams = new URLSearchParams({
      role: userRole,
      userName: userName
    }).toString();

    const data = (await api(`/api/whatsapp/conversations?${queryParams}`)) || [];
    const list = Array.isArray(data) ? data : [];
    
    setConversations(list);

    if (selectPhone) {
      setActiveChat({ phone: selectPhone });
    } else if (!activeChat?.phone && list.length) {
      setActiveChat({ phone: digitsOnly(list[0].phone) });
    }
  } catch (e) {
    setErrorChats(e.message || "Failed to load conversations");
    setConversations([]);
  } finally {
    setLoadingChats(false);
  }
};

  /* -----------------------------
     Fetch: Messages
  ------------------------------ */
  const loadMessagesInitial = async (phoneAnyDigits) => {
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
  };

  const pollMessagesAppend = async (phoneAnyDigits) => {
    const q = digitsOnly(phoneAnyDigits);
    if (!q) return;
    if (pollingRef.current) return;
    pollingRef.current = true;

    try {
      const data = (await api(`/api/whatsapp/messages?phone=${encodeURIComponent(q)}`)) || [];
      if (!Array.isArray(data)) return;

      setMessages((prev) => {
        if (!prev.length) return data;

        const seen = new Set(prev.map((m) => msgKey(m)));
        const toAdd = [];

        for (const m of data) {
          const k = msgKey(m);
          if (!seen.has(k)) {
            toAdd.push(m);
            seen.add(k);
          }
        }

        return toAdd.length ? [...prev, ...toAdd] : prev;
      });
    } catch (e) {
      // silent on polling errors
    } finally {
      pollingRef.current = false;
    }
  };

  /* -----------------------------
     Templates
  ------------------------------ */
  const fetchTemplates = async () => {
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
  };

  /* -----------------------------
     Initial boot
  ------------------------------ */
  useEffect(() => {
    refreshConversations();
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -----------------------------
     When active chat changes
  ------------------------------ */
  useEffect(() => {
    if (!activePhoneDigits) return;
    setSessionExpired(false);
    setErrorMessages("");
    setMessages([]);
    loadMessagesInitial(activePhoneDigits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePhoneDigits]);

  /* -----------------------------
     Polling
  ------------------------------ */
  useEffect(() => {
    if (!activePhoneDigits) return;
    const id = setInterval(() => {
      pollMessagesAppend(activePhoneDigits);
    }, 8000);
    return () => clearInterval(id);
  }, [activePhoneDigits]);

  /* -----------------------------
     Auto-scroll only when new arrives
  ------------------------------ */
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  /* -----------------------------
     Session reset when inbound arrives
  ------------------------------ */
  useEffect(() => {
    if (messages.some((m) => m.direction === "INBOUND")) {
      setSessionExpired(false);
    }
  }, [messages]);

  /* -----------------------------
     UI actions
  ------------------------------ */
  const openChat = (phone) => {
    const p = digitsOnly(phone);
    if (!p) return;
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
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    updateConversationPreviewLocal(to, text);

    try {
      await api(`/api/whatsapp/send-text`, {
        method: "POST",
        body: JSON.stringify({ to, text }),
      });

      await pollMessagesAppend(to);
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
      await loadMessagesInitial(to);
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
                refreshConversations();
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

              {filteredConversations.map((chat) => {
                const isActive = phoneLabel(activeChat?.phone) === phoneLabel(chat.phone);

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
                        <Typography fontSize={14} fontWeight={600} noWrap>
                          {chatDisplayName(chat)}
                        </Typography>

                        {/* KEEP Assigned To in conversations list */}
                        <Typography fontSize={12} color="text.secondary" noWrap>
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

              {!filteredConversations.length && !canShowQuickChat && (
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
                {/* ✅ Chatbox title: Name(number) */}
                <Typography fontWeight={700}>{activeHeaderTitle}</Typography>
              </Box>
            </Stack>

          </Stack>
        </Box>

        <Box
          flex={1}
          p={2}
          overflow="auto"
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
                return (
                  <Box key={msgKey(msg)} alignSelf={isOutbound ? "flex-end" : "flex-start"}>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5,
                        py: 1,
                        maxWidth: 520,
                        bgcolor: isOutbound ? "#dcf8c6" : "#fff",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <Typography fontSize={14} whiteSpace="pre-wrap">
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
              renderInput={(params) => <TextField {...params} label="Search Template" size="small" placeholder="Search Template" />}
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
                            onChange={(e) => setTplVars((prev) => ({ ...prev, [String(i)]: e.target.value }))}
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

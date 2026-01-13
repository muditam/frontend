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
  InputAdornment,
  Chip,
  Autocomplete,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";

import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";

import FlashOnIcon from "@mui/icons-material/FlashOn";
import ViewListIcon from "@mui/icons-material/ViewList";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import AutorenewIcon from "@mui/icons-material/Autorenew";

import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";

import { io } from "socket.io-client";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

// toggle this if you want to see socket events
const DEBUG_SOCKET = false;

/* -----------------------------
   Helpers
------------------------------ */
function digitsOnly(v = "") {
  return String(v || "").replace(/\D/g, "");
}
function phone10(v = "") {
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

async function apiForm(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
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
  if (tpl.bodyText) return String(tpl.bodyText || "");
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
  return chat?.displayName || phone10(chat?.phone);
}
function assignedToText(chat) {
  return `Assigned To: ${chat?.assignedToLabel || "—"}`;
}

/* -----------------------------
   Unread badge
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

/* -----------------------------
   Ticks
------------------------------ */
function normalizeStatus(s) {
  const v = String(s || "").toLowerCase().trim();
  if (["read", "seen"].includes(v)) return "read";
  if (["delivered", "deliver", "received"].includes(v)) return "delivered";
  if (["sent"].includes(v)) return "sent";
  if (["failed", "error"].includes(v)) return "failed";
  return v;
}
function MessageTicks({ status }) {
  const st = normalizeStatus(status);
  if (st === "read") return <DoneAllIcon sx={{ fontSize: 14, ml: 0.5, color: "#1DA1F2" }} />;
  if (st === "delivered")
    return <DoneAllIcon sx={{ fontSize: 14, ml: 0.5, color: "rgba(0,0,0,0.55)" }} />;
  if (st === "sent") return <DoneIcon sx={{ fontSize: 14, ml: 0.5, color: "rgba(0,0,0,0.55)" }} />;
  if (st === "failed")
    return (
      <Typography component="span" sx={{ fontSize: 12, color: "error.main", ml: 0.5, fontWeight: 900 }}>
        !
      </Typography>
    );
  return null;
}

/* -----------------------------
   Customer phone resolver (CRITICAL)
   - OUTBOUND: customer is "to"
   - INBOUND:  customer is "from"
------------------------------ */
function customerPhoneFromMsg(msg) {
  const dir = String(msg?.direction || "").toUpperCase();
  if (dir === "OUTBOUND") return msg?.to || "";
  if (dir === "INBOUND") return msg?.from || "";
  // fallback
  return msg?.phone || msg?.to || msg?.from || "";
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

  const [socketStatus, setSocketStatus] = useState("disconnected");

  const bottomRef = useRef(null);
  const prevLenRef = useRef(0);

  const isNearBottomRef = useRef(true);
  const openedCutoffRef = useRef(0);

  const socketRef = useRef(null);
  const joinedRoomRef = useRef(null);

  // IMPORTANT: keeps local “read” sticky so refreshConversations doesn’t re-add unread
  const pendingReadRef = useRef(new Map()); // phone10 -> { at:number, iso:string }

  // bottom composer menus
  const [quickAnchor, setQuickAnchor] = useState(null);
  const [tplAnchor, setTplAnchor] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);

  const fileRef = useRef(null);

  const [tplComposeOpen, setTplComposeOpen] = useState(false);
  const [activeTplForSend, setActiveTplForSend] = useState(null);
  const [tplSendVars, setTplSendVars] = useState({});

  const [helpWriteLoading, setHelpWriteLoading] = useState(false);

  const [rephraseOpen, setRephraseOpen] = useState(false);
  const [rephraseStyle, setRephraseStyle] = useState("professional");
  const [rephraseLoading, setRephraseLoading] = useState(false);

  const activeDigits = useMemo(() => digitsOnly(activeChat?.phone), [activeChat?.phone]);
  const activeP10 = useMemo(() => phone10(activeChat?.phone), [activeChat?.phone]);

  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const agentName = useMemo(() => sessionUser?.fullName || "", [sessionUser?.fullName]);

  const activeConversation = useMemo(() => {
    if (!activeP10) return null;
    return conversations.find((c) => phone10(c.phone) === activeP10) || null;
  }, [activeP10, conversations]);

  const activeHeaderTitle = useMemo(() => {
    if (!activeP10) return "Select a chat";
    const name = activeConversation ? chatDisplayName(activeConversation) : activeP10;
    if (!name || name === activeP10) return activeP10 || "—";
    return `${name} (${activeP10})`;
  }, [activeP10, activeConversation]);

  const filteredConversations = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const s10 = phone10(search);
    if (!q) return conversations;
    return conversations.filter((c) => {
      const p = phone10(c.phone);
      const nm = String(c.displayName || "").toLowerCase();
      return p.includes(s10) || nm.includes(q);
    });
  }, [conversations, search]);

  const canShowQuickChat = useMemo(() => phone10(search).length === 10, [search]);

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
     Quick replies / emojis
  ------------------------------ */
  const QUICK_REPLIES = useMemo(
    () => [
      "Hi! How are you doing today?",
      "Just checking in for your follow-up 😊",
      "Can I call you in 10 minutes?",
      "Please share your latest reports if available.",
      "Thank you! I’m here if you need anything.",
    ],
    []
  );

  const EMOJIS = useMemo(
    () => ["😊", "😂", "🙏", "👍", "❤️", "🔥", "😄", "😅", "😇", "🤝", "😎", "🥳", "😢", "😡", "✅", "✨"],
    []
  );

  /* -----------------------------
     Core: Upsert conversation from a message (customer-based)
  ------------------------------ */
  const upsertConversationFromMessage = useCallback(
    (msg) => {
      const customerPhone = customerPhoneFromMsg(msg);
      const p10 = phone10(customerPhone);
      if (!p10) return;

      const isInbound = String(msg?.direction || "").toUpperCase() === "INBOUND";
      const isActive = activeP10 && p10 === activeP10;

      const nowIso = msg?.timestamp || new Date().toISOString();
      const lastText =
        msg?.media?.url
          ? msg?.type === "image"
            ? "📷 Photo"
            : "📎 Attachment"
          : String(msg?.text || "").slice(0, 200);

      setConversations((prev) => {
        const idx = prev.findIndex((c) => phone10(c.phone) === p10);

        const pending = pendingReadRef.current.get(p10);
        const forceRead = pending && Date.now() - pending.at < 30_000;

        if (idx === -1) {
          return [
            {
              phone: customerPhone,
              displayName: "",
              assignedToLabel: "",
              lastMessageAt: nowIso,
              lastMessageText: lastText,
              unreadCount: isInbound && !isActive && !forceRead ? 1 : 0,
              lastReadAt: isActive || forceRead ? (pending?.iso || nowIso) : null,
            },
            ...prev,
          ];
        }

        const next = [...prev];
        const existing = next[idx];

        const newUnread = forceRead
          ? 0
          : isInbound
          ? isActive
            ? 0
            : Number(existing?.unreadCount || 0) + 1
          : Number(existing?.unreadCount || 0);

        next[idx] = {
          ...existing,
          phone: existing?.phone || customerPhone,
          lastMessageAt: nowIso,
          lastMessageText: lastText || existing?.lastMessageText || "",
          unreadCount: newUnread,
          lastReadAt: isActive || forceRead ? (pending?.iso || nowIso) : existing?.lastReadAt,
        };

        const [item] = next.splice(idx, 1);
        return [item, ...next];
      });
    },
    [activeP10]
  );

  /* -----------------------------
     Fetch: Conversations
  ------------------------------ */
  const refreshConversations = useCallback(
    async (selectPhone = null, { silent = false } = {}) => {
      setErrorChats("");
      if (!silent) setLoadingChats(true);

      try {
        const userName = sessionUser?.fullName || "";
        const userRole = sessionUser?.role || "";
        const queryParams = new URLSearchParams({ role: userRole, userName }).toString();
        const data = (await api(`/api/whatsapp/conversations?${queryParams}`)) || [];
        const serverList = Array.isArray(data) ? data : [];

        // keep “read” sticky for a short window
        const now = Date.now();
        const list = serverList.map((c) => {
          const p10 = phone10(c.phone);
          const pending = pendingReadRef.current.get(p10);
          if (pending && now - pending.at < 30_000) {
            return { ...c, unreadCount: 0, lastReadAt: pending.iso || c.lastReadAt };
          }
          return c;
        });

        setConversations(list);

        if (selectPhone) setActiveChat({ phone: selectPhone });
        else if (!activeChat?.phone && list.length) setActiveChat({ phone: digitsOnly(list[0].phone) });
      } catch (e) {
        setErrorChats(e.message || "Failed to load conversations");
        if (!silent) setConversations([]);
      } finally {
        if (!silent) setLoadingChats(false);
      }
    },
    [activeChat?.phone, sessionUser?.fullName, sessionUser?.role]
  );

  /* -----------------------------
     Fetch: Messages
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

  const allTemplates = useMemo(() => {
    const list = Array.isArray(templates) ? templates : [];
    return list;
  }, [templates]);

  /* -----------------------------
     Mark read (UI + backend) + sticky local
  ------------------------------ */
  const markConversationRead = useCallback(async (phoneDigits, { optimisticOnly = false } = {}) => {
    const phone = digitsOnly(phoneDigits);
    const p10 = phone10(phoneDigits);
    if (!p10) return;

    const nowIso = new Date().toISOString();

    pendingReadRef.current.set(p10, { at: Date.now(), iso: nowIso });

    setConversations((prev) =>
      prev.map((c) => (phone10(c.phone) === p10 ? { ...c, unreadCount: 0, lastReadAt: nowIso } : c))
    );

    if (optimisticOnly) return;

    try {
      await api(`/api/whatsapp/conversations/mark-read`, {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
    } catch {
      // ignore
    }
  }, []);

  /* -----------------------------
     Boot
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
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });

    socketRef.current = s;

    if (DEBUG_SOCKET) {
      s.onAny((event, ...args) => console.log("[socket]", event, args));
    }

    const onConnect = () => {
      setSocketStatus("connected");
      refreshConversations(null, { silent: true });
      if (activeP10) {
        s.emit("wa:join", { phone10: activeP10 });
        joinedRoomRef.current = roomForPhone10(activeP10);
      }
    };
    const onDisconnect = () => setSocketStatus("disconnected");
    const onError = () => setSocketStatus("error");

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onError);

    return () => {
      try {
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
        s.off("connect_error", onError);
        s.disconnect();
      } catch {}
      socketRef.current = null;
      joinedRoomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshConversations]);

  /* -----------------------------
     Socket: join/leave room
  ------------------------------ */
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const nextRoom = activeP10 ? roomForPhone10(activeP10) : null;

    if (joinedRoomRef.current && joinedRoomRef.current !== nextRoom) {
      const oldPhone10 = joinedRoomRef.current.replace("wa:", "");
      s.emit("wa:leave", { phone10: oldPhone10 });
      joinedRoomRef.current = null;
    }

    if (nextRoom && joinedRoomRef.current !== nextRoom) {
      s.emit("wa:join", { phone10: activeP10 });
      joinedRoomRef.current = nextRoom;
    }
  }, [activeP10]);

  /* -----------------------------
     Socket: listeners (payload-shape safe)
     ✅ FIX: Always use customer phone (never business phone)
  ------------------------------ */
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const unwrapMessage = (payload) => payload?.message || payload?.msg || payload;
    const resolveP10FromPayload = (payload, msg) => {
      const p10FromPayload = phone10(payload?.phone10 || payload?.phone || "");
      if (p10FromPayload) return p10FromPayload;
      return phone10(customerPhoneFromMsg(msg));
    };

    const onMessage = (payload) => {
      const msg = unwrapMessage(payload);
      if (!msg) return;

      const p10 = resolveP10FromPayload(payload, msg);
      if (!p10) return;

      // enforce "phone" as customer phone (so all local code works)
      const customerPhone = customerPhoneFromMsg(msg);
      const normalizedMsg = {
        ...msg,
        phone: customerPhone || p10,
      };

      upsertConversationFromMessage(normalizedMsg);

      if (activeP10 && p10 === activeP10) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => msgKey(m)));
          const k = msgKey(normalizedMsg);
          if (seen.has(k)) return prev;
          return [...prev, normalizedMsg];
        });

        if (String(normalizedMsg?.direction || "").toUpperCase() === "INBOUND") {
          markConversationRead(activeDigits, { optimisticOnly: false });
        }
      }
    };

    const onStatus = (payload) => {
      const waId = payload?.waId || payload?.id;
      const status = payload?.status;
      const p10 = phone10(payload?.phone10 || payload?.phone || "");
      if (!waId || !status) return;

      if (p10 && activeP10 && p10 !== activeP10) return;

      setMessages((prev) => prev.map((m) => (m.waId === waId ? { ...m, status } : m)));
    };

    const onConversation = (payload) => {
      const p10 = phone10(payload?.phone10 || payload?.phone || "");
      if (!p10) return;

      const patch = payload?.patch ? payload.patch : payload;
      if (!patch) return;

      setConversations((prev) =>
        prev.map((c) => {
          if (phone10(c.phone) !== p10) return c;

          // support delta form (old servers) AND absolute form (new server)
          const delta = Number(patch?.unreadCountDelta || 0);
          const hasAbsolute = typeof patch?.unreadCount === "number";

          const nextUnread = hasAbsolute ? patch.unreadCount : Math.max(0, Number(c.unreadCount || 0) + delta);

          const cleanedPatch = { ...patch };
          delete cleanedPatch.unreadCountDelta;

          return {
            ...c,
            ...cleanedPatch,
            unreadCount: nextUnread,
          };
        })
      );
    };

    s.on("wa:message", onMessage);
    s.on("wa:status", onStatus);
    s.on("wa:conversation", onConversation);

    return () => {
      s.off("wa:message", onMessage);
      s.off("wa:status", onStatus);
      s.off("wa:conversation", onConversation);
    };
  }, [activeP10, activeDigits, markConversationRead, upsertConversationFromMessage]);

  /* -----------------------------
     When active chat changes: load + mark read
  ------------------------------ */
  useEffect(() => {
    if (!activeDigits) return;

    setSessionExpired(false);
    setErrorMessages("");
    setMessages([]);

    openedCutoffRef.current = Date.now();
    markConversationRead(activeDigits, { optimisticOnly: false });

    loadMessagesInitial(activeDigits).finally(() => {
      markConversationRead(activeDigits, { optimisticOnly: false });
    });
  }, [activeDigits, loadMessagesInitial, markConversationRead]);

  /* -----------------------------
     Auto-scroll only when near bottom
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
     Open chat
  ------------------------------ */
  const openChat = (phone) => {
    const p = digitsOnly(phone);
    if (!p) return;

    openedCutoffRef.current = Date.now();
    setActiveChat({ phone: p });
    setSearch("");

    markConversationRead(p, { optimisticOnly: false });
  };

  const updateConversationPreviewLocal = (phoneDigits, lastMessageText) => {
    const nowIso = new Date().toISOString();
    const p10 = phone10(phoneDigits);

    setConversations((prev) => {
      const idx = prev.findIndex((c) => phone10(c.phone) === p10);

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
      to,
      phone: to,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    updateConversationPreviewLocal(to, text);

    try {
      await api(`/api/whatsapp/send-text`, {
        method: "POST",
        body: JSON.stringify({ to, text }),
      });
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

  /* -----------------------------
     Attachments
------------------------------ */
  const onPickFile = async (file) => {
    if (!file) return;
    if (!activeChat?.phone) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessages("Max attachment size is 5MB.");
      return;
    }

    const to = digitsOnly(activeChat.phone);

    const optimistic = {
      _id: `tmp_file_${Date.now()}`,
      direction: "OUTBOUND",
      text: "",
      type: "document",
      timestamp: new Date().toISOString(),
      status: "sent",
      to,
      phone: to,
      media: {
        url: "",
        mime: file.type || "application/octet-stream",
        filename: file.name,
      },
    };

    setMessages((prev) => [...prev, optimistic]);
    updateConversationPreviewLocal(to, `📎 ${file.name}`);

    try {
      const fd = new FormData();
      fd.append("to", to);
      fd.append("file", file);

      await apiForm(`/api/whatsapp/send-media`, fd);

      await loadMessagesInitial(to);
      refreshConversations(null, { silent: true });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setErrorMessages(e.message || "Failed to send attachment.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const insertEmoji = (emo) => setInput((t) => `${t}${emo}`);

  /* -----------------------------
     Templates: send from chat
  ------------------------------ */
  const openTemplateComposer = (tpl) => {
    const body = pickBodyTextFromTemplate(tpl);
    const idxs = extractVarIndexes(body);

    const initial = {};
    idxs.forEach((i) => (initial[String(i)] = ""));

    setActiveTplForSend(tpl);
    setTplSendVars(initial);
    setTplComposeOpen(true);
  };

  const tplSendPreview = useMemo(() => {
    const body = pickBodyTextFromTemplate(activeTplForSend);
    return applyVarsToBody(body, tplSendVars);
  }, [activeTplForSend, tplSendVars]);

  const sendTemplateFromChat = async () => {
    if (!activeTplForSend) return;
    const to = digitsOnly(activeChat?.phone);
    if (!to) return;

    const body = pickBodyTextFromTemplate(activeTplForSend);
    const idxs = extractVarIndexes(body);
    const params = idxs.map((i) => String(tplSendVars[String(i)] || "").trim());
    if (params.some((v) => !v)) {
      setErrorMessages("Fill all template variables.");
      return;
    }

    try {
      await api(`/api/whatsapp/send-template`, {
        method: "POST",
        body: JSON.stringify({
          to,
          templateName: activeTplForSend.name,
          parameters: params,
          renderedText: tplSendPreview || "",
        }),
      });

      setTplComposeOpen(false);
      setActiveTplForSend(null);
      setTplSendVars({});

      refreshConversations(null, { silent: true });
      await loadMessagesInitial(to);
      setSessionExpired(false);
      setErrorMessages("");
    } catch (e) {
      setErrorMessages(e.message || "Failed to send template.");
    }
  };

  /* -----------------------------
     Help me write (AI)
  ------------------------------ */
  const helpMeWrite = async () => {
    if (!activeP10) return;
    setHelpWriteLoading(true);

    try {
      const lastInbound = [...(messages || [])]
        .reverse()
        .find((m) => String(m.direction || "").toUpperCase() !== "OUTBOUND");

      const goal = lastInbound?.text
        ? `Reply to the customer's last message: "${String(lastInbound.text).slice(0, 220)}"`
        : "Write a helpful next message to the customer based on the conversation.";

      const r = await api(`/api/whatsapp/help-me-write`, {
        method: "POST",
        body: JSON.stringify({
          phone: activeP10,
          leadName: activeConversation?.displayName || "",
          agentName: agentName || "",
          goal,
          tone: "friendly, professional, concise, Hinglish allowed",
          maxMessages: 35,
        }),
      });

      const suggestion = String(r?.suggestion || "").trim();
      if (!suggestion) {
        setErrorMessages("AI did not return a message.");
        return;
      }
      setInput(suggestion);
    } catch (e) {
      setErrorMessages(e.message || "Help me write failed.");
    } finally {
      setHelpWriteLoading(false);
    }
  };

  /* -----------------------------
     Rephrase
  ------------------------------ */
  const openRephraseDialog = () => {
    if (!input.trim()) return;
    setRephraseStyle("professional");
    setRephraseOpen(true);
  };

  const doRephrase = async () => {
    const original = input.trim();
    if (!original) return;
    setRephraseLoading(true);

    try {
      const r = await api(`/api/whatsapp/rephrase`, {
        method: "POST",
        body: JSON.stringify({ text: original, style: rephraseStyle }),
      });

      const out = String(r?.result || r?.rephrased || "").trim();
      if (!out) {
        setErrorMessages("AI did not return rephrased text.");
        return;
      }
      setInput(out);
      setRephraseOpen(false);
    } catch (e) {
      setErrorMessages(e.message || "Rephrase failed.");
    } finally {
      setRephraseLoading(false);
    }
  };

  /* -----------------------------
     New Chat: template options
  ------------------------------ */
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
          renderedText: previewBody || "",
        }),
      });

      setNewChatOpen(false);
      setNewChatPhone("");
      setSelectedTemplate(null);
      setTplVars({});

      updateConversationPreviewLocal(to, `[TEMPLATE] ${selectedTemplate.name}`);
      setActiveChat({ phone: to });

      await loadMessagesInitial(to);
      refreshConversations(null, { silent: true });
      setSessionExpired(false);
    } catch (e) {
      setNewChatError(e.message || "Failed to send template");
    } finally {
      setCreatingChat(false);
    }
  };

  /* -----------------------------
     Render media inside messages
  ------------------------------ */
  const renderMedia = (m) => {
    const url = m?.media?.url || m?.mediaUrl || "";
    const mime = m?.media?.mime || m?.mime || "";
    const filename = m?.media?.filename || m?.filename || "attachment";
    if (!url) return null;

    const isImg = mime.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
    if (isImg) {
      return (
        <Box sx={{ mt: 0.75 }}>
          <Box
            component="img"
            src={url}
            alt="attachment"
            sx={{
              width: 220,
              maxWidth: "100%",
              borderRadius: 1.5,
              border: "1px solid #e5e5e5",
              display: "block",
              cursor: "pointer",
            }}
            onLoad={() => {
              if (isNearBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: "auto" });
            }}
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 0.75 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          sx={{ textTransform: "none" }}
        >
          Open {filename}
        </Button>
      </Box>
    );
  };

  /* =========================================================
     Render
  ========================================================= */
  return (
    <Box height="93vh" display="flex" bgcolor="#ece5dd">
      {/* LEFT SIDEBAR */}
      <Box width={360} bgcolor="#fff" display="flex" flexDirection="column" borderRight="1px solid #ddd">
        <Box px={2} py={1.5} display="flex" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={700} fontSize={18}>
              WhatsApp
            </Typography>
            <Chip
              size="small"
              label={socketStatus}
              sx={{
                height: 20,
                fontSize: 11,
                bgcolor:
                  socketStatus === "connected" ? "#e7fbf2" : socketStatus === "error" ? "#ffeceb" : "#f2f4f7",
              }}
            />
          </Stack>

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
                    bgcolor: phone10(activeChat?.phone) === phone10(search) ? "#f0f2f5" : "transparent",
                    "&:hover": { bgcolor: "#f5f5f5" },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar>{phone10(search).slice(-2)}</Avatar>
                    <Box flex={1}>
                      <Typography fontSize={14} fontWeight={600}>
                        Chat with {phone10(search)}
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
                const isActive = phone10(activeChat?.phone) === phone10(chat.phone);
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
        {/* Header */}
        <Box px={2} py={1.25} bgcolor="#f0f2f5" borderBottom="1px solid #ddd">
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar>
                {activeConversation ? nameInitials(chatDisplayName(activeConversation)) : activeP10?.slice(-2) || "—"}
              </Avatar>
              <Box>
                <Typography fontWeight={800}>{activeHeaderTitle}</Typography>
                <Typography fontSize={12} color="text.secondary">
                  {activeConversation?.assignedToLabel ? assignedToText(activeConversation) : ""}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>

        {/* Messages */}
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
                const isOutbound = String(msg.direction || "").toUpperCase() === "OUTBOUND";
                const cutoff = openedCutoffRef.current || 0;
                const ts = new Date(msg.timestamp || msg.createdAt || 0).getTime();
                const wasUnread = !isOutbound && cutoff && ts > cutoff;

                const bubbleText = msg?.text || "";
                const hasMedia = !!(msg?.media?.url || msg?.mediaUrl);

                return (
                  <Box key={msgKey(msg)} alignSelf={isOutbound ? "flex-end" : "flex-start"}>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5,
                        py: 1,
                        maxWidth: 520,
                        bgcolor: isOutbound ? "#dcf8c6" : "#fff",
                        border: wasUnread ? "1px solid rgba(37,211,102,0.65)" : "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      {!!bubbleText && (
                        <Typography fontSize={14} whiteSpace="pre-wrap" sx={{ fontWeight: wasUnread ? 800 : 400 }}>
                          {bubbleText}
                        </Typography>
                      )}

                      {hasMedia ? renderMedia(msg) : null}

                      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                        <Typography fontSize={10} textAlign="right" color="text.secondary">
                          {formatTime(msg.timestamp || msg.createdAt)}
                        </Typography>
                        {isOutbound ? <MessageTicks status={msg.status} /> : null}
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
              <div ref={bottomRef} />
            </Stack>
          )}
        </Box>

        {/* Composer */}
        <Box p={1.25} bgcolor="#f0f2f5" borderTop="1px solid rgba(0,0,0,0.06)">
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              fullWidth
              size="small"
              placeholder={sessionExpired ? "Session expired. Send a template to reopen chat" : "Type a message"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendText()}
              disabled={!activeChat?.phone || sessionExpired}
              multiline
              minRows={1}
              maxRows={4}
            />
            <IconButton color="primary" onClick={sendText} disabled={!activeChat?.phone || !input.trim() || sessionExpired}>
              <SendIcon />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between" mt={1}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title="Quick Replies">
                <span>
                  <IconButton size="small" disabled={!activeChat?.phone} onClick={(e) => setQuickAnchor(e.currentTarget)}>
                    <FlashOnIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Templates">
                <span>
                  <IconButton size="small" disabled={!activeChat?.phone} onClick={(e) => setTplAnchor(e.currentTarget)}>
                    <ViewListIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Emoji">
                <span>
                  <IconButton size="small" disabled={!activeChat?.phone} onClick={(e) => setEmojiAnchor(e.currentTarget)}>
                    <InsertEmoticonIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={sessionExpired ? "Send template to reopen session" : "Attachment (≤ 5MB)"}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!activeChat?.phone || sessionExpired}
                    onClick={() => fileRef.current?.click()}
                  >
                    <AttachFileIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <input ref={fileRef} type="file" hidden onChange={(e) => onPickFile(e.target.files?.[0])} />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Help me write (AI)">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!activeChat?.phone || helpWriteLoading}
                    onClick={helpMeWrite}
                    startIcon={helpWriteLoading ? <CircularProgress size={14} /> : <AutoFixHighIcon />}
                    sx={{ textTransform: "none", fontWeight: 900 }}
                  >
                    Help me write
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title="Rephrase current text">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!activeChat?.phone || !input.trim()}
                    onClick={openRephraseDialog}
                    startIcon={<AutorenewIcon />}
                    sx={{ textTransform: "none", fontWeight: 900 }}
                  >
                    Rephrase
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {/* Quick replies menu */}
        <Menu anchorEl={quickAnchor} open={Boolean(quickAnchor)} onClose={() => setQuickAnchor(null)}>
          {QUICK_REPLIES.map((q) => (
            <MenuItem
              key={q}
              onClick={() => {
                setInput((t) => (t ? t + "\n" + q : q));
                setQuickAnchor(null);
              }}
            >
              {q}
            </MenuItem>
          ))}
        </Menu>

        {/* Templates menu */}
        <Menu
          anchorEl={tplAnchor}
          open={Boolean(tplAnchor)}
          onClose={() => setTplAnchor(null)}
          PaperProps={{ sx: { maxHeight: 360, width: 360 } }}
        >
          {loadingTemplates ? (
            <MenuItem disabled>Loading…</MenuItem>
          ) : allTemplates.length === 0 ? (
            <MenuItem disabled>No templates found</MenuItem>
          ) : (
            allTemplates.map((t) => (
              <MenuItem
                key={t._id || t.name}
                onClick={() => {
                  setTplAnchor(null);
                  openTemplateComposer(t);
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900 }} noWrap>
                    {t.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {t.language || "en"} · {t.status || ""}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Menu>

        {/* Emoji picker */}
        <Menu anchorEl={emojiAnchor} open={Boolean(emojiAnchor)} onClose={() => setEmojiAnchor(null)} PaperProps={{ sx: { p: 1 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 0.5 }}>
            {EMOJIS.map((e) => (
              <IconButton
                key={e}
                size="small"
                onClick={() => {
                  insertEmoji(e);
                  setEmojiAnchor(null);
                }}
              >
                <Typography>{e}</Typography>
              </IconButton>
            ))}
          </Box>
        </Menu>

        {/* Rephrase Dialog */}
        <Dialog open={rephraseOpen} onClose={() => setRephraseOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle sx={{ fontWeight: 900 }}>Rephrase</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" sx={{ mb: 1.25 }} color="text.secondary">
              Choose a style and we’ll rephrase your current message.
            </Typography>
            <Box sx={{ display: "grid", gap: 1 }}>
              {[
                { key: "simple", label: "Simple" },
                { key: "professional", label: "Professional" },
                { key: "friendly", label: "Friendly" },
                { key: "empathetic", label: "Empathetic" },
              ].map((opt) => (
                <Button
                  key={opt.key}
                  variant={rephraseStyle === opt.key ? "contained" : "outlined"}
                  onClick={() => setRephraseStyle(opt.key)}
                  sx={{ justifyContent: "flex-start", textTransform: "none", fontWeight: 900 }}
                >
                  {opt.label}
                </Button>
              ))}
            </Box>

            <Paper
              variant="outlined"
              sx={{
                mt: 2,
                p: 1.25,
                borderRadius: 2,
                bgcolor: "#FAFAFA",
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {input.trim() || "—"}
            </Paper>
          </DialogContent>

          <Box sx={{ p: 1.25, display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setRephraseOpen(false)}
              sx={{ textTransform: "none" }}
              disabled={rephraseLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={doRephrase}
              sx={{ textTransform: "none" }}
              disabled={rephraseLoading}
              startIcon={rephraseLoading ? <CircularProgress size={14} /> : null}
            >
              Rephrase
            </Button>
          </Box>
        </Dialog>

        {/* Template Composer Dialog */}
        <Dialog open={tplComposeOpen} onClose={() => setTplComposeOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontWeight: 900 }}>Template Preview</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 900 }} noWrap>
                {activeTplForSend?.name || "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Language: {activeTplForSend?.language || "en"} · Status: {activeTplForSend?.status || "—"}
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Variables</Typography>
              {(() => {
                const body = pickBodyTextFromTemplate(activeTplForSend);
                const idxs = extractVarIndexes(body);

                if (!activeTplForSend) return null;
                if (!body) {
                  return (
                    <Typography variant="body2" color="text.secondary">
                      No body found for this template.
                    </Typography>
                  );
                }
                if (!idxs.length) {
                  return (
                    <Typography variant="body2" color="text.secondary">
                      No variables detected in this template.
                    </Typography>
                  );
                }

                return (
                  <Box sx={{ display: "grid", gap: 1 }}>
                    {idxs.map((i) => (
                      <TextField
                        key={i}
                        size="small"
                        label={`{{${i}}}`}
                        value={tplSendVars[String(i)] || ""}
                        onChange={(e) =>
                          setTplSendVars((prev) => ({
                            ...prev,
                            [String(i)]: e.target.value,
                          }))
                        }
                      />
                    ))}
                  </Box>
                );
              })()}
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Preview</Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: "#FAFAFA",
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {tplSendPreview || "—"}
              </Paper>
            </Box>
          </DialogContent>

          <Box sx={{ p: 1.25, display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" onClick={() => setTplComposeOpen(false)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={sendTemplateFromChat} sx={{ textTransform: "none" }} disabled={!activeChat?.phone}>
              Send Template
            </Button>
          </Box>
        </Dialog>
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

        <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setNewChatOpen(false)} disabled={creatingChat}>
            Cancel
          </Button>
          <Button variant="contained" onClick={startNewChatWithTemplate} disabled={creatingChat}>
            {creatingChat ? "Sending..." : "Send"}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
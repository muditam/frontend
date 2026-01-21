// src/whatsapp/WhatsAppInboxWidget.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Badge,
  Fab,
  Popover,
  Typography,
  IconButton,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Tooltip,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import axios from "axios";
import { io } from "socket.io-client";

// ✅ Keep same base you already use
const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const SOCKET_URL = API_BASE;

// ✅ Allowed roles only
const ALLOWED_ROLES = new Set(["Manager", "Sales Agent", "Retention Agent"]);

const digitsOnly = (v = "") => String(v || "").replace(/\D/g, "");
const last10 = (v = "") => digitsOnly(v).slice(-10);
const roomForPhone10 = (p10) => `wa:${String(p10 || "").slice(-10)}`;

/* --------------------
   Auth storage helpers (FIX)
--------------------- */
function safeJsonParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function readUserFromStorage() {
  const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  return safeJsonParse(raw);
}
function userSig(u) {
  if (!u) return "";
  const id = u.id || u._id || "";
  const email = u.email || "";
  const name = u.fullName || "";
  const role = u.role || "";
  return `${id}|${email}|${name}|${role}`;
}

/* --------------------
   Tick helper
--------------------- */
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
  if (st === "read") return <DoneAllIcon sx={{ fontSize: 16, ml: 0.5, color: "#1DA1F2" }} />;
  if (st === "delivered") return <DoneAllIcon sx={{ fontSize: 16, ml: 0.5, color: "rgba(0,0,0,0.55)" }} />;
  if (st === "failed") return <DoneIcon sx={{ fontSize: 16, ml: 0.5, color: "#d32f2f" }} />;
  return <DoneIcon sx={{ fontSize: 16, ml: 0.5, color: "rgba(0,0,0,0.55)" }} />;
}

/* --------------------
   Message helpers
--------------------- */
function getMsgKey(m) {
  return m?.waId || m?._id || null;
}
function getMsgTime(m) {
  const t = m?.timestamp || m?.createdAt;
  const ms = t ? new Date(t).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}
function sortMessagesAsc(list) {
  const arr = Array.isArray(list) ? list.slice() : [];
  arr.sort((a, b) => getMsgTime(a) - getMsgTime(b));
  return arr;
}
function upsertMessage(prev, incoming) {
  if (!incoming) return prev;
  const key = getMsgKey(incoming);
  let next = prev;

  if (!key) {
    next = [...prev, incoming];
  } else {
    const idx = prev.findIndex((x) => getMsgKey(x) === key);
    if (idx >= 0) {
      next = prev.slice();
      next[idx] = { ...prev[idx], ...incoming };
    } else {
      next = [...prev, incoming];
    }
  }

  return sortMessagesAsc(next);
}

/* --------------------
   Media URL fix
--------------------- */
function isProviderUrl(url = "") {
  return /360dialog\.io|graph\.facebook\.com|lookaside\.facebook\.com|fbcdn\.net|facebook\.com/i.test(String(url || ""));
}
function buildProxyUrl(mediaId = "") {
  const id = String(mediaId || "").trim();
  if (!id) return "";
  return `${API_BASE}/api/whatsapp/media-proxy/${encodeURIComponent(id)}`;
}
function getSafeMediaUrl(m) {
  const media = m?.media || null;
  if (!media) return "";

  const id = String(media?.id || "").trim();
  const url = String(media?.url || "").trim();

  if (!url && id) return buildProxyUrl(id);
  if (url && isProviderUrl(url) && id) return buildProxyUrl(id);

  return url || (id ? buildProxyUrl(id) : "");
}
function getMediaMime(m) {
  return (
    m?.media?.mime ||
    m?.media?.mimetype ||
    m?.mime ||
    m?.mediaMime ||
    m?.raw?.audio?.mime_type ||
    m?.raw?.voice?.mime_type ||
    m?.raw?.mime_type ||
    ""
  );
}
function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /safari/i.test(ua) && !/chrome|chromium|android/i.test(ua);
}

/* --------------------
   Media renderer (with blob support)
--------------------- */
function renderMedia(m, blobUrlByMediaId = {}) {
  const safeUrl = getSafeMediaUrl(m);
  const mediaId = String(m?.media?.id || "").trim();
  const filename = String(m?.media?.filename || "").toLowerCase();
  const msgType = String(m?.type || "").toLowerCase();
  const mimeRaw = getMediaMime(m);
  const mime = String(mimeRaw || "").toLowerCase();

  if (!safeUrl) {
    if (mediaId) {
      return (
        <Box sx={{ mt: 0.75 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => window.open(buildProxyUrl(mediaId), "_blank", "noopener,noreferrer")}
            sx={{ textTransform: "none" }}
          >
            Open attachment
          </Button>
        </Box>
      );
    }
    return null;
  }

  const effectiveUrl = mediaId && blobUrlByMediaId[mediaId] ? blobUrlByMediaId[mediaId] : safeUrl;

  const isImg =
    msgType === "image" ||
    mime.startsWith("image/") ||
    /\.(png|jpg|jpeg|webp|gif)$/i.test(effectiveUrl) ||
    /\.(png|jpg|jpeg|webp|gif)$/i.test(filename);

  const isAudio =
    msgType === "audio" ||
    msgType === "voice" ||
    msgType === "ptt" ||
    mime.startsWith("audio/") ||
    mime.includes("ogg") ||
    /\.(mp3|wav|ogg|opus|m4a)$/i.test(effectiveUrl) ||
    /\.(mp3|wav|ogg|opus|m4a)$/i.test(filename);

  const isVideo =
    msgType === "video" ||
    mime.startsWith("video/") ||
    /\.(mp4|webm|mov)$/i.test(effectiveUrl) ||
    /\.(mp4|webm|mov)$/i.test(filename);

  const isPdf = mime.includes("pdf") || /\.pdf$/i.test(effectiveUrl) || /\.pdf$/i.test(filename);

  if (isImg) {
    return (
      <Box sx={{ mt: 0.75 }}>
        <Box
          component="img"
          src={effectiveUrl}
          alt="attachment"
          sx={{
            width: 220,
            maxWidth: "100%",
            borderRadius: 1.5,
            border: "1px solid #e5e5e5",
            display: "block",
            cursor: "pointer",
          }}
          onClick={() => window.open(effectiveUrl, "_blank", "noopener,noreferrer")}
        />
      </Box>
    );
  }

  const safari = isSafariBrowser();
  const looksLikeOggOpus =
    mime.includes("ogg") ||
    mime.includes("opus") ||
    /\.ogg|\.opus/i.test(filename) ||
    /\.ogg|\.opus/i.test(effectiveUrl);

  if (isAudio) {
    if (safari && looksLikeOggOpus) {
      return (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" color="text.secondary">
            Safari can’t play this voice note format (ogg/opus).
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => window.open(effectiveUrl, "_blank", "noopener,noreferrer")}
              sx={{ textTransform: "none" }}
            >
              Open audio
            </Button>
          </Box>
        </Box>
      );
    }

    const typeAttr = mimeRaw && !/octet-stream/i.test(mimeRaw) ? mimeRaw : undefined;

    return (
      <Box sx={{ mt: 0.75 }}>
        <audio
          key={effectiveUrl}
          controls
          preload="metadata"
          style={{ width: "260px", maxWidth: "100%" }}
          onError={(e) => console.warn("AUDIO_ERROR", e?.currentTarget?.error, { src: effectiveUrl, mediaId, mimeRaw })}
        >
          <source src={effectiveUrl} type={typeAttr} />
          Your browser does not support audio playback.
        </audio>
      </Box>
    );
  }

  if (isVideo) {
    return (
      <Box sx={{ mt: 0.75 }}>
        <video
          controls
          preload="metadata"
          src={effectiveUrl}
          style={{
            width: "260px",
            maxWidth: "100%",
            borderRadius: "10px",
            border: "1px solid #e5e5e5",
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 0.75 }}>
      <Button
        size="small"
        variant="outlined"
        onClick={() => window.open(effectiveUrl, "_blank", "noopener,noreferrer")}
        sx={{ textTransform: "none" }}
      >
        {isPdf ? "Open PDF" : "Open attachment"}
      </Button>
    </Box>
  );
}

/* --------------------
   UI helpers
--------------------- */
function initials(nameOrPhone = "") {
  const s = String(nameOrPhone || "").trim();
  if (!s) return "U";
  if (/^\d+$/.test(s)) return s.slice(-2);
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function fmtTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtRelative(d) {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  return `${dd}d`;
}
function detectParamCountFromText(tplBody = "") {
  const s = String(tplBody || "");
  const matches = s.match(/\{\{\s*(\d+)\s*\}\}/g) || [];
  let max = 0;
  for (const m of matches) {
    const n = Number(String(m).replace(/[^\d]/g, ""));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max;
}
function renderTemplatePreview(body = "", params = []) {
  let out = String(body || "");
  params.forEach((v, idx) => {
    const i = idx + 1;
    const re = new RegExp(`\\{\\{\\s*${i}\\s*\\}\\}`, "g");
    out = out.replace(re, String(v || ""));
  });
  return out;
}

export default function WhatsAppInboxWidget({ onOpenChat }) {
  const location = useLocation();
  const isLoginRoute = useMemo(() => location?.pathname === "/login", [location?.pathname]);

  const fabRef = useRef(null);
  const socketRef = useRef(null);
  const joinedRoomsRef = useRef(new Set());
  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const [loading, setLoading] = useState(false);
  const [convos, setConvos] = useState([]);

  const [view, setView] = useState("list"); // "list" | "chat"
  const [active, setActive] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  // composer
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // templates
  const [tplLoading, setTplLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplSelected, setTplSelected] = useState("");
  const [tplParamCount, setTplParamCount] = useState(0);
  const [tplParams, setTplParams] = useState([]);
  const [tplBodyPreview, setTplBodyPreview] = useState("");

  // ✅ Blob URLs for protected media-proxy (fixes 0:00/0:00 voice notes)
  const [blobUrlByMediaId, setBlobUrlByMediaId] = useState({});

  const clearBlobUrls = useCallback(() => {
    setBlobUrlByMediaId((prev) => {
      try {
        Object.values(prev || {}).forEach((u) => {
          try {
            URL.revokeObjectURL(u);
          } catch {}
        });
      } catch {}
      return {};
    });
  }, []);

  /* --------------------
     Session user (auto updates after login)
  --------------------- */
  const [sessionUser, setSessionUser] = useState(() => readUserFromStorage());

  useEffect(() => {
    let alive = true;

    const sync = () => {
      if (!alive) return;
      const next = readUserFromStorage();
      setSessionUser((prev) => (userSig(prev) === userSig(next) ? prev : next));
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("muditam:user-changed", sync);

    const t = setInterval(sync, 1200);

    return () => {
      alive = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("muditam:user-changed", sync);
      clearInterval(t);
    };
  }, []);

  const myNameRaw = useMemo(() => String(sessionUser?.fullName || "").trim(), [sessionUser?.fullName]);
  const myName = useMemo(() => myNameRaw.toLowerCase(), [myNameRaw]);
  const myRole = useMemo(() => String(sessionUser?.role || "").trim(), [sessionUser?.role]);

  const allowed = useMemo(() => {
    if (!myNameRaw) return false;
    if (!ALLOWED_ROLES.has(myRole)) return false;
    return true;
  }, [myNameRaw, myRole]);

  // ✅ hide widget on /login AND when not logged-in/allowed
  const shouldShowWidget = useMemo(() => !isLoginRoute && allowed, [isLoginRoute, allowed]);

  // if route becomes /login (or user logs out), force close popover
  useEffect(() => {
    if (!shouldShowWidget) {
      setAnchorEl(null);
      setView("list");
      setActive(null);
      setMessages([]);
      setDraft("");
      clearBlobUrls();
    }
  }, [shouldShowWidget, clearBlobUrls]);

  const phone10Active = useMemo(() => last10(active?.phone || ""), [active]);

  const totalUnread = useMemo(() => {
    return (convos || []).reduce((sum, c) => sum + (Number(c?.unreadCount) || 0), 0);
  }, [convos]);

  const visibleConvos = useMemo(() => {
    const list = Array.isArray(convos) ? convos.slice() : [];
    if (myRole === "Manager") return list;

    return list.filter((c) => {
      const assigned = String(c?.assignedToLabel || "").trim().toLowerCase();
      return assigned && assigned === myName;
    });
  }, [convos, myRole, myName]);

  const sortedConvos = useMemo(() => {
    const list = Array.isArray(visibleConvos) ? visibleConvos.slice() : [];
    list.sort((a, b) => {
      const au = Number(a?.unreadCount) || 0;
      const bu = Number(b?.unreadCount) || 0;
      if (au !== bu) return bu - au;
      const at = a?.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b?.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bt - at;
    });
    return list;
  }, [visibleConvos]);

  const fetchConversations = useCallback(async () => {
    if (!shouldShowWidget) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/api/whatsapp/conversations`, {
        withCredentials: true,
        params: { role: myRole || "", userName: myNameRaw || "" },
      });
      const list = Array.isArray(r.data) ? r.data : [];
      setConvos(list);
    } finally {
      setLoading(false);
    }
  }, [shouldShowWidget, myNameRaw, myRole]);

  const fetchMessages = useCallback(
    async (p10) => {
      if (!shouldShowWidget) return;
      if (!p10) return;
      setChatLoading(true);
      try {
        const r = await axios.get(`${API_BASE}/api/whatsapp/messages`, {
          withCredentials: true,
          params: { phone: p10 },
        });
        const list = Array.isArray(r.data) ? r.data : [];
        setMessages(sortMessagesAsc(list));
      } finally {
        setChatLoading(false);
      }
    },
    [shouldShowWidget]
  );

  const markRead = useCallback(
    async (p10) => {
      if (!shouldShowWidget) return;
      if (!p10) return;

      setConvos((prev) =>
        prev.map((c) => (last10(c?.phone) === p10 ? { ...c, unreadCount: 0, lastReadAt: new Date() } : c))
      );
      try {
        await axios.post(`${API_BASE}/api/whatsapp/conversations/mark-read`, { phone: p10 }, { withCredentials: true });
      } catch {}
    },
    [shouldShowWidget]
  );

  const scrollToBottom = useCallback((smooth = false) => {
    try {
      const el = chatScrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    } catch {
      try {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      } catch {}
    }
  }, []);

  // ✅ Prefetch audio blobs from protected media-proxy WITH credentials
  useEffect(() => {
    if (!shouldShowWidget) return;
    let cancelled = false;

    async function prefetchAudioBlobs() {
      const list = Array.isArray(messages) ? messages : [];

      for (const m of list) {
        const mediaId = String(m?.media?.id || "").trim();
        if (!mediaId) continue;
        if (blobUrlByMediaId[mediaId]) continue;

        const msgType = String(m?.type || "").toLowerCase();
        const mime = String(getMediaMime(m) || "").toLowerCase();
        const filename = String(m?.media?.filename || "").toLowerCase();

        const isAudio =
          msgType === "audio" ||
          msgType === "voice" ||
          msgType === "ptt" ||
          mime.startsWith("audio/") ||
          mime.includes("ogg") ||
          /\.(mp3|wav|ogg|opus|m4a)$/i.test(filename);

        if (!isAudio) continue;

        const safeUrl = getSafeMediaUrl(m);
        if (!safeUrl) continue;
        if (!safeUrl.includes("/api/whatsapp/media-proxy/")) continue;

        try {
          const res = await fetch(safeUrl, { credentials: "include" });
          if (!res.ok) continue;

          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);

          if (cancelled) {
            try {
              URL.revokeObjectURL(objUrl);
            } catch {}
            continue;
          }

          setBlobUrlByMediaId((prev) => (prev[mediaId] ? prev : { ...prev, [mediaId]: objUrl }));
        } catch {}
      }
    }

    prefetchAudioBlobs();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowWidget, messages]);

  // ✅ socket setup (once)
  useEffect(() => {
    if (!shouldShowWidget) return;
    if (socketRef.current) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelayMax: 2000,
    });

    const socket = socketRef.current;

    const onWaConversation = (payload) => {
      const p10 = payload?.phone10;
      const patch = payload?.patch || {};
      if (!p10) return;

      setConvos((prev) => {
        const idx = prev.findIndex((c) => last10(c?.phone) === p10);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = { ...next[idx], ...patch };
        return next;
      });
    };

    const onWaMessage = (payload) => {
      const msg = payload?.message || payload;
      const p10 = payload?.phone10 || last10(msg?.from) || last10(msg?.to) || "";
      if (!p10) return;

      setConvos((prev) => {
        const idx = prev.findIndex((c) => last10(c?.phone) === p10);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = {
          ...next[idx],
          lastMessageAt: msg?.timestamp || msg?.createdAt || new Date(),
          lastMessageText: String(msg?.text || "").slice(0, 200) || next[idx]?.lastMessageText,
          lastInboundAt:
            msg?.direction?.toUpperCase?.() === "INBOUND" ? (msg?.timestamp || new Date()) : next[idx]?.lastInboundAt,
        };
        return next;
      });

      if (phone10Active && p10 === phone10Active) {
        setMessages((prev) => upsertMessage(prev, msg));
        setTimeout(() => scrollToBottom(true), 0);
      }
    };

    socket.on("wa:conversation", onWaConversation);
    socket.on("wa:message", onWaMessage);

    return () => {
      socket.off("wa:conversation", onWaConversation);
      socket.off("wa:message", onWaMessage);
    };
  }, [shouldShowWidget, phone10Active, scrollToBottom]);

  // ✅ join rooms for visible convos
  useEffect(() => {
    const socket = socketRef.current;
    if (!shouldShowWidget) return;
    if (!socket || !socket.connected) return;

    const desired = new Set((visibleConvos || []).map((c) => last10(c?.phone)).filter(Boolean));

    for (const p10 of desired) {
      const room = roomForPhone10(p10);
      if (!joinedRoomsRef.current.has(room)) {
        socket.emit("wa:join", { phone10: p10, userName: myNameRaw || "" });
        joinedRoomsRef.current.add(room);
      }
    }

    for (const room of Array.from(joinedRoomsRef.current)) {
      const p10 = room.replace(/^wa:/, "");
      if (!desired.has(p10)) {
        socket.emit("wa:leave", { phone10: p10 });
        joinedRoomsRef.current.delete(room);
      }
    }
  }, [shouldShowWidget, visibleConvos, myNameRaw]);

  // ✅ initial load + periodic refresh
  useEffect(() => {
    if (!shouldShowWidget) return;
    fetchConversations();
    const t = setInterval(fetchConversations, 25000);
    return () => clearInterval(t);
  }, [shouldShowWidget, fetchConversations]);

  const handleOpen = () => setAnchorEl(fabRef.current);

  const handleClose = () => {
    setAnchorEl(null);
    setView("list");
    setActive(null);
    setMessages([]);
    setDraft("");
    clearBlobUrls();
  };

  const openChatInline = async (c) => {
    if (!shouldShowWidget) return;
    clearBlobUrls();
    setActive(c);
    setView("chat");
    const p10 = last10(c?.phone);
    await fetchMessages(p10);
    await markRead(p10);
    setTimeout(() => scrollToBottom(false), 60);
  };

  const openFullChat = useCallback(() => {
    const p10 = phone10Active;
    if (!p10) return;

    if (typeof onOpenChat === "function") {
      onOpenChat(p10);
      return;
    }

    const url = `/whatsaap/chat?phone=${encodeURIComponent(p10)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [onOpenChat, phone10Active]);

  /* --------------------
     Sending message
  --------------------- */
  const sendText = useCallback(async () => {
    if (!shouldShowWidget) return;
    const p10 = phone10Active;
    const text = String(draft || "").trim();
    if (!p10 || !text) return;

    setSending(true);
    try {
      const optimistic = {
        _id: `optimistic_${Date.now()}`,
        waId: null,
        direction: "OUTBOUND",
        type: "text",
        text,
        status: "sent",
        timestamp: new Date(),
      };
      setMessages((prev) => upsertMessage(prev, optimistic));
      setDraft("");
      setTimeout(() => scrollToBottom(true), 0);

      await axios.post(`${API_BASE}/api/whatsapp/send-text`, { to: p10, text }, { withCredentials: true });
    } catch (e) {
      setMessages((prev) => {
        const next = prev.slice();
        for (let i = next.length - 1; i >= 0; i--) {
          if (String(next[i]?._id || "").startsWith("optimistic_")) {
            next[i] = { ...next[i], status: "failed" };
            break;
          }
        }
        return next;
      });
    } finally {
      setSending(false);
    }
  }, [shouldShowWidget, draft, phone10Active, scrollToBottom]);

  /* --------------------
     Templates
  --------------------- */
  const loadTemplates = useCallback(async () => {
    if (!shouldShowWidget) return;
    setTplLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/api/whatsapp/templates`, { withCredentials: true });
      const list = Array.isArray(r.data) ? r.data : [];
      setTemplates(list);
    } finally {
      setTplLoading(false);
    }
  }, [shouldShowWidget]);

  const openTemplateDialog = useCallback(async () => {
    if (!shouldShowWidget) return;
    if (!templates.length) await loadTemplates();
    setTplSelected("");
    setTplParamCount(0);
    setTplParams([]);
    setTplBodyPreview("");
    setTplDialogOpen(true);
  }, [shouldShowWidget, templates.length, loadTemplates]);

  const selectedTemplateObj = useMemo(() => {
    const name = String(tplSelected || "");
    return templates.find((t) => String(t?.name || "") === name) || null;
  }, [templates, tplSelected]);

  useEffect(() => {
    if (!selectedTemplateObj) return;
    const body = selectedTemplateObj?.body || selectedTemplateObj?.components?.body || "";
    const count = detectParamCountFromText(body);
    setTplParamCount(count);
    setTplParams(Array.from({ length: count }, () => ""));
    setTplBodyPreview(renderTemplatePreview(body, Array.from({ length: count }, () => "")));
  }, [selectedTemplateObj]);

  useEffect(() => {
    if (!selectedTemplateObj) return;
    const body = selectedTemplateObj?.body || selectedTemplateObj?.components?.body || "";
    setTplBodyPreview(renderTemplatePreview(body, tplParams));
  }, [tplParams, selectedTemplateObj]);

  const sendTemplate = useCallback(async () => {
    if (!shouldShowWidget) return;
    const p10 = phone10Active;
    if (!p10) return;
    if (!tplSelected) return;

    const params = (tplParams || []).map((x) => String(x || "").trim());
    if (tplParamCount > 0 && params.some((x) => !x)) return;

    setSending(true);
    try {
      const optimistic = {
        _id: `optimistic_tpl_${Date.now()}`,
        waId: null,
        direction: "OUTBOUND",
        type: "template",
        text: tplBodyPreview ? String(tplBodyPreview).slice(0, 4000) : `Template: ${tplSelected}`,
        status: "sent",
        timestamp: new Date(),
      };
      setMessages((prev) => upsertMessage(prev, optimistic));
      setTimeout(() => scrollToBottom(true), 0);

      await axios.post(
        `${API_BASE}/api/whatsapp/send-template`,
        { to: p10, templateName: tplSelected, parameters: params, renderedText: tplBodyPreview || "" },
        { withCredentials: true }
      );

      setTplDialogOpen(false);
    } catch (e) {
      setMessages((prev) => {
        const next = prev.slice();
        for (let i = next.length - 1; i >= 0; i--) {
          if (String(next[i]?._id || "").startsWith("optimistic_tpl_")) {
            next[i] = { ...next[i], status: "failed" };
            break;
          }
        }
        return next;
      });
    } finally {
      setSending(false);
    }
  }, [shouldShowWidget, phone10Active, tplSelected, tplParams, tplParamCount, tplBodyPreview, scrollToBottom]);

  // ✅ IMPORTANT: do NOT render anything on /login, and show only after login/allowed
  if (!shouldShowWidget) return null;

  return (
    <>
      {/* ✅ Floating WhatsApp icon ONLY after login (not on /login) */}
      <Box sx={{ position: "fixed", right: 22, bottom: 22, zIndex: 4000 }}>
        <Badge
          badgeContent={totalUnread}
          color="error"
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              zIndex: 5000,
              fontWeight: 900,
              boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
            },
          }}
        >
          <Fab
            ref={fabRef}
            onClick={open ? handleClose : handleOpen}
            sx={{
              bgcolor: "#25D366",
              "&:hover": { bgcolor: "#1FB85A" },
              boxShadow: "0 14px 28px rgba(0,0,0,0.22)",
            }}
          >
            <WhatsAppIcon sx={{ color: "#fff" }} />
          </Fab>
        </Badge>
      </Box>

      {/* ✅ Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 390,
            maxWidth: "92vw",
            height: 560,
            borderRadius: 2.5,
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 1.25, py: 1.1, display: "flex", alignItems: "center", gap: 1, bgcolor: "#fff" }}>
          {view === "chat" ? (
            <IconButton
              size="small"
              onClick={() => {
                setView("list");
                setActive(null);
                setMessages([]);
                setDraft("");
                clearBlobUrls();
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          ) : null}

          <Box sx={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontWeight: 900 }} noWrap>
              {view === "chat" ? (active?.displayName || phone10Active || "Chat") : "Messages"}
            </Typography>

            {view === "list" ? (
              <Chip size="small" color="error" label={totalUnread} sx={{ height: 20, fontWeight: 900, borderRadius: 999 }} />
            ) : null}
          </Box>

          {view === "chat" ? (
            <Tooltip title="Open chat">
              <IconButton size="small" onClick={openFullChat}>
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}

          <IconButton size="small" onClick={fetchConversations} disabled={loading}>
            {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
          </IconButton>

          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider />

        {/* Body */}
        <Box sx={{ height: "calc(560px - 56px)", bgcolor: "#F7F7F7", overflow: "hidden" }}>
          {view === "list" ? (
            <Box sx={{ height: "100%", overflowY: "auto" }}>
              {loading && !sortedConvos.length ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : sortedConvos.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                  {myRole === "Manager" ? "No conversations." : "No assigned conversations."}
                </Typography>
              ) : (
                <List disablePadding>
                  {sortedConvos.map((c) => {
                    const p10 = last10(c?.phone);
                    const unread = Number(c?.unreadCount) || 0;
                    const title = c?.displayName || p10 || "Customer";
                    const sub = c?.lastMessageText || "—";
                    const rel = fmtRelative(c?.lastMessageAt);

                    return (
                      <ListItemButton
                        key={c?._id || p10}
                        onClick={() => openChatInline(c)}
                        sx={{
                          px: 1.25,
                          py: 1,
                          bgcolor: "#FFFFFF",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "rgba(18,140,126,0.14)", color: "#075E54", fontWeight: 900 }}>
                            {initials(title)}
                          </Avatar>
                        </ListItemAvatar>

                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography sx={{ fontWeight: 900 }} noWrap>
                                {title}
                              </Typography>

                              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
                                {rel ? (
                                  <Typography variant="caption" color="text.secondary">
                                    {rel}
                                  </Typography>
                                ) : null}

                                {unread ? <Box sx={{ width: 10, height: 10, borderRadius: 999, bgcolor: "#1976d2" }} /> : null}
                              </Box>
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {sub}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
            </Box>
          ) : (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <Box sx={{ px: 1.25, py: 1, bgcolor: "#fff", borderBottom: "1px solid #eee" }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                    {phone10Active || ""}
                  </Typography>
                </Box>
              </Box>

              <Box ref={chatScrollRef} sx={{ flex: 1, overflowY: "auto", p: 1.25 }}>
                {chatLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (messages || []).length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                    No messages.
                  </Typography>
                ) : (
                  (messages || []).map((m) => {
                    const outbound = String(m?.direction || "").toUpperCase() === "OUTBOUND";
                    const time = fmtTime(m?.timestamp || m?.createdAt);

                    return (
                      <Box
                        key={m?._id || m?.waId || Math.random()}
                        sx={{ display: "flex", justifyContent: outbound ? "flex-end" : "flex-start", mb: 1 }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            maxWidth: "85%",
                            px: 1.25,
                            py: 0.75,
                            borderRadius: 2,
                            bgcolor: outbound ? "#DCF8C6" : "#FFFFFF",
                            border: "1px solid #EAEAEA",
                          }}
                        >
                          {!!m?.text && <Typography sx={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{m.text}</Typography>}
                          {renderMedia(m, blobUrlByMediaId)}
                          <Box sx={{ mt: 0.5, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0.25 }}>
                            <Typography variant="caption" sx={{ opacity: 0.65 }}>
                              {time}
                            </Typography>
                            {outbound ? <MessageTicks status={m?.status} /> : null}
                          </Box>
                        </Paper>
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Box sx={{ p: 1, bgcolor: "#fff", borderTop: "1px solid #eee" }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={openTemplateDialog}
                    disabled={!phone10Active || sending}
                    sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2, whiteSpace: "nowrap" }}
                  >
                    Template
                  </Button>

                  <TextField
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message"
                    size="small"
                    fullWidth
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendText();
                      }
                    }}
                  />

                  <IconButton onClick={sendText} disabled={!phone10Active || sending || !String(draft || "").trim()}>
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Template dialog */}
      <Dialog open={tplDialogOpen} onClose={() => setTplDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Send template</DialogTitle>
        <DialogContent dividers>
          {tplLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={22} />
            </Box>
          ) : (
            <>
              <TextField
                select
                fullWidth
                label="Template"
                value={tplSelected}
                onChange={(e) => setTplSelected(e.target.value)}
                sx={{ mt: 1 }}
              >
                {(templates || [])
                  .slice()
                  .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")))
                  .map((t) => (
                    <MenuItem key={t?._id || t?.name} value={t?.name}>
                      {t?.name}
                    </MenuItem>
                  ))}
              </TextField>

              {tplSelected && tplParamCount > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                    Parameters
                  </Typography>
                  {Array.from({ length: tplParamCount }).map((_, idx) => (
                    <TextField
                      key={idx}
                      fullWidth
                      label={`{{${idx + 1}}}`}
                      value={tplParams[idx] || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTplParams((prev) => {
                          const next = prev.slice();
                          next[idx] = v;
                          return next;
                        });
                      }}
                      sx={{ mb: 1.25 }}
                    />
                  ))}
                </Box>
              ) : null}

              {tplSelected ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                    Preview
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, bgcolor: "#fafafa" }}>
                    <Typography sx={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{tplBodyPreview || "—"}</Typography>
                  </Paper>
                </Box>
              ) : null}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTplDialogOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={sendTemplate}
            disabled={!tplSelected || sending || (tplParamCount > 0 && (tplParams || []).some((x) => !String(x || "").trim()))}
            sx={{ textTransform: "none", fontWeight: 900, bgcolor: "#25D366", "&:hover": { bgcolor: "#1fb85a" } }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

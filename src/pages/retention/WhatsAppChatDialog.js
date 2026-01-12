import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  TextField,
  Button,
  Paper,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import ViewListIcon from "@mui/icons-material/ViewList";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import axios from "axios";
import { io } from "socket.io-client";

import WhatsAppCartDrawer from "./WhatsAppCartDrawer";

// ✅ Your API base
const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
// ✅ Socket URL (same server)
const SOCKET_URL = API_BASE;

const digitsOnly = (v = "") => String(v || "").replace(/\D/g, "");
const last10 = (v = "") => digitsOnly(v).slice(-10);

const EMOJIS = ["😊", "😂", "🙏", "👍", "❤️", "🔥", "😄", "😅", "😇", "🤝", "😎", "🥳", "😢", "😡", "✅", "✨"];

function fmtRemaining(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}h ${mm}m ${ss}s`;
}

// ---------- time helpers ----------
function formatHM(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function dayKey(d) {
  if (!d) return "unknown";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function formatDayLabel(key) {
  const [y, m, d] = key.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --------------------
// Template helpers
// --------------------
function extractTemplateBodyText(tpl) {
  if (!tpl) return "";
  if (typeof tpl?.bodyText === "string") return tpl.bodyText;
  if (typeof tpl?.body === "string") return tpl.body;
  if (typeof tpl?.text === "string") return tpl.text;
  const comps = Array.isArray(tpl?.components) ? tpl.components : [];
  const bodyComp =
    comps.find((x) => String(x?.type || "").toUpperCase() === "BODY") ||
    comps.find((x) => String(x?.type || "").toLowerCase() === "body");
  if (typeof bodyComp?.text === "string") return bodyComp.text;
  return "";
}
function extractPlaceholderCount(bodyText) {
  if (!bodyText) return 0;
  const re = /{{\s*(\d+)\s*}}/g;
  let m;
  let max = 0;
  while ((m = re.exec(bodyText))) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return max;
}
function applyTemplateVars(bodyText, vars) {
  if (!bodyText) return "";
  return bodyText.replace(/{{\s*(\d+)\s*}}/g, (_, num) => {
    const i = parseInt(num, 10) - 1;
    const v = vars?.[i];
    return v != null && String(v).trim() !== "" ? String(v) : `{{${num}}}`;
  });
}

// --------------------
// Tick helper
// --------------------
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
  if (st === "failed") {
    return (
      <Typography component="span" sx={{ fontSize: 12, color: "error.main", ml: 0.5 }}>
        !
      </Typography>
    );
  }
  if (st === "read") {
    return <DoneAllIcon sx={{ fontSize: 16, ml: 0.5, color: "#1DA1F2", verticalAlign: "middle" }} />;
  }
  if (st === "delivered") {
    return <DoneAllIcon sx={{ fontSize: 16, ml: 0.5, color: "rgba(0,0,0,0.55)", verticalAlign: "middle" }} />;
  }
  return <DoneIcon sx={{ fontSize: 16, ml: 0.5, color: "rgba(0,0,0,0.55)", verticalAlign: "middle" }} />;
}

// --------------------
// Message upsert helper
// --------------------
function getMsgKey(m) {
  return m?.waId || m?._id || null;
}
function getMsgTime(m) {
  const t = m?.timestamp || m?.createdAt;
  const ms = t ? new Date(t).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}
function upsertMessage(prev, incoming) {
  if (!incoming) return prev;
  const key = getMsgKey(incoming);
  if (!key) {
    const next = [...prev, incoming];
    next.sort((a, b) => getMsgTime(a) - getMsgTime(b));
    return next;
  }
  const idx = prev.findIndex((x) => getMsgKey(x) === key);
  let next;
  if (idx >= 0) {
    next = prev.slice();
    next[idx] = { ...prev[idx], ...incoming };
  } else {
    next = [...prev, incoming];
  }
  next.sort((a, b) => getMsgTime(a) - getMsgTime(b));
  return next;
}

// --------------------
// Scroll helpers
// --------------------
function isNearBottom(el, thresholdPx = 140) {
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
}

export default function WhatsAppChatDrawer({
  open,
  onClose,
  phone,
  leadId,
  leadName,
  currentUserName,
  onSavePrivateNote,
}) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));
  const chatWidthPx = isMdUp ? 620 : isSmUp ? 520 : 0;

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [text, setText] = useState("");
  const [windowExpiresAt, setWindowExpiresAt] = useState(null);
  const [tick, setTick] = useState(0);
  const [quickAnchor, setQuickAnchor] = useState(null);
  const [tplAnchor, setTplAnchor] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [privateMode, setPrivateMode] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);

  const [helpWriteLoading, setHelpWriteLoading] = useState(false);

  const [rephraseOpen, setRephraseOpen] = useState(false);
  const [rephraseStyle, setRephraseStyle] = useState("professional");
  const [rephraseLoading, setRephraseLoading] = useState(false);

  const fileRef = useRef(null);
  const listRef = useRef(null);

  const socketRef = useRef(null);
  const joinedPhoneRef = useRef(null);

  // ✅ Scroll control refs
  const didInitialScrollRef = useRef(false);
  const stickToBottomRef = useRef(true);

  const phone10 = useMemo(() => last10(phone), [phone]);

  const remainingMs = useMemo(() => {
    if (!windowExpiresAt) return null;
    return new Date(windowExpiresAt).getTime() - Date.now();
  }, [windowExpiresAt, tick]);

  const sessionActive = remainingMs != null && remainingMs > 0;

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

  // ✅ Only UTILITY templates
  const utilityTemplates = useMemo(() => {
    return (templates || []).filter((t) => String(t?.category || "").toUpperCase() === "UTILITY");
  }, [templates]);

  // Template composer
  const [tplComposeOpen, setTplComposeOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [tplVars, setTplVars] = useState([]);

  const scrollToBottomSoon = useCallback((behavior = "auto") => {
    const el = listRef.current;
    if (!el) return;

    // run multiple times (drawer transition + images can change height)
    const doScroll = () => {
      try {
        el.scrollTo({ top: el.scrollHeight, behavior });
      } catch {
        el.scrollTop = el.scrollHeight;
      }
    };

    requestAnimationFrame(() => {
      doScroll();
      requestAnimationFrame(doScroll);
    });

    // extra safety after layout settles
    setTimeout(doScroll, 120);
    setTimeout(doScroll, 320);
  }, []);

  const fetchConversationMeta = async () => {
    const res = await axios.get(`${API_BASE}/api/whatsapp/conversations`);
    const list = Array.isArray(res.data) ? res.data : [];
    const found = list.find((c) => last10(c.phone) === phone10);
    setWindowExpiresAt(found?.windowExpiresAt || null);
  };

  const fetchMessages = async () => {
    if (!phone10) return;
    const res = await axios.get(`${API_BASE}/api/whatsapp/messages`, { params: { phone: phone10 } });
    setMessages(Array.isArray(res.data) ? res.data : []);
  };

  const fetchTemplates = async () => {
    const res = await axios.get(`${API_BASE}/api/whatsapp/templates`);
    setTemplates(Array.isArray(res.data) ? res.data : []);
  };

  const refreshAll = async () => {
    if (!phone10) return;
    setLoading(true);
    try {
      await Promise.all([fetchConversationMeta(), fetchMessages(), fetchTemplates()]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Socket: connect + join room + realtime events
  useEffect(() => {
    if (!open) return;
    if (!phone10) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelayMax: 2000,
      });
    }

    const socket = socketRef.current;

    const joinRoom = () => {
      if (!socket?.connected) return;
      if (joinedPhoneRef.current && joinedPhoneRef.current !== phone10) {
        socket.emit("wa:leave", { phone10: joinedPhoneRef.current });
      }
      socket.emit("wa:join", { phone10, leadId, userName: currentUserName });
      joinedPhoneRef.current = phone10;
    };

    const onConnect = () => joinRoom();

    const onWaMessage = (payload) => {
      const msg = payload?.message || payload;
      const p10 = payload?.phone10 || last10(msg?.from) || last10(msg?.to) || "";
      if (p10 && p10 !== phone10) return;

      setMessages((prev) => upsertMessage(prev, msg));
      if (payload?.windowExpiresAt) setWindowExpiresAt(payload.windowExpiresAt);

      // if user is at bottom, keep them at bottom on new incoming
      if (stickToBottomRef.current) {
        scrollToBottomSoon("auto");
      }
    };

    const onWaStatus = (payload) => {
      const waId = payload?.waId || payload?.id;
      const status = payload?.status;
      const p10 = payload?.phone10;
      if (p10 && p10 !== phone10) return;
      if (!waId || !status) return;
      setMessages((prev) => prev.map((m) => (m?.waId === waId ? { ...m, status } : m)));
    };

    const onWaConversation = (payload) => {
      const p10 = payload?.phone10;
      if (p10 && p10 !== phone10) return;
      if (payload?.windowExpiresAt) setWindowExpiresAt(payload.windowExpiresAt);
    };

    socket.on("connect", onConnect);
    socket.on("wa:message", onWaMessage);
    socket.on("wa:status", onWaStatus);
    socket.on("wa:conversation", onWaConversation);

    joinRoom();

    return () => {
      socket.off("connect", onConnect);
      socket.off("wa:message", onWaMessage);
      socket.off("wa:status", onWaStatus);
      socket.off("wa:conversation", onWaConversation);
    };
  }, [open, phone10, leadId, currentUserName, scrollToBottomSoon]);

  // ✅ disconnect socket when drawer closes
  useEffect(() => {
    if (open) return;
    const socket = socketRef.current;
    if (!socket) return;
    if (joinedPhoneRef.current) {
      socket.emit("wa:leave", { phone10: joinedPhoneRef.current });
      joinedPhoneRef.current = null;
    }
    socket.disconnect();
    socketRef.current = null;
  }, [open]);

  // ✅ When drawer opens: reset flags + load data + start timer
  useEffect(() => {
    if (!open) return;

    didInitialScrollRef.current = false; // reset initial scroll for every open
    stickToBottomRef.current = true;

    setText("");
    setPrivateMode(false);
    setTplComposeOpen(false);
    setActiveTemplate(null);
    setTplVars([]);

    refreshAll();

    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phone10]);

  // ✅ close cart drawer if chat drawer closes
  useEffect(() => {
    if (!open) setCartOpen(false);
  }, [open]);

  // ✅ Track user scroll: if they scroll up, don't auto-pull them down
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      stickToBottomRef.current = isNearBottom(el);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map();
    (messages || []).forEach((m) => {
      const k = dayKey(m.timestamp || m.createdAt || Date.now());
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(m);
    });

    // keep chronological days (oldest day first) -> newest day last
    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

    return keys.map((k) => ({
      key: k,
      label: formatDayLabel(k),
      items: (map.get(k) || [])
        .slice()
        .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)),
    }));
  }, [messages]);

  // ✅ Initial auto-scroll to bottom after first render of messages (and only once per open)
  useEffect(() => {
    if (!open) return;
    if (loading) return;
    if (!messages?.length) return;

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      scrollToBottomSoon("auto");
    }
  }, [open, loading, messages.length, grouped.length, scrollToBottomSoon]);

  const sendText = async () => {
    const body = text.trim();
    if (!body) return;

    if (privateMode) {
      await onSavePrivateNote?.(body);
      setText("");
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/whatsapp/send-text`, { to: phone10, text: body });
      setText("");
      stickToBottomRef.current = true; // after sending, stick to bottom
      scrollToBottomSoon("auto");
      await refreshAll();
    } catch (e) {
      const code = e?.response?.data?.code;
      if (code === "SESSION_EXPIRED") alert("Session expired. Please use a template message.");
      else alert("Failed to send message.");
    }
  };

  const sendTemplate = async (tpl, vars = [], renderedPreview = "") => {
    try {
      await axios.post(`${API_BASE}/api/whatsapp/send-template`, {
        to: phone10,
        templateName: tpl.name,
        parameters: (vars || []).map((x) => String(x ?? "")),
        renderedText: renderedPreview || "",
      });
      stickToBottomRef.current = true;
      scrollToBottomSoon("auto");
      await refreshAll();
    } catch (e) {
      alert("Template send failed.");
    }
  };

  const onPickFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Max attachment size is 5MB.");
      return;
    }
    if (privateMode) {
      alert("Attachments are disabled in Private Reply.");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("to", phone10);
      fd.append("file", file);
      await axios.post(`${API_BASE}/api/whatsapp/send-media`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      stickToBottomRef.current = true;
      scrollToBottomSoon("auto");
      await refreshAll();
    } catch (e) {
      alert("Failed to send attachment.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const insertEmoji = (emo) => setText((t) => t + emo);

  const openTemplateComposer = (tpl) => {
    const bodyText = extractTemplateBodyText(tpl);
    const count = extractPlaceholderCount(bodyText);
    setActiveTemplate(tpl);
    setTplVars(Array.from({ length: count }, () => ""));
    setTplComposeOpen(true);
  };

  const templateBodyText = useMemo(() => extractTemplateBodyText(activeTemplate), [activeTemplate]);

  const templatePreview = useMemo(() => {
    if (!activeTemplate) return "";
    if (templateBodyText) return applyTemplateVars(templateBodyText, tplVars);
    return "";
  }, [activeTemplate, templateBodyText, tplVars]);

  const renderMedia = (m) => {
    const url = m?.media?.url || m?.mediaUrl || "";
    const mime = m?.media?.mime || m?.mime || "";
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
              // images load later -> height changes, keep bottom if needed
              if (stickToBottomRef.current) scrollToBottomSoon("auto");
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
          Open attachment
        </Button>
      </Box>
    );
  };

  // ✅ Help me write
  const helpMeWrite = async () => {
    if (!phone10) return;
    if (privateMode) {
      alert("Help me write is disabled in Private Reply.");
      return;
    }
    setHelpWriteLoading(true);
    try {
      const lastInbound = [...(messages || [])]
        .reverse()
        .find((m) => String(m.direction || "").toUpperCase() !== "OUTBOUND");
      const goal = lastInbound?.text
        ? `Reply to the customer's last message: "${String(lastInbound.text).slice(0, 220)}"`
        : "Write a helpful next message to the customer based on the conversation.";

      const r = await axios.post(`${API_BASE}/api/whatsapp/help-me-write`, {
        phone: phone10,
        leadName: leadName || "",
        agentName: currentUserName || "",
        goal,
        tone: "friendly, professional, concise, Hinglish allowed",
        maxMessages: 35,
      });

      const suggestion = String(r?.data?.suggestion || "").trim();
      if (!suggestion) {
        alert("AI did not return a message.");
        return;
      }
      setText(suggestion);
    } catch (e) {
      alert("Help me write failed.");
    } finally {
      setHelpWriteLoading(false);
    }
  };

  const openRephraseDialog = () => {
    if (privateMode) {
      alert("Rephrase is disabled in Private Reply.");
      return;
    }
    if (!text.trim()) {
      alert("Type something first to rephrase.");
      return;
    }
    setRephraseStyle("professional");
    setRephraseOpen(true);
  };

  const doRephrase = async () => {
    const original = text.trim();
    if (!original) return;
    setRephraseLoading(true);
    try {
      const r = await axios.post(`${API_BASE}/api/whatsapp/rephrase`, {
        text: original,
        style: rephraseStyle,
      });
      const out = String(r?.data?.result || r?.data?.rephrased || "").trim();
      if (!out) {
        alert("AI did not return rephrased text.");
        return;
      }
      setText(out);
      setRephraseOpen(false);
    } catch (e) {
      alert("Rephrase failed.");
    } finally {
      setRephraseLoading(false);
    }
  };

  return (
    <>
      {/* ✅ Cart drawer sits to the LEFT of chat drawer */}
      <WhatsAppCartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        chatWidthPx={chatWidthPx}
        phone10={phone10}
        leadName={leadName}
      />

      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        // ✅ IMPORTANT: onEntered ensures scroll after Drawer transition completes
        SlideProps={{
          onEntered: () => {
            stickToBottomRef.current = true;
            scrollToBottomSoon("auto");
          },
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 520, md: 620 },
            maxWidth: "100vw",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1 }}>
          <WhatsAppIcon sx={{ color: "#25D366" }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
              {leadName || "Customer"}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {phone10 || "—"}
            </Typography>
          </Box>

          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Cart / Order">
              <IconButton onClick={() => setCartOpen(true)}>
                <ShoppingCartIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Banner */}
        <Box
          sx={{
            px: 2,
            py: 0.75,
            bgcolor: "#FFF8D6",
            borderTop: "1px solid #F3E7A6",
            borderBottom: "1px solid #F3E7A6",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#7A5B00" }}>
            {sessionActive
              ? `Whatsapp Conversation window will close in ${fmtRemaining(remainingMs)}`
              : "Whatsapp session expired. Use a template message."}
          </Typography>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "#F7F7F7" }} ref={listRef}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : messages.length === 0 ? (
            <Typography color="text.secondary" align="center">
              No messages found.
            </Typography>
          ) : (
            grouped.map((g) => (
              <Box key={g.key} sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 999,
                      border: "1px solid #E6E6E6",
                      bgcolor: "#FFFFFF",
                    }}
                  >
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#444" }}>
                      {g.label}
                    </Typography>
                  </Paper>
                </Box>

                {g.items.map((m, idx) => {
                  const outbound = String(m.direction || "").toUpperCase() === "OUTBOUND";
                  const hm = formatHM(m.timestamp || m.createdAt);
                  const showTicks = outbound;

                  return (
                    <Box
                      key={m._id || m.waId || `${g.key}-${idx}`}
                      sx={{
                        display: "flex",
                        justifyContent: outbound ? "flex-end" : "flex-start",
                        mb: 1,
                      }}
                    >
                      <Paper
                        sx={{
                          maxWidth: "78%",
                          px: 1.25,
                          py: 0.75,
                          borderRadius: 2,
                          bgcolor: outbound ? "#DCF8C6" : "#FFFFFF",
                          border: "1px solid #EAEAEA",
                        }}
                        elevation={0}
                      >
                        {!!m.text && (
                          <Typography sx={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{m.text}</Typography>
                        )}
                        {renderMedia(m)}
                        <Box
                          sx={{
                            mt: 0.5,
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: 0.25,
                          }}
                        >
                          <Typography variant="caption" sx={{ opacity: 0.65 }}>
                            {hm}
                          </Typography>
                          {showTicks && <MessageTicks status={m.status} />}
                        </Box>
                      </Paper>
                    </Box>
                  );
                })}
              </Box>
            ))
          )}
        </Box>

        <Divider />

        {/* Composer */}
        <Box sx={{ p: 1.5, bgcolor: "#FFF" }}>
          {privateMode ? (
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#222" }}>
                  Reply Privately:
                </Typography>
                <Chip
                  label="Private Reply"
                  onDelete={() => setPrivateMode(false)}
                  variant="outlined"
                  sx={{ fontWeight: 800 }}
                />
              </Box>
            </Box>
          ) : null}

          <TextField
            fullWidth
            placeholder={privateMode ? "Type your private reply here" : "Type your message here"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={2}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />

          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPrivateMode((v) => !v)}
              sx={{ textTransform: "none", borderRadius: 1, fontWeight: 800 }}
            >
              Private Reply
            </Button>

            <Tooltip title="Quick Replies">
              <IconButton size="small" onClick={(e) => setQuickAnchor(e.currentTarget)}>
                <FlashOnIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Templates (UTILITY only)">
              <IconButton size="small" onClick={(e) => setTplAnchor(e.currentTarget)}>
                <ViewListIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={privateMode ? "Disabled in Private Reply" : "Attachment (≤ 5MB)"}>
              <span>
                <IconButton size="small" disabled={privateMode} onClick={() => fileRef.current?.click()}>
                  <AttachFileIcon />
                </IconButton>
              </span>
            </Tooltip>
            <input ref={fileRef} type="file" hidden onChange={(e) => onPickFile(e.target.files?.[0])} />

            <Tooltip title="Emojis">
              <IconButton size="small" onClick={(e) => setEmojiAnchor(e.currentTarget)}>
                <InsertEmoticonIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={privateMode ? "Disabled in Private Reply" : "Help me write (AI)"}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={privateMode || helpWriteLoading}
                  onClick={helpMeWrite}
                  startIcon={helpWriteLoading ? <CircularProgress size={14} /> : <AutoFixHighIcon />}
                  sx={{ textTransform: "none", borderRadius: 1, fontWeight: 900 }}
                >
                  Help me write
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={privateMode ? "Disabled in Private Reply" : "Rephrase your current text"}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={privateMode || !text.trim()}
                  onClick={openRephraseDialog}
                  startIcon={<AutorenewIcon />}
                  sx={{ textTransform: "none", borderRadius: 1, fontWeight: 900 }}
                >
                  Rephrase
                </Button>
              </span>
            </Tooltip>

            <Box sx={{ ml: "auto" }}>
              <Button
                variant="contained"
                onClick={sendText}
                disabled={!text.trim()}
                sx={{ textTransform: "none", borderRadius: 1, px: 2 }}
              >
                Send
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Quick replies */}
        <Menu anchorEl={quickAnchor} open={Boolean(quickAnchor)} onClose={() => setQuickAnchor(null)}>
          {QUICK_REPLIES.map((q) => (
            <MenuItem
              key={q}
              onClick={() => {
                setText((t) => (t ? t + "\n" + q : q));
                setQuickAnchor(null);
              }}
            >
              {q}
            </MenuItem>
          ))}
        </Menu>

        {/* Templates menu (UTILITY only) */}
        <Menu
          anchorEl={tplAnchor}
          open={Boolean(tplAnchor)}
          onClose={() => setTplAnchor(null)}
          PaperProps={{ sx: { maxHeight: 360, width: 360 } }}
        >
          {utilityTemplates.length === 0 ? (
            <MenuItem disabled>No UTILITY templates found</MenuItem>
          ) : (
            utilityTemplates.map((t) => (
              <MenuItem
                key={t._id || t.name}
                onClick={() => {
                  setTplAnchor(null);
                  openTemplateComposer(t);
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }} noWrap>
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
        <Menu
          anchorEl={emojiAnchor}
          open={Boolean(emojiAnchor)}
          onClose={() => setEmojiAnchor(null)}
          PaperProps={{ sx: { p: 1 } }}
        >
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

        {/* ✅ Rephrase Dialog */}
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
              {text.trim() || "—"}
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

        {/* Template Composer */}
        <Dialog open={tplComposeOpen} onClose={() => setTplComposeOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontWeight: 900 }}>Template Preview</Typography>
            <Box sx={{ ml: "auto" }}>
              <IconButton onClick={() => setTplComposeOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers>
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 900 }} noWrap>
                {activeTemplate?.name || "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Language: {activeTemplate?.language || "en"} · Status: {activeTemplate?.status || "—"}
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Variables</Typography>
              {tplVars.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No variables detected in this template.
                </Typography>
              ) : (
                <Box sx={{ display: "grid", gap: 1 }}>
                  {tplVars.map((val, idx) => (
                    <TextField
                      key={idx}
                      size="small"
                      label={`{{${idx + 1}}}`}
                      value={val}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTplVars((prev) => {
                          const copy = [...prev];
                          copy[idx] = v;
                          return copy;
                        });
                      }}
                    />
                  ))}
                </Box>
              )}
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
                {templatePreview || "—"}
              </Paper>
            </Box>
          </DialogContent>

          <Box sx={{ p: 1.25, display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" onClick={() => setTplComposeOpen(false)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!activeTemplate) return;
                await sendTemplate(activeTemplate, tplVars, templatePreview);
                setTplComposeOpen(false);
              }}
              sx={{ textTransform: "none" }}
            >
              Send Template
            </Button>
          </Box>
        </Dialog>
      </Drawer>
    </>
  );
}

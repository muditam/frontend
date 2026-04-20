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
  Snackbar,
  Alert,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
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
const DEBUG_SOCKET = false;

/* -----------------------------
   Basic helpers
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
function buildTempId(prefix = "tmp") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function normalizeToWa(toAny = "") {
  const d = digitsOnly(toAny);
  if (!d) return "";
  if (d.length === 10) return `91${d}`;
  return d;
}
function customerPhoneFromMsg(msg) {
  const dir = String(msg?.direction || "").toUpperCase();
  if (dir === "OUTBOUND") return msg?.to || "";
  if (dir === "INBOUND") return msg?.from || "";
  return msg?.phone || msg?.to || msg?.from || "";
}
function sameCustomer(msg, p10) {
  return phone10(customerPhoneFromMsg(msg)) === p10;
}
function removeMessageById(list, id) {
  return list.filter((m) => m?._id !== id);
}

/* -----------------------------
   API helpers
------------------------------ */
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

/* -----------------------------
   Display helpers
------------------------------ */
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
function extractApiErrorMessage(err, fallback = "Request failed") {
  const data = err?.data || {};
  return (
    data?.providerError?.errors?.[0]?.message ||
    data?.providerError?.message ||
    data?.message ||
    err?.message ||
    fallback
  );
}
function statusChipProps(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s.includes("APPROV")) {
    return { label: "APPROVED", sx: { bgcolor: "#e7fbf2", color: "#1b7f4b" } };
  }
  if (s.includes("REJECT")) {
    return { label: "REJECTED", sx: { bgcolor: "#ffeceb", color: "#b42318" } };
  }
  if (s.includes("PEND") || s.includes("SUBMIT") || s.includes("REVIEW")) {
    return { label: "PENDING", sx: { bgcolor: "#fff3dc", color: "#a15c07" } };
  }
  return { label: s || "UNKNOWN", sx: { bgcolor: "#f4f6f8", color: "#344054" } };
}

/* -----------------------------
   Template helpers
------------------------------ */
function templateComponents(tpl) {
  return Array.isArray(tpl?.components) ? tpl.components : [];
}
function isUtilityTemplate(t) {
  const cat = String(t?.category || "").toUpperCase();
  return cat === "UTILITY";
}
function isApprovedTemplate(t) {
  const st = String(t?.status || "").toUpperCase();
  return st.includes("APPROV");
}
function pickBodyTextFromTemplate(tpl) {
  if (!tpl) return "";
  if (tpl.body) return String(tpl.body || "");
  if (tpl.bodyText) return String(tpl.bodyText || "");
  if (tpl.text) return String(tpl.text || "");
  const comps = templateComponents(tpl);
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
function getHeaderMediaFormat(tpl) {
  if (!tpl) return "";
  const comps = templateComponents(tpl);
  const header = comps.find((c) => String(c?.type || "").toUpperCase() === "HEADER");
  const format = String(header?.format || "").toUpperCase();
  if (["IMAGE", "VIDEO", "DOCUMENT"].includes(format)) return format;
  return "";
}
function acceptForHeaderFormat(fmt) {
  const f = String(fmt || "").toUpperCase();
  if (f === "IMAGE") return "image/*";
  if (f === "VIDEO") return "video/*";
  if (f === "DOCUMENT") return ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf";
  return "*/*";
}

/* -----------------------------
   Message helpers
------------------------------ */
function msgKey(m) {
  return (
    m?.waId ||
    m?._id ||
    m?.id ||
    `${m?.direction || "X"}_${m?.timestamp || m?.createdAt || ""}_${m?.text || ""}_${m?.media?.url || ""}_${m?.type || ""}`
  );
}
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
  if (st === "delivered") return <DoneAllIcon sx={{ fontSize: 14, ml: 0.5, color: "rgba(0,0,0,0.55)" }} />;
  if (st === "sent") return <DoneIcon sx={{ fontSize: 14, ml: 0.5, color: "rgba(0,0,0,0.55)" }} />;
  if (st === "failed") {
    return (
      <Typography component="span" sx={{ fontSize: 12, color: "error.main", ml: 0.5, fontWeight: 900 }}>
        !
      </Typography>
    );
  }
  return null;
}
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
   Media helpers
------------------------------ */
function mediaIdFromMsg(m) {
  return m?.media?.id || m?.mediaId || m?.templateMeta?.headerMedia?.id || "";
}
function mediaUrlFromMsg(m) {
  return m?.media?.url || m?.mediaUrl || m?.templateMeta?.headerMedia?.url || "";
}
function mediaMimeFromMsg(m) {
  const tplFmt = m?.templateMeta?.headerMedia?.format;
  let guessedMime = "";
  if (tplFmt === "DOCUMENT") guessedMime = "application/pdf";
  if (tplFmt === "IMAGE") guessedMime = "image/jpeg";
  if (tplFmt === "VIDEO") guessedMime = "video/mp4";
  return m?.media?.mime || m?.mime || guessedMime || "";
}
function mediaFilenameFromMsg(m) {
  return m?.media?.filename || m?.filename || m?.templateMeta?.headerMedia?.filename || "attachment";
}
function detectMediaKind({ url = "", mime = "", fallbackType = "" }) {
  const u = String(url || "");
  const m = String(mime || "").toLowerCase();
  const t = String(fallbackType || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif)$/i.test(u) || t === "image" || t === "sticker") return "image";
  if (m.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(u) || t === "video") return "video";
  if (m.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|opus)$/i.test(u) || t === "audio" || t === "voice") return "audio";
  if (m === "application/pdf" || /\.pdf$/i.test(u) || t === "pdf" || t === "document") return "pdf";
  return "file";
}
function absolutizeMaybe(url = "") {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("blob:")) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${API_BASE}${u}`;
  return u;
}
function resolveBestMediaUrl(msg) {
  return absolutizeMaybe(mediaUrlFromMsg(msg));
}
function mergeServerMessageWithOptimistic(serverMsg, tempMsg) {
  if (!serverMsg || !tempMsg) return serverMsg;

  const serverHasMediaUrl = Boolean(resolveBestMediaUrl(serverMsg));
  const tempHasMediaUrl = Boolean(resolveBestMediaUrl(tempMsg));
  const isTemplate = String(serverMsg?.type || "").toLowerCase() === "template";

  if (!isTemplate || serverHasMediaUrl || !tempHasMediaUrl) return serverMsg;

  const mergedHeaderMedia = {
    ...(tempMsg?.templateMeta?.headerMedia || {}),
    ...(serverMsg?.templateMeta?.headerMedia || {}),
  };

  if (!mergedHeaderMedia.url && tempMsg?.media?.url) {
    mergedHeaderMedia.url = tempMsg.media.url;
  }
  if (!mergedHeaderMedia.mime && tempMsg?.media?.mime) {
    mergedHeaderMedia.mime = tempMsg.media.mime;
  }
  if (!mergedHeaderMedia.filename && tempMsg?.media?.filename) {
    mergedHeaderMedia.filename = tempMsg.media.filename;
  }

  return {
    ...serverMsg,
    media: serverMsg?.media?.url ? serverMsg.media : tempMsg.media,
    templateMeta: {
      ...(tempMsg?.templateMeta || {}),
      ...(serverMsg?.templateMeta || {}),
      headerMedia: Object.keys(mergedHeaderMedia).length ? mergedHeaderMedia : undefined,
    },
  };
}

function MessageMedia({ msg, isNearBottomRef, bottomRef }) {
  const mediaId = mediaIdFromMsg(msg);
  const mime = mediaMimeFromMsg(msg);
  const filename = mediaFilenameFromMsg(msg);
  const resolvedUrl = resolveBestMediaUrl(msg);
  const fallbackType = msg?.templateMeta?.headerMedia?.format || msg?.type;
  const kind = detectMediaKind({ url: resolvedUrl, mime, fallbackType });
  const [audioBlobUrl, setAudioBlobUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    let localBlob = "";
    async function run() {
      if (kind !== "audio" || !resolvedUrl) return;
      if (!resolvedUrl.startsWith(API_BASE)) return;
      try {
        const res = await fetch(resolvedUrl, { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const blob = await res.blob();
        localBlob = URL.createObjectURL(blob);
        if (cancelled) { try { URL.revokeObjectURL(localBlob); } catch {} return; }
        setAudioBlobUrl(localBlob);
      } catch {}
    }
    run();
    return () => {
      cancelled = true;
      if (localBlob) { try { URL.revokeObjectURL(localBlob); } catch {} }
    };
  }, [kind, resolvedUrl, mediaId]);

  if (!resolvedUrl) {
    if (mediaId) return <Box sx={{ mt: 0.75 }}><Typography fontSize={12} color="text.secondary">Media available but URL missing.</Typography></Box>;
    return null;
  }

  if (kind === "image") {
    return (
      <Box sx={{ mt: 0.75 }}>
        <Box
          component="img"
          src={resolvedUrl}
          alt={filename || "attachment"}
          loading="lazy"
          sx={{ width: 220, maxWidth: "100%", borderRadius: 1.5, border: "1px solid #e5e5e5", display: "block", cursor: "pointer" }}
          onLoad={() => { if (isNearBottomRef?.current) bottomRef?.current?.scrollIntoView({ behavior: "auto" }); }}
          onClick={() => window.open(resolvedUrl, "_blank", "noopener,noreferrer")}
        />
      </Box>
    );
  }
  if (kind === "video") {
    return (
      <Box sx={{ mt: 0.75 }}>
        <Box component="video" controls playsInline preload="metadata"
          sx={{ width: 280, maxWidth: "100%", borderRadius: 1.5, border: "1px solid #e5e5e5", display: "block", backgroundColor: "#000" }}
          onLoadedMetadata={() => { if (isNearBottomRef?.current) bottomRef?.current?.scrollIntoView({ behavior: "auto" }); }}>
          <source src={resolvedUrl} type={mime || undefined} />
        </Box>
        <Box sx={{ mt: 0.5, display: "flex", justifyContent: "flex-end" }}>
          <Button size="small" variant="outlined" onClick={() => window.open(resolvedUrl, "_blank", "noopener,noreferrer")} sx={{ textTransform: "none" }}>Open video</Button>
        </Box>
      </Box>
    );
  }
  if (kind === "audio") {
    const src = audioBlobUrl || resolvedUrl;
    return (
      <Box sx={{ mt: 0.75 }}>
        <Box component="audio" controls preload="metadata" sx={{ width: 280, maxWidth: "100%" }}
          onLoadedMetadata={() => { if (isNearBottomRef?.current) bottomRef?.current?.scrollIntoView({ behavior: "auto" }); }}>
          <source src={src} type={mime || undefined} />
        </Box>
        <Box sx={{ mt: 0.5, display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => window.open(resolvedUrl, "_blank", "noopener,noreferrer")} sx={{ textTransform: "none" }}>Open audio</Button>
        </Box>
      </Box>
    );
  }
  if (kind === "pdf") {
    return (
      <Box sx={{ mt: 0.75 }}>
        <Button size="small" variant="outlined" onClick={() => window.open(resolvedUrl, "_blank", "noopener,noreferrer")} sx={{ textTransform: "none" }}>
          Open PDF{filename ? `: ${filename}` : ""}
        </Button>
      </Box>
    );
  }
  return (
    <Box sx={{ mt: 0.75 }}>
      <Button size="small" variant="outlined" onClick={() => window.open(resolvedUrl, "_blank", "noopener,noreferrer")} sx={{ textTransform: "none" }}>
        Open file{filename ? `: ${filename}` : ""}
      </Button>
    </Box>
  );
}

// ─── Template bubble shown inline in chat ────────────────────────────────────
function TemplateBubble({ msg }) {
  const text = msg?.text || "";
  const tplName = msg?.templateMeta?.name || "";
  const hasMedia =
    !!String(msg?.media?.id || "").trim() ||
    !!String(msg?.media?.url || "").trim() ||
    !!String(msg?.templateMeta?.headerMedia?.id || "").trim() ||
    !!String(msg?.templateMeta?.headerMedia?.url || "").trim();

  return (
    <Box>
      {hasMedia && (
        <MessageMedia msg={msg} isNearBottomRef={{ current: true }} bottomRef={{ current: null }} />
      )}
      {!!text && (
        <Typography fontSize={14} whiteSpace="pre-wrap" sx={{ mt: hasMedia ? 0.75 : 0 }}>
          {text}
        </Typography>
      )}
      {!text && !hasMedia && (
        <Typography fontSize={13} color="text.secondary" fontStyle="italic">
          [Template: {tplName || "unknown"}]
        </Typography>
      )}
      <Box sx={{ mt: 0.5, display: "inline-block" }}>
        <Chip
          size="small"
          label={`Template${tplName ? `: ${tplName}` : ""}`}
          sx={{ fontSize: 10, height: 18, bgcolor: "rgba(37,211,102,0.15)", color: "#1a7a42" }}
        />
      </Box>
    </Box>
  );
}

export default function WhatsAppUI() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  const [drafts, setDrafts] = useState({});
  const [input, setInput] = useState("");

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [search, setSearch] = useState("");

  // ── BUG FIX 1: separate error state from toast/success state ──────────────
  // errorMessages was used for both errors (shown in chat area, hiding all messages)
  // AND success toasts. This caused template messages to disappear from the chat.
  // Now: chatError = shown inline (only real errors), toast = temporary snackbar.
  const [chatError, setChatError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);
  const hideToast = useCallback(() => setToast((t) => ({ ...t, open: false })), []);

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [newChatError, setNewChatError] = useState("");

  // ── BUG FIX 2: sessionExpired should only be true when session is actually expired ─
  // Old code called setSessionExpired(true) after a SUCCESSFUL template send which
  // would immediately lock the input. Session window is OPEN after a template send
  // because the customer can now reply within 24h. We track this purely from
  // sessionInfo (derived from conversation.windowExpiresAt).
  const [sessionExpired, setSessionExpired] = useState(false);

  const [tplVars, setTplVars] = useState({});
  const [socketStatus, setSocketStatus] = useState("disconnected");

  const bottomRef = useRef(null);
  const prevLenRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const openedCutoffRef = useRef(0);

  const socketRef = useRef(null);
  const joinedRoomRef = useRef(null);
  const pendingReadRef = useRef(new Map());

  const [quickAnchor, setQuickAnchor] = useState(null);
  const [tplAnchor, setTplAnchor] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);

  const fileRef = useRef(null);
  const [fileUploading, setFileUploading] = useState(false);

  const [tplComposeOpen, setTplComposeOpen] = useState(false);
  const [activeTplForSend, setActiveTplForSend] = useState(null);
  const [tplSendVars, setTplSendVars] = useState({});
  const [tplSending, setTplSending] = useState(false);

  const [tplHeaderFormat, setTplHeaderFormat] = useState("");
  const [tplHeaderFile, setTplHeaderFile] = useState(null);

  const [helpWriteLoading, setHelpWriteLoading] = useState(false);

  const [rephraseOpen, setRephraseOpen] = useState(false);
  const [rephraseStyle, setRephraseStyle] = useState("professional");
  const [rephraseLoading, setRephraseLoading] = useState(false);

  const [newHeaderFormat, setNewHeaderFormat] = useState("");
  const [newHeaderFile, setNewHeaderFile] = useState(null);

  const [tplMenuSearch, setTplMenuSearch] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeDigits = useMemo(() => digitsOnly(activeChat?.phone), [activeChat?.phone]);
  const activeP10 = useMemo(() => phone10(activeChat?.phone), [activeChat?.phone]);

  const activeP10Ref = useRef("");
  const activeDigitsRef = useRef("");
  useEffect(() => {
    activeP10Ref.current = activeP10 || "";
    activeDigitsRef.current = activeDigits || "";
  }, [activeP10, activeDigits]);

  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  const urlPhone = useMemo(() => {
    const p = new URLSearchParams(location.search).get("phone") || "";
    return digitsOnly(p);
  }, [location.search]);

  const lastUrlOpenedRef = useRef("");
  const agentName = useMemo(() => sessionUser?.fullName || "", [sessionUser?.fullName]);

  const activeConversation = useMemo(() => {
    if (!activeP10) return null;
    return conversations.find((c) => phone10(c.phone) === activeP10) || null;
  }, [activeP10, conversations]);

  const sessionInfo = useMemo(() => {
    const exp = activeConversation?.windowExpiresAt ? new Date(activeConversation.windowExpiresAt).getTime() : 0;
    if (!exp) return { has: false, expired: false, msLeft: 0, label: "—" };
    const msLeft = exp - nowTick;
    const expired = msLeft <= 0;
    const s = Math.max(0, Math.floor(msLeft / 1000));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return { has: true, expired, msLeft, label: expired ? "Session expired" : `Session ends in ${hh}:${mm}:${ss}` };
  }, [activeConversation?.windowExpiresAt, nowTick]);

  // ── BUG FIX 3: sync sessionExpired from server-derived sessionInfo only ────
  useEffect(() => {
    if (!activeChat?.phone) return;
    if (!sessionInfo.has) return;
    setSessionExpired(sessionInfo.expired);
  }, [activeChat?.phone, sessionInfo.has, sessionInfo.expired]);

  const activeHeaderTitle = useMemo(() => {
    if (!activeP10) return "Select a chat";
    const name = activeConversation ? chatDisplayName(activeConversation) : activeP10;
    if (!name || name === activeP10) return activeP10 || "—";
    return `${name} (${activeP10})`;
  }, [activeP10, activeConversation]);

  const setDraftFor = useCallback((p10, value) => {
    if (!p10) return;
    setDrafts((prev) => ({ ...prev, [p10]: String(value ?? "") }));
  }, []);

  const clearDraftFor = useCallback((p10) => {
    if (!p10) return;
    setDrafts((prev) => {
      if (!prev[p10]) return prev;
      const next = { ...prev };
      delete next[p10];
      return next;
    });
  }, []);

  const QUICK_REPLIES = useMemo(() => [
    "Hi! How are you doing today?",
    "Just checking in for your follow-up 😊",
    "Can I call you in 10 minutes?",
    "Please share your latest reports if available.",
    "Thank you! I'm here if you need anything.",
  ], []);

  const EMOJIS = useMemo(() => [
    "😊", "😂", "🙏", "👍", "❤️", "🔥", "😄", "😅", "😇", "🤝", "😎", "🥳", "😢", "😡", "✅", "✨",
  ], []);

  const filteredConversations = useMemo(() => {
    const raw = String(search || "").trim();
    if (!raw) return conversations;
    const q = raw.toLowerCase();
    const typedDigits = digitsOnly(raw);
    const p10Query = phone10(typedDigits);
    const tokens = q.split(/\s+/).filter(Boolean);
    return conversations.filter((c) => {
      const phoneRaw = String(c?.phone || "");
      const phoneDigits = digitsOnly(phoneRaw);
      const phoneP10 = phone10(phoneRaw);
      const nameHaystack = [c?.displayName, c?.assignedToLabel, c?.lastMessageText].filter(Boolean).join(" ").toLowerCase();
      const matchesName = tokens.length > 0 && tokens.every((t) => nameHaystack.includes(t));
      const matchesPhone = typedDigits ? phoneDigits.includes(typedDigits) || (p10Query && phoneP10.includes(p10Query)) : false;
      return matchesName || matchesPhone;
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

  const upsertConversationFromMessage = useCallback((msg) => {
    const customerPhone = customerPhoneFromMsg(msg);
    const p10 = phone10(customerPhone);
    if (!p10) return;
    const isInbound = String(msg?.direction || "").toUpperCase() === "INBOUND";
    const isActive = activeP10Ref.current && p10 === activeP10Ref.current;
    const nowIso = msg?.timestamp || new Date().toISOString();
    const url = resolveBestMediaUrl(msg);
    const mime = mediaMimeFromMsg(msg);
    const kind = detectMediaKind({ url, mime, fallbackType: msg?.type });
    const lastText = url
      ? kind === "image" ? "📷 Photo" : kind === "video" ? "🎥 Video" : kind === "audio" ? "🎙️ Audio" : "📎 Attachment"
      : String(msg?.text || "").slice(0, 200);

    setConversations((prev) => {
      const idx = prev.findIndex((c) => phone10(c.phone) === p10);
      const pending = pendingReadRef.current.get(p10);
      const forceRead = pending && Date.now() - pending.at < 30000;

      if (idx === -1) {
        return [{
          phone: customerPhone, displayName: "", assignedToLabel: "",
          lastMessageAt: nowIso, lastMessageText: lastText,
          unreadCount: isInbound && !isActive && !forceRead ? 1 : 0,
          lastReadAt: isActive || forceRead ? (pending?.iso || nowIso) : null,
        }, ...prev];
      }

      const next = [...prev];
      const existing = next[idx];
      const newUnread = forceRead ? 0 : isInbound ? isActive ? 0 : Number(existing?.unreadCount || 0) + 1 : Number(existing?.unreadCount || 0);
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
  }, []);

  const refreshConversations = useCallback(
    async (selectPhone = null, { silent = false } = {}) => {
      if (!silent) setLoadingChats(true);
      try {
        const userName = sessionUser?.fullName || "";
        const userRole = sessionUser?.role || "";
        const queryParams = new URLSearchParams({ role: userRole, userName }).toString();
        const data = (await api(`/api/whatsapp/conversations?${queryParams}`)) || [];
        const serverList = Array.isArray(data) ? data : [];
        const now = Date.now();
        const list = serverList.map((c) => {
          const p10 = phone10(c.phone);
          const pending = pendingReadRef.current.get(p10);
          if (pending && now - pending.at < 30000) return { ...c, unreadCount: 0, lastReadAt: pending.iso || c.lastReadAt };
          return c;
        });
        setConversations(list);
        if (selectPhone) setActiveChat({ phone: selectPhone });
        else if (!activeChat?.phone && list.length) setActiveChat({ phone: digitsOnly(list[0].phone) });
      } catch (e) {
        if (!silent) showToast(e.message || "Failed to load conversations", "error");
      } finally {
        if (!silent) setLoadingChats(false);
      }
    },
    [activeChat?.phone, sessionUser?.fullName, sessionUser?.role, showToast]
  );

  const loadMessagesInitial = useCallback(async (phoneAnyDigits) => {
    const q = digitsOnly(phoneAnyDigits);
    if (!q) return;
    setChatError("");
    setLoadingMessages(true);
    try {
      const data = (await api(`/api/whatsapp/messages?phone=${encodeURIComponent(q)}`)) || [];
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setChatError(e.message || "Failed to load messages");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

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

  const approvedUtilityTemplates = useMemo(() => {
    const list = Array.isArray(templates) ? templates : [];
    return list.filter((t) => isUtilityTemplate(t) && isApprovedTemplate(t));
  }, [templates]);

  const filteredApprovedUtilityTemplates = useMemo(() => {
    const q = tplMenuSearch.trim().toLowerCase();
    if (!q) return approvedUtilityTemplates;
    return approvedUtilityTemplates.filter((t) => {
      const hay = [t?.name, t?.language, t?.status, pickBodyTextFromTemplate(t)].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [approvedUtilityTemplates, tplMenuSearch]);

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
      await api(`/api/whatsapp/conversations/mark-read`, { method: "POST", body: JSON.stringify({ phone }) });
    } catch {}
  }, []);

  useEffect(() => {
    refreshConversations(null, { silent: false });
    fetchTemplates();
  }, [refreshConversations, fetchTemplates]);

  useEffect(() => {
    const s = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });
    socketRef.current = s;
    if (DEBUG_SOCKET) s.onAny((event, ...args) => console.log("[socket]", event, args));

    const onConnect = () => {
      setSocketStatus("connected");
      refreshConversations(null, { silent: true });
      const p10 = activeP10Ref.current;
      if (p10) { s.emit("wa:join", { phone: p10 }); joinedRoomRef.current = roomForPhone10(p10); }
    };
    const onDisconnect = () => setSocketStatus("disconnected");
    const onError = () => setSocketStatus("error");

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onError);

    return () => {
      try { s.off("connect", onConnect); s.off("disconnect", onDisconnect); s.off("connect_error", onError); s.disconnect(); } catch {}
      socketRef.current = null;
      joinedRoomRef.current = null;
    };
  }, [refreshConversations]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const p10 = activeP10;
    const nextRoom = p10 ? roomForPhone10(p10) : null;
    if (joinedRoomRef.current && joinedRoomRef.current !== nextRoom) {
      s.emit("wa:leave", { phone: joinedRoomRef.current.replace("wa:", "") });
      joinedRoomRef.current = null;
    }
    if (nextRoom && joinedRoomRef.current !== nextRoom) {
      s.emit("wa:join", { phone: p10 });
      joinedRoomRef.current = nextRoom;
    }
  }, [activeP10]);

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
      const customerPhone = customerPhoneFromMsg(msg);
      const normalizedMsg = { ...msg, phone: customerPhone || p10 };
      upsertConversationFromMessage(normalizedMsg);

      const activeNow = activeP10Ref.current;
      if (activeNow && p10 === activeNow) {
        setMessages((prev) => {
          const dir = String(normalizedMsg?.direction || "").toUpperCase();

          if (dir === "OUTBOUND") {
            const serverType = String(normalizedMsg?.type || "").toLowerCase();
            const serverText = String(normalizedMsg?.text || "").trim();
            const tempIndex = prev.findIndex((m) => {
              if (!String(m?._id || "").startsWith("tmp_")) return false;
              if (String(m?.direction || "").toUpperCase() !== "OUTBOUND") return false;
              if (!sameCustomer(m, p10)) return false;
              const tempType = String(m?.type || "").toLowerCase();
              if (serverType === "text") return tempType === "text" && String(m?.text || "").trim() === serverText;
              if (serverType === "template") return tempType === "template";
              if (["image", "video", "audio", "document"].includes(serverType)) return ["image", "video", "audio", "document"].includes(tempType);
              return false;
            });
            if (tempIndex !== -1) {
              const next = [...prev];
              next[tempIndex] = mergeServerMessageWithOptimistic(normalizedMsg, next[tempIndex]);
              return next;
            }
          }

          if (normalizedMsg?.waId && prev.some((m) => String(m?.waId || "") === String(normalizedMsg.waId))) return prev;
          const k = msgKey(normalizedMsg);
          if (prev.some((m) => msgKey(m) === k)) return prev;
          return [...prev, normalizedMsg];
        });

        if (String(normalizedMsg?.direction || "").toUpperCase() === "INBOUND") {
          setSessionExpired(false);
          setChatError("");
          const ad = activeDigitsRef.current;
          if (ad) markConversationRead(ad, { optimisticOnly: false });
        }
      }
    };

    const onStatus = (payload) => {
      const waId = payload?.waId || payload?.id;
      const status = payload?.status;
      const p10 = phone10(payload?.phone10 || payload?.phone || "");
      if (!waId || !status) return;
      const activeNow = activeP10Ref.current;
      if (p10 && activeNow && p10 !== activeNow) return;
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
          const delta = Number(patch?.unreadCountDelta || 0);
          const hasAbsolute = typeof patch?.unreadCount === "number";
          const nextUnread = hasAbsolute ? patch.unreadCount : Math.max(0, Number(c.unreadCount || 0) + delta);
          const cleanedPatch = { ...patch };
          delete cleanedPatch.unreadCountDelta;
          return { ...c, ...cleanedPatch, unreadCount: nextUnread };
        })
      );
      const activeNow = activeP10Ref.current;
      if (activeNow && p10 === activeNow && (patch?.lastInboundAt || patch?.windowExpiresAt)) {
        setSessionExpired(false);
        setChatError("");
      }
    };

    s.on("wa:message", onMessage);
    s.on("wa:status", onStatus);
    s.on("wa:conversation", onConversation);

    return () => {
      s.off("wa:message", onMessage);
      s.off("wa:status", onStatus);
      s.off("wa:conversation", onConversation);
    };
  }, [markConversationRead, upsertConversationFromMessage]);

  useEffect(() => {
    if (activeP10) setInput(drafts[activeP10] || "");
    else setInput("");
  }, [activeP10, drafts]);

  useEffect(() => {
    if (!activeDigits) return;
    setSessionExpired(false);
    setChatError("");
    setMessages([]);
    openedCutoffRef.current = Date.now();
    markConversationRead(activeDigits, { optimisticOnly: false });
    loadMessagesInitial(activeDigits).finally(() => {
      markConversationRead(activeDigits, { optimisticOnly: false });
    });
  }, [activeDigits, loadMessagesInitial, markConversationRead]);

  // ── BUG FIX 4: scroll to bottom when messages grow ────────────────────────
  useEffect(() => {
    if (messages.length > prevLenRef.current && isNearBottomRef.current) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  const onChatScroll = (e) => {
    const el = e.currentTarget;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const openChat = useCallback(
    (phone) => {
      const p = digitsOnly(phone);
      if (!p) return;
      const nextSearch = `?phone=${encodeURIComponent(p)}`;
      const nextUrl = `/whatsaap/chat${nextSearch}`;
      if (location.search !== nextSearch) navigate(nextUrl, { replace: true });
      openedCutoffRef.current = Date.now();
      setActiveChat({ phone: p });
      setSearch("");
      markConversationRead(p, { optimisticOnly: false });
    },
    [location.search, markConversationRead, navigate]
  );

  useEffect(() => {
    const p = digitsOnly(urlPhone);
    if (!p || lastUrlOpenedRef.current === p) return;
    lastUrlOpenedRef.current = p;
    openChat(p);
  }, [openChat, urlPhone]);

  const updateConversationPreviewLocal = useCallback((phoneDigits, lastMessageText) => {
    const nowIso = new Date().toISOString();
    const p10 = phone10(phoneDigits);
    setConversations((prev) => {
      const idx = prev.findIndex((c) => phone10(c.phone) === p10);
      if (idx === -1) return [{ phone: phoneDigits, lastMessageAt: nowIso, lastMessageText: lastMessageText?.slice?.(0, 200) || "", unreadCount: 0 }, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], lastMessageAt: nowIso, lastMessageText: lastMessageText?.slice?.(0, 200) || next[idx].lastMessageText || "" };
      const [item] = next.splice(idx, 1);
      return [item, ...next];
    });
  }, []);

  const sendText = async () => {
    const to = normalizeToWa(activeChat?.phone);
    const text = input.trim();
    if (!to || !text) return;

    const liveWindow = activeConversation?.windowExpiresAt && new Date(activeConversation.windowExpiresAt).getTime() > Date.now();
    if (sessionExpired && !liveWindow) return;
    if (sessionExpired && liveWindow) { setSessionExpired(false); setChatError(""); }

    const p10 = phone10(to);
    const optimistic = {
      _id: buildTempId("tmp_text"),
      direction: "OUTBOUND", type: "text", text,
      timestamp: new Date().toISOString(), status: "sent", to, phone: to,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    clearDraftFor(p10);
    updateConversationPreviewLocal(to, text);

    try {
      await api(`/api/whatsapp/send-text`, { method: "POST", body: JSON.stringify({ to, text }) });
    } catch (e) {
      setMessages((prev) => removeMessageById(prev, optimistic._id));
      setInput(text);
      setDraftFor(p10, text);
      if (e.data?.code === "SESSION_EXPIRED") {
        setSessionExpired(true);
        setChatError("Session expired. Please send a template message.");
      } else {
        showToast(e.message || "Send failed", "error");
      }
    }
  };

  const onPickFile = async (file) => {
    if (!file || !activeChat?.phone) return;

    const liveWindow = activeConversation?.windowExpiresAt && new Date(activeConversation.windowExpiresAt).getTime() > Date.now();
    if (sessionExpired && !liveWindow) return;
    if (sessionExpired && liveWindow) { setSessionExpired(false); setChatError(""); }

    if (file.size > 15 * 1024 * 1024) { showToast("Max attachment size is 15MB.", "error"); return; }

    const to = normalizeToWa(activeChat.phone);
    const mime = file.type || "application/octet-stream";
    const urlBlob = mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/") ? URL.createObjectURL(file) : "";
    const optimisticType = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "document";

    const optimistic = {
      _id: buildTempId("tmp_file"),
      direction: "OUTBOUND", text: "", type: optimisticType,
      timestamp: new Date().toISOString(), status: "sent", to, phone: to,
      media: { url: urlBlob || "", mime, filename: file.name },
    };

    setMessages((prev) => [...prev, optimistic]);
    updateConversationPreviewLocal(to, optimisticType === "image" ? "📷 Photo" : optimisticType === "video" ? "🎥 Video" : optimisticType === "audio" ? "🎙️ Audio" : `📎 ${file.name}`);
    setFileUploading(true);

    try {
      const fd = new FormData();
      fd.append("to", to);
      fd.append("file", file);
      await apiForm(`/api/whatsapp/send-media`, fd);
    } catch (e) {
      setMessages((prev) => prev.map((m) => m._id === optimistic._id ? { ...m, status: "failed" } : m));
      if (e?.data?.code === "SESSION_EXPIRED") {
        setSessionExpired(true);
        setChatError("Session expired. Please send a template message.");
      }
      showToast(extractApiErrorMessage(e, "Failed to send attachment."), "error");
    } finally {
      setFileUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const insertEmoji = (emo) => {
    setInput((t) => {
      const next = `${t}${emo}`;
      if (activeP10) setDraftFor(activeP10, next);
      return next;
    });
  };

  async function uploadTemplateHeaderMedia(file) {
    const fd = new FormData();
    fd.append("file", file);
    return apiForm(`/api/whatsapp/upload-template-media`, fd);
  }

  const openTemplateComposer = (tpl) => {
    if (!tpl) return;
    if (!isApprovedTemplate(tpl)) { showToast("This template is not APPROVED yet.", "error"); return; }
    const body = pickBodyTextFromTemplate(tpl);
    const idxs = extractVarIndexes(body);
    const initial = {};
    idxs.forEach((i) => (initial[String(i)] = ""));
    setActiveTplForSend(tpl);
    setTplSendVars(initial);
    setTplSending(false);
    const fmt = getHeaderMediaFormat(tpl);
    setTplHeaderFormat(fmt);
    setTplHeaderFile(null);
    setTplComposeOpen(true);
  };

  const tplSendPreview = useMemo(() => {
    const body = pickBodyTextFromTemplate(activeTplForSend);
    return applyVarsToBody(body, tplSendVars);
  }, [activeTplForSend, tplSendVars]);

  // ── BUG FIX 6: template not shown in chat — the root cause ────────────────
  // Old code: after success → setSessionExpired(true) + setErrorMessages("Template sent successfully.")
  // Effect of that: expiredMode became true → the chat area showed ONLY the errorMessages
  //   string and hid all message bubbles including the optimistic template we just added.
  // Fix: on success, keep sessionExpired=false (the 24h window is NOW OPEN),
  //   show a toast instead of errorMessages, close the dialog and let the
  //   optimistic bubble stay visible in the messages list.
  const sendTemplateFromChat = async () => {
    if (!activeTplForSend) return;
    const to = normalizeToWa(activeChat?.phone);
    if (!to) return;

    const body = pickBodyTextFromTemplate(activeTplForSend);
    const idxs = extractVarIndexes(body);
    const params = idxs.map((i) => String(tplSendVars[String(i)] || "").trim());
    if (params.some((v) => !v)) { showToast("Fill all template variables.", "error"); return; }

    let headerMedia = null;
    let optimisticMedia = null;

    if (tplHeaderFormat) {
      if (!tplHeaderFile) { showToast("This template requires a header attachment. Please choose a file.", "error"); return; }
      if (tplHeaderFile.size > 15 * 1024 * 1024) { showToast("Max attachment size is 15MB.", "error"); return; }
      setTplSending(true);
      try {
        const up = await uploadTemplateHeaderMedia(tplHeaderFile);
        const mediaId = up?.mediaId || up?.id;
        if (!mediaId) { showToast("Upload failed: no mediaId returned.", "error"); setTplSending(false); return; }
        headerMedia = { format: tplHeaderFormat, id: mediaId, filename: tplHeaderFile.name };
        if (tplHeaderFile.type?.startsWith("image/") || tplHeaderFile.type?.startsWith("video/") || tplHeaderFile.type?.startsWith("audio/")) {
          optimisticMedia = { url: URL.createObjectURL(tplHeaderFile), mime: tplHeaderFile.type, filename: tplHeaderFile.name };
        }
      } catch (e) {
        showToast(e.message || "Failed to upload header attachment.", "error");
        setTplSending(false);
        return;
      }
    } else {
      setTplSending(true);
    }

    const optimistic = {
      _id: buildTempId("tmp_tpl"),
      direction: "OUTBOUND",
      type: "template",
      text: tplSendPreview || `[TEMPLATE] ${activeTplForSend.name}`,
      timestamp: new Date().toISOString(),
      status: "sent",
      to,
      phone: to,
      ...(optimisticMedia ? { media: optimisticMedia } : {}),
      templateMeta: { name: activeTplForSend.name, language: activeTplForSend.language || "", parameters: params },
    };

    // Add optimistic bubble BEFORE the API call so it's instantly visible
    setMessages((prev) => [...prev, optimistic]);
    updateConversationPreviewLocal(to, optimistic.text);

    try {
      await api(`/api/whatsapp/send-template`, {
        method: "POST",
        body: JSON.stringify({
          to,
          templateName: activeTplForSend.name,
          templateId: activeTplForSend.template_id || activeTplForSend.templateId || activeTplForSend.providerTemplateId || "",
          parameters: params,
          renderedText: tplSendPreview || "",
          headerMedia,
        }),
      });

      // ✅ Close dialog, leave bubble in chat, show a toast — do NOT set sessionExpired
      setTplComposeOpen(false);
      setActiveTplForSend(null);
      setTplSendVars({});
      setTplHeaderFormat("");
      setTplHeaderFile(null);
      showToast("Template sent successfully ✓", "success");
      // sessionExpired stays false — the 24h window is now open for freeform replies

    } catch (e) {
      setMessages((prev) => prev.map((m) => m._id === optimistic._id ? { ...m, status: "failed" } : m));
      showToast(extractApiErrorMessage(e, "Failed to send template."), "error");
    } finally {
      setTplSending(false);
    }
  };

  const helpMeWrite = async () => {
    if (!activeP10 || sessionExpired) return;
    setHelpWriteLoading(true);
    try {
      const lastInbound = [...(messages || [])].reverse().find((m) => String(m.direction || "").toUpperCase() !== "OUTBOUND");
      const goal = lastInbound?.text
        ? `Reply to the customer's last message: "${String(lastInbound.text).slice(0, 220)}"`
        : "Write a helpful next message to the customer based on the conversation.";
      const r = await api(`/api/whatsapp/help-me-write`, {
        method: "POST",
        body: JSON.stringify({ phone: activeP10, leadName: activeConversation?.displayName || "", agentName: agentName || "", goal, tone: "friendly, professional, concise, Hinglish allowed", maxMessages: 35 }),
      });
      const suggestion = String(r?.suggestion || "").trim();
      if (!suggestion) { showToast("AI did not return a message.", "warning"); return; }
      setInput(suggestion);
      setDraftFor(activeP10, suggestion);
    } catch (e) {
      showToast(e.message || "Help me write failed.", "error");
    } finally {
      setHelpWriteLoading(false);
    }
  };

  const openRephraseDialog = () => {
    if (!input.trim() || sessionExpired) return;
    setRephraseStyle("professional");
    setRephraseOpen(true);
  };

  const doRephrase = async () => {
    const original = input.trim();
    if (!original) return;
    setRephraseLoading(true);
    try {
      const r = await api(`/api/whatsapp/rephrase`, { method: "POST", body: JSON.stringify({ text: original, style: rephraseStyle }) });
      const out = String(r?.result || r?.rephrased || "").trim();
      if (!out) { showToast("AI did not return rephrased text.", "warning"); return; }
      setInput(out);
      if (activeP10) setDraftFor(activeP10, out);
      setRephraseOpen(false);
    } catch (e) {
      showToast(e.message || "Rephrase failed.", "error");
    } finally {
      setRephraseLoading(false);
    }
  };

  const templateOptions = useMemo(() => {
    const list = Array.isArray(templates) ? templates : [];
    return list.filter((t) => isUtilityTemplate(t) && isApprovedTemplate(t)).sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [templates]);

  useEffect(() => {
    const body = pickBodyTextFromTemplate(selectedTemplate);
    const idxs = extractVarIndexes(body);
    const next = {};
    idxs.forEach((i) => (next[String(i)] = ""));
    setTplVars(next);
    const fmt = getHeaderMediaFormat(selectedTemplate);
    setNewHeaderFormat(fmt);
    setNewHeaderFile(null);
  }, [selectedTemplate]);

  const previewBody = useMemo(() => {
    const body = pickBodyTextFromTemplate(selectedTemplate);
    return applyVarsToBody(body, tplVars);
  }, [selectedTemplate, tplVars]);

  // ── BUG FIX 7: same fix for "new chat" template send ─────────────────────
  const startNewChatWithTemplate = async () => {
    const to = digitsOnly(newChatPhone);
    if (!to) return setNewChatError("Enter phone number");
    if (!selectedTemplate) return setNewChatError("Select a template");
    const body = pickBodyTextFromTemplate(selectedTemplate);
    const idxs = extractVarIndexes(body);
    const params = idxs.map((i) => tplVars[String(i)]?.trim());
    if (params.some((v) => !v)) return setNewChatError("Fill all template variables");

    let headerMedia = null;
    let optimisticMedia = null;

    if (newHeaderFormat) {
      if (!newHeaderFile) return setNewChatError("This template requires a header attachment. Please choose a file.");
      if (newHeaderFile.size > 15 * 1024 * 1024) return setNewChatError("Max attachment size is 15MB.");
      setCreatingChat(true);
      try {
        const up = await uploadTemplateHeaderMedia(newHeaderFile);
        const mediaId = up?.mediaId || up?.id;
        if (!mediaId) { setCreatingChat(false); return setNewChatError("Upload failed: no mediaId returned."); }
        headerMedia = { format: newHeaderFormat, id: mediaId, filename: newHeaderFile.name };
        if (newHeaderFile.type?.startsWith("image/") || newHeaderFile.type?.startsWith("video/") || newHeaderFile.type?.startsWith("audio/")) {
          optimisticMedia = { url: URL.createObjectURL(newHeaderFile), mime: newHeaderFile.type, filename: newHeaderFile.name };
        }
      } catch (e) {
        setCreatingChat(false);
        return setNewChatError(e.message || "Failed to upload header attachment.");
      }
    } else {
      setCreatingChat(true);
    }

    setNewChatError("");
    setActiveChat({ phone: to });

    const optimistic = {
      _id: buildTempId("tmp_new_tpl"),
      direction: "OUTBOUND", type: "template",
      text: previewBody || `[TEMPLATE] ${selectedTemplate.name}`,
      timestamp: new Date().toISOString(), status: "sent", to, phone: to,
      ...(optimisticMedia ? { media: optimisticMedia } : {}),
      templateMeta: { name: selectedTemplate.name, language: selectedTemplate.language || "", parameters: params },
    };

    setMessages((prev) => [...prev, optimistic]);
    updateConversationPreviewLocal(to, optimistic.text);

    try {
      await api(`/api/whatsapp/send-template`, {
        method: "POST",
        body: JSON.stringify({
          to,
          templateName: selectedTemplate.name,
          templateId: selectedTemplate.template_id || selectedTemplate.templateId || selectedTemplate.providerTemplateId || "",
          parameters: params,
          renderedText: previewBody || "",
          headerMedia,
        }),
      });

      // ✅ Close dialog, leave bubble, toast — do NOT set sessionExpired or chatError
      setNewChatOpen(false);
      setNewChatPhone("");
      setSelectedTemplate(null);
      setTplVars({});
      setNewHeaderFormat("");
      setNewHeaderFile(null);
      showToast("Template sent. New chat started ✓", "success");

    } catch (e) {
      setMessages((prev) => prev.map((m) => m._id === optimistic._id ? { ...m, status: "failed" } : m));
      setNewChatError(extractApiErrorMessage(e, "Failed to send template"));
    } finally {
      setCreatingChat(false);
    }
  };

  const hasActiveChat = !!activeChat?.phone;
  const expiredMode = hasActiveChat && sessionExpired;

  return (
    <Box height="93vh" display="flex" bgcolor="#ece5dd">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <Box width={360} bgcolor="#fff" display="flex" flexDirection="column" borderRight="1px solid #ddd">
        <Box px={2} py={1.5} display="flex" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={700} fontSize={18}>WhatsApp</Typography>
            <Chip
              size="small"
              label={socketStatus}
              sx={{
                height: 20, fontSize: 11,
                bgcolor: socketStatus === "connected" ? "#e7fbf2" : socketStatus === "error" ? "#ffeceb" : "#f2f4f7",
              }}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={() => setNewChatOpen(true)} title="New chat"><AddIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => { refreshConversations(null, { silent: false }); fetchTemplates(); }} title="Refresh" disabled={loadingChats}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Box px={2} pb={1}>
          <TextField
            fullWidth size="small" placeholder="Search / type phone to open chat"
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>

        <Divider />

        <Box flex={1} overflow="auto">
          {loadingChats ? (
            <Stack alignItems="center" mt={4}><CircularProgress size={24} /></Stack>
          ) : (
            <>
              {canShowQuickChat && (
                <Box px={2} py={1.25} onClick={() => openChat(digitsOnly(search))}
                  sx={{ cursor: "pointer", bgcolor: phone10(activeChat?.phone) === phone10(search) ? "#f0f2f5" : "transparent", "&:hover": { bgcolor: "#f5f5f5" } }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar>{phone10(search).slice(-2)}</Avatar>
                    <Box flex={1}>
                      <Typography fontSize={14} fontWeight={600}>Chat with {phone10(search)}</Typography>
                      <Typography fontSize={12} color="text.secondary">Open chat</Typography>
                    </Box>
                    <Chip size="small" label="Open" />
                  </Stack>
                </Box>
              )}

              {sortedConversations.map((chat) => {
                const isActive = phone10(activeChat?.phone) === phone10(chat.phone);
                const unread = Number(chat?.unreadCount || 0);
                return (
                  <Box key={chat._id || chat.phone} px={2} py={1.25} onClick={() => openChat(chat.phone)}
                    sx={{ cursor: "pointer", bgcolor: isActive ? "#f0f2f5" : "transparent", "&:hover": { bgcolor: "#f5f5f5" } }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar>{nameInitials(chatDisplayName(chat))}</Avatar>
                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                          <Typography fontSize={14} fontWeight={unread > 0 ? 900 : 600} noWrap>{chatDisplayName(chat)}</Typography>
                          <UnreadBadge count={unread} />
                        </Stack>
                        <Typography fontSize={12} color="text.secondary" noWrap sx={{ fontWeight: unread > 0 ? 800 : 400 }}>{assignedToText(chat)}</Typography>
                        <Typography fontSize={11} color="text.secondary" noWrap>Last active: {formatLastActive(chat.lastMessageAt)}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                );
              })}

              {!sortedConversations.length && !canShowQuickChat && (
                <Box px={2} py={2}><Typography fontSize={13} color="text.secondary">No conversations found.</Typography></Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      <Box flex={1} display="flex" flexDirection="column">
        {/* Header */}
        <Box px={2} py={1.25} bgcolor="#f0f2f5" borderBottom="1px solid #ddd">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar>{activeConversation ? nameInitials(chatDisplayName(activeConversation)) : activeP10?.slice(-2) || "—"}</Avatar>
            <Box>
              <Typography fontWeight={800}>{activeHeaderTitle}</Typography>
              <Typography fontSize={12} color="text.secondary">{activeConversation?.assignedToLabel ? assignedToText(activeConversation) : ""}</Typography>
              {activeChat?.phone && sessionInfo.has && (
                <Typography fontSize={12} sx={{ mt: 0.25, fontWeight: 900, color: sessionInfo.expired ? "error.main" : "text.secondary" }}>
                  {sessionInfo.label}
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>

        {/* Messages area */}
        <Box flex={1} p={2} overflow="auto" onScroll={onChatScroll}
          sx={{ backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-light.png')" }}>
          {!activeChat?.phone ? (
            <Stack alignItems="center" justifyContent="center" height="100%">
              <Typography color="text.secondary">Select a chat from left</Typography>
            </Stack>
          ) : loadingMessages ? (
            <Stack alignItems="center" mt={4}><CircularProgress size={24} /></Stack>
          ) : (
            <Stack spacing={1}>
              {/* ── BUG FIX 8: chatError shown as inline banner, not replacing messages ─ */}
              {!!chatError && (
                <Box sx={{ bgcolor: "#ffeceb", border: "1px solid #f5c6c6", borderRadius: 1, px: 2, py: 1, mb: 1 }}>
                  <Typography fontSize={13} color="error">{chatError}</Typography>
                </Box>
              )}

              {messages.map((msg) => {
                const isOutbound = String(msg.direction || "").toUpperCase() === "OUTBOUND";
                const cutoff = openedCutoffRef.current || 0;
                const ts = new Date(msg.timestamp || msg.createdAt || 0).getTime();
                const wasUnread = !isOutbound && cutoff && ts > cutoff;
                const isTemplate = String(msg?.type || "").toLowerCase() === "template";

                const bubbleText = msg?.text || "";
                const hasMedia =
                  !!String(msg?.media?.id || "").trim() ||
                  !!String(msg?.media?.url || "").trim() ||
                  !!String(msg?.templateMeta?.headerMedia?.id || "").trim() ||
                  !!String(msg?.templateMeta?.headerMedia?.url || "").trim();

                return (
                  <Box key={msgKey(msg)} alignSelf={isOutbound ? "flex-end" : "flex-start"}>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5, py: 1, maxWidth: 520,
                        bgcolor: isOutbound ? "#dcf8c6" : "#fff",
                        border: wasUnread ? "1px solid rgba(37,211,102,0.65)" : "1px solid rgba(0,0,0,0.06)",
                        borderRadius: 2,
                      }}
                    >
                      {/* ── BUG FIX 9: render TemplateBubble for type=template ── */}
                      {isTemplate ? (
                        <TemplateBubble msg={msg} />
                      ) : (
                        <>
                          {!!bubbleText && (
                            <Typography fontSize={14} whiteSpace="pre-wrap" sx={{ fontWeight: wasUnread ? 800 : 400 }}>
                              {bubbleText}
                            </Typography>
                          )}
                          {hasMedia && <MessageMedia msg={msg} isNearBottomRef={isNearBottomRef} bottomRef={bottomRef} />}
                        </>
                      )}

                      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mt: 0.25 }}>
                        <Typography fontSize={10} textAlign="right" color="text.secondary">
                          {formatTime(msg.timestamp || msg.createdAt)}
                        </Typography>
                        {isOutbound && <MessageTicks status={msg.status} />}
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
              <div ref={bottomRef} />
            </Stack>
          )}
        </Box>

        {/* Input bar */}
        <Box p={1.25} bgcolor="#f0f2f5" borderTop="1px solid rgba(0,0,0,0.06)">
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              fullWidth size="small"
              placeholder={expiredMode ? "Session expired — send a template to reopen chat" : "Type a message"}
              value={input}
              onChange={(e) => { const val = e.target.value; setInput(val); if (activeP10) setDraftFor(activeP10, val); }}
              onKeyDown={(e) => { if (expiredMode) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
              disabled={!hasActiveChat || expiredMode}
              multiline minRows={1} maxRows={4}
              InputProps={{
                endAdornment: expiredMode ? (
                  <InputAdornment position="end">
                    <Tooltip title="Send template to reopen session">
                      <span>
                        <IconButton size="small" onClick={(e) => { setTplMenuSearch(""); setTplAnchor(e.currentTarget); }} disabled={!hasActiveChat}>
                          <ViewListIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ) : null,
              }}
            />
            <IconButton color="primary" onClick={sendText} disabled={!hasActiveChat || !input.trim() || expiredMode}>
              <SendIcon />
            </IconButton>
          </Stack>

          {expiredMode && (
            <Typography sx={{ mt: 0.75 }} fontSize={12} color="error" fontWeight={900}>
              Session expired — send a template to reopen the 24h window.
            </Typography>
          )}

          {!expiredMode && (
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between" mt={1}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title="Quick replies">
                  <span><IconButton size="small" onClick={(e) => setQuickAnchor(e.currentTarget)} disabled={!hasActiveChat}><FlashOnIcon fontSize="small" /></IconButton></span>
                </Tooltip>
                <Tooltip title="Templates">
                  <span>
                    <IconButton size="small" onClick={(e) => { setTplMenuSearch(""); setTplAnchor(e.currentTarget); }} disabled={!hasActiveChat}>
                      <ViewListIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Emoji">
                  <span><IconButton size="small" onClick={(e) => setEmojiAnchor(e.currentTarget)} disabled={!hasActiveChat}><InsertEmoticonIcon fontSize="small" /></IconButton></span>
                </Tooltip>
                <Tooltip title={fileUploading ? "Uploading..." : "Attach file"}>
                  <span>
                    <IconButton size="small" disabled={!hasActiveChat || sessionExpired || fileUploading} onClick={() => fileRef.current?.click()}>
                      {fileUploading ? <CircularProgress size={16} /> : <AttachFileIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Help me write">
                  <span>
                    <IconButton size="small" disabled={!hasActiveChat || sessionExpired || helpWriteLoading} onClick={helpMeWrite}>
                      {helpWriteLoading ? <CircularProgress size={16} /> : <AutoFixHighIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Rephrase">
                  <span>
                    <IconButton size="small" disabled={!hasActiveChat || !input.trim() || sessionExpired} onClick={openRephraseDialog}>
                      <AutorenewIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); }} />
            </Stack>
          )}
        </Box>
      </Box>

      {/* ── Menus ────────────────────────────────────────────────────────────── */}
      <Menu anchorEl={quickAnchor} open={Boolean(quickAnchor)} onClose={() => setQuickAnchor(null)}>
        {QUICK_REPLIES.map((q) => (
          <MenuItem key={q} onClick={() => { setInput(q); if (activeP10) setDraftFor(activeP10, q); setQuickAnchor(null); }}>{q}</MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={emojiAnchor} open={Boolean(emojiAnchor)} onClose={() => setEmojiAnchor(null)}>
        <Box px={1} py={1} display="grid" gridTemplateColumns="repeat(8, 1fr)" gap={0.5} maxWidth={320}>
          {EMOJIS.map((emo) => (
            <Button key={emo} variant="text" onClick={() => { insertEmoji(emo); setEmojiAnchor(null); }} sx={{ minWidth: 0, p: 0.5, fontSize: 20 }}>{emo}</Button>
          ))}
        </Box>
      </Menu>

      <Menu anchorEl={tplAnchor} open={Boolean(tplAnchor)} onClose={() => setTplAnchor(null)} PaperProps={{ sx: { width: 380, maxHeight: 420 } }}>
        <Box px={1.5} py={1}>
          <TextField fullWidth size="small" placeholder="Search templates" value={tplMenuSearch} onChange={(e) => setTplMenuSearch(e.target.value)} />
        </Box>
        <Divider />
        {loadingTemplates ? (
          <Box p={2}><CircularProgress size={20} /></Box>
        ) : filteredApprovedUtilityTemplates.length ? (
          filteredApprovedUtilityTemplates.map((tpl) => {
            const chip = statusChipProps(tpl?.status);
            return (
              <MenuItem key={tpl._id || tpl.id || tpl.name} onClick={() => { openTemplateComposer(tpl); setTplAnchor(null); }} sx={{ alignItems: "flex-start", py: 1.2 }}>
                <Box width="100%">
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography fontWeight={700} fontSize={13}>{tpl.name}</Typography>
                    <Chip size="small" label={chip.label} sx={chip.sx} />
                  </Stack>
                  <Typography fontSize={12} color="text.secondary" noWrap>{pickBodyTextFromTemplate(tpl) || "No body text"}</Typography>
                </Box>
              </MenuItem>
            );
          })
        ) : (
          <Box p={2}><Typography fontSize={13} color="text.secondary">No approved utility templates found.</Typography></Box>
        )}
      </Menu>

      {/* ── Template compose dialog ──────────────────────────────────────────── */}
      <Dialog open={tplComposeOpen} onClose={() => !tplSending && setTplComposeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Send template</DialogTitle>
        <DialogContent>
          {activeTplForSend && (
            <Stack spacing={2} mt={1}>
              <Box>
                <Typography fontWeight={700}>{activeTplForSend.name}</Typography>
                <Typography fontSize={12} color="text.secondary">{activeTplForSend.language || "—"}</Typography>
              </Box>
              {extractVarIndexes(pickBodyTextFromTemplate(activeTplForSend)).map((i) => (
                <TextField key={i} fullWidth size="small" label={`Variable ${i}`}
                  value={tplSendVars[String(i)] || ""}
                  onChange={(e) => setTplSendVars((prev) => ({ ...prev, [String(i)]: e.target.value }))} />
              ))}
              {!!tplHeaderFormat && (
                <Box>
                  <Typography fontSize={13} fontWeight={700} mb={1}>Header attachment required: {tplHeaderFormat}</Typography>
                  <Button variant="outlined" component="label">
                    Choose file
                    <input hidden type="file" accept={acceptForHeaderFormat(tplHeaderFormat)} onChange={(e) => setTplHeaderFile(e.target.files?.[0] || null)} />
                  </Button>
                  {tplHeaderFile && <Typography fontSize={12} color="text.secondary" mt={1}>{tplHeaderFile.name}</Typography>}
                </Box>
              )}
              <Box>
                <Typography fontSize={13} fontWeight={700} mb={0.5}>Preview</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#fafafa" }}>
                  <Typography fontSize={14} whiteSpace="pre-wrap">{tplSendPreview || "—"}</Typography>
                </Paper>
              </Box>
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button onClick={() => setTplComposeOpen(false)} disabled={tplSending}>Cancel</Button>
                <Button variant="contained" onClick={sendTemplateFromChat} disabled={tplSending}>
                  {tplSending ? "Sending..." : "Send template"}
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* ── New chat dialog ──────────────────────────────────────────────────── */}
      <Dialog open={newChatOpen} onClose={() => !creatingChat && setNewChatOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Start new chat</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth size="small" label="Phone number" value={newChatPhone} onChange={(e) => setNewChatPhone(e.target.value)} />
            <Autocomplete
              options={templateOptions} value={selectedTemplate}
              onChange={(_, v) => setSelectedTemplate(v)}
              getOptionLabel={(o) => o?.name || ""}
              renderInput={(params) => <TextField {...params} size="small" label="Select approved utility template" />}
            />
            {selectedTemplate && (
              <>
                {extractVarIndexes(pickBodyTextFromTemplate(selectedTemplate)).map((i) => (
                  <TextField key={i} fullWidth size="small" label={`Variable ${i}`}
                    value={tplVars[String(i)] || ""}
                    onChange={(e) => setTplVars((prev) => ({ ...prev, [String(i)]: e.target.value }))} />
                ))}
                {!!newHeaderFormat && (
                  <Box>
                    <Typography fontSize={13} fontWeight={700} mb={1}>Header attachment required: {newHeaderFormat}</Typography>
                    <Button variant="outlined" component="label">
                      Choose file
                      <input hidden type="file" accept={acceptForHeaderFormat(newHeaderFormat)} onChange={(e) => setNewHeaderFile(e.target.files?.[0] || null)} />
                    </Button>
                    {newHeaderFile && <Typography fontSize={12} color="text.secondary" mt={1}>{newHeaderFile.name}</Typography>}
                  </Box>
                )}
                <Box>
                  <Typography fontSize={13} fontWeight={700} mb={0.5}>Preview</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#fafafa" }}>
                    <Typography fontSize={14} whiteSpace="pre-wrap">{previewBody || "—"}</Typography>
                  </Paper>
                </Box>
              </>
            )}
            {!!newChatError && <Typography fontSize={13} color="error">{newChatError}</Typography>}
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={() => setNewChatOpen(false)} disabled={creatingChat}>Cancel</Button>
              <Button variant="contained" onClick={startNewChatWithTemplate} disabled={creatingChat}>
                {creatingChat ? "Sending..." : "Start chat"}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* ── Rephrase dialog ──────────────────────────────────────────────────── */}
      <Dialog open={rephraseOpen} onClose={() => !rephraseLoading && setRephraseOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rephrase message</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Autocomplete
              options={["professional", "friendly", "empathetic", "short", "formal"]}
              value={rephraseStyle}
              onChange={(_, v) => setRephraseStyle(v || "professional")}
              renderInput={(params) => <TextField {...params} size="small" label="Style" />}
            />
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={() => setRephraseOpen(false)} disabled={rephraseLoading}>Cancel</Button>
              <Button variant="contained" onClick={doRephrase} disabled={rephraseLoading}>
                {rephraseLoading ? "Rephrasing..." : "Apply"}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* ── Toast snackbar (replaces errorMessages for success/info/error) ─── */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={hideToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={hideToast} severity={toast.severity} variant="filled" sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
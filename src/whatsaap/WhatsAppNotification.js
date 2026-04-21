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

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const SOCKET_URL = API_BASE;

const NOTIF_SOUND_URL =
  "https://cdn.shopify.com/s/files/1/0734/7155/7942/files/new-notification-014-363678.mp3?v=1769002522";

const ALLOWED_ROLES = new Set(["Manager", "Sales Agent", "Retention Agent"]);

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  brand: "#00A884",
  brandDark: "#017561",
  brandLight: "#D9FDD3",
  headerBg: "#F7F8FA",
  headerText: "#111B21",
  subText: "#667781",
  chatBg: "#EFEAE2",
  chatBgPattern:
    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300a884' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  outbubble: "#D9FDD3",
  inbubble: "#FFFFFF",
  divider: "rgba(17,27,33,0.08)",
  border: "rgba(17,27,33,0.12)",
  listHover: "rgba(0,168,132,0.06)",
  listActive: "rgba(0,168,132,0.12)",
  mutedBg: "#F0F2F5",
  paper: "#FFFFFF",
  inputBg: "#FFFFFF",
};

const FONTS = {
  ui: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const digitsOnly = (v = "") => String(v || "").replace(/\D/g, "");
const last10 = (v = "") => digitsOnly(v).slice(-10);
const roomForPhone10 = (p10) => `wa:${String(p10 || "").slice(-10)}`;

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
  return `${u.id || u._id || ""}|${u.email || ""}|${u.fullName || ""}|${u.role || ""}`;
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
  if (st === "read") {
    return <DoneAllIcon sx={{ fontSize: 14, ml: 0.5, color: "#53BDEB" }} />;
  }
  if (st === "delivered") {
    return <DoneAllIcon sx={{ fontSize: 14, ml: 0.5, color: "#667781" }} />;
  }
  if (st === "failed") {
    return <DoneIcon sx={{ fontSize: 14, ml: 0.5, color: "#D93025" }} />;
  }
  return <DoneIcon sx={{ fontSize: 14, ml: 0.5, color: "#667781" }} />;
}

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

function isProviderUrl(url = "") {
  return /360dialog\.io|graph\.facebook\.com|lookaside\.facebook\.com|fbcdn\.net|facebook\.com/i.test(
    String(url || "")
  );
}
function buildProxyUrl(mediaId = "") {
  const id = String(mediaId || "").trim();
  if (!id) return "";
  return `${API_BASE}/api/whatsapp/media-proxy/${encodeURIComponent(id)}`;
}
function absolutizeUrl(url = "") {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${API_BASE}${u}`;
  return `${API_BASE}/${u}`;
}
function getSafeMediaUrl(m) {
  const media = m?.media || null;
  if (!media) return "";
  const id = String(media?.id || "").trim();
  const url = String(media?.url || "").trim();
  if (!url && id) return buildProxyUrl(id);
  if (url && isProviderUrl(url) && id) return buildProxyUrl(id);
  return absolutizeUrl(url) || (id ? buildProxyUrl(id) : "");
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
            onClick={() =>
              window.open(buildProxyUrl(mediaId), "_blank", "noopener,noreferrer")
            }
            sx={{
              textTransform: "none",
              borderColor: COLORS.border,
              color: COLORS.headerText,
              "&:hover": {
                borderColor: COLORS.brand,
                bgcolor: "rgba(0,168,132,0.04)",
              },
            }}
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
            borderRadius: 2,
            display: "block",
            cursor: "pointer",
            border: "1px solid rgba(17,27,33,0.10)",
            transition: "opacity 0.2s",
            "&:hover": { opacity: 0.88 },
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
          <Typography variant="caption" sx={{ color: COLORS.subText }}>
            Safari can't play ogg/opus. &nbsp;
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => window.open(effectiveUrl, "_blank", "noopener,noreferrer")}
            sx={{
              textTransform: "none",
              borderColor: COLORS.border,
              color: COLORS.headerText,
            }}
          >
            Open audio
          </Button>
        </Box>
      );
    }
    const typeAttr = mimeRaw && !/octet-stream/i.test(mimeRaw) ? mimeRaw : undefined;
    return (
      <Box sx={{ mt: 0.75 }}>
        <audio key={effectiveUrl} controls preload="metadata" style={{ width: "240px", maxWidth: "100%" }}>
          <source src={effectiveUrl} type={typeAttr} />
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
            width: "240px",
            maxWidth: "100%",
            borderRadius: "10px",
            border: "1px solid rgba(17,27,33,0.12)",
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
        sx={{
          textTransform: "none",
          borderColor: COLORS.border,
          color: COLORS.headerText,
          "&:hover": {
            borderColor: COLORS.brand,
            color: COLORS.brand,
            bgcolor: "rgba(0,168,132,0.04)",
          },
        }}
      >
        {isPdf ? "Open PDF" : "Open attachment"}
      </Button>
    </Box>
  );
}

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
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtRelative(d) {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function detectParamCountFromText(tplBody = "") {
  const matches = String(tplBody || "").match(/\{\{\s*(\d+)\s*\}\}/g) || [];
  let max = 0;
  for (const m of matches) max = Math.max(max, Number(String(m).replace(/[^\d]/g, "")));
  return max;
}
function renderTemplatePreview(body = "", params = []) {
  let out = String(body || "");
  params.forEach((v, idx) => {
    out = out.replace(new RegExp(`\\{\\{\\s*${idx + 1}\\s*\\}\\}`, "g"), String(v || ""));
  });
  return out;
}

// ─── Avatar colour palette ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#00796B",
  "#0288D1",
  "#7B1FA2",
  "#C62828",
  "#F57C00",
  "#2E7D32",
  "#1565C0",
  "#AD1457",
];
function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── Styled sub-components ────────────────────────────────────────────────────
function WidgetHeader({ view, title, totalUnread, loading, onBack, onOpenFull, onRefresh, onClose }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.5,
        py: 1.25,
        bgcolor: COLORS.headerBg,
        borderBottom: `1px solid ${COLORS.divider}`,
        minHeight: 58,
      }}
    >
      {view === "chat" && (
        <IconButton
          size="small"
          onClick={onBack}
          sx={{
            color: COLORS.subText,
            "&:hover": { color: COLORS.headerText, bgcolor: "rgba(17,27,33,0.06)" },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      )}

      {view === "list" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 0.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: COLORS.brand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WhatsAppIcon sx={{ fontSize: 19, color: "#fff" }} />
          </Box>
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: FONTS.ui,
            fontWeight: 600,
            fontSize: 15,
            color: COLORS.headerText,
            letterSpacing: 0,
            lineHeight: 1.2,
          }}
          noWrap
        >
          {title}
        </Typography>
        {view === "list" && totalUnread > 0 && (
          <Typography sx={{ fontSize: 11, color: COLORS.brand, fontWeight: 600 }}>
            {totalUnread} unread
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
        {view === "chat" && (
          <Tooltip title="Open full chat">
            <IconButton
              size="small"
              onClick={onOpenFull}
              sx={{
                color: COLORS.subText,
                "&:hover": { color: COLORS.headerText, bgcolor: "rgba(17,27,33,0.06)" },
              }}
            >
              <OpenInNewIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Refresh">
          <IconButton
            size="small"
            onClick={onRefresh}
            disabled={loading}
            sx={{
              color: COLORS.subText,
              "&:hover": { color: COLORS.headerText, bgcolor: "rgba(17,27,33,0.06)" },
            }}
          >
            {loading ? <CircularProgress size={15} sx={{ color: COLORS.brand }} /> : <RefreshIcon sx={{ fontSize: 17 }} />}
          </IconButton>
        </Tooltip>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: COLORS.subText,
            "&:hover": { color: "#D93025", bgcolor: "rgba(217,48,37,0.08)" },
          }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

function ConvoRow({ c, onClick }) {
  const p10 = last10(c?.phone);
  const unread = Number(c?.unreadCount) || 0;
  const title = c?.displayName || p10 || "Customer";
  const sub = c?.lastMessageText || "—";
  const rel = fmtRelative(c?.lastMessageAt);
  const ini = initials(title);
  const bg = avatarColor(title);

  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        px: 2,
        py: 1.25,
        borderBottom: `1px solid ${COLORS.divider}`,
        transition: "background 0.15s",
        "&:hover": { bgcolor: COLORS.listHover },
      }}
    >
      <ListItemAvatar sx={{ minWidth: 46 }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            fontSize: 14,
            fontWeight: 700,
            bgcolor: bg,
            color: "#fff",
            fontFamily: FONTS.ui,
          }}
        >
          {ini}
        </Avatar>
      </ListItemAvatar>

      <ListItemText
        disableTypography
        primary={
          <Box sx={{ display: "flex", alignItems: "center", mb: 0.25 }}>
            <Typography
              sx={{
                fontFamily: FONTS.ui,
                fontWeight: 600,
                fontSize: 14,
                color: COLORS.headerText,
                flex: 1,
                lineHeight: 1.3,
              }}
              noWrap
            >
              {title}
            </Typography>
            <Typography sx={{ fontSize: 11, color: COLORS.subText, ml: 1, whiteSpace: "nowrap" }}>{rel}</Typography>
          </Box>
        }
        secondary={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              sx={{
                fontFamily: FONTS.ui,
                fontSize: 13,
                color: COLORS.subText,
                flex: 1,
              }}
              noWrap
            >
              {sub}
            </Typography>
            {unread > 0 && (
              <Box
                sx={{
                  ml: 1,
                  minWidth: 20,
                  height: 20,
                  px: 0.5,
                  borderRadius: 999,
                  bgcolor: COLORS.brand,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                  {unread > 99 ? "99+" : unread}
                </Typography>
              </Box>
            )}
          </Box>
        }
      />
    </ListItemButton>
  );
}

function ChatBubble({ m, blobUrlByMediaId }) {
  const outbound = String(m?.direction || "").toUpperCase() === "OUTBOUND";
  const time = fmtTime(m?.timestamp || m?.createdAt);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: outbound ? "flex-end" : "flex-start",
        mb: 0.75,
        px: 0.5,
      }}
    >
      <Box
        sx={{
          maxWidth: "82%",
          px: 1.25,
          py: 0.75,
          borderRadius: outbound ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
          bgcolor: outbound ? COLORS.outbubble : COLORS.inbubble,
          position: "relative",
          boxShadow: "0 1px 3px rgba(17,27,33,0.10)",
        }}
      >
        {!!m?.text && (
          <Typography
            sx={{
              fontFamily: FONTS.ui,
              fontSize: 13.5,
              color: COLORS.headerText,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
            }}
          >
            {m.text}
          </Typography>
        )}
        {renderMedia(m, blobUrlByMediaId)}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            mt: 0.4,
            gap: 0.25,
          }}
        >
          <Typography sx={{ fontSize: 11, color: "rgba(17,27,33,0.55)", lineHeight: 1 }}>{time}</Typography>
          {outbound && <MessageTicks status={m?.status} />}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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

  const [view, setView] = useState("list");
  const [active, setActive] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [tplLoading, setTplLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplSelected, setTplSelected] = useState("");
  const [tplParamCount, setTplParamCount] = useState(0);
  const [tplParams, setTplParams] = useState([]);
  const [tplBodyPreview, setTplBodyPreview] = useState("");

  const [blobUrlByMediaId, setBlobUrlByMediaId] = useState({});

  const notifAudioRef = useRef(null);
  const notifReadyRef = useRef(false);
  const lastNotifKeyRef = useRef("");

  const prepareNotifAudio = useCallback(() => {
    if (notifReadyRef.current) return;
    try {
      const a = new Audio(NOTIF_SOUND_URL);
      a.preload = "auto";
      a.volume = 0.9;
      notifAudioRef.current = a;
      notifReadyRef.current = true;
    } catch {}
  }, []);

  const playNotif = useCallback((key = "") => {
    const a = notifAudioRef.current;
    if (!a) return;
    if (key && lastNotifKeyRef.current === key) return;
    lastNotifKeyRef.current = key || "";
    try {
      a.pause();
      a.currentTime = 0;
      a.play()?.catch?.(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (!document?.addEventListener) return;
    const handler = () => prepareNotifAudio();
    document.addEventListener("pointerdown", handler, { once: true, passive: true });
    document.addEventListener("keydown", handler, { once: true, passive: true });
    return () => {
      try {
        document.removeEventListener("pointerdown", handler);
        document.removeEventListener("keydown", handler);
      } catch {}
    };
  }, [prepareNotifAudio]);

  const clearBlobUrls = useCallback(() => {
    setBlobUrlByMediaId((prev) => {
      Object.values(prev || {}).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
      return {};
    });
  }, []);

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

  const allowed = useMemo(() => !!myNameRaw && ALLOWED_ROLES.has(myRole), [myNameRaw, myRole]);
  const shouldShowWidget = useMemo(() => !isLoginRoute && allowed, [isLoginRoute, allowed]);

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
  const totalUnread = useMemo(
    () => (convos || []).reduce((s, c) => s + (Number(c?.unreadCount) || 0), 0),
    [convos]
  );

  const visibleConvos = useMemo(() => {
    const list = Array.isArray(convos) ? convos.slice() : [];
    if (myRole === "Manager") return list;
    return list.filter((c) => {
      const assigned = String(c?.assignedToLabel || "").trim().toLowerCase();
      return assigned && assigned === myName;
    });
  }, [convos, myRole, myName]);

  const sortedConvos = useMemo(() => {
    return visibleConvos.slice().sort((a, b) => {
      const au = Number(a?.unreadCount) || 0;
      const bu = Number(b?.unreadCount) || 0;
      if (au !== bu) return bu - au;
      return (
        (b?.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0) -
        (a?.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0)
      );
    });
  }, [visibleConvos]);

  const fetchConversations = useCallback(async () => {
    if (!shouldShowWidget) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/api/whatsapp/conversations`, {
        withCredentials: true,
        params: { role: myRole || "", userName: myNameRaw || "" },
      });
      setConvos(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  }, [shouldShowWidget, myNameRaw, myRole]);

  const fetchMessages = useCallback(
    async (p10) => {
      if (!shouldShowWidget || !p10) return;
      setChatLoading(true);
      try {
        const r = await axios.get(`${API_BASE}/api/whatsapp/messages`, {
          withCredentials: true,
          params: { phone: p10 },
        });
        setMessages(sortMessagesAsc(Array.isArray(r.data) ? r.data : []));
      } finally {
        setChatLoading(false);
      }
    },
    [shouldShowWidget]
  );

  const markRead = useCallback(
    async (p10) => {
      if (!shouldShowWidget || !p10) return;
      setConvos((prev) =>
        prev.map((c) => (last10(c?.phone) === p10 ? { ...c, unreadCount: 0 } : c))
      );
      try {
        await axios.post(
          `${API_BASE}/api/whatsapp/conversations/mark-read`,
          { phone: p10 },
          { withCredentials: true }
        );
      } catch {}
    },
    [shouldShowWidget]
  );

  const scrollToBottom = useCallback((smooth = false) => {
    try {
      const el = chatScrollRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
        return;
      }
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    } catch {}
  }, []);

  // Audio blob prefetch
  useEffect(() => {
    if (!shouldShowWidget) return;
    let cancelled = false;
    async function prefetch() {
      for (const m of messages || []) {
        const mediaId = String(m?.media?.id || "").trim();
        if (!mediaId || blobUrlByMediaId[mediaId]) continue;
        const msgType = String(m?.type || "").toLowerCase();
        const mime = String(getMediaMime(m) || "").toLowerCase();
        const fn = String(m?.media?.filename || "").toLowerCase();
        const isAudio =
          ["audio", "voice", "ptt"].includes(msgType) ||
          mime.startsWith("audio/") ||
          mime.includes("ogg") ||
          /\.(mp3|wav|ogg|opus|m4a)$/i.test(fn);
        if (!isAudio) continue;
        const safeUrl = getSafeMediaUrl(m);
        if (!safeUrl?.includes("/api/whatsapp/media-proxy/")) continue;
        try {
          const res = await fetch(safeUrl, { credentials: "include" });
          if (!res.ok || cancelled) continue;
          const objUrl = URL.createObjectURL(await res.blob());
          if (cancelled) {
            URL.revokeObjectURL(objUrl);
            continue;
          }
          setBlobUrlByMediaId((prev) => (prev[mediaId] ? prev : { ...prev, [mediaId]: objUrl }));
        } catch {}
      }
    }
    prefetch();
    return () => {
      cancelled = true;
    };
  }, [shouldShowWidget, messages]); // eslint-disable-line

  // Socket
  useEffect(() => {
    if (!shouldShowWidget || socketRef.current) return;
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelayMax: 2000,
    });
    const socket = socketRef.current;

    socket.on("wa:conversation", (payload) => {
      const p10 = payload?.phone10;
      if (!p10) return;
      setConvos((prev) => {
        const idx = prev.findIndex((c) => last10(c?.phone) === p10);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = { ...next[idx], ...(payload?.patch || {}) };
        return next;
      });
    });

    socket.on("wa:message", (payload) => {
      const msg = payload?.message || payload;
      const p10 = payload?.phone10 || last10(msg?.from) || last10(msg?.to) || "";
      if (!p10) return;
      if (String(msg?.direction || "").toUpperCase() === "INBOUND") {
        prepareNotifAudio();
        playNotif(msg?.waId || msg?._id || `${p10}-${msg?.timestamp || Date.now()}`);
      }
      setConvos((prev) => {
        const idx = prev.findIndex((c) => last10(c?.phone) === p10);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = {
          ...next[idx],
          lastMessageAt: msg?.timestamp || new Date(),
          lastMessageText: String(msg?.text || "").slice(0, 200) || next[idx]?.lastMessageText,
        };
        return next;
      });
      if (phone10Active && p10 === phone10Active) {
        setMessages((prev) => upsertMessage(prev, msg));
        setTimeout(() => scrollToBottom(true), 0);
      }
    });

    return () => {
      socket.off("wa:conversation");
      socket.off("wa:message");
    };
  }, [shouldShowWidget, phone10Active, scrollToBottom, prepareNotifAudio, playNotif]);

  // Join rooms
  useEffect(() => {
    const socket = socketRef.current;
    if (!shouldShowWidget || !socket?.connected) return;
    const desired = new Set((visibleConvos || []).map((c) => last10(c?.phone)).filter(Boolean));
    for (const p10 of desired) {
      const room = roomForPhone10(p10);
      if (!joinedRoomsRef.current.has(room)) {
        socket.emit("wa:join", { phone10: p10, userName: myNameRaw });
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

  useEffect(() => {
    if (!shouldShowWidget) return;
    fetchConversations();
    const t = setInterval(fetchConversations, 25000);
    return () => clearInterval(t);
  }, [shouldShowWidget, fetchConversations]);

  const handleOpen = () => {
    prepareNotifAudio();
    setAnchorEl(fabRef.current);
  };
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
    if (!phone10Active) return;
    if (typeof onOpenChat === "function") {
      onOpenChat(phone10Active);
      return;
    }
    window.open(`/whatsaap/chat?phone=${encodeURIComponent(phone10Active)}`, "_blank", "noopener,noreferrer");
  }, [onOpenChat, phone10Active]);

  const sendText = useCallback(async () => {
    if (!shouldShowWidget) return;
    const text = String(draft || "").trim();
    if (!phone10Active || !text) return;
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
      await axios.post(
        `${API_BASE}/api/whatsapp/send-text`,
        { to: phone10Active, text },
        { withCredentials: true }
      );
    } catch {
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

  const loadTemplates = useCallback(async () => {
    if (!shouldShowWidget) return;
    setTplLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/api/whatsapp/templates`, { withCredentials: true });
      setTemplates(Array.isArray(r.data) ? r.data : []);
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

  const selectedTemplateObj = useMemo(
    () => templates.find((t) => String(t?.name || "") === String(tplSelected || "")) || null,
    [templates, tplSelected]
  );

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
    if (!shouldShowWidget || !phone10Active || !tplSelected) return;
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
        {
          to: phone10Active,
          templateName: tplSelected,
          parameters: params,
          renderedText: tplBodyPreview || "",
        },
        { withCredentials: true }
      );
      setTplDialogOpen(false);
    } catch {
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

  if (!shouldShowWidget) return null;

  return (
    <>
      {/* FAB */}
      <Box sx={{ position: "fixed", right: 22, bottom: 68, zIndex: 4000 }}>
        <Badge
          badgeContent={totalUnread}
          color="error"
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              zIndex: 5000,
              fontWeight: 800,
              fontSize: 11,
              minWidth: 20,
              height: 20,
              borderRadius: 999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              border: "2px solid #fff",
            },
          }}
        >
          <Fab
            ref={fabRef}
            onClick={open ? handleClose : handleOpen}
            sx={{
              width: 52,
              height: 52,
              bgcolor: COLORS.brand,
              "&:hover": { bgcolor: COLORS.brandDark, transform: "scale(1.07)" },
              boxShadow: "0 6px 20px rgba(0,168,132,0.35)",
              transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <WhatsAppIcon sx={{ color: "#fff", fontSize: 26 }} />
          </Fab>
        </Badge>
      </Box>

      {/* Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 380,
            maxWidth: "92vw",
            height: 580,
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: COLORS.paper,
            boxShadow: "0 18px 50px rgba(17,27,33,0.18), 0 0 0 1px rgba(17,27,33,0.06)",
            display: "flex",
            flexDirection: "column",
          },
        }}
        TransitionProps={{
          style: { transformOrigin: "bottom right" },
        }}
      >
        <WidgetHeader
          view={view}
          title={view === "chat" ? active?.displayName || phone10Active || "Chat" : "WhatsApp"}
          totalUnread={totalUnread}
          loading={loading}
          onBack={() => {
            setView("list");
            setActive(null);
            setMessages([]);
            setDraft("");
            clearBlobUrls();
          }}
          onOpenFull={openFullChat}
          onRefresh={fetchConversations}
          onClose={handleClose}
        />

        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {view === "list" ? (
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                bgcolor: COLORS.paper,
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(17,27,33,0.12)", borderRadius: 999 },
              }}
            >
              {loading && !sortedConvos.length ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 1.5,
                  }}
                >
                  <CircularProgress size={28} sx={{ color: COLORS.brand }} />
                  <Typography sx={{ color: COLORS.subText, fontSize: 13 }}>Loading conversations…</Typography>
                </Box>
              ) : sortedConvos.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 1,
                  }}
                >
                  <WhatsAppIcon sx={{ fontSize: 48, color: "rgba(17,27,33,0.12)" }} />
                  <Typography sx={{ color: COLORS.subText, fontSize: 13 }}>
                    {myRole === "Manager" ? "No conversations yet" : "No assigned conversations"}
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {sortedConvos.map((c) => (
                    <ConvoRow key={c?._id || last10(c?.phone)} c={c} onClick={() => openChatInline(c)} />
                  ))}
                </List>
              )}
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <Box
                sx={{
                  px: 2,
                  py: 0.75,
                  bgcolor: COLORS.mutedBg,
                  borderBottom: `1px solid ${COLORS.divider}`,
                }}
              >
                <Typography sx={{ fontSize: 11, color: COLORS.subText, fontFamily: FONTS.ui }}>
                  {phone10Active}
                </Typography>
              </Box>

              <Box
                ref={chatScrollRef}
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: 1.5,
                  backgroundImage: COLORS.chatBgPattern,
                  bgcolor: COLORS.chatBg,
                  "&::-webkit-scrollbar": { width: 4 },
                  "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: "rgba(17,27,33,0.16)",
                    borderRadius: 999,
                  },
                }}
              >
                {chatLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                    <CircularProgress size={24} sx={{ color: COLORS.brand }} />
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <Typography sx={{ color: COLORS.subText, fontSize: 13 }}>No messages yet</Typography>
                  </Box>
                ) : (
                  messages.map((m) => (
                    <ChatBubble
                      key={m?._id || m?.waId || Math.random()}
                      m={m}
                      blobUrlByMediaId={blobUrlByMediaId}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Box
                sx={{
                  p: 1.25,
                  bgcolor: COLORS.headerBg,
                  borderTop: `1px solid ${COLORS.divider}`,
                  boxShadow: "0 -1px 0 rgba(17,27,33,0.04)",
                  display: "flex",
                  gap: 1,
                  alignItems: "flex-end",
                }}
              >
                <Button
                  size="small"
                  onClick={openTemplateDialog}
                  disabled={!phone10Active || sending}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 2,
                    whiteSpace: "nowrap",
                    color: COLORS.subText,
                    border: `1px solid ${COLORS.divider}`,
                    px: 1.25,
                    py: 0.6,
                    flexShrink: 0,
                    "&:hover": {
                      borderColor: COLORS.brand,
                      color: COLORS.brand,
                      bgcolor: "rgba(0,168,132,0.08)",
                    },
                  }}
                >
                  Template
                </Button>

                <TextField
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message"
                  size="small"
                  multiline
                  maxRows={3}
                  fullWidth
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendText();
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: COLORS.inputBg,
                      borderRadius: 2.5,
                      fontSize: 13,
                      color: COLORS.headerText,
                      "& fieldset": { borderColor: COLORS.border },
                      "&:hover fieldset": { borderColor: "rgba(17,27,33,0.22)" },
                      "&.Mui-focused fieldset": { borderColor: COLORS.brand, borderWidth: 1.5 },
                    },
                    "& .MuiOutlinedInput-input::placeholder": {
                      color: COLORS.subText,
                      opacity: 1,
                    },
                  }}
                />

                <IconButton
                  onClick={sendText}
                  disabled={!phone10Active || sending || !String(draft || "").trim()}
                  sx={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    bgcolor: String(draft || "").trim() ? COLORS.brand : COLORS.mutedBg,
                    color: "#fff",
                    transition: "background 0.2s, transform 0.15s",
                    "&:hover": { bgcolor: COLORS.brandDark, transform: "scale(1.08)" },
                    "&:disabled": {
                      bgcolor: COLORS.mutedBg,
                      color: COLORS.subText,
                    },
                  }}
                >
                  <SendIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Template Dialog */}
      <Dialog
        open={tplDialogOpen}
        onClose={() => setTplDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: COLORS.paper,
            color: COLORS.headerText,
            borderRadius: 3,
            border: `1px solid ${COLORS.divider}`,
            boxShadow: "0 20px 60px rgba(17,27,33,0.18)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: FONTS.ui,
            fontWeight: 700,
            fontSize: 16,
            color: COLORS.headerText,
            pb: 1.5,
            borderBottom: `1px solid ${COLORS.divider}`,
          }}
        >
          Send Template
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          {tplLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} sx={{ color: COLORS.brand }} />
            </Box>
          ) : (
            <>
              <TextField
                select
                fullWidth
                label="Choose template"
                value={tplSelected}
                onChange={(e) => setTplSelected(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: COLORS.inputBg,
                    color: COLORS.headerText,
                    "& fieldset": { borderColor: COLORS.divider },
                    "&:hover fieldset": { borderColor: "rgba(17,27,33,0.22)" },
                    "&.Mui-focused fieldset": { borderColor: COLORS.brand },
                  },
                  "& .MuiInputLabel-root": { color: COLORS.subText },
                  "& .MuiInputLabel-root.Mui-focused": { color: COLORS.brand },
                  "& .MuiSelect-icon": { color: COLORS.subText },
                }}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        bgcolor: COLORS.paper,
                        border: `1px solid ${COLORS.divider}`,
                        borderRadius: 2,
                      },
                    },
                  },
                }}
              >
                {(templates || [])
                  .slice()
                  .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")))
                  .map((t) => (
                    <MenuItem
                      key={t?._id || t?.name}
                      value={t?.name}
                      sx={{
                        color: COLORS.headerText,
                        fontSize: 13,
                        "&:hover": { bgcolor: COLORS.listHover },
                        "&.Mui-selected": { bgcolor: "rgba(0,168,132,0.15)" },
                      }}
                    >
                      {t?.name}
                    </MenuItem>
                  ))}
              </TextField>

              {tplSelected && tplParamCount > 0 && (
                <Box sx={{ mt: 2.5 }}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.subText,
                      mb: 1.25,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
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
                          const n = prev.slice();
                          n[idx] = v;
                          return n;
                        });
                      }}
                      sx={{
                        mb: 1.5,
                        "& .MuiOutlinedInput-root": {
                          bgcolor: COLORS.inputBg,
                          color: COLORS.headerText,
                          "& fieldset": { borderColor: COLORS.divider },
                          "&:hover fieldset": { borderColor: "rgba(17,27,33,0.22)" },
                          "&.Mui-focused fieldset": { borderColor: COLORS.brand },
                        },
                        "& .MuiInputLabel-root": { color: COLORS.subText },
                        "& .MuiInputLabel-root.Mui-focused": { color: COLORS.brand },
                      }}
                    />
                  ))}
                </Box>
              )}

              {tplSelected && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.subText,
                      mb: 1,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    Preview
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: COLORS.outbubble,
                      border: `1px solid ${COLORS.divider}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: FONTS.ui,
                        fontSize: 13,
                        color: COLORS.headerText,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.55,
                      }}
                    >
                      {tplBodyPreview || "—"}
                    </Typography>
                  </Box>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            py: 2,
            borderTop: `1px solid ${COLORS.divider}`,
            gap: 1,
          }}
        >
          <Button
            onClick={() => setTplDialogOpen(false)}
            sx={{
              textTransform: "none",
              color: COLORS.subText,
              "&:hover": { color: COLORS.headerText },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={sendTemplate}
            disabled={
              !tplSelected ||
              sending ||
              (tplParamCount > 0 && (tplParams || []).some((x) => !String(x || "").trim()))
            }
            sx={{
              textTransform: "none",
              fontWeight: 700,
              px: 2.5,
              bgcolor: COLORS.brand,
              borderRadius: 2,
              boxShadow: "0 4px 14px rgba(0,168,132,0.4)",
              "&:hover": { bgcolor: COLORS.brandDark },
              "&:disabled": {
                bgcolor: "rgba(17,27,33,0.08)",
                color: COLORS.subText,
                boxShadow: "none",
              },
            }}
          >
            {sending ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Send"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
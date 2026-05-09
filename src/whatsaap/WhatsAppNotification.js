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
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Tooltip,
  Slide,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DownloadIcon from "@mui/icons-material/Download";
import GridViewIcon from "@mui/icons-material/GridView";
import axios from "axios";
import { io } from "socket.io-client";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const SOCKET_URL = API_BASE;

const NOTIF_SOUND_URL =
  "https://cdn.shopify.com/s/files/1/0734/7155/7942/files/new-notification-014-363678.mp3?v=1769002522";

const ALLOWED_ROLES = new Set([
  "manager",
  "sales agent",
  "retention agent",
  "team leader",
  "assistant team lead",
  "admin",
  "super admin",
  "developer",
]);

// ─── Design tokens (Light WhatsApp theme) ─────────────────────────────────────
const COLORS = {
  // Brand
  brand: "#00A884",
  brandDark: "#017561",
  brandLight: "#D9FDD3",

  // Header — WhatsApp teal-green
  headerBg: "#008069",
  headerText: "#FFFFFF",
  headerSubText: "rgba(255,255,255,0.75)",
  headerIconColor: "rgba(255,255,255,0.85)",

  // Chat background — classic WhatsApp beige/tan
  chatBg: "#EAE0D4",
  chatBgPattern:
    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a0856c' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",

  // Bubbles
  outBubble: "#D9FDD3",
  outBubbleText: "#111B21",
  inBubble: "#FFFFFF",
  inBubbleText: "#111B21",

  // Input / bottom bar
  inputBarBg: "#F0F2F5",
  inputBg: "#FFFFFF",
  inputText: "#111B21",
  inputBorder: "rgba(17,27,33,0.14)",
  inputFocus: "#00A884",

  // General
  paper: "#FFFFFF",
  listBg: "#FFFFFF",
  listHover: "rgba(0,168,132,0.06)",
  divider: "rgba(17,27,33,0.08)",
  border: "rgba(17,27,33,0.12)",
  subText: "#667781",
  bodyText: "#111B21",
  mutedBg: "#F0F2F5",

  // Ticks
  tickRead: "#53BDEB",
  tickGrey: "#667781",
  tickFail: "#E53935",

  // File card
  fileBg: "rgba(17,27,33,0.04)",
  fileBorder: "rgba(17,27,33,0.08)",
  pdfIconBg: "#E53935",

  // Date chip
  dateBg: "rgba(17,27,33,0.06)",
  dateText: "#667781",
};

const FONTS = {
  ui: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const SHADOWS = {
  bubble: "0 1px 2px rgba(17,27,33,0.12)",
  popover: "0 12px 40px rgba(17,27,33,0.18), 0 0 0 1px rgba(17,27,33,0.06)",
  fab: "0 6px 20px rgba(0,168,132,0.38)",
  header: "0 1px 3px rgba(17,27,33,0.12)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const digitsOnly = (v = "") => String(v || "").replace(/\D/g, "");
const last10 = (v = "") => digitsOnly(v).slice(-10);
const roomForPhone10 = (p10) => `wa:${String(p10 || "").slice(-10)}`;

function safeJsonParse(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
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
  if (st === "read")
    return <DoneAllIcon sx={{ fontSize: 14, ml: 0.5, color: COLORS.tickRead }} />;
  if (st === "delivered")
    return <DoneAllIcon sx={{ fontSize: 14, ml: 0.5, color: COLORS.tickGrey }} />;
  if (st === "failed")
    return <DoneIcon sx={{ fontSize: 14, ml: 0.5, color: COLORS.tickFail }} />;
  return <DoneIcon sx={{ fontSize: 14, ml: 0.5, color: COLORS.tickGrey }} />;
}

function getMsgKey(m) { return m?.waId || m?._id || null; }
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
  return /360dialog\.io|graph\.facebook\.com|lookaside\.facebook\.com|fbcdn\.net|facebook\.com/i.test(String(url || ""));
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
    m?.media?.mime || m?.media?.mimetype || m?.mime || m?.mediaMime ||
    m?.raw?.audio?.mime_type || m?.raw?.voice?.mime_type || m?.raw?.mime_type || ""
  );
}
function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /safari/i.test(ua) && !/chrome|chromium|android/i.test(ua);
}

// ─── File attachment card ─────────────────────────────────────────────────────
function FileCard({ filename, size, url }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        p: 1,
        borderRadius: "10px",
        bgcolor: COLORS.fileBg,
        border: `1px solid ${COLORS.fileBorder}`,
        mb: 0.5,
        cursor: "pointer",
        "&:hover": { bgcolor: "rgba(17,27,33,0.07)" },
      }}
      onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: "8px",
          bgcolor: COLORS.pdfIconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <InsertDriveFileIcon sx={{ fontSize: 20, color: "#fff" }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 500,
            color: COLORS.bodyText,
            fontFamily: FONTS.ui,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {filename || "Document"}
        </Typography>
        <Typography sx={{ fontSize: 11, color: COLORS.subText, fontFamily: FONTS.ui }}>
          {size || "PDF"}
        </Typography>
      </Box>
      <DownloadIcon sx={{ fontSize: 18, color: COLORS.subText, flexShrink: 0 }} />
    </Box>
  );
}

// ─── Voice message card ────────────────────────────────────────────────────────
function VoiceCard({ src }) {
  const [playing, setPlaying] = useState(false);
  const bars = [3, 5, 9, 14, 18, 22, 19, 15, 10, 7, 12, 20, 22, 16, 9, 5, 8, 15, 21, 17, 11, 7, 9, 16, 22, 18, 12, 6, 8, 15];

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, minWidth: 210 }}>
      <Box
        onClick={() => setPlaying((p) => !p)}
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          bgcolor: COLORS.brand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 0.15s",
          "&:hover": { bgcolor: COLORS.brandDark },
        }}
      >
        {playing ? (
          <Box sx={{ display: "flex", gap: "3px", alignItems: "center" }}>
            <Box sx={{ width: 3, height: 12, bgcolor: "#fff", borderRadius: 1 }} />
            <Box sx={{ width: 3, height: 12, bgcolor: "#fff", borderRadius: 1 }} />
          </Box>
        ) : (
          <Box
            component="span"
            sx={{
              width: 0, height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: "10px solid #fff",
              ml: 0.5,
            }}
          />
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: "2px", flex: 1 }}>
        {bars.map((h, i) => (
          <Box
            key={i}
            sx={{
              width: 3,
              height: `${h}px`,
              borderRadius: "2px",
              bgcolor: playing ? COLORS.brand : "rgba(17,27,33,0.28)",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          />
        ))}
      </Box>

      <Typography sx={{ fontSize: 11, color: COLORS.subText, minWidth: 28, fontFamily: FONTS.ui }}>
        0:08
      </Typography>

      <Box
        sx={{
          width: 28, height: 28, borderRadius: "50%",
          bgcolor: COLORS.mutedBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Box
          component="span"
          sx={{
            width: 14, height: 14,
            borderRadius: "50%",
            bgcolor: COLORS.subText,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Box component="span" sx={{ fontSize: 8, color: "#fff", lineHeight: 1 }}>👤</Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Media renderer ────────────────────────────────────────────────────────────
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
        <FileCard
          filename={m?.media?.filename || "Document"}
          size={m?.media?.size || ""}
          url={buildProxyUrl(mediaId)}
        />
      );
    }
    return null;
  }

  const effectiveUrl = mediaId && blobUrlByMediaId[mediaId] ? blobUrlByMediaId[mediaId] : safeUrl;

  const isImg =
    msgType === "image" || mime.startsWith("image/") ||
    /\.(png|jpg|jpeg|webp|gif)$/i.test(effectiveUrl) ||
    /\.(png|jpg|jpeg|webp|gif)$/i.test(filename);
  const isAudio =
    ["audio", "voice", "ptt"].includes(msgType) ||
    mime.startsWith("audio/") || mime.includes("ogg") ||
    /\.(mp3|wav|ogg|opus|m4a)$/i.test(effectiveUrl) ||
    /\.(mp3|wav|ogg|opus|m4a)$/i.test(filename);
  const isVideo =
    msgType === "video" || mime.startsWith("video/") ||
    /\.(mp4|webm|mov)$/i.test(effectiveUrl) ||
    /\.(mp4|webm|mov)$/i.test(filename);
  const isPdf = mime.includes("pdf") || /\.pdf$/i.test(effectiveUrl) || /\.pdf$/i.test(filename);

  if (isImg) {
    return (
      <Box sx={{ mt: 0.5 }}>
        <Box
          component="img"
          src={effectiveUrl}
          alt="attachment"
          sx={{
            width: 220, maxWidth: "100%", borderRadius: "8px",
            display: "block", cursor: "pointer",
            border: `1px solid ${COLORS.border}`,
            transition: "opacity 0.2s",
            "&:hover": { opacity: 0.88 },
          }}
          onClick={() => window.open(effectiveUrl, "_blank", "noopener,noreferrer")}
        />
      </Box>
    );
  }

  if (isAudio) {
    const safari = isSafariBrowser();
    const looksLikeOggOpus =
      mime.includes("ogg") || mime.includes("opus") ||
      /\.ogg|\.opus/i.test(filename) || /\.ogg|\.opus/i.test(effectiveUrl);
    if (safari && looksLikeOggOpus) {
      return (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: COLORS.subText }}>
            Safari can't play ogg/opus. &nbsp;
          </Typography>
          <Button
            size="small" variant="outlined"
            onClick={() => window.open(effectiveUrl, "_blank", "noopener,noreferrer")}
            sx={{ textTransform: "none", borderColor: COLORS.border, color: COLORS.bodyText }}
          >
            Open audio
          </Button>
        </Box>
      );
    }
    return <VoiceCard src={effectiveUrl} />;
  }

  if (isVideo) {
    return (
      <Box sx={{ mt: 0.5 }}>
        <video
          controls preload="metadata" src={effectiveUrl}
          style={{ width: "220px", maxWidth: "100%", borderRadius: "10px", border: `1px solid ${COLORS.border}` }}
        />
      </Box>
    );
  }

  if (isPdf) {
    return (
      <FileCard
        filename={m?.media?.filename || "Document.pdf"}
        size={m?.media?.size || "PDF"}
        url={effectiveUrl}
      />
    );
  }

  return (
    <Box sx={{ mt: 0.5 }}>
      <Button
        size="small" variant="outlined"
        onClick={() => window.open(effectiveUrl, "_blank", "noopener,noreferrer")}
        sx={{
          textTransform: "none", borderColor: COLORS.border, color: COLORS.bodyText,
          "&:hover": { borderColor: COLORS.brand, color: COLORS.brand, bgcolor: "rgba(0,168,132,0.04)" },
        }}
      >
        Open attachment
      </Button>
    </Box>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────
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

const AVATAR_COLORS = [
  "#00796B", "#0288D1", "#7B1FA2", "#C62828",
  "#F57C00", "#2E7D32", "#1565C0", "#AD1457",
];
function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── Widget Header ────────────────────────────────────────────────────────────
function WidgetHeader({ view, title, subtitle, totalUnread, loading, onBack, onOpenFull, onRefresh, onSearch, onClose }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.5,
        py: 1.25,
        bgcolor: COLORS.headerBg,
        minHeight: 60,
        boxShadow: SHADOWS.header,
        position: "relative",
        zIndex: 1,
      }}
    >
      {view === "chat" && (
        <IconButton
          size="small"
          onClick={onBack}
          sx={{
            color: COLORS.headerIconColor,
            "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      )}

      {view === "list" && (
        <Box
          sx={{
            width: 34, height: 34, borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            mr: 0.5,
          }}
        >
          <WhatsAppIcon sx={{ fontSize: 19, color: "#fff" }} />
        </Box>
      )}

      {view === "chat" && (
        <Avatar
          sx={{
            width: 36, height: 36,
            bgcolor: avatarColor(title),
            fontSize: 13, fontWeight: 700,
            fontFamily: FONTS.ui,
            mr: 0.25,
          }}
        >
          {initials(title)}
        </Avatar>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: FONTS.ui,
            fontWeight: 600,
            fontSize: 15,
            color: COLORS.headerText,
            lineHeight: 1.2,
          }}
          noWrap
        >
          {title}
        </Typography>
        {view === "list" && totalUnread > 0 && (
          <Typography sx={{ fontSize: 11.5, color: "rgba(255,255,255,0.8)", fontFamily: FONTS.ui }}>
            {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
          </Typography>
        )}
        {view === "chat" && subtitle && (
          <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.82)", fontFamily: FONTS.ui }}>
            {subtitle}
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
          color: COLORS.headerIconColor,
          "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
        }}
      >
        <OpenInNewIcon sx={{ fontSize: 17 }} />
      </IconButton>
    </Tooltip>
  )}

  {view === "list" && (
    <Tooltip title="Search">
      <IconButton
        size="small"
        onClick={onSearch}
        sx={{
          color: COLORS.headerIconColor,
          "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
        }}
      >
        <SearchIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  )}

  <Tooltip title="Refresh">
    <IconButton
      size="small"
      onClick={onRefresh}
      disabled={loading}
      sx={{
        color: COLORS.headerIconColor,
        "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
      }}
    >
      {loading
        ? <CircularProgress size={15} sx={{ color: "rgba(255,255,255,0.7)" }} />
        : <RefreshIcon sx={{ fontSize: 17 }} />}
    </IconButton>
  </Tooltip>

  <IconButton
    size="small"
    onClick={onClose}
    sx={{
      color: COLORS.headerIconColor,
      "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
    }}
  >
    <CloseIcon sx={{ fontSize: 17 }} />
  </IconButton>
</Box>
    </Box>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────
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
      <ListItemAvatar sx={{ minWidth: 50 }}>
        <Avatar
          sx={{
            width: 44, height: 44,
            fontSize: 14, fontWeight: 700,
            bgcolor: bg, color: "#fff",
            fontFamily: FONTS.ui,
          }}
        >
          {ini}
        </Avatar>
      </ListItemAvatar>

      <ListItemText
        disableTypography
        primary={
          <Box sx={{ display: "flex", alignItems: "center", mb: 0.3 }}>
            <Typography
              sx={{ fontFamily: FONTS.ui, fontWeight: 600, fontSize: 14.5, color: COLORS.bodyText, flex: 1, lineHeight: 1.3 }}
              noWrap
            >
              {title}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: COLORS.subText, ml: 1, whiteSpace: "nowrap" }}>
              {rel}
            </Typography>
          </Box>
        }
        secondary={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              sx={{ fontFamily: FONTS.ui, fontSize: 13, color: COLORS.subText, flex: 1 }}
              noWrap
            >
              {sub}
            </Typography>
            {unread > 0 && (
              <Box
                sx={{
                  ml: 1, minWidth: 20, height: 20, px: 0.5,
                  borderRadius: 999, bgcolor: COLORS.brand,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
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

// ─── Date chip ────────────────────────────────────────────────────────────────
function DateChip({ label }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
      <Box
        sx={{
          px: 1.75, py: 0.4,
          borderRadius: 999,
          bgcolor: COLORS.dateBg,
          backdropFilter: "blur(4px)",
        }}
      >
        <Typography sx={{ fontSize: 11.5, color: COLORS.dateText, fontFamily: FONTS.ui, fontWeight: 500 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ m, blobUrlByMediaId }) {
  const outbound = String(m?.direction || "").toUpperCase() === "OUTBOUND";
  const time = fmtTime(m?.timestamp || m?.createdAt);
  const hasMedia = !!(m?.media || ["image", "audio", "voice", "ptt", "video", "document"].includes(String(m?.type || "").toLowerCase()));

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
          maxWidth: "80%",
          px: hasMedia ? 1 : 1.25,
          pt: hasMedia ? 0.75 : 0.75,
          pb: 0.5,
          borderRadius: outbound ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
          bgcolor: outbound ? COLORS.outBubble : COLORS.inBubble,
          boxShadow: SHADOWS.bubble,
          position: "relative",
        }}
      >
        {hasMedia && renderMedia(m, blobUrlByMediaId)}

        {!!m?.text && (
          <Typography
            sx={{
              fontFamily: FONTS.ui,
              fontSize: 13.5,
              color: outbound ? COLORS.outBubbleText : COLORS.inBubbleText,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
              mt: hasMedia ? 0.5 : 0,
            }}
          >
            {m.text}
          </Typography>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mt: 0.3, gap: 0.25 }}>
          <Typography sx={{ fontSize: 11, color: "rgba(17,27,33,0.5)", lineHeight: 1, fontFamily: FONTS.ui }}>
            {time}
          </Typography>
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
  const callFabRef = useRef(null);
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

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [tplLoading, setTplLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplSelected, setTplSelected] = useState("");
  const [tplParamCount, setTplParamCount] = useState(0);
  const [tplParams, setTplParams] = useState([]);
  const [tplBodyPreview, setTplBodyPreview] = useState("");
  const [callAnchorEl, setCallAnchorEl] = useState(null);
  const [callDialNumber, setCallDialNumber] = useState("");

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
    try { a.pause(); a.currentTime = 0; a.play()?.catch?.(() => {}); } catch {}
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
      Object.values(prev || {}).forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
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
  const myRoleNorm = useMemo(() => myRole.toLowerCase(), [myRole]);
  const myUserId = useMemo(() => String(sessionUser?._id || sessionUser?.id || "").trim(), [sessionUser?._id, sessionUser?.id]);
  const hasTeamEffective = useMemo(
    () =>
      Boolean(sessionUser?.hasTeam) ||
      myRoleNorm === "team leader" ||
      myRoleNorm === "team-leader" ||
      myRoleNorm === "assistant team lead",
    [sessionUser?.hasTeam, myRoleNorm]
  );

  const allowed = useMemo(
    () => !!myNameRaw && ALLOWED_ROLES.has(myRoleNorm),
    [myNameRaw, myRoleNorm]
  );
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
    if (["manager", "admin", "super admin", "developer"].includes(myRoleNorm)) return list;
    if (["team leader", "team-leader", "assistant team lead"].includes(myRoleNorm)) return list;
    return list.filter((c) => {
      const assigned = String(c?.assignedToLabel || "").trim().toLowerCase();
      return assigned && assigned === myName;
    });
  }, [convos, myRoleNorm, myName]);

  const sortedConvos = useMemo(() => {
    const sorted = visibleConvos.slice().sort((a, b) => {
      const au = Number(a?.unreadCount) || 0;
      const bu = Number(b?.unreadCount) || 0;
      if (au !== bu) return bu - au;
      return (
        (b?.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0) -
        (a?.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0)
      );
    });
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.trim().toLowerCase();
    return sorted.filter((c) => {
      const name = String(c?.displayName || "").toLowerCase();
      const phone = String(c?.phone || "");
      const last = String(c?.lastMessageText || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || last.includes(q);
    });
  }, [visibleConvos, searchQuery]);

  const fetchConversations = useCallback(async () => {
    if (!shouldShowWidget) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/api/whatsapp/conversations`, {
        withCredentials: true,
        params: {
          role: myRole || "",
          userName: myNameRaw || "",
          userId: myUserId || "",
          hasTeam: hasTeamEffective ? "true" : "false",
          chatScope:
            myRoleNorm === "team leader" || myRoleNorm === "team-leader"
              ? "team"
              : hasTeamEffective && myRoleNorm === "assistant team lead"
              ? "combined"
              : "self",
        },
      });
      setConvos(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  }, [shouldShowWidget, myNameRaw, myRole, myUserId, hasTeamEffective, myRoleNorm]);

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
          mime.startsWith("audio/") || mime.includes("ogg") ||
          /\.(mp3|wav|ogg|opus|m4a)$/i.test(fn);
        if (!isAudio) continue;
        const safeUrl = getSafeMediaUrl(m);
        if (!safeUrl?.includes("/api/whatsapp/media-proxy/")) continue;
        try {
          const res = await fetch(safeUrl, { credentials: "include" });
          if (!res.ok || cancelled) continue;
          const objUrl = URL.createObjectURL(await res.blob());
          if (cancelled) { URL.revokeObjectURL(objUrl); continue; }
          setBlobUrlByMediaId((prev) => (prev[mediaId] ? prev : { ...prev, [mediaId]: objUrl }));
        } catch {}
      }
    }
    prefetch();
    return () => { cancelled = true; };
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

  const handleOpen = () => { prepareNotifAudio(); setAnchorEl(fabRef.current); };
  const handleClose = () => {
    setAnchorEl(null);
    setView("list");
    setActive(null);
    setMessages([]);
    setDraft("");
    setSearchOpen(false);
    setSearchQuery("");
    clearBlobUrls();
  };

  const openChatInline = async (c) => {
  if (!shouldShowWidget) return;
  clearBlobUrls();
  setSearchOpen(false);
  setSearchQuery("");
  setActive(c);
  setView("chat");
  const p10 = last10(c?.phone);
  await fetchMessages(p10);
  await markRead(p10);
  setTimeout(() => scrollToBottom(false), 60);
};

  const openFullChat = useCallback(() => {
    if (!phone10Active) return;
    if (typeof onOpenChat === "function") { onOpenChat(phone10Active); return; }
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
      await axios.post(`${API_BASE}/api/whatsapp/send-text`, { to: phone10Active, text }, { withCredentials: true });
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
        { to: phone10Active, templateName: tplSelected, parameters: params, renderedText: tplBodyPreview || "" },
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

  const hasDraft = String(draft || "").trim().length > 0;

  const openCallSheet = useCallback(() => {
    if (callAnchorEl) {
      setCallAnchorEl(null);
      return;
    }
    const activePhone = String(phone10Active || "").trim();
    setCallDialNumber(activePhone ? `+91${activePhone}` : "");
    setCallAnchorEl(callFabRef.current);
  }, [callAnchorEl, phone10Active]);

  const triggerEmbeddedDial = useCallback((num) => {
    try {
      const phoneNumber = String(num || "").trim();
      if (!phoneNumber) return;
      const iframe = document.getElementById("global-zoom-phone-frame");
      iframe?.contentWindow?.postMessage(
        { type: "zp-make-call", phoneNumber },
        "https://applications.zoom.us"
      );
    } catch {}
  }, []);

  const onCallSheetFrameLoad = useCallback(() => {
    if (callDialNumber) {
      setTimeout(() => triggerEmbeddedDial(callDialNumber), 700);
    }
  }, [callDialNumber, triggerEmbeddedDial]);

  useEffect(() => {
    const onOpenZoomSheet = (e) => {
      const raw = String(e?.detail?.phoneNumber || "").trim();
      if (raw) setCallDialNumber(raw.startsWith("+") ? raw : `+91${raw.replace(/\D/g, "")}`);
      setCallAnchorEl(callFabRef.current);
    };
    window.addEventListener("zoom:open-sheet", onOpenZoomSheet);
    return () => window.removeEventListener("zoom:open-sheet", onOpenZoomSheet);
  }, []);

  if (!shouldShowWidget) return null;

  return (
    <>
      {/* Global Call FAB (above WhatsApp) */}
      <Box sx={{ position: "fixed", right: 22, bottom: 130, zIndex: 4001 }}>
        <Fab
          ref={callFabRef}
          onClick={openCallSheet}
          sx={{
            width: 50,
            height: 50,
            bgcolor: "#1976d2",
            "&:hover": { bgcolor: "#115293", transform: "scale(1.07)" },
            boxShadow: "0 8px 22px rgba(25,118,210,0.42)",
            transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <PhoneInTalkIcon sx={{ color: "#fff", fontSize: 24 }} />
        </Fab>
      </Box>

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
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
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
              boxShadow: SHADOWS.fab,
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
            width: 385,
            maxWidth: "92vw",
            height: 590,
            borderRadius: "16px",
            overflow: "hidden",
            bgcolor: COLORS.paper,
            boxShadow: SHADOWS.popover,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <WidgetHeader
          view={view}
          title={view === "chat" ? active?.displayName || phone10Active || "Chat" : "WhatsApp"}
          subtitle={view === "chat" ? phone10Active || "" : ""}
          totalUnread={totalUnread}
          loading={loading}
          onBack={() => { setView("list"); setActive(null); setMessages([]); setDraft(""); clearBlobUrls(); }}
          onOpenFull={openFullChat}
          onRefresh={fetchConversations}
          onSearch={() => { setSearchOpen((v) => !v); setSearchQuery(""); }}
          onClose={handleClose}
        />

        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {view === "list" ? (
            <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* Search bar */}
              {searchOpen && (
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.875,
                    bgcolor: COLORS.inputBarBg,
                    borderBottom: `1px solid ${COLORS.divider}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                  }}
                >
                  <TextField
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    size="small"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <SearchIcon sx={{ fontSize: 17, color: COLORS.subText, mr: 0.75 }} />
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: COLORS.inputBg,
                        borderRadius: "10px",
                        fontSize: 13.5,
                        fontFamily: FONTS.ui,
                        color: COLORS.inputText,
                        "& fieldset": { borderColor: COLORS.inputBorder },
                        "&:hover fieldset": { borderColor: "rgba(17,27,33,0.22)" },
                        "&.Mui-focused fieldset": { borderColor: COLORS.brand, borderWidth: 1.5 },
                      },
                      "& .MuiOutlinedInput-input::placeholder": {
                        color: COLORS.subText, opacity: 1, fontSize: 13.5, fontFamily: FONTS.ui,
                      },
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                    sx={{
                      color: COLORS.subText,
                      "&:hover": { color: COLORS.bodyText, bgcolor: "rgba(17,27,33,0.06)" },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Box>
              )}

              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  bgcolor: COLORS.listBg,
                  "&::-webkit-scrollbar": { width: 4 },
                  "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                  "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(17,27,33,0.14)", borderRadius: 999 },
                }}
              >
                {loading && !sortedConvos.length && !searchQuery ? (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.5 }}>
                    <CircularProgress size={28} sx={{ color: COLORS.brand }} />
                    <Typography sx={{ color: COLORS.subText, fontSize: 13, fontFamily: FONTS.ui }}>
                      Loading conversations…
                    </Typography>
                  </Box>
                ) : sortedConvos.length === 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1 }}>
                    <Box
                      sx={{
                        width: 64, height: 64, borderRadius: "50%",
                        bgcolor: "rgba(0,168,132,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {searchQuery
                        ? <SearchIcon sx={{ fontSize: 30, color: "rgba(0,168,132,0.4)" }} />
                        : <WhatsAppIcon sx={{ fontSize: 34, color: "rgba(0,168,132,0.4)" }} />}
                    </Box>
                    <Typography sx={{ color: COLORS.subText, fontSize: 13, fontFamily: FONTS.ui, mt: 0.5 }}>
                      {searchQuery
                        ? `No results for "${searchQuery}"`
                        : myRole === "Manager" ? "No conversations yet" : "No assigned conversations"}
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
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Chat messages */}
              <Box
                ref={chatScrollRef}
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: 1.25,
                  backgroundImage: COLORS.chatBgPattern,
                  bgcolor: COLORS.chatBg,
                  "&::-webkit-scrollbar": { width: 4 },
                  "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                  "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(17,27,33,0.18)", borderRadius: 999 },
                }}
              >
                {chatLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                    <CircularProgress size={24} sx={{ color: COLORS.brand }} />
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1 }}>
                    <Typography sx={{ color: COLORS.subText, fontSize: 13, fontFamily: FONTS.ui }}>
                      No messages yet
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <DateChip label="Today" />
                    {messages.map((m) => (
                      <ChatBubble
                        key={m?._id || m?.waId || Math.random()}
                        m={m}
                        blobUrlByMediaId={blobUrlByMediaId}
                      />
                    ))}
                  </>
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input bar */}
              <Box
                sx={{
                  px: 1.25,
                  py: 1,
                  bgcolor: COLORS.inputBarBg,
                  borderTop: `1px solid ${COLORS.divider}`,
                  display: "flex",
                  gap: 0.75,
                  alignItems: "flex-end",
                }}
              >
                {/* Template button */}
                <Tooltip title="Send template">
                  <Button
                    size="small"
                    onClick={openTemplateDialog}
                    disabled={!phone10Active || sending}
                    startIcon={<GridViewIcon sx={{ fontSize: "14px !important" }} />}
                    sx={{
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: 12,
                      fontFamily: FONTS.ui,
                      borderRadius: "8px",
                      whiteSpace: "nowrap",
                      color: COLORS.subText,
                      border: `1px solid ${COLORS.border}`,
                      px: 1.25,
                      py: 0.75,
                      flexShrink: 0,
                      bgcolor: COLORS.paper,
                      minWidth: 0,
                      "&:hover": {
                        borderColor: COLORS.brand,
                        color: COLORS.brand,
                        bgcolor: "rgba(0,168,132,0.06)",
                      },
                      "&:disabled": { color: "rgba(17,27,33,0.28)", bgcolor: "transparent" },
                    }}
                  >
                    Template
                  </Button>
                </Tooltip>

                {/* Text field */}
                <TextField
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  size="small"
                  multiline
                  maxRows={3}
                  fullWidth
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: COLORS.inputBg,
                      borderRadius: "10px",
                      fontSize: 13.5,
                      fontFamily: FONTS.ui,
                      color: COLORS.inputText,
                      "& fieldset": { borderColor: COLORS.inputBorder },
                      "&:hover fieldset": { borderColor: "rgba(17,27,33,0.22)" },
                      "&.Mui-focused fieldset": { borderColor: COLORS.brand, borderWidth: 1.5 },
                    },
                    "& .MuiOutlinedInput-input::placeholder": {
                      color: COLORS.subText,
                      opacity: 1,
                      fontSize: 13.5,
                      fontFamily: FONTS.ui,
                    },
                  }}
                />

                {/* Send / Mic */}
                <IconButton
                  onClick={hasDraft ? sendText : undefined}
                  disabled={sending}
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    bgcolor: COLORS.brand,
                    color: "#fff",
                    borderRadius: "50%",
                    transition: "background 0.2s, transform 0.15s",
                    "&:hover": { bgcolor: COLORS.brandDark, transform: "scale(1.07)" },
                    "&:disabled": { bgcolor: COLORS.mutedBg, color: COLORS.subText },
                  }}
                >
                  {hasDraft
                    ? <SendIcon sx={{ fontSize: 18 }} />
                    : <MicIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Box>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Bottom-slide Zoom call panel */}
      <Popover
        open={Boolean(callAnchorEl)}
        anchorEl={callAnchorEl}
        onClose={() => setCallAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 360,
            maxWidth: "calc(100vw - 24px)",
            borderRadius: "16px 16px 10px 10px",
            overflow: "hidden",
            border: "1px solid #d7e3f4",
            boxShadow: "0 22px 45px rgba(2,6,23,0.3)",
          },
        }}
      >
        <Box
          sx={{
            bgcolor: "#2d6cdf",
            color: "#fff",
            px: 1.4,
            py: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Zoom Phone</Typography>
          <IconButton size="small" onClick={() => setCallAnchorEl(null)} sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ bgcolor: "#fff" }}>
          <iframe
            id="global-zoom-phone-frame"
            title="Global Zoom Phone"
            src="https://applications.zoom.us/integration/phone/embeddablephone/home"
            onLoad={onCallSheetFrameLoad}
            style={{ width: "100%", height: 520, border: 0 }}
            allow="microphone; speaker"
          />
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
            color: COLORS.bodyText,
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(17,27,33,0.18)",
          },
        }}
      >
        {/* Dialog header styled like chat header */}
        <DialogTitle
          sx={{
            fontFamily: FONTS.ui,
            fontWeight: 600,
            fontSize: 16,
            color: "#fff",
            bgcolor: COLORS.headerBg,
            py: 1.75,
            px: 2.5,
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
                    color: COLORS.bodyText,
                    borderRadius: "10px",
                    fontFamily: FONTS.ui,
                    "& fieldset": { borderColor: COLORS.border },
                    "&:hover fieldset": { borderColor: "rgba(17,27,33,0.22)" },
                    "&.Mui-focused fieldset": { borderColor: COLORS.brand },
                  },
                  "& .MuiInputLabel-root": { color: COLORS.subText, fontFamily: FONTS.ui },
                  "& .MuiInputLabel-root.Mui-focused": { color: COLORS.brand },
                }}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        bgcolor: COLORS.paper,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: "10px",
                        boxShadow: "0 8px 24px rgba(17,27,33,0.12)",
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
                        color: COLORS.bodyText,
                        fontSize: 13,
                        fontFamily: FONTS.ui,
                        "&:hover": { bgcolor: COLORS.listHover },
                        "&.Mui-selected": { bgcolor: "rgba(0,168,132,0.1)" },
                      }}
                    >
                      {t?.name}
                    </MenuItem>
                  ))}
              </TextField>

              {tplSelected && tplParamCount > 0 && (
                <Box sx={{ mt: 2.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.subText, mb: 1.25, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: FONTS.ui }}>
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
                        setTplParams((prev) => { const n = prev.slice(); n[idx] = v; return n; });
                      }}
                      sx={{
                        mb: 1.5,
                        "& .MuiOutlinedInput-root": {
                          bgcolor: COLORS.inputBg,
                          color: COLORS.bodyText,
                          borderRadius: "10px",
                          fontFamily: FONTS.ui,
                          "& fieldset": { borderColor: COLORS.border },
                          "&:hover fieldset": { borderColor: "rgba(17,27,33,0.22)" },
                          "&.Mui-focused fieldset": { borderColor: COLORS.brand },
                        },
                        "& .MuiInputLabel-root": { color: COLORS.subText, fontFamily: FONTS.ui },
                        "& .MuiInputLabel-root.Mui-focused": { color: COLORS.brand },
                      }}
                    />
                  ))}
                </Box>
              )}

              {tplSelected && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.subText, mb: 1, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: FONTS.ui }}>
                    Preview
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "10px",
                      bgcolor: COLORS.outBubble,
                      border: `1px solid ${COLORS.divider}`,
                      boxShadow: SHADOWS.bubble,
                    }}
                  >
                    <Typography sx={{ fontFamily: FONTS.ui, fontSize: 13.5, color: COLORS.bodyText, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                      {tplBodyPreview || "—"}
                    </Typography>
                  </Box>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2, borderTop: `1px solid ${COLORS.divider}`, gap: 1 }}>
          <Button
            onClick={() => setTplDialogOpen(false)}
            sx={{
              textTransform: "none",
              fontFamily: FONTS.ui,
              color: COLORS.subText,
              "&:hover": { color: COLORS.bodyText },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={sendTemplate}
            disabled={
              !tplSelected || sending ||
              (tplParamCount > 0 && (tplParams || []).some((x) => !String(x || "").trim()))
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: FONTS.ui,
              px: 2.5,
              bgcolor: COLORS.brand,
              borderRadius: "8px",
              boxShadow: "0 4px 14px rgba(0,168,132,0.35)",
              "&:hover": { bgcolor: COLORS.brandDark },
              "&:disabled": { bgcolor: "rgba(17,27,33,0.08)", color: COLORS.subText, boxShadow: "none" },
            }}
          >
            {sending ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Send"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

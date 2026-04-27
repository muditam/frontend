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
import MoreVertIcon from "@mui/icons-material/MoreVert";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { io } from "socket.io-client";
import WhatsAppCartDrawer from "../pages/retention/WhatsAppCartDrawer";
 
const DEFAULT_API_BASE =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5001"
    : "https://muditamleads-14f32a10d7f7.herokuapp.com";
const API_BASE = String(process.env.REACT_APP_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
const DEBUG_SOCKET = false;
const NOTIF_SOUND_URL =
  "https://cdn.shopify.com/s/files/1/0734/7155/7942/files/new-notification-014-363678.mp3?v=1769002522";
const MESSAGE_PAGE_SIZE = 15;

const LIGHT = {
  appBg: "#f7f8fa",
  sidebarBg: "#ffffff",
  sidebarHeaderBg: "#f0f2f5",
  panelBg: "#efeae2",
  panelHeaderBg: "#f0f2f5",
  searchBg: "#f6f7f9",
  activeRowBg: "#e9f2ff",
  hoverRowBg: "#f7faff",
  border: "#dde3ea",
  text: "#111827",
  subtext: "#667085",
  muted: "#98a2b3",
  outgoingBubble: "#dcf8c6",
  incomingBubble: "#ffffff",
  unreadIncomingBubble: "#f5fbf2",
  unreadOutgoingBubble: "#d6f5bd",
  composerBg: "#f0f2f5",
  inputBg: "#ffffff",
  chipBg: "#e8f5e9",
};

/* ─── Helpers (unchanged) ─────────────────────────────────────────────────── */
function digitsOnly(v = "") { return String(v || "").replace(/\D/g, ""); }
function phone10(v = "") { const p = digitsOnly(v); return p.length >= 10 ? p.slice(-10) : p; }
function roomForPhone10(p10) { return `wa:${String(p10 || "").slice(-10)}`; }
function buildTempId(prefix = "tmp") { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function normalizeToWa(toAny = "") { const d = digitsOnly(toAny); if (!d) return ""; if (d.length === 10) return `91${d}`; return d; }
function customerPhoneFromMsg(msg) {
  const dir = String(msg?.direction || "").toUpperCase();
  if (dir === "OUTBOUND") return msg?.to || "";
  if (dir === "INBOUND") return msg?.from || "";
  return msg?.phone || msg?.to || msg?.from || "";
}
function sameCustomer(msg, p10) { return phone10(customerPhoneFromMsg(msg)) === p10; }
function removeMessageById(list, id) { return list.filter((m) => m?._id !== id); }

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", cache: "no-store", ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) { const msg = data?.message || `Request failed: ${res.status}`; const err = new Error(msg); err.status = res.status; err.data = data; throw err; }
  return data;
}

async function apiForm(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", credentials: "include", body: formData });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) { const msg = data?.message || `Request failed: ${res.status}`; const err = new Error(msg); err.status = res.status; err.data = data; throw err; }
  return data;
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatLastActive(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}
function nameInitials(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return (parts[0][0] || "?").toUpperCase();
  return `${(parts[0][0] || "").toUpperCase()}${(parts[parts.length - 1][0] || "").toUpperCase()}`;
}
function chatDisplayName(chat) { return chat?.displayName || phone10(chat?.phone); }
function assignedToText(chat) { return chat?.assignedToLabel || ""; }
function extractApiErrorMessage(err, fallback = "Request failed") {
  const data = err?.data || {};
  return data?.providerError?.errors?.[0]?.message || data?.providerError?.message || data?.message || err?.message || fallback;
}
function statusChipProps(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s.includes("APPROV")) return { label: "APPROVED", sx: { bgcolor: "#e7fbf2", color: "#1b7f4b", fontWeight: 700 } };
  if (s.includes("REJECT")) return { label: "REJECTED", sx: { bgcolor: "#ffeceb", color: "#b42318", fontWeight: 700 } };
  if (s.includes("PEND") || s.includes("SUBMIT") || s.includes("REVIEW")) return { label: "PENDING", sx: { bgcolor: "#fff3dc", color: "#a15c07", fontWeight: 700 } };
  return { label: s || "UNKNOWN", sx: { bgcolor: "#f4f6f8", color: "#344054", fontWeight: 700 } };
}

function templateComponents(tpl) { return Array.isArray(tpl?.components) ? tpl.components : []; }
function isUtilityTemplate(t) { return String(t?.category || "").toUpperCase() === "UTILITY"; }
function isApprovedTemplate(t) { return String(t?.status || "").toUpperCase().includes("APPROV"); }
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
  for (const m of text.matchAll(/{{\s*(\d+)\s*}}/g)) { const n = Number(m[1] || 0); if (n > 0) set.add(n); }
  return Array.from(set).sort((a, b) => a - b);
}
function applyVarsToBody(bodyText = "", varsMap = {}) {
  let out = String(bodyText || "");
  for (const [k, v] of Object.entries(varsMap)) {
    const idx = Number(k); if (!idx) continue;
    out = out.replace(new RegExp(`{{\\s*${idx}\\s*}}`, "g"), String(v ?? "") || `{{${idx}}}`);
  }
  return out;
}
function getHeaderMediaFormat(tpl) {
  if (!tpl) return "";
  const comps = templateComponents(tpl);
  const header = comps.find((c) => String(c?.type || "").toUpperCase() === "HEADER");
  const format = String(header?.format || "").toUpperCase();
  return ["IMAGE", "VIDEO", "DOCUMENT"].includes(format) ? format : "";
}
function acceptForHeaderFormat(fmt) {
  const f = String(fmt || "").toUpperCase();
  if (f === "IMAGE") return "image/*";
  if (f === "VIDEO") return "video/*";
  if (f === "DOCUMENT") return ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf";
  return "*/*";
}

function msgKey(m) {
  return m?.waId || m?._id || m?.id ||
    `${m?.direction || "X"}_${m?.timestamp || m?.createdAt || ""}_${m?.text || ""}_${m?.media?.url || ""}_${m?.type || ""}`;
}
function messageIdentity(m) {
  const waId = String(m?.waId || "").trim();
  if (waId) return `wa:${waId}`;
  const id = String(m?._id || m?.id || "").trim();
  if (id && !id.startsWith("tmp_")) return `id:${id}`;
  const dir = String(m?.direction || "").toUpperCase();
  const from = phone10(m?.from || "");
  const to = phone10(m?.to || "");
  const phone = phone10(customerPhoneFromMsg(m) || "");
  const text = String(m?.text || "").trim().toLowerCase();
  const type = String(m?.type || "text").toLowerCase();
  const mediaId = String(m?.media?.id || "").trim();
  const mediaUrl = String(m?.media?.url || "").trim();
  const tsRaw = m?.timestamp || m?.createdAt || "";
  const tsMs = new Date(tsRaw || 0).getTime();
  const tsBucket = Number.isFinite(tsMs) && tsMs > 0 ? Math.floor(tsMs / 1000) : String(tsRaw || "");
  return `sig:${dir}|${from}|${to}|${phone}|${type}|${text}|${mediaId}|${mediaUrl}|${tsBucket}`;
}
function isLikelySameMessage(a, b) {
  const aWa = String(a?.waId || "").trim();
  const bWa = String(b?.waId || "").trim();
  if (aWa && bWa && aWa === bWa) return true;
  const aId = String(a?._id || a?.id || "").trim();
  const bId = String(b?._id || b?.id || "").trim();
  if (aId && bId && !aId.startsWith("tmp_") && !bId.startsWith("tmp_") && aId === bId) return true;

  const aDir = String(a?.direction || "").toUpperCase();
  const bDir = String(b?.direction || "").toUpperCase();
  if (aDir !== bDir) return false;
  const aType = String(a?.type || "text").toLowerCase();
  const bType = String(b?.type || "text").toLowerCase();
  if (aType !== bType) return false;
  if (aType === "text" || aType === "template") {
    if (String(a?.text || "").trim() !== String(b?.text || "").trim()) return false;
  }

  const aPhone = phone10(customerPhoneFromMsg(a) || "");
  const bPhone = phone10(customerPhoneFromMsg(b) || "");
  if (!aPhone || !bPhone || aPhone !== bPhone) return false;

  const aMediaId = String(a?.media?.id || "").trim();
  const bMediaId = String(b?.media?.id || "").trim();
  if (aMediaId && bMediaId && aMediaId !== bMediaId) return false;

  const aIsTemp = String(a?._id || "").startsWith("tmp_");
  const bIsTemp = String(b?._id || "").startsWith("tmp_");
  const aTs = new Date(a?.timestamp || a?.createdAt || 0).getTime();
  const bTs = new Date(b?.timestamp || b?.createdAt || 0).getTime();
  if (!aTs || !bTs) return aIsTemp || bIsTemp;
  const delta = Math.abs(aTs - bTs);
  if (aIsTemp || bIsTemp) return delta <= 120000;
  return delta <= 2000;
}
function normalizeStatus(s) {
  const v = String(s || "").toLowerCase().trim();
  if (!v) return v;
  if (["read", "seen"].includes(v) || v.includes("read") || v.includes("seen")) return "read";
  if (
    ["delivered", "deliver", "received"].includes(v) ||
    v.includes("deliver") ||
    v.includes("receive")
  ) return "delivered";
  if (["sent"].includes(v) || v.includes("sent") || v.includes("submit") || v.includes("queue") || v.includes("accept")) return "sent";
  if (["failed", "error"].includes(v) || v.includes("fail") || v.includes("error") || v.includes("reject") || v.includes("undeliver")) return "failed";
  return v;
}
function statusRank(status) {
  const st = normalizeStatus(status);
  if (st === "failed") return 99;
  if (st === "read") return 3;
  if (st === "delivered") return 2;
  if (st === "sent") return 1;
  return 0;
}

function MessageTicks({ status }) {
  const st = normalizeStatus(status);
  if (st === "read") return <DoneAllIcon sx={{ fontSize: 15, ml: 0.5, color: "#53bdeb" }} />;
  if (st === "delivered") return <DoneAllIcon sx={{ fontSize: 15, ml: 0.5, color: "rgba(0,0,0,0.4)" }} />;
  if (st === "sent") return <DoneIcon sx={{ fontSize: 15, ml: 0.5, color: "rgba(0,0,0,0.4)" }} />;
  if (st === "failed") return <Typography component="span" sx={{ fontSize: 12, color: "#e74c3c", ml: 0.5, fontWeight: 900 }}>!</Typography>;
  return null;
}

function UnreadBadge({ count }) {
  const n = Number(count || 0);
  if (!n) return null;
  return (
    <Box sx={{
      minWidth: 20, height: 20, px: 0.75, borderRadius: 999,
      bgcolor: "#22c55e", color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, lineHeight: 1, flexShrink: 0,
    }}>
      {n > 99 ? "99+" : n}
    </Box>
  );
}

function mediaIdFromMsg(m) { return m?.media?.id || m?.mediaId || m?.templateMeta?.headerMedia?.id || ""; }
function mediaUrlFromMsg(m) { return m?.media?.url || m?.mediaUrl || m?.templateMeta?.headerMedia?.url || ""; }
function mediaMimeFromMsg(m) {
  const tplFmt = m?.templateMeta?.headerMedia?.format;
  let guessedMime = "";
  if (tplFmt === "DOCUMENT") guessedMime = "application/pdf";
  if (tplFmt === "IMAGE") guessedMime = "image/jpeg";
  if (tplFmt === "VIDEO") guessedMime = "video/mp4";
  return m?.media?.mime || m?.mime || guessedMime || "";
}
function mediaFilenameFromMsg(m) { return m?.media?.filename || m?.filename || m?.templateMeta?.headerMedia?.filename || "attachment"; }
function detectMediaKind({ url = "", mime = "", fallbackType = "" }) {
  const u = String(url || ""), m = String(mime || "").toLowerCase(), t = String(fallbackType || "").toLowerCase();
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
function resolveBestMediaUrl(msg) { return absolutizeMaybe(mediaUrlFromMsg(msg)); }
function mergeServerMessageWithOptimistic(serverMsg, tempMsg) {
  if (!serverMsg || !tempMsg) return serverMsg;
  const serverHasMediaUrl = Boolean(resolveBestMediaUrl(serverMsg));
  const tempHasMediaUrl = Boolean(resolveBestMediaUrl(tempMsg));
  const isTemplate = String(serverMsg?.type || "").toLowerCase() === "template";
  if (!isTemplate || serverHasMediaUrl || !tempHasMediaUrl) return serverMsg;
  const mergedHeaderMedia = { ...(tempMsg?.templateMeta?.headerMedia || {}), ...(serverMsg?.templateMeta?.headerMedia || {}) };
  if (!mergedHeaderMedia.url && tempMsg?.media?.url) mergedHeaderMedia.url = tempMsg.media.url;
  if (!mergedHeaderMedia.mime && tempMsg?.media?.mime) mergedHeaderMedia.mime = tempMsg.media.mime;
  if (!mergedHeaderMedia.filename && tempMsg?.media?.filename) mergedHeaderMedia.filename = tempMsg.media.filename;
  return {
    ...serverMsg,
    media: serverMsg?.media?.url ? serverMsg.media : tempMsg.media,
    templateMeta: { ...(tempMsg?.templateMeta || {}), ...(serverMsg?.templateMeta || {}), headerMedia: Object.keys(mergedHeaderMedia).length ? mergedHeaderMedia : undefined },
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
    let cancelled = false, localBlob = "";
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
    return () => { cancelled = true; if (localBlob) { try { URL.revokeObjectURL(localBlob); } catch {} } };
  }, [kind, resolvedUrl, mediaId]);

  if (!resolvedUrl) {
    if (mediaId) return <Box sx={{ mt: 0.75 }}><Typography fontSize={12} color="text.secondary">Media available but URL missing.</Typography></Box>;
    return null;
  }

  if (kind === "image") {
    return (
      <Box sx={{ mt: 0.5, borderRadius: 2, overflow: "hidden" }}>
        <Box component="img" src={resolvedUrl} alt={filename || "attachment"} loading="lazy"
          sx={{ width: 240, maxWidth: "100%", display: "block", cursor: "pointer", transition: "opacity 0.2s", "&:hover": { opacity: 0.9 } }}
          onLoad={() => { if (isNearBottomRef?.current) bottomRef?.current?.scrollIntoView({ behavior: "auto" }); }}
          onClick={() => window.open(resolvedUrl, "_blank", "noopener,noreferrer")} />
      </Box>
    );
  }
  if (kind === "video") {
    return (
      <Box sx={{ mt: 0.5, borderRadius: 2, overflow: "hidden" }}>
        <Box component="video" controls playsInline preload="metadata"
          sx={{ width: 280, maxWidth: "100%", display: "block", backgroundColor: "#000" }}
          onLoadedMetadata={() => { if (isNearBottomRef?.current) bottomRef?.current?.scrollIntoView({ behavior: "auto" }); }}>
          <source src={resolvedUrl} type={mime || undefined} />
        </Box>
      </Box>
    );
  }
  if (kind === "audio") {
    const src = audioBlobUrl || resolvedUrl;
    return (
      <Box sx={{ mt: 0.75 }}>
        <Box component="audio" controls preload="metadata" sx={{ width: 260, maxWidth: "100%" }}>
          <source src={src} type={mime || undefined} />
        </Box>
      </Box>
    );
  }
  if (kind === "pdf") {
    return (
      <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(15, 23, 42, 0.05)", borderRadius: 2, px: 1.5, py: 1 }}>
        <Box sx={{ fontSize: 22 }}>📄</Box>
        <Button size="small" onClick={() => window.open(resolvedUrl, "_blank", "noopener,noreferrer")} sx={{ textTransform: "none", p: 0, minWidth: 0, color: "inherit", fontWeight: 600, fontSize: 13 }}>
          {filename || "Open PDF"}
        </Button>
      </Box>
    );
  }
  return (
    <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(15, 23, 42, 0.05)", borderRadius: 2, px: 1.5, py: 1 }}>
      <Box sx={{ fontSize: 22 }}>📎</Box>
      <Button size="small" onClick={() => window.open(resolvedUrl, "_blank", "noopener,noreferrer")} sx={{ textTransform: "none", p: 0, minWidth: 0, color: "inherit", fontWeight: 600, fontSize: 13 }}>
        {filename || "Open file"}
      </Button>
    </Box>
  );
}

function TemplateBubble({ msg }) {
  const text = msg?.text || "";
  const tplName = msg?.templateMeta?.name || "";
  const hasMedia = !!String(msg?.media?.id || "").trim() || !!String(msg?.media?.url || "").trim() ||
    !!String(msg?.templateMeta?.headerMedia?.id || "").trim() || !!String(msg?.templateMeta?.headerMedia?.url || "").trim();
  return (
    <Box>
      {hasMedia && <MessageMedia msg={msg} isNearBottomRef={{ current: true }} bottomRef={{ current: null }} />}
      {!!text && <Typography fontSize={14} whiteSpace="pre-wrap" sx={{ mt: hasMedia ? 0.75 : 0, lineHeight: 1.5 }}>{text}</Typography>}
      {!text && !hasMedia && <Typography fontSize={13} color="text.secondary" fontStyle="italic">[Template: {tplName || "unknown"}]</Typography>}
      <Box sx={{ mt: 0.75 }}>
        <Chip size="small" label={tplName ? `⚡ ${tplName}` : "⚡ Template"}
          sx={{ fontSize: 10, height: 18, bgcolor: "rgba(37,211,102,0.12)", color: "#128C7E", fontWeight: 600, border: "1px solid rgba(37,211,102,0.25)" }} />
      </Box>
    </Box>
  );
}

/* ─── Avatar colors ─────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
];
function avatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function WaAvatar({ name = "", size = 40 }) {
  const color = avatarColor(name);
  const initials = nameInitials(name);
  return (
    <Avatar sx={{
      width: size, height: size,
      bgcolor: color, color: "#fff",
      fontSize: size > 36 ? 16 : 13,
      fontWeight: 700,
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      {initials}
    </Avatar>
  );
}

/* ─── Date separator ─────────────────────────────────────────────────────── */
function DateSeparator({ date }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", my: 1.5 }}>
      <Box sx={{ bgcolor: "rgba(225,245,254,0.92)", px: 2, py: 0.4, borderRadius: 99, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}>
        <Typography sx={{ fontSize: 12, color: "#54656F", fontWeight: 500 }}>{date}</Typography>
      </Box>
    </Box>
  );
}

function buildLocalPreviewText(type = "", filename = "") {
  if (type === "image") return "📷 Photo";
  if (type === "video") return "🎥 Video";
  if (type === "audio") return "🎙️ Audio";
  return filename ? `📎 ${filename}` : "📎 Attachment";
}

function ActionPillButton({
  title,
  label,
  icon,
  onClick,
  disabled = false,
  loading = false,
}) {
  return (
    <Tooltip title={title}>
      <span>
        <Button
          size="small"
          onClick={onClick}
          disabled={disabled}
          startIcon={
            loading ? (
              <CircularProgress size={15} sx={{ color: "#22c55e" }} />
            ) : (
              icon
            )
          }
          sx={{
            textTransform: "none",
            borderRadius: 99,
            px: 1.25,
            py: 0.55,
            minWidth: 0,
            color: LIGHT.subtext,
            fontSize: 12,
            fontWeight: 600,
            bgcolor: "transparent",
            border: `1px solid ${LIGHT.border}`,
            "&:hover": {
              color: LIGHT.text,
              bgcolor: "rgba(0,0,0,0.04)",
              borderColor: "#cfd8e3",
            },
            "&.Mui-disabled": {
              color: "#9aa6b2",
              borderColor: "#e5e7eb",
            },
          }}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
}

const StableAutocompletePaper = React.forwardRef(function StableAutocompletePaper(props, ref) {
  return (
    <Paper
      {...props}
      ref={ref}
      sx={{
        bgcolor: LIGHT.inputBg,
        borderRadius: 2,
        border: `1px solid ${LIGHT.border}`,
        color: LIGHT.text,
        ...(props?.sx || {}),
      }}
    />
  );
});

export default function WhatsAppUI() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [input, setInput] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [chatTab, setChatTab] = useState("all"); // all | unread | favourite
  const [chatError, setChatError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const showToast = useCallback((message, severity = "success") => setToast({ open: true, message, severity }), []);
  const hideToast = useCallback(() => setToast((t) => ({ ...t, open: false })), []);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatLeadChoice, setNewChatLeadChoice] = useState(null);
  const [newChatLeadOptions, setNewChatLeadOptions] = useState([]);
  const [newChatLeadLoading, setNewChatLeadLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [newChatError, setNewChatError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [tplVars, setTplVars] = useState({});
  const [socketStatus, setSocketStatus] = useState("disconnected");
  const bottomRef = useRef(null);
  const prevLenRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const chatScrollRef = useRef(null);
  const openedCutoffRef = useRef(0);
  const socketRef = useRef(null);
  const joinedRoomsRef = useRef(new Set());
  const pendingReadRef = useRef(new Map());
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [oldestCursor, setOldestCursor] = useState("");
  const [favoritePhones, setFavoritePhones] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [quickAnchor, setQuickAnchor] = useState(null);
  const [tplAnchor, setTplAnchor] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const fileRef = useRef(null);
  const bootstrapChatRef = useRef(null);
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
  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const notifAudioRef = useRef(null);
  const notifAudioUnlockedRef = useRef(false);
  const notifAudioCtxRef = useRef(null);
  const lastNotifKeyRef = useRef("");

  useEffect(() => { const id = setInterval(() => setNowTick(Date.now()), 1000); return () => clearInterval(id); }, []);

  const playFallbackBeep = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!notifAudioCtxRef.current) {
        notifAudioCtxRef.current = new AC();
      }
      const ctx = notifAudioCtxRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, []);

  const prepareNotifAudio = useCallback(() => {
    if (notifAudioRef.current) return notifAudioRef.current;
    try {
      const a = new Audio(NOTIF_SOUND_URL);
      a.preload = "auto";
      a.volume = 0.9;
      notifAudioRef.current = a;
      return a;
    } catch {
      return null;
    }
  }, []);

  const unlockNotifAudio = useCallback(async () => {
    if (notifAudioUnlockedRef.current) return;
    const a = prepareNotifAudio();
    try {
      if (a) {
        const prevVol = a.volume;
        a.volume = 0;
        await a.play();
        a.pause();
        a.currentTime = 0;
        a.volume = prevVol;
      }
      if (typeof window !== "undefined") {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC && !notifAudioCtxRef.current) notifAudioCtxRef.current = new AC();
        if (notifAudioCtxRef.current?.state === "suspended") {
          await notifAudioCtxRef.current.resume();
        }
      }
      notifAudioUnlockedRef.current = true;
    } catch {}
  }, [prepareNotifAudio]);

  const playNotif = useCallback(async (key = "") => {
    if (key && lastNotifKeyRef.current === key) return;
    lastNotifKeyRef.current = key || "";
    const a = prepareNotifAudio();
    if (!a || !notifAudioUnlockedRef.current) {
      await playFallbackBeep();
      return;
    }
    try {
      a.pause();
      a.currentTime = 0;
      await a.play();
    } catch {
      await playFallbackBeep();
    }
  }, [prepareNotifAudio, playFallbackBeep]);

  useEffect(() => {
    const onInteract = () => { unlockNotifAudio(); };
    document.addEventListener("pointerdown", onInteract, { passive: true });
    document.addEventListener("keydown", onInteract, { passive: true });
    document.addEventListener("touchstart", onInteract, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onInteract);
      document.removeEventListener("keydown", onInteract);
      document.removeEventListener("touchstart", onInteract);
    };
  }, [unlockNotifAudio]);

  const activeDigits = useMemo(() => digitsOnly(activeChat?.phone), [activeChat?.phone]);
  const activeP10 = useMemo(() => phone10(activeChat?.phone), [activeChat?.phone]);
  const activeP10Ref = useRef("");
  useEffect(() => { activeP10Ref.current = activeP10 || ""; }, [activeP10]);

  const sessionUser = useMemo(() => {
    try { const raw = sessionStorage.getItem("user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }, []);
  const favoritesStorageKey = useMemo(
    () => `wa:favorites:${String(sessionUser?._id || sessionUser?.id || sessionUser?.email || "anon")}`,
    [sessionUser?._id, sessionUser?.id, sessionUser?.email]
  );
  const sessionRoleNorm = useMemo(
    () => String(sessionUser?.role || "").trim().toLowerCase(),
    [sessionUser?.role]
  );
  const hasTeamRole = Boolean(sessionUser?.hasTeam);
  const isAssistantTeamLeadEffective = useMemo(
    () =>
      sessionRoleNorm === "assistant team lead" ||
      (sessionRoleNorm === "retention agent" && hasTeamRole),
    [sessionRoleNorm, hasTeamRole]
  );
  const canFilterByAgent = useMemo(
    () =>
      sessionRoleNorm === "manager" ||
      sessionRoleNorm === "team leader" ||
      sessionRoleNorm === "team-leader" ||
      isAssistantTeamLeadEffective,
    [sessionRoleNorm, isAssistantTeamLeadEffective]
  );

  const navigate = useNavigate();
  const location = useLocation();
  const urlPhone = useMemo(() => { const p = new URLSearchParams(location.search).get("phone") || ""; return digitsOnly(p); }, [location.search]);
  const lastUrlOpenedRef = useRef("");
  const agentName = useMemo(() => sessionUser?.fullName || "", [sessionUser?.fullName]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(favoritesStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setFavoritePhones(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setFavoritePhones({});
    }
  }, [favoritesStorageKey]);

  const persistFavorites = useCallback(
    (next) => {
      setFavoritePhones(next);
      try {
        localStorage.setItem(favoritesStorageKey, JSON.stringify(next || {}));
      } catch {}
    },
    [favoritesStorageKey]
  );

  const isFavourite = useCallback(
    (phoneAny = "") => Boolean(favoritePhones[phone10(phoneAny)]),
    [favoritePhones]
  );

  const toggleFavourite = useCallback(
    (phoneAny = "") => {
      const p10 = phone10(phoneAny);
      if (!p10) return;
      const next = { ...favoritePhones };
      if (next[p10]) delete next[p10];
      else next[p10] = true;
      persistFavorites(next);
    },
    [favoritePhones, persistFavorites]
  );

  const activeConversation = useMemo(() => {
    if (!activeP10) return null;
    return conversations.find((c) => phone10(c.phone) === activeP10) || null;
  }, [activeP10, conversations]);
  const activeIsFavourite = useMemo(
    () => Boolean(activeP10 && isFavourite(activeP10)),
    [activeP10, isFavourite]
  );

  const sessionInfo = useMemo(() => {
    const exp = activeConversation?.windowExpiresAt ? new Date(activeConversation.windowExpiresAt).getTime() : 0;
    if (!exp) return { has: false, expired: false, msLeft: 0, label: "—" };
    const msLeft = exp - nowTick;
    const expired = msLeft <= 0;
    const s = Math.max(0, Math.floor(msLeft / 1000));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return { has: true, expired, msLeft, label: expired ? "Chat window expired" : `${hh}:${mm}:${ss}` };
  }, [activeConversation?.windowExpiresAt, nowTick]);

  useEffect(() => { if (!activeChat?.phone || !sessionInfo.has) return; setSessionExpired(sessionInfo.expired); }, [activeChat?.phone, sessionInfo.has, sessionInfo.expired]);

  const activeHeaderTitle = useMemo(() => {
    if (!activeP10) return "";
    const name = activeConversation ? chatDisplayName(activeConversation) : activeP10;
    if (!name || name === activeP10) return activeP10 || "—";
    return name;
  }, [activeP10, activeConversation]);

  const attachmentPreviewMsg = useMemo(() => {
    if (!pendingAttachment) return null;
    return {
      type: pendingAttachment.type,
      media: {
        url: pendingAttachment.previewUrl || "",
        mime: pendingAttachment.mime || "",
        filename: pendingAttachment.filename || "attachment",
      },
    };
  }, [pendingAttachment]);

  const setDraftFor = useCallback((p10, value) => { if (!p10) return; setDrafts((prev) => ({ ...prev, [p10]: String(value ?? "") })); }, []);
  const clearDraftFor = useCallback((p10) => {
    if (!p10) return;
    setDrafts((prev) => { if (!prev[p10]) return prev; const next = { ...prev }; delete next[p10]; return next; });
  }, []);

  const QUICK_REPLIES = useMemo(() => [
    "Hi! How are you doing today?", "Just checking in for your follow-up 😊",
    "Can I call you in 10 minutes?", "Please share your latest reports if available.",
    "Thank you! I'm here if you need anything.",
  ], []);

  const EMOJIS = useMemo(() => ["😊", "😂", "🙏", "👍", "❤️", "🔥", "😄", "😅", "😇", "🤝", "😎", "🥳", "😢", "😡", "✅", "✨"], []);

  const baseScopedConversations = useMemo(
    () =>
      (conversations || []).filter((c) => {
      if (!canFilterByAgent || agentFilter === "all") return true;
      return String(c?.assignedToLabel || "").trim().toLowerCase() === agentFilter;
      }),
    [conversations, canFilterByAgent, agentFilter]
  );

  const tabScopedConversations = useMemo(() => {
    if (chatTab === "unread") {
      return baseScopedConversations.filter((c) => Number(c?.unreadCount || 0) > 0);
    }
    if (chatTab === "favourite") {
      return baseScopedConversations.filter((c) => isFavourite(c?.phone));
    }
    return baseScopedConversations;
  }, [baseScopedConversations, chatTab, isFavourite]);

  const chatTabCounts = useMemo(
    () => ({
      all: baseScopedConversations.length,
      unread: baseScopedConversations.filter((c) => Number(c?.unreadCount || 0) > 0).length,
      favourite: baseScopedConversations.filter((c) => isFavourite(c?.phone)).length,
    }),
    [baseScopedConversations, isFavourite]
  );

  const filteredConversations = useMemo(() => {
    const raw = String(search || "").trim();
    if (!raw) return tabScopedConversations;
    const q = raw.toLowerCase();
    const typedDigits = digitsOnly(raw);
    const p10Query = phone10(typedDigits);
    const tokens = q.split(/\s+/).filter(Boolean);
    return tabScopedConversations.filter((c) => {
      const phoneDigits = digitsOnly(c?.phone || "");
      const phoneP10 = phone10(c?.phone || "");
      const nameHaystack = [c?.displayName, c?.assignedToLabel, c?.lastMessageText].filter(Boolean).join(" ").toLowerCase();
      const matchesName = tokens.length > 0 && tokens.every((t) => nameHaystack.includes(t));
      const matchesPhone = typedDigits ? phoneDigits.includes(typedDigits) || (p10Query && phoneP10.includes(p10Query)) : false;
      return matchesName || matchesPhone;
    });
  }, [tabScopedConversations, search]);

  const agentFilterOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        (conversations || [])
          .map((c) => String(c?.assignedToLabel || "").trim())
          .filter(Boolean)
      )
    );
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [conversations]);

  useEffect(() => {
    if (!canFilterByAgent && agentFilter !== "all") {
      setAgentFilter("all");
    }
  }, [canFilterByAgent, agentFilter]);

  const canShowQuickChat = useMemo(() => phone10(search).length === 10, [search]);

  const sortedConversations = useMemo(() => {
    const list = filteredConversations.slice();
    list.sort((a, b) => {
      return new Date(b?.lastMessageAt || 0) - new Date(a?.lastMessageAt || 0);
    });
    return list;
  }, [filteredConversations]);

  const totalUnreadCount = useMemo(
    () => (conversations || []).reduce((sum, c) => sum + Number(c?.unreadCount || 0), 0),
    [conversations]
  );

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
    const lastText = url ? (kind === "image" ? "📷 Photo" : kind === "video" ? "🎥 Video" : kind === "audio" ? "🎙️ Audio" : "📎 Attachment") : String(msg?.text || "").slice(0, 200);

    setConversations((prev) => {
      const idx = prev.findIndex((c) => phone10(c.phone) === p10);
      const pending = pendingReadRef.current.get(p10);
      const forceRead = pending && Date.now() - pending.at < 30000;
      if (idx === -1) {
        return [{ phone: customerPhone, displayName: "", assignedToLabel: "", lastMessageAt: nowIso, lastMessageText: lastText, unreadCount: isInbound && !isActive && !forceRead ? 1 : 0, lastReadAt: isActive || forceRead ? (pending?.iso || nowIso) : null }, ...prev];
      }
      const next = [...prev];
      const existing = next[idx];
      const newUnread = forceRead ? 0 : isInbound ? isActive ? 0 : Number(existing?.unreadCount || 0) + 1 : Number(existing?.unreadCount || 0);
      next[idx] = { ...existing, phone: existing?.phone || customerPhone, lastMessageAt: nowIso, lastMessageText: lastText || existing?.lastMessageText || "", unreadCount: newUnread, lastReadAt: isActive || forceRead ? (pending?.iso || nowIso) : existing?.lastReadAt };
      const [item] = next.splice(idx, 1);
      return [item, ...next];
    });
  }, []);

  const refreshConversations = useCallback(async (selectPhone = null, { silent = false } = {}) => {
    if (!silent) setLoadingChats(true);

    try {
      const userName = sessionUser?.fullName || "";
      const userRole = sessionUser?.role || "";
      const userId = sessionUser?._id || sessionUser?.id || "";
      const normalizedRole = String(userRole || "").trim().toLowerCase();
      const effectiveHasTeam =
        Boolean(sessionUser?.hasTeam) ||
        normalizedRole === "team leader" ||
        normalizedRole === "team-leader" ||
        normalizedRole === "assistant team lead" ||
        (normalizedRole === "retention agent" &&
          Boolean(sessionUser?.hasTeam));
      const data =
        (await api(
          `/api/whatsapp/conversations?${new URLSearchParams({
            role: userRole,
            userName,
            userId,
            hasTeam: effectiveHasTeam ? "true" : "false",
          })}`
        )) || [];

      const serverList = Array.isArray(data) ? data : [];
      const now = Date.now();

      const list = serverList.map((c) => {
        const p10 = phone10(c.phone);
        const pending = pendingReadRef.current.get(p10);
        if (pending && now - pending.at < 30000) {
          return { ...c, unreadCount: 0, lastReadAt: pending.iso || c.lastReadAt };
        }
        return c;
      });

      setConversations(list);

      if (selectPhone) {
        setActiveChat({ phone: digitsOnly(selectPhone) });
      }
    } catch (e) {
      if (!silent) {
        showToast(e.message || "Failed to load conversations", "error");
      }
    } finally {
      if (!silent) setLoadingChats(false);
    }
  }, [sessionUser?._id, sessionUser?.id, sessionUser?.fullName, sessionUser?.role, sessionUser?.hasTeam, showToast]);

  const mergeUniqueMessages = useCallback((seed = [], server = []) => {
    const source = [...(Array.isArray(seed) ? seed : []), ...(Array.isArray(server) ? server : [])];
    const list = [];

    for (const item of source) {
      const idx = list.findIndex((m) => isLikelySameMessage(m, item));
      if (idx === -1) {
        list.push(item);
        continue;
      }

      const prev = list[idx];
      const prevIsTemp = String(prev?._id || "").startsWith("tmp_");
      const nextIsTemp = String(item?._id || "").startsWith("tmp_");
      const prevRank = statusRank(prev?.status);
      const nextRank = statusRank(item?.status);

      if (prevIsTemp && !nextIsTemp) {
        list[idx] = mergeServerMessageWithOptimistic(item, prev);
        continue;
      }
      if (!prevIsTemp && nextIsTemp) {
        continue;
      }
      if (nextRank >= prevRank) {
        list[idx] = { ...prev, ...item };
      }
    }

    const byIdentity = new Map();
    for (const item of list) {
      const k = messageIdentity(item);
      if (!byIdentity.has(k)) {
        byIdentity.set(k, item);
        continue;
      }
      const prev = byIdentity.get(k);
      if (statusRank(item?.status) >= statusRank(prev?.status)) {
        byIdentity.set(k, { ...prev, ...item });
      }
    }
    const next = Array.from(byIdentity.values());
    next.sort((a, b) => {
      const aTs = new Date(a?.timestamp || a?.createdAt || 0).getTime();
      const bTs = new Date(b?.timestamp || b?.createdAt || 0).getTime();
      return aTs - bTs;
    });

    return next;
  }, []);

  const fetchMessagesPage = useCallback(async (phoneAnyDigits, { before = "", limit = MESSAGE_PAGE_SIZE } = {}) => {
    const q = digitsOnly(phoneAnyDigits);
    if (!q) return [];
    const params = new URLSearchParams({
      phone: q,
      limit: String(limit || MESSAGE_PAGE_SIZE),
    });
    if (before) params.set("before", String(before));
    const data = (await api(`/api/whatsapp/messages?${params.toString()}`)) || [];
    return Array.isArray(data) ? data : [];
  }, []);

  const loadMessagesInitial = useCallback(async (phoneAnyDigits, options = {}) => {
    const q = digitsOnly(phoneAnyDigits);
    const seedMessages = Array.isArray(options?.seedMessages)
      ? options.seedMessages
      : [];

    if (!q) return;
    setChatError("");
    setLoadingMessages(true);

    try {
      const serverMessages = await fetchMessagesPage(q, { limit: MESSAGE_PAGE_SIZE });
      const merged = mergeUniqueMessages(seedMessages, serverMessages);
      setMessages(merged);
      const oldest = merged[0]?.timestamp || merged[0]?.createdAt || "";
      setOldestCursor(oldest ? String(oldest) : "");
      setHasMoreOlder(serverMessages.length >= MESSAGE_PAGE_SIZE);
    } catch (e) {
      setChatError(e.message || "Failed to load messages");
      const merged = seedMessages.length ? mergeUniqueMessages(seedMessages, []) : [];
      setMessages(merged);
      const oldest = merged[0]?.timestamp || merged[0]?.createdAt || "";
      setOldestCursor(oldest ? String(oldest) : "");
      setHasMoreOlder(false);
    } finally {
      setLoadingMessages(false);
    }
  }, [mergeUniqueMessages, fetchMessagesPage]);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const data = await api(`/api/whatsapp/templates`);
      setTemplates(Array.isArray(data) ? data : data?.templates || []);
    } catch { setTemplates([]); }
    finally { setLoadingTemplates(false); }
  }, []);

  const approvedUtilityTemplates = useMemo(() => (Array.isArray(templates) ? templates : []).filter((t) => isUtilityTemplate(t) && isApprovedTemplate(t)), [templates]);

  const filteredApprovedUtilityTemplates = useMemo(() => {
    const q = tplMenuSearch.trim().toLowerCase();
    if (!q) return approvedUtilityTemplates;
    return approvedUtilityTemplates.filter((t) => [t?.name, t?.language, t?.status, pickBodyTextFromTemplate(t)].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [approvedUtilityTemplates, tplMenuSearch]);

  const markConversationRead = useCallback(async (phoneDigits, { optimisticOnly = false } = {}) => {
    const phone = digitsOnly(phoneDigits);
    const p10 = phone10(phoneDigits);
    if (!p10) return;
    const nowIso = new Date().toISOString();
    pendingReadRef.current.set(p10, { at: Date.now(), iso: nowIso });
    setConversations((prev) => prev.map((c) => (phone10(c.phone) === p10 ? { ...c, unreadCount: 0, lastReadAt: nowIso } : c)));
    if (optimisticOnly) return;
    try { await api(`/api/whatsapp/conversations/mark-read`, { method: "POST", body: JSON.stringify({ phone }) }); } catch {}
  }, []);

  useEffect(() => { refreshConversations(null, { silent: false }); fetchTemplates(); }, [refreshConversations, fetchTemplates]);

  // Fallback polling for left chat list so it stays fresh even if socket transport is unstable.
  useEffect(() => {
    const id = setInterval(() => {
      refreshConversations(null, { silent: true });
    }, 8000);
    return () => clearInterval(id);
  }, [refreshConversations]);

  useEffect(() => {
    const s = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });

    socketRef.current = s;

    const onConnect = () => {
      setSocketStatus("connected");
      refreshConversations(null, { silent: true });
    };

    const onDisconnect = () => {
      setSocketStatus("disconnected");
      joinedRoomsRef.current.clear();
    };

    const onError = () => {
      setSocketStatus("error");
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onError);

    return () => {
      try {
        for (const room of Array.from(joinedRoomsRef.current)) {
          const p10 = room.replace(/^wa:/, "");
          s.emit("wa:leave", { phone10: p10 });
        }
        joinedRoomsRef.current.clear();

        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
        s.off("connect_error", onError);
        s.disconnect();
      } catch {}

      socketRef.current = null;
    };
  }, [refreshConversations]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s?.connected) return;

    const desired = new Set(
      (conversations || []).map((c) => phone10(c?.phone)).filter(Boolean)
    );
    if (activeP10) desired.add(activeP10);

    for (const p10 of desired) {
      const room = roomForPhone10(p10);
      if (!joinedRoomsRef.current.has(room)) {
        s.emit("wa:join", { phone10: p10 });
        joinedRoomsRef.current.add(room);
      }
    }

    for (const room of Array.from(joinedRoomsRef.current)) {
      const p10 = room.replace(/^wa:/, "");
      if (!desired.has(p10)) {
        s.emit("wa:leave", { phone10: p10 });
        joinedRoomsRef.current.delete(room);
      }
    }
  }, [activeP10, conversations, socketStatus]);

  useEffect(() => {
    const s = socketRef.current; if (!s) return;
    const unwrapMessage = (payload) => payload?.message || payload?.msg || payload;
    const resolveP10FromPayload = (payload, msg) => { const p10FromPayload = phone10(payload?.phone10 || payload?.phone || ""); if (p10FromPayload) return p10FromPayload; return phone10(customerPhoneFromMsg(msg)); };

    const onMessage = (payload) => {
      const msg = unwrapMessage(payload); if (!msg) return;
      const p10 = resolveP10FromPayload(payload, msg); if (!p10) return;
      const customerPhone = customerPhoneFromMsg(msg);
      const normalizedMsg = { ...msg, phone: customerPhone || p10 };
      if (String(normalizedMsg?.direction || "").toUpperCase() === "INBOUND") {
        const activeNow = activeP10Ref.current;
        if (!activeNow || activeNow !== p10) {
          playNotif(String(normalizedMsg?.waId || normalizedMsg?._id || `${p10}-${normalizedMsg?.timestamp || Date.now()}`));
        }
      }
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
            if (tempIndex !== -1) { const next = [...prev]; next[tempIndex] = mergeServerMessageWithOptimistic(normalizedMsg, next[tempIndex]); return next; }
          }
          if (normalizedMsg?.waId && prev.some((m) => String(m?.waId || "") === String(normalizedMsg.waId))) return prev;
          const k = msgKey(normalizedMsg);
          if (prev.some((m) => msgKey(m) === k)) return prev;
          return [...prev, normalizedMsg];
        });
        if (String(normalizedMsg?.direction || "").toUpperCase() === "INBOUND") {
          setSessionExpired(false); setChatError("");
        }
      }
    };

    const onStatus = (payload) => {
      const liveIds = [
        payload?.waId,
        payload?.id,
        payload?.messageId,
        payload?.message_id,
        payload?.providerTransactionId,
        payload?.transactionId,
        payload?.transaction_id,
      ].map((x) => String(x || "").trim()).filter(Boolean);
      const status = normalizeStatus(payload?.status);
      const p10 = phone10(payload?.phone10 || payload?.phone || "");

      if (!liveIds.length || !status) return;

      const activeNow = activeP10Ref.current;
      if (p10 && activeNow && p10 !== activeNow) return;

      setMessages((prev) =>
        prev.map((m) => {
          const messageWaId = String(m?.waId || "").trim();
          const providerTxnId = String(m?.providerTransactionId || "").trim();

          if (liveIds.includes(messageWaId) || liveIds.includes(providerTxnId)) {
            if (status !== "failed" && statusRank(m?.status) > statusRank(status)) return m;
            return { ...m, status };
          }

          return m;
        })
      );
    };

    const onConversation = (payload) => {
      const p10 = phone10(payload?.phone10 || payload?.phone || ""); if (!p10) return;
      const patch = payload?.patch ? payload.patch : payload; if (!patch) return;
      setConversations((prev) => prev.map((c) => {
        if (phone10(c.phone) !== p10) return c;
        const delta = Number(patch?.unreadCountDelta || 0);
        const hasAbsolute = typeof patch?.unreadCount === "number";
        const nextUnread = hasAbsolute ? patch.unreadCount : Math.max(0, Number(c.unreadCount || 0) + delta);
        const cleanedPatch = { ...patch }; delete cleanedPatch.unreadCountDelta;
        return { ...c, ...cleanedPatch, unreadCount: nextUnread };
      }));
      const activeNow = activeP10Ref.current;
      if (activeNow && p10 === activeNow && (patch?.lastInboundAt || patch?.windowExpiresAt)) { setSessionExpired(false); setChatError(""); }
    };

    s.on("wa:message", onMessage); s.on("wa:status", onStatus); s.on("wa:conversation", onConversation);
    return () => { s.off("wa:message", onMessage); s.off("wa:status", onStatus); s.off("wa:conversation", onConversation); };
  }, [markConversationRead, upsertConversationFromMessage, playNotif]);

  useEffect(() => { if (activeP10) setInput(drafts[activeP10] || ""); else setInput(""); }, [activeP10, drafts]);

  useEffect(() => {
    if (!activeDigits) return;

    const pendingBootstrap = bootstrapChatRef.current;
    const seedMessages =
      pendingBootstrap?.phone10 === phone10(activeDigits)
        ? pendingBootstrap.messages || []
        : [];

    setSessionExpired(false);
    setChatError("");
    setHasMoreOlder(false);
    setOldestCursor("");
    setLoadingOlder(false);

    if (!seedMessages.length) {
      setMessages([]);
    }

    openedCutoffRef.current = Date.now();

    loadMessagesInitial(activeDigits, { seedMessages }).finally(() => {
      if (pendingBootstrap?.phone10 === phone10(activeDigits)) {
        bootstrapChatRef.current = null;
      }
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 40);
    });
  }, [activeDigits, loadMessagesInitial]);

  useEffect(() => {
    if (!activeDigits) return undefined;
    const id = setInterval(async () => {
      try {
        const serverMessages = await fetchMessagesPage(activeDigits, { limit: MESSAGE_PAGE_SIZE });
        setMessages((prev) => mergeUniqueMessages(prev, serverMessages));
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [activeDigits, mergeUniqueMessages, fetchMessagesPage]);

  useEffect(() => {
    if (messages.length > prevLenRef.current && isNearBottomRef.current) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  const loadOlderMessages = useCallback(async () => {
    if (!activeDigits || !oldestCursor || !hasMoreOlder || loadingOlder) return;
    const el = chatScrollRef.current;
    if (!el) return;
    setLoadingOlder(true);
    const previousHeight = el.scrollHeight;
    const previousTop = el.scrollTop;
    try {
      const older = await fetchMessagesPage(activeDigits, {
        before: oldestCursor,
        limit: MESSAGE_PAGE_SIZE,
      });
      if (!older.length) {
        setHasMoreOlder(false);
        return;
      }
      setMessages((prev) => mergeUniqueMessages(older, prev));
      const oldest = older[0]?.timestamp || older[0]?.createdAt || "";
      if (oldest) setOldestCursor(String(oldest));
      if (older.length < MESSAGE_PAGE_SIZE) setHasMoreOlder(false);
      requestAnimationFrame(() => {
        const nowHeight = el.scrollHeight;
        el.scrollTop = previousTop + (nowHeight - previousHeight);
      });
    } catch {
      // keep previous state on failure
    } finally {
      setLoadingOlder(false);
    }
  }, [activeDigits, oldestCursor, hasMoreOlder, loadingOlder, fetchMessagesPage, mergeUniqueMessages]);

  const onChatScroll = (e) => {
    const el = e.currentTarget;
    chatScrollRef.current = el;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop <= 24) {
      loadOlderMessages();
    }
  };

  const openChat = useCallback((phone, options = {}) => {
    const p = digitsOnly(phone);
    if (!p) return;

    const nextSearch = `?phone=${encodeURIComponent(p)}`;
    if (location.search !== nextSearch) {
      navigate(`/whatsaap/chat${nextSearch}`, { replace: true });
    }

    const bootstrapMessages = Array.isArray(options?.bootstrapMessages)
      ? options.bootstrapMessages
      : [];

    if (bootstrapMessages.length) {
      bootstrapChatRef.current = {
        phone10: phone10(p),
        messages: bootstrapMessages,
      };
      setMessages(bootstrapMessages);
    } else {
      bootstrapChatRef.current = null;
    }

    openedCutoffRef.current = Date.now();
    isNearBottomRef.current = true;
    setActiveChat({ phone: p });
    setSearch("");
    markConversationRead(p, { optimisticOnly: false });
  }, [location.search, markConversationRead, navigate]);

  useEffect(() => {
    const p = digitsOnly(urlPhone); if (!p || lastUrlOpenedRef.current === p) return;
    lastUrlOpenedRef.current = p; openChat(p);
  }, [openChat, urlPhone]);

  const updateConversationPreviewLocal = useCallback((phoneDigits, lastMessageText) => {
    const nowIso = new Date().toISOString();
    const p10 = phone10(phoneDigits);
    setConversations((prev) => {
      const idx = prev.findIndex((c) => phone10(c.phone) === p10);
      if (idx === -1) return [{ phone: phoneDigits, lastMessageAt: nowIso, lastMessageText: lastMessageText?.slice?.(0, 200) || "", unreadCount: 0 }, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], lastMessageAt: nowIso, lastMessageText: lastMessageText?.slice?.(0, 200) || next[idx].lastMessageText || "" };
      const [item] = next.splice(idx, 1); return [item, ...next];
    });
  }, []);

  const sendText = async () => {
    const to = normalizeToWa(activeChat?.phone);
    const text = input.trim();
    if (!to || !text) return;
    if (templateOnlyMode) {
      setChatError("Only templates allowed. Chat window expired.");
      return;
    }
    const p10 = phone10(to);
    const optimistic = { _id: buildTempId("tmp_text"), direction: "OUTBOUND", type: "text", text, timestamp: new Date().toISOString(), status: "sent", to, phone: to };
    setMessages((prev) => [...prev, optimistic]);
    setInput(""); clearDraftFor(p10); updateConversationPreviewLocal(to, text);
    try { await api(`/api/whatsapp/send-text`, { method: "POST", body: JSON.stringify({ to, text }) }); }
    catch (e) {
      setMessages((prev) => removeMessageById(prev, optimistic._id));
      setInput(text); setDraftFor(p10, text);
      if (e.data?.code === "SESSION_EXPIRED") { setSessionExpired(true); setChatError("Only templates allowed. Chat window expired."); }
      else showToast(e.message || "Send failed", "error");
    }
  };

  const closeAttachmentPreview = useCallback(() => {
    setAttachmentPreviewOpen(false);
    setPendingAttachment((prev) => {
      if (prev?.previewUrl && String(prev.previewUrl).startsWith("blob:")) {
        try {
          URL.revokeObjectURL(prev.previewUrl);
        } catch {}
      }
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const onPickFile = async (file) => {
    if (!file || !activeChat?.phone) return;
    if (templateOnlyMode) {
      setChatError("Only templates allowed. Chat window expired.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) { showToast("Max attachment size is 15MB.", "error"); return; }

    const mime = file.type || "application/octet-stream";
    const type = mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/")
      ? "audio"
      : "document";

    const previewUrl = URL.createObjectURL(file);

    setPendingAttachment({
      file,
      mime,
      filename: file.name,
      type,
      previewUrl,
      caption: "",
    });
    setAttachmentPreviewOpen(true);
  };

  const sendPendingAttachment = async () => {
    if (!pendingAttachment?.file || !activeChat?.phone) return;
    if (templateOnlyMode) {
      setChatError("Only templates allowed. Chat window expired.");
      return;
    }

    const to = normalizeToWa(activeChat.phone);
    const { file, mime, filename, type, caption = "" } = pendingAttachment;
    const optimisticPreviewUrl = URL.createObjectURL(file);

    const optimistic = {
      _id: buildTempId("tmp_file"),
      direction: "OUTBOUND",
      text: caption.trim(),
      type,
      timestamp: new Date().toISOString(),
      status: "sent",
      to,
      phone: to,
      media: {
        url: optimisticPreviewUrl,
        mime,
        filename,
      },
    };

    setMessages((prev) => [...prev, optimistic]);
    updateConversationPreviewLocal(
      to,
      caption.trim() || buildLocalPreviewText(type, filename)
    );

    setAttachmentPreviewOpen(false);
    setPendingAttachment((prev) => {
      if (prev?.previewUrl && String(prev.previewUrl).startsWith("blob:")) {
        try {
          URL.revokeObjectURL(prev.previewUrl);
        } catch {}
      }
      return null;
    });

    setFileUploading(true);
    try {
      const fd = new FormData();
      fd.append("to", to);
      fd.append("file", file);
      if (caption.trim()) fd.append("caption", caption.trim());
      await apiForm(`/api/whatsapp/send-media`, fd);
    } catch (e) {
      setMessages((prev) => prev.map((m) => m._id === optimistic._id ? { ...m, status: "failed" } : m));
      if (e?.data?.code === "SESSION_EXPIRED") { setSessionExpired(true); setChatError("Only templates allowed. Chat window expired."); }
      showToast(extractApiErrorMessage(e, "Failed to send attachment."), "error");
    } finally {
      setFileUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const insertEmoji = (emo) => { setInput((t) => { const next = `${t}${emo}`; if (activeP10) setDraftFor(activeP10, next); return next; }); };

  async function uploadTemplateHeaderMedia(file) { const fd = new FormData(); fd.append("file", file); return apiForm(`/api/whatsapp/upload-template-media`, fd); }

  const openTemplateComposer = (tpl) => {
    if (!tpl) return;
    if (!isApprovedTemplate(tpl)) { showToast("This template is not APPROVED yet.", "error"); return; }
    const body = pickBodyTextFromTemplate(tpl);
    const idxs = extractVarIndexes(body);
    const initial = {};
    idxs.forEach((i) => (initial[String(i)] = ""));
    setActiveTplForSend(tpl); setTplSendVars(initial); setTplSending(false);
    const fmt = getHeaderMediaFormat(tpl);
    setTplHeaderFormat(fmt); setTplHeaderFile(null); setTplComposeOpen(true);
  };

  const tplSendPreview = useMemo(() => applyVarsToBody(pickBodyTextFromTemplate(activeTplForSend), tplSendVars), [activeTplForSend, tplSendVars]);

  const sendTemplateFromChat = async () => {
    if (!activeTplForSend) return;
    const to = normalizeToWa(activeChat?.phone); if (!to) return;
    const body = pickBodyTextFromTemplate(activeTplForSend);
    const idxs = extractVarIndexes(body);
    const params = idxs.map((i) => String(tplSendVars[String(i)] || "").trim());
    if (params.some((v) => !v)) { showToast("Fill all template variables.", "error"); return; }
    let headerMedia = null, optimisticMedia = null;
    if (tplHeaderFormat) {
      if (!tplHeaderFile) { showToast("This template requires a header attachment.", "error"); return; }
      if (tplHeaderFile.size > 15 * 1024 * 1024) { showToast("Max attachment size is 15MB.", "error"); return; }
      setTplSending(true);
      try {
        const up = await uploadTemplateHeaderMedia(tplHeaderFile);
        const mediaId = up?.mediaId || up?.id;
        if (!mediaId) { showToast("Upload failed: no mediaId returned.", "error"); setTplSending(false); return; }
        headerMedia = { format: tplHeaderFormat, id: mediaId, filename: tplHeaderFile.name };
        if (tplHeaderFile.type?.startsWith("image/") || tplHeaderFile.type?.startsWith("video/") || tplHeaderFile.type?.startsWith("audio/"))
          optimisticMedia = { url: URL.createObjectURL(tplHeaderFile), mime: tplHeaderFile.type, filename: tplHeaderFile.name };
      } catch (e) { showToast(e.message || "Failed to upload.", "error"); setTplSending(false); return; }
    } else { setTplSending(true); }

    const optimistic = { _id: buildTempId("tmp_tpl"), direction: "OUTBOUND", type: "template", text: tplSendPreview || `[TEMPLATE] ${activeTplForSend.name}`, timestamp: new Date().toISOString(), status: "sent", to, phone: to, ...(optimisticMedia ? { media: optimisticMedia } : {}), templateMeta: { name: activeTplForSend.name, language: activeTplForSend.language || "", parameters: params } };
    setMessages((prev) => [...prev, optimistic]);
    updateConversationPreviewLocal(to, optimistic.text);
    try {
      await api(`/api/whatsapp/send-template`, { method: "POST", body: JSON.stringify({ to, templateName: activeTplForSend.name, templateId: activeTplForSend.template_id || activeTplForSend.templateId || activeTplForSend.providerTemplateId || "", parameters: params, renderedText: tplSendPreview || "", headerMedia }) });
      setTplComposeOpen(false); setActiveTplForSend(null); setTplSendVars({}); setTplHeaderFormat(""); setTplHeaderFile(null);
      showToast("Template sent ✓", "success");
    } catch (e) {
      setMessages((prev) => prev.map((m) => m._id === optimistic._id ? { ...m, status: "failed" } : m));
      showToast(extractApiErrorMessage(e, "Failed to send template."), "error");
    } finally { setTplSending(false); }
  };

  const helpMeWrite = async () => {
    if (!activeP10 || sessionExpired) return;
    setHelpWriteLoading(true);
    try {
      const lastInbound = [...(messages || [])].reverse().find((m) => String(m.direction || "").toUpperCase() !== "OUTBOUND");
      const goal = lastInbound?.text ? `Reply to: "${String(lastInbound.text).slice(0, 220)}"` : "Write a helpful next message.";
      const r = await api(`/api/whatsapp/help-me-write`, { method: "POST", body: JSON.stringify({ phone: activeP10, leadName: activeConversation?.displayName || "", agentName: agentName || "", goal, tone: "friendly, professional, concise, Hinglish allowed", maxMessages: 35 }) });
      const suggestion = String(r?.suggestion || "").trim();
      if (!suggestion) { showToast("AI did not return a message.", "warning"); return; }
      setInput(suggestion); setDraftFor(activeP10, suggestion);
    } catch (e) { showToast(e.message || "Help me write failed.", "error"); }
    finally { setHelpWriteLoading(false); }
  };

  const openRephraseDialog = () => { if (!input.trim() || sessionExpired) return; setRephraseStyle("professional"); setRephraseOpen(true); };

  const doRephrase = async () => {
    const original = input.trim(); if (!original) return;
    setRephraseLoading(true);
    try {
      const r = await api(`/api/whatsapp/rephrase`, { method: "POST", body: JSON.stringify({ text: original, style: rephraseStyle }) });
      const out = String(r?.result || r?.rephrased || "").trim();
      if (!out) { showToast("AI did not return rephrased text.", "warning"); return; }
      setInput(out); if (activeP10) setDraftFor(activeP10, out); setRephraseOpen(false);
    } catch (e) { showToast(e.message || "Rephrase failed.", "error"); }
    finally { setRephraseLoading(false); }
  };

  const templateOptions = useMemo(() => (Array.isArray(templates) ? templates : []).filter((t) => isUtilityTemplate(t) && isApprovedTemplate(t)).sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""))), [templates]);

  useEffect(() => {
    const body = pickBodyTextFromTemplate(selectedTemplate);
    const idxs = extractVarIndexes(body);
    const next = {};
    idxs.forEach((i) => (next[String(i)] = ""));
    setTplVars(next);
    setNewHeaderFormat(getHeaderMediaFormat(selectedTemplate));
    setNewHeaderFile(null);
  }, [selectedTemplate]);

  const previewBody = useMemo(() => applyVarsToBody(pickBodyTextFromTemplate(selectedTemplate), tplVars), [selectedTemplate, tplVars]);

  useEffect(() => {
    if (!newChatOpen) {
      setNewChatLeadOptions([]);
      setNewChatLeadLoading(false);
      setNewChatLeadChoice(null);
      return;
    }

    const query = String(newChatPhone || "").trim();
    if (query.length < 2) {
      setNewChatLeadOptions([]);
      setNewChatLeadLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setNewChatLeadLoading(true);
      try {
        const data = await api(`/api/search?${new URLSearchParams({ query })}`);
        if (cancelled) return;

        const rows = Array.isArray(data) ? data : [];
        const onlyLeads = rows.filter(
          (r) => String(r?.source || "").toLowerCase() === "lead"
        );

        const dedup = new Map();
        for (const row of onlyLeads) {
          const p10 = phone10(row?.contactNumber || "");
          if (!p10 || dedup.has(p10)) continue;
          dedup.set(p10, {
            _id: row?._id || p10,
            name: row?.name || "",
            contactNumber: p10,
          });
        }
        setNewChatLeadOptions(Array.from(dedup.values()));
      } catch {
        if (!cancelled) setNewChatLeadOptions([]);
      } finally {
        if (!cancelled) setNewChatLeadLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [newChatOpen, newChatPhone]);

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
      if (!newHeaderFile) return setNewChatError("This template requires a header attachment.");
      if (newHeaderFile.size > 15 * 1024 * 1024) return setNewChatError("Max attachment size is 15MB.");

      setCreatingChat(true);
      try {
        const up = await uploadTemplateHeaderMedia(newHeaderFile);
        const mediaId = up?.mediaId || up?.id;
        if (!mediaId) {
          setCreatingChat(false);
          return setNewChatError("Upload failed: no mediaId returned.");
        }

        headerMedia = {
          format: newHeaderFormat,
          id: mediaId,
          filename: newHeaderFile.name,
        };

        if (
          newHeaderFile.type?.startsWith("image/") ||
          newHeaderFile.type?.startsWith("video/") ||
          newHeaderFile.type?.startsWith("audio/")
        ) {
          optimisticMedia = {
            url: URL.createObjectURL(newHeaderFile),
            mime: newHeaderFile.type,
            filename: newHeaderFile.name,
          };
        }
      } catch (e) {
        setCreatingChat(false);
        return setNewChatError(e.message || "Failed to upload.");
      }
    } else {
      setCreatingChat(true);
    }

    setNewChatError("");

    const optimistic = {
      _id: buildTempId("tmp_new_tpl"),
      direction: "OUTBOUND",
      type: "template",
      text: previewBody || `[TEMPLATE] ${selectedTemplate.name}`,
      timestamp: new Date().toISOString(),
      status: "sent",
      to,
      phone: to,
      ...(optimisticMedia ? { media: optimisticMedia } : {}),
      templateMeta: {
        name: selectedTemplate.name,
        language: selectedTemplate.language || "",
        parameters: params,
      },
    };

    updateConversationPreviewLocal(to, optimistic.text);
    openChat(to, { bootstrapMessages: [optimistic] });

    try {
      await api(`/api/whatsapp/send-template`, {
        method: "POST",
        body: JSON.stringify({
          to,
          templateName: selectedTemplate.name,
          templateId:
            selectedTemplate.template_id ||
            selectedTemplate.templateId ||
            selectedTemplate.providerTemplateId ||
            "",
          parameters: params,
          renderedText: previewBody || "",
          headerMedia,
        }),
      });
      setNewChatOpen(false);
      setNewChatPhone("");
      setNewChatLeadChoice(null);
      setNewChatLeadOptions([]);
      setSelectedTemplate(null);
      setTplVars({});
      setNewHeaderFormat("");
      setNewHeaderFile(null);
      showToast("New chat started ✓", "success");
    } catch (e) {
      setMessages((prev) => prev.map((m) => m._id === optimistic._id ? { ...m, status: "failed" } : m));
      setNewChatError(extractApiErrorMessage(e, "Failed to send template"));
    } finally {
      setCreatingChat(false);
    }
  };

  const hasActiveChat = !!activeChat?.phone;
  const templateOnlyMode = hasActiveChat && (sessionExpired || !sessionInfo.has || sessionInfo.expired);
  const expiredMode = templateOnlyMode;

  /* ─── Grouped messages with date separators ─────────────────────────────── */
  const groupedMessages = useMemo(() => {
    const result = [];
    let lastDate = null;
    messages.forEach((msg) => {
      const ts = msg?.timestamp || msg?.createdAt;
      if (ts) {
        const d = new Date(ts);
        const dateStr = d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
        const today = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
        const label = dateStr === today ? "Today" : dateStr === yesterday ? "Yesterday" : dateStr;
        if (label !== lastDate) { result.push({ type: "separator", label, key: `sep_${label}` }); lastDate = label; }
      }
      result.push({ type: "message", msg, key: msgKey(msg) });
    });
    return result;
  }, [messages]);

  return (
    <Box
      height="93vh"
      display="flex"
      sx={{
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
        bgcolor: LIGHT.sidebarBg,
        overflow: "hidden",
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <Box
        width={380}
        display="flex"
        flexDirection="column"
        sx={{
          bgcolor: LIGHT.sidebarBg,
          borderRight: `1px solid ${LIGHT.border}`,
          flexShrink: 0,
        }}
      >
        {/* Sidebar header */}
        <Box
          px={2}
          py={1.5}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{ bgcolor: LIGHT.sidebarHeaderBg }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WaAvatar name={sessionUser?.fullName || "Me"} size={40} />
            <Typography sx={{ fontWeight: 600, fontSize: 17, color: LIGHT.text }}>
              Chats
            </Typography>
            <UnreadBadge count={totalUnreadCount} />
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="New chat">
              <IconButton
                size="small"
                onClick={() => {
                  setNewChatPhone("");
                  setNewChatLeadChoice(null);
                  setNewChatLeadOptions([]);
                  setSelectedTemplate(null);
                  setTplVars({});
                  setNewChatError("");
                  setNewHeaderFormat("");
                  setNewHeaderFile(null);
                  setNewChatOpen(true);
                }}
                sx={{ color: LIGHT.subtext, "&:hover": { color: LIGHT.text, bgcolor: "rgba(0,0,0,0.05)" }, borderRadius: 2 }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={() => { refreshConversations(null, { silent: false }); fetchTemplates(); }}
                disabled={loadingChats}
                sx={{ color: LIGHT.subtext, "&:hover": { color: LIGHT.text, bgcolor: "rgba(0,0,0,0.05)" }, borderRadius: 2 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {/* Socket status dot */}
            <Tooltip title={`Socket: ${socketStatus}`}>
              <Box sx={{
                width: 8, height: 8, borderRadius: "50%", alignSelf: "center", ml: 0.5,
                bgcolor: socketStatus === "connected" ? "#25D366" : socketStatus === "error" ? "#EA4335" : "#6B7280",
                boxShadow: socketStatus === "connected" ? "0 0 0 2px rgba(37,211,102,0.25)" : "none",
                transition: "all 0.3s",
              }} />
            </Tooltip>
          </Stack>
        </Box>

        {/* Search */}
        <Box px={1.5} py={1} sx={{ bgcolor: LIGHT.sidebarBg }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: LIGHT.subtext }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: LIGHT.sidebarHeaderBg,
                borderRadius: 99,
                fontSize: 14,
                color: LIGHT.text,
                "& fieldset": { border: "none" },
                "&:hover fieldset": { border: "none" },
                "&.Mui-focused fieldset": { border: "none" },
              },
              "& input::placeholder": { color: LIGHT.subtext, opacity: 1 },
              "& input": { py: 0.9 },
            }}
          />
        </Box>
        <Box px={1.5} pb={1} sx={{ bgcolor: LIGHT.sidebarBg }}>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={() => setChatTab("all")}
              sx={{
                textTransform: "none",
                borderRadius: 99,
                px: 2,
                border: "1px solid #d5dbe3",
                bgcolor: chatTab === "all" ? "#bfe7bf" : "#f4f6f8",
                color: chatTab === "all" ? "#1f6f1f" : "#475467",
                fontWeight: 700,
              }}
            >
              {`All (${chatTabCounts.all})`}
            </Button>
            <Button
              size="small"
              onClick={() => setChatTab("unread")}
              sx={{
                textTransform: "none",
                borderRadius: 99,
                px: 2,
                border: "1px solid #d5dbe3",
                bgcolor: chatTab === "unread" ? "#e6f0ff" : "#f4f6f8",
                color: chatTab === "unread" ? "#175cd3" : "#475467",
                fontWeight: 700,
              }}
            >
              {`Unread (${chatTabCounts.unread})`}
            </Button>
            <Button
              size="small"
              onClick={() => setChatTab("favourite")}
              startIcon={<StarIcon sx={{ fontSize: 14 }} />}
              sx={{
                textTransform: "none",
                borderRadius: 99,
                px: 2,
                border: "1px solid #d5dbe3",
                bgcolor: chatTab === "favourite" ? "#fff7e0" : "#f4f6f8",
                color: chatTab === "favourite" ? "#b54708" : "#475467",
                fontWeight: 700,
              }}
            >
              {`Favourites (${chatTabCounts.favourite})`}
            </Button>
          </Stack>
        </Box>
        {canFilterByAgent && (
          <Box px={1.5} pb={1} sx={{ bgcolor: LIGHT.sidebarBg }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filter by expert"
              value={agentFilter}
              onChange={(e) => setAgentFilter(String(e.target.value || "all"))}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: LIGHT.sidebarHeaderBg,
                  borderRadius: 2,
                  fontSize: 13,
                  color: LIGHT.text,
                  "& fieldset": { border: "none" },
                  "&:hover fieldset": { border: "none" },
                  "&.Mui-focused fieldset": { border: "none" },
                },
                "& .MuiInputLabel-root": { color: LIGHT.subtext, fontSize: 12 },
                "& .MuiSelect-select": { py: 1 },
              }}
            >
              <MenuItem value="all">All experts</MenuItem>
              {agentFilterOptions.map((name) => (
                <MenuItem key={name} value={name.toLowerCase()}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        {/* Conversation list */}
        <Box flex={1} overflow="auto" sx={{
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "#c7ced6", borderRadius: 2 },
        }}>
          {loadingChats ? (
            <Stack alignItems="center" mt={6}><CircularProgress size={24} sx={{ color: "#25D366" }} /></Stack>
          ) : (
            <>
              {canShowQuickChat && (
                <Box
                  onClick={() => openChat(digitsOnly(search))}
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5,
                    cursor: "pointer",
                    bgcolor: phone10(activeChat?.phone) === phone10(search) ? LIGHT.activeRowBg : "transparent",
                    "&:hover": { bgcolor: LIGHT.hoverRowBg },
                    transition: "background 0.15s",
                  }}
                >
                  <Avatar sx={{ width: 49, height: 49, bgcolor: "#dff7e8", fontSize: 16, fontWeight: 700 }}>💬</Avatar>
                  <Box flex={1}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: LIGHT.text }}>Open chat</Typography>
                    <Typography sx={{ fontSize: 13, color: LIGHT.subtext }}>{phone10(search)}</Typography>
                  </Box>
                </Box>
              )}

              {sortedConversations.map((chat) => {
                const isActive = phone10(activeChat?.phone) === phone10(chat.phone);
                const unread = Number(chat?.unreadCount || 0);
                const displayName = chatDisplayName(chat);
                const fav = isFavourite(chat.phone);
                const unreadPreview = unread > 0 ? String(chat?.lastMessageText || "Unread messages") : "";
                return (
                  <Tooltip key={chat._id || chat.phone} title={unreadPreview} placement="right" disableHoverListener={!unreadPreview}>
                    <Box
                      onClick={() => openChat(chat.phone)}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5,
                        px: 2, py: 1.25,
                        cursor: "pointer",
                        bgcolor: isActive ? LIGHT.activeRowBg : "transparent",
                        "&:hover": { bgcolor: isActive ? LIGHT.activeRowBg : LIGHT.hoverRowBg },
                        transition: "background 0.15s",
                        borderBottom: `1px solid ${LIGHT.border}`,
                        position: "relative",
                      }}
                    >
                      <WaAvatar name={displayName} size={49} />
                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={0.3}>
                          <Typography sx={{ fontSize: 15, fontWeight: unread > 0 ? 700 : 500, color: LIGHT.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {displayName}
                          </Typography>
                          <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavourite(chat.phone);
                              }}
                              sx={{ p: 0.25, color: fav ? "#f59e0b" : "#98a2b3" }}
                            >
                              {fav ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                            <Typography sx={{ fontSize: 11, color: unread > 0 ? "#128C7E" : LIGHT.subtext, whiteSpace: "nowrap" }}>
                              {formatLastActive(chat.lastMessageAt)}
                            </Typography>
                          </Stack>
                        </Stack>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography sx={{ fontSize: 13, color: LIGHT.subtext, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: unread > 0 ? 600 : 400 }}>
                            {chat.lastMessageText || assignedToText(chat) || ""}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                            <UnreadBadge count={unread} />
                          </Box>
                        </Stack>
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })}

              {!sortedConversations.length && !canShowQuickChat && (
                <Stack alignItems="center" mt={8} spacing={1}>
                  <Typography sx={{ fontSize: 14, color: LIGHT.subtext }}>No conversations found</Typography>
                </Stack>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      <Box flex={1} display="flex" flexDirection="column" sx={{ bgcolor: LIGHT.panelBg, position: "relative", minWidth: 0 }}>
        {/* Chat background pattern */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.72)), url("https://cdn.shopify.com/s/files/1/0734/7155/7942/files/image_23.png?v=1776755371")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {!hasActiveChat ? (
          /* Empty state */
          <Stack alignItems="center" justifyContent="center" height="100%" sx={{ zIndex: 1, position: "relative" }} spacing={2}>
            <Box sx={{ fontSize: 80, filter: "grayscale(0.3)" }}>💬</Box>
            <Typography sx={{ fontSize: 32, fontWeight: 300, color: LIGHT.text, letterSpacing: "-0.5px" }}>
              WhatsApp Web
            </Typography>
            <Typography sx={{ fontSize: 14, color: LIGHT.subtext, textAlign: "center", maxWidth: 340, lineHeight: 1.7 }}>
              Select a conversation from the left to start messaging, or click + to start a new chat.
            </Typography>
          </Stack>
        ) : (
          <>
            {/* Chat header */}
            <Box
              px={2}
              py={1}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              sx={{ bgcolor: LIGHT.sidebarHeaderBg, zIndex: 2, flexShrink: 0 }}
	            >
	              <Stack direction="row" spacing={1.5} alignItems="center">
	                <WaAvatar name={activeConversation ? chatDisplayName(activeConversation) : activeP10} size={40} />
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 15, color: LIGHT.text, lineHeight: 1.2 }}>
                    {activeHeaderTitle}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {activeConversation?.assignedToLabel && (
                      <Typography sx={{ fontSize: 12, color: LIGHT.subtext }}>
                        {assignedToText(activeConversation)}
                      </Typography>
                    )}
                    {hasActiveChat && (
                      <Typography sx={{
                        fontSize: 12,
                        color: templateOnlyMode ? "#EA4335" : "#128C7E",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {templateOnlyMode ? "Only templates allowed" : `⏱ ${sessionInfo.label}`}
                      </Typography>
                    )}
                  </Stack>
	                </Box>
	              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Tooltip title="Create order">
                  <IconButton
                    onClick={() => setCartOpen(true)}
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: "#fff",
                      border: `1px solid ${LIGHT.border}`,
                      color: LIGHT.subtext,
                      "&:hover": { bgcolor: "#f8fafc", color: LIGHT.text },
                    }}
                  >
                    <ShoppingCartIcon sx={{ fontSize: 19 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={activeIsFavourite ? "Remove favourite" : "Mark favourite"}>
                  <IconButton
                    onClick={() => toggleFavourite(activeChat?.phone || activeP10)}
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: "#fff",
                      border: `1px solid ${LIGHT.border}`,
                      color: activeIsFavourite ? "#f59e0b" : LIGHT.subtext,
                      "&:hover": {
                        bgcolor: "#f8fafc",
                        color: activeIsFavourite ? "#d97706" : LIGHT.text,
                      },
                    }}
                  >
                    {activeIsFavourite ? (
                      <StarIcon sx={{ fontSize: 19 }} />
                    ) : (
                      <StarBorderIcon sx={{ fontSize: 19 }} />
                    )}
                  </IconButton>
                </Tooltip>
              </Stack>
	            </Box>

            {/* Messages area */}
            <Box
              flex={1}
              ref={chatScrollRef}
              p={2}
              overflow="auto"
              onScroll={onChatScroll}
              sx={{
                zIndex: 1, position: "relative",
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": { bgcolor: "#c7ced6", borderRadius: 3 },
              }}
            >
              {loadingMessages ? (
                <Stack alignItems="center" mt={8}><CircularProgress size={24} sx={{ color: "#25D366" }} /></Stack>
              ) : (
                <Stack spacing={0.5}>
                  {loadingOlder && (
                    <Stack alignItems="center" mb={1}>
                      <CircularProgress size={16} sx={{ color: "#25D366" }} />
                    </Stack>
                  )}
                  {!!chatError && (
                    <Box sx={{
                      bgcolor: "#fff1f0", border: "1px solid #f4c7c3",
                      borderRadius: 2, px: 2, py: 1, mb: 1, backdropFilter: "blur(4px)",
                    }}>
                      <Typography sx={{ fontSize: 13, color: "#EA4335" }}>{chatError}</Typography>
                    </Box>
                  )}

                  {groupedMessages.map((item) => {
                    if (item.type === "separator") {
                      return <DateSeparator key={item.key} date={item.label} />;
                    }

                    const { msg } = item;
                    const isOutbound = String(msg.direction || "").toUpperCase() === "OUTBOUND";
                    const cutoff = openedCutoffRef.current || 0;
                    const ts = new Date(msg.timestamp || msg.createdAt || 0).getTime();
                    const wasUnread = !isOutbound && cutoff && ts > cutoff;
                    const isTemplate = String(msg?.type || "").toLowerCase() === "template";
                    const bubbleText = msg?.text || "";
                    const hasMedia = !!String(msg?.media?.id || "").trim() || !!String(msg?.media?.url || "").trim() ||
                      !!String(msg?.templateMeta?.headerMedia?.id || "").trim() || !!String(msg?.templateMeta?.headerMedia?.url || "").trim();

                    return (
                      <Box
                        key={item.key}
                        sx={{
                          display: "flex",
                          justifyContent: isOutbound ? "flex-end" : "flex-start",
                          px: 1,
                          animation: "fadeSlideIn 0.18s ease-out",
                          "@keyframes fadeSlideIn": {
                            from: { opacity: 0, transform: "translateY(6px)" },
                            to: { opacity: 1, transform: "translateY(0)" },
                          },
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: 520,
                            position: "relative",
                            "&::before": isOutbound ? {} : {
                              content: '""',
                              position: "absolute",
                              left: -6,
                              top: 0,
                              width: 0, height: 0,
                              borderStyle: "solid",
                              borderWidth: "0 8px 8px 0",
                              borderColor: `transparent ${wasUnread ? LIGHT.unreadIncomingBubble : LIGHT.incomingBubble} transparent transparent`,
                            },
                            "&::after": !isOutbound ? {} : {
                              content: '""',
                              position: "absolute",
                              right: -6,
                              top: 0,
                              width: 0, height: 0,
                              borderStyle: "solid",
                              borderWidth: "0 0 8px 8px",
                              borderColor: `transparent transparent transparent ${wasUnread ? LIGHT.unreadOutgoingBubble : LIGHT.outgoingBubble}`,
                            },
                          }}
                        >
                          <Paper
                            elevation={0}
                            sx={{
                              px: 1.25,
                              pt: 0.75,
                              pb: 0.25,
                              bgcolor: isOutbound
                                ? wasUnread ? LIGHT.unreadOutgoingBubble : LIGHT.outgoingBubble
                                : wasUnread ? LIGHT.unreadIncomingBubble : LIGHT.incomingBubble,
                              borderRadius: isOutbound
                                ? "12px 12px 2px 12px"
                                : "12px 12px 12px 2px",
                              boxShadow: "0 1px 2px rgba(16,24,40,0.08)",
                              border: `1px solid ${LIGHT.border}`,
                              transition: "background 0.2s",
                            }}
                          >
                            {isTemplate ? (
                              <TemplateBubble msg={msg} />
                            ) : (
                              <>
                                {!!bubbleText && (
                                  <Typography
                                    sx={{
                                      fontSize: 14.5,
                                      whiteSpace: "pre-wrap",
                                      color: LIGHT.text,
                                      lineHeight: 1.55,
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {bubbleText}
                                  </Typography>
                                )}
                                {hasMedia && <MessageMedia msg={msg} isNearBottomRef={isNearBottomRef} bottomRef={bottomRef} />}
                              </>
                            )}
                            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mt: 0.25, gap: 0.25 }}>
                              <Typography sx={{ fontSize: 11, color: LIGHT.subtext, lineHeight: 1 }}>
                                {formatTime(msg.timestamp || msg.createdAt)}
                              </Typography>
                              {isOutbound && <MessageTicks status={msg.status} />}
                            </Box>
                          </Paper>
                        </Box>
                      </Box>
                    );
                  })}
                  <div ref={bottomRef} />
                </Stack>
              )}
            </Box>

            {/* Input bar */}
            <Box
              sx={{
                bgcolor: LIGHT.sidebarHeaderBg,
                px: 1.5, py: 1.25,
                zIndex: 2, flexShrink: 0,
              }}
            >
              {expiredMode ? (
                /* Expired session bar */
                <Box sx={{
                  bgcolor: "rgba(234,67,53,0.08)", border: "1px solid rgba(234,67,53,0.2)",
                  borderRadius: 3, px: 2, py: 1.25,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
                }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, color: "#EA4335", fontWeight: 600 }}>Only templates allowed</Typography>
                    <Typography sx={{ fontSize: 12, color: LIGHT.subtext }}>Chat window expired. Send a template to reopen the 24h window.</Typography>
                  </Box>
                  <Tooltip title="Send template">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={(e) => { setTplMenuSearch(""); setTplAnchor(e.currentTarget); }}
                      startIcon={<ViewListIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        bgcolor: "#22c55e", color: "#fff", textTransform: "none",
                        fontSize: 13, fontWeight: 600, borderRadius: 99,
                        "&:hover": { bgcolor: "#1ebe5d" },
                        flexShrink: 0,
                        boxShadow: "none",
                      }}
                    >
                      Templates
                    </Button>
                  </Tooltip>
                </Box>
              ) : (
                <>
                  {/* Toolbar row */}
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    mb={0.75}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <ActionPillButton
                      title="Quick replies"
                      label="Quick reply"
                      icon={<FlashOnIcon sx={{ fontSize: 18 }} />}
                      onClick={(e) => setQuickAnchor(e.currentTarget)}
                      disabled={!hasActiveChat}
                    />

                    <ActionPillButton
                      title="Templates"
                      label="Templates"
                      icon={<ViewListIcon sx={{ fontSize: 18 }} />}
                      onClick={(e) => {
                        setTplMenuSearch("");
                        setTplAnchor(e.currentTarget);
                      }}
                      disabled={!hasActiveChat}
                    />

                    <ActionPillButton
                      title="Emoji"
                      label="Emojis"
                      icon={<InsertEmoticonIcon sx={{ fontSize: 18 }} />}
                      onClick={(e) => setEmojiAnchor(e.currentTarget)}
                      disabled={!hasActiveChat}
                    />

                    <ActionPillButton
                      title={fileUploading ? "Uploading..." : "Attach file"}
                      label="Attach File"
                      icon={<AttachFileIcon sx={{ fontSize: 18 }} />}
                      onClick={() => fileRef.current?.click()}
                      disabled={!hasActiveChat || fileUploading}
                      loading={fileUploading}
                    />

                    <ActionPillButton
                      title="Help me write (AI)"
                      label="AI Write"
                      icon={<AutoFixHighIcon sx={{ fontSize: 18 }} />}
                      onClick={helpMeWrite}
                      disabled={!hasActiveChat || helpWriteLoading}
                      loading={helpWriteLoading}
                    />

                    <ActionPillButton
                      title="Rephrase"
                      label="Rephrase"
                      icon={<AutorenewIcon sx={{ fontSize: 18 }} />}
                      onClick={openRephraseDialog}
                      disabled={!hasActiveChat || !input.trim()}
                    />

                    <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); }} />
                  </Stack>

                  {/* Input row */}
                  <Stack direction="row" spacing={1} alignItems="flex-end">
                    <TextField
                      fullWidth
                      multiline
                      minRows={1}
                      maxRows={5}
                      size="small"
                      placeholder="Type a message"
                      value={input}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInput(val);
                        if (activeP10) setDraftFor(activeP10, val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
                      }}
                      disabled={!hasActiveChat}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          bgcolor: LIGHT.inputBg,
                          borderRadius: 3,
                          color: LIGHT.text,
                          fontSize: 15,
                          "& fieldset": { border: "none" },
                          "&:hover fieldset": { border: "none" },
                          "&.Mui-focused fieldset": { border: "none" },
                          "&.Mui-disabled": { bgcolor: "#eef2f6" },
                        },
                        "& textarea::placeholder": { color: LIGHT.subtext, opacity: 1 },
                        "& textarea": { py: 0.5, lineHeight: 1.55 },
                      }}
                    />
                    <IconButton
                      onClick={sendText}
                      disabled={!hasActiveChat || !input.trim()}
                      sx={{
                        width: 42, height: 42, flexShrink: 0,
                        bgcolor: input.trim() && hasActiveChat ? "#22c55e" : "#dbe4ea",
                        color: input.trim() && hasActiveChat ? "#fff" : LIGHT.subtext,
                        transition: "all 0.2s",
                        "&:hover": { bgcolor: input.trim() && hasActiveChat ? "#16a34a" : "#d3dde5" },
                        "&.Mui-disabled": { bgcolor: LIGHT.inputBg, color: "#3B4A54" },
                        borderRadius: 2,
                      }}
                    >
                      <SendIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Stack>
                </>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* ── Menus ────────────────────────────────────────────────────────────── */}
      <Menu
        anchorEl={quickAnchor}
        open={Boolean(quickAnchor)}
        onClose={() => setQuickAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: "#fff", color: LIGHT.text, borderRadius: 2,
            border: `1px solid ${LIGHT.border}`, boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
            minWidth: 260,
          },
        }}
      >
        {QUICK_REPLIES.map((q) => (
          <MenuItem
            key={q}
            onClick={() => { setInput(q); if (activeP10) setDraftFor(activeP10, q); setQuickAnchor(null); }}
            sx={{ fontSize: 14, py: 1.25, "&:hover": { bgcolor: "#f3f4f6" } }}
          >
            {q}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={emojiAnchor}
        open={Boolean(emojiAnchor)}
        onClose={() => setEmojiAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: "#233138", borderRadius: 2,
            border: `1px solid ${LIGHT.border}`, boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
          },
        }}
      >
        <Box px={1} py={1} display="grid" gridTemplateColumns="repeat(8, 1fr)" gap={0.25} maxWidth={280}>
          {EMOJIS.map((emo) => (
            <Button
              key={emo}
              onClick={() => { insertEmoji(emo); setEmojiAnchor(null); }}
              sx={{ minWidth: 0, p: 0.75, fontSize: 22, lineHeight: 1, borderRadius: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.08)" } }}
            >
              {emo}
            </Button>
          ))}
        </Box>
      </Menu>

      <Menu
        anchorEl={tplAnchor}
        open={Boolean(tplAnchor)}
        onClose={() => setTplAnchor(null)}
        PaperProps={{
          sx: {
            width: 380, maxHeight: 480,
            bgcolor: "#fff", color: LIGHT.text, borderRadius: 2,
            border: `1px solid ${LIGHT.border}`, boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
          },
        }}
      >
        <Box px={1.5} py={1}>
          <TextField
            fullWidth size="small" placeholder="Search templates"
            value={tplMenuSearch} onChange={(e) => setTplMenuSearch(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: LIGHT.inputBg, borderRadius: 99, color: LIGHT.text, fontSize: 13,
                "& fieldset": { border: "none" },
              },
              "& input::placeholder": { color: LIGHT.subtext, opacity: 1 },
            }}
          />
        </Box>
        <Divider sx={{ borderColor: LIGHT.border }} />
        {loadingTemplates ? (
          <Box p={3} textAlign="center"><CircularProgress size={20} sx={{ color: "#25D366" }} /></Box>
        ) : filteredApprovedUtilityTemplates.length ? (
          filteredApprovedUtilityTemplates.map((tpl) => {
            const chip = statusChipProps(tpl?.status);
            return (
              <MenuItem
                key={tpl._id || tpl.id || tpl.name}
                onClick={() => { openTemplateComposer(tpl); setTplAnchor(null); }}
                sx={{ alignItems: "flex-start", py: 1.25, "&:hover": { bgcolor: LIGHT.inputBg } }}
              >
                <Box width="100%">
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.4}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: LIGHT.text }}>{tpl.name}</Typography>
                    <Chip size="small" label={chip.label} sx={{ ...chip.sx, height: 18, fontSize: 10 }} />
                  </Stack>
                  <Typography sx={{ fontSize: 12, color: LIGHT.subtext }} noWrap>{pickBodyTextFromTemplate(tpl) || "No body text"}</Typography>
                </Box>
              </MenuItem>
            );
          })
        ) : (
          <Box p={2}><Typography sx={{ fontSize: 13, color: LIGHT.subtext }}>No approved utility templates found.</Typography></Box>
        )}
      </Menu>

      {/* ── Template compose dialog ──────────────────────────────────────────── */}
      <Dialog
        open={tplComposeOpen}
        onClose={() => !tplSending && setTplComposeOpen(false)}
        fullWidth maxWidth="sm"
        PaperProps={{
          sx: {
            color: LIGHT.text, borderRadius: 3,
            border: `1px solid ${LIGHT.border}`, boxShadow: "0 24px 64px rgba(16,24,40,0.14)",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 17, fontWeight: 700, pb: 1, color: LIGHT.text, borderBottom: `1px solid ${LIGHT.border}` }}>
          ⚡ Send Template
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {activeTplForSend && (
            <Stack spacing={2} mt={0.5}>
              <Box sx={{ bgcolor: LIGHT.inputBg, borderRadius: 2, px: 2, py: 1.25 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: LIGHT.text }}>{activeTplForSend.name}</Typography>
                <Typography sx={{ fontSize: 12, color: LIGHT.subtext }}>{activeTplForSend.language || "—"}</Typography>
              </Box>
              {extractVarIndexes(pickBodyTextFromTemplate(activeTplForSend)).map((i) => (
                <TextField key={i} fullWidth size="small" label={`Variable ${i}`}
                  value={tplSendVars[String(i)] || ""}
                  onChange={(e) => setTplSendVars((prev) => ({ ...prev, [String(i)]: e.target.value }))}
                  sx={{
                    "& .MuiOutlinedInput-root": { bgcolor: LIGHT.inputBg, color: LIGHT.text, borderRadius: 2, "& fieldset": { borderColor: LIGHT.border }, "&:hover fieldset": { borderColor: "#cbd5e1" }, "&.Mui-focused fieldset": { borderColor: "#22c55e" } },
                    "& label": { color: LIGHT.subtext }, "& label.Mui-focused": { color: "#22c55e" },
                  }}
                />
              ))}
              {!!tplHeaderFormat && (
                <Box sx={{ bgcolor: LIGHT.inputBg, borderRadius: 2, p: 1.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1, color: LIGHT.text }}>Header: {tplHeaderFormat}</Typography>
                  <Button variant="outlined" component="label" size="small"
                    sx={{ borderColor: LIGHT.border, color: LIGHT.subtext, textTransform: "none", borderRadius: 99, "&:hover": { borderColor: "#22c55e", color: "#16a34a" } }}>
                    Choose file
                    <input hidden type="file" accept={acceptForHeaderFormat(tplHeaderFormat)} onChange={(e) => setTplHeaderFile(e.target.files?.[0] || null)} />
                  </Button>
                  {tplHeaderFile && <Typography sx={{ fontSize: 12, color: LIGHT.subtext, mt: 0.75 }}>📎 {tplHeaderFile.name}</Typography>}
                </Box>
              )}
              <Box sx={{ bgcolor: "#f8fafc", borderRadius: 2, px: 1.5, py: 1.25, border: `1px solid ${LIGHT.border}` }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", mb: 0.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>Preview</Typography>
                <Typography sx={{ fontSize: 14, whiteSpace: "pre-wrap", color: LIGHT.text, lineHeight: 1.55 }}>{tplSendPreview || "—"}</Typography>
              </Box>
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button onClick={() => setTplComposeOpen(false)} disabled={tplSending}
                  sx={{ textTransform: "none", color: LIGHT.subtext, "&:hover": { color: LIGHT.text } }}>Cancel</Button>
                <Button variant="contained" onClick={sendTemplateFromChat} disabled={tplSending}
                  sx={{ bgcolor: "#22c55e", color: "#fff", textTransform: "none", borderRadius: 99, fontWeight: 600, boxShadow: "none", "&:hover": { bgcolor: "#1ebe5d" }, "&.Mui-disabled": { bgcolor: "#dbe4ea", color: LIGHT.subtext } }}>
                  {tplSending ? "Sending…" : "Send template"}
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* ── New chat dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={newChatOpen}
        onClose={() => !creatingChat && setNewChatOpen(false)}
        fullWidth maxWidth="sm"
        PaperProps={{
          sx: {
            color: LIGHT.text, borderRadius: 3,
            border: `1px solid ${LIGHT.border}`, boxShadow: "0 24px 64px rgba(16,24,40,0.14)",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 17, fontWeight: 700, pb: 1, color: LIGHT.text, borderBottom: `1px solid ${LIGHT.border}` }}>
          💬 Start New Chat
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1.5}>
            {[
              <Autocomplete
                freeSolo
                options={newChatLeadOptions}
                loading={newChatLeadLoading}
                value={newChatLeadChoice}
                inputValue={newChatPhone}
                onInputChange={(_, v, reason) => {
                  setNewChatPhone(v || "");
                  if (reason === "input") setNewChatLeadChoice(null);
                  if (reason === "clear") setNewChatLeadChoice(null);
                }}
                onChange={(_, v) => {
                  if (!v) {
                    setNewChatLeadChoice(null);
                    return;
                  }
                  if (typeof v === "string") {
                    setNewChatLeadChoice(null);
                    setNewChatPhone(v);
                    return;
                  }
                  setNewChatLeadChoice(v);
                  setNewChatPhone(v.contactNumber || "");
                }}
                filterOptions={(x) => x}
                getOptionLabel={(o) =>
                  typeof o === "string"
                    ? o
                    : `${o?.name || "Unknown"} (${o?.contactNumber || ""})`
                }
                isOptionEqualToValue={(o, v) =>
                  String(o?.contactNumber || "") === String(v?.contactNumber || "")
                }
                PaperComponent={StableAutocompletePaper}
                ListboxProps={{ style: { maxHeight: 260, overflowY: "auto" } }}
                renderOption={(props, o) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box
                      component="li"
                      key={key || `${o?._id || ""}_${o?.contactNumber || ""}`}
                      {...optionProps}
                      sx={{
                        fontSize: 13,
                        color: LIGHT.text,
                        "&:hover": { bgcolor: "#f3f4f6 !important" },
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: LIGHT.text }}>
                          {o?.name || "Unknown"}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: LIGHT.subtext }}>
                          {o?.contactNumber || "-"}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Phone number (or search lead name)"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: LIGHT.inputBg,
                        color: LIGHT.text,
                        borderRadius: 2,
                        "& fieldset": { borderColor: LIGHT.border },
                        "&:hover fieldset": { borderColor: "#cbd5e1" },
                        "&.Mui-focused fieldset": { borderColor: "#22c55e" },
                      },
                      "& label": { color: LIGHT.subtext },
                      "& label.Mui-focused": { color: "#22c55e" },
                    }}
                  />
                )}
              />,
              <Autocomplete
                options={templateOptions} value={selectedTemplate} onChange={(_, v) => setSelectedTemplate(v)}
                getOptionLabel={(o) => o?.name || ""}
                PaperComponent={StableAutocompletePaper}
                ListboxProps={{ style: { maxHeight: 260, overflowY: "auto" } }}
                renderOption={(props, o, state) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box
                      component="li"
                      key={key || `${o?._id || o?.id || o?.template_id || o?.name || "tpl"}_${state.index}`}
                      {...optionProps}
                      sx={{ fontSize: 13, color: LIGHT.text, "&:hover": { bgcolor: "#f3f4f6 !important" } }}
                    >
                      {o.name}
                    </Box>
                  );
                }}
                renderInput={(params) => <TextField {...params} size="small" label="Select approved utility template"
                  sx={{ "& .MuiOutlinedInput-root": { bgcolor: LIGHT.inputBg, color: LIGHT.text, borderRadius: 2, "& fieldset": { borderColor: LIGHT.border }, "&.Mui-focused fieldset": { borderColor: "#22c55e" } }, "& label": { color: LIGHT.subtext }, "& label.Mui-focused": { color: "#22c55e" }, "& .MuiSvgIcon-root": { color: LIGHT.subtext } }} />}
              />,
            ].map((el, i) => <Box key={i}>{el}</Box>)}

            {selectedTemplate && (
              <>
                {extractVarIndexes(pickBodyTextFromTemplate(selectedTemplate)).map((i) => (
                  <TextField key={i} fullWidth size="small" label={`Variable ${i}`}
                    value={tplVars[String(i)] || ""}
                    onChange={(e) => setTplVars((prev) => ({ ...prev, [String(i)]: e.target.value }))}
                    sx={{ "& .MuiOutlinedInput-root": { bgcolor: LIGHT.inputBg, color: LIGHT.text, borderRadius: 2, "& fieldset": { borderColor: LIGHT.border }, "&.Mui-focused fieldset": { borderColor: "#22c55e" } }, "& label": { color: LIGHT.subtext }, "& label.Mui-focused": { color: "#22c55e" } }}
                  />
                ))}
                {!!newHeaderFormat && (
                  <Box sx={{ bgcolor: LIGHT.inputBg, borderRadius: 2, p: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1, color: LIGHT.text }}>Header: {newHeaderFormat}</Typography>
                    <Button variant="outlined" component="label" size="small"
                      sx={{ borderColor: LIGHT.border, color: LIGHT.subtext, textTransform: "none", borderRadius: 99, "&:hover": { borderColor: "#22c55e", color: "#16a34a" } }}>
                      Choose file
                      <input hidden type="file" accept={acceptForHeaderFormat(newHeaderFormat)} onChange={(e) => setNewHeaderFile(e.target.files?.[0] || null)} />
                    </Button>
                    {newHeaderFile && <Typography sx={{ fontSize: 12, color: LIGHT.subtext, mt: 0.75 }}>📎 {newHeaderFile.name}</Typography>}
                  </Box>
                )}
                <Box sx={{ bgcolor: "#f8fafc", borderRadius: 2, px: 1.5, py: 1.25, border: `1px solid ${LIGHT.border}` }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", mb: 0.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>Preview</Typography>
                  <Typography sx={{ fontSize: 14, whiteSpace: "pre-wrap", color: LIGHT.text, lineHeight: 1.55 }}>{previewBody || "—"}</Typography>
                </Box>
              </>
            )}
            {!!newChatError && (
              <Box sx={{ bgcolor: "rgba(234,67,53,0.1)", borderRadius: 2, px: 1.5, py: 1, border: "1px solid rgba(234,67,53,0.2)" }}>
                <Typography sx={{ fontSize: 13, color: "#EA4335" }}>{newChatError}</Typography>
              </Box>
            )}
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={() => setNewChatOpen(false)} disabled={creatingChat}
                sx={{ textTransform: "none", color: LIGHT.subtext, "&:hover": { color: LIGHT.text } }}>Cancel</Button>
              <Button variant="contained" onClick={startNewChatWithTemplate} disabled={creatingChat}
                sx={{ bgcolor: "#22c55e", color: "#fff", textTransform: "none", borderRadius: 99, fontWeight: 600, boxShadow: "none", "&:hover": { bgcolor: "#1ebe5d" }, "&.Mui-disabled": { bgcolor: "#dbe4ea", color: LIGHT.subtext } }}>
                {creatingChat ? "Sending…" : "Start chat"}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* ── Attachment preview dialog ───────────────────────────────────────── */}
      <Dialog
        open={attachmentPreviewOpen}
        onClose={() => !fileUploading && closeAttachmentPreview()}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: "#fff",
            color: LIGHT.text,
            borderRadius: 3,
            border: `1px solid ${LIGHT.border}`,
            boxShadow: "0 24px 64px rgba(16,24,40,0.14)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: 17,
            fontWeight: 700,
            pb: 1,
            color: LIGHT.text,
            borderBottom: `1px solid ${LIGHT.border}`,
          }}
        >
          Preview attachment
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {attachmentPreviewMsg ? (
            <Box
              sx={{
                bgcolor: "#f8fafc",
                borderRadius: 3,
                border: `1px solid ${LIGHT.border}`,
                p: 2,
                mb: 2,
              }}
            >
              <MessageMedia
                msg={attachmentPreviewMsg}
                isNearBottomRef={{ current: false }}
                bottomRef={{ current: null }}
              />
              {!!pendingAttachment?.filename && (
                <Typography sx={{ mt: 1, fontSize: 13, color: LIGHT.subtext }}>
                  {pendingAttachment.filename}
                </Typography>
              )}
            </Box>
          ) : null}

          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            size="small"
            label="Caption (optional)"
            value={pendingAttachment?.caption || ""}
            onChange={(e) =>
              setPendingAttachment((prev) =>
                prev ? { ...prev, caption: e.target.value } : prev
              )
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: LIGHT.inputBg,
                color: LIGHT.text,
                borderRadius: 2,
                "& fieldset": { borderColor: LIGHT.border },
                "&.Mui-focused fieldset": { borderColor: "#22c55e" },
              },
              "& label": { color: LIGHT.subtext },
              "& label.Mui-focused": { color: "#22c55e" },
            }}
          />

          <Stack direction="row" justifyContent="flex-end" spacing={1.25} mt={2}>
            <Button
              onClick={closeAttachmentPreview}
              disabled={fileUploading}
              sx={{
                textTransform: "none",
                color: LIGHT.subtext,
                "&:hover": { color: LIGHT.text },
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={sendPendingAttachment}
              disabled={fileUploading || !pendingAttachment?.file}
              startIcon={
                fileUploading ? (
                  <CircularProgress size={16} sx={{ color: "#fff" }} />
                ) : (
                  <SendIcon sx={{ fontSize: 16 }} />
                )
              }
              sx={{
                bgcolor: "#22c55e",
                color: "#fff",
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 99,
                px: 2,
                boxShadow: "none",
                "&:hover": { bgcolor: "#1ebe5d", boxShadow: "none" },
              }}
            >
              Send
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* ── Rephrase dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={rephraseOpen}
        onClose={() => !rephraseLoading && setRephraseOpen(false)}
        fullWidth maxWidth="xs"
        PaperProps={{
          sx: {
            color: LIGHT.text, borderRadius: 3,
            border: `1px solid ${LIGHT.border}`, boxShadow: "0 24px 64px rgba(16,24,40,0.14)",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 17, fontWeight: 700, pb: 1, color: LIGHT.text, borderBottom: `1px solid ${LIGHT.border}` }}>
          ✨ Rephrase Message
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1.5}>
            <Autocomplete
              options={["professional", "friendly", "empathetic", "short", "formal"]}
              value={rephraseStyle}
              onChange={(_, v) => setRephraseStyle(v || "professional")}
              PaperComponent={({ children }) => <Box sx={{ bgcolor: LIGHT.inputBg, borderRadius: 2, border: `1px solid ${LIGHT.border}`, color: LIGHT.text }}>{children}</Box>}
              renderOption={(props, o) => <Box component="li" {...props} sx={{ fontSize: 13, color: LIGHT.text, textTransform: "capitalize", "&:hover": { bgcolor: "#f3f4f6 !important" } }}>{o}</Box>}
              renderInput={(params) => <TextField {...params} size="small" label="Style"
                sx={{ "& .MuiOutlinedInput-root": { bgcolor: LIGHT.inputBg, color: LIGHT.text, borderRadius: 2, "& fieldset": { borderColor: LIGHT.border }, "&.Mui-focused fieldset": { borderColor: "#22c55e" } }, "& label": { color: LIGHT.subtext }, "& label.Mui-focused": { color: "#22c55e" }, "& .MuiSvgIcon-root": { color: LIGHT.subtext } }} />}
            />
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={() => setRephraseOpen(false)} disabled={rephraseLoading}
                sx={{ textTransform: "none", color: LIGHT.subtext, "&:hover": { color: LIGHT.text } }}>Cancel</Button>
              <Button variant="contained" onClick={doRephrase} disabled={rephraseLoading}
                sx={{ bgcolor: "#22c55e", color: "#fff", textTransform: "none", borderRadius: 99, fontWeight: 600, boxShadow: "none", "&:hover": { bgcolor: "#1ebe5d" }, "&.Mui-disabled": { bgcolor: "#dbe4ea", color: LIGHT.subtext } }}>
                {rephraseLoading ? "Rephrasing…" : "Apply"}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <WhatsAppCartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        chatWidthPx={0}
        phone10={activeP10}
        leadName={activeHeaderTitle}
      />

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={hideToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={hideToast}
          severity={toast.severity}
          variant="filled"
          sx={{
            borderRadius: 99,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

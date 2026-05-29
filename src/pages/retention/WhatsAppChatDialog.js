
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
  InputAdornment,
  DialogContent,
  useMediaQuery,
  useTheme,
  Avatar,
  Stack,
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
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import axios from "axios";
import { io } from "socket.io-client";

import WhatsAppCartDrawer from "./WhatsAppCartDrawer";

const DEFAULT_API_BASE =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5001"
    : "https://muditamleads-14f32a10d7f7.herokuapp.com";
const API_BASE = String(
  process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE || DEFAULT_API_BASE
).replace(/\/+$/, "");
const SOCKET_URL = API_BASE;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const UI = {
  brand: "#25D366",
  brandDark: "#128C7E",
  brandSoft: "rgba(37,211,102,0.12)",
  blueRead: "#34B7F1",
  appBg: "#f6f8fb",
  headerBg: "rgba(255,255,255,0.88)",
  headerBorder: "rgba(15,23,42,0.08)",
  panelBg: "#efeae2",
  panelPattern:
    "url('https://cdn.shopify.com/s/files/1/0734/7155/7942/files/image_23.png?v=1776755371')",
  inboundBg: "#ffffff",
  outboundBg: "#dcf8c6",
  composerBg: "rgba(255,255,255,0.92)",
  surface: "#ffffff",
  border: "#e6ebf2",
  text: "#111827",
  subtext: "#6b7280",
  subtle: "#94a3b8",
  warningBg: "#fff9db",
  warningBorder: "#f6e58d",
  warningText: "#7a5b00",
};

const EMOJIS = ["😊", "😂", "🙏", "👍", "❤️", "🔥", "😄", "😅", "😇", "🤝", "😎", "🥳", "😢", "😡", "✅", "✨"];

const digitsOnly = (v = "") => String(v || "").replace(/\D/g, "");
const last10 = (v = "") => digitsOnly(v).slice(-10);
const buildTempId = (prefix = "tmp") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function fmtRemaining(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}h ${mm}m ${ss}s`;
}

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

function initials(nameOrPhone = "") {
  const s = String(nameOrPhone || "").trim();
  if (!s) return "U";
  if (/^\d+$/.test(s)) return s.slice(-2);
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function avatarColor(seed = "") {
  const colors = ["#00a884", "#1d4ed8", "#7c3aed", "#db2777", "#ea580c", "#0f766e"];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

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

function getHeaderMediaFormatFromTemplate(tpl) {
  const comps = Array.isArray(tpl?.components) ? tpl.components : [];
  const header = comps.find((c) => String(c?.type || "").toUpperCase() === "HEADER");
  const fmt = String(header?.format || "").toUpperCase();
  if (["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)) return fmt;
  return "";
}

function extractTemplateButtons(tpl) {
  const directButtons = Array.isArray(tpl?.templateMeta?.buttons)
    ? tpl.templateMeta.buttons
    : Array.isArray(tpl?.buttons)
    ? tpl.buttons
    : null;

  if (directButtons?.length) {
    return directButtons
      .map((button) => ({
        type: String(button?.type || "").trim().toUpperCase(),
        text: String(button?.text || button?.title || button?.label || "").trim(),
        url: String(button?.url || button?.href || "").trim(),
        phoneNumber: String(button?.phoneNumber || button?.phone_number || "").trim(),
        payload: String(button?.payload || button?.id || "").trim(),
      }))
      .filter((button) => button.type || button.text || button.url || button.phoneNumber || button.payload);
  }

  const comps = Array.isArray(tpl?.components) ? tpl.components : [];
  const buttonItems = [];

  comps.forEach((component) => {
    const type = String(component?.type || "").trim().toUpperCase();
    if (type !== "BUTTONS" && type !== "BUTTON") return;
    if (Array.isArray(component?.buttons) && component.buttons.length) {
      buttonItems.push(...component.buttons);
      return;
    }
    buttonItems.push(component);
  });

  return buttonItems
    .map((button) => ({
      type: String(button?.type || button?.sub_type || button?.buttonType || "").trim().toUpperCase(),
      text: String(button?.text || button?.title || button?.label || "").trim(),
      url: String(button?.url || button?.href || "").trim(),
      phoneNumber: String(button?.phoneNumber || button?.phone_number || button?.phone || button?.value || "").trim(),
      payload: String(button?.payload || button?.id || button?.value || "").trim(),
    }))
    .filter((button) => button.type || button.text || button.url || button.phoneNumber || button.payload);
}

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase().trim();
  if (["read", "seen"].includes(v)) return "read";
  if (["delivered", "deliver", "received"].includes(v)) return "delivered";
  if (["sent"].includes(v)) return "sent";
  if (["failed", "error"].includes(v)) return "failed";
  return v;
}

function statusRank(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "failed") return 99;
  if (normalized === "read") return 4;
  if (normalized === "delivered") return 3;
  if (normalized === "sent") return 2;
  if (normalized) return 1;
  return 0;
}

function inferOutgoingMediaType(file) {
  const mime = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|opus|m4a)$/i.test(name)) return "audio";
  return "document";
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
    return <DoneAllIcon sx={{ fontSize: 16, ml: 0.5, color: UI.blueRead, verticalAlign: "middle" }} />;
  }

  if (st === "delivered") {
    return <DoneAllIcon sx={{ fontSize: 16, ml: 0.5, color: "rgba(0,0,0,0.48)", verticalAlign: "middle" }} />;
  }

  return <DoneIcon sx={{ fontSize: 16, ml: 0.5, color: "rgba(0,0,0,0.48)", verticalAlign: "middle" }} />;
}

function customerPhoneFromMsg(msg) {
  const dir = String(msg?.direction || "").toUpperCase();
  if (dir === "OUTBOUND") return msg?.to || "";
  if (dir === "INBOUND") return msg?.from || "";
  return msg?.phone || msg?.to || msg?.from || "";
}

function getMsgKey(m) {
  return m?.waId || m?.providerTransactionId || m?.clientTempId || m?._id || m?.id || null;
}

function messageIdentity(m) {
  const clientTempId = String(m?.clientTempId || "").trim();
  if (clientTempId) return `tmp:${clientTempId}`;

  const waId = String(m?.waId || "").trim();
  if (waId) return `wa:${waId}`;

  const providerTxnId = String(m?.providerTransactionId || "").trim();
  if (providerTxnId) return `txn:${providerTxnId}`;

  const dbId = String(m?._id || m?.id || "").trim();
  if (dbId) return dbId.startsWith("tmp_") ? `tmp:${dbId}` : `id:${dbId}`;

  const dir = String(m?.direction || "").toUpperCase();
  const from = last10(m?.from || "");
  const to = last10(m?.to || "");
  const phone = last10(customerPhoneFromMsg(m) || "");
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
  const aClientTempId = String(a?.clientTempId || a?._id || "").trim();
  const bClientTempId = String(b?.clientTempId || b?._id || "").trim();
  if (
    aClientTempId &&
    bClientTempId &&
    (aClientTempId.startsWith("tmp_") || bClientTempId.startsWith("tmp_")) &&
    aClientTempId === bClientTempId
  ) {
    return true;
  }

  const aWa = String(a?.waId || "").trim();
  const bWa = String(b?.waId || "").trim();
  if (aWa && bWa && aWa === bWa) return true;

  const aTxn = String(a?.providerTransactionId || "").trim();
  const bTxn = String(b?.providerTransactionId || "").trim();
  if (aTxn && bTxn && aTxn === bTxn) return true;

  const aId = String(a?._id || a?.id || "").trim();
  const bId = String(b?._id || b?.id || "").trim();
  if (aId && bId && !aId.startsWith("tmp_") && !bId.startsWith("tmp_") && aId === bId) return true;

  const aDir = String(a?.direction || "").toUpperCase();
  const bDir = String(b?.direction || "").toUpperCase();
  if (aDir !== bDir) return false;

  const aType = String(a?.type || "text").toLowerCase();
  const bType = String(b?.type || "text").toLowerCase();
  if (aType !== bType) return false;

  if (String(a?.text || "").trim() !== String(b?.text || "").trim()) return false;

  const aPhone = last10(customerPhoneFromMsg(a) || "");
  const bPhone = last10(customerPhoneFromMsg(b) || "");
  if (!aPhone || !bPhone || aPhone !== bPhone) return false;

  const aMediaId = String(a?.media?.id || "").trim();
  const bMediaId = String(b?.media?.id || "").trim();
  if (aMediaId && bMediaId && aMediaId !== bMediaId) return false;

  const aMediaUrl = String(a?.media?.url || "").trim();
  const bMediaUrl = String(b?.media?.url || "").trim();
  if (aMediaUrl && bMediaUrl && aMediaUrl !== bMediaUrl) return false;

  const aIsTemp = String(a?._id || "").startsWith("tmp_");
  const bIsTemp = String(b?._id || "").startsWith("tmp_");
  const aTs = new Date(a?.timestamp || a?.createdAt || 0).getTime();
  const bTs = new Date(b?.timestamp || b?.createdAt || 0).getTime();

  if (!aTs || !bTs) return aIsTemp || bIsTemp;

  const delta = Math.abs(aTs - bTs);
  if (aIsTemp || bIsTemp) return delta <= 120000;
  return delta <= 2000;
}

function getMsgTime(m) {
  const t = m?.timestamp || m?.createdAt;
  const ms = t ? new Date(t).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function upsertMessage(prev, incoming) {
  if (!incoming) return prev;
  const key = getMsgKey(incoming);
  const identity = messageIdentity(incoming);
  const idx = prev.findIndex((x) => {
    const existingKey = getMsgKey(x);
    if (key && existingKey && existingKey === key) return true;
    if (messageIdentity(x) === identity) return true;
    return isLikelySameMessage(x, incoming);
  });

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

function isNearBottom(el, thresholdPx = 140) {
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
}

function statusPillText(privateMode, canSendFreeform, remainingMs) {
  if (privateMode) return "Private Reply mode";
  if (canSendFreeform && remainingMs != null) return `Conversation window closes in ${fmtRemaining(remainingMs)}`;
  return "Session expired — only templates allowed";
}

function ActionPill({
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
          startIcon={loading ? <CircularProgress size={14} /> : icon}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            px: 1.2,
            py: 0.65,
            minWidth: 0,
            fontWeight: 800,
            fontSize: 12,
            color: UI.text,
            bgcolor: "#fff",
            border: `1px solid ${UI.border}`,
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
            "&:hover": { bgcolor: "#f8fafc", borderColor: "#d8e1ec" },
          }}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
}

function AttachmentPreviewDialog({
  open,
  pendingFile,
  setPendingFile,
  onClose,
  onSend,
  sending,
}) {
  const previewUrl = pendingFile?.previewUrl || "";
  const mime = String(pendingFile?.type || "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");

  return (
    <Dialog open={open} onClose={() => !sending && onClose()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>Preview attachment</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            borderRadius: 3,
            border: `1px solid ${UI.border}`,
            bgcolor: "#f8fafc",
            p: 2,
          }}
        >
          {isImage ? (
            <Box
              component="img"
              src={previewUrl}
              alt={pendingFile?.file?.name || "attachment"}
              sx={{ width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 2 }}
            />
          ) : isVideo ? (
            <video
              controls
              src={previewUrl}
              style={{ width: "100%", maxHeight: 320, borderRadius: 12, background: "#000" }}
            />
          ) : isAudio ? (
            <audio controls src={previewUrl} style={{ width: "100%" }} />
          ) : (
            <Stack direction="row" spacing={1.25} alignItems="center">
              <DescriptionOutlinedIcon />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                  {pendingFile?.file?.name || "attachment"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(pendingFile?.file?.size || 0) > 0
                    ? `${Math.round((pendingFile.file.size / 1024 / 1024) * 100) / 100} MB`
                    : "Document"}
                </Typography>
              </Box>
            </Stack>
          )}
        </Box>

        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          label="Caption (optional)"
          value={pendingFile?.caption || ""}
          onChange={(e) =>
            setPendingFile((prev) => (prev ? { ...prev, caption: e.target.value } : prev))
          }
          sx={{ mt: 2 }}
        />
      </DialogContent>

      <Box sx={{ p: 1.25, display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={sending} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSend}
          disabled={sending || !pendingFile?.file}
          startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
          sx={{ textTransform: "none", fontWeight: 900 }}
        >
          {sending ? "Sending..." : "Send"}
        </Button>
      </Box>
    </Dialog>
  );
}

function MediaPreviewDialog({ media, onClose }) {
  return (
    <Dialog
      open={!!media}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          bgcolor: "rgba(17, 24, 39, 0.96)",
          backgroundImage: "none",
          color: "#fff",
          boxShadow: "none",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#fff" }} noWrap>
          {media?.filename || (media?.kind === "video" ? "Video" : "Image")}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: { xs: 320, md: 560 },
          bgcolor: "transparent",
        }}
      >
        {media?.kind === "image" ? (
          <Box
            component="img"
            src={media?.url || ""}
            alt={media?.filename || "preview"}
            sx={{
              maxWidth: "100%",
              maxHeight: "78vh",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : media?.kind === "video" ? (
          <Box
            component="video"
            src={media?.url || ""}
            controls
            autoPlay
            playsInline
            sx={{
              maxWidth: "100%",
              maxHeight: "78vh",
              backgroundColor: "#000",
              display: "block",
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
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
  const chatWidthPx = isMdUp ? 660 : isSmUp ? 560 : 0;

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [text, setText] = useState("");

  const [lastInboundAt, setLastInboundAt] = useState(null);
  const [windowExpiresAt, setWindowExpiresAt] = useState(null);
  const [tick, setTick] = useState(0);

  const [quickAnchor, setQuickAnchor] = useState(null);
  const [tplAnchor, setTplAnchor] = useState(null);
  const [tplSearch, setTplSearch] = useState("");
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [privateMode, setPrivateMode] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);
  const [helpWriteLoading, setHelpWriteLoading] = useState(false);

  const [rephraseOpen, setRephraseOpen] = useState(false);
  const [rephraseStyle, setRephraseStyle] = useState("professional");
  const [rephraseLoading, setRephraseLoading] = useState(false);

  const [pendingFile, setPendingFile] = useState(null);
  const [attachmentSending, setAttachmentSending] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);

  const fileRef = useRef(null);
  const listRef = useRef(null);

  const socketRef = useRef(null);
  const joinedPhoneRef = useRef(null);

  const didInitialScrollRef = useRef(false);
  const stickToBottomRef = useRef(true);

  const phone10 = useMemo(() => last10(phone), [phone]);

  const inboundExpiryMs = useMemo(() => {
    if (lastInboundAt) {
      const t = new Date(lastInboundAt).getTime();
      if (Number.isFinite(t) && t > 0) return t + 24 * 60 * 60 * 1000;
    }

    if (windowExpiresAt) {
      const w = new Date(windowExpiresAt).getTime();
      if (Number.isFinite(w) && w > 0) return w;
    }

    return null;
  }, [lastInboundAt, windowExpiresAt]);

  const remainingMs = useMemo(() => {
    void tick;
    return inboundExpiryMs ? inboundExpiryMs - Date.now() : null;
  }, [inboundExpiryMs, tick]);

  const canSendFreeform = useMemo(() => {
    if (remainingMs == null) return false;
    return remainingMs > 0;
  }, [remainingMs]);

  const templateOnlyMode = !privateMode && !canSendFreeform;

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

  const utilityTemplates = useMemo(() => {
    return (templates || []).filter((t) => String(t?.category || "").toUpperCase() === "UTILITY");
  }, [templates]);

  const filteredUtilityTemplates = useMemo(() => {
    const q = tplSearch.trim().toLowerCase();
    if (!q) return utilityTemplates;
    return utilityTemplates.filter((t) => {
      const hay = [t?.name, t?.language, t?.status, extractTemplateBodyText(t)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [utilityTemplates, tplSearch]);

  const [tplComposeOpen, setTplComposeOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [tplVars, setTplVars] = useState([]);
  const [tplSending, setTplSending] = useState(false);

  const [tplHeaderFmt, setTplHeaderFmt] = useState("");
  const [tplHeaderFile, setTplHeaderFile] = useState(null);
  const [tplHeaderUploadLoading, setTplHeaderUploadLoading] = useState(false);
  const [tplHeaderMediaId, setTplHeaderMediaId] = useState("");
  const [tplHeaderMediaUrl, setTplHeaderMediaUrl] = useState("");

  const scrollToBottomSoon = useCallback((behavior = "auto") => {
    const el = listRef.current;
    if (!el) return;

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

    setTimeout(doScroll, 120);
    setTimeout(doScroll, 320);
  }, []);

  const fetchConversationMeta = useCallback(async () => {
    const res = await api.get(`/api/whatsapp/conversations`, {
      params: { phone: phone10 },
    });
    const list = Array.isArray(res.data) ? res.data : [];
    const found = list.find((c) => last10(c.phone) === phone10);

    if (found?.windowExpiresAt) setWindowExpiresAt(found.windowExpiresAt);
    if (found?.lastInboundAt) setLastInboundAt(found.lastInboundAt);
  }, [phone10]);

  const fetchMessages = useCallback(async () => {
    if (!phone10) return;
    const res = await api.get(`/api/whatsapp/messages`, { params: { phone: phone10 } });
    const list = Array.isArray(res.data) ? res.data : [];
    setMessages(list);

    const lastInbound = [...list].reverse().find(
      (m) => String(m.direction || "").toUpperCase() !== "OUTBOUND"
    );
    if (lastInbound?.timestamp || lastInbound?.createdAt) {
      setLastInboundAt(lastInbound.timestamp || lastInbound.createdAt);
    }
  }, [phone10]);

  const fetchTemplates = useCallback(async () => {
    const res = await api.get(`/api/whatsapp/templates`);
    setTemplates(Array.isArray(res.data) ? res.data : []);
  }, []);

  const refreshAll = useCallback(async ({ includeTemplates = false } = {}) => {
    if (!phone10) return;
    setLoading(true);
    try {
      const jobs = [fetchConversationMeta(), fetchMessages()];
      if (includeTemplates) jobs.push(fetchTemplates());
      await Promise.all(jobs);
    } finally {
      setLoading(false);
      if (open) {
        stickToBottomRef.current = true;
        scrollToBottomSoon("auto");
      }
    }
  }, [phone10, fetchConversationMeta, fetchMessages, fetchTemplates, open, scrollToBottomSoon]);

  useEffect(() => {
    if (!open) return;
    if (!phone10) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
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
      const p10 =
        last10(payload?.phone10 || payload?.phone || "") ||
        last10(customerPhoneFromMsg(msg) || "");
      if (p10 && p10 !== phone10) return;

      const normalizedMsg = {
        ...msg,
        ...(customerPhoneFromMsg(msg) ? { phone: customerPhoneFromMsg(msg) } : {}),
      };

      setMessages((prev) => upsertMessage(prev, normalizedMsg));

      if (String(normalizedMsg?.direction || "").toUpperCase() !== "OUTBOUND") {
        if (normalizedMsg?.timestamp || normalizedMsg?.createdAt) {
          setLastInboundAt(normalizedMsg.timestamp || normalizedMsg.createdAt);
        }
      }

      if (stickToBottomRef.current) {
        scrollToBottomSoon("auto");
      }
    };

    const onWaStatus = (payload) => {
      const liveIds = [
        payload?.waId,
        payload?.id,
        payload?.messageId,
        payload?.message_id,
        payload?.providerTransactionId,
        payload?.transactionId,
        payload?.transaction_id,
      ]
        .map((x) => String(x || "").trim())
        .filter(Boolean);
      const status = normalizeStatus(payload?.status);
      const p10 = last10(payload?.phone10 || payload?.phone || "");
      if (p10 && p10 !== phone10) return;
      if (!liveIds.length || !status) return;

      setMessages((prev) => {
        return prev.map((m) => {
          const waId = String(m?.waId || "").trim();
          const providerTransactionId = String(m?.providerTransactionId || "").trim();
          if (liveIds.includes(waId) || liveIds.includes(providerTransactionId)) {
            if (status !== "failed" && statusRank(m?.status) > statusRank(status)) {
              return m;
            }
            return { ...m, status };
          }
          return m;
        });
      });
    };

    const onWaConversation = (payload) => {
      const p10 = last10(payload?.phone10 || payload?.phone || "");
      if (p10 && p10 !== phone10) return;

      const patch = payload?.patch || payload || {};
      if (patch?.windowExpiresAt) setWindowExpiresAt(patch.windowExpiresAt);
      if (patch?.lastInboundAt) setLastInboundAt(patch.lastInboundAt);
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

  useEffect(() => {
    if (!open) return;

    didInitialScrollRef.current = false;
    stickToBottomRef.current = true;

    setMessages([]);
    setText("");
    setPrivateMode(false);

    setTplComposeOpen(false);
    setActiveTemplate(null);
    setTplVars([]);
    setTplSending(false);

    setTplHeaderFmt("");
    setTplHeaderFile(null);
    setTplHeaderMediaId("");
    setTplHeaderMediaUrl("");
    setTplHeaderUploadLoading(false);

    setPendingFile(null);
    setAttachmentSending(false);

    refreshAll({ includeTemplates: true });

    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [open, phone10, refreshAll]);

  useEffect(() => {
    if (!open || !phone10) return;
    const syncVisibleData = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      refreshAll();
    };
    window.addEventListener("focus", syncVisibleData);
    document.addEventListener("visibilitychange", syncVisibleData);
    return () => {
      window.removeEventListener("focus", syncVisibleData);
      document.removeEventListener("visibilitychange", syncVisibleData);
    };
  }, [open, phone10, refreshAll]);

  useEffect(() => {
    if (!open) setCartOpen(false);
  }, [open]);

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

    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

    return keys.map((k) => ({
      key: k,
      label: formatDayLabel(k),
      items: (map.get(k) || [])
        .slice()
        .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)),
    }));
  }, [messages]);

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

    if (!canSendFreeform) {
      alert("WhatsApp session expired. You can only send templates until customer replies.");
      return;
    }

    const optimisticId = buildTempId("tmp_text");
    const optimisticMessage = {
      _id: optimisticId,
      direction: "OUTBOUND",
      type: "text",
      text: body,
      status: "sent",
      to: phone10,
      timestamp: new Date().toISOString(),
    };

    setText("");
    setMessages((prev) => upsertMessage(prev, optimisticMessage));
    stickToBottomRef.current = true;
    scrollToBottomSoon("auto");

    try {
      await api.post(`/api/whatsapp/send-text`, {
        to: phone10,
        text: body,
      });
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m?._id === optimisticId ? { ...m, status: "failed" } : m))
      );
      setText(body);
      const code = e?.response?.data?.code;
      if (code === "SESSION_EXPIRED") alert("Session expired. Please use a template message.");
      else alert("Failed to send message.");
    }
  };

  const closePendingFile = useCallback(() => {
    setPendingFile((prev) => {
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
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Max attachment size is 15MB.");
      return;
    }

    if (privateMode) {
      alert("Attachments are disabled in Private Reply.");
      return;
    }

    if (templateOnlyMode) {
      alert("Session expired. Attachments are disabled. Send a template instead.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingFile({
      file,
      previewUrl,
      type: file.type || "application/octet-stream",
      caption: "",
    });
  };

  const sendPendingFile = async () => {
    if (!pendingFile?.file) return;

    const optimisticId = buildTempId("tmp_media");

    setAttachmentSending(true);
    try {
      const mediaType = inferOutgoingMediaType(pendingFile.file);
      const optimisticMessage = {
        _id: optimisticId,
        direction: "OUTBOUND",
        type: mediaType,
        text: String(pendingFile.caption || "").trim(),
        status: "sent",
        to: phone10,
        phone: phone10,
        timestamp: new Date().toISOString(),
        media: {
          url: pendingFile.previewUrl,
          mime: pendingFile.type || pendingFile.file.type || "application/octet-stream",
          filename: pendingFile.file.name || "attachment",
        },
      };

      setMessages((prev) => upsertMessage(prev, optimisticMessage));
      stickToBottomRef.current = true;
      scrollToBottomSoon("auto");

      const fd = new FormData();
      fd.append("to", phone10);
      fd.append("file", pendingFile.file);
      if (pendingFile.caption?.trim()) fd.append("caption", pendingFile.caption.trim());

      await api.post(`/api/whatsapp/send-media`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      closePendingFile();
      stickToBottomRef.current = true;
      scrollToBottomSoon("auto");
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m?._id || "") !== optimisticId) return m;
          return { ...m, status: "failed" };
        })
      );
      alert("Failed to send attachment.");
    } finally {
      setAttachmentSending(false);
    }
  };

  const insertEmoji = (emo) => setText((t) => t + emo);

  async function uploadTemplateHeaderMedia(file) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await api.post(`/api/whatsapp/upload-template-media`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r?.data;
  }

  const openTemplateComposer = (tpl) => {
    const bodyText = extractTemplateBodyText(tpl);
    const count = extractPlaceholderCount(bodyText);

    setActiveTemplate(tpl);
    setTplVars(Array.from({ length: count }, () => ""));
    setTplComposeOpen(true);
    setTplSending(false);

    const fmt = getHeaderMediaFormatFromTemplate(tpl);
    setTplHeaderFmt(fmt);
    setTplHeaderFile(null);
    setTplHeaderMediaId("");
    setTplHeaderMediaUrl("");
    setTplHeaderUploadLoading(false);
  };

  const templateBodyText = useMemo(() => extractTemplateBodyText(activeTemplate), [activeTemplate]);

  const templatePreview = useMemo(() => {
    if (!activeTemplate) return "";
    if (templateBodyText) return applyTemplateVars(templateBodyText, tplVars);
    return "";
  }, [activeTemplate, templateBodyText, tplVars]);

  function absolutizeUrl(url = "") {
    const u = String(url || "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("/")) return `${API_BASE}${u}`;
    return `${API_BASE}/${u}`;
  }

  function isProviderUrl(url = "") {
    return /360dialog\.io|graph\.facebook\.com|lookaside\.facebook\.com|fbcdn\.net|facebook\.com/i.test(
      String(url || "")
    );
  }

  const renderMedia = (m) => {
    const mediaId = String(m?.media?.id || m?.mediaId || m?.templateMeta?.headerMedia?.id || "").trim();
    const directUrl = String(m?.media?.url || m?.mediaUrl || m?.templateMeta?.headerMedia?.url || "").trim();
    const rawUrl = directUrl || (/^https?:\/\//i.test(mediaId) ? mediaId : "");

    const absRawUrl = rawUrl ? absolutizeUrl(rawUrl) : "";
    const url =
      !absRawUrl || isProviderUrl(absRawUrl)
        ? mediaId
          ? `${API_BASE}/api/whatsapp/media-proxy/${encodeURIComponent(mediaId)}`
          : ""
        : absRawUrl;

    if (!url) return null;

    const rawMime = m?.media?.mime || m?.media?.mimetype || m?.mime || m?.mediaMime || "";
    const mime = String(rawMime).toLowerCase();

    const msgType = String(m?.type || m?.messageType || m?.media?.type || m?.mediaType || "").toLowerCase();
    const filename = String(
      m?.templateMeta?.headerMedia?.filename ||
      m?.media?.filename ||
      m?.filename ||
      ""
    ).toLowerCase();

    const isImg =
      msgType === "image" ||
      mime.startsWith("image/") ||
      /\.(png|jpg|jpeg|webp|gif)$/i.test(url) ||
      /\.(png|jpg|jpeg|webp|gif)$/i.test(filename);

    const isAudio =
      msgType === "audio" ||
      msgType === "voice" ||
      msgType === "ptt" ||
      mime.startsWith("audio/") ||
      mime.startsWith("application/ogg") ||
      mime.includes("ogg") ||
      /\.(mp3|wav|ogg|opus|m4a)$/i.test(url) ||
      /\.(mp3|wav|ogg|opus|m4a)$/i.test(filename);

    const isVideo =
      msgType === "video" ||
      mime.startsWith("video/") ||
      /\.(mp4|webm|mov)$/i.test(url) ||
      /\.(mp4|webm|mov)$/i.test(filename);

    const isPdf = mime.includes("pdf") || /\.pdf$/i.test(url) || /\.pdf$/i.test(filename);

    if (isImg) {
      return (
        <Box sx={{ mt: 0.9 }}>
          <Box
            component="img"
            src={url}
            alt="attachment"
            sx={{
              width: 230,
              maxWidth: "100%",
              borderRadius: 2,
              border: "1px solid rgba(0,0,0,0.06)",
              display: "block",
              cursor: "pointer",
            }}
            onLoad={() => stickToBottomRef.current && scrollToBottomSoon("auto")}
            onClick={() => setMediaPreview({ kind: "image", url, mime, filename })}
          />
        </Box>
      );
    }

    if (isAudio) {
      const typeAttr = mime && mime !== "application/octet-stream" ? mime : undefined;
      return (
        <Box sx={{ mt: 0.9 }}>
          <audio
            controls
            preload="none"
            style={{ width: "260px", maxWidth: "100%" }}
            onLoadedMetadata={() => stickToBottomRef.current && scrollToBottomSoon("auto")}
          >
            <source src={url} type={typeAttr} />
          </audio>
        </Box>
      );
    }

    if (isVideo) {
      return (
        <Box sx={{ mt: 0.9 }}>
          <video
            controls
            preload="metadata"
            src={url}
            style={{
              width: "260px",
              maxWidth: "100%",
              borderRadius: "12px",
              border: "1px solid rgba(0,0,0,0.08)",
              cursor: "pointer",
            }}
            onClick={() => setMediaPreview({ kind: "video", url, mime, filename })}
            onLoadedMetadata={() => stickToBottomRef.current && scrollToBottomSoon("auto")}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 0.9 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          sx={{ textTransform: "none", borderRadius: 999 }}
        >
          {isPdf ? "Open PDF" : "Open attachment"}
        </Button>
      </Box>
    );
  };

  const renderTemplateButtons = (m) => {
    const buttons = extractTemplateButtons(m);
    if (!buttons.length) return null;

    return (
      <Stack spacing={0.75} sx={{ mt: 1 }}>
        {buttons.map((button, index) => {
          const type = String(button?.type || "").toUpperCase();
          const label =
            button?.text ||
            (type === "URL"
              ? button?.url
              : type === "PHONE_NUMBER"
              ? button?.phoneNumber
              : button?.payload) ||
            `Button ${index + 1}`;

          return (
            <Button
              key={`${type || "button"}_${index}_${label}`}
              size="small"
              variant="outlined"
              disabled
              fullWidth
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                borderRadius: 2,
                color: UI.brandDark,
                borderColor: "rgba(18,140,126,0.25)",
                bgcolor: "rgba(37,211,102,0.06)",
                "&.Mui-disabled": {
                  color: UI.brandDark,
                  borderColor: "rgba(18,140,126,0.2)",
                },
              }}
            >
              {label}
            </Button>
          );
        })}
      </Stack>
    );
  };

  const helpMeWrite = async () => {
    if (!phone10) return;
    if (privateMode) {
      alert("Help me write is disabled in Private Reply.");
      return;
    }
    if (templateOnlyMode) {
      alert("Session expired. You can only send templates until customer replies.");
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

      const r = await api.post(`/api/whatsapp/help-me-write`, {
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
    } catch {
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
    if (templateOnlyMode) {
      alert("Session expired. You can only send templates until customer replies.");
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
      const r = await api.post(`/api/whatsapp/rephrase`, {
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
    } catch {
      alert("Rephrase failed.");
    } finally {
      setRephraseLoading(false);
    }
  };

  const templateOptions = useMemo(
    () =>
      utilityTemplates.slice().sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""))),
    [utilityTemplates]
  );

  const sendTemplate = async (tpl, vars = [], renderedPreview = "", header = null) => {
    const optimisticId = buildTempId("tmp_tpl");
    const templateButtons = extractTemplateButtons(tpl);
    const optimisticMessage = {
      _id: optimisticId,
      direction: "OUTBOUND",
      type: "template",
      text: renderedPreview || `[TEMPLATE] ${tpl?.name || ""}`.trim(),
      status: "sent",
      to: phone10,
      phone: phone10,
      timestamp: new Date().toISOString(),
      ...(header?.url
        ? {
            media: {
              url: header.url,
              mime: header.mime || "",
              filename: header.filename || "attachment",
            },
          }
        : {}),
      templateMeta: {
        name: tpl?.name || "",
        language: tpl?.language || "",
        parameters: (vars || []).map((x) => String(x ?? "")),
        buttons: templateButtons,
        ...(header
          ? {
              headerMedia: {
                format: header.format || "",
                id: header.id || "",
                url: header.url || "",
                mime: header.mime || "",
                filename: header.filename || "",
              },
            }
          : {}),
      },
    };

    setMessages((prev) => upsertMessage(prev, optimisticMessage));
    stickToBottomRef.current = true;
    scrollToBottomSoon("auto");

    try {
      await api.post(`/api/whatsapp/send-template`, {
        to: phone10,
        templateName: tpl.name,
        parameters: (vars || []).map((x) => String(x ?? "")),
        renderedText: renderedPreview || "",
        ...(header ? { headerMedia: header } : {}),
      });
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m?._id === optimisticId ? { ...m, status: "failed" } : m))
      );
      const msg = e?.response?.data?.message || "Template send failed.";
      alert(msg);
      throw e;
    }
  };

  const bannerText = useMemo(() => {
    return statusPillText(privateMode, canSendFreeform, remainingMs);
  }, [privateMode, canSendFreeform, remainingMs]);

  return (
    <>
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
        ModalProps={{
          keepMounted: true,
          disableAutoFocus: true,
          disableEnforceFocus: true,
        }}
        SlideProps={{
          onEntered: () => {
            stickToBottomRef.current = true;
            scrollToBottomSoon("auto");
          },
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 560, md: 660 },
            maxWidth: "100vw",
            display: "flex",
            flexDirection: "column",
            bgcolor: UI.appBg,
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(246,248,251,0.96) 100%)",
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.4,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            position: "sticky",
            top: 0,
            zIndex: 5,
            backdropFilter: "blur(16px)",
            bgcolor: UI.headerBg,
            borderBottom: `1px solid ${UI.headerBorder}`,
          }}
        >
          <Avatar
            sx={{
              width: 42,
              height: 42,
              bgcolor: avatarColor(leadName || phone10),
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {initials(leadName || phone10)}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, color: UI.text, lineHeight: 1.15 }} noWrap>
              {leadName || "Customer"}
            </Typography>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Typography variant="caption" sx={{ color: UI.subtext }} noWrap>
                {phone10 || "—"}
              </Typography>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: open ? UI.brand : UI.subtle,
                  boxShadow: `0 0 0 4px ${UI.brandSoft}`,
                }}
              />
            </Stack>
          </Box>

          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Refresh chat">
              <span>
                <IconButton
                  onClick={async () => {
                    stickToBottomRef.current = true;
                    await refreshAll();
                  }}
                  disabled={loading}
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: "#fff",
                    border: `1px solid ${UI.border}`,
                    "&:hover": { bgcolor: "#f8fafc" },
                  }}
                >
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Cart / Order">
              <IconButton
                onClick={() => setCartOpen(true)}
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: "#fff",
                  border: `1px solid ${UI.border}`,
                  "&:hover": { bgcolor: "#f8fafc" },
                }}
              >
                <ShoppingCartIcon />
              </IconButton>
            </Tooltip>

            <IconButton
              onClick={onClose}
              sx={{
                width: 38,
                height: 38,
                bgcolor: "#fff",
                border: `1px solid ${UI.border}`,
                "&:hover": { bgcolor: "#f8fafc" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            mx: 2,
            mt: 1.25,
            mb: 1,
            px: 1.25,
            py: 0.95,
            borderRadius: 2.5,
            bgcolor: UI.warningBg,
            border: `1px solid ${UI.warningBorder}`,
            display: "flex",
            alignItems: "center",
            gap: 1,
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          {privateMode ? (
            <LockOutlinedIcon sx={{ fontSize: 18, color: UI.warningText }} />
          ) : (
            <AccessTimeIcon sx={{ fontSize: 18, color: UI.warningText }} />
          )}
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: UI.warningText }}>
            {bannerText}
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 1.5,
            py: 1.5,
            bgcolor: UI.panelBg,
            backgroundImage: UI.panelPattern,
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
          ref={listRef}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.34) 45%, rgba(255,255,255,0.22) 100%)",
              pointerEvents: "none",
            }}
          />

          <Box sx={{ position: "relative", zIndex: 1 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : messages.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  maxWidth: 340,
                  mx: "auto",
                  mt: 8,
                  p: 2.25,
                  textAlign: "center",
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.86)",
                  border: `1px solid ${UI.border}`,
                  backdropFilter: "blur(8px)",
                }}
              >
                <WhatsAppIcon sx={{ color: UI.brand, fontSize: 34, mb: 1 }} />
                <Typography sx={{ fontWeight: 900, color: UI.text }}>No messages yet</Typography>
                <Typography variant="body2" sx={{ color: UI.subtext, mt: 0.5 }}>
                  Start the conversation or send a template to this contact.
                </Typography>
              </Paper>
            ) : (
              grouped.map((g) => (
                <Box key={g.key} sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 1.25 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.4,
                        py: 0.55,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.78)",
                        bgcolor: "rgba(255,255,255,0.72)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 4px 18px rgba(15,23,42,0.06)",
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>
                        {g.label}
                      </Typography>
                    </Paper>
                  </Box>

                  {g.items.map((m, idx) => {
                    const outbound = String(m.direction || "").toUpperCase() === "OUTBOUND";
                    const hm = formatHM(m.timestamp || m.createdAt);

                    return (
                      <Box
                        key={m._id || m.waId || m.providerTransactionId || `${g.key}-${idx}`}
                        sx={{
                          display: "flex",
                          justifyContent: outbound ? "flex-end" : "flex-start",
                          mb: 1,
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            maxWidth: "79%",
                            px: 1.35,
                            py: 0.9,
                            borderRadius: outbound ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
                            bgcolor: outbound ? UI.outboundBg : UI.inboundBg,
                            border: "1px solid rgba(15,23,42,0.05)",
                            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                          }}
                        >
                          {!!m.text && (
                            <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap", color: UI.text, lineHeight: 1.45 }}>
                              {m.text}
                            </Typography>
                          )}

                          {renderMedia(m)}
                          {String(m?.type || "").toLowerCase() === "template" && renderTemplateButtons(m)}

                          <Box
                            sx={{
                              mt: 0.55,
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: 0.25,
                            }}
                          >
                            <Typography variant="caption" sx={{ color: "rgba(17,24,39,0.58)" }}>
                              {hm}
                            </Typography>
                            {outbound && <MessageTicks status={m.status} />}
                          </Box>
                        </Paper>
                      </Box>
                    );
                  })}
                </Box>
              ))
            )}
          </Box>
        </Box>

        <Divider />

        {templateOnlyMode ? (
          <Box
            sx={{
              p: 1.5,
              bgcolor: UI.composerBg,
              backdropFilter: "blur(12px)",
              borderTop: `1px solid ${UI.border}`,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(e) => {
                setTplSearch("");
                setTplAnchor(e.currentTarget);
              }}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 900,
                py: 1.2,
                boxShadow: "none",
              }}
            >
              Send Template
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Free-form messages will unlock after the customer replies.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              p: 1.5,
              bgcolor: UI.composerBg,
              backdropFilter: "blur(12px)",
              borderTop: `1px solid ${UI.border}`,
            }}
          >
            {privateMode ? (
              <Box sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: UI.text }}>Reply Privately</Typography>
                  <Chip
                    label="Private Reply"
                    onDelete={() => setPrivateMode(false)}
                    variant="outlined"
                    sx={{ fontWeight: 900 }}
                  />
                </Stack>
              </Box>
            ) : null}

            <TextField
              fullWidth
              placeholder={privateMode ? "Type your private reply here" : "Type your message here"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing) {
                  e.preventDefault();
                  sendText();
                }
              }}
              multiline
              minRows={2}
              maxRows={5}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2.25,
                  bgcolor: "#fff",
                  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                },
              }}
            />

            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              mt={1}
              flexWrap="wrap"
              useFlexGap
            >
              <ActionPill
                title="Private Reply"
                label="Private Reply"
                icon={<LockOutlinedIcon sx={{ fontSize: 17 }} />}
                onClick={() => setPrivateMode((v) => !v)}
              />

              <ActionPill
                title="Quick Replies"
                label="Quick reply"
                icon={<FlashOnIcon sx={{ fontSize: 17 }} />}
                onClick={(e) => setQuickAnchor(e.currentTarget)}
              />

              <ActionPill
                title="Templates"
                label="Templates"
                icon={<ViewListIcon sx={{ fontSize: 17 }} />}
                onClick={(e) => {
                  setTplSearch("");
                  setTplAnchor(e.currentTarget);
                }}
              />

              <ActionPill
                title={privateMode ? "Disabled in Private Reply" : "Attachment"}
                label="Attach File"
                icon={<AttachFileIcon sx={{ fontSize: 17 }} />}
                onClick={() => fileRef.current?.click()}
                disabled={privateMode}
              />
              <input ref={fileRef} type="file" hidden onChange={(e) => onPickFile(e.target.files?.[0])} />

              <ActionPill
                title="Emoji"
                label="Emojis"
                icon={<InsertEmoticonIcon sx={{ fontSize: 17 }} />}
                onClick={(e) => setEmojiAnchor(e.currentTarget)}
              />

              <ActionPill
                title={privateMode ? "Disabled in Private Reply" : "Help me write"}
                label="AI Write"
                icon={<AutoFixHighIcon sx={{ fontSize: 17 }} />}
                onClick={helpMeWrite}
                disabled={privateMode || helpWriteLoading}
                loading={helpWriteLoading}
              />

              <ActionPill
                title={privateMode ? "Disabled in Private Reply" : "Rephrase"}
                label="Rephrase"
                icon={<AutorenewIcon sx={{ fontSize: 17 }} />}
                onClick={openRephraseDialog}
                disabled={privateMode || !text.trim()}
              />

              <Box sx={{ ml: "auto" }}>
                <Button
                  variant="contained"
                  onClick={sendText}
                  disabled={!text.trim()}
                  startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    textTransform: "none",
                    borderRadius: 999,
                    px: 2.3,
                    py: 0.95,
                    fontWeight: 900,
                    boxShadow: "none",
                  }}
                >
                  Send
                </Button>
              </Box>
            </Stack>
          </Box>
        )}

        <Menu anchorEl={quickAnchor} open={Boolean(quickAnchor)} onClose={() => setQuickAnchor(null)}>
          {QUICK_REPLIES.map((q) => (
            <MenuItem
              key={q}
              onClick={() => {
                setText((t) => (t ? `${t}\n${q}` : q));
                setQuickAnchor(null);
              }}
            >
              {q}
            </MenuItem>
          ))}
        </Menu>

        <Menu
          anchorEl={tplAnchor}
          open={Boolean(tplAnchor)}
          onClose={() => {
            setTplAnchor(null);
            setTplSearch("");
          }}
          PaperProps={{ sx: { width: 390, overflow: "hidden", borderRadius: 2.5 } }}
          MenuListProps={{ disablePadding: true, autoFocusItem: false }}
        >
          <Box sx={{ p: 1, position: "sticky", top: 0, bgcolor: "#fff", zIndex: 1 }}>
            <TextField
              size="small"
              fullWidth
              autoFocus
              placeholder="Search templates…"
              value={tplSearch}
              onChange={(e) => setTplSearch(e.target.value)}
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

          <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
            {templateOptions.length === 0 ? (
              <MenuItem disabled>No UTILITY templates found</MenuItem>
            ) : filteredUtilityTemplates.length === 0 ? (
              <MenuItem disabled>No matching templates</MenuItem>
            ) : (
              filteredUtilityTemplates.map((t) => {
                const needsHeader = !!getHeaderMediaFormatFromTemplate(t);
                return (
                  <MenuItem
                    key={t._id || t.name}
                    onClick={() => {
                      setTplAnchor(null);
                      setTplSearch("");
                      openTemplateComposer(t);
                    }}
                    sx={{ alignItems: "flex-start", py: 1.2 }}
                  >
                    <Box sx={{ minWidth: 0, width: "100%" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography sx={{ fontWeight: 900 }} noWrap>
                          {t.name}
                        </Typography>
                        {needsHeader ? (
                          <Chip
                            size="small"
                            label="Attachment"
                            variant="outlined"
                            sx={{ ml: "auto", fontWeight: 900 }}
                          />
                        ) : null}
                      </Box>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {t.language || "en"} · {t.status || ""}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              })
            )}
          </Box>
        </Menu>

        <Menu
          anchorEl={emojiAnchor}
          open={Boolean(emojiAnchor)}
          onClose={() => setEmojiAnchor(null)}
          PaperProps={{ sx: { p: 1, borderRadius: 2.5 } }}
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

        <Dialog open={tplComposeOpen} onClose={() => !tplSending && setTplComposeOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontWeight: 900 }}>Template Preview</Typography>
            <Box sx={{ ml: "auto" }}>
              <IconButton disabled={tplSending} onClick={() => setTplComposeOpen(false)}>
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

            {tplHeaderFmt ? (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontWeight: 900, mb: 1 }}>
                  Attachment required (HEADER {tplHeaderFmt})
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    variant="outlined"
                    component="label"
                    sx={{ textTransform: "none", fontWeight: 900 }}
                    disabled={tplHeaderUploadLoading || tplSending}
                  >
                    Choose file
                    <input
                      type="file"
                      hidden
                      accept={
                        tplHeaderFmt === "IMAGE"
                          ? "image/*"
                          : tplHeaderFmt === "VIDEO"
                          ? "video/*"
                          : tplHeaderFmt === "DOCUMENT"
                          ? ".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          : "*/*"
                      }
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setTplHeaderFile(f);
                        setTplHeaderMediaId("");
                        setTplHeaderMediaUrl("");
                      }}
                    />
                  </Button>

                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {tplHeaderFile ? tplHeaderFile.name : "No file selected"}
                  </Typography>

                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (!tplHeaderFile) return;
                      if (tplHeaderFile.size > 15 * 1024 * 1024) {
                        alert("Max header media size is 15MB.");
                        return;
                      }

                      setTplHeaderUploadLoading(true);
                      try {
                        const data = await uploadTemplateHeaderMedia(tplHeaderFile);
                        const mediaId = String(data?.mediaId || data?.id || "").trim();
                        const mediaUrl = String(data?.url || "").trim();
                        if (!mediaId && !mediaUrl) {
                          alert("Upload succeeded but no media reference returned.");
                          return;
                        }
                        setTplHeaderMediaId(mediaId);
                        setTplHeaderMediaUrl(mediaUrl);
                      } catch (e) {
                        const msg = e?.response?.data?.message || "Header upload failed.";
                        alert(msg);
                      } finally {
                        setTplHeaderUploadLoading(false);
                      }
                    }}
                    disabled={!tplHeaderFile || tplHeaderUploadLoading || tplSending}
                    startIcon={tplHeaderUploadLoading ? <CircularProgress size={14} /> : null}
                    sx={{ textTransform: "none", fontWeight: 900 }}
                  >
                    Upload
                  </Button>

                  {tplHeaderMediaId || tplHeaderMediaUrl ? (
                    <Chip label="Uploaded" color="success" size="small" sx={{ fontWeight: 900 }} />
                  ) : null}
                </Box>

                {!tplHeaderMediaId && !tplHeaderMediaUrl ? (
                  <Typography variant="caption" sx={{ display: "block", mt: 1 }} color="text.secondary">
                    Upload is required before sending this template.
                  </Typography>
                ) : null}
              </Box>
            ) : null}

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

              {activeTemplate ? renderTemplateButtons(activeTemplate) : null}
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
                      disabled={tplSending}
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
          </DialogContent>

          <Box sx={{ p: 1.25, display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button
              variant="outlined"
              disabled={tplSending}
              onClick={() => setTplComposeOpen(false)}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              disabled={tplSending}
              startIcon={tplSending ? <CircularProgress size={14} color="inherit" /> : null}
              onClick={async () => {
                if (!activeTemplate) return;

                if (tplHeaderFmt && !tplHeaderMediaId && !tplHeaderMediaUrl) {
                  alert(`This template requires a HEADER ${tplHeaderFmt} attachment. Please upload first.`);
                  return;
                }

                const headerMedia =
                  tplHeaderFmt && (tplHeaderMediaId || tplHeaderMediaUrl)
                    ? {
                        format: tplHeaderFmt,
                        ...(tplHeaderMediaId ? { id: tplHeaderMediaId } : {}),
                        ...(tplHeaderMediaUrl ? { url: tplHeaderMediaUrl, mime: tplHeaderFile?.type || "" } : {}),
                        filename: tplHeaderFile?.name || "",
                      }
                    : null;

                setTplSending(true);
                try {
                  await sendTemplate(activeTemplate, tplVars, templatePreview, headerMedia);
                  setTplComposeOpen(false);
                } finally {
                  setTplSending(false);
                }
              }}
              sx={{ textTransform: "none", fontWeight: 900 }}
            >
              {tplSending ? "Sending..." : "Send Template"}
            </Button>
          </Box>
        </Dialog>

        <AttachmentPreviewDialog
          open={Boolean(pendingFile)}
          pendingFile={pendingFile}
          setPendingFile={setPendingFile}
          onClose={closePendingFile}
          onSend={sendPendingFile}
          sending={attachmentSending}
        />
        <MediaPreviewDialog media={mediaPreview} onClose={() => setMediaPreview(null)} />
      </Drawer>
    </>
  );
}

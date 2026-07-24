import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Tabs,
  Tab,
  Divider,
  Autocomplete,
  LinearProgress,
  TablePagination,
} from "@mui/material";
import {
  Edit as EditIcon,
  PlayCircle as PlayIcon,
  AutoFixHigh as MagicIcon,
  CheckCircle as CheckIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  OpenInNew as OpenInNewIcon,
  AttachFile as AttachIcon,
  Download as DownloadIcon,
  ChatBubbleOutline as CommentIcon,
  RestartAlt as ResetIcon,
  Search as SearchIcon,
  Link as LinkIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";
 
const API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/scripts`;
const EMP_API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/employees`;
const PRESIGN_API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/scripts/presign`;
const PRESIGN_DOWN_API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/scripts/presign-download`;

const MANAGER_ROLES = ["admin", "manager", "super-admin", "team-leader"];
const getCurrentUser = () => JSON.parse(sessionStorage.getItem("user") || "{}");
const isManagerRole = (role = "") =>
  MANAGER_ROLES.includes(String(role || "").toLowerCase());
const getAuthHeaders = () => ({});

async function getPresignedUrl(filename, contentType, authHeaders) {
  const params = new URLSearchParams({ filename, contentType });
  const res = await fetch(`${PRESIGN_API}?${params}`, {
    headers: authHeaders,
    credentials: "include",
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || `Presign failed: ${res.status}`);
  }
  return res.json();
}

function normalizeMediaContentType(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase().trim();

  if (type) return type;

  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".avi")) return "video/x-msvideo";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mkv")) return "video/x-matroska";
  if (name.endsWith(".m4v")) return "video/x-m4v";

  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";

  return "application/octet-stream";
}

function uploadDirectToWasabi(file, presignedUrl, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Wasabi upload failed: HTTP ${xhr.status}`))
    );

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("PUT", presignedUrl);

    if (contentType && contentType !== "application/octet-stream") {
      xhr.setRequestHeader("Content-Type", contentType);
    }

    xhr.send(file);
  });
}

function normalizeScriptText(raw = "") {
  let s = String(raw || "");
  if (!s) return "";

  const hasHtml =
    /<\/?[a-z][\s\S]*>/i.test(s) ||
    /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/.test(s);

  if (!hasHtml) return s;

  s = s
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*div\s*>/gi, "\n")
    .replace(/<\s*div[^>]*>/gi, "")
    .replace(/<\/\s*p\s*>/gi, "\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<\/\s*li\s*>/gi, "\n")
    .replace(/<\/?\s*ul[^>]*>/gi, "")
    .replace(/<\/?\s*ol[^>]*>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]+>/g, "");

  s = s.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

function previewText(raw = "", max = 140) {
  const txt = normalizeScriptText(raw).replace(/\s+/g, " ").trim();
  return txt.length > max ? txt.slice(0, max) + "…" : txt;
}

function getSafeExternalUrl(url = "") {
  const v = String(url || "").trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

async function uploadFilesToWasabi(files, authHeaders, onProgress) {
  if (!files?.length) throw new Error("No files provided");

  const progresses = new Array(files.length).fill(0);
  const reportOverall = () =>
    onProgress?.(
      Math.round(progresses.reduce((a, b) => a + b, 0) / files.length)
    );

  return Promise.all(
    files.map(async (file, idx) => {
      const normalizedType = normalizeMediaContentType(file);

      const { presignedUrl, finalUrl, contentType } = await getPresignedUrl(
        file.name,
        normalizedType,
        authHeaders
      );

      await uploadDirectToWasabi(
        file,
        presignedUrl,
        contentType || normalizedType,
        (pct) => {
          progresses[idx] = pct;
          reportOverall();
        }
      );

      return { url: finalUrl, originalName: file.name };
    })
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES & HELPERS
// ─────────────────────────────────────────────────────────────
const lightPaper = {
  bgcolor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 2,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#ffffff",
    "&.Mui-focused fieldset": { borderColor: "#4f46e5" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#4f46e5" },
};

const thSx = {
  color: "#4b5563",
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  borderBottom: "1px solid #e5e7eb",
  bgcolor: "#f9fafb",
  py: 2,
  whiteSpace: "nowrap",
};

const tdSx = { borderBottom: "1px solid #f3f4f6", py: 1.5 };

const acSx = {
  minWidth: 180,
  "& .MuiOutlinedInput-root": {
    bgcolor: "#ffffff",
    fontSize: "0.85rem",
    color: "#111827",
    py: "2px !important",
    "& fieldset": { borderColor: "#d1d5db" },
    "&.Mui-focused fieldset": { borderColor: "#4f46e5" },
  },
  "& .MuiInputLabel-root": { color: "#6b7280", fontSize: "0.85rem" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#4f46e5" },
};

const EDIT_STATUSES = ["On Hold", "Reshoot", "Re-edit", "Done"];
const EDIT_STATUS_STYLE = {
  "On Hold": { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
  Reshoot: { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
  "Re-edit": { bg: "#fffbeb", color: "#d97706", border: "#fcd34d" },
  Done: { bg: "#ecfdf5", color: "#059669", border: "#6ee7b7" },
};

const PUBLISH_STATUS_STYLE = {
  Posted: { bg: "#ecfdf5", color: "#059669", border: "#6ee7b7" },
  "Used in Ads": { bg: "#f5f3ff", color: "#7c3aed", border: "#c4b5fd" },
};

const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)(\?.*)?$/i;
const IMAGE_EXT = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i;

const SCRIPT_TYPES = [
  "",
  "Muditam Instagram",
  "Muditam Snooze Well",
  "Muditam infographic",
  "Snooze Well infographic",
  "YouTube",
  "Meta Ads KJF",
  "Meta Ads Liver Fix",
  "Meta Ads International",
  "Meta Ads Others",
  "Google Ads",
  "WhatsApp",
];

function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detectMediaKind(fileOrName = "") {
  const value =
    typeof fileOrName === "string"
      ? fileOrName.toLowerCase()
      : String(fileOrName?.name || "").toLowerCase();

  if (/\.(mp4|mov|avi|webm|mkv|m4v)$/.test(value)) return "video";
  if (/\.(png|jpg|jpeg|webp|gif)$/.test(value)) return "image";
  return "file";
}

function getEditMediaItems(script) {
  if (Array.isArray(script?.editVariants) && script.editVariants.length > 0) {
    return script.editVariants
      .filter((item) => item?.url)
      .map((item, index) => ({
        label: item.label || `Variant ${index + 1}`,
        url: item.url,
        name: item.name || item.url?.split("/").pop() || `variant-${index + 1}`,
        type: item.type || detectMediaKind(item.name || item.url || ""),
      }));
  }

  if (script?.editFileUrl) {
    return [
      {
        label: "Main",
        url: script.editFileUrl,
        name: script.editFileName || script.editFileUrl.split("/").pop(),
        type: detectMediaKind(script.editFileName || script.editFileUrl),
      },
    ];
  }

  return [];
}

function getCurrentEditMediaSummary(script) {
  const items = getEditMediaItems(script);
  if (!items.length) return "—";
  if (items.length === 1) return items[0].name || "1 file";
  return `${items.length} variants uploaded`;
}

function ScriptId({ id }) {
  return (
    <Typography
      sx={{
        fontFamily: "'Syne',sans-serif",
        fontWeight: 700,
        fontSize: "0.85rem",
        color: "#4f46e5",
        letterSpacing: "0.02em",
      }}
    >
      {id}
    </Typography>
  );
}

function TypeBadge({ label }) {
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1.2,
        py: 0.3,
        borderRadius: "100px",
        fontSize: "0.75rem",
        fontWeight: 500,
        bgcolor: "#eef2ff",
        color: "#4f46e5",
        border: "1px solid #c7d2fe",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

function EditStatusChip({ status }) {
  const c = EDIT_STATUS_STYLE[status];
  if (!c || !status) {
    return (
      <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>—</Typography>
    );
  }
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1.2,
        py: 0.4,
        borderRadius: "100px",
        fontSize: "0.75rem",
        fontWeight: 700,
        bgcolor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </Box>
  );
}

function PublishStatusChip({ status }) {
  const finalStatus = status || "Posted";
  const c = PUBLISH_STATUS_STYLE[finalStatus];
  if (!c) {
    return (
      <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>—</Typography>
    );
  }
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1.2,
        py: 0.4,
        borderRadius: "100px",
        fontSize: "0.75rem",
        fontWeight: 700,
        bgcolor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {finalStatus}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────
function PlayerModal({ open, onClose, url, title }) {
  if (!url) return null;

  const isVideo = VIDEO_EXT.test(url);
  const isImage = IMAGE_EXT.test(url);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          borderBottom: "1px solid #e5e7eb",
          py: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <PlayIcon sx={{ color: "#4f46e5", fontSize: 24 }} />
          <Typography sx={{ fontWeight: 700, color: "#111827", fontSize: "1.1rem" }}>
            {title || "File Preview"}
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: "#6b7280" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 3, px: 3 }}>
        {isVideo ? (
          <Box
            component="video"
            key={url}
            src={url}
            controls
            playsInline
            preload="metadata"
            sx={{
              width: "100%",
              maxHeight: "65vh",
              display: "block",
              borderRadius: 2,
              bgcolor: "#000",
              outline: "none",
            }}
          />
        ) : isImage ? (
          <Box
            component="img"
            src={url}
            alt={title || "Preview"}
            sx={{
              width: "100%",
              maxHeight: "65vh",
              objectFit: "contain",
              display: "block",
              borderRadius: 2,
              bgcolor: "#f8fafc",
              border: "1px solid #e5e7eb",
            }}
          />
        ) : (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              bgcolor: "#f8fafc",
              borderRadius: 2,
              border: "1px dashed #d1d5db",
            }}
          >
            <Typography sx={{ color: "#6b7280", mb: 3 }}>
              Cannot preview this file type.
            </Typography>
            <Button
              component="a"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              startIcon={<OpenInNewIcon />}
              sx={{
                bgcolor: "#4f46e5",
                "&:hover": { bgcolor: "#4338ca" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 1.5,
                boxShadow: "none",
              }}
            >
              Open Externally
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommentModal({ open, onClose, comment, title }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          borderBottom: "1px solid #e5e7eb",
          py: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <CommentIcon sx={{ color: "#4f46e5", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
            {title || "Comment"}
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: "#6b7280" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5, pb: 3, px: 3 }}>
        {comment ? (
          <Box
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid #e5e7eb",
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.9rem",
                color: "#374151",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {comment}
            </Typography>
          </Box>
        ) : (
          <Typography
            sx={{
              color: "#9ca3af",
              fontStyle: "italic",
              fontSize: "0.9rem",
            }}
          >
            No comment added.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssignCell({ script, marketingEmployees, onAssigned, showSnack, canAssign }) {
  const [value, setValue] = useState(
    marketingEmployees.find((e) => e.fullName === script.editAssignedTo) || null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(marketingEmployees.find((e) => e.fullName === script.editAssignedTo) || null);
  }, [script.editAssignedTo, marketingEmployees]);

  const handleChange = async (_, newVal) => {
    if (!canAssign) return;
    setValue(newVal);
    if (!newVal) return;

    setSaving(true);
    try {
      await axios.post(
        `${API}/${script._id}/edit-assign`,
        { editAssignedTo: newVal.fullName },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      showSnack(`Assigned to ${newVal.fullName} ✅`);
      onAssigned();
    } catch (e) {
      showSnack(e.response?.data?.message || "Assignment failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!canAssign) {
    return (
      <Typography
        sx={{
          fontSize: "0.85rem",
          color: value ? "#374151" : "#9ca3af",
          fontWeight: value ? 500 : 400,
        }}
      >
        {value ? value.fullName : "—"}
      </Typography>
    );
  }

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Autocomplete
        size="small"
        options={marketingEmployees}
        getOptionLabel={(o) => o.fullName || ""}
        value={value}
        onChange={handleChange}
        sx={acSx}
        slotProps={{
          paper: {
            sx: {
              bgcolor: "#ffffff",
              color: "#111827",
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            },
          },
        }}
        renderOption={(props, option) => (
          <Box
            component="li"
            {...props}
            sx={{
              fontSize: "0.85rem",
              color: "#374151",
              "&:hover": { bgcolor: "#f3f4f6 !important" },
            }}
          >
            {option.fullName}
          </Box>
        )}
        renderInput={(params) => (
          <TextField {...params} placeholder="Assign to…" size="small" />
        )}
      />
      {saving ? (
        <CircularProgress size={16} sx={{ color: "#4f46e5" }} />
      ) : value ? (
        <CheckIcon sx={{ fontSize: 18, color: "#10b981" }} />
      ) : null}
    </Stack>
  );
}

function MediaVariantsCell({ script, onPlay, onDownload }) {
  const items = getEditMediaItems(script);

  if (!items.length) {
    return (
      <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af" }}>—</Typography>
    );
  }

  return (
    <Stack spacing={1} sx={{ minWidth: 260 }}>
      {items.map((item, index) => (
        <Box
          key={`${item.url}-${index}`}
          sx={{
            border: "1px solid #e5e7eb",
            borderRadius: 1.5,
            p: 1,
            bgcolor: "#f9fafb",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#111827",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.name}
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                onClick={() => onPlay(item.url, `${script.scriptId} — ${item.label}`)}
                startIcon={<PlayIcon sx={{ fontSize: 14 }} />}
                sx={{
                  color: "#4f46e5",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  minWidth: 0,
                  px: 1,
                  border: "1px solid #c7d2fe",
                  borderRadius: 1.2,
                  "&:hover": { bgcolor: "#eef2ff" },
                }}
              >
                Play
              </Button>

              <Tooltip title="Download">
                <IconButton
                  size="small"
                  onClick={() => onDownload(item.url, item.name)}
                  sx={{
                    color: "#6b7280",
                    "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                  }}
                >
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function UploadVideoDialog({ open, onClose, script, onUploaded, showSnack, mode = "upload" }) {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantLabels, setVariantLabels] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [comment, setComment] = useState("");
  const [editStatus, setEditStatus] = useState("Done");
  const [holdReason, setHoldReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedFiles([]);
    setHasVariants(false);
    setVariantLabels([]);
    setUploadProgress(0);
    setLabel("");
    setComment("");
    setHoldReason("");
    setEditStatus("Done");
  }, [open]);

  const needsReason = ["On Hold", "Reshoot", "Re-edit"].includes(editStatus);

  const handleClose = () => {
    if (uploading) return;
    setSelectedFiles([]);
    setHasVariants(false);
    setVariantLabels([]);
    setUploadProgress(0);
    setLabel("");
    setComment("");
    setEditStatus("Done");
    setHoldReason("");
    onClose();
  };

  const handleUpload = async () => {
  if (!selectedFiles.length) {
    showSnack("Please select file(s)", "error");
    return;
  }

  if (needsReason && !holdReason.trim()) {
    showSnack("Please provide a reason", "error");
    return;
  }

  const useVariants = hasVariants || selectedFiles.length > 1;

  if (useVariants && selectedFiles.length < 2) {
    showSnack("Please select multiple files for variants", "error");
    return;
  }

  setUploading(true);
  setUploadProgress(0);
  setLabel("Getting upload URL…");

  try {
    setLabel("Uploading...");

    const uploaded = await uploadFilesToWasabi(
      selectedFiles,
      getAuthHeaders(),
      setUploadProgress
    );

    setLabel("Saving to database…");
    setUploadProgress(100);

    const payload = {
      editComment: comment,
      editStatus,
      editHoldReason: holdReason,
    };

    if (useVariants) {
      payload.editHasVariants = true;
      payload.editVariants = uploaded.map((item, index) => ({
        label: variantLabels[index]?.trim() || `Variant ${index + 1}`,
        url: item.url,
        name: item.originalName,
        type: detectMediaKind(item.originalName),
      }));
    } else {
      payload.editHasVariants = false;
      payload.editFileUrl = uploaded[0]?.url || "";
      payload.editFileName = uploaded[0]?.originalName || "";
    }

    await axios.post(`${API}/${script._id}/edit-upload`, payload, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });

    showSnack(
      mode === "reupload"
        ? "Edited media updated"
        : "Edited media uploaded"
    );

    onUploaded();
    handleClose();
  } catch (err) {
    showSnack(
      err.response?.data?.message || err.message || "Upload failed",
      "error"
    );
  } finally {
    setUploading(false);
    setLabel("");
  }
};

  const fmtSz = (b) =>
    b < 1024 * 1024
      ? `${(b / 1024).toFixed(1)} KB`
      : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          color: "#111827",
          fontWeight: 700,
          borderBottom: "1px solid #e5e7eb",
          pb: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <UploadIcon sx={{ color: "#ea580c" }} />
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>
            {mode === "reupload" ? "Re-upload Edited Media" : "Upload Edited Media"}
          </Typography>
        </Stack>
        <IconButton
          size="small"
          onClick={handleClose}
          disabled={uploading}
          sx={{ color: "#6b7280" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          pt: 3,
          px: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        {script && (
          <Box
            sx={{
              bgcolor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 1.5,
              p: 2,
            }}
          >
            <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
              <ScriptId id={script.scriptId} />
              <TypeBadge label={script.scriptType} />
            </Stack>

            <Typography
              sx={{
                fontSize: "0.85rem",
                color: "#4b5563",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {previewText(script.scriptText, 220)}
            </Typography>

            {mode === "reupload" && (
              <Typography sx={{ mt: 1, fontSize: "0.8rem", color: "#6b7280" }}>
                Current edited media:{" "}
                <Box component="span" sx={{ color: "#111827", fontWeight: 600 }}>
                  {getCurrentEditMediaSummary(script)}
                </Box>
              </Typography>
            )}
          </Box>
        )}

        <Box
          sx={{
            p: 1.5,
            border: "1px solid #e5e7eb",
            borderRadius: 1.5,
            bgcolor: "#f9fafb",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography
              sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}
            >
              Have variants?
            </Typography>

            <Button
              size="small"
              variant={hasVariants ? "contained" : "outlined"}
              onClick={() => {
                setHasVariants((prev) => !prev);
              }}
              disabled={uploading}
              sx={{
                textTransform: "none",
                ...(hasVariants
                  ? {
                      bgcolor: "#4f46e5",
                      "&:hover": { bgcolor: "#4338ca" },
                    }
                  : {
                      borderColor: "#d1d5db",
                      color: "#374151",
                    }),
              }}
            >
              {hasVariants ? "Yes" : "No"}
            </Button>
          </Stack>
        </Box>

        <Box
          onClick={() => !uploading && fileInputRef.current?.click()}
          sx={{
            border: "2px dashed #d1d5db",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            cursor: uploading ? "default" : "pointer",
            "&:hover": uploading ? {} : { borderColor: "#ea580c", bgcolor: "#fff7ed" },
          }}
        >
          <AttachIcon sx={{ fontSize: 36, color: "#9ca3af", mb: 1 }} />

          {selectedFiles.length ? (
            <Stack spacing={1.2}>
              {selectedFiles.map((file, index) => (
                <Box
                  key={`${file.name}-${index}`}
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 1.5,
                    p: 1.2,
                    bgcolor: "#ffffff",
                    textAlign: "left",
                  }}
                >
                  <Stack spacing={0.6}>
                    <Typography
                      sx={{
                        fontSize: "0.88rem",
                        color: "#374151",
                        fontWeight: 600,
                      }}
                    >
                      {file.name}
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: "#6b7280" }}>
                      {fmtSz(file.size)}
                    </Typography>

                    {hasVariants && (
                      <TextField
                        size="small"
                        label={`Variant ${index + 1} label`}
                        value={variantLabels[index] || ""}
                        onChange={(e) => {
                          const next = [...variantLabels];
                          next[index] = e.target.value;
                          setVariantLabels(next);
                        }}
                        sx={inputSx}
                      />
                    )}
                  </Stack>
                </Box>
              ))}

              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFiles([]);
                  setVariantLabels([]);
                }}
                sx={{
                  mt: 1,
                  color: "#dc2626",
                  textTransform: "none",
                  fontSize: "0.8rem",
                }}
              >
                Remove all
              </Button>
            </Stack>
          ) : (
            <>
              <Typography
                sx={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: 500 }}
              >
                {selectedFiles.length > 1 || hasVariants
                  ? "Click to select multiple media variants"
                  : "Click to select your edited file"}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af", mt: 0.5 }}>
                MP4, MOV, AVI, WebM, PNG, JPG, JPEG, WebP
              </Typography>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,image/*,.mp4,.mov,.avi,.webm,.mkv,.m4v,.png,.jpg,.jpeg,.webp,.gif"
            style={{ display: "none" }}
            onChange={(e) => {
  const files = Array.from(e.target.files || []);
  const isMulti = files.length > 1;

  setSelectedFiles(files);
  setHasVariants(isMulti);

  setVariantLabels(
    files.map((file, idx) => variantLabels[idx] || `Variant ${idx + 1}`)
  );
}}
            disabled={uploading}
          />
        </Box>

        <Divider sx={{ borderColor: "#e5e7eb" }} />

        <FormControl size="small" sx={inputSx}>
          <InputLabel>Edit Status</InputLabel>
          <Select
            value={editStatus}
            label="Edit Status"
            onChange={(e) => setEditStatus(e.target.value)}
            disabled={uploading}
          >
            {EDIT_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {needsReason && (
          <TextField
            label="Reason *"
            multiline
            minRows={2}
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            disabled={uploading}
            sx={inputSx}
          />
        )}

        <TextField
          label="Comment (optional)"
          multiline
          minRows={2}
          placeholder="Notes for the team…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={uploading}
          sx={inputSx}
        />

        {uploading && (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>
                {label || "Uploading…"}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#ea580c", fontWeight: 600 }}>
                {uploadProgress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                borderRadius: 1,
                bgcolor: "#e5e7eb",
                "& .MuiLinearProgress-bar": { bgcolor: "#ea580c" },
              }}
            />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af", mt: 0.5 }}>
                Uploading directly to storage — large files may take a few minutes
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          borderTop: "1px solid #e5e7eb",
          gap: 1,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={uploading}
          sx={{ color: "#6b7280", textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={uploading || !selectedFiles.length}
          startIcon={
            uploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />
          }
          sx={{
            bgcolor: "#ea580c",
            color: "#ffffff",
            boxShadow: "none",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: "#c2410c" },
          }}
        >
          {uploading
            ? "Uploading…"
            : mode === "reupload"
            ? "Re-upload Media"
            : "Upload Media"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function UploadThumbDialog({ open, onClose, script, onUploaded, showSnack, mode = "upload" }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedFile(null);
    setUploadProgress(0);
    setLabel("");
  }, [open]);

  const handleClose = () => {
    if (uploading) return;
    setSelectedFile(null);
    setUploadProgress(0);
    setLabel("");
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showSnack("Please select a thumbnail image", "error");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setLabel("Uploading thumbnail…");

    try {
      const results = await uploadFilesToWasabi(
        [selectedFile],
        getAuthHeaders(),
        setUploadProgress
      );
      const url = results[0]?.url;
      if (!url) throw new Error("No URL returned");

      setLabel("Saving thumbnail…");
      setUploadProgress(100);

      await axios.post(
        `${API}/${script._id}/edit-thumbnail`,
        { editThumbUrl: url, editThumbName: selectedFile.name },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      showSnack(mode === "reupload" ? "Thumbnail re-uploaded ✅" : "Thumbnail uploaded ✅");
      onUploaded();
      handleClose();
    } catch (err) {
      showSnack(
        err.response?.data?.message || err.message || "Thumbnail upload failed",
        "error"
      );
    } finally {
      setUploading(false);
      setLabel("");
    }
  };

  const fmtSz = (b) =>
    b < 1024 * 1024
      ? `${(b / 1024).toFixed(1)} KB`
      : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          color: "#111827",
          fontWeight: 700,
          borderBottom: "1px solid #e5e7eb",
          pb: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <UploadIcon sx={{ color: "#ea580c" }} />
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>
            {mode === "reupload" ? "Re-upload Thumbnail" : "Upload Thumbnail"}
          </Typography>
        </Stack>
        <IconButton
          size="small"
          onClick={handleClose}
          disabled={uploading}
          sx={{ color: "#6b7280" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          pt: 3,
          px: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        <Box
          onClick={() => !uploading && fileInputRef.current?.click()}
          sx={{
            border: "2px dashed #d1d5db",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            cursor: uploading ? "default" : "pointer",
            "&:hover": uploading ? {} : { borderColor: "#ea580c", bgcolor: "#fff7ed" },
          }}
        >
          <AttachIcon sx={{ fontSize: 36, color: "#9ca3af", mb: 1 }} />

          {selectedFile ? (
            <Box>
              <Typography sx={{ fontSize: "0.9rem", color: "#374151", fontWeight: 600 }}>
                {selectedFile.name}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>
                {fmtSz(selectedFile.size)}
              </Typography>
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                sx={{ mt: 1, color: "#dc2626", textTransform: "none", fontSize: "0.8rem" }}
              >
                Remove
              </Button>
            </Box>
          ) : (
            <>
              <Typography sx={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: 500 }}>
                Click to select thumbnail
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af", mt: 0.5 }}>
                PNG, JPG, WebP
              </Typography>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setSelectedFile(f);
            }}
            disabled={uploading}
          />
        </Box>

        {uploading && (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>
                {label || "Uploading…"}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#ea580c", fontWeight: 600 }}>
                {uploadProgress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                borderRadius: 1,
                bgcolor: "#e5e7eb",
                "& .MuiLinearProgress-bar": { bgcolor: "#ea580c" },
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          borderTop: "1px solid #e5e7eb",
          gap: 1,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={uploading}
          sx={{ color: "#6b7280", textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
          sx={{
            bgcolor: "#ea580c",
            color: "#ffffff",
            boxShadow: "none",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: "#c2410c" },
          }}
        >
          {uploading
            ? "Uploading…"
            : mode === "reupload"
            ? "Re-upload Thumbnail"
            : "Upload Thumbnail"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function EditPage() {
  const currentUser = getCurrentUser();
  const isManager = isManagerRole(currentUser?.role);
  const hasFullAccess = isManager || currentUser?.hasTeam === true;
  const canAssign = hasFullAccess;

  const canUploadForScript = (s) => {
    if (!s) return false;
    if (hasFullAccess) return true;
    if (s.editAssignedTo && currentUser?.fullName && s.editAssignedTo === currentUser.fullName) {
      return true;
    }
    return false;
  };

  const [tab, setTab] = useState(0);

  const [filtersDraft, setFiltersDraft] = useState({
    assignedTo: null,
    scriptId: "",
    scriptType: "",
    creator: "",
  });

  const [filters, setFilters] = useState({
    assignedTo: "",
    scriptId: "",
    scriptType: "",
    creator: "",
  });

  const [pendingPage, setPendingPage] = useState(0);
  const [pendingRows, setPendingRows] = useState(50);
  const [donePage, setDonePage] = useState(0);
  const [doneRows, setDoneRows] = useState(50);
  const [completedPage, setCompletedPage] = useState(0);
  const [completedRows, setCompletedRows] = useState(50);

  const [pendingScripts, setPendingScripts] = useState([]);
  const [doneScripts, setDoneScripts] = useState([]);
  const [completedScripts, setCompletedScripts] = useState([]);

  const [pendingTotal, setPendingTotal] = useState(0);
  const [doneTotal, setDoneTotal] = useState(0);
  const [completedTotal, setCompletedTotal] = useState(0);

  const [marketingEmployees, setMarketingEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pendingDate, setPendingDate] = useState({ dateFrom: "", dateTo: "" });
  const [doneDate, setDoneDate] = useState({ dateFrom: "", dateTo: "" });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [uploadMode, setUploadMode] = useState("upload");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTarget, setDialogTarget] = useState(null);
  const [form, setForm] = useState({
    editStatus: "",
    editHoldReason: "",
    editComment: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [thumbOpen, setThumbOpen] = useState(false);
  const [thumbTarget, setThumbTarget] = useState(null);
  const [thumbMode, setThumbMode] = useState("upload");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewText, setViewText] = useState("");
  const [commentModal, setCommentModal] = useState({
    open: false,
    text: "",
    title: "",
  });
  const [player, setPlayer] = useState({
    open: false,
    url: "",
    title: "",
  });

  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    severity: "success",
  });

  const showSnack = (msg, severity = "success") =>
    setSnack({ open: true, msg, severity });

  const needsReason = ["On Hold", "Reshoot", "Re-edit"].includes(form.editStatus);

  const extractKey = (url) => {
    try {
      const path = new URL(url).pathname;
      const parts = path.replace(/^\//, "").split("/");
      parts.shift();
      return parts.join("/");
    } catch {
      const m = url.match(/https?:\/\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
      return m ? m[1] : null;
    }
  };

  const handleDownload = async (url, filename) => {
    const key = extractKey(url);
    if (!key) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      showSnack("Preparing download…");

      const finalName = filename || key.split("/").pop() || "file";

      const { data } = await axios.get(PRESIGN_DOWN_API, {
        params: {
          key,
          filename: finalName,
          disposition: "attachment",
        },
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      window.open(data.url, "_blank", "noopener,noreferrer");
      showSnack("Download started ✅");
    } catch (err) {
      showSnack(err.response?.data?.message || "Download failed", "error");
    }
  };

  const openPlayer = async (rawUrl, title) => {
    const key = extractKey(rawUrl);

    if (!key) {
      setPlayer({ open: true, url: rawUrl, title });
      return;
    }

    try {
      const { data } = await axios.get(PRESIGN_DOWN_API, {
        params: {
          key,
          filename: key.split("/").pop() || "video.mp4",
          disposition: "inline",
        },
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      setPlayer({ open: true, url: data.url, title });
    } catch (err) {
      showSnack(err.response?.data?.message || "Unable to open video", "error");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const empRes = await axios.get(EMP_API, {
          params: { role: "Marketing" },
          headers: getAuthHeaders(),
          withCredentials: true,
        });

        const mkt = (Array.isArray(empRes.data) ? empRes.data : [])
          .filter((e) => e.status === "active")
          .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));

        setMarketingEmployees(mkt);
      } catch {
        setMarketingEmployees([]);
      }
    })();
  }, []);

  const commonFilterParams = useMemo(() => {
    const p = {
      sortBy: "createdAt",
      sortDir: "desc",
    };

    if (filters.assignedTo) p.assignedTo = filters.assignedTo;
    if (filters.scriptId) p.scriptId = filters.scriptId;
    if (filters.scriptType) p.scriptType = filters.scriptType;
    if (filters.creator) p.creator = filters.creator;

    return p;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const pendingParams = {
        stage: "Cut Done,Edit Pending",
        page: pendingPage + 1,
        limit: pendingRows,
        ...(pendingDate.dateFrom || pendingDate.dateTo
          ? { dateField: "cutDoneAt", ...pendingDate }
          : {}),
        ...commonFilterParams,
      };

      const doneParams = {
        stage: "Edit Done",
        page: donePage + 1,
        limit: doneRows,
        ...(doneDate.dateFrom || doneDate.dateTo
          ? { dateField: "editDoneAt", ...doneDate }
          : {}),
        ...commonFilterParams,
      };

      const completedParams = {
        stage: "Post",
        page: completedPage + 1,
        limit: completedRows,
        sortBy: "postedAt",
        sortDir: "desc",
        ...commonFilterParams,
      };

      const [pendingRes, doneRes, completedRes] = await Promise.all([
        axios.get(API, { params: pendingParams, headers, withCredentials: true }),
        axios.get(API, { params: doneParams, headers, withCredentials: true }),
        axios.get(API, { params: completedParams, headers, withCredentials: true }),
      ]);

      setPendingScripts(pendingRes.data.scripts || []);
      setDoneScripts(doneRes.data.scripts || []);
      setCompletedScripts(completedRes.data.scripts || []);

      setPendingTotal(
        pendingRes.data.pagination?.total ?? (pendingRes.data.scripts || []).length
      );
      setDoneTotal(
        doneRes.data.pagination?.total ?? (doneRes.data.scripts || []).length
      );
      setCompletedTotal(
        completedRes.data.pagination?.total ?? (completedRes.data.scripts || []).length
      );
    } catch {
      showSnack("Failed to load data", "error");
      setPendingScripts([]);
      setDoneScripts([]);
      setCompletedScripts([]);
      setPendingTotal(0);
      setDoneTotal(0);
      setCompletedTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    pendingPage,
    pendingRows,
    donePage,
    doneRows,
    completedPage,
    completedRows,
    pendingDate,
    doneDate,
    commonFilterParams,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = () => {
    setFilters({
      assignedTo: filtersDraft.assignedTo?.fullName || "",
      scriptId: (filtersDraft.scriptId || "").trim(),
      scriptType: filtersDraft.scriptType || "",
      creator: (filtersDraft.creator || "").trim(),
    });
    setPendingPage(0);
    setDonePage(0);
    setCompletedPage(0);
  };

  const clearFilters = () => {
    setFiltersDraft({
      assignedTo: null,
      scriptId: "",
      scriptType: "",
      creator: "",
    });
    setFilters({
      assignedTo: "",
      scriptId: "",
      scriptType: "",
      creator: "",
    });
    setPendingPage(0);
    setDonePage(0);
    setCompletedPage(0);
    setPendingDate({ dateFrom: "", dateTo: "" });
    setDoneDate({ dateFrom: "", dateTo: "" });
  };

  const openDialog = (s) => {
    setDialogTarget(s);
    setForm({
      editStatus: s.editStatus || "",
      editHoldReason: s.editHoldReason || "",
      editComment: s.editComment || "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setDialogTarget(null);
  };

  const validate = () => {
    const errs = {};
    const needs = ["On Hold", "Reshoot", "Re-edit"].includes(form.editStatus);
    if (needs && !form.editHoldReason.trim()) {
      errs.editHoldReason = "Reason is required";
    }
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await axios.post(
        `${API}/${dialogTarget._id}/edit-upload`,
        {
          editComment: form.editComment,
          editStatus: form.editStatus,
          editHoldReason: form.editHoldReason,
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      showSnack("Details saved!");
      closeDialog();
      load();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error saving", "error");
    } finally {
      setSaving(false);
    }
  };

  const rowSx = { "&:hover td": { bgcolor: "#f9fafb" } };

  return (
    <Box sx={{ bgcolor: "#f4f5f7", minHeight: "100vh", color: "#111827", p: 4 }}>
      <Box mb={3}>
        <Typography
          sx={{
            fontFamily: "'Syne',sans-serif",
            fontWeight: 800,
            fontSize: "1.8rem",
            letterSpacing: "-0.5px",
            color: "#111827",
          }}
        >
          Edit <Box component="span" sx={{ color: "#4f46e5" }}>Workspace</Box>
        </Typography>
        <Typography sx={{ color: "#6b7280", fontSize: "0.9rem", mt: 0.5 }}>
          Assign team · Download cut video · Upload edited video · Track status
          {currentUser?.fullName && (
            <Box component="span" sx={{ ml: 1.5, color: "#9ca3af" }}>
              —{" "}
              <Box component="span" sx={{ color: "#4f46e5", fontWeight: 500 }}>
                {currentUser.fullName}
              </Box>
              {hasFullAccess ? (
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    px: 1,
                    py: 0.2,
                    borderRadius: "100px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    bgcolor: "#ecfdf5",
                    color: "#059669",
                    border: "1px solid #6ee7b7",
                  }}
                >
                  All Scripts
                </Box>
              ) : (
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    px: 1,
                    py: 0.2,
                    borderRadius: "100px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    bgcolor: "#eff6ff",
                    color: "#2563eb",
                    border: "1px solid #93c5fd",
                  }}
                >
                  My Assigned
                </Box>
              )}
            </Box>
          )}
        </Typography>
      </Box>

      <Paper sx={{ ...lightPaper, mb: 2, p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
          <Autocomplete
            size="small"
            sx={{ ...acSx, minWidth: 220 }}
            options={marketingEmployees}
            value={filtersDraft.assignedTo}
            onChange={(_, v) => setFiltersDraft((s) => ({ ...s, assignedTo: v }))}
            getOptionLabel={(o) => o?.fullName || ""}
            isOptionEqualToValue={(a, b) =>
              (a?.email || a?.fullName) === (b?.email || b?.fullName)
            }
            renderInput={(params) => (
              <TextField {...params} label="Assigned To" placeholder="Select…" />
            )}
          />

          <TextField
            size="small"
            label="Script ID"
            placeholder="e.g. SCR0001"
            value={filtersDraft.scriptId}
            onChange={(e) => setFiltersDraft((s) => ({ ...s, scriptId: e.target.value }))}
            sx={{ minWidth: 200, ...inputSx }}
          />

          <FormControl size="small" sx={{ minWidth: 200, ...inputSx }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={filtersDraft.scriptType}
              onChange={(e) => setFiltersDraft((s) => ({ ...s, scriptType: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {SCRIPT_TYPES.filter(Boolean).map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Creator"
            placeholder="Full name"
            value={filtersDraft.creator}
            onChange={(e) => setFiltersDraft((s) => ({ ...s, creator: e.target.value }))}
            sx={{ minWidth: 220, ...inputSx }}
          />

          <Box sx={{ flex: 1 }} />

          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={applyFilters}
            sx={{
              bgcolor: "#4f46e5",
              "&:hover": { bgcolor: "#4338ca" },
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={clearFilters}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderColor: "#d1d5db",
              color: "#374151",
              "&:hover": { borderColor: "#9ca3af" },
            }}
          >
            Clear
          </Button>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap" gap={1}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            "& .MuiTabs-indicator": {
              bgcolor: "#4f46e5",
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
            "& .MuiTab-root": {
              color: "#6b7280",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.9rem",
              minHeight: 48,
            },
            "& .Mui-selected": { color: "#4f46e5 !important" },
            bgcolor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 2,
            px: 1,
            minHeight: 48,
            width: "fit-content",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <Tab label={`Edit Pending (${pendingTotal})`} />
          <Tab label={`Edit Done (${doneTotal})`} />
          <Tab label={`Completed (${completedTotal})`} />
        </Tabs>

        <Box sx={{ flex: 1 }} />
        <Button
          onClick={load}
          sx={{ textTransform: "none", fontWeight: 700, color: "#4f46e5" }}
        >
          Refresh
        </Button>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: "#4f46e5" }} size={32} />
        </Box>
      ) : (
        <>
          {/* EDIT PENDING */}
          {tab === 0 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {[
                        "#",
                        "Script ID",
                        "Type",
                        "Script Preview",
                        "Creator",
                        "Cut Video",
                        "Cut Comment",
                        "Cut Done At",
                        "Assigned To",
                        "Upload Edited Video",
                        "",
                      ].map((h) => (
                        <TableCell key={h} sx={thSx}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pendingScripts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={11}
                          align="center"
                          sx={{ py: 8, borderBottom: "none", color: "#6b7280" }}
                        >
                          <MagicIcon
                            sx={{
                              fontSize: 36,
                              mb: 1,
                              opacity: 0.3,
                              display: "block",
                              mx: "auto",
                              color: "#9ca3af",
                            }}
                          />
                          No scripts found for current filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingScripts.map((s, i) => (
                        <TableRow key={s._id} sx={rowSx}>
                          <TableCell sx={{ ...tdSx, color: "#9ca3af", fontSize: "0.8rem" }}>
                            {pendingPage * pendingRows + i + 1}
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <ScriptId id={s.scriptId} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <TypeBadge label={s.scriptType} />
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 220 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                sx={{
                                  fontSize: "0.85rem",
                                  color: "#4b5563",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                {previewText(s.scriptText, 160)}
                              </Typography>

                              <Tooltip title="View Full Script">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setViewText(normalizeScriptText(s.scriptText));
                                    setViewOpen(true);
                                  }}
                                  sx={{
                                    color: "#6b7280",
                                    "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                  }}
                                >
                                  <ViewIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>

                              {s.referenceLink && (
                                <Tooltip title="Open Reference Link">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      window.open(
                                        getSafeExternalUrl(s.referenceLink),
                                        "_blank",
                                        "noopener,noreferrer"
                                      )
                                    }
                                    sx={{
                                      color: "#6b7280",
                                      "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                    }}
                                  >
                                    <LinkIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", color: "#4b5563" }}>
                              {s.createdBy}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            {s.cutVideoUrl && s.cutVideoUrl !== "pending" ? (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Button
                                  size="small"
                                  onClick={() => openPlayer(s.cutVideoUrl, `${s.scriptId} — Cut`)}
                                  startIcon={<PlayIcon sx={{ fontSize: 16 }} />}
                                  sx={{
                                    color: "#4f46e5",
                                    textTransform: "none",
                                    fontWeight: 700,
                                    fontSize: "0.8rem",
                                    p: "4px 8px",
                                    border: "1px solid #c7d2fe",
                                    borderRadius: 1.5,
                                    "&:hover": { bgcolor: "#eef2ff" },
                                  }}
                                >
                                  Play
                                </Button>
                                <Tooltip title="Download">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDownload(
                                        s.cutVideoUrl,
                                        s.cutVideoName || `${s.scriptId}_cut`
                                      )
                                    }
                                    sx={{
                                      color: "#6b7280",
                                      "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                    }}
                                  >
                                    <DownloadIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                                —
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 160 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                sx={{
                                  fontSize: "0.85rem",
                                  color: "#6b7280",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                {s.cutComment || "—"}
                              </Typography>
                              {s.cutComment && (
                                <Tooltip title="View full">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setCommentModal({
                                        open: true,
                                        text: s.cutComment,
                                        title: `Cut Comment — ${s.scriptId}`,
                                      })
                                    }
                                    sx={{
                                      color: "#6b7280",
                                      flexShrink: 0,
                                      "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                    }}
                                  >
                                    <ViewIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography
                              sx={{
                                fontSize: "0.8rem",
                                color: "#1f2937",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmt(s.cutDoneAt)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ ...tdSx, minWidth: 220 }}>
                            <AssignCell
                              script={s}
                              marketingEmployees={marketingEmployees}
                              onAssigned={load}
                              showSnack={showSnack}
                              canAssign={canAssign}
                            />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<UploadIcon sx={{ fontSize: 15 }} />}
                              disabled={!canUploadForScript(s)}
                              onClick={() => {
                                setUploadTarget(s);
                                setUploadMode("upload");
                                setUploadOpen(true);
                              }}
                              sx={{
                                bgcolor: "#fff7ed",
                                color: "#ea580c",
                                border: "1px solid #fdba74",
                                textTransform: "none",
                                fontWeight: 800,
                                fontSize: "0.78rem",
                                py: 0.5,
                                boxShadow: "none",
                                "&:hover": { bgcolor: "#ffedd5" },
                                opacity: canUploadForScript(s) ? 1 : 0.6,
                              }}
                            >
                              Upload Media
                            </Button>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Tooltip title="Update status / comment">
                              <IconButton
                                size="small"
                                onClick={() => openDialog(s)}
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": { color: "#ea580c", bgcolor: "#ffedd5" },
                                }}
                              >
                                <EditIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={pendingTotal}
                page={pendingPage}
                onPageChange={(_, newPage) => setPendingPage(newPage)}
                rowsPerPage={pendingRows}
                onRowsPerPageChange={(e) => {
                  setPendingRows(parseInt(e.target.value, 10));
                  setPendingPage(0);
                }}
                rowsPerPageOptions={[25, 50, 100, 200]}
              />
            </Paper>
          )}

          {/* EDIT DONE */}
          {tab === 1 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {[
                        "#",
                        "Script ID",
                        "Type",
                        "Script Preview",
                        "Assigned To",
                        "Edited Video",
                        "Edit Status",
                        "Comment",
                        "Done At",
                        "Done By",
                        "",
                      ].map((h) => (
                        <TableCell key={h} sx={thSx}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {doneScripts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={11}
                          align="center"
                          sx={{ py: 8, borderBottom: "none", color: "#6b7280" }}
                        >
                          <MagicIcon
                            sx={{
                              fontSize: 36,
                              mb: 1,
                              opacity: 0.3,
                              display: "block",
                              mx: "auto",
                              color: "#9ca3af",
                            }}
                          />
                          No scripts found for current filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      doneScripts.map((s, i) => (
                        <TableRow key={s._id} sx={rowSx}>
                          <TableCell sx={{ ...tdSx, color: "#9ca3af", fontSize: "0.8rem" }}>
                            {donePage * doneRows + i + 1}
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <ScriptId id={s.scriptId} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <TypeBadge label={s.scriptType} />
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 200 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                sx={{
                                  fontSize: "0.85rem",
                                  color: "#4b5563",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                {previewText(s.scriptText, 160)}
                              </Typography>

                              <Tooltip title="View Full Script">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setViewText(normalizeScriptText(s.scriptText));
                                    setViewOpen(true);
                                  }}
                                  sx={{
                                    color: "#6b7280",
                                    "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                  }}
                                >
                                  <ViewIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>

                              {s.referenceLink && (
                                <Tooltip title="Open Reference Link">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      window.open(
                                        getSafeExternalUrl(s.referenceLink),
                                        "_blank",
                                        "noopener,noreferrer"
                                      )
                                    }
                                    sx={{
                                      color: "#6b7280",
                                      "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                    }}
                                  >
                                    <LinkIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ ...tdSx, minWidth: 220 }}>
                            <AssignCell
                              script={s}
                              marketingEmployees={marketingEmployees}
                              onAssigned={load}
                              showSnack={showSnack}
                              canAssign={canAssign}
                            />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <MediaVariantsCell
                              script={s}
                              onPlay={openPlayer}
                              onDownload={handleDownload}
                            />

                            <Stack
                              direction="row"
                              spacing={0.5}
                              mt={1}
                              flexWrap="wrap"
                              gap={0.5}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<UploadIcon sx={{ fontSize: 15 }} />}
                                disabled={!canUploadForScript(s)}
                                onClick={() => {
                                  setUploadTarget(s);
                                  setUploadMode("reupload");
                                  setUploadOpen(true);
                                }}
                                sx={{
                                  borderColor: "#fdba74",
                                  color: "#ea580c",
                                  textTransform: "none",
                                  fontWeight: 800,
                                  fontSize: "0.78rem",
                                  py: 0.4,
                                  px: 1.2,
                                  "&:hover": {
                                    bgcolor: "#ffedd5",
                                    borderColor: "#fb923c",
                                  },
                                  opacity: canUploadForScript(s) ? 1 : 0.6,
                                }}
                              >
                                Reupload Media
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<UploadIcon sx={{ fontSize: 15 }} />}
                                disabled={!canUploadForScript(s)}
                                onClick={() => {
                                  setThumbTarget(s);
                                  setThumbMode(s.editThumbUrl ? "reupload" : "upload");
                                  setThumbOpen(true);
                                }}
                                sx={{
                                  borderColor: "#fdba74",
                                  color: "#ea580c",
                                  textTransform: "none",
                                  fontWeight: 800,
                                  fontSize: "0.78rem",
                                  py: 0.4,
                                  px: 1.2,
                                  "&:hover": {
                                    bgcolor: "#ffedd5",
                                    borderColor: "#fb923c",
                                  },
                                  opacity: canUploadForScript(s) ? 1 : 0.6,
                                }}
                              >
                                {s.editThumbUrl ? "Reupload Thumbnail" : "Upload Thumbnail"}
                              </Button>

                              {s.editThumbUrl && s.editThumbUrl !== "pending" && (
                                <Tooltip title="Download Thumbnail">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDownload(
                                        s.editThumbUrl,
                                        s.editThumbName || `${s.scriptId}_thumb`
                                      )
                                    }
                                    sx={{
                                      color: "#6b7280",
                                      "&:hover": {
                                        color: "#4f46e5",
                                        bgcolor: "#eef2ff",
                                      },
                                    }}
                                  >
                                    <DownloadIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <EditStatusChip status={s.editStatus} />
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 180 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                sx={{
                                  fontSize: "0.85rem",
                                  color: "#6b7280",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                {s.editComment || "—"}
                              </Typography>
                              {s.editComment && (
                                <Tooltip title="View full">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setCommentModal({
                                        open: true,
                                        text: s.editComment,
                                        title: `Edit Comment — ${s.scriptId}`,
                                      })
                                    }
                                    sx={{
                                      color: "#6b7280",
                                      flexShrink: 0,
                                      "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                    }}
                                  >
                                    <ViewIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography
                              sx={{
                                fontSize: "0.85rem",
                                color: "#4b5563",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmt(s.editDoneAt)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography
                              sx={{
                                fontSize: "0.85rem",
                                color: "#059669",
                                fontWeight: 600,
                              }}
                            >
                              {s.editDoneBy || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Tooltip title="Update status / comment">
                              <IconButton
                                size="small"
                                onClick={() => openDialog(s)}
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": { color: "#ea580c", bgcolor: "#ffedd5" },
                                }}
                              >
                                <EditIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={doneTotal}
                page={donePage}
                onPageChange={(_, newPage) => setDonePage(newPage)}
                rowsPerPage={doneRows}
                onRowsPerPageChange={(e) => {
                  setDoneRows(parseInt(e.target.value, 10));
                  setDonePage(0);
                }}
                rowsPerPageOptions={[25, 50, 100, 200]}
              />
            </Paper>
          )}

          {/* COMPLETED */}
          {tab === 2 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {[
                        "#",
                        "Script ID",
                        "Type",
                        "Script Preview",
                        "Assigned To",
                        "Edited Video",
                        "Edit Status",
                        "Comment",
                        "Publish Status",
                        "Published At",
                        "Posted By",
                      ].map((h) => (
                        <TableCell key={h} sx={thSx}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {completedScripts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={11}
                          align="center"
                          sx={{ py: 8, borderBottom: "none", color: "#6b7280" }}
                        >
                          <DoneAllIcon
                            sx={{
                              fontSize: 36,
                              mb: 1,
                              opacity: 0.3,
                              display: "block",
                              mx: "auto",
                              color: "#9ca3af",
                            }}
                          />
                          No completed / published videos found
                        </TableCell>
                      </TableRow>
                    ) : (
                      completedScripts.map((s, i) => (
                        <TableRow key={s._id} sx={rowSx}>
                          <TableCell sx={{ ...tdSx, color: "#9ca3af", fontSize: "0.8rem" }}>
                            {completedPage * completedRows + i + 1}
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <ScriptId id={s.scriptId} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <TypeBadge label={s.scriptType} />
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 220 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                sx={{
                                  fontSize: "0.85rem",
                                  color: "#4b5563",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                {previewText(s.scriptText, 160)}
                              </Typography>

                              <Tooltip title="View Full Script">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setViewText(normalizeScriptText(s.scriptText));
                                    setViewOpen(true);
                                  }}
                                  sx={{
                                    color: "#6b7280",
                                    "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                  }}
                                >
                                  <ViewIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>

                              {s.referenceLink && (
                                <Tooltip title="Open Reference Link">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      window.open(
                                        getSafeExternalUrl(s.referenceLink),
                                        "_blank",
                                        "noopener,noreferrer"
                                      )
                                    }
                                    sx={{
                                      color: "#6b7280",
                                      "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                    }}
                                  >
                                    <LinkIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", color: "#4b5563" }}>
                              {s.editAssignedTo || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <MediaVariantsCell
                              script={s}
                              onPlay={openPlayer}
                              onDownload={handleDownload}
                            />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <EditStatusChip status={s.editStatus} />
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 180 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                sx={{
                                  fontSize: "0.85rem",
                                  color: "#6b7280",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                {s.editComment || "—"}
                              </Typography>
                              {s.editComment && (
                                <Tooltip title="View full">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setCommentModal({
                                        open: true,
                                        text: s.editComment,
                                        title: `Edit Comment — ${s.scriptId}`,
                                      })
                                    }
                                    sx={{
                                      color: "#6b7280",
                                      flexShrink: 0,
                                      "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                    }}
                                  >
                                    <ViewIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <PublishStatusChip status={s.postPublishStatus} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography
                              sx={{
                                fontSize: "0.85rem",
                                color: "#4b5563",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmt(s.postedAt)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography
                              sx={{
                                fontSize: "0.85rem",
                                color: "#059669",
                                fontWeight: 600,
                              }}
                            >
                              {s.postedBy || "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={completedTotal}
                page={completedPage}
                onPageChange={(_, newPage) => setCompletedPage(newPage)}
                rowsPerPage={completedRows}
                onRowsPerPageChange={(e) => {
                  setCompletedRows(parseInt(e.target.value, 10));
                  setCompletedPage(0);
                }}
                rowsPerPageOptions={[25, 50, 100, 200]}
              />
            </Paper>
          )}
        </>
      )}

      <PlayerModal
        open={player.open}
        onClose={() => setPlayer({ open: false, url: "", title: "" })}
        url={player.url}
        title={player.title}
      />

      <CommentModal
        open={commentModal.open}
        onClose={() => setCommentModal({ open: false, text: "", title: "" })}
        comment={commentModal.text}
        title={commentModal.title}
      />

      <UploadVideoDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setUploadTarget(null);
          setUploadMode("upload");
        }}
        script={uploadTarget}
        onUploaded={load}
        showSnack={showSnack}
        mode={uploadMode}
      />

      <UploadThumbDialog
        open={thumbOpen}
        onClose={() => {
          setThumbOpen(false);
          setThumbTarget(null);
          setThumbMode("upload");
        }}
        script={thumbTarget}
        onUploaded={load}
        showSnack={showSnack}
        mode={thumbMode}
      />

      <Dialog
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewText("");
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            color: "#111827",
            fontWeight: 700,
            borderBottom: "1px solid #e5e7eb",
            py: 2,
            px: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <ViewIcon sx={{ color: "#4f46e5" }} />
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Full Script Content
            </Typography>
          </Stack>
          <IconButton
            size="small"
            onClick={() => {
              setViewOpen(false);
              setViewText("");
            }}
            sx={{ color: "#6b7280" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
          {viewText && (
            <Box
              sx={{
                bgcolor: "#f8fafc",
                p: 2.5,
                borderRadius: 2,
                border: "1px solid #e5e7eb",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.95rem",
                  color: "#374151",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {viewText}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            color: "#111827",
            fontWeight: 700,
            borderBottom: "1px solid #e5e7eb",
            pb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <EditIcon sx={{ color: "#ea580c", fontSize: 22 }} />
          Edit Details
          {dialogTarget && (
            <Box
              component="span"
              sx={{
                ml: 1,
                fontSize: "0.85rem",
                color: "#4f46e5",
                fontFamily: "monospace",
                fontWeight: 500,
              }}
            >
              {dialogTarget.scriptId}
            </Box>
          )}
        </DialogTitle>

        <DialogContent
          sx={{
            pt: 3,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            mt: 1,
            overflowY: "auto",
            maxHeight: "70vh",
          }}
        >
          {dialogTarget && (
            <Box
              sx={{
                bgcolor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Stack direction="row" alignItems="center" gap={1} mb={0.8}>
                <ScriptId id={dialogTarget.scriptId} />
                <TypeBadge label={dialogTarget.scriptType} />
              </Stack>
              <Typography sx={{ fontSize: "0.85rem", color: "#4b5563" }}>
                {previewText(dialogTarget.scriptText, 220)}
              </Typography>
            </Box>
          )}

          <FormControl size="small" sx={inputSx}>
            <InputLabel>Edit Status</InputLabel>
            <Select
              label="Edit Status"
              value={form.editStatus}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, editStatus: e.target.value }))
              }
              disabled={saving}
            >
              <MenuItem value="">Select status</MenuItem>
              {EDIT_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {needsReason && (
            <TextField
              label="Reason *"
              multiline
              minRows={3}
              value={form.editHoldReason}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, editHoldReason: e.target.value }))
              }
              error={!!errors.editHoldReason}
              helperText={errors.editHoldReason}
              disabled={saving}
              sx={inputSx}
            />
          )}

          <TextField
            label="Comment"
            multiline
            minRows={3}
            value={form.editComment}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, editComment: e.target.value }))
            }
            disabled={saving}
            sx={inputSx}
          />
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e5e7eb",
            gap: 1,
          }}
        >
          <Button
            onClick={closeDialog}
            disabled={saving}
            sx={{ color: "#6b7280", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{
              bgcolor: "#ea580c",
              color: "#ffffff",
              boxShadow: "none",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              "&:hover": { bgcolor: "#c2410c" },
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2600}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

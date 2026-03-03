// pages/EditPage.jsx
// ✅ Filters + Backend Pagination + Reverse Chronological Order + Presigned upload/download (Wasabi)

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Tooltip,
  CircularProgress, Alert, Snackbar, Stack, Tabs, Tab,
  Divider, Autocomplete, LinearProgress, TablePagination,
} from "@mui/material";
import {
  Edit as EditIcon, PlayCircle as PlayIcon,
  AutoFixHigh as MagicIcon, CheckCircle as CheckIcon,
  CloudUpload as UploadIcon, Close as CloseIcon,
  Visibility as ViewIcon, OpenInNew as OpenInNewIcon,
  AttachFile as AttachIcon, Download as DownloadIcon,
  ChatBubbleOutline as CommentIcon,
  RestartAlt as ResetIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

// ─────────────────────────────────────────────────────────────
// 🌐 PRODUCTION URLS
// ─────────────────────────────────────────────────────────────
const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/scripts";
const EMP_API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees";
const PRESIGN_API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/scripts/presign";
const PRESIGN_DOWN_API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/scripts/presign-download";

const MANAGER_ROLES = ["admin", "manager", "super-admin", "team-leader"];
const getCurrentUser = () => JSON.parse(sessionStorage.getItem("user") || "{}");
const isManagerRole = (role = "") => MANAGER_ROLES.includes(String(role || "").toLowerCase());
const getAuthHeaders = () => ({ "x-session-user": JSON.stringify(getCurrentUser()) });

// ─────────────────────────────────────────────────────────────
// ✅ WASABI PRESIGNED UPLOAD (inlined)
// ─────────────────────────────────────────────────────────────
async function getPresignedUrl(filename, contentType, authHeaders) {
  const params = new URLSearchParams({ filename, contentType });
  const res = await fetch(`${PRESIGN_API}?${params}`, { headers: authHeaders, credentials: "include" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || `Presign failed: ${res.status}`);
  }
  return res.json();
}

function uploadDirectToWasabi(file, presignedUrl, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Wasabi upload failed: HTTP ${xhr.status}`))
    );
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));
    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    // NOTE: x-amz-acl header removed — use bucket policy for public reads.
    xhr.send(file);
  });
}

function normalizeScriptText(raw = "") {
  let s = String(raw || "");
  if (!s) return "";

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(s) || /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/.test(s);
  if (!hasHtml) return s;

  s = s 
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*div\s*>/gi, "\n")
    .replace(/<\s*div[^>]*>/gi, "")
    .replace(/<\/\s*p\s*>/gi, "\n")
    .replace(/<\s*p[^>]*>/gi, "")
    // lists (optional)
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
 
  s = s
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return s;
}

async function uploadFilesToWasabi(files, authHeaders, onProgress) {
  if (!files?.length) throw new Error("No files provided");
  const progresses = new Array(files.length).fill(0);
  const reportOverall = () =>
    onProgress?.(Math.round(progresses.reduce((a, b) => a + b, 0) / files.length));

  return Promise.all(
    files.map(async (file, idx) => {
      const { presignedUrl, finalUrl } = await getPresignedUrl(
        file.name,
        file.type || "application/octet-stream",
        authHeaders
      );
      await uploadDirectToWasabi(
        file,
        presignedUrl,
        file.type || "application/octet-stream",
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

const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)(\?.*)?$/i;

// Script Types (adjust as needed)
const SCRIPT_TYPES = [
  "",
  "Muditam instagram",
  "Muditam Snooze well",
  "Youtube",
  "Meta Ads",
  "Google Ads",
  "Whatsapp",
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
  if (!c || !status)
    return <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>—</Typography>;
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

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────
function PlayerModal({ open, onClose, url, title }) {
  if (!url) return null;
  const isVideo = VIDEO_EXT.test(url);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
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
            src={url}
            controls
            sx={{
              width: "100%",
              maxHeight: "65vh",
              display: "block",
              borderRadius: 2,
              bgcolor: "#000",
              outline: "none",
            }}
          />
        ) : (
          <Box sx={{ textAlign: "center", py: 8, bgcolor: "#f8fafc", borderRadius: 2, border: "1px dashed #d1d5db" }}>
            <Typography sx={{ color: "#6b7280", mb: 3 }}>Cannot preview this file type.</Typography>
            <Button
              component="a"
              href={url}
              target="_blank"
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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
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
          <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>{title || "Comment"}</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: "#6b7280" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5, pb: 3, px: 3 }}>
        {comment ? (
          <Box sx={{ bgcolor: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: "0.9rem", color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {comment}
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ color: "#9ca3af", fontStyle: "italic", fontSize: "0.9rem" }}>No comment added.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssignCell({ script, marketingEmployees, onAssigned, showSnack, canAssign }) {
  const [value, setValue] = useState(marketingEmployees.find((e) => e.fullName === script.editAssignedTo) || null);
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
      <Typography sx={{ fontSize: "0.85rem", color: value ? "#374151" : "#9ca3af", fontWeight: value ? 500 : 400 }}>
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
          <Box component="li" {...props} sx={{ fontSize: "0.85rem", color: "#374151", "&:hover": { bgcolor: "#f3f4f6 !important" } }}>
            {option.fullName}
          </Box>
        )}
        renderInput={(params) => <TextField {...params} placeholder="Assign to…" size="small" />}
      />
      {saving ? <CircularProgress size={16} sx={{ color: "#4f46e5" }} /> : value && <CheckIcon sx={{ fontSize: 18, color: "#10b981" }} />}
    </Stack>
  );
}

function UploadVideoDialog({ open, onClose, script, onUploaded, showSnack }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [comment, setComment] = useState("");
  const [editStatus, setEditStatus] = useState("Done");
  const [holdReason, setHoldReason] = useState("");

  const needsReason = ["On Hold", "Reshoot", "Re-edit"].includes(editStatus);
  const reset = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setLabel("");
    setComment("");
    setEditStatus("Done");
    setHoldReason("");
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showSnack("Please select a file", "error");
      return;
    }
    if (needsReason && !holdReason.trim()) {
      showSnack("Please provide a reason", "error");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setLabel("Getting upload URL…");

    try {
      setLabel("Uploading to Wasabi…");
      const results = await uploadFilesToWasabi([selectedFile], getAuthHeaders(), setUploadProgress);
      const url = results[0]?.url;
      if (!url) throw new Error("No URL returned");

      setLabel("Saving to database…");
      setUploadProgress(100);

      await axios.post(
        `${API}/${script._id}/edit-upload`,
        { editFileUrl: url, editFileName: selectedFile.name, editComment: comment, editStatus, editHoldReason: holdReason },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      showSnack("Edited video uploaded! 🎬");
      onUploaded();
      handleClose();
    } catch (err) {
      showSnack(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      setLabel("");
    }
  };

  const fmtSz = (b) => (b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
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
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>Upload Edited Video</Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose} disabled={uploading} sx={{ color: "#6b7280" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        {script && (
          <Box sx={{ bgcolor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 1.5, p: 2 }}>
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
              {script.scriptText}
            </Typography>
          </Box>
        )}

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
              <Typography sx={{ fontSize: "0.9rem", color: "#374151", fontWeight: 600 }}>{selectedFile.name}</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>{fmtSz(selectedFile.size)}</Typography>
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
              <Typography sx={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: 500 }}>Click to select your edited video</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af", mt: 0.5 }}>MP4, MOV, AVI, WebM and more</Typography>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.avi,.webm,.mkv,.m4v"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setSelectedFile(f);
            }}
            disabled={uploading}
          />
        </Box>

        <Divider sx={{ borderColor: "#e5e7eb" }} />

        <FormControl size="small" sx={inputSx}>
          <InputLabel>Edit Status</InputLabel>
          <Select value={editStatus} label="Edit Status" onChange={(e) => setEditStatus(e.target.value)} disabled={uploading}>
            {EDIT_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {needsReason && (
          <TextField label="Reason *" multiline minRows={2} value={holdReason} onChange={(e) => setHoldReason(e.target.value)} disabled={uploading} sx={inputSx} />
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
              <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>{label || "Uploading…"}</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#ea580c", fontWeight: 600 }}>{uploadProgress}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ borderRadius: 1, bgcolor: "#e5e7eb", "& .MuiLinearProgress-bar": { bgcolor: "#ea580c" } }}
            />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af", mt: 0.5 }}>
                Uploading directly to storage — large files may take a few minutes
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e5e7eb", gap: 1 }}>
        <Button onClick={handleClose} disabled={uploading} sx={{ color: "#6b7280", textTransform: "none" }}>
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
          {uploading ? "Uploading…" : "Upload Edited Video"}
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

  const [tab, setTab] = useState(0);

  // Filters (draft UI) + Applied filters (used for API calls)
  const [filtersDraft, setFiltersDraft] = useState({
    assignedTo: null, // {fullName, email}
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

  // Pagination per tab
  const [pendingPage, setPendingPage] = useState(0); // 0-based for MUI
  const [pendingRows, setPendingRows] = useState(50);
  const [donePage, setDonePage] = useState(0);
  const [doneRows, setDoneRows] = useState(50);

  // Lists + totals
  const [pendingScripts, setPendingScripts] = useState([]);
  const [doneScripts, setDoneScripts] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [doneTotal, setDoneTotal] = useState(0);

  const [marketingEmployees, setMarketingEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Optional date filters (kept from your previous logic)
  const [pendingDate, setPendingDate] = useState({ dateFrom: "", dateTo: "" }); // uses cutDoneAt
  const [doneDate, setDoneDate] = useState({ dateFrom: "", dateTo: "" }); // uses editDoneAt

  // Upload / dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTarget, setDialogTarget] = useState(null);
  const [form, setForm] = useState({ editStatus: "", editHoldReason: "", editComment: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewText, setViewText] = useState("");
  const [commentModal, setCommentModal] = useState({ open: false, text: "", title: "" });
  const [player, setPlayer] = useState({ open: false, url: "", title: "" });

  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const showSnack = (msg, severity = "success") => setSnack({ open: true, msg, severity });

  const needsReason = ["On Hold", "Reshoot", "Re-edit"].includes(form.editStatus);

  // ── Extracts the Wasabi object key from a stored finalUrl ──
  const extractKey = (url) => {
    try {
      const path = new URL(url).pathname; // /bucket/scripts/uuid.ext
      const parts = path.replace(/^\//, "").split("/");
      parts.shift(); // remove bucket
      return parts.join("/");
    } catch {
      const m = url.match(/https?:\/\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
      return m ? m[1] : null;
    }
  };

  const handleDownload = async (url, filename) => {
    const key = extractKey(url);
    if (!key) {
      window.open(url, "_blank");
      return;
    }
    try {
      showSnack("Preparing download…");
      const { data } = await axios.get(PRESIGN_DOWN_API, {
        params: { key },
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      const a = Object.assign(document.createElement("a"), {
        href: data.url,
        download: filename || key.split("/").pop() || "file",
      });
      document.body.appendChild(a);
      a.click();
      a.remove();
      showSnack("Download started ✅");
    } catch (err) {
      showSnack(err.response?.data?.message || "Download failed", "error");
      window.open(url, "_blank");
    }
  };

  // ── Opens the player modal with a fresh presigned GET URL ──
  const openPlayer = async (rawUrl, title) => {
    const key = extractKey(rawUrl);
    if (!key) {
      setPlayer({ open: true, url: rawUrl, title });
      return;
    }
    try {
      const { data } = await axios.get(PRESIGN_DOWN_API, {
        params: { key },
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      setPlayer({ open: true, url: data.url, title });
    } catch {
      setPlayer({ open: true, url: rawUrl, title }); // fallback
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Load Employees once
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // API params builder (shared)
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // Load Scripts (backend pagination)
  // ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      // Pending = Cut Done + Edit Pending (server should treat comma as list)
      const pendingParams = {
        stage: "Cut Done,Edit Pending",
        page: pendingPage + 1,
        limit: pendingRows,
        ...(pendingDate.dateFrom || pendingDate.dateTo ? { dateField: "cutDoneAt", ...pendingDate } : {}),
        ...commonFilterParams,
      };

      const doneParams = {
        stage: "Edit Done",
        page: donePage + 1,
        limit: doneRows,
        ...(doneDate.dateFrom || doneDate.dateTo ? { dateField: "editDoneAt", ...doneDate } : {}),
        ...commonFilterParams,
      };

      const [pendingRes, doneRes] = await Promise.all([
        axios.get(API, { params: pendingParams, headers, withCredentials: true }),
        axios.get(API, { params: doneParams, headers, withCredentials: true }),
      ]);

      setPendingScripts(pendingRes.data.scripts || []);
      setDoneScripts(doneRes.data.scripts || []);

      setPendingTotal(pendingRes.data.pagination?.total ?? (pendingRes.data.scripts || []).length);
      setDoneTotal(doneRes.data.pagination?.total ?? (doneRes.data.scripts || []).length);
    } catch {
      showSnack("Failed to load data", "error");
      setPendingScripts([]);
      setDoneScripts([]);
      setPendingTotal(0);
      setDoneTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    pendingPage,
    pendingRows,
    donePage,
    doneRows,
    pendingDate,
    doneDate,
    commonFilterParams,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  // ─────────────────────────────────────────────────────────────
  // Filter Apply / Clear
  // ─────────────────────────────────────────────────────────────
  const applyFilters = () => {
    setFilters({
      assignedTo: filtersDraft.assignedTo?.fullName || "",
      scriptId: (filtersDraft.scriptId || "").trim(),
      scriptType: filtersDraft.scriptType || "",
      creator: (filtersDraft.creator || "").trim(),
    });

    // reset both paginations
    setPendingPage(0);
    setDonePage(0);
  };

  const clearFilters = () => {
    setFiltersDraft({ assignedTo: null, scriptId: "", scriptType: "", creator: "" });
    setFilters({ assignedTo: "", scriptId: "", scriptType: "", creator: "" });
    setPendingPage(0);
    setDonePage(0);
  };

  // ─────────────────────────────────────────────────────────────
  // Dialog helpers
  // ─────────────────────────────────────────────────────────────
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
    setDialogOpen(false);
    setDialogTarget(null);
  };

  const validate = () => {
    const errs = {};
    if (needsReason && !form.editHoldReason.trim()) errs.editHoldReason = "Reason is required";
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

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ bgcolor: "#f4f5f7", minHeight: "100vh", color: "#111827", p: 4 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.8rem", letterSpacing: "-0.5px", color: "#111827" }}>
          Edit <Box component="span" sx={{ color: "#4f46e5" }}>Workspace</Box>
        </Typography>
        <Typography sx={{ color: "#6b7280", fontSize: "0.9rem", mt: 0.5 }}>
          Assign team · Download cut video · Upload edited video · Track status
          {currentUser?.fullName && (
            <Box component="span" sx={{ ml: 1.5, color: "#9ca3af" }}>
              — <Box component="span" sx={{ color: "#4f46e5", fontWeight: 500 }}>{currentUser.fullName}</Box>
              {hasFullAccess ? (
                <Box component="span" sx={{ ml: 1, px: 1, py: 0.2, borderRadius: "100px", fontSize: "0.72rem", fontWeight: 700, bgcolor: "#ecfdf5", color: "#059669", border: "1px solid #6ee7b7" }}>
                  All Scripts
                </Box>
              ) : (
                <Box component="span" sx={{ ml: 1, px: 1, py: 0.2, borderRadius: "100px", fontSize: "0.72rem", fontWeight: 700, bgcolor: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd" }}>
                  My Scripts
                </Box>
              )}
            </Box>
          )}
        </Typography>
      </Box>

      {/* Filters Bar */}
      <Paper sx={{ ...lightPaper, mb: 2, p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
          {/* Assigned To */}
          <Autocomplete
            size="small"
            sx={{ ...acSx, minWidth: 220 }}
            options={marketingEmployees}
            value={filtersDraft.assignedTo}
            onChange={(_, v) => setFiltersDraft((s) => ({ ...s, assignedTo: v }))}
            getOptionLabel={(o) => o?.fullName || ""}
            isOptionEqualToValue={(a, b) => (a?.email || a?.fullName) === (b?.email || b?.fullName)}
            renderInput={(params) => <TextField {...params} label="Assigned To" placeholder="Select…" />}
          />

          {/* Script ID */}
          <TextField
            size="small"
            label="Script ID"
            placeholder="e.g. SNLMS001"
            value={filtersDraft.scriptId}
            onChange={(e) => setFiltersDraft((s) => ({ ...s, scriptId: e.target.value }))}
            sx={{ minWidth: 200, ...inputSx }}
          />

          {/* Type */}
          <FormControl size="small" sx={{ minWidth: 200, ...inputSx }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={filtersDraft.scriptType}
              onChange={(e) => setFiltersDraft((s) => ({ ...s, scriptType: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {SCRIPT_TYPES.filter(Boolean).map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Creator */}
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
            sx={{ bgcolor: "#4f46e5", "&:hover": { bgcolor: "#4338ca" }, textTransform: "none", fontWeight: 700 }}
          >
            Apply
          </Button>

          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={clearFilters}
            sx={{ textTransform: "none", fontWeight: 700, borderColor: "#d1d5db", color: "#374151", "&:hover": { borderColor: "#9ca3af" } }}
          >
            Clear
          </Button>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap" gap={1}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            "& .MuiTabs-indicator": { bgcolor: "#4f46e5", height: 3, borderRadius: "3px 3px 0 0" },
            "& .MuiTab-root": { color: "#6b7280", textTransform: "none", fontWeight: 700, fontSize: "0.9rem", minHeight: 48 },
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
        </Tabs>

        <Box sx={{ flex: 1 }} />

        <Button onClick={load} sx={{ textTransform: "none", fontWeight: 700, color: "#4f46e5" }}>
          Refresh
        </Button>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: "#4f46e5" }} size={32} />
        </Box>
      ) : (
        <>
          {/* ── EDIT PENDING ── */}
          {tab === 0 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {["#", "Script ID", "Type", "Script Preview", "Creator", "Cut Video", "Cut Comment", "Cut Done At", "Assigned To", "Upload Edited Video", ""].map((h) => (
                        <TableCell key={h} sx={thSx}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pendingScripts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 8, borderBottom: "none", color: "#6b7280" }}>
                          <MagicIcon sx={{ fontSize: 36, mb: 1, opacity: 0.3, display: "block", mx: "auto", color: "#9ca3af" }} />
                          No scripts found for current filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingScripts.map((s, i) => (
                        <TableRow key={s._id} sx={rowSx}>
                          <TableCell sx={{ ...tdSx, color: "#9ca3af", fontSize: "0.8rem" }}>
                            {pendingPage * pendingRows + i + 1}
                          </TableCell>

                          <TableCell sx={tdSx}><ScriptId id={s.scriptId} /></TableCell>
                          <TableCell sx={tdSx}><TypeBadge label={s.scriptType} /></TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 220 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography sx={{ fontSize: "0.85rem", color: "#4b5563", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {s.scriptText}
                              </Typography>
                              <Tooltip title="View Full Script">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setViewText(normalizeScriptText(s.scriptText));
                                    setViewOpen(true);
                                  }}
                                  sx={{ color: "#6b7280", "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
                                >
                                  <ViewIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", color: "#4b5563" }}>{s.createdBy}</Typography>
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
                                    onClick={() => handleDownload(s.cutVideoUrl, s.cutVideoName || s.scriptId + "_cut")}
                                    sx={{ color: "#6b7280", "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
                                  >
                                    <DownloadIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af" }}>—</Typography>
                            )}
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 160 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {s.cutComment || "—"}
                              </Typography>
                              {s.cutComment && (
                                <Tooltip title="View full">
                                  <IconButton
                                    size="small"
                                    onClick={() => setCommentModal({ open: true, text: s.cutComment, title: `Cut Comment — ${s.scriptId}` })}
                                    sx={{ color: "#6b7280", flexShrink: 0, "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
                                  >
                                    <ViewIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.8rem", color: "#1f2937", whiteSpace: "nowrap" }}>
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
                              onClick={() => { setUploadTarget(s); setUploadOpen(true); }}
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
                              }}
                            >
                              Upload Video
                            </Button>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Tooltip title="Update status / comment">
                              <IconButton
                                size="small"
                                onClick={() => openDialog(s)}
                                sx={{ color: "#6b7280", "&:hover": { color: "#ea580c", bgcolor: "#ffedd5" } }}
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
                onRowsPerPageChange={(e) => { setPendingRows(parseInt(e.target.value, 10)); setPendingPage(0); }}
                rowsPerPageOptions={[25, 50, 100, 200]}
              />
            </Paper>
          )}

          {/* ── EDIT DONE ── */}
          {tab === 1 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {["#", "Script ID", "Type", "Script Preview", "Assigned To", "Edited Video", "Edit Status", "Comment", "Done At", "Done By", ""].map((h) => (
                        <TableCell key={h} sx={thSx}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {doneScripts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 8, borderBottom: "none", color: "#6b7280" }}>
                          <MagicIcon sx={{ fontSize: 36, mb: 1, opacity: 0.3, display: "block", mx: "auto", color: "#9ca3af" }} />
                          No scripts found for current filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      doneScripts.map((s, i) => (
                        <TableRow key={s._id} sx={rowSx}>
                          <TableCell sx={{ ...tdSx, color: "#9ca3af", fontSize: "0.8rem" }}>
                            {donePage * doneRows + i + 1}
                          </TableCell>

                          <TableCell sx={tdSx}><ScriptId id={s.scriptId} /></TableCell>
                          <TableCell sx={tdSx}><TypeBadge label={s.scriptType} /></TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 200 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography sx={{ fontSize: "0.85rem", color: "#4b5563", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {s.scriptText}
                              </Typography>
                              <Tooltip title="View Full Script">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setViewText(normalizeScriptText(s.scriptText));
                                    setViewOpen(true);
                                  }}
                                  sx={{ color: "#6b7280", "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
                                >
                                  <ViewIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
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
                            {s.editFileUrl && s.editFileUrl !== "pending" ? (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Button
                                  size="small"
                                  onClick={() => openPlayer(s.editFileUrl, `${s.scriptId} — Edited`)}
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
                                    onClick={() => handleDownload(s.editFileUrl, s.editFileName || s.scriptId + "_edited")}
                                    sx={{ color: "#6b7280", "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
                                  >
                                    <DownloadIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af" }}>—</Typography>
                            )}
                          </TableCell>

                          <TableCell sx={tdSx}><EditStatusChip status={s.editStatus} /></TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 180 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {s.editComment || "—"}
                              </Typography>
                              {s.editComment && (
                                <Tooltip title="View full">
                                  <IconButton
                                    size="small"
                                    onClick={() => setCommentModal({ open: true, text: s.editComment, title: `Edit Comment — ${s.scriptId}` })}
                                    sx={{ color: "#6b7280", flexShrink: 0, "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
                                  >
                                    <ViewIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.8rem", color: "#1f2937", whiteSpace: "nowrap" }}>
                              {fmt(s.editDoneAt)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", color: "#059669", fontWeight: 600 }}>
                              {s.editDoneBy || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Tooltip title="Update status / comment">
                              <IconButton
                                size="small"
                                onClick={() => openDialog(s)}
                                sx={{ color: "#6b7280", "&:hover": { color: "#ea580c", bgcolor: "#ffedd5" } }}
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
                onRowsPerPageChange={(e) => { setDoneRows(parseInt(e.target.value, 10)); setDonePage(0); }}
                rowsPerPageOptions={[25, 50, 100, 200]}
              />
            </Paper>
          )}
        </>
      )}

      {/* ── Dialogs ── */}
      <UploadVideoDialog
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setUploadTarget(null); }}
        script={uploadTarget}
        onUploaded={load}
        showSnack={showSnack}
      />

      {/* Full script dialog */}
      <Dialog open={viewOpen} onClose={() => { setViewOpen(false); setViewText(""); }} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
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
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>Full Script Content</Typography>
          </Stack>
          <IconButton size="small" onClick={() => { setViewOpen(false); setViewText(""); }} sx={{ color: "#6b7280" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
          {viewText && (
  <Box sx={{ bgcolor: "#f8fafc", p: 2.5, borderRadius: 2, border: "1px solid #e5e7eb" }}>
    <Typography sx={{ fontSize: "0.95rem", color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
      {viewText}
    </Typography>
  </Box>
)}
        </DialogContent>
      </Dialog>

      {/* Edit details dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 3 } }}>
        <DialogTitle sx={{ color: "#111827", fontWeight: 700, borderBottom: "1px solid #e5e7eb", pb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <EditIcon sx={{ color: "#ea580c", fontSize: 22 }} />
          Edit Details
          {dialogTarget && (
            <Box component="span" sx={{ ml: 1, fontSize: "0.85rem", color: "#4f46e5", fontFamily: "monospace", fontWeight: 500 }}>
              {dialogTarget.scriptId}
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 3, mt: 1, overflowY: "auto", maxHeight: "70vh" }}>
          {dialogTarget && (
            <Box sx={{ bgcolor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 1.5, p: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <TypeBadge label={dialogTarget.scriptType} />
                <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>by {dialogTarget.createdBy}</Typography>
              </Stack>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  color: "#4b5563",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {dialogTarget.scriptText}
              </Typography>

              {dialogTarget.cutVideoUrl && dialogTarget.cutVideoUrl !== "pending" && (
                <Button
                  size="small"
                  onClick={() => openPlayer(dialogTarget.cutVideoUrl, "Cut Video")}
                  startIcon={<PlayIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    mt: 1.5,
                    color: "#4f46e5",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    p: "4px 10px",
                    border: "1px solid #c7d2fe",
                    borderRadius: 1.5,
                    "&:hover": { bgcolor: "#eef2ff" },
                  }}
                >
                  View Cut Video
                </Button>
              )}
            </Box>
          )}

          <Divider sx={{ borderColor: "#e5e7eb" }} />

          <FormControl size="small" sx={inputSx}>
            <InputLabel>Edit Status</InputLabel>
            <Select
              value={form.editStatus}
              label="Edit Status"
              onChange={(e) => setForm((f) => ({ ...f, editStatus: e.target.value, editHoldReason: "" }))}
            >
              <MenuItem value="">— Select —</MenuItem>
              {EDIT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {needsReason && (
            <TextField
              label="Reason *"
              multiline
              minRows={2}
              value={form.editHoldReason}
              onChange={(e) => setForm((f) => ({ ...f, editHoldReason: e.target.value }))}
              error={!!errors.editHoldReason}
              helperText={errors.editHoldReason}
              sx={inputSx}
            />
          )}

          <Divider sx={{ borderColor: "#e5e7eb" }} />

          <TextField
            label="Comment"
            multiline
            minRows={3}
            placeholder="Notes for the team…"
            value={form.editComment}
            onChange={(e) => setForm((f) => ({ ...f, editComment: e.target.value }))}
            sx={inputSx}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e5e7eb", gap: 1 }}>
          <Button onClick={closeDialog} sx={{ color: "#6b7280", textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <EditIcon />}
            sx={{
              bgcolor: "#ea580c",
              color: "#ffffff",
              boxShadow: "none",
              textTransform: "none",
              fontWeight: 800,
              px: 3,
              "&:hover": { bgcolor: "#c2410c" },
            }}
          >
            {saving ? "Saving…" : "Save Details"}
          </Button>
        </DialogActions>
      </Dialog>

      <CommentModal
        open={commentModal.open}
        onClose={() => setCommentModal({ open: false, text: "", title: "" })}
        comment={commentModal.text}
        title={commentModal.title}
      />

      <PlayerModal
        open={player.open}
        onClose={() => setPlayer({ open: false, url: "", title: "" })}
        url={player.url}
        title={player.title}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", borderRadius: 2 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
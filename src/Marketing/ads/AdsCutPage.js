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
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Divider,
  TablePagination,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  PlayCircle as PlayIcon,
  Edit as EditIcon,
  ContentCut as CutIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  OpenInNew as OpenLinkIcon,
  AttachFile as AttachIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  RestartAlt as ResetIcon,
  Campaign as CampaignIcon,
} from "@mui/icons-material";

// ─────────────────────────────────────────────────────────────
// URLs
// ─────────────────────────────────────────────────────────────
const API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/ads-videos`;
const PRESIGN_API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/ads-videos/presign`;
const PRESIGN_DOWN_API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/ads-videos/presign-download`;

const AD_TYPES = [
  "",
  "Meta Ads",
  "Google Ads",
  "YouTube Ads",
  "WhatsApp Ads",
  "Other Ads",
];

const getAuthHeaders = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  return { "x-session-user": JSON.stringify(user) };
};

// ─────────────────────────────────────────────────────────────
// Wasabi upload helpers
// ─────────────────────────────────────────────────────────────
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

    xhr.addEventListener("error", () =>
      reject(new Error("Network error during upload"))
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}

async function uploadFileToWasabi(file, authHeaders, onProgress) {
  if (!file) throw new Error("No file provided");

  const { presignedUrl, finalUrl, key } = await getPresignedUrl(
    file.name,
    file.type || "application/octet-stream",
    authHeaders
  );

  await uploadDirectToWasabi(
    file,
    presignedUrl,
    file.type || "application/octet-stream",
    onProgress
  );

  return { url: finalUrl, originalName: file.name, key };
}

// ─────────────────────────────────────────────────────────────
// Styles & helpers
// ─────────────────────────────────────────────────────────────
const lightPaper = {
  bgcolor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 2,
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#ffffff",
    "& fieldset": { borderColor: "#cbd5e1" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: "#2563eb" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#2563eb" },
};

const thSx = {
  color: "#475569",
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  borderBottom: "1px solid #e2e8f0",
  bgcolor: "#f8fafc",
  py: 2,
  whiteSpace: "nowrap",
};

const tdSx = {
  borderBottom: "1px solid #f1f5f9",
  py: 1.5,
  color: "#334155",
};

const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)(\?.*)?$/i;

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

function AdsIdBadge({ id }) {
  return (
    <Typography
      sx={{
        fontFamily: "'Inter',sans-serif",
        fontWeight: 700,
        fontSize: "0.85rem",
        color: "#2563eb",
      }}
    >
      {id}
    </Typography>
  );
}

function TypeBadge({ type }) {
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1.2,
        py: 0.3,
        borderRadius: "100px",
        fontSize: "0.75rem",
        fontWeight: 600,
        bgcolor: "#eff6ff",
        color: "#2563eb",
        border: "1px solid #bfdbfe",
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </Box>
  );
}

function HasShootChip({ hasShoot }) {
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1,
        py: 0.35,
        borderRadius: "100px",
        fontSize: "0.75rem",
        fontWeight: 700,
        bgcolor: hasShoot ? "#ecfdf5" : "#f3f4f6",
        color: hasShoot ? "#059669" : "#6b7280",
        border: hasShoot ? "1px solid #6ee7b7" : "1px solid #d1d5db",
        whiteSpace: "nowrap",
      }}
    >
      {hasShoot ? "Yes" : "No"}
    </Box>
  );
}

function previewRaw(text, max = 120) {
  const txt = String(text || "").replace(/\s+/g, " ").trim();
  return txt.length > max ? txt.slice(0, max) + "…" : txt;
}

// ─────────────────────────────────────────────────────────────
// Player modal
// ─────────────────────────────────────────────────────────────
function PlayerModal({ open, onClose, url, title }) {
  if (!url) return null;
  const isVideo = VIDEO_EXT.test(url);

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
          borderBottom: "1px solid #e2e8f0",
          py: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <PlayIcon sx={{ color: "#2563eb", fontSize: 24 }} />
          <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "1.1rem" }}>
            {title || "Preview"}
          </Typography>
        </Stack>

        <IconButton size="small" onClick={onClose}>
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
            }}
          />
        ) : (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              bgcolor: "#f8fafc",
              borderRadius: 2,
              border: "1px dashed #cbd5e1",
            }}
          >
            <Typography sx={{ color: "#475569", mb: 3 }}>
              Cannot preview this file type.
            </Typography>
            <Button
              component="a"
              href={url}
              target="_blank"
              variant="contained"
              startIcon={<OpenLinkIcon />}
              sx={{
                bgcolor: "#2563eb",
                textTransform: "none",
                fontWeight: 600,
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

// ─────────────────────────────────────────────────────────────
// Upload dialog
// ─────────────────────────────────────────────────────────────
function UploadFileDialog({ open, onClose, item, onUploaded, showSnack }) {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedFile(null);
    setProgress(0);
    setLabel("");
    setComment(item?.cutComment || "");
  }, [open, item]);

  const reset = () => {
    setSelectedFile(null);
    setProgress(0);
    setLabel("");
    setComment("");
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  const fmtSz = (b) =>
    b < 1024 * 1024
      ? `${(b / 1024).toFixed(1)} KB`
      : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  const handleUpload = async () => {
    if (!selectedFile) {
      showSnack("Select a video file", "error");
      return;
    }

    setUploading(true);
    setProgress(0);
    setLabel("Getting upload URL…");

    try {
      setLabel("Uploading…");
      const uploaded = await uploadFileToWasabi(
        selectedFile,
        getAuthHeaders(),
        setProgress
      );

      setLabel("Saving to database…");
      setProgress(100);

      await axios.post(
        `${API}/${item._id}/save-cut-file`,
        {
          cutVideoUrl: uploaded.url,
          cutVideoName: uploaded.originalName,
          cutComment: comment,
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      showSnack('Cut file uploaded ✅ Click "Yes" to mark Cut Done.');
      onUploaded();
      handleClose();
    } catch (err) {
      showSnack(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      setLabel("");
    }
  };

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
          fontWeight: 700,
          borderBottom: "1px solid #e2e8f0",
          pb: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <UploadIcon sx={{ color: "#2563eb" }} />
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>
            Upload Cut Video
          </Typography>
        </Stack>

        <IconButton size="small" onClick={handleClose} disabled={uploading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          pt: 3,
          px: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {item && (
          <Box
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 1.5,
              p: 2,
            }}
          >
            <Stack direction="row" gap={1} mb={0.5} flexWrap="wrap">
              <AdsIdBadge id={item.adsVideoId} />
              <TypeBadge type={item.adType} />
              <HasShootChip hasShoot={!!item.hasShoot} />
            </Stack>

            <Typography
              sx={{
                fontSize: "0.85rem",
                color: "#111827",
                fontWeight: 700,
                mb: 0.5,
              }}
            >
              {item.title}
            </Typography>

            <Typography
              sx={{
                fontSize: "0.85rem",
                color: "#64748b",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {previewRaw(item.ideaText, 180)}
            </Typography>
          </Box>
        )}

        <Box
          onClick={() => !uploading && fileInputRef.current?.click()}
          sx={{
            border: "2px dashed #cbd5e1",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            cursor: uploading ? "default" : "pointer",
            "&:hover": uploading ? {} : { borderColor: "#2563eb", bgcolor: "#eff6ff" },
          }}
        >
          <AttachIcon sx={{ fontSize: 36, color: "#94a3b8", mb: 1 }} />
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
              <Typography sx={{ fontSize: "0.9rem", color: "#475569", fontWeight: 500 }}>
                Click to select cut video
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", mt: 0.5 }}>
                MP4, MOV, AVI, WebM, MKV
              </Typography>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.avi,.webm,.mkv,.m4v,.wmv,.flv,.mpeg,.mpg,.3gp"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setSelectedFile(file);
            }}
          />
        </Box>

        <TextField
          label="Comment (optional)"
          placeholder="Notes about this cut..."
          multiline
          minRows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={uploading}
          sx={inputSx}
        />

        {uploading && (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography sx={{ fontSize: "0.8rem", color: "#475569" }}>
                {label || "Uploading…"}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 600 }}>
                {progress}%
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                borderRadius: 1,
                bgcolor: "#e2e8f0",
                "& .MuiLinearProgress-bar": { bgcolor: "#2563eb" },
              }}
            />

            {progress > 0 && progress < 100 && (
              <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", mt: 0.5 }}>
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
          borderTop: "1px solid #e2e8f0",
          gap: 1,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={uploading}
          sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
          sx={{
            bgcolor: "#2563eb",
            boxShadow: "none",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: "#1d4ed8" },
          }}
        >
          {uploading ? "Uploading…" : "Upload File"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Cut done dialog
// ─────────────────────────────────────────────────────────────
function CutDoneDialog({ open, onClose, item, onConfirm, confirming }) {
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
          fontWeight: 700,
          borderBottom: "1px solid #e2e8f0",
          pb: 2,
          px: 3,
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <CutIcon sx={{ color: "#2563eb" }} />
          <Typography sx={{ fontSize: "1.05rem", fontWeight: 700 }}>
            Mark as Cut Done?
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3 }}>
        <Typography sx={{ color: "#475569", fontSize: "0.95rem", mb: 2 }}>
          Is the cut complete and ready to move to Edit?
        </Typography>

        {item && (
          <Box
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 1.5,
              p: 2,
            }}
          >
            <Stack direction="row" gap={1} mb={0.5} flexWrap="wrap">
              <AdsIdBadge id={item.adsVideoId} />
              <TypeBadge type={item.adType} />
              <HasShootChip hasShoot={!!item.hasShoot} />
            </Stack>

            <Typography sx={{ fontSize: "0.85rem", color: "#111827", fontWeight: 700 }}>
              {item.title}
            </Typography>

            <Typography
              sx={{
                fontSize: "0.8rem",
                mt: 1,
                fontWeight: 500,
                color: item.cutVideoUrl ? "#059669" : "#d97706",
              }}
            >
              {item.cutVideoUrl
                ? "✅ Video uploaded"
                : "⚠️ No cut video uploaded yet — you can still mark done"}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          borderTop: "1px solid #e2e8f0",
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          disabled={confirming}
          variant="outlined"
          startIcon={<CancelIcon sx={{ fontSize: 17 }} />}
          sx={{
            borderColor: "#fca5a5",
            color: "#dc2626",
            textTransform: "none",
            fontWeight: 600,
            px: 2,
            "&:hover": { bgcolor: "#fef2f2" },
          }}
        >
          No, Not Yet
        </Button>

        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={confirming}
          startIcon={
            confirming ? (
              <CircularProgress size={15} color="inherit" />
            ) : (
              <CheckIcon sx={{ fontSize: 17 }} />
            )
          }
          sx={{
            bgcolor: "#059669",
            boxShadow: "none",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: "#047857" },
          }}
        >
          {confirming ? "Saving…" : "Yes, Cut Done ✂️"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function AdsCutPage() {
  const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");

  const [tab, setTab] = useState(0);

  const [pendingPage, setPendingPage] = useState(0);
  const [pendingRows, setPendingRows] = useState(25);
  const [donePage, setDonePage] = useState(0);
  const [doneRows, setDoneRows] = useState(25);

  const [pendingItems, setPendingItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [doneTotal, setDoneTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [creatorOptions, setCreatorOptions] = useState([]);

  const [filtersDraft, setFiltersDraft] = useState({
    q: "",
    adType: "",
    creator: "",
    stageTab: "",
  });

  const [filters, setFilters] = useState({
    q: "",
    adType: "",
    creator: "",
  });

  const applyFilters = () => {
    setFilters({
      q: (filtersDraft.q || "").trim(),
      adType: filtersDraft.adType || "",
      creator: (filtersDraft.creator || "").trim(),
    });

    if (filtersDraft.stageTab === "pending") setTab(0);
    if (filtersDraft.stageTab === "done") setTab(1);

    setPendingPage(0);
    setDonePage(0);
  };

  const clearFilters = () => {
    setFiltersDraft({ q: "", adType: "", creator: "", stageTab: "" });
    setFilters({ q: "", adType: "", creator: "" });
    setPendingPage(0);
    setDonePage(0);
  };

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);

  const [cutDoneOpen, setCutDoneOpen] = useState(false);
  const [cutDoneTarget, setCutDoneTarget] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const [editCommentOpen, setEditCommentOpen] = useState(false);
  const [editCommentTarget, setEditCommentTarget] = useState(null);
  const [editCommentVal, setEditCommentVal] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewContent, setViewContent] = useState(null);

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

  const commonParams = useMemo(() => {
    const p = { hasShoot: true };
    if (filters.q) p.q = filters.q;
    if (filters.adType) p.adType = filters.adType;
    if (filters.creator) p.creator = filters.creator;
    return p;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const pendingParams = {
        stage: "Shoot Done",
        page: pendingPage + 1,
        limit: pendingRows,
        sortBy: "shootDoneAt",
        sortDir: "desc",
        ...commonParams,
      };

      const doneParams = {
        stage: "Cut Done",
        page: donePage + 1,
        limit: doneRows,
        sortBy: "cutDoneAt",
        sortDir: "desc",
        ...commonParams,
      };

      const [shootDoneRes, cutDoneRes] = await Promise.all([
        axios.get(API, { params: pendingParams, headers, withCredentials: true }),
        axios.get(API, { params: doneParams, headers, withCredentials: true }),
      ]);

      const pRows = shootDoneRes.data.adsVideos || [];
      const dRows = cutDoneRes.data.adsVideos || [];

      setPendingItems(pRows);
      setDoneItems(dRows);

      setPendingTotal(shootDoneRes.data.pagination?.total ?? pRows.length);
      setDoneTotal(cutDoneRes.data.pagination?.total ?? dRows.length);

      const combined = [...pRows, ...dRows];
      const set = new Set();
      combined.forEach((item) => {
        if (item?.createdBy) set.add(String(item.createdBy).trim());
      });
      if (filters.creator) set.add(String(filters.creator).trim());

      setCreatorOptions(Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b)));
    } catch {
      showSnack("Failed to load", "error");
      setPendingItems([]);
      setDoneItems([]);
      setPendingTotal(0);
      setDoneTotal(0);
      setCreatorOptions([]);
    } finally {
      setLoading(false);
    }
  }, [pendingPage, pendingRows, donePage, doneRows, commonParams, filters.creator]);

  useEffect(() => {
    load();
  }, [load]);

  const openCutDone = (item) => {
    setCutDoneTarget(item);
    setCutDoneOpen(true);
  };

  const closeCutDone = () => {
    setCutDoneOpen(false);
    setCutDoneTarget(null);
  };

  const handleConfirmCutDone = async () => {
    if (!cutDoneTarget) return;
    setConfirming(true);

    try {
      await axios.post(
        `${API}/${cutDoneTarget._id}/cut-upload`,
        {
          cutVideoUrl: cutDoneTarget.cutVideoUrl || "pending",
          cutVideoName: cutDoneTarget.cutVideoName || "",
          cutComment: cutDoneTarget.cutComment || "",
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      showSnack("Moved to Cut Done ✂️");
      closeCutDone();
      setTab(1);
      load();
    } catch (err) {
      showSnack(err.response?.data?.message || "Error", "error");
    } finally {
      setConfirming(false);
    }
  };

  const openEditComment = (item) => {
    setEditCommentTarget(item);
    setEditCommentVal(item.cutComment || "");
    setEditCommentOpen(true);
  };

  const handleSaveComment = async () => {
    try {
      await axios.put(
        `${API}/${editCommentTarget._id}`,
        { cutComment: editCommentVal },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      showSnack("Comment updated");
      setEditCommentOpen(false);
      load();
    } catch {
      showSnack("Error", "error");
    }
  };

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
      setPlayer({ open: true, url: rawUrl, title });
    }
  };

  const pendingCols = 9;
  const doneCols = 9;

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", color: "#0f172a", p: 4 }}>
      <Box mb={3}>
        <Typography sx={{ fontWeight: 800, fontSize: "1.8rem", color: "#0f172a" }}>
          Ads Cut Studio
        </Typography>

        <Typography sx={{ color: "#64748b", fontSize: "0.95rem", mt: 0.5 }}>
          Upload cut videos · Mark ads as Cut Done · Track uploader and completion
          {currentUser?.fullName && (
            <Box component="span" sx={{ ml: 1.5, color: "#94a3b8" }}>
              —{" "}
              <Box component="span" sx={{ color: "#2563eb", fontWeight: 500 }}>
                {currentUser.fullName}
              </Box>
            </Box>
          )}
        </Typography>
      </Box>

      <Paper sx={{ ...lightPaper, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
          <TextField
            size="small"
            label="Search (title / idea / id / link / creator)"
            value={filtersDraft.q}
            onChange={(e) => setFiltersDraft((s) => ({ ...s, q: e.target.value }))}
            sx={{ minWidth: 320, ...inputSx }}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 220, ...inputSx }}>
            <InputLabel>Ad Type</InputLabel>
            <Select
              value={filtersDraft.adType}
              label="Ad Type"
              onChange={(e) => setFiltersDraft((s) => ({ ...s, adType: e.target.value }))}
            >
              {AD_TYPES.map((t) => (
                <MenuItem key={t || "all"} value={t}>
                  {t || "All"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 240, ...inputSx }}>
            <InputLabel>Creator</InputLabel>
            <Select
              value={filtersDraft.creator}
              label="Creator"
              onChange={(e) => setFiltersDraft((s) => ({ ...s, creator: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {creatorOptions.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220, ...inputSx }}>
            <InputLabel>Stage</InputLabel>
            <Select
              value={filtersDraft.stageTab}
              label="Stage"
              onChange={(e) => setFiltersDraft((s) => ({ ...s, stageTab: e.target.value }))}
            >
              <MenuItem value="">(No change)</MenuItem>
              <MenuItem value="pending">Cut Pending (Shoot Done)</MenuItem>
              <MenuItem value="done">Cut Done</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={applyFilters}
            sx={{
              bgcolor: "#2563eb",
              "&:hover": { bgcolor: "#1d4ed8" },
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
              borderColor: "#cbd5e1",
              color: "#475569",
              "&:hover": { borderColor: "#94a3b8" },
            }}
          >
            Clear
          </Button>

          <Button onClick={load} sx={{ textTransform: "none", fontWeight: 700, color: "#2563eb" }}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap" gap={1}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            "& .MuiTabs-indicator": {
              bgcolor: "#2563eb",
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
            "& .MuiTab-root": {
              color: "#64748b",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              minHeight: 48,
            },
            "& .Mui-selected": { color: "#2563eb !important" },
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 2,
            px: 1,
            minHeight: 48,
            width: "fit-content",
          }}
        >
          <Tab label={`Cut Pending (${pendingTotal})`} sx={{ minHeight: 48 }} />
          <Tab label={`Cut Done (${doneTotal})`} sx={{ minHeight: 48 }} />
        </Tabs>

        <Box sx={{ flex: 1 }} />
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: "#2563eb" }} size={32} />
        </Box>
      ) : (
        <>
          {tab === 0 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {[
                        "#",
                        "Ads ID",
                        "Ad Type",
                        "Title / Idea",
                        "Creator",
                        "Shoot Done At",
                        "Upload File",
                        "Cut Done?",
                        "Reference",
                      ].map((h) => (
                        <TableCell key={h} sx={thSx}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pendingItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={pendingCols}
                          align="center"
                          sx={{ py: 8, borderBottom: "none", color: "#64748b" }}
                        >
                          <CutIcon
                            sx={{
                              fontSize: 40,
                              mb: 1,
                              color: "#cbd5e1",
                              display: "block",
                              mx: "auto",
                            }}
                          />
                          No ads awaiting cut
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingItems.map((item, i) => (
                        <TableRow key={item._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>
                            {pendingPage * pendingRows + i + 1}
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <AdsIdBadge id={item.adsVideoId} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <TypeBadge type={item.adType} />
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 260 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: "0.85rem",
                                    color: "#111827",
                                    fontWeight: 700,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {item.title}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.8rem",
                                    color: "#475569",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {previewRaw(item.ideaText, 140)}
                                </Typography>
                              </Box>

                              <Tooltip title="View full idea">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setViewContent(item);
                                    setViewOpen(true);
                                  }}
                                  sx={{
                                    color: "#64748b",
                                    "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                                  }}
                                >
                                  <ViewIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem" }}>
                              {item.createdBy}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                              {fmt(item.shootDoneAt)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<UploadIcon sx={{ fontSize: 15 }} />}
                                onClick={() => {
                                  setUploadTarget(item);
                                  setUploadOpen(true);
                                }}
                                sx={{
                                  borderColor: "#bfdbfe",
                                  color: "#2563eb",
                                  textTransform: "none",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  py: 0.5,
                                  px: 1.5,
                                  "&:hover": { bgcolor: "#eff6ff", borderColor: "#2563eb" },
                                }}
                              >
                                Upload
                              </Button>

                              {item.cutVideoUrl && item.cutVideoUrl !== "pending" && (
                                <Tooltip title={`Uploaded by: ${item.cutUploadedBy || "—"}`}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.4,
                                      bgcolor: "#dcfce7",
                                      px: 1,
                                      py: 0.3,
                                      borderRadius: 1,
                                      border: "1px solid #a7f3d0",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        bgcolor: "#10b981",
                                      }}
                                    />
                                    <Typography
                                      sx={{
                                        fontSize: "0.72rem",
                                        color: "#047857",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {item.cutUploadedBy || "done"}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Stack direction="row" spacing={0.8}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => openCutDone(item)}
                                startIcon={<CheckIcon sx={{ fontSize: 15 }} />}
                                sx={{
                                  bgcolor: "#059669",
                                  color: "#fff",
                                  boxShadow: "none",
                                  textTransform: "none",
                                  fontWeight: 700,
                                  fontSize: "0.78rem",
                                  py: 0.5,
                                  px: 1.5,
                                  "&:hover": { bgcolor: "#047857" },
                                }}
                              >
                                Yes
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CancelIcon sx={{ fontSize: 15 }} />}
                                sx={{
                                  borderColor: "#fca5a5",
                                  color: "#dc2626",
                                  textTransform: "none",
                                  fontWeight: 700,
                                  fontSize: "0.78rem",
                                  py: 0.5,
                                  px: 1.5,
                                  "&:hover": { bgcolor: "#fef2f2" },
                                }}
                              >
                                No
                              </Button>
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            {item.referenceLink ? (
                              <Tooltip title="Reference Link">
                                <IconButton
                                  size="small"
                                  href={item.referenceLink}
                                  target="_blank"
                                  sx={{
                                    color: "#64748b",
                                    "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                                  }}
                                >
                                  <OpenLinkIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                —
                              </Typography>
                            )}
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
                onPageChange={(_, p) => setPendingPage(p)}
                rowsPerPage={pendingRows}
                onRowsPerPageChange={(e) => {
                  setPendingRows(parseInt(e.target.value, 10));
                  setPendingPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100, 200]}
              />
            </Paper>
          )}

          {tab === 1 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {[
                        "#",
                        "Ads ID",
                        "Ad Type",
                        "Title / Idea",
                        "Cut File",
                        "Cut Done By",
                        "Cut Done At",
                        "Comment",
                        "",
                      ].map((h) => (
                        <TableCell key={h} sx={thSx}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {doneItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={doneCols}
                          align="center"
                          sx={{ py: 8, borderBottom: "none", color: "#64748b" }}
                        >
                          <CheckIcon
                            sx={{
                              fontSize: 40,
                              mb: 1,
                              color: "#cbd5e1",
                              display: "block",
                              mx: "auto",
                            }}
                          />
                          No cut-done ads yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      doneItems.map((item, i) => (
                        <TableRow key={item._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>
                            {donePage * doneRows + i + 1}
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <AdsIdBadge id={item.adsVideoId} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <TypeBadge type={item.adType} />
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 220 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: "0.85rem",
                                    color: "#111827",
                                    fontWeight: 700,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {item.title}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.8rem",
                                    color: "#475569",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {previewRaw(item.ideaText, 120)}
                                </Typography>
                              </Box>

                              <Tooltip title="View full idea">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setViewContent(item);
                                    setViewOpen(true);
                                  }}
                                  sx={{
                                    color: "#64748b",
                                    "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                                  }}
                                >
                                  <ViewIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            {item.cutVideoUrl && item.cutVideoUrl !== "pending" ? (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Button
                                  size="small"
                                  onClick={() =>
                                    openPlayer(item.cutVideoUrl, `${item.adsVideoId} — Cut`)
                                  }
                                  startIcon={<PlayIcon sx={{ fontSize: 16 }} />}
                                  sx={{
                                    color: "#2563eb",
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.8rem",
                                    p: "4px 10px",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: 1.5,
                                    "&:hover": { bgcolor: "#eff6ff" },
                                  }}
                                >
                                  Play
                                </Button>

                                <Tooltip title="Download">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDownload(
                                        item.cutVideoUrl,
                                        item.cutVideoName || item.adsVideoId + "_cut"
                                      )
                                    }
                                    sx={{
                                      color: "#64748b",
                                      "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                                    }}
                                  >
                                    <DownloadIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                No file
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <PersonIcon sx={{ fontSize: 14, color: "#047857" }} />
                              <Typography
                                sx={{
                                  fontSize: "0.85rem",
                                  color: "#047857",
                                  fontWeight: 500,
                                }}
                              >
                                {item.cutDoneBy || "—"}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                              {fmt(item.cutDoneAt)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 200 }}>
                            <Tooltip title={item.cutComment || ""} placement="top" arrow>
                              <Typography
                                sx={{
                                  fontSize: "0.85rem",
                                  color: "#64748b",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.cutComment || "—"}
                              </Typography>
                            </Tooltip>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Tooltip title="Edit comment">
                              <IconButton
                                size="small"
                                onClick={() => openEditComment(item)}
                                sx={{
                                  color: "#64748b",
                                  "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
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
                onPageChange={(_, p) => setDonePage(p)}
                rowsPerPage={doneRows}
                onRowsPerPageChange={(e) => {
                  setDoneRows(parseInt(e.target.value, 10));
                  setDonePage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100, 200]}
              />
            </Paper>
          )}
        </>
      )}

      <UploadFileDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setUploadTarget(null);
        }}
        item={uploadTarget}
        onUploaded={load}
        showSnack={showSnack}
      />

      <CutDoneDialog
        open={cutDoneOpen}
        onClose={closeCutDone}
        item={cutDoneTarget}
        onConfirm={handleConfirmCutDone}
        confirming={confirming}
      />

      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            borderBottom: "1px solid #e2e8f0",
            py: 2,
            px: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <CampaignIcon sx={{ color: "#2563eb" }} />
            <Typography sx={{ fontWeight: 700 }}>Full Ads Idea</Typography>
          </Stack>

          <IconButton size="small" onClick={() => setViewOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
          {viewContent && (
            <Box>
              <Stack direction="row" spacing={1.5} mb={2.5} flexWrap="wrap">
                <AdsIdBadge id={viewContent.adsVideoId} />
                <TypeBadge type={viewContent.adType} />
                <HasShootChip hasShoot={!!viewContent.hasShoot} />
              </Stack>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mb: 0.5 }}>
                  Title
                </Typography>
                <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
                  {viewContent.title}
                </Typography>
              </Box>

              <Box
                sx={{
                  bgcolor: "#f8fafc",
                  p: 2.5,
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.95rem",
                    color: "#334155",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {viewContent.ideaText}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editCommentOpen}
        onClose={() => setEditCommentOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            borderBottom: "1px solid #e2e8f0",
            pb: 2,
            px: 3,
          }}
        >
          Edit Comment
        </DialogTitle>

        <DialogContent sx={{ pt: 3, px: 3 }}>
          <TextField
            label="Cut Comment"
            multiline
            minRows={3}
            fullWidth
            value={editCommentVal}
            onChange={(e) => setEditCommentVal(e.target.value)}
            sx={inputSx}
          />
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            borderTop: "1px solid #e2e8f0",
            gap: 1,
          }}
        >
          <Button
            onClick={() => setEditCommentOpen(false)}
            sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveComment}
            sx={{
              bgcolor: "#2563eb",
              boxShadow: "none",
              px: 3,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <PlayerModal
        open={player.open}
        onClose={() => setPlayer({ open: false, url: "", title: "" })}
        url={player.url}
        title={player.title}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{
            boxShadow: "0 10px 15px -3px rgb(0 0 0/0.1)",
            borderRadius: 2,
          }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
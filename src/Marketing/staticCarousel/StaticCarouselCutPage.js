import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Visibility as ViewIcon,
  Close as CloseIcon,
  AttachFile as AttachIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  RestartAlt as ResetIcon,
  Collections as CollectionsIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────
const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/static-carousel";
const PRESIGN_API =
  "https://muditamleads-14f32a10d7f7.herokuapp.com/api/static-carousel/presign";
const PRESIGN_DOWN_API =
  "https://muditamleads-14f32a10d7f7.herokuapp.com/api/static-carousel/presign-download";

const getAuthHeaders = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  return { "x-session-user": JSON.stringify(user) };
};

// ─────────────────────────────────────────────────────────────
// Wasabi upload
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
    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
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
      const { presignedUrl, finalUrl, key } = await getPresignedUrl(
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

      return {
        url: finalUrl,
        name: file.name,
        key,
      };
    })
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
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

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
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

function extractKey(url) {
  try {
    const path = new URL(url).pathname;
    const parts = path.replace(/^\//, "").split("/");
    parts.shift();
    return parts.join("/");
  } catch {
    const m = String(url || "").match(/https?:\/\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
    return m ? m[1] : null;
  }
}

function contentItemsPreview(items = [], max = 2) {
  if (!Array.isArray(items) || !items.length) return "—";
  const first = items
    .slice(0, max)
    .map((x) => x?.description || "")
    .filter(Boolean)
    .join(" • ");
  return items.length > max ? `${first} …` : first;
}

function IdBadge({ id }) {
  return (
    <Typography
      sx={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: "0.85rem",
        color: "#2563eb",
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
        fontWeight: 600,
        bgcolor: "#eff6ff",
        color: "#2563eb",
        border: "1px solid #bfdbfe",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

function ContentTypeBadge({ label }) {
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1.2,
        py: 0.3,
        borderRadius: "100px",
        fontSize: "0.72rem",
        fontWeight: 700,
        bgcolor: label === "Carousel" ? "#f5f3ff" : "#ecfeff",
        color: label === "Carousel" ? "#7c3aed" : "#0891b2",
        border:
          label === "Carousel"
            ? "1px solid #c4b5fd"
            : "1px solid #a5f3fc",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

function StagePill({ stage }) {
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1,
        py: 0.3,
        borderRadius: 1,
        fontSize: "0.72rem",
        fontWeight: 600,
        bgcolor: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
        whiteSpace: "nowrap",
      }}
    >
      {stage}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────
// Asset Preview Dialog
// ─────────────────────────────────────────────────────────────
function AssetPreviewDialog({ open, onClose, title, assets = [], onDownload }) {
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
          <CollectionsIcon sx={{ color: "#2563eb" }} />
          <Typography sx={{ fontWeight: 700 }}>{title || "Assets Preview"}</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3, pb: 3 }}>
        {!assets.length ? (
          <Typography sx={{ color: "#64748b" }}>No assets found.</Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr",
              },
              gap: 2,
            }}
          >
            {assets.map((asset, idx) => (
              <Box
                key={`${asset.name || "asset"}-${idx}`}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  overflow: "hidden",
                  bgcolor: "#ffffff",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    bgcolor: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    component="img"
                    src={asset.previewUrl || asset.url}
                    alt={asset.name || `asset-${idx + 1}`}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>

                <Box sx={{ p: 1.5 }}>
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      color: "#334155",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {asset.name || `Asset ${idx + 1}`}
                  </Typography>

                  <Stack direction="row" spacing={1} mt={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      component="a"
                      href={asset.previewUrl || asset.url}
                      target="_blank"
                      startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        borderColor: "#bfdbfe",
                        color: "#2563eb",
                      }}
                    >
                      Open
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onDownload(asset)}
                      startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        borderColor: "#cbd5e1",
                        color: "#475569",
                      }}
                    >
                      Download
                    </Button>
                  </Stack>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Upload Assets Dialog
// ─────────────────────────────────────────────────────────────
function UploadAssetsDialog({ open, onClose, item, onUploaded, showSnack }) {
  const fileInputRef = useRef(null);
  const [selectedFiles, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) {
      setFiles([]);
      setProgress(0);
      setLabel("");
      setComment("");
    }
  }, [open]);

  const handleClose = () => {
    if (uploading) return;
    setFiles([]);
    setProgress(0);
    setLabel("");
    setComment("");
    onClose();
  };

  const fmtSz = (b) =>
    b < 1024 * 1024
      ? `${(b / 1024).toFixed(1)} KB`
      : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      showSnack("Select at least one image", "error");
      return;
    }

    setUploading(true);
    setProgress(0);
    setLabel("Getting upload URL…");

    try {
      setLabel("Uploading assets…");
      const uploaded = await uploadFilesToWasabi(
        selectedFiles,
        getAuthHeaders(),
        setProgress
      );

      setLabel("Saving assets…");
      setProgress(100);

      await axios.post(
        `${API}/${item._id}/save-cut-assets`,
        {
          cutAssets: uploaded,
          cutComment: comment,
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      showSnack(`${uploaded.length} asset(s) uploaded ✅`);
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
            Upload Cut Assets
          </Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose} disabled={uploading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        {item && (
          <Box
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 1.5,
              p: 2,
            }}
          >
            <Stack direction="row" gap={1} mb={1} flexWrap="wrap">
              <IdBadge id={item.staticCarouselId} />
              <ContentTypeBadge label={item.contentType} />
              <TypeBadge label={item.scriptType} />
            </Stack>

            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>
              {item.title}
            </Typography>

            <Typography
              sx={{
                mt: 0.8,
                fontSize: "0.82rem",
                color: "#64748b",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {contentItemsPreview(item.contentItems, 3)}
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
          <Typography sx={{ fontSize: "0.9rem", color: "#475569", fontWeight: 500 }}>
            Click to select image asset(s)
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", mt: 0.5 }}>
            JPG, PNG, WebP · Multiple allowed
          </Typography>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.png,.jpg,.jpeg,.webp"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </Box>

        {selectedFiles.length > 0 && (
          <Stack spacing={1}>
            <Typography sx={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
              {selectedFiles.length} file(s) selected
            </Typography>

            {selectedFiles.map((f, i) => (
              <Stack
                key={i}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 1.5,
                  px: 2,
                  py: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      color: "#334155",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.name}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {fmtSz(f.size)}
                  </Typography>
                </Box>

                <IconButton
                  size="small"
                  disabled={uploading}
                  onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}

        <TextField
          label="Comment (optional)"
          placeholder="Notes about these assets..."
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
        <Button onClick={handleClose} disabled={uploading} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={uploading || !selectedFiles.length}
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
          {uploading ? "Uploading…" : "Upload Assets"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Confirm Cut Done Dialog
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
      <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", pb: 2, px: 3 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <CollectionsIcon sx={{ color: "#2563eb" }} />
          <Typography sx={{ fontSize: "1.05rem", fontWeight: 700 }}>
            Mark as Cut Done?
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3 }}>
        <Typography sx={{ color: "#475569", fontSize: "0.95rem", mb: 2 }}>
          Are the cut assets complete and ready to move forward?
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
            <Stack direction="row" gap={1} mb={1} flexWrap="wrap">
              <IdBadge id={item.staticCarouselId} />
              <ContentTypeBadge label={item.contentType} />
            </Stack>

            <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827" }}>
              {item.title}
            </Typography>

            <Typography
              sx={{
                mt: 1,
                fontSize: "0.8rem",
                fontWeight: 500,
                color:
                  item.cutAssets && item.cutAssets.length
                    ? "#059669"
                    : "#d97706",
              }}
            >
              {item.cutAssets && item.cutAssets.length
                ? `✅ ${item.cutAssets.length} asset(s) uploaded`
                : "⚠️ No assets uploaded yet — you can still mark done"}
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
          {confirming ? "Saving…" : "Yes, Cut Done"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function StaticCarouselCutPage() {
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

  const [creatorOptions, setCreatorOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtersDraft, setFiltersDraft] = useState({
    q: "",
    scriptType: "",
    contentType: "",
    creator: "",
    stageTab: "",
  });

  const [filters, setFilters] = useState({
    q: "",
    scriptType: "",
    contentType: "",
    creator: "",
  });

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

  const [assetPreview, setAssetPreview] = useState({
    open: false,
    title: "",
    assets: [],
  });

  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    severity: "success",
  });

  const showSnack = (msg, severity = "success") =>
    setSnack({ open: true, msg, severity });

  const applyFilters = () => {
    setFilters({
      q: (filtersDraft.q || "").trim(),
      scriptType: filtersDraft.scriptType || "",
      contentType: filtersDraft.contentType || "",
      creator: (filtersDraft.creator || "").trim(),
    });

    if (filtersDraft.stageTab === "pending") setTab(0);
    if (filtersDraft.stageTab === "done") setTab(1);

    setPendingPage(0);
    setDonePage(0);
  };

  const clearFilters = () => {
    setFiltersDraft({
      q: "",
      scriptType: "",
      contentType: "",
      creator: "",
      stageTab: "",
    });
    setFilters({
      q: "",
      scriptType: "",
      contentType: "",
      creator: "",
    });
    setPendingPage(0);
    setDonePage(0);
  };

  const commonParams = useMemo(() => {
    const p = {};
    if (filters.q) p.q = filters.q;
    if (filters.scriptType) p.scriptType = filters.scriptType;
    if (filters.contentType) p.contentType = filters.contentType;
    if (filters.creator) p.creator = filters.creator;
    return p;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const pendingParams = {
        stage: "Shoot Done,Cut Pending",
        page: pendingPage + 1,
        limit: pendingRows,
        sortBy: "createdAt",
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

      const [pendingRes, doneRes] = await Promise.all([
        axios.get(API, { params: pendingParams, headers, withCredentials: true }),
        axios.get(API, { params: doneParams, headers, withCredentials: true }),
      ]);

      const pRows = pendingRes.data.staticCarousels || [];
      const dRows = doneRes.data.staticCarousels || [];

      setPendingItems(pRows);
      setDoneItems(dRows);

      setPendingTotal(pendingRes.data.pagination?.total ?? pRows.length);
      setDoneTotal(doneRes.data.pagination?.total ?? dRows.length);

      const set = new Set();
      [...pRows, ...dRows].forEach((x) => {
        if (x?.createdBy) set.add(String(x.createdBy).trim());
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
          cutAssets: cutDoneTarget.cutAssets || [],
          cutComment: cutDoneTarget.cutComment || "",
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      showSnack("Moved to Cut Done ✅");
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

  const handleDownload = async (asset) => {
    const key = asset?.key || extractKey(asset?.url);
    if (!key) {
      window.open(asset?.url, "_blank");
      return;
    }

    try {
      const { data } = await axios.get(PRESIGN_DOWN_API, {
        params: { key },
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      const a = Object.assign(document.createElement("a"), {
        href: data.url,
        download: asset?.name || key.split("/").pop() || "asset",
      });
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      window.open(asset?.url, "_blank");
    }
  };

  const openAssetsPreview = async (assets = [], title = "Assets") => {
    try {
      const signedAssets = await Promise.all(
        (assets || []).map(async (asset) => {
          const key = asset?.key || extractKey(asset?.url);
          if (!key) return { ...asset, previewUrl: asset?.url };

          try {
            const { data } = await axios.get(PRESIGN_DOWN_API, {
              params: { key },
              headers: getAuthHeaders(),
              withCredentials: true,
            });
            return { ...asset, previewUrl: data.url };
          } catch {
            return { ...asset, previewUrl: asset?.url };
          }
        })
      );

      setAssetPreview({
        open: true,
        title,
        assets: signedAssets,
      });
    } catch {
      setAssetPreview({
        open: true,
        title,
        assets,
      });
    }
  };

  const pendingCols = 10;
  const doneCols = 10;

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", color: "#0f172a", p: 4 }}>
      <Box mb={3}>
        <Typography sx={{ fontWeight: 800, fontSize: "1.8rem", color: "#0f172a" }}>
          Static / Carousel Cut Studio
        </Typography>
        <Typography sx={{ color: "#64748b", fontSize: "0.95rem", mt: 0.5 }}>
          Upload cut assets · Mark items as Cut Done · Manage image bundles
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

      {/* Filters */}
      <Paper sx={{ ...lightPaper, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
          <TextField
            size="small"
            label="Search (title / items / id / creator)"
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
            <InputLabel>Script Type</InputLabel>
            <Select
              value={filtersDraft.scriptType}
              label="Script Type"
              onChange={(e) => setFiltersDraft((s) => ({ ...s, scriptType: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {[
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
              ].map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180, ...inputSx }}>
            <InputLabel>Content Type</InputLabel>
            <Select
              value={filtersDraft.contentType}
              label="Content Type"
              onChange={(e) => setFiltersDraft((s) => ({ ...s, contentType: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Static">Static</MenuItem>
              <MenuItem value="Carousel">Carousel</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220, ...inputSx }}>
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

          <FormControl size="small" sx={{ minWidth: 180, ...inputSx }}>
            <InputLabel>Stage</InputLabel>
            <Select
              value={filtersDraft.stageTab}
              label="Stage"
              onChange={(e) => setFiltersDraft((s) => ({ ...s, stageTab: e.target.value }))}
            >
              <MenuItem value="">(No change)</MenuItem>
              <MenuItem value="pending">Cut Pending</MenuItem>
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

      {/* Tabs */}
      <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap" gap={1}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            "& .MuiTabs-indicator": { bgcolor: "#2563eb", height: 3, borderRadius: "3px 3px 0 0" },
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
          <Tab label={`Cut Pending (${pendingTotal})`} />
          <Tab label={`Cut Done (${doneTotal})`} />
        </Tabs>

        <Box sx={{ flex: 1 }} />
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: "#2563eb" }} size={32} />
        </Box>
      ) : (
        <>
          {/* Pending */}
          {tab === 0 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {[
                        "#",
                        "ID",
                        "Content Type",
                        "Script Type",
                        "Title / Items",
                        "Creator",
                        "Assets",
                        "Comment",
                        "Stage",
                        "Actions",
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
                        <TableCell colSpan={pendingCols} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                          <CollectionsIcon
                            sx={{
                              fontSize: 40,
                              mb: 1,
                              color: "#cbd5e1",
                              display: "block",
                              mx: "auto",
                            }}
                          />
                          No items awaiting cut
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingItems.map((item, i) => (
                        <TableRow key={item._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>
                            {pendingPage * pendingRows + i + 1}
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <IdBadge id={item.staticCarouselId} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <ContentTypeBadge label={item.contentType} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <TypeBadge label={item.scriptType} />
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 280 }}>
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
                                    color: "#64748b",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {contentItemsPreview(item.contentItems, 2)}
                                </Typography>
                              </Box>

                              <Tooltip title="View full">
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
                            <Typography sx={{ fontSize: "0.85rem" }}>{item.createdBy}</Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            {item.cutAssets?.length ? (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  openAssetsPreview(
                                    item.cutAssets,
                                    `${item.staticCarouselId} — Cut Assets`
                                  )
                                }
                                sx={{
                                  borderColor: "#bfdbfe",
                                  color: "#2563eb",
                                  textTransform: "none",
                                  fontWeight: 600,
                                  fontSize: "0.78rem",
                                }}
                              >
                                View ({item.cutAssets.length})
                              </Button>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                No assets
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 180 }}>
                            <Typography
                              sx={{
                                fontSize: "0.82rem",
                                color: "#64748b",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.cutComment || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <StagePill stage={item.stage} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
                                {item.cutAssets?.length ? "Reupload" : "Upload"}
                              </Button>

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
                                Mark Done
                              </Button>
                            </Stack>
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

          {/* Done */}
          {tab === 1 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {[
                        "#",
                        "ID",
                        "Content Type",
                        "Script Type",
                        "Title / Items",
                        "Assets",
                        "Cut Done By",
                        "Cut Done At",
                        "Comment",
                        "Actions",
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
                        <TableCell colSpan={doneCols} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                          <CheckIcon
                            sx={{
                              fontSize: 40,
                              mb: 1,
                              color: "#cbd5e1",
                              display: "block",
                              mx: "auto",
                            }}
                          />
                          No cut-done items yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      doneItems.map((item, i) => (
                        <TableRow key={item._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>
                            {donePage * doneRows + i + 1}
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <IdBadge id={item.staticCarouselId} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <ContentTypeBadge label={item.contentType} />
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <TypeBadge label={item.scriptType} />
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 250 }}>
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
                                    color: "#64748b",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {contentItemsPreview(item.contentItems, 2)}
                                </Typography>
                              </Box>

                              <Tooltip title="View full">
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
                            {item.cutAssets?.length ? (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  openAssetsPreview(
                                    item.cutAssets,
                                    `${item.staticCarouselId} — Cut Assets`
                                  )
                                }
                                sx={{
                                  borderColor: "#bfdbfe",
                                  color: "#2563eb",
                                  textTransform: "none",
                                  fontWeight: 600,
                                  fontSize: "0.78rem",
                                }}
                              >
                                View ({item.cutAssets.length})
                              </Button>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                No assets
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", color: "#047857", fontWeight: 500 }}>
                              {item.cutDoneBy || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                              {fmt(item.cutDoneAt)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ ...tdSx, maxWidth: 180 }}>
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
                            <Stack direction="row" spacing={1}>
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

                              <Tooltip title="Upload / Reupload assets">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setUploadTarget(item);
                                    setUploadOpen(true);
                                  }}
                                  sx={{
                                    color: "#64748b",
                                    "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                                  }}
                                >
                                  <UploadIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
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

      <UploadAssetsDialog
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

      <AssetPreviewDialog
        open={assetPreview.open}
        onClose={() => setAssetPreview({ open: false, title: "", assets: [] })}
        title={assetPreview.title}
        assets={assetPreview.assets}
        onDownload={handleDownload}
      />

      {/* View full content dialog */}
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
            <ViewIcon sx={{ color: "#2563eb" }} />
            <Typography sx={{ fontWeight: 700 }}>Full Content</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setViewOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
          {viewContent && (
            <Box>
              <Stack direction="row" spacing={1.2} mb={2} flexWrap="wrap">
                <IdBadge id={viewContent.staticCarouselId} />
                <ContentTypeBadge label={viewContent.contentType} />
                <TypeBadge label={viewContent.scriptType} />
              </Stack>

              <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#111827", mb: 1.5 }}>
                {viewContent.title}
              </Typography>

              <Box
                sx={{
                  bgcolor: "#f8fafc",
                  p: 2.5,
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                }}
              >
                {!viewContent.contentItems?.length ? (
                  <Typography sx={{ fontSize: "0.9rem", color: "#64748b" }}>
                    No content items.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {viewContent.contentItems.map((item, idx) => (
                      <Box key={idx}>
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            color: "#2563eb",
                            fontWeight: 700,
                            mb: 0.3,
                          }}
                        >
                          Item {item.itemNo || idx + 1}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.92rem",
                            color: "#334155",
                            lineHeight: 1.7,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {item.description || "—"}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

              {viewContent.referenceLink && (
                <Button
                  component="a"
                  href={viewContent.referenceLink}
                  target="_blank"
                  startIcon={<OpenInNewIcon />}
                  sx={{
                    mt: 2,
                    color: "#2563eb",
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Open Reference Link
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit comment */}
      <Dialog
        open={editCommentOpen}
        onClose={() => setEditCommentOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", pb: 2, px: 3 }}>
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

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ boxShadow: "0 10px 15px -3px rgb(0 0 0/0.1)", borderRadius: 2 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
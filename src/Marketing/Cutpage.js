// pages/CutPage.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Tooltip, CircularProgress, Alert, Snackbar, Stack, Tabs, Tab,
  LinearProgress, Popover,
} from "@mui/material";
import {
  CloudUpload as UploadIcon, PlayCircle as PlayIcon,
  Edit as EditIcon, ContentCut as CutIcon,
  Visibility as ViewIcon, Close as CloseIcon,
  OpenInNew as OpenLinkIcon, AttachFile as AttachIcon,
  Delete as DeleteIcon, Download as DownloadIcon,
  CheckCircle as CheckIcon, Cancel as CancelIcon,
  Person as PersonIcon, DateRange as DateRangeIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from "@mui/icons-material";


const API        = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/scripts";
const UPLOAD_API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/scripts/upload/wasabi";


const getAuthHeaders = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  return { "x-session-user": JSON.stringify(user) };
};


const lightPaper = { bgcolor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 2, boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)" };
const inputSx = { "& .MuiOutlinedInput-root": { bgcolor: "#ffffff", "& fieldset": { borderColor: "#cbd5e1" }, "&:hover fieldset": { borderColor: "#94a3b8" }, "&.Mui-focused fieldset": { borderColor: "#2563eb" } }, "& .MuiInputLabel-root.Mui-focused": { color: "#2563eb" } };
const thSx = { color: "#475569", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", bgcolor: "#f8fafc", py: 2, whiteSpace: "nowrap" };
const tdSx = { borderBottom: "1px solid #f1f5f9", py: 1.5, color: "#334155" };
const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)(\?.*)?$/i;


const DATE_RANGES = [
  { value: "all", label: "All Time" }, { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" }, { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" }, { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];


function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function ScriptIdBadge({ id }) {
  return <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#2563eb" }}>{id}</Typography>;
}
function TypeBadge({ type }) {
  return <Box sx={{ display: "inline-block", px: 1.2, py: 0.3, borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, bgcolor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>{type}</Box>;
}
function StagePill({ stage }) {
  const isShootDone = stage === "Shoot Done";
  return <Box sx={{ display: "inline-block", px: 1, py: 0.3, borderRadius: 1, fontSize: "0.72rem", fontWeight: 600, bgcolor: isShootDone ? "#fef9c3" : "#dbeafe", color: isShootDone ? "#b45309" : "#1d4ed8", border: `1px solid ${isShootDone ? "#fde68a" : "#bfdbfe"}`, whiteSpace: "nowrap" }}>{stage}</Box>;
}


function PlayerModal({ open, onClose, url, title }) {
  if (!url) return null;
  const isVideo = VIDEO_EXT.test(url);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
      <DialogTitle sx={{ borderBottom: "1px solid #e2e8f0", py: 2, px: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" alignItems="center" gap={1}><PlayIcon sx={{ color: "#2563eb", fontSize: 24 }} /><Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "1.1rem" }}>{title || "Preview"}</Typography></Stack>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 3, px: 3 }}>
        {isVideo ? (
          <Box component="video" src={url} controls sx={{ width: "100%", maxHeight: "65vh", display: "block", borderRadius: 2, bgcolor: "#000" }} />
        ) : (
          <Box sx={{ textAlign: "center", py: 8, bgcolor: "#f8fafc", borderRadius: 2, border: "1px dashed #cbd5e1" }}>
            <Typography sx={{ color: "#475569", mb: 3 }}>Cannot preview this file type inline.</Typography>
            <Button component="a" href={url} target="_blank" variant="contained" startIcon={<OpenLinkIcon />} sx={{ bgcolor: "#2563eb", textTransform: "none", fontWeight: 600, boxShadow: "none" }}>Open Externally</Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}


function UploadFileDialog({ open, onClose, script, onUploaded, showSnack }) {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [comment, setComment]     = useState("");
  const reset = () => { setSelectedFiles([]); setProgress(0); setComment(""); };
  const handleClose = () => { if (uploading) return; reset(); onClose(); };
  const fmtSize = (b) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;


  const handleUpload = async () => {
    if (!selectedFiles.length) { showSnack("Select at least one file", "error"); return; }
    setUploading(true); setProgress(10);
    try {
      const fd = new FormData();
      selectedFiles.forEach((f) => fd.append("files", f));
      const { data } = await axios.post(UPLOAD_API, fd, {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" }, withCredentials: true,
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / (e.total || 1)) * 80) + 10),
      });
      const urls = data.urls || [];
      if (!urls.length) throw new Error("No URLs returned");
      setProgress(90);
      const extraText = urls.length > 1 ? urls.map((u, i) => `File ${i + 1}: ${u.url}`).join("\n") : "";
      const finalComment = [comment, extraText].filter(Boolean).join("\n\n");
      await axios.post(`${API}/${script._id}/save-cut-file`,
        { cutVideoUrl: urls[0].url, cutVideoName: urls[0].originalName, cutComment: finalComment },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      setProgress(100);
      showSnack(`${urls.length} file(s) uploaded ✅  Click "Yes" to mark Cut Done.`);
      onUploaded(); handleClose();
    } catch (err) { showSnack(err.response?.data?.message || "Upload failed", "error"); }
    finally { setUploading(false); }
  };


  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", pb: 2, px: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" alignItems="center" gap={1}><UploadIcon sx={{ color: "#2563eb" }} /><Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>Upload Cut File</Typography></Stack>
        <IconButton size="small" onClick={handleClose} disabled={uploading}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, px: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        {script && (
          <Box sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5, p: 2 }}>
            <Stack direction="row" gap={1} mb={0.5}><ScriptIdBadge id={script.scriptId} /><TypeBadge type={script.scriptType} /></Stack>
            <Typography sx={{ fontSize: "0.85rem", color: "#64748b", mt: 0.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{script.scriptText}</Typography>
          </Box>
        )}
        <Box onClick={() => !uploading && fileInputRef.current?.click()}
          sx={{ border: "2px dashed #cbd5e1", borderRadius: 2, p: 4, textAlign: "center", cursor: uploading ? "default" : "pointer", "&:hover": uploading ? {} : { borderColor: "#2563eb", bgcolor: "#eff6ff" } }}>
          <AttachIcon sx={{ fontSize: 36, color: "#94a3b8", mb: 1 }} />
          <Typography sx={{ fontSize: "0.9rem", color: "#475569", fontWeight: 500 }}>Click to select file(s)</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", mt: 0.5 }}>MP4, MOV, AVI, WebM, MKV · Multiple allowed</Typography>
          <input ref={fileInputRef} type="file" multiple accept="video/*,.mp4,.mov,.avi,.webm,.mkv,.m4v" style={{ display: "none" }}
            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} disabled={uploading} />
        </Box>
        {selectedFiles.length > 0 && (
          <Stack spacing={1}>
            <Typography sx={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>{selectedFiles.length} file(s) selected</Typography>
            {selectedFiles.map((f, i) => (
              <Stack key={i} direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5, px: 2, py: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "#334155", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>{fmtSize(f.size)}</Typography>
                </Box>
                <IconButton size="small" onClick={() => setSelectedFiles((p) => p.filter((_, j) => j !== i))} disabled={uploading}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
              </Stack>
            ))}
          </Stack>
        )}
        <TextField label="Comment (optional)" placeholder="Notes about this cut..." multiline minRows={2} value={comment} onChange={(e) => setComment(e.target.value)} disabled={uploading} sx={inputSx} />
        {uploading && (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography sx={{ fontSize: "0.8rem", color: "#475569" }}>Uploading to Wasabi…</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 600 }}>{progress}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1, bgcolor: "#e2e8f0", "& .MuiLinearProgress-bar": { bgcolor: "#2563eb" } }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e2e8f0", gap: 1 }}>
        <Button onClick={handleClose} disabled={uploading} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>Cancel</Button>
        <Button variant="contained" onClick={handleUpload} disabled={uploading || !selectedFiles.length}
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
          sx={{ bgcolor: "#2563eb", boxShadow: "none", textTransform: "none", fontWeight: 600, px: 3, "&:hover": { bgcolor: "#1d4ed8" } }}>
          {uploading ? "Uploading…" : "Upload File"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


function CutDoneDialog({ open, onClose, script, onConfirm, confirming }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", pb: 2, px: 3 }}>
        <Stack direction="row" alignItems="center" gap={1}><CutIcon sx={{ color: "#2563eb" }} /><Typography sx={{ fontSize: "1.05rem", fontWeight: 700 }}>Mark as Cut Done?</Typography></Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, px: 3 }}>
        <Typography sx={{ color: "#475569", fontSize: "0.95rem", mb: 2 }}>Is the cut complete and ready to move to Edit?</Typography>
        {script && (
          <Box sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5, p: 2 }}>
            <Stack direction="row" gap={1} mb={0.5}><ScriptIdBadge id={script.scriptId} /><TypeBadge type={script.scriptType} /></Stack>
            <Typography sx={{ fontSize: "0.8rem", mt: 1, fontWeight: 500, color: script.cutVideoUrl ? "#059669" : "#d97706" }}>
              {script.cutVideoUrl ? "✅ File uploaded" : "⚠️ No file uploaded yet — you can still mark done"}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e2e8f0", gap: 1 }}>
        <Button onClick={onClose} disabled={confirming} variant="outlined" startIcon={<CancelIcon sx={{ fontSize: 17 }} />}
          sx={{ borderColor: "#fca5a5", color: "#dc2626", textTransform: "none", fontWeight: 600, px: 2, "&:hover": { bgcolor: "#fef2f2" } }}>No, Not Yet</Button>
        <Button variant="contained" onClick={onConfirm} disabled={confirming}
          startIcon={confirming ? <CircularProgress size={15} color="inherit" /> : <CheckIcon sx={{ fontSize: 17 }} />}
          sx={{ bgcolor: "#059669", boxShadow: "none", textTransform: "none", fontWeight: 600, px: 3, "&:hover": { bgcolor: "#047857" } }}>
          {confirming ? "Saving…" : "Yes, Cut Done ✂️"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


export default function CutPage() {
  const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");


  const [tab, setTab]                         = useState(0);
  const [pendingScripts, setPendingScripts]   = useState([]);
  const [doneScripts, setDoneScripts]         = useState([]);
  const [loading, setLoading]                 = useState(true);


  // ── Date filter state ──
  const [dateRange,   setDateRange]   = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [dateAnchor,  setDateAnchor]  = useState(null);


  const [uploadOpen,    setUploadOpen]    = useState(false);
  const [uploadTarget,  setUploadTarget]  = useState(null);
  const [cutDoneOpen,   setCutDoneOpen]   = useState(false);
  const [cutDoneTarget, setCutDoneTarget] = useState(null);
  const [confirming,    setConfirming]    = useState(false);
  const [editCommentOpen,   setEditCommentOpen]   = useState(false);
  const [editCommentTarget, setEditCommentTarget] = useState(null);
  const [editCommentVal,    setEditCommentVal]     = useState("");
  const [viewOpen, setViewOpen]       = useState(false);
  const [viewContent, setViewContent] = useState(null);
  const [player, setPlayer]           = useState({ open: false, url: "", title: "" });
  const [snack, setSnack]             = useState({ open: false, msg: "", severity: "success" });
  const showSnack = (msg, severity = "success") => setSnack({ open: true, msg, severity });


  const dateLabel = dateRange === "custom" && customStart && customEnd
    ? `${customStart} → ${customEnd}`
    : DATE_RANGES.find((r) => r.value === dateRange)?.label || "All Time";


  const buildDateParams = (field) => {
    const p = {};
    if (dateRange !== "all") { p.dateRange = dateRange; p.dateField = field; }
    if (dateRange === "custom" && customStart) p.customStart = customStart;
    if (dateRange === "custom" && customEnd)   p.customEnd   = customEnd;
    return p;
  };


  const load = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ CROSS-VISIBILITY: Shoot Done → visible in Cut Pending
      const [shootDoneRes, cutDoneRes] = await Promise.all([
        axios.get(API, { params: { stage: "Shoot Done", ...buildDateParams("shootDoneAt") }, headers: getAuthHeaders(), withCredentials: true }),
        axios.get(API, { params: { stage: "Cut Done",   ...buildDateParams("cutDoneAt")   }, headers: getAuthHeaders(), withCredentials: true }),
      ]);
      setPendingScripts(shootDoneRes.data.scripts || []);
      setDoneScripts(cutDoneRes.data.scripts || []);
    } catch { showSnack("Failed to load", "error"); }
    finally { setLoading(false); }
  }, [dateRange, customStart, customEnd]);


  useEffect(() => { load(); }, [load]);


  const openCutDone  = (s) => { setCutDoneTarget(s); setCutDoneOpen(true); };
  const closeCutDone = () => { setCutDoneOpen(false); setCutDoneTarget(null); };


  const handleConfirmCutDone = async () => {
    if (!cutDoneTarget) return;
    setConfirming(true);
    try {
      const url  = cutDoneTarget.cutVideoUrl || "pending";
      const name = cutDoneTarget.cutVideoName || "";
      const cmt  = cutDoneTarget.cutComment  || "";
      await axios.post(`${API}/${cutDoneTarget._id}/cut-upload`,
        { cutVideoUrl: url, cutVideoName: name, cutComment: cmt },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      showSnack("Moved to Cut Done ✂️"); closeCutDone(); setTab(1); load();
    } catch (err) { showSnack(err.response?.data?.message || "Error", "error"); }
    finally { setConfirming(false); }
  };


  const openEditComment   = (s) => { setEditCommentTarget(s); setEditCommentVal(s.cutComment || ""); setEditCommentOpen(true); };
  const handleSaveComment = async () => {
    try {
      await axios.put(`${API}/${editCommentTarget._id}`, { cutComment: editCommentVal }, { headers: getAuthHeaders(), withCredentials: true });
      showSnack("Comment updated"); setEditCommentOpen(false); load();
    } catch { showSnack("Error", "error"); }
  };


  const handleDownload = async (url, filename) => {
    try {
      showSnack("Preparing download…");
      const res  = await fetch(url);
      const blob = await res.blob();
      const bUrl = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = bUrl; a.download = filename || "video"; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(bUrl);
      showSnack("Download started ✅");
    } catch { window.open(url, "_blank"); }
  };


  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", color: "#0f172a", p: 4 }}>
      <Box mb={4}>
        <Typography sx={{ fontWeight: 800, fontSize: "1.8rem", color: "#0f172a" }}>Cut Studio</Typography>
        <Typography sx={{ color: "#64748b", fontSize: "0.95rem", mt: 0.5 }}>
          Upload cut files · Mark scripts as Cut Done · Track who uploaded & who confirmed
          {currentUser?.fullName && <Box component="span" sx={{ ml: 1.5, color: "#94a3b8" }}>— <Box component="span" sx={{ color: "#2563eb", fontWeight: 500 }}>{currentUser.fullName}</Box></Box>}
        </Typography>
      </Box>


      <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            "& .MuiTabs-indicator": { bgcolor: "#2563eb", height: 3, borderRadius: "3px 3px 0 0" },
            "& .MuiTab-root": { color: "#64748b", textTransform: "none", fontWeight: 600, fontSize: "0.95rem", minHeight: 48 },
            "& .Mui-selected": { color: "#2563eb !important" },
            bgcolor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 2, px: 1, minHeight: 48, width: "fit-content",
          }}>
          <Tab label={`Cut Pending  (${pendingScripts.length})`} sx={{ minHeight: 48 }} />
          <Tab label={`Cut Done  (${doneScripts.length})`}       sx={{ minHeight: 48 }} />
        </Tabs>
        <Box sx={{ flex: 1 }} />
        {/* ── Inline Date Filter ── */}
        <Button variant="outlined" startIcon={<DateRangeIcon sx={{ fontSize: 15 }} />} endIcon={<ArrowDownIcon sx={{ fontSize: 15 }} />}
          onClick={(e) => setDateAnchor(e.currentTarget)}
          sx={{ borderColor: dateRange !== "all" ? "#2563eb" : "#d1d5db", color: dateRange !== "all" ? "#2563eb" : "#6b7280", bgcolor: dateRange !== "all" ? "#eff6ff" : "#ffffff", textTransform: "none", fontWeight: 600, fontSize: "0.82rem", px: 2, "&:hover": { borderColor: "#2563eb", bgcolor: "#eff6ff" } }}>
          {dateLabel}
        </Button>
        <Popover open={Boolean(dateAnchor)} anchorEl={dateAnchor} onClose={() => setDateAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{ sx: { mt: 0.5, p: 2, borderRadius: 2, minWidth: 220, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } }}>
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", mb: 1.5, letterSpacing: "0.05em", textTransform: "uppercase" }}>Date Range</Typography>
          <Stack spacing={0.5}>
            {DATE_RANGES.map((r) => (
              <Box key={r.value} onClick={() => { setDateRange(r.value); if (r.value !== "custom") setDateAnchor(null); }}
                sx={{ px: 1.5, py: 0.8, borderRadius: 1.5, cursor: "pointer", fontSize: "0.85rem", fontWeight: dateRange === r.value ? 700 : 500, color: dateRange === r.value ? "#2563eb" : "#374151", bgcolor: dateRange === r.value ? "#eff6ff" : "transparent", "&:hover": { bgcolor: "#f9fafb" } }}>
                {r.label}
              </Box>
            ))}
          </Stack>
          {dateRange === "custom" && (
            <Box mt={2}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", mb: 1 }}>Custom Range</Typography>
              <Stack spacing={1}>
                <TextField label="Start" type="date" size="small" value={customStart} onChange={(e) => setCustomStart(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff", "&.Mui-focused fieldset": { borderColor: "#2563eb" } } }} />
                <TextField label="End" type="date" size="small" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff", "&.Mui-focused fieldset": { borderColor: "#2563eb" } } }} />
                {customStart && customEnd && <Button size="small" variant="contained" onClick={() => setDateAnchor(null)} sx={{ bgcolor: "#2563eb", textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "#1d4ed8" } }}>Apply</Button>}
              </Stack>
            </Box>
          )}
        </Popover>
      </Stack>


      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: "#2563eb" }} size={32} /></Box>
      ) : (
        <>
          {/* ── CUT PENDING (= Shoot Done scripts shown here for cross-visibility) ── */}
          {tab === 0 && (
            <TableContainer component={Paper} sx={lightPaper}>
              <Table size="medium">
                <TableHead>
                  <TableRow>{["#","Script ID","Type","Preview","Creator","Shoot Done At","Stage","Upload File","Cut Done?"].map((h) => <TableCell key={h} sx={thSx}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {pendingScripts.length === 0 ? (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                      <CutIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />No scripts awaiting cut
                    </TableCell></TableRow>
                  ) : pendingScripts.map((s, i) => (
                    <TableRow key={s._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                      <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>{i + 1}</TableCell>
                      <TableCell sx={tdSx}><ScriptIdBadge id={s.scriptId} /></TableCell>
                      <TableCell sx={tdSx}><TypeBadge type={s.scriptType} /></TableCell>
                      <TableCell sx={{ ...tdSx, maxWidth: 240 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography sx={{ fontSize: "0.85rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.scriptText}</Typography>
                          <Tooltip title="View full script"><IconButton size="small" onClick={() => { setViewContent(s); setViewOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}><ViewIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell sx={tdSx}><Typography sx={{ fontSize: "0.85rem" }}>{s.createdBy}</Typography></TableCell>
                      <TableCell sx={tdSx}><Typography sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{fmt(s.shootDoneAt)}</Typography></TableCell>
                      <TableCell sx={tdSx}><StagePill stage={s.stage} /></TableCell>
                      <TableCell sx={tdSx}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Button size="small" variant="outlined" startIcon={<UploadIcon sx={{ fontSize: 15 }} />}
                            onClick={() => { setUploadTarget(s); setUploadOpen(true); }}
                            sx={{ borderColor: "#bfdbfe", color: "#2563eb", textTransform: "none", fontWeight: 600, fontSize: "0.8rem", py: 0.5, px: 1.5, "&:hover": { bgcolor: "#eff6ff", borderColor: "#2563eb" } }}>
                            Upload
                          </Button>
                          {s.cutVideoUrl && (
                            <Tooltip title={`Uploaded by: ${s.cutUploadedBy || "—"}`}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, bgcolor: "#dcfce7", px: 1, py: 0.3, borderRadius: 1, border: "1px solid #a7f3d0", cursor: "default" }}>
                                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#10b981" }} />
                                <Typography sx={{ fontSize: "0.72rem", color: "#047857", fontWeight: 600 }}>{s.cutUploadedBy || "done"}</Typography>
                              </Box>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell sx={tdSx}>
                        <Stack direction="row" spacing={0.8}>
                          <Button size="small" variant="contained" onClick={() => openCutDone(s)} startIcon={<CheckIcon sx={{ fontSize: 15 }} />}
                            sx={{ bgcolor: "#059669", color: "#fff", boxShadow: "none", textTransform: "none", fontWeight: 700, fontSize: "0.78rem", py: 0.5, px: 1.5, "&:hover": { bgcolor: "#047857" } }}>Yes</Button>
                          <Button size="small" variant="outlined" startIcon={<CancelIcon sx={{ fontSize: 15 }} />}
                            sx={{ borderColor: "#fca5a5", color: "#dc2626", textTransform: "none", fontWeight: 700, fontSize: "0.78rem", py: 0.5, px: 1.5, "&:hover": { bgcolor: "#fef2f2" } }}>No</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}


          {/* ── CUT DONE ── */}
          {tab === 1 && (
            <TableContainer component={Paper} sx={lightPaper}>
              <Table size="medium">
                <TableHead>
                  <TableRow>{["#","Script ID","Type","Preview","Cut File","Uploaded By","Cut Done By","Cut Done At","Comment",""].map((h) => <TableCell key={h} sx={thSx}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {doneScripts.length === 0 ? (
                    <TableRow><TableCell colSpan={10} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                      <CheckIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />No cut-done scripts yet
                    </TableCell></TableRow>
                  ) : doneScripts.map((s, i) => (
                    <TableRow key={s._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                      <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>{i + 1}</TableCell>
                      <TableCell sx={tdSx}><ScriptIdBadge id={s.scriptId} /></TableCell>
                      <TableCell sx={tdSx}><TypeBadge type={s.scriptType} /></TableCell>
                      <TableCell sx={{ ...tdSx, maxWidth: 220 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography sx={{ fontSize: "0.85rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.scriptText}</Typography>
                          <Tooltip title="View full script"><IconButton size="small" onClick={() => { setViewContent(s); setViewOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}><ViewIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell sx={tdSx}>
                        {s.cutVideoUrl && s.cutVideoUrl !== "pending" ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Button size="small" onClick={() => setPlayer({ open: true, url: s.cutVideoUrl, title: `${s.scriptId} — Cut` })} startIcon={<PlayIcon sx={{ fontSize: 16 }} />}
                              sx={{ color: "#2563eb", textTransform: "none", fontWeight: 600, fontSize: "0.8rem", p: "4px 10px", border: "1px solid #bfdbfe", borderRadius: 1.5, "&:hover": { bgcolor: "#eff6ff" } }}>Play</Button>
                            <Tooltip title="Download"><IconButton size="small" onClick={() => handleDownload(s.cutVideoUrl, s.cutVideoName || s.scriptId + "_cut")} sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}><DownloadIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          </Stack>
                        ) : <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>No file</Typography>}
                      </TableCell>
                      {/* ✅ Who uploaded the cut file */}
                      <TableCell sx={tdSx}>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <PersonIcon sx={{ fontSize: 14, color: "#7c3aed" }} />
                          <Typography sx={{ fontSize: "0.85rem", color: "#7c3aed", fontWeight: 500 }}>{s.cutUploadedBy || "—"}</Typography>
                        </Stack>
                      </TableCell>
                      {/* ✅ Who clicked "Cut Done" */}
                      <TableCell sx={tdSx}><Typography sx={{ fontSize: "0.85rem", color: "#047857", fontWeight: 500 }}>{s.cutDoneBy || "—"}</Typography></TableCell>
                      <TableCell sx={tdSx}><Typography sx={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>{fmt(s.cutDoneAt)}</Typography></TableCell>
                      <TableCell sx={{ ...tdSx, maxWidth: 180 }}>
                        <Tooltip title={s.cutComment || ""} placement="top" arrow>
                          <Typography sx={{ fontSize: "0.85rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.cutComment || "—"}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={tdSx}>
                        <Tooltip title="Edit comment"><IconButton size="small" onClick={() => openEditComment(s)} sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}><EditIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}


      <UploadFileDialog open={uploadOpen} onClose={() => { setUploadOpen(false); setUploadTarget(null); }} script={uploadTarget} onUploaded={load} showSnack={showSnack} />
      <CutDoneDialog open={cutDoneOpen} onClose={closeCutDone} script={cutDoneTarget} onConfirm={handleConfirmCutDone} confirming={confirming} />


      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", py: 2, px: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" alignItems="center" gap={1}><ViewIcon sx={{ color: "#2563eb" }} /><Typography sx={{ fontWeight: 700 }}>Full Script</Typography></Stack>
          <IconButton size="small" onClick={() => setViewOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
          {viewContent && (
            <Box>
              <Stack direction="row" spacing={1.5} mb={2.5}><ScriptIdBadge id={viewContent.scriptId} /><TypeBadge type={viewContent.scriptType} /></Stack>
              <Box sx={{ bgcolor: "#f8fafc", p: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Typography sx={{ fontSize: "0.95rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{viewContent.scriptText}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={editCommentOpen} onClose={() => setEditCommentOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", pb: 2, px: 3 }}>Edit Comment</DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <TextField label="Cut Comment" multiline minRows={3} fullWidth value={editCommentVal} onChange={(e) => setEditCommentVal(e.target.value)} sx={inputSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e2e8f0", gap: 1 }}>
          <Button onClick={() => setEditCommentOpen(false)} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveComment} sx={{ bgcolor: "#2563eb", boxShadow: "none", px: 3, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "#1d4ed8" } }}>Save</Button>
        </DialogActions>
      </Dialog>


      <PlayerModal open={player.open} onClose={() => setPlayer({ open: false, url: "", title: "" })} url={player.url} title={player.title} />


      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ boxShadow: "0 10px 15px -3px rgb(0 0 0/0.1)", borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}


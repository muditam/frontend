// pages/PostPage.jsx
// ✅ FIXES APPLIED:
//  1. Removed "Update Details" dialog entirely — content status managed inline
//  2. Removed postFileUrl / Final Post File URL field — not needed (posting on external platforms)
//  3. postComment now editable inline via a small TextField in the row
//  4. Added getAuthHeaders() to all axios calls (was missing — caused 401 for non-managers)
//  5. PlayerModal only plays editFileUrl (the already-uploaded edited video)


import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Tooltip,
  CircularProgress, Alert, Snackbar, Stack, Tabs, Tab,
  Autocomplete,
} from "@mui/material";
import {
  Close as CloseIcon,
  Send as SendIcon,
  Inbox as InboxIcon,
  OpenInNew as OpenInNewIcon,
  RocketLaunch as RocketIcon,
  PlayCircle as PlayCircleFilled,
  PlayCircleOutline as PlayCircleIcon,
  Save as SaveIcon,
} from "@mui/icons-material";


const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/scripts";


// ✅ Auth helper — same pattern as other pages
const getAuthHeaders = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  return { "x-session-user": JSON.stringify(user) };
};


const POST_STATUSES         = ["Approved", "Rewrite", "Reshoot", "Re-edit", "On Hold", "Rejected"];
const POST_PUBLISH_STATUSES = ["Blank", "Posted", "Used in Ads"];
const NEEDS_REASON          = new Set(["On Hold", "Rejected", "Reshoot", "Re-edit"]);


const STATUS_COLORS = {
  Approved:  { bg: "#dcfce7", fg: "#047857", bd: "#a7f3d0" },
  Rewrite:   { bg: "#f3e8ff", fg: "#6d28d9", bd: "#ddd6fe" },
  Reshoot:   { bg: "#fee2e2", fg: "#b91c1c", bd: "#fecaca" },
  "Re-edit": { bg: "#fef9c3", fg: "#b45309", bd: "#fde68a" },
  "On Hold": { bg: "#e0f2fe", fg: "#1d4ed8", bd: "#bae6fd" },
  Rejected:  { bg: "#fee2e2", fg: "#b91c1c", bd: "#fecaca" },
};


const PUBLISH_COLORS = {
  Posted:        { bg: "#dcfce7", fg: "#047857", bd: "#a7f3d0" },
  "Used in Ads": { bg: "#fae8ff", fg: "#a21caf", bd: "#f5d0fe" },
};


const tableHeaderSx = {
  color: "#475569", fontSize: "0.75rem", fontWeight: 700,
  letterSpacing: "0.05em", textTransform: "uppercase",
  borderBottom: "1px solid #e2e8f0", bgcolor: "#f8fafc",
  py: 2, whiteSpace: "nowrap",
};
const tableCellSx = { borderBottom: "1px solid #f1f5f9", py: 1.5, color: "#334155" };


const inlineAcSx = {
  minWidth: 150,
  "& .MuiOutlinedInput-root": {
    bgcolor: "#ffffff",
    fontSize: "0.8rem",
    py: "2px !important",
    "& fieldset": { borderColor: "#e2e8f0" },
    "&:hover fieldset": { borderColor: "#cbd5e1" },
    "&.Mui-focused fieldset": { borderColor: "#2563eb" },
  },
  "& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator": { color: "#94a3b8" },
};


// ── Tiny Components ──────────────────────────────────────────
function ScriptNo({ id }) {
  return (
    <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#2563eb" }}>
      {id}
    </Typography>
  );
}


function TypePill({ label }) {
  return (
    <Box sx={{ display: "inline-block", px: 1.2, py: 0.3, borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, bgcolor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
      {label}
    </Box>
  );
}


function StatusBadge({ value }) {
  const c = STATUS_COLORS[value];
  if (!value || !c) return <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>—</Typography>;
  return (
    <Box sx={{ display: "inline-block", px: 1.2, py: 0.4, borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700, bgcolor: c.bg, color: c.fg, border: `1px solid ${c.bd}`, whiteSpace: "nowrap" }}>
      {value}
    </Box>
  );
}


function PublishBadge({ value }) {
  const c = PUBLISH_COLORS[value];
  if (!value || value === "Blank" || !c) {
    return (
      <Box sx={{ display: "inline-block", px: 1.2, py: 0.4, borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", bgcolor: "#f1f5f9", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
        Blank
      </Box>
    );
  }
  return (
    <Box sx={{ display: "inline-block", px: 1.2, py: 0.4, borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700, bgcolor: c.bg, color: c.fg, border: `1px solid ${c.bd}`, whiteSpace: "nowrap" }}>
      {value}
    </Box>
  );
}


function FormattedDate({ value }) {
  if (!value) return <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>—</Typography>;
  const d = new Date(value);
  return (
    <Box>
      <Typography sx={{ fontSize: "0.8rem", color: "#0f172a", whiteSpace: "nowrap", fontWeight: 500 }}>
        {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </Typography>
      <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
        {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </Typography>
    </Box>
  );
}


// ── Video Player Modal ──────────────────────────────────────
const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)(\?.*)?$/i;


function PlayerModal({ open, onClose, url, title }) {
  if (!url) return null;
  const isVideo = VIDEO_EXT.test(url);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" } }}>
      <DialogTitle sx={{ borderBottom: "1px solid #e2e8f0", py: 2, px: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <PlayCircleFilled sx={{ color: "#2563eb", fontSize: 24 }} />
          <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "1.1rem" }}>{title || "Video Preview"}</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: "#64748b", "&:hover": { color: "#0f172a", bgcolor: "#f1f5f9" } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 3, px: 3 }}>
        {isVideo ? (
          <Box component="video" src={url} controls autoPlay={false}
            sx={{ width: "100%", maxHeight: "65vh", display: "block", borderRadius: 2, bgcolor: "#000", outline: "none" }} />
        ) : (
          <Box sx={{ textAlign: "center", py: 8, bgcolor: "#f8fafc", borderRadius: 2, border: "1px dashed #cbd5e1" }}>
            <PlayCircleIcon sx={{ fontSize: 48, color: "#94a3b8", mb: 2, opacity: 0.5 }} />
            <Typography sx={{ color: "#475569", mb: 3 }}>This file cannot be previewed inline.</Typography>
            <Button component="a" href={url} target="_blank" rel="noopener noreferrer" variant="contained"
              startIcon={<OpenInNewIcon />}
              sx={{ bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" }, textTransform: "none", fontWeight: 600, boxShadow: "none" }}>
              Open Externally
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}


// ── Reason Dialog — shown only when status needs a reason ──
function ReasonDialog({ open, onClose, status, script, onConfirm, saving }) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", py: 2, px: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
          Reason for "{status}"
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, px: 3 }}>
        {script && (
          <Box sx={{ mb: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5, p: 2 }}>
            <Stack direction="row" gap={1}><ScriptNo id={script.scriptId} /><TypePill label={script.scriptType} /></Stack>
          </Box>
        )}
        <TextField
          label={`Reason *`}
          multiline
          minRows={3}
          fullWidth
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "#ffffff",
              "& fieldset": { borderColor: "#cbd5e1" },
              "&.Mui-focused fieldset": { borderColor: "#2563eb" },
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e2e8f0", gap: 1 }}>
        <Button onClick={onClose} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>Cancel</Button>
        <Button variant="contained" onClick={() => onConfirm(reason)} disabled={saving || !reason.trim()}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          sx={{ bgcolor: "#2563eb", boxShadow: "none", textTransform: "none", fontWeight: 600, px: 3, "&:hover": { bgcolor: "#1d4ed8" } }}>
          {saving ? "Saving…" : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


// ── Inline Publish Select ────────────────────────────────────
function InlinePublishSelect({ script, reload, toast }) {
  const [loading, setLoading] = useState(false);
  const val = script.postPublishStatus || "Blank";


  const handleChange = async (_, newVal) => {
    if (!newVal || newVal === val) return;
    const actualVal = newVal === "Blank" ? "" : newVal;
    setLoading(true);
    try {
      await axios.post(
        `${API}/${script._id}/post-update`,
        { postPublishStatus: actualVal },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      toast(actualVal ? `Publish status → ${actualVal} 🚀` : "Publish status cleared");
      reload();
    } catch {
      toast("Update failed", "error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Autocomplete
        size="small"
        options={POST_PUBLISH_STATUSES}
        value={val}
        onChange={handleChange}
        disableClearable
        sx={inlineAcSx}
        renderInput={(params) => <TextField {...params} placeholder="Publish Status" />}
        renderOption={(props, option) => (
          <Box component="li" {...props} sx={{ fontSize: "0.85rem", "&:hover": { bgcolor: "#f1f5f9 !important" } }}>
            <PublishBadge value={option} />
          </Box>
        )}
      />
      {loading && <CircularProgress size={16} sx={{ color: "#2563eb" }} />}
    </Stack>
  );
}


// ── Inline Status Select ─────────────────────────────────────
function InlineStatusSelect({ script, reload, toast, openReasonDlg }) {
  const [loading, setLoading] = useState(false);
  const val = script.postStatus || "";


  const handleChange = async (_, newVal) => {
    if (!newVal || newVal === val) return;
    // Status that needs a reason → open reason dialog
    if (NEEDS_REASON.has(newVal)) {
      openReasonDlg(script, newVal);
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API}/${script._id}/post-update`,
        { postStatus: newVal, postHoldReason: "" },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      toast(`Status → ${newVal} ✅`);
      reload();
    } catch {
      toast("Update failed", "error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Autocomplete
        size="small"
        options={POST_STATUSES}
        value={val || null}
        onChange={handleChange}
        sx={inlineAcSx}
        renderInput={(params) => <TextField {...params} placeholder="Set Status…" />}
        renderOption={(props, option) => (
          <Box component="li" {...props} sx={{ fontSize: "0.85rem", "&:hover": { bgcolor: "#f1f5f9 !important" } }}>
            <StatusBadge value={option} />
          </Box>
        )}
      />
      {loading && <CircularProgress size={16} sx={{ color: "#2563eb" }} />}
    </Stack>
  );
}


// ── Inline Comment Cell ──────────────────────────────────────
function InlineComment({ script, reload, toast }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(script.postComment || "");
  const [saving, setSaving]   = useState(false);


  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${API}/${script._id}/post-update`,
        { postComment: val },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      toast("Comment saved ✅");
      setEditing(false);
      reload();
    } catch {
      toast("Failed to save comment", "error");
    } finally {
      setSaving(false);
    }
  };


  if (editing) {
    return (
      <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ minWidth: 180 }}>
        <TextField
          size="small"
          multiline
          minRows={2}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              fontSize: "0.8rem",
              bgcolor: "#ffffff",
              "& fieldset": { borderColor: "#cbd5e1" },
              "&.Mui-focused fieldset": { borderColor: "#2563eb" },
            },
          }}
        />
        <Stack spacing={0.5}>
          <IconButton size="small" onClick={handleSave} disabled={saving}
            sx={{ color: "#059669", "&:hover": { bgcolor: "#dcfce7" } }}>
            {saving ? <CircularProgress size={14} /> : <SaveIcon sx={{ fontSize: 16 }} />}
          </IconButton>
          <IconButton size="small" onClick={() => { setEditing(false); setVal(script.postComment || ""); }}
            sx={{ color: "#94a3b8", "&:hover": { bgcolor: "#f1f5f9" } }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </Stack>
    );
  }


  return (
    <Tooltip title={val || "Click to add comment"} placement="top" arrow>
      <Typography
        onClick={() => setEditing(true)}
        sx={{
          fontSize: "0.85rem", color: val ? "#475569" : "#94a3b8",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          maxWidth: 160, cursor: "pointer",
          "&:hover": { color: "#2563eb", textDecoration: "underline dotted" },
        }}
      >
        {val || "Add comment…"}
      </Typography>
    </Tooltip>
  );
}


// ── Edited Video Play Button ─────────────────────────────────
function EditedVideoBtn({ script, openPlayer }) {
  const url = script?.editFileUrl;
  if (!url) return <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>—</Typography>;
  return (
    <Button
      size="small"
      onClick={() => openPlayer(url, `${script.scriptId} — Edited Video`)}
      startIcon={<PlayCircleFilled sx={{ fontSize: 16 }} />}
      sx={{
        color: "#2563eb", textTransform: "none", fontSize: "0.8rem", fontWeight: 600,
        px: 1.5, py: 0.5, border: "1px solid #bfdbfe", borderRadius: 1.5,
        "&:hover": { bgcolor: "#eff6ff" }, minWidth: 0, whiteSpace: "nowrap",
      }}
    >
      Play
    </Button>
  );
}


// ── Main Page ────────────────────────────────────────────────
export default function PostPage() {
  const [tab, setTab]                 = useState(0);
  const [pendingList, setPendingList] = useState([]);
  const [publishedList, setPublishedList] = useState([]);
  const [loading, setLoading]         = useState(true);


  // Reason dialog (for statuses that require a reason)
  const [reasonDlg, setReasonDlg]   = useState({ open: false, script: null, status: "" });
  const [reasonSaving, setReasonSaving] = useState(false);


  const [player, setPlayer] = useState({ open: false, url: "", title: "" });
  const [snack, setSnack]   = useState({ open: false, msg: "", sev: "success" });
  const toast = (msg, sev = "success") => setSnack({ open: true, msg, sev });


  const load = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ FIX: Added getAuthHeaders() — was missing, caused 401 for non-managers
      const headers = getAuthHeaders();
      const [eRes, pRes] = await Promise.all([
        axios.get(API, { params: { stage: "Edit Done" }, headers, withCredentials: true }),
        axios.get(API, { params: { stage: "Post"      }, headers, withCredentials: true }),
      ]);
      setPendingList(eRes.data.scripts || []);
      setPublishedList(pRes.data.scripts || []);
    } catch {
      toast("Failed to load scripts", "error");
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => { load(); }, [load]);


  const openPlayer  = (url, title) => setPlayer({ open: true, url, title });
  const closePlayer = () => setPlayer({ open: false, url: "", title: "" });


  // Open reason dialog
  const openReasonDlg = (script, status) => setReasonDlg({ open: true, script, status });
  const closeReasonDlg = () => setReasonDlg({ open: false, script: null, status: "" });


  // Confirm status with reason
  const handleConfirmReason = async (reason) => {
    if (!reasonDlg.script) return;
    setReasonSaving(true);
    try {
      await axios.post(
        `${API}/${reasonDlg.script._id}/post-update`,
        { postStatus: reasonDlg.status, postHoldReason: reason },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      toast(`Status → ${reasonDlg.status} ✅`);
      closeReasonDlg();
      load();
    } catch {
      toast("Update failed", "error");
    } finally {
      setReasonSaving(false);
    }
  };


  const thSx = tableHeaderSx;
  const tdSx = tableCellSx;


  // Shared columns for both tabs
  const renderRow = (s, i, isPublished = false) => (
    <TableRow key={s._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
      <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>{i + 1}</TableCell>
      <TableCell sx={tdSx}><ScriptNo id={s.scriptId} /></TableCell>
      <TableCell sx={tdSx}><TypePill label={s.scriptType} /></TableCell>


      {/* Script Preview */}
      <TableCell sx={{ ...tdSx, maxWidth: 220 }}>
        <Tooltip title={s.scriptText} placement="top" arrow>
          <Typography sx={{ fontSize: "0.85rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.scriptText}
          </Typography>
        </Tooltip>
      </TableCell>


      <TableCell sx={tdSx}>
        <Typography sx={{ fontSize: "0.85rem", color: "#475569" }}>{s.createdBy}</Typography>
      </TableCell>


      {/* ✅ Edited Video — only play button, no upload */}
      <TableCell sx={tdSx}>
        <EditedVideoBtn script={s} openPlayer={openPlayer} />
      </TableCell>


      {/* Inline Content Status */}
      <TableCell sx={tdSx}>
        <InlineStatusSelect script={s} reload={load} toast={toast} openReasonDlg={openReasonDlg} />
      </TableCell>


      {/* Inline Publish Status */}
      <TableCell sx={tdSx}>
        <InlinePublishSelect script={s} reload={load} toast={toast} />
      </TableCell>


      {/* ✅ Inline Comment — click to edit, no dialog needed */}
      <TableCell sx={tdSx}>
        <InlineComment script={s} reload={load} toast={toast} />
      </TableCell>


      {/* Published-only columns */}
      {isPublished && (
        <>
          <TableCell sx={tdSx}><FormattedDate value={s.postPublishStatusUpdatedAt} /></TableCell>
          <TableCell sx={tdSx}>
            <Typography sx={{ fontSize: "0.85rem", color: "#047857", fontWeight: 600 }}>{s.postedBy || "—"}</Typography>
          </TableCell>
        </>
      )}
    </TableRow>
  );


  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", color: "#0f172a", p: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "#0f172a" }}>
          Post Management
        </Typography>
        <Typography sx={{ color: "#64748b", fontSize: "0.95rem", mt: 0.5 }}>
          Review final content · Set status · Track publishing. Videos are posted via external platforms.
        </Typography>
      </Box>


      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          "& .MuiTabs-indicator": { bgcolor: "#2563eb", height: 3, borderRadius: "3px 3px 0 0" },
          "& .MuiTab-root": { color: "#64748b", textTransform: "none", fontWeight: 600, fontSize: "0.95rem", minHeight: 48 },
          "& .Mui-selected": { color: "#2563eb !important" },
          bgcolor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 2,
          px: 1, minHeight: 48, width: "fit-content",
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        }}>
        <Tab label={`Post Pending (${pendingList.length})`} />
        <Tab label={`Published (${publishedList.length})`} />
      </Tabs>


      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: "#2563eb" }} size={32} /></Box>
      ) : (
        <>
          {/* ── TAB 0: POST PENDING ── */}
          {tab === 0 && (
            <TableContainer component={Paper} sx={{ bgcolor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 2, boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)" }}>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    {["#", "Script No", "Type", "Script Preview", "Creator", "Edited Video", "Content Status", "Publish Status", "Comment"].map((h) => (
                      <TableCell key={h} sx={thSx}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                        <InboxIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />
                        No scripts ready to post yet.
                      </TableCell>
                    </TableRow>
                  ) : pendingList.map((s, i) => renderRow(s, i, false))}
                </TableBody>
              </Table>
            </TableContainer>
          )}


          {/* ── TAB 1: PUBLISHED ── */}
          {tab === 1 && (
            <TableContainer component={Paper} sx={{ bgcolor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 2, boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)" }}>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    {["#", "Script No", "Type", "Script Preview", "Creator", "Edited Video", "Content Status", "Publish Status", "Comment", "Published At", "Posted By"].map((h) => (
                      <TableCell key={h} sx={thSx}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {publishedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                        <RocketIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />
                        Nothing published yet.
                      </TableCell>
                    </TableRow>
                  ) : publishedList.map((s, i) => renderRow(s, i, true))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}


      {/* ── Reason Dialog (replaces the full Update Details dialog) ── */}
      <ReasonDialog
        open={reasonDlg.open}
        onClose={closeReasonDlg}
        status={reasonDlg.status}
        script={reasonDlg.script}
        onConfirm={handleConfirmReason}
        saving={reasonSaving}
      />


      <PlayerModal open={player.open} onClose={closePlayer} url={player.url} title={player.title} />


      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.sev} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", borderRadius: 2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}


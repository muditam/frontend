// pages/ShootPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Tooltip,
  CircularProgress, Alert, Snackbar, Stack, Tabs, Tab,
  Popover, TextField,
} from "@mui/material";
import {
  Videocam as VideocamIcon, CheckCircle as CheckIcon,
  OpenInNew as OpenLinkIcon, Schedule as ScheduleIcon,
  Visibility as ViewIcon, Close as CloseIcon,
  DateRange as DateRangeIcon, KeyboardArrowDown as ArrowDownIcon,
} from "@mui/icons-material";


const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/scripts";
const getAuthHeaders = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  return { "x-session-user": JSON.stringify(user) };
};


const lightPaper = { bgcolor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 2, boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)" };
const thSx = { color: "#475569", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", bgcolor: "#f8fafc", py: 2, whiteSpace: "nowrap" };
const tdSx = { borderBottom: "1px solid #f1f5f9", py: 1.5, color: "#334155" };


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


export default function ShootPage() {
  const [tab, setTab]                         = useState(0);
  const [pendingScripts, setPendingScripts]   = useState([]);
  const [doneScripts, setDoneScripts]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [dateRange,   setDateRange]           = useState("all");
  const [customStart, setCustomStart]         = useState("");
  const [customEnd,   setCustomEnd]           = useState("");
  const [dateAnchor,  setDateAnchor]          = useState(null);


  const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirming,    setConfirming]    = useState(false);
  const [viewOpen,    setViewOpen]    = useState(false);
  const [viewContent, setViewContent] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
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
      const [pRes, dRes] = await Promise.all([
        axios.get(API, { params: { stage: "Shoot Pending", ...buildDateParams("proceedToShootAt") }, headers: getAuthHeaders(), withCredentials: true }),
        axios.get(API, { params: { stage: "Shoot Done",    ...buildDateParams("shootDoneAt")      }, headers: getAuthHeaders(), withCredentials: true }),
      ]);
      setPendingScripts(pRes.data.scripts || []);
      setDoneScripts(dRes.data.scripts || []);
    } catch { showSnack("Failed to load", "error"); }
    finally { setLoading(false); }
  }, [dateRange, customStart, customEnd]);


  useEffect(() => { load(); }, [load]);


  const openConfirm  = (s) => { setConfirmTarget(s); setConfirmOpen(true); };
  const closeConfirm = () => { setConfirmTarget(null); setConfirmOpen(false); };


  const handleShootDone = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      await axios.post(`${API}/${confirmTarget._id}/shoot-done`, {}, { headers: getAuthHeaders(), withCredentials: true });
      showSnack("Shoot marked done! ✅"); closeConfirm(); load();
    } catch (e) { showSnack(e.response?.data?.message || "Error", "error"); }
    finally { setConfirming(false); }
  };


  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", color: "#0f172a", p: 4 }}>
      <Box mb={4}>
        <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "#0f172a" }}>Shoot Queue</Typography>
        <Typography sx={{ color: "#64748b", fontSize: "0.95rem", mt: 0.5 }}>
          Scripts approved and ready for production filming.
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
          <Tab label={`Pending  (${pendingScripts.length})`} sx={{ minHeight: 48 }} />
          <Tab label={`Completed  (${doneScripts.length})`} sx={{ minHeight: 48 }} />
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
                sx={{ px: 1.5, py: 0.8, borderRadius: 1.5, cursor: "pointer", fontSize: "0.85rem", fontWeight: dateRange === r.value ? 700 : 500, color: dateRange === r.value ? "#2563eb" : "#374151", bgcolor: dateRange === r.value ? "#eff6ff" : "transparent", "&:hover": { bgcolor: dateRange === r.value ? "#eff6ff" : "#f9fafb" } }}>
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
          {tab === 0 && (
            <TableContainer component={Paper} sx={lightPaper}>
              <Table size="medium">
                <TableHead><TableRow>{["#","Script ID","Type","Script Preview","Creator","Added to Queue","Actions"].map((h) => <TableCell key={h} sx={thSx}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {pendingScripts.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                      <VideocamIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />No scripts in shoot queue
                    </TableCell></TableRow>
                  ) : pendingScripts.map((s, i) => (
                    <TableRow key={s._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                      <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>{i + 1}</TableCell>
                      <TableCell sx={tdSx}><ScriptIdBadge id={s.scriptId} /></TableCell>
                      <TableCell sx={tdSx}><TypeBadge type={s.scriptType} /></TableCell>
                      <TableCell sx={{ ...tdSx, maxWidth: 280 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography sx={{ fontSize: "0.85rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.scriptText}</Typography>
                          <Tooltip title="View Full Script"><IconButton size="small" onClick={() => { setViewContent(s); setViewOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}><ViewIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell sx={tdSx}><Typography sx={{ fontSize: "0.85rem", color: "#475569" }}>{s.createdBy}</Typography></TableCell>
                      <TableCell sx={tdSx}>
                        <Stack direction="row" alignItems="center" gap={0.7}>
                          <ScheduleIcon sx={{ fontSize: 16, color: "#d97706" }} />
                          <Typography sx={{ fontSize: "0.85rem", color: "#334155", whiteSpace: "nowrap" }}>{fmt(s.proceedToShootAt)}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={tdSx}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {s.referenceLink && <Tooltip title="Reference Link"><IconButton size="small" href={s.referenceLink} target="_blank" sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}><OpenLinkIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>}
                          <Button variant="contained" size="small" startIcon={<CheckIcon sx={{ fontSize: 16 }} />} onClick={() => openConfirm(s)}
                            sx={{ bgcolor: "#059669", color: "#ffffff", boxShadow: "none", textTransform: "none", fontWeight: 600, fontSize: "0.8rem", py: 0.6, px: 1.5, "&:hover": { bgcolor: "#047857" } }}>Mark as Done</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}


          {tab === 1 && (
            <TableContainer component={Paper} sx={lightPaper}>
              <Table size="medium">
                <TableHead><TableRow>{["#","Script ID","Type","Preview","Creator","Completed By","Completed At","Stage"].map((h) => <TableCell key={h} sx={thSx}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {doneScripts.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                      <CheckIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />No completed shoots yet
                    </TableCell></TableRow>
                  ) : doneScripts.map((s, i) => (
                    <TableRow key={s._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                      <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>{i + 1}</TableCell>
                      <TableCell sx={tdSx}><ScriptIdBadge id={s.scriptId} /></TableCell>
                      <TableCell sx={tdSx}><TypeBadge type={s.scriptType} /></TableCell>
                      <TableCell sx={{ ...tdSx, maxWidth: 280 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography sx={{ fontSize: "0.85rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.scriptText}</Typography>
                          <Tooltip title="View Full Script"><IconButton size="small" onClick={() => { setViewContent(s); setViewOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}><ViewIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell sx={tdSx}><Typography sx={{ fontSize: "0.85rem", color: "#475569" }}>{s.createdBy}</Typography></TableCell>
                      <TableCell sx={tdSx}><Typography sx={{ fontSize: "0.85rem", color: "#047857", fontWeight: 500 }}>{s.shootDoneBy || "—"}</Typography></TableCell>
                      <TableCell sx={tdSx}><Typography sx={{ fontSize: "0.85rem", color: "#334155", whiteSpace: "nowrap" }}>{fmt(s.shootDoneAt)}</Typography></TableCell>
                      <TableCell sx={tdSx}><Box sx={{ display: "inline-block", px: 1.2, py: 0.3, borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, bgcolor: "#dcfce7", color: "#047857", border: "1px solid #a7f3d0" }}>{s.stage}</Box></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}


      <Dialog open={viewOpen} onClose={() => { setViewOpen(false); setViewContent(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: "#0f172a", fontWeight: 700, borderBottom: "1px solid #e2e8f0", py: 2, px: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" alignItems="center" gap={1}><ViewIcon sx={{ color: "#2563eb" }} /><Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>Full Script Content</Typography></Stack>
          <IconButton size="small" onClick={() => { setViewOpen(false); setViewContent(null); }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
          {viewContent && (
            <Box>
              <Stack direction="row" spacing={1.5} mb={2.5} alignItems="center"><ScriptIdBadge id={viewContent.scriptId} /><TypeBadge type={viewContent.scriptType} /></Stack>
              <Box sx={{ bgcolor: "#f8fafc", p: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Typography sx={{ fontSize: "0.95rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{viewContent.scriptText}</Typography>
              </Box>
              {viewContent.referenceLink && <Button component="a" href={viewContent.referenceLink} target="_blank" startIcon={<OpenLinkIcon />} sx={{ mt: 2, color: "#2563eb", textTransform: "none", fontWeight: 600 }}>Open Reference Link</Button>}
            </Box>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={confirmOpen} onClose={closeConfirm} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: "#0f172a", fontWeight: 700, borderBottom: "1px solid #e2e8f0", pb: 2, px: 3, display: "flex", alignItems: "center", gap: 1 }}>
          <VideocamIcon sx={{ color: "#059669" }} /><Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>Confirm Shoot</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Typography sx={{ color: "#475569", fontSize: "0.95rem", mb: 2 }}>Mark this shoot as completed?</Typography>
          {confirmTarget && (
            <Box sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5, p: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#2563eb", mb: 0.5 }}>{confirmTarget.scriptId} · {confirmTarget.scriptType}</Typography>
              <Typography sx={{ fontSize: "0.85rem", color: "#64748b", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{confirmTarget.scriptText}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1, borderTop: "1px solid #e2e8f0", pt: 2 }}>
          <Button onClick={closeConfirm} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleShootDone} disabled={confirming}
            startIcon={confirming ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{ bgcolor: "#059669", color: "#ffffff", boxShadow: "none", textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "#047857" } }}>
            {confirming ? "Saving…" : "Confirm Done"}
          </Button>
        </DialogActions>
      </Dialog>


      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}


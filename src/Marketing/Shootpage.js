import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  TablePagination,
} from "@mui/material";
import {
  Videocam as VideocamIcon,
  CheckCircle as CheckIcon,
  OpenInNew as OpenLinkIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  RestartAlt as ResetIcon,
} from "@mui/icons-material";

const API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/scripts`;
const getAuthHeaders = () => {
  return {};
};

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
const tdSx = { borderBottom: "1px solid #f1f5f9", py: 1.5, color: "#334155" };

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

function ScriptIdBadge({ id }) {
  return (
    <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#2563eb" }}>
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

// ✅ Convert HTML scriptText -> RAW text (no tags), preserving line breaks
function htmlToRawText(html = "") {
  if (!html) return "";
  try {
    const normalized = String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(div|p|li|tr|h\d)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/&nbsp;/gi, " ");

    const doc = new DOMParser().parseFromString(normalized, "text/html");
    const txt = (doc?.documentElement?.textContent || "").replace(/\r/g, "");
    return txt.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return String(html).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  }
}
function previewRaw(html, max = 140) {
  const txt = htmlToRawText(html).replace(/\s+/g, " ").trim();
  return txt.length > max ? txt.slice(0, max) + "…" : txt;
}

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

export default function ShootPage() {
  const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");

  const [tab, setTab] = useState(0);

  // ✅ Server-side pagination per tab
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingRows, setPendingRows] = useState(25);
  const [donePage, setDonePage] = useState(0);
  const [doneRows, setDoneRows] = useState(25);

  const [pendingScripts, setPendingScripts] = useState([]);
  const [doneScripts, setDoneScripts] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [doneTotal, setDoneTotal] = useState(0);

  const [creatorOptions, setCreatorOptions] = useState([]); // ✅ dropdown options

  const [loading, setLoading] = useState(true);

  // ✅ Filters draft + applied
  const [filtersDraft, setFiltersDraft] = useState({
    q: "",
    scriptType: "",
    creator: "", // ✅ dropdown value
  });
  const [filters, setFilters] = useState({
    q: "",
    scriptType: "",
    creator: "",
  });

  const applyFilters = () => {
    setFilters({
      q: (filtersDraft.q || "").trim(),
      scriptType: filtersDraft.scriptType || "",
      creator: filtersDraft.creator || "",
    });
    setPendingPage(0);
    setDonePage(0);
  };

  const clearFilters = () => {
    setFiltersDraft({ q: "", scriptType: "", creator: "" });
    setFilters({ q: "", scriptType: "", creator: "" });
    setPendingPage(0);
    setDonePage(0);
  };

  const commonParams = useMemo(() => {
    const p = {};
    if (filters.q) p.q = filters.q; // backend search ($or across fields)
    if (filters.scriptType) p.scriptType = filters.scriptType;
    if (filters.creator) p.creator = filters.creator; // exact (ci) match in backend
    return p;
  }, [filters]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewContent, setViewContent] = useState(null);

  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const showSnack = (msg, severity = "success") => setSnack({ open: true, msg, severity });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const pendingParams = {
        stage: "Shoot Pending",
        page: pendingPage + 1,
        limit: pendingRows,
        sortBy: "proceedToShootAt",
        sortDir: "desc",
        ...commonParams,
      };

      const doneParams = {
        stage: "Shoot Done",
        page: donePage + 1,
        limit: doneRows,
        sortBy: "shootDoneAt",
        sortDir: "desc",
        ...commonParams,
      };

      const [pRes, dRes] = await Promise.all([
        axios.get(API, { params: pendingParams, headers, withCredentials: true }),
        axios.get(API, { params: doneParams, headers, withCredentials: true }),
      ]);

      const pScripts = pRes.data.scripts || [];
      const dScripts = dRes.data.scripts || [];

      setPendingScripts(pScripts);
      setDoneScripts(dScripts);

      setPendingTotal(pRes.data.pagination?.total ?? pScripts.length);
      setDoneTotal(dRes.data.pagination?.total ?? dScripts.length);

      // ✅ build creator dropdown from currently loaded results
      const set = new Set();
      [...pScripts, ...dScripts].forEach((s) => {
        if (s?.createdBy) set.add(String(s.createdBy).trim());
      });

      // also keep currently selected creator even if not in current page
      if (filtersDraft.creator) set.add(filtersDraft.creator);

      const list = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
      setCreatorOptions(list);
    } catch {
      showSnack("Failed to load", "error");
      setPendingScripts([]);
      setDoneScripts([]);
      setPendingTotal(0);
      setDoneTotal(0);
      setCreatorOptions([]);
    } finally {
      setLoading(false);
    }
  }, [pendingPage, pendingRows, donePage, doneRows, commonParams]); // (filtersDraft.creator not needed here)

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const openConfirm = (s) => {
    setConfirmTarget(s);
    setConfirmOpen(true);
  };
  const closeConfirm = () => {
    setConfirmTarget(null);
    setConfirmOpen(false);
  };

  const handleShootDone = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      await axios.post(`${API}/${confirmTarget._id}/shoot-done`, {}, { headers: getAuthHeaders(), withCredentials: true });
      showSnack("Shoot marked done! ✅");
      closeConfirm();
      load();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    } finally {
      setConfirming(false);
    }
  };

  const pendingCols = 7;
  const doneCols = 8;

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", color: "#0f172a", p: 4 }}>
      <Box mb={3}>
        <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "#0f172a" }}>
          Shoot Queue
        </Typography>
        <Typography sx={{ color: "#64748b", fontSize: "0.95rem", mt: 0.5 }}>
          Scripts approved and ready for production filming.
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

      {/* ✅ Filters */}
      <Paper sx={{ ...lightPaper, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
          <TextField
            size="small"
            label="Search (script / id / link / creator)"
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
            <InputLabel>Type</InputLabel>
            <Select
              value={filtersDraft.scriptType}
              label="Type"
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

          {/* ✅ Creator dropdown */}
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

          <Box sx={{ flex: 1 }} />

          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={applyFilters}
            sx={{ bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" }, textTransform: "none", fontWeight: 700 }}
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
      <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap">
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            "& .MuiTabs-indicator": { bgcolor: "#2563eb", height: 3, borderRadius: "3px 3px 0 0" },
            "& .MuiTab-root": { color: "#64748b", textTransform: "none", fontWeight: 600, fontSize: "0.95rem", minHeight: 48 },
            "& .Mui-selected": { color: "#2563eb !important" },
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 2,
            px: 1,
            minHeight: 48,
            width: "fit-content",
          }}
        >
          <Tab label={`Pending (${pendingTotal})`} sx={{ minHeight: 48 }} />
          <Tab label={`Completed (${doneTotal})`} sx={{ minHeight: 48 }} />
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
                      {["#", "Script ID", "Type", "Script Preview", "Creator", "Added to Queue", "Actions"].map((h) => (
                        <TableCell key={h} sx={thSx}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pendingScripts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={pendingCols} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                          <VideocamIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />
                          No scripts in shoot queue
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingScripts.map((s, i) => (
                        <TableRow key={s._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>
                            {pendingPage * pendingRows + i + 1}
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <ScriptIdBadge id={s.scriptId} />
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <TypeBadge type={s.scriptType} />
                          </TableCell>
                          <TableCell sx={{ ...tdSx, maxWidth: 280 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography sx={{ fontSize: "0.85rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {previewRaw(s.scriptText, 140)}
                              </Typography>
                              <Tooltip title="View Full Script">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setViewContent(s);
                                    setViewOpen(true);
                                  }}
                                  sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}
                                >
                                  <ViewIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", color: "#475569" }}>{s.createdBy}</Typography>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Stack direction="row" alignItems="center" gap={0.7}>
                              <ScheduleIcon sx={{ fontSize: 16, color: "#d97706" }} />
                              <Typography sx={{ fontSize: "0.85rem", color: "#334155", whiteSpace: "nowrap" }}>{fmt(s.proceedToShootAt)}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<CheckIcon sx={{ fontSize: 16 }} />}
                                onClick={() => openConfirm(s)}
                                sx={{
                                  bgcolor: "#059669",
                                  color: "#ffffff",
                                  boxShadow: "none",
                                  textTransform: "none",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  py: 0.6,
                                  px: 1.5,
                                  "&:hover": { bgcolor: "#047857" },
                                }}
                              >
                                Mark as Done
                              </Button>
                              {s.referenceLink && (
                                <Tooltip title="Reference Link">
                                  <IconButton size="small" href={s.referenceLink} target="_blank" sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}>
                                    <OpenLinkIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
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

          {/* Completed */}
          {tab === 1 && (
            <Paper sx={lightPaper}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {["#", "Script ID", "Type", "Preview", "Creator", "Completed By", "Completed At", "Stage"].map((h) => (
                        <TableCell key={h} sx={thSx}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {doneScripts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={doneCols} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                          <CheckIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />
                          No completed shoots yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      doneScripts.map((s, i) => (
                        <TableRow key={s._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>
                            {donePage * doneRows + i + 1}
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <ScriptIdBadge id={s.scriptId} />
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <TypeBadge type={s.scriptType} />
                          </TableCell>
                          <TableCell sx={{ ...tdSx, maxWidth: 280 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography sx={{ fontSize: "0.85rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {previewRaw(s.scriptText, 140)}
                              </Typography>
                              <Tooltip title="View Full Script">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setViewContent(s);
                                    setViewOpen(true);
                                  }}
                                  sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}
                                >
                                  <ViewIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", color: "#475569" }}>{s.createdBy}</Typography>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", color: "#047857", fontWeight: 500 }}>{s.shootDoneBy || "—"}</Typography>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.85rem", color: "#334155", whiteSpace: "nowrap" }}>{fmt(s.shootDoneAt)}</Typography>
                          </TableCell>
                          <TableCell sx={tdSx}>
                            <Box
                              sx={{
                                display: "inline-block",
                                px: 1.2,
                                py: 0.3,
                                borderRadius: "100px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                bgcolor: "#dcfce7",
                                color: "#047857",
                                border: "1px solid #a7f3d0",
                              }}
                            >
                              {s.stage}
                            </Box>
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

      {/* View Modal (RAW) */}
      <Dialog open={viewOpen} onClose={() => { setViewOpen(false); setViewContent(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
        <DialogTitle
          sx={{
            color: "#0f172a",
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
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>Full Script Content</Typography>
          </Stack>
          <IconButton size="small" onClick={() => { setViewOpen(false); setViewContent(null); }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
          {viewContent && (
            <Box>
              <Stack direction="row" spacing={1.5} mb={2.5} alignItems="center">
                <ScriptIdBadge id={viewContent.scriptId} />
                <TypeBadge type={viewContent.scriptType} />
              </Stack>
              <Box sx={{ bgcolor: "#f8fafc", p: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Typography sx={{ fontSize: "0.95rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {htmlToRawText(viewContent.scriptText)}
                </Typography>
              </Box>
              {viewContent.referenceLink && (
                <Button component="a" href={viewContent.referenceLink} target="_blank" startIcon={<OpenLinkIcon />} sx={{ mt: 2, color: "#2563eb", textTransform: "none", fontWeight: 600 }}>
                  Open Reference Link
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={closeConfirm} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: "#0f172a", fontWeight: 700, borderBottom: "1px solid #e2e8f0", pb: 2, px: 3, display: "flex", alignItems: "center", gap: 1 }}>
          <VideocamIcon sx={{ color: "#059669" }} />
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>Confirm Shoot</Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Typography sx={{ color: "#475569", fontSize: "0.95rem", mb: 2 }}>Mark this shoot as completed?</Typography>
          {confirmTarget && (
            <Box sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5, p: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#2563eb", mb: 0.5 }}>
                {confirmTarget.scriptId} · {confirmTarget.scriptType}
              </Typography>
              <Typography sx={{ fontSize: "0.85rem", color: "#64748b", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {previewRaw(confirmTarget.scriptText, 220)}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1, borderTop: "1px solid #e2e8f0", pt: 2 }}>
          <Button onClick={closeConfirm} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleShootDone}
            disabled={confirming}
            startIcon={confirming ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{ bgcolor: "#059669", color: "#ffffff", boxShadow: "none", textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "#047857" } }}
          >
            {confirming ? "Saving…" : "Confirm Done"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", borderRadius: 2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

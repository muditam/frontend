// src/pages/MyReporting.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton,
  Autocomplete,
  Chip,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DateRangeIcon from "@mui/icons-material/DateRange";
import EventNoteIcon from "@mui/icons-material/EventNote";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import axios from "axios";

// ── Google Font ──────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap";
document.head.appendChild(fontLink);

// ── Theme ────────────────────────────────────────────────────
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563EB" },
    background: { default: "#F0F4FF", paper: "#FFFFFF" },
  },
  typography: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif" },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiTableCell: {
      styleOverrides: {
        root: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif" },
      },
    },
  },
});

const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const COLUMN_IDS = { NEW: "NEW", OPEN: "OPEN", PAUSED: "PAUSED", CLOSED: "CLOSED" };

// ── Date helpers ─────────────────────────────────────────────
const formatYMD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const todayYMD = () => formatYMD(new Date());
const getCurrentMonthValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const isSameDay = (dateVal, ymd) => {
  if (!dateVal || !ymd) return false;
  return formatYMD(new Date(dateVal)) === ymd;
};
const isBetweenInclusive = (dateVal, startYMD, endYMD) => {
  if (!dateVal || !startYMD || !endYMD) return false;
  const t = new Date(dateVal).getTime();
  return t >= new Date(startYMD).getTime() && t <= new Date(endYMD).getTime();
};
const isInMonth = (dateVal, ym) => {
  if (!dateVal || !ym) return false;
  const d = new Date(dateVal);
  const [yStr, mStr] = ym.split("-");
  return d.getFullYear() === Number(yStr) && d.getMonth() === Number(mStr) - 1;
};
const getCurrentWeekRange = () => {
  const now = new Date();
  const diffToMonday = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { start: formatYMD(monday), end: formatYMD(sunday) };
};

const timeToFinishHours = (task) => {
  if (!task) return null;
  if (task.totalActiveSeconds) return +(Number(task.totalActiveSeconds) / 3600).toFixed(2);
  if (task.startedAt && task.closedAt) {
    const diff = new Date(task.closedAt).getTime() - new Date(task.startedAt).getTime();
    if (diff > 0) return +(diff / (1000 * 60 * 60)).toFixed(2);
  }
  return null;
};

const formatDateTime = (val) => {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
};

// ── Field style ───────────────────────────────────────────────
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    bgcolor: "#F8FAFC",
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#93C5FD" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#2563EB", borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#2563EB" },
};

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon, label, value, helper, accent = "#2563EB", accentBg = "#EFF6FF" }) => (
  <Box
    sx={{
      flex: 1,
      borderRadius: "16px",
      bgcolor: "#FFFFFF",
      border: "1px solid #E2E8F0",
      p: 2.5,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      display: "flex",
      alignItems: "center",
      gap: 2,
    }}
  >
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: "14px",
        bgcolor: accentBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Box sx={{ color: accent, display: "flex" }}>{icon}</Box>
    </Box>
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#64748B", mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>
        {value}
      </Typography>
      {helper && (
        <Typography sx={{ fontSize: 12, color: "#94A3B8", mt: 0.5 }}>{helper}</Typography>
      )}
    </Box>
  </Box>
);

// ── Tab button ────────────────────────────────────────────────
const TabBtn = ({ label, icon, active, onClick }) => (
  <Button
    onClick={onClick}
    disableElevation
    sx={{
      textTransform: "none",
      fontWeight: 600,
      fontSize: 13,
      px: 2.5,
      py: 1,
      borderRadius: "10px",
      color: active ? "#2563EB" : "#64748B",
      bgcolor: active ? "#EFF6FF" : "transparent",
      border: active ? "1.5px solid #BFDBFE" : "1.5px solid transparent",
      gap: 0.75,
      "&:hover": { bgcolor: active ? "#EFF6FF" : "#F8FAFC" },
      transition: "all 0.15s",
    }}
    startIcon={icon}
  >
    {label}
  </Button>
);

// ── Table styles ──────────────────────────────────────────────
const thCellSx = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748B",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  bgcolor: "#F8FAFC",
  borderBottom: "1px solid #E2E8F0",
  py: 1.25,
  px: 2,
};

const tdCellSx = {
  fontSize: 13,
  color: "#334155",
  borderBottom: "1px solid #F1F5F9",
  py: 1.25,
  px: 2,
};

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
const MyReporting = () => {
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(todayYMD());
  const [weekRange, setWeekRange] = useState(() => getCurrentWeekRange());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [showReportInline, setShowReportInline] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [viewingUserName, setViewingUserName] = useState("");

  const [currentUser] = useState(() => {
    try { const raw = sessionStorage.getItem("user"); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  });

  const isManagerOrSuperAdmin = currentUser?.role === "Manager" || currentUser?.role === "Super Admin";
  const currentUserId = useMemo(() => (currentUser && (currentUser._id || currentUser.id)) || null, [currentUser]);
  const viewingOwn = useMemo(() => !!currentUserId && viewingUserId === currentUserId, [currentUserId, viewingUserId]);
  const headingPrefix = viewingUserName || currentUser?.fullName || "My";

  useEffect(() => {
    if (currentUserId && !viewingUserId) {
      setViewingUserId(currentUserId);
      setViewingUserName(currentUser?.fullName || currentUser?.name || "Me");
    }
  }, [currentUserId, currentUser, viewingUserId]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/employees`);
      const active = (res.data || [])
        .filter((e) => (e.status || "").toLowerCase() === "active")
        .sort((a, b) => (a.fullName || a.name || "").localeCompare(b.fullName || b.name || ""));
      setEmployees(active);
    } catch { setEmployees([]); }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const fetchTasks = useCallback(async (ownerId) => {
    const targetId = ownerId || viewingUserId || currentUserId;
    if (!targetId) return;
    try {
      setLoading(true); setLoadError("");
      const { data } = await axios.get(`${API_BASE_URL}/api/tasks/board`, { params: { userId: targetId } });
      setTasks((data.tasks || []).map((t) => ({
        id: String(t.id || t._id), title: t.title, description: t.description || "",
        status: t.status, assigneeId: t.assigneeId || null, assigneeName: t.assigneeName || "",
        assignedById: t.assignedById || null, assignedByName: t.assignedByName || "",
        assignedDate: t.assignedDate || null, dueDate: t.dueDate || null,
        totalActiveSeconds: t.totalActiveSeconds || 0, startedAt: t.startedAt || null,
        activeSince: t.activeSince || null, closedAt: t.closedAt || null, createdAt: t.createdAt || null,
      })));
    } catch (e) {
      setLoadError(e?.message || "Failed to load report data");
      setTasks([]);
    } finally { setLoading(false); }
  }, [viewingUserId, currentUserId]);

  useEffect(() => {
    if (viewingUserId || currentUserId) fetchTasks(viewingUserId || currentUserId);
  }, [fetchTasks, viewingUserId, currentUserId]);

  const closedTasks = useMemo(() => tasks.filter((t) => t.status === COLUMN_IDS.CLOSED), [tasks]);
  const openTasks = useMemo(() => tasks.filter((t) => t.status === COLUMN_IDS.OPEN), [tasks]);

  const dailyClosed = useMemo(() => closedTasks.filter((t) => isSameDay(t.closedAt, selectedDate)), [closedTasks, selectedDate]);
  const weeklyClosed = useMemo(() => closedTasks.filter((t) => isBetweenInclusive(t.closedAt, weekRange.start, weekRange.end)), [closedTasks, weekRange]);
  const monthlyClosed = useMemo(() => closedTasks.filter((t) => isInMonth(t.closedAt, selectedMonth)), [closedTasks, selectedMonth]);

  const summarize = (list) => {
    const count = list.length;
    const totalHours = +list.reduce((acc, t) => acc + (timeToFinishHours(t) || 0), 0).toFixed(2);
    return { count, totalHours };
  };

  const dailySummary = summarize(dailyClosed);
  const weeklySummary = summarize(weeklyClosed);
  const monthlySummary = summarize(monthlyClosed);

  const confirmOpenViewedReport = () => {
    if (!selectedViewer) return;
    const id = selectedViewer._id || selectedViewer.id;
    if (!id) return;
    setViewingUserId(id);
    setViewingUserName(selectedViewer.fullName || selectedViewer.name || "User");
    setShowReportInline(false);
  };

  const closeInlinePickerAndRevert = () => {
    if (!currentUserId) { setShowReportInline(false); return; }
    setViewingUserId(currentUserId);
    setViewingUserName(currentUser?.fullName || currentUser?.name || "Me");
    setSelectedViewer(null);
    setShowReportInline(false);
  };

  // ── Table renderers ───────────────────────────────────────
  const renderClosedRows = (list) =>
    list.length === 0 ? (
      <TableRow>
        <TableCell colSpan={6} sx={{ ...tdCellSx, py: 3, textAlign: "center" }}>
          <Typography sx={{ fontSize: 13, color: "#94A3B8" }}>No closed tasks for this period.</Typography>
        </TableCell>
      </TableRow>
    ) : list.map((t) => {
      const hours = timeToFinishHours(t);
      return (
        <TableRow key={t.id} sx={{ "&:hover": { bgcolor: "#F8FAFC" }, transition: "background 0.1s" }}>
          <TableCell sx={{ ...tdCellSx, fontWeight: 600, color: "#0F172A", maxWidth: 220 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{t.title}</Typography>
            {t.description && (
              <Typography sx={{ fontSize: 11, color: "#94A3B8", mt: 0.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                {t.description}
              </Typography>
            )}
          </TableCell>
          <TableCell sx={tdCellSx}>
            {t.assigneeName ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#4338CA", flexShrink: 0 }}>
                  {t.assigneeName.charAt(0).toUpperCase()}
                </Box>
                <Typography sx={{ fontSize: 13 }}>{t.assigneeName}</Typography>
              </Box>
            ) : <Typography sx={{ fontSize: 13, color: "#CBD5E1" }}>—</Typography>}
          </TableCell>
          <TableCell sx={tdCellSx}>
            {t.assignedByName || <Typography sx={{ fontSize: 13, color: "#CBD5E1" }}>—</Typography>}
          </TableCell>
          <TableCell sx={{ ...tdCellSx, whiteSpace: "nowrap" }}>{formatDateTime(t.startedAt)}</TableCell>
          <TableCell sx={{ ...tdCellSx, whiteSpace: "nowrap" }}>{formatDateTime(t.closedAt)}</TableCell>
          <TableCell sx={{ ...tdCellSx, textAlign: "right" }}>
            {hours !== null ? (
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.35, borderRadius: "8px", bgcolor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                <AccessTimeIcon sx={{ fontSize: 11, color: "#16A34A" }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>{hours}h</Typography>
              </Box>
            ) : <Typography sx={{ fontSize: 13, color: "#CBD5E1" }}>—</Typography>}
          </TableCell>
        </TableRow>
      );
    });

  const renderOpenRows = (list) =>
    list.length === 0 ? (
      <TableRow>
        <TableCell colSpan={6} sx={{ ...tdCellSx, py: 3, textAlign: "center" }}>
          <Typography sx={{ fontSize: 13, color: "#94A3B8" }}>No open tasks.</Typography>
        </TableCell>
      </TableRow>
    ) : list.map((t) => (
      <TableRow key={t.id} sx={{ "&:hover": { bgcolor: "#F8FAFC" }, transition: "background 0.1s" }}>
        <TableCell sx={{ ...tdCellSx, fontWeight: 600, color: "#0F172A", maxWidth: 220 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{t.title}</Typography>
        </TableCell>
        <TableCell sx={tdCellSx}>
          {t.assigneeName ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#4338CA", flexShrink: 0 }}>
                {t.assigneeName.charAt(0).toUpperCase()}
              </Box>
              <Typography sx={{ fontSize: 13 }}>{t.assigneeName}</Typography>
            </Box>
          ) : <Typography sx={{ fontSize: 13, color: "#CBD5E1" }}>—</Typography>}
        </TableCell>
        <TableCell sx={tdCellSx}>{t.assignedByName || "—"}</TableCell>
        <TableCell sx={{ ...tdCellSx, whiteSpace: "nowrap" }}>{formatDateTime(t.startedAt)}</TableCell>
        <TableCell sx={{ ...tdCellSx, whiteSpace: "nowrap" }}>{formatDateTime(t.dueDate)}</TableCell>
        <TableCell sx={{ ...tdCellSx, textAlign: "right" }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.35, borderRadius: "8px", bgcolor: "#ECFDF5", border: "1px solid #6EE7B7" }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#10B981", animation: "pulse 1.5s infinite", "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } } }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>Active</Typography>
          </Box>
        </TableCell>
      </TableRow>
    ));

  const TableSection = ({ title, children }) => (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#374151", mb: 1.25, display: "flex", alignItems: "center", gap: 0.75 }}>
        {title}
      </Typography>
      <Box sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {children}
      </Box>
    </Box>
  );

  const ClosedTable = ({ list }) => (
    <TableSection title="Closed Tasks">
      <Table size="small">
        <TableHead>
          <TableRow>
            {["Task", "Assignee", "Assigned By", "Started At", "Closed At", "Time Spent"].map((h, i) => (
              <TableCell key={h} sx={{ ...thCellSx, textAlign: i === 5 ? "right" : "left" }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>{renderClosedRows(list)}</TableBody>
      </Table>
    </TableSection>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", bgcolor: "#F0F4FF" }}>

        {/* ── Top bar ── */}
        <Box sx={{ bgcolor: "#FFFFFF", borderBottom: "1px solid #E5E7EB", px: 3, py: 1.75, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "10px", background: "linear-gradient(135deg, #7C3AED, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <QueryStatsIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#0F172A", lineHeight: 1.2 }}>
                {headingPrefix} — Performance Report
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#94A3B8" }}>
                {loading ? "Loading…" : `${tasks.length} task${tasks.length === 1 ? "" : "s"} in workspace`}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            {viewingOwn && (
              <Chip
                size="small"
                icon={<AssignmentIndIcon sx={{ fontSize: 13 }} />}
                label="My Report"
                sx={{ bgcolor: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", fontWeight: 600, fontSize: 12 }}
              />
            )}

            {isManagerOrSuperAdmin && (!showReportInline ? (
              <Button
                variant="outlined"
                onClick={() => { setShowReportInline(true); setSelectedViewer(null); }}
                startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                sx={{ textTransform: "none", borderRadius: "10px", fontWeight: 600, fontSize: 13, px: 2, py: 0.75, color: "#374151", borderColor: "#E5E7EB", bgcolor: "#FFFFFF", "&:hover": { bgcolor: "#F9FAFB", borderColor: "#D1D5DB" } }}
              >
                View Report
              </Button>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.75, borderRadius: "10px", border: "1px solid #BFDBFE", bgcolor: "#EFF6FF", minWidth: 300 }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  size="small"
                  options={employees}
                  value={selectedViewer}
                  onChange={(_, v) => setSelectedViewer(v)}
                  getOptionLabel={(opt) => opt.fullName || opt.name || ""}
                  isOptionEqualToValue={(o, v) => (o._id || o.id) === (v?._id || v?.id)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Search employee…"
                      sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff", borderRadius: "8px" } }} />
                  )}
                />
                <IconButton size="small" onClick={confirmOpenViewedReport} disabled={!selectedViewer}
                  sx={{ bgcolor: "#2563EB", color: "#fff", width: 28, height: 28, borderRadius: "8px", "&:hover": { bgcolor: "#1D4ED8" }, "&.Mui-disabled": { bgcolor: "#BFDBFE", color: "#93C5FD" } }}>
                  <CheckIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton size="small" onClick={closeInlinePickerAndRevert}
                  sx={{ bgcolor: "#F1F5F9", color: "#64748B", width: 28, height: 28, borderRadius: "8px", "&:hover": { bgcolor: "#E2E8F0" } }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* ── Content ── */}
        <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
          {loadError && (
            <Alert severity="warning" sx={{ borderRadius: "10px", mb: 2 }}>{String(loadError)}</Alert>
          )}

          {/* Period tabs */}
          <Box sx={{ bgcolor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", p: 3 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              <TabBtn label="Daily" icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />} active={activeTab === "daily"} onClick={() => setActiveTab("daily")} />
              <TabBtn label="Weekly" icon={<DateRangeIcon sx={{ fontSize: 14 }} />} active={activeTab === "weekly"} onClick={() => setActiveTab("weekly")} />
              <TabBtn label="Monthly" icon={<EventNoteIcon sx={{ fontSize: 14 }} />} active={activeTab === "monthly"} onClick={() => setActiveTab("monthly")} />
            </Stack>

            {/* ── Filters ── */}
            <Box sx={{ mb: 3, p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              {activeTab === "daily" && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                  <TextField label="Date" type="date" size="small" InputLabelProps={{ shrink: true }}
                    value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                    sx={{ ...fieldSx, minWidth: 200 }} />
                  <Typography sx={{ fontSize: 13, color: "#64748B" }}>
                    Showing closed tasks for the selected date, plus all currently open tasks.
                  </Typography>
                </Stack>
              )}
              {activeTab === "weekly" && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                  <TextField label="Week start" type="date" size="small" InputLabelProps={{ shrink: true }}
                    value={weekRange.start} onChange={(e) => setWeekRange((p) => ({ ...p, start: e.target.value }))}
                    sx={{ ...fieldSx, minWidth: 190 }} />
                  <Box sx={{ display: "flex", alignItems: "center", color: "#94A3B8" }}>
                    <Box sx={{ width: 20, height: 1.5, bgcolor: "#CBD5E1" }} />
                  </Box>
                  <TextField label="Week end" type="date" size="small" InputLabelProps={{ shrink: true }}
                    value={weekRange.end} onChange={(e) => setWeekRange((p) => ({ ...p, end: e.target.value }))}
                    sx={{ ...fieldSx, minWidth: 190 }} />
                  <Typography sx={{ fontSize: 13, color: "#64748B" }}>Closed tasks in selected range.</Typography>
                </Stack>
              )}
              {activeTab === "monthly" && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                  <TextField label="Month" type="month" size="small" InputLabelProps={{ shrink: true }}
                    value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                    sx={{ ...fieldSx, minWidth: 200 }} />
                  <Typography sx={{ fontSize: 13, color: "#64748B" }}>Closed tasks for the selected month.</Typography>
                </Stack>
              )}
            </Box>

            {/* ── Stat cards ── */}
            {activeTab === "daily" && (
              <>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
                  <StatCard
                    icon={<DoneAllIcon />}
                    label="Closed Today"
                    value={dailySummary.count}
                    helper={`${dailySummary.totalHours}h focused time`}
                    accent="#2563EB" accentBg="#EFF6FF"
                  />
                  <StatCard
                    icon={<AccessTimeIcon />}
                    label="Currently Active"
                    value={openTasks.length}
                    helper="Tasks still in progress"
                    accent="#10B981" accentBg="#ECFDF5"
                  />
                  <StatCard
                    icon={<TrendingUpIcon />}
                    label="Total Tasks"
                    value={tasks.length}
                    helper="Across all statuses"
                    accent="#7C3AED" accentBg="#F5F3FF"
                  />
                </Stack>

                <ClosedTable list={dailyClosed} />

                <TableSection title="Active Tasks">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {["Task", "Assignee", "Assigned By", "Started At", "Due Date", "Status"].map((h, i) => (
                          <TableCell key={h} sx={{ ...thCellSx, textAlign: i === 5 ? "right" : "left" }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>{renderOpenRows(openTasks)}</TableBody>
                  </Table>
                </TableSection>
              </>
            )}

            {activeTab === "weekly" && (
              <>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
                  <StatCard
                    icon={<DoneAllIcon />}
                    label="Closed This Week"
                    value={weeklySummary.count}
                    helper={`${weeklySummary.totalHours}h focused time`}
                    accent="#2563EB" accentBg="#EFF6FF"
                  />
                  <StatCard
                    icon={<TrendingUpIcon />}
                    label="Daily Average"
                    value={weeklySummary.count > 0 ? (weeklySummary.count / 7).toFixed(1) : "0"}
                    helper="Tasks closed per day"
                    accent="#F59E0B" accentBg="#FFFBEB"
                  />
                </Stack>
                <ClosedTable list={weeklyClosed} />
              </>
            )}

            {activeTab === "monthly" && (
              <>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
                  <StatCard
                    icon={<DoneAllIcon />}
                    label="Closed This Month"
                    value={monthlySummary.count}
                    helper={`${monthlySummary.totalHours}h focused time`}
                    accent="#2563EB" accentBg="#EFF6FF"
                  />
                  <StatCard
                    icon={<TrendingUpIcon />}
                    label="Daily Average"
                    value={monthlySummary.count > 0 ? (monthlySummary.count / 30).toFixed(1) : "0"}
                    helper="Tasks closed per day"
                    accent="#F59E0B" accentBg="#FFFBEB"
                  />
                  <StatCard
                    icon={<AccessTimeIcon />}
                    label="Avg. Time / Task"
                    value={monthlySummary.count > 0 ? `${(monthlySummary.totalHours / monthlySummary.count).toFixed(1)}h` : "—"}
                    helper="Average hours per closed task"
                    accent="#10B981" accentBg="#ECFDF5"
                  />
                </Stack>
                <ClosedTable list={monthlyClosed} />
              </>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default MyReporting;
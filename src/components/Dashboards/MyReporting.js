// src/pages/MyReporting.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
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
  Card,
  CardContent,
  Chip,
  Divider,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import axios from "axios";

const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const COLUMN_IDS = {
  NEW: "NEW",
  OPEN: "OPEN",
  PAUSED: "PAUSED",
  CLOSED: "CLOSED",
};

// -------- date helpers --------
const formatYMD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayYMD = () => formatYMD(new Date());

const getCurrentMonthValue = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // for <input type="month" />
};

const isSameDay = (dateVal, ymd) => {
  if (!dateVal || !ymd) return false;
  const d = new Date(dateVal);
  return formatYMD(d) === ymd;
};

const isBetweenInclusive = (dateVal, startYMD, endYMD) => {
  if (!dateVal || !startYMD || !endYMD) return false;
  const t = new Date(dateVal).getTime();
  const s = new Date(startYMD).getTime();
  const e = new Date(endYMD).getTime();
  return t >= s && t <= e;
};

const isInMonth = (dateVal, ym) => {
  if (!dateVal || !ym) return false;
  const d = new Date(dateVal);
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr) - 1;
  return d.getFullYear() === y && d.getMonth() === m;
};

const getCurrentWeekRange = () => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diffToMonday = (day + 6) % 7; // 0 for Monday, 6 for Sunday
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diffToMonday
  );
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6
  );
  return {
    start: formatYMD(monday),
    end: formatYMD(sunday),
  };
};

// time helpers
const timeToFinishHours = (task) => {
  if (!task) return null;
  if (task.totalActiveSeconds) {
    return +(Number(task.totalActiveSeconds) / 3600).toFixed(2);
  }
  if (task.startedAt && task.closedAt) {
    const start = new Date(task.startedAt).getTime();
    const end = new Date(task.closedAt).getTime();
    if (end > start) {
      return +((end - start) / (1000 * 60 * 60)).toFixed(2);
    }
  }
  return null;
};

const formatDateTime = (val) => {
  if (!val) return "";
  const d = new Date(val);
  return d.toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

// small stat card
const StatCard = ({ icon, label, value, helper }) => (
  <Card
    elevation={0}
    sx={{
      flex: 1,
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      bgcolor: "#f9fafb",
    }}
  >
    <CardContent sx={{ py: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: "primary.light",
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: "text.secondary" }}
          >
            {label}
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.5 }}
          >
            {value}
          </Typography>
          {helper && (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              {helper}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// -------- main component --------
const MyReporting = () => {
  const [activeTab, setActiveTab] = useState("daily");

  const [selectedDate, setSelectedDate] = useState(todayYMD());
  const [weekRange, setWeekRange] = useState(() => getCurrentWeekRange());
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonthValue());

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [employees, setEmployees] = useState([]);
  const [showReportInline, setShowReportInline] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState(null);

  const [viewingUserId, setViewingUserId] = useState(null);
  const [viewingUserName, setViewingUserName] = useState("");

  const [currentUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const currentUserId = useMemo(
    () => (currentUser && (currentUser._id || currentUser.id)) || null,
    [currentUser]
  );

  const viewingOwn = useMemo(
    () => !!currentUserId && viewingUserId === currentUserId,
    [currentUserId, viewingUserId]
  );

  const headingPrefix =
    viewingUserName || currentUser?.fullName || "My";

  // initial viewing user = current user
  useEffect(() => {
    if (currentUserId && !viewingUserId) {
      setViewingUserId(currentUserId);
      setViewingUserName(
        currentUser?.fullName || currentUser?.name || "Me"
      );
    }
  }, [currentUserId, currentUser, viewingUserId]);

  // fetch employees (for View Report)
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/employees`);
      const raw = res.data || [];
      const active = raw
        .filter(
          (emp) => (emp.status || "").toLowerCase() === "active"
        )
        .sort((a, b) =>
          (a.fullName || a.name || "").localeCompare(
            b.fullName || b.name || ""
          )
        );
      setEmployees(active);
    } catch (e) {
      console.error("Failed to fetch employees", e);
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // fetch tasks for current viewingUserId
  const fetchTasks = useCallback(
    async (ownerId) => {
      const targetId = ownerId || viewingUserId || currentUserId;
      if (!targetId) return;

      try {
        setLoading(true);
        setLoadError("");
        const { data } = await axios.get(
          `${API_BASE_URL}/api/tasks/board`,
          { params: { userId: targetId } }
        );
        const loaded = (data.tasks || []).map((t) => ({
          id: String(t.id || t._id),
          title: t.title,
          description: t.description || "",
          status: t.status,
          assigneeId: t.assigneeId || null,
          assigneeName: t.assigneeName || "",
          assignedById: t.assignedById || null,
          assignedByName: t.assignedByName || "",
          assignedDate: t.assignedDate || null,
          dueDate: t.dueDate || null,
          totalActiveSeconds: t.totalActiveSeconds || 0,
          startedAt: t.startedAt || null,
          activeSince: t.activeSince || null,
          closedAt: t.closedAt || null,
          createdAt: t.createdAt || null,
        }));
        setTasks(loaded);
      } catch (e) {
        console.error("Failed to load tasks for reporting", e);
        setLoadError(e?.message || "Failed to load report data");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    },
    [viewingUserId, currentUserId]
  );

  useEffect(() => {
    if (viewingUserId || currentUserId) {
      fetchTasks(viewingUserId || currentUserId);
    }
  }, [fetchTasks, viewingUserId, currentUserId]);

  // -------- filtering logic --------
  const closedTasks = useMemo(
    () => tasks.filter((t) => t.status === COLUMN_IDS.CLOSED),
    [tasks]
  );

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === COLUMN_IDS.OPEN),
    [tasks]
  );

  const dailyClosed = useMemo(
    () =>
      closedTasks.filter((t) =>
        isSameDay(t.closedAt, selectedDate)
      ),
    [closedTasks, selectedDate]
  );

  const weeklyClosed = useMemo(
    () =>
      closedTasks.filter((t) =>
        isBetweenInclusive(
          t.closedAt,
          weekRange.start,
          weekRange.end
        )
      ),
    [closedTasks, weekRange]
  );

  const monthlyClosed = useMemo(
    () =>
      closedTasks.filter((t) => isInMonth(t.closedAt, selectedMonth)),
    [closedTasks, selectedMonth]
  );

  const summarizeTasks = (list) => {
    const count = list.length;
    const totalHours = list.reduce((acc, t) => {
      const h = timeToFinishHours(t);
      return acc + (h || 0);
    }, 0);
    return { count, totalHours: +totalHours.toFixed(2) };
  };

  const dailySummary = summarizeTasks(dailyClosed);
  const weeklySummary = summarizeTasks(weeklyClosed);
  const monthlySummary = summarizeTasks(monthlyClosed);

  // -------- View Report logic --------
  const openInlinePicker = () => {
    setShowReportInline(true);
    setSelectedViewer(null);
  };

  const confirmOpenViewedReport = () => {
    if (!selectedViewer) return;
    const id = selectedViewer._id || selectedViewer.id;
    if (!id) return;

    setViewingUserId(id);
    setViewingUserName(
      selectedViewer.fullName || selectedViewer.name || "User"
    );
    setShowReportInline(false);
  };

  const closeInlinePickerAndRevert = () => {
    if (!currentUserId) {
      setShowReportInline(false);
      return;
    }
    setViewingUserId(currentUserId);
    setViewingUserName(
      currentUser?.fullName || currentUser?.name || "Me"
    );
    setSelectedViewer(null);
    setShowReportInline(false);
  };

  const headerBtnSx = {
    textTransform: "none",
    borderRadius: 999,
    bgcolor: "#0f172a",
    color: "#ffffff",
    border: "1px solid #0f172a",
    px: 2.2,
    "&:hover": { bgcolor: "#111827" },
  };

  // -------- table row renderer --------
  const renderRows = (list) =>
    list.map((t) => {
      const hours = timeToFinishHours(t);
      return (
        <TableRow key={t.id} hover>
          <TableCell>{t.title}</TableCell>
          <TableCell>{t.assigneeName || "-"}</TableCell>
          <TableCell>{t.assignedByName || "-"}</TableCell>
          <TableCell>{formatDateTime(t.startedAt)}</TableCell>
          <TableCell>{formatDateTime(t.closedAt)}</TableCell>
          <TableCell align="right">
            {hours !== null ? `${hours} h` : "-"}
          </TableCell>
        </TableRow>
      );
    });

  const renderOpenRows = (list) =>
    list.map((t) => (
      <TableRow key={t.id} hover>
        <TableCell>{t.title}</TableCell>
        <TableCell>{t.assigneeName || "-"}</TableCell>
        <TableCell>{t.assignedByName || "-"}</TableCell>
        <TableCell>{formatDateTime(t.startedAt)}</TableCell>
        <TableCell>{formatDateTime(t.dueDate)}</TableCell>
        <TableCell align="right">
          <Chip
            size="small"
            label="Open"
            sx={{
              bgcolor: "success.light",
              color: "success.main",
              fontWeight: 600,
            }}
          />
        </TableCell>
      </TableRow>
    ));

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        bgcolor: "#f3f4f6",
        py: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 1.5, md: 2 },
        }}
      >
        {/* header */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  bgcolor: "#0f172a",
                  color: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QueryStatsIcon fontSize="small" />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  color: "#0f172a",
                }}
              >
                {headingPrefix} – Performance Reporting
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mt: 0.5 }}
            >
              {loading
                ? "Loading report..."
                : `${tasks.length} task${tasks.length === 1 ? "" : "s"} in this workspace`}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            {!showReportInline ? (
              <Button
                variant="contained"
                onClick={openInlinePicker}
                sx={headerBtnSx}
                startIcon={<VisibilityIcon />}
              >
                View Report
              </Button>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1,
                  py: 0.7,
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  bgcolor: "#ffffff",
                  minWidth: { xs: 260, sm: 360 },
                }}
              >
                <Autocomplete
                  sx={{ flex: 1 }}
                  size="small"
                  options={employees}
                  value={selectedViewer}
                  onChange={(_, v) => setSelectedViewer(v)}
                  getOptionLabel={(opt) =>
                    opt.fullName || opt.name || ""
                  }
                  isOptionEqualToValue={(o, v) =>
                    (o._id || o.id) === (v?._id || v?.id)
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Search employee…"
                    />
                  )}
                />

                <IconButton
                  size="small"
                  onClick={confirmOpenViewedReport}
                  disabled={!selectedViewer}
                  sx={{ color: "#0f172a" }}
                  title="Open report"
                >
                  <CheckIcon fontSize="small" />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={closeInlinePickerAndRevert}
                  sx={{ color: "#6b7280" }}
                  title="Close and revert to my report"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            {viewingOwn && (
              <Chip
                size="small"
                icon={<AssignmentIndIcon sx={{ fontSize: 16 }} />}
                label="My report"
                sx={{
                  bgcolor: "#e5e7eb",
                  color: "#111827",
                  fontWeight: 500,
                }}
              />
            )}
          </Stack>
        </Box>

        {loadError && (
          <Box mb={2}>
            <Alert severity="warning" variant="outlined">
              {String(loadError)}
            </Alert>
          </Box>
        )}

        {/* main card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            bgcolor: "#ffffff",
            overflow: "hidden",
          }}
        >
          {/* tabs */}
          <Box
            sx={{
              px: 2,
              pt: 1.5,
              borderBottom: "1px solid #e5e7eb",
              bgcolor: "#f9fafb",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              textColor="primary"
              indicatorColor="primary"
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  minHeight: 40,
                  fontSize: 14,
                },
              }}
            >
              <Tab label="Daily" value="daily" />
              <Tab label="Weekly" value="weekly" />
              <Tab label="Monthly" value="monthly" />
            </Tabs>
          </Box>

          <Box sx={{ px: 2.5, py: 2.5 }}>
            {/* filters */}
            {activeTab === "daily" && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{ mb: 2 }}
              >
                <TextField
                  label="Date"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  sx={{ minWidth: 200 }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary" }}
                >
                  Closed tasks for the selected date, plus all current
                  open tasks.
                </Typography>
              </Stack>
            )}

            {activeTab === "weekly" && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{ mb: 2 }}
              >
                <TextField
                  label="Week start"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={weekRange.start}
                  onChange={(e) =>
                    setWeekRange((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }))
                  }
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="Week end"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={weekRange.end}
                  onChange={(e) =>
                    setWeekRange((prev) => ({
                      ...prev,
                      end: e.target.value,
                    }))
                  }
                  sx={{ minWidth: 200 }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary" }}
                >
                  Closed tasks between the selected dates.
                </Typography>
              </Stack>
            )}

            {activeTab === "monthly" && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{ mb: 2 }}
              >
                <TextField
                  label="Month"
                  type="month"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={selectedMonth}
                  onChange={(e) =>
                    setSelectedMonth(e.target.value)
                  }
                  sx={{ minWidth: 200 }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary" }}
                >
                  Closed tasks for the selected month.
                </Typography>
              </Stack>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* summaries + tables */}
            {activeTab === "daily" && (
              <Box sx={{ mb: 2 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  sx={{ mb: 3 }}
                >
                  <StatCard
                    icon={<DoneAllIcon fontSize="small" />}
                    label="Closed today"
                    value={dailySummary.count}
                    helper={`${dailySummary.totalHours} h focused time`}
                  />
                  <StatCard
                    icon={<AccessTimeIcon fontSize="small" />}
                    label="Currently open"
                    value={openTasks.length}
                    helper="Tasks still in progress"
                  />
                </Stack>

                {/* closed tasks table */}
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: 600 }}
                >
                  Closed tasks
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    mb: 3,
                    "& .MuiTableHead-root": {
                      bgcolor: "#f3f4f6",
                    },
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Assignee</TableCell>
                        <TableCell>Assigned by</TableCell>
                        <TableCell>Started at</TableCell>
                        <TableCell>Closed at</TableCell>
                        <TableCell align="right">
                          Time spent (h)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dailyClosed.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Typography variant="body2">
                              No closed tasks for this date.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        renderRows(dailyClosed)
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* open tasks table */}
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: 600 }}
                >
                  Open tasks (current)
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    "& .MuiTableHead-root": {
                      bgcolor: "#f3f4f6",
                    },
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Assignee</TableCell>
                        <TableCell>Assigned by</TableCell>
                        <TableCell>Started at</TableCell>
                        <TableCell>Due date</TableCell>
                        <TableCell align="right">
                          Status
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {openTasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Typography variant="body2">
                              No open tasks.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        renderOpenRows(openTasks)
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === "weekly" && (
              <Box sx={{ mb: 2 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  sx={{ mb: 3 }}
                >
                  <StatCard
                    icon={<DoneAllIcon fontSize="small" />}
                    label="Closed this week"
                    value={weeklySummary.count}
                    helper={`${weeklySummary.totalHours} h focused time`}
                  />
                </Stack>

                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: 600 }}
                >
                  Closed tasks
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    "& .MuiTableHead-root": {
                      bgcolor: "#f3f4f6",
                    },
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Assignee</TableCell>
                        <TableCell>Assigned by</TableCell>
                        <TableCell>Started at</TableCell>
                        <TableCell>Closed at</TableCell>
                        <TableCell align="right">
                          Time spent (h)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {weeklyClosed.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Typography variant="body2">
                              No closed tasks in this week.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        renderRows(weeklyClosed)
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === "monthly" && (
              <Box sx={{ mb: 2 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  sx={{ mb: 3 }}
                >
                  <StatCard
                    icon={<DoneAllIcon fontSize="small" />}
                    label="Closed this month"
                    value={monthlySummary.count}
                    helper={`${monthlySummary.totalHours} h focused time`}
                  />
                </Stack>

                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: 600 }}
                >
                  Closed tasks
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    "& .MuiTableHead-root": {
                      bgcolor: "#f3f4f6",
                    },
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Assignee</TableCell>
                        <TableCell>Assigned by</TableCell>
                        <TableCell>Started at</TableCell>
                        <TableCell>Closed at</TableCell>
                        <TableCell align="right">
                          Time spent (h)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthlyClosed.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Typography variant="body2">
                              No closed tasks in this month.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        renderRows(monthlyClosed)
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </Paper>
      </Box> 
    </Box>
  );
};

export default MyReporting;

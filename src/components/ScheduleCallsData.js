// src/components/ScheduleCalls.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TablePagination,
  CircularProgress,
  Drawer,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CancelIcon from "@mui/icons-material/Cancel";
import NotInterestedIcon from "@mui/icons-material/NotInterested";
import axios from "axios";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELED", label: "Canceled" },
  { value: "NO_SHOW", label: "No Show" },
];

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "-";

const pad = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function ScheduleCalls({
  // Change if you run locally:
  apiBase = "http://localhost:5001", 
}) {
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // filters
  const [status, setStatus] = useState("");
  const [expert, setExpert] = useState(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toYMD(d);
  });
  const [to, setTo] = useState(() => toYMD(new Date()));

  // list state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-based UI
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);

  // details
  const [drawer, setDrawer] = useState({ open: false, row: null });

  // toast
  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });

  const expertId = expert?.id || expert?.value || expert?.label || "";

  // Fetch experts (doctors) reusing your employees API
  const fetchAgents = useCallback(async () => {
    try {
      setLoadingAgents(true);
      const { data } = await axios.get(`${apiBase}/api/employees`);
      const filtered = Array.isArray(data)
        ? data.filter((a) => !!a?.isDoctor && (a?.status === "active" || a?.status === "Active"))
        : [];
      setAgents(
        filtered.map((a) => ({
          id: a?._id || a?.id || a?.email || a?.name,
          label: a?.fullName || a?.name || a?.email || String(a?._id || ""),
        }))
      );
    } catch (e) {
      setToast({ open: true, severity: "error", msg: "Failed to load experts" });
    } finally {
      setLoadingAgents(false);
    }
  }, [apiBase]);

  // Fetch schedules
  const fetchList = useCallback(
    async (pageZero = 0, limit = rowsPerPage) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: pageZero + 1, // API is 1-based
          limit,
        });
        if (status) params.set("status", status);
        if (from) params.set("from", new Date(from + "T00:00:00").toISOString());
        if (to) params.set("to", new Date(to + "T23:59:59.999").toISOString());
        if (expertId) params.set("expertId", String(expertId));

        const { data } = await axios.get(`${apiBase}/api/schedule-calls?${params.toString()}`);
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(typeof data?.total === "number" ? data.total : 0);
      } catch (e) {
        setToast({ open: true, severity: "error", msg: "Failed to load schedules" });
      } finally {
        setLoading(false);
      }
    },
    [apiBase, status, from, to, expertId, rowsPerPage]
  );

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    setPage(0);
    fetchList(0, rowsPerPage);
  }, [status, expertId, from, to]); // eslint-disable-line

  const refresh = () => fetchList(page, rowsPerPage);

  // actions
  const updateStatus = async (row, newStatus) => {
    try {
      await axios.put(`${apiBase}/api/schedule-calls/${row._id}`, { status: newStatus });
      setToast({ open: true, severity: "success", msg: `Marked ${newStatus.toLowerCase().replace("_", " ")}` });
      // Update in-place for snappy UI
      setItems((xs) => xs.map((x) => (x._id === row._id ? { ...x, status: newStatus, updatedAt: new Date().toISOString() } : x)));
      setDrawer((d) => (d.row && d.row._id === row._id ? { ...d, row: { ...d.row, status: newStatus } } : d));
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Failed to update";
      setToast({ open: true, severity: "error", msg });
    }
  };

  const StatusChip = ({ value }) => {
    const color =
      value === "COMPLETED"
        ? "success"
        : value === "CANCELED"
        ? "error"
        : value === "NO_SHOW"
        ? "warning"
        : value === "RESCHEDULED"
        ? "info"
        : "default";
    return <Chip size="small" color={color} label={value || "-"} variant={color === "default" ? "outlined" : "filled"} />;
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>Schedule Calls</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              size="small"
              options={agents}
              loading={loadingAgents}
              value={expert}
              onChange={(_e, v) => setExpert(v)}
              getOptionLabel={(o) => o?.label || ""}
              renderInput={(params) => <TextField {...params} label="Expert" />}
              sx={{ minWidth: 220 }}
              isOptionEqualToValue={(a, b) =>
                (a?.id || a?.value || a?.label) === (b?.id || b?.value || b?.label)
              }
            />

            <TextField
              size="small"
              type="date"
              label="From"
              InputLabelProps={{ shrink: true }}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              InputLabelProps={{ shrink: true }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />

            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={refresh} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Date & Time</TableCell> 
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Order</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead> 

          <TableBody>
            {items.map((row, idx) => {
              const serial = page * rowsPerPage + idx + 1;
              return (
                <TableRow key={row._id} hover> 
                  <TableCell>{serial}</TableCell>
                  <TableCell>{fmtDateTime(row.scheduleCallAt)}</TableCell> 
                  <TableCell>{row.scheduleDurationMin ? `${row.scheduleDurationMin} min` : "-"}</TableCell>
                  <TableCell><StatusChip value={row.status} /></TableCell>
                  <TableCell>{row.orderId || "-"}</TableCell>
                  <TableCell>{row.customerId || "-"}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Details">
                        <span>
                          <IconButton color="primary" onClick={() => setDrawer({ open: true, row })}>
                            <InfoOutlinedIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Mark Completed">
                        <span>
                          <IconButton onClick={() => updateStatus(row, "COMPLETED")} disabled={row.status === "COMPLETED"}>
                            <DoneAllIcon color={row.status === "COMPLETED" ? "success" : "inherit"} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <span>
                          <IconButton onClick={() => updateStatus(row, "CANCELED")} disabled={row.status === "CANCELED"}>
                            <CancelIcon color={row.status === "CANCELED" ? "error" : "inherit"} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="No Show">
                        <span>
                          <IconButton onClick={() => updateStatus(row, "NO_SHOW")} disabled={row.status === "NO_SHOW"}>
                            <NotInterestedIcon color={row.status === "NO_SHOW" ? "warning" : "inherit"} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}

            {loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading…</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
          onPageChange={(_e, newPage) => {
            setPage(newPage);
            fetchList(newPage, rowsPerPage);
          }}
          onRowsPerPageChange={(e) => {
            const rpp = parseInt(e.target.value, 10);
            setRowsPerPage(rpp);
            setPage(0);
            fetchList(0, rpp);
          }}
        />
      </TableContainer>

      {/* Details Drawer */}
      <Drawer
        anchor="right"
        open={drawer.open}
        onClose={() => setDrawer({ open: false, row: null })}
        PaperProps={{ sx: { width: { xs: "100%", md: 420 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Schedule Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {drawer.row ? (
            <Stack spacing={1.25}>
              <Row label="Status"><StatusChip value={drawer.row.status} /></Row>
              <Row label="Date & Time">{fmtDateTime(drawer.row.scheduleCallAt)}</Row>
              <Row label="Duration">{drawer.row.scheduleDurationMin ? `${drawer.row.scheduleDurationMin} min` : "-"}</Row>
              <Row label="Expert">{drawer.row.assignedExpert || "-"}</Row>
              <Row label="Order ID">{drawer.row.orderId || "-"}</Row>
              <Row label="Customer ID">{drawer.row.customerId || "-"}</Row>
              <Row label="Notes">
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {drawer.row.scheduleCallNotes || "-"}
                </Typography>
              </Row>
              <Divider sx={{ my: 1 }} />
              <Row label="Created">{fmtDateTime(drawer.row.createdAt)}</Row>
              <Row label="Updated">{fmtDateTime(drawer.row.updatedAt)}</Row>

              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<DoneAllIcon />}
                  onClick={() => updateStatus(drawer.row, "COMPLETED")}
                  disabled={drawer.row.status === "COMPLETED"}
                >
                  Mark Completed
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => updateStatus(drawer.row, "CANCELED")}
                  disabled={drawer.row.status === "CANCELED"}
                >
                  Cancel
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<NotInterestedIcon />}
                  onClick={() => updateStatus(drawer.row, "NO_SHOW")}
                  disabled={drawer.row.status === "NO_SHOW"}
                >
                  No Show
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2">No schedule selected.</Typography>
          )}
        </Box>
      </Drawer>

      <Snackbar
        open={toast.open}
        autoHideDuration={2200}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function Row({ label, children }) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography variant="body2" sx={{ minWidth: 130, color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {children}
      </Typography>
    </Stack>
  );
}

// src/pages/AbandonedCheckouts.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  CircularProgress,
} from "@mui/material";
import dayjs from "dayjs";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  "https://muditamleads-14f32a10d7f7.herokuapp.com";

const DATE_FILTERS = ["All time", "Custom range", "Today", "Yesterday"];

const getDateRange = (label) => {
  if (label === "All time" || label === "Custom range") return { start: "", end: "" };
  const now = dayjs();
  let start = null, end = null;
  switch (label) {
    case "Today":
      start = now.startOf("day"); end = now.endOf("day"); break;
    case "Yesterday":
      start = now.subtract(1, "day").startOf("day"); end = now.subtract(1, "day").endOf("day"); break;
    default: break;
  }
  return { start: start ? start.toISOString() : "", end: end ? end.toISOString() : "" };
};

function formatMoney(value, currency = "INR") {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value !== "number") return String(value);
  const useMinor = Number.isInteger(value) && Math.abs(value) >= 1000;
  const n = useMinor ? value / 100 : value;
  return `${currency} ${n.toFixed(2)}`;
}

// ---- NEW: robust localStorage user reader ----
function readCurrentUserFromStorage() {
  const keys = ["employee", "authUser", "user", "currentUser", "loggedInUser"];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") continue;

      // try a few common shapes
      const candidates = [
        parsed,
        parsed.user,
        parsed.employee,
        parsed.data, // sometimes JWT decode-like shapes
      ].filter(Boolean);

      for (const c of candidates) {
        const id =
          c._id || c.id || c.userId || c.userid || c.user_id || c.employeeId || c.employee_id;
        const role =
          c.role || c.userRole || c.position || (c.roles && Array.isArray(c.roles) ? c.roles[0] : undefined);
        const fullName = c.fullName || c.name || c.username || c.displayName || "";
        const email = c.email || "";

        if (id && role) {
          return { _id: String(id), role: String(role), fullName, email };
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

export default function AbandonedCheckouts() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);

  const [quickRange, setQuickRange] = useState("Today");
  const quick = useMemo(() => getDateRange(quickRange), [quickRange]);

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [savingRow, setSavingRow] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const isAgent = useMemo(() => {
    const r = (currentUser?.role || "").toLowerCase();
    return r === "sales agent" || r === "retention agent";
  }, [currentUser]);

  const [assignedFilter, setAssignedFilter] = useState("unassigned");
  const toggleAssignedFilter = () =>
    setAssignedFilter((prev) => (prev === "unassigned" ? "assigned" : "unassigned"));

  const start = quickRange === "Custom range" ? customStart : quick.start;
  const end = quickRange === "Custom range" ? customEnd : quick.end;

  // load current user once
  useEffect(() => {
    const u = readCurrentUserFromStorage();
    if (u) {
      setCurrentUser(u);
      // Agents: force to "assigned"
      const r = (u.role || "").toLowerCase();
      if (r === "sales agent" || r === "retention agent") {
        setAssignedFilter("assigned");
      }
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit,
        assigned: isAgent ? "assigned" : assignedFilter,
      };
      if (query) params.query = query;
      if (start) params.start = start;
      if (end) params.end = end;

      // Agents see only their own assigned leads
      if (isAgent && currentUser?._id) {
        params.expertId = currentUser._id;
      }

      const { data } = await axios.get(`${API_BASE}/api/abandoned`, { params });
      setRows(data.items || []);
      setCount(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/employees`);
      const filtered = (Array.isArray(data) ? data : []).filter(
        (e) =>
          String(e.status).toLowerCase() === "active" &&
          (e.role === "Sales Agent" || e.role === "Retention Agent")
      );
      filtered.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
      setEmployees(filtered);
    } catch (e) {
      console.error("Failed to load employees", e);
      setEmployees([]);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, limit, quickRange, assignedFilter, isAgent, currentUser?._id]);

  const onSearch = () => { setPage(0); fetchData(); };

  const handleAssignChange = (rowId, empId) => {
    setAssignments((prev) => ({ ...prev, [rowId]: empId }));
  };

  const onSaveAssign = async (row) => {
    const expertId = assignments[row._id] || row?.assignedExpert?._id;
    if (!expertId) return;

    try {
      setSavingRow(row._id);
      const { data } = await axios.post(`${API_BASE}/api/abandoned/${row._id}/assign-expert`, { expertId });
      const emp = employees.find((e) => e._id === expertId);
      if (emp) {
        setRows((prev) =>
          prev.map((r) =>
            r._id === row._id
              ? {
                  ...r,
                  assignedExpert: {
                    _id: emp._id,
                    fullName: emp.fullName,
                    email: emp.email,
                    role: emp.role,
                  },
                  assignedAt: data?.assignedAt || new Date().toISOString(),
                }
              : r
          )
        );
      }
    } catch (e) {
      console.error("Assign expert failed", e);
      alert("Failed to assign expert");
    } finally {
      setSavingRow(null);
    }
  };

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Abandoned Checkouts
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={fetchData} aria-label="Refresh">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
          <TextField
            label="Search (name/phone/email/order/checkout/product)"
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            sx={{ minWidth: 320 }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Range</InputLabel>
            <Select label="Range" value={quickRange} onChange={(e) => setQuickRange(e.target.value)}>
              {DATE_FILTERS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {quickRange === "Custom range" && (
            <>
              <TextField
                label="Start (ISO)"
                size="small"
                placeholder="2025-08-01T00:00:00.000Z"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                sx={{ minWidth: 280 }}
              />
              <TextField
                label="End (ISO)"
                size="small"
                placeholder="2025-08-18T23:59:59.999Z"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                sx={{ minWidth: 280 }}
              />
            </>
          )}

          <Button
            variant="contained"
            onClick={onSearch}
            startIcon={<SearchIcon />}
            sx={{ bgcolor: "#000", ":hover": { bgcolor: "#111" } }}
          >
            Search
          </Button>

          {/* Toggle only for non-agents */}
          {!isAgent && (
            <Button variant="outlined" onClick={toggleAssignedFilter}>
              {assignedFilter === "unassigned" ? "Assigned" : "Unassigned"}
            </Button>
          )}
        </Stack>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Products (Title / Variant / Qty / Final Line Price)</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Assign Expert</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const items = Array.isArray(r.items) ? r.items : [];
                  const currency = r.currency || "INR";
                  const preview = items.slice(0, 2);
                  const selectedEmpId = assignments[r._id] || r?.assignedExpert?._id || "";

                  return (
                    <TableRow key={r._id} hover>
                      <TableCell>{r.eventAt ? dayjs(r.eventAt).format("DD MMM, HH:mm") : "-"}</TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={600}>{r.customer?.name || "-"}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {r.customer?.email || "-"}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell>{r.customer?.phone || "-"}</TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          {preview.map((it, idx) => (
                            <Typography key={idx} variant="body2">
                              <b>{it.title || "-"}</b>
                              {it.variantTitle ? ` — ${it.variantTitle}` : ""} • x{it.quantity ?? 1} •{" "}
                              {formatMoney(it.finalLinePrice ?? (it.unitPrice || 0) * (it.quantity ?? 1), currency)}
                            </Typography>
                          ))}
                        </Stack>
                      </TableCell>

                      <TableCell>{formatMoney(r.total, currency)}</TableCell>

                      <TableCell>
                        <FormControl size="small" fullWidth sx={{ minWidth: 220 }}>
                          <InputLabel>Expert</InputLabel>
                          <Select
                            label="Expert"
                            value={selectedEmpId}
                            onChange={(e) => handleAssignChange(r._id, e.target.value)}
                          >
                            {employees.map((emp) => (
                              <MenuItem key={emp._id} value={emp._id}>
                                {emp.fullName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => onSaveAssign(r)}
                          disabled={!selectedEmpId || savingRow === r._id}
                          sx={{ bgcolor: "#000", ":hover": { bgcolor: "#111" } }}
                        >
                          {savingRow === r._id ? "Saving..." : "Save"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={count}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => {
            setLimit(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Paper>
    </Box>
  );
}

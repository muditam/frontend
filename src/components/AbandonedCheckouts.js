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

// Read current user from SESSION (your login saves to sessionStorage)
function readCurrentUser() {
  try {
    const raw = sessionStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    const cands = [u, u.user, u.employee, u.data].filter(Boolean);
    for (const c of cands) {
      const id = c?._id || c?.id || c?.userId || c?.employeeId;
      const role = c?.role || c?.userRole;
      const email = c?.email || "";
      const fullName = c?.fullName || c?.name || "";
      if (role) return { _id: id ? String(id) : undefined, role: String(role), email, fullName };
    }
  } catch {}
  return null;
}

function isSalesOrRetention(role) {
  const r = String(role || "").toLowerCase().replace(/[\s_]/g, "");
  return r === "salesagent" || r === "retentionagent";
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
  const [userResolved, setUserResolved] = useState(false); // NEW: gate initial fetch
  const isAgent = useMemo(() => isSalesOrRetention(currentUser?.role), [currentUser]);

  // Resolve logged-in user's Employee _id (by email/fullName)
  const [agentEmployeeId, setAgentEmployeeId] = useState(
    () => sessionStorage.getItem("agentEmployeeId") || null // NEW: cache restore
  );

  // Admins can toggle; agents are forced to "assigned"
  const [assignedFilter, setAssignedFilter] = useState("unassigned");
  const effectiveAssigned = isAgent ? "assigned" : assignedFilter; // NEW: derived
  const toggleAssignedFilter = () =>
    setAssignedFilter((prev) => (prev === "unassigned" ? "assigned" : "unassigned"));

  const start = quickRange === "Custom range" ? customStart : quick.start;
  const end = quickRange === "Custom range" ? customEnd : quick.end;

  // Load current user (SESSION) and mark resolved
  useEffect(() => {
    const u = readCurrentUser();
    if (u) {
      setCurrentUser(u);
      if (isSalesOrRetention(u.role)) setAssignedFilter("assigned");
    }
    setUserResolved(true); // mark that we've attempted read
  }, []);

  // Load employees (active Sales/Retention)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/employees`);
        const filtered = (Array.isArray(data) ? data : []).filter(
          (e) =>
            String(e.status).toLowerCase() === "active" &&
            (e.role === "Sales Agent" || e.role === "Retention Agent")
        );
        filtered.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
        setEmployees(filtered);
      } catch {
        setEmployees([]);
      }
    })();
  }, []);

  // Resolve this agent's Employee _id (and cache it)
  useEffect(() => {
    if (!isAgent || !employees.length || agentEmployeeId) return;
    let resolved = null;

    if (currentUser?.email) {
      resolved = employees.find(
        (e) => (e.email || "").toLowerCase() === currentUser.email.toLowerCase()
      )?._id;
    }
    if (!resolved && currentUser?.fullName) {
      resolved = employees.find(
        (e) => (e.fullName || "").toLowerCase() === currentUser.fullName.toLowerCase()
      )?._id;
    }

    if (resolved) {
      setAgentEmployeeId(resolved);
      sessionStorage.setItem("agentEmployeeId", String(resolved)); // NEW: cache
    }
  }, [isAgent, employees, currentUser, agentEmployeeId]);

  // Only fetch when we're ready:
  const readyToFetch = useMemo(() => {
    if (!userResolved) return false;
    if (!isAgent) return true;
    return Boolean(agentEmployeeId || currentUser?.email);
  }, [userResolved, isAgent, agentEmployeeId, currentUser?.email]);

  const fetchData = async () => {
    if (!readyToFetch) return; // guard against premature calls
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit,
        assigned: effectiveAssigned,
      };
      if (query) params.query = query;
      if (start) params.start = start;
      if (end) params.end = end;

      // Agents: restrict to their own leads (strong id filter; fallback to email)
      if (isAgent) {
        if (agentEmployeeId) {
          params.expertId = agentEmployeeId;
        } else if (currentUser?.email) {
          params.expertEmail = currentUser.email;
        }
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

  // Fetch on param changes, but only when ready
  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    readyToFetch,
    page,
    limit,
    quickRange,
    effectiveAssigned, // use derived value
    currentUser?.email,
    agentEmployeeId,
  ]);

  const onSearch = () => { setPage(0); fetchData(); };

  const onSaveAssign = async (row) => {
    const expertId = assignments[row._id] || row?.assignedExpert?._id;
    if (!expertId) return;
    try {
      setSavingRow(row._id);
      const { data } = await axios.post(
        `${API_BASE}/api/abandoned/${row._id}/assign-expert`,
        { expertId }
      );
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
      alert("Failed to assign expert");
    } finally {
      setSavingRow(null);
    }
  };

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>Abandoned Checkouts</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={fetchData} aria-label="Refresh"><RefreshIcon /></IconButton>
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
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
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

          {/* Hide Assigned/Unassigned toggle for agents */}
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
                <TableCell>State</TableCell>
                <TableCell>Assign Expert</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center">No data</TableCell></TableRow>
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
                          <Typography variant="body2" color="text.secondary">{r.customer?.email || "-"}</Typography>
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
                        {r.customer?.state || "-"} 
                      </TableCell>

                      <TableCell>
                        <FormControl size="small" fullWidth sx={{ minWidth: 220 }}>
                          <InputLabel>Expert</InputLabel>
                          <Select
                            label="Expert"
                            value={selectedEmpId}
                            onChange={(e) => setAssignments((p) => ({ ...p, [r._id]: e.target.value }))}
                          >
                            {employees.map((emp) => (
                              <MenuItem key={emp._id} value={emp._id}>{emp.fullName}</MenuItem>
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

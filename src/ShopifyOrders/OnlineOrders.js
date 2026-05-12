// src/components/ShopifyOrdersTable.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  Tooltip,
  Button,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  Snackbar,
  Alert as MuiAlert,
  FormControl,
  InputLabel,
  TextField,
  Stack,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const PRODUCT_ABBREV = {
  "Karela Jamun Fizz": "KJF",
  "Sugar Defend Pro": "SDP",
  "Vasant Kusmakar Ras": "VKR",
  "Liver Fix": "L-Fx",
  "Stress & Sleep": "S&S",
  "Chandraprabha Vati": "CPV",
  "Heart Defend Pro": "HDP",
  "Performance Forever": "PF",
  "Power Gut": "PGut",
  "Shilajit with Gold": "Shilajit",
  "Diabetes Management Kit": "Kit",
  "Core Essentials": "CE",
  "Omega Fuel": "OF",
  "Nerve Fix": "NF",
};
const PRODUCT_ABBREV_NORM = Object.fromEntries(
  Object.entries(PRODUCT_ABBREV).map(([k, v]) => [k.toLowerCase().trim().replace(/\s+/g, " "), v])
);
function normalizeTitle(t = "") {
  return String(t).toLowerCase().trim().replace(/\s+/g, " ");
}
function titleToCode(title) {
  if (PRODUCT_ABBREV[title]) return PRODUCT_ABBREV[title];
  const key = normalizeTitle(title);
  if (PRODUCT_ABBREV_NORM[key]) return PRODUCT_ABBREV_NORM[key];
  const letters = key
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return letters || key.toUpperCase();
}

function shipmentColor(status) {
  const s = (status || "").toLowerCase();

  if (!s || s === "-" || s === "—") return "default";

  if (s.includes("undelivered") || s.includes("failed")) return "error";
  if (s.includes("cancel")) return "error";
  if (s.includes("rto")) return "warning";

  if (s.includes("in transit") || s.includes("ofd") || s.includes("out for")) {
    return "info";
  }

  if (s === "delivered" || s.endsWith(" delivered")) {
    return "success";
  }

  return "default";
}


function sanitizeHE(s) {
  return String(s || "").replace(/"/g, "").trim();
}

const TruncCell = ({ children, maxWidth = 260, align = "left" }) => (
  <TableCell align={align} sx={{ maxWidth, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
    <Tooltip title={children || ""} placement="top" arrow disableInteractive>
      <span>{children || "—"}</span>
    </Tooltip>
  </TableCell>
);

export default function ShopifyOrdersTable() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState("");

  const [agents, setAgents] = useState([]);
  const [savingIndex, setSavingIndex] = useState(-1);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [assigned, setAssigned] = useState("");

  // Meta options
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [availableStates, setAvailableStates] = useState([]);
  const [availableModes, setAvailableModes] = useState([]);

  const [hasFetched, setHasFetched] = useState(false);

  const controllerRef = useRef(null);

  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }),
    []
  );

  // Abort any inflight request
  const abortInflight = useCallback(() => {
    if (controllerRef.current) {
      try {
        controllerRef.current.abort();
      } catch { }
      controllerRef.current = null;
    }
  }, []);

  // Build query params for main fetch
  const buildParams = useCallback(
    (p, l, opts = {}) => {
      const params = { page: p + 1, limit: l, ...opts };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (status) params.status = status;
      if (stateFilter) params.state = stateFilter;
      if (modeFilter) params.mode = modeFilter;
      if (assigned) params.assigned = assigned;
      return params;
    },
    [startDate, endDate, status, stateFilter, modeFilter, assigned]
  );

  // Initial: load agents and initial META only (fast)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/employees", {
          params: { role: "Retention Agent" },
        });
        const active = Array.isArray(data) ? data.filter((a) => a?.status === "active") : [];
        setAgents(active);
      } catch (e) {
        // agent list failure shouldn't block table
        console.error("Failed to fetch agents", e);
      }

      // Initial meta (shipment statuses, states, modes) with onlyMeta=1 (no rows)
      try {
        const { data: meta } = await api.get("/api/shopify/orders-table", {
          params: { onlyMeta: 1, page: 1, limit: 1 },
        });
        setAvailableStatuses(Array.isArray(meta?.statuses) ? meta.statuses : []);
        setAvailableStates(Array.isArray(meta?.states) ? meta.states : []);
        setAvailableModes(Array.isArray(meta?.modes) ? meta.modes : []);
      } catch (e) {
        console.error("Failed to fetch initial meta", e);
      }
    })();

    return abortInflight;
  }, [abortInflight]);

  // Fetch rows (+ meta tied to filters) when user clicks "Get Orders" or changes page/size after first fetch
  const fetchRows = useCallback(
    async (p = page, l = rowsPerPage, withMeta = false) => {
      abortInflight();
      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      setErr("");
      try {
        const params = buildParams(p, l, { withMeta: withMeta ? 1 : 0 });
        const { data } = await api.get("/api/shopify/orders-table", {
          params,
          signal: controller.signal,
        });

        setRows(data?.data || []);
        setTotal(data?.total || 0);

        if (withMeta) {
          // When withMeta=1, backend returns meta aligned to filters (incl. status/assigned)
          setAvailableStatuses(Array.isArray(data?.statuses) ? data.statuses : []);
          setAvailableStates(Array.isArray(data?.states) ? data.states : []);
          setAvailableModes(Array.isArray(data?.modes) ? data.modes : []);
        }
      } catch (e) {
        if (axios.isCancel?.(e) || e?.name === "CanceledError" || e?.message === "canceled") {
          // ignore
        } else {
          console.error(e);
          setErr("Failed to load orders. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [abortInflight, buildParams, page, rowsPerPage]
  );

  // After first fetch, page/rowsPerPage change should refetch rows
  useEffect(() => {
    if (hasFetched) {
      fetchRows(page, rowsPerPage, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, hasFetched]);

  const handleGetOrders = () => {
    setHasFetched(true);
    setPage(0);
    fetchRows(0, rowsPerPage, true); // fetch rows + meta aligned to current filters
  };

  const handleChangePage = (_e, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // Save Health Expert (optimistic UI)
  const persistHealthExpert = async (row, value) => {
    await api.post("/api/leads/assign-health-expert", {
      orderName: row.orderId,
      contactNumber: row.contactNumber,
      healthExpertAssigned: value,
    });
  };

  const handleChangeHealthExpert = async (rowIndex, value) => {
    const prev = rows[rowIndex]?.healthExpertAssigned || "";
    setRows((old) => {
      const copy = [...old];
      copy[rowIndex] = { ...copy[rowIndex], healthExpertAssigned: value };
      return copy;
    });

    try {
      setSavingIndex(rowIndex);
      await persistHealthExpert(rows[rowIndex], value);
      setSnack({ open: true, msg: "Health Expert saved", severity: "success" });
    } catch (e) {
      console.error("Save health expert failed", e);
      setRows((old) => {
        const copy = [...old];
        copy[rowIndex] = { ...copy[rowIndex], healthExpertAssigned: prev };
        return copy;
      });
      setSnack({ open: true, msg: e?.message || "Failed to save", severity: "error" });
    } finally {
      setSavingIndex(-1);
    }
  };

  // Optional: refresh META only for current base filters (no rows)
  const refreshMetaOnly = async () => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (stateFilter) params.state = stateFilter;
      if (modeFilter) params.mode = modeFilter;
      const { data: meta } = await api.get("/api/shopify/orders-table", {
        params: { onlyMeta: 1, page: 1, limit: 1, ...params },
      });
      setAvailableStatuses(Array.isArray(meta?.statuses) ? meta.statuses : []);
      setAvailableStates(Array.isArray(meta?.states) ? meta.states : []);
      setAvailableModes(Array.isArray(meta?.modes) ? meta.modes : []);
    } catch (e) {
      console.error("Failed to refresh meta", e);
    }
  };

  const handleSyncNew = async () => {
    try {
      setSyncing(true);
      const { data } = await api.get("/api/orders-shopify/sync-new");
      setSnack({
        open: true,
        msg: data?.message || "Shopify sync completed.",
        severity: "success",
      });

      if (hasFetched) {
        await fetchRows(page, rowsPerPage, true);
      } else {
        await refreshMetaOnly();
      }
    } catch (e) {
      console.error("Sync new orders failed", e);
      setSnack({
        open: true,
        msg:
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Failed to sync Shopify orders.",
        severity: "error",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={1} sx={{ p: 2 }}>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="shipment-status-label">Shipment Status</InputLabel>
                <Select
                  labelId="shipment-status-label"
                  label="Shipment Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {availableStatuses.map((s) => (
                    <MenuItem key={s.status || "-"} value={s.status || "-"}>
                      {s.status || "-"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="state-filter-label">State</InputLabel>
                <Select
                  labelId="state-filter-label"
                  label="State"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {availableStates.map((s) => (
                    <MenuItem key={s.state || "-"} value={s.state || "-"}>
                      {s.state || "-"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="mode-filter-label">Mode of Payment</InputLabel>
                <Select
                  labelId="mode-filter-label"
                  label="Mode of Payment"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {availableModes.map((m) => (
                    <MenuItem key={m.mode || "-"} value={m.mode || "-"}>
                      {m.mode || "-"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="assigned-filter-label">Assigned</InputLabel>
                <Select
                  labelId="assigned-filter-label"
                  label="Assigned"
                  value={assigned}
                  onChange={(e) => setAssigned(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  <MenuItem value="assigned">Assigned</MenuItem>
                  <MenuItem value="unassigned">Unassigned</MenuItem>
                </Select>
              </FormControl>

              <Stack direction="row" spacing={1}>
                <Button
                  onClick={handleGetOrders}
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  disabled={loading || syncing}
                >
                  Get Orders
                </Button>

                <Button
                  onClick={refreshMetaOnly}
                  variant="text"
                  disabled={loading || syncing}
                  title="Refresh available filters (fast)"
                >
                  Refresh Filters
                </Button>
              </Stack>
            </Stack>

            <Button
              onClick={handleSyncNew}
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={16} /> : <RefreshIcon />}
              disabled={syncing || loading}
              sx={{ alignSelf: "flex-start" }}
            >
              {syncing ? "Syncing..." : "Sync"}
            </Button>
          </Stack>
        </Stack>

        {err && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {err}
          </Alert>
        )}

        {!hasFetched ? (
          <Typography variant="body2" color="text.secondary">
            Set your filters above and click <strong>Get Orders</strong> to load results.
          </Typography>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Order ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Contact Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Order Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Mode of Payment</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Products Ordered</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Expert Assigned</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Health Expert Assigned</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Channel Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>State</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Shipment Status</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading && rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No orders found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r, idx) => (
                      <TableRow key={r.orderId}>
                        <TruncCell maxWidth={120}>{r.orderId}</TruncCell>
                        <TruncCell maxWidth={180}>{r.name}</TruncCell>
                        <TruncCell maxWidth={140}>{r.contactNumber}</TruncCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {r.orderDate ? dayjs(r.orderDate).format("DD MMM YYYY") : "—"}
                        </TableCell>
                        <TableCell align="right">
                          {typeof r.amount === "number" ? currencyFmt.format(r.amount) : "—"}
                        </TableCell>
                        <TableCell>
                          {r.modeOfPayment ? <Chip size="small" label={r.modeOfPayment} variant="outlined" /> : "—"}
                        </TableCell>
                        <TruncCell maxWidth={360}>
                          {Array.isArray(r.lineItemTitles) ? r.lineItemTitles.map(titleToCode).join(", ") : "—"}
                        </TruncCell>
                        <TruncCell maxWidth={160}>{r.agentAssigned}</TruncCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Select
                            value={sanitizeHE(r.healthExpertAssigned) || ""}
                            onChange={(e) => handleChangeHealthExpert(idx, e.target.value)}
                            displayEmpty
                            fullWidth
                            size="small"
                            disabled={savingIndex === idx}
                            renderValue={(v) => (v ? v : <em>—</em>)}
                          >
                            <MenuItem value="">
                              <em>—</em>
                            </MenuItem>
                            {agents.map((agent) => (
                              <MenuItem key={agent._id} value={agent.fullName}>
                                {agent.fullName}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TruncCell maxWidth={140}>{r.channelName}</TruncCell>
                        <TruncCell maxWidth={120}>{r.state}</TruncCell>
                        <TableCell>
                          {r.shipmentStatus ? (
                            <Chip
                              size="small"
                              color={shipmentColor(r.shipmentStatus)}
                              label={r.shipmentStatus}
                              variant="filled"
                            />
                          ) : (
                            <Chip size="small" variant="outlined" label="—" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[25, 50, 100, 200]}
              />
              {loading && rows.length > 0 && (
                <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="caption" color="text.secondary">
                    Loading…
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}

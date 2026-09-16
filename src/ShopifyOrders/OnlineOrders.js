// src/components/ShopifyOrdersTable.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
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
  Skeleton,
  LinearProgress,
  Checkbox,
  ListItemText,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";

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

function cleanOption(value) {
  const text = String(value || "").trim();
  return text && text !== "—" ? text : "";
}

function mergeCountOptions(existing, rowsToRead, rowKey, optionKey) {
  const counts = new Map();

  (Array.isArray(existing) ? existing : []).forEach((item) => {
    const value = cleanOption(item?.[optionKey]);
    if (!value) return;
    counts.set(value, Number(item?.count || 0));
  });

  (Array.isArray(rowsToRead) ? rowsToRead : []).forEach((row) => {
    const value = cleanOption(row?.[rowKey]);
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ [optionKey]: value, count }))
    .sort((a, b) => String(a[optionKey]).localeCompare(String(b[optionKey])));
}

function mergeOptionLists(current, incoming, optionKey) {
  const counts = new Map();

  (Array.isArray(current) ? current : []).forEach((item) => {
    const value = cleanOption(item?.[optionKey]);
    if (!value) return;
    counts.set(value, Number(item?.count || 0));
  });

  (Array.isArray(incoming) ? incoming : []).forEach((item) => {
    const value = cleanOption(item?.[optionKey]);
    if (!value) return;
    counts.set(value, Math.max(counts.get(value) || 0, Number(item?.count || 0)));
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ [optionKey]: value, count }))
    .sort((a, b) => String(a[optionKey]).localeCompare(String(b[optionKey])));
}

function inputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function presetDates(preset) {
  const today = new Date(`${todayInIndia()}T00:00:00`);
  const start = new Date(today);
  const end = new Date(today);
  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  }
  if (preset === "7d") start.setDate(start.getDate() - 6);
  if (preset === "15d") start.setDate(start.getDate() - 14);
  if (preset === "lastMonth") start.setDate(start.getDate() - 29);
  return [inputDate(start), inputDate(end)];
}

function displayDate(value) {
  if (!value) return "Select date";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function displayDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function displayOrderDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function triggerSummary(from, to) {
  if (!from && !to) return "All dates";
  const today = todayInIndia();
  const [yesterdayFrom, yesterdayTo] = presetDates("yesterday");
  const [lastSevenFrom, lastSevenTo] = presetDates("7d");
  if (from === today && to === today) return "Today";
  if (from === yesterdayFrom && to === yesterdayTo) return "Yesterday";
  if (from === lastSevenFrom && to === lastSevenTo) return "Last 7 days";
  if (from && from === to) return displayDate(from);
  return `${displayDate(from)} - ${displayDate(to)}`;
}

function selectedPreset(from, to) {
  if (!from && !to) return "all";
  const today = todayInIndia();
  const [yesterdayFrom, yesterdayTo] = presetDates("yesterday");
  const [lastSevenFrom, lastSevenTo] = presetDates("7d");
  const [lastFifteenFrom, lastFifteenTo] = presetDates("15d");
  const [lastMonthFrom, lastMonthTo] = presetDates("lastMonth");
  if (from === today && to === today) return "today";
  if (from === yesterdayFrom && to === yesterdayTo) return "yesterday";
  if (from === lastSevenFrom && to === lastSevenTo) return "7d";
  if (from === lastFifteenFrom && to === lastFifteenTo) return "15d";
  if (from === lastMonthFrom && to === lastMonthTo) return "lastMonth";
  return "custom";
}

const datePresets = [
  ["all", "All dates"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"],
  ["15d", "Last 15 days"],
  ["lastMonth", "Last month"],
  ["custom", "Range"],
];

const paymentModeOptions = [
  { value: "prepaid", label: "Prepaid" },
  { value: "partial_paid", label: "Partial Paid" },
  { value: "cod", label: "COD" },
];

function paymentModeLabel(value) {
  return paymentModeOptions.find((option) => option.value === value)?.label || "All";
}

function paymentCategory(value) {
  const text = String(value || "").toLowerCase();
  if (!text) return "";
  if (/(partial|partially|part paid|partial_paid|partially_paid)/i.test(text)) return "Partial Paid";
  if (/(cod|cash on delivery|cash_on_delivery)/i.test(text)) return "COD";
  return "Prepaid";
}

function lastSevenDaysInIndia() {
  const [from, to] = presetDates("7d");
  return { from, to };
}

function DateRangeFilter({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [selected, setSelected] = useState(selectedPreset(from, to));
  const rootRef = useRef(null);

  useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
    setSelected(selectedPreset(from, to));
  }, [from, to]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const choosePreset = (preset) => {
    setSelected(preset);
    if (preset === "all") {
      setDraftFrom("");
      setDraftTo("");
      onChange("", "");
      setOpen(false);
      return;
    }
    if (preset === "custom") return;
    const [nextFrom, nextTo] = presetDates(preset);
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    onChange(nextFrom, nextTo);
    setOpen(false);
  };

  const applyRange = () => {
    if (!draftFrom || !draftTo) return;
    if (draftTo < draftFrom) onChange(draftTo, draftFrom);
    else onChange(draftFrom, draftTo);
    setOpen(false);
  };

  return (
    <Box ref={rootRef} sx={{ position: "relative", width: { xs: "100%", sm: 152 }, zIndex: 10 }}>
      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        sx={{
          width: "100%",
          height: 34,
          justifyContent: "space-between",
          px: 1.25,
          border: "1px solid #cbd5e1",
          borderRadius: 1.25,
          bgcolor: "#fff",
          color: "#0f172a",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "none",
          "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
        }}
      >
        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Box
            component="span"
            sx={{
              position: "relative",
              width: 15,
              height: 14,
              flex: "0 0 auto",
              border: "1.5px solid #64748b",
              borderRadius: "3px",
              "&:before": {
                content: '""',
                position: "absolute",
                top: 3,
                left: 0,
                right: 0,
                height: "1.5px",
                bgcolor: "#64748b",
              },
            }}
          />
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {triggerSummary(from, to)}
          </Box>
        </Box>
        <Box component="span" sx={{ color: "#64748b", fontSize: 12 }}>
          ▾
        </Box>
      </Button>

      {open && (
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: { xs: "min(92vw, 360px)", sm: 430 },
            display: "grid",
            gridTemplateColumns: { xs: "112px 1fr", sm: "126px 1fr" },
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            borderRadius: 2,
            boxShadow: "0 18px 55px rgba(15, 23, 42, 0.18)",
          }}
        >
          <Box sx={{ py: 1, borderRight: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
            {datePresets.map(([value, label]) => (
              <Button
                key={value}
                fullWidth
                onClick={() => choosePreset(value)}
                sx={{
                  justifyContent: "flex-start",
                  height: 34,
                  px: 1.5,
                  borderRadius: 0,
                  color: selected === value ? "#0f172a" : "#64748b",
                  bgcolor: selected === value ? "#e2e8f0" : "transparent",
                  fontSize: 11,
                  fontWeight: selected === value ? 800 : 700,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#e2e8f0" },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ color: "#0f172a", fontSize: 13, fontWeight: 800 }}>
              {draftFrom && draftTo ? triggerSummary(draftFrom, draftTo) : "Choose date range"}
            </Typography>
            <Typography sx={{ mt: 0.25, color: "#64748b", fontSize: 11 }}>India Standard Time</Typography>
            <Stack spacing={1.25} sx={{ mt: 2 }}>
              <TextField
                label="From"
                type="date"
                value={draftFrom}
                onChange={(event) => {
                  setSelected("custom");
                  setDraftFrom(event.target.value);
                }}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="To"
                type="date"
                value={draftTo}
                onChange={(event) => {
                  setSelected("custom");
                  setDraftTo(event.target.value);
                }}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ mt: 2 }}>
              <Button
                onClick={() => choosePreset("all")}
                sx={{ color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "none" }}
              >
                Clear
              </Button>
              <Stack direction="row" spacing={1}>
                <Button
                  onClick={() => setOpen(false)}
                  sx={{ color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "none" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={applyRange}
                  disabled={!draftFrom || !draftTo}
                  sx={{
                    bgcolor: "#0f172a",
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "none",
                    "&:hover": { bgcolor: "#1e293b" },
                  }}
                >
                  Apply
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      )}
    </Box>
  );
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

const tableColumns = [
  "Order ID",
  "Name",
  "Contact Number",
  "Order Date",
  "Amount",
  "Mode of Payment",
  "Products Ordered",
  "Expert Assigned",
  "Health Expert Assigned",
  "Channel Name",
  "State",
  "Shipment Status",
];

const tableHeadCellSx = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0,
  color: "#475569",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const filterControlSx = {
  width: { xs: "100%", sm: 132 },
  "& .MuiInputBase-root": {
    height: 34,
    borderRadius: 1.25,
    backgroundColor: "#fff",
    fontSize: 12,
  },
  "& .MuiInputLabel-root": {
    fontSize: 11,
    color: "#64748b",
  },
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    py: 0,
    minHeight: "unset",
  },
};

const wideFilterControlSx = {
  ...filterControlSx,
  width: { xs: "100%", sm: 156 },
};

const actionButtonSx = {
  height: 34,
  px: 1.35,
  borderRadius: 1.25,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "none",
  whiteSpace: "nowrap",
};

const syncTextSx = {
  display: "flex",
  alignItems: "baseline",
  gap: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
};

function MosaicTableSkeleton({ rows = 8 }) {
  return (
    <Box
      role="status"
      aria-label="Loading orders"
      sx={{ p: { xs: 1.25, md: 2 }, width: "100%", maxWidth: "100%", boxSizing: "border-box", overflow: "hidden" }}
    >
      <Box
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 2,
          overflow: "hidden",
          background: "#fff",
          width: "100%",
        }}
      >
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Box
            key={rowIndex}
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(4, minmax(0, 1fr))",
                md: "0.7fr 1.1fr 0.9fr 0.85fr 0.75fr 0.9fr 1.4fr 1fr 1.2fr 0.8fr 0.7fr 1.35fr",
              },
              gap: { xs: 1.25, md: 2 },
              alignItems: "center",
              px: { xs: 1.25, md: 2 },
              py: 1.6,
              borderTop: rowIndex === 0 ? 0 : "1px solid #f1f5f9",
            }}
          >
            {tableColumns.map((column, cellIndex) => (
              <Skeleton
                key={`${column}-${cellIndex}`}
                variant={cellIndex === 5 || cellIndex === 11 ? "rounded" : "text"}
                height={cellIndex === 5 || cellIndex === 11 ? 24 : 18}
                width={cellIndex === 6 ? "90%" : cellIndex === 8 ? "82%" : cellIndex % 3 === 0 ? "62%" : "76%"}
                sx={{
                  borderRadius: cellIndex === 5 || cellIndex === 11 ? 12 : 1,
                  bgcolor: rowIndex % 2 === 0 ? "#e9eef5" : "#eef2f7",
                }}
              />
            ))}
          </Box>
        ))}
      </Box>
      <Box sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Loading
      </Box>
    </Box>
  );
}

export default function ShopifyOrdersTable() {
  const defaultDateRange = useMemo(() => lastSevenDaysInIndia(), []);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState("");
  const [syncMeta, setSyncMeta] = useState(null);

  const [agents, setAgents] = useState([]);
  const [savingIndex, setSavingIndex] = useState(-1);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  // Filters
  const [startDate, setStartDate] = useState(defaultDateRange.from);
  const [endDate, setEndDate] = useState(defaultDateRange.to);
  const [status, setStatus] = useState("");
  const [stateFilter, setStateFilter] = useState([]);
  const [modeFilter, setModeFilter] = useState("");
  const [assigned, setAssigned] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    status: "",
    state: [],
    mode: "",
    assigned: "",
  });

  // Meta options
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [availableStates, setAvailableStates] = useState([]);

  const [hasFetched, setHasFetched] = useState(false);
  const skeletonRows = Math.min(Math.max(rowsPerPage, 12), 20);

  const controllerRef = useRef(null);
  const initialLoadRef = useRef(false);
  const tableRegionRef = useRef(null);

  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }),
    []
  );

  const filtersDirty = useMemo(() => {
    const stateKey = (stateFilter || []).slice().sort().join("|");
    const appliedStateKey = (appliedFilters.state || []).slice().sort().join("|");
    return (
      status !== appliedFilters.status ||
      stateKey !== appliedStateKey ||
      modeFilter !== appliedFilters.mode ||
      assigned !== appliedFilters.assigned
    );
  }, [appliedFilters, assigned, modeFilter, stateFilter, status]);

  const applyFilterOptions = useCallback((meta, rowsToMerge = []) => {
    const nextStatuses = mergeCountOptions(meta?.statuses, rowsToMerge, "shipmentStatus", "status");
    const nextStates = mergeCountOptions(meta?.states, rowsToMerge, "state", "state");

    setAvailableStatuses((prev) => (nextStatuses.length ? mergeOptionLists(prev, nextStatuses, "status") : prev));
    setAvailableStates((prev) => (nextStates.length ? mergeOptionLists(prev, nextStates, "state") : prev));
  }, []);

  const loadGlobalFilterOptions = useCallback(async (rowsToMerge = []) => {
    const { data: meta } = await api.get("/api/shopify/orders-table", {
      params: { onlyMeta: 1, page: 1, limit: 1 },
    });
    applyFilterOptions(meta, rowsToMerge);
  }, [applyFilterOptions]);

  const loadSyncMeta = useCallback(async () => {
    try {
      const { data } = await api.get("/api/shopify/orders-table/meta");
      setSyncMeta(data || null);
    } catch (e) {
      console.error("Failed to fetch online orders sync metadata", e);
    }
  }, []);

  // Abort any inflight request
  const abortInflight = useCallback(() => {
    if (controllerRef.current) {
      try {
        controllerRef.current.abort();
      } catch { }
      controllerRef.current = null;
    }
  }, []);

  const scrollToTable = useCallback(() => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      tableRegionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, []);

  // Build query params for main fetch
  const buildParams = useCallback(
    (p, l, opts = {}) => {
      const hasOpt = (key) => Object.prototype.hasOwnProperty.call(opts, key);
      const nextStartDate = hasOpt("startDate") ? opts.startDate : startDate;
      const nextEndDate = hasOpt("endDate") ? opts.endDate : endDate;
      const nextStatus = hasOpt("status") ? opts.status : appliedFilters.status;
      const nextState = hasOpt("state") ? opts.state : appliedFilters.state;
      const nextMode = hasOpt("mode") ? opts.mode : appliedFilters.mode;
      const nextAssigned = hasOpt("assigned") ? opts.assigned : appliedFilters.assigned;
      const params = { page: p + 1, limit: l, withMeta: opts.withMeta };
      if (nextStartDate) params.startDate = nextStartDate;
      if (nextEndDate) params.endDate = nextEndDate;
      if (nextStatus) params.status = nextStatus;
      if (Array.isArray(nextState) ? nextState.length : nextState) {
        params.state = Array.isArray(nextState) ? nextState.join(",") : nextState;
      }
      if (nextMode) params.mode = nextMode;
      if (nextAssigned) params.assigned = nextAssigned;
      return params;
    },
    [appliedFilters, startDate, endDate]
  );

  // Initial: load agents and global filter options. Options should not disappear
  // just because the current date range has no local rows.
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

      try {
        await loadGlobalFilterOptions();
      } catch (e) {
        console.error("Failed to fetch filter options", e);
      }

      await loadSyncMeta();
    })();

    return abortInflight;
  }, [abortInflight, loadGlobalFilterOptions, loadSyncMeta]);

  // Fetch rows (+ meta tied to filters) when user clicks "Get Orders" or changes page/size after first fetch
  const fetchRows = useCallback(
    async (p = page, l = rowsPerPage, withMeta = false, filterOverrides = {}) => {
      abortInflight();
      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      setErr("");
      try {
        const params = buildParams(p, l, { ...filterOverrides, withMeta: withMeta ? 1 : 0 });
        const { data } = await api.get("/api/shopify/orders-table", {
          params,
          signal: controller.signal,
        });

        const nextRows = data?.data || [];
        setRows(nextRows);
        setTotal(data?.total || 0);

        if (withMeta) {
          // When withMeta=1, backend returns meta aligned to filters (incl. status/assigned)
          applyFilterOptions(data, nextRows);
        } else {
          applyFilterOptions(null, nextRows);
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
    [abortInflight, applyFilterOptions, buildParams, page, rowsPerPage]
  );

  // After first fetch, page/rowsPerPage change should refetch rows
  useEffect(() => {
    if (hasFetched) {
      fetchRows(page, rowsPerPage, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, hasFetched]);

  // Load latest orders by default. Filters still apply only when the user submits them.
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    setHasFetched(true);
    fetchRows(0, rowsPerPage, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetOrders = () => {
    const nextAppliedFilters = {
      status,
      state: stateFilter,
      mode: modeFilter,
      assigned,
    };
    scrollToTable();
    setHasFetched(true);
    setPage(0);
    setAppliedFilters(nextAppliedFilters);
    fetchRows(0, rowsPerPage, false, nextAppliedFilters);
  };

  const handleDateRangeChange = (from, to) => {
    scrollToTable();
    setStartDate(from);
    setEndDate(to);
    setHasFetched(true);
    setPage(0);
    fetchRows(0, rowsPerPage, false, {
      startDate: from,
      endDate: to,
    });
  };

  const handleClearFilters = () => {
    scrollToTable();
    setStartDate(defaultDateRange.from);
    setEndDate(defaultDateRange.to);
    setStatus("");
    setStateFilter([]);
    setModeFilter("");
    setAssigned("");
    setAppliedFilters({
      status: "",
      state: [],
      mode: "",
      assigned: "",
    });
    setHasFetched(true);
    setPage(0);
    fetchRows(0, rowsPerPage, false, {
      startDate: defaultDateRange.from,
      endDate: defaultDateRange.to,
      status: "",
      state: [],
      mode: "",
      assigned: "",
    });
  };

  const handleChangePage = (_e, newPage) => {
    scrollToTable();
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e) => {
    scrollToTable();
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
      await loadGlobalFilterOptions(rows);
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
      await loadSyncMeta();
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

  const shopifySyncedAt = syncMeta?.shopify?.lastSyncedAt || null;
  const shipmentSyncedAt = syncMeta?.shipment?.lastSyncedAt || null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        p: { xs: 1.5, md: 3 },
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          overflow: "hidden",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          border: "1px solid #e2e8f0",
          borderRadius: 2,
          background: "#fff",
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 2.25,
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 72%, #edf7f2 100%)",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2.5}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: 0 }}>
                Online Orders
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: "#64748b" }}>
                Latest Shopify orders with shipment status enriched from Shiptrack where available.
              </Typography>
            </Box>
            <Stack
              spacing={1.1}
              alignItems={{ xs: "flex-start", md: "flex-end" }}
              sx={{ minWidth: { md: 430 }, maxWidth: "100%" }}
            >
              <Stack spacing={0.55} alignItems={{ xs: "flex-start", md: "flex-end" }} sx={{ maxWidth: "100%" }}>
                <Box sx={syncTextSx}>
                  <Typography component="span" sx={{ color: "#6b7280", fontSize: 13, fontWeight: 500 }}>
                    Shopify synced
                  </Typography>
                  <Typography component="span" sx={{ color: "#111827", fontSize: 14, fontWeight: 800 }}>
                    {displayDateTime(shopifySyncedAt)}
                  </Typography>
                </Box>
                <Box sx={syncTextSx}>
                  <Typography component="span" sx={{ color: "#6b7280", fontSize: 13, fontWeight: 500 }}>
                    Delivery partners synced
                  </Typography>
                  <Typography component="span" sx={{ color: "#111827", fontSize: 14, fontWeight: 800 }}>
                    {displayDateTime(shipmentSyncedAt)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.25} alignItems="center" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                <Chip
                  size="small"
                  label={`${total.toLocaleString("en-IN")} orders`}
                  sx={{ bgcolor: "#ecfdf5", color: "#047857", fontWeight: 700 }}
                />
                <Button
                  onClick={handleSyncNew}
                  variant="outlined"
                  startIcon={syncing ? <CircularProgress size={16} /> : <RefreshIcon />}
                  disabled={syncing || loading}
                  sx={{
                    borderColor: "#cbd5e1",
                    color: "#0f172a",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: 1.5,
                  }}
                >
                  {syncing ? "Syncing..." : "Sync"}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        <Stack spacing={1.25} sx={{ px: { xs: 1.5, md: 2 }, py: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Stack
              direction="row"
              spacing={0.8}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ width: "100%" }}
            >
              <DateRangeFilter
                from={startDate}
                to={endDate}
                onChange={handleDateRangeChange}
              />

              <FormControl size="small" sx={wideFilterControlSx}>
                <InputLabel id="shipment-status-label" shrink>
                  Shipment Status
                </InputLabel>
                <Select
                  labelId="shipment-status-label"
                  label="Shipment Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  displayEmpty
                  notched
                  renderValue={(value) => value || "All"}
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

              <FormControl size="small" sx={filterControlSx}>
                <InputLabel id="state-filter-label" shrink>
                  State
                </InputLabel>
                <Select
                  labelId="state-filter-label"
                  label="State"
                  value={stateFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStateFilter(typeof value === "string" ? value.split(",") : value);
                  }}
                  displayEmpty
                  notched
                  multiple
                  renderValue={(selected) => {
                    if (!selected?.length) return "All";
                    if (selected.length === 1) return selected[0];
                    return `${selected.length} states`;
                  }}
                >
                  <MenuItem value="" onClick={() => setStateFilter([])}>
                    <Checkbox size="small" checked={stateFilter.length === 0} />
                    <ListItemText primary="All" primaryTypographyProps={{ fontStyle: "italic" }} />
                  </MenuItem>
                  {availableStates.map((s) => (
                    <MenuItem key={s.state || "-"} value={s.state || "-"}>
                      <Checkbox size="small" checked={stateFilter.indexOf(s.state || "-") > -1} />
                      <ListItemText primary={s.state || "-"} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={wideFilterControlSx}>
                <InputLabel id="mode-filter-label" shrink>
                  Mode of Payment
                </InputLabel>
                <Select
                  labelId="mode-filter-label"
                  label="Mode of Payment"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  displayEmpty
                  notched
                  renderValue={(value) => paymentModeLabel(value)}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {paymentModeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={filterControlSx}>
                <InputLabel id="assigned-filter-label" shrink>
                  Assigned
                </InputLabel>
                <Select
                  labelId="assigned-filter-label"
                  label="Assigned"
                  value={assigned}
                  onChange={(e) => setAssigned(e.target.value)}
                  displayEmpty
                  notched
                  renderValue={(value) => {
                    if (value === "assigned") return "Assigned";
                    if (value === "unassigned") return "Unassigned";
                    return "All";
                  }}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  <MenuItem value="assigned">Assigned</MenuItem>
                  <MenuItem value="unassigned">Unassigned</MenuItem>
                </Select>
              </FormControl>

              <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap" }} useFlexGap>
                <Button
                  onClick={handleGetOrders}
                  variant={filtersDirty ? "contained" : "outlined"}
                  startIcon={<FilterAltOutlinedIcon />}
                  disabled={loading || syncing}
                  sx={{
                    ...actionButtonSx,
                    bgcolor: filtersDirty ? "#14532d" : "#fff",
                    color: filtersDirty ? "#fff" : "#475569",
                    borderColor: filtersDirty ? "#14532d" : "#cbd5e1",
                    boxShadow: filtersDirty ? "0 6px 14px rgba(20, 83, 45, 0.18)" : "none",
                    "&:hover": {
                      bgcolor: filtersDirty ? "#166534" : "#f8fafc",
                      borderColor: filtersDirty ? "#166534" : "#94a3b8",
                      boxShadow: filtersDirty ? "0 8px 18px rgba(20, 83, 45, 0.22)" : "none",
                    },
                    "&.Mui-disabled": {
                      bgcolor: "#d1d5db",
                      color: "#6b7280",
                      boxShadow: "none",
                    },
                  }}
                >
                  Apply Filters
                </Button>

                <Button
                  onClick={handleClearFilters}
                  variant="outlined"
                  disabled={loading || syncing}
                  title="Clear filters"
                  sx={{
                    ...actionButtonSx,
                    color: "#475569",
                    borderColor: "#cbd5e1",
                    "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
                  }}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Stack>

        {err && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {err}
          </Alert>
        )}

        <Box ref={tableRegionRef} sx={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
          {!hasFetched || (loading && rows.length === 0) ? (
          <Box
            sx={{
              px: { xs: 1.25, md: 3 },
              pb: 1.5,
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            <MosaicTableSkeleton rows={skeletonRows} />
          </Box>
          ) : (
          <>
            <TableContainer
              sx={{
                position: "relative",
                borderTop: "1px solid #e2e8f0",
                width: "100%",
                maxWidth: "100%",
                overflowX: "auto",
                overflowY: "hidden",
                WebkitOverflowScrolling: "touch",
                scrollbarGutter: "stable",
              }}
            >
              {loading && (
                <LinearProgress
                  sx={{
                    position: "sticky",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 3,
                    height: 3,
                    bgcolor: "#e2e8f0",
                    "& .MuiLinearProgress-bar": { bgcolor: "#14532d" },
                  }}
                />
              )}
              <Table size="small" sx={{ minWidth: 1320 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableHeadCellSx}>Order ID</TableCell>
                    <TableCell sx={tableHeadCellSx}>Name</TableCell>
                    <TableCell sx={tableHeadCellSx}>Contact Number</TableCell>
                    <TableCell sx={tableHeadCellSx}>Order Date</TableCell>
                    <TableCell sx={tableHeadCellSx} align="right">
                      Amount
                    </TableCell>
                    <TableCell sx={tableHeadCellSx}>Mode of Payment</TableCell>
                    <TableCell sx={tableHeadCellSx}>Products Ordered</TableCell>
                    <TableCell sx={tableHeadCellSx}>Expert Assigned</TableCell>
                    <TableCell sx={tableHeadCellSx}>Health Expert Assigned</TableCell>
                    <TableCell sx={tableHeadCellSx}>Channel Name</TableCell>
                    <TableCell sx={tableHeadCellSx}>State</TableCell>
                    <TableCell sx={tableHeadCellSx}>Shipment Status</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 8 }}>
                        <Typography variant="subtitle2" sx={{ color: "#0f172a", fontWeight: 800 }}>
                          No orders found.
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, color: "#64748b" }}>
                          Try widening the date range or clearing one of the filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r, idx) => (
                      <TableRow
                        key={r.orderId}
                        sx={{
                          "&:nth-of-type(even)": { backgroundColor: "#fbfdff" },
                          "&:hover": { backgroundColor: "#f1f5f9" },
                          "& td": { borderBottom: "1px solid #edf2f7", fontSize: 13 },
                        }}
                      >
                        <TruncCell maxWidth={120}>{r.orderId}</TruncCell>
                        <TruncCell maxWidth={180}>{r.name}</TruncCell>
                        <TruncCell maxWidth={140}>{r.contactNumber}</TruncCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {displayOrderDate(r.orderDate)}
                        </TableCell>
                        <TableCell align="right">
                          {typeof r.amount === "number" ? currencyFmt.format(r.amount) : "—"}
                        </TableCell>
                        <TableCell>
                          {r.modeOfPayment ? (
                            <Stack spacing={0.35} alignItems="flex-start">
                              <Chip
                                size="small"
                                label={paymentCategory(r.modeOfPayment)}
                                variant="outlined"
                                sx={{
                                  fontWeight: 700,
                                  borderColor: "#cbd5e1",
                                  bgcolor: "#fff",
                                }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ lineHeight: 1.15, maxWidth: 160, whiteSpace: "normal" }}
                              >
                                {r.modeOfPayment}
                              </Typography>
                            </Stack>
                          ) : (
                            "—"
                          )}
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

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                width: "100%",
                maxWidth: "100%",
                overflowX: "auto",
                borderTop: "1px solid #e2e8f0",
                "& .MuiTablePagination-toolbar": {
                  minHeight: 48,
                  px: { xs: 1, sm: 2 },
                  flexWrap: "wrap",
                  gap: { xs: 0.5, sm: 1 },
                },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                  m: 0,
                  fontSize: 12,
                },
              }}
            >
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[20, 50, 100, 200]}
              />
            </Box>
          </>
          )}
        </Box>
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

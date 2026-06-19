import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PhoneIcon from "@mui/icons-material/Phone";
import { requestZoomDial } from "../calling/dialer";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const DEFAULT_STATUS_OPTIONS = [];

const OVERRIDE_STATUS_OPTIONS = [
  { value: "delivered", label: "Delivered" },
  { value: "in_transit", label: "In Transit" },
  { value: "rto_received", label: "RTO Delivered" },
  { value: "rto_initiated", label: "RTO" },
];

const DELAY_OPTIONS = [
  ["", "All Delays"],
  ["7_10", "7 - 10 days"],
  ["10_15", "10 - 15 days"],
  ["15_20", "15 - 20 days"],
  ["20_25", "20 - 25 days"],
  ["25_plus", "> 25 days"],
];

const REMARK_OPTIONS = [
  "Fake Remarks",
  "Hold",
  "Ringing",
  "Consignee don't want the order",
  "New order punch",
];

const NDR_LEVEL_TABS = [
  { value: "level1", label: "Level 1 NDR" },
  { value: "level2", label: "Level 2 NDR" },
  { value: "closing", label: "Closing" },
];

function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatAddress(address) {
  if (!address) return "-";
  return [address.address1, address.address2, address.city, address.province, address.zip, address.country]
    .filter(Boolean)
    .join(", ") || "-";
}

function productSku(product) {
  return product?.sku || product?.title || "-";
}

function statusColor(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("out") || s.includes("ofd")) return "info";
  if (s.includes("pickup")) return "warning";
  if (s.includes("transit")) return "primary";
  return "default";
}

function trackingLinkFor(courier, trackingNumber) {
  const awb = String(trackingNumber || "").trim();
  if (!awb) return "";
  const provider = String(courier || "").trim().toLowerCase();
  if (provider.includes("delhivery")) {
    return `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`;
  }
  if (provider.includes("bluedart") || provider.includes("blue dart")) {
    return `https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&&trackNo=${encodeURIComponent(awb)}`;
  }
  return `https://www.dtdc.com/track-your-shipment/?awb=${encodeURIComponent(awb)}`;
}

function downloadCsv(filename, rows) {
  const headers = ["Order ID", "Date", "Customer", "Phone", "Agent", "Remark", "Status", "Delay Days", "Payment", "Courier", "AWB"];
  const body = rows.map((row) => [
    row.orderName || row.orderId || "",
    formatDate(row.orderDate),
    row.customerName || "",
    row.contactNumber || "",
    row.assignedAgentName || "",
    row.opsRemark || "",
    row.status || "",
    row.delayDays || "",
    row.paymentMode || "",
    row.courier || "",
    row.trackingNumber || "",
  ]);
  const csv = [headers, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function LmsNdrPage() {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef4f8 100%)",
        p: { xs: 1.5, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1480, mx: "auto", display: "grid", gap: 2 }}>
        <NdrSection
          section="all"
          title="NDR Orders"
          description=""
          icon={<LocalShippingOutlinedIcon />}
        />
      </Box>
    </Box>
  );
}

function NdrSection({ section, title, description, icon }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [operationsAgents, setOperationsAgents] = useState([]);
  const [agentSavingId, setAgentSavingId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [remarkSaving, setRemarkSaving] = useState(false);
  const [tableRemarkSavingId, setTableRemarkSavingId] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());
  const [ndrLevel, setNdrLevel] = useState("level1");
  const [saveMessage, setSaveMessage] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
    courier: "",
    status: "",
    paymentMode: "",
    agent: "",
    delay: "",
  });
  const debouncedFilters = useDebouncedValue(filters);
  const statusFilterOptions = useMemo(
    () => [{ value: "", label: "All Statuses", count: total }, ...statusOptions],
    [statusOptions, total]
  );
  const paymentFilterOptions = useMemo(
    () => [{ value: "", label: "All Payments", count: total }, ...paymentOptions],
    [paymentOptions, total]
  );

  const params = useMemo(() => {
    const next = {
      section,
      ndr_level: ndrLevel,
      page: page + 1,
      limit: rowsPerPage,
    };
    if (debouncedFilters.search) next.search = debouncedFilters.search;
    if (debouncedFilters.dateFrom) next.date_from = debouncedFilters.dateFrom;
    if (debouncedFilters.dateTo) next.date_to = debouncedFilters.dateTo;
    if (debouncedFilters.courier) next.courier = debouncedFilters.courier;
    if (debouncedFilters.status) next.status = debouncedFilters.status;
    if (debouncedFilters.paymentMode) next.payment_mode = debouncedFilters.paymentMode;
    if (debouncedFilters.agent) next.agent = debouncedFilters.agent;
    if (debouncedFilters.delay) next.delay = debouncedFilters.delay;
    return next;
  }, [debouncedFilters, ndrLevel, page, rowsPerPage, section]);

  const loadRows = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/lms-orders/ndr", { params, signal });
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.total || 0));
      if (Array.isArray(data?.statusOptions)) setStatusOptions(data.statusOptions);
      if (Array.isArray(data?.paymentOptions)) setPaymentOptions(data.paymentOptions);
      if (Array.isArray(data?.carriers)) setCarriers(data.carriers);
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || axios.isCancel?.(err)) return;
      setError(err?.response?.data?.error || "Failed to load NDR orders.");
      setRows([]);
      setTotal(0);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const controller = new AbortController();
    loadRows(controller.signal);
    return () => controller.abort();
  }, [loadRows]);

  useEffect(() => {
    let ignore = false;
    const loadOperationsAgents = async () => {
      try {
        const { data } = await api.get("/api/employees");
        if (ignore) return;
        const agents = (Array.isArray(data) ? data : [])
          .filter((employee) => {
            const role = String(employee?.role || "").trim().toLowerCase();
            const department = String(employee?.department || "").trim().toLowerCase();
            const status = String(employee?.status || "active").trim().toLowerCase();
            return role === "operations" && department === "customer support" && status === "active";
          })
          .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
        setOperationsAgents(agents);
      } catch (err) {
        if (!ignore) setOperationsAgents([]);
      }
    };

    loadOperationsAgents();
    return () => {
      ignore = true;
    };
  }, []);

  const getAssignedAgent = useCallback(
    (agentId) => operationsAgents.find((agent) => String(agent._id) === String(agentId || "")) || null,
    [operationsAgents]
  );

  const exportRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        assignedAgentName: row.assignedAgentName || getAssignedAgent(row.assignedAgentId)?.fullName || "",
      })),
    [getAssignedAgent, rows]
  );
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowIds.has(row.id)),
    [rows, selectedRowIds]
  );
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedRowIds.has(row.id));
  const someVisibleSelected = rows.some((row) => selectedRowIds.has(row.id));

  useEffect(() => {
    setSelectedRowIds((prev) => {
      if (!prev.size) return prev;
      const visibleIds = new Set(rows.map((row) => row.id));
      const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const targetRowsForBulkEdit = (row) => (
    selectedRowIds.has(row.id) && selectedRows.length ? selectedRows : [row]
  );

  const toggleRowSelection = (rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleVisibleSelection = (checked) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      rows.forEach((row) => {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      });
      return next;
    });
  };

  const updateFilter = (key) => (event) => {
    setFilters((prev) => ({ ...prev, [key]: event.target.value }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({ search: "", dateFrom: "", dateTo: "", courier: "", status: "", paymentMode: "", agent: "", delay: "" });
    setPage(0);
  };

  const openDrawer = (row) => {
    setSelectedOrder(row);
    setOverrideStatus("");
    setRemarkDraft(row?.opsRemark || "");
  };

  const closeDrawer = () => {
    setSelectedOrder(null);
    setOverrideStatus("");
    setRemarkDraft("");
  };

  const handleCallIconClick = (phoneNumber) => {
    const ok = requestZoomDial(phoneNumber, { source: "operations_ndr" });
    if (!ok) setError("Invalid call number.");
  };

  const applyStatusUpdate = async () => {
    if (!selectedOrder || !overrideStatus) return;
    setStatusUpdating(true);
    try {
      const { data } = await api.patch("/api/lms-orders/status", {
        orderId: selectedOrder.orderId || selectedOrder.orderName,
        status: overrideStatus,
      });
      const nextStatus = data?.status || statusOptions.find((item) => item.value === overrideStatus)?.label || overrideStatus;
      setRows((prev) => prev.map((row) => (row.id === selectedOrder.id ? { ...row, status: nextStatus } : row)));
      setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      setOverrideStatus("");
      await loadRows();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to update order status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const saveRemark = async () => {
    if (!selectedOrder) return;
    const orderId = selectedOrder.orderId || selectedOrder.orderName;
    if (!orderId) return;
    setRemarkSaving(true);
    try {
      const { data } = await api.patch("/api/lms-orders/remark", {
        orderId,
        opsRemark: remarkDraft,
      });
      const nextRemark = data?.opsRemark || "";
      setRows((prev) => prev.map((row) => (row.id === selectedOrder.id ? { ...row, opsRemark: nextRemark } : row)));
      setSelectedOrder((prev) => (prev ? { ...prev, opsRemark: nextRemark } : prev));
      setRemarkDraft(nextRemark);
      setSaveMessage(nextRemark ? "Remark saved" : "Remark removed");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save remark.");
    } finally {
      setRemarkSaving(false);
    }
  };

  const updateTableRemark = async (row, nextRemark) => {
    const targets = targetRowsForBulkEdit(row).filter((item) => item.orderId || item.orderName);
    if (!targets.length) return;
    const targetIds = new Set(targets.map((item) => item.id));
    const isBulk = targets.length > 1;
    setTableRemarkSavingId(isBulk ? "bulk" : row.id);
    setRows((prev) => prev.map((item) => (targetIds.has(item.id) ? { ...item, opsRemark: nextRemark } : item)));
    setSelectedOrder((prev) => (prev && targetIds.has(prev.id) ? { ...prev, opsRemark: nextRemark } : prev));
    try {
      const results = await Promise.all(targets.map((item) =>
        api.patch("/api/lms-orders/remark", {
          orderId: item.orderId || item.orderName,
          opsRemark: nextRemark,
        })
      ));
      const savedRemark = results[0]?.data?.opsRemark || "";
      setRows((prev) => prev.map((item) => (targetIds.has(item.id) ? { ...item, opsRemark: savedRemark } : item)));
      setSelectedOrder((prev) => (prev && targetIds.has(prev.id) ? { ...prev, opsRemark: savedRemark } : prev));
      setRemarkDraft((prev) => (selectedOrder && targetIds.has(selectedOrder.id) ? savedRemark : prev));
      setSaveMessage(isBulk ? `Remark saved for ${targets.length} orders` : savedRemark ? "Remark saved" : "Remark removed");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save remark.");
      await loadRows();
    } finally {
      setTableRemarkSavingId("");
    }
  };

  const assignAgent = async (row, agent) => {
    const targets = targetRowsForBulkEdit(row).filter((item) => item.orderId || item.orderName);
    if (!targets.length) return;
    const targetIds = new Set(targets.map((item) => item.id));
    const isBulk = targets.length > 1;
    const assignedAgentId = agent?._id || "";
    const assignedAgentName = agent?.fullName || "";
    setAgentSavingId(isBulk ? "bulk" : row.id);
    setRows((prev) =>
      prev.map((item) =>
        targetIds.has(item.id)
          ? { ...item, assignedAgentId, assignedAgentName }
          : item
      )
    );
    setSelectedOrder((prev) =>
      prev && targetIds.has(prev.id)
        ? { ...prev, assignedAgentId, assignedAgentName }
        : prev
    );

    try {
      const results = await Promise.all(targets.map((item) =>
        api.patch("/api/lms-orders/agent", {
          orderId: item.orderId || item.orderName,
          assignedAgentId,
        })
      ));
      const nextAgentId = results[0]?.data?.assignedAgentId || "";
      const nextAgentName = results[0]?.data?.assignedAgentName || assignedAgentName;
      setRows((prev) =>
        prev.map((item) =>
          targetIds.has(item.id)
            ? { ...item, assignedAgentId: nextAgentId, assignedAgentName: nextAgentName }
            : item
        )
      );
      setSelectedOrder((prev) =>
        prev && targetIds.has(prev.id)
          ? { ...prev, assignedAgentId: nextAgentId, assignedAgentName: nextAgentName }
          : prev
      );
      setSaveMessage(isBulk ? `Agent updated for ${targets.length} orders` : nextAgentName ? "Agent assigned" : "Agent cleared");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to update order agent.");
      await loadRows();
    } finally {
      setAgentSavingId("");
    }
  };

  return (
    <Paper elevation={0} sx={{ border: "1px solid #dbe5ec", borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2, borderBottom: "1px solid #e5edf3" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
          <Box>
            <Stack direction="row" gap={1} alignItems="center">
              <Box sx={{ color: section === "delayed" ? "#b45309" : "#dc2626" }}>{icon}</Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#0f172a" }}>
                {title}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: "#64748b", mt: 0.25 }}>
              {description}
            </Typography>
          </Box>
          <Stack direction="row" gap={1} alignItems="center">
            <Chip label={`${total} orders`} sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 800 }} />
            <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={() => downloadCsv(`${section}-ndr-orders.csv`, exportRows)} sx={{ textTransform: "none", fontWeight: 800 }}>
              CSV
            </Button>
            <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={() => downloadCsv(`${section}-ndr-orders.xls`, exportRows)} sx={{ textTransform: "none", fontWeight: 800 }}>
              Excel
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: "1px solid #e5edf3" }}>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "1.4fr repeat(7, minmax(0, 1fr)) auto" },
            alignItems: "end",
          }}
        >
          <TextField
            label="Search"
            placeholder="Order, customer, AWB"
            value={filters.search}
            onChange={updateFilter("search")}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: "#64748b" }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField label="From" type="date" value={filters.dateFrom} onChange={updateFilter("dateFrom")} size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="To" type="date" value={filters.dateTo} onChange={updateFilter("dateTo")} size="small" InputLabelProps={{ shrink: true }} />
          <FormControl size="small">
            <InputLabel>Courier Partner</InputLabel>
            <Select label="Courier Partner" value={filters.courier} onChange={updateFilter("courier")}>
              <MenuItem value="">All Couriers</MenuItem>
              {carriers.map((carrier) => (
                <MenuItem key={carrier} value={carrier}>{carrier}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={filters.status} onChange={updateFilter("status")}>
              {statusFilterOptions.map((option) => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                  {option.count ? ` (${option.count})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Payment</InputLabel>
            <Select label="Payment" value={filters.paymentMode} onChange={updateFilter("paymentMode")}>
              {paymentFilterOptions.map((option) => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                  {option.count ? ` (${option.count})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Agent</InputLabel>
            <Select label="Agent" value={filters.agent} onChange={updateFilter("agent")}>
              <MenuItem value="">All Agents</MenuItem>
              <MenuItem value="no_agent">No Agent</MenuItem>
              {operationsAgents.map((agent) => (
                <MenuItem key={agent._id} value={agent._id}>{agent.fullName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Delay Days</InputLabel>
            <Select label="Delay Days" value={filters.delay} onChange={updateFilter("delay")}>
              {DELAY_OPTIONS.map(([value, label]) => (
                <MenuItem key={value || "all"} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<RestartAltRoundedIcon />} onClick={resetFilters} sx={{ minHeight: 40, textTransform: "none", fontWeight: 800 }}>
            Reset
          </Button>
        </Box>
        <Tabs
          value={ndrLevel}
          onChange={(_event, value) => {
            setNdrLevel(value);
            setPage(0);
            setSelectedRowIds(new Set());
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mt: 2,
            minHeight: 40,
            "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 800 },
          }}
        >
          {NDR_LEVEL_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: "#f8fafc", width: 44 }}>
                <Checkbox
                  size="small"
                  checked={allVisibleSelected}
                  indeterminate={!allVisibleSelected && someVisibleSelected}
                  disabled={!rows.length || loading}
                  onChange={(event) => toggleVisibleSelection(event.target.checked)}
                />
              </TableCell>
              {["Order", "Date", "Customer", "Status", "Payment", "Courier", "Agent", "Remark", "View"].map((label) => (
                <TableCell key={label} sx={{ bgcolor: "#f8fafc", color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            ) : rows.length ? rows.map((row) => (
              <TableRow key={row.id} hover sx={{ "& td": { borderBottom: "1px solid #eef2f6" } }}>
                <TableCell sx={{ width: 44 }}>
                  <Checkbox
                    size="small"
                    checked={selectedRowIds.has(row.id)}
                    onChange={() => toggleRowSelection(row.id)}
                  />
                </TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontWeight: 800 }}>{row.orderName || row.orderId}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.orderDate)}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.customerName || "-"}</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" color="text.secondary">{row.contactNumber || "-"}</Typography>
                    {row.contactNumber ? (
                      <Tooltip title="Call customer" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleCallIconClick(row.contactNumber)}
                          sx={{ width: 22, height: 22, color: "#16a34a" }}
                        >
                          <PhoneIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" gap={0.75} alignItems="center">
                    <Chip size="small" color={statusColor(row.status)} label={row.status || "-"} sx={{ fontWeight: 800 }} />
                    <Chip size="small" color="warning" label={`${row.delayDays || 0}d`} />
                  </Stack>
                </TableCell>
                <TableCell>{row.paymentMode || "-"}</TableCell>
                <TableCell>
                  <Typography variant="body2">{row.courier || "-"}</Typography>
                  <Typography variant="caption" color="text.secondary">Last: {formatDate(row.statusUpdatedAt)}</Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 220 }}>
                  <Autocomplete
                    size="small"
                    value={getAssignedAgent(row.assignedAgentId)}
                    onChange={(_event, value) => assignAgent(row, value)}
                    options={operationsAgents}
                    loading={agentSavingId === row.id || agentSavingId === "bulk"}
                    disabled={agentSavingId === row.id || agentSavingId === "bulk"}
                    getOptionLabel={(option) => option?.fullName || ""}
                    isOptionEqualToValue={(option, value) => String(option?._id) === String(value?._id)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Unassigned"
                        size="small"
                      />
                    )}
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 220 }}>
                  <FormControl fullWidth size="small">
                    <Select
                      displayEmpty
                      value={row.opsRemark || ""}
                      disabled={tableRemarkSavingId === row.id || tableRemarkSavingId === "bulk"}
                      onChange={(event) => updateTableRemark(row, event.target.value)}
                      renderValue={(value) => {
                        if (!value) return <Typography variant="body2" color="text.secondary">No remark</Typography>;
                        return (
                          <Tooltip title={value} arrow>
                            <Typography variant="body2" noWrap>{value}</Typography>
                          </Tooltip>
                        );
                      }}
                    >
                      <MenuItem value="">No remark</MenuItem>
                      {row.opsRemark && !REMARK_OPTIONS.includes(row.opsRemark) ? (
                        <MenuItem value={row.opsRemark}>{row.opsRemark}</MenuItem>
                      ) : null}
                      {REMARK_OPTIONS.map((remark) => (
                        <MenuItem key={remark} value={remark}>{remark}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Tooltip title="View order" arrow>
                    <IconButton size="small" onClick={() => openDrawer(row)}>
                      <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6, color: "text.secondary" }}>No NDR orders found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50]}
      />

      <Drawer anchor="right" open={Boolean(selectedOrder)} onClose={closeDrawer} PaperProps={{ sx: { width: { xs: "100%", sm: 580 }, maxWidth: "100vw" } }}>
        {selectedOrder ? (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2.25, borderBottom: "1px solid #e5e7eb" }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Order {selectedOrder.orderName || selectedOrder.orderId}</Typography>
              <IconButton size="small" onClick={closeDrawer}><CloseRoundedIcon /></IconButton>
            </Stack>
            <Box sx={{ p: 3, overflowY: "auto", display: "grid", gap: 3 }}>
              <Stack direction="row" gap={1}>
                <Chip size="small" color={statusColor(selectedOrder.status)} label={selectedOrder.status || "-"} sx={{ fontWeight: 800 }} />
                {selectedOrder.section === "delayed" ? <Chip size="small" color="warning" label={`Delayed ${selectedOrder.delayDays || 0}d`} /> : null}
              </Stack>
              <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900, letterSpacing: 0.6 }}>OVERRIDE STATUS</Typography>
                <Stack direction="row" gap={1} sx={{ mt: 1.5 }}>
                  <FormControl size="small" fullWidth>
                    <Select displayEmpty value={overrideStatus} onChange={(event) => setOverrideStatus(event.target.value)}>
                      <MenuItem value="">Select status...</MenuItem>
                      {OVERRIDE_STATUS_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Button variant="contained" disabled={!overrideStatus || statusUpdating} onClick={applyStatusUpdate} sx={{ boxShadow: "none" }}>Apply</Button>
                </Stack>
              </Box>
              <DetailSection title="Customer">
                <DetailRow label="Name" value={selectedOrder.customerName || "-"} />
                <DetailRow
                  label="Phone"
                  value={
                    selectedOrder.contactNumber || selectedOrder.customerAddress?.phone ? (
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography variant="body2" sx={{ color: "#111827", fontWeight: 500 }}>
                          {selectedOrder.contactNumber || selectedOrder.customerAddress?.phone}
                        </Typography>
                        <Tooltip title="Call customer" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleCallIconClick(selectedOrder.contactNumber || selectedOrder.customerAddress?.phone)}
                            sx={{ width: 24, height: 24, color: "#16a34a" }}
                          >
                            <PhoneIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : "-"
                  }
                />
                <DetailRow label="Address" value={formatAddress(selectedOrder.customerAddress)} />
              </DetailSection>
              <DetailSection title="Order Info">
                <DetailRow label="Reference" value={selectedOrder.orderName || selectedOrder.orderId || "-"} />
                <DetailRow label="Date" value={formatDateTime(selectedOrder.orderDate)} />
                <DetailRow label="Payment" value={selectedOrder.paymentMode || "-"} />
                <DetailRow label="Total" value={formatCurrency(selectedOrder.amount)} strong />
              </DetailSection>
              <DetailSection title="Products">
                {Array.isArray(selectedOrder.products) && selectedOrder.products.length ? selectedOrder.products.map((product, index) => (
                  <Box key={`${productSku(product)}-${index}`} sx={{ border: "1px solid #eef2f7", borderRadius: 2, px: 1.5, py: 1.25, display: "grid", gridTemplateColumns: "1fr auto", gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{product.title || product.sku || "-"}</Typography>
                      {product.sku ? <Typography variant="caption" sx={{ color: "#4f46e5", fontFamily: "monospace" }}>{product.sku}</Typography> : null}
                    </Box>
                    <Typography variant="body2" color="text.secondary">x{Number(product.quantity || 1)}</Typography>
                  </Box>
                )) : <Typography variant="body2" color="text.secondary">No products available.</Typography>}
              </DetailSection>
              <DetailSection title="Shipment">
                <DetailRow label="Courier" value={selectedOrder.courier || "-"} />
                <DetailRow
                  label="AWB"
                  value={
                    selectedOrder.trackingNumber ? (
                      <Typography
                        component="a"
                        href={trackingLinkFor(selectedOrder.courier, selectedOrder.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{ color: "#2563eb", fontWeight: 700, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                      >
                        {selectedOrder.trackingNumber}
                      </Typography>
                    ) : "-"
                  }
                />
                <DetailRow
                  label="Tracking"
                  value={
                    selectedOrder.trackingNumber ? (
                      <Typography
                        component="a"
                        href={trackingLinkFor(selectedOrder.courier, selectedOrder.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{ color: "#2563eb", fontWeight: 700, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                      >
                        View shipment
                      </Typography>
                    ) : "-"
                  }
                />
                <DetailRow label="Updated" value={formatDateTime(selectedOrder.statusUpdatedAt)} />
              </DetailSection>
              <DetailSection title="Tracking Timeline">
                <Box sx={{ borderLeft: "2px solid #e5e7eb", pl: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{selectedOrder.status || "Latest shipment update"}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(selectedOrder.statusUpdatedAt)} · {selectedOrder.status || "-"}
                  </Typography>
                </Box>
              </DetailSection>
              <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2, bgcolor: "#fbfdff" }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900, letterSpacing: 0.6 }}>REMARKS</Typography>
                <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                  <InputLabel id="ndr-remark-template-label">Select remark</InputLabel>
                  <Select
                    labelId="ndr-remark-template-label"
                    label="Select remark"
                    value=""
                    onChange={(event) => setRemarkDraft(event.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="" disabled>Select remark</MenuItem>
                    {REMARK_OPTIONS.map((remark) => (
                      <MenuItem key={remark} value={remark}>{remark}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  value={remarkDraft}
                  onChange={(event) => setRemarkDraft(event.target.value)}
                  placeholder="Write custom remark..."
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                  sx={{ mt: 1.5 }}
                />
                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.25 }}>
                  <Button
                    variant="contained"
                    disabled={remarkSaving || remarkDraft === (selectedOrder.opsRemark || "")}
                    onClick={saveRemark}
                    sx={{ boxShadow: "none", textTransform: "none", fontWeight: 800 }}
                  >
                    {remarkSaving ? "Saving..." : "Save Remark"}
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Box>
        ) : null}
      </Drawer>
      <Snackbar
        open={Boolean(saveMessage)}
        autoHideDuration={2200}
        onClose={() => setSaveMessage("")}
        message={saveMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Paper>
  );
}

function DetailSection({ title, children }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900, letterSpacing: 0.6 }}>{title.toUpperCase()}</Typography>
      <Box sx={{ display: "grid", gap: 1, mt: 1 }}>{children}</Box>
    </Box>
  );
}

function DetailRow({ label, value, strong = false }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 2 }}>
      <Typography variant="body2" sx={{ color: "#667085" }}>{label}</Typography>
      {React.isValidElement(value) ? (
        value
      ) : (
        <Typography variant="body2" sx={{ color: "#111827", fontWeight: strong ? 800 : 500 }}>{value}</Typography>
      )}
    </Box>
  );
}

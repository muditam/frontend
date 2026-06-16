import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { openZoomPhoneDialer } from "../utils/zoomPhoneDialer";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, ""); // Change this to your actual API base URL

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const CLOSED_STATUS = new Set([
  "delivered",
  "rto delivered",
  "return delivered",
  "rto received",
  "cancelled",
  "canceled",
  "lost",
]);
const DEFAULT_STATUS_OPTIONS = [
  { value: "not_shipped", label: "Not Shipped" },
  { value: "shipped", label: "Shipped" },
  { value: "in_transit", label: "In Transit" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "delivered", label: "Delivered" },
  { value: "rto_initiated", label: "RTO" },
  { value: "rto_received", label: "RTO Delivered" },
  { value: "canceled", label: "Canceled" },
  { value: "lost", label: "Lost" },
];
const OVERRIDE_STATUS_OPTIONS = [
  { value: "delivered", label: "Delivered" },
  { value: "in_transit", label: "In Transit" },
  { value: "rto_received", label: "RTO Delivered" },
  { value: "rto_initiated", label: "RTO" },
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

function normalizeStatus(status) {
  return String(status || "").trim();
}

function statusColor(status) {
  const s = normalizeStatus(status).toLowerCase();
  if (!s || s === "not available") return "default";
  if (CLOSED_STATUS.has(s)) return s.includes("rto") || s.includes("lost") ? "warning" : "success";
  if (s.includes("rto")) return "warning";
  if (s.includes("undelivered") || s.includes("failed") || s.includes("cancel")) return "error";
  if (s.includes("transit") || s.includes("ofd") || s.includes("out for")) return "info";
  if (s.includes("booked") || s.includes("pending") || s.includes("not shipped")) return "default";
  return "primary";
}

function productText(products) {
  if (!Array.isArray(products) || products.length === 0) return "-";
  return products
    .slice(0, 2)
    .map((item) => {
      const label = item?.sku || item?.title || "-";
      const qty = Number(item?.quantity || 0);
      return qty > 1 ? `${label} x${qty}` : label;
    })
    .join(", ");
}

function formatAddress(address) {
  if (!address) return "-";
  return [
    address.address1,
    address.address2,
    address.city,
    address.province,
    address.zip,
    address.country,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

function productSku(product) {
  return product?.sku || product?.title || "-";
}

function orderKey(row) {
  return row?.orderId || row?.orderName || row?.id || "";
}

function statusOptionLabel(statusOptions, value) {
  return statusOptions.find((option) => option.value === value)?.label || value;
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
  const headers = ["Order ID", "Date", "Customer", "Phone", "Products / SKU", "Payment", "Amount", "Courier", "AWB", "Status"];
  const body = rows.map((row) => [
    row.orderName || row.orderId || "",
    formatDate(row.orderDate),
    row.customerName || "",
    row.contactNumber || row.customerAddress?.phone || "",
    productText(row.products),
    row.paymentMode || "",
    Number(row.amount || 0),
    row.courier || "",
    row.trackingNumber || "",
    row.status || "",
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

function isClosedStatusValue(status) {
  return CLOSED_STATUS.has(normalizeStatus(status).toLowerCase());
}

function rowMatchesVisibility(row, { isActiveMode, showActive, showClosed, statusFilterLabel }) {
  const isClosed = isClosedStatusValue(row?.status);
  if (isActiveMode && isClosed) return false;
  if (!isActiveMode && showActive && !showClosed && isClosed) return false;
  if (!isActiveMode && !showActive && showClosed && !isClosed) return false;
  if (statusFilterLabel) {
    if (normalizeStatus(row?.status).toLowerCase() !== String(statusFilterLabel).toLowerCase()) return false;
  }
  return true;
}

async function writeClipboard(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  return copied;
}

function filterPillLabel(key, value, statusOptions) {
  const map = {
    search: `Search: ${value}`,
    dateFrom: `From: ${value}`,
    dateTo: `To: ${value}`,
    product: `Product: ${value}`,
    courier: `Courier: ${value}`,
    paymentMode: `Payment: ${value}`,
    status: `Status: ${statusOptionLabel(statusOptions, value)}`,
  };
  return map[key] || value;
}

export default function LmsOrdersPage() {
  const [mode, setMode] = useState("active");
  const isActiveMode = mode !== "all";

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showActive, setShowActive] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [counts, setCounts] = useState({ all: 0, active: 0, closed: 0, trackedStatus: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [remarkSaving, setRemarkSaving] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
    product: "",
    courier: "",
    paymentMode: "",
    status: "",
  });
  const debouncedFilters = useDebouncedValue(filters, 350);
  const activeFilterEntries = Object.entries(filters).filter(([, value]) => String(value || "").trim() !== "");
  const activeFilterCount = activeFilterEntries.length + (!isActiveMode && (showActive !== true || showClosed !== false) ? 1 : 0);

  const title = isActiveMode ? "Active Orders" : "All Orders";
  const statusFilterOptions = useMemo(
    () => [{ value: "", label: "All Statuses" }, ...statusOptions],
    [statusOptions]
  );
  const visibleSelectedCount = rows.filter((row) => selectedIds.includes(orderKey(row))).length;
  const allVisibleSelected = rows.length > 0 && visibleSelectedCount === rows.length;
  const partiallySelected = visibleSelectedCount > 0 && !allVisibleSelected;
  const activeTotal = Number(counts.active || 0);
  const closedTotal = Number(counts.closed || 0);
  const allTotal = Number(counts.all || total || 0);

  const params = useMemo(() => {
    const next = {
      mode: isActiveMode ? "active" : "all",
      page: page + 1,
      limit: rowsPerPage,
      sort_by: "order_date",
      sort_dir: "desc",
      _v: requestVersion,
    };
    if (isActiveMode) {
      next.status_group = "active";
    } else if (showActive && !showClosed) {
      next.status_group = "active";
    } else if (!showActive && showClosed) {
      next.status_group = "closed";
    }
    if (debouncedFilters.search) next.search = debouncedFilters.search;
    if (debouncedFilters.dateFrom) next.date_from = debouncedFilters.dateFrom;
    if (debouncedFilters.dateTo) next.date_to = debouncedFilters.dateTo;
    if (debouncedFilters.product) next.product = debouncedFilters.product;
    if (debouncedFilters.courier) next.courier = debouncedFilters.courier;
    if (debouncedFilters.paymentMode) next.payment_mode = debouncedFilters.paymentMode;
    if (debouncedFilters.status) next.status = debouncedFilters.status;
    return next;
  }, [debouncedFilters, isActiveMode, page, requestVersion, rowsPerPage, showActive, showClosed]);

  const fetchOrders = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/lms-orders", { params, signal });
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.total || 0));
      if (Array.isArray(data?.statusOptions) && data.statusOptions.length) {
        setStatusOptions(data.statusOptions);
      }
      if (data?.counts) {
        setCounts({
          all: Number(data.counts.all || 0),
          active: Number(data.counts.active || 0),
          closed: Number(data.counts.closed || 0),
          trackedStatus: Number(data.counts.trackedStatus || 0),
        });
      }
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || axios.isCancel?.(err)) return;
      console.error("Failed to load LMS orders", err);
      setError(err?.response?.data?.error || "Failed to load orders.");
      setRows([]);
      setTotal(0);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(controller.signal);
    return () => controller.abort();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(0);
  }, [mode]);

  useEffect(() => {
    const currentIds = new Set(rows.map(orderKey).filter(Boolean));
    setSelectedIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [rows]);

  const handleModeChange = (nextMode) => {
    setRows([]);
    setTotal(0);
    setSelectedIds([]);
    setSelectedOrder(null);
    setLoading(true);
    setMode(nextMode);
    if (nextMode === "all") {
      setShowActive(false);
      setShowClosed(true);
    } else {
      setShowActive(true);
      setShowClosed(false);
    }
    setRequestVersion((prev) => prev + 1);
    setPage(0);
  };

  const updateFilter = (key) => (event) => {
    setFilters((prev) => ({ ...prev, [key]: event.target.value }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      dateFrom: "",
      dateTo: "",
      product: "",
      courier: "",
      paymentMode: "",
      status: "",
    });
    setShowActive(false);
    setShowClosed(false);
    setSelectedIds([]);
    setPage(0);
  };

  const openOrderDrawer = (row) => {
    setSelectedOrder(row);
    setOverrideStatus("");
    setRemarkDraft(row?.opsRemark || "");
  };

  const closeOrderDrawer = () => {
    setSelectedOrder(null);
    setOverrideStatus("");
    setRemarkDraft("");
  };

  const copyValue = async (value, label = "Value") => {
    try {
      const copied = await writeClipboard(value);
      setCopyMessage(copied ? `${label} copied` : `${label} not available`);
    } catch (err) {
      setCopyMessage("Copy failed");
    }
  };

  const startZoomCall = async (phone, row = selectedOrder) => {
    const cleanPhone = String(phone || "").trim();
    if (!cleanPhone) {
      setCopyMessage("Phone number not available");
      return;
    }

    try {
      const { data } = await api.post("/api/zoom/call-intents", {
        leadId: String(orderKey(row) || ""),
        phoneNumber: cleanPhone,
        sourcePage: "/operations/orders",
        sourceContext: {
          orderId: String(row?.orderName || row?.orderId || ""),
          customerName: String(row?.customerName || ""),
          source: "lms_orders",
        },
      });
      const ok = openZoomPhoneDialer(data?.dialNumberE164 || cleanPhone);
      setCopyMessage(ok ? `Calling ${cleanPhone}` : "Invalid call number");
    } catch (err) {
      const ok = openZoomPhoneDialer(cleanPhone);
      setCopyMessage(ok ? `Calling ${cleanPhone}` : "Invalid call number");
    }
  };

  const toggleSelected = (id) => {
    if (!id) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleCurrentPage = () => {
    const pageIds = rows.map(orderKey).filter(Boolean);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pageIds.every((id) => next.has(id))) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return Array.from(next);
    });
  };

  const applyStatusUpdate = async (orderIds, statusValue) => {
    const ids = Array.isArray(orderIds) ? orderIds.filter(Boolean) : [orderIds].filter(Boolean);
    if (!ids.length || !statusValue) return;
    setStatusUpdating(true);
    setError("");
    try {
      const { data } = await api.patch("/api/lms-orders/status", {
        orderIds: ids,
        status: statusValue,
      });
      const nextStatus = data?.status || statusOptionLabel(statusOptions, statusValue);
      const statusFilterLabel = filters.status ? statusOptionLabel(statusOptions, filters.status) : "";
      let totalDelta = 0;
      let activeDelta = 0;
      let closedDelta = 0;
      setRows((prev) => {
        const updatedRows = prev.map((row) => {
          if (!ids.includes(orderKey(row))) return row;
          return { ...row, status: nextStatus };
        });

        prev.forEach((row) => {
          if (!ids.includes(orderKey(row))) return;
          const beforeVisible = rowMatchesVisibility(row, {
            isActiveMode,
            showActive,
            showClosed,
            statusFilterLabel,
          });
          const nextRow = { ...row, status: nextStatus };
          const afterVisible = rowMatchesVisibility(nextRow, {
            isActiveMode,
            showActive,
            showClosed,
            statusFilterLabel,
          });
          if (beforeVisible && !afterVisible) totalDelta -= 1;
          if (!beforeVisible && afterVisible) totalDelta += 1;

          const wasClosed = isClosedStatusValue(row.status);
          const nowClosed = isClosedStatusValue(nextStatus);
          if (wasClosed !== nowClosed) {
            activeDelta += nowClosed ? -1 : 1;
            closedDelta += nowClosed ? 1 : -1;
          }
        });

        return updatedRows.filter((row) =>
          rowMatchesVisibility(row, {
            isActiveMode,
            showActive,
            showClosed,
            statusFilterLabel,
          })
        );
      });
      setCounts((prev) => ({
        ...prev,
        active: Math.max(0, Number(prev.active || 0) + activeDelta),
        closed: Math.max(0, Number(prev.closed || 0) + closedDelta),
      }));
      setTotal((prev) => Math.max(0, Number(prev || 0) + totalDelta));
      setOverrideStatus("");
      setBulkStatus("");
      setSelectedIds([]);
      setSelectedOrder((prev) => {
        if (!prev || !ids.includes(orderKey(prev))) return prev;
        const nextRow = { ...prev, status: nextStatus };
        return rowMatchesVisibility(nextRow, {
          isActiveMode,
          showActive,
          showClosed,
          statusFilterLabel,
        })
          ? nextRow
          : null;
      });
    } catch (err) {
      console.error("Failed to update order status", err);
      setError(err?.response?.data?.error || "Failed to update order status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const saveRemark = async () => {
    const id = orderKey(selectedOrder);
    if (!id) return;
    setRemarkSaving(true);
    setError("");
    try {
      const { data } = await api.patch("/api/lms-orders/remark", {
        orderId: id,
        opsRemark: remarkDraft,
      });
      const nextRemark = data?.opsRemark || "";
      setRows((prev) => prev.map((row) => (orderKey(row) === id ? { ...row, opsRemark: nextRemark } : row)));
      setSelectedOrder((prev) => (prev ? { ...prev, opsRemark: nextRemark } : prev));
      setRemarkDraft(nextRemark);
      setCopyMessage(nextRemark ? "Remark saved" : "Remark removed");
    } catch (err) {
      console.error("Failed to save order remark", err);
      setError(err?.response?.data?.error || "Failed to save remark.");
    } finally {
      setRemarkSaving(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        background:
          "radial-gradient(circle at top left, rgba(14,165,233,0.10), transparent 26%), linear-gradient(180deg, #f7fafc 0%, #eef4f8 100%)",
        p: { xs: 1.5, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1480, mx: "auto", display: "grid", gap: 2 }}>
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #dbe5ec",
            borderRadius: 3,
            overflow: "hidden",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbfd 100%)",
          }}
        >
          <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.5 }, borderBottom: "1px solid #e5edf3" }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              gap={2}
            >
              <Box>
                <Typography variant="overline" sx={{ color: "#0369a1", fontWeight: 700, letterSpacing: 0.8 }}>
                  Operations
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                  {title}
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b", mt: 0.75 }}>
                  Shopify order book with LMS status mapping from the orders collection.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ xs: "stretch", sm: "center" }}>
                <Button
                  size="small"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={() => downloadCsv(`${isActiveMode ? "active" : "all"}-orders.csv`, rows)}
                  sx={{ textTransform: "none", fontWeight: 800 }}
                >
                  CSV
                </Button>
                <Button
                  size="small"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={() => downloadCsv(`${isActiveMode ? "active" : "all"}-orders.xls`, rows)}
                  sx={{ textTransform: "none", fontWeight: 800 }}
                >
                  Excel
                </Button>
                <Chip
                  icon={<Inventory2OutlinedIcon />}
                  label={`All ${allTotal}`}
                  sx={{ bgcolor: "#e0f2fe", color: "#075985", fontWeight: 700, borderRadius: 2 }}
                />
                <Chip
                  icon={<LocalShippingOutlinedIcon />}
                  label={`Active ${activeTotal}`}
                  sx={{ bgcolor: "#f1f5f9", color: "#334155", fontWeight: 700, borderRadius: 2 }}
                />
                <Chip
                  icon={<LocalShippingOutlinedIcon />}
                  label={`Closed ${closedTotal}`}
                  sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700, borderRadius: 2 }}
                />
                {activeFilterCount > 0 ? (
                  <Chip
                    icon={<PaymentsOutlinedIcon />}
                    label={`${activeFilterCount} filters`}
                    sx={{ bgcolor: "#fff7ed", color: "#9a3412", fontWeight: 700, borderRadius: 2 }}
                  />
                ) : null}
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2, md: 3 }, py: 1.5, bgcolor: "#fff", borderBottom: "1px solid #e5edf3" }}>
            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => handleModeChange("active")}
                sx={{
                  minWidth: 140,
                  borderRadius: 2.5,
                  px: 2,
                  py: 1,
                  bgcolor: isActiveMode ? "#0f172a" : "#f8fafc",
                  color: isActiveMode ? "#fff" : "#475569",
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor: isActiveMode ? "#0f172a" : "#dbe5ec",
                  "&:hover": {
                    bgcolor: isActiveMode ? "#1e293b" : "#f1f5f9",
                    borderColor: isActiveMode ? "#1e293b" : "#cbd5e1",
                  },
                }}
              >
                Active Orders
              </Button>
              <Button
                onClick={() => handleModeChange("all")}
                sx={{
                  minWidth: 140,
                  borderRadius: 2.5,
                  px: 2,
                  py: 1,
                  bgcolor: !isActiveMode ? "#0f172a" : "#f8fafc",
                  color: !isActiveMode ? "#fff" : "#475569",
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor: !isActiveMode ? "#0f172a" : "#dbe5ec",
                  "&:hover": {
                    bgcolor: !isActiveMode ? "#1e293b" : "#f1f5f9",
                    borderColor: !isActiveMode ? "#1e293b" : "#cbd5e1",
                  },
                }}
              >
                All Orders
              </Button>
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#fff", borderBottom: "1px solid #e5edf3" }}>
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "1.5fr repeat(6, minmax(0, 1fr)) auto",
                },
                alignItems: "end",
              }}
            >
              <TextField
                label="Search"
                placeholder="Order ID, customer, AWB"
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
              <TextField
                label="From"
                type="date"
                value={filters.dateFrom}
                onChange={updateFilter("dateFrom")}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="To"
                type="date"
                value={filters.dateTo}
                onChange={updateFilter("dateTo")}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Product / SKU"
                value={filters.product}
                onChange={updateFilter("product")}
                size="small"
              />
              <TextField
                label="Courier"
                value={filters.courier}
                onChange={updateFilter("courier")}
                size="small"
              />
              <FormControl size="small">
                <InputLabel>Payment</InputLabel>
                <Select label="Payment" value={filters.paymentMode} onChange={updateFilter("paymentMode")}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="COD">COD</MenuItem>
                  <MenuItem value="PREPAID">Prepaid</MenuItem>
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
              {!isActiveMode ? (
                <Stack spacing={0.75} sx={{ minWidth: { lg: 190 } }}>
                  <Typography variant="caption" color="text.secondary">
                    Show
                  </Typography>
                  <Stack direction="row" gap={1} alignItems="center" sx={{ minHeight: 40 }}>
                    <Button
                      size="small"
                      variant={showActive ? "contained" : "outlined"}
                      onClick={() => {
                        setShowActive((prev) => !prev);
                        setPage(0);
                      }}
                      sx={{ minWidth: 88, borderRadius: 999, textTransform: "none", boxShadow: "none" }}
                    >
                      Active
                    </Button>
                    <Button
                      size="small"
                      variant={showClosed ? "contained" : "outlined"}
                      color={showClosed ? "warning" : "inherit"}
                      onClick={() => {
                        setShowClosed((prev) => !prev);
                        setPage(0);
                      }}
                      sx={{ minWidth: 88, borderRadius: 999, textTransform: "none", boxShadow: "none" }}
                    >
                      Closed
                    </Button>
                  </Stack>
                </Stack>
              ) : null}
              <Button
                variant="outlined"
                onClick={resetFilters}
                startIcon={<RestartAltRoundedIcon />}
                sx={{ minHeight: 40, borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
              >
                Reset
              </Button>
            </Box>

            {activeFilterEntries.length || !isActiveMode ? (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                  {activeFilterEntries.map(([key, value]) => (
                    <Chip
                      key={key}
                      label={filterPillLabel(key, value, statusOptions)}
                      size="small"
                      sx={{ bgcolor: "#f8fafc", color: "#334155", border: "1px solid #dbe5ec" }}
                    />
                  ))}
                  {!isActiveMode ? (
                    <Chip
                      label={`Show: ${showActive ? "Active" : ""}${showActive && showClosed ? " + " : ""}${showClosed ? "Closed" : ""}${!showActive && !showClosed ? "All" : ""}`}
                      size="small"
                      sx={{ bgcolor: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa" }}
                    />
                  ) : null}
                </Stack>
              </>
            ) : null}
          </Box>

          {error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          ) : null}

          {selectedIds.length ? (
            <Box
              sx={{
                px: { xs: 2, md: 3 },
                py: 1.5,
                bgcolor: "#f8fafc",
                borderBottom: "1px solid #e5edf3",
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                {selectedIds.length} selected
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ minWidth: { xs: "100%", sm: 420 } }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Bulk status</InputLabel>
                  <Select
                    label="Bulk status"
                    value={bulkStatus}
                    onChange={(event) => setBulkStatus(event.target.value)}
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  disabled={!bulkStatus || statusUpdating}
                  onClick={() => applyStatusUpdate(selectedIds, bulkStatus)}
                  sx={{ borderRadius: 2, boxShadow: "none", textTransform: "none", fontWeight: 800 }}
                >
                  Apply to selected
                </Button>
                <Button
                  variant="text"
                  disabled={statusUpdating}
                  onClick={() => setSelectedIds([])}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Clear
                </Button>
              </Stack>
            </Box>
          ) : null}

          <TableContainer sx={{ bgcolor: "#fff" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    padding="checkbox"
                    sx={{ bgcolor: "#f8fafc", borderBottom: "1px solid #e5edf3" }}
                  >
                    <Checkbox
                      size="small"
                      checked={allVisibleSelected}
                      indeterminate={partiallySelected}
                      onChange={toggleCurrentPage}
                      inputProps={{ "aria-label": "Select visible orders" }}
                    />
                  </TableCell>
                  {["Order ID", "Date", "Customer", "Products / SKU", "Payment", "Amount", "Courier / AWB", "Status", "View"].map(
                    (label) => (
                      <TableCell
                        key={label}
                        align={label === "Amount" ? "right" : "left"}
                        sx={{
                          bgcolor: "#f8fafc",
                          borderBottom: "1px solid #e5edf3",
                          color: "#64748b",
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {label}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={24} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        Loading orders...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 8, color: "text.secondary" }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: "#334155" }}>
                        No orders found
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.75 }}>
                        Adjust the filters or switch the order group.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const products = productText(row.products);
                    const courier = [row.courier, row.trackingNumber].filter(Boolean).join(" / ");
                    const id = orderKey(row);
                    const phone = row.contactNumber || row.customerAddress?.phone || "";
                    return (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{
                          "&:nth-of-type(even)": { bgcolor: "#fbfdff" },
                          "& td": { borderBottom: "1px solid #eef2f6" },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selectedIds.includes(id)}
                            onChange={() => toggleSelected(id)}
                            inputProps={{ "aria-label": `Select order ${row.orderName || row.orderId || ""}` }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <Typography variant="body2" sx={{ fontFamily: "inherit", fontWeight: 700, color: "#0f172a" }}>
                              {row.orderName || row.orderId || "-"}
                            </Typography>
                            <Tooltip title="Copy order ID" arrow>
                              <IconButton size="small" onClick={() => copyValue(row.orderName || row.orderId, "Order ID")}>
                                <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap", color: "#334155" }}>{formatDate(row.orderDate)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#0f172a" }}>
                            {row.customerName || "-"}
                          </Typography>
                          {phone ? (
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <Button
                                size="small"
                                startIcon={<PhoneOutlinedIcon sx={{ fontSize: 15 }} />}
                                onClick={() => startZoomCall(phone, row)}
                                sx={{ minWidth: 0, p: 0, textTransform: "none", color: "#64748b" }}
                              >
                                {phone}
                              </Button>
                              <Tooltip title="Copy phone" arrow>
                                <IconButton size="small" onClick={() => copyValue(phone, "Phone")}>
                                  <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Tooltip title={products} arrow>
                            <Typography variant="body2" noWrap>
                              {products}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.paymentMode || "-"}
                            variant="outlined"
                            sx={{ fontWeight: 700, borderColor: "#cbd5e1", color: "#334155" }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: "#0f172a" }}>
                          {formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
                            <Tooltip title={courier || "-"} arrow>
                              <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                                {courier || "-"}
                              </Typography>
                            </Tooltip>
                            {row.trackingNumber ? (
                              <Tooltip title="Copy AWB" arrow>
                                <IconButton size="small" onClick={() => copyValue(row.trackingNumber, "AWB")}>
                                  <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={statusColor(row.status)}
                            label={row.status || "Not Available"}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View order" arrow>
                            <IconButton
                              size="small"
                              onClick={() => openOrderDrawer(row)}
                              sx={{
                                border: "1px solid #dbe5ec",
                                color: "#0f172a",
                                bgcolor: "#fff",
                                "&:hover": { bgcolor: "#f1f5f9" },
                              }}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
            count={total}
            page={page}
            onPageChange={(_event, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[20, 50, 100]}
            sx={{
              borderTop: "1px solid #e5edf3",
              bgcolor: "#fcfdff",
              "& .MuiTablePagination-toolbar": { px: { xs: 2, md: 3 } },
            }}
          />
        </Paper>
      </Box>

      <Drawer
        anchor="right"
        open={Boolean(selectedOrder)}
        onClose={closeOrderDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 560 },
            maxWidth: "100vw",
            bgcolor: "#fff",
          },
        }}
      >
        {selectedOrder ? (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 3, py: 2.25, borderBottom: "1px solid #e5e7eb" }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#111827" }}>
                Order {selectedOrder.orderName || selectedOrder.orderId || "-"}
              </Typography>
              <IconButton size="small" onClick={closeOrderDrawer} sx={{ color: "#94a3b8" }}>
                <CloseRoundedIcon />
              </IconButton>
            </Stack>

            <Box sx={{ p: 3, overflowY: "auto", display: "grid", gap: 3 }}>
              <Chip
                size="small"
                label={selectedOrder.status || "Not Shipped"}
                color={statusColor(selectedOrder.status)}
                sx={{ justifySelf: "start", fontWeight: 700 }}
              />

              <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: 0.6 }}>
                  OVERRIDE STATUS
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <FormControl size="small" fullWidth>
                    <Select
                      displayEmpty
                      value={overrideStatus}
                      onChange={(event) => setOverrideStatus(event.target.value)}
                    >
                      <MenuItem value="">Select status...</MenuItem>
                      {OVERRIDE_STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    disabled={!overrideStatus || statusUpdating}
                    onClick={() => applyStatusUpdate(orderKey(selectedOrder), overrideStatus)}
                    sx={{ borderRadius: 2, boxShadow: "none" }}
                  >
                    Apply
                  </Button>
                </Stack>
              </Box>

              <DetailSection title="Customer">
                <DetailRow label="Name" value={selectedOrder.customerName || "-"} />
                <DetailRow
                  label="Phone"
                  value={selectedOrder.contactNumber || selectedOrder.customerAddress?.phone || "-"}
                  action={
                    selectedOrder.contactNumber || selectedOrder.customerAddress?.phone ? (
                      <Stack direction="row" gap={0.5}>
                        <Tooltip title="Call phone" arrow>
                          <IconButton size="small" onClick={() => startZoomCall(selectedOrder.contactNumber || selectedOrder.customerAddress?.phone, selectedOrder)}>
                            <PhoneOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy phone" arrow>
                          <IconButton
                            size="small"
                            onClick={() => copyValue(selectedOrder.contactNumber || selectedOrder.customerAddress?.phone, "Phone")}
                          >
                            <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : null
                  }
                />
                <DetailRow label="Address" value={formatAddress(selectedOrder.customerAddress)} />
              </DetailSection>

              <DetailSection title="Order Info">
                <DetailRow
                  label="Reference"
                  value={selectedOrder.orderName || selectedOrder.orderId || "-"}
                  action={
                    <Tooltip title="Copy order ID" arrow>
                      <IconButton size="small" onClick={() => copyValue(selectedOrder.orderName || selectedOrder.orderId, "Order ID")}>
                        <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  }
                />
                <DetailRow label="Date" value={formatDateTime(selectedOrder.orderDate)} />
                <DetailRow label="Platform" value="Shopify" />
                <DetailRow label="Payment" value={selectedOrder.paymentMode || "-"} />
                <DetailRow label="Total" value={formatCurrency(selectedOrder.amount)} strong />
              </DetailSection>

              <DetailSection title="Products">
                <Stack spacing={1}>
                  {Array.isArray(selectedOrder.products) && selectedOrder.products.length ? (
                    selectedOrder.products.map((product, index) => (
                      <Box
                        key={`${productSku(product)}-${index}`}
                        sx={{
                          border: "1px solid #eef2f7",
                          borderRadius: 2,
                          px: 1.5,
                          py: 1.25,
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 1,
                          alignItems: "center",
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ color: "#111827", fontWeight: 600 }} noWrap>
                            {product.title || product.sku || "-"}
                          </Typography>
                          {product.sku ? (
                            <Typography variant="caption" sx={{ color: "#4f46e5", fontFamily: "monospace" }}>
                              {product.sku}
                            </Typography>
                          ) : null}
                        </Box>
                        <Typography variant="body2" sx={{ color: "#64748b" }}>
                          x{Number(product.quantity || 1)}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No products available.
                    </Typography>
                  )}
                </Stack>
              </DetailSection>

              <DetailSection title="Shipment">
                {selectedOrder.courier || selectedOrder.trackingNumber || selectedOrder.statusUpdatedAt || selectedOrder.shipmentIssue ? (
                  <Box
                    sx={{
                      border: "1px solid #eef2f7",
                      borderRadius: 2,
                      overflow: "hidden",
                      bgcolor: "#fbfdff",
                    }}
                  >
                    <DetailRow
                      label="Courier"
                      value={selectedOrder.courier || "-"}
                      action={
                        selectedOrder.courier ? (
                          <Tooltip title="Copy courier" arrow>
                            <IconButton size="small" onClick={() => copyValue(selectedOrder.courier, "Courier")}>
                              <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        ) : null
                      }
                    />
                    <Divider />
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
                      action={
                        selectedOrder.trackingNumber ? (
                          <Tooltip title="Copy AWB" arrow>
                            <IconButton size="small" onClick={() => copyValue(selectedOrder.trackingNumber, "AWB")}>
                              <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        ) : null
                      }
                    />
                    <Divider />
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
                    <Divider />
                    <DetailRow label="Updated" value={formatDateTime(selectedOrder.statusUpdatedAt)} />
                    {selectedOrder.shipmentIssue ? (
                      <>
                        <Divider />
                        <DetailRow label="Issue" value={selectedOrder.shipmentIssue} />
                      </>
                    ) : null}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No shipment data available.
                  </Typography>
                )}
              </DetailSection>

              <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2, bgcolor: "#fbfdff" }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: 0.6 }}>
                  REMARKS
                </Typography>
                <TextField
                  value={remarkDraft}
                  onChange={(event) => setRemarkDraft(event.target.value)}
                  placeholder="Add operations remark..."
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
                    sx={{ borderRadius: 2, boxShadow: "none", textTransform: "none", fontWeight: 700 }}
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
        open={Boolean(copyMessage)}
        autoHideDuration={2200}
        onClose={() => setCopyMessage("")}
        message={copyMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

function DetailSection({ title, action, children }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: 0.6 }}>
          {title.toUpperCase()}
        </Typography>
        {action}
      </Stack>
      <Box sx={{ display: "grid", gap: 1 }}>{children}</Box>
    </Box>
  );
}

function DetailRow({ label, value, strong = false, action }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr auto", gap: 2, alignItems: "center", p: action ? 1 : 0 }}>
      <Typography variant="body2" sx={{ color: "#667085" }}>
        {label}
      </Typography>
      {React.isValidElement(value) ? (
        value
      ) : (
        <Typography variant="body2" sx={{ color: "#111827", fontWeight: strong ? 800 : 500 }}>
          {value}
        </Typography>
      )}
      {action ? <Box>{action}</Box> : null}
    </Box>
  );
}

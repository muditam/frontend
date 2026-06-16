import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
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
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const DEFAULT_STATUS_OPTIONS = [
  { value: "shipped", label: "Shipped" },
  { value: "in_transit", label: "In Transit" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
];

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
  const headers = ["Order ID", "Date", "Customer", "Phone", "Status", "Delay Days", "Issue", "Payment", "Courier", "AWB"];
  const body = rows.map((row) => [
    row.orderName || row.orderId || "",
    formatDate(row.orderDate),
    row.customerName || "",
    row.contactNumber || "",
    row.status || "",
    row.delayDays || "",
    row.shipmentIssue || "",
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
        <Box>
          <Typography variant="overline" sx={{ color: "#b45309", fontWeight: 800, letterSpacing: 0.8 }}>
            Operations
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
            NDR Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.75 }}>
            Monitor delayed shipments and flagged courier issues.
          </Typography>
        </Box>

        <NdrSection
          section="delayed"
          title="Delayed Orders"
          description="Orders exceeding the 7-day delivery SLA"
          icon={<LocalShippingOutlinedIcon />}
        />
        <NdrSection
          section="attention"
          title="Attention Required"
          description="Orders with problematic courier-side tracking remarks, not yet delayed"
          icon={<WarningAmberRoundedIcon />}
        />
      </Box>
    </Box>
  );
}

function NdrSection({ section, title, description, icon }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [carriers, setCarriers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [remarkSaving, setRemarkSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
    courier: "",
    status: "",
    paymentMode: "",
    delay: "",
  });
  const debouncedFilters = useDebouncedValue(filters);

  const params = useMemo(() => {
    const next = {
      section,
      page: page + 1,
      limit: rowsPerPage,
    };
    if (debouncedFilters.search) next.search = debouncedFilters.search;
    if (debouncedFilters.dateFrom) next.date_from = debouncedFilters.dateFrom;
    if (debouncedFilters.dateTo) next.date_to = debouncedFilters.dateTo;
    if (debouncedFilters.courier) next.courier = debouncedFilters.courier;
    if (debouncedFilters.status) next.status = debouncedFilters.status;
    if (debouncedFilters.paymentMode) next.payment_mode = debouncedFilters.paymentMode;
    if (debouncedFilters.delay) next.delay = debouncedFilters.delay;
    return next;
  }, [debouncedFilters, page, rowsPerPage, section]);

  const loadRows = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/lms-orders/ndr", { params, signal });
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.total || 0));
      if (Array.isArray(data?.statusOptions) && data.statusOptions.length) setStatusOptions(data.statusOptions);
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

  const updateFilter = (key) => (event) => {
    setFilters((prev) => ({ ...prev, [key]: event.target.value }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({ search: "", dateFrom: "", dateTo: "", courier: "", status: "", paymentMode: "", delay: "" });
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
            <Chip label={`${total} orders`} sx={{ bgcolor: section === "delayed" ? "#fef3c7" : "#fee2e2", color: section === "delayed" ? "#92400e" : "#991b1b", fontWeight: 800 }} />
            <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={() => downloadCsv(`${section}-ndr-orders.csv`, rows)} sx={{ textTransform: "none", fontWeight: 800 }}>
              CSV
            </Button>
            <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={() => downloadCsv(`${section}-ndr-orders.xls`, rows)} sx={{ textTransform: "none", fontWeight: 800 }}>
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
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "1.4fr repeat(6, minmax(0, 1fr)) auto" },
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
              <MenuItem value="">All Statuses</MenuItem>
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Payment</InputLabel>
            <Select label="Payment" value={filters.paymentMode} onChange={updateFilter("paymentMode")}>
              <MenuItem value="">All Payments</MenuItem>
              <MenuItem value="COD">COD</MenuItem>
              <MenuItem value="PREPAID">Prepaid</MenuItem>
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
      </Box>

      {error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Order", "Date", "Customer", "Agent", "Status", "Issue", "Payment", "Courier", "View"].map((label) => (
                <TableCell key={label} sx={{ bgcolor: "#f8fafc", color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            ) : rows.length ? rows.map((row) => (
              <TableRow key={row.id} hover sx={{ "& td": { borderBottom: "1px solid #eef2f6" } }}>
                <TableCell sx={{ fontFamily: "monospace", fontWeight: 800 }}>{row.orderName || row.orderId}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.orderDate)}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.customerName || "-"}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.contactNumber || "-"}</Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.agentName || "-"}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" gap={0.75} alignItems="center">
                    <Chip size="small" color={statusColor(row.status)} label={row.status || "-"} sx={{ fontWeight: 800 }} />
                    {section === "delayed" ? <Chip size="small" color="warning" label={`${row.delayDays || 0}d`} /> : null}
                  </Stack>
                </TableCell>
                <TableCell sx={{ maxWidth: 340 }}>
                  <Typography variant="body2" noWrap title={row.shipmentIssue || ""}>{row.shipmentIssue || "-"}</Typography>
                </TableCell>
                <TableCell>{row.paymentMode || "-"}</TableCell>
                <TableCell>
                  <Typography variant="body2">{row.courier || "-"}</Typography>
                  <Typography variant="caption" color="text.secondary">Last: {formatDate(row.statusUpdatedAt)}</Typography>
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
                <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>No NDR orders found</TableCell>
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
                <DetailRow label="Agent" value={selectedOrder.agentName || "-"} />
                <DetailRow label="Phone" value={selectedOrder.contactNumber || selectedOrder.customerAddress?.phone || "-"} />
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
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{selectedOrder.shipmentIssue || selectedOrder.status || "Latest shipment update"}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(selectedOrder.statusUpdatedAt)} · {selectedOrder.shipmentIssue || selectedOrder.status || "-"}
                  </Typography>
                </Box>
              </DetailSection>
              <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2, bgcolor: "#fbfdff" }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900, letterSpacing: 0.6 }}>REMARKS</Typography>
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

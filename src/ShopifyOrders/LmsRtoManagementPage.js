import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const STATUS_BY_TAB = {
  initiated: "rto_initiated",
  repunch: "rto_received",
};

function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function todayDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
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

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 1,
  }).format(Number(value || 0)).replace(".0", "");
}

function orderKey(row) {
  return row?.orderId || row?.orderName || row?.id || "";
}

function paymentLabel(row) {
  if (row?.cancelledAt || row?.cancelled_at) return "CANCELLED";
  const payment = String(row?.paymentMode || row?.financialStatus || "").trim();
  if (!payment) return "-";
  if (/cancel/i.test(payment)) return "CANCELLED";
  if (/partial/i.test(payment)) return "PARTIAL PAID";
  if (/cod|pending/i.test(payment)) return "COD";
  if (/paid|prepaid/i.test(payment)) return "PREPAID";
  return payment.toUpperCase();
}

function paymentMethodValue(row) {
  const label = paymentLabel(row).toLowerCase();
  if (label.includes("partial")) return "Partial Paid";
  if (label.includes("prepaid")) return "Prepaid";
  return "COD";
}

function paymentChipSx(label) {
  const value = String(label || "").toLowerCase();
  if (value.includes("cancel")) return { bgcolor: "#fee2e2", color: "#ef0000" };
  if (value.includes("partial")) return { bgcolor: "#ede9fe", color: "#7c3aed" };
  if (value.includes("prepaid")) return { bgcolor: "#dbeafe", color: "#2563eb" };
  if (value.includes("cod")) return { bgcolor: "#fef3c7", color: "#d97706" };
  return { bgcolor: "#f3f4f6", color: "#64748b" };
}

function exportRows(filename, rows, type) {
  const headers = ["Order Ref", "Date", "Customer", "Phone", "Courier", "AWB", "Amount", "Payment", "Status"];
  const body = rows.map((row) => [
    row.orderName || row.orderId || "",
    formatDate(row.orderDate),
    row.customerName || "",
    row.contactNumber || row.customerAddress?.phone || "",
    row.courier || "",
    row.trackingNumber || "",
    Number(row.amount || 0),
    paymentLabel(row),
    row.status || "",
  ]);

  if (type === "xlsx") {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RTO Management");
    XLSX.writeFile(workbook, filename);
    return;
  }

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

export default function LmsRtoManagementPage() {
  const [tab, setTab] = useState("initiated");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [confirmRow, setConfirmRow] = useState(null);
  const [repunchRow, setRepunchRow] = useState(null);
  const [repunchPaymentMethod, setRepunchPaymentMethod] = useState("COD");
  const [partialPaidAmount, setPartialPaidAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [shippingAmount, setShippingAmount] = useState("0.00");
  const [repunching, setRepunching] = useState(false);
  const [exporting, setExporting] = useState("");
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "2026-05-01",
    dateTo: "",
    courier: "",
  });
  const debouncedFilters = useDebouncedValue(filters);

  const params = useMemo(() => {
    const next = {
      mode: "all",
      page: page + 1,
      limit: rowsPerPage,
      sort_by: "order_date",
      sort_dir: "desc",
      status: STATUS_BY_TAB[tab],
    };
    if (debouncedFilters.search) next.search = debouncedFilters.search;
    if (debouncedFilters.dateFrom) next.date_from = debouncedFilters.dateFrom;
    if (debouncedFilters.dateTo) next.date_to = debouncedFilters.dateTo;
    if (debouncedFilters.courier) next.courier = debouncedFilters.courier;
    return next;
  }, [debouncedFilters, page, rowsPerPage, tab]);

  const loadRows = useCallback(async (signal) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/lms-orders", { params, signal });
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.total || 0));
    } catch (err) {
      if (err?.code !== "ERR_CANCELED" && !axios.isCancel?.(err)) {
        setRows([]);
        setTotal(0);
        setNotice(err?.response?.data?.error || "Failed to load RTO orders.");
      }
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
    setFilters({ search: "", dateFrom: "2026-05-01", dateTo: "", courier: "" });
    setPage(0);
  };

  const markRtoReceived = async () => {
    const row = confirmRow;
    const id = orderKey(row);
    if (!id) return;
    setUpdatingId(id);
    try {
      await api.patch("/api/lms-orders/status", {
        orderId: id,
        status: "rto_received",
      });
      setNotice("Marked as RTO Delivered");
      setConfirmRow(null);
      await loadRows();
    } catch (err) {
      setNotice(err?.response?.data?.error || "Failed to mark RTO received.");
    } finally {
      setUpdatingId("");
    }
  };

  const openRepunchDrawer = (row) => {
    setRepunchRow(row);
    setRepunchPaymentMethod(paymentMethodValue(row));
    setPartialPaidAmount("");
    setTransactionId("");
    setShippingAmount("0.00");
  };

  const closeRepunchDrawer = () => {
    setRepunchRow(null);
  };

  const repunchOrder = async () => {
    if (!repunchRow) return;
    const products = Array.isArray(repunchRow.products) ? repunchRow.products : [];
    const cartItems = products
      .map((product) => ({
        variantId: product.variant_id || product.variantId,
        quantity: Number(product.quantity || 1),
      }))
      .filter((item) => item.variantId && item.quantity > 0);
    if (!cartItems.length) {
      setNotice("Cannot repunch: product variant ID is missing.");
      return;
    }

    const amount = Number(repunchRow.amount || 0);
    const shipping = Number(shippingAmount || 0);
    const total = Math.max(0, amount + shipping);
    const partial = Number(partialPaidAmount || 0);
    if (repunchPaymentMethod === "Partial Paid") {
      if (partial <= 0) {
        setNotice("Please enter partial paid amount.");
        return;
      }
      if (partial >= total) {
        setNotice("Partial paid amount must be less than total.");
        return;
      }
      if (!transactionId.trim()) {
        setNotice("Please enter transaction ID for partial paid order.");
        return;
      }
    }

    const address = repunchRow.customerAddress || {};
    const nameParts = String(repunchRow.customerName || address.name || "").trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ");
    const shippingAddress = {
      firstName,
      lastName,
      address1: address.address1 || "",
      address2: address.address2 || "",
      city: address.city || "",
      province: address.province || "",
      country: address.country || "India",
      zip: address.zip || "",
      phone: repunchRow.contactNumber || address.phone || "",
    };

    setRepunching(true);
    try {
      const { data } = await api.post("/api/shopify/create-order", {
        cartItems,
        shippingAddress,
        billingAddress: shippingAddress,
        paymentStatus: repunchPaymentMethod === "Prepaid" ? "paid" : "COD",
        paymentMode: repunchPaymentMethod,
        partialPaidAmount: repunchPaymentMethod === "Partial Paid" ? partial : 0,
        orderTotal: total,
        transactionId: transactionId.trim(),
        shippingCost: shipping,
        note: `Repunched from RTO order ${repunchRow.orderName || repunchRow.orderId || ""}`.trim(),
      });
      const created = data?.order;
      setNotice(`Repunched on Shopify${created?.name ? ` as ${created.name}` : ""}`);
      closeRepunchDrawer();
    } catch (err) {
      setNotice(err?.response?.data?.error || err?.response?.data?.message || "Failed to repunch order.");
    } finally {
      setRepunching(false);
    }
  };

  const downloadAllRows = async (type) => {
    setExporting(type);
    try {
      const { data } = await api.get("/api/lms-orders", {
        params: { ...params, export_all: "true" },
      });
      const allRows = Array.isArray(data?.data) ? data.data : [];
      exportRows(`rto-management.${type}`, allRows, type);
    } catch (err) {
      setNotice(err?.response?.data?.error || "Failed to export RTO orders.");
    } finally {
      setExporting("");
    }
  };

  const copyValue = async (value, label) => {
    const text = String(value || "").trim();
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    setNotice(`${label} copied`);
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "#f8fafc", px: { xs: 2, md: 3 }, py: 3 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        gap={{ xs: 1.5, md: 4 }}
        sx={{ borderBottom: "1px solid #e5e7eb", mb: 3 }}
      >
        <Typography variant="h5" sx={{ color: "#111827", fontWeight: 900, pb: { xs: 0, md: 1.2 }, whiteSpace: "nowrap" }}>
          RTO Management
        </Typography>

        <Tabs
          value={tab}
          onChange={(_event, value) => {
            setTab(value);
            setPage(0);
          }}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              minHeight: 44,
              px: 2.5,
              textTransform: "none",
              fontSize: 16,
              fontWeight: 800,
              color: "#6b7280",
            },
            "& .Mui-selected": { color: "#4f46ff !important" },
            "& .MuiTabs-indicator": { bgcolor: "#4f46ff", height: 2 },
          }}
        >
          <Tab value="initiated" label="RTO Initiated" />
          <Tab value="repunch" label="RTO Received — Repunch Pending" />
        </Tabs>
      </Stack>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5, p: 2, mb: 3, bgcolor: "#fff" }}>
        <Stack direction={{ xs: "column", lg: "row" }} gap={1.5} alignItems={{ xs: "stretch", lg: "flex-end" }}>
          <Box sx={{ flex: 1, minWidth: { lg: 360 } }}>
            <FieldLabel>Search</FieldLabel>
            <TextField
              fullWidth
              size="small"
              value={filters.search}
              onChange={updateFilter("search")}
              placeholder="Order ref, AWB, customer, phone..."
              sx={inputSx}
            />
          </Box>
          <Box>
            <FieldLabel>From</FieldLabel>
            <TextField size="small" type="date" value={filters.dateFrom} onChange={updateFilter("dateFrom")} sx={dateInputSx} />
          </Box>
          <Box>
            <FieldLabel>To</FieldLabel>
            <TextField size="small" type="date" value={filters.dateTo} onChange={updateFilter("dateTo")} inputProps={{ max: todayDate() }} sx={dateInputSx} />
          </Box>
          <Box sx={{ minWidth: { lg: 220 } }}>
            <FieldLabel>Courier Partner</FieldLabel>
            <TextField fullWidth size="small" value={filters.courier} onChange={updateFilter("courier")} placeholder="e.g. Delhivery" sx={inputSx} />
          </Box>
          <Button onClick={resetFilters} variant="outlined" sx={secondaryButtonSx}>
            Reset
          </Button>
          <Button startIcon={<DownloadRoundedIcon />} disabled={Boolean(exporting)} onClick={() => downloadAllRows("csv")} variant="outlined" sx={secondaryButtonSx}>
            CSV
          </Button>
          <Button startIcon={<DownloadRoundedIcon />} disabled={Boolean(exporting)} onClick={() => downloadAllRows("xlsx")} variant="outlined" sx={excelButtonSx}>
            Excel
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5, overflow: "hidden", bgcolor: "#fff" }}>
        <TableContainer sx={{ maxHeight: "calc(100vh - 330px)" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {["ORDER REF", "DATE", "CUSTOMER", "COURIER / AWB", "AMOUNT", "PAYMENT", ""].map((head) => (
                  <TableCell key={head} sx={{ bgcolor: "#f8fafc", color: "#6b7280", fontWeight: 900, letterSpacing: 1, fontSize: 13, borderBottom: "1px solid #eef2f7" }}>
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8, color: "#94a3b8" }}>
                    {tab === "repunch" ? "No repunch-pending orders." : "No RTO orders pending."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const phone = row.contactNumber || row.customerAddress?.phone || "";
                  const pay = paymentLabel(row);
                  const id = orderKey(row);
                  return (
                    <TableRow key={row.id || id} hover sx={{ "& td": { borderBottom: "1px solid #f1f5f9", py: 1.7 } }}>
                      <TableCell sx={{ color: "#475569", fontWeight: 800, whiteSpace: "nowrap" }}>
                        <Stack direction="row" gap={0.5} alignItems="center">
                          {row.orderName || row.orderId || "-"}
                          <Tooltip title="Copy order ref">
                            <IconButton size="small" onClick={() => copyValue(row.orderName || row.orderId, "Order ref")} sx={{ opacity: 0.25, "&:hover": { opacity: 1 } }}>
                              <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: "#475569", fontWeight: 700, whiteSpace: "nowrap" }}>{formatDate(row.orderDate)}</TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Typography sx={{ color: "#111827", fontWeight: 800, fontSize: 15 }}>{row.customerName || "-"}</Typography>
                        <Typography sx={{ color: "#9ca3af", fontWeight: 700, fontSize: 14 }}>{phone || "-"}</Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 230 }}>
                        <Typography sx={{ color: "#475569", fontWeight: 700, fontSize: 15 }}>{row.courier || "-"}</Typography>
                        <Typography sx={{ color: "#9ca3af", fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>{row.trackingNumber || "-"}</Typography>
                      </TableCell>
                      <TableCell sx={{ color: "#111827", fontWeight: 900, fontSize: 16, whiteSpace: "nowrap" }}>{formatCurrency(row.amount)}</TableCell>
                      <TableCell>
                        <Chip label={pay} size="small" sx={{ ...paymentChipSx(pay), height: 24, borderRadius: "999px", fontWeight: 900, fontSize: 12 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {tab === "initiated" ? (
                          <Button
                            variant="contained"
                            disabled={updatingId === id}
                            onClick={() => setConfirmRow(row)}
                            sx={{
                              bgcolor: "#ed0011",
                              borderRadius: 1.5,
                              boxShadow: "none",
                              textTransform: "none",
                              fontWeight: 900,
                              fontSize: 15,
                              px: 2.5,
                              "&:hover": { bgcolor: "#c9000e", boxShadow: "none" },
                            }}
                          >
                            {updatingId === id ? "Marking..." : "Mark RTO Received"}
                          </Button>
                        ) : null}
                        <Button
                          variant="contained"
                          onClick={() => openRepunchDrawer(row)}
                          sx={{
                            ml: 1,
                            bgcolor: "#4f35f2",
                            borderRadius: 1.5,
                            boxShadow: "none",
                            textTransform: "none",
                            fontWeight: 900,
                            fontSize: 15,
                            px: 2.5,
                            "&:hover": { bgcolor: "#4328df", boxShadow: "none" },
                          }}
                        >
                          Repunch
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
          count={total}
          page={page}
          onPageChange={(_event, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[20, 50, 100]}
        />
      </Paper>

      {notice ? (
        <Box sx={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", bgcolor: "#111827", color: "#fff", px: 2, py: 1, borderRadius: 2, zIndex: 2000 }}>
          {notice}
        </Box>
      ) : null}

      <MarkRtoReceivedDialog
        row={confirmRow}
        loading={Boolean(updatingId)}
        onClose={() => {
          if (!updatingId) setConfirmRow(null);
        }}
        onConfirm={markRtoReceived}
      />

      <RepunchOrderDrawer
        row={repunchRow}
        paymentMethod={repunchPaymentMethod}
        onPaymentMethodChange={setRepunchPaymentMethod}
        partialPaidAmount={partialPaidAmount}
        onPartialPaidAmountChange={setPartialPaidAmount}
        transactionId={transactionId}
        onTransactionIdChange={setTransactionId}
        shippingAmount={shippingAmount}
        onShippingAmountChange={setShippingAmount}
        loading={repunching}
        onClose={closeRepunchDrawer}
        onSubmit={repunchOrder}
      />
    </Box>
  );
}

function RepunchOrderDrawer({
  row,
  paymentMethod,
  onPaymentMethodChange,
  partialPaidAmount,
  onPartialPaidAmountChange,
  transactionId,
  onTransactionIdChange,
  shippingAmount,
  onShippingAmountChange,
  loading,
  onClose,
  onSubmit,
}) {
  const orderRef = row?.orderName || row?.orderId || "-";
  const products = Array.isArray(row?.products) ? row.products : [];
  const amount = Number(row?.amount || 0);
  const shipping = Number(shippingAmount || 0);
  const total = Math.max(0, amount + shipping);
  const partialPaid = Number(partialPaidAmount || 0);
  const alreadyPaid = paymentMethod === "Prepaid" ? total : paymentMethod === "Partial Paid" ? partialPaid : 0;
  const pendingAmount = paymentMethod === "Partial Paid" ? Math.max(0, total - partialPaid) : 0;
  const address = row?.customerAddress || {};
  const nameParts = String(row?.customerName || address.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");
  const paymentChip = paymentMethod === "COD" ? "Cash on Delivery" : paymentMethod;

  return (
    <Drawer
      anchor="right"
      open={Boolean(row)}
      onClose={onClose}
      ModalProps={{
        BackdropProps: {
          sx: { bgcolor: "rgba(17, 24, 39, 0.42)" },
        },
      }}
      PaperProps={{
        sx: {
          width: { xs: "100%", md: "36.9vw" },
          minWidth: { md: 660 },
          maxWidth: "100vw",
          bgcolor: "#f8fafc",
          boxShadow: "-10px 0 30px rgba(15, 23, 42, 0.14)",
        },
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3.5, py: 2.1, bgcolor: "#fff", borderBottom: "1px solid #e5e7eb", minHeight: 74 }}>
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
            <Typography sx={{ color: "#111827", fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>
              Repunch Order <Box component="span" sx={{ color: "#4f35f2" }}>{orderRef}</Box>
            </Typography>
            <Chip label={paymentChip} sx={paymentBadgeSx} />
          </Stack>
          <IconButton onClick={onClose} sx={{ color: "#9ca3af", mr: -1 }}>
            <CloseRoundedIcon sx={{ fontSize: 30 }} />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflow: "auto", px: 3.5, py: 3 }}>
          <RepunchSection>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={drawerSectionTitleSx}>Order Being Repunched</Typography>
              <Chip label={paymentChip} sx={paymentBadgeSx} />
            </Stack>
            <Box sx={{ bgcolor: "#f9fafb", borderRadius: 2, px: 2.2, py: 1.7 }}>
              <DrawerDetail label="Order Ref" value={orderRef} />
              <DrawerDetail label="Order Total" value={formatCurrency(amount)} />
              <DrawerDetail label="Already Paid" value={formatCurrency(alreadyPaid)} />
              {paymentMethod === "Partial Paid" ? <DrawerDetail label="Pending COD" value={formatCurrency(pendingAmount)} /> : null}
            </Box>
          </RepunchSection>

          <RepunchSection>
            <Typography sx={drawerSectionTitleSx}>Products</Typography>
            {products.length ? products.map((product, index) => (
              <Stack key={`${product.sku || product.title || "product"}-${index}`} direction="row" alignItems="center" gap={2} sx={{ mt: 3.2 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: "#111827", fontSize: 17, fontWeight: 900, lineHeight: 1.25 }}>{product.title || "-"}</Typography>
                  <Typography sx={{ color: "#667085", fontSize: 16, fontFamily: "monospace", lineHeight: 1.35 }}>{product.sku || "-"}</Typography>
                </Box>
                <Typography sx={{ color: "#667085", fontSize: 18, minWidth: 48, textAlign: "center" }}>x{product.quantity || 1}</Typography>
                <Typography sx={{ color: "#111827", fontSize: 18, fontWeight: 900, minWidth: 108, textAlign: "right" }}>
                  {formatCurrency(Number(product.price || 0) * Number(product.quantity || 1) || amount)}
                </Typography>
              </Stack>
            )) : (
              <Typography sx={{ mt: 2, color: "#94a3b8", fontWeight: 700 }}>No products found</Typography>
            )}
          </RepunchSection>

          <RepunchSection>
            <Typography sx={drawerSectionTitleSx}>Payment</Typography>
            <DrawerDetail label="Repunched Order Amount" value={formatCurrency(amount)} sx={{ mt: 2 }} />
            <Typography sx={drawerLinkSx}>+ Add discount</Typography>
            <Typography sx={drawerLinkSx}>- Remove shipping</Typography>
            <Stack direction="row" alignItems="center" gap={1.4} sx={{ mt: 1.5 }}>
              <TextField fullWidth size="small" value="Free shipping" InputProps={readOnlyInputProps} sx={drawerInputSx} />
              <Typography sx={{ color: "#94a3b8", fontSize: 20, fontWeight: 800 }}>₹</Typography>
              <TextField
                size="small"
                value={shippingAmount}
                onChange={(event) => onShippingAmountChange(event.target.value)}
                sx={{ ...drawerInputSx, width: 138 }}
                inputProps={{ inputMode: "decimal" }}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} gap={1.5} sx={{ mt: 1.5 }}>
              <Typography sx={{ color: "#475569", fontSize: 17, fontWeight: 800, minWidth: 150 }}>Payment Method</Typography>
              <Select
                size="small"
                value={paymentMethod}
                onChange={(event) => {
                  onPaymentMethodChange(event.target.value);
                  if (event.target.value !== "Partial Paid") onPartialPaidAmountChange("");
                  if (event.target.value === "COD") onTransactionIdChange("");
                }}
                sx={{ ...drawerInputSx, flex: 1 }}
              >
                <MenuItem value="COD">COD</MenuItem>
                <MenuItem value="Prepaid">Prepaid</MenuItem>
                <MenuItem value="Partial Paid">Partial Paid</MenuItem>
              </Select>
            </Stack>
            {paymentMethod === "Partial Paid" ? (
              <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Partial Paid Amount"
                  value={partialPaidAmount}
                  onChange={(event) => onPartialPaidAmountChange(event.target.value)}
                  sx={drawerInputSx}
                  inputProps={{ inputMode: "decimal" }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Transaction ID"
                  value={transactionId}
                  onChange={(event) => onTransactionIdChange(event.target.value)}
                  sx={drawerInputSx}
                />
              </Stack>
            ) : null}
            {paymentMethod === "Prepaid" ? (
              <TextField
                fullWidth
                size="small"
                label="Transaction ID"
                value={transactionId}
                onChange={(event) => onTransactionIdChange(event.target.value)}
                sx={{ ...drawerInputSx, mt: 1.5 }}
              />
            ) : null}
            <Box sx={{ borderTop: "1px solid #e5e7eb", mt: 2.1, pt: 1.8 }}>
              <DrawerDetail label="Total" value={formatCurrency(total)} strong />
            </Box>
          </RepunchSection>

          <RepunchSection>
            <Typography sx={drawerSectionTitleSx}>Customer</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mt: 2 }}>
              <TextField fullWidth size="small" value={firstName} InputProps={readOnlyInputProps} sx={drawerInputSx} />
              <TextField fullWidth size="small" value={lastName} InputProps={readOnlyInputProps} sx={drawerInputSx} />
            </Stack>
            <Stack gap={1.2} sx={{ mt: 1.2 }}>
              <TextField size="small" value={row?.email || ""} placeholder="Email" InputProps={readOnlyInputProps} sx={drawerInputSx} />
              <TextField size="small" value={row?.contactNumber || address.phone || ""} InputProps={readOnlyInputProps} sx={drawerInputSx} />
              <TextField size="small" value={address.address1 || ""} placeholder="Address line 1" InputProps={readOnlyInputProps} sx={drawerInputSx} />
              <TextField size="small" value={address.address2 || ""} placeholder="Address line 2 (optional)" InputProps={readOnlyInputProps} sx={drawerInputSx} />
              <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                <TextField fullWidth size="small" value={address.city || ""} placeholder="City" InputProps={readOnlyInputProps} sx={drawerInputSx} />
                <TextField size="small" value={address.zip || ""} placeholder="Pincode" InputProps={readOnlyInputProps} sx={{ ...drawerInputSx, width: { xs: "100%", sm: 150 } }} />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                <TextField fullWidth size="small" value={address.province || ""} placeholder="State" InputProps={readOnlyInputProps} sx={drawerInputSx} />
                <TextField fullWidth size="small" value={address.country || "India"} placeholder="Country" InputProps={readOnlyInputProps} sx={drawerInputSx} />
              </Stack>
            </Stack>
          </RepunchSection>
        </Box>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3.5, py: 2.2, bgcolor: "#fff", borderTop: "1px solid #e5e7eb", minHeight: 88 }}>
          <Typography sx={{ color: "#667085", fontSize: 18, fontWeight: 700 }}>Total {formatCurrency(total)}</Typography>
          <Stack direction="row" gap={1.4}>
            <Button onClick={onClose} disabled={loading} variant="outlined" sx={drawerCancelButtonSx}>Cancel</Button>
            <Button onClick={onSubmit} disabled={loading} variant="contained" sx={drawerSubmitButtonSx}>
              {loading ? "Repunching..." : "Repunch Order"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}

function MarkRtoReceivedDialog({ row, loading, onClose, onConfirm }) {
  const phone = row?.contactNumber || row?.customerAddress?.phone || "";
  const orderRef = row?.orderName || row?.orderId || "-";

  return (
    <Dialog
      open={Boolean(row)}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
        },
      }}
    >
      <DialogContent sx={{ px: 3, pt: 3, pb: 2 }}>
        <Typography sx={{ color: "#111827", fontWeight: 900, fontSize: 24, mb: 1 }}>
          Mark RTO Received?
        </Typography>
        <Typography sx={{ color: "#667085", fontSize: 18, lineHeight: 1.45, mb: 3 }}>
          Confirm this is the correct order before proceeding.
        </Typography>

        <Box sx={{ bgcolor: "#f8fafc", borderRadius: 2, px: 2.5, py: 2 }}>
          <ConfirmDetail label="Order Ref" value={orderRef} />
          <ConfirmDetail label="Customer" value={row?.customerName || "-"} />
          <ConfirmDetail label="Courier" value={row?.courier || "-"} />
          <ConfirmDetail label="AWB" value={row?.trackingNumber || "-"} mono />
          {phone ? <ConfirmDetail label="Phone" value={phone} /> : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pt: 0, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            borderColor: "#d9dee7",
            color: "#475569",
            textTransform: "none",
            fontWeight: 800,
            fontSize: 16,
            px: 2.5,
            height: 44,
            "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          sx={{
            borderRadius: 1.5,
            bgcolor: "#ed0011",
            boxShadow: "none",
            textTransform: "none",
            fontWeight: 900,
            fontSize: 16,
            px: 2.5,
            height: 44,
            "&:hover": { bgcolor: "#c9000e", boxShadow: "none" },
          }}
        >
          {loading ? "Confirming..." : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ConfirmDetail({ label, value, mono = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2} sx={{ py: 0.45 }}>
      <Typography sx={{ color: "#667085", fontSize: 16, fontWeight: 700 }}>{label}</Typography>
      <Typography
        sx={{
          color: "#111827",
          fontSize: 17,
          fontWeight: 800,
          textAlign: "right",
          fontFamily: mono ? "monospace" : "inherit",
          overflowWrap: "anywhere",
        }}
      >
        {value || "-"}
      </Typography>
    </Stack>
  );
}

function RepunchSection({ children }) {
  return (
    <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, bgcolor: "#fff", px: 2.5, py: 2.45, mb: 2.35 }}>
      {children}
    </Paper>
  );
}

function DrawerDetail({ label, value, strong = false, sx = {} }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2} sx={{ py: 0.38, ...sx }}>
      <Typography sx={{ color: strong ? "#111827" : "#667085", fontSize: strong ? 18 : 17, fontWeight: strong ? 900 : 700 }}>{label}</Typography>
      <Typography sx={{ color: "#111827", fontSize: strong ? 18 : 17, fontWeight: strong ? 900 : 800, textAlign: "right", overflowWrap: "anywhere" }}>
        {value || "-"}
      </Typography>
    </Stack>
  );
}

function FieldLabel({ children }) {
  return (
    <Typography sx={{ color: "#7b8494", fontWeight: 700, fontSize: 13, mb: 0.6 }}>
      {children}
    </Typography>
  );
}

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    borderRadius: 1.5,
    height: 42,
    fontSize: 16,
    color: "#111827",
  },
};

const dateInputSx = {
  minWidth: 180,
  ...inputSx,
};

const secondaryButtonSx = {
  height: 42,
  borderRadius: 1.5,
  borderColor: "#e5e7eb",
  color: "#64748b",
  textTransform: "none",
  fontWeight: 800,
  px: 2,
  fontSize: 16,
  "&:hover": { borderColor: "#d1d5db", bgcolor: "#f8fafc" },
};

const excelButtonSx = {
  ...secondaryButtonSx,
  bgcolor: "#ecfdf5",
  borderColor: "#bbf7d0",
  color: "#059669",
  "&:hover": { borderColor: "#86efac", bgcolor: "#dcfce7" },
};

const drawerSectionTitleSx = {
  color: "#1f2937",
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1.25,
};

const drawerLinkSx = {
  color: "#4f35f2",
  fontSize: 17,
  fontWeight: 800,
  mt: 1.2,
};

const drawerInputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    borderRadius: 1,
    minHeight: 41,
    fontSize: 17,
    color: "#111827",
    "& fieldset": { borderColor: "#d7dde7" },
    "&:hover fieldset": { borderColor: "#cbd5e1" },
  },
  "& .MuiInputBase-input": { py: 1.05 },
  "& .MuiSelect-select": {
    py: 1.15,
  },
};

const readOnlyInputProps = {
  readOnly: true,
};

const drawerCancelButtonSx = {
  height: 52,
  borderRadius: 1.3,
  borderColor: "#cbd5e1",
  color: "#475569",
  textTransform: "none",
  fontWeight: 800,
  fontSize: 17,
  px: 3,
  minWidth: 112,
  "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
};

const drawerSubmitButtonSx = {
  height: 52,
  borderRadius: 1.3,
  bgcolor: "#111827",
  color: "#fff",
  boxShadow: "none",
  textTransform: "none",
  fontWeight: 900,
  fontSize: 17,
  px: 3,
  minWidth: 170,
  "&:hover": { bgcolor: "#020617", boxShadow: "none" },
};

const paymentBadgeSx = {
  bgcolor: "#fef3c7",
  color: "#c2410c",
  fontWeight: 900,
  fontSize: 14,
  height: 30,
  borderRadius: "999px",
  "& .MuiChip-label": { px: 1.4 },
};

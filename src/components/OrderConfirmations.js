// src/components/OrderConfirmations.jsx
import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  Snackbar,
  Alert,
  CircularProgress,
  Collapse,
  Divider,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PhoneIcon from "@mui/icons-material/Phone";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LaunchIcon from "@mui/icons-material/Launch";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ScheduleCallDialog from "./ScheduleCallDialog";
import axios from "axios";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const CREATE_PAYMENT_LINK_URL =
  "https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/create-payment-link";

const CALL_STATUS = [
  { value: "CNP", label: "CNP" },
  { value: "ORDER_CONFIRMED", label: "Order Confirmed" },
  { value: "CALL_BACK_LATER", label: "Call Back Later" },
  { value: "CANCEL_ORDER", label: "Cancel Order" },
];

const LANGUAGE_OPTIONS = ["English", "Hindi", "Malayalam", "Kannada", "Telugu", "Marathi"];

const theme = createTheme({
  palette: { primary: { main: "#000000" } },
  components: {
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          paddingInline: 14,
          "&.Mui-selected": {
            fontWeight: 700,
            borderColor: "#000000",
            backgroundColor: "rgba(0,0,0,0.08)",
          },
        },
      },
    },
  },
});

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { hour12: true });
};

const currency = (amt, curr = "INR") =>
  typeof amt === "number"
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: curr }).format(amt)
    : "";

const copyToClipboard = async (text, onDone) => {
  try {
    await navigator.clipboard.writeText(text || "");
    onDone?.(true);
  } catch {
    onDone?.(false);
  }
};

const telHref = (num) => (num ? `tel:${num}` : undefined);

// debounce
function useDebouncedValue(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const statusValueToLabel = (val) => {
  const found = CALL_STATUS.find((s) => s.value === val);
  return found ? found.label : String(val || "");
};

// small guard for phone (Razorpay is okay with 10-digit Indian contact)
const toTenDigits = (num) => {
  if (!num) return "";
  const d = String(num).replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
};

export default function OrderConfirmations() {
  const [items, setItems] = useState([]);
  const [section, setSection] = useState("pending"); // "pending" | "confirmed"
  const [page, setPage] = useState(0); // TablePagination is 0-based; API is 1-based
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 500);
  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });
  const [agents, setAgents] = useState([]);
  const [savingRow, setSavingRow] = useState({});
  const [cancelingRow, setCancelingRow] = useState({}); // NEW: per-row cancel loading
  const [openRow, setOpenRow] = useState({}); // collapsible details row toggle 
  const [scheduleDlg, setScheduleDlg] = useState({ open: false, row: null });

  const isConfirmed = section === "confirmed";

  // Payment dialog state
  const [payDlg, setPayDlg] = useState({
    open: false,
    rowId: null,
    orderName: "",
    customerName: "",
    customerEmail: "",
    contact: "",
    currency: "INR",
    amount: "",
    generating: false,
    link: "",
  });

  const fetchAgents = useCallback(async () => {
  try {
    const { data } = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees");
    const filtered = Array.isArray(data)
      ? data.filter(
          (a) =>
            !!a?.isDoctor && (a?.status === "active" || a?.status === "Active")
        )
      : [];

    setAgents(
      filtered.map((a) => ({
        id: a?._id || a?.id || a?.email || a?.name,
        label: a?.fullName || a?.name || a?.email || String(a?._id || ""),
      }))
    );
  } catch (e) {
    console.error("Failed to fetch agents", e);
  }
}, []);

  const fetchList = useCallback(
    async (pageZeroBased = 0, limit = rowsPerPage) => {
      try {
        setLoading(true);
        const { data } = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/list", {
          params: {
            section,
            page: pageZeroBased + 1, // API is 1-based
            limit,
            q: qDebounced,
            // Only restrict to financial=pending on the Pending tab
            financial: isConfirmed ? "any" : "pending",
          },
        });

        let rows = data?.items || [];
        // Keep the old client-side guard only for the pending tab
        if (!isConfirmed) {
          rows = rows.filter((r) => String(r?.financial_status || "").toLowerCase() === "pending");
        }

        setTotal(typeof data?.total === "number" ? data.total : rows.length);
        setItems(rows);
      } catch (e) {
        console.error("fetchList error", e);
        setToast({ open: true, severity: "error", msg: "Failed to fetch orders" });
      } finally {
        setLoading(false);
      }
    },
    [qDebounced, rowsPerPage, section, isConfirmed]
  );

  const syncNewAndRefresh = useCallback(async () => {
    try {
      setSyncing(true);
      const { data } = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders-shopify/sync-new");
      const stats = data || {};
      const parts = [];
      ["inserted", "updated", "processed", "fetched", "upserts", "total"].forEach((k) => {
        if (typeof stats[k] === "number") parts.push(`${k}: ${stats[k]}`);
      });
      setToast({
        open: true,
        severity: "success",
        msg: parts.length ? `Synced (${parts.join(", ")})` : "Synced new orders",
      });

      await fetchList(page, rowsPerPage);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Sync failed";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setSyncing(false);
    }
  }, [fetchList, page, rowsPerPage]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    setPage(0);
    fetchList(0, rowsPerPage);
  }, [section, qDebounced]); // eslint-disable-line

  const handleChangePage = (_e, newPage) => {
    setPage(newPage);
    fetchList(newPage, rowsPerPage);
  };

  const openScheduleDialog = (row) => setScheduleDlg({ open: true, row });
 const closeScheduleDialog = () => setScheduleDlg({ open: false, row: null });
 
  const submitSchedule = async (payload) => {
    // payload contains: doctorCallNeeded, assignedExpert, scheduleCallAt, scheduleCallNotes
    const id = scheduleDlg.row?._id;
    if (!id) return;
    const updated = await patchOrder(id, payload, "Call scheduled");
    // reflect in UI
    setItems((rows) =>
      rows.map((r) =>
        r._id === id ? { ...r, orderConfirmOps: { ...(r.orderConfirmOps || {}), ...(updated?.orderConfirmOps || {}) } } : r
      )
    );
  };

  const handleChangeRowsPerPage = (e) => {
    const newRpp = parseInt(e.target.value, 10);
    setRowsPerPage(newRpp);
    setPage(0);
    fetchList(0, newRpp);
  };

  const setRowSaving = (id, yes) => setSavingRow((s) => ({ ...s, [id]: yes }));

  const patchOrder = async (id, payload, msgOnSuccess = "Saved") => {
    try {
      setRowSaving(id, true);
      const { data } = await axios.patch(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/${id}`, payload);
      setItems((rows) =>
        rows.map((r) =>
          String(r._id) === String(id)
            ? { ...r, orderConfirmOps: { ...(r.orderConfirmOps || {}), ...(data?.orderConfirmOps || {}) } }
            : r
        )
      );
      setToast({ open: true, severity: "success", msg: msgOnSuccess });
      return data; // updated ops
    } catch (e) {
      console.error("patchOrder error", e);
      const apiMsg = e?.response?.data?.error;
      setToast({ open: true, severity: "error", msg: apiMsg || "Failed to save" });
      throw e;
    } finally {
      setRowSaving(id, false);
    }
  };

  const statusToNote = (val) => statusValueToLabel(val);

  const handleShopifyNotesChange = async (row, newValue) => {
    const label = statusToNote(newValue);
    try {
      await patchOrder(row._id, { callStatus: newValue }, "Status updated");
      if (section === "pending" && String(newValue).toUpperCase() === "ORDER_CONFIRMED") {
        setItems((rows) => rows.filter((r) => r._id !== row._id));
        setTotal((t) => Math.max(0, t - 1));
      }
    } catch {
      return;
    }

    try {
      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/order-confirmations/shopify-notes", {
        orderName: row.orderName,
        note: label,
      });
      setToast({ open: true, severity: "success", msg: "Shopify note updated" });
      setItems((rows) =>
        rows.map((r) =>
          r._id === row._id ? { ...r, orderConfirmOps: { ...(r.orderConfirmOps || {}), shopifyNotes: label } } : r
        )
      );
    } catch (e) {
      console.error("shopify-notes push error", e?.response?.data || e.message);
      const msg = e?.response?.data?.error || "Failed to update Shopify note";
      setToast({ open: true, severity: "error", msg });
    }
  };
  
  const cancelOrderOnShopify = async (row) => {
    const id = row._id; 
    try { 
      setCancelingRow((m) => ({ ...m, [id]: true }));

      // Hit your backend order-cancel/return automation
      const { data } = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/orders/update-order", {
        orderName: row.orderName,          // router resolves with/without '#'
        quantity: 1,                       // adjust if needed
        returnReason: "OTHER",
        returnReasonNote: "Cancelled via Order Confirmations UI",
      });

      // Handle success/failure reported by the endpoint
      if (data?.success) {
        setToast({ open: true, severity: "success", msg: "Order cancellation request created" });

        // Mirror in our OC system: set Shopify Notes → CANCEL_ORDER (and update callStatus)
        await handleShopifyNotesChange(row, "CANCEL_ORDER");
      } else {
        const errMsg =
          data?.result?.message ||
          data?.message ||
          "Cancel operation failed on server";
        setToast({ open: true, severity: "error", msg: errMsg });
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Cancel operation failed";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setCancelingRow((m) => ({ ...m, [id]: false }));
    }
  };

  // -------------------------------
  // Payment Link: Dialog + Handlers
  // -------------------------------
  const openPaymentDialog = (row) => {
    setPayDlg({
      open: true,
      rowId: row._id,
      orderName: row.orderName || "",
      customerName: row.customerName || "",
      customerEmail: row.customerEmail || "",
      contact: toTenDigits(row.contactNumber || row?.customerAddress?.phone || ""),
      currency: "INR",
      amount: typeof row.amount === "number" ? row.amount : "",
      generating: false,
      link: "",
    });
  };

  const closePaymentDialog = () => setPayDlg((s) => ({ ...s, open: false }));

  const generateAndShareLink = async () => {
    const { rowId, amount, currency, customerName, customerEmail, contact } = payDlg;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setToast({ open: true, severity: "error", msg: "Enter a valid amount" });
      return;
    }
    if (!contact || contact.length !== 10) {
      setToast({ open: true, severity: "error", msg: "Customer phone must be 10 digits" });
      return;
    }

    try {
      setPayDlg((s) => ({ ...s, generating: true }));
      const { data } = await axios.post(CREATE_PAYMENT_LINK_URL, {
        amount: amt,
        currency: currency || "INR",
        customer: { name: customerName || "Customer", email: customerEmail || "", contact },
      });
      const shortUrl = data?.paymentLink;
      if (!shortUrl) throw new Error("No payment link returned");

      await patchOrder(rowId, { paymentLink: shortUrl }, "Payment link saved");
      setPayDlg((s) => ({ ...s, link: shortUrl, generating: false }));
      setToast({ open: true, severity: "success", msg: "Link generated & shared via SMS" });
    } catch (e) {
      console.error("Generate payment link failed:", e);
      const msg =
        e?.response?.data?.message || e?.response?.data?.error || e?.message || "Failed to generate payment link";
      setToast({ open: true, severity: "error", msg });
      setPayDlg((s) => ({ ...s, generating: false }));
    }
  };

  const copyPaymentLink = () => {
    if (!payDlg.link) return;
    copyToClipboard(payDlg.link, (ok) =>
      setToast({ open: true, severity: ok ? "success" : "error", msg: ok ? "Link copied" : "Copy failed" })
    );
  };

  // Helpers for read-only chip text in Confirmed tab
  const renderReadOnlyCallStatus = (val) => {
    const label = statusValueToLabel(val) || "-";
    return <Chip size="small" label={label} />;
  };

  return (
    <ThemeProvider theme={theme}>
      <Box>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6" fontWeight={700}>
              {isConfirmed ? "Order Confirmation — Confirmed" : "Order Confirmation — Pending"}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant={isConfirmed ? "outlined" : "contained"}
                color="primary"
                startIcon={<DoneAllIcon />}
                onClick={() => setSection((s) => (s === "pending" ? "confirmed" : "pending"))}
              >
                {isConfirmed ? "View Pending Orders" : "View Confirmed Orders"}
              </Button>
              <Tooltip title="Refresh">
                <span>
                  <IconButton onClick={syncNewAndRefresh} disabled={loading || syncing} color="primary">
                    {syncing ? <CircularProgress size={18} /> : <RefreshIcon />}
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
                <TableCell>S. No.</TableCell>
                <TableCell>Date & Time</TableCell>
                {isConfirmed && <TableCell>OC Date &amp; Time</TableCell>}
                <TableCell>Order Name</TableCell>
                <TableCell>Mobile</TableCell>
                {!isConfirmed && <TableCell>Address</TableCell>}
                <TableCell>Products Ordered</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell width={240}>Shopify Notes</TableCell>
                {isConfirmed && <TableCell>Shipment Status</TableCell>}
                {isConfirmed && <TableCell>Tracking ID</TableCell>}
                <TableCell align="center">More</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {items.map((row, idx) => {
                const ops = row.orderConfirmOps || {};
                const rowSaving = !!savingRow[row._id];
                const isOpen = !!openRow[row._id];
                const serial = page * rowsPerPage + idx + 1;
                const shipping = row.shipping || {};
                const tracking = shipping.tracking_number || "-";
                const shipmentStatus = shipping.shipment_status || "-";

                return (
                  <React.Fragment key={row._id}>
                    <TableRow hover>
                      {/* S. No. */}
                      <TableCell>{serial}</TableCell>

                      {/* Date / Time */}
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">
                            {formatDateTime(row.orderDate || row.createdAt)}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* OC Date & Time (Confirmed tab only) */}
                      {isConfirmed && (
                        <TableCell>
                          <Typography variant="body2">
                            {ops.callStatusUpdatedAt ? formatDateTime(ops.callStatusUpdatedAt) : "-"}
                          </Typography>
                        </TableCell>
                      )}

                      {/* Order Name */}
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" fontWeight={600}>
                            {row.orderName || "-"}
                          </Typography>
                          {row.customerName ? (
                            <Chip size="small" label={row.customerName} variant="outlined" />
                          ) : null}
                        </Stack>
                      </TableCell>

                      {/* Mobile (copy + call) */}
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">{row.contactNumber || "-"}</Typography>
                          <Tooltip title="Copy">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() =>
                                  copyToClipboard(row.contactNumber, (ok) =>
                                    setToast({
                                      open: true,
                                      severity: ok ? "success" : "error",
                                      msg: ok ? "Copied" : "Copy failed",
                                    })
                                  )
                                }
                              >
                                <ContentCopyIcon fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Call">
                            <span>
                              <IconButton
                                size="small"
                                component="a"
                                href={telHref(row.contactNumber)}
                                color="primary"
                              >
                                <PhoneIcon fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>

                      {/* Address (hidden on Confirmed) */}
                      {!isConfirmed && (
                        <TableCell sx={{ whiteSpace: "normal", lineHeight: 1.3, maxWidth: 360 }}>
                          <Typography variant="body2">
                            {[
                              row?.customerAddress?.address1,
                              row?.customerAddress?.address2,
                              row?.customerAddress?.city,
                              row?.customerAddress?.province,
                              row?.customerAddress?.zip,
                              row?.customerAddress?.country,
                            ]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </Typography>
                        </TableCell>
                      )}

                      {/* Products */}
                      <TableCell sx={{ whiteSpace: "normal", lineHeight: 1.3, maxWidth: 360 }}>
                        <Typography variant="body2">
                          {Array.isArray(row?.productsOrdered) && row.productsOrdered.length
                            ? row.productsOrdered
                                .map((p) => `${p?.title || ""}${p?.quantity ? ` ×${p.quantity}` : ""}`)
                                .join(", ")
                            : "-"}
                        </Typography>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <Typography variant="body2">{currency(row.amount, row.currency || "INR")}</Typography>
                      </TableCell>

                      {/* Shopify Notes */}
                      <TableCell>
                        <Stack spacing={0.5}>
                          {isConfirmed ? (
                            // Read-only display on Confirmed
                            <>
                              {renderReadOnlyCallStatus(ops.callStatus)}
                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {ops.callStatusUpdatedAt
                                  ? `Updated: ${formatDateTime(ops.callStatusUpdatedAt)}`
                                  : "Not updated yet"}
                              </Typography>
                            </>
                          ) : (
                            // Editable on Pending
                            <>
                              <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel id={`call-status-${row._id}`}>Shopify Notes</InputLabel>
                                <Select
                                  labelId={`call-status-${row._id}`}
                                  label="Shopify Notes"
                                  value={ops.callStatus || ""}
                                  onChange={(e) => handleShopifyNotesChange(row, e.target.value)}
                                  disabled={rowSaving}
                                >
                                  {CALL_STATUS.map((cs) => (
                                    <MenuItem key={cs.value} value={cs.value}>
                                      {cs.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {ops.callStatusUpdatedAt
                                  ? `Updated: ${formatDateTime(ops.callStatusUpdatedAt)}`
                                  : "Not updated yet"}
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </TableCell>

                      {/* Shipment Status & Tracking (Confirmed only) */}
                      {isConfirmed && (
                        <TableCell>
                          <Typography variant="body2" title={shipping.carrier_title || ""}>
                            {shipmentStatus}
                          </Typography>
                        </TableCell>
                      )}
                      {isConfirmed && (
                        <TableCell>
                          {tracking && tracking !== "-" ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2">{tracking}</Typography>
                            </Stack>
                          ) : (
                            <Typography variant="body2">-</Typography>
                          )}
                        </TableCell>
                      )}

                      {/* Expand / More */}
                      <TableCell align="center">
                        <IconButton
                          onClick={() => setOpenRow((s) => ({ ...s, [row._id]: !isOpen }))}
                          color="primary"
                          size="small"
                        >
                          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                    </TableRow>

                    {/* Collapsible details row */}
                    <TableRow>
                      <TableCell colSpan={isConfirmed ? 11 : 10} sx={{ py: 0, background: "rgba(0,0,0,0.02)" }}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2 }}>
                            {isConfirmed ? (
                              // -------- READ-ONLY DETAILS ON CONFIRMED --------
                              <Stack direction="row" spacing={3} alignItems="center" useFlexGap flexWrap="wrap">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    Doctor call needed
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={row?.orderConfirmOps?.doctorCallNeeded ? "Yes" : "No"}
                                    variant="outlined"
                                  />
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    Diet plan needed
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={row?.orderConfirmOps?.dietPlanNeeded ? "Yes" : "No"}
                                    variant="outlined"
                                  />
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    Language
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={row?.orderConfirmOps?.languageUsed || "-"}
                                    variant="outlined"
                                  />
                                </Stack>

                                <Divider flexItem orientation="vertical" />

                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    COD → Prepaid
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={row?.orderConfirmOps?.codToPrepaid ? "Yes" : "No"}
                                    variant="outlined"
                                  />

                                  {row?.orderConfirmOps?.paymentLink ? (
                                    <Tooltip title="Open payment link">
                                      <IconButton
                                        size="small"
                                        color="primary" 
                                        component="a"
                                        href={row.orderConfirmOps.paymentLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <LaunchIcon fontSize="inherit" />
                                      </IconButton>
                                    </Tooltip>
                                  ) : null}
                                </Stack>

                                {row?.orderConfirmOps?.assignedExpert ? (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" sx={{ minWidth: 140 }}>
                                      Assigned expert
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={row.orderConfirmOps.assignedExpert}
                                      variant="outlined"
                                    />
                                  </Stack>
                                ) : null}
                              </Stack>
                            ) : (
                              // -------- EDITABLE DETAILS ON PENDING --------
                              <Stack direction="row" spacing={3} alignItems="center" useFlexGap flexWrap="wrap">
                                {/* Doctor call needed */}
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    Doctor call needed
                                  </Typography>
                                  <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    color="primary"
                                    value={row?.orderConfirmOps?.doctorCallNeeded ? "yes" : "no"}
                                    onChange={(_, val) => {
                                      if (val === "yes") {
     // First mark doctorCallNeeded=true, then open the schedule popup
     patchOrder(row._id, { doctorCallNeeded: true }, "Saved")
       .then(() => openScheduleDialog(row))
       .catch(() => {});
   } else {
     // Turning off simply saves and (if open) closes any dialog
     patchOrder(row._id, { doctorCallNeeded: false }, "Saved").catch(() => {});
     closeScheduleDialog();
   }
                                    }}
                                  >
                                    <ToggleButton value="yes">Yes</ToggleButton>
                                    <ToggleButton value="no">No</ToggleButton>
                                  </ToggleButtonGroup>
                                </Stack>

                                 
                                {/* Diet Plan Needed */}
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    Diet plan needed
                                  </Typography>
                                  <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    color="primary"
                                    value={row?.orderConfirmOps?.dietPlanNeeded ? "yes" : "no"}
                                    onChange={(_, val) => {
                                      if (!val) return;
                                      patchOrder(row._id, { dietPlanNeeded: val === "yes" });
                                    }}
                                  >
                                    <ToggleButton value="yes">Yes</ToggleButton>
                                    <ToggleButton value="no">No</ToggleButton>
                                  </ToggleButtonGroup>
                                </Stack>

                                {/* Language (freeSolo) */}
                                <Autocomplete
                                  size="small"
                                  freeSolo
                                  options={LANGUAGE_OPTIONS}
                                  value={row?.orderConfirmOps?.languageUsed || ""}
                                  onInputChange={(_, val) => {
                                    setItems((rows) =>
                                      rows.map((r) =>
                                        r._id === row._id
                                          ? { ...r, orderConfirmOps: { ...(r.orderConfirmOps || {}), languageUsed: val } }
                                          : r
                                      )
                                    );
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    if (typeof val === "string") {
                                      patchOrder(row._id, { languageUsed: val });
                                    }
                                  }}
                                  renderInput={(params) => (
                                    <TextField {...params} label="Language" sx={{ minWidth: 200 }} />
                                  )}
                                />

                                <Divider flexItem orientation="vertical" />

                                {/* COD → Prepaid */}
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                                    COD → Prepaid
                                  </Typography>
                                  <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    color="primary"
                                    value={row?.orderConfirmOps?.codToPrepaid ? "yes" : "no"}
                                    onChange={(_, val) => {
                                      if (!val) return;
                                      patchOrder(row._id, { codToPrepaid: val === "yes" });
                                    }}
                                  >
                                    <ToggleButton value="yes">Yes</ToggleButton>
                                    <ToggleButton value="no">No</ToggleButton>
                                  </ToggleButtonGroup>

                                  {/* Right-side actions */}
                                  {row?.orderConfirmOps?.codToPrepaid ? (
                                    <>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<LinkOutlinedIcon />}
                                        onClick={() => openPaymentDialog(row)}
                                      >
                                        Generate Payment Link
                                      </Button>

                                      {row?.orderConfirmOps?.paymentLink ? (
                                        <Tooltip title="Open payment link">
                                          <IconButton
                                            size="small"
                                            color="primary"
                                            component="a"
                                            href={row.orderConfirmOps.paymentLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <LaunchIcon fontSize="inherit" />
                                          </IconButton>
                                        </Tooltip>
                                      ) : null}
                                    </>
                                  ) : null}

                                  {/* Cancel Order -> NEW: call backend cancel API first */}
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={
                                      cancelingRow[row._id] ? <CircularProgress size={16} /> : <CancelOutlinedIcon />
                                    }
                                    onClick={() => cancelOrderOnShopify(row)}
                                    disabled={!!cancelingRow[row._id]}
                                  >
                                    {cancelingRow[row._id] ? "Cancelling…" : "Cancel Order"}
                                  </Button>
                                </Stack>
                              </Stack>
                            )}

                            {/* Schedule Doctor Call Dialog */}
  <ScheduleCallDialog
    open={scheduleDlg.open}
    onClose={closeScheduleDialog}
    onSubmit={submitSchedule}
    agents={agents}
    row={scheduleDlg.row}
  />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}

              {loading && (
                <TableRow>
                  <TableCell colSpan={isConfirmed ? 11 : 10} align="center">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">Loading…</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_e, newPage) => {
              setPage(newPage);
              fetchList(newPage, rowsPerPage);
            }}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              const newRpp = parseInt(e.target.value, 10);
              setRowsPerPage(newRpp);
              setPage(0);
              fetchList(0, newRpp);
            }}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </TableContainer>

        {/* Toast */}
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

        {/* Generate Payment Link Dialog */}
        <Dialog open={payDlg.open} onClose={payDlg.generating ? undefined : closePaymentDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Generate Payment Link</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Amount (INR)"
                type="number"
                inputProps={{ min: 1, step: "0.01" }}
                value={payDlg.amount}
                onChange={(e) => setPayDlg((s) => ({ ...s, amount: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Customer Name"
                value={payDlg.customerName}
                onChange={(e) => setPayDlg((s) => ({ ...s, customerName: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Customer Phone (10 digits)"
                value={payDlg.contact}
                onChange={(e) => setPayDlg((s) => ({ ...s, contact: toTenDigits(e.target.value) }))}
                fullWidth
              />
              <TextField
                label="Customer Email (optional)"
                value={payDlg.customerEmail || ""}
                onChange={(e) => setPayDlg((s) => ({ ...s, customerEmail: e.target.value }))}
                fullWidth
              />
              {payDlg.link ? (
                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Payment Link
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField value={payDlg.link} size="small" fullWidth InputProps={{ readOnly: true }} />
                    <Tooltip title="Copy link">
                      <span>
                        <IconButton onClick={copyPaymentLink} color="primary">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Open link">
                      <span>
                        <IconButton
                          color="primary"
                          component="a"
                          href={payDlg.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    SMS has been sent to the customer via Razorpay.
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closePaymentDialog} disabled={payDlg.generating}>
              Close
            </Button>
            <Button variant="contained" onClick={generateAndShareLink} disabled={payDlg.generating}>
              {payDlg.generating ? "Generating…" : "Generate & Share"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider> 
  );
}


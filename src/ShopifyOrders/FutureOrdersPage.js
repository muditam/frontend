import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const rawUser = sessionStorage.getItem("user");
  if (rawUser) {
    config.headers = config.headers || {};
    config.headers["x-session-user"] = rawUser;
  }
  return config;
});

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

function productSummary(items = []) {
  if (!Array.isArray(items) || items.length === 0) return "-";
  return items
    .map((item) => {
      const label = item.sku || item.title || "Product";
      return `${label} x${Number(item.quantity || 0)}`;
    })
    .join(", ");
}

function addressSummary(address = {}) {
  return [
    address.address1,
    address.address2,
    address.city,
    address.province,
    address.zip,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

export default function FutureOrdersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [placingId, setPlacingId] = useState("");

  const params = useMemo(
    () => ({
      page: page + 1,
      limit: rowsPerPage,
      search,
      status,
    }),
    [page, rowsPerPage, search, status]
  );

  const fetchRows = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/future-orders", { params, signal });
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || axios.isCancel?.(err)) return;
      console.error("Failed to load future orders", err);
      setError(err?.response?.data?.message || "Failed to load future orders.");
      setRows([]);
      setTotal(0);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRows(controller.signal);
    return () => controller.abort();
  }, [fetchRows]);

  const placeOrderNow = async () => {
    if (!confirmOrder?._id) return;
    setPlacingId(confirmOrder._id);
    setError("");
    try {
      await api.post(`/api/future-orders/${confirmOrder._id}/place`);
      setConfirmOrder(null);
      await fetchRows();
    } catch (err) {
      console.error("Failed to place future order", err);
      setError(err?.response?.data?.message || "Failed to place future order.");
    } finally {
      setPlacingId("");
    }
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "#f6f8fb", p: { xs: 1.5, md: 3 } }}>
      <Paper elevation={0} sx={{ border: "1px solid #dbe5ec", borderRadius: 2, overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          gap={2}
          sx={{ p: 2.5, borderBottom: "1px solid #e5edf3" }}
        >
          <Box>
            <Typography variant="overline" sx={{ color: "#0369a1", fontWeight: 700 }}>
              Orders
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
              Future Orders
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ minWidth: { md: 520 } }}>
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              fullWidth
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="placed">Placed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        {error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                <TableCell>Future Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Saved At</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 5, color: "text.secondary" }}>
                    No future orders found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 700 }}>{formatDate(row.scheduledDate)}</TableCell>
                    <TableCell>{row.customerName || "-"}</TableCell>
                    <TableCell>{row.phoneNumber || "-"}</TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>{productSummary(row.cartItems)}</TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2">{row.paymentMode || "-"}</Typography>
                        {row.transactionId ? (
                          <Typography variant="caption" color="text.secondary">
                            Txn: {row.transactionId}
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(row.orderTotal)}</TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>{addressSummary(row.shippingAddress)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.status || "pending"}
                        color={row.status === "placed" ? "success" : row.status === "cancelled" ? "error" : "warning"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{row.createdBy || "-"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        disabled={row.status !== "pending" || placingId === row._id}
                        onClick={() => setConfirmOrder(row)}
                        sx={{ whiteSpace: "nowrap", textTransform: "none" }}
                      >
                        {placingId === row._id ? "Placing..." : "Place Order"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      <Dialog open={Boolean(confirmOrder)} onClose={() => (placingId ? null : setConfirmOrder(null))} maxWidth="xs" fullWidth>
        <DialogTitle>Place future order?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to place this order on Shopify now?
          </Typography>
          {confirmOrder ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              {confirmOrder.customerName || "Customer"} • {formatCurrency(confirmOrder.orderTotal)}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={Boolean(placingId)} onClick={() => setConfirmOrder(null)}>
            No
          </Button>
          <Button variant="contained" disabled={Boolean(placingId)} onClick={placeOrderNow}>
            {placingId ? <CircularProgress size={18} /> : "Yes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

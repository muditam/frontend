import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const initials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "—";

const shipmentStatusStyle = (status = "") => {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "rto delivered") {
    return {
      color: "#087A55",
      bgcolor: "#E7F7F0",
      borderColor: "#B7E8D4",
    };
  }
  return {
    color: "#B54708",
    bgcolor: "#FFF4E5",
    borderColor: "#FFD8A8",
  };
};

const filterLabels = {
  all: "All RTO orders",
  delivered: "RTO Delivered",
  non_delivered: "RTO in progress",
};

const LoadingRows = () =>
  Array.from({ length: 6 }).map((_, index) => (
    <TableRow key={index}>
      {Array.from({ length: 10 }).map((__, cellIndex) => (
        <TableCell key={cellIndex}>
          <Skeleton width={cellIndex === 5 ? 150 : 75} />
        </TableCell>
      ))}
    </TableRow>
  ));

const ReturnDeliveredOrders = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState("");
  const [statusGroup, setStatusGroup] = useState("all");

  const user = JSON.parse(sessionStorage.getItem("user") || "null");
  const agentName = user?.fullName || "";

  const fetchData = async (
    selectedPage = page,
    limit = rowsPerPage,
    group = statusGroup
  ) => {
    if (!agentName) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/rto-delivered", {
        headers: { "x-agent-name": agentName },
        params: {
          page: selectedPage + 1,
          limit,
          statusGroup: group,
          agentName,
        },
      });
      setRows(response.data.data || []);
      setTotal(response.data.total || 0);
      setCheckedAt(response.data.checkedAt || new Date().toISOString());
    } catch (requestError) {
      console.error("Failed to load RTO orders", requestError);
      setRows([]);
      setTotal(0);
      setError(
        requestError?.response?.data?.error ||
          "Could not load live shipment data from ShipTrack."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, rowsPerPage, statusGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentName, statusGroup]);

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
    fetchData(newPage, rowsPerPage, statusGroup);
  };

  const handleChangeRowsPerPage = (event) => {
    const newSize = parseInt(event.target.value, 10);
    setRowsPerPage(newSize);
    setPage(0);
    fetchData(0, newSize, statusGroup);
  };

  if (!agentName) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">No logged-in user was found.</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F5F7FB",
        px: { xs: 1.5, sm: 2.5, lg: 3.5 },
        py: { xs: 2, md: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          background:
            "linear-gradient(135deg, #FFFFFF 0%, #F5FAFF 55%, #EEF6FF 100%)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack direction="row" spacing={1.75} alignItems="center">
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2.25,
                display: "grid",
                placeItems: "center",
                color: "#FFFFFF",
                bgcolor: "#16213E",
                boxShadow: "0 8px 20px rgba(22, 33, 62, 0.18)",
                flexShrink: 0,
              }}
            >
              <LocalShippingOutlinedIcon />
            </Box>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 750, color: "#17233C", letterSpacing: "-0.02em" }}
                >
                  My RTO Orders
                </Typography>
                <Chip
                  size="small"
                  icon={<VerifiedOutlinedIcon />}
                  label="Live ShipTrack data"
                  sx={{
                    color: "#087A55",
                    bgcolor: "#E7F7F0",
                    fontWeight: 650,
                    "& .MuiChip-icon": { color: "#087A55" },
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                {agentName} · Track returned shipments and courier updates
              </Typography>
              {checkedAt && !loading && !error && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.25 }}
                >
                  Last checked {new Date(checkedAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Paper
              elevation={0}
              sx={{
                minWidth: { xs: "100%", sm: 158 },
                height: 56,
                px: 1.5,
                borderRadius: 2,
                border: "1px solid #D8E2F0",
                bgcolor: "rgba(255, 255, 255, 0.9)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.1}>
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: "#EEF2FF",
                    color: "#4F46E5",
                  }}
                >
                  <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", lineHeight: 1.15 }}
                  >
                    {filterLabels[statusGroup]}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 750, color: "#17233C", lineHeight: 1.25 }}
                  >
                    {loading ? <Skeleton width={34} /> : total.toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 210 } }}>
              <InputLabel id="rto-status-group-label">Shipment status</InputLabel>
              <Select
                labelId="rto-status-group-label"
                label="Shipment status"
                value={statusGroup}
                onChange={(event) => {
                  setPage(0);
                  setStatusGroup(event.target.value);
                }}
                sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }}
              >
                <MenuItem value="all">All RTO orders</MenuItem>
                <MenuItem value="delivered">RTO Delivered</MenuItem>
                <MenuItem value="non_delivered">RTO in progress</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh ShipTrack data">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  disabled={loading}
                  onClick={() => fetchData(page, rowsPerPage, statusGroup)}
                  sx={{
                    height: 40,
                    px: 2,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 650,
                    color: "#17233C",
                    borderColor: "#CBD5E1",
                    bgcolor: "#FFFFFF",
                  }}
                >
                  Refresh
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {error && !loading && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2.5 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => fetchData(page, rowsPerPage, statusGroup)}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          overflow: "hidden",
        }}
      >
        <TableContainer sx={{ maxHeight: "calc(100vh - 340px)", minHeight: 320 }}>
          <Table stickyHeader sx={{ minWidth: 1180 }}>
            <TableHead>
              <TableRow>
                {[
                  "Order ID",
                  "Shipment status",
                  "Order date",
                  "Customer",
                  "Phone",
                  "Product",
                  "Payment",
                  "Total",
                  "Tracking number",
                  "Carrier",
                ].map((heading) => (
                  <TableCell
                    key={heading}
                    sx={{
                      bgcolor: "#F8FAFC",
                      color: "#64748B",
                      fontSize: "0.72rem",
                      fontWeight: 750,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      borderBottom: "1px solid #E2E8F0",
                      whiteSpace: "nowrap",
                      py: 1.75,
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <LoadingRows />
              ) : rows.length ? (
                rows.map((row, index) => (
                  <TableRow
                    hover
                    key={`${row.order_id}-${index}`}
                    sx={{
                      "&:last-child td": { borderBottom: 0 },
                      "& .MuiTableCell-root": { py: 1.6, borderColor: "#EDF1F6" },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 750, color: "#2457D6" }}>
                        {row.orderId || `#${row.order_id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={row.shipment_status || "Unknown"}
                        sx={{
                          ...shipmentStatusStyle(row.shipment_status),
                          fontWeight: 700,
                          borderRadius: 1.5,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(row.order_date)}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            fontSize: "0.72rem",
                            fontWeight: 750,
                            bgcolor: "#EAF0FA",
                            color: "#3A5276",
                          }}
                        >
                          {initials(row.customerName)}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 110 }}>
                          {row.customerName || "—"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{row.phone || "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 230 }}>
                      <Tooltip title={row.productOrdered || ""} placement="top-start">
                        <Typography variant="body2" noWrap>
                          {row.productOrdered || "—"}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.paymentStatus || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 700 }}>
                      {row.totalPrice != null ? currency.format(row.totalPrice) : "—"}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace", color: "#475569", whiteSpace: "nowrap" }}
                      >
                        {row.tracking_number || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.carrier_title ? (
                        <Chip
                          size="small"
                          label={row.carrier_title}
                          sx={{ bgcolor: "#F1F5F9", color: "#334155", fontWeight: 650 }}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : !error ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ border: 0 }}>
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={1}
                      sx={{ minHeight: 250, color: "#64748B" }}
                    >
                      <Avatar sx={{ width: 54, height: 54, bgcolor: "#F1F5F9", color: "#64748B" }}>
                        <LocalShippingOutlinedIcon />
                      </Avatar>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#334155" }}>
                        No {filterLabels[statusGroup].toLowerCase()} found
                      </Typography>
                      <Typography variant="body2">
                        ShipTrack does not currently have matching shipments for this agent.
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>

        {!error && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="Rows per page"
            sx={{ borderTop: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}
          />
        )}
      </Paper>
    </Box>
  );
};

export default ReturnDeliveredOrders;

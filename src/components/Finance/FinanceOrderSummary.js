import React, { useEffect, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  TablePagination,
  Stack,
  InputLabel,
  Button,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import dayjs from "dayjs";

// Date filter options (NO custom range now)
const DATE_FILTERS = [
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
  "Week to date",
  "Month to date",
  "Year to date",
  "Last 90 days",
  "Last 365 days",
  "Last month",
  "Last 12 months",
  "Last year",
  "Quarter to date",
];

const StyledTableCell = styled(TableCell)(() => ({
  fontWeight: 600,
  color: "#000",
  fontSize: 13,
}));

const getDateRange = (filter) => {
  const now = dayjs();
  switch (filter) {
    case "Today":
      return { start: now.startOf("day"), end: now.endOf("day") };
    case "Yesterday":
      return {
        start: now.subtract(1, "day").startOf("day"),
        end: now.subtract(1, "day").endOf("day"),
      };
    case "Last 7 days":
      return { start: now.subtract(6, "day").startOf("day"), end: now.endOf("day") };
    case "Last 30 days":
      return { start: now.subtract(29, "day").startOf("day"), end: now.endOf("day") };
    case "Week to date":
      return { start: now.startOf("week"), end: now.endOf("day") };
    case "Month to date":
      return { start: now.startOf("month"), end: now.endOf("day") };
    case "Year to date":
      return { start: now.startOf("year"), end: now.endOf("day") };
    case "Last 90 days":
      return { start: now.subtract(89, "day").startOf("day"), end: now.endOf("day") };
    case "Last 365 days":
      return { start: now.subtract(364, "day").startOf("day"), end: now.endOf("day") };
    case "Last month":
      return {
        start: now.subtract(1, "month").startOf("month"),
        end: now.subtract(1, "month").endOf("month"),
      };
    case "Last 12 months":
      return { start: now.subtract(11, "month").startOf("month"), end: now.endOf("month") };
    case "Last year":
      return {
        start: now.subtract(1, "year").startOf("year"),
        end: now.subtract(1, "year").endOf("year"),
      };
    case "Quarter to date":
      return { start: now.startOf("quarter"), end: now.endOf("day") };
    default:
      return { start: null, end: null };
  }
};

const rowsPerPage = 50;

const FinanceOrderSummary = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState("Last 7 days");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchFinanceOrders(1); // always reload from page 1 when filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter]);

  useEffect(() => {
    fetchFinanceOrders(page + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchFinanceOrders = async (pageNumber) => {
    setLoading(true);
    setError("");

    const range = getDateRange(selectedFilter);
    const startDate = range.start?.toISOString();
    const endDate = range.end?.toISOString();

    try {
      // Use relative URL so dev/prod hit the same origin server
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/finance/orders", {
        params: {
          page: pageNumber,
          limit: rowsPerPage,
          startDate,
          endDate,
        },
      });

      setOrders(res.data.orders || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error("Error fetching finance orders:", err);
      setError("Couldn't load orders. Check your server logs and network tab.");
      setOrders([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleFilterChange = (value) => {
    setSelectedFilter(value);
    setPage(0);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      // This endpoint pulls July 2025 into DB (server-side)
      await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/finance/refresh-shopify",
        null,
        { params: { year: 2025, month: 7 } }
      );

      // After refresh, switch filter to "Last month" (July if current month is Aug 2025)
      // and reset to first page to show the newly pulled data.
      setSelectedFilter("Last month");
      setPage(0);
      await fetchFinanceOrders(1);
    } catch (e) {
      console.error("Refresh error:", e);
      setError("Refresh failed. Verify your backend URL and env vars.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "black" }}>
          Finance Order Summary
        </Typography>

        <Button
          variant="contained"
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{ textTransform: "none", backgroundColor: "black" }}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <FormControl size="small">
          <InputLabel>Date Filter</InputLabel>
          <Select
            value={selectedFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            label="Date Filter"
          >
            {DATE_FILTERS.map((label) => (
              <MenuItem key={label} value={label}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <CircularProgress color="inherit" />
        </Box>
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            No orders match the current filter.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            If you just pulled July data, try switching to <strong>Last month</strong>.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => handleFilterChange("Last month")}
            sx={{ textTransform: "none" }}
          >
            View Last Month
          </Button>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 1300 }} size="small">
              <TableHead sx={{ backgroundColor: "#000" }}>
                <TableRow>
                  {[
                    "Date",
                    "Order Name",
                    "Order Tracking ID",
                    "Billing Name",
                    "Financial Status",
                    "Payment Method",
                    "Price",
                    "Settlement UTR",
                    "LMS Notes",
                    "Courier Partner",
                    "Order Status",
                    "Partial Payment",
                    "Delivered Date",
                    "Total Received",
                    "Remaining",
                    "Refund",
                    "Settlement Date",
                    "Remark",
                  ].map((head) => (
                    <StyledTableCell key={head} sx={{ color: "#fff" }}>
                      {head}
                    </StyledTableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order, idx) => (
                  <TableRow key={order.orderName || idx}>
                    <TableCell>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "--"}
                    </TableCell>
                    <TableCell>{order.orderName}</TableCell>
                    <TableCell>{order.trackingId || "--"}</TableCell>
                    <TableCell>
                      {order.billingName} {order.phone ? `- ${order.phone}` : ""}
                    </TableCell>
                    <TableCell>{order.financialStatus || "--"}</TableCell>
                    <TableCell>{order.paymentMethod || "--"}</TableCell>
                    <TableCell>₹{order.totalPrice ?? 0}</TableCell>
                    <TableCell>{order.utr || ""}</TableCell>
                    <TableCell>{order.lmsNote || "--"}</TableCell>
                    <TableCell>{order.courierPartner || "--"}</TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={order.customOrderStatus || "open"}
                          onChange={(e) => {
                            const updated = [...orders];
                            updated[idx].customOrderStatus = e.target.value;
                            setOrders(updated);
                          }}
                        >
                          <MenuItem value="open">Open</MenuItem>
                          <MenuItem value="closed">Closed</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>₹{order.partialPayment || 0}</TableCell>
                    <TableCell>
                      {order.deliveredDate ? new Date(order.deliveredDate).toLocaleDateString() : "--"}
                    </TableCell>
                    <TableCell>₹{order.totalReceived || 0}</TableCell>
                    <TableCell>₹{order.remainingAmount || 0}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={order.refund || ""}
                        onChange={(e) => {
                          const updated = [...orders];
                          updated[idx].refund = e.target.value;
                          setOrders(updated);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="date"
                        value={order.settlementDate || ""} // backend already returns "YYYY-MM-DD"
                        onChange={(e) => {
                          const updated = [...orders];
                          updated[idx].settlementDate = e.target.value;
                          setOrders(updated);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={order.remark || ""}
                        onChange={(e) => {
                          const updated = [...orders];
                          updated[idx].remark = e.target.value;
                          setOrders(updated);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
          />
        </>
      )}
    </Box>
  );
};

export default FinanceOrderSummary;

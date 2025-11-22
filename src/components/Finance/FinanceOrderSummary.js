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

// Date filter options
const DATE_FILTERS = ["This week", "This month", "Last 15 days", "Custom"];

const StyledTableCell = styled(TableCell)(() => ({
  fontWeight: 600,
  color: "#000",
  fontSize: 13,
}));

// Helper: get start/end for each filter (YYYY-MM-DD strings)
const getDateRange = (filter) => {
  const now = dayjs();

  switch (filter) {
    case "This week": {
      // Week starts on Monday
      const dow = now.day(); // 0 = Sunday, 1 = Monday, ...
      const daysFromMonday = dow === 0 ? 6 : dow - 1; // if Sunday, go back 6 days
      const start = now.subtract(daysFromMonday, "day").startOf("day");
      const end = now.endOf("day");
      return {
        start: start.format("YYYY-MM-DD"),
        end: end.format("YYYY-MM-DD"),
      };
    }
    case "This month": {
      const start = now.startOf("month");
      const end = now.endOf("day");
      return {
        start: start.format("YYYY-MM-DD"),
        end: end.format("YYYY-MM-DD"),
      };
    }
    case "Last 15 days": {
      // Including today → last 15 calendar days
      const start = now.subtract(14, "day").startOf("day");
      const end = now.endOf("day");
      return {
        start: start.format("YYYY-MM-DD"),
        end: end.format("YYYY-MM-DD"),
      };
    }
    case "Custom":
    default:
      return { start: null, end: null };
  }
};

const DEFAULT_ROWS_PER_PAGE = 50;

const FinanceOrderSummary = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // rows per page (sent to backend)
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // Default: This month
  const [selectedFilter, setSelectedFilter] = useState("This month");
  const [error, setError] = useState("");

  // Open / Closed filter (client-side per page)
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | open | closed

  // Custom date filter state (YYYY-MM-DD)
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeCustomRange, setActiveCustomRange] = useState({
    start: null,
    end: null,
  });

  // On mount + when filter changes (non-Custom), reload from page 1
  useEffect(() => {
    if (selectedFilter === "Custom") {
      // For Custom we wait until user hits "Get"
      setLoading(false);
      return;
    }
    setPage(0);
    fetchFinanceOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, rowsPerPage]);

  // pageNumber: 1-based
  // explicitStart / explicitEnd: "YYYY-MM-DD" if provided (used for Custom)
  const fetchFinanceOrders = async (pageNumber, explicitStart, explicitEnd) => {
    setLoading(true);
    setError("");

    const params = {
      page: pageNumber,
      limit: rowsPerPage, // 🔹 always send current rowsPerPage to backend
    };

    if (explicitStart || explicitEnd) {
      if (explicitStart) params.startDate = explicitStart;
      if (explicitEnd) params.endDate = explicitEnd;
    } else {
      const range = getDateRange(selectedFilter);
      if (range.start && range.end) {
        params.startDate = range.start;
        params.endDate = range.end;
      }
    }

    try {
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/finance/orders", {
        params,
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
    const pageNumber = newPage + 1;
    setPage(newPage);

    // Re-fetch using the same filter / range and the new page
    if (
      selectedFilter === "Custom" &&
      activeCustomRange.start &&
      activeCustomRange.end
    ) {
      fetchFinanceOrders(
        pageNumber,
        activeCustomRange.start,
        activeCustomRange.end
      );
    } else {
      fetchFinanceOrders(pageNumber);
    }
  };

  const handleChangeRowsPerPage = (event) => {
    const newLimit =
      parseInt(event.target.value, 10) || DEFAULT_ROWS_PER_PAGE;

    setRowsPerPage(newLimit);
    setPage(0);

    if (
      selectedFilter === "Custom" &&
      activeCustomRange.start &&
      activeCustomRange.end
    ) {
      fetchFinanceOrders(1, activeCustomRange.start, activeCustomRange.end);
    } else {
      fetchFinanceOrders(1);
    }
  };

  const handleFilterChange = (value) => {
    setSelectedFilter(value);
    setPage(0);

    if (value !== "Custom") {
      setActiveCustomRange({ start: null, end: null });
    }
  };

  const handleApplyCustomRange = () => {
    setError("");

    if (!customStart || !customEnd) {
      setError("Please select both start and end date for Custom range.");
      return;
    }

    // customStart / customEnd are already "YYYY-MM-DD"
    const start = customStart;
    const end = customEnd;

    setActiveCustomRange({ start, end });
    setPage(0);
    fetchFinanceOrders(1, start, end);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");

      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/finance/refresh-shopify");

      setPage(0);
      if (
        selectedFilter === "Custom" &&
        activeCustomRange.start &&
        activeCustomRange.end
      ) {
        await fetchFinanceOrders(
          1,
          activeCustomRange.start,
          activeCustomRange.end
        );
      } else if (selectedFilter !== "Custom") {
        await fetchFinanceOrders(1);
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error("Refresh error:", e);
      setError("Refresh failed. Verify your backend URL and env vars.");
    } finally {
      setRefreshing(false);
    }
  };

  // 🔁 Prepare rows: reverse chronological + status filter (per page)
  const preparedRows = orders
    .map((order, originalIndex) => ({ order, originalIndex }))
    .sort((a, b) => {
      const da = a.order.orderDate || a.order.createdAt;
      const db = b.order.orderDate || b.order.createdAt;
      const va = da ? new Date(da).getTime() : 0;
      const vb = db ? new Date(db).getTime() : 0;
      return vb - va; // 🔹 reverse chronological (newest first)
    })
    .filter(({ order }) => {
      if (statusFilter === "ALL") return true;
      const status = order.customOrderStatus || "open";
      return status === statusFilter;
    });

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
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

        {/* 🔹 Open/Closed filter */}
        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Custom date range UI */}
      {selectedFilter === "Custom" && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            label="Start date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <TextField
            label="End date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
          <Button
            variant="contained"
            sx={{ textTransform: "none" }}
            onClick={handleApplyCustomRange}
          >
            Get
          </Button>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <CircularProgress color="inherit" />
        </Box>
      ) : preparedRows.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            No orders match the current filter.
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 2, color: "text.secondary" }}
          >
            Try switching the date filter, status filter, or selecting a
            different custom range.
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 1300 }} size="small">
              <TableHead sx={{ backgroundColor: "#000" }}>
                <TableRow>
                  {[
                    "Date", // Order Date
                    "Order Name",
                    "Order Tracking ID",
                    "Billing Name",
                    "Financial Status",
                    "Payment Method",
                    "Price",
                    "Settlement UTR",
                    "LMS Notes",
                    "Courier Partner",
                    "Shipment Status",
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
                {preparedRows.map(({ order, originalIndex }) => {
                  const orderDate = order.orderDate || order.createdAt;

                  return (
                    <TableRow key={order.orderName || originalIndex}>
                      {/* Date column – Order Date */}
                      <TableCell>
                        {orderDate
                          ? new Date(orderDate).toLocaleDateString()
                          : "--"}
                      </TableCell>

                      {/* Order Name + Order Date on right side */}
                      <TableCell>
                        {order.orderName}
                        {orderDate && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              color: "#666",
                            }}
                          >
                            ({new Date(orderDate).toLocaleDateString()})
                          </span>
                        )}
                      </TableCell>

                      <TableCell>{order.trackingId || "--"}</TableCell>
                      <TableCell>
                        {order.billingName}{" "}
                        {order.phone ? `- ${order.phone}` : ""}
                      </TableCell>
                      <TableCell>{order.financialStatus || "--"}</TableCell>
                      <TableCell>{order.paymentMethod || "--"}</TableCell>
                      <TableCell>₹{order.totalPrice ?? 0}</TableCell>
                      <TableCell>{order.utr || ""}</TableCell>
                      <TableCell>{order.lmsNote || "--"}</TableCell>
                      <TableCell>{order.courierPartner || "--"}</TableCell>

                      <TableCell>{order.shipmentStatus || "--"}</TableCell>

                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={order.customOrderStatus || "open"}
                            onChange={(e) => {
                              const updated = [...orders];
                              updated[originalIndex].customOrderStatus =
                                e.target.value;
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
                        {order.deliveredDate
                          ? new Date(
                              order.deliveredDate
                            ).toLocaleDateString()
                          : "--"}
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
                            updated[originalIndex].refund = e.target.value;
                            setOrders(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="date"
                          value={order.settlementDate || ""} // backend: "YYYY-MM-DD"
                          onChange={(e) => {
                            const updated = [...orders];
                            updated[originalIndex].settlementDate =
                              e.target.value;
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
                            updated[originalIndex].remark = e.target.value;
                            setOrders(updated);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}              // total from backend
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]} // 🔹 rows-per-page dropdown
          />
        </>
      )}
    </Box>
  );
};

export default FinanceOrderSummary;

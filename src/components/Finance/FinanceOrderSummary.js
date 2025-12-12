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
      const dow = now.day();
      const daysFromMonday = dow === 0 ? 6 : dow - 1;
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

  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // Default filter
  const [selectedFilter, setSelectedFilter] = useState("This month");
  const [error, setError] = useState("");

  // Open / Closed filter (client-side)
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Custom date range state
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeCustomRange, setActiveCustomRange] = useState({
    start: null,
    end: null,
  });

  // Fetch when filter changes (except Custom)
  useEffect(() => {
    if (selectedFilter === "Custom") {
      setLoading(false);
      return;
    }

    setPage(0);
    fetchFinanceOrders(1);
  }, [selectedFilter, rowsPerPage]);

  // Fetch function
  const fetchFinanceOrders = async (pageNumber, explicitStart, explicitEnd) => {
    setLoading(true);

    const params = {
      page: pageNumber,
      limit: rowsPerPage,
    };

    // Apply explicit custom range OR preset filter
    if (explicitStart && explicitEnd) {
      params.startDate = explicitStart;
      params.endDate = explicitEnd;
    } else {
      const range = getDateRange(selectedFilter);
      if (range.start && range.end) {
        params.startDate = range.start;
        params.endDate = range.end;
      }
    }

    try {
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/finance/orders",
        { params }
      );

      setOrders(res.data.orders || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_, newPage) => {
    const pageNumber = newPage + 1;
    setPage(newPage);

    if (
      selectedFilter === "Custom" &&
      activeCustomRange.start &&
      activeCustomRange.end
    ) {
      fetchFinanceOrders(pageNumber, activeCustomRange.start, activeCustomRange.end);
    } else {
      fetchFinanceOrders(pageNumber);
    }
  };

  const handleChangeRowsPerPage = (event) => {
    const newLimit = parseInt(event.target.value, 10) || DEFAULT_ROWS_PER_PAGE;
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
    if (!customStart || !customEnd) {
      setError("Please select both start and end date.");
      return;
    }

    const start = customStart;
    const end = customEnd;

    setError("");
    setActiveCustomRange({ start, end });
    setPage(0);

    fetchFinanceOrders(1, start, end);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/finance/refresh-shopify"
      );

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
    } catch (err) {
      console.error("Refresh failed:", err);
      setError("Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  };

  // Prepare rows (client side filter + sort)
  const preparedRows = orders
    .map((order, originalIndex) => ({ order, originalIndex }))
    .sort((a, b) => {
      const da = a.order.orderDate;
      const db = b.order.orderDate;
      return new Date(db) - new Date(da); // newest first
    })
    .filter(({ order }) => {
      if (statusFilter === "ALL") return true;
      return order.customOrderStatus === statusFilter;
    });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
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

      {/* Filters */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <FormControl size="small">
          <InputLabel>Date Filter</InputLabel>
          <Select
            value={selectedFilter}
            label="Date Filter"
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            {DATE_FILTERS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Custom Date Inputs */}
      {selectedFilter === "Custom" && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            type="date"
            label="Start"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />

          <TextField
            type="date"
            label="End"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />

          <Button variant="contained" onClick={handleApplyCustomRange}>
            Get
          </Button>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      {loading ? (
        <Box sx={{ textAlign: "center", mt: 5 }}>
          <CircularProgress />
        </Box>
      ) : preparedRows.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography>No orders found for the selected filter.</Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small" sx={{ minWidth: 1300 }}>
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
                  const orderDate = order.orderDate;

                  return (
                    <TableRow key={order.orderName}>
                      <TableCell>
                        {orderDate
                          ? new Date(orderDate).toLocaleDateString()
                          : "--"}
                      </TableCell>

                      <TableCell>
                        {order.orderName}{" "}
                        <span style={{ fontSize: 11, color: "#666" }}>
                          ({new Date(orderDate).toLocaleDateString()})
                        </span>
                      </TableCell>

                      <TableCell>{order.trackingId || "--"}</TableCell>

                      <TableCell>
                        {order.billingName} {order.phone ? `- ${order.phone}` : ""}
                      </TableCell>

                      <TableCell>{order.financialStatus || "--"}</TableCell>

                      <TableCell>{order.paymentMethod || "--"}</TableCell>

                      <TableCell>₹{order.totalPrice}</TableCell>

                      <TableCell>{order.utr || "--"}</TableCell>

                      <TableCell>{order.lmsNote || "--"}</TableCell>

                      <TableCell>{order.courierPartner || "--"}</TableCell>

                      <TableCell>{order.shipmentStatus || "--"}</TableCell>

                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={order.customOrderStatus}
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
                          ? new Date(order.deliveredDate).toLocaleDateString()
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
                          value={order.settlementDate || ""}
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

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </>
      )}
    </Box>
  );
};

export default FinanceOrderSummary;

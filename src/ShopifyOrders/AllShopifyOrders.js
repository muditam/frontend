import React, { useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
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
const api = axios.create({ baseURL: API_BASE, withCredentials: true });
const today = new Date().toISOString().split("T")[0];

const OrdersTable = () => {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const fetchShopifyOrders = async () => {
    if (!startDate || !endDate || startDate > endDate) {
      setError("Please select a valid date range.");
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true);
    setCurrentPage(0);
    localStorage.setItem("startDate", startDate);
    localStorage.setItem("endDate", endDate);

    try {
      const response = await api.get("/api/orders", {
        params: { startDate, endDate },
      });

      if (!Array.isArray(response.data)) {
        throw new Error("Invalid response received from the server.");
      }
      setOrders(response.data);
    } catch (requestError) {
      console.error("Error fetching Shopify orders:", requestError);
      setOrders([]);
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data ||
          requestError.message ||
          "Unable to fetch orders. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(Number(event.target.value));
    setCurrentPage(0);
  };

  const paginatedOrders = orders.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        All Shopify Orders
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 2,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
          borderRadius: 2,
        }}
      >
        <TextField
          type="date"
          label="Start date"
          size="small"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: endDate || today }}
        />
        <TextField
          type="date"
          label="End date"
          size="small"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: startDate, max: today }}
        />
        <Button
          variant="contained"
          onClick={fetchShopifyOrders}
          disabled={loading}
          sx={{ height: 40, minWidth: 120, textTransform: "none" }}
        >
          Get Orders
        </Button>
        {hasSearched && !loading && !error && (
          <Typography variant="body2" color="text.secondary">
            {orders.length.toLocaleString()} orders loaded
          </Typography>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {String(error)}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <TableContainer sx={{ minHeight: 300, maxHeight: "70vh" }}>
          <Table stickyHeader sx={{ minWidth: 1100 }} aria-label="Shopify orders">
            <TableHead>
              <TableRow>
                {[
                  "Order ID",
                  "Name",
                  "Contact Number",
                  "Amount",
                  "Mode of Payment",
                  "Products Ordered",
                  "Channel Name",
                  "Delivery Status",
                  "Shipment Status",
                ].map((heading) => (
                  <TableCell key={heading} sx={{ fontWeight: 700 }}>
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                    <CircularProgress size={34} />
                    <Typography variant="body2" color="text.secondary" mt={1.5}>
                      Loading Shopify orders…
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : !hasSearched ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                    <Typography color="text.secondary">
                      Select a date range and click Get Orders.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                    <Typography color="text.secondary">
                      No orders found for the selected dates.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => (
                  <TableRow hover key={order.order_id}>
                    <TableCell>{order.order_id || "—"}</TableCell>
                    <TableCell>{order.name || "—"}</TableCell>
                    <TableCell>{order.contact_number || "—"}</TableCell>
                    <TableCell>{order.total_price || "—"}</TableCell>
                    <TableCell>
                      {Array.isArray(order.payment_gateway_names)
                        ? order.payment_gateway_names.join(", ") || "—"
                        : order.payment_gateway_names || "—"}
                    </TableCell>
                    <TableCell sx={{ minWidth: 240 }}>
                      {Array.isArray(order.line_items)
                        ? order.line_items
                            .map((item) => item.title)
                            .filter(Boolean)
                            .join(", ") || "—"
                        : "—"}
                    </TableCell>
                    <TableCell>{order.channel_name || "—"}</TableCell>
                    <TableCell>{order.delivery_status || "—"}</TableCell>
                    <TableCell>{order.shipway_status || "Not available"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={orders.length}
          rowsPerPage={rowsPerPage}
          page={currentPage}
          onPageChange={(_event, newPage) => setCurrentPage(newPage)}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default OrdersTable;

// src/pages/GlobalShopifyOrders.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
} from "@mui/material";
import axios from "axios";

// Use the same base URL style as rest of your app 
const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const GlobalShopifyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0); // MUI TablePagination is 0-based
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(
        `${API_BASE_URL}/api/global-shopify-orders`,
        {
          params: {
            page: page + 1, // backend is 1-based
            limit: rowsPerPage,
          },
        }
      );

      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching global Shopify orders:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load global Shopify orders."
      );
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Global Shopify Orders
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: "70vh" }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "200px",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order Name</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact Number</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Mode of Payment</TableCell>
                  <TableCell>Products Ordered</TableCell>
                  <TableCell>Channel Name</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.orderName}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.contactNumber}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>
                        {order.amount != null ? `₹${order.amount}` : ""}
                      </TableCell>
                      <TableCell>{order.modeOfPayment}</TableCell>
                      <TableCell>{order.productsOrdered}</TableCell>
                      <TableCell>{order.channelName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Paper>
    </Box>
  );
};

export default GlobalShopifyOrders;

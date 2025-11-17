// src/pages/GlobalAbandonedCarts.jsx
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
  Link as MuiLink,
} from "@mui/material";
import axios from "axios";

// Same base URL style as your other pages 
const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const GlobalAbandonedCarts = () => {
  const [carts, setCarts] = useState([]);
  const [page, setPage] = useState(0); // 0-based
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCarts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_BASE_URL}/api/global-aband`, {
        params: {
          page: page + 1, // backend is 1-based
          limit: rowsPerPage,
        },
      });

      setCarts(res.data.carts || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching global abandoned carts:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load global abandoned carts."
      );
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

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
        Global Abandoned Carts
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
                  {/* Optional: Recovery URL */}
                  <TableCell>Recovery Link</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {carts.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No abandoned carts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  carts.map((cart) => (
                    <TableRow key={cart.id}>
                      <TableCell>{cart.orderName}</TableCell>
                      <TableCell>{cart.customerName}</TableCell>
                      <TableCell>{cart.contactNumber}</TableCell>
                      <TableCell>{formatDate(cart.orderDate)}</TableCell>
                      <TableCell>
                        {cart.amount != null ? `₹${cart.amount}` : ""}
                      </TableCell>
                      <TableCell>{cart.modeOfPayment}</TableCell>
                      <TableCell>{cart.productsOrdered}</TableCell>
                      <TableCell>{cart.channelName}</TableCell>
                      <TableCell>
                        {cart.recoveryUrl ? (
                          <MuiLink
                            href={cart.recoveryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </MuiLink>
                        ) : (
                          ""
                        )}
                      </TableCell>
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

export default GlobalAbandonedCarts;

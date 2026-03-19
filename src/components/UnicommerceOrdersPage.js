import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
} from "@mui/material";

const API = "http://localhost:5001/api/unicommerce/shopify-orders-live";

function getChipColor(status) {
  switch (status) {
    case "Delivered":
      return "success";
    case "RTO":
    case "RTO Delivered":
      return "error";
    case "In Transit":
      return "info";
    case "On Hold":
      return "warning";
    default:
      return "default";
  }
}

export default function ShopifyUnicommerceOrdersPage() {
  const [rows, setRows] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    search: "",
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(API, {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          search: filters.search || undefined,
        },
      });

      setRows(res.data.orders || []);
      setTotalOrders(res.data.totalOrders || 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to fetch orders"
      );
      setRows([]);
      setTotalOrders(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFilterChange = (field) => (event) => {
    setPage(0);
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleReset = () => {
    setPage(0);
    setFilters({
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Shopify Orders From Unicommerce
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Start Date"
            type="date"
            value={filters.startDate}
            onChange={handleFilterChange("startDate")}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="End Date"
            type="date"
            value={filters.endDate}
            onChange={handleFilterChange("endDate")}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Search Order ID"
            value={filters.search}
            onChange={handleFilterChange("search")}
            placeholder="112733"
            fullWidth
          />
          <Button variant="contained" onClick={fetchOrders}>
            Refresh
          </Button>
          <Button variant="outlined" onClick={handleReset}>
            Reset
          </Button>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ width: "100%", overflow: "auto" }}>
        {loading ? (
          <Box p={3} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Shipment Status</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell>Contact Number</TableCell>
                  <TableCell>Tracking Number</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Carrier Title</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={`${row.order_id}-${idx}`}>
                    <TableCell>{row.order_id || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.shipment_status || "-"}
                        color={getChipColor(row.shipment_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {row.order_date ? new Date(row.order_date).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>{row.contact_number || "-"}</TableCell>
                    <TableCell>{row.tracking_number || "-"}</TableCell>
                    <TableCell>{row.full_name || "-"}</TableCell>
                    <TableCell>{row.carrier_title || "-"}</TableCell>
                  </TableRow>
                ))}

                {!rows.length && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No Shopify orders found
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={totalOrders}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
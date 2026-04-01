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
  Divider,
} from "@mui/material";

const LIVE_API = "http://localhost:5001/api/shopify-orders-live";
const BACKFILL_API =
  "http://localhost:5001/api/orders/backfill-shopify-to-order";
const DELETE_API =
  "http://localhost:5001/api/orders/delete-after-date";

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
  const [rawOrdersSeen, setRawOrdersSeen] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [loading, setLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [backfillSummary, setBackfillSummary] = useState(null);
  const [deleteSummary, setDeleteSummary] = useState(null);

  const [filters, setFilters] = useState({
    startDate: "2026-03-06",
    endDate: "",
    search: "",
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(LIVE_API, {
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
      setRawOrdersSeen(res.data.rawOrdersSeen || 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to fetch orders"
      );
      setRows([]);
      setTotalOrders(0);
      setRawOrdersSeen(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFilterChange = (field) => (event) => {
    setPage(0);
    setSuccessMessage("");
    setBackfillSummary(null);
    setDeleteSummary(null);

    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleReset = () => {
    setPage(0);
    setError("");
    setSuccessMessage("");
    setBackfillSummary(null);
    setDeleteSummary(null);

    setFilters({
      startDate: "2026-03-06",
      endDate: "",
      search: "",
    });
  };

  const handleBackfill = async () => {
    try {
      setBackfillLoading(true);
      setError("");
      setSuccessMessage("");
      setBackfillSummary(null);
      setDeleteSummary(null);

      const payload = {
        startDate: filters.startDate || "2026-03-06",
      };

      if (filters.endDate) payload.endDate = filters.endDate;
      if (filters.search) payload.search = filters.search;

      const res = await axios.post(BACKFILL_API, payload);

      setSuccessMessage(
        res.data?.message || "Orders backfilled successfully."
      );
      setBackfillSummary(res.data || null);

      await fetchOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to backfill orders"
      );
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleDeleteAfterDate = async () => {
    try {
      setDeleteLoading(true);
      setError("");
      setSuccessMessage("");
      setBackfillSummary(null);
      setDeleteSummary(null);

      const res = await axios.delete(DELETE_API, {
        data: {
          startDate: filters.startDate || "2026-03-06",
        },
      });

      setSuccessMessage(
        res.data?.message || "Orders deleted successfully."
      );
      setDeleteSummary(res.data || null);

      await fetchOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to delete orders"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Shopify Orders From Unicommerce
      </Typography>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
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
            placeholder="123456 / MA123456 / #MA123456"
            fullWidth
          />

          <Button
            variant="contained"
            onClick={fetchOrders}
            disabled={loading || backfillLoading || deleteLoading}
            sx={{ minWidth: 120 }}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>

          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={loading || backfillLoading || deleteLoading}
            sx={{ minWidth: 100 }}
          >
            Reset
          </Button>

          <Button
            variant="contained"
            color="success"
            onClick={handleBackfill}
            disabled={loading || backfillLoading || deleteLoading}
            sx={{ minWidth: 180 }}
          >
            {backfillLoading ? "Updating..." : "Backfill Shopify Orders"}
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteAfterDate}
            disabled={loading || backfillLoading || deleteLoading}
            sx={{ minWidth: 200 }}
          >
            {deleteLoading ? "Deleting..." : "Delete Orders After Date"}
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary">
          Backfill takes Shopify-channel orders from Unicommerce, maps contact number and full name from ShopifyOrder by order id when available, and saves all values in Order.
        </Typography>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap flexWrap="wrap">
          <Chip
            label={`Raw Unicommerce Seen: ${rawOrdersSeen || 0}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Shopify Live Rows: ${totalOrders || 0}`}
            color="primary"
            variant="outlined"
          />
        </Stack>
      </Paper>

      {backfillSummary ? (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            backgroundColor: "#f8fff8",
          }}
        >
          <Typography variant="h6" fontWeight={700} mb={1}>
            Backfill Summary
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap flexWrap="wrap">
            <Chip
              label={`Raw Seen: ${backfillSummary.rawOrdersSeen || 0}`}
              color="default"
              variant="outlined"
            />
            <Chip
              label={`Shopify Channel Seen: ${backfillSummary.totalFetchedShopifyChannelOrders || 0}`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Processed: ${backfillSummary.totalProcessed || 0}`}
              color="info"
              variant="outlined"
            />
            <Chip
              label={`Shopify Matched: ${backfillSummary.matchedShopifyOrderCount || 0}`}
              color="secondary"
              variant="outlined"
            />
            <Chip
              label={`Inserted: ${backfillSummary.inserted || 0}`}
              color="success"
              variant="outlined"
            />
            <Chip
              label={`Updated: ${backfillSummary.updated || 0}`}
              color="warning"
              variant="outlined"
            />
          </Stack>
        </Paper>
      ) : null}

      {deleteSummary ? (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            backgroundColor: "#fff8f8",
          }}
        >
          <Typography variant="h6" fontWeight={700} mb={1}>
            Delete Summary
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap flexWrap="wrap">
            <Chip
              label={`Deleted: ${deleteSummary.deletedCount || 0}`}
              color="error"
              variant="outlined"
            />
            <Chip
              label={`From: ${deleteSummary.startDate || "-"}`}
              color="default"
              variant="outlined"
            />
          </Stack>
        </Paper>
      ) : null}

      <Paper sx={{ width: "100%", overflow: "auto", borderRadius: 3 }}>
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
                  <TableCell>Tracking Number</TableCell>
                  <TableCell>Carrier Title</TableCell>
                  <TableCell>Channel</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={`${row.order_id}-${idx}`} hover>
                    <TableCell>{row.order_id || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.shipment_status || "-"}
                        color={getChipColor(row.shipment_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {row.order_date
                        ? new Date(row.order_date).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>{row.tracking_number || "-"}</TableCell>
                    <TableCell>{row.carrier_title || "-"}</TableCell>
                    <TableCell>{row.channel_text || "-"}</TableCell>
                  </TableRow>
                ))}

                {!rows.length && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
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
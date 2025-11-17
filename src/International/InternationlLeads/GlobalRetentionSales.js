// src/components/Retention/GlobalRetentionSales.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import axios from "axios";

const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const toDateInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const GlobalRetentionSales = () => {
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(0); // MUI is 0-based
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false); // for Add Sale only
  const [saveError, setSaveError] = useState("");

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(
        `${API_BASE_URL}/api/global-retention-sales`,
        {
          params: {
            page: page + 1, // API is 1-based
            limit: rowsPerPage,
            search: search || undefined,
          },
        }
      );

      const data = res.data || {};
      const list = data.sales || data.items || [];
      setSales(list);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error("Error loading global retention sales:", err);
      setError(
        err.response?.data?.message || "Failed to load global retention sales."
      );
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleChangePage = (_e, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10) || 20);
    setPage(0);
  };

  // 🔹 Add Sale: immediately create blank sale in DB
  const handleAddSale = async () => {
    try {
      setSaveError("");
      setSaving(true);

      // Minimal payload – nothing required
      const payload = {
        date: new Date().toISOString(),
      };

      await axios.post(`${API_BASE_URL}/api/global-retention-sales`, payload);

      // Always show latest on top, so jump to first page and refetch
      setPage(0);
      await fetchSales();
    } catch (err) {
      console.error("Error adding global retention sale:", err);
      setSaveError(
        err.response?.data?.message || "Failed to add global retention sale."
      );
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Save single field (called on every change, no debounce)
  const saveSaleField = async (id, field, value) => {
    try {
      setSaveError("");

      let toSend = value;

      if (field === "amountPaid") {
        const num = Number(value);
        toSend =
          value === "" || value === null || value === undefined
            ? null
            : Number.isFinite(num)
            ? num
            : null;
      }

      if (field === "date") {
        if (!value) {
          toSend = null;
        } else {
          const d = new Date(value);
          toSend = Number.isNaN(d.getTime()) ? null : d.toISOString();
        }
      }

      await axios.patch(`${API_BASE_URL}/api/global-retention-sales/${id}`, {
        [field]: toSend,
      });
    } catch (err) {
      console.error("Error updating global retention sale:", err);
      setSaveError(
        err.response?.data?.message || "Failed to update global retention sale."
      );
    }
  };

  const handleDeleteSale = async (id) => {
    try {
      setError("");
      await axios.delete(`${API_BASE_URL}/api/global-retention-sales/${id}`);
      await fetchSales();
    } catch (err) {
      console.error("Error deleting global retention sale:", err);
      setError(
        err.response?.data?.message ||
          "Failed to delete global retention sale."
      );
    }
  };

  // local change handler for editable cells
  const updateLocalField = (id, field, value) => {
    setSales((prev) =>
      prev.map((row) =>
        (row._id || row.id) === id ? { ...row, [field]: value } : row
      )
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: "#000000" }}
          >
            Global Retention Sales
          </Typography>

          <Box sx={{ flex: 1, minWidth: 220 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by name / contact / order id..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddSale}
            sx={{
              bgcolor: "#000000",
              "&:hover": { bgcolor: "#333333" },
            }}
            disabled={saving}
          >
            Add Sale
          </Button>
        </Box>

        {(error || saveError) && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error || saveError}
          </Alert>
        )}

        {/* TABLE */}
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 3, border: "1px solid #e5e7eb" }}
        >
          {loading ? (
            <Box
              sx={{
                py: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Contact No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Products Ordered
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Dosage Ordered
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Amount Paid
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Order Created By
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary", py: 2 }}
                      >
                        No sales found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((row) => {
                    const id = row._id || row.id;
                    return (
                      <TableRow key={id}>
                        {/* Date */}
                        <TableCell sx={{ minWidth: 120 }}>
                          <TextField
                            type="date"
                            size="small"
                            fullWidth
                            value={toDateInput(row.date || row.createdAt)}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLocalField(id, "date", v);
                              saveSaleField(id, "date", v);
                            }}
                          />
                        </TableCell>

                        {/* Name */}
                        <TableCell sx={{ minWidth: 150 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={row.name || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLocalField(id, "name", v);
                              saveSaleField(id, "name", v);
                            }}
                          />
                        </TableCell>

                        {/* Contact */}
                        <TableCell sx={{ minWidth: 150 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={row.contactNumber || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLocalField(id, "contactNumber", v);
                              saveSaleField(id, "contactNumber", v);
                            }}
                          />
                        </TableCell>

                        {/* Products Ordered */}
                        <TableCell sx={{ minWidth: 180 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={row.productsOrdered || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLocalField(id, "productsOrdered", v);
                              saveSaleField(id, "productsOrdered", v);
                            }}
                          />
                        </TableCell>

                        {/* Dosage Ordered */}
                        <TableCell sx={{ minWidth: 180 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={row.dosageOrdered || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLocalField(id, "dosageOrdered", v);
                              saveSaleField(id, "dosageOrdered", v);
                            }}
                          />
                        </TableCell>

                        {/* Amount Paid – $ icon, no arrows */}
                        <TableCell sx={{ minWidth: 140 }}>
                          <TextField
                            size="small"
                            fullWidth
                            type="number"
                            value={
                              row.amountPaid !== undefined &&
                              row.amountPaid !== null
                                ? row.amountPaid
                                : ""
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLocalField(id, "amountPaid", v);
                              saveSaleField(id, "amountPaid", v);
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  $
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              "& input[type=number]": {
                                MozAppearance: "textfield",
                              },
                              "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
                                {
                                  WebkitAppearance: "none",
                                  margin: 0,
                                },
                            }}
                          />
                        </TableCell>

                        {/* Order ID */}
                        <TableCell sx={{ minWidth: 140 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={row.orderId || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLocalField(id, "orderId", v);
                              saveSaleField(id, "orderId", v);
                            }}
                          />
                        </TableCell>

                        {/* Order Created By */}
                        <TableCell sx={{ minWidth: 160 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={row.orderCreatedBy || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLocalField(id, "orderCreatedBy", v);
                              saveSaleField(id, "orderCreatedBy", v);
                            }}
                          />
                        </TableCell>

                        {/* Remarks */}
                        <TableCell sx={{ minWidth: 200 }}>
                          <TextField
                            size="small"
                            fullWidth
                            multiline
                            minRows={1}
                            maxRows={3}
                            value={row.remarks || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLocalField(id, "remarks", v);
                              saveSaleField(id, "remarks", v);
                            }}
                          />
                        </TableCell>

                        {/* Actions – delete row */}
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSale(id)}
                            sx={{ color: "#b91c1c" }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
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

export default GlobalRetentionSales;

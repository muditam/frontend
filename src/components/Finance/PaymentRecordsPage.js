import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Link as MuiLink,
} from "@mui/material";

import Autocomplete from "@mui/material/Autocomplete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";

import axios from "axios";

// --------------------------
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sortPayments(list) {
  return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
}
// --------------------------

const PaymentRecordsPage = () => {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [newRow, setNewRow] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ------------------------------------------------------------
  // LOAD DATA
  // ------------------------------------------------------------
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [payRes, vendorRes] = await Promise.all([
        axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/payment-records"),
        axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/vendors"),
      ]);

      setPayments(sortPayments(payRes.data || []));
      setVendors(vendorRes.data || []);
    } catch (err) {
      setErrorMsg("Failed to load records");
    } finally {
      setLoading(false);
    }
  }

  const visiblePayments = useMemo(
    () => payments.filter((p) => !p.isDeleted),
    [payments]
  );

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return visiblePayments.slice(start, start + rowsPerPage);
  }, [visiblePayments, page, rowsPerPage]);

  // ------------------------------------------------------------
  // ADD NEW ROW
  // ------------------------------------------------------------
  const handleAddNewRow = () => {
    setNewRow({
      date: todayISO(),
      vendorId: null,
      vendorName: "",
      amountPaid: "",
      screenshotUrl: "",
      due: "-", // will be calculated AFTER save
    });
  };

  // ------------------------------------------------------------
  // SAVE ROW
  // ------------------------------------------------------------
  const handleSaveRow = async () => {
    if (!newRow.vendorId) return setErrorMsg("Vendor is required");
    if (!newRow.amountPaid || Number(newRow.amountPaid) <= 0)
      return setErrorMsg("Amount must be greater than 0");

    try {
      const payload = {
        date: newRow.date,
        vendorId: newRow.vendorId,
        vendorName: newRow.vendorName,
        amountPaid: Number(newRow.amountPaid),
        screenshotUrl: newRow.screenshotUrl,
      };

      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/payment-records", payload);

      const saved = res.data;

      // Insert and re-sort
      setPayments((prev) => sortPayments([saved, ...prev]));

      // Remove editable row
      setNewRow(null);
      setSuccessMsg("Payment saved");
    } catch (err) {
      setErrorMsg("Failed to save payment");
    }
  };

  // ------------------------------------------------------------
  // DELETE ROW
  // ------------------------------------------------------------
  const handleDeleteRow = async (row) => {
    if (!window.confirm("Delete this record?")) return;

    try {
      await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/payment-records/${row._id}`);

      setPayments((prev) =>
        prev.map((p) =>
          p._id === row._id ? { ...p, isDeleted: true } : p
        )
      );

      setSuccessMsg("Record deleted");
    } catch (err) {
      setErrorMsg("Delete failed");
    }
  };

  // ------------------------------------------------------------
  // UPLOAD SCREENSHOT
  // ------------------------------------------------------------
  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingScreenshot(true);

      const fd = new FormData();
      fd.append("file", file);

      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/payment-records/upload-screenshot", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setNewRow((prev) => ({
        ...prev,
        screenshotUrl: res.data.url,
      }));

      setSuccessMsg("Screenshot uploaded");
    } catch (err) {
      setErrorMsg("Upload failed");
    } finally {
      setUploadingScreenshot(false);
      e.target.value = "";
    }
  };

  // ------------------------------------------------------------
  // FORMATTERS
  // ------------------------------------------------------------
  const formatCurrency = (v) =>
    v == null ? "-" : Number(v).toLocaleString("en-IN");

  const formatDate = (v) =>
    new Date(v).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // ------------------------------------------------------------
  // RENDER UI
  // ------------------------------------------------------------
  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Payment Records
      </Typography>

      {/* TOP BUTTON */}
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleAddNewRow}
        disabled={!!newRow}
        sx={{ mb: 2 }}
      >
        Add Payment
      </Button>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>S.No.</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell align="right">Amount Paid</TableCell>
                <TableCell align="right">Due</TableCell>
                <TableCell>Screenshot</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {/* ---------------------------------------------------------
                  NEW EDITABLE ROW
              --------------------------------------------------------- */}
              {newRow && (
                <TableRow>
                  <TableCell>-</TableCell>

                  {/* Date */}
                  <TableCell>
                    <TextField
                      type="date"
                      size="small"
                      value={newRow.date}
                      onChange={(e) =>
                        setNewRow((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                    />
                  </TableCell>

                  {/* Vendor */}
                  <TableCell>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={vendors}
                      getOptionLabel={(o) => o.name}
                      onChange={(_e, v) =>
                        setNewRow((prev) => ({
                          ...prev,
                          vendorId: v?._id || null,
                          vendorName: v?.name || "",
                        }))
                      }
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Select Vendor" />
                      )}
                    />
                  </TableCell>

                  {/* Amount Paid */}
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={newRow.amountPaid}
                      onChange={(e) =>
                        setNewRow((prev) => ({
                          ...prev,
                          amountPaid: e.target.value,
                        }))
                      }
                    />
                  </TableCell>

                  {/* Due will come from backend after save */}
                  <TableCell align="right">-</TableCell>

                  {/* Screenshot */}
                  <TableCell>
                    <input
                      type="file"
                      hidden
                      id="upload-file"
                      accept="image/*,.pdf"
                      onChange={handleScreenshotUpload}
                    />
                    <label htmlFor="upload-file">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        component="span"
                        disabled={uploadingScreenshot}
                      >
                        Upload
                      </Button>
                    </label>

                    {newRow.screenshotUrl && (
                      <MuiLink
                        href={newRow.screenshotUrl}
                        target="_blank"
                        sx={{ ml: 1 }}
                      >
                        View
                      </MuiLink>
                    )}
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Save Payment">
                        <IconButton color="success" onClick={handleSaveRow}>
                          <SaveIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Cancel">
                        <IconButton onClick={() => setNewRow(null)}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}

              {/* ---------------------------------------------------------
                  EXISTING NON-EDITABLE ROWS
              --------------------------------------------------------- */}
              {paginated.map((row, index) => (
                <TableRow key={row._id}>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.vendorName}</TableCell>
                  <TableCell align="right">
                    ₹ {formatCurrency(row.amountPaid)}
                  </TableCell>
                  <TableCell align="right">
                    ₹ {formatCurrency(row.due)}
                  </TableCell>

                  <TableCell>
                    {row.screenshotUrl ? (
                      <MuiLink href={row.screenshotUrl} target="_blank">
                        View
                      </MuiLink>
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  <TableCell align="center">
                    <IconButton onClick={() => handleDeleteRow(row)}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && paginated.length === 0 && !newRow && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION */}
        <TablePagination
          component="div"
          count={visiblePayments.length}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) =>
            setRowsPerPage(parseInt(e.target.value, 10))
          }
        />
      </Card>

      {/* Snackbars */}
      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
        onClose={() => setErrorMsg("")}
      >
        <Alert severity="error">{errorMsg}</Alert>
      </Snackbar>

      <Snackbar
        open={!!successMsg}
        autoHideDuration={2500}
        onClose={() => setSuccessMsg("")}
      >
        <Alert severity="success">{successMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentRecordsPage;

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
  Grid,
  Paper,
  Chip,
  Avatar,
} from "@mui/material";


import Autocomplete from "@mui/material/Autocomplete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";


import axios from "axios";


// --- Helpers ---
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}


function sortPayments(list) {
  return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
}


const PaymentRecordsPage = () => {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [newRow, setNewRow] = useState(null);
  const [duePreview, setDuePreview] = useState(null);




  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");


  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);


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


  const visiblePayments = useMemo(() => payments.filter((p) => !p.isDeleted), [payments]);


const stats = useMemo(() => {
  const totalPaid = visiblePayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);




  const latestByVendor = new Map();
  for (const p of visiblePayments) {
    const vendorKey = String(p.vendorId || p.vendorName || "").trim().toLowerCase();
    if (!vendorKey) continue;
    if (!latestByVendor.has(vendorKey)) {
      latestByVendor.set(vendorKey, Number(p.due) || 0);
    }
  }


  const totalDue = Array.from(latestByVendor.values()).reduce((a, b) => a + (Number(b) || 0), 0);


  return { totalPaid, totalDue };
}, [visiblePayments]);




  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return visiblePayments.slice(start, start + rowsPerPage);
  }, [visiblePayments, page, rowsPerPage]);


  const handleAddNewRow = () => {
    setNewRow({
      date: todayISO(),
      vendorId: null,
      vendorName: "",
      amountPaid: "",
      screenshotUrl: "",
      due: "-",
    });
  };
  useEffect(() => {
  let t = null;


  async function calc() {
    if (!newRow?.vendorId || !newRow?.date) return setDuePreview(null);


    const amt = Number(newRow.amountPaid || 0);


    try {
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/payment-records/calc-due",
        { params: { vendorId: newRow.vendorId, date: newRow.date, amountPaid: amt } }
      );
      setDuePreview(res.data?.due ?? null);
    } catch (e) {
      setDuePreview(null);
    }
  }
  t = setTimeout(calc, 250);
  return () => clearTimeout(t);
}, [newRow?.vendorId, newRow?.date, newRow?.amountPaid]);




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
      setPayments((prev) => sortPayments([res.data, ...prev]));
      setNewRow(null);
      setSuccessMsg("Payment recorded successfully");
    } catch (err) {
      setErrorMsg("Failed to save payment");
    }
  };


  const handleDeleteRow = async (row) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/payment-records/${row._id}`);
      setPayments((prev) => prev.map((p) => (p._id === row._id ? { ...p, isDeleted: true } : p)));
      setSuccessMsg("Record deleted");
    } catch (err) {
      setErrorMsg("Delete failed");
    }
  };


  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingScreenshot(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/payment-records/upload-screenshot", fd);
      setNewRow((prev) => ({ ...prev, screenshotUrl: res.data.url }));
      setSuccessMsg("Upload successful");
    } catch (err) {
      setErrorMsg("Upload failed");
    } finally {
      setUploadingScreenshot(false);
    }
  };


  const formatCurrency = (v) => (v == null ? "0" : Number(v).toLocaleString("en-IN"));
  const formatDate = (v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });


  return (
    <Box p={4} sx={{ backgroundColor: "#f4f6f8", minHeight: "100vh" }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="#1A2027">
            Payments & Invoices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your vendor disbursements and track outstanding balances
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNewRow}
          disabled={!!newRow}
          sx={{ borderRadius: "8px", textTransform: "none", fontWeight: "bold", px: 3 }}
        >
          Record Payment
        </Button>
      </Stack>


      {/* SUMMARY DASHBOARD */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e0e4e8", display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }}><AccountBalanceWalletIcon /></Avatar>
            <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL PAID</Typography>
                <Typography variant="h5" fontWeight="bold">₹{formatCurrency(stats.totalPaid)}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e0e4e8", display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: "#fff4e5", color: "#ed6c02" }}><AccountBalanceWalletIcon /></Avatar>
            <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL OUTSTANDING</Typography>
                <Typography variant="h5" fontWeight="bold" color="error.main">₹{formatCurrency(stats.totalDue)}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e0e4e8", display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: "#f3e5f5", color: "#9c27b0" }}><AddIcon /></Avatar>
            <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL VENDORS</Typography>
                <Typography variant="h5" fontWeight="bold">{vendors.length}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>


      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e0e4e8", overflow: "hidden" }}>
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ backgroundColor: "#F8F9FA" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", color: "#5C6B7A" }}>#</TableCell>
                <TableCell sx={{ fontWeight: "bold", color: "#5C6B7A" }}>DATE</TableCell>
                <TableCell sx={{ fontWeight: "bold", color: "#5C6B7A" }}>VENDOR NAME</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold", color: "#5C6B7A" }}>AMOUNT PAID</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold", color: "#5C6B7A" }}>DUE BALANCE</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold", color: "#5C6B7A" }}>RECEIPT</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold", color: "#5C6B7A" }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>


            <TableBody>
              {/* INLINE NEW ROW */}
              {newRow && (
                <TableRow sx={{ backgroundColor: "#f0f7ff" }}>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <TextField
                      type="date"
                      size="small"
                      variant="outlined"
                      value={newRow.date}
                      onChange={(e) => setNewRow({ ...newRow, date: e.target.value })}
                      sx={{ backgroundColor: "#fff" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={vendors}
                      getOptionLabel={(o) => o.name}
                      onChange={(_, v) => setNewRow({ ...newRow, vendorId: v?._id || null, vendorName: v?.name || "" })}
                      renderInput={(params) => <TextField {...params} placeholder="Select Vendor" sx={{ backgroundColor: "#fff" }} />}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      placeholder="0.00"
                      value={newRow.amountPaid}
                      onChange={(e) => setNewRow({ ...newRow, amountPaid: e.target.value })}
                      sx={{ backgroundColor: "#fff", width: '120px' }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ color: "text.disabled" }}>Calculated...</TableCell>
                  <TableCell align="center">
                    <input type="file" hidden id="inline-upload" onChange={handleScreenshotUpload} />
                    <label htmlFor="inline-upload">
                      <IconButton component="span" color="primary" disabled={uploadingScreenshot}>
                        <CloudUploadIcon />
                      </IconButton>
                    </label>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <IconButton color="success" onClick={handleSaveRow}><SaveIcon /></IconButton>
                      <IconButton color="error" onClick={() => setNewRow(null)}><CloseIcon /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}


              {/* DATA ROWS */}
              {paginated.map((row, index) => (
                <TableRow key={row._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell sx={{ color: "#5C6B7A" }}>{formatDate(row.date)}</TableCell>
                  <TableCell sx={{ fontWeight: "600" }}>{row.vendorName}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: "#2e7d32" }}>
                    ₹ {formatCurrency(row.amountPaid)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                        label={`₹${formatCurrency(row.due)}`}
                        size="small"
                        variant="outlined"
                        color={row.due > 0 ? "error" : "default"}
                        sx={{ fontWeight: "bold", borderRadius: "6px" }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {row.screenshotUrl ? (
                      <IconButton component={MuiLink} href={row.screenshotUrl} target="_blank" size="small" color="primary">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    ) : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleDeleteRow(row)} size="small">
                      <DeleteIcon color="error" fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={visiblePayments.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </Card>


      <Snackbar open={!!errorMsg} autoHideDuration={4000} onClose={() => setErrorMsg("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" variant="filled">{errorMsg}</Alert>
      </Snackbar>
      <Snackbar open={!!successMsg} autoHideDuration={2500} onClose={() => setSuccessMsg("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" variant="filled">{successMsg}</Alert>
      </Snackbar>
    </Box>
  );
};


export default PaymentRecordsPage;


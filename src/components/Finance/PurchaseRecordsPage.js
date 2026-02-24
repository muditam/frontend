import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Alert,
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
  Tooltip,
  Link as MuiLink,
  Autocomplete,
  Divider,
  LinearProgress,
  Switch,
  InputAdornment, // Added for icons inside inputs
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
// Modern Icons for the Dialog
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import ReceiptIcon from "@mui/icons-material/Receipt";
import axios from "axios";


const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";


const CATEGORY_OPTIONS = [
  "Advertisement", "Assets", "Assets (Intangible)", "Bank Charges",
  "COGS", "Commision", "Freight Inwards", "Marketing",
  "Operating Expense", "Packaging Material", "Professional Charges",
  "Services", "Software & Tools", "Travel Expense", "Freight Outwards",
  "Stock transfer", "Other",
];


const INVOICE_TYPE_OPTIONS = ["Credit Note", "Tax Invoice", "Debit Note"];


const BILLING_GST_FILTER_OPTIONS = [
  "Delhi", "Himachal Pradesh", "Maharastra", "West Bengal", "Haryana", "Tamil Nadu",
];


// -----------------------------
// HELPERS
// -----------------------------
function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


function toReadableDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}


function toInputDate(value) {
  if (!value) return todayISO();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return todayISO();
  return d.toISOString().slice(0, 10);
}


function isYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}


function safeId(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v._id || v.id || "");
  return String(v);
}


const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};


function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}


// -----------------------------
// MAIN COMPONENT
// -----------------------------
const PurchaseRecordsPage = () => {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);


  const [filters, setFilters] = useState({
    vendor: null, invoiceNo: "", amount: "", date: "", billingGST: null,
  });
  const debouncedFilters = useDebouncedValue(filters, 350);


  const [openAddVendor, setOpenAddVendor] = useState(false);
  const [openBulkUpload, setOpenBulkUpload] = useState(false);


  const [vendorForm, setVendorForm] = useState({
    name: "", phone: "", email: "", hasGST: false, gstNumber: "",
  });


  const [rowInvoiceUploadingId, setRowInvoiceUploadingId] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkDate, setBulkDate] = useState(todayISO());
  const [bulkUploading, setBulkUploading] = useState(false);


  const abortRef = useRef(null);


  const fetchVendors = useCallback(async () => {
    const res = await axios.get(`${API_BASE}/api/vendors`);
    const list = Array.isArray(res.data) ? res.data : [];
    setVendors(list.filter(v => v?._id && (v.name || "").trim()));
  }, []);


  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);


  const vendorById = useMemo(() => {
    const map = new Map();
    vendors.forEach((v) => map.set(String(v._id), v));
    return map;
  }, [vendors]);


  const updateFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
  };


  const clearFilters = () => {
    setFilters({ vendor: null, invoiceNo: "", amount: "", date: "", billingGST: null });
    setPage(0);
  };


  const fetchRecords = useCallback(async () => {
    try {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);


      const params = {
        page, limit: rowsPerPage, showDeleted: showDeleted ? "true" : "false",
      };


      const vId = safeId(debouncedFilters.vendor);
      const vName = String(debouncedFilters.vendor?.name || "").trim();
      if (vId) params.vendorId = vId;
      if (vName) params.vendorName = vName;


      const inv = String(debouncedFilters.invoiceNo || "").trim();
      if (inv) params.invoiceNo = inv;


      const amtStr = String(debouncedFilters.amount ?? "").trim();
      const amtClean = amtStr.replace(/[,₹\s]/g, "");
      if (amtClean !== "" && Number.isFinite(Number(amtClean))) {
        params.amount = amtClean;
      }


      const dt = String(debouncedFilters.date || "").trim();
      if (dt && isYMD(dt)) params.date = dt;


      if (debouncedFilters.billingGST) params.billingGST = debouncedFilters.billingGST;


      const res = await axios.get(`${API_BASE}/api/purchase-records`, {
        params, signal: controller.signal,
      });


      const data = res.data;
      if (Array.isArray(data)) {
        setRecords(data);
        setTotal(data.length);
      } else {
        setRecords(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total || 0));
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error(err);
        setErrorMsg("Failed to load purchase records");
      }
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, showDeleted, debouncedFilters]);


  useEffect(() => {
    fetchRecords();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [fetchRecords]);


  const patchRecord = async (record, patch) => {
    if (!record || !record._id) return;
    const original = { ...record };
    const updated = { ...record, ...patch };
    setRecords((prev) => prev.map((r) => (r._id === record._id ? updated : r)));
    try {
      await axios.patch(`${API_BASE}/api/purchase-records/${record._id}`, patch);
    } catch (err) {
      setErrorMsg("Update failed");
      setRecords((prev) => prev.map((r) => (r._id === record._id ? original : r)));
    }
  };


  const handleInlineFieldChange = (record, field, value) => {
    if (record.isDeleted) return;
    patchRecord(record, { [field]: value });
  };


  const handleDeleteRecord = async (record) => {
    if (record.isDeleted) return;
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(`${API_BASE}/api/purchase-records/${record._id}`);
      fetchRecords();
      setSuccessMsg("Record deleted");
    } catch (err) { setErrorMsg("Failed to delete"); }
  };


  const handleAddRecordInline = async () => {
    try {
      const payload = { date: todayISO(), category: "", invoiceType: "", billingGST: "", invoiceNo: "", vendorId: null, vendorName: "", amount: "", invoiceUrl: "", matched2B: false, tally: false };
      await axios.post(`${API_BASE}/api/purchase-records`, payload);
      setPage(0);
      fetchRecords();
      setSuccessMsg("New empty record added");
    } catch (err) { setErrorMsg("Failed to add record"); }
  };


  const handleSaveVendor = async () => {
    if (!vendorForm.name.trim()) return setErrorMsg("Name required");
    if (vendorForm.email && !validateEmail(vendorForm.email)) {
      return setErrorMsg("Invalid email format");
    }
    if (vendorForm.hasGST && !vendorForm.gstNumber.trim()) {
      return setErrorMsg("GST Number is required");
    }


    try {
      await axios.post(`${API_BASE}/api/vendors`, vendorForm);
      setOpenAddVendor(false);
      setVendorForm({ name: "", phone: "", email: "", hasGST: false, gstNumber: "" });
      fetchVendors();
      setSuccessMsg("Vendor added");
    } catch (err) { setErrorMsg("Failed to save vendor"); }
  };


  const handleRowInvoiceUpload = async (record, file) => {
    setRowInvoiceUploadingId(record._id);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API_BASE}/api/purchase-records/upload-invoice`, formData);
      await patchRecord(record, { invoiceUrl: res.data.url });
      setSuccessMsg("Invoice uploaded");
    } catch (e) { setErrorMsg("Upload failed"); }
    finally { setRowInvoiceUploadingId(null); }
  };


  const handleBulkUpload = async () => {
    if (!bulkFile) return setErrorMsg("Select file");
    setBulkUploading(true);
    const formData = new FormData();
    formData.append("file", bulkFile);
    formData.append("date", bulkDate);
    try {
      await axios.post(`${API_BASE}/api/purchase-records/bulk-upload`, formData);
      setOpenBulkUpload(false);
      fetchRecords();
      setSuccessMsg("Bulk upload success");
    } catch (e) { setErrorMsg("Bulk upload failed"); }
    finally { setBulkUploading(false); }
  };


  return (
    <Box p={3}>
 {/* HEADER SECTION */}
<Stack
  direction={{ xs: "column", md: "row" }}
  justifyContent="space-between"
  alignItems={{ xs: "flex-start", md: "center" }}
  spacing={2}
  mb={3}
>
  <Box sx={{ color: "black" }}>
    <Typography variant="h6" fontWeight={600}>
      Purchase Records
    </Typography>
  </Box>


  <Stack direction="row" spacing={1} flexWrap="wrap">
    {/* VENDOR BUTTON */}
    <Button
      variant="contained"
      onClick={() => setOpenAddVendor(true)}
      startIcon={<AddIcon />}
      sx={{
        textTransform: "none",
        fontWeight: 600,
        backgroundColor: "black",
        color: "white",
        "&:hover": { backgroundColor: "#333" }
      }}
    >
      Vendor
    </Button>
   
    {/* RECORD BUTTON */}
    <Button
      variant="contained"
      onClick={handleAddRecordInline}
      startIcon={<AddIcon />}
      sx={{
        textTransform: "none",
        fontWeight: 600,
        backgroundColor: "black",
        color: "white",
        "&:hover": { backgroundColor: "#333" }
      }}
    >
      Record
    </Button>


    {/* BULK UPLOAD BUTTON */}
    <Button
      variant="contained"
      onClick={() => setOpenBulkUpload(true)}
      sx={{
        textTransform: "none",
        fontWeight: 600,
        backgroundColor: "black",
        color: "white",
        "&:hover": { backgroundColor: "#333" }
      }}
    >
      Bulk Upload
    </Button>


    {/* SHOW DELETED BUTTON */}
    <Button
      variant="contained"
      onClick={() => setShowDeleted(!showDeleted)}
      sx={{
        textTransform: "none",
        fontWeight: 600,
        backgroundColor: showDeleted ? "#444" : "black", // Darker grey when active
        color: "white",
        border: showDeleted ? "1px solid white" : "none",
        "&:hover": { backgroundColor: "#333" }
      }}
    >
      {showDeleted ? "Hide Deleted" : "Show Deleted"}
    </Button>
  </Stack>
</Stack>




      <Card variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: "#f9f9f9" }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" useFlexGap>
          <Autocomplete
            size="small"
            options={vendors}
            value={filters.vendor}
            getOptionLabel={(opt) => opt?.name || ""}
            onChange={(_, val) => updateFilters({ vendor: val })}
            renderInput={(params) => <TextField {...params} label="Vendor" />}
            sx={{ width: 220 }}
          />


          <TextField
            size="small"
            label="Invoice No"
            value={filters.invoiceNo}
            onChange={(e) => updateFilters({ invoiceNo: e.target.value })}
            sx={{ width: 160 }}
          />


          <TextField
            size="small"
            label="Amount"
            type="number"
            value={filters.amount}
            onChange={(e) => updateFilters({ amount: e.target.value })}
            sx={{ width: 140 }}
          />


          <TextField
            size="small"
            label="Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filters.date}
            onChange={(e) => updateFilters({ date: e.target.value })}
            sx={{ width: 160 }}
          />


          <Autocomplete
            size="small"
            options={BILLING_GST_FILTER_OPTIONS}
            value={filters.billingGST}
            onChange={(_, val) => updateFilters({ billingGST: val })}
            renderInput={(params) => <TextField {...params} label="Billing GST" />}
            sx={{ width: 200 }}
          />


          <Button
            variant="text"
            onClick={clearFilters}
            sx={{ fontWeight: 600, color: "text.secondary", textTransform: "none" }}
          >
            Clear Filters
          </Button>
        </Stack>
      </Card>


      {/* TABLE SECTION */}
      <Card variant="outlined" sx={{ position: "relative" }}>
        {loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#000" }}>
                {["Actions", "S. No.", "Date", "Category", "Invoice Type", "Billing GST", "Invoice No.", "Vendor Name", "Amount", "Invoice Link", "Matched 2B", "Tally"].map((label) => (
                  <TableCell key={label} sx={{ color: "#fff", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((row, index) => {
                const serialNumber = page * rowsPerPage + index + 1;
                const isDeleted = !!row.isDeleted;
                const vObj = row.vendorId ? vendorById.get(String(row.vendorId)) : null;


                return (
                  <TableRow key={row._id} hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleDeleteRecord(row)} disabled={isDeleted}>
                        <DeleteIcon fontSize="small" color={isDeleted ? "disabled" : "error"} />
                      </IconButton>
                    </TableCell>
                    <TableCell>{serialNumber}</TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        size="small"
                        variant="standard"
                        value={toInputDate(row.date)}
                        onChange={(e) => handleInlineFieldChange(row, "date", e.target.value)}
                        InputProps={{ disableUnderline: true }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        variant="standard"
                        value={row.category || ""}
                        onChange={(e) => handleInlineFieldChange(row, "category", e.target.value)}
                        sx={{ minWidth: 120 }}
                        disableUnderline
                      >
                        {CATEGORY_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell>{row.invoiceType || "-"}</TableCell>
                    <TableCell>{row.billingGST || "-"}</TableCell>
                    <TableCell>{row.invoiceNo || "-"}</TableCell>
                    <TableCell>{vObj?.name || row.vendorName || "-"}</TableCell>
                    <TableCell align="right">{row.amount?.toLocaleString("en-IN") || "-"}</TableCell>
                    <TableCell>
                       <Stack direction="row" spacing={1} alignItems="center">
                        {row.invoiceUrl && <MuiLink href={row.invoiceUrl} target="_blank">View</MuiLink>}
                        {!isDeleted && (
                          <IconButton component="label" size="small">
                            <CloudUploadIcon fontSize="small" />
                            <input type="file" hidden onChange={(e) => handleRowInvoiceUpload(row, e.target.files[0])} />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell><Checkbox size="small" checked={!!row.matched2B} onChange={() => handleInlineFieldChange(row, "matched2B", !row.matched2B)} /></TableCell>
                    <TableCell><Checkbox size="small" checked={!!row.tally} onChange={() => handleInlineFieldChange(row, "tally", !row.tally)} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Card>


      {/* BEAUTIFUL ADD VENDOR DIALOG */}
      <Dialog
        open={openAddVendor}
        onClose={() => setOpenAddVendor(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            px: 1,
            pb: 1,
            boxShadow: '0px 10px 30px rgba(0,0,0,0.1)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, pt: 3 }}>
          Add Vendor
        </DialogTitle>
       
        <Divider variant="middle" sx={{ mb: 2 }} />


        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={3}>
            <TextField
              label="Vendor Name *"
              placeholder="e.g. Acme Corp"
              fullWidth
              required
              variant="outlined"
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />


            <Stack direction="row" spacing={2}>
              <TextField
                label="Phone"
                placeholder="10-digit number"
                fullWidth
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocalPhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Email"
                placeholder="vendor@email.com"
                fullWidth
                value={vendorForm.email}
                onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                error={vendorForm.email !== "" && !validateEmail(vendorForm.email)}
                helperText={vendorForm.email !== "" && !validateEmail(vendorForm.email) ? "Invalid format" : ""}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>


            <Stack direction="row" alignItems="center" justifyContent="flex-start" sx={{ pl: 0.5 }}>
              <Switch
                color="primary"
                checked={vendorForm.hasGST}
                onChange={(e) => setVendorForm({ ...vendorForm, hasGST: e.target.checked })}
              />
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                Has GST?
              </Typography>
            </Stack>


            {vendorForm.hasGST && (
              <TextField
                label="GST Number"
                placeholder="Enter 15-digit GSTIN"
                fullWidth
                required
                variant="outlined"
                value={vendorForm.gstNumber}
                onChange={(e) => setVendorForm({ ...vendorForm, gstNumber: e.target.value })}
                sx={{
                  animation: 'fadeIn 0.3s ease-in-out',
                  '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(-10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ReceiptIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          </Stack>
        </DialogContent>


        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOpenAddVendor(false)}
            sx={{ color: 'text.secondary', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveVendor}
            sx={{
              px: 4,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: '0px 4px 10px rgba(25, 118, 210, 0.3)'
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
{/* BULK UPLOAD DIALOG */}
<Dialog
  open={openBulkUpload}
  onClose={() => setOpenBulkUpload(false)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle sx={{ fontWeight: 700 }}>
    Bulk Upload Purchase Records
  </DialogTitle>


  <DialogContent dividers>
    <Stack spacing={2} mt={1}>
      <TextField
        label="Default Date for Records"
        type="date"
        value={bulkDate}
        onChange={(e) => setBulkDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth
      />


      <Button
        variant="outlined"
        component="label"
        startIcon={<UploadFileIcon />}
      >
        {bulkFile ? bulkFile.name : "Choose CSV / Excel File"}
        <input
          type="file"
          hidden
          accept=".csv,.xls,.xlsx"
          onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
        />
      </Button>


      <Typography variant="body2" color="text.secondary">
        Supported formats: CSV, XLS, XLSX
      </Typography>
    </Stack>
  </DialogContent>


  <DialogActions>
    <Button onClick={() => setOpenBulkUpload(false)}>
      Cancel
    </Button>
    <Button
      variant="contained"
      onClick={handleBulkUpload}
      disabled={bulkUploading}
    >
      {bulkUploading ? "Uploading..." : "Upload"}
    </Button>
  </DialogActions>
</Dialog>


      {/* SNACKBARS */}
      <Snackbar open={!!errorMsg} autoHideDuration={4000} onClose={() => setErrorMsg("")}>
        <Alert severity="error" variant="filled">{errorMsg}</Alert>
      </Snackbar>
      <Snackbar open={!!successMsg} autoHideDuration={3000} onClose={() => setSuccessMsg("")}>
        <Alert severity="success" variant="filled">{successMsg}</Alert>
      </Snackbar>
    </Box>
  );
};


export default PurchaseRecordsPage;


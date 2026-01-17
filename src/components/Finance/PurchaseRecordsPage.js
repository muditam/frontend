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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import axios from "axios";

// -----------------------------
// API
// -----------------------------
const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

// -----------------------------
// CONSTANTS
// -----------------------------
const CATEGORY_OPTIONS = [
  "Advertisement",
  "Assets",
  "Assets (Intangible)",
  "Bank Charges",
  "COGS",
  "Commision",
  "Freight Inwards",
  "Marketing",
  "Operating Expense",
  "Packaging Material",
  "Professional Charges",
  "Services",
  "Software & Tools",
  "Travel Expense",
  "Freight Outwards",
  "Stock transfer",
  "Other",
];

const INVOICE_TYPE_OPTIONS = ["Credit Note", "Tax Invoice", "Debit Note"];

const BILLING_GST_OPTIONS = [
  "Himachal Pardesh",
  "Delhi",
  "Tamil Nadu",
  "Maharastra",
  "Haryana",
  "West Bengal",
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
    day: "2-digit",
    month: "short",
    year: "numeric",
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

// Debounce helper (for server-side filter typing)
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
  // Data state (SERVER-PAGED)
  const [records, setRecords] = useState([]); // current page only
  const [total, setTotal] = useState(0); // total matching items (server)
  const [vendors, setVendors] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showDeleted, setShowDeleted] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters (SERVER-SIDE)
  const [filters, setFilters] = useState({
    vendor: null, // vendor object
    invoiceNo: "",
    amount: "",
    date: "", // yyyy-mm-dd
  });
  const debouncedFilters = useDebouncedValue(filters, 350);

  // Dialogs
  const [openAddVendor, setOpenAddVendor] = useState(false);
  const [openAddRecord, setOpenAddRecord] = useState(false); // kept but unused
  const [openBulkUpload, setOpenBulkUpload] = useState(false);

  // Forms
  const [vendorForm, setVendorForm] = useState({
    name: "",
    phone: "",
    email: "",
    hasGST: false,
    gstNumber: "",
  });

  // (Unused dialog form kept intact)
  const [recordForm, setRecordForm] = useState({
    date: todayISO(),
    category: "",
    invoiceType: "",
    billingGST: "",
    invoiceNo: "",
    vendor: null,
    amount: "",
    invoiceUrl: "",
    matched2B: false,
    tally: false,
  });

  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [rowInvoiceUploadingId, setRowInvoiceUploadingId] = useState(null);

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkDate, setBulkDate] = useState(todayISO());
  const [bulkUploading, setBulkUploading] = useState(false);

  // Abort in-flight fetch for smooth UX
  const abortRef = useRef(null);

  // -----------------------------
  // FETCH VENDORS (ONCE)
  // -----------------------------
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const vendorsRes = await axios.get(`${API_BASE}/api/vendors`);
        setVendors(Array.isArray(vendorsRes.data) ? vendorsRes.data : []);
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load vendors");
      }
    };
    fetchVendors();
  }, []);

  // Vendor map (handles _id as string)
  const vendorById = useMemo(() => {
    const map = new Map();
    vendors.forEach((v) => map.set(String(v._id), v));
    return map;
  }, [vendors]);

  // -----------------------------
  // FILTER HELPERS (reset page to 0)
  // -----------------------------
  const updateFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ vendor: null, invoiceNo: "", amount: "", date: "" });
    setPage(0);
  };

  // -----------------------------
  // FETCH RECORDS (SERVER FILTER + PAGINATION)
  // -----------------------------
  const fetchRecords = useCallback(async () => {
    try {
      // cancel previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      const params = {
        page,
        limit: rowsPerPage,
        showDeleted: showDeleted ? "true" : "false",
      };

      // ✅ Vendor filter: send BOTH vendorId + vendorName (so it matches rows where vendorId is null)
      const vId = safeId(debouncedFilters.vendor);
      const vName = String(debouncedFilters.vendor?.name || "").trim();
      if (vId) params.vendorId = vId;
      if (vName) params.vendorName = vName;

      // Invoice No filter
      const inv = String(debouncedFilters.invoiceNo || "").trim();
      if (inv) params.invoiceNo = inv;

      // Amount filter (exact)
      const amtStr = String(debouncedFilters.amount ?? "").trim();
      if (amtStr !== "" && Number.isFinite(Number(amtStr))) {
        // send as number (still becomes querystring, but stays clean)
        params.amount = Number(amtStr);
      }

      // Date filter (YYYY-MM-DD)
      const dt = String(debouncedFilters.date || "").trim();
      if (dt && isYMD(dt)) params.date = dt;

      const res = await axios.get(`${API_BASE}/api/purchase-records`, {
        params,
        signal: controller.signal,
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
      // ignore abort/cancel errors (smooth UX while typing)
      const isCanceled =
        err?.name === "CanceledError" ||
        err?.code === "ERR_CANCELED" ||
        String(err?.message || "").toLowerCase().includes("canceled");

      if (!isCanceled) {
        console.error(err);
        setErrorMsg("Failed to load purchase records");
        setRecords([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    showDeleted,
    debouncedFilters.vendor,
    debouncedFilters.invoiceNo,
    debouncedFilters.amount,
    debouncedFilters.date,
  ]);

  useEffect(() => {
    fetchRecords();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchRecords]);

  // -----------------------------
  // TABLE + PAGINATION
  // -----------------------------
  const handleChangePage = (_e, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // -----------------------------
  // PATCH A RECORD (optimistic - current page only)
  // -----------------------------
  const patchRecord = async (record, patch) => {
    if (!record || !record._id) return;
    const original = { ...record };
    const updated = { ...record, ...patch };

    setRecords((prev) => prev.map((r) => (r._id === record._id ? updated : r)));

    try {
      await axios.patch(`${API_BASE}/api/purchase-records/${record._id}`, patch);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update record");
      setRecords((prev) => prev.map((r) => (r._id === record._id ? original : r)));
    }
  };

  const handleInlineFieldChange = (record, field, value) => {
    if (record.isDeleted) return;
    patchRecord(record, { [field]: value });
  };

  // -----------------------------
  // DELETE (SOFT DELETE)
  // -----------------------------
  const handleDeleteRecord = async (record) => {
    if (record.isDeleted) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this record?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE}/api/purchase-records/${record._id}`);

      if (showDeleted) {
        setRecords((prev) => prev.map((r) => (r._id === record._id ? { ...r, isDeleted: true } : r)));
      } else {
        setRecords((prev) => prev.filter((r) => r._id !== record._id));
        setTotal((t) => Math.max(0, t - 1));
      }

      setSuccessMsg("Record deleted");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete record");
    }
  };

  const handleToggleCheckbox = (record, field) => {
    if (record.isDeleted) return;
    patchRecord(record, { [field]: !record[field] });
  };

  // -----------------------------
  // ADD VENDOR
  // -----------------------------
  const resetVendorForm = () => {
    setVendorForm({ name: "", phone: "", email: "", hasGST: false, gstNumber: "" });
  };

  const handleSaveVendor = async () => {
    if (!vendorForm.name.trim()) {
      setErrorMsg("Vendor name is required");
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/api/vendors`, {
        name: vendorForm.name.trim(),
        phone: vendorForm.phone.trim(),
        email: vendorForm.email.trim(),
        hasGST: vendorForm.hasGST,
        gstNumber: vendorForm.hasGST ? vendorForm.gstNumber.trim() : "",
      });

      const newVendor = res.data;
      setVendors((prev) => [newVendor, ...prev]);
      setSuccessMsg("Vendor added");
      setOpenAddVendor(false);
      resetVendorForm();
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (status === 409) setErrorMsg(msg || "GST number already exists");
      else setErrorMsg("Failed to save vendor");
    }
  };

  // -----------------------------
  // ADD RECORD INLINE
  // -----------------------------
  const handleAddRecordInline = async () => {
    try {
      const payload = {
        date: todayISO(),
        category: "",
        invoiceType: "",
        billingGST: "",
        invoiceNo: "",
        vendorId: null,
        vendorName: "",
        amount: "",
        invoiceUrl: "",
        matched2B: false,
        tally: false,
      };

      const res = await axios.post(`${API_BASE}/api/purchase-records`, payload);
      const newRecordFromServer = res.data || {};

      const newRecord = {
        ...payload,
        ...newRecordFromServer,
        isNew: true,
      };

      if (page !== 0) setPage(0);

      setRecords((prev) => [newRecord, ...prev].slice(0, rowsPerPage));
      setTotal((t) => t + 1);
      setSuccessMsg("New empty record added");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to add record");
    }
  };

  // -----------------------------
  // BULK UPLOAD
  // -----------------------------
  const handleBulkFileChange = (e) => setBulkFile(e.target.files?.[0] || null);

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      setErrorMsg("Please select a file to upload");
      return;
    }

    try {
      setBulkUploading(true);
      const formData = new FormData();
      formData.append("file", bulkFile);
      formData.append("date", bulkDate);

      const res = await axios.post(`${API_BASE}/api/purchase-records/bulk-upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const created = res.data?.records || [];
      setSuccessMsg(`Bulk upload completed (${created.length})`);
      setOpenBulkUpload(false);
      setBulkFile(null);
      setBulkDate(todayISO());

      setPage(0);
      fetchRecords();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to bulk upload");
    } finally {
      setBulkUploading(false);
    }
  };

  // -----------------------------
  // ROW INVOICE UPLOAD
  // -----------------------------
  const handleRowInvoiceUpload = async (record, file) => {
    if (!file || !record?._id) return;

    try {
      setRowInvoiceUploadingId(record._id);
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_BASE}/api/purchase-records/upload-invoice`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = res.data?.url;
      if (!url) throw new Error("No URL returned from upload");

      await patchRecord(record, { invoiceUrl: url });
      setSuccessMsg("Invoice uploaded");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to upload invoice");
    } finally {
      setRowInvoiceUploadingId(null);
    }
  };

  // -----------------------------
  // (Old) ADD RECORD DIALOG (kept unchanged)
  // -----------------------------
  const resetRecordForm = () => {
    setRecordForm({
      date: todayISO(),
      category: "",
      invoiceType: "",
      billingGST: "",
      invoiceNo: "",
      vendor: null,
      amount: "",
      invoiceUrl: "",
      matched2B: false,
      tally: false,
    });
    setInvoiceUploading(false);
  };

  const handleInvoiceFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setInvoiceUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_BASE}/api/purchase-records/upload-invoice`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = res.data?.url;
      if (!url) throw new Error("No URL returned from upload");

      setRecordForm((prev) => ({ ...prev, invoiceUrl: url }));
      setSuccessMsg("Invoice uploaded");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to upload invoice");
    } finally {
      setInvoiceUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveRecord = async () => {
    if (!recordForm.vendor) return setErrorMsg("Vendor is required");
    if (!recordForm.category) return setErrorMsg("Category is required");
    if (!recordForm.invoiceType) return setErrorMsg("Invoice type is required");
    if (!recordForm.billingGST) return setErrorMsg("Billing GST is required");
    if (!recordForm.invoiceNo.trim()) return setErrorMsg("Invoice No. is required");
    if (!recordForm.amount) return setErrorMsg("Amount is required");

    try {
      const payload = {
        date: recordForm.date,
        category: recordForm.category,
        invoiceType: recordForm.invoiceType,
        billingGST: recordForm.billingGST,
        invoiceNo: recordForm.invoiceNo.trim(),
        vendorId: recordForm.vendor._id,
        vendorName: recordForm.vendor.name,
        amount: Number(recordForm.amount),
        invoiceUrl: recordForm.invoiceUrl,
        matched2B: recordForm.matched2B,
        tally: recordForm.tally,
      };

      await axios.post(`${API_BASE}/api/purchase-records`, payload);
      setSuccessMsg("Record added");
      setOpenAddRecord(false);
      resetRecordForm();

      setPage(0);
      fetchRecords();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save record");
    }
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Purchase Records
      </Typography>

      {/* TOP BUTTON BAR + FILTERS */}
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        mb={2}
        alignItems={{ xs: "stretch", lg: "center" }}
        flexWrap="wrap"
      >
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAddVendor(true)}>
          Add Vendor
        </Button>

        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddRecordInline}>
          Add Record
        </Button>

        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setOpenBulkUpload(true)}>
          Bulk Upload
        </Button>

        <Button
          variant={showDeleted ? "contained" : "outlined"}
          color={showDeleted ? "secondary" : "inherit"}
          startIcon={<RestoreFromTrashIcon />}
          onClick={() => {
            setShowDeleted((prev) => !prev);
            setPage(0);
          }}
        >
          Show Deleted
        </Button>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", lg: "block" }, mx: 1 }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ flex: 1, justifyContent: { lg: "flex-end" } }}
        >
          {/* Vendor filter */}
          <Autocomplete
            size="small"
            options={vendors}
            value={filters.vendor}
            isOptionEqualToValue={(opt, val) => opt?._id === val?._id}
            getOptionLabel={(opt) => opt?.name || ""}
            onChange={(_, val) => updateFilters({ vendor: val })}
            renderInput={(params) => <TextField {...params} label="Vendor" />}
            sx={{ minWidth: 220 }}
          />

          {/* Invoice No filter */}
          <TextField
            size="small"
            label="Invoice No"
            value={filters.invoiceNo}
            onChange={(e) => updateFilters({ invoiceNo: e.target.value })}
            sx={{ minWidth: 160 }}
          />

          {/* Amount filter */}
          <TextField
            size="small"
            label="Amount"
            type="number"
            value={filters.amount}
            onChange={(e) => updateFilters({ amount: e.target.value })}
            sx={{ minWidth: 140 }}
          />

          {/* Date filter */}
          <TextField
            size="small"
            label="Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filters.date}
            onChange={(e) => updateFilters({ date: e.target.value })}
            sx={{ minWidth: 160 }}
          />

          <Button variant="outlined" size="small" onClick={clearFilters}>
            Clear
          </Button>
        </Stack>
      </Stack>

      <Card variant="outlined" sx={{ position: "relative" }}>
        {loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Actions</TableCell>
                <TableCell>S. No.</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Invoice Type</TableCell>
                <TableCell>Billing GST</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Invoice No.</TableCell>
                <TableCell sx={{ minWidth: 220 }}>Vendor Name</TableCell>
                <TableCell sx={{ minWidth: 160 }} align="right">
                  Amount
                </TableCell>
                <TableCell>Invoice Link</TableCell>
                <TableCell>Matched 2B</TableCell>
                <TableCell>Tally</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {!loading && records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    No records found
                  </TableCell>
                </TableRow>
              )}

              {records.map((row, index) => {
                const serialNumber = page * rowsPerPage + index + 1;
                const isDeleted = !!row.isDeleted;
                const isNew = !!row.isNew;

                const rowVendorId = safeId(row.vendorId);
                const vendorObj = rowVendorId ? vendorById.get(String(rowVendorId)) : null;
                const vendorLabel = vendorObj?.name || row.vendorName || "-";

                return (
                  <TableRow key={row._id || serialNumber} hover>
                    {/* Actions */}
                    <TableCell>
                      <Tooltip title={isDeleted ? "Already deleted" : "Delete this record"}>
                        <span>
                          <IconButton size="small" onClick={() => handleDeleteRecord(row)} disabled={isDeleted}>
                            <DeleteIcon fontSize="small" color={isDeleted ? "disabled" : "error"} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>

                    {/* S. No. */}
                    <TableCell>{serialNumber}</TableCell>

                    {/* Date */}
                    <TableCell>
                      {isNew && !isDeleted ? (
                        <TextField
                          type="date"
                          size="small"
                          value={toInputDate(row.date)}
                          onChange={(e) => handleInlineFieldChange(row, "date", e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      ) : (
                        toReadableDate(row.date)
                      )}
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      {isNew && !isDeleted ? (
                        <FormControl fullWidth size="small">
                          <Select
                            value={row.category || ""}
                            onChange={(e) => handleInlineFieldChange(row, "category", e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>Select</em>
                            </MenuItem>
                            {CATEGORY_OPTIONS.map((cat) => (
                              <MenuItem key={cat} value={cat}>
                                {cat}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        row.category || "-"
                      )}
                    </TableCell>

                    {/* Invoice Type */}
                    <TableCell>
                      {isNew && !isDeleted ? (
                        <FormControl fullWidth size="small">
                          <Select
                            value={row.invoiceType || ""}
                            onChange={(e) => handleInlineFieldChange(row, "invoiceType", e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>Select</em>
                            </MenuItem>
                            {INVOICE_TYPE_OPTIONS.map((it) => (
                              <MenuItem key={it} value={it}>
                                {it}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        row.invoiceType || "-"
                      )}
                    </TableCell>

                    {/* Billing GST */}
                    <TableCell>
                      {isNew && !isDeleted ? (
                        <FormControl fullWidth size="small">
                          <Select
                            value={row.billingGST || ""}
                            onChange={(e) => handleInlineFieldChange(row, "billingGST", e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>Select</em>
                            </MenuItem>
                            {BILLING_GST_OPTIONS.map((st) => (
                              <MenuItem key={st} value={st}>
                                {st}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        row.billingGST || "-"
                      )}
                    </TableCell>

                    {/* Invoice No */}
                    <TableCell sx={{ minWidth: 160 }}>
                      {isNew && !isDeleted ? (
                        <TextField
                          size="small"
                          fullWidth
                          value={row.invoiceNo || ""}
                          onChange={(e) => handleInlineFieldChange(row, "invoiceNo", e.target.value)}
                        />
                      ) : (
                        row.invoiceNo || "-"
                      )}
                    </TableCell>

                    {/* Vendor Name */}
                    <TableCell sx={{ minWidth: 220 }}>
                      {isNew && !isDeleted ? (
                        <Autocomplete
                          size="small"
                          options={vendors}
                          isOptionEqualToValue={(opt, val) => opt?._id === val?._id}
                          getOptionLabel={(option) => option?.name || ""}
                          value={vendorObj || null}
                          onChange={(_e, newVal) => {
                            handleInlineFieldChange(row, "vendorId", newVal?._id || null);
                            handleInlineFieldChange(row, "vendorName", newVal?.name || "");
                          }}
                          renderInput={(params) => <TextField {...params} placeholder="Select vendor" fullWidth />}
                        />
                      ) : (
                        vendorLabel
                      )}
                    </TableCell>

                    {/* Amount */}
                    <TableCell sx={{ minWidth: 140 }} align="right">
                      {isNew && !isDeleted ? (
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          value={row.amount ?? ""}
                          onChange={(e) => handleInlineFieldChange(row, "amount", Number(e.target.value || 0))}
                          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                          sx={{
                            "& input[type=number]": { MozAppearance: "textfield" },
                            "& input[type=number]::-webkit-outer-spin-button": { WebkitAppearance: "none", margin: 0 },
                            "& input[type=number]::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
                          }}
                        />
                      ) : row.amount != null ? (
                        Number(row.amount).toLocaleString("en-IN")
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    {/* Invoice Link + Upload */}
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {row.invoiceUrl ? (
                          <MuiLink href={row.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            View
                          </MuiLink>
                        ) : (
                          "-"
                        )}

                        {!isDeleted && row._id && (
                          <>
                            <input
                              type="file"
                              hidden
                              id={`invoice-upload-${row._id}`}
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleRowInvoiceUpload(row, file);
                                e.target.value = "";
                              }}
                            />
                            <label htmlFor={`invoice-upload-${row._id}`}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CloudUploadIcon />}
                                component="span"
                                disabled={rowInvoiceUploadingId === row._id}
                              >
                                {rowInvoiceUploadingId === row._id ? "Uploading..." : "Upload"}
                              </Button>
                            </label>
                          </>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Matched 2B */}
                    <TableCell>
                      <Checkbox
                        checked={!!row.matched2B}
                        disabled={isDeleted}
                        onChange={() => handleToggleCheckbox(row, "matched2B")}
                      />
                    </TableCell>

                    {/* Tally */}
                    <TableCell>
                      <Checkbox checked={!!row.tally} disabled={isDeleted} onChange={() => handleToggleCheckbox(row, "tally")} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* SERVER-SIDE PAGINATION */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* ------------------ ADD VENDOR DIALOG ------------------ */}
      <Dialog open={openAddVendor} onClose={() => setOpenAddVendor(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Vendor</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Vendor Name"
              value={vendorForm.name}
              onChange={(e) => setVendorForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Phone"
              value={vendorForm.phone}
              onChange={(e) => setVendorForm((prev) => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Email"
              value={vendorForm.email}
              onChange={(e) => setVendorForm((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={vendorForm.hasGST}
                  onChange={(e) =>
                    setVendorForm((prev) => ({
                      ...prev,
                      hasGST: e.target.checked,
                      gstNumber: e.target.checked ? prev.gstNumber : "",
                    }))
                  }
                />
              }
              label="Has GST"
            />
            <TextField
              label="GST Number"
              value={vendorForm.gstNumber}
              onChange={(e) => setVendorForm((prev) => ({ ...prev, gstNumber: e.target.value }))}
              fullWidth
              disabled={!vendorForm.hasGST}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddVendor(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveVendor}>
            Save Vendor
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------ ADD RECORD DIALOG (NOT USED) ------------------ */}
      <Dialog open={openAddRecord} onClose={() => setOpenAddRecord(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Purchase Record</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Date"
              type="date"
              value={recordForm.date}
              onChange={(e) => setRecordForm((prev) => ({ ...prev, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <Select
                  value={recordForm.category}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, category: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Select Category</em>
                  </MenuItem>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <Select
                  value={recordForm.invoiceType}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, invoiceType: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Select Invoice Type</em>
                  </MenuItem>
                  {INVOICE_TYPE_OPTIONS.map((it) => (
                    <MenuItem key={it} value={it}>
                      {it}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <Select
                  value={recordForm.billingGST}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, billingGST: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Select Billing GST</em>
                  </MenuItem>
                  {BILLING_GST_OPTIONS.map((st) => (
                    <MenuItem key={st} value={st}>
                      {st}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Invoice No."
                value={recordForm.invoiceNo}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, invoiceNo: e.target.value }))}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Autocomplete
                fullWidth
                options={vendors}
                isOptionEqualToValue={(opt, val) => opt?._id === val?._id}
                getOptionLabel={(option) => option?.name || ""}
                value={recordForm.vendor}
                onChange={(_e, newValue) => setRecordForm((prev) => ({ ...prev, vendor: newValue }))}
                renderInput={(params) => <TextField {...params} label="Vendor Name" placeholder="Select vendor" />}
              />

              <TextField
                label="Amount"
                type="number"
                value={recordForm.amount}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, amount: e.target.value }))}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              <Button variant="outlined" startIcon={<CloudUploadIcon />} component="label" disabled={invoiceUploading}>
                {invoiceUploading ? "Uploading..." : "Upload Invoice"}
                <input type="file" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleInvoiceFileChange} />
              </Button>

              {recordForm.invoiceUrl && (
                <MuiLink href={recordForm.invoiceUrl} target="_blank" rel="noopener noreferrer">
                  View Uploaded Invoice
                </MuiLink>
              )}
            </Stack>

            <Divider />

            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recordForm.matched2B}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, matched2B: e.target.checked }))}
                  />
                }
                label="Matched 2B"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recordForm.tally}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, tally: e.target.checked }))}
                  />
                }
                label="Tally"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenAddRecord(false);
              resetRecordForm();
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveRecord}>
            Save Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------ BULK UPLOAD DIALOG ------------------ */}
      <Dialog open={openBulkUpload} onClose={() => setOpenBulkUpload(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Upload Purchase Records</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Date to use for records"
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <Button variant="outlined" startIcon={<UploadFileIcon />} component="label">
              {bulkFile ? bulkFile.name : "Choose File"}
              <input
                type="file"
                hidden
                accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleBulkFileChange}
              />
            </Button>

            <Typography variant="body2" color="text.secondary">
              Supported: CSV / Excel. Backend will parse and create records.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenBulkUpload(false);
              setBulkFile(null);
              setBulkDate(todayISO());
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleBulkUpload} disabled={bulkUploading}>
            {bulkUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBARS */}
      <Snackbar open={!!errorMsg} autoHideDuration={4000} onClose={() => setErrorMsg("")}>
        <Alert severity="error" onClose={() => setErrorMsg("")} variant="filled">
          {errorMsg}
        </Alert>
      </Snackbar>

      <Snackbar open={!!successMsg} autoHideDuration={3000} onClose={() => setSuccessMsg("")}>
        <Alert severity="success" onClose={() => setSuccessMsg("")} variant="filled">
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PurchaseRecordsPage;

import React, { useEffect, useMemo, useState } from "react";
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
  InputLabel,
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import axios from "axios";

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

function sortRecordsByDateDesc(list) {
  return [...list].sort((a, b) => {
    const da = a.date ? new Date(a.date) : 0;
    const db = b.date ? new Date(b.date) : 0;
    return db - da;
  });
}

function toReadableDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value); // fallback if weird string
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }); // e.g. 02 Jan 2026
}

function toInputDate(value) {
  if (!value) return todayISO();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return todayISO();
  return d.toISOString().slice(0, 10); // yyyy-mm-dd for <input type="date">
}


// -----------------------------
// MAIN COMPONENT
// -----------------------------
const PurchaseRecordsPage = () => {
  // Data state
  const [records, setRecords] = useState([]); // [{...}]
  const [vendors, setVendors] = useState([]); // [{_id,name,phone,email,hasGST,gstNumber}]

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showDeleted, setShowDeleted] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs (Add Vendor + Add Record dialog still exists in code,
  // but Add Record button no longer opens it)
  const [openAddVendor, setOpenAddVendor] = useState(false);
  const [openAddRecord, setOpenAddRecord] = useState(false); // dialog won't be opened now
  const [openBulkUpload, setOpenBulkUpload] = useState(false);

  // Forms
  const [vendorForm, setVendorForm] = useState({
    name: "",
    phone: "",
    email: "",
    hasGST: false,
    gstNumber: "",
  });

  // This form is only used by the (now unused) Add Record dialog.
  const [recordForm, setRecordForm] = useState({
    date: todayISO(),
    category: "",
    invoiceType: "",
    billingGST: "",
    invoiceNo: "",
    vendor: null, // vendor object
    amount: "",
    invoiceUrl: "",
    matched2B: false,
    tally: false,
  });

  // For dialog upload (unused in normal flow now, but kept intact)
  const [invoiceUploading, setInvoiceUploading] = useState(false);

  // For row-level invoice upload
  const [rowInvoiceUploadingId, setRowInvoiceUploadingId] = useState(null);

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkDate, setBulkDate] = useState(todayISO());
  const [bulkUploading, setBulkUploading] = useState(false);

  // -----------------------------
  // LOAD DATA (vendors + records)
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [recordsRes, vendorsRes] = await Promise.all([
          axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/purchase-records"),
          axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/vendors"),
        ]);
        const recs = recordsRes.data || [];
        setRecords(sortRecordsByDateDesc(recs));
        setVendors(vendorsRes.data || []);
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // -----------------------------
  // FILTERED RECORDS (deleted vs not)
  // -----------------------------
  const visibleRecords = useMemo(() => {
    return records.filter((r) => (showDeleted ? r.isDeleted : !r.isDeleted));
  }, [records, showDeleted]);

  // -----------------------------
  // TABLE + PAGINATION
  // -----------------------------
  const handleChangePage = (_e, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const paginatedRecords = useMemo(() => {
    const start = page * rowsPerPage;
    return visibleRecords.slice(start, start + rowsPerPage);
  }, [visibleRecords, page, rowsPerPage]);

  // -----------------------------
  // PATCH A RECORD (generic helper)
  // -----------------------------
  const patchRecord = async (record, patch) => {
    if (!record || !record._id) return;
    const original = { ...record };
    const updated = { ...record, ...patch };

    // Optimistic update
    setRecords((prev) =>
      prev.map((r) => (r._id === record._id ? updated : r))
    );

    try {
      await axios.patch(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/purchase-records/${record._id}`, patch);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update record");
      // revert
      setRecords((prev) =>
        prev.map((r) => (r._id === record._id ? original : r))
      );
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
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this record?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/purchase-records/${record._id}`);
      setRecords((prev) =>
        prev.map((r) =>
          r._id === record._id ? { ...r, isDeleted: true } : r
        )
      );
      setSuccessMsg("Record deleted");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete record");
    }
  };

  const handleToggleCheckbox = async (record, field) => {
    if (record.isDeleted) return;
    const newValue = !record[field];
    patchRecord(record, { [field]: newValue });
  };

  // -----------------------------
  // ADD VENDOR HANDLERS
  // -----------------------------
  const resetVendorForm = () => {
    setVendorForm({
      name: "",
      phone: "",
      email: "",
      hasGST: false,
      gstNumber: "",
    });
  };

  const handleSaveVendor = async () => {
    if (!vendorForm.name.trim()) {
      setErrorMsg("Vendor name is required");
      return;
    }
    try {
      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/vendors", {
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

      if (status === 409) {
        setErrorMsg(msg || "GST number already exists");
      } else {
        setErrorMsg("Failed to save vendor");
      }
    }
  };

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

      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/purchase-records", payload);
      const newRecordFromServer = res.data || {};
      const newRecord = {
        ...payload,
        ...newRecordFromServer,
        isNew: true, // flag: this row is editable inline
      };

      setRecords((prev) =>
        sortRecordsByDateDesc([newRecord, ...prev])
      );
      setPage(0);
      setSuccessMsg("New empty record added");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to add record");
    }
  };

  // -----------------------------
  // BULK UPLOAD HANDLERS
  // -----------------------------
  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setBulkFile(file);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      setErrorMsg("Please select a file to upload");
      return;
    }

    try {
      setBulkUploading(true);
      const formData = new FormData();
      formData.append("file", bulkFile);
      formData.append("date", bulkDate); // this date will be used for Date column

      const res = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/purchase-records/bulk-upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const newRecords = res.data || [];
      if (Array.isArray(newRecords) && newRecords.length > 0) {
        setRecords((prev) =>
          sortRecordsByDateDesc([...newRecords, ...prev])
        );
      }

      setSuccessMsg("Bulk upload completed");
      setOpenBulkUpload(false);
      setBulkFile(null);
      setBulkDate(todayISO());
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to bulk upload");
    } finally {
      setBulkUploading(false);
    }
  };

  // -----------------------------
  // ROW-LEVEL INVOICE UPLOAD
  // -----------------------------
  const handleRowInvoiceUpload = async (record, file) => {
    if (!file || !record || !record._id) return;

    try {
      setRowInvoiceUploadingId(record._id);
      const formData = new FormData();
      formData.append("file", file);

      // Backend uploads to Wasabi and returns { url }
      const res = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/purchase-records/upload-invoice",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

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
  // (Old) ADD RECORD DIALOG HELPERS – kept but not used now
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

      const res = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/purchase-records/upload-invoice",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const url = res.data?.url;
      if (!url) throw new Error("No URL returned from upload");

      setRecordForm((prev) => ({
        ...prev,
        invoiceUrl: url,
      }));
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
    // (dialog flow, not used anymore from UI – kept for future if needed)
    if (!recordForm.vendor) {
      setErrorMsg("Vendor is required");
      return;
    }
    if (!recordForm.category) {
      setErrorMsg("Category is required");
      return;
    }
    if (!recordForm.invoiceType) {
      setErrorMsg("Invoice type is required");
      return;
    }
    if (!recordForm.billingGST) {
      setErrorMsg("Billing GST is required");
      return;
    }
    if (!recordForm.invoiceNo.trim()) {
      setErrorMsg("Invoice No. is required");
      return;
    }
    if (!recordForm.amount) {
      setErrorMsg("Amount is required");
      return;
    }

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

      const res = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/purchase-records", payload);
      const newRecord = res.data;

      setRecords((prev) =>
        sortRecordsByDateDesc([newRecord, ...prev])
      );
      setSuccessMsg("Record added");
      setOpenAddRecord(false);
      resetRecordForm();
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

      {/* TOP BUTTON BAR */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        mb={3}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddVendor(true)}
        >
          Add Vendor
        </Button>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddRecordInline}
        >
          Add Record
        </Button>

        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => setOpenBulkUpload(true)}
        >
          Bulk Upload
        </Button>

        <Button
          variant={showDeleted ? "contained" : "outlined"}
          color={showDeleted ? "secondary" : "inherit"}
          startIcon={<RestoreFromTrashIcon />}
          onClick={() => setShowDeleted((prev) => !prev)}
        >
          Show Deleted
        </Button>
      </Stack>

      <Card variant="outlined">
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
                <TableCell sx={{ minWidth: 160 }} align="right">Amount</TableCell>
                <TableCell>Invoice Link</TableCell>
                <TableCell>Matched 2B</TableCell>
                <TableCell>Tally</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}

              {!loading && paginatedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    No records found
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                paginatedRecords.map((row, index) => {
                  const serialNumber = page * rowsPerPage + index + 1;
                  const isDeleted = !!row.isDeleted;
                  const isNew = !!row.isNew;
                  const vendorObj = vendors.find(
                    (v) => v._id === row.vendorId
                  );

                  return (
                    <TableRow key={row._id || row.id || serialNumber} hover>
                      {/* Actions */}
                      <TableCell>
                        <Tooltip
                          title={
                            isDeleted
                              ? "Already deleted"
                              : "Delete this record"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteRecord(row)}
                              disabled={isDeleted}
                            >
                              <DeleteIcon
                                fontSize="small"
                                color={isDeleted ? "disabled" : "error"}
                              />
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
                            onChange={(e) =>
                              handleInlineFieldChange(row, "date", e.target.value)
                            }
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
                              onChange={(e) =>
                                handleInlineFieldChange(
                                  row,
                                  "category",
                                  e.target.value
                                )
                              }
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
                              onChange={(e) =>
                                handleInlineFieldChange(
                                  row,
                                  "invoiceType",
                                  e.target.value
                                )
                              }
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
                              onChange={(e) =>
                                handleInlineFieldChange(
                                  row,
                                  "billingGST",
                                  e.target.value
                                )
                              }
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

                      {/* Invoice No. */}
                      <TableCell sx={{ minWidth: 160 }}>
                        {isNew && !isDeleted ? (
                          <TextField
                            size="small"
                            fullWidth
                            value={row.invoiceNo || ""}
                            onChange={(e) =>
                              handleInlineFieldChange(row, "invoiceNo", e.target.value)
                            }
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
                            getOptionLabel={(option) => option?.name || ""}
                            value={vendorObj || null}
                            onChange={(_e, newVal) => {
                              handleInlineFieldChange(row, "vendorId", newVal?._id || null);
                              handleInlineFieldChange(row, "vendorName", newVal?.name || "");
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Select vendor"
                                fullWidth
                              />
                            )}
                          />
                        ) : (
                          row.vendorName || "-"
                        )}
                      </TableCell>


                      <TableCell sx={{ minWidth: 140 }} align="right">
                        {isNew && !isDeleted ? (
                          <TextField
                            size="small"
                            fullWidth
                            type="number"
                            value={row.amount ?? ""}
                            onChange={(e) =>
                              handleInlineFieldChange(
                                row,
                                "amount",
                                Number(e.target.value || 0)
                              )
                            }
                            inputProps={{
                              inputMode: "numeric",
                              pattern: "[0-9]*",
                            }}
                            sx={{
                              "& input[type=number]": {
                                MozAppearance: "textfield",
                              },
                              "& input[type=number]::-webkit-outer-spin-button": {
                                WebkitAppearance: "none",
                                margin: 0,
                              },
                              "& input[type=number]::-webkit-inner-spin-button": {
                                WebkitAppearance: "none",
                                margin: 0,
                              },
                            }}
                          />
                        ) : row.amount != null ? (
                          row.amount.toLocaleString()
                        ) : (
                          "-"
                        )}
                      </TableCell>



                      {/* Invoice Link + Upload */}
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {row.invoiceUrl ? (
                            <MuiLink
                              href={row.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
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
                                  if (file) {
                                    handleRowInvoiceUpload(row, file);
                                  }
                                  e.target.value = "";
                                }}
                              />
                              <label htmlFor={`invoice-upload-${row._id}`}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<CloudUploadIcon />}
                                  component="span"
                                  disabled={
                                    rowInvoiceUploadingId === row._id
                                  }
                                >
                                  {rowInvoiceUploadingId === row._id
                                    ? "Uploading..."
                                    : "Upload"}
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
                          onChange={() =>
                            handleToggleCheckbox(row, "matched2B")
                          }
                        />
                      </TableCell>

                      {/* Tally */}
                      <TableCell>
                        <Checkbox
                          checked={!!row.tally}
                          disabled={isDeleted}
                          onChange={() =>
                            handleToggleCheckbox(row, "tally")
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={visibleRecords.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* ------------------ ADD VENDOR DIALOG ------------------ */}
      <Dialog
        open={openAddVendor}
        onClose={() => setOpenAddVendor(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Vendor</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Vendor Name"
              value={vendorForm.name}
              onChange={(e) =>
                setVendorForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              fullWidth
              required
            />
            <TextField
              label="Phone"
              value={vendorForm.phone}
              onChange={(e) =>
                setVendorForm((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="Email"
              value={vendorForm.email}
              onChange={(e) =>
                setVendorForm((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
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
              onChange={(e) =>
                setVendorForm((prev) => ({
                  ...prev,
                  gstNumber: e.target.value,
                }))
              }
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
      <Dialog
        open={openAddRecord}
        onClose={() => setOpenAddRecord(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Purchase Record</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            {/* Date */}
            <TextField
              label="Date"
              type="date"
              value={recordForm.date}
              onChange={(e) =>
                setRecordForm((prev) => ({ ...prev, date: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            {/* Category + Invoice Type */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  label="Category"
                  value={recordForm.category}
                  onChange={(e) =>
                    setRecordForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="invoice-type-label">Invoice Type</InputLabel>
                <Select
                  labelId="invoice-type-label"
                  label="Invoice Type"
                  value={recordForm.invoiceType}
                  onChange={(e) =>
                    setRecordForm((prev) => ({
                      ...prev,
                      invoiceType: e.target.value,
                    }))
                  }
                >
                  {INVOICE_TYPE_OPTIONS.map((it) => (
                    <MenuItem key={it} value={it}>
                      {it}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Billing GST + Invoice No */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="billing-gst-label">Billing GST</InputLabel>
                <Select
                  labelId="billing-gst-label"
                  label="Billing GST"
                  value={recordForm.billingGST}
                  onChange={(e) =>
                    setRecordForm((prev) => ({
                      ...prev,
                      billingGST: e.target.value,
                    }))
                  }
                >
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
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    invoiceNo: e.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>

            {/* Vendor + Amount */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Autocomplete
                fullWidth
                options={vendors}
                getOptionLabel={(option) =>
                  option.name ? option.name : ""
                }
                value={recordForm.vendor}
                onChange={(_e, newValue) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    vendor: newValue,
                  }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Vendor Name"
                    placeholder="Select vendor"
                  />
                )}
              />

              <TextField
                label="Amount"
                type="number"
                value={recordForm.amount}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>

            {/* Invoice Upload */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="center"
            >
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                component="label"
                disabled={invoiceUploading}
              >
                {invoiceUploading ? "Uploading..." : "Upload Invoice"}
                <input
                  type="file"
                  hidden
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleInvoiceFileChange}
                />
              </Button>

              {recordForm.invoiceUrl && (
                <MuiLink
                  href={recordForm.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Uploaded Invoice
                </MuiLink>
              )}
            </Stack>

            <Divider />

            {/* Matched 2B & Tally */}
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recordForm.matched2B}
                    onChange={(e) =>
                      setRecordForm((prev) => ({
                        ...prev,
                        matched2B: e.target.checked,
                      }))
                    }
                  />
                }
                label="Matched 2B"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recordForm.tally}
                    onChange={(e) =>
                      setRecordForm((prev) => ({
                        ...prev,
                        tally: e.target.checked,
                      }))
                    }
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
      <Dialog
        open={openBulkUpload}
        onClose={() => setOpenBulkUpload(false)}
        maxWidth="sm"
        fullWidth
      >
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

            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              component="label"
            >
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
      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
        onClose={() => setErrorMsg("")}
      >
        <Alert
          severity="error"
          onClose={() => setErrorMsg("")}
          variant="filled"
        >
          {errorMsg}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg("")}
      >
        <Alert
          severity="success"
          onClose={() => setSuccessMsg("")}
          variant="filled"
        >
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PurchaseRecordsPage;

// src/pages/PurchaseRecord.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  Box,
  Button,
  TableRow,
  Paper,
  IconButton,
  TextField,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem,
  Select,
  FormControl,
  Typography,
  Autocomplete,
  Switch,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
} from "@mui/icons-material";

const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const categories = [
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

const invoiceTypes = ["Credit Note", "Tax Invoice", "Debit Note"];

const gstLocations = [
  "Himachal Pradesh",
  "Delhi",
  "Maharashtra",
  "Tamil Nadu",
  "Haryana",
  "West Bengal",
];

const headerCellSx = {
  backgroundColor: "#111827",
  color: "#f9fafb",
  fontWeight: 700,
  fontSize: 13,
  whiteSpace: "nowrap",
  padding: "8px 10px",
  borderBottom: "1px solid #e5e7eb",
};

const inputBorderSx = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "#d4d4d4" },
    "&:hover fieldset": { borderColor: "#000" },
    "&.Mui-focused fieldset": { borderColor: "#000" },
  },
  "& .MuiInputBase-input, & .MuiSelect-select": {
    paddingTop: 0.4,
    paddingBottom: 0.4,
    fontSize: 13,
  },
};

function validateVendorForm(vendor, showSnackbar) {
  if (vendor.phoneNumber && !/^\d{10}$/.test(vendor.phoneNumber)) {
    showSnackbar("Phone number must be exactly 10 digits", "error");
    return false;
  }
  if (vendor.hasGST) {
    const gst = vendor.gstNumber.trim().toUpperCase();
    if (gst.length !== 15 || !/^[A-Z0-9]{15}$/.test(gst)) {
      showSnackbar("GST number must be exactly 15 characters", "error");
      return false;
    }
  }
  return true;
}

function formatDateForInput(v) {
  if (!v && v !== 0) return "";
  if (v instanceof Date) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const dd = String(v.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof v === "number") return formatDateForInput(new Date(v));
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const t = v.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return formatDateForInput(d);
  }
  return "";
}

const PurchaseRecord = () => {
  const [records, setRecords] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    hasGST: true,
    gstNumber: "",
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [uploading, setUploading] = useState({});
  const [saving, setSaving] = useState({});
  const bulkInputRef = useRef(null);

  const [deletedRecords, setDeletedRecords] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    fetchList();
    fetchVendors();
  }, [page, rowsPerPage]);

  async function fetchList() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/purchase-records?page=${page + 1}&limit=${rowsPerPage}`
      );
      const data = await res.json();
      const items = data.records || data.items || [];
      setRecords(items);
      setTotal(data.total || items.length);
    } catch (err) {
      showSnackbar("Failed to load records", "error");
    }
  }

  async function fetchVendors() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/purchase-records/vendors?limit=2000`
      );
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch (err) {
      showSnackbar("Failed to load vendors", "error");
    }
  }

  function showSnackbar(message, severity = "info") {
    setSnackbar({ open: true, message, severity });
  }

  function handleSnackbarClose() {
    setSnackbar((s) => ({ ...s, open: false }));
  }

  function addTempRow() {
    const tempId = "temp-" + Date.now();
    const today = new Date().toISOString().split("T")[0];
    setRecords((r) => [
      {
        _id: tempId,
        isTemp: true,
        date: today,
        category: "",
        invoiceType: "",
        billingGST: "",
        invoiceNo: "",
        vendorName: "",
        amount: "",
        invoiceLink: "",
        matched2B: false,
        invoicingTally: false,
      },
      ...r,
    ]);
  }

  async function createVendorIfNeededByName(name) {
    if (!name || !name.trim()) return null;
    const found = vendors.find(
      (v) =>
        String(v.name || "").trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (found) return found;

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase-records/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      const created = data.vendor || data;
      setVendors((prev) => [...prev, created]);
      return created;
    } catch (err) {
      showSnackbar("Failed to create vendor", "error");
      return null;
    }
  }

  async function saveTempRow(record) {
    if (
      !record.vendorName ||
      !record.category ||
      !record.date ||
      !record.invoiceNo
    ) {
      showSnackbar(
        "Please fill Date, Category, Vendor Name & Invoice No",
        "warning"
      );
      return;
    }

    setSaving((prev) => ({ ...prev, [record._id]: true }));

    try {
      const vendor = await createVendorIfNeededByName(record.vendorName);
      if (!vendor) return;

      const payload = {
        date: record.date,
        category: record.category,
        invoiceType: record.invoiceType,
        billingGST: record.billingGST,
        invoiceNo: record.invoiceNo,
        vendorId: vendor._id,
        vendorName: vendor.name,
        amount: Number(record.amount || 0),
        invoiceLink: record.invoiceLink || "",
        matched2B: !!record.matched2B,
        invoicingTally: !!record.invoicingTally,
      };

      const res = await fetch(`${API_BASE_URL}/api/purchase-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save");
      }

      const saved = data.record || data.purchase || data;

      setRecords((prev) =>
        prev.map((r) =>
          r._id === record._id ? { ...saved, isTemp: false } : r
        )
      );

      showSnackbar("Record saved successfully", "success");
    } catch (err) {
      showSnackbar(
        "Failed to save record: " + (err.message || "Unknown error"),
        "error"
      );
    } finally {
      setSaving((prev) => ({ ...prev, [record._id]: false }));
    }
  }

  async function saveExistingRow(record) {
    if (
      !record.date ||
      !record.category ||
      !record.vendorName ||
      !record.invoiceNo
    ) {
      showSnackbar(
        "Date, Category, Vendor Name & Invoice No are required",
        "warning"
      );
      return;
    }

    if (!record._id || record.isTemp) return;

    setSaving((prev) => ({ ...prev, [record._id]: true }));

    try {
      const payload = {
        date: record.date,
        category: record.category,
        invoiceType: record.invoiceType,
        billingGST: record.billingGST,
        invoiceNo: record.invoiceNo,
        amount: Number(record.amount || 0),
        invoiceLink: record.invoiceLink || "",
        matched2B: !!record.matched2B,
        invoicingTally: !!record.invoicingTally,
      };

      const res = await fetch(`${API_BASE_URL}/api/purchase-records/${record._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update");
      }

      showSnackbar("Record updated", "success");
    } catch (err) {
      showSnackbar(
        "Failed to update record: " + (err.message || "Unknown error"),
        "error"
      );
    } finally {
      setSaving((prev) => ({ ...prev, [record._id]: false }));
    }
  }

  async function handleFieldBlur(record) {
    if (!record) return;
    if (record.isTemp) await saveTempRow(record);
    else await saveExistingRow(record);
  }

  function handleFieldChange(id, field, value) {
    setRecords((prev) =>
      prev.map((r) => (r._id === id ? { ...r, [field]: value } : r))
    );
  }

  async function handleBulkFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    const fd = new FormData();
    fd.append("file", f);

    try {
      showSnackbar("Uploading CSV...", "info");

      const res = await fetch(
        `${API_BASE_URL}/api/purchase-records/upload-csv`,
        {
          method: "POST",
          body: fd,
        }
      );

      if (!res.ok) throw new Error("Bulk upload failed");

      const data = await res.json();
      showSnackbar(
        `${data.inserted || data.insertedCount || 0} rows imported successfully`,
        "success"
      );

      await fetchList();
      await fetchVendors();
    } catch (err) {
      showSnackbar("Bulk upload failed: " + err.message, "error");
    } finally {
      e.target.value = "";
    }
  }

  async function handleAddVendor() {
    if (!newVendor.name?.trim()) {
      showSnackbar("Vendor name required", "error");
      return;
    }
    if (!validateVendorForm(newVendor, showSnackbar)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase-records/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVendor),
      });

      if (!res.ok) throw new Error("Failed to create vendor");

      const data = await res.json();
      const created = data.vendor || data;

      setVendors((p) => [...p, created]);
      setVendorDialogOpen(false);

      setNewVendor({
        name: "",
        email: "",
        phoneNumber: "",
        hasGST: true,
        gstNumber: "",
      });

      showSnackbar("Vendor created", "success");
    } catch (err) {
      showSnackbar("Failed to create vendor", "error");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this record?")) return;

    const rec = records.find((r) => r._id === id);
    if (!rec) return;

    if (String(id).startsWith("temp-")) {
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setDeletedRecords((prev) => [...prev, { ...rec, isDeleted: true }]);
      showSnackbar("Record moved to deleted", "info");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase-records/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      setRecords((prev) => prev.filter((r) => r._id !== id));
      setDeletedRecords((prev) => [...prev, { ...rec, isDeleted: true }]);

      showSnackbar("Record moved to deleted list", "success");
    } catch (err) {
      showSnackbar("Delete failed", "error");
    }
  }

  async function handleFileUpload(recordId, file) {
    if (!file) return;

    setUploading((prev) => ({ ...prev, [recordId]: true }));

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase-records/upload`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      const url = data.fileUrl || data.url || data.Location;

      setRecords((prev) =>
        prev.map((r) =>
          r._id === recordId ? { ...r, invoiceLink: url } : r
        )
      );

      const record = records.find((r) => r._id === recordId);
      if (record && !record.isTemp)
        await saveExistingRow({ ...record, invoiceLink: url });

      showSnackbar("File uploaded successfully", "success");
    } catch (err) {
      showSnackbar("Upload failed", "error");
    } finally {
      setUploading((prev) => ({ ...prev, [recordId]: false }));
    }
  }

  function renderCell(record, field) {
    if (record.isDeleted) {
      return (
        <Typography sx={{ fontSize: 13, opacity: 0.6 }}>
          {String(record[field] || "-")}
        </Typography>
      );
    }

    const value = record[field] ?? "";
    const isSavingFlag = saving[record._id];

    switch (field) {
      case "date":
        return (
          <TextField
            type="date"
            size="small"
            value={formatDateForInput(record.date)}
            onChange={(e) =>
              handleFieldChange(record._id, "date", e.target.value)
            }
            onBlur={() => handleFieldBlur(record)}
            disabled={isSavingFlag}
            sx={{ minWidth: 140, ...inputBorderSx }}
          />
        );

      case "category":
        return (
          <FormControl
            fullWidth
            size="small"
            sx={{ minWidth: 170, ...inputBorderSx }}
          >
            <Select
              value={value}
              onChange={(e) =>
                handleFieldChange(record._id, "category", e.target.value)
              }
              onBlur={() => handleFieldBlur(record)}
              disabled={isSavingFlag}
              displayEmpty
            >
              <MenuItem value="">
                <em>Select Category</em>
              </MenuItem>
              {categories.map((c) => (
                <MenuItem value={c} key={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case "invoiceType":
        return (
          <FormControl size="small" sx={{ minWidth: 150, ...inputBorderSx }}>
            <Select
              value={value}
              onChange={(e) =>
                handleFieldChange(record._id, "invoiceType", e.target.value)
              }
              onBlur={() => handleFieldBlur(record)}
              disabled={isSavingFlag}
              displayEmpty
            >
              <MenuItem value="">
                <em>Select Type</em>
              </MenuItem>
              {invoiceTypes.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case "billingGST":
        return (
          <FormControl size="small" sx={{ minWidth: 160, ...inputBorderSx }}>
            <Select
              value={value}
              onChange={(e) =>
                handleFieldChange(record._id, "billingGST", e.target.value)
              }
              onBlur={() => handleFieldBlur(record)}
              disabled={isSavingFlag}
              displayEmpty
            >
              <MenuItem value="">
                <em>Select GST</em>
              </MenuItem>
              {gstLocations.map((g) => (
                <MenuItem key={g} value={g}>
                  {g}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case "invoiceNo":
        return (
          <TextField
            size="small"
            value={value}
            onChange={(e) =>
              handleFieldChange(record._id, "invoiceNo", e.target.value)
            }
            onBlur={() => handleFieldBlur(record)}
            disabled={isSavingFlag}
            sx={{ minWidth: 150, ...inputBorderSx }}
          />
        );

      case "vendorName":
        return (
          <Autocomplete
            freeSolo
            size="small"
            options={vendors.map((v) => v.name)}
            value={value}
            onInputChange={(_e, v) =>
              handleFieldChange(record._id, "vendorName", v)
            }
            onBlur={() => handleFieldBlur(record)}
            disabled={isSavingFlag}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Vendor name"
                sx={{ minWidth: 220, ...inputBorderSx }}
              />
            )}
          />
        );

      case "amount":
        return (
          <TextField
            size="small"
            type="number"
            value={value}
            onChange={(e) =>
              handleFieldChange(record._id, "amount", e.target.value)
            }
            onBlur={() => handleFieldBlur(record)}
            disabled={isSavingFlag}
            sx={{ minWidth: 110, ...inputBorderSx }}
          />
        );

      case "invoiceLink":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <input
              id={`upload-${record._id}`}
              style={{ display: "none" }}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) =>
                handleFileUpload(record._id, e.target.files?.[0])
              }
            />
            <label htmlFor={`upload-${record._id}`}>
              <Button
                component="span"
                size="small"
                variant="contained"
                startIcon={<UploadIcon />}
                disabled={uploading[record._id] || isSavingFlag}
                sx={{
                  backgroundColor: "#000",
                  textTransform: "none",
                }}
              >
                {uploading[record._id] ? "Uploading..." : "Upload"}
              </Button>
            </label>
            {record.invoiceLink && (
              <a
                href={record.invoiceLink}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#1976d2", fontSize: 12 }}
              >
                View
              </a>
            )}
          </Box>
        );

      case "matched2B":
      case "invoicingTally":
        return (
          <Switch
            checked={!!value}
            onChange={(e) => {
              handleFieldChange(record._id, field, e.target.checked);
              setTimeout(() => handleFieldBlur(record), 100);
            }}
            disabled={isSavingFlag}
            size="small"
          />
        );

      default:
        return (
          <TextField
            size="small"
            value={value}
            onChange={(e) =>
              handleFieldChange(record._id, field, e.target.value)
            }
            onBlur={() => handleFieldBlur(record)}
            disabled={isSavingFlag}
            sx={{ minWidth: 150, ...inputBorderSx }}
          />
        );
    }
  }

  const columns = [
    { field: "date", label: "Date" },
    { field: "category", label: "Category" },
    { field: "invoiceType", label: "Invoice Type" },
    { field: "billingGST", label: "Billing GST" },
    { field: "invoiceNo", label: "Invoice No." },
    { field: "vendorName", label: "Vendor Name" },
    { field: "amount", label: "Amount" },
    { field: "invoiceLink", label: "Invoice Link" },
    { field: "matched2B", label: "Matched 2B" },
    { field: "invoicingTally", label: "Tally" },
  ];

  return (
    <Box
      sx={{
        px: 2.5,
        pt: 1.5,
        pb: 2.5,
        backgroundColor: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <Paper
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
          px: 2.4,
          py: 1.6,
          borderRadius: 2,
          border: "1px solid #e5e7eb",
          backgroundColor: "#fff",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Purchase Records
        </Typography>

        <Box sx={{ display: "flex", gap: 1.2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setVendorDialogOpen(true)}
          >
            Add Vendor
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addTempRow}
            sx={{ backgroundColor: "#000", "&:hover": { backgroundColor: "#111" } }}
          >
            Add Record
          </Button>

          <input
            ref={bulkInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleBulkFileChange}
          />

          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => bulkInputRef.current?.click()}
          >
            Bulk Upload
          </Button>

          <Button
            variant="contained"
            onClick={() => setShowDeleted(!showDeleted)}
            sx={{
              backgroundColor: "#000",
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              "&:hover": { backgroundColor: "#111" },
            }}
          >
            {showDeleted ? "Show Active" : "Show Deleted"}
          </Button>
        </Box>
      </Paper>

      {!showDeleted && (
        <Box
          sx={{
            borderRadius: 2,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
        >
          <TableContainer sx={{ maxHeight: "calc(100vh - 230px)" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Actions</TableCell>
                  <TableCell sx={headerCellSx}>S.No.</TableCell>
                  {columns.map((c) => (
                    <TableCell key={c.field} sx={headerCellSx}>
                      {c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 2}
                      align="center"
                      sx={{ py: 5 }}
                    >
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((rec, idx) => (
                    <TableRow
                      key={rec._id}
                      sx={{
                        "&:nth-of-type(odd)": { backgroundColor: "#fafafa" },
                        opacity: saving[rec._id] ? 0.6 : 1,
                      }}
                    >
                      <TableCell>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDelete(rec._id)}
                          disabled={saving[rec._id]}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>

                      <TableCell sx={{ fontWeight: 600 }}>
                        {page * rowsPerPage + idx + 1}
                      </TableCell>

                      {columns.map((col) => (
                        <TableCell key={col.field}>
                          {renderCell(rec, col.field)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_e, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[20, 50, 100]}
          />
        </Box>
      )}

      {showDeleted && (
        <Box
          sx={{
            borderRadius: 2,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            backgroundColor: "#fff",
            mt: 2,
          }}
        >
          <TableContainer sx={{ maxHeight: "calc(100vh - 230px)" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>S.No.</TableCell>
                  {columns.map((c) => (
                    <TableCell key={c.field} sx={headerCellSx}>
                      {c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {deletedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 1}
                      align="center"
                      sx={{ py: 5 }}
                    >
                      No deleted records.
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedRecords.map((rec, idx) => (
                    <TableRow key={rec._id}>
                      <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>

                      {columns.map((col) => (
                        <TableCell key={col.field}>
                          <Typography sx={{ fontSize: 13, opacity: 0.6 }}>
                            {String(rec[col.field] || "-")}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Dialog
        open={vendorDialogOpen}
        onClose={() => setVendorDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Vendor</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Vendor name *"
            value={newVendor.name}
            onChange={(e) =>
              setNewVendor((p) => ({ ...p, name: e.target.value }))
            }
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
            <TextField
              fullWidth
              label="Email"
              value={newVendor.email}
              onChange={(e) =>
                setNewVendor((p) => ({ ...p, email: e.target.value }))
              }
            />

            <TextField
              fullWidth
              label="Phone"
              value={newVendor.phoneNumber}
              onChange={(e) =>
                setNewVendor((p) => ({
                  ...p,
                  phoneNumber: e.target.value.replace(/\D/g, ""),
                }))
              }
              inputProps={{ maxLength: 10 }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Switch
              checked={!!newVendor.hasGST}
              onChange={(e) =>
                setNewVendor((p) => ({ ...p, hasGST: e.target.checked }))
              }
            />
            <Typography>Has GST?</Typography>

            {newVendor.hasGST && (
              <TextField
                label="GST Number"
                value={newVendor.gstNumber}
                onChange={(e) =>
                  setNewVendor((p) => ({
                    ...p,
                    gstNumber: e.target.value.toUpperCase(),
                  }))
                }
                inputProps={{ maxLength: 15 }}
                sx={{ ml: 2, flex: 1 }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 3 }}>
            <Button onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleAddVendor}
              disabled={!newVendor.name.trim()}
              sx={{ backgroundColor: "#000", "&:hover": { backgroundColor: "#111" } }}
            >
              Save Vendor
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === "error" ? 8000 : 4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PurchaseRecord;

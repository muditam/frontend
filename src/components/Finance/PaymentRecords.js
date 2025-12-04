import React, { useState, useEffect } from "react";
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
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Autocomplete,
  Snackbar,
  Alert,
  Tooltip,
  CircularProgress,
} from "@mui/material";


import {
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";


import axios from "axios";
const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";


export default function PaymentRecords() {
  const [records, setRecords] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);


  const [editableRowId, setEditableRowId] = useState(null);


  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [uploadingId, setUploadingId] = useState(null);


  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });


  const showSnackbar = (m, s = "success") =>
    setSnackbar({ open: true, message: m, severity: s });


  const handleCloseSnackbar = () =>
    setSnackbar((p) => ({ ...p, open: false }));


  /* ---------------- FETCH VENDORS ---------------- */
  useEffect(() => {
    fetchVendors();
  }, []);


  async function fetchVendors() {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/payment-records/vendor-list`);
      setVendors(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showSnackbar("Failed to load vendor list", "error");
    }
  }


  /* ---------------- FETCH PAYMENT RECORDS ---------------- */
  useEffect(() => {
    fetchRecords();
  }, [page, rowsPerPage]);


  async function fetchRecords() {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/payment-records`, {
        params: { page: page + 1, limit: rowsPerPage },
      });


      setRecords(res.data.records || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setRecords([]);
      setTotal(0);
    }
  }


  /* ---------------- ADD NEW TEMP ROW ---------------- */
  function handleAddRow() {
    const tempId = "temp-" + Date.now();
    const today = new Date().toISOString().split("T")[0];


    setEditableRowId(tempId);


    const temp = {
      _id: tempId,
      vendorName: "",
      date: today,
      amountPaid: "",
      amountDue: 0,
      screenshot: "",
      isTemp: true,
    };


    setRecords((prev) => [temp, ...prev]);
  }


  /* ---------------- SAVE TEMP ROW ---------------- */
  async function saveTempRow(record) {
    if (!record.vendorName || !record.date || !record.amountPaid) return;


    try {
      const res = await axios.post(`${API_BASE_URL}/api/payment-records`, {
        vendorName: record.vendorName,
        date: record.date,
        amountPaid: record.amountPaid,
      });


      const saved = res.data;


      setRecords((prev) =>
        prev.map((r) =>
          r._id === record._id ? { ...saved, isTemp: false } : r
        )
      );


      setEditableRowId(null);
      showSnackbar("Payment saved");
    } catch (err) {
      showSnackbar("Failed to save payment", "error");
    }
  }


  /* ---------------- SAVE EXISTING ROW ---------------- */
  async function saveExistingRow(record) {
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/payment-records/${record._id}`,
        {
          vendorName: record.vendorName,
          date: record.date,
          amountPaid: record.amountPaid,
        }
      );


      const updated = res.data;


      setRecords((prev) =>
        prev.map((r) => (r._id === record._id ? updated : r))
      );
    } catch (err) {
      showSnackbar("Error saving payment", "error");
    }
  }


  /* ---------------- CHANGE FIELD ---------------- */
  const handleFieldChange = (id, field, value) => {
    setRecords((prev) =>
      prev.map((r) => (r._id === id ? { ...r, [field]: value } : r))
    );
  };


  /* ---------------- ON BLUR ---------------- */
  const handleFieldBlur = async (id) => {
    const record = records.find((r) => r._id === id);
    if (!record) return;


    if (record.isTemp) {
      await saveTempRow(record);
    } else {
      await saveExistingRow(record);
    }
  };


  /* ---------------- UPLOAD SCREENSHOT ---------------- */
  const handleFileUpload = async (id, file) => {
    if (!file) return;


    const record = records.find((r) => r._id === id);
    if (!record) return;


    if (record.isTemp) {
      showSnackbar("Save row first before uploading screenshot.", "warning");
      return;
    }


    setUploadingId(id);


    const formData = new FormData();
    formData.append("file", file);


    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/payment-records/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );


      const fileUrl = res.data.fileUrl;


      const patchRes = await axios.patch(
        `${API_BASE_URL}/api/payment-records/${id}`,
        { screenshot: fileUrl }
      );


      const updated = patchRes.data;


      setRecords((prev) =>
        prev.map((r) => (r._id === id ? updated : r))
      );


      showSnackbar("Screenshot uploaded");
    } catch (err) {
      showSnackbar("Upload failed", "error");
    } finally {
      setUploadingId(null);
    }
  };


  /* ---------------- RENDER CELLS ---------------- */
  const renderCell = (r, field) => {
    const isLocked = r._id !== editableRowId;
    const isUploading = uploadingId === r._id;


    switch (field) {
      /* ---------- DATE ---------- */
      case "date":
        return (
          <TextField
            type="date"
            size="small"
            value={
              r.date && !isNaN(new Date(r.date))
                ? new Date(r.date).toISOString().split("T")[0]
                : ""
            }
            disabled={isLocked}
            onChange={(e) => handleFieldChange(r._id, "date", e.target.value)}
            onBlur={() => handleFieldBlur(r._id)}
            sx={{ width: 150 }}
          />
        );


      /* ---------- VENDOR ---------- */
      case "vendorName":
        return (
          <Autocomplete
            freeSolo
            size="small"
            options={vendors}
            disabled={isLocked}
            value={r.vendorName || ""}
            onInputChange={(_e, v) =>
              handleFieldChange(r._id, "vendorName", v)
            }
            onBlur={() => handleFieldBlur(r._id)}
            renderInput={(params) => (
              <TextField {...params} sx={{ width: 200 }} />
            )}
          />
        );


      /* ---------- AMOUNT PAID ---------- */
      case "amountPaid":
        return (
          <TextField
            type="number"
            size="small"
            disabled={isLocked}
            value={r.amountPaid || ""}
            onChange={(e) =>
              handleFieldChange(r._id, "amountPaid", e.target.value)
            }
            onBlur={() => handleFieldBlur(r._id)}
            sx={{ width: 130 }}
          />
        );


      /* ---------- DUE ---------- */
      case "amountDue":
        return (
          <Tooltip title="Due amount snapshot on payment date">
            <Typography
              sx={{
                fontWeight: 700,
                color: r.amountDue > 0 ? "#d11a2a" : "#16a34a",
                fontSize: 14,
              }}
            >
              {r.amountDue}
            </Typography>
          </Tooltip>
        );


      /* ---------- SCREENSHOT ---------- */
      case "screenshot":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <input
              id={`ss-${r._id}`}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => handleFileUpload(r._id, e.target.files?.[0])}
            />


            {/* Upload Button */}
            <label htmlFor={`ss-${r._id}`}>
              <Button
                component="span"
                size="small"
                variant="contained"
                disabled={isUploading}
                startIcon={!isUploading ? <UploadIcon /> : null}
                sx={{
                  backgroundColor: isUploading ? "#666" : "#000",
                  fontSize: "12px",
                  padding: "3px 12px",
                  borderRadius: "6px",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: isUploading ? "#666" : "#111",
                  },
                }}
              >
                {isUploading ? (
                  <CircularProgress size={14} sx={{ color: "#fff" }} />
                ) : (
                  "Upload"
                )}
              </Button>
            </label>


            {/* Uploading Text */}
            {isUploading && (
              <Typography sx={{ fontSize: 12, opacity: 0.7 }}>
                Uploading…
              </Typography>
            )}


            {/* Preview Thumbnail */}
            {r.screenshot && !isUploading && (
              <img
                src={r.screenshot}
                alt="ss"
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: 6,
                  cursor: "pointer",
                  border: "1px solid #ddd",
                }}
                onClick={() => {
                  setSelectedImage(r.screenshot);
                  setImageDialogOpen(true);
                }}
              />
            )}
          </Box>
        );


      default:
        return null;
    }
  };


  /* ---------------- MAIN UI ---------------- */
  return (
    <Box sx={{ p: 3, background: "#f5f6f8", minHeight: "100vh" }}>
      {/* HEADER */}
      <Paper
        sx={{
          p: 2.5,
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          borderRadius: 2,
          background: "#fff",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, letterSpacing: 0.5, color: "#111" }}
        >
          Payment Records
        </Typography>


        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            background: "#000",
            textTransform: "none",
            borderRadius: 2,
            px: 2,
            py: 1,
            "&:hover": { background: "#111" },
          }}
          onClick={handleAddRow}
        >
          Add Payment
        </Button>
      </Paper>


      {/* TABLE */}
      <Paper
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        <TableContainer sx={{ maxHeight: "70vh" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {["S.No.", "Date", "Vendor", "Amount Paid", "Due", "Screenshot"].map(
                  (label) => (
                    <TableCell
                      key={label}
                      sx={{
                        backgroundColor: "#000",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "13px",
                        letterSpacing: 0.5,
                        paddingY: 1.5,
                      }}
                    >
                      {label}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>


            <TableBody>
              {records.map((r, idx) => (
               <TableRow
  key={r._id}
  sx={{
    backgroundColor: "#fff",
    borderBottom: "1px solid #e5e7eb",
    "&:nth-of-type(odd)": {
      backgroundColor: "#f8fafc",
    },
    "&:hover": {
      backgroundColor: "#f1f5f9",
      transition: "0.2s",
    },
  }}
>


                  <TableCell sx={{ fontWeight: 600 }}>
                    {page * rowsPerPage + idx + 1}
                  </TableCell>


                  <TableCell>{renderCell(r, "date")}</TableCell>
                  <TableCell>{renderCell(r, "vendorName")}</TableCell>
                  <TableCell>{renderCell(r, "amountPaid")}</TableCell>
                  <TableCell>{renderCell(r, "amountDue")}</TableCell>
                  <TableCell>{renderCell(r, "screenshot")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>


        {/* PAGINATION */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, np) => setPage(np)}
          rowsPerPageOptions={[20, 50, 100]}
          onRowsPerPageChange={(e) =>
            setRowsPerPage(parseInt(e.target.value, 10))
          }
        />
      </Paper>


      {/* SCREENSHOT DIALOG */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            borderBottom: "1px solid #eee",
            background: "#fafafa",
          }}
        >
          Screenshot
          <IconButton
            sx={{ float: "right" }}
            onClick={() => setImageDialogOpen(false)}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>


        <DialogContent sx={{ p: 2 }}>
          <img
            src={selectedImage}
            alt="ss"
            style={{
              width: "100%",
              maxHeight: "80vh",
              borderRadius: 6,
            }}
          />
        </DialogContent>
      </Dialog>


      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}




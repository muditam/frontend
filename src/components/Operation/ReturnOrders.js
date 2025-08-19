// src/components/UploadReturns.js
import React, { useMemo, useState } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Snackbar,
  Alert,
  TextField,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
 

const REASONS = [
  "OTHER",
  "DAMAGED",
  "NOT_AS_DESCRIBED",
  "WRONG_ITEM",
  "SIZE_TOO_SMALL",
  "SIZE_TOO_LARGE",
  "ARRIVED_LATE",
  "CHANGED_MIND",
];

export default function UploadReturns() {
  const [file, setFile] = useState(null);

  // single manual
  const [orderName, setOrderName] = useState("");
  const [quantity, setQuantity] = useState("1");

  // multi manual
  const [bulkNames, setBulkNames] = useState(""); // comma/newline separated
  const [bulkQuantity, setBulkQuantity] = useState("1");

  // reason
  const [reason, setReason] = useState("OTHER");
  const [reasonNote, setReasonNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", severity: "info" });
  const [results, setResults] = useState([]);

  const onDrop = (acceptedFiles) => setFile(acceptedFiles?.[0] || null);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      multiple: false,
      accept: {
        "text/csv": [".csv"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/vnd.ms-excel": [".xls"],
      },
    });

  const fileLabel = useMemo(() => {
    if (!file)
      return "Drag & drop CSV/XLSX, or click to select (A: Order Name, B: Quantity optional)";
    return `Selected: ${file.name}`;
  }, [file]);

  // Build a CSV blob from an array of {name, qty}
  const buildCsvBlob = (rows) => {
    const csv = rows.map((r) => `${r.name},${r.qty}`).join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8" });
  };

  // Normalize a string of comma/newline separated order names into an array
  const parseBulkNames = (text) => {
    return text
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean)
      // keep without '#'; backend already tries with and without
      // normalize to uppercase to avoid “ma1234” vs “MA1234”
      .map((s) => s.toUpperCase());
  };

  const downloadSample = () => {
    // simple two-row sample (no header; backend doesn’t require it)
    const blob = buildCsvBlob([
      { name: "MA58222", qty: 1 },
      { name: "MA58389", qty: 2 },
    ]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_returns.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    // decide the mode:
    // 1) if a real file is chosen -> use it
    // 2) else if bulkNames has >= 1 names -> synthesize CSV and upload as file
    // 3) else if single orderName -> send fields
    const names = parseBulkNames(bulkNames);
    const hasBulk = names.length > 0;

    if (!file && !hasBulk && !orderName.trim()) {
      setToast({
        open: true,
        msg: "Please upload a file OR paste multiple order names OR enter a single order name.",
        severity: "warning",
      });
      return;
    }

    const qtySingle = Number(quantity);
    const qtyBulk = Number(bulkQuantity);
    if (!file && !hasBulk && (!Number.isFinite(qtySingle) || qtySingle < 1)) {
      setToast({ open: true, msg: "Enter a valid quantity (>=1).", severity: "warning" });
      return;
    }
    if (!file && hasBulk && (!Number.isFinite(qtyBulk) || qtyBulk < 1)) {
      setToast({
        open: true,
        msg: "Enter a valid bulk quantity (>=1) for the pasted list.",
        severity: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      setResults([]);

      // Build FormData
      const formData = new FormData();

      if (file) {
        formData.append("file", file);
      } else if (hasBulk) {
        // make a CSV blob: each line "<ORDERNAME>,<QTY>"
        const rows = names.map((n) => ({ name: n, qty: Math.floor(qtyBulk) || 1 }));
        const blob = buildCsvBlob(rows);
        // name it so backend treats it as uploaded file
        formData.append("file", new File([blob], "bulk_upload.csv", { type: "text/csv" }));
      } else {
        // single order
        formData.append("orderName", orderName.trim().toUpperCase());
        formData.append("quantity", String(Math.floor(qtySingle)));
      }

      // reason/note always sent; backend can use/default it
      formData.append("returnReason", reason);
      if (reasonNote.trim()) formData.append("returnReasonNote", reasonNote.trim());

      const { data } = await axios.post(`https://muditamleads-14f32a10d7f7.herokuapp.com/orders/upload-orders`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data?.success) {
        const out = Array.isArray(data.results)
          ? data.results
          : data.result
          ? [data.result]
          : [];
        setResults(out);
        setToast({ open: true, msg: data.message || "Processed.", severity: "success" });
      } else {
        setToast({ open: true, msg: data?.message || "Something went wrong.", severity: "error" });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.code === "ERR_NETWORK" ? "Network/CORS error: check API_BASE and server." : err?.message) ||
        "Failed to process returns.";
      setToast({ open: true, msg, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => setFile(null);

  const statusChip = (status) => {
    switch (status) {
      case "return_created":
        return <Chip label="Return Created" color="success" size="small" />;
      case "not_found":
        return <Chip label="Order Not Found" color="warning" size="small" />;
      case "no_returnables":
        return <Chip label="No Returnables" color="warning" size="small" />;
      case "zero_remaining":
        return <Chip label="Zero Remaining" size="small" />;
      case "error":
        return <Chip label="Error" color="error" size="small" />;
      default:
        return <Chip label={status || "Unknown"} size="small" />;
    }
  };

  return (
    <Box p={3} maxWidth={1100} mx="auto">
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Create & Process Returns (CSV/XLSX or Manual)
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          {/* File Drop + Sample */}
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
              <Box
                {...getRootProps()}
                sx={{
                  border: "2px dashed #bbb",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  cursor: "pointer",
                  flex: 1,
                  background: isDragActive ? "rgba(0,0,0,0.03)" : "transparent",
                }}
              >
                <input {...getInputProps()} />
                <Typography variant="body1">{fileLabel}</Typography>
                {acceptedFiles.length > 0 && (
                  <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                    {acceptedFiles[0].name}
                  </Typography>
                )}
                {!!file && (
                  <Button onClick={clearFile} sx={{ mt: 1 }}>
                    Remove file
                  </Button>
                )}
              </Box>

              <Button onClick={downloadSample} sx={{ mt: { xs: 2, sm: 0 } }}>
                Download sample CSV
              </Button>
            </Stack>

            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              CSV format (no header): <code>MA58222,1</code> on each line. Quantity optional; default = 1.
            </Typography>
          </Grid>

          {/* Manual single */}
          <Grid item xs={12} md={5}>
            <TextField
              label="Single Order Name"
              placeholder="MA840934"
              helperText="No # needed. Example: MA840934 (we'll also try with # automatically)."
              fullWidth
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputProps={{ min: 1 }}
            />
          </Grid>

          {/* Manual bulk */}
          <Grid item xs={12} md={5}>
            <TextField
              label="Multiple Order Names"
              placeholder="MA22913, MA84293  (or one per line)"
              helperText="Paste comma-separated or each on a new line. We'll upload a CSV for you."
              fullWidth
              multiline
              minRows={3}
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Bulk Quantity"
              type="number"
              fullWidth
              value={bulkQuantity}
              onChange={(e) => setBulkQuantity(e.target.value)}
              inputProps={{ min: 1 }}
            />
          </Grid>

          {/* Reason & Submit */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="reason-label">Return Reason</InputLabel>
              <Select
                labelId="reason-label"
                label="Return Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {REASONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              label="Reason Note (optional)"
              fullWidth
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="e.g., RTO via automation"
            />
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" onClick={handleUpload} disabled={loading}>
                {loading ? <CircularProgress size={22} /> : "Create & Process Return(s)"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Results */}
      {!!results.length && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Results
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Return ID</TableCell>
                <TableCell>Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>{r.orderName || "-"}</TableCell>
                  <TableCell>{statusChip(r.status)}</TableCell>
                  <TableCell>{r.returnId || "-"}</TableCell>
                  <TableCell>{r.message || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

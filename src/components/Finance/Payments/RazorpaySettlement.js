// RazorpayUpload.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  TablePagination,
  CircularProgress,
  TextField,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const RazorpayUpload = () => {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null); // ✅ clear filename UI

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false); // ✅ table fetch loading

  // ✅ separate action loaders
  const [uploading, setUploading] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  // ---------------- Filters ----------------
  const [q, setQ] = useState(""); // entity_id / order_id / settlement_id / settlement_utr / issuer / payment_method etc
  const [uploadMin, setUploadMin] = useState("");
  const [uploadMax, setUploadMax] = useState("");

  const [createdMin, setCreatedMin] = useState(""); // Created At
  const [createdMax, setCreatedMax] = useState("");

  const [settledMin, setSettledMin] = useState(""); // Settled At
  const [settledMax, setSettledMax] = useState("");

  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [feeMin, setFeeMin] = useState("");
  const [feeMax, setFeeMax] = useState("");

  const [taxMin, setTaxMin] = useState("");
  const [taxMax, setTaxMax] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("");
  const [cardType, setCardType] = useState("");
  const [currency, setCurrency] = useState("");

  const anyActionLoading = uploading || downloadingSample;

  const buildUrl = useMemo(() => {
    return (pg = page, limit = rowsPerPage) => {
      const params = new URLSearchParams();
      params.set("page", String(pg + 1));
      params.set("limit", String(limit));

      if (q.trim()) params.set("q", q.trim());

      if (uploadMin) params.set("uploadMin", uploadMin);
      if (uploadMax) params.set("uploadMax", uploadMax);

      if (createdMin) params.set("createdMin", createdMin);
      if (createdMax) params.set("createdMax", createdMax);

      if (settledMin) params.set("settledMin", settledMin);
      if (settledMax) params.set("settledMax", settledMax);

      if (amountMin !== "") params.set("amountMin", amountMin);
      if (amountMax !== "") params.set("amountMax", amountMax);

      if (feeMin !== "") params.set("feeMin", feeMin);
      if (feeMax !== "") params.set("feeMax", feeMax);

      if (taxMin !== "") params.set("taxMin", taxMin);
      if (taxMax !== "") params.set("taxMax", taxMax);

      if (paymentMethod.trim()) params.set("paymentMethod", paymentMethod.trim());
      if (cardType.trim()) params.set("cardType", cardType.trim());
      if (currency.trim()) params.set("currency", currency.trim());

      return `${API_BASE}/api/razorpay/data?${params.toString()}`;
    };
  }, [
    page,
    rowsPerPage,
    q,
    uploadMin,
    uploadMax,
    createdMin,
    createdMax,
    settledMin,
    settledMax,
    amountMin,
    amountMax,
    feeMin,
    feeMax,
    taxMin,
    taxMax,
    paymentMethod,
    cardType,
    currency,
  ]);

  const fetchRecords = async (pg = page, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl(pg, limit));
      const json = await res.json();
      setRecords(json.data || []);
      setTotalRecords(json.totalRecords || 0);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(page, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (uploading) return;
    if (!file) return alert("Please select a CSV file.");

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/razorpay/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (json.error) {
        alert(json.error || "Upload failed");
      } else {
        alert(json.message || `Upload successful (${json.inserted || 0} rows)`);
        clearSelectedFile(); // ✅ clear file after ok
        setPage(0);
        fetchRecords(0, rowsPerPage);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = () => {
    if (downloadingSample) return;
    setDownloadingSample(true);
    window.open(`${API_BASE}/api/razorpay/sample`, "_blank");
    setTimeout(() => setDownloadingSample(false), 600);
  };

  const applyFilters = () => {
    setPage(0);
    fetchRecords(0, rowsPerPage);
  };

  const clearFilters = () => {
    setQ("");
    setUploadMin("");
    setUploadMax("");
    setCreatedMin("");
    setCreatedMax("");
    setSettledMin("");
    setSettledMax("");
    setAmountMin("");
    setAmountMax("");
    setFeeMin("");
    setFeeMax("");
    setTaxMin("");
    setTaxMax("");
    setPaymentMethod("");
    setCardType("");
    setCurrency("");
    setPage(0);
    fetchRecords(0, rowsPerPage);
  };

  const fmtINR = (n) => (n == null || n === "" ? "-" : `₹${Number(n).toLocaleString("en-IN")}`);
  const fmtDate = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString("en-IN");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ color: "black", mb: 2 }}>
        📄 Upload Razorpay Settlement CSV
      </Typography>

      {/* Upload row */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: "1px solid #e0e3ef",
          borderRadius: 2,
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            onClick={(e) => {
              // ✅ allow selecting same file again
              e.target.value = null;
            }}
          />

          <Button
            variant="contained"
            startIcon={
              uploading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <CloudUploadIcon />
            }
            onClick={handleUpload}
            disabled={uploading || !file}
            sx={{ bgcolor: "black", color: "#fff", "&:hover": { bgcolor: "#333" }, minWidth: 120 }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>

          <Button
            variant="outlined"
            startIcon={
              downloadingSample ? <CircularProgress size={18} sx={{ color: "black" }} /> : <DownloadIcon />
            }
            onClick={handleDownloadSample}
            disabled={downloadingSample}
            sx={{
              borderColor: "black",
              color: "black",
              "&:hover": { borderColor: "#333" },
              minWidth: 180,
            }}
          >
            {downloadingSample ? "Preparing..." : "Download Sample CSV"}
          </Button>
        </Box>

        <Typography sx={{ color: "#555", fontSize: 13 }}>
          Total: <b>{totalRecords.toLocaleString("en-IN")}</b>
        </Typography>
      </Paper>

      {/* Filters row */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: "1px solid #e0e3ef",
          borderRadius: 2,
          display: "flex",
          gap: 1.5,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          size="small"
          label="Search (Entity/Order/Settlement/UTR/Issuer/Method)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 320 }}
        />

        <TextField
          size="small"
          label="Upload From"
          type="date"
          value={uploadMin}
          onChange={(e) => setUploadMin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Upload To"
          type="date"
          value={uploadMax}
          onChange={(e) => setUploadMax(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="Created From"
          type="date"
          value={createdMin}
          onChange={(e) => setCreatedMin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Created To"
          type="date"
          value={createdMax}
          onChange={(e) => setCreatedMax(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="Settled From"
          type="date"
          value={settledMin}
          onChange={(e) => setSettledMin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Settled To"
          type="date"
          value={settledMax}
          onChange={(e) => setSettledMax(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="Amount Min"
          type="number"
          value={amountMin}
          onChange={(e) => setAmountMin(e.target.value)}
          sx={{ width: 130 }}
        />
        <TextField
          size="small"
          label="Amount Max"
          type="number"
          value={amountMax}
          onChange={(e) => setAmountMax(e.target.value)}
          sx={{ width: 130 }}
        />

        <TextField
          size="small"
          label="Fee Min"
          type="number"
          value={feeMin}
          onChange={(e) => setFeeMin(e.target.value)}
          sx={{ width: 120 }}
        />
        <TextField
          size="small"
          label="Fee Max"
          type="number"
          value={feeMax}
          onChange={(e) => setFeeMax(e.target.value)}
          sx={{ width: 120 }}
        />

        <TextField
          size="small"
          label="Tax Min"
          type="number"
          value={taxMin}
          onChange={(e) => setTaxMin(e.target.value)}
          sx={{ width: 120 }}
        />
        <TextField
          size="small"
          label="Tax Max"
          type="number"
          value={taxMax}
          onChange={(e) => setTaxMax(e.target.value)}
          sx={{ width: 120 }}
        />

        <TextField
          size="small"
          label="Payment Method contains"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <TextField
          size="small"
          label="Card Type contains"
          value={cardType}
          onChange={(e) => setCardType(e.target.value)}
          sx={{ minWidth: 180 }}
        />
        <TextField
          size="small"
          label="Currency (e.g. INR)"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          sx={{ width: 140 }}
        />

        <Button
          variant="outlined"
          onClick={applyFilters}
          disabled={anyActionLoading}
          sx={{ textTransform: "none" }}
        >
          Apply
        </Button>
        <Button
          variant="text"
          onClick={clearFilters}
          disabled={anyActionLoading}
          sx={{ textTransform: "none" }}
        >
          Clear
        </Button>
      </Paper>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <TableContainer component={Paper} sx={{ border: "1px solid #ccc" }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "black" }}>
                <TableRow>
                  {[
                    "Upload Date",
                    "Transaction Entity",
                    "Entity ID",
                    "Amount",
                    "Currency",
                    "Fee",
                    "Tax",
                    "Debit",
                    "Credit",
                    "Payment Method",
                    "Card Type",
                    "Issuer Name",
                    "Created At",
                    "Order ID",
                    "Settlement ID",
                    "Settlement UTR",
                    "Settled At",
                    "Settled By",
                  ].map((h) => (
                    <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={18} align="center">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((row, idx) => (
                    <TableRow key={row._id || idx} hover>
                      <TableCell>{fmtDate(row.uploadDate)}</TableCell>
                      <TableCell>{row.transaction_entity || "-"}</TableCell>
                      <TableCell>{row.entity_id || "-"}</TableCell>
                      <TableCell>{row.amount != null ? fmtINR(row.amount) : "-"}</TableCell>
                      <TableCell>{row.currency || "-"}</TableCell>
                      <TableCell>{row.fee != null ? fmtINR(row.fee) : "-"}</TableCell>
                      <TableCell>{row.tax != null ? fmtINR(row.tax) : "-"}</TableCell>
                      <TableCell>{row.debit != null ? fmtINR(row.debit) : "-"}</TableCell>
                      <TableCell>{row.credit != null ? fmtINR(row.credit) : "-"}</TableCell>
                      <TableCell>{row.payment_method || "-"}</TableCell>
                      <TableCell>{row.card_type || "-"}</TableCell>
                      <TableCell>{row.issuer_name || "-"}</TableCell>
                      <TableCell>{row.entity_created_at || "-"}</TableCell>
                      <TableCell>{row.order_id || "-"}</TableCell>
                      <TableCell>{row.settlement_id || "-"}</TableCell>
                      <TableCell>{row.settlement_utr || "-"}</TableCell>
                      <TableCell>{row.settled_at || "-"}</TableCell>
                      <TableCell>{row.settled_by || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalRecords}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 30, 50, 100]}
          />
        </>
      )}
    </Box>
  );
};

export default RazorpayUpload;

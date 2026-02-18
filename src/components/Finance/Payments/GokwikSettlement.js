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
  CircularProgress,
  TablePagination,
  TextField,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const headers = [
  "Upload Date",
  "S. No.",
  "Transaction Type",
  "Payment Id",
  "Order Id",
  "Amount",
  "Currency",
  "Tax",
  "Fee",
  "Additional Fees",
  "Additional Tax",
  "Debit",
  "gokwik Deduction",
  "Credit",
  "Payment Method",
  "Transaction Date",
  "Transaction RRN",
  "Merchant Order Id",
  "Shopify Order Id",
  "Shopify Transaction Id",
  "Settlement UTR",
  "Settlement Date",
  "Settled By",
  "Payment Mode",
  "Bank Code",
  "Card Network",
];

const EasebuzzUpload = () => {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);

  // ✅ table fetch loader separate
  const [loading, setLoading] = useState(false);

  // ✅ action loaders
  const [uploading, setUploading] = useState(false);
  const [deletingLast, setDeletingLast] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // ✅ filters (minimal like others)
  const [q, setQ] = useState("");
  const [uploadMin, setUploadMin] = useState("");
  const [uploadMax, setUploadMax] = useState("");
  const [settleMin, setSettleMin] = useState("");
  const [settleMax, setSettleMax] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const anyActionLoading = uploading || deletingLast || downloadingSample;

  const fmtINR = (n) =>
    n == null || n === "" ? "" : `₹${Number(n).toLocaleString("en-IN")}`;

  const fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-IN");
  };

  const buildUrl = useMemo(() => {
    return (pageNum = page, limit = rowsPerPage) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNum + 1));
      params.set("limit", String(limit));

      if (q.trim()) params.set("q", q.trim());
      if (uploadMin) params.set("uploadMin", uploadMin);
      if (uploadMax) params.set("uploadMax", uploadMax);
      if (settleMin) params.set("settleMin", settleMin);
      if (settleMax) params.set("settleMax", settleMax);
      if (amountMin !== "") params.set("amountMin", amountMin);
      if (amountMax !== "") params.set("amountMax", amountMax);

      return `${API_BASE}/api/easebuzz/data?${params.toString()}`;
    };
  }, [q, uploadMin, uploadMax, settleMin, settleMax, amountMin, amountMax, page, rowsPerPage]);

  const fetchData = async (pageNum = page, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl(pageNum, limit));
      const json = await res.json();
      setRecords(json.data || []);
      setTotalCount(json.totalCount || 0);
    } catch (err) {
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const handleFileChange = (e) => setFile(e.target.files?.[0] || null);

  const clearFileInput = () => {
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
      const res = await fetch(`${API_BASE}/api/easebuzz/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (json.error) {
        alert(json.error);
      } else {
        alert(`Upload successful (${json.inserted || 0} rows)`);

        // ✅ after OK, clear state + blank input
        clearFileInput();

        setPage(0);
        fetchData(0, rowsPerPage);
      }
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLastUpload = async () => {
    if (deletingLast) return;

    const yes = window.confirm("Delete LAST uploaded batch? This will remove the most recent upload.");
    if (!yes) return;

    setDeletingLast(true);
    try {
      const res = await fetch(`${API_BASE}/api/easebuzz/delete-last-upload`, { method: "DELETE" });
      const json = await res.json();

      if (json.error) {
        alert(json.error);
      } else {
        alert(`Deleted: ${json.deleted || 0} rows`);
        setPage(0);
        fetchData(0, rowsPerPage);
      }
    } catch (e) {
      alert("Delete failed");
    } finally {
      setDeletingLast(false);
    }
  };

  const handleDownloadSample = () => {
    if (downloadingSample) return;
    setDownloadingSample(true);

    window.open(`${API_BASE}/api/easebuzz/sample`, "_blank");
    setTimeout(() => setDownloadingSample(false), 600);
  };

  const applyFilters = () => {
    setPage(0);
    fetchData(0, rowsPerPage);
  };

  const clearFilters = () => {
    setQ("");
    setUploadMin("");
    setUploadMax("");
    setSettleMin("");
    setSettleMax("");
    setAmountMin("");
    setAmountMax("");
    setPage(0);
    fetchData(0, rowsPerPage);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ color: "black", mb: 2 }}>
        📥 Upload Easebuzz Transactions
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
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {/* LEFT */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
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
        </Box>

        {/* RIGHT */}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ color: "#555", fontSize: 13 }}>
            Total: <b>{totalCount.toLocaleString("en-IN")}</b>
          </Typography>

          <Button
            variant="outlined"
            onClick={handleDeleteLastUpload}
            disabled={deletingLast}
            startIcon={deletingLast ? <CircularProgress size={16} /> : null}
            sx={{ textTransform: "none" }}
          >
            {deletingLast ? "Deleting..." : "Delete Last Upload"}
          </Button>

          <Button
            variant="text"
            onClick={handleDownloadSample}
            disabled={downloadingSample}
            startIcon={downloadingSample ? <CircularProgress size={16} /> : null}
            sx={{ textTransform: "none" }}
          >
            {downloadingSample ? "Preparing..." : "Download Sample CSV"}
          </Button>
        </Box>
      </Paper>

      {/* Filters */}
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
          label="Search (Order / Payment / UTR / RRN / Shopify)"
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
          label="Settlement From"
          type="date"
          value={settleMin}
          onChange={(e) => setSettleMin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Settlement To"
          type="date"
          value={settleMax}
          onChange={(e) => setSettleMax(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="Amount Min"
          type="number"
          value={amountMin}
          onChange={(e) => setAmountMin(e.target.value)}
          sx={{ width: 140 }}
        />
        <TextField
          size="small"
          label="Amount Max"
          type="number"
          value={amountMax}
          onChange={(e) => setAmountMax(e.target.value)}
          sx={{ width: 140 }}
        />

        <Button variant="outlined" disabled={anyActionLoading} onClick={applyFilters} sx={{ textTransform: "none" }}>
          Apply
        </Button>
        <Button variant="text" disabled={anyActionLoading} onClick={clearFilters} sx={{ textTransform: "none" }}>
          Clear
        </Button>
      </Paper>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "black" }}>
                <TableRow>
                  {headers.map((head) => (
                    <TableCell key={head} sx={{ color: "#fff", fontWeight: 600 }}>
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={headers.length} align="center">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((row, idx) => (
                    <TableRow key={row._id || idx}>
                      <TableCell>{fmtDate(row.uploadDate)}</TableCell>
                      <TableCell>{row.serialNo}</TableCell>
                      <TableCell>{row.transactionType}</TableCell>
                      <TableCell>{row.paymentId}</TableCell>
                      <TableCell>{row.orderId}</TableCell>
                      <TableCell>{fmtINR(row.amount)}</TableCell>
                      <TableCell>{row.currency}</TableCell>
                      <TableCell>{row.tax}</TableCell>
                      <TableCell>{row.fee}</TableCell>
                      <TableCell>{row.additionalFees}</TableCell>
                      <TableCell>{row.additionalTax}</TableCell>
                      <TableCell>{row.debit}</TableCell>
                      <TableCell>{row.gokwikDeduction}</TableCell>
                      <TableCell>{row.credit}</TableCell>
                      <TableCell>{row.paymentMethod}</TableCell>
                      <TableCell>{row.transactionDate}</TableCell>
                      <TableCell>{row.transactionRRN}</TableCell>
                      <TableCell>{row.merchantOrderId}</TableCell>
                      <TableCell>{row.shopifyOrderId}</TableCell>
                      <TableCell>{row.shopifyTransactionId}</TableCell>
                      <TableCell>{row.settlementUTR}</TableCell>
                      <TableCell>{fmtDate(row.settlementDate)}</TableCell>
                      <TableCell>{row.settledBy}</TableCell>
                      <TableCell>{row.paymentMode}</TableCell>
                      <TableCell>{row.bankCode}</TableCell>
                      <TableCell>{row.cardNetwork}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
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

export default EasebuzzUpload;

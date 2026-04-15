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
import DownloadIcon from "@mui/icons-material/Download";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const authFetch = (url, options = {}) =>
  fetch(url, {
    credentials: "include",
    ...options,
  });

const headers = [
  "Upload Date",
  "Order ID",
  "Amount Received",
  "Date of Payment",
  "Transaction ID",
  "Utr No",
  "Date of Settlement",
];

const CashfreeUpload = () => {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [deletingLast, setDeletingLast] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const [q, setQ] = useState("");
  const [uploadMin, setUploadMin] = useState("");
  const [uploadMax, setUploadMax] = useState("");
  const [paymentMin, setPaymentMin] = useState("");
  const [paymentMax, setPaymentMax] = useState("");
  const [settlementMin, setSettlementMin] = useState("");
  const [settlementMax, setSettlementMax] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const anyActionLoading = uploading || deletingLast || downloadingSample;

  const fmtINR = (n) => (n == null || n === "" ? "" : `₹${Number(n).toLocaleString("en-IN")}`);

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
      if (paymentMin) params.set("paymentMin", paymentMin);
      if (paymentMax) params.set("paymentMax", paymentMax);
      if (settlementMin) params.set("settlementMin", settlementMin);
      if (settlementMax) params.set("settlementMax", settlementMax);
      if (amountMin !== "") params.set("amountMin", amountMin);
      if (amountMax !== "") params.set("amountMax", amountMax);

      return `${API_BASE}/api/cashfree/data?${params.toString()}`;
    };
  }, [
    page,
    rowsPerPage,
    q,
    uploadMin,
    uploadMax,
    paymentMin,
    paymentMax,
    settlementMin,
    settlementMax,
    amountMin,
    amountMax,
  ]);

  const fetchData = async (pageNum = page, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const res = await authFetch(buildUrl(pageNum, limit));
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to fetch data");
      }

      setRecords(json.data || []);
      setTotalCount(json.totalCount || 0);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, rowsPerPage);
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
      const res = await authFetch(`${API_BASE}/api/cashfree/upload`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        alert(json.error || "Upload failed");
      } else {
        alert(`Upload successful (${json.inserted || 0} rows)`);
        clearSelectedFile();
        setPage(0);
        fetchData(0, rowsPerPage);
      }
    } catch (e) {
      console.error(e);
      alert("Upload failed");
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
      const res = await authFetch(`${API_BASE}/api/cashfree/delete-last-upload`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        alert(json.error || "Delete failed");
      } else {
        alert(`Deleted: ${json.deleted || 0} rows`);
        setPage(0);
        fetchData(0, rowsPerPage);
      }
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    } finally {
      setDeletingLast(false);
    }
  };

  const handleDownloadSample = async () => {
    if (downloadingSample) return;
    setDownloadingSample(true);

    try {
      const res = await authFetch(`${API_BASE}/api/cashfree/sample`);
      if (!res.ok) throw new Error(`Sample download failed (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "cashfree_sample.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to download sample CSV");
    } finally {
      setDownloadingSample(false);
    }
  };

  const applyFilters = () => {
    setPage(0);
    fetchData(0, rowsPerPage);
  };

  const clearFilters = () => {
    setQ("");
    setUploadMin("");
    setUploadMax("");
    setPaymentMin("");
    setPaymentMax("");
    setSettlementMin("");
    setSettlementMax("");
    setAmountMin("");
    setAmountMax("");
    setPage(0);
    fetchData(0, rowsPerPage);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ color: "black", mb: 2 }}>
        Cashfree Settlement Upload
      </Typography>

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
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            onClick={(e) => {
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
            startIcon={downloadingSample ? <CircularProgress size={18} /> : <DownloadIcon />}
            onClick={handleDownloadSample}
            disabled={downloadingSample}
            sx={{ borderColor: "black", color: "black", "&:hover": { borderColor: "#333" } }}
          >
            {downloadingSample ? "Preparing..." : "Download Sample CSV"}
          </Button>
        </Box>

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
        </Box>
      </Paper>

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
          label="Search (Order / Txn / UTR)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 260 }}
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
          label="Payment From"
          type="date"
          value={paymentMin}
          onChange={(e) => setPaymentMin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Payment To"
          type="date"
          value={paymentMax}
          onChange={(e) => setPaymentMax(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="Settlement From"
          type="date"
          value={settlementMin}
          onChange={(e) => setSettlementMin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Settlement To"
          type="date"
          value={settlementMax}
          onChange={(e) => setSettlementMax(e.target.value)}
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
          <TableContainer component={Paper} sx={{ border: "1px solid #ccc" }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "black" }}>
                <TableRow>
                  {headers.map((h) => (
                    <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>
                      {h}
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
                    <TableRow key={row._id || idx} hover>
                      <TableCell>{fmtDate(row.uploadDate)}</TableCell>
                      <TableCell>{row.orderId || ""}</TableCell>
                      <TableCell>{fmtINR(row.amountReceived)}</TableCell>
                      <TableCell>{fmtDate(row.dateOfPayment)}</TableCell>
                      <TableCell>{row.transactionId || ""}</TableCell>
                      <TableCell>{row.utrNo || ""}</TableCell>
                      <TableCell>{fmtDate(row.dateOfSettlement)}</TableCell>
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
            rowsPerPageOptions={[10, 30, 50, 100, 200]}
            sx={{ mt: 2 }}
          />
        </>
      )}
    </Box>
  );
};

export default CashfreeUpload;
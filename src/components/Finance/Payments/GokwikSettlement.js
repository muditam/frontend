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
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [deletingLast, setDeletingLast] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const [totalAmount, setTotalAmount] = useState(0);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);

  const [q, setQ] = useState("");
  const [uploadMin, setUploadMin] = useState("");
  const [uploadMax, setUploadMax] = useState("");
  const [settleMin, setSettleMin] = useState("");
  const [settleMax, setSettleMax] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const anyActionLoading =
    uploading || deletingLast || downloadingSample || exporting;

  const fmtINR = (n) =>
    n == null || n === "" ? "" : `₹${Number(n).toLocaleString("en-IN")}`;

  const fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-IN");
  };

  const buildQueryParams = ({ includePagination, pageNum, limit }) => {
    const params = new URLSearchParams();

    if (includePagination) {
      params.set("page", String((pageNum ?? page) + 1));
      params.set("limit", String(limit ?? rowsPerPage));
    }

    if (q.trim()) params.set("q", q.trim());
    if (uploadMin) params.set("uploadMin", uploadMin);
    if (uploadMax) params.set("uploadMax", uploadMax);
    if (settleMin) params.set("settleMin", settleMin);
    if (settleMax) params.set("settleMax", settleMax);
    if (amountMin !== "") params.set("amountMin", amountMin);
    if (amountMax !== "") params.set("amountMax", amountMax);

    return params.toString();
  };

  const buildUrl = useMemo(() => {
    return (pageNum = page, limit = rowsPerPage) => {
      const qs = buildQueryParams({ includePagination: true, pageNum, limit });
      return `${API_BASE}/api/easebuzz/data?${qs}`;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    q,
    uploadMin,
    uploadMax,
    settleMin,
    settleMax,
    amountMin,
    amountMax,
    page,
    rowsPerPage,
  ]);

  const buildExportUrl = () => {
    const qs = buildQueryParams({ includePagination: false });
    return `${API_BASE}/api/easebuzz/export?${qs}`;
  };

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
      setTotalAmount(json.totalAmount || 0);
      setTotalDebit(json.totalDebit || 0);
      setTotalCredit(json.totalCredit || 0);
    } catch (err) {
      console.error(err);
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
      const res = await authFetch(`${API_BASE}/api/easebuzz/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        alert(json.error || "Upload failed.");
      } else {
        alert(`Upload successful (${json.inserted || 0} rows)`);
        clearFileInput();
        setPage(0);
        fetchData(0, rowsPerPage);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLastUpload = async () => {
    if (deletingLast) return;

    const yes = window.confirm(
      "Delete LAST uploaded batch? This will remove the most recent upload."
    );
    if (!yes) return;

    setDeletingLast(true);
    try {
      const res = await authFetch(`${API_BASE}/api/easebuzz/delete-last-upload`, {
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
      const res = await authFetch(`${API_BASE}/api/easebuzz/sample`);
      if (!res.ok) throw new Error(`Sample download failed (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "easebuzz_sample.csv";
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

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const res = await authFetch(buildExportUrl());
      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");

      a.download = `easebuzz_export_${yyyy}-${mm}-${dd}.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Export failed");
    } finally {
      setExporting(false);
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
            onChange={handleFileChange}
            disabled={uploading}
            onClick={(e) => {
              e.target.value = null;
            }}
          />

          <Button
            variant="contained"
            startIcon={
              uploading ? (
                <CircularProgress size={18} sx={{ color: "#fff" }} />
              ) : (
                <CloudUploadIcon />
              )
            }
            onClick={handleUpload}
            disabled={uploading || !file}
            sx={{
              bgcolor: "black",
              color: "#fff",
              "&:hover": { bgcolor: "#333" },
              minWidth: 120,
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>

          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExport}
            disabled={exporting}
            sx={{ textTransform: "none" }}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ color: "#555", fontSize: 13 }}>
            Total: <b>{totalCount.toLocaleString("en-IN")}</b>
          </Typography>

          <Typography sx={{ color: "#555", fontSize: 13 }}>
            Amount: <b>{fmtINR(totalAmount)}</b>
          </Typography>

          <Typography sx={{ color: "#555", fontSize: 13 }}>
            Debit: <b>{fmtINR(totalDebit)}</b>
          </Typography>

          <Typography sx={{ color: "#555", fontSize: 13 }}>
            Credit: <b>{fmtINR(totalCredit)}</b>
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

        <Button
          variant="outlined"
          disabled={anyActionLoading}
          onClick={applyFilters}
          sx={{ textTransform: "none" }}
        >
          Apply
        </Button>
        <Button
          variant="text"
          disabled={anyActionLoading}
          onClick={clearFilters}
          sx={{ textTransform: "none" }}
        >
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
                      <TableCell>{fmtINR(row.tax)}</TableCell>
                      <TableCell>{fmtINR(row.fee)}</TableCell>
                      <TableCell>{fmtINR(row.additionalFees)}</TableCell>
                      <TableCell>{fmtINR(row.additionalTax)}</TableCell>
                      <TableCell>{fmtINR(row.debit)}</TableCell>
                      <TableCell>{fmtINR(row.gokwikDeduction)}</TableCell>
                      <TableCell>{fmtINR(row.credit)}</TableCell>
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
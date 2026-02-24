// BluedartUpload.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  TablePagination,
  CircularProgress,
  TextField,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com"; // Change this to your actual backend URL

const BluedartUpload = () => {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [deletingLast, setDeletingLast] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);

  // ✅ total customer pay amount (as per filters)
  const [totalCustomerPayAmt, setTotalCustomerPayAmt] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [uploadMin, setUploadMin] = useState("");
  const [uploadMax, setUploadMax] = useState("");
  const [settledMin, setSettledMin] = useState("");
  const [settledMax, setSettledMax] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const fmtINR = (n) =>
    n == null || n === "" ? "" : `₹${Number(n).toLocaleString("en-IN")}`;

  const fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-IN");
  };

  const filtersApplied = useMemo(() => {
    return (
      q.trim() ||
      uploadMin ||
      uploadMax ||
      settledMin ||
      settledMax ||
      amountMin !== "" ||
      amountMax !== ""
    );
  }, [q, uploadMin, uploadMax, settledMin, settledMax, amountMin, amountMax]);

  const buildQueryParams = ({ includePagination }) => {
    const params = new URLSearchParams();

    if (includePagination) {
      params.set("page", String(page + 1));
      params.set("limit", String(rowsPerPage));
    }

    if (q.trim()) params.set("q", q.trim());

    if (uploadMin) params.set("uploadMin", uploadMin);
    if (uploadMax) params.set("uploadMax", uploadMax);

    if (settledMin) params.set("settledMin", settledMin);
    if (settledMax) params.set("settledMax", settledMax);

    if (amountMin !== "") params.set("amountMin", amountMin);
    if (amountMax !== "") params.set("amountMax", amountMax);

    return params.toString();
  };

  const buildUrl = () => `${API_BASE}/api/bluedart/data?${buildQueryParams({ includePagination: true })}`;

  const buildExportUrl = () =>
    `${API_BASE}/api/bluedart/export?${buildQueryParams({ includePagination: false })}`;

  const fetchData = async (pageNum = page, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(buildQueryParams({ includePagination: false }));
      params.set("page", String(pageNum + 1));
      params.set("limit", String(limit));

      const res = await fetch(`${API_BASE}/api/bluedart/data?${params.toString()}`);
      const json = await res.json();

      setRecords(json.data || []);
      setTotal(json.totalCount || 0);
      setTotalCustomerPayAmt(json.totalCustomerPayAmt || 0);
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
    if (!file) return alert("Select a file first");

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/bluedart/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (json.error) {
        alert(json.error);
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

    const yes = window.confirm(
      "Delete LAST uploaded batch? This will remove the most recent uploaded file data."
    );
    if (!yes) return;

    setDeletingLast(true);
    try {
      const res = await fetch(`${API_BASE}/api/bluedart/delete-last-upload`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.error) {
        alert(json.error);
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

    window.open(`${API_BASE}/api/bluedart/sample`, "_blank");

    setTimeout(() => setDownloadingSample(false), 600);
  };

  // ✅ EXPORT (all if no filters, else filtered)
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const url = buildExportUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const a = document.createElement("a");
      const objUrl = window.URL.createObjectURL(blob);

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");

      a.href = objUrl;
      a.download = filtersApplied
        ? `bluedart_export_filtered_${yyyy}-${mm}-${dd}.csv`
        : `bluedart_export_all_${yyyy}-${mm}-${dd}.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch (e) {
      console.error(e);
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setQ("");
    setUploadMin("");
    setUploadMax("");
    setSettledMin("");
    setSettledMax("");
    setAmountMin("");
    setAmountMax("");
    setPage(0);
    fetchData(0, rowsPerPage);
  };

  const anyActionLoading = uploading || deletingLast || downloadingSample || exporting;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold", color: "black" }}>
        📦 Bluedart Settlement Upload
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
        {/* LEFT */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            disabled={uploading}
            onClick={(e) => {
              e.target.value = null; // allow same file re-pick
            }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <Button
            variant="contained"
            startIcon={
              uploading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <CloudUploadIcon />
            }
            onClick={handleUpload}
            disabled={uploading || !file}
            sx={{
              bgcolor: "black",
              color: "#fff",
              "&:hover": { bgcolor: "#222" },
              minWidth: 120,
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </Box>

        {/* RIGHT */}
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Typography sx={{ color: "#555", fontSize: 13 }}>
            Total Rows: <b>{total.toLocaleString("en-IN")}</b>
          </Typography>

          <Typography sx={{ color: "#555", fontSize: 13 }}>
            Customer Pay Total: <b>{fmtINR(totalCustomerPayAmt)}</b>
          </Typography>

          <Button
            variant="outlined"
            onClick={handleExport}
            disabled={exporting}
            startIcon={exporting ? <CircularProgress size={16} /> : null}
            sx={{ textTransform: "none" }}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>

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
          label="Search (AWB / Order / Portal / UTR)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 280 }}
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

        <Button
          variant="outlined"
          disabled={anyActionLoading}
          onClick={() => {
            setPage(0);
            fetchData(0, rowsPerPage);
          }}
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
          <TableContainer component={Paper} sx={{ border: "1px solid #ccc" }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "black" }}>
                <TableRow>
                  {[
                    "Upload Date",
                    "AWB No",
                    "DPU Date",
                    "Process Date",
                    "Order ID",
                    "Portal Name",
                    "Customer Pay Amount",
                    "UTR",
                    "Settled Date",
                  ].map((head) => (
                    <TableCell key={head} sx={{ color: "#fff", fontWeight: 600 }}>
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {records.map((row, idx) => (
                  <TableRow key={row._id || idx} hover>
                    <TableCell>{fmtDate(row.uploadDate)}</TableCell>
                    <TableCell>{row.awbNo}</TableCell>
                    <TableCell>{fmtDate(row.dpuDate)}</TableCell>
                    <TableCell>{fmtDate(row.processDate)}</TableCell>
                    <TableCell>{row.orderId}</TableCell>
                    <TableCell>{row.portalName}</TableCell>
                    <TableCell>{fmtINR(row.customerPayAmt)}</TableCell>
                    <TableCell>{row.utr}</TableCell>
                    <TableCell>{fmtDate(row.settledDate)}</TableCell>
                  </TableRow>
                ))}

                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No data found for current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
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

export default BluedartUpload;

import React, { useEffect, useState } from "react";
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

const DtdcUpload = () => {
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [uploadMin, setUploadMin] = useState("");
  const [uploadMax, setUploadMax] = useState("");

  const [bookingMin, setBookingMin] = useState("");
  const [bookingMax, setBookingMax] = useState("");

  const [deliveryMin, setDeliveryMin] = useState("");
  const [deliveryMax, setDeliveryMax] = useState("");

  const [remitMin, setRemitMin] = useState("");
  const [remitMax, setRemitMax] = useState("");

  const [codMin, setCodMin] = useState("");
  const [codMax, setCodMax] = useState("");

  const [remittedMin, setRemittedMin] = useState("");
  const [remittedMax, setRemittedMax] = useState("");

  const fmtINR = (n) =>
    n == null || n === "" ? "" : `₹${Number(n).toLocaleString("en-IN")}`;

  const fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-IN");
  };

  const buildUrl = (pageNum = page, limit = rowsPerPage) => {
    const params = new URLSearchParams();
    params.set("page", String(pageNum + 1));
    params.set("limit", String(limit));

    if (q.trim()) params.set("q", q.trim());
    if (status.trim()) params.set("status", status.trim());

    if (uploadMin) params.set("uploadMin", uploadMin);
    if (uploadMax) params.set("uploadMax", uploadMax);

    if (bookingMin) params.set("bookingMin", bookingMin);
    if (bookingMax) params.set("bookingMax", bookingMax);

    if (deliveryMin) params.set("deliveryMin", deliveryMin);
    if (deliveryMax) params.set("deliveryMax", deliveryMax);

    if (remitMin) params.set("remitMin", remitMin);
    if (remitMax) params.set("remitMax", remitMax);

    if (codMin !== "") params.set("codMin", codMin);
    if (codMax !== "") params.set("codMax", codMax);

    if (remittedMin !== "") params.set("remittedMin", remittedMin);
    if (remittedMax !== "") params.set("remittedMax", remittedMax);

    return `${API_BASE}/api/dtdc/data?${params.toString()}`;
  };

  const fetchData = async (pageNum = page, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl(pageNum, limit));
      const json = await res.json();
      setRecords(json.data || []);
      setTotalCount(json.totalCount || 0);
    } catch (err) {
      alert("Failed to fetch DTDC data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const handleFileChange = (e) => setFile(e.target.files?.[0] || null);

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file.");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/dtdc/upload`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.error) {
        alert(json.error);
      } else {
        alert(`Upload successful (${json.inserted || 0} rows)`);
        setPage(0);
        fetchData(0, rowsPerPage);
      }
    } catch (err) {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setPage(0);
    fetchData(0, rowsPerPage);
  };

  const clearFilters = () => {
    setQ("");
    setStatus("");

    setUploadMin("");
    setUploadMax("");

    setBookingMin("");
    setBookingMax("");

    setDeliveryMin("");
    setDeliveryMax("");

    setRemitMin("");
    setRemitMax("");

    setCodMin("");
    setCodMax("");

    setRemittedMin("");
    setRemittedMax("");

    setPage(0);
    fetchData(0, rowsPerPage);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ color: "black", mb: 2 }}>
        📦 DTDC Settlement Upload
      </Typography>

      {/* Upload */}
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
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={handleUpload}
            disabled={loading}
            sx={{ bgcolor: "black", color: "#fff", "&:hover": { bgcolor: "#333" } }}
          >
            Upload
          </Button>
        </Box>

        <Typography sx={{ color: "#555", fontSize: 13 }}>
          Total: <b>{totalCount.toLocaleString("en-IN")}</b>
        </Typography>
      </Paper>

      {/* Filters (NO color filters) */}
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
          label="Search (CN / Ref / UTR / Status)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 280 }}
        />

        <TextField
          size="small"
          label="Status contains"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 200 }}
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
          label="Booking From"
          type="date"
          value={bookingMin}
          onChange={(e) => setBookingMin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Booking To"
          type="date"
          value={bookingMax}
          onChange={(e) => setBookingMax(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="Delivery From"
          type="date"
          value={deliveryMin}
          onChange={(e) => setDeliveryMin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Delivery To"
          type="date"
          value={deliveryMax}
          onChange={(e) => setDeliveryMax(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="Remit From"
          type="date"
          value={remitMin}
          onChange={(e) => setRemitMin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Remit To"
          type="date"
          value={remitMax}
          onChange={(e) => setRemitMax(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="COD Min"
          type="number"
          value={codMin}
          onChange={(e) => setCodMin(e.target.value)}
          sx={{ width: 120 }}
        />
        <TextField
          size="small"
          label="COD Max"
          type="number"
          value={codMax}
          onChange={(e) => setCodMax(e.target.value)}
          sx={{ width: 120 }}
        />

        <TextField
          size="small"
          label="Remitted Min"
          type="number"
          value={remittedMin}
          onChange={(e) => setRemittedMin(e.target.value)}
          sx={{ width: 140 }}
        />
        <TextField
          size="small"
          label="Remitted Max"
          type="number"
          value={remittedMax}
          onChange={(e) => setRemittedMax(e.target.value)}
          sx={{ width: 140 }}
        />

        <Button variant="outlined" onClick={applyFilters} sx={{ textTransform: "none" }}>
          Apply
        </Button>
        <Button variant="text" onClick={clearFilters} sx={{ textTransform: "none" }}>
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
                    "CN Number",
                    "Customer Reference Number",
                    "Booking Date",
                    "Delivery Date",
                    "COD Amount",
                    "Remitted Amount",
                    "Remittance Status",
                    "UTR Number",
                    "Remittance Date",
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
                    <TableCell>{row.cnNumber}</TableCell>
                    <TableCell>{row.customerReferenceNumber}</TableCell>
                    <TableCell>{fmtDate(row.bookingDate)}</TableCell>
                    <TableCell>{fmtDate(row.deliveryDate)}</TableCell>
                    <TableCell>{fmtINR(row.codAmount)}</TableCell>
                    <TableCell>{fmtINR(row.remittedAmount)}</TableCell>
                    <TableCell>{row.remittanceStatus}</TableCell>
                    <TableCell>{row.utrNumber}</TableCell>
                    <TableCell>{fmtDate(row.remittanceDate)}</TableCell>
                  </TableRow>
                ))}

                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      No data found for current filters.
                    </TableCell>
                  </TableRow>
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

export default DtdcUpload;

import React, { useEffect, useMemo, useState } from "react";
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
  CircularProgress,
  TablePagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import axios from "axios";

const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const LIGHT_GREEN = "#DCFCE7";
const LIGHT_RED = "#FEE2E2";

const years = ["", "2023", "2024", "2025", "2026"];

const BankKotak = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [page, setPage] = useState(0); // MUI 0-based
  const [rowsPerPage, setRowsPerPage] = useState(250);

  // filters
  const [year, setYear] = useState("");
  const [dateMin, setDateMin] = useState("");
  const [dateMax, setDateMax] = useState("");
  const [q, setQ] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [drcr, setDrcr] = useState(""); // DR/CR

  // selection
  const [selected, setSelected] = useState(() => new Set());

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "");
  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    if (Number.isNaN(n)) return "";
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fetchData = async (pageArg = page, rowsArg = rowsPerPage) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE_URL}/api/bank-reconciliation/kotak-bank`, {
        params: {
          page: pageArg + 1,
          limit: rowsArg,
          year: year || undefined,
          dateMin: dateMin || undefined,
          dateMax: dateMax || undefined,
          q: q.trim() || undefined,
          amountMin: amountMin !== "" ? amountMin : undefined,
          amountMax: amountMax !== "" ? amountMax : undefined,
          drcr: drcr || undefined,
        },
      });

      setRows(data?.data || []);
      setTotal(data?.total || 0);
      setPage(pageArg);
      setRowsPerPage(rowsArg);
      setSelected(new Set());
    } catch (err) {
      console.error("Error fetching Kotak txns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      await axios.post(`${API_BASE_URL}/api/bank-reconciliation/kotak-bank/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchData(0, rowsPerPage);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading CSV");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleChangePage = (_event, newPage) => fetchData(newPage, rowsPerPage);

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10) || 250;
    fetchData(0, newRowsPerPage);
  };

  // selection helpers
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (checked) => {
    if (!checked) return setSelected(new Set());
    const s = new Set(rows.map((r) => r._id));
    setSelected(s);
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  // persist rowColor
  const saveRowColor = async (id, hex) => {
    try {
      await axios.put(`${API_BASE_URL}/api/bank-reconciliation/kotak-bank/${id}`, { rowColor: hex });
    } catch (e) {
      console.error("Row color save error:", e);
    }
  };

  const applyRowColor = async (hex) => {
    if (!selected.size) return;

    // optimistic
    setRows((prev) =>
      prev.map((r) => (selected.has(r._id) ? { ...r, rowColor: hex } : r))
    );

    // persist (one by one; safe + simple)
    await Promise.all(Array.from(selected).map((id) => saveRowColor(id, hex)));
  };

  const Swatch = ({ color, title, onClick }) => (
    <button
      title={title}
      onClick={onClick}
      style={{ background: color }}
      className="w-7 h-7 rounded-md border shadow-sm"
    />
  );

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f7fb", minHeight: "100vh", boxSizing: "border-box" }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 2,
          border: "1px solid #e0e3ef",
          background: "linear-gradient(135deg, rgba(0,122,255,0.06), rgba(0,0,0,0))",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Kotak Bank – Reconciliation
        </Typography>

        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUploadIcon />}
          disabled={uploading}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            px: 2.5,
            py: 0.75,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {uploading ? "Uploading..." : "Upload CSV"}
          <input type="file" accept=".csv" hidden onChange={handleFileChange} />
        </Button>
      </Paper>

      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          border: "1px solid #e0e3ef",
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: color controls + YEAR dropdown */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
          <Swatch color={LIGHT_GREEN} title="Apply green to selected" onClick={() => applyRowColor(LIGHT_GREEN)} />
          <Swatch color={LIGHT_RED} title="Apply red to selected" onClick={() => applyRowColor(LIGHT_RED)} />
          <Button
            size="small"
            variant="outlined"
            onClick={() => applyRowColor("")}
            sx={{ borderRadius: 2, textTransform: "none" }}
            title="Clear color from selected"
          >
            Clear Color
          </Button>

          {/* YEAR filter (right side of color filter) */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={year}
              label="Year"
              onChange={(e) => setYear(e.target.value)}
            >
              {years.map((y) => (
                <MenuItem key={y || "all"} value={y}>
                  {y ? y : "All Years"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Right: filters */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
          <input
            type="date"
            value={dateMin}
            onChange={(e) => setDateMin(e.target.value)}
            className="px-2 py-1 border rounded-lg"
            title="Value Date from"
          />
          <input
            type="date"
            value={dateMax}
            onChange={(e) => setDateMax(e.target.value)}
            className="px-2 py-1 border rounded-lg"
            title="Value Date to"
          />

          <input
            type="text"
            placeholder="Search (desc/ref/remarks)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="px-2 py-1 border rounded-lg min-w-[220px]"
          />

          <input
            type="number"
            placeholder="Amount min"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
            className="px-2 py-1 border rounded-lg w-28"
          />
          <input
            type="number"
            placeholder="Amount max"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            className="px-2 py-1 border rounded-lg w-28"
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>DR/CR</InputLabel>
            <Select value={drcr} label="DR/CR" onChange={(e) => setDrcr(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="DR">DR</MenuItem>
              <MenuItem value="CR">CR</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: "none" }}
            onClick={() => fetchData(0, rowsPerPage)}
          >
            Apply
          </Button>

          <Button
            variant="text"
            sx={{ borderRadius: 2, textTransform: "none" }}
            onClick={() => {
              setYear("");
              setDateMin("");
              setDateMax("");
              setQ("");
              setAmountMin("");
              setAmountMax("");
              setDrcr("");
              fetchData(0, rowsPerPage);
            }}
          >
            Clear
          </Button>
        </Box>
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e3ef", overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: "70vh" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 44 }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </TableCell>

                    <TableCell sx={{ fontWeight: 700 }}>Sl. No.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Transaction Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Value Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Chq / Ref No.</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dr / Cr</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dr / Cr</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        No records available. Upload a CSV to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => (
                      <TableRow
                        key={row._id}
                        hover
                        sx={{
                          backgroundColor: row.rowColor || (idx % 2 ? "#fafbff" : "#fff"),
                        }}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selected.has(row._id)}
                            onChange={() => toggleOne(row._id)}
                          />
                        </TableCell>

                        <TableCell>{row.slNo ?? ""}</TableCell>
                        <TableCell>{formatDate(row.transactionDate)}</TableCell>
                        <TableCell>{formatDate(row.valueDate)}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>{row.chqRefNo}</TableCell>
                        <TableCell align="right">{formatNumber(row.amount)}</TableCell>
                        <TableCell>{row.amountDrCr}</TableCell>
                        <TableCell align="right">{formatNumber(row.balance)}</TableCell>
                        <TableCell>{row.balanceDrCr}</TableCell>
                        <TableCell>{row.remarks}</TableCell>
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
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[25, 50, 100, 200, 250, 500]}
              sx={{
                "& .MuiTablePagination-toolbar": { justifyContent: "flex-end", px: 2 },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: 12 },
              }}
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default BankKotak;

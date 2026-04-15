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
  TextField,
  Checkbox,
  Stack,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import axios from "axios";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const LIGHT_GREEN = "#DCFCE7";
const LIGHT_RED = "#FEE2E2";

const Swatch = ({ color, onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 28,
      height: 28,
      borderRadius: 8,
      border: "1px solid rgba(0,0,0,0.15)",
      background: color,
      cursor: "pointer",
    }}
  />
);

const BankCapital6389 = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // selection (by _id)
  const [selectedIds, setSelectedIds] = useState(new Set());

  // filters
  const [dateMin, setDateMin] = useState("");
  const [dateMax, setDateMax] = useState("");
  const [descFilter, setDescFilter] = useState("");
  const [nameFilter, setNameFilter] = useState(""); // remarks/name-like
  const [refFilter, setRefFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const allChecked = useMemo(() => {
    if (!rows.length) return false;
    return rows.every((r) => selectedIds.has(r._id));
  }, [rows, selectedIds]);

  const someChecked = useMemo(() => {
    if (!rows.length) return false;
    const count = rows.reduce((acc, r) => acc + (selectedIds.has(r._id) ? 1 : 0), 0);
    return count > 0 && count < rows.length;
  }, [rows, selectedIds]);

  const buildParams = (pageArg, rowsArg) => {
    const qParts = [];
    if (descFilter.trim()) qParts.push(descFilter.trim());
    if (nameFilter.trim()) qParts.push(nameFilter.trim());
    if (refFilter.trim()) qParts.push(refFilter.trim());

    return {
      page: pageArg + 1,
      limit: rowsArg,
      q: qParts.length ? qParts.join(" ") : undefined,
      dateMin: dateMin || undefined,
      dateMax: dateMax || undefined,
      branchCode: branchFilter.trim() || undefined,
      amountMin: amountMin !== "" ? amountMin : undefined,
      amountMax: amountMax !== "" ? amountMax : undefined,
    };
  };

  const fetchData = async (pageArg = page, rowsArg = rowsPerPage) => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/api/bank-reconciliation/capital-6389`,
        { params: buildParams(pageArg, rowsArg) }
      );

      setRows(data?.data || []);
      setTotal(data?.total || 0);
      setPage(pageArg);
      setRowsPerPage(rowsArg);
      setSelectedIds(new Set()); // clear selection on page load
    } catch (err) {
      console.error("Error fetching Capital 6389 txns:", err);
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
      await api.post(
        `/api/bank-reconciliation/capital-6389/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      await fetchData(0, rowsPerPage);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading CSV");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleChangePage = (_event, newPage) => {
    fetchData(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10) || 50;
    fetchData(0, newRowsPerPage);
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-IN");
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // selection handlers
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = (checked) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rows.map((r) => r._id)));
  };

  // row color persist
  const saveRowColor = async (id, color) => {
    await api.put(`/api/bank-reconciliation/capital-6389/${id}`, {
      rowColor: color,
    });
  };

  const applyRowColor = async (color) => {
    if (!selectedIds.size) return;

    // optimistic UI
    setRows((prev) => prev.map((r) => (selectedIds.has(r._id) ? { ...r, rowColor: color } : r)));

    // persist (best-effort)
    await Promise.all(
      Array.from(selectedIds).map(async (id) => {
        try {
          await saveRowColor(id, color);
        } catch (e) {
          console.error("Color save failed for", id, e);
        }
      })
    );
  };

  const clearFilters = () => {
    setDateMin("");
    setDateMax("");
    setDescFilter("");
    setNameFilter("");
    setRefFilter("");
    setBranchFilter("");
    setAmountMin("");
    setAmountMax("");
    fetchData(0, rowsPerPage);
  };

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f7fb", minHeight: "100vh", boxSizing: "border-box" }}>
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
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Bank – Capital 6389
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          {/* Coloring controls */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Swatch color={LIGHT_GREEN} onClick={() => applyRowColor(LIGHT_GREEN)} title="Mark selected Green" />
            <Swatch color={LIGHT_RED} onClick={() => applyRowColor(LIGHT_RED)} title="Mark selected Red" />
            <Button
              variant="outlined"
              onClick={() => applyRowColor("")}
              sx={{ textTransform: "none", borderRadius: 999 }}
              disabled={!selectedIds.size}
            >
              Clear Color
            </Button>
          </Stack>

          {/* Upload */}
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
        </Stack>
      </Paper>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          px: 2,
          py: 2,
          borderRadius: 2,
          border: "1px solid #e0e3ef",
        }}
      >
        <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            label="From (Txn Date)"
            type="date"
            value={dateMin}
            onChange={(e) => setDateMin(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label="To (Txn Date)"
            type="date"
            value={dateMax}
            onChange={(e) => setDateMax(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            label="Description contains"
            value={descFilter}
            onChange={(e) => setDescFilter(e.target.value)}
          />
          <TextField
            size="small"
            label="Name / Remarks contains"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <TextField
            size="small"
            label="Ref No contains"
            value={refFilter}
            onChange={(e) => setRefFilter(e.target.value)}
          />
          <TextField
            size="small"
            label="Branch Code"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            sx={{ maxWidth: 160 }}
          />

          <TextField
            size="small"
            label="Amount min"
            type="number"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
            sx={{ maxWidth: 160 }}
          />
          <TextField
            size="small"
            label="Amount max"
            type="number"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            sx={{ maxWidth: 160 }}
          />

          <Button
            variant="contained"
            onClick={() => fetchData(0, rowsPerPage)}
            sx={{ textTransform: "none", borderRadius: 999 }}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            onClick={clearFilters}
            sx={{ textTransform: "none", borderRadius: 999 }}
          >
            Clear
          </Button>
        </Stack>
      </Paper>

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
                    <TableCell sx={{ fontWeight: 700, width: 48 }}>
                      <Checkbox
                        checked={allChecked}
                        indeterminate={someChecked}
                        onChange={(e) => toggleAll(e.target.checked)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell sx={{ fontWeight: 600 }}>Txn Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Value Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ref No./Cheque No.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Branch Code</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Debit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Credit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        No records available. Upload a CSV to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const checked = selectedIds.has(row._id);
                      return (
                        <TableRow
                          key={row._id}
                          hover
                          sx={{
                            backgroundColor: row.rowColor || undefined,
                            "&:nth-of-type(odd)": { backgroundColor: row.rowColor || "#fafbff" },
                          }}
                        >
                          <TableCell>
                            <Checkbox checked={checked} onChange={() => toggleOne(row._id)} size="small" />
                          </TableCell>

                          <TableCell>{formatDate(row.txnDate)}</TableCell>
                          <TableCell>{formatDate(row.valueDate)}</TableCell>
                          <TableCell sx={{ minWidth: 420 }}>{row.description}</TableCell>
                          <TableCell sx={{ minWidth: 240 }}>{row.refNo}</TableCell>
                          <TableCell>{row.branchCode}</TableCell>
                          <TableCell align="right">{formatNumber(row.debit)}</TableCell>
                          <TableCell align="right">{formatNumber(row.credit)}</TableCell>
                          <TableCell align="right">{formatNumber(row.balance)}</TableCell>
                          <TableCell sx={{ minWidth: 220 }}>{row.remarks}</TableCell>
                        </TableRow>
                      );
                    })
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
              rowsPerPageOptions={[25, 50, 100, 200, 500]}
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

export default BankCapital6389;

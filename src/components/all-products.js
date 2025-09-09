// src/pages/AllProducts.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Divider,
  IconButton,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE || "https://muditamleads-14f32a10d7f7.herokuapp.com";

const MONTH_OPTIONS = [
  "10 Days",
  "20 Days",
  "1 Month",
  "2 Month",
  "3 Month",
  "4 Month",
  "6 Month",
];

export default function AllProducts() {
  const [page, setPage] = useState(0); // 0-indexed (MUI)
  const [limit, setLimit] = useState(250);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0); // server total (kept for info)
  const [loading, setLoading] = useState(true);

  // key: variantId OR title|sku|price
  // value: { month: string, cohort: "Yes"|"No" }
  const [rowInputs, setRowInputs] = useState({});

  // Filters UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState(""); // filter by title/name
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Primary color helpers (black)
  const blackBtn = {
    bgcolor: "black",
    color: "white",
    "&:hover": { bgcolor: "#111" },
    textTransform: "none",
    borderRadius: 2,
    px: 2.5,
  };

  const keyFor = (r) =>
    r.variantId && Number(r.variantId) > 0
      ? `vid:${r.variantId}`
      : `fallback:${r.title || ""}|${r.sku || ""}|${r.price ?? 0}`;

  const ensureDefaults = (data) => {
    setRowInputs((prev) => {
      const next = { ...prev };
      for (const r of data) {
        const k = keyFor(r);
        if (!next[k]) {
          next[k] = { month: r.month ?? "", cohort: r.cohort ?? "Yes" };
        } else {
          if (!next[k].month && r.month) next[k].month = r.month;
          if (!next[k].cohort && r.cohort) next[k].cohort = r.cohort;
        }
      }
      return next;
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/products/from-orders`, {
        params: { page: page + 1, limit },
      });
      const list = res.data?.data || [];
      setRows(list);
      setTotal(res.data?.total || 0);
      ensureDefaults(list);
    } catch (e) {
      console.error("Failed to load products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, limit]);

  // Client-side filtering over the currently loaded rows
  const filteredRows = useMemo(() => {
    const n = nameFilter.trim().toLowerCase();
    const min = priceMin === "" ? null : Number(priceMin);
    const max = priceMax === "" ? null : Number(priceMax);

    return rows.filter((r) => {
      const nameOk = n ? (r.title || "").toLowerCase().includes(n) : true;
      const price = Number(r.price ?? 0);
      const minOk = min == null || price >= min;
      const maxOk = max == null || price <= max;
      return nameOk && minOk && maxOk;
    });
  }, [rows, nameFilter, priceMin, priceMax]);

  // Pagination should reflect filtered length
  const pagedRows = useMemo(() => {
    const start = page * limit;
    return filteredRows.slice(start, start + limit);
  }, [filteredRows, page, limit]);

  // Reset to first page when filters change for better UX
  useEffect(() => {
    setPage(0);
  }, [nameFilter, priceMin, priceMax]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setLimit(parseInt(e.target.value, 10));
    setPage(0);
  };

  const saveMeta = async ({ variantId, title, sku, price, month, cohort }) => {
    try {
      await axios.post(`${API_BASE}/api/products/from-orders/meta`, {
        variantId,
        title,
        sku,
        price,
        month,
        cohort,
      });
    } catch (e) {
      console.error("Failed to save product meta:", e);
    }
  };

  const handleMonthChange = (k, v) => {
    setRowInputs((s) => {
      const next = { ...s, [k]: { ...(s[k] || { cohort: "Yes" }), month: v } };
      return next;
    });
    const row = rows.find((r) => keyFor(r) === k);
    if (row) {
      saveMeta({
        variantId: row.variantId,
        title: row.title,
        sku: row.sku ?? "",
        price: row.price ?? 0,
        month: v,
        cohort: rowInputs[k]?.cohort ?? "Yes",
      });
    }
  };

  const handleCohortChange = (k, v) => {
    setRowInputs((s) => {
      const next = { ...s, [k]: { ...(s[k] || { month: "" }), cohort: v } };
      return next;
    });
    const row = rows.find((r) => keyFor(r) === k);
    if (row) {
      saveMeta({
        variantId: row.variantId,
        title: row.title,
        sku: row.sku ?? "",
        price: row.price ?? 0,
        month: rowInputs[k]?.month ?? "",
        cohort: v,
      });
    }
  };

  const clearFilters = () => {
    setNameFilter("");
    setPriceMin("");
    setPriceMax("");
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 1200, mx: "auto" }}>
      {/* Header Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          border: "1px solid #eaeaea",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "black" }}>
            All Products
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b7280" }}>
            From Orders · {filteredRows.length} item{filteredRows.length !== 1 ? "s" : ""}
            {filteredRows.length !== rows.length ? (
              <>&nbsp;· Filtered</>
            ) : null}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            startIcon={<FilterListIcon />}
            onClick={() => setFiltersOpen(true)}
            sx={blackBtn}
            variant="contained"
          >
            Filters
          </Button>
        </Stack>
      </Paper>

      {/* Data Card */}
      <Paper
        elevation={0}
        sx={{
          overflow: "hidden",
          borderRadius: 3,
          border: "1px solid #eaeaea",
        }}
      >
        {/* Table */}
        <Box sx={{ position: "relative" }}>
          {loading && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(255,255,255,0.6)",
                zIndex: 2,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <Table stickyHeader>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    bgcolor: "black",
                    color: "white",
                    fontWeight: 700,
                    borderColor: "#1f2937",
                  },
                }}
              >
                <TableCell align="left">Title</TableCell>
                <TableCell align="center">Variant ID</TableCell>
                <TableCell align="center">Price</TableCell>
                <TableCell align="center">Month</TableCell>
                <TableCell align="center">Cohort</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRows.map((r, idx) => {
                const k = keyFor(r);
                const inputs = rowInputs[k] || { month: "", cohort: "Yes" };
                return (
                  <TableRow
                    key={`${k}-${idx}`}
                    sx={{
                      "&:hover": { bgcolor: "#fafafa" },
                      "& td": { borderColor: "#f1f1f1" },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{r.title || "-"}</TableCell>
                    <TableCell>{r.variantId || "-"}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatPrice(r.price)}
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={inputs.month}
                        onChange={(e) => handleMonthChange(k, e.target.value)}
                        displayEmpty
                        sx={{
                          minWidth: 160,
                          "& .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                        }}
                      >
                        <MenuItem value="">
                          <em>Select</em>
                        </MenuItem>
                        {MONTH_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={inputs.cohort}
                        onChange={(e) => handleCohortChange(k, e.target.value)}
                        sx={{
                          minWidth: 120,
                          "& .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                        }}
                      >
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && pagedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Footer / Pagination */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 1,
            borderTop: "1px solid #eaeaea",
          }}
        >
          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100, 250]}
          />
        </Box>
      </Paper>

      {/* Filters Dialog */}
      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
          <Typography sx={{ fontWeight: 800, color: "black" }}>Filters</Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={() => setFiltersOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Filter by Name"
              placeholder="e.g., Ashwagandha"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              fullWidth
              InputLabelProps={{ sx: { color: "#111" } }}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
              }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Price Min"
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                fullWidth
                InputLabelProps={{ sx: { color: "#111" } }}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                }}
              />
              <TextField
                label="Price Max"
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                fullWidth
                InputLabelProps={{ sx: { color: "#111" } }}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={clearFilters} sx={{ color: "black", textTransform: "none" }}>
            Clear
          </Button>
          <Button
            onClick={() => setFiltersOpen(false)}
            sx={blackBtn}
            variant="contained"
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function formatPrice(p) {
  if (p == null) return "-";
  const num = Number(p);
  if (!Number.isFinite(num)) return String(p);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return num.toFixed(2);
  }
}

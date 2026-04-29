import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:5001").replace(/\/+$/, "");

const LABELS = {
  totalActive: "Total Active Customers",
  finished: "Finished",
  next10Days: "Finishing in 10 Days",
  next10to20Days: "10–20 Days",
  supply20PlusDays: "20+ Days",
};

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysSince(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const ms = Date.now() - d.getTime();
  return String(Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000))));
}

export default function RetentionOverviewCategoryDetails() {
  const { category } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ rows: [], total: 0 });
  const [sortBy, setSortBy] = useState("lastOrderDate");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDir("asc");
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const incoming = new URLSearchParams(location.search || "");
        const qs = new URLSearchParams({ lookbackDays: "540", category: category || "totalActive" });
        const healthExpert = String(incoming.get("healthExpert") || "").trim();
        if (healthExpert) qs.set("healthExpert", healthExpert);
        const res = await fetch(`${API_BASE}/cohart-dataApi/active-customers-category-details?${qs.toString()}`, {
          headers: { Accept: "application/json" },
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        const json = JSON.parse(text);
        setData({ rows: Array.isArray(json?.rows) ? json.rows : [], total: Number(json?.total || 0) });
      } catch (e) {
        setError(String(e.message || e));
        setData({ rows: [], total: 0 });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [category, location.search]);

  const sortedRows = [...(data.rows || [])].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "customerName") {
      return String(a?.customerName || "").localeCompare(String(b?.customerName || "")) * dir;
    }
    if (sortBy === "contactNumber") {
      return String(a?.contactNumber || "").localeCompare(String(b?.contactNumber || "")) * dir;
    }
    if (sortBy === "productsOrdered") {
      const av = Array.isArray(a?.productsOrdered) ? a.productsOrdered.join(", ") : "";
      const bv = Array.isArray(b?.productsOrdered) ? b.productsOrdered.join(", ") : "";
      return av.localeCompare(bv) * dir;
    }
    if (sortBy === "lastOrderDate") {
      const av = a?.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
      const bv = b?.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
      return (av - bv) * dir;
    }
    if (sortBy === "totalOrders") {
      const av = Number(a?.totalOrders || 0);
      const bv = Number(b?.totalOrders || 0);
      return (av - bv) * dir;
    }
    if (sortBy === "daysSince") {
      const av = Number(daysSince(a?.lastOrderDate));
      const bv = Number(daysSince(b?.lastOrderDate));
      return ((Number.isFinite(av) ? av : -1) - (Number.isFinite(bv) ? bv : -1)) * dir;
    }
    return 0;
  });

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ borderRadius: 3, border: "1px solid #D4DFEC" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {LABELS[category] || "Category"} - {data.total}
            </Typography>
            <Typography
              sx={{ cursor: "pointer", fontWeight: 700, color: "#2563EB" }}
              onClick={() => navigate("/retention/overview-combined")}
            >
              Back to Combined Overview
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load data: {error}</Alert>}

          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading...</Typography>
            </Stack>
          ) : (
            <TableContainer sx={{ border: "1px solid #E2E8F0", borderRadius: 2, maxHeight: 560 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={sortBy === "customerName"}
                        direction={sortBy === "customerName" ? sortDir : "asc"}
                        onClick={() => handleSort("customerName")}
                        sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                      >
                        Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={sortBy === "contactNumber"}
                        direction={sortBy === "contactNumber" ? sortDir : "asc"}
                        onClick={() => handleSort("contactNumber")}
                        sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                      >
                        Number
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={sortBy === "productsOrdered"}
                        direction={sortBy === "productsOrdered" ? sortDir : "asc"}
                        onClick={() => handleSort("productsOrdered")}
                        sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                      >
                        Products Ordered
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={sortBy === "lastOrderDate"}
                        direction={sortBy === "lastOrderDate" ? sortDir : "asc"}
                        onClick={() => handleSort("lastOrderDate")}
                        sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                      >
                        Last Order Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={sortBy === "totalOrders"}
                        direction={sortBy === "totalOrders" ? sortDir : "asc"}
                        onClick={() => handleSort("totalOrders")}
                        sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                      >
                        Total Orders
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={sortBy === "daysSince"}
                        direction={sortBy === "daysSince" ? sortDir : "asc"}
                        onClick={() => handleSort("daysSince")}
                        sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                      >
                        Days Since Last Order
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedRows.map((r, i) => (
                    <TableRow key={`${r.contactNumber}-${i}`} hover>
                      <TableCell>{r.customerName || "-"}</TableCell>
                      <TableCell>{r.contactNumber || "-"}</TableCell>
                      <TableCell>{Array.isArray(r.productsOrdered) ? r.productsOrdered.join(", ") : "-"}</TableCell>
                      <TableCell>{fmtDate(r.lastOrderDate)}</TableCell>
                      <TableCell>{r.totalOrders || 0}</TableCell>
                      <TableCell>{daysSince(r.lastOrderDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

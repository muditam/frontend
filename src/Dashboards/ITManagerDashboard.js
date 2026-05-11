// src/components/ITManagerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid, 
  LinearProgress, 
  Paper,
  Snackbar,
  Stack, 
  Typography,
} from "@mui/material"; 
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded"; 
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const safeArr = (v) => (Array.isArray(v) ? v : []);

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN");
};

function StatCard({ title, value, subtitle, icon, color = "primary" }) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
              {value}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>

          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: `${color}.50`,
              color: `${color}.main`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        height: "100%",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>{children}</Box>
    </Paper>
  );
}

function ImageGalleryDialog({ open, onClose, images = [], title = "Images" }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent dividers sx={{ p: 2.5 }}>
        {images.length ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 1.5,
            }}
          >
            {images.map((src, idx) => (
              <Paper
                key={`${src}-${idx}`}
                variant="outlined"
                sx={{ p: 0.5, borderRadius: 2, overflow: "hidden" }}
              >
                <img
                  src={src}
                  alt={`asset-${idx}`}
                  style={{
                    width: "100%",
                    height: 160,
                    objectFit: "cover",
                    display: "block",
                    cursor: "zoom-in",
                  }}
                  onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
                />
              </Paper>
            ))}
          </Box>
        ) : (
          <Stack alignItems="center" spacing={1} sx={{ py: 6, color: "text.secondary" }}>
            <ImageOutlinedIcon />
            <Typography variant="body2">No images available.</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 1.5 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function JourneyDialog({ open, onClose, assetCode }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [gallery, setGallery] = useState({ open: false, images: [], title: "" });

  useEffect(() => {
    if (!open || !assetCode) return;

    let active = true;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(
          `/api/asset-allotments/journey/${encodeURIComponent(assetCode)}`
        );
        if (!active) return;
        setRows(safeArr(data));
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load asset journey");
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [open, assetCode]);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>
          Asset Journey {assetCode ? `• ${assetCode}` : ""}
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          {loading ? (
            <Stack alignItems="center" py={5}>
              <CircularProgress />
            </Stack>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : !rows.length ? (
            <Alert severity="info">
              No returned journey found for this asset yet.
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {rows.map((row) => {
                const oldImgs = safeArr(row.allotmentImageUrls);
                const newImgs = safeArr(row.returnImageUrls);

                return (
                  <Paper
                    key={row._id}
                    variant="outlined"
                    sx={{ borderRadius: 2, p: 2 }}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {row.employee?.fullName || row.employeeName || "Unknown Employee"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.name} • {row.company} • {row.model}
                          </Typography>
                        </Box>

                        <Chip
                          size="small"
                          color="success"
                          variant="outlined"
                          label={`Returned • ${fmtDate(row.returnedAt)}`}
                        />
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        Allotted: {fmtDateTime(row.allottedAt)} &nbsp; | &nbsp; Returned: {fmtDateTime(row.returnedAt)}
                      </Typography>

                      <Typography variant="body2">
                        <strong>Notes:</strong> {row.notes?.trim() || "—"}
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!oldImgs.length}
                          onClick={() =>
                            setGallery({
                              open: true,
                              images: oldImgs,
                              title: `${row.assetCode} • Allotment Images`,
                            })
                          }
                        >
                          Allotment Images ({oldImgs.length})
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!newImgs.length}
                          onClick={() =>
                            setGallery({
                              open: true,
                              images: newImgs,
                              title: `${row.assetCode} • Return Images`,
                            })
                          }
                        >
                          Return Images ({newImgs.length})
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <ImageGalleryDialog
        open={gallery.open}
        images={gallery.images}
        title={gallery.title}
        onClose={() => setGallery({ open: false, images: [], title: "" })}
      />
    </>
  );
}

export default function ITManagerDashboard() {
  const [assets, setAssets] = useState([]);
  const [allotments, setAllotments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    severity: "success",
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [gallery, setGallery] = useState({
    open: false,
    images: [],
    title: "",
  });

  const [journey, setJourney] = useState({
    open: false,
    assetCode: "",
  });

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [assetsRes, allotmentsRes, employeesRes] = await Promise.all([
        api.get(`/api/assets?light=1`),
        api.get(`/api/asset-allotments`),
        api.get(`/api/assets/employees`),
      ]);

      const mappedAssets = safeArr(assetsRes.data).map((a) => ({
        ...a,
        allocatedTo: a.allocatedTo || a.allottedTo || "",
        employeeId: a.employeeId || a.emp_id || "",
        imageUrls: safeArr(a.imageUrls),
      }));

      setAssets(mappedAssets);
      setAllotments(safeArr(allotmentsRes.data));
      setEmployees(safeArr(employeesRes.data));
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        msg: err?.response?.data?.message || "Failed to load IT dashboard",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const activeAllotments = useMemo(
    () => allotments.filter((a) => a.status !== "returned"),
    [allotments]
  );

  const returnedAllotments = useMemo(
    () => allotments.filter((a) => a.status === "returned"),
    [allotments]
  );

  const totalAssets = assets.length;
  const faultyAssets = useMemo(
    () => assets.filter((a) => !!a.isFaulty),
    [assets]
  );
  const nonFaultyAssets = useMemo(
    () => assets.filter((a) => !a.isFaulty),
    [assets]
  );
  const assignedAssets = useMemo(
    () => nonFaultyAssets.filter((a) => a.allocatedTo || a.employeeId),
    [nonFaultyAssets]
  );
  const unassignedAssets = useMemo(
    () => nonFaultyAssets.filter((a) => !a.allocatedTo && !a.employeeId),
    [nonFaultyAssets]
  );

  const uniqueEmployeesUsingAssets = useMemo(() => {
    const names = new Set();

    activeAllotments.forEach((a) => {
      const name = a.employee?.fullName || "";
      if (name.trim()) names.add(name.trim().toLowerCase());
    });

    if (!names.size) {
      assets.forEach((a) => {
        const name = a.allocatedTo || "";
        if (name.trim()) names.add(name.trim().toLowerCase());
      });
    }

    return names.size;
  }, [activeAllotments, assets]);

  const utilizationPct = useMemo(() => {
    const base = nonFaultyAssets.length || 0;
    if (!base) return 0;
    return Math.round((assignedAssets.length / base) * 100);
  }, [assignedAssets.length, nonFaultyAssets.length]);

  const faultRatePct = useMemo(() => {
    if (!totalAssets) return 0;
    return Math.round((faultyAssets.length / totalAssets) * 100);
  }, [faultyAssets.length, totalAssets]);

  const assetTypes = useMemo(() => {
    const map = new Map();

    assets.forEach((a) => {
      const key = (a.name || "Other").trim() || "Other";
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [assets]);

  const companyBreakup = useMemo(() => {
    const map = new Map();

    assets.forEach((a) => {
      const key = (a.company || a.brand || "Unknown").trim() || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [assets]);

  const employeeSummary = useMemo(() => {
    const map = new Map();

    activeAllotments.forEach((a) => {
      const key =
        a.employee?._id ||
        a.employee?.fullName ||
        `${a.assetCode}-${a.employee?.fullName || "unknown"}`;

      if (!map.has(key)) {
        map.set(key, {
          employeeName: a.employee?.fullName || "Unknown Employee",
          email: a.employee?.email || "",
          assets: 0,
          lastAllottedAt: a.allottedAt || null,
        });
      }

      const item = map.get(key);
      item.assets += 1;

      if (
        a.allottedAt &&
        (!item.lastAllottedAt ||
          new Date(a.allottedAt).getTime() > new Date(item.lastAllottedAt).getTime())
      ) {
        item.lastAllottedAt = a.allottedAt;
      }
    });

    if (!map.size) {
      assets.forEach((a) => {
        if (!a.allocatedTo) return;
        const key = a.employeeId || a.allocatedTo;
        if (!map.has(key)) {
          map.set(key, {
            employeeName: a.allocatedTo,
            email: "",
            assets: 0,
            lastAllottedAt: a.updatedAt || a.createdAt || null,
          });
        }
        map.get(key).assets += 1;
      });
    }

    return Array.from(map.values()).sort((a, b) => b.assets - a.assets);
  }, [activeAllotments, assets]);

  const recentActivity = useMemo(() => {
    const rows = [];

    allotments.forEach((a) => {
      if (a.allottedAt) {
        rows.push({
          id: `${a._id}-allotted`,
          type: "Allotted",
          when: a.allottedAt,
          employee: a.employee?.fullName || "Unknown Employee",
          assetCode: a.assetCode,
          assetName: a.name,
          color: "primary",
        });
      }

      if (a.returnedAt) {
        rows.push({
          id: `${a._id}-returned`,
          type: "Returned",
          when: a.returnedAt,
          employee: a.employee?.fullName || "Unknown Employee",
          assetCode: a.assetCode,
          assetName: a.name,
          color: "success",
        });
      }
    });

    faultyAssets.forEach((a) => {
      if (a.updatedAt) {
        rows.push({
          id: `${a._id}-faulty`,
          type: "Faulty Marked",
          when: a.updatedAt,
          employee: a.allocatedTo || "Unassigned",
          assetCode: a.assetCode,
          assetName: a.name,
          color: "warning",
        });
      }
    });

    return rows
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 10);
  }, [allotments, faultyAssets]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...assets];

    if (statusFilter === "ASSIGNED") {
      list = list.filter((a) => !a.isFaulty && (a.allocatedTo || a.employeeId));
    } else if (statusFilter === "UNASSIGNED") {
      list = list.filter((a) => !a.isFaulty && !a.allocatedTo && !a.employeeId);
    } else if (statusFilter === "FAULTY") {
      list = list.filter((a) => !!a.isFaulty);
    }

    if (typeFilter) {
      const t = typeFilter.trim().toLowerCase();
      list = list.filter((a) => (a.name || "").trim().toLowerCase() === t);
    }

    if (q) {
      list = list.filter((a) => {
        const hay = [
          a.assetCode,
          a.name,
          a.company,
          a.brand,
          a.model,
          a.allocatedTo,
          a.employeeId,
          a.faultyRemark,
        ]
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      });
    }

    return list.sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [assets, search, statusFilter, typeFilter]);

  const pagedAssets = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredAssets.slice(start, start + rowsPerPage);
  }, [filteredAssets, page, rowsPerPage]);

  const recentReturns = useMemo(() => {
    return [...returnedAllotments]
      .sort(
        (a, b) =>
          new Date(b.returnedAt || 0).getTime() - new Date(a.returnedAt || 0).getTime()
      )
      .slice(0, 6);
  }, [returnedAllotments]);

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Stack spacing={2.5}>
        
        {loading ? (
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 6 }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Loading dashboard...
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Total Assets"
                  value={totalAssets}
                  subtitle="All inventory items"
                  icon={<Inventory2OutlinedIcon />}
                  color="primary"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Assigned Assets"
                  value={assignedAssets.length}
                  subtitle="Non-faulty and assigned"
                  icon={<AssignmentIndOutlinedIcon />}
                  color="success"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Unassigned Assets"
                  value={unassignedAssets.length}
                  subtitle="Ready to allot"
                  icon={<Inventory2OutlinedIcon />}
                  color="info"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Faulty Assets"
                  value={faultyAssets.length}
                  subtitle={`${faultRatePct}% of inventory`}
                  icon={<WarningAmberRoundedIcon />}
                  color="warning"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Active Allotments"
                  value={activeAllotments.length}
                  subtitle="Currently with employees"
                  icon={<PeopleOutlineRoundedIcon />}
                  color="secondary"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Returned Records"
                  value={returnedAllotments.length}
                  subtitle="History entries"
                  icon={<AssignmentReturnOutlinedIcon />}
                  color="success"
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <SectionCard
                  title="Health & Utilization"
                  subtitle="Quick operational status"
                >
                  <Stack spacing={2}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                        <Typography variant="body2">Utilization</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {utilizationPct}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={utilizationPct}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Box>

                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                        <Typography variant="body2">Fault Rate</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {faultRatePct}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={faultRatePct}
                        color="warning"
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Box>

                    <Divider />

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        icon={<PeopleOutlineRoundedIcon />}
                        label={`${uniqueEmployeesUsingAssets} employees using assets`}
                      />
                      <Chip
                        size="small"
                        icon={<PeopleOutlineRoundedIcon />}
                        label={`${employees.length} active employees in directory`}
                      />
                    </Stack>
                  </Stack>
                </SectionCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <SectionCard
                  title="Top Asset Types"
                  subtitle="Current inventory by type"
                >
                  <Stack spacing={1}>
                    {!assetTypes.length ? (
                      <Typography variant="body2" color="text.secondary">
                        No asset data available.
                      </Typography>
                    ) : (
                      assetTypes.slice(0, 8).map((row) => (
                        <Stack
                          key={row.label}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <CategoryOutlinedIcon fontSize="small" color="action" />
                            <Typography variant="body2">{row.label}</Typography>
                          </Stack>
                          <Chip size="small" label={row.count} />
                        </Stack>
                      ))
                    )}
                  </Stack>
                </SectionCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <SectionCard
                  title="Top Companies / Brands"
                  subtitle="Most common makes in inventory"
                >
                  <Stack spacing={1}>
                    {!companyBreakup.length ? (
                      <Typography variant="body2" color="text.secondary">
                        No company data available.
                      </Typography>
                    ) : (
                      companyBreakup.map((row) => (
                        <Stack
                          key={row.label}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <BusinessOutlinedIcon fontSize="small" color="action" />
                            <Typography variant="body2">{row.label}</Typography>
                          </Stack>
                          <Chip size="small" label={row.count} />
                        </Stack>
                      ))
                    )}
                  </Stack>
                </SectionCard>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} lg={7}>
                <SectionCard
                  title="Recent Activity"
                  subtitle="Latest allotments, returns, and faulty updates"
                >
                  <Stack spacing={1}>
                    {!recentActivity.length ? (
                      <Typography variant="body2" color="text.secondary">
                        No recent activity.
                      </Typography>
                    ) : (
                      recentActivity.map((row) => (
                        <Paper
                          key={row.id}
                          variant="outlined"
                          sx={{ borderRadius: 2, p: 1.5 }}
                        >
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                                <Chip
                                  size="small"
                                  color={row.color}
                                  variant="outlined"
                                  label={row.type}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {row.assetCode}
                                </Typography>
                              </Stack>

                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {row.assetName} • {row.employee}
                              </Typography>
                            </Box>

                            <Typography variant="caption" color="text.secondary">
                              {fmtDateTime(row.when)}
                            </Typography>
                          </Stack>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </SectionCard>
              </Grid>

              <Grid item xs={12} lg={5}>
                <SectionCard
                  title="Employee Allocation Summary"
                  subtitle="Who currently holds the most assets"
                >
                  <Stack spacing={1}>
                    {!employeeSummary.length ? (
                      <Typography variant="body2" color="text.secondary">
                        No active employee allocations found.
                      </Typography>
                    ) : (
                      employeeSummary.slice(0, 8).map((row) => (
                        <Paper
                          key={`${row.employeeName}-${row.email}`}
                          variant="outlined"
                          sx={{ borderRadius: 2, p: 1.5 }}
                        >
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            spacing={1}
                            alignItems="center"
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {row.employeeName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block" }}
                              >
                                {row.email || "No email available"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Last allotted: {fmtDate(row.lastAllottedAt)}
                              </Typography>
                            </Box>

                            <Chip
                              size="small"
                              color="primary"
                              label={`${row.assets} asset${row.assets > 1 ? "s" : ""}`}
                            />
                          </Stack>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </SectionCard>
              </Grid>
            </Grid>


            <SectionCard
              title="Recent Returns"
              subtitle="Most recently collected assets"
            >
              {!recentReturns.length ? (
                <Typography variant="body2" color="text.secondary">
                  No returned assets yet.
                </Typography>
              ) : (
                <Grid container spacing={1.5}>
                  {recentReturns.map((row) => (
                    <Grid item xs={12} md={6} lg={4} key={row._id}>
                      <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, height: "100%" }}>
                        <Stack spacing={0.75}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {row.assetCode}
                            </Typography>
                            <Chip size="small" color="success" label="Returned" />
                          </Stack>

                          <Typography variant="body2">
                            {row.name} • {row.company} • {row.model}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            Employee: {row.employee?.fullName || "Unknown"}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            Returned: {fmtDateTime(row.returnedAt)}
                          </Typography>

                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 0.5 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                setJourney({
                                  open: true,
                                  assetCode: row.assetCode,
                                })
                              }
                            >
                              View Journey
                            </Button>

                            <Button
                              size="small"
                              variant="outlined"
                              disabled={!safeArr(row.returnImageUrls).length}
                              onClick={() =>
                                setGallery({
                                  open: true,
                                  images: safeArr(row.returnImageUrls),
                                  title: `${row.assetCode} • Return Images`,
                                })
                              }
                            >
                              Return Images
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </SectionCard>
          </>
        )}
      </Stack>

      <ImageGalleryDialog
        open={gallery.open}
        images={gallery.images}
        title={gallery.title}
        onClose={() => setGallery({ open: false, images: [], title: "" })}
      />

      <JourneyDialog
        open={journey.open}
        assetCode={journey.assetCode}
        onClose={() => setJourney({ open: false, assetCode: "" })}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack.severity} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

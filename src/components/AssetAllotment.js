// src/components/AssetAllotment.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
  Snackbar,
  Alert,
  Grid,
  Autocomplete,
  Avatar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Badge,
  InputAdornment,
  TablePagination,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import ImageIcon from "@mui/icons-material/Image";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonIcon from "@mui/icons-material/Person";
import axios from "axios";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

function LazyImage({
  src,
  alt,
  style,
  onClick,
  placeholder = true,
  eager = false,
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(eager);
  const imgRef = useRef(null);
  const observerRef = useRef(null);


  useEffect(() => {
    if (eager) {
      setInView(true);
      return;
    }

    const container = imgRef.current?.parentElement;
    if (!container) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0.01 }
    );

    observerRef.current.observe(container);
    return () => observerRef.current?.disconnect();
  }, [src, eager]);

  return (
    <Box
      sx={{ width: "100%", height: "100%", cursor: onClick ? "pointer" : "default" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      {inView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            ...style,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.2s ease",
            display: "block",
          }}
        />
      )}
    </Box>
  );
}

const ASSET_OPTIONS = [
  "Laptop",
  "Mouse",
  "Charger",
  "CPU",
  "HeadPhone",
  "Keyboard",
  "Monitor",
  "NeckBand",
  "Phone",
  "Battery",
  "RAM",
  "Hard Disk",
];

const COMPANY_MAP = {
  Laptop: ["Dell", "Acer", "HP", "Lenovo", "Asus", "Apple"],
  Mouse: ["Logitech", "Dell", "HP", "Razer"],
  CPU: ["Intel", "MAC"],
  Keyboard: ["Logitech", "Dell", "HP", "Keychron"],
  HeadPhone: ["Sony", "JBL", "Boat", "Sennheiser"],
  Monitor: ["Dell", "Samsung", "LG", "Acer", "HP"],
  Charger: ["Anker", "Boat", "Apple", "Samsung", "Dell"],
  NeckBand: ["Boat", "OnePlus", "Sony", "JBL"],
  Phone: ["Apple", "Samsung", "OnePlus", "Xiaomi"],
  Battery: ["Duracell", "Energizer", "Amaron", "Exide"],
  RAM: ["Corsair", "Kingston", "Crucial", "G.Skill"],
  "Hard Disk": ["Seagate", "WD", "Toshiba", "Samsung"],
};

const fmtDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
};

const fmtDateInput = (d) => {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const fmtTimeInput = (d) => {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return "";
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export default function AssetAllotment() {
  const [employees, setEmployees] = useState([]);
  const [allotments, setAllotments] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingAllotments, setLoadingAllotments] = useState(true);
  const [collectSubmitting, setCollectSubmitting] = useState(false);
  const [snack, setSnack] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [openForm, setOpenForm] = useState(false);

  const initialForm = {
    employeeId: "",
    assetName: "",
    company: "",
    model: "",
    assetCode: "",
    allotmentImageUrls: [],
  };

  const [form, setForm] = useState(initialForm);

  const [gallery, setGallery] = useState({
    open: false,
    images: [],
    title: "",
  });

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [collectDialog, setCollectDialog] = useState({
    open: false,
    allotment: null,
  });
  const [collectForm, setCollectForm] = useState({
    returnedAt: "",
    returnedTime: "",
    notes: "",
  });
  const [collectFiles, setCollectFiles] = useState([]);
  const [isCollectDragging, setIsCollectDragging] = useState(false);
  const [collectObjectUrls, setCollectObjectUrls] = useState([]);

  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/employees`);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setSnack({ severity: "error", msg: "Failed to load employees" });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchAllotments = async () => {
    setLoadingAllotments(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/asset-allotments`);
      setAllotments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setSnack({ severity: "error", msg: "Failed to load allotments" });
    } finally {
      setLoadingAllotments(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchAllotments();
  }, []);

  const companyOptions = useMemo(() => {
    const base = COMPANY_MAP[form.assetName] || [];
    const v = (form.company || "").trim();
    return v && !base.includes(v) ? [v, ...base] : base;
  }, [form.assetName, form.company]);

  const validate = () => {
    const errs = {};
    if (!form.employeeId) errs.employeeId = "Select employee";
    if (!form.assetName?.trim()) errs.assetName = "Required";
    if (!form.company?.trim()) errs.company = "Required";
    if (!form.model?.trim()) errs.model = "Required";
    if (!form.assetCode?.trim()) errs.assetCode = "Required";
    return errs;
  };

  const [errs, setErrs] = useState({});

  const uploadImagesToWasabi = async (fileList, prefix) => {
    if (!fileList?.length) return [];
    const fd = new FormData();
    for (const f of fileList) fd.append("files", f);
    fd.append("prefix", prefix || "allotments/asset");
    const { data } = await axios.post(`${API_BASE}/api/assets/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.urls || [];
  };

  const onSubmit = async () => {
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      let urls = Array.isArray(form.allotmentImageUrls)
        ? [...form.allotmentImageUrls]
        : [];

      if (files?.length) {
        const uploaded = await uploadImagesToWasabi(
          files,
          `allotments/${(form.assetName || "asset")
            .replace(/\s+/g, "_")
            .toLowerCase()}`
        );
        urls = [...urls, ...uploaded];
      }

      const payload = {
        employeeId: form.employeeId,
        name: form.assetName.trim(),
        company: form.company.trim(),
        model: form.model.trim(),
        assetCode: form.assetCode.trim(),
        allotmentImageUrls: urls,
      };

      await axios.post(`${API_BASE}/api/asset-allotments`, payload);
      setSnack({ severity: "success", msg: "Asset allotted" });

      setForm(initialForm);
      setFiles([]);
      setOpenForm(false);
      fetchAllotments();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Allotment failed";
      setSnack({ severity: "error", msg });
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenForm = () => {
    setErrs({});
    setForm(initialForm);
    setFiles([]);
    setOpenForm(true);
  };

  const onCloseForm = () => {
    if (submitting) return;
    setOpenForm(false);
  };

  const employeeOptions = employees.map((e) => ({
    id: e._id,
    label: `${e.fullName}`,
  }));

  const [objectUrls, setObjectUrls] = useState([]);
  useEffect(() => {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    const urls = (files || []).map((f) => URL.createObjectURL(f));
    setObjectUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const removeFileAt = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const selected = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (selected.length) setFiles((prev) => [...prev, ...selected]);
  };

  // open collect dialog for specific allotment
  const openCollectDialog = (allot) => {
    setCollectDialog({ open: true, allotment: allot });
    setCollectForm({
      returnedAt: fmtDateInput(new Date()),
      returnedTime: fmtTimeInput(new Date()),
      notes: allot?.notes || "",
    });
    setCollectFiles([]);
    setCollectObjectUrls([]);
    setIsCollectDragging(false);
  };

  const closeCollectDialog = () => {
    setCollectDialog({ open: false, allotment: null });
    setCollectFiles([]);
    setCollectObjectUrls([]);
  };

  useEffect(() => {
    collectObjectUrls.forEach((u) => URL.revokeObjectURL(u));
    const urls = (collectFiles || []).map((f) => URL.createObjectURL(f));
    setCollectObjectUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [collectFiles]);

  const removeCollectFileAt = (idx) => {
    setCollectFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const onCollectDragOver = (e) => {
    e.preventDefault();
    setIsCollectDragging(true);
  };
  const onCollectDragLeave = () => setIsCollectDragging(false);
  const onCollectDrop = (e) => {
    e.preventDefault();
    setIsCollectDragging(false);
    const selected = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (selected.length) setCollectFiles((prev) => [...prev, ...selected]);
  };

  const handleCollectSubmit = async () => {
    if (!collectDialog.allotment || collectSubmitting) return;

    const id = collectDialog.allotment._id;

    if (!collectForm.returnedAt) {
      setSnack({ severity: "error", msg: "Please select collection date" });
      return;
    }

    if (!collectFiles.length) {
      setSnack({
        severity: "error",
        msg: "Please upload at least one collection image",
      });
      return;
    }
    if (!collectForm.notes || !collectForm.notes.trim()) {
      setSnack({
        severity: "error",
        msg: "Please enter remarks (damage / OK / notes)",
      });
      return;
    }

    setCollectSubmitting(true);

    try {
      let returnUrls = [];
      if (collectFiles.length) {
        returnUrls = await uploadImagesToWasabi(
          collectFiles,
          `returns/${(collectDialog.allotment.assetCode || "asset")
            .replace(/\s+/g, "_")
            .toLowerCase()}`
        );
      }

      let combinedReturnedAt = collectForm.returnedAt;
      if (collectForm.returnedTime) {
        combinedReturnedAt = `${collectForm.returnedAt}T${collectForm.returnedTime}`;
      }

      const payload = {
        returnedAt: combinedReturnedAt,
        notes: collectForm.notes || "",
        returnImageUrls: returnUrls,
      };

      const { data: updated } = await axios.patch(
        `${API_BASE}/api/asset-allotments/${id}/collect`,
        payload
      );

      try {
        const LS_KEY = "org_hw_assets_v2";
        const assetCode = collectDialog.allotment.assetCode;
        const raw = localStorage.getItem(LS_KEY);

        if (raw && assetCode) {
          const assets = JSON.parse(raw);

          const idx = assets.findIndex(
            (a) => a.assetCode && a.assetCode === assetCode
          );

          if (idx >= 0) {
            assets[idx] = {
              ...assets[idx],
              allocatedTo: "",
              employeeId: "",
              issuedDate: "",
              updatedAt: new Date().toISOString(),
            };
            localStorage.setItem(LS_KEY, JSON.stringify(assets));
          }
        }
      } catch (e) {
        console.error("Failed to update Asset Inventory after collect:", e);
      }

      try {
        const assetCode = collectDialog.allotment.assetCode;
        if (assetCode) {
          const resAssets = await axios.get(`${API_BASE}/api/assets`);
          const assetsList = Array.isArray(resAssets.data)
            ? resAssets.data
            : [];

          const assetDoc = assetsList.find(
            (a) =>
              a.assetCode &&
              a.assetCode.trim().toLowerCase() ===
              assetCode.trim().toLowerCase()
          );

          if (assetDoc && assetDoc._id) {
            const clearPayload = {
              name: assetDoc.name || "",
              company: assetDoc.company || "",
              model: assetDoc.model || "",
              brand: assetDoc.brand || "",
              assetCode: assetDoc.assetCode,
              imageUrls: Array.isArray(assetDoc.imageUrls)
                ? assetDoc.imageUrls
                : [],
              allottedTo: "",
              emp_id: "",
            };

            await axios.put(
              `${API_BASE}/api/assets/${assetDoc._id}`,
              clearPayload
            );
          }
        }
      } catch (e) {
        console.error("Failed to clear asset assignment in DB on collect:", e);
      }
      setAllotments((prev) =>
        prev.map((a) => (a._id === updated._id ? updated : a))
      );
      setSnack({ severity: "success", msg: "Asset collected" });
      closeCollectDialog();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Failed to collect asset";
      setSnack({ severity: "error", msg });
    } finally {
      setCollectSubmitting(false);
    }
  };

  const activeAllotments = allotments.filter((a) => a.status !== "returned");

  const activeEmployees = useMemo(() => {
    const active = employees.filter(
      (e) => e.isActive || e.active || e.status === "Active"
    );
    return active.length ? active : employees;
  }, [employees]);

  const filteredActiveAllotments = useMemo(() => {
    let list = activeAllotments;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const empName = (a.employee?.fullName || "").toLowerCase();
        const assetName = (a.name || "").toLowerCase();
        const company = (a.company || "").toLowerCase();
        const model = (a.model || "").toLowerCase();
        const code = (a.assetCode || "").toLowerCase();

        const hay = [empName, assetName, company, model, code].join(" ");
        return hay.includes(q);
      });
    }

    if (employeeFilter) {
      const fId = employeeFilter._id;
      const fName = (employeeFilter.fullName || "").trim().toLowerCase();

      list = list.filter((a) => {
        const emp = a.employee || {};
        const empId = emp._id;
        const empName = (emp.fullName || "").trim().toLowerCase();

        if (fId && empId) return empId === fId;
        if (fName && empName) return empName === fName;
        return false;
      });
    }

    return list;
  }, [activeAllotments, search, employeeFilter]);

  const pagedAllotments = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredActiveAllotments.slice(start, start + rowsPerPage);
  }, [filteredActiveAllotments, page, rowsPerPage]);

  const mainOldImage =
    collectDialog.allotment &&
      Array.isArray(collectDialog.allotment.allotmentImageUrls) &&
      collectDialog.allotment.allotmentImageUrls.length
      ? collectDialog.allotment.allotmentImageUrls[0]
      : null;

  const mainNewImage = collectObjectUrls.length ? collectObjectUrls[0] : null;

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="h6">Asset Allotment</Typography>
              <Chip label={`${activeAllotments.length} allotted`} size="small" />
            </Stack>
          }
          action={
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Autocomplete
                size="small"
                options={activeEmployees}
                getOptionLabel={(option) => option?.fullName || ""}
                isOptionEqualToValue={(opt, val) =>
                  !!val && opt._id === val._id
                }
                value={employeeFilter}
                onChange={(_, newValue) => {
                  setEmployeeFilter(newValue);
                  setPage(0);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Filter by Employee"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PersonIcon />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                disabled={loadingEmployees}
                sx={{ minWidth: 220 }}
              />

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onOpenForm}
                disabled={loadingEmployees}
              >
                Add Allotment
              </Button>
            </Stack>
          }
        />

        <CardContent sx={{ pt: 1 }}>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Recent Allotments
          </Typography>
          <Divider sx={{ mb: 1.5 }} />

          {loadingAllotments ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress />
            </Stack>
          ) : (
            <>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Company</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Asset Code</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>
                        Images
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Allotted</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Collect</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {activeAllotments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            No allotments yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : !pagedAllotments.length ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            No allotments match your filters.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedAllotments.map((a) => {
                        const imgs = Array.isArray(a.allotmentImageUrls)
                          ? a.allotmentImageUrls
                          : [];
                        const firstImgs = imgs.slice(0, 4);
                        const moreCount =
                          imgs.length > 4 ? imgs.length - 4 : 0;

                        const isReturned = a.status === "returned";

                        return (
                          <TableRow key={a._id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>
                                {a.employee?.fullName || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell>{a.name}</TableCell>
                            <TableCell>{a.company}</TableCell>
                            <TableCell>{a.model}</TableCell>
                            <TableCell>
                              <code>{a.assetCode}</code>
                            </TableCell>

                            <TableCell>
                              {imgs.length ? (
                                <Stack spacing={0.5}>
                                  <Stack
                                    direction="row"
                                    gap={0.5}
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{ alignItems: "center" }}
                                  >
                                    {firstImgs.map((url, i) => (
                                      <Tooltip key={i} title="Click to open in new tab">
                                        <Avatar
                                          variant="rounded"
                                          sx={{
                                            width: 28,
                                            height: 28,
                                            cursor: "zoom-in",
                                            borderRadius: 1,
                                            bgcolor: "action.hover",
                                          }}
                                        >
                                          <LazyImage
                                            src={url}
                                            alt={`img-${i}`}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            placeholder={false}
                                            onClick={() => {
                                              window.open(url, "_blank", "noopener,noreferrer");
                                            }}
                                          />
                                        </Avatar>
                                      </Tooltip>
                                    ))}
                                    {moreCount > 0 && (
                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label={`+${moreCount} more`}
                                        onClick={() =>
                                          setGallery({
                                            open: true,
                                            images: imgs,
                                            title: a.assetCode
                                              ? `Images • ${a.assetCode}`
                                              : "Images",
                                          })
                                        }
                                        sx={{ cursor: "pointer" }}
                                      />
                                    )}

                                    {moreCount > 0 && (
                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label={`+${moreCount} more`}
                                      />
                                    )}
                                  </Stack>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${imgs.length} image${imgs.length > 1 ? "s" : ""
                                      }`}
                                    sx={{ alignSelf: "flex-start" }}
                                  />
                                </Stack>
                              ) : (
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  alignItems="center"
                                  sx={{ color: "text.disabled" }}
                                >
                                  <ImageIcon fontSize="small" />
                                  <Typography variant="caption">
                                    No images
                                  </Typography>
                                </Stack>
                              )}
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2">
                                Allotted: {fmtDateTime(a.allottedAt)}
                              </Typography>
                              {isReturned && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Collected: {fmtDateTime(a.returnedAt)}
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              <Button
                                variant={isReturned ? "outlined" : "contained"}
                                size="small"
                                color={isReturned ? "success" : "primary"}
                                disabled={isReturned}
                                onClick={() => openCollectDialog(a)}
                              >
                                {isReturned ? "Collected" : "Collect"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider />

              <TablePagination
                component="div"
                count={filteredActiveAllotments.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={openForm}
        onClose={onCloseForm}
        fullWidth
        maxWidth="md"
        keepMounted={false}
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden" },
        }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Stack spacing={0.25}>
            <Typography variant="h6">Add Asset Allotment</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Fill details and attach allotment images
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2 }}>
          {/* Employee & asset details */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                size="small"
                options={employeeOptions}
                value={
                  employeeOptions.find((e) => e.id === form.employeeId) || null
                }
                onChange={(_, val) =>
                  setForm((f) => ({ ...f, employeeId: val?.id || "" }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Employee"
                    error={!!errs.employeeId}
                    helperText={errs.employeeId}
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                size="small"
                freeSolo
                options={ASSET_OPTIONS}
                value={form.assetName}
                onChange={(_, val) =>
                  setForm((f) => ({ ...f, assetName: val || "" }))
                }
                onInputChange={(_, val) =>
                  setForm((f) => ({ ...f, assetName: val }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Asset"
                    error={!!errs.assetName}
                    helperText={errs.assetName}
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Autocomplete
                size="small"
                freeSolo
                options={companyOptions}
                value={form.company}
                onChange={(_, val) =>
                  setForm((f) => ({ ...f, company: val || "" }))
                }
                onInputChange={(_, val) =>
                  setForm((f) => ({ ...f, company: val }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Company"
                    error={!!errs.company}
                    helperText={errs.company}
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Model"
                size="small"
                value={form.model}
                onChange={(e) =>
                  setForm((f) => ({ ...f, model: e.target.value }))
                }
                error={!!errs.model}
                helperText={errs.model}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Asset Code"
                size="small"
                value={form.assetCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, assetCode: e.target.value }))
                }
                error={!!errs.assetCode}
                helperText={errs.assetCode}
                fullWidth
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Allotment Photos
          </Typography>

          <Box
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            sx={{
              mt: 0.5,
              p: 2,
              border: "2px dashed",
              borderColor: isDragging ? "primary.main" : "divider",
              borderRadius: 2,
              bgcolor: isDragging ? "action.hover" : "background.paper",
              transition: "all .15s ease",
              textAlign: "center",
            }}
          >
            <Stack spacing={1} alignItems="center" justifyContent="center">
              <UploadIcon />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Drag & drop allotment images here or
              </Typography>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
              >
                Choose Images
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  multiple
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    setFiles((prev) => [...prev, ...selected]);
                  }}
                />
              </Button>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Add images taken at allotment time
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
            {objectUrls.map((url, idx) => (
              <Badge
                key={`allot-${idx}`}
                overlap="circular"
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                badgeContent={
                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      onClick={() => removeFileAt(idx)}
                      sx={{
                        bgcolor: "background.paper",
                        boxShadow: 1,
                        "&:hover": { bgcolor: "grey.100" },
                      }}
                    >
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <Avatar
                  src={url}
                  variant="rounded"
                  sx={{ width: 64, height: 64, borderRadius: 2 }}
                />
              </Badge>
            ))}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCloseForm} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onSubmit}
            disabled={submitting || loadingEmployees}
          >
            {submitting ? "Saving…" : "Allot Asset"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={collectDialog.open}
        onClose={closeCollectDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Stack spacing={0.5}>
            <Typography variant="h6">
              Collect Asset
              {collectDialog.allotment?.assetCode
                ? ` • ${collectDialog.allotment.assetCode}`
                : ""}
            </Typography>
            {collectDialog.allotment && (
              <Typography variant="body2" color="text.secondary">
                Allotted on:{" "}
                {fmtDateTime(collectDialog.allotment.allottedAt)}
              </Typography>
            )}
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2 }}>
          {collectDialog.allotment && (
            <>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Asset Details
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Asset"
                    size="small"
                    value={collectDialog.allotment.name || ""}
                    InputProps={{ readOnly: true }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Company"
                    size="small"
                    value={collectDialog.allotment.company || ""}
                    InputProps={{ readOnly: true }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Model"
                    size="small"
                    value={collectDialog.allotment.model || ""}
                    InputProps={{ readOnly: true }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Asset Code"
                    size="small"
                    value={collectDialog.allotment.assetCode || ""}
                    InputProps={{ readOnly: true }}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Collection Date"
                type="date"
                value={collectForm.returnedAt}
                onChange={(e) =>
                  setCollectForm((f) => ({
                    ...f,
                    returnedAt: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Collection Time"
                type="time"
                value={collectForm.returnedTime}
                onChange={(e) =>
                  setCollectForm((f) => ({
                    ...f,
                    returnedTime: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Remarks (damage / OK / notes)"
                multiline
                minRows={2}
                value={collectForm.notes}
                onChange={(e) =>
                  setCollectForm((f) => ({ ...f, notes: e.target.value }))
                }
                fullWidth
                required
              />
            </Grid>
          </Grid>

          {(mainOldImage || mainNewImage) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant="overline"
                sx={{ color: "text.secondary" }}
              >
                Compare (Old vs New)
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      minHeight: 220,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "background.default",
                    }}
                  >
                    {mainOldImage ? (
                      <Box
                        component="a"
                        href={mainOldImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: "inline-block" }}
                      >
                        <img
                          src={mainOldImage}
                          alt="old-asset"
                          style={{
                            maxWidth: "100%",
                            maxHeight: 260,
                            objectFit: "contain",
                            display: "block",
                            cursor: "zoom-in",
                          }}
                        />
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        No old image available
                      </Typography>
                    )}
                  </Paper>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: "block", textAlign: "center" }}
                  >
                    OLD (at allotment time) – click image to open in new tab
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      minHeight: 220,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "background.default",
                    }}
                  >
                    {mainNewImage ? (
                      <Box
                        component="a"
                        href={mainNewImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: "inline-block" }}
                      >
                        <img
                          src={mainNewImage}
                          alt="new-asset"
                          style={{
                            maxWidth: "100%",
                            maxHeight: 260,
                            objectFit: "contain",
                            display: "block",
                            cursor: "zoom-in",
                          }}
                        />
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        No new image selected yet
                      </Typography>
                    )}
                  </Paper>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: "block", textAlign: "center" }}
                  >
                    NEW (at collection time) – click image to open in new tab
                  </Typography>
                </Grid>
              </Grid>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Old Photos (all allotment images)
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1, mb: 2 }}>
            {collectDialog.allotment &&
              Array.isArray(collectDialog.allotment.allotmentImageUrls) &&
              collectDialog.allotment.allotmentImageUrls.length ? (
              collectDialog.allotment.allotmentImageUrls.map((url, idx) => (
                <Avatar
                  key={idx}
                  variant="rounded"
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "action.hover",
                  }}
                >
                  <LazyImage
                    src={url}
                    alt={`old-${idx}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    placeholder={false}
                  />
                </Avatar>
              ))
            ) : (
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ color: "text.disabled" }}
              >
                <ImageIcon fontSize="small" />
                <Typography variant="caption">
                  No old images stored
                </Typography>
              </Stack>
            )}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            New Photos (at collection time)
          </Typography>

          <Box
            onDragOver={onCollectDragOver}
            onDragLeave={onCollectDragLeave}
            onDrop={onCollectDrop}
            sx={{
              mt: 0.5,
              p: 2,
              border: "2px dashed",
              borderColor: isCollectDragging ? "primary.main" : "divider",
              borderRadius: 2,
              bgcolor: isCollectDragging ? "action.hover" : "background.paper",
              transition: "all .15s ease",
              textAlign: "center",
            }}
          >
            <Stack spacing={1} alignItems="center" justifyContent="center">
              <UploadIcon />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Drag & drop collection images here or
              </Typography>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
              >
                Choose Images
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  multiple
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    setCollectFiles((prev) => [...prev, ...selected]);
                  }}
                />
              </Button>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Add damage / condition photos
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
            {collectObjectUrls.map((url, idx) => (
              <Badge
                key={`collect-${idx}`}
                overlap="circular"
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                badgeContent={
                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      onClick={() => removeCollectFileAt(idx)}
                      sx={{
                        bgcolor: "background.paper",
                        boxShadow: 1,
                        "&:hover": { bgcolor: "grey.100" },
                      }}
                    >
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <Avatar
                  src={url}
                  variant="rounded"
                  sx={{ width: 64, height: 64, borderRadius: 2 }}
                />
              </Badge>
            ))}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeCollectDialog} disabled={collectSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCollectSubmit}
            disabled={collectSubmitting}
          >
            {collectSubmitting ? "Saving…" : "Mark as Collected"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={gallery.open}
        onClose={() => setGallery((g) => ({ ...g, open: false }))}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {gallery.title || "Images"}
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          {gallery.images && gallery.images.length ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 1.5,
              }}
            >
              {gallery.images.map((src, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{
                    p: 0.5,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <LazyImage
                    src={src}
                    alt={`asset-img-${idx}`}
                    eager={true}
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                      display: "block",
                      cursor: "zoom-in",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(src, "_blank", "noopener,noreferrer");
                    }}
                  />

                </Paper>
              ))}
            </Box>
          ) : (
            <Stack
              alignItems="center"
              spacing={1}
              sx={{ color: "text.secondary", py: 6 }}
            >
              <ImageIcon fontSize="large" />
              <Typography variant="body2">No images to show.</Typography>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 1.5 }}>
          <Button
            onClick={() => setGallery((g) => ({ ...g, open: false }))}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snack ? (
          <Alert
            onClose={() => setSnack(null)}
            severity={snack.severity}
            variant="filled"
          >
            {snack.msg}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
}

// src/components/AssetAllotment.jsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

const API_BASE = 
  process.env.REACT_APP_API_BASE ||
  "https://muditamleads-14f32a10d7f7.herokuapp.com";

// Asset types
const ASSET_OPTIONS = [
  "Laptop",
  "Mouse",
  "Charger",
  "HeadPhone",
  "Keyboard",
  "Monitor", 
  "NeckBand",
  "Phone",
  "Battery",
  "RAM",
  "Hard Disk",
];

// Company options mapped by asset name (type-ahead still allowed)
const COMPANY_MAP = {
  Laptop: ["Dell", "Acer", "HP", "Lenovo", "Asus", "Apple"],
  Mouse: ["Logitech", "Dell", "HP", "Razer"],
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

export default function AssetAllotment() {
  const [employees, setEmployees] = useState([]);
  const [allotments, setAllotments] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingAllotments, setLoadingAllotments] = useState(true);

  const [snack, setSnack] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Dialog open/close
  const [openForm, setOpenForm] = useState(false);

  const initialForm = {
    employeeId: "",
    assetName: "",
    company: "",
    model: "",
    assetCode: "",
    allotmentImageUrls: [], // <-- only array now
  };

  const [form, setForm] = useState(initialForm);

  // hold multiple File objects
  const [files, setFiles] = useState([]); // Array<File>
  const [isDragging, setIsDragging] = useState(false);

  // Load employees
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

  // Load allotments
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

  // Company options depend on assetName, but allow free typing
  const companyOptions = useMemo(() => {
    const base = COMPANY_MAP[form.assetName] || [];
    const v = (form.company || "").trim();
    return v && !base.includes(v) ? [v, ...base] : base;
  }, [form.assetName, form.company]);

  // Validation
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

  // Upload multiple images to Wasabi via backend
  const uploadAllotmentImages = async () => {
    if (!files?.length) return [];
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    fd.append(
      "prefix",
      `allotments/${(form.assetName || "asset").replace(/\s+/g, "_").toLowerCase()}`
    );
    const { data } = await axios.post(`${API_BASE}/api/assets/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const urls = data?.urls || [];
    return urls;
  };

  const onSubmit = async () => {
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      // existing URLs from form + new uploads
      let urls = Array.isArray(form.allotmentImageUrls)
        ? [...form.allotmentImageUrls]
        : [];

      if (files?.length) {
        const uploaded = await uploadAllotmentImages();
        urls = [...urls, ...uploaded];
      }

      const payload = {
        employeeId: form.employeeId,
        name: form.assetName.trim(),
        company: form.company.trim(),
        model: form.model.trim(),
        assetCode: form.assetCode.trim(),
        allotmentImageUrls: urls, // <-- send only the array
      };

      await axios.post(`${API_BASE}/api/asset-allotments`, payload);
      setSnack({ severity: "success", msg: "Asset allotted" });

      // reset form and close dialog
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

  // Helpers for previews (Object URLs)
  const [objectUrls, setObjectUrls] = useState([]);
  useEffect(() => {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    const urls = (files || []).map((f) => URL.createObjectURL(f));
    setObjectUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const removeFileAt = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Drag & drop handlers for the dropzone
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

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="h6">Asset Allotment</Typography>
              <Chip label={`${allotments.length} allotted`} size="small" />
            </Stack>
          }
          action={
            <Stack direction="row" gap={1}>
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
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Asset Code</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Images</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Allotted At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allotments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          No allotments yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allotments.map((a) => {
                      const imgs = Array.isArray(a.allotmentImageUrls) ? a.allotmentImageUrls : [];
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

                          {/* Images (all) */}
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
                                  {imgs.map((url, i) => (
                                    <Tooltip key={i} title={`Image ${i + 1}`}>
                                      <a href={url} target="_blank" rel="noreferrer">
                                        <Avatar
                                          src={url}
                                          alt={`img-${i}`}
                                          sx={{ width: 28, height: 28 }}
                                          variant="rounded"
                                        />
                                      </a>
                                    </Tooltip>
                                  ))}
                                </Stack>
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`${imgs.length} image${imgs.length > 1 ? "s" : ""}`}
                                  sx={{ alignSelf: "flex-start" }}
                                />
                              </Stack>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell>
                            {a.allottedAt ? new Date(a.allottedAt).toLocaleString() : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* —————————— Dialog —————————— */}
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
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Details
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 1 }}>
            {/* Row 1 */}
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={employeeOptions}
                value={employeeOptions.find((o) => o.id === form.employeeId) || null}
                onChange={(_, val) =>
                  setForm((f) => ({ ...f, employeeId: val?.id || "" }))
                }
                loading={loadingEmployees}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Employee"
                    size="small"
                    error={!!errs.employeeId}
                    helperText={errs.employeeId}
                    placeholder="Search employee"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Autocomplete
                freeSolo
                options={ASSET_OPTIONS}
                value={form.assetName || ""}
                onChange={(_, v) => setForm((f) => ({ ...f, assetName: v || "" }))}
                onInputChange={(_, v) => setForm((f) => ({ ...f, assetName: v || "" }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Asset Name"
                    size="small"
                    error={!!errs.assetName}
                    helperText={errs.assetName}
                    placeholder="e.g., Laptop"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Autocomplete
                freeSolo
                options={companyOptions}
                value={form.company || ""}
                onChange={(_, v) => setForm((f) => ({ ...f, company: v || "" }))}
                onInputChange={(_, v) => setForm((f) => ({ ...f, company: v || "" }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Company"
                    size="small"
                    error={!!errs.company}
                    helperText={errs.company}
                    placeholder="e.g., Dell"
                  />
                )}
              />
            </Grid>

            {/* Row 2 */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Model"
                size="small"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                error={!!errs.model}
                helperText={errs.model}
                placeholder="e.g., ThinkPad T14 Gen 3"
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Asset Code"
                size="small"
                value={form.assetCode}
                onChange={(e) => setForm((f) => ({ ...f, assetCode: e.target.value }))}
                error={!!errs.assetCode}
                helperText={errs.assetCode}
                placeholder="e.g., LP-0001"
                inputProps={{ style: { fontFamily: "monospace", letterSpacing: 0.5 } }}
                fullWidth
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Allotment Images
          </Typography>

          {/* Dropzone */}
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
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
                Drag & drop images here or
              </Typography>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                disabled={submitting}
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
                Up to 10 images · PNG/JPG/WebP
              </Typography>
            </Stack>
          </Box>

          {/* Previews */}
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
            {/* Existing URLs */}
            {Array.isArray(form.allotmentImageUrls) &&
              form.allotmentImageUrls.map((url, i) => (
                <Badge
                  key={`existing-${i}`}
                  overlap="circular"
                  anchorOrigin={{ vertical: "top", horizontal: "right" }}
                  badgeContent={
                    <Tooltip title="Remove from list">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            allotmentImageUrls: f.allotmentImageUrls.filter((_, idx) => idx !== i),
                          }))
                        }
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

            {/* New local files */}
            {objectUrls.map((url, idx) => (
              <Badge
                key={`file-${idx}`}
                overlap="circular"
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
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

          {(files.length > 0 || form.allotmentImageUrls.length > 0) && (
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
              <Chip
                size="small"
                label={`Selected: ${files.length + (form.allotmentImageUrls?.length || 0)}`}
              />
              {!!files.length && (
                <Button
                  size="small"
                  onClick={() => setFiles([])}
                  sx={{ textTransform: "none" }}
                >
                  Clear new files
                </Button>
              )}
            </Stack>
          )}
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

      <Snackbar
        open={!!snack}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snack ? (
          <Alert onClose={() => setSnack(null)} severity={snack.severity} variant="filled">
            {snack.msg}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
}

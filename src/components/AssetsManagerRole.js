// src/components/AssetsManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  TableSortLabel,
  TablePagination,
  Chip,
  Divider,
  CircularProgress,
  Autocomplete,
  Avatar,
  Card,
  CardContent,
  CardHeader, 
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import axios from "axios";
 
const API_BASE = 
  process.env.REACT_APP_API_BASE ||
  "https://muditamleads-14f32a10d7f7.herokuapp.com";
 
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

// ---------- Columns ----------
const columns = [
  { id: "name", label: "Asset Name" },
  { id: "company", label: "Company" },
  { id: "model", label: "Model" },
  { id: "assetCode", label: "Asset Code" },
  { id: "images", label: "Images" },
  { id: "updatedAt", label: "Updated" },
];

export default function AssetsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    company: "",
    model: "",
    assetCode: "",
    imageUrls: [], // existing persisted images
  });

  // Files selected in this session (not yet uploaded)
  const [newFiles, setNewFiles] = useState([]); // File[]
  const [uploading, setUploading] = useState(false);

  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [snack, setSnack] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRpp] = useState(10);

  // ===== Load from backend =====
  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/assets`);
      setItems(data || []);
    } catch (e) {
      console.error(e);
      setSnack({ severity: "error", msg: "Failed to load assets" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // ===== Sort =====
  const filtered = useMemo(() => {
    const base = items.slice();
    base.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      let av = a[sortBy];
      let bv = b[sortBy];

      if (["name", "company", "model", "assetCode"].includes(sortBy)) {
        av = (av || "").toString().toLowerCase();
        bv = (bv || "").toString().toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }

      if (["updatedAt", "createdAt"].includes(sortBy)) {
        return ((new Date(av).getTime() || 0) - (new Date(bv).getTime() || 0)) * dir;
      }

      return 0;
    });
    return base;
  }, [items, sortBy, sortDir]);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  // ===== Form open/close =====
  const handleOpenAdd = () => {
    setEditId(null);
    setForm({ name: "", company: "", model: "", assetCode: "", imageUrls: [] });
    setNewFiles([]);
    setOpenForm(true);
  };

  const handleOpenEdit = (row) => {
    setEditId(row._id);
    setForm({
      name: row.name || "",
      company: row.company || "",
      model: row.model || "",
      assetCode: row.assetCode || "",
      imageUrls: Array.isArray(row.imageUrls) ? row.imageUrls : [],
    });
    setNewFiles([]);
    setOpenForm(true);
  };

  // ===== Validate =====
  function validate(f) {
    const errs = {};
    if (!f.name?.trim()) errs.name = "Required";
    if (!f.company?.trim()) errs.company = "Required";
    if (!f.model?.trim()) errs.model = "Required";
    if (!f.assetCode?.trim()) errs.assetCode = "Required";
    return errs;
  }
  const [errs, setErrs] = useState({});
  useEffect(() => {
    if (!openForm) setErrs({});
  }, [openForm]);

  // ===== Upload images to Wasabi (via backend, multiple) =====
  const uploadNewImagesIfAny = async () => {
    if (!newFiles.length) return [];
    try {
      setUploading(true);
      const fd = new FormData();
      newFiles.forEach((f) => fd.append("files", f));
      fd.append("prefix", (form.name || "asset").replace(/\s+/g, "_").toLowerCase());

      const { data } = await axios.post(`${API_BASE}/api/assets/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploading(false);
      const urls = Array.isArray(data?.urls) ? data.urls : [];
      return urls;
    } catch (err) {
      setUploading(false);
      console.error(err);
      throw new Error(err?.response?.data?.message || "Image upload failed");
    }
  };

  // ===== Save (create/update via API) =====
  const handleSave = async () => {
    const e = validate(form);
    setErrs(e);
    if (Object.keys(e).length) return;

    try {
      const uploaded = await uploadNewImagesIfAny(); // may be []
      const payload = {
        name: form.name.trim(),
        company: form.company.trim(),
        model: form.model.trim(),
        assetCode: form.assetCode.trim(),
        imageUrls: [...form.imageUrls, ...uploaded],
      };

      if (editId) {
        await axios.put(`${API_BASE}/api/assets/${editId}`, payload);
        setSnack({ severity: "success", msg: "Asset updated" });
      } else {
        await axios.post(`${API_BASE}/api/assets`, payload);
        setSnack({ severity: "success", msg: "Asset added" });
      }
      setOpenForm(false);
      fetchItems();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        (editId ? "Failed to update asset" : "Failed to add asset");
      setSnack({ severity: "error", msg });
    }
  };

  // ===== Delete via API =====
  const handleDelete = async (row) => {
    try {
      await axios.delete(`${API_BASE}/api/assets/${row._id}`);
      setSnack({ severity: "success", msg: `Deleted "${row.name}"` });
      fetchItems();
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", msg: "Delete failed" });
    }
  };

  // ===== Sort handler =====
  const handleSort = (colId) => {
    if (sortBy === colId) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(colId);
      setSortDir(colId === "name" ? "asc" : "desc");
    }
  };

  // ===== Date format =====
  const fmt = (ts) =>
    ts
      ? new Date(ts).toLocaleString(undefined, {
          year: "2-digit",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  // Company options based on selected asset
  const companyOptions = useMemo(() => {
    const base = COMPANY_MAP[form.name] || [];
    const v = form.company?.trim();
    return v && !base.includes(v) ? [v, ...base] : base;
  }, [form.name, form.company]);

  // ====== UI helpers
  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeNewFileAt = (idx) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImageAt = (idx) => {
    setForm((f) => ({
      ...f,
      imageUrls: f.imageUrls.filter((_, i) => i !== idx),
    }));
  };

  const ImagesCell = ({ urls }) => {
    if (!Array.isArray(urls) || urls.length === 0) return <>-</>;
    const first = urls[0];
    const extra = urls.length - 1;
    return (
      <Stack direction="row" gap={1} alignItems="center">
        <Avatar
          src={first}
          alt="img"
          sx={{ width: 28, height: 28 }}
          variant="rounded"
        />
        <Stack direction="row" gap={1} alignItems="center">
          <a href={first} target="_blank" rel="noreferrer">
            View
          </a>
          {extra > 0 && <Chip size="small" label={`+${extra}`} />}
        </Stack>
      </Stack>
    );
  };

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" gap={1}>
              <ImageIcon />
              <Typography variant="h6">Asset Manager</Typography>
              <Chip label={`${items.length} items`} size="small" color="primary" variant="outlined" />
            </Stack>
          }
          action={
            <Tooltip title="Add Asset">
              <span>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  onClick={handleOpenAdd}
                  disabled={loading}
                >
                  Add
                </Button>
              </span>
            </Tooltip>
          }
        />
        <CardContent>
          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Stack alignItems="center" py={6} gap={1}>
              <CircularProgress />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Loading assets…
              </Typography>
            </Stack>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {columns.map((col) => (
                        <TableCell
                          key={col.id}
                          align={col.numeric ? "right" : "left"}
                          sx={{ fontWeight: 600, background: "rgba(0,0,0,0.02)" }}
                        >
                          <TableSortLabel
                            active={sortBy === col.id}
                            direction={sortBy === col.id ? sortDir : "asc"}
                            onClick={() => handleSort(col.id)}
                          >
                            {col.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 600, background: "rgba(0,0,0,0.02)" }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {paged.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={columns.length + 1} align="center">
                          <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            No assets found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}

                    {paged.map((row, idx) => (
                      <TableRow
                        key={row._id}
                        hover
                        sx={{
                          "&:nth-of-type(odd)": { background: "rgba(0,0,0,0.015)" },
                        }}
                      >
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.company}</TableCell>
                        <TableCell>{row.model}</TableCell>
                        <TableCell>
                          <code>{row.assetCode}</code>
                        </TableCell>
                        <TableCell>
                          <ImagesCell urls={row.imageUrls} />
                        </TableCell>
                        <TableCell>{fmt(row.updatedAt)}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton onClick={() => handleOpenEdit(row)} size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              onClick={() => handleDelete(row)}
                              color="error"
                              size="small"
                              aria-label={`Delete ${row.name}`}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRpp(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="md">
        <DialogTitle>{editId ? "Edit Asset" : "Add Asset"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={ASSET_OPTIONS}
                value={form.name || ""}
                onChange={(_, newValue) => {
                  setForm((f) => ({ ...f, name: newValue || "" }));
                }}
                onInputChange={(_, newInput) => {
                  setForm((f) => ({ ...f, name: newInput || "" }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Asset Name"
                    error={!!errs.name}
                    helperText={errs.name}
                    placeholder="Start typing or pick from list"
                    autoFocus
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={companyOptions}
                value={form.company || ""}
                onChange={(_, newValue) => {
                  setForm((f) => ({ ...f, company: newValue || "" }));
                }}
                onInputChange={(_, newInput) => {
                  setForm((f) => ({ ...f, company: newInput || "" }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Company"
                    error={!!errs.company}
                    helperText={errs.company}
                    placeholder="Select or type company"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Model"
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
                value={form.assetCode}
                onChange={(e) => setForm((f) => ({ ...f, assetCode: e.target.value }))}
                error={!!errs.assetCode}
                helperText={errs.assetCode}
                placeholder="e.g., LP-0001"
                inputProps={{ style: { fontFamily: "monospace" } }}
                fullWidth
              />
            </Grid>

            {/* Existing images (removable) */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Existing Images
              </Typography>
              {form.imageUrls?.length ? (
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {form.imageUrls.map((url, i) => (
                    <Stack
                      key={url + i}
                      direction="row"
                      alignItems="center"
                      gap={1}
                      sx={{
                        border: "1px solid rgba(0,0,0,0.12)",
                        borderRadius: 2,
                        p: 0.5,
                        pr: 1,
                      }}
                    >
                      <Avatar src={url} variant="rounded" sx={{ width: 48, height: 48 }} />
                      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                        View
                      </a>
                      <IconButton size="small" onClick={() => removeExistingImageAt(i)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ opacity: 0.6 }}>
                  None
                </Typography>
              )}
            </Grid>

            {/* New images (selected now) */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Add Images (multiple)
              </Typography>
              <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  disabled={uploading}
                >
                  Choose Images
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    multiple
                    onChange={onPickFiles}
                  />
                </Button>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  JPG/PNG recommended. You can add multiple files.
                </Typography>
              </Stack>

              {newFiles.length > 0 && (
                <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                  {newFiles.map((file, i) => {
                    const preview = URL.createObjectURL(file);
                    return (
                      <Stack
                        key={i}
                        direction="row"
                        alignItems="center"
                        gap={1}
                        sx={{
                          border: "1px solid rgba(0,0,0,0.12)",
                          borderRadius: 2,
                          p: 0.5,
                          pr: 1,
                        }}
                      >
                        <Avatar src={preview} variant="rounded" sx={{ width: 48, height: 48 }} />
                        <Typography variant="caption" sx={{ maxWidth: 180 }} noWrap title={file.name}>
                          {file.name}
                        </Typography>
                        <IconButton size="small" onClick={() => removeNewFileAt(i)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={uploading}>
            {uploading ? "Uploading…" : editId ? "Save Changes" : "Add Asset"}
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

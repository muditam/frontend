import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Stack, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
  Button, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Tooltip, Snackbar, Alert, Avatar, Badge, Divider
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";

const TYPES = ["Laptop","Mouse","Charger","HeadPhone","Keyboard","Monitor","NeckBand"];
const CONDITIONS = ["New","Used","Very Old"];

const LS_KEY = "org_hw_assets_v1";

function loadLS(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch { return fallback; }
}
function saveLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

/* ------------------------ Gallery Dialog ------------------------ */
function ImageGalleryDialog({ open, onClose, images = [], title = "Images" }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {images.length ? (
          <Box sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 1.5
          }}>
            {images.map((src, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 0.5, borderRadius: 2, overflow: "hidden" }}>
                <img
                  src={src}
                  alt={`asset-img-${idx}`}
                  style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                />
              </Paper>
            ))}
          </Box>
        ) : (
          <Stack alignItems="center" spacing={1} sx={{ color: "text.secondary", py: 6 }}>
            <ImageIcon fontSize="large" />
            <Typography variant="body2">No images attached.</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ------------------------ Add/Edit Dialog ------------------------ */
function AddEditDialog({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState(() => initial || {
    assetCode: "",
    type: "Laptop",
    brand: "",
    model: "",
    condition: "New",
    issuedDate: "",
    assignedTo: "",
    notes: "",
    images: [],
  });

  useEffect(() => {
    setForm(initial || {
      assetCode: "",
      type: "Laptop",
      brand: "",
      model: "",
      condition: "New",
      issuedDate: "",
      assignedTo: "",
      notes: "",
      images: [],
    });
  }, [initial, open]);

  const onPickImages = async (files) => {
    const arr = Array.from(files || []);
    const readers = arr.map(f => new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(f);
    }));
    const dataUrls = await Promise.all(readers);
    setForm(prev => ({ ...prev, images: [...(prev.images || []), ...dataUrls] }));
  };

  const removeImage = (idx) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const save = () => {
    if (!form.assetCode.trim()) return alert("Asset Code is required");
    if (!form.type) return alert("Type is required");
    if (!form.condition) return alert("Condition is required");

    const assets = loadLS(LS_KEY, []);
    if (initial?._id) {
      const idx = assets.findIndex(a => a._id === initial._id);
      if (idx >= 0) {
        const dup = assets.some(a =>
          a._id !== initial._id &&
          a.assetCode.trim().toLowerCase() === form.assetCode.trim().toLowerCase()
        );
        if (dup) return alert("Another asset already uses this Asset Code.");
        assets[idx] = { ...assets[idx], ...form, updatedAt: new Date().toISOString() };
        saveLS(LS_KEY, assets);
      }
    } else {
      const _id = crypto.randomUUID?.() || String(Date.now());
      const doc = { _id, ...form, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (assets.some(a => a.assetCode.trim().toLowerCase() === form.assetCode.trim().toLowerCase())) {
        return alert("Asset Code already exists");
      }
      assets.unshift(doc);
      saveLS(LS_KEY, assets);
    }
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial?._id ? "Edit Asset" : "Add Asset"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Asset Code"
            value={form.assetCode}
            onChange={e=>setForm({...form, assetCode:e.target.value})}
            required
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select label="Type" value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>
                {TYPES.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Condition</InputLabel>
              <Select label="Condition" value={form.condition} onChange={e=>setForm({...form, condition:e.target.value})}>
                {CONDITIONS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Brand" fullWidth value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})}/>
            <TextField label="Model" fullWidth value={form.model} onChange={e=>setForm({...form, model:e.target.value})}/>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Issued Date"
              type="date"
              value={form.issuedDate?.slice(0,10) || ""}
              onChange={e=>setForm({...form, issuedDate:e.target.value})}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Assigned To (User ID / Email)"
              value={form.assignedTo}
              onChange={e=>setForm({...form, assignedTo:e.target.value})}
              fullWidth
            />
          </Stack>

          <TextField
            label="Notes"
            multiline
            minRows={2}
            value={form.notes}
            onChange={e=>setForm({...form, notes:e.target.value})}
          />

          {/* Images */}
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <PhotoCameraIcon fontSize="small" />
              <Typography variant="subtitle2">Images</Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                onClick={() => document.getElementById("asset-images-input")?.click()}
              >
                Upload Images
              </Button>
              <input
                id="asset-images-input"
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (files?.length) await onPickImages(files);
                  e.target.value = ""; // reset input
                }}
              />
            </Stack>

            {(!form.images || !form.images.length) ? (
              <Typography variant="body2" color="text.secondary">No images attached.</Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                  gap: 1,
                }}
              >
                {form.images.map((src, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      position: "relative",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      overflow: "hidden",
                      height: 90,
                    }}
                  >
                    <img
                      alt={`asset-${idx}`}
                      src={src}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeImage(idx)}
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        bgcolor: "background.paper",
                        "&:hover": { bgcolor: "background.paper" },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={save} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ------------------------ Main Component ------------------------ */
export default function AssetManager() {
  // filters + paging (client side)
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [condition, setCondition] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [items, setItems] = useState(() => loadLS(LS_KEY, []));
  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [snack, setSnack] = useState({ open:false, msg:"", severity:"success" });

  // gallery dialog state
  const [gallery, setGallery] = useState({ open: false, images: [], title: "" });

  useEffect(() => {
    const listener = () => setItems(loadLS(LS_KEY, []));
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);

  const filtered = useMemo(() => {
    let arr = [...items];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter(a =>
        a.assetCode.toLowerCase().includes(s) ||
        (a.brand || "").toLowerCase().includes(s) ||
        (a.model || "").toLowerCase().includes(s) ||
        (a.assignedTo || "").toLowerCase().includes(s)
      );
    }
    if (type) arr = arr.filter(a => a.type === type);
    if (condition) arr = arr.filter(a => a.condition === condition);
    return arr;
  }, [items, q, type, condition]);

  const total = filtered.length;
  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const clear = () => { setQ(""); setType(""); setCondition(""); };

  const onSaved = () => {
    setItems(loadLS(LS_KEY, []));
    setSnack({ open:true, msg:"Saved", severity:"success" });
  };

  const del = (asset) => {
    if (!window.confirm(`Delete asset ${asset.assetCode}? This cannot be undone.`)) return;
    const next = items.filter(a => a._id !== asset._id);
    saveLS(LS_KEY, next);
    setItems(next);
    setSnack({ open:true, msg:"Deleted", severity:"success" });
  };

  // styling helpers
  const conditionChipProps = (c) => {
    if (c === "New")   return { color: "success", variant: "filled" };
    if (c === "Used")  return { color: "warning", variant: "filled" };
    return { color: "default", variant: "outlined", sx: { borderColor: "error.light", color: "error.main" } }; // Very Old
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ mb: 2, p: 0 }}>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>Asset Manager</Typography>
              <Typography variant="body2" color="text.secondary">
                Track and manage physical IT assets across your organization.
              </Typography>
            </Box>
            <Button startIcon={<AddIcon/>} variant="contained" onClick={()=>setAddOpen(true)}>
              Add Asset
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Filters */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 2,
          borderRadius: 2,
          background: (t) => t.palette.mode === "light" ? "#fbfbfd" : "transparent",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
          <TextField
            size="small"
            placeholder="Search (asset code, brand, model, assigned to)"
            value={q} onChange={e=>setQ(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr:1 }}/>, }}
            fullWidth
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={type} onChange={e=>setType(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {TYPES.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Condition</InputLabel>
            <Select label="Condition" value={condition} onChange={e=>setCondition(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {CONDITIONS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Button startIcon={<ClearIcon/>} onClick={clear}>Reset</Button>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          "& .MuiTable-root": { minWidth: 960 },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ "& th": { bgcolor: "background.default", fontWeight: 700 } }}>
              {/* UPDATED HEADER LABEL */}
              <TableCell sx={{ width: 260 }}>Asset Code / Assigned To</TableCell>
              <TableCell sx={{ width: 120 }}>Type</TableCell>
              <TableCell sx={{ width: 220 }}>Brand / Model</TableCell>
              <TableCell sx={{ width: 140 }}>Condition</TableCell>
              <TableCell sx={{ width: 140 }}>Issued Date</TableCell>
              <TableCell sx={{ width: 180 }}>Images</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((a) => {
              const imgs = a.images || [];
              const first3 = imgs.slice(0, 3);
              const more = Math.max(imgs.length - 3, 0);
              return (
                <TableRow
                  key={a._id}
                  hover
                  sx={{ "&:nth-of-type(odd)": { backgroundColor: (t) => t.palette.action.hover } }}
                >
                  {/* UPDATED CELL: stacked vertically */}
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" sx={{ fontWeight: 700, pr: 2, whiteSpace: "nowrap" }}>
                        {a.assetCode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Assigned To: {a.assignedTo || "—"}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Chip size="small" label={a.type} variant="outlined" />
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.brand || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.model || ""}</Typography>
                  </TableCell>

                  <TableCell>
                    <Chip size="small" label={a.condition} {...conditionChipProps(a.condition)} />
                  </TableCell>

                  <TableCell>{fmtDate(a.issuedDate)}</TableCell>

                  <TableCell>
                    {imgs.length ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        {first3.map((src, idx) => (
                          <Tooltip key={`${a._id}-${idx}`} title="Click to view">
                            <Avatar
                              variant="rounded"
                              src={src}
                              sx={{
                                width: 34, height: 34,
                                border: "1px solid",
                                borderColor: "divider",
                                cursor: "pointer",
                              }}
                              onClick={() => setGallery({ open: true, images: imgs, title: `${a.assetCode} • Images` })}
                            />
                          </Tooltip>
                        ))}
                        {more > 0 && (
                          <Badge badgeContent={`+${more}`} color="primary">
                            <Avatar
                              variant="rounded"
                              sx={{
                                width: 34, height: 34,
                                border: "1px dashed",
                                borderColor: "divider",
                                bgcolor: "background.paper",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                              onClick={() => setGallery({ open: true, images: imgs, title: `${a.assetCode} • Images` })}
                            >
                              <ImageIcon fontSize="small" />
                            </Avatar>
                          </Badge>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No images</Typography>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton onClick={()=>setEditAsset(a)}><EditIcon/></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={()=>del(a)}><DeleteOutlineIcon/></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}

            {!paged.length && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Stack spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
                    <ImageIcon />
                    <Typography variant="body2">
                      {items.length ? "No results. Try adjusting filters." : "No assets yet. Click “Add Asset” to create your first item."}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Divider />

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p)=>setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e=>{ setRowsPerPage(parseInt(e.target.value,10)); setPage(0); }}
          rowsPerPageOptions={[10,20,50]}
          sx={{ px: 2 }}
        />
      </TableContainer>

      {/* Add / Edit */}
      <AddEditDialog
        open={addOpen || !!editAsset}
        onClose={()=>{ setAddOpen(false); setEditAsset(null); }}
        initial={editAsset}
        onSaved={onSaved}
      />

      {/* Gallery */}
      <ImageGalleryDialog
        open={gallery.open}
        images={gallery.images}
        title={gallery.title}
        onClose={() => setGallery({ open: false, images: [], title: "" })}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={()=>setSnack(s=>({...s,open:false}))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

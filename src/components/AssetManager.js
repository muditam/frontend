import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box, Paper, Stack, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
  Button, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Tooltip, Snackbar, Alert, Avatar, Badge, Divider, InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

const TYPES = ["Laptop", "Mouse", "Charger", "HeadPhone", "Keyboard", "Monitor", "NeckBand"];
const CONDITIONS = ["New", "Used", "Very Old"];

const LS_KEY = "org_hw_assets_v1";

function loadLS(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch { return fallback; }
}
function saveLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
}

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

/* ------------------------ Section Header ------------------------ */
function SectionHeader({ title, subtitle, right, sx }) {
  return (
    <Stack
      direction="row"
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      sx={{ mb: 1, ...sx }}
      spacing={1.5}
    >
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>{title}</Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        )}
      </Box>
      {right}
    </Stack>
  );
}

/* ------------------------ Gallery Dialog ------------------------ */
function ImageGalleryDialog({ open, onClose, images = [], title = "Images" }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent dividers sx={{ p: 2.5 }}>
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
      <DialogActions sx={{ p: 1.5 }}>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ------------------------ Drag & Drop Upload ------------------------ */
function Uploader({ images = [], onPick, onRemove }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const openPicker = () => inputRef.current?.click();

  return (
    <Box>
      <Box
        onClick={openPicker}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer?.files?.length) await onPick(e.dataTransfer.files);
        }}
        sx={{
          borderRadius: 2,
          border: "1px dashed",
          borderColor: dragOver ? "primary.main" : "divider",
          bgcolor: dragOver ? "action.hover" : "background.paper",
          p: 2,
          textAlign: "center",
          cursor: "pointer",
          transition: "all .15s ease",
        }}
      >
        <Stack alignItems="center" spacing={1}>
          <PhotoCameraIcon />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Click or drag & drop to upload images
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PNG / JPG up to a few MB each
          </Typography>
        </Stack>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={async (e) => {
            const files = e.target.files;
            if (files?.length) await onPick(files);
            e.target.value = ""; // reset input
          }}
        />
      </Box>

      {!!images.length && (
        <Box
          sx={{
            mt: 1.5,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
            gap: 1,
          }}
        >
          {images.map((src, idx) => (
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
              <img alt={`asset-${idx}`} src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <IconButton
                size="small"
                onClick={() => onRemove(idx)}
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
  );
}

/* ------------------------ Add/Edit Dialog ------------------------ */
function AddEditDialog({ open, onClose, initial, onSaved, allAssets }) {
  // Normalize initial shape for multi-item assets
  const seed = initial?.items?.length
    ? initial
    : initial
      ? { ...initial, items: [{ type: initial.type || "Laptop", brand: initial.brand || "", model: initial.model || "" }] }
      : null;

  const [form, setForm] = useState(() => seed || {
    assetCode: "",
    items: [{ type: "Laptop", brand: "", model: "" }],
    condition: "New",
    issuedDate: "",
    assignedTo: "",
    images: [],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const seed2 = initial?.items?.length
      ? initial
      : initial
        ? { ...initial, items: [{ type: initial.type || "Laptop", brand: initial.brand || "", model: initial.model || "" }] }
        : null;
    setForm(seed2 || {
      assetCode: "",
      items: [{ type: "Laptop", brand: "", model: "" }],
      condition: "New",
      issuedDate: "",
      assignedTo: "",
      images: [],
    });
    setErrors({});
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

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { type: "Laptop", brand: "", model: "" }] }));
  const removeItem = (idx) => setForm(prev => {
    const next = prev.items.filter((_, i) => i !== idx);
    return { ...prev, items: next.length ? next : [{ type: "Laptop", brand: "", model: "" }] };
  });
  const patchItem = (idx, patch) => setForm(prev => {
    const next = [...prev.items];
    next[idx] = { ...next[idx], ...patch };
    return { ...prev, items: next };
  });

  const validate = () => {
    const e = {};
    if (!form.assetCode.trim()) e.assetCode = "Asset Code is required";
    // Uniqueness check (case-insensitive) excluding current editing record
    const assetCodeTaken = allAssets.some(a =>
      (initial?._id ? a._id !== initial._id : true) &&
      a.assetCode.trim().toLowerCase() === form.assetCode.trim().toLowerCase()
    );
    if (form.assetCode && assetCodeTaken) e.assetCode = "This Asset Code is already in use";
    if (!form.items?.length) e.items = "Add at least one item";
    if (form.items?.some(it => !it?.type)) e.items = "Each item must have a Type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;

    const assets = loadLS(LS_KEY, []);
    if (initial?._id) {
      const idx = assets.findIndex(a => a._id === initial._id);
      if (idx >= 0) {
        const { type, brand, model, ...rest } = form; // legacy cleanup
        assets[idx] = { ...assets[idx], ...rest, updatedAt: new Date().toISOString() };
        saveLS(LS_KEY, assets);
      }
    } else {
      const _id = crypto.randomUUID?.() || String(Date.now());
      const doc = { _id, ...form, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      delete doc.type; delete doc.brand; delete doc.model; // legacy cleanup
      assets.unshift(doc);
      saveLS(LS_KEY, assets);
    }
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" TransitionProps={{ timeout: 200 }}>
      <DialogTitle sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
        {initial?._id ? "Edit Asset" : "Add Asset"}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1.5 }}>
  <Stack
    direction={{ xs: "column", md: "row" }}
    spacing={2}
    alignItems={{ md: "flex-start" }}
  >
    {/* Asset Code — a little smaller */}
    <TextField
      label="Asset Code"
      value={form.assetCode}
      onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
      required
      error={!!errors.assetCode}
      helperText={errors.assetCode || ""}
      sx={{
        flex: { md: "0 0 22%" },        // was full, now a bit narrower
        minWidth: { xs: "100%", md: 0 },
      }}
    />

    {/* Condition — narrower */}
    <FormControl
      sx={{
        flex: { md: "0 0 18%" },        // slightly smaller than Asset Code
        minWidth: { xs: "100%", md: 0 },
      }}
    >
      <InputLabel>Condition</InputLabel>
      <Select
        label="Condition"
        value={form.condition}
        onChange={(e) => setForm({ ...form, condition: e.target.value })}
      >
        {CONDITIONS.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </Select>
    </FormControl>

    {/* Issued Date — a little smaller */}
    <TextField
      label="Issued Date"
      type="date"
      value={form.issuedDate?.slice(0, 10) || ""}
      onChange={(e) => setForm({ ...form, issuedDate: e.target.value })}
      InputLabelProps={{ shrink: true }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start"> 
          </InputAdornment>
        ),
      }}
      sx={{
        flex: { md: "0 0 20%" },        
        minWidth: { xs: "100%", md: 0 },
      }}
    />
  
    <TextField
      label="Assigned To (User ID / Email)"
      placeholder="e.g., user@company.com"
      value={form.assignedTo}
      onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
      sx={{
        flex: { md: "1 1 auto" },       // takes leftover width
        minWidth: { xs: "100%", md: 0 },
      }}
    />
  </Stack>
</Paper>



        {/* Items */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1.5 }}>
          <SectionHeader
            title="Asset Items"
            subtitle="One asset can include multiple components (e.g., Laptop + Charger)"
            right={
              <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={addItem}>
                Add Item
              </Button>
            }
          />
          <Stack spacing={1.25}>
            {form.items.map((it, idx) => (
              <Paper
                key={idx}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  bgcolor: (t) => t.palette.mode === "light" ? "#fbfbfc" : "background.paper",
                }}
              >
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                  <FormControl fullWidth sx={{ minWidth: 180 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      label="Type"
                      value={it.type}
                      onChange={e => patchItem(idx, { type: e.target.value })}
                    >
                      {TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Brand"
                    placeholder="e.g., Dell"
                    value={it.brand}
                    onChange={e => patchItem(idx, { brand: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Model"
                    placeholder="e.g., Latitude 5440"
                    value={it.model}
                    onChange={e => patchItem(idx, { model: e.target.value })}
                    fullWidth
                  />
                  <Tooltip title="Remove item">
                    <span>
                      <IconButton color="error" onClick={() => removeItem(idx)} disabled={form.items.length === 1}>
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Paper> 
            ))}
            {!!errors.items && <Typography variant="caption" color="error.main">{errors.items}</Typography>}
          </Stack>
        </Paper>

        {/* Images */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader title="Images" /> 
          <Uploader images={form.images} onPick={onPickImages} onRemove={removeImage} />
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={save} variant="contained">Save</Button>
      </DialogActions> 
    </Dialog>
  );
} 
 
export default function AssetManager() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [items, setItems] = useState(() => loadLS(LS_KEY, []));
  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const [gallery, setGallery] = useState({ open: false, images: [], title: "" });
  const [q, setQ] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");

  useEffect(() => {
    const listener = () => setItems(loadLS(LS_KEY, []));
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = items;
    if (needle) {
      arr = arr.filter(a => {
        const allItems = getItemsArr(a);
        const hay = [
          a.assetCode,
          a.assignedTo,
          a.condition,
          ...allItems.map(x => x?.type || ""),
          ...allItems.map(x => x?.brand || ""),
          ...allItems.map(x => x?.model || ""),
        ].join(" ").toLowerCase();
        return hay.includes(needle);
      });
    }
    if (conditionFilter) arr = arr.filter(a => a.condition === conditionFilter);
    return arr;
  }, [items, q, conditionFilter]);

  const total = filtered.length;
  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const onSaved = () => {
    setItems(loadLS(LS_KEY, []));
    setSnack({ open: true, msg: "Saved", severity: "success" });
  };

  const del = (asset) => {
    if (!window.confirm(`Delete asset ${asset.assetCode}? This cannot be undone.`)) return;
    const next = items.filter(a => a._id !== asset._id);
    saveLS(LS_KEY, next);
    setItems(next);
    setSnack({ open: true, msg: "Deleted", severity: "success" });
  };

  const conditionChipProps = (c) => {
    if (c === "New") return { color: "success", variant: "soft" };
    if (c === "Used") return { color: "warning", variant: "soft" };
    return { color: "error", variant: "outlined" }; // Very Old
  };

  const getItemsArr = (a) => (a.items && Array.isArray(a.items)
    ? a.items
    : [{ type: a.type, brand: a.brand, model: a.model }].filter(x => x.type));

  // Group items by type for categorised rendering
  const groupByType = (arr) => {
    const map = new Map();
    (arr || []).forEach(it => {
      if (!it?.type) return;
      const key = it.type;
      const list = map.get(key) || [];
      list.push(it);
      map.set(key, list);
    });
    return Array.from(map.entries());
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      {/* Header / Controls */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: (t) => t.palette.mode === "light" ? "#fafafa" : "background.paper",
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
              Asset Manager
            </Typography>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setAddOpen(true)}>
              Add Asset
            </Button>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <TextField
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search by asset code, user, type, brand, model…"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Filter: Condition</InputLabel>
              <Select
                label="Filter: Condition"
                value={conditionFilter}
                onChange={(e) => { setConditionFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                {CONDITIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          "& .MuiTable-root": { minWidth: 1060 },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ "& th": { bgcolor: "background.default", fontWeight: 700, fontSize: 12, color: "text.secondary" } }}>
              <TableCell sx={{ width: 260 }}>Asset Code / Assigned To</TableCell>
              <TableCell sx={{ width: 220 }}>Types</TableCell>
              <TableCell sx={{ width: 360 }}>Brand / Model (Grouped)</TableCell>
              <TableCell sx={{ width: 140 }}>Condition</TableCell>
              <TableCell sx={{ width: 140 }}>Issued Date</TableCell>
              <TableCell sx={{ width: 200 }}>Images</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((a) => {
              const imgs = a.images || [];
              const allItems = getItemsArr(a);
              const groups = groupByType(allItems);

              const first3Imgs = imgs.slice(0, 3);
              const moreImgs = Math.max(imgs.length - 3, 0);

              return (
                <TableRow
                  key={a._id}
                  hover
                  sx={{
                    "&:nth-of-type(odd)": { backgroundColor: (t) => t.palette.action.hover },
                    "& td": { borderBottomStyle: "dashed" }
                  }}
                >
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" sx={{ fontWeight: 700, pr: 2, whiteSpace: "nowrap" }}>
                        {a.assetCode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.assignedTo ? `Assigned: ${a.assignedTo}` : "Unassigned"}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* Types */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {groups.map(([type]) => (
                        <Chip
                          key={`${a._id}-type-${type}`}
                          size="small"
                          label={type}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </TableCell>

                  {/* Brand/Model grouped */}
                  <TableCell>
                    <Stack spacing={0.75}>
                      {groups.map(([type, itemsForType]) => {
                        const show = itemsForType.slice(0, 3);
                        const more = Math.max(itemsForType.length - 3, 0);
                        return (
                          <Box
                            key={`${a._id}-group-${type}`}
                            sx={{
                              border: "1px dashed",
                              borderColor: "divider",
                              borderRadius: 1,
                              p: 1,
                              background: (t) => t.palette.mode === "light" ? "#fafafb" : "transparent",
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                              {type}
                            </Typography>
                            <Stack spacing={0.25}>
                              {show.map((it, idx) => (
                                <Typography key={`${a._id}-bm-${type}-${idx}`} variant="body2">
                                  {(it.brand || "—")}{it.model ? ` ${it.model}` : ""}
                                </Typography>
                              ))}
                              {more > 0 && (
                                <Typography variant="caption" color="text.secondary">+{more} more</Typography>
                              )}
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Chip size="small" label={a.condition} {...conditionChipProps(a.condition)} />
                  </TableCell>

                  <TableCell>{fmtDate(a.issuedDate)}</TableCell>

                  <TableCell>
                    {imgs.length ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        {first3Imgs.map((src, idx) => (
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
                        {moreImgs > 0 && (
                          <Badge badgeContent={`+${moreImgs}`} color="primary">
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
                      <IconButton onClick={() => setEditAsset(a)}><EditIcon /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => del(a)}><DeleteOutlineIcon /></IconButton>
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
                      No assets match your filters. Click “Add Asset” to create a new one.
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
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ px: 2 }}
        />
      </TableContainer>

      {/* Add / Edit */}
      <AddEditDialog
        open={addOpen || !!editAsset}
        onClose={() => { setAddOpen(false); setEditAsset(null); }} 
        initial={editAsset}
        onSaved={onSaved}
        allAssets={items}
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
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}


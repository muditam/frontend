import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  Avatar,
  Badge,
  Divider,
  InputAdornment,
  Switch,
  Autocomplete,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import axios from "axios";

const TYPES = [
  "Laptop",
  "Mouse",
  "Charger",
  "CPU",
  "HeadPhone",
  "Keyboard",
  "Monitor",
  "NeckBand",
];

// 🔹 New: common brands for dropdown (still allows custom)
const BRANDS = [
  "HP",
  "Dell",
  "Acer",
  "Lenovo",
  "Asus",
  "Apple",
  "MSI",
  "Samsung",
  "LG",
  "Boat",
  "JBL",
  "Logitech",
  "Zebronics",
];

const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com"; // change if needed

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};
function LazyImage({ src, alt, style, onClick, placeholder = true, eager = false, loadOnClick = false  }) {
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

    // Check if already loaded from cache
    const imgEl = imgRef.current;
    if (imgEl?.complete && imgEl.naturalHeight !== 0) {
      setLoaded(true);
      setInView(true);
      return;
    }

    // Intersection Observer with margin for preloading
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px BEFORE entering viewport
        threshold: 0.01
      }
    );

    observerRef.current.observe(container);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, eager]);

  return (
<Box
  sx={{ width: "100%", height: "100%" }}
  onClick={(e) => {
    if (loadOnClick && !inView) {
      e.stopPropagation();
      setInView(true);      // 👈 LOAD IMAGE ON CLICK
      return;
    }
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
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 800, letterSpacing: 0.2 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
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
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 1.5,
            }}
          >
            {images.map((src, idx) => (
              <Paper
                key={idx}
                variant="outlined"
                sx={{ p: 0.5, borderRadius: 2, overflow: "hidden" }}
              >
<LazyImage
  src={src}
  alt={`asset-img-${idx}`}
  eager={true}
  style={{
    width: "100%",
    height: 160,
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
            <Typography variant="body2">No images attached.</Typography>
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

/* ------------------------ Drag & Drop Upload ------------------------ */
function Uploader({ images = [], onPick, onRemove }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const openPicker = () => inputRef.current?.click();

  return (
    <Box>
      <Box
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
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
            e.target.value = "";
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
              <img
                alt={`asset-${idx}`}
                src={src}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
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

function AddEditDialog({ open, onClose, initial, onSaved, allAssets }) {
  const seed = initial?.items?.length
    ? initial
    : initial
    ? {
        ...initial,
        items: [
          {
            type: initial.type || "Laptop",
            brand: initial.brand || "",
            model: initial.model || "",
          },
        ],
      }
    : null;

  const [form, setForm] = useState(
    () =>
      seed || {
        assetCode: "",
        items: [{ type: "Laptop", brand: "", model: "" }],
        images: [],
        // keep assignment fields hidden so we don't lose them when editing
        allocatedTo: "",
        employeeId: "",
        issuedDate: "",
      }
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false); // ✅ new

  useEffect(() => {
    const seed2 = initial?.items?.length
      ? initial
      : initial
      ? {
          ...initial,
          items: [
            {
              type: initial.type || "Laptop",
              brand: initial.brand || "",
              model: initial.model || "",
            },
          ],
        }
      : null;

    const baseForm =
      seed2 || {
        assetCode: "",
        items: [{ type: "Laptop", brand: "", model: "" }],
        images: [],
        allocatedTo: "",
        employeeId: "",
        issuedDate: "",
      };

    setForm({
      ...baseForm,
      // 👇 IMPORTANT: show existing URLs from DB if no `images` array
      images:
        Array.isArray(baseForm.images) && baseForm.images.length
          ? baseForm.images
          : Array.isArray(baseForm.imageUrls)
          ? baseForm.imageUrls
          : [],
    });
    setErrors({});
  }, [initial, open]);

  const onPickImages = async (files) => {
    const arr = Array.from(files || []);
    const readers = arr.map(
      (f) =>
        new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.readAsDataURL(f);
        })
    );
    const dataUrls = await Promise.all(readers);
    setForm((prev) => ({
      ...prev,
      images: [...(prev.images || []), ...dataUrls],
    }));
  };

  const removeImage = (idx) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  };

  const addItem = () =>
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { type: "Laptop", brand: "", model: "" }],
    }));

  const removeItem = (idx) =>
    setForm((prev) => {
      const next = prev.items.filter((_, i) => i !== idx);
      return {
        ...prev,
        items: next.length ? next : [{ type: "Laptop", brand: "", model: "" }],
      };
    });

  const patchItem = (idx, patch) =>
    setForm((prev) => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, items: next };
    });

  const validate = () => {
    const e = {};
    if (!form.assetCode.trim()) e.assetCode = "Asset Code is required";
    const assetCodeTaken = allAssets.some(
      (a) =>
        (initial?._id ? a._id !== initial._id : true) &&
        a.assetCode.trim().toLowerCase() ===
          form.assetCode.trim().toLowerCase()
    );
    if (form.assetCode && assetCodeTaken)
      e.assetCode = "This Asset Code is already in use";
    if (!form.items?.length) e.items = "Add at least one item";
    if (form.items?.some((it) => !it?.type))
      e.items = "Each item must have a Type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // helper: convert dataURL -> File for Wasabi upload
  const dataURLToFile = (dataUrl, filename) => {
    if (!dataUrl.startsWith("data:")) return null;
    const [meta, content] = dataUrl.split(",");
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = window.atob(content);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
    return new File([u8], filename, { type: mime });
  };

  // ✅ uses localStorage directly (no loadLS / saveLS / LS_KEY)
  const save = async () => {
    if (!validate()) return;

    setSaving(true); // start loading
    try {
      const mainItem = form.items[0] || {};

      const name = mainItem.type || "Asset";
      const brand = mainItem.brand || "";
      const model = mainItem.model || "NA";
      const company = brand || "NA"; // backend needs company

      // 1) Upload images to Wasabi (if any)
      let imageUrls = [];
      if (form.images && form.images.length) {
        const fd = new FormData();
        form.images.forEach((src, idx) => {
          const file = dataURLToFile(
            src,
            `${form.assetCode || "asset"}-${idx + 1}.png`
          );
          if (file) fd.append("files", file);
        });
        fd.append(
          "prefix",
          `asset-inventory/${(form.assetCode || "asset")
            .replace(/[^a-z0-9_-]/gi, "_")
            .toLowerCase()}`
        );

        const uploadRes = await axios.post(
          `${API_BASE_URL}/api/assets/upload`,
          fd,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        imageUrls = Array.isArray(uploadRes.data?.urls)
          ? uploadRes.data.urls
          : [];
      }

      // 2) Build payload exactly as backend expects
      const payload = {
        name,
        company,
        brand,
        model,
        assetCode: form.assetCode.trim(),
        imageUrls,
        allottedTo: form.allocatedTo?.trim() || "",
        emp_id: form.employeeId?.trim() || "",
      };

      // 3) Create / Update in DB
      if (initial?._id) {
        await axios.put(`${API_BASE_URL}/api/assets/${initial._id}`, payload);
      } else {
        await axios.post(`${API_BASE_URL}/api/assets`, payload);
      }

      // 4) Refresh list from DB in parent
      onSaved?.();

      // 5) Close dialog
      onClose?.();
    } catch (err) {
      console.error("Save asset API error:", err);
      // If API fails, we don't touch local UI; just show in console / snack from parent if needed
    } finally {
      setSaving(false); // stop loading
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionProps={{ timeout: 200 }}
    >
      <DialogTitle sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
        {initial?._id ? "Edit Asset" : "Add Asset"}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
        {/* Asset Details (inventory only) */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1.5 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ md: "flex-start" }}
          >
            <TextField
              label="Asset Code"
              value={form.assetCode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, assetCode: e.target.value }))
              }
              required
              error={!!errors.assetCode}
              helperText={errors.assetCode || ""}
              sx={{ flex: { md: "0 0 22%" }, minWidth: { xs: "100%", md: 0 } }}
            />
          </Stack>
        </Paper>

        {/* Items */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1.5 }}>
          <SectionHeader
            title="Asset Items"
            subtitle="One asset can include multiple components"
            right={
              <Button
                size="small"
                startIcon={<AddCircleOutlineIcon />}
                onClick={addItem}
              >
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
                  bgcolor: (t) =>
                    t.palette.mode === "light"
                      ? "#fbfbfc"
                      : "background.paper",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ md: "center" }}
                >
                  <FormControl fullWidth sx={{ minWidth: 180 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      label="Type"
                      value={it.type}
                      onChange={(e) =>
                        patchItem(idx, { type: e.target.value })
                      }
                    >
                      {TYPES.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Brand as dropdown + free text (Autocomplete) */}
                  <Autocomplete
                    fullWidth
                    size="small"
                    freeSolo
                    options={BRANDS}
                    value={it.brand || ""}
                    onChange={(_e, newValue) =>
                      patchItem(idx, { brand: newValue || "" })
                    }
                    onInputChange={(_e, newInput) =>
                      patchItem(idx, { brand: newInput || "" })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Brand"
                        placeholder="e.g., Dell"
                      />
                    )}
                  />

                  <TextField
                    label="Model"
                    placeholder="e.g., Latitude 5440"
                    value={it.model}
                    onChange={(e) => patchItem(idx, { model: e.target.value })}
                    fullWidth
                  />
                  <Tooltip title="Remove item">
                    <span>
                      <IconButton
                        color="error"
                        onClick={() => removeItem(idx)}
                        disabled={form.items.length === 1}
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Paper>
            ))}
            {!!errors.items && (
              <Typography variant="caption" color="error.main">
                {errors.items}
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* Images */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader title="Images" />
          <Uploader
            images={form.images}
            onPick={onPickImages}
            onRemove={removeImage}
          />
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} variant="contained" disabled={saving}>
          {saving ? "Saving…" : "Save Asset"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
/* ------------------------ Assign Dialog (per row) ------------------------ */
function AssignDialog({
  open,
  onClose,
  asset,
  employeeList,
  onSaveAssign,
  loadingEmployees,
}) {
  const [form, setForm] = useState({
    allocatedTo: "",
    employeeId: "",
    issuedDate: "",
  });

  useEffect(() => {
    if (asset) {
      setForm({
        allocatedTo: asset.allocatedTo || "",
        employeeId: asset.employeeId || "",
        issuedDate: asset.issuedDate ? asset.issuedDate.slice(0, 10) : "",
      });
    }
  }, [asset, open]);

  if (!asset) return null;

  const selectedEmployee =
    employeeList.find(
      (e) =>
        form.allocatedTo &&
        e.name &&
        e.name.trim().toLowerCase() ===
          form.allocatedTo.trim().toLowerCase()
    ) || null;

  const handleSave = () => {
    onSaveAssign(asset._id, {
      allocatedTo: form.allocatedTo.trim(),
      employeeId: form.employeeId ? String(form.employeeId).trim() : "",
      issuedDate: form.issuedDate || "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>
        Assign Asset • {asset.assetCode}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Autocomplete
            options={employeeList}
            getOptionLabel={(option) => option?.name || ""}
            isOptionEqualToValue={(opt, val) =>
              !!val && opt.name === val.name
            }
            value={selectedEmployee}
            loading={loadingEmployees}
            onChange={(_e, newValue) => {
              setForm((prev) => ({
                ...prev,
                allocatedTo: newValue?.name || "",
                employeeId: newValue?.employeeId || "",
              }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Employee Name"
                placeholder="Search employee"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          <TextField
            label="Employee ID"
            value={form.employeeId}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                employeeId: e.target.value,
              }))
            }
            placeholder="e.g., MA001"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BadgeIcon />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Issued Date"
            type="date"
            value={form.issuedDate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, issuedDate: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Assignment
        </Button>
      </DialogActions>
    </Dialog>
  );
}
// 👇 put this above `return (` inside the map callback
// const isAssigned = !!(
//   a.allocatedTo ||
//   a.allottedTo ||   // from DB
//   a.employeeId ||
//   a.emp_id          // from DB
// );

/* ------------------------ Main Component ------------------------ */
export default function AssetsManagerRole() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [items, setItems] = useState([]); // from DB now
  const [loadingAssets, setLoadingAssets] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [assignAsset, setAssignAsset] = useState(null);

  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    severity: "success",
  });

  const [gallery, setGallery] = useState({
    open: false,
    images: [],
    title: "",
  });
  const [q, setQ] = useState("");

  const [employeeList, setEmployeeList] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [typeFilter, setTypeFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState(null);
  const [assignedFilter, setAssignedFilter] = useState("ALL");

  const [historyDialog, setHistoryDialog] = useState({
    open: false,
    loading: false,
    assetCode: "",
    rows: [],
    error: "",
  });
  const [faultyDialog, setFaultyDialog] = useState({
    open: false,
    asset: null,
    value: false,
  });
  const [faultyRemark, setFaultyRemark] = useState("");
  const [faultyError, setFaultyError] = useState("");

  // Fetch employees once
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const res = await axios.get(`${API_BASE_URL}/api/assets/employees`);
        const data = Array.isArray(res.data) ? res.data : [];
        setEmployeeList(data);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);
// 👇 put this above `return (` inside the map callback
// const isAssigned = !!(
//   a.allocatedTo ||
//   a.allottedTo ||   // from DB
//   a.employeeId ||
//   a.emp_id          // from DB
// );

const fetchAssets = async () => {
  try {
    setLoadingAssets(true);
    const res = await axios.get(`${API_BASE_URL}/api/assets`);
    const data = Array.isArray(res.data) ? res.data : [];

    const mapped = data.map((a) => ({
      ...a,
      allocatedTo: a.allocatedTo || a.allottedTo || "",
      employeeId: a.employeeId || a.emp_id || "",
    }));

    setItems(mapped);
  } catch (err) {
    console.error("Failed to fetch assets", err);
    setSnack({
      open: true,
      msg: "Failed to load assets from server",
      severity: "error",
    });
  } finally {
    setLoadingAssets(false);
  }
};



  useEffect(() => {
    fetchAssets();
  }, []);

  const getItemsArr = (a) => {
    if (Array.isArray(a.items) && a.items.length) return a.items;

    const type = a.type || a.name || "";
    const brand = a.brand || a.company || "";
    const model = a.model || "";

    if (!type && !brand && !model) return [];

    return [
      {
        type,
        brand,
        model,
      },
    ];
  };

  // active employees (for filter)
  const activeEmployees = useMemo(() => {
    const active = employeeList.filter(
      (e) => e.isActive || e.active || e.status === "Active"
    );
    return active.length ? active : employeeList;
  }, [employeeList]);

const totalAssigned = useMemo(
  () => items.filter((a) => !a.isFaulty && (a.allocatedTo || a.employeeId)).length,
  [items]
);
const totalFaulty = useMemo(
  () => items.filter((a) => !!a.isFaulty).length,
  [items]
);
const totalUnassigned = useMemo(
  () => items.filter((a) => !a.isFaulty && !a.allocatedTo && !a.employeeId).length,
  [items]
);

 const filtered = useMemo(() => {
  const needle = q.trim().toLowerCase();

  // 🔹 FIX: Handle filter logic correctly
  let arr;
  if (assignedFilter === "FAULTY") {
    arr = items.filter((a) => !!a.isFaulty);
  } else if (assignedFilter === "ALL") {
    arr = items; // ← Show ALL items including faulty
  } else {
    arr = items.filter((a) => !a.isFaulty); // ← For ASSIGNED/UNASSIGNED, exclude faulty
  }

  if (needle) {
    arr = arr.filter((a) => {
      const allItems = getItemsArr(a);
      const hay = [
        a.assetCode,
        a.allocatedTo,
        a.employeeId,
        ...allItems.map((x) => x?.type || ""),
        ...allItems.map((x) => x?.brand || ""),
        ...allItems.map((x) => x?.model || ""),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  if (typeFilter) {
    const t = typeFilter.trim().toLowerCase();
    arr = arr.filter((a) =>
      getItemsArr(a).some(
        (it) => (it.type || "").trim().toLowerCase() === t
      )
    );
  }

  if (employeeFilter) {
    const fName = (employeeFilter.name || "").trim().toLowerCase();
    const fId = (employeeFilter.employeeId || "").trim().toLowerCase();

    arr = arr.filter((a) => {
      const aName = (a.allocatedTo || "").trim().toLowerCase();
      const aId = (a.employeeId || "").trim().toLowerCase();
      const nameMatch = fName && aName === fName;
      const idMatch = fId && aId === fId;
      return nameMatch || idMatch;
    });
  }

  if (assignedFilter === "ASSIGNED") {
    arr = arr.filter((a) => a.allocatedTo || a.employeeId);
  } else if (assignedFilter === "UNASSIGNED") {
    arr = arr.filter((a) => !a.allocatedTo && !a.employeeId);
  }

  return arr;
}, [items, q, typeFilter, employeeFilter, assignedFilter]);

  const total = filtered.length;
  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const onSaved = () => {
    fetchAssets();
    setSnack({
      open: true,
      msg: "Asset saved successfully",
      severity: "success",
    });
  };

  const del = async (asset) => {
    if (
      !window.confirm(
        `Delete asset ${asset.assetCode}? This cannot be undone.`
      )
    )
      return;
    try {
      await axios.delete(`${API_BASE_URL}/api/assets/${asset._id}`);
      setSnack({ open: true, msg: "Asset deleted", severity: "success" });
      fetchAssets();
    } catch (err) {
      console.error("Delete asset error:", err);
      setSnack({
        open: true,
        msg: "Failed to delete asset",
        severity: "error",
      });
    }
  };

  const toggleFaulty = async (assetId, value, remark = "") => {
    try {
      const payload = { isFaulty: value };
      if (typeof remark === "string") payload.remark = remark;

      const { data } = await axios.patch(
        `${API_BASE_URL}/api/assets/${assetId}/faulty`,
        payload
      );

      // Use server response so DB + UI are in sync (keeps old behaviour, just more accurate)
      setItems((prev) =>
        prev.map((a) =>
          a._id === assetId
            ? {
                ...a,
                isFaulty: data.isFaulty,
                faultyRemark: data.faultyRemark,
              }
            : a
        )
      );

      setSnack({
        open: true,
        msg: value ? "Marked as faulty" : "Marked as OK",
        severity: "success",
      });
    } catch (err) {
      console.error("toggleFaulty error:", err.response?.data || err);
      const msg =
        err?.response?.data?.message || "Failed to update faulty status";
      setSnack({
        open: true,
        msg,
        severity: "error",
      });
    }
  };

  const groupByType = (arr) => {
    const map = new Map();
    (arr || []).forEach((it) => {
      if (!it?.type) return;
      const key = it.type;
      const list = map.get(key) || [];
      list.push(it);
      map.set(key, list);
    });
    return Array.from(map.entries());
  };

  // History dialog – same as before, using assetCode
  const openHistoryDialog = async (asset) => {
    if (!asset?.assetCode) return;

    setHistoryDialog({
      open: true,
      loading: true,
      assetCode: asset.assetCode,
      rows: [],
      error: "",
    });

    const safeTime = (value) => {
      if (!value) return 0;
      const t = new Date(value).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/asset-allotments/journey/${asset.assetCode}`
      );
      const rows = Array.isArray(res.data) ? res.data : [];

      const sortedRows = [...rows].sort((a, b) => {
        const keyA =
          safeTime(a.returnedAt) ||
          safeTime(a.allottedAt) ||
          safeTime(a.createdAt);
        const keyB =
          safeTime(b.returnedAt) ||
          safeTime(b.allottedAt) ||
          safeTime(b.createdAt);
        return keyB - keyA;
      });

      setHistoryDialog((prev) => ({
        ...prev,
        loading: false,
        rows: sortedRows,
        error: "",
      }));
    } catch (err) {
      console.error("Failed to load history", err);
      setHistoryDialog((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load history",
      }));
    }
  };

  const closeHistoryDialog = () => {
    setHistoryDialog({
      open: false,
      loading: false,
      assetCode: "",
      rows: [],
      error: "",
    });
  };

  const handleAssignSave = async (assetId, payload) => {
    try {
      const existing = items.find((a) => a._id === assetId);
      if (!existing) return;

      // 1️⃣ Update local state only (no localStorage)
      setItems((prev) =>
        prev.map((a) =>
          a._id === assetId
            ? { ...a, ...payload, updatedAt: new Date().toISOString() }
            : a
        )
      );

      // 2️⃣ ALSO sync assignment into DB (Assets collection)
      try {
        // Build same kind of payload that AddEditDialog uses
        const itemsArr = getItemsArr(existing);
        const first = itemsArr[0] || {};

        const name = existing.name || first.type || "Asset";
        const brand = existing.brand || first.brand || "";
        const model = existing.model || first.model || "NA";
        const company = existing.company || brand || "NA";

        const imageUrls = Array.isArray(existing.imageUrls)
          ? existing.imageUrls
          : Array.isArray(existing.images)
          ? existing.images
          : [];

        const assignPayload = {
          name,
          company,
          brand,
          model,
          assetCode: existing.assetCode,
          imageUrls,
          allottedTo: payload.allocatedTo?.trim() || "",
          emp_id: payload.employeeId?.trim() || "",
          issuedDate: payload.issuedDate || "",
        };

        await axios.put(
          `${API_BASE_URL}/api/assets/${assetId}`,
          assignPayload
        );
      } catch (e) {
        console.error("Failed to sync assignment to DB", e);
      }

      // 3️⃣ Map allocatedTo (employee name) -> Employee Mongo _id (for allotment)
      let employeeMongoId = null;
      if (payload.allocatedTo) {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/employees`);
          const list = Array.isArray(res.data) ? res.data : [];

          const emp = list.find(
            (e) =>
              e.fullName &&
              e.fullName.trim().toLowerCase() ===
                payload.allocatedTo.trim().toLowerCase()
          );
          if (emp) {
            employeeMongoId = emp._id;
          }
        } catch (e) {
          console.error("Failed to fetch employees for allotment mapping", e);
        }
      }

      // 4️⃣ If we found a matching Employee, create an entry in Asset Allotment
      if (employeeMongoId) {
        const updatedAsset = { ...existing, ...payload };

        const itemsArr2 = getItemsArr(updatedAsset);
        const first2 = itemsArr2[0] || {};

        const baseImgs = Array.isArray(updatedAsset.imageUrls)
          ? updatedAsset.imageUrls
          : Array.isArray(updatedAsset.images)
          ? updatedAsset.images
          : [];

        const name2 = first2.type || updatedAsset.name || "Asset";
        const company2 = first2.brand || updatedAsset.company || "NA";
        const model2 = first2.model || updatedAsset.model || "NA";

        const allotmentPayload = {
          employeeId: employeeMongoId, // Mongo _id
          name: name2,
          company: company2,
          model: model2,
          assetCode: updatedAsset.assetCode,
          allotmentImageUrls: baseImgs,
          employeeCode:
            (payload.employeeId || updatedAsset.employeeId || "").trim(),
        };

        await axios.post(
          `${API_BASE_URL}/api/asset-allotments`,
          allotmentPayload
        );
      } else {
        console.warn(
          "Could not map allocatedTo to Employee._id, skipping asset-allotment creation"
        );
      }

      setSnack({
        open: true,
        msg: "Assignment saved",
        severity: "success",
      });
    } catch (err) {
      console.error("handleAssignSave error:", err.response?.data || err);
      setSnack({
        open: true,
        msg: "Assignment saved, but allotment sync failed",
        severity: "warning",
      });
    }
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
          bgcolor: (t) =>
            t.palette.mode === "light" ? "#fafafa" : "background.paper",
        }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1.5}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 900, letterSpacing: 0.3 }}
            >
              Asset Inventory
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setAddOpen(true)}
            >
              ADD ASSET
            </Button>
          </Stack>

          {/* Filters row */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.25}
            alignItems={{ md: "center" }}
          >
            <TextField
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search by asset code, employee, type, brand, model…"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
              sx={{
                flexBasis: { xs: "100%", md: "30%" },
                maxWidth: { xs: "100%", md: "30%" },
              }}
            />

            <TextField
              select
              size="small"
              label="Asset Type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
              sx={{
                flexBasis: { xs: "100%", md: "18%" },
                maxWidth: { xs: "100%", md: "18%" },
              }}
            >
              <MenuItem value="">All Types</MenuItem>
              {TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              size="small"
              options={activeEmployees}
              getOptionLabel={(option) => option?.name || ""}
              isOptionEqualToValue={(opt, val) =>
                !!val && opt.employeeId === val.employeeId
              }
              value={
                employeeFilter
                  ? activeEmployees.find(
                      (e) =>
                        e.employeeId === employeeFilter.employeeId &&
                        e.name === employeeFilter.name
                    ) || null
                  : null
              }
              onChange={(_e, newValue) => {
                setEmployeeFilter(
                  newValue
                    ? {
                        name: newValue.name,
                        employeeId: newValue.employeeId,
                      }
                    : null
                );
                setPage(0);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Employee"
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
              sx={{
                flexBasis: { xs: "100%", md: "30%" },
                maxWidth: { xs: "100%", md: "30%" },
              }}
            />

            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexGrow: 1,
                justifyContent: { xs: "flex-start", md: "flex-end" },
              }}
            >
              <Chip
                label={`All (${items.length})`}
                size="small"
                clickable
                color={assignedFilter === "ALL" ? "primary" : "default"}
                variant={assignedFilter === "ALL" ? "filled" : "outlined"}
                onClick={() => {
                  setAssignedFilter("ALL");
                  setPage(0);
                }}
              />
              <Chip
                label={`Assigned (${totalAssigned})`}
                size="small"
                clickable
                color={assignedFilter === "ASSIGNED" ? "primary" : "default"}
                variant={
                  assignedFilter === "ASSIGNED" ? "filled" : "outlined"
                }
                onClick={() => {
                  setAssignedFilter("ASSIGNED");
                  setPage(0);
                }}
              />
              <Chip
                label={`Unassigned (${totalUnassigned})`}
                size="small"
                clickable
                color={
                  assignedFilter === "UNASSIGNED" ? "primary" : "default"
                }
                variant={
                  assignedFilter === "UNASSIGNED" ? "filled" : "outlined"
                }
                onClick={() => {
                  setAssignedFilter("UNASSIGNED");
                  setPage(0);
                }}
              />
              <Chip
                label={`Faulty (${totalFaulty})`}
                size="small"
                clickable
                color={assignedFilter === "FAULTY" ? "primary" : "default"}
                variant={assignedFilter === "FAULTY" ? "filled" : "outlined"}
                onClick={() => {
                  setAssignedFilter("FAULTY");
                  setPage(0);
                }}
              />
            </Stack>
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
          "& .MuiTable-root": { minWidth: 1200 },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  bgcolor: "background.default",
                  fontWeight: 700,
                  fontSize: 12,
                  color: "text.secondary",
                },
              }}
            >
         <TableCell sx={{ width: 120 }}>Asset Code</TableCell>
<TableCell sx={{ width: 120 }}>Types</TableCell>
<TableCell sx={{ width: 180 }}>Model</TableCell>
<TableCell sx={{ width: 180 }}>Images</TableCell>
<TableCell sx={{ width: 180 }}>Assign</TableCell>
<TableCell sx={{ width: 100 }}>History</TableCell>
<TableCell sx={{ width: 220 }}>Faulty</TableCell>
<TableCell align="right" sx={{ width: 100 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingAssets ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Loading assets…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((a) => {
                // prefer "images"; if empty, fall back to "imageUrls" from DB
                const imgs =
                  Array.isArray(a.images) && a.images.length
                    ? a.images
                    : Array.isArray(a.imageUrls)
                    ? a.imageUrls
                    : [];
                const allItems = getItemsArr(a);

                const groups = groupByType(allItems);

                const first3Imgs = imgs.slice(0, 3);
                const moreImgs = Math.max(imgs.length - 3, 0);
const isAssigned = !!(
    a.allocatedTo ||
    a.allottedTo ||
    a.employeeId ||
    a.emp_id
  );
                return (
                  <TableRow
                    key={a._id}
                    hover
                    sx={{
                      "&:nth-of-type(odd)": {
                        backgroundColor: (t) => t.palette.action.hover,
                      },
                      "& td": { borderBottomStyle: "dashed" },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {a.assetCode}
                      </Typography>
                    </TableCell>

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

             <TableCell sx={{ maxWidth: 180 }}>
  <Stack spacing={0.25}>
    {allItems.slice(0, 3).map((it, idx) => (
      <Typography
        key={`${a._id}-model-${idx}`}
        variant="body2"
        sx={{
          whiteSpace: "normal",
          wordBreak: "break-word",
          lineHeight: 1.4,
        }}
      >
        {it.model || "—"}
      </Typography>
    ))}
    {allItems.length > 3 && (
      <Typography
        variant="caption"
        color="text.secondary"
      >
        +{allItems.length - 3} more
      </Typography>
    )}
  </Stack>
</TableCell>

                    <TableCell>
                      {imgs.length ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                      {first3Imgs.map((src, idx) => (
  <Tooltip
    key={`${a._id}-${idx}`}
    title="Click to open in new tab"
  >
    <Avatar
      variant="rounded"
      sx={{
        width: 34,
        height: 34,
        border: "1px solid",
        borderColor: "divider",
        cursor: "pointer",
        bgcolor: "action.hover",  // ← ADD this
      }}
    >
      <LazyImage
        src={src}
        alt={`thumb-${idx}`}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        placeholder={false}
        onClick={(e) => {
          e.stopPropagation();
          window.open(src, "_blank", "noopener,noreferrer");
        }}
      />
    </Avatar>
  </Tooltip>
))}

                          {moreImgs > 0 && (
                            <Badge badgeContent={`+${moreImgs}`} color="primary">
                              <Avatar
                                variant="rounded"
                                sx={{
                                  width: 34,
                                  height: 34,
                                  border: "1px dashed",
                                  borderColor: "divider",
                                  bgcolor: "background.paper",
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                                onClick={() =>
                                  setGallery({
                                    open: true,
                                    images: imgs,
                                    title: `${a.assetCode} • Images`,
                                  })
                                }
                              >
                                <ImageIcon fontSize="small" />
                              </Avatar>
                            </Badge>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No images
                        </Typography>
                      )}
                    </TableCell>

  <TableCell>
  <Stack spacing={0.5}>
    {!isAssigned ? (
      <Button
        size="small"
        variant="contained"
        onClick={() => setAssignAsset(a)}
      >
        Assign
      </Button>
    ) : (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Assigned
      </Typography>
    )}

    {isAssigned && (
      <Stack spacing={0.25}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <PersonIcon fontSize="small" color="primary" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {a.allocatedTo || a.allottedTo || "-"}
          </Typography>
        </Stack>

        {(a.employeeId || a.emp_id) && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <BadgeIcon fontSize="small" sx={{ fontSize: 14 }} color="action" />
            <Typography variant="caption" color="text.secondary">
              {a.employeeId || a.emp_id}
            </Typography>
          </Stack>
        )}

        {a.issuedDate && (
          <Typography variant="caption" color="text.secondary">
            Issued: {fmtDate(a.issuedDate)}
          </Typography>
        )}
      </Stack>
    )}
  </Stack>
</TableCell>


                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openHistoryDialog(a)}
                        disabled={!a.assetCode}
                      >
                        History
                      </Button>
                    </TableCell>

                 <TableCell sx={{ maxWidth: 220 }}>
  <Stack spacing={0.5}>
    <Stack direction="row" spacing={1} alignItems="center">
      <Switch
        checked={!!a.isFaulty}
        onChange={(_, v) => {
          if (v) {
            setFaultyDialog({
              open: true,
              asset: a,
              value: true,
            });
            setFaultyRemark("");
            setFaultyError("");
          } else {
            toggleFaulty(a._id, false);
          }
        }}
        size="small"
      />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {a.isFaulty ? "Marked Faulty" : "OK"}
      </Typography>
    </Stack>

    {a.isFaulty && a.faultyRemark && (
      <Tooltip title={a.faultyRemark} placement="top">
        <Typography
          variant="caption"
          sx={{
            color: "error.main",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.4,
            cursor: "help",
          }}
        >
          {a.faultyRemark}
        </Typography>
      </Tooltip>
    )}
  </Stack>
</TableCell>

                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => setEditAsset(a)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => del(a)}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}

            {!loadingAssets && !paged.length && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Stack
                    spacing={1}
                    alignItems="center"
                    sx={{ color: "text.secondary" }}
                  >
                    <ImageIcon />
                    <Typography variant="body2">
                      No assets match your filters. Click "Add Asset" to create
                      a new one.
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
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ px: 2 }}
        />
      </TableContainer>

      {/* Add / Edit */}
      <AddEditDialog
        open={addOpen || !!editAsset}
        onClose={() => {
          setAddOpen(false);
          setEditAsset(null);
        }}
        initial={editAsset}
        onSaved={onSaved}
        allAssets={items}
      />

      {/* Assign */}
      <AssignDialog
        open={!!assignAsset}
        onClose={() => setAssignAsset(null)}
        asset={assignAsset}
        employeeList={employeeList}
        loadingEmployees={loadingEmployees}
        onSaveAssign={handleAssignSave}
      />

      {/* Gallery */}
      <ImageGalleryDialog
        open={gallery.open}
        images={gallery.images}
        title={gallery.title}
        onClose={() => setGallery({ open: false, images: [], title: "" })}
      />

      {/* History Dialog */}
      <Dialog
        open={historyDialog.open}
        onClose={closeHistoryDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Asset Journey
          {historyDialog.assetCode ? ` • ${historyDialog.assetCode}` : ""}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          {historyDialog.loading ? (
            <Typography variant="body2">Loading history…</Typography>
          ) : historyDialog.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {historyDialog.error}
            </Alert>
          ) : !historyDialog.rows.length ? (
            <Typography variant="body2" color="text.secondary">
              No history found for this asset.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {historyDialog.rows.map((h, idx) => {
                const empName = h.employee?.fullName || "Unknown Employee";
                const status = h.status || "allocated";
                const isReturned = status === "returned";

                return (
                  <Stack
                    key={h._id || idx}
                    direction="row"
                    spacing={2}
                    alignItems="flex-start"
                  >
                    <Box
                      sx={{
                        pt: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minWidth: 24,
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: "primary.main",
                          mb:
                            idx === historyDialog.rows.length - 1
                              ? 0
                              : 1,
                        }}
                      />
                      {idx !== historyDialog.rows.length - 1 && (
                        <Box
                          sx={{
                            flexGrow: 1,
                            width: 2,
                            bgcolor: "divider",
                          }}
                        />
                      )}
                    </Box>

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        flexGrow: 1,
                        bgcolor: (t) =>
                          t.palette.mode === "light"
                            ? "#fafafa"
                            : "background.paper",
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1}
                      >
                        <Stack spacing={0.25}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700 }}
                          >
                            {empName}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Asset: {h.name} • {h.company} {h.model}
                          </Typography>
                        </Stack>
                        <Chip
                          size="small"
                          label={
                            isReturned
                              ? "Returned"
                              : status.charAt(0).toUpperCase() +
                                status.slice(1)
                          }
                          color={isReturned ? "success" : "primary"}
                          variant={isReturned ? "outlined" : "filled"}
                        />
                      </Stack>

                      <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                        <Stack spacing={0.25}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Date of Assign
                          </Typography>
                          <Typography variant="body2">
                            {fmtDate(h.allottedAt)}
                          </Typography>
                        </Stack>
                        <Stack spacing={0.25}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Date of Collection
                          </Typography>
                          <Typography variant="body2">
                            {h.returnedAt ? fmtDate(h.returnedAt) : "—"}
                          </Typography>
                        </Stack>
                      </Stack>

                      {h.notes && (
                        <Box sx={{ mt: 1 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Remark
                          </Typography>
                          <Typography variant="body2">{h.notes}</Typography>
                        </Box>
                      )}

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        sx={{ mt: 1.5 }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Pics at Assign
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            sx={{ mt: 0.5 }}
                          >
                            {(Array.isArray(h.allotmentImageUrls)
                              ? h.allotmentImageUrls
                              : []
                            ).length ? (
                             h.allotmentImageUrls.map((url, i) => (
  <Avatar
    key={`a-${i}`}
    variant="rounded"
    sx={{
      width: 40,
      height: 40,
      borderRadius: 1.5,
      mr: 0.5,
      mb: 0.5,
      cursor: "pointer",
      bgcolor: "action.hover",  // ← ADD this
    }}
  >
    <LazyImage
      src={url}
      alt={`allotment-${i}`}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      placeholder={false}
      onClick={(e) => {
        e.stopPropagation();
        window.open(url, "_blank", "noopener,noreferrer");
      }}
    />
  </Avatar>
))
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                              >
                                No images
                              </Typography>
                            )}
                          </Stack>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Pics at Collection
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            sx={{ mt: 0.5 }}
                          >
                            {(Array.isArray(h.returnImageUrls)
                              ? h.returnImageUrls
                              : []
                            ).length ? (
                             h.returnImageUrls.map((url, i) => (
  <Avatar
    key={`r-${i}`}
    variant="rounded"
    sx={{
      width: 40,
      height: 40,
      borderRadius: 1.5,
      mr: 0.5,
      mb: 0.5,
      cursor: "pointer",
      bgcolor: "action.hover",  // ← ADD this
    }}
  >
    <LazyImage
      src={url}
      alt={`return-${i}`}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      placeholder={false}
      onClick={(e) => {
        e.stopPropagation();
        window.open(url, "_blank", "noopener,noreferrer");
      }}
    />
  </Avatar>
))
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                              >
                                No images
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </Paper>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={closeHistoryDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack.severity} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>

      {/* Faulty Remark Dialog */}
      <Dialog
        open={faultyDialog.open}
        onClose={() =>
          setFaultyDialog({ open: false, asset: null, value: false })
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Mark Asset as Faulty
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Please add a remark before marking this asset as faulty.
          </Typography>
          <TextField
            label="Faulty Remark"
            multiline
            minRows={3}
            fullWidth
            value={faultyRemark}
            onChange={(e) => {
              setFaultyRemark(e.target.value);
              if (faultyError) setFaultyError("");
            }}
            error={!!faultyError}
            helperText={faultyError}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() =>
              setFaultyDialog({ open: false, asset: null, value: false })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!faultyRemark.trim()) {
                setFaultyError("Remark is required");
                return;
              }
              if (!faultyDialog.asset) return;

              await toggleFaulty(
                faultyDialog.asset._id,
                true,
                faultyRemark.trim()
              );

              setFaultyDialog({ open: false, asset: null, value: false });
            }}
          >
            Save & Mark Faulty
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}




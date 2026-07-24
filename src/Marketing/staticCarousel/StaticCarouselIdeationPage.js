import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Divider,
  FormHelperText,
  InputAdornment,
  TablePagination,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Comment as CommentIcon,
  Search as SearchIcon,
  RestartAlt as ResetIcon,
  AddCircleOutline as AddSlideIcon,
  RemoveCircleOutline as RemoveSlideIcon,
  Collections as CarouselIcon,
  Image as StaticIcon,
} from "@mui/icons-material";
 
const API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/static-carousel`;
const MANAGER_ROLES = ["admin", "manager", "super-admin", "team-leader"];

const getCurrentUser = () => JSON.parse(sessionStorage.getItem("user") || "{}");
const isManagerRole = (role = "") =>
  MANAGER_ROLES.includes(String(role || "").toLowerCase());
const hasFullAccess = (user = {}) => isManagerRole(user.role) || user.hasTeam === true;
const getAuthHeaders = () => ({});

const SCRIPT_TYPES = [
  "Muditam Instagram",
  "Muditam Snooze Well",
  "Muditam infographic",
  "Snooze Well infographic",
  "YouTube",
  "Meta Ads KJF",
  "Meta Ads Liver Fix",
  "Meta Ads International",
  "Meta Ads Others",
  "Google Ads",
  "WhatsApp",
];

const CONTENT_TYPES = ["Static", "Carousel"];
const IDEATION_STATUSES = ["Approved", "Pending", "Rewrite", "Rejected", "On Hold"];
const NEEDS_REASON = new Set(["On Hold", "Rejected"]);

const STATUS_COLORS = {
  Pending: { bg: "#fffbeb", color: "#d97706", border: "#fcd34d" },
  Approved: { bg: "#ecfdf5", color: "#059669", border: "#6ee7b7" },
  Rewrite: { bg: "#f3e8ff", color: "#7e22ce", border: "#d8b4fe" },
  "On Hold": { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
  Rejected: { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
};

const STAGE_COLORS = {
  Ideation: "#6b7280",
  "Shoot Pending": "#d97706",
  "Shoot Done": "#059669",
  "Cut Pending": "#2563eb",
  "Cut Done": "#7e22ce",
  "Edit Pending": "#ea580c",
  "Edit Done": "#059669",
  Post: "#db2777",
};

const lightPaper = {
  bgcolor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 2,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#ffffff",
    "& fieldset": { borderColor: "#d1d5db" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: "#4f46e5" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#4f46e5" },
};

function makeEmptyItem(itemNo = 1) {
  return {
    itemNo,
    description: "",
  };
}

function normalizeItemsForSave(items = []) {
  return items
    .map((item, idx) => ({
      itemNo: idx + 1,
      description: String(item?.description || "").trim(),
    }))
    .filter((x) => x.description);
}

function getItemPreview(item = {}) {
  const parts = [item.description]
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const txt = parts.join(" • ");
  return txt.length > 120 ? txt.slice(0, 120) + "…" : txt || "—";
}

function ContentTypeChip({ type }) {
  const isCarousel = type === "Carousel";
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.6,
        px: 1.1,
        py: 0.35,
        borderRadius: "100px",
        fontSize: "0.74rem",
        fontWeight: 700,
        bgcolor: isCarousel ? "#eef2ff" : "#eff6ff",
        color: isCarousel ? "#4f46e5" : "#2563eb",
        border: isCarousel ? "1px solid #c7d2fe" : "1px solid #bfdbfe",
        whiteSpace: "nowrap",
      }}
    >
      {isCarousel ? <CarouselIcon sx={{ fontSize: 14 }} /> : <StaticIcon sx={{ fontSize: 14 }} />}
      {type}
    </Box>
  );
}

function ShootChip({ hasShoot }) {
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1.1,
        py: 0.35,
        borderRadius: "100px",
        fontSize: "0.74rem",
        fontWeight: 700,
        bgcolor: hasShoot ? "#ecfdf5" : "#f8fafc",
        color: hasShoot ? "#059669" : "#64748b",
        border: hasShoot ? "1px solid #6ee7b7" : "1px solid #e2e8f0",
        whiteSpace: "nowrap",
      }}
    >
      {hasShoot ? "Have a Shoot" : "No Shoot"}
    </Box>
  );
}

function StatusChip({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1.2,
        py: 0.4,
        borderRadius: "100px",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.02em",
        bgcolor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {status || "Pending"}
    </Box>
  );
}

function StageChip({ stage }) {
  const color = STAGE_COLORS[stage] || "#6b7280";
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1,
        py: 0.3,
        borderRadius: 1,
        fontSize: "0.75rem",
        fontWeight: 600,
        bgcolor: `${color}15`,
        color,
        border: `1px solid ${color}40`,
        whiteSpace: "nowrap",
      }}
    >
      {stage}
    </Box>
  );
}

function IdText({ id }) {
  return (
    <Typography
      sx={{
        fontFamily: "'Syne',sans-serif",
        fontWeight: 700,
        fontSize: "0.85rem",
        color: "#4f46e5",
      }}
    >
      {id}
    </Typography>
  );
}

function ApproverCommentCell({ comment }) {
  const [open, setOpen] = useState(false);

  if (!comment?.trim()) {
    return <Typography sx={{ fontSize: "0.78rem", color: "#d1d5db" }}>—</Typography>;
  }

  const short = comment.length > 28 ? comment.slice(0, 28) + "…" : comment;

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography
          sx={{
            fontSize: "0.8rem",
            color: "#475569",
            maxWidth: 150,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {short}
        </Typography>
        <Tooltip title="View full comment" arrow>
          <IconButton
            size="small"
            onClick={() => setOpen(true)}
            sx={{
              color: "#64748b",
              p: "3px",
              "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
            }}
          >
            <ViewIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.2)",
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            pt: 3,
            pb: 2,
            background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
            position: "relative",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                bgcolor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CommentIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                Approver Comment
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                Feedback from reviewer
              </Typography>
            </Box>
          </Stack>

          <IconButton
            size="small"
            onClick={() => setOpen(false)}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              color: "rgba(255,255,255,0.8)",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)", color: "#fff" },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box sx={{ px: 3, py: 3 }}>
          <Box
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              p: 2.5,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.95rem",
                color: "#1e293b",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontStyle: "italic",
              }}
            >
              {comment}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ px: 3, pb: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setOpen(false)}
            sx={{
              bgcolor: "#4f46e5",
              "&:hover": { bgcolor: "#4338ca" },
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              py: 1,
              boxShadow: "none",
            }}
          >
            Close
          </Button>
        </Box>
      </Dialog>
    </>
  );
}

function ContentItemsEditor({ contentType, items, setItems, errors = {} }) {
  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value, itemNo: i + 1 } : item
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, makeEmptyItem(prev.length + 1)]);
  };

  const removeItem = (index) => {
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, idx) => ({ ...item, itemNo: idx + 1 }))
    );
  };

  const isStatic = contentType === "Static";

  return (
    <Box>
      <Box mb={1.2}>
        <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>
          {isStatic ? "Static Image" : "Carousel Images"}
        </Typography>
        <Typography sx={{ fontSize: "0.78rem", color: "#6b7280" }}>
          {isStatic
            ? "Static must have exactly 1 image"
            : "Add as many carousel images as you want"}
        </Typography>
      </Box>

      {errors.contentItems && (
        <Typography sx={{ fontSize: "0.78rem", color: "#dc2626", mb: 1.2 }}>
          {errors.contentItems}
        </Typography>
      )}

      <Stack spacing={2}>
        {items.map((item, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              borderRadius: 2,
              border: "1px solid #e5e7eb",
              boxShadow: "none",
              bgcolor: "#fcfcfd",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={1.5}
            >
              <Typography sx={{ fontWeight: 700, color: "#4f46e5", fontSize: "0.9rem" }}>
                Image {index + 1}
              </Typography>

              {!isStatic && items.length > 2 && (
                <Tooltip title="Remove image">
                  <IconButton
                    size="small"
                    onClick={() => removeItem(index)}
                    sx={{
                      color: "#dc2626",
                      "&:hover": { bgcolor: "#fef2f2" },
                    }}
                  >
                    <RemoveSlideIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            <TextField
              label="Description"
              multiline
              minRows={2}
              value={item.description}
              onChange={(e) => updateItem(index, "description", e.target.value)}
              sx={inputSx}
              fullWidth
            />
          </Paper>
        ))}
      </Stack>

      {!isStatic && (
        <Box mt={2}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddSlideIcon />}
            onClick={addItem}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderColor: "#c7d2fe",
              color: "#4f46e5",
              "&:hover": { borderColor: "#4f46e5", bgcolor: "#eef2ff" },
            }}
          >
            Add Image
          </Button>
        </Box>
      )}
    </Box>
  );
}

function ViewItemsDialog({ open, onClose, item }) {
  if (!item) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "#fff",
          borderRadius: 2,
          boxShadow: "0 25px 50px -12px rgb(0 0 0/0.25)",
        },
      }}
    >
      <DialogTitle
        sx={{
          color: "#0f172a",
          fontWeight: 700,
          borderBottom: "1px solid #e2e8f0",
          py: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
            Full Content
          </Typography>
          <IdText id={item.staticCarouselId} />
          <ContentTypeChip type={item.contentType} />
          <ShootChip hasShoot={item.hasShoot} />
        </Stack>

        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "#64748b", "&:hover": { color: "#0f172a", bgcolor: "#f1f5f9" } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
        <Stack spacing={2}>
          {!!item.title && (
            <Box
              sx={{
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography sx={{ fontSize: "0.8rem", color: "#64748b", mb: 0.5 }}>
                Overall Title
              </Typography>
              <Typography sx={{ fontSize: "0.95rem", color: "#111827", fontWeight: 600 }}>
                {item.title}
              </Typography>
            </Box>
          )}

          {(item.contentItems || []).map((contentItem, index) => (
            <Paper
              key={index}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid #e5e7eb",
                boxShadow: "none",
                bgcolor: "#fcfcfd",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: "#4f46e5",
                  mb: 1.5,
                }}
              >
                Image {index + 1}
              </Typography>

              <Stack spacing={1.2}>
                {!!contentItem.description && (
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Description
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.92rem",
                        color: "#334155",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {contentItem.description}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          ))}

          {item.referenceLink && (
            <Button
              component="a"
              href={item.referenceLink}
              target="_blank"
              startIcon={<LinkIcon />}
              sx={{
                alignSelf: "flex-start",
                color: "#4f46e5",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Open Reference Link
            </Button>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function InlineStatusSelect({ item, reload, toast, openEditWithStatus, canEdit }) {
  const [loading, setLoading] = useState(false);
  const val = item.ideationStatus || "Pending";

  const handleChange = async (e) => {
    const newVal = e.target.value;
    if (!canEdit || !newVal || newVal === val) return;

    if (NEEDS_REASON.has(newVal)) {
      openEditWithStatus(item, newVal);
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `${API}/${item._id}`,
        {
          contentType: item.contentType,
          hasShoot: item.hasShoot,
          scriptType: item.scriptType,
          title: item.title || "",
          contentItems: item.contentItems || [],
          referenceLink: item.referenceLink || "",
          ideationStatus: newVal,
          approverComment: item.approverComment || "",
          holdReason: "",
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      if (newVal === "Approved") {
        toast(
          item.hasShoot
            ? "Approved & moved to Shoot Pending! 🎬"
            : "Approved & moved to Edit Pending! ✨"
        );
      } else {
        toast(`Status updated to ${newVal} ✅`);
      }

      reload();
    } catch (err) {
      toast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) return <StatusChip status={val} />;

  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Box
        component="select"
        value={val}
        onChange={handleChange}
        disabled={loading}
        sx={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: STATUS_COLORS[val]?.color || "#374151",
          bgcolor: STATUS_COLORS[val]?.bg || "#f9fafb",
          border: `1.5px solid ${STATUS_COLORS[val]?.border || "#e5e7eb"}`,
          borderRadius: "100px",
          px: 1.4,
          py: "4px",
          cursor: "pointer",
          outline: "none",
          appearance: "auto",
          "&:hover": { filter: "brightness(0.96)" },
          "&:disabled": { opacity: 0.6, cursor: "not-allowed" },
        }}
      >
        {IDEATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Box>
      {loading && <CircularProgress size={14} sx={{ color: "#4f46e5" }} />}
    </Stack>
  );
}

export default function StaticCarouselIdeationPage() {
  const currentUser = getCurrentUser();
  const isManager = hasFullAccess(currentUser);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [contentTypeFilter, setContentTypeFilter] = useState("");
  const [scriptTypeFilter, setScriptTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hasShootFilter, setHasShootFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    contentType: "Static",
    hasShoot: false,
    scriptType: "",
    title: "",
    referenceLink: "",
  });
  const [createItems, setCreateItems] = useState([makeEmptyItem(1)]);
  const [createErrors, setCreateErrors] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    contentType: "Static",
    hasShoot: false,
    scriptType: "",
    title: "",
    referenceLink: "",
    ideationStatus: "Pending",
    approverComment: "",
    holdReason: "",
  });
  const [editItems, setEditItems] = useState([makeEmptyItem(1)]);
  const [editErrors, setEditErrors] = useState({});

  const [viewOpen, setViewOpen] = useState(false);
  const [viewContent, setViewContent] = useState(null);

  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    severity: "success",
  });
  const showSnack = (msg, severity = "success") =>
    setSnack({ open: true, msg, severity });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        sortBy: "createdAt",
        sortDir: "desc",
      };

      if (contentTypeFilter) params.contentType = contentTypeFilter;
      if (scriptTypeFilter) params.scriptType = scriptTypeFilter;
      if (statusFilter) params.ideationStatus = statusFilter;
      if (search.trim()) params.q = search.trim();
      if (hasShootFilter !== "") params.hasShoot = hasShootFilter;

      const { data } = await axios.get(API, {
        params,
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      setItems(data.staticCarousels || []);
      setTotal(data.pagination?.total ?? (data.staticCarousels || []).length);
    } catch (e) {
      showSnack(e.response?.data?.message || "Failed to load items", "error");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, contentTypeFilter, scriptTypeFilter, statusFilter, search, hasShootFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const applySearch = () => {
    setSearch(searchDraft);
    setPage(0);
  };

  const clearSearch = () => {
    setSearchDraft("");
    setSearch("");
    setContentTypeFilter("");
    setScriptTypeFilter("");
    setStatusFilter("");
    setHasShootFilter("");
    setPage(0);
  };

  const resetCreateForm = () => {
    setCreateForm({
      contentType: "Static",
      hasShoot: false,
      scriptType: "",
      title: "",
      referenceLink: "",
    });
    setCreateItems([makeEmptyItem(1)]);
    setCreateErrors({});
  };

  const openCreate = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const validateItems = (contentType, formItems) => {
    const normalized = normalizeItemsForSave(formItems);

    if (contentType === "Static" && normalized.length !== 1) {
      return "Static must have exactly 1 image";
    }

    if (contentType === "Carousel" && normalized.length < 2) {
      return "Carousel must have at least 2 images with description";
    }

    return "";
  };

  const validateCreate = () => {
    const errs = {};
    if (!createForm.contentType) errs.contentType = "Required";
    if (!createForm.scriptType) errs.scriptType = "Required";

    const itemsErr = validateItems(createForm.contentType, createItems);
    if (itemsErr) errs.contentItems = itemsErr;

    setCreateErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;

    try {
      const payload = {
        ...createForm,
        contentItems: normalizeItemsForSave(createItems),
      };

      const { data } = await axios.post(API, payload, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      showSnack(`Item ${data.staticCarousel?.staticCarouselId} created!`);
      setCreateOpen(false);
      setPage(0);
      load();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const openEdit = (item, prefillStatus = null) => {
    setEditTarget(item);
    setEditForm({
      contentType: item.contentType,
      hasShoot: !!item.hasShoot,
      scriptType: item.scriptType,
      title: item.title || "",
      referenceLink: item.referenceLink || "",
      ideationStatus: prefillStatus || item.ideationStatus || "Pending",
      approverComment: item.approverComment || "",
      holdReason: item.holdReason || "",
    });
    setEditItems(
      item.contentItems?.length
        ? item.contentItems.map((x, idx) => ({ ...makeEmptyItem(idx + 1), ...x, itemNo: idx + 1 }))
        : [makeEmptyItem(1)]
    );
    setEditErrors({});
    setEditOpen(true);
  };

  const validateEdit = () => {
    const errs = {};
    if (!editForm.contentType) errs.contentType = "Required";
    if (!editForm.scriptType) errs.scriptType = "Required";

    const itemsErr = validateItems(editForm.contentType, editItems);
    if (itemsErr) errs.contentItems = itemsErr;

    if (NEEDS_REASON.has(editForm.ideationStatus) && !editForm.holdReason?.trim()) {
      errs.holdReason = "Reason required";
    }

    setEditErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleEdit = async () => {
    if (!validateEdit()) return;

    try {
      await axios.put(
        `${API}/${editTarget._id}`,
        {
          ...editForm,
          contentItems: normalizeItemsForSave(editItems),
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      if (editForm.ideationStatus === "Approved" && editTarget.ideationStatus !== "Approved") {
        showSnack(
          editForm.hasShoot
            ? "Approved & moved to Shoot Pending! 🎬"
            : "Approved & moved to Edit Pending! ✨"
        );
      } else {
        showSnack("Item updated!");
      }

      setEditOpen(false);
      load();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;

    try {
      await axios.delete(`${API}/${id}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      showSnack("Deleted");

      if (items.length === 1 && page > 0) setPage((p) => p - 1);
      else load();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const canEditItem = (item) => isManager || item.createdBy === currentUser?.fullName;
  const colCount = isManager ? 12 : 11;

  return (
    <Box sx={{ bgcolor: "#f4f5f7", minHeight: "100vh", color: "#111827", p: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: "1.8rem",
              letterSpacing: "-0.5px",
              color: "#111827",
            }}
          >
            Static / Carousel <Box component="span" sx={{ color: "#4f46e5" }}>Ideation</Box>
          </Typography>

          <Typography sx={{ color: "#6b7280", fontSize: "0.9rem", mt: 0.5 }}>
            {loading ? "Loading…" : `${total} item${total !== 1 ? "s" : ""}`}
            {currentUser?.fullName && (
              <Box component="span" sx={{ ml: 1.5, color: "#9ca3af" }}>
                — logged in as{" "}
                <Box component="span" sx={{ color: "#4f46e5", fontWeight: 500 }}>
                  {currentUser.fullName}
                </Box>
                {isManager && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 1,
                      py: 0.2,
                      borderRadius: "100px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      bgcolor: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #6ee7b7",
                    }}
                  >
                    Manager
                  </Box>
                )}
              </Box>
            )}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{
            bgcolor: "#4f46e5",
            "&:hover": { bgcolor: "#4338ca" },
            borderRadius: 2,
            fontWeight: 600,
            textTransform: "none",
            px: 3,
            py: 1,
            boxShadow: "0 4px 6px -1px rgba(79,70,229,0.2)",
          }}
        >
          Add Ideation
        </Button>
      </Stack>

      <Paper sx={{ ...lightPaper, p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
          <FormControl size="small" sx={{ minWidth: 180, ...inputSx }}>
            <InputLabel>Content Type</InputLabel>
            <Select
              value={contentTypeFilter}
              label="Content Type"
              onChange={(e) => {
                setContentTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {CONTENT_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220, ...inputSx }}>
            <InputLabel>Platform</InputLabel>
            <Select
              value={scriptTypeFilter}
              label="Platform"
              onChange={(e) => {
                setScriptTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {SCRIPT_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180, ...inputSx }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {IDEATION_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 170, ...inputSx }}>
            <InputLabel>Have a Shoot</InputLabel>
            <Select
              value={hasShootFilter}
              label="Have a Shoot"
              onChange={(e) => {
                setHasShootFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Search (ID / description / creator)"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            sx={{ minWidth: 320, ...inputSx }}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ flex: 1 }} />

          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={applySearch}
            sx={{
              bgcolor: "#4f46e5",
              "&:hover": { bgcolor: "#4338ca" },
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Apply
          </Button>

          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={clearSearch}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderColor: "#d1d5db",
              color: "#374151",
              "&:hover": { borderColor: "#9ca3af" },
            }}
          >
            Clear
          </Button>

          <Button onClick={load} sx={{ textTransform: "none", fontWeight: 700, color: "#4f46e5" }}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Paper sx={lightPaper}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    color: "#4b5563",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                    bgcolor: "#f9fafb",
                    py: 2,
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell>#</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Content Type</TableCell>
                <TableCell>Shoot</TableCell>
                <TableCell>Script Type</TableCell>
                <TableCell>Preview</TableCell>
                <TableCell>Images</TableCell>
                {isManager && <TableCell>Created By</TableCell>}
                <TableCell>Date / Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Approver Comment</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colCount} align="center" sx={{ py: 8, borderBottom: "none" }}>
                    <CircularProgress size={32} sx={{ color: "#4f46e5" }} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} align="center" sx={{ py: 8, borderBottom: "none", color: "#6b7280" }}>
                    No ideation items found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, i) => {
                  const dt = new Date(item.createdAt);
                  const canEdit = canEditItem(item);
                  const firstItem = item.contentItems?.[0] || {};

                  return (
                    <TableRow
                      key={item._id}
                      sx={{
                        "&:hover td": { bgcolor: "#f9fafb" },
                        "& td": { borderBottom: "1px solid #f3f4f6", py: 1.5 },
                      }}
                    >
                      <TableCell sx={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                        {page * rowsPerPage + i + 1}
                      </TableCell>

                      <TableCell>
                        <IdText id={item.staticCarouselId} />
                      </TableCell>

                      <TableCell>
                        <ContentTypeChip type={item.contentType} />
                      </TableCell>

                      <TableCell>
                        <ShootChip hasShoot={item.hasShoot} />
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: "0.8rem", color: "#4b5563", fontWeight: 500 }}>
                          {item.scriptType}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 280 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography
                            sx={{
                              fontSize: "0.85rem",
                              color: "#475569",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                          >
                            {getItemPreview(firstItem)}
                          </Typography>

                          <Tooltip title="View Full Content">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setViewContent(item);
                                setViewOpen(true);
                              }}
                              sx={{ color: "#64748b", "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
                            >
                              <ViewIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: "0.8rem", color: "#334155", fontWeight: 600 }}>
                          {item.contentItems?.length || 0}
                        </Typography>
                      </TableCell>

                      {isManager && (
                        <TableCell>
                          <Typography sx={{ fontSize: "0.8rem", color: "#4b5563" }}>
                            {item.createdBy}
                          </Typography>
                        </TableCell>
                      )}

                      <TableCell>
                        <Typography sx={{ fontSize: "0.8rem", color: "#1f2937", whiteSpace: "nowrap" }}>
                          {dt.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          {dt.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <InlineStatusSelect
                          item={item}
                          reload={load}
                          toast={showSnack}
                          openEditWithStatus={openEdit}
                          canEdit={isManager}
                        />
                      </TableCell>

                      <TableCell>
                        <StageChip stage={item.stage} />
                      </TableCell>

                      <TableCell sx={{ maxWidth: 220 }}>
                        <ApproverCommentCell comment={item.approverComment} />
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                          {item.referenceLink && (
                            <Tooltip title="Reference link">
                              <IconButton
                                size="small"
                                href={item.referenceLink}
                                target="_blank"
                                sx={{ color: "#6b7280", "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
                              >
                                <LinkIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {canEdit && (
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => openEdit(item)}
                                sx={{ color: "#6b7280", "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
                              >
                                <EditIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {canEdit && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(item._id)}
                                sx={{ color: "#6b7280", "&:hover": { color: "#dc2626", bgcolor: "#fef2f2" } }}
                              >
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {!canEdit && !item.referenceLink && (
                            <Typography sx={{ fontSize: "0.75rem", color: "#d1d5db" }}>—</Typography>
                          )}
                        </Stack>
                      </TableCell>
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
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100, 200]}
        />
      </Paper>

      <ViewItemsDialog
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewContent(null);
        }}
        item={viewContent}
      />

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#fff",
            borderRadius: 3,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "#111827",
            fontFamily: "'Syne',sans-serif",
            fontWeight: 700,
            borderBottom: "1px solid #e5e7eb",
            pb: 2,
          }}
        >
          Add Static / Carousel Ideation
        </DialogTitle>

        <DialogContent sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <Box
            sx={{
              bgcolor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 1.5,
              px: 2,
              py: 1.2,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981" }} />
            <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>
              Created by:{" "}
              <Box component="span" sx={{ color: "#111827", fontWeight: 600 }}>
                {currentUser?.fullName}
              </Box>
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl size="small" error={!!createErrors.contentType} sx={{ flex: 1, ...inputSx }}>
              <InputLabel>Content Type *</InputLabel>
              <Select
                value={createForm.contentType}
                label="Content Type *"
                onChange={(e) => {
                  const value = e.target.value;
                  setCreateForm((f) => ({ ...f, contentType: value }));
                  setCreateItems(value === "Static" ? [makeEmptyItem(1)] : [makeEmptyItem(1), makeEmptyItem(2)]);
                }}
              >
                {CONTENT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
              {createErrors.contentType && <FormHelperText>{createErrors.contentType}</FormHelperText>}
            </FormControl>

            <FormControl size="small" error={!!createErrors.scriptType} sx={{ flex: 1, ...inputSx }}>
              <InputLabel>Platform *</InputLabel>
              <Select
                value={createForm.scriptType}
                label="Platform *"
                onChange={(e) => setCreateForm((f) => ({ ...f, scriptType: e.target.value }))}
              >
                {SCRIPT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
              {createErrors.scriptType && <FormHelperText>{createErrors.scriptType}</FormHelperText>}
            </FormControl>
          </Stack>

          <FormControlLabel
            control={
              <Checkbox
                checked={createForm.hasShoot}
                onChange={(e) => setCreateForm((f) => ({ ...f, hasShoot: e.target.checked }))}
              />
            }
            label="Have a Shoot"
          />

          <ContentItemsEditor
            contentType={createForm.contentType}
            items={createItems}
            setItems={setCreateItems}
            errors={createErrors}
          />

          <TextField
            label="Reference Link (optional)"
            placeholder="https://..."
            size="small"
            value={createForm.referenceLink}
            onChange={(e) => setCreateForm((f) => ({ ...f, referenceLink: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e5e7eb", gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: "#4b5563", textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{
              bgcolor: "#4f46e5",
              "&:hover": { bgcolor: "#4338ca" },
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              boxShadow: "none",
            }}
          >
            Save Ideation
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#fff",
            borderRadius: 3,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "#111827",
            fontFamily: "'Syne',sans-serif",
            fontWeight: 700,
            borderBottom: "1px solid #e5e7eb",
            pb: 2,
          }}
        >
          Edit Ideation
          {editTarget && (
            <Box
              component="span"
              sx={{
                ml: 1.5,
                fontSize: "0.85rem",
                color: "#4f46e5",
                fontFamily: "monospace",
                fontWeight: 500,
              }}
            >
              {editTarget.staticCarouselId}
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl size="small" error={!!editErrors.contentType} sx={{ flex: 1, ...inputSx }}>
              <InputLabel>Content Type *</InputLabel>
              <Select
                value={editForm.contentType}
                label="Content Type *"
                onChange={(e) => {
                  const value = e.target.value;
                  setEditForm((f) => ({ ...f, contentType: value }));

                  setEditItems((prev) => {
                    if (value === "Static") {
                      const first = prev[0] || makeEmptyItem(1);
                      return [{ ...first, itemNo: 1 }];
                    }
                    if (prev.length >= 2) return prev;
                    return [...prev, makeEmptyItem(2)];
                  });
                }}
              >
                {CONTENT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
              {editErrors.contentType && <FormHelperText>{editErrors.contentType}</FormHelperText>}
            </FormControl>

            <FormControl size="small" error={!!editErrors.scriptType} sx={{ flex: 1, ...inputSx }}>
              <InputLabel>Script Type *</InputLabel>
              <Select
                value={editForm.scriptType}
                label="Script Type *"
                onChange={(e) => setEditForm((f) => ({ ...f, scriptType: e.target.value }))}
              >
                {SCRIPT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
              {editErrors.scriptType && <FormHelperText>{editErrors.scriptType}</FormHelperText>}
            </FormControl>
          </Stack>

          <FormControlLabel
            control={
              <Checkbox
                checked={editForm.hasShoot}
                onChange={(e) => setEditForm((f) => ({ ...f, hasShoot: e.target.checked }))}
              />
            }
            label="Have a Shoot"
          />

          <TextField
            label="Overall Title"
            size="small"
            value={editForm.title}
            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
            sx={inputSx}
          />

          <ContentItemsEditor
            contentType={editForm.contentType}
            items={editItems}
            setItems={setEditItems}
            errors={editErrors}
          />

          <TextField
            label="Reference Link"
            size="small"
            value={editForm.referenceLink}
            onChange={(e) => setEditForm((f) => ({ ...f, referenceLink: e.target.value }))}
            sx={inputSx}
          />

          {isManager && (
            <>
              <Divider sx={{ borderColor: "#e5e7eb" }} />

              <FormControl size="small" sx={inputSx}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editForm.ideationStatus || "Pending"}
                  label="Status"
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      ideationStatus: e.target.value,
                      holdReason: "",
                    }))
                  }
                >
                  {IDEATION_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {NEEDS_REASON.has(editForm.ideationStatus) && (
                <TextField
                  label={`Reason for "${editForm.ideationStatus}" *`}
                  multiline
                  minRows={2}
                  value={editForm.holdReason || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, holdReason: e.target.value }))}
                  error={!!editErrors.holdReason}
                  helperText={editErrors.holdReason}
                  sx={inputSx}
                />
              )}

              <TextField
                label="Approver Comment"
                multiline
                minRows={2}
                value={editForm.approverComment || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, approverComment: e.target.value }))}
                sx={inputSx}
              />
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e5e7eb", gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: "#4b5563", textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEdit}
            sx={{
              bgcolor: "#4f46e5",
              "&:hover": { bgcolor: "#4338ca" },
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              boxShadow: "none",
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", borderRadius: 2 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

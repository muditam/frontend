import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
  FormControlLabel,
  Checkbox,
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
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  ArrowForward as ArrowIcon,
  Videocam as ShootIcon,
  ContentCut as CutIcon,
  Movie as EditStageIcon,
  Publish as PostIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Comment as CommentIcon,
  Search as SearchIcon,
  RestartAlt as ResetIcon,
  Campaign as CampaignIcon,
} from "@mui/icons-material";

const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/ads-videos";
const MANAGER_ROLES = ["admin", "manager", "super-admin", "team-leader"];

const getCurrentUser = () => JSON.parse(sessionStorage.getItem("user") || "{}");
const isManagerRole = (role = "") =>
  MANAGER_ROLES.includes(String(role || "").toLowerCase());
const hasFullAccess = (user = {}) =>
  isManagerRole(user.role) || user.hasTeam === true;
const getAuthHeaders = () => ({
  "x-session-user": JSON.stringify(getCurrentUser()),
});

const AD_TYPES = [
  "Meta Ads",
  "Google Ads",
  "YouTube Ads",
  "WhatsApp Ads",
  "Other Ads",
];

const IDEATION_STATUSES = ["Pending", "Approved", "Rewrite", "On Hold", "Rejected"];
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

const NAV_ACCENT = {
  Shoot: { base: "#f59e0b", light: "#fffbeb", border: "#fde68a", text: "#92400e" },
  Cut: { base: "#8b5cf6", light: "#f5f3ff", border: "#ddd6fe", text: "#4c1d95" },
  Edit: { base: "#ea580c", light: "#fff7ed", border: "#fed7aa", text: "#7c2d12" },
  Post: { base: "#db2777", light: "#fdf2f8", border: "#fbcfe8", text: "#831843" },
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

function CountBadge({ count, accent }) {
  if (count === null || count === undefined) return null;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 20,
        px: 0.7,
        borderRadius: "100px",
        fontSize: "0.7rem",
        fontWeight: 800,
        bgcolor: accent.base,
        color: "#fff",
        ml: 0.8,
        lineHeight: 1,
      }}
    >
      {count}
    </Box>
  );
}

function NavButton({ label, icon, accent, count, onClick }) {
  return (
    <Button
      variant="outlined"
      startIcon={icon}
      onClick={onClick}
      sx={{
        borderColor: accent.border,
        color: accent.text,
        bgcolor: accent.light,
        textTransform: "none",
        fontWeight: 600,
        fontSize: "0.85rem",
        px: 1.8,
        "&:hover": {
          borderColor: accent.base,
          bgcolor: accent.light,
          boxShadow: `0 0 0 2px ${accent.border}`,
        },
      }}
    >
      {label}
      <CountBadge count={count} accent={accent} />
    </Button>
  );
}

function AdsId({ id }) {
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

function HasShootChip({ hasShoot }) {
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1,
        py: 0.35,
        borderRadius: "100px",
        fontSize: "0.75rem",
        fontWeight: 700,
        bgcolor: hasShoot ? "#ecfdf5" : "#f3f4f6",
        color: hasShoot ? "#059669" : "#6b7280",
        border: hasShoot ? "1px solid #6ee7b7" : "1px solid #d1d5db",
        whiteSpace: "nowrap",
      }}
    >
      {hasShoot ? "Yes" : "No"}
    </Box>
  );
}

function ApproverCommentCell({ comment }) {
  const [open, setOpen] = useState(false);

  if (!comment?.trim()) {
    return <Typography sx={{ fontSize: "0.78rem", color: "#d1d5db" }}>—</Typography>;
  }

  const short = comment.length > 28 ? `${comment.slice(0, 28)}…` : comment;

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
            sx={{ color: "#64748b", p: "3px", "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" } }}
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
        PaperProps={{ sx: { borderRadius: 3 } }}
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
              <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                Approver Comment
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", mt: 0.2 }}>
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
          <Box sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2, p: 2.5 }}>
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

function previewText(text, max = 140) {
  const txt = String(text || "").replace(/\s+/g, " ").trim();
  return txt.length > max ? `${txt.slice(0, max)}…` : txt;
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
          adType: item.adType,
          title: item.title,
          ideaText: item.ideaText,
          referenceLink: item.referenceLink || "",
          hasShoot: item.hasShoot,
          ideationStatus: newVal,
          approverComment: item.approverComment || "",
          holdReason: "",
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      if (newVal === "Approved" && item.stage === "Ideation") {
        await axios.post(
          `${API}/${item._id}/proceed-after-approval`,
          {},
          { headers: getAuthHeaders(), withCredentials: true }
        );

        toast(
          item.hasShoot
            ? "Approved & moved to Shoot Pending! 🎬"
            : "Approved & moved to Edit Pending! ✅"
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

export default function AdsIdeationPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isManager = hasFullAccess(currentUser);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [adTypeFilter, setAdTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hasShootFilter, setHasShootFilter] = useState("");

  const [stageCounts, setStageCounts] = useState({
    shoot: null,
    cut: null,
    edit: null,
    post: null,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    adType: "",
    title: "",
    ideaText: "",
    referenceLink: "",
    hasShoot: true,
  });
  const [createErrors, setCreateErrors] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
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
        stage: "Ideation",
      };

      if (adTypeFilter) params.adType = adTypeFilter;
      if (statusFilter) params.ideationStatus = statusFilter;
      if (search.trim()) params.q = search.trim();
      if (hasShootFilter !== "") params.hasShoot = hasShootFilter;

      const { data } = await axios.get(API, {
        params,
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      setItems(data.adsVideos || []);
      setTotal(data.pagination?.total ?? (data.adsVideos || []).length);
    } catch (e) {
      showSnack(e.response?.data?.message || "Failed to load ads ideation", "error");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, adTypeFilter, statusFilter, hasShootFilter, search]);

  const loadCounts = useCallback(async () => {
    if (!isManager) return;
    try {
      const base = { limit: 1, sortBy: "createdAt", sortDir: "desc" };

      const [shootPending, shootDone, cutDone, editPending, editDone] = await Promise.all([
        axios.get(API, {
          params: { ...base, stage: "Shoot Pending" },
          headers: getAuthHeaders(),
          withCredentials: true,
        }),
        axios.get(API, {
          params: { ...base, stage: "Shoot Done" },
          headers: getAuthHeaders(),
          withCredentials: true,
        }),
        axios.get(API, {
          params: { ...base, stage: "Cut Done" },
          headers: getAuthHeaders(),
          withCredentials: true,
        }),
        axios.get(API, {
          params: { ...base, stage: "Edit Pending" },
          headers: getAuthHeaders(),
          withCredentials: true,
        }),
        axios.get(API, {
          params: { ...base, stage: "Edit Done" },
          headers: getAuthHeaders(),
          withCredentials: true,
        }),
      ]);

      setStageCounts({
        shoot: shootPending.data.pagination?.total ?? 0,
        cut:
          (shootDone.data.pagination?.total ?? 0) +
          (cutDone.data.pagination?.total ?? 0),
        edit:
          (cutDone.data.pagination?.total ?? 0) +
          (editPending.data.pagination?.total ?? 0),
        post: editDone.data.pagination?.total ?? 0,
      });
    } catch {}
  }, [isManager]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const applySearch = () => {
    setSearch(searchDraft);
    setPage(0);
  };

  const clearSearch = () => {
    setSearchDraft("");
    setSearch("");
    setAdTypeFilter("");
    setStatusFilter("");
    setHasShootFilter("");
    setPage(0);
  };

  const openCreate = () => {
    setCreateForm({
      adType: "",
      title: "",
      ideaText: "",
      referenceLink: "",
      hasShoot: true,
    });
    setCreateErrors({});
    setCreateOpen(true);
  };

  const validateCreate = () => {
    const errs = {};
    if (!createForm.adType) errs.adType = "Required";
    if (!createForm.title?.trim()) errs.title = "Required";
    if (!createForm.ideaText?.trim()) errs.ideaText = "Required";
    setCreateErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    try {
      const { data } = await axios.post(API, createForm, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      showSnack(`Ad idea ${data.adsVideo.adsVideoId} created!`);
      setCreateOpen(false);
      setPage(0);
      load();
      loadCounts();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const openEdit = (item, prefillStatus = null) => {
    setEditTarget(item);
    setEditForm({
      adType: item.adType,
      title: item.title,
      ideaText: item.ideaText,
      referenceLink: item.referenceLink || "",
      hasShoot: !!item.hasShoot,
      ideationStatus: prefillStatus || item.ideationStatus || "Pending",
      approverComment: item.approverComment || "",
      holdReason: item.holdReason || "",
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const validateEdit = () => {
    const errs = {};
    if (!editForm.adType) errs.adType = "Required";
    if (!editForm.title?.trim()) errs.title = "Required";
    if (!editForm.ideaText?.trim()) errs.ideaText = "Required";
    if (NEEDS_REASON.has(editForm.ideationStatus) && !editForm.holdReason?.trim()) {
      errs.holdReason = "Reason required";
    }
    setEditErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleEdit = async () => {
    if (!validateEdit()) return;
    try {
      await axios.put(`${API}/${editTarget._id}`, editForm, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      showSnack("Ad idea updated!");
      setEditOpen(false);
      load();
      loadCounts();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const handleApproveAndMove = async () => {
    if (!editTarget || !validateEdit()) return;
    try {
      await axios.put(
        `${API}/${editTarget._id}`,
        {
          ...editForm,
          ideationStatus: "Approved",
          holdReason: "",
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      await axios.post(
        `${API}/${editTarget._id}/proceed-after-approval`,
        {},
        { headers: getAuthHeaders(), withCredentials: true }
      );

      showSnack(
        editForm.hasShoot
          ? "Approved & moved to Shoot Pending! 🎬"
          : "Approved & moved to Edit Pending! ✅"
      );

      setEditOpen(false);
      load();
      loadCounts();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this ad idea?")) return;
    try {
      await axios.delete(`${API}/${id}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      showSnack("Deleted");

      if (items.length === 1 && page > 0) setPage((p) => p - 1);
      else load();

      loadCounts();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const canEditItem = (item) => isManager || item.createdBy === currentUser?.fullName;
  const needsReason = NEEDS_REASON.has(editForm.ideationStatus);
  const canProceed =
    editForm.ideationStatus === "Approved" && editTarget?.stage === "Ideation";

  const colCount = isManager ? 11 : 10;

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
            Ads <Box component="span" sx={{ color: "#4f46e5" }}>Ideation</Box>
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

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          {isManager && (
            <>
              <NavButton
                label="Shoot"
                icon={<ShootIcon sx={{ fontSize: 16 }} />}
                accent={NAV_ACCENT.Shoot}
                count={stageCounts.shoot}
                onClick={() => navigate("/marketing/ads/shoot")}
              />
              <NavButton
                label="Cut"
                icon={<CutIcon sx={{ fontSize: 16 }} />}
                accent={NAV_ACCENT.Cut}
                count={stageCounts.cut}
                onClick={() => navigate("/marketing/ads/cut")}
              />
              <NavButton
                label="Edit"
                icon={<EditStageIcon sx={{ fontSize: 16 }} />}
                accent={NAV_ACCENT.Edit}
                count={stageCounts.edit}
                onClick={() => navigate("/marketing/ads/edit")}
              />
              <NavButton
                label="Post"
                icon={<PostIcon sx={{ fontSize: 16 }} />}
                accent={NAV_ACCENT.Post}
                count={stageCounts.post}
                onClick={() => navigate("/marketing/ads/post")}
              />
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: "#e2e8f0" }} />
            </>
          )}

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
            Add Ad Idea
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ ...lightPaper, p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
          <FormControl size="small" sx={{ minWidth: 220, ...inputSx }}>
            <InputLabel>Ad Type</InputLabel>
            <Select
              value={adTypeFilter}
              label="Ad Type"
              onChange={(e) => {
                setAdTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Ad Types</MenuItem>
              {AD_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220, ...inputSx }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Statuses</MenuItem>
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
            label="Search (Title / Idea / ID / Link)"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            sx={{ minWidth: 340, ...inputSx }}
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
                <TableCell>Ads ID</TableCell>
                <TableCell>Ad Type</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Idea Preview</TableCell>
                <TableCell>Have Shoot</TableCell>
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
                    No ads ideation found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, i) => {
                  const dt = new Date(item.createdAt);
                  const canEdit = canEditItem(item);

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
                        <AdsId id={item.adsVideoId} />
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: "0.8rem", color: "#4b5563", fontWeight: 500 }}>
                          {item.adType}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            color: "#111827",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 320 }}>
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
                            {previewText(item.ideaText, 150)}
                          </Typography>

                          <Tooltip title="View Full Idea">
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
                        <HasShootChip hasShoot={!!item.hasShoot} />
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
                          {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
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
                            <Tooltip title="Edit Idea">
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

      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        maxWidth="sm"
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
          <Stack direction="row" alignItems="center" gap={1}>
            <CampaignIcon sx={{ color: "#4f46e5" }} />
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Full Ads Idea
            </Typography>
          </Stack>

          <IconButton
            size="small"
            onClick={() => setViewOpen(false)}
            sx={{ color: "#64748b", "&:hover": { color: "#0f172a", bgcolor: "#f1f5f9" } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
          {viewContent && (
            <Box>
              <Stack direction="row" spacing={1.5} mb={2.5} alignItems="center" flexWrap="wrap">
                <AdsId id={viewContent.adsVideoId} />
                <Box
                  sx={{
                    display: "inline-block",
                    px: 1.2,
                    py: 0.3,
                    borderRadius: "100px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    bgcolor: "#eef2ff",
                    color: "#4f46e5",
                    border: "1px solid #c7d2fe",
                  }}
                >
                  {viewContent.adType}
                </Box>
                <HasShootChip hasShoot={!!viewContent.hasShoot} />
              </Stack>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mb: 0.5 }}>
                  Title
                </Typography>
                <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
                  {viewContent.title}
                </Typography>
              </Box>

              <Box sx={{ bgcolor: "#f8fafc", p: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Typography
                  sx={{
                    fontSize: "0.95rem",
                    color: "#334155",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {viewContent.ideaText}
                </Typography>
              </Box>

              {viewContent.referenceLink && (
                <Button
                  component="a"
                  href={viewContent.referenceLink}
                  target="_blank"
                  startIcon={<LinkIcon />}
                  sx={{ mt: 2, color: "#4f46e5", textTransform: "none", fontWeight: 600 }}
                >
                  Open Reference Link
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#fff", borderRadius: 3 } }}
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
          Add New Ad Idea
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

          <FormControl size="small" error={!!createErrors.adType} sx={inputSx}>
            <InputLabel>Ad Type *</InputLabel>
            <Select
              value={createForm.adType}
              label="Ad Type *"
              onChange={(e) => setCreateForm((f) => ({ ...f, adType: e.target.value }))}
            >
              {AD_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
            {createErrors.adType && <FormHelperText>{createErrors.adType}</FormHelperText>}
          </FormControl>

          <TextField
            label="Title *"
            size="small"
            value={createForm.title}
            onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
            error={!!createErrors.title}
            helperText={createErrors.title}
            sx={inputSx}
          />

          <TextField
            label="Idea / Script *"
            multiline
            minRows={6}
            value={createForm.ideaText}
            onChange={(e) => setCreateForm((f) => ({ ...f, ideaText: e.target.value }))}
            error={!!createErrors.ideaText}
            helperText={createErrors.ideaText}
            sx={inputSx}
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

          <Box
            sx={{
              border: "1px solid #e5e7eb",
              borderRadius: 2,
              px: 1.5,
              py: 1,
              bgcolor: "#fcfcfd",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={createForm.hasShoot}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, hasShoot: e.target.checked }))
                  }
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>
                    Have a Shoot
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#6b7280" }}>
                    If unchecked, this ads idea will skip Shoot and Cut, and go directly to Edit after approval.
                  </Typography>
                </Box>
              }
            />
          </Box>
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
            Save Ad Idea
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#fff", borderRadius: 3 } }}
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
          Edit Ad Idea
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
              {editTarget.adsVideoId}
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <FormControl size="small" error={!!editErrors.adType} sx={inputSx}>
            <InputLabel>Ad Type *</InputLabel>
            <Select
              value={editForm.adType || ""}
              label="Ad Type *"
              onChange={(e) => setEditForm((f) => ({ ...f, adType: e.target.value }))}
            >
              {AD_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
            {editErrors.adType && <FormHelperText>{editErrors.adType}</FormHelperText>}
          </FormControl>

          <TextField
            label="Title *"
            size="small"
            value={editForm.title || ""}
            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
            error={!!editErrors.title}
            helperText={editErrors.title}
            sx={inputSx}
          />

          <TextField
            label="Idea / Script *"
            multiline
            minRows={6}
            value={editForm.ideaText || ""}
            onChange={(e) => setEditForm((f) => ({ ...f, ideaText: e.target.value }))}
            error={!!editErrors.ideaText}
            helperText={editErrors.ideaText}
            sx={inputSx}
          />

          <TextField
            label="Reference Link"
            size="small"
            value={editForm.referenceLink || ""}
            onChange={(e) => setEditForm((f) => ({ ...f, referenceLink: e.target.value }))}
            sx={inputSx}
          />

          <Box
            sx={{
              border: "1px solid #e5e7eb",
              borderRadius: 2,
              px: 1.5,
              py: 1,
              bgcolor: "#fcfcfd",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!editForm.hasShoot}
                  disabled={editTarget?.stage !== "Ideation"}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, hasShoot: e.target.checked }))
                  }
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>
                    Have a Shoot
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#6b7280" }}>
                    {editTarget?.stage === "Ideation"
                      ? "If unchecked, this item will skip Shoot and Cut after approval."
                      : "Have a Shoot can only be changed while still in Ideation."}
                  </Typography>
                </Box>
              }
            />
          </Box>

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

              {needsReason && (
                <TextField
                  label={`Reason for "${editForm.ideationStatus}" *`}
                  multiline
                  minRows={2}
                  value={editForm.holdReason || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, holdReason: e.target.value }))
                  }
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
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, approverComment: e.target.value }))
                }
                sx={inputSx}
              />
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            borderTop: "1px solid #e5e7eb",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button onClick={() => setEditOpen(false)} sx={{ color: "#4b5563", textTransform: "none" }}>
            Cancel
          </Button>

          <Button
            variant="outlined"
            onClick={handleEdit}
            sx={{
              borderColor: "#d1d5db",
              color: "#374151",
              textTransform: "none",
              "&:hover": {
                borderColor: "#4f46e5",
                color: "#4f46e5",
                bgcolor: "#f5f3ff",
              },
            }}
          >
            Save Changes
          </Button>

          {canProceed && (
            <Button
              variant="contained"
              endIcon={<ArrowIcon />}
              onClick={handleApproveAndMove}
              sx={{
                bgcolor: "#10b981",
                color: "#fff",
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "none",
                "&:hover": { bgcolor: "#059669" },
              }}
            >
              {editForm.hasShoot ? "Approve & Move to Shoot" : "Approve & Move to Edit"}
            </Button>
          )}
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
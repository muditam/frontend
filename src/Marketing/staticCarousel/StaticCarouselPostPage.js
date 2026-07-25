import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Tabs,
  Tab,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  TablePagination,
} from "@mui/material";
import {
  Close as CloseIcon,
  Send as SendIcon,
  Inbox as InboxIcon,
  RocketLaunch as RocketIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  RestartAlt as ResetIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Collections as CarouselIcon,
  Image as StaticIcon,
} from "@mui/icons-material";

const API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/static-carousel`; 
const PRESIGN_DOWN_API = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/static-carousel/presign-download`;

const getAuthHeaders = () => {
  return {};
};

const POST_STATUSES = ["Approved", "Rewrite", "Reshoot", "Re-edit", "On Hold", "Rejected"];
const POST_PUBLISH_STATUSES = ["Blank", "Posted", "Used in Ads"];
const NEEDS_REASON = new Set(["On Hold", "Rejected", "Reshoot", "Re-edit"]);

const SCRIPT_TYPES = [
  "",
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

const CONTENT_TYPES = ["", "Static", "Carousel"];

const STATUS_COLORS = {
  Approved: { bg: "#dcfce7", fg: "#047857", bd: "#a7f3d0" },
  Rewrite: { bg: "#f3e8ff", fg: "#6d28d9", bd: "#ddd6fe" },
  Reshoot: { bg: "#fee2e2", fg: "#b91c1c", bd: "#fecaca" },
  "Re-edit": { bg: "#fef9c3", fg: "#b45309", bd: "#fde68a" },
  "On Hold": { bg: "#e0f2fe", fg: "#1d4ed8", bd: "#bae6fd" },
  Rejected: { bg: "#fee2e2", fg: "#b91c1c", bd: "#fecaca" },
};

const PUBLISH_COLORS = {
  Posted: { bg: "#dcfce7", fg: "#047857", bd: "#a7f3d0" },
  "Used in Ads": { bg: "#fae8ff", fg: "#a21caf", bd: "#f5d0fe" },
};

const tableHeaderSx = {
  color: "#475569",
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  borderBottom: "1px solid #e2e8f0",
  bgcolor: "#f8fafc",
  py: 2,
  whiteSpace: "nowrap",
};

const tableCellSx = {
  borderBottom: "1px solid #f1f5f9",
  py: 1.5,
  color: "#334155",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#ffffff",
    "& fieldset": { borderColor: "#cbd5e1" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: "#2563eb" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#2563eb" },
};

const inlineAcSx = {
  minWidth: 150,
  "& .MuiOutlinedInput-root": {
    bgcolor: "#ffffff",
    fontSize: "0.8rem",
    py: "2px !important",
    "& fieldset": { borderColor: "#e2e8f0" },
    "&:hover fieldset": { borderColor: "#cbd5e1" },
    "&.Mui-focused fieldset": { borderColor: "#2563eb" },
  },
  "& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator": {
    color: "#94a3b8",
  },
};

function itemPreview(contentItems = [], max = 140) {
  const first = contentItems?.[0] || {};
  const text = [
    first.headline,
    first.subHeadline,
    first.caption,
    first.description,
    first.cta,
    first.notes,
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(" • ");

  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function extractKey(url) {
  try {
    const path = new URL(url).pathname;
    const parts = path.replace(/^\//, "").split("/");
    parts.shift();
    return parts.join("/");
  } catch {
    const m = url.match(/https?:\/\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
    return m ? m[1] : null;
  }
}

function ScriptNo({ id }) {
  return (
    <Typography
      sx={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: "0.85rem",
        color: "#2563eb",
      }}
    >
      {id}
    </Typography>
  );
}

function TypePill({ label }) {
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1.2,
        py: 0.3,
        borderRadius: "100px",
        fontSize: "0.75rem",
        fontWeight: 600,
        bgcolor: "#eff6ff",
        color: "#2563eb",
        border: "1px solid #bfdbfe",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

function ContentTypePill({ type }) {
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

function StatusBadge({ value }) {
  const c = STATUS_COLORS[value];
  if (!value || !c) {
    return <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>—</Typography>;
  }

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
        color: c.fg,
        border: `1px solid ${c.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </Box>
  );
}

function PublishBadge({ value }) {
  const c = PUBLISH_COLORS[value];
  if (!value || value === "Blank" || !c) {
    return (
      <Box
        sx={{
          display: "inline-block",
          px: 1.2,
          py: 0.4,
          borderRadius: "100px",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#64748b",
          bgcolor: "#f1f5f9",
          border: "1px solid #e2e8f0",
          whiteSpace: "nowrap",
        }}
      >
        Blank
      </Box>
    );
  }

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
        color: c.fg,
        border: `1px solid ${c.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </Box>
  );
}

function FormattedDate({ value }) {
  if (!value) return <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>—</Typography>;

  const d = new Date(value);
  return (
    <Box>
      <Typography
        sx={{
          fontSize: "0.8rem",
          color: "#0f172a",
          whiteSpace: "nowrap",
          fontWeight: 500,
        }}
      >
        {d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </Typography>
      <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
        {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </Typography>
    </Box>
  );
}

function AssetGalleryDialog({ open, onClose, assets = [], title = "Images", onDownload }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { bgcolor: "#fff", borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          borderBottom: "1px solid #e2e8f0",
          py: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>{title}</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3, pb: 3 }}>
        {!assets.length ? (
          <Typography sx={{ color: "#64748b" }}>No images available.</Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1, minmax(0, 1fr))",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {assets.map((asset, idx) => (
              <Box
                key={idx}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  overflow: "hidden",
                  bgcolor: "#fff",
                }}
              >
                <Box
                  component="img"
                  src={asset.url}
                  alt={asset.name || `asset-${idx + 1}`}
                  sx={{
                    width: "100%",
                    height: 220,
                    objectFit: "cover",
                    display: "block",
                    bgcolor: "#f8fafc",
                  }}
                />
                <Box sx={{ p: 1.2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#334155",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {asset.name || `Image ${idx + 1}`}
                    </Typography>

                    {!!onDownload && (
                      <IconButton
                        size="small"
                        onClick={() => onDownload(asset.url, asset.name || `image_${idx + 1}`)}
                        sx={{
                          color: "#64748b",
                          "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                        }}
                      >
                        <DownloadIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReasonDialog({ open, onClose, status, item, onConfirm, saving }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { bgcolor: "#ffffff", borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          borderBottom: "1px solid #e2e8f0",
          py: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
          Reason for "{status}"
        </Typography>

        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3 }}>
        {item && (
          <Box
            sx={{
              mb: 2,
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 1.5,
              p: 2,
            }}
          >
            <Stack direction="row" gap={1} flexWrap="wrap">
              <ScriptNo id={item.staticCarouselId} />
              <ContentTypePill type={item.contentType} />
              <TypePill label={item.scriptType} />
            </Stack>
          </Box>
        )}

        <TextField
          label="Reason *"
          multiline
          minRows={3}
          fullWidth
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={inputSx}
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          borderTop: "1px solid #e2e8f0",
          gap: 1,
        }}
      >
        <Button onClick={onClose} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={() => onConfirm(reason)}
          disabled={saving || !reason.trim()}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          sx={{
            bgcolor: "#2563eb",
            boxShadow: "none",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: "#1d4ed8" },
          }}
        >
          {saving ? "Saving…" : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function InlinePublishSelect({ item, reload, toast }) {
  const [loading, setLoading] = useState(false);
  const val = item.postPublishStatus || "Blank";

  const handleChange = async (_, newVal) => {
    if (!newVal || newVal === val) return;

    const actualVal = newVal === "Blank" ? "" : newVal;
    setLoading(true);

    try {
      await axios.post(
        `${API}/${item._id}/post-update`,
        { postPublishStatus: actualVal },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      toast(actualVal ? `Publish status → ${actualVal} 🚀` : "Publish status cleared");
      reload();
    } catch {
      toast("Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Autocomplete
        size="small"
        options={POST_PUBLISH_STATUSES}
        value={val}
        onChange={handleChange}
        disableClearable
        sx={inlineAcSx}
        renderInput={(params) => <TextField {...params} placeholder="Publish Status" />}
        renderOption={(props, option) => (
          <Box component="li" {...props} sx={{ fontSize: "0.85rem", "&:hover": { bgcolor: "#f1f5f9 !important" } }}>
            <PublishBadge value={option} />
          </Box>
        )}
      />
      {loading && <CircularProgress size={16} sx={{ color: "#2563eb" }} />}
    </Stack>
  );
}

function InlineStatusSelect({ item, reload, toast, openReasonDlg }) {
  const [loading, setLoading] = useState(false);
  const val = item.postStatus || "";

  const handleChange = async (_, newVal) => {
    if (!newVal || newVal === val) return;

    if (NEEDS_REASON.has(newVal)) {
      openReasonDlg(item, newVal);
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${API}/${item._id}/post-update`,
        { postStatus: newVal, postHoldReason: "" },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      toast(`Status → ${newVal} ✅`);
      reload();
    } catch {
      toast("Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Autocomplete
        size="small"
        options={POST_STATUSES}
        value={val || null}
        onChange={handleChange}
        sx={inlineAcSx}
        renderInput={(params) => <TextField {...params} placeholder="Set Status…" />}
        renderOption={(props, option) => (
          <Box component="li" {...props} sx={{ fontSize: "0.85rem", "&:hover": { bgcolor: "#f1f5f9 !important" } }}>
            <StatusBadge value={option} />
          </Box>
        )}
      />
      {loading && <CircularProgress size={16} sx={{ color: "#2563eb" }} />}
    </Stack>
  );
}

function InlineComment({ item, reload, toast }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.postComment || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVal(item.postComment || "");
  }, [item.postComment]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${API}/${item._id}/post-update`,
        { postComment: val },
        { headers: getAuthHeaders(), withCredentials: true }
      );
      toast("Comment saved ✅");
      setEditing(false);
      reload();
    } catch {
      toast("Failed to save comment", "error");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ minWidth: 180 }}>
        <TextField
          size="small"
          multiline
          minRows={2}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              fontSize: "0.8rem",
              bgcolor: "#ffffff",
              "& fieldset": { borderColor: "#cbd5e1" },
              "&.Mui-focused fieldset": { borderColor: "#2563eb" },
            },
          }}
        />
        <Stack spacing={0.5}>
          <IconButton
            size="small"
            onClick={handleSave}
            disabled={saving}
            sx={{ color: "#059669", "&:hover": { bgcolor: "#dcfce7" } }}
          >
            {saving ? <CircularProgress size={14} /> : <SaveIcon sx={{ fontSize: 16 }} />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setEditing(false);
              setVal(item.postComment || "");
            }}
            sx={{ color: "#94a3b8", "&:hover": { bgcolor: "#f1f5f9" } }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </Stack>
    );
  }

  return (
    <Tooltip title={val || "Click to add comment"} placement="top" arrow>
      <Typography
        onClick={() => setEditing(true)}
        sx={{
          fontSize: "0.85rem",
          color: val ? "#475569" : "#94a3b8",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 160,
          cursor: "pointer",
          "&:hover": { color: "#2563eb", textDecoration: "underline dotted" },
        }}
      >
        {val || "Add comment…"}
      </Typography>
    </Tooltip>
  );
}

function EditedAssetsBtn({ item, openGallery }) {
  const assets = item?.editAssets || [];
  if (!assets.length) {
    return <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>—</Typography>;
  }

  return (
    <Button
      size="small"
      onClick={() => openGallery(assets, `${item.staticCarouselId} — Edited Images`)}
      startIcon={<ViewIcon sx={{ fontSize: 16 }} />}
      sx={{
        color: "#2563eb",
        textTransform: "none",
        fontSize: "0.8rem",
        fontWeight: 600,
        px: 1.5,
        py: 0.5,
        border: "1px solid #bfdbfe",
        borderRadius: 1.5,
        "&:hover": { bgcolor: "#eff6ff" },
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      View ({assets.length})
    </Button>
  );
}

export default function StaticCarouselPostPage() {
  const [tab, setTab] = useState(0);

  const [pendingPage, setPendingPage] = useState(0);
  const [pendingRows, setPendingRows] = useState(25);
  const [publishedPage, setPublishedPage] = useState(0);
  const [publishedRows, setPublishedRows] = useState(25);

  const [pendingList, setPendingList] = useState([]);
  const [publishedList, setPublishedList] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [publishedTotal, setPublishedTotal] = useState(0);

  const [creatorOptions, setCreatorOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtersDraft, setFiltersDraft] = useState({
    q: "",
    contentType: "",
    scriptType: "",
    creator: "",
  });

  const [filters, setFilters] = useState({
    q: "",
    contentType: "",
    scriptType: "",
    creator: "",
  });

  const applyFilters = () => {
    setFilters({
      q: (filtersDraft.q || "").trim(),
      contentType: filtersDraft.contentType || "",
      scriptType: filtersDraft.scriptType || "",
      creator: filtersDraft.creator || "",
    });
    setPendingPage(0);
    setPublishedPage(0);
  };

  const clearFilters = () => {
    setFiltersDraft({
      q: "",
      contentType: "",
      scriptType: "",
      creator: "",
    });
    setFilters({
      q: "",
      contentType: "",
      scriptType: "",
      creator: "",
    });
    setPendingPage(0);
    setPublishedPage(0);
  };

  const commonParams = useMemo(() => {
    const p = {};
    if (filters.q) p.q = filters.q;
    if (filters.contentType) p.contentType = filters.contentType;
    if (filters.scriptType) p.scriptType = filters.scriptType;
    if (filters.creator) p.creator = filters.creator;
    return p;
  }, [filters]);

  const [reasonDlg, setReasonDlg] = useState({
    open: false,
    item: null,
    status: "",
  });
  const [reasonSaving, setReasonSaving] = useState(false);

  const [gallery, setGallery] = useState({
    open: false,
    assets: [],
    title: "",
  });

  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    sev: "success",
  });

  const toast = (msg, sev = "success") => setSnack({ open: true, msg, sev });

  const handleDownload = async (url, filename) => {
    const key = extractKey(url);
    if (!key) {
      window.open(url, "_blank");
      return;
    }

    try {
      toast("Preparing download…");
      const { data } = await axios.get(PRESIGN_DOWN_API, {
        params: { key },
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      const a = Object.assign(document.createElement("a"), {
        href: data.url,
        download: filename || key.split("/").pop() || "file",
      });

      document.body.appendChild(a);
      a.click();
      a.remove();

      toast("Download started ✅");
    } catch (err) {
      toast(err.response?.data?.message || "Download failed", "error");
      window.open(url, "_blank");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const pendingParams = {
        stage: "Edit Done",
        page: pendingPage + 1,
        limit: pendingRows,
        sortBy: "editDoneAt",
        sortDir: "desc",
        ...commonParams,
      };

      const publishedParams = {
        stage: "Post",
        page: publishedPage + 1,
        limit: publishedRows,
        sortBy: "postedAt",
        sortDir: "desc",
        ...commonParams,
      };

      const [eRes, pRes] = await Promise.all([
        axios.get(API, { params: pendingParams, headers, withCredentials: true }),
        axios.get(API, { params: publishedParams, headers, withCredentials: true }),
      ]);

      const eItems = eRes.data.staticCarousels || [];
      const pItems = pRes.data.staticCarousels || [];

      setPendingList(eItems);
      setPublishedList(pItems);

      setPendingTotal(eRes.data.pagination?.total ?? eItems.length);
      setPublishedTotal(pRes.data.pagination?.total ?? pItems.length);

      const set = new Set();
      [...eItems, ...pItems].forEach((s) => {
        if (s?.createdBy) set.add(String(s.createdBy).trim());
      });
      if (filtersDraft.creator) set.add(filtersDraft.creator);

      setCreatorOptions(Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b)));
    } catch {
      toast("Failed to load items", "error");
      setPendingList([]);
      setPublishedList([]);
      setPendingTotal(0);
      setPublishedTotal(0);
      setCreatorOptions([]);
    } finally {
      setLoading(false);
    }
  }, [pendingPage, pendingRows, publishedPage, publishedRows, commonParams, filtersDraft.creator]);

  useEffect(() => {
    load();
  }, [load]);

  const openGallery = (assets, title) =>
    setGallery({ open: true, assets: assets || [], title: title || "Images" });

  const closeGallery = () =>
    setGallery({ open: false, assets: [], title: "" });

  const openReasonDlg = (item, status) =>
    setReasonDlg({ open: true, item, status });

  const closeReasonDlg = () =>
    setReasonDlg({ open: false, item: null, status: "" });

  const handleConfirmReason = async (reason) => {
    if (!reasonDlg.item) return;
    setReasonSaving(true);

    try {
      await axios.post(
        `${API}/${reasonDlg.item._id}/post-update`,
        { postStatus: reasonDlg.status, postHoldReason: reason },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      toast(`Status → ${reasonDlg.status} ✅`);
      closeReasonDlg();
      load();
    } catch {
      toast("Update failed", "error");
    } finally {
      setReasonSaving(false);
    }
  };

  const thSx = tableHeaderSx;
  const tdSx = tableCellSx;

  const renderRow = (item, idxOnPage, isPublished = false, page = 0, rows = 25) => (
    <TableRow key={item._id} sx={{ "&:hover td": { bgcolor: "#f8fafc" } }}>
      <TableCell sx={{ ...tdSx, color: "#94a3b8", fontSize: "0.85rem" }}>
        {page * rows + idxOnPage + 1}
      </TableCell>

      <TableCell sx={tdSx}>
        <ScriptNo id={item.staticCarouselId} />
      </TableCell>

      <TableCell sx={tdSx}>
        <ContentTypePill type={item.contentType} />
      </TableCell>

      <TableCell sx={tdSx}>
        <TypePill label={item.scriptType} />
      </TableCell>

      <TableCell sx={{ ...tdSx, maxWidth: 220 }}>
        <Tooltip title={itemPreview(item.contentItems, 300)} placement="top" arrow>
          <Typography
            sx={{
              fontSize: "0.85rem",
              color: "#475569",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {itemPreview(item.contentItems, 160)}
          </Typography>
        </Tooltip>
      </TableCell>

      <TableCell sx={tdSx}>
        <Typography sx={{ fontSize: "0.85rem", color: "#475569" }}>
          {item.createdBy}
        </Typography>
      </TableCell>

      <TableCell sx={tdSx}>
        <EditedAssetsBtn item={item} openGallery={openGallery} />
      </TableCell>

      <TableCell sx={tdSx}>
        <InlineStatusSelect
          item={item}
          reload={load}
          toast={toast}
          openReasonDlg={openReasonDlg}
        />
      </TableCell>

      <TableCell sx={tdSx}>
        <InlinePublishSelect item={item} reload={load} toast={toast} />
      </TableCell>

      <TableCell sx={tdSx}>
        <InlineComment item={item} reload={load} toast={toast} />
      </TableCell>

      {isPublished && (
        <>
          <TableCell sx={tdSx}>
            <FormattedDate value={item.postPublishStatusUpdatedAt || item.postedAt} />
          </TableCell>

          <TableCell sx={tdSx}>
            <Typography sx={{ fontSize: "0.85rem", color: "#047857", fontWeight: 600 }}>
              {item.postedBy || "—"}
            </Typography>
          </TableCell>
        </>
      )}
    </TableRow>
  );

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", color: "#0f172a", p: 4 }}>
      <Box mb={3}>
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: "1.8rem",
            color: "#0f172a",
          }}
        >
          Static / Carousel Post Management
        </Typography>

        <Typography sx={{ color: "#64748b", fontSize: "0.95rem", mt: 0.5 }}>
          Review final creatives · Set status · Track publishing usage.
        </Typography>
      </Box>

      <Paper
        sx={{
          bgcolor: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 2,
          p: 2,
          mb: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
          <TextField
            size="small"
            label="Search (ID / title / caption / creator)"
            value={filtersDraft.q}
            onChange={(e) => setFiltersDraft((s) => ({ ...s, q: e.target.value }))}
            sx={{ minWidth: 320, ...inputSx }}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 180, ...inputSx }}>
            <InputLabel>Content Type</InputLabel>
            <Select
              value={filtersDraft.contentType}
              label="Content Type"
              onChange={(e) => setFiltersDraft((s) => ({ ...s, contentType: e.target.value }))}
            >
              {CONTENT_TYPES.map((t) => (
                <MenuItem key={t || "all"} value={t}>
                  {t || "All"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220, ...inputSx }}>
            <InputLabel>Script Type</InputLabel>
            <Select
              value={filtersDraft.scriptType}
              label="Script Type"
              onChange={(e) => setFiltersDraft((s) => ({ ...s, scriptType: e.target.value }))}
            >
              {SCRIPT_TYPES.map((t) => (
                <MenuItem key={t || "all"} value={t}>
                  {t || "All"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 240, ...inputSx }}>
            <InputLabel>Creator</InputLabel>
            <Select
              value={filtersDraft.creator}
              label="Creator"
              onChange={(e) => setFiltersDraft((s) => ({ ...s, creator: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {creatorOptions.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={applyFilters}
            sx={{
              bgcolor: "#2563eb",
              "&:hover": { bgcolor: "#1d4ed8" },
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Apply
          </Button>

          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={clearFilters}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderColor: "#cbd5e1",
              color: "#475569",
              "&:hover": { borderColor: "#94a3b8" },
            }}
          >
            Clear
          </Button>

          <Button onClick={load} sx={{ textTransform: "none", fontWeight: 700, color: "#2563eb" }}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2,
          "& .MuiTabs-indicator": {
            bgcolor: "#2563eb",
            height: 3,
            borderRadius: "3px 3px 0 0",
          },
          "& .MuiTab-root": {
            color: "#64748b",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            minHeight: 48,
          },
          "& .Mui-selected": { color: "#2563eb !important" },
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 2,
          px: 1,
          minHeight: 48,
          width: "fit-content",
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        }}
      >
        <Tab label={`Post Pending (${pendingTotal})`} />
        <Tab label={`Published (${publishedTotal})`} />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: "#2563eb" }} size={32} />
        </Box>
      ) : (
        <>
          {tab === 0 && (
            <Paper
              sx={{
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
              }}
            >
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {[
                        "#",
                        "ID",
                        "Content Type",
                        "Script Type",
                        "Preview",
                        "Creator",
                        "Edited Images",
                        "Content Status",
                        "Publish Status",
                        "Comment",
                      ].map((h) => (
                        <TableCell key={h} sx={thSx}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pendingList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                          <InboxIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />
                          No items ready to post yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingList.map((item, i) =>
                        renderRow(item, i, false, pendingPage, pendingRows)
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={pendingTotal}
                page={pendingPage}
                onPageChange={(_, p) => setPendingPage(p)}
                rowsPerPage={pendingRows}
                onRowsPerPageChange={(e) => {
                  setPendingRows(parseInt(e.target.value, 10));
                  setPendingPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100, 200]}
              />
            </Paper>
          )}

          {tab === 1 && (
            <Paper
              sx={{
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
              }}
            >
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      {[
                        "#",
                        "ID",
                        "Content Type",
                        "Script Type",
                        "Preview",
                        "Creator",
                        "Edited Images",
                        "Content Status",
                        "Publish Status",
                        "Comment",
                        "Published At",
                        "Posted By",
                      ].map((h) => (
                        <TableCell key={h} sx={thSx}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {publishedList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} align="center" sx={{ py: 8, borderBottom: "none", color: "#64748b" }}>
                          <RocketIcon sx={{ fontSize: 40, mb: 1, color: "#cbd5e1", display: "block", mx: "auto" }} />
                          Nothing published yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      publishedList.map((item, i) =>
                        renderRow(item, i, true, publishedPage, publishedRows)
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={publishedTotal}
                page={publishedPage}
                onPageChange={(_, p) => setPublishedPage(p)}
                rowsPerPage={publishedRows}
                onRowsPerPageChange={(e) => {
                  setPublishedRows(parseInt(e.target.value, 10));
                  setPublishedPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100, 200]}
              />
            </Paper>
          )}
        </>
      )}

      <ReasonDialog
        open={reasonDlg.open}
        onClose={closeReasonDlg}
        status={reasonDlg.status}
        item={reasonDlg.item}
        onConfirm={handleConfirmReason}
        saving={reasonSaving}
      />

      <AssetGalleryDialog
        open={gallery.open}
        onClose={closeGallery}
        assets={gallery.assets}
        title={gallery.title}
        onDownload={handleDownload}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.sev}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            borderRadius: 2,
          }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

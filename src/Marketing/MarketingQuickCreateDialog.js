import React, { useEffect, useMemo, useRef, useState } from "react";
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
  FormHelperText,
  Stack,
  Divider,
  IconButton,
  Checkbox,
  FormControlLabel,
  Grid,
  InputAdornment,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Campaign as CampaignIcon,
  Link as LinkIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
} from "@mui/icons-material";

const BASE_API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api";

/**
 * IMPORTANT:
 * Change these endpoints only if your backend route names are different.
 */
const API_MAP = {
  script: `${BASE_API}/scripts`,
  otherVideo: `${BASE_API}/other-videos`,
  adsVideo: `${BASE_API}/ads-videos`,
  staticCarousel: `${BASE_API}/static-carousel`,
};

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

const AD_TYPES = [
  "Meta Ads",
  "Google Ads",
  "YouTube Ads",
  "WhatsApp Ads",
  "Other Ads",
];

const SCHEMA_OPTIONS = [
  { value: "script", label: "Script" },
  { value: "otherVideo", label: "Other Video" },
  { value: "adsVideo", label: "Ads Video" },
  { value: "staticCarousel", label: "Static Carousel" },
];

const CONTENT_TYPES = ["Static", "Carousel"];

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#ffffff",
    "& fieldset": { borderColor: "#d1d5db" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: "#4f46e5" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#4f46e5" },
};

const getCurrentUser = () =>
  JSON.parse(sessionStorage.getItem("user") || "{}");

const getAuthHeaders = () => ({
  "x-session-user": JSON.stringify(getCurrentUser()),
});

const stripHtml = (html) => html?.replace(/<[^>]*>/g, "") || "";

function ToolbarButton({ title, onClick, children }) {
  return (
    <Tooltip title={title} arrow>
      <IconButton
        size="small"
        onMouseDown={(e) => {
          e.preventDefault();
          onClick?.();
        }}
        sx={{
          borderRadius: 1,
          color: "#475569",
          "&:hover": { bgcolor: "#eef2ff", color: "#4f46e5" },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

function RichEditor({ value, onChange, error, minHeight = 140 }) {
  const ref = useRef(null);
  const initDone = useRef(false);

  useEffect(() => {
    if (!initDone.current && ref.current) {
      ref.current.innerHTML = value || "";
      initDone.current = true;
    }
  }, [value]);

  const exec = (cmd, val = null) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
  };

  const insertQuote = () => {
    ref.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      '<blockquote style="border-left:3px solid #4f46e5;margin:6px 0;padding:6px 12px;color:#4b5563;font-style:italic;background:#f5f3ff;border-radius:0 4px 4px 0;">&nbsp;</blockquote><br/>'
    );
    handleInput();
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <Box
      sx={{
        border: `1.5px solid ${error ? "#ef4444" : "#d1d5db"}`,
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "#fff",
        "&:focus-within": {
          borderColor: error ? "#ef4444" : "#4f46e5",
          boxShadow: `0 0 0 3px ${error ? "#fecaca" : "#e0e7ff"}`,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 0.5,
          px: 1,
          py: 0.8,
          bgcolor: "#f8fafc",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <ToolbarButton title="Bold" onClick={() => exec("bold")}>
          <FormatBold fontSize="small" />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => exec("italic")}>
          <FormatItalic fontSize="small" />
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => exec("underline")}>
          <FormatUnderlined fontSize="small" />
        </ToolbarButton>
        <ToolbarButton title="Bullets" onClick={() => exec("insertUnorderedList")}>
          <FormatListBulleted fontSize="small" />
        </ToolbarButton>
        <ToolbarButton title="Numbered List" onClick={() => exec("insertOrderedList")}>
          <FormatListNumbered fontSize="small" />
        </ToolbarButton>
        <ToolbarButton title="Quote" onClick={insertQuote}>
          <FormatQuote fontSize="small" />
        </ToolbarButton>
      </Box>

      <Box
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder="Write here…"
        sx={{
          minHeight,
          maxHeight: 340,
          overflowY: "auto",
          px: 2,
          py: 1.5,
          fontSize: "0.9rem",
          lineHeight: 1.75,
          color: "#111827",
          outline: "none",
          "&:empty:before": {
            content: "attr(data-placeholder)",
            color: "#9ca3af",
            pointerEvents: "none",
          },
          "& ul": { pl: 3 },
          "& ol": { pl: 3 },
          "& blockquote": {
            borderLeft: "3px solid #4f46e5",
            pl: 2,
            color: "#4b5563",
            fontStyle: "italic",
            bgcolor: "#f5f3ff",
            borderRadius: "0 4px 4px 0",
            my: 1,
          },
        }}
      />

      {error ? (
        <Box sx={{ px: 2, py: 0.7, bgcolor: "#fef2f2" }}>
          <Typography sx={{ fontSize: "0.75rem", color: "#dc2626" }}>
            {error}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

const getInitialForm = () => ({
  schema: "",
  scriptType: "",
  referenceLink: "",
  hasShoot: false,

  // script / other video
  scriptText: "",

  // ads
  adType: "Meta Ads",
  title: "",
  ideaText: "",

  // static / carousel
  contentType: "Static",
  contentItems: [{ itemNo: 1, description: "" }],
});

export default function MarketingQuickCreateDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(getInitialForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverMsg, setServerMsg] = useState("");

  useEffect(() => {
    if (open) {
      setForm(getInitialForm());
      setErrors({});
      setServerMsg("");
      setSaving(false);
    }
  }, [open]);

  const dialogTitle = useMemo(() => {
    const picked = SCHEMA_OPTIONS.find((x) => x.value === form.schema);
    return picked ? `Create in ${picked.label}` : "Quick Create Marketing";
  }, [form.schema]);

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addContentItem = () => {
    setForm((prev) => ({
      ...prev,
      contentItems: [
        ...prev.contentItems,
        { itemNo: prev.contentItems.length + 1, description: "" },
      ],
    }));
  };

  const removeContentItem = (index) => {
    setForm((prev) => {
      const next = prev.contentItems.filter((_, i) => i !== index);
      return {
        ...prev,
        contentItems: next.map((item, idx) => ({
          ...item,
          itemNo: idx + 1,
        })),
      };
    });
  };

  const updateContentItem = (index, value) => {
    setForm((prev) => ({
      ...prev,
      contentItems: prev.contentItems.map((item, i) =>
        i === index ? { ...item, description: value } : item
      ),
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.schema) nextErrors.schema = "Please select Type";
    if (!form.scriptType) nextErrors.scriptType = "Please select script type";

    if (form.schema === "script") {
      if (!stripHtml(form.scriptText).trim()) {
        nextErrors.scriptText = "Script is required";
      }
    }

    if (form.schema === "otherVideo") {
      if (!stripHtml(form.scriptText).trim()) {
        nextErrors.scriptText = "Script is required";
      }
    }

    if (form.schema === "adsVideo") {
      if (!form.adType) nextErrors.adType = "Please select ad type";
      if (!form.title?.trim()) nextErrors.title = "Title is required";
      if (!stripHtml(form.ideaText).trim()) {
        nextErrors.ideaText = "Idea text is required";
      }
    }

    if (form.schema === "staticCarousel") {
      if (!form.contentType) nextErrors.contentType = "Please select content type";
      if (!form.title?.trim()) nextErrors.title = "Title is required";

      const hasEmpty = form.contentItems.some(
        (item) => !item.description?.trim()
      );
      if (hasEmpty) {
        nextErrors.contentItems = "All content item descriptions are required";
      }

      if (form.contentType === "Static" && form.contentItems.length !== 1) {
        nextErrors.contentItems = "Static must have exactly 1 content item";
      }

      if (form.contentType === "Carousel" && form.contentItems.length < 2) {
        nextErrors.contentItems = "Carousel should have at least 2 content items";
      }
    }

    setErrors(nextErrors);
    return !Object.keys(nextErrors).length;
  };

  const buildPayload = () => {
    if (form.schema === "script") {
      return {
        scriptType: form.scriptType,
        scriptText: form.scriptText,
        referenceLink: form.referenceLink || "",
      };
    }

    if (form.schema === "otherVideo") {
      return {
        scriptType: form.scriptType,
        scriptText: form.scriptText,
        referenceLink: form.referenceLink || "",
        hasShoot: !!form.hasShoot,
      };
    }

    if (form.schema === "adsVideo") {
      return {
        adType: form.adType,
        title: form.title,
        ideaText: form.ideaText,
        referenceLink: form.referenceLink || "",
        hasShoot: !!form.hasShoot,
        createdBy: getCurrentUser()?.fullName || "",
        createdByEmail: getCurrentUser()?.email || "",
      };
    }

    if (form.schema === "staticCarousel") {
      return {
        contentType: form.contentType,
        hasShoot: !!form.hasShoot,
        scriptType: form.scriptType,
        title: form.title,
        contentItems: form.contentItems.map((item, idx) => ({
          itemNo: idx + 1,
          description: item.description,
        })),
        referenceLink: form.referenceLink || "",
        createdBy: getCurrentUser()?.fullName || "",
        createdByEmail: getCurrentUser()?.email || "",
      };
    }

    return {};
  };

  const handleSubmit = async () => {
    setServerMsg("");

    if (!validate()) return;

    const url = API_MAP[form.schema];
    if (!url) {
      setServerMsg("API route is not configured.");
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      const { data } = await axios.post(url, payload, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      onCreated?.(data);
      onClose?.();
    } catch (err) {
      setServerMsg(
        err?.response?.data?.message || "Failed to create item. Please check API route and payload."
      );
    } finally {
      setSaving(false);
    }
  };

  const isStatic = form.schema === "staticCarousel" && form.contentType === "Static";

  useEffect(() => {
    if (isStatic && form.contentItems.length !== 1) {
      setForm((prev) => ({
        ...prev,
        contentItems: [{ itemNo: 1, description: prev.contentItems[0]?.description || "" }],
      }));
    }
  }, [isStatic, form.contentItems]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
          fontWeight: 800,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <CampaignIcon sx={{ color: "#4f46e5" }} />
          <Typography sx={{ fontSize: "1.05rem", fontWeight: 800 }}>
            {dialogTitle}
          </Typography>
        </Stack>

        <IconButton
          size="small"
          onClick={handleClose}
          sx={{ color: "#64748b", "&:hover": { bgcolor: "#f1f5f9" } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
        {serverMsg ? <Alert severity="error">{serverMsg}</Alert> : null}

        <Box
          sx={{
            bgcolor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 1.5,
            px: 2,
            py: 1.2,
          }}
        >
          <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>
            Creating as:{" "}
            <Box component="span" sx={{ color: "#111827", fontWeight: 700 }}>
              {getCurrentUser()?.fullName || "Unknown User"}
            </Box>
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth error={!!errors.schema} sx={inputSx}>
              <InputLabel>Type *</InputLabel>
              <Select
                value={form.schema}
                label="Type *"
                onChange={(e) => {
                  const schema = e.target.value;
                  setForm((prev) => ({
                    ...getInitialForm(),
                    schema,
                    scriptType: prev.scriptType || "",
                  }));
                  setErrors({});
                }}
              >
                {SCHEMA_OPTIONS.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.schema ? <FormHelperText>{errors.schema}</FormHelperText> : null}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth error={!!errors.scriptType} sx={inputSx}>
              <InputLabel>Script Type *</InputLabel>
              <Select
                value={form.scriptType}
                label="Script Type *"
                onChange={(e) => updateForm("scriptType", e.target.value)}
              >
                {SCRIPT_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
              {errors.scriptType ? <FormHelperText>{errors.scriptType}</FormHelperText> : null}
            </FormControl>
          </Grid>
        </Grid>

        {form.schema ? <Divider /> : null}

        {/* Script */}
        {form.schema === "script" ? (
          <>
            <Box>
              <Typography sx={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600, mb: 0.8 }}>
                Script *
              </Typography>
              <RichEditor
                value={form.scriptText}
                onChange={(html) => updateForm("scriptText", html)}
                error={errors.scriptText}
              />
            </Box>

            <TextField
              label="Reference Link (optional)"
              placeholder="https://..."
              size="small"
              fullWidth
              value={form.referenceLink}
              onChange={(e) => updateForm("referenceLink", e.target.value)}
              sx={inputSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
          </>
        ) : null}

        {/* Other Video */}
        {form.schema === "otherVideo" ? (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!form.hasShoot}
                  onChange={(e) => updateForm("hasShoot", e.target.checked)}
                />
              }
              label="Has Shoot"
            />

            <Box>
              <Typography sx={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600, mb: 0.8 }}>
                Script *
              </Typography>
              <RichEditor
                value={form.scriptText}
                onChange={(html) => updateForm("scriptText", html)}
                error={errors.scriptText}
              />
            </Box>

            <TextField
              label="Reference Link (optional)"
              placeholder="https://..."
              size="small"
              fullWidth
              value={form.referenceLink}
              onChange={(e) => updateForm("referenceLink", e.target.value)}
              sx={inputSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
          </>
        ) : null}

        {/* Ads */}
        {form.schema === "adsVideo" ? (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl size="small" fullWidth error={!!errors.adType} sx={inputSx}>
                  <InputLabel>Ad Type *</InputLabel>
                  <Select
                    value={form.adType}
                    label="Ad Type *"
                    onChange={(e) => updateForm("adType", e.target.value)}
                  >
                    {AD_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.adType ? <FormHelperText>{errors.adType}</FormHelperText> : null}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!form.hasShoot}
                      onChange={(e) => updateForm("hasShoot", e.target.checked)}
                    />
                  }
                  label="Has Shoot"
                  sx={{ mt: 0.2 }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Title *"
              size="small"
              fullWidth
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              sx={inputSx}
            />

            <Box>
              <Typography sx={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600, mb: 0.8 }}>
                Idea Text *
              </Typography>
              <RichEditor
                value={form.ideaText}
                onChange={(html) => updateForm("ideaText", html)}
                error={errors.ideaText}
              />
            </Box>

            <TextField
              label="Reference Link (optional)"
              placeholder="https://..."
              size="small"
              fullWidth
              value={form.referenceLink}
              onChange={(e) => updateForm("referenceLink", e.target.value)}
              sx={inputSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
          </>
        ) : null}

        {/* Static Carousel */}
        {form.schema === "staticCarousel" ? (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl
                  size="small"
                  fullWidth
                  error={!!errors.contentType}
                  sx={inputSx}
                >
                  <InputLabel>Content Type *</InputLabel>
                  <Select
                    value={form.contentType}
                    label="Content Type *"
                    onChange={(e) => updateForm("contentType", e.target.value)}
                  >
                    {CONTENT_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.contentType ? (
                    <FormHelperText>{errors.contentType}</FormHelperText>
                  ) : null}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!form.hasShoot}
                      onChange={(e) => updateForm("hasShoot", e.target.checked)}
                    />
                  }
                  label="Has Shoot"
                  sx={{ mt: 0.2 }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Title *"
              size="small"
              fullWidth
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              sx={inputSx}
            />

            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={1}
                flexWrap="wrap"
                gap={1}
              >
                <Typography sx={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600 }}>
                  Content Items *
                </Typography>

                {!isStatic ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={addContentItem}
                    sx={{
                      textTransform: "none",
                      borderColor: "#c7d2fe",
                      color: "#4f46e5",
                    }}
                  >
                    Add Item
                  </Button>
                ) : null}
              </Stack>

              <Stack spacing={1.2}>
                {form.contentItems.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: "#fafafa",
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                        Item {index + 1}
                      </Typography>

                      {!isStatic && form.contentItems.length > 1 ? (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeContentItem(index)}
                          sx={{ textTransform: "none", minWidth: 0 }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </Stack>

                    <TextField
                      label="Description"
                      multiline
                      minRows={3}
                      fullWidth
                      value={item.description}
                      onChange={(e) => updateContentItem(index, e.target.value)}
                      sx={inputSx}
                    />
                  </Box>
                ))}
              </Stack>

              {errors.contentItems ? (
                <Typography sx={{ mt: 1, fontSize: "0.75rem", color: "#dc2626" }}>
                  {errors.contentItems}
                </Typography>
              ) : null}
            </Box>

            <TextField
              label="Reference Link (optional)"
              placeholder="https://..."
              size="small"
              fullWidth
              value={form.referenceLink}
              onChange={(e) => updateForm("referenceLink", e.target.value)}
              sx={inputSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
          </>
        ) : null}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          borderTop: "1px solid #e5e7eb",
          gap: 1,
        }}
      >
        <Button
          onClick={handleClose}
          sx={{ color: "#4b5563", textTransform: "none" }}
          disabled={saving}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.schema}
          sx={{
            bgcolor: "#4f46e5",
            "&:hover": { bgcolor: "#4338ca" },
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 700,
            px: 3,
            boxShadow: "none",
          }}
        >
          {saving ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} sx={{ color: "#fff" }} />
              <span>Saving...</span>
            </Stack>
          ) : (
            "Create"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
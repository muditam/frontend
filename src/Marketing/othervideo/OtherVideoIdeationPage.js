import React, { useEffect, useState, useCallback, useRef } from "react";
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
  ArrowForward as ArrowIcon,
  Videocam as VideocamIcon,
  ContentCut as CutIcon,
  Movie as EditStageIcon,
  Publish as PostIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  OpenWith as ExpandIcon,
  CloseFullscreen as CollapseIcon,
  Comment as CommentIcon,
  Search as SearchIcon,
  RestartAlt as ResetIcon,
} from "@mui/icons-material";

const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/other-videos";
const MANAGER_ROLES = ["admin", "manager", "super-admin", "team-leader"];

const getCurrentUser = () => JSON.parse(sessionStorage.getItem("user") || "{}");
const isManagerRole = (role = "") =>
  MANAGER_ROLES.includes(String(role || "").toLowerCase());
const hasFullAccess = (user = {}) =>
  isManagerRole(user.role) || user.hasTeam === true;

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

const SCRIPT_STATUSES = ["Pending", "Approved", "Rewrite", "On Hold", "Rejected"];
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

const getAuthHeaders = () => ({
  "x-session-user": JSON.stringify(getCurrentUser()),
});

// ═══════════════════════════════════════════════════════════
// Rich Text Editor
// ═══════════════════════════════════════════════════════════
const FONT_OPTIONS = ["Sans Serif", "Serif", "Monospace", "Cursive"];
const FONT_MAP = {
  "Sans Serif": "Arial, sans-serif",
  Serif: "Georgia, serif",
  Monospace: "'Courier New', monospace",
  Cursive: "cursive",
};
const SIZE_OPTIONS = ["Small", "Normal", "Large", "Huge"];
const SIZE_MAP = { Small: "1", Normal: "3", Large: "5", Huge: "7" };
const TEXT_COLORS = [
  "#111827",
  "#dc2626",
  "#d97706",
  "#059669",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#6b7280",
  "#f87171",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#22d3ee",
];

function TBtn({ title, active, onClick, children }) {
  return (
    <Tooltip title={title} arrow placement="top">
      <Box
        component="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onClick?.();
        }}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          bgcolor: active ? "#e0e7ff" : "transparent",
          color: active ? "#4f46e5" : "#374151",
          fontSize: "0.8rem",
          fontWeight: 700,
          transition: "all 0.12s",
          "&:hover": {
            bgcolor: active ? "#e0e7ff" : "#f3f4f6",
            color: active ? "#4f46e5" : "#111827",
          },
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}

function TSep() {
  return (
    <Box
      sx={{
        width: "1px",
        height: 20,
        bgcolor: "#e5e7eb",
        mx: "2px",
        flexShrink: 0,
      }}
    />
  );
}

function RichEditor({ value, onChange, error, expanded, onToggleExpand }) {
  const ref = useRef(null);
  const initDone = useRef(false);
  const colorRef = useRef(null);

  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [align, setAlign] = useState("left");
  const [font, setFont] = useState("Sans Serif");
  const [size, setSize] = useState("Normal");
  const [colorOpen, setColorOpen] = useState(false);

  useEffect(() => {
    if (!initDone.current && ref.current && value) {
      ref.current.innerHTML = value;
      initDone.current = true;
    }
  }, [value]);

  const exec = (cmd, val = null) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    sync();
  };

  const sync = () => {
    setBold(document.queryCommandState("bold"));
    setItalic(document.queryCommandState("italic"));
    setUnderline(document.queryCommandState("underline"));

    const aligns = ["justifyLeft", "justifyCenter", "justifyRight", "justifyFull"];
    for (const a of aligns) {
      if (document.queryCommandState(a)) {
        setAlign(a.replace("justify", "").toLowerCase() || "left");
        break;
      }
    }
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const applyFont = (f) => {
    setFont(f);
    exec("fontName", FONT_MAP[f]);
  };

  const applySize = (s) => {
    setSize(s);
    exec("fontSize", SIZE_MAP[s]);
  };

  const applyColor = (c) => {
    exec("foreColor", c);
    setColorOpen(false);
  };

  const insertQuote = () => {
    ref.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      '<blockquote style="border-left:3px solid #4f46e5;margin:4px 0;padding:4px 12px;color:#4b5563;font-style:italic;background:#f5f3ff;border-radius:0 4px 4px 0;">&nbsp;</blockquote><br/>'
    );
    handleInput();
  };

  const minH = expanded ? "55vh" : "140px";

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
        transition: "border-color 0.2s",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "2px",
          px: 1.5,
          py: "6px",
          bgcolor: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <TBtn title="Undo" onClick={() => exec("undo")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 7v6h6" />
            <path d="M3 13A9 9 0 1 0 6 6.7" />
          </svg>
        </TBtn>

        <TBtn title="Redo" onClick={() => exec("redo")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 7v6h-6" />
            <path d="M21 13A9 9 0 1 1 18 6.7" />
          </svg>
        </TBtn>

        <TSep />

        <Box
          component="select"
          value={font}
          onChange={(e) => applyFont(e.target.value)}
          sx={{
            fontSize: "0.78rem",
            color: "#374151",
            bgcolor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            px: "6px",
            py: "3px",
            cursor: "pointer",
            outline: "none",
            "&:hover": { borderColor: "#cbd5e1" },
          }}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Box>

        <Box
          component="select"
          value={size}
          onChange={(e) => applySize(e.target.value)}
          sx={{
            fontSize: "0.78rem",
            color: "#374151",
            bgcolor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            px: "6px",
            py: "3px",
            cursor: "pointer",
            outline: "none",
            ml: "2px",
            "&:hover": { borderColor: "#cbd5e1" },
          }}
        >
          {SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Box>

        <TSep />

        <TBtn title="Bold (Ctrl+B)" active={bold} onClick={() => exec("bold")}>
          <b style={{ fontSize: "0.9rem" }}>B</b>
        </TBtn>

        <TBtn title="Italic (Ctrl+I)" active={italic} onClick={() => exec("italic")}>
          <i style={{ fontSize: "0.9rem", fontFamily: "serif" }}>I</i>
        </TBtn>

        <TBtn title="Underline (Ctrl+U)" active={underline} onClick={() => exec("underline")}>
          <span style={{ textDecoration: "underline", fontSize: "0.85rem" }}>U</span>
        </TBtn>

        <Box sx={{ position: "relative" }} ref={colorRef}>
          <Tooltip title="Text color" arrow placement="top">
            <Box
              component="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setColorOpen((o) => !o);
              }}
              sx={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                bgcolor: "transparent",
                "&:hover": { bgcolor: "#f3f4f6" },
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#374151", lineHeight: 1 }}>A</span>
              <Box sx={{ width: 14, height: 3, borderRadius: "2px", bgcolor: "#4f46e5", mt: "2px" }} />
            </Box>
          </Tooltip>

          {colorOpen && (
            <Box
              sx={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                zIndex: 9999,
                bgcolor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 2,
                p: 1,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                display: "grid",
                gridTemplateColumns: "repeat(4, 22px)",
                gap: "4px",
              }}
            >
              {TEXT_COLORS.map((c) => (
                <Box
                  key={c}
                  component="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyColor(c);
                  }}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    bgcolor: c,
                    border: "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      border: "2px solid #4f46e5",
                      transform: "scale(1.15)",
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        <TSep />

        <TBtn
          title="Align Left"
          active={align === "left"}
          onClick={() => {
            exec("justifyLeft");
            setAlign("left");
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5" width="18" height="2" />
            <rect x="3" y="11" width="12" height="2" />
            <rect x="3" y="17" width="15" height="2" />
          </svg>
        </TBtn>

        <TBtn
          title="Align Center"
          active={align === "center"}
          onClick={() => {
            exec("justifyCenter");
            setAlign("center");
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5" width="18" height="2" />
            <rect x="6" y="11" width="12" height="2" />
            <rect x="4" y="17" width="16" height="2" />
          </svg>
        </TBtn>

        <TBtn
          title="Align Right"
          active={align === "right"}
          onClick={() => {
            exec("justifyRight");
            setAlign("right");
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5" width="18" height="2" />
            <rect x="9" y="11" width="12" height="2" />
            <rect x="6" y="17" width="15" height="2" />
          </svg>
        </TBtn>

        <TSep />

        <TBtn title="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="4" cy="6" r="1.5" />
            <rect x="7" y="5" width="14" height="2" />
            <circle cx="4" cy="12" r="1.5" />
            <rect x="7" y="11" width="14" height="2" />
            <circle cx="4" cy="18" r="1.5" />
            <rect x="7" y="17" width="14" height="2" />
          </svg>
        </TBtn>

        <TBtn title="Numbered list" onClick={() => exec("insertOrderedList")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <text x="2" y="8" fontSize="7" fontWeight="bold" fontFamily="monospace">1.</text>
            <rect x="9" y="5" width="12" height="2" />
            <text x="2" y="14" fontSize="7" fontWeight="bold" fontFamily="monospace">2.</text>
            <rect x="9" y="11" width="12" height="2" />
            <text x="2" y="20" fontSize="7" fontWeight="bold" fontFamily="monospace">3.</text>
            <rect x="9" y="17" width="12" height="2" />
          </svg>
        </TBtn>

        <TBtn title="Decrease indent" onClick={() => exec("outdent")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5" width="18" height="2" />
            <path d="M8 9l-4 3 4 3V9z" />
            <rect x="9" y="11" width="12" height="2" />
            <rect x="3" y="17" width="18" height="2" />
          </svg>
        </TBtn>

        <TBtn title="Increase indent" onClick={() => exec("indent")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5" width="18" height="2" />
            <path d="M4 9l4 3-4 3V9z" />
            <rect x="9" y="11" width="12" height="2" />
            <rect x="3" y="17" width="18" height="2" />
          </svg>
        </TBtn>

        <TBtn title="Blockquote" onClick={insertQuote}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
          </svg>
        </TBtn>

        <TBtn
          title="Clear formatting"
          onClick={() => {
            exec("removeFormat");
            exec("unlink");
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="5" x2="19" y2="19" />
            <path d="M8 8H4l3.5 8h3" />
            <path d="M16 8h4l-1.5 4" />
          </svg>
        </TBtn>

        <Box sx={{ flex: 1 }} />

        <Tooltip title={expanded ? "Collapse" : "Expand editor"} arrow placement="top">
          <Box
            component="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onToggleExpand();
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              bgcolor: expanded ? "#eef2ff" : "#fff",
              color: expanded ? "#4f46e5" : "#6b7280",
              transition: "all 0.15s",
              "&:hover": {
                bgcolor: "#eef2ff",
                color: "#4f46e5",
                borderColor: "#c7d2fe",
              },
            }}
          >
            {expanded ? <CollapseIcon sx={{ fontSize: 15 }} /> : <ExpandIcon sx={{ fontSize: 15 }} />}
          </Box>
        </Tooltip>
      </Box>

      <Box
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={sync}
        onMouseUp={sync}
        onMouseDown={() => colorOpen && setColorOpen(false)}
        data-placeholder="Write your idea / script here…"
        sx={{
          minHeight: minH,
          maxHeight: expanded ? "60vh" : "320px",
          overflowY: "auto",
          px: 2,
          py: 1.5,
          fontSize: "0.9rem",
          lineHeight: 1.75,
          color: "#111827",
          outline: "none",
          fontFamily: "Arial, sans-serif",
          transition: "min-height 0.3s ease",
          "&:empty:before": {
            content: "attr(data-placeholder)",
            color: "#9ca3af",
            pointerEvents: "none",
          },
          "& ul": { paddingLeft: "1.5em", listStyleType: "disc" },
          "& ol": { paddingLeft: "1.5em", listStyleType: "decimal" },
          "& blockquote": {
            borderLeft: "3px solid #4f46e5",
            margin: "4px 0",
            padding: "4px 12px",
            color: "#4b5563",
            fontStyle: "italic",
            background: "#f5f3ff",
            borderRadius: "0 4px 4px 0",
          },
        }}
      />

      {error && (
        <Box sx={{ px: 2, py: 0.5, bgcolor: "#fef2f2" }}>
          <Typography sx={{ fontSize: "0.75rem", color: "#dc2626" }}>{error}</Typography>
        </Box>
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════
// Small shared components
// ═══════════════════════════════════════════════════════════
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
          <Box
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              p: 2.5,
              position: "relative",
            }}
          >
            <Typography
              sx={{
                position: "absolute",
                top: -4,
                left: 10,
                fontSize: "2.5rem",
                color: "#e0e7ff",
                fontFamily: "Georgia, serif",
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              "
            </Typography>
            <Typography
              sx={{
                fontSize: "0.95rem",
                color: "#1e293b",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                pt: 1.5,
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

function InlineStatusSelect({
  item,
  reload,
  toast,
  openEditWithStatus,
  canEdit,
}) {
  const [loading, setLoading] = useState(false);
  const val = item.scriptStatus || "Pending";

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
          scriptType: item.scriptType,
          scriptText: item.scriptText,
          referenceLink: item.referenceLink || "",
          hasShoot: !!item.hasShoot,
          scriptStatus: newVal,
          approverComment: item.approverComment || "",
          holdReason: "",
        },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      if (newVal === "Approved" && item.stage === "Ideation") {
        await axios.post(
          `${API}/${item._id}/proceed-to-shoot`,
          {},
          { headers: getAuthHeaders(), withCredentials: true }
        );

        toast(
          item.hasShoot
            ? "Approved & moved directly to Edit Pending! 🎬"
            : "Approved & moved to Shoot Pending! 🎬"
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
        {SCRIPT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Box>
      {loading && <CircularProgress size={14} sx={{ color: "#4f46e5" }} />}
    </Stack>
  );
}

const stripHtml = (html) => html?.replace(/<[^>]*>/g, "") || "";

const previewText = (html, max = 120) => {
  const txt = stripHtml(html).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  return txt.length > max ? txt.slice(0, max) + "…" : txt;
};

export default function OtherVideoIdeationPage() {
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

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hasShootFilter, setHasShootFilter] = useState("");

  const [stageCounts, setStageCounts] = useState({
    shoot: null,
    cut: null,
    edit: null,
    post: null,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createExpanded, setCreateExpanded] = useState(false);
  const [createForm, setCreateForm] = useState({
    scriptType: "",
    scriptText: "",
    referenceLink: "",
    hasShoot: false,
  });
  const [createErrors, setCreateErrors] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [editExpanded, setEditExpanded] = useState(false);
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
      };

      if (typeFilter) params.scriptType = typeFilter;
      if (statusFilter) params.scriptStatus = statusFilter;
      if (search.trim()) params.q = search.trim();
      if (hasShootFilter !== "") params.hasShoot = hasShootFilter;

      const { data } = await axios.get(API, {
        params,
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      setItems(data.otherVideos || []);
      setTotal(data.pagination?.total ?? (data.otherVideos || []).length);
    } catch (e) {
      showSnack(e.response?.data?.message || "Failed to load items", "error");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, typeFilter, statusFilter, search, hasShootFilter]);

  const loadCounts = useCallback(async () => {
    if (!isManager) return;

    try {
      const { data } = await axios.get(`${API}/stages-summary`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      const summary = data || {};

      setStageCounts({
        shoot: summary["Shoot Pending"] || 0,
        cut: summary["Shoot Done"] || 0,
        edit: (summary["Cut Done"] || 0) + (summary["Edit Pending"] || 0),
        post: summary["Edit Done"] || 0,
      });
    } catch {}
  }, [isManager]);

  const refreshAll = useCallback(() => {
    load();
    loadCounts();
  }, [load, loadCounts]);

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
    setTypeFilter("");
    setStatusFilter("");
    setHasShootFilter("");
    setPage(0);
  };

  const openCreate = () => {
    setCreateForm({
      scriptType: "",
      scriptText: "",
      referenceLink: "",
      hasShoot: false,
    });
    setCreateErrors({});
    setCreateExpanded(false);
    setCreateOpen(true);
  };

  const validateCreate = () => {
    const errs = {};
    if (!createForm.scriptType) errs.scriptType = "Required";
    if (!stripHtml(createForm.scriptText).trim()) errs.scriptText = "Required";
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

      showSnack(`Other video ${data.otherVideo.otherVideoId} created!`);
      setCreateOpen(false);
      setPage(0);
      refreshAll();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const openEdit = (item, prefillStatus = null) => {
    setEditTarget(item);
    setEditForm({
      scriptType: item.scriptType,
      scriptText: item.scriptText,
      referenceLink: item.referenceLink || "",
      hasShoot: !!item.hasShoot,
      scriptStatus: prefillStatus || item.scriptStatus || "Pending",
      approverComment: item.approverComment || "",
      holdReason: item.holdReason || "",
    });
    setEditErrors({});
    setEditExpanded(false);
    setEditOpen(true);
  };

  const validateEdit = () => {
    const errs = {};
    if (!editForm.scriptType) errs.scriptType = "Required";
    if (!stripHtml(editForm.scriptText || "").trim()) errs.scriptText = "Required";
    if (NEEDS_REASON.has(editForm.scriptStatus) && !editForm.holdReason?.trim()) {
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

      showSnack("Other video updated!");
      setEditOpen(false);
      refreshAll();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const handleProceedFromIdeation = async () => {
    if (!editTarget || !validateEdit()) return;

    try {
      await axios.put(`${API}/${editTarget._id}`, editForm, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      await axios.post(
        `${API}/${editTarget._id}/proceed-to-shoot`,
        {},
        { headers: getAuthHeaders(), withCredentials: true }
      );

      showSnack(
        editForm.hasShoot
          ? "Approved & moved directly to Edit Pending! 🎬"
          : "Moved to Shoot Pending! 🎬"
      );

      setEditOpen(false);
      refreshAll();
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this other video item?")) return;

    try {
      await axios.delete(`${API}/${id}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      showSnack("Deleted");

      if (items.length === 1 && page > 0) {
        setPage((p) => p - 1);
      } else {
        refreshAll();
      }
    } catch (e) {
      showSnack(e.response?.data?.message || "Error", "error");
    }
  };

  const canEditItem = (item) => isManager || item.createdBy === currentUser?.fullName;
  const needsReason = NEEDS_REASON.has(editForm.scriptStatus);
  const canProceed =
    editForm.scriptStatus === "Approved" && editTarget?.stage === "Ideation";

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
            Other Video <Box component="span" sx={{ color: "#4f46e5" }}>Ideation</Box>
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
                icon={<VideocamIcon sx={{ fontSize: 16 }} />}
                accent={NAV_ACCENT.Shoot}
                count={stageCounts.shoot}
                onClick={() => navigate("/marketing/other-videos/shoot")}
              />
              <NavButton
                label="Cut"
                icon={<CutIcon sx={{ fontSize: 16 }} />}
                accent={NAV_ACCENT.Cut}
                count={stageCounts.cut}
                onClick={() => navigate("/marketing/other-videos/cut")}
              />
              <NavButton
                label="Edit"
                icon={<EditStageIcon sx={{ fontSize: 16 }} />}
                accent={NAV_ACCENT.Edit}
                count={stageCounts.edit}
                onClick={() => navigate("/marketing/other-videos/edit")}
              />
              <NavButton
                label="Post"
                icon={<PostIcon sx={{ fontSize: 16 }} />}
                accent={NAV_ACCENT.Post}
                count={stageCounts.post}
                onClick={() => navigate("/marketing/other-videos/post")}
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
            Add Idea
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ ...lightPaper, p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
          <FormControl size="small" sx={{ minWidth: 220, ...inputSx }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Types</MenuItem>
              {SCRIPT_TYPES.map((t) => (
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
              {SCRIPT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180, ...inputSx }}>
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
            label="Search (Idea / ID / Link)"
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

          <Button onClick={refreshAll} sx={{ textTransform: "none", fontWeight: 700, color: "#4f46e5" }}>
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
                <TableCell>Other Video ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Have a Shoot</TableCell>
                <TableCell>Preview</TableCell>
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
                    No ideas found
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
                        <Typography
                          sx={{
                            fontFamily: "'Syne',sans-serif",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            color: "#4f46e5",
                          }}
                        >
                          {item.otherVideoId}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: "0.8rem", color: "#4b5563", fontWeight: 500 }}>
                          {item.scriptType}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box
                          sx={{
                            display: "inline-block",
                            px: 1.1,
                            py: 0.35,
                            borderRadius: "100px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            bgcolor: item.hasShoot ? "#ecfdf5" : "#f8fafc",
                            color: item.hasShoot ? "#059669" : "#64748b",
                            border: item.hasShoot
                              ? "1px solid #6ee7b7"
                              : "1px solid #e2e8f0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.hasShoot ? "Yes" : "No"}
                        </Box>
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
                            {previewText(item.scriptText, 140)}
                          </Typography>

                          <Tooltip title="View Full Idea / Script">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setViewContent(item);
                                setViewOpen(true);
                              }}
                              sx={{
                                color: "#64748b",
                                "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                              }}
                            >
                              <ViewIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
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
                          reload={refreshAll}
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
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                }}
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
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": { color: "#4f46e5", bgcolor: "#eef2ff" },
                                }}
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
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": { color: "#dc2626", bgcolor: "#fef2f2" },
                                }}
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

      {/* View Modal */}
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
            <ViewIcon sx={{ color: "#4f46e5" }} />
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Full Idea / Script
            </Typography>
          </Stack>

          <IconButton
            size="small"
            onClick={() => setViewOpen(false)}
            sx={{
              color: "#64748b",
              "&:hover": { color: "#0f172a", bgcolor: "#f1f5f9" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, px: 3, pb: 4 }}>
          {viewContent && (
            <Box>
              <Stack direction="row" spacing={1.5} mb={2.5} alignItems="center">
                <Typography
                  sx={{
                    fontFamily: "'Inter',sans-serif",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "#4f46e5",
                  }}
                >
                  {viewContent.otherVideoId}
                </Typography>

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
                  {viewContent.scriptType}
                </Box>

                <Box
                  sx={{
                    display: "inline-block",
                    px: 1.1,
                    py: 0.35,
                    borderRadius: "100px",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    bgcolor: viewContent.hasShoot ? "#ecfdf5" : "#f8fafc",
                    color: viewContent.hasShoot ? "#059669" : "#64748b",
                    border: viewContent.hasShoot
                      ? "1px solid #6ee7b7"
                      : "1px solid #e2e8f0",
                  }}
                >
                  {viewContent.hasShoot ? "Have a Shoot: Yes" : "Have a Shoot: No"}
                </Box>
              </Stack>

              <Box
                sx={{
                  bgcolor: "#f8fafc",
                  p: 2.5,
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Box
                  sx={{
                    fontSize: "0.95rem",
                    color: "#334155",
                    lineHeight: 1.7,
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
                  dangerouslySetInnerHTML={{ __html: viewContent.scriptText || "" }}
                />
              </Box>

              {viewContent.referenceLink && (
                <Button
                  component="a"
                  href={viewContent.referenceLink}
                  target="_blank"
                  startIcon={<LinkIcon />}
                  sx={{
                    mt: 2,
                    color: "#4f46e5",
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Open Reference Link
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateExpanded(false);
        }}
        maxWidth={createExpanded ? "lg" : "sm"}
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#fff",
            borderRadius: 3,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            transition: "max-width 0.25s ease",
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
          Add New Other Video Idea
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

          <FormControl size="small" error={!!createErrors.scriptType} sx={inputSx}>
            <InputLabel>Type *</InputLabel>
            <Select
              value={createForm.scriptType}
              label="Type *"
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, scriptType: e.target.value }))
              }
            >
              {SCRIPT_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
            {createErrors.scriptType && (
              <FormHelperText>{createErrors.scriptType}</FormHelperText>
            )}
          </FormControl>

          <Box>
            <Typography sx={{ fontSize: "0.8rem", color: "#374151", fontWeight: 600, mb: 0.8 }}>
              Idea / Script *
            </Typography>
            <RichEditor
              value={createForm.scriptText}
              onChange={(html) =>
                setCreateForm((f) => ({ ...f, scriptText: html }))
              }
              error={createErrors.scriptText}
              expanded={createExpanded}
              onToggleExpand={() => setCreateExpanded((e) => !e)}
            />
          </Box>

          <TextField
            label="Reference Link (optional)"
            placeholder="https://..."
            size="small"
            value={createForm.referenceLink}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, referenceLink: e.target.value }))
            }
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
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              px: 2,
              py: 1.5,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={createForm.hasShoot}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, hasShoot: e.target.checked }))
                  }
                  sx={{
                    color: "#94a3b8",
                    "&.Mui-checked": { color: "#4f46e5" },
                  }}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>
                    Have a Shoot
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#6b7280", mt: 0.2 }}>
                    If checked, this item will skip Shoot and Cut after approval and go directly to Edit Pending.
                  </Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e5e7eb", gap: 1 }}>
          <Button
            onClick={() => {
              setCreateOpen(false);
              setCreateExpanded(false);
            }}
            sx={{ color: "#4b5563", textTransform: "none" }}
          >
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
            Save Idea
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditExpanded(false);
        }}
        maxWidth={editExpanded ? "lg" : "sm"}
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#fff",
            borderRadius: 3,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            transition: "max-width 0.25s ease",
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
          Edit Other Video Idea
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
              {editTarget.otherVideoId}
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <FormControl size="small" error={!!editErrors.scriptType} sx={inputSx}>
            <InputLabel>Type *</InputLabel>
            <Select
              value={editForm.scriptType || ""}
              label="Type *"
              onChange={(e) =>
                setEditForm((f) => ({ ...f, scriptType: e.target.value }))
              }
            >
              {SCRIPT_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
            {editErrors.scriptType && (
              <FormHelperText>{editErrors.scriptType}</FormHelperText>
            )}
          </FormControl>

          <Box>
            <Typography sx={{ fontSize: "0.8rem", color: "#374151", fontWeight: 600, mb: 0.8 }}>
              Idea / Script *
            </Typography>
            <RichEditor
              value={editForm.scriptText}
              onChange={(html) => setEditForm((f) => ({ ...f, scriptText: html }))}
              error={editErrors.scriptText}
              expanded={editExpanded}
              onToggleExpand={() => setEditExpanded((e) => !e)}
            />
          </Box>

          <TextField
            label="Reference Link"
            size="small"
            value={editForm.referenceLink || ""}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, referenceLink: e.target.value }))
            }
            sx={inputSx}
          />

          <Box
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              px: 2,
              py: 1.5,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!editForm.hasShoot}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, hasShoot: e.target.checked }))
                  }
                  sx={{
                    color: "#94a3b8",
                    "&.Mui-checked": { color: "#4f46e5" },
                  }}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>
                    Have a Shoot
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#6b7280", mt: 0.2 }}>
                    If checked, this item will skip Shoot and Cut after approval and go directly to Edit Pending.
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
                  value={editForm.scriptStatus || "Pending"}
                  label="Status"
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      scriptStatus: e.target.value,
                      holdReason: "",
                    }))
                  }
                >
                  {SCRIPT_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {needsReason && (
                <TextField
                  label={`Reason for "${editForm.scriptStatus}" *`}
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
                  setEditForm((f) => ({
                    ...f,
                    approverComment: e.target.value,
                  }))
                }
                sx={inputSx}
              />
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: "1px solid #e5e7eb", gap: 1, flexWrap: "wrap" }}>
          <Button
            onClick={() => {
              setEditOpen(false);
              setEditExpanded(false);
            }}
            sx={{ color: "#4b5563", textTransform: "none" }}
          >
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
              onClick={handleProceedFromIdeation}
              sx={{
                bgcolor: "#10b981",
                color: "#fff",
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "none",
                "&:hover": { bgcolor: "#059669" },
              }}
            >
              {editForm.hasShoot ? "Proceed to Edit" : "Proceed to Shoot"}
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
          sx={{
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            borderRadius: 2,
          }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Stack,
  Tooltip,
  Chip,
  LinearProgress,
} from "@mui/material";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";  // using localhost backend for this setup

// UI palette
const COLORS = {
  bg: "#0b1220",
  card: "#121a2b",
  accent: "#4f85ff",
  success: "#00c853",
  danger: "#ff5252",
  text: "#e6edf6",
  sub: "#94a3b8",
  chip: "#1f2937",
};

// How long a popup stays visible (ms) before auto-dismiss
const AUTO_DISMISS_MS = 20000;
// Mute duration when user clicks mute (ms)
const MUTE_MS = 5 * 60 * 1000;
// Max stacked toasts visible
const MAX_VISIBLE = 3;

// helpers
const prettyPhone = (p) =>
  !p ? "-" : String(p).replace(/[^\d+]/g, "").replace(/^(\+?91)?(\d{5})(\d{5})$/, "+91-$2-$3");
const timeAgo = (iso) => (iso ? dayjs(iso).fromNow?.() || dayjs(iso).format("HH:mm") : "now");

// simple WebAudio beep (no file needed)
function useBeep() {
  const ctxRef = useRef(null);
  useEffect(() => () => ctxRef.current?.close?.(), []);
  return (enabled = true) => {
    if (!enabled) return;
    try {
      const ctx = (ctxRef.current ||= new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.32);
    } catch {}
  };
}

function ToastCard({ item, onDismiss, onView, onCopy, onMute, muted }) {
  const since = useMemo(() => timeAgo(item.start_time), [item.start_time]);
  const progress = Math.max(0, 100 - (item.agePct || 0));

  return (
    <Paper
      elevation={0}
      sx={{
        width: 340,
        p: 1.5,
        mb: 1.5,
        borderRadius: 2.5,
        overflow: "hidden",
        bgcolor: COLORS.card,
        color: COLORS.text,
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: "rgba(79,133,255,0.15)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <PhoneInTalkIcon sx={{ color: COLORS.accent }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap fontWeight={700}>
            Incoming Call
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.sub }} noWrap>
            {prettyPhone(item.caller)} • DID: {item.did || "-"}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.sub }}>
            {item.agent ? `Agent: ${item.agent}` : ""} {since ? ` • ${since}` : ""}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.5}>
          <Tooltip title={muted ? "Unmute" : "Mute 5 min"}>
            <IconButton size="small" onClick={onMute} sx={{ color: COLORS.sub }}>
              {muted ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Dismiss">
            <IconButton size="small" onClick={onDismiss} sx={{ color: COLORS.sub }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} mt={1}>
        <Chip
          size="small"
          label={(item.direction || "inbound").toUpperCase()}
          sx={{ bgcolor: COLORS.chip, color: COLORS.text, fontWeight: 700 }}
        />
        {item.status && (
          <Chip
            size="small"
            label={String(item.status).toUpperCase()}
            sx={{
              bgcolor:
                String(item.status).toLowerCase().includes("miss") ? COLORS.danger : COLORS.chip,
              color: COLORS.text,
            }}
          />
        )}
      </Stack>

      <Stack direction="row" spacing={1} mt={1.25}>
        <Button
          variant="contained"
          size="small"
          onClick={onView}
          endIcon={<LaunchIcon />}
          sx={{
            textTransform: "none",
            bgcolor: COLORS.accent,
            "&:hover": { bgcolor: "#3c6fea" },
            boxShadow: "none",
          }}
        >
          View Caller
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={onCopy}
          startIcon={<ContentCopyIcon />}
          sx={{
            textTransform: "none",
            borderColor: "rgba(255,255,255,0.2)",
            color: COLORS.text,
            "&:hover": { borderColor: "rgba(255,255,255,0.35)" },
          }}
        >
          Copy
        </Button>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          mt: 1.25,
          height: 4,
          bgcolor: "rgba(255,255,255,0.08)",
          "& .MuiLinearProgress-bar": { bgcolor: COLORS.accent },
          borderRadius: 10,
        }}
      />
    </Paper>
  );
}

export default function SmartfloIncomingCallOverlay() {
  const navigate = useNavigate();

  // pull agent number from your session user
  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const agentNumber =
    user?.agentNumber || user?.extension || user?.phoneExt || user?.agent_number || "";

  const EVENT_URL = `${API_BASE}/api/smartflo/events${
    agentNumber ? `?agentNumber=${encodeURIComponent(agentNumber)}` : ""
  }`;

  const [items, setItems] = useState([]); // queued toasts
  const [mutedUntil, setMutedUntil] = useState(() => {
    const x = localStorage.getItem("sf_mute_until");
    return x ? Number(x) : 0;
  });
  const muted = mutedUntil > Date.now();

  const seenIdsRef = useRef(new Set()); // de-dupe call_ids
  const esRef = useRef(null);
  const tickRef = useRef(0);
  const beep = useBeep();

  // auto-age & auto-dismiss
  useEffect(() => {
    const int = setInterval(() => {
      tickRef.current++;
      setItems((prev) =>
        prev
          .map((it) => {
            const elapsed = Date.now() - it.createdAt;
            const agePct = Math.min(100, (elapsed / AUTO_DISMISS_MS) * 100);
            return { ...it, agePct };
          })
          .filter((it) => Date.now() - it.createdAt < AUTO_DISMISS_MS)
      );
    }, 250);
    return () => clearInterval(int);
  }, []);

  // Persist mute state
  useEffect(() => {
    localStorage.setItem("sf_mute_until", String(mutedUntil || 0));
  }, [mutedUntil]);

  // Open SSE stream — IMPORTANT: no credentials to avoid CORS error when ACAO is '*'
  useEffect(() => {
    let retryDelay = 1500;
    let cancelled = false;

    const open = () => {
      if (cancelled) return;
      try {
        esRef.current?.close?.();
      } catch {}

      // NO withCredentials here (fixes: "must not be wildcard '*' when credentials mode is include")
      const es = new EventSource(EVENT_URL);
      esRef.current = es;

      es.onopen = () => {
        retryDelay = 1500;
        // console.log("[SSE] open", EVENT_URL);
      };

      es.onerror = () => {
        // console.warn("[SSE] error, retrying…");
        es.close();
        if (!cancelled) {
          setTimeout(open, Math.min(retryDelay, 15000));
          retryDelay *= 1.8;
        }
      };

      es.onmessage = (ev) => {
        if (!ev?.data) return;
        try {
          const payload = JSON.parse(ev.data);
          const type = String(payload.type || "").toLowerCase();
          if (!["incoming_call", "call.received", "ringing"].includes(type)) return;

          const callId =
            payload.call_id ||
            payload.session_id ||
            `${payload.callerid}-${payload.start_time || ""}`;
          if (seenIdsRef.current.has(callId)) return;
          seenIdsRef.current.add(callId);

          const caller =
            payload.callerid || payload.client_number || payload.customer || payload.from || "";
          const did = payload.did_number || payload.did || payload.called_number || payload.to || "";
          const start = payload.start_time || new Date().toISOString();
          const agent = payload.agent_name || payload.agent || "";

          const toast = {
            id: callId,
            caller,
            did,
            start_time: start,
            agent,
            direction: payload.direction || "inbound",
            status: payload.status || "ringing",
            createdAt: Date.now(),
            agePct: 0,
          };

          setItems((prev) => {
            const next = [toast, ...prev];
            beep(!muted);
            return next.slice(0, 12);
          });
        } catch {
          // ignore bad JSON
        }
      };
    };

    open();
    return () => {
      cancelled = true;
      try {
        esRef.current?.close?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [EVENT_URL, muted]);

  // Actions
  const dismiss = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const copyNum = async (num) => {
    try {
      await navigator.clipboard.writeText(String(num || ""));
    } catch {}
  };
  const muteToggle = () => setMutedUntil(muted ? 0 : Date.now() + MUTE_MS);
  const viewCaller = (phone) => {
    if (phone) navigate(`/lead/${String(phone).replace(/[^\d]/g, "")}`);
  };

  const visible = items.slice(0, MAX_VISIBLE);

  return (
    <Box
      sx={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,  // Ensure highest z-index for overlay
        pointerEvents: "none",  // Let underlying content be clickable
      }}
    >
      {visible.map((item, idx) => (
        <Box
          key={item.id}
          sx={{
            transform: `translateY(${idx * 8}px)`,
            transition: "transform 0.2s ease",
            pointerEvents: "auto",  // Allow interaction with cards
          }}
        >
          <ToastCard
            item={item}
            muted={muted}
            onDismiss={() => dismiss(item.id)}
            onCopy={() => copyNum(item.caller)}
            onMute={muteToggle}
            onView={() => viewCaller(item.caller)}
          />
        </Box>
      ))}
    </Box>
  );
}

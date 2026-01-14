import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import {
  Box,
  Paper,
  Stack,
  Typography,
  Avatar,
  Button,
  IconButton,
  Slide,
  Fade,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

/* -----------------------------
   Helpers
------------------------------ */
function digitsOnly(v = "") {
  return String(v || "").replace(/\D/g, "");
}
function phone10(v = "") {
  const p = digitsOnly(v);
  return p.length >= 10 ? p.slice(-10) : p;
}
function roomForPhone10(p10) {
  return `wa:${String(p10 || "").slice(-10)}`;
}
function initials(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return (parts[0][0] || "?").toUpperCase();
  return `${(parts[0][0] || "").toUpperCase()}${(parts[parts.length - 1][0] || "").toUpperCase()}`;
}
function timeLabel(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// customer phone resolver: OUTBOUND => to, INBOUND => from
function customerPhoneFromMsg(msg) {
  const dir = String(msg?.direction || "").toUpperCase();
  if (dir === "OUTBOUND") return msg?.to || "";
  if (dir === "INBOUND") return msg?.from || "";
  return msg?.phone || msg?.to || msg?.from || "";
}

function isChatAlreadyOpenFor(phoneDigitsOrP10) {
  try {
    const path = window.location.pathname || "";
    if (!path.startsWith("/whatsaap/chat")) return false;

    const qs = new URLSearchParams(window.location.search || "");
    const openPhone = qs.get("phone") || "";
    const openP10 = phone10(openPhone);
    const targetP10 = phone10(phoneDigitsOrP10);
    return !!openP10 && !!targetP10 && openP10 === targetP10;
  } catch {
    return false;
  }
}

// 🔔 tiny safe ding (placeholder). For best reliability/quality, replace with /public wav/mp3 later.
function playDing() {
  try {
    const audio = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA="
    );
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {}
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) throw new Error(data?.message || `Request failed: ${res.status}`);
  return data;
}

/* =========================================================
   Component
========================================================= */
export default function WhatsAppNotification() {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // room join tracking
  const joinedRoomsRef = useRef(new Set()); // Set<phone10>
  const convMapRef = useRef(new Map()); // Map<phone10, { displayName, phoneDigits }>

  const [toast, setToast] = useState(null);

  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const myName = useMemo(
    () => String(sessionUser?.fullName || "").trim().toLowerCase(),
    [sessionUser?.fullName]
  );
  const myRole = useMemo(() => String(sessionUser?.role || ""), [sessionUser?.role]);

  // auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshAndJoinMyRooms = useCallback(async () => {
    if (!myName) return;

    const query = new URLSearchParams({
      role: myRole || "",
      userName: sessionUser?.fullName || "",
    }).toString();

    const data = (await apiGet(`/api/whatsapp/conversations?${query}`)) || [];
    const list = Array.isArray(data) ? data : [];

    // Only chats assigned to me (extra enforce)
    const mine = list.filter((c) => {
      const assigned = String(c?.assignedToLabel || "").trim().toLowerCase();
      return assigned && assigned === myName;
    });

    const nextMap = new Map();
    mine.forEach((c) => {
      const p10 = phone10(c?.phone);
      if (!p10) return;
      nextMap.set(p10, {
        displayName: c?.displayName || p10,
        phoneDigits: digitsOnly(c?.phone) || p10,
      });
    });
    convMapRef.current = nextMap;

    const s = socketRef.current;
    if (!s) return;

    const nextSet = new Set(Array.from(nextMap.keys()));

    for (const p10 of nextSet) {
      if (joinedRoomsRef.current.has(p10)) continue;
      s.emit("wa:join", { phone: p10 });
      joinedRoomsRef.current.add(p10);
    }

    for (const p10 of Array.from(joinedRoomsRef.current)) {
      if (nextSet.has(p10)) continue;
      s.emit("wa:leave", { phone: p10 });
      joinedRoomsRef.current.delete(p10);
    }
  }, [myName, myRole, sessionUser?.fullName]);

  /* -----------------------------
     Socket connect
  ------------------------------ */
  useEffect(() => {
    if (!myName) return;

    const s = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });

    socketRef.current = s;

    const onConnect = () => {
      refreshAndJoinMyRooms().catch(() => {});
    };

    const onMessage = (payload) => {
      const msg = payload?.message || payload?.msg || payload;
      if (!msg) return;

      // only inbound
      const isInbound = String(msg?.direction || "").toUpperCase() === "INBOUND";
      if (!isInbound) return;

      const customerPhone = customerPhoneFromMsg(msg);
      const p10 = phone10(customerPhone);
      if (!p10) return;

      // only if in my rooms
      if (!joinedRoomsRef.current.has(p10)) return;

      const meta = convMapRef.current.get(p10);
      const title = meta?.displayName || p10;

      const hasMedia = !!msg?.media?.url;
      const subtitle = hasMedia
        ? msg?.type === "image"
          ? "📷 Photo received"
          : msg?.type === "video"
          ? "🎥 Video received"
          : "📎 Attachment received"
        : String(msg?.text || "").trim().slice(0, 140) || "New message received";

      const phoneDigits = meta?.phoneDigits || digitsOnly(customerPhone) || p10;

      // ✅ don't show popup if already open on that chat
      if (isChatAlreadyOpenFor(phoneDigits)) return;

      // ✅ de-dupe + 🔔 play sound only if we show toast
      setToast((prev) => {
        const sameChat = prev?.p10 === p10;
        const sameText = (prev?.subtitle || "") === subtitle;
        const tooSoon = prev?.ts && Date.now() - prev.ts < 1500;
        if (sameChat && sameText && tooSoon) return prev;

        playDing();

        return {
          p10,
          phoneDigits,
          title,
          subtitle,
          ts: Date.now(),
        };
      });
    };

    s.on("connect", onConnect);
    s.on("wa:message", onMessage);

    const interval = setInterval(() => {
      refreshAndJoinMyRooms().catch(() => {});
    }, 60_000);

    return () => {
      clearInterval(interval);
      try {
        s.off("connect", onConnect);
        s.off("wa:message", onMessage);
        for (const p10 of Array.from(joinedRoomsRef.current)) s.emit("wa:leave", { phone: p10 });
        joinedRoomsRef.current.clear();
        s.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, [myName, refreshAndJoinMyRooms]);

  if (!myName) return null;

  const openChat = () => {
    if (!toast) return;
    const p = toast.phoneDigits || toast.p10;
    navigate(`/whatsaap/chat?phone=${encodeURIComponent(p)}`);
    setToast(null);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 2500,
        width: 380,
        maxWidth: "calc(100vw - 36px)",
        pointerEvents: "none", // only card is clickable
      }}
    >
      <Slide direction="left" in={Boolean(toast)} mountOnEnter unmountOnExit>
        <Box sx={{ pointerEvents: "auto" }}>
          <Fade in={Boolean(toast)} timeout={180}>
            <Paper
              elevation={10}
              sx={{
                overflow: "hidden",
                borderRadius: 4,
                border: "1px solid rgba(0,0,0,0.10)",
                bgcolor: "#fff",
                boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
                transform: "translateZ(0)",
                "&:hover": { boxShadow: "0 22px 54px rgba(0,0,0,0.22)" },
              }}
            >
              {/* Top accent bar */}
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg, #25D366 0%, #128C7E 60%, #075E54 100%)",
                }}
              />

              <Box sx={{ p: 1.25 }}>
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "rgba(18,140,126,0.12)",
                      color: "#075E54",
                      fontWeight: 900,
                    }}
                  >
                    {initials(toast?.title || "")}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                        <WhatsAppIcon sx={{ fontSize: 18, color: "#25D366" }} />
                        <Typography sx={{ fontWeight: 950 }} noWrap>
                          {toast?.title || "New WhatsApp message"}
                        </Typography>
                      </Stack>

                      <Typography sx={{ fontSize: 11, color: "text.secondary", flexShrink: 0 }}>
                        {toast?.ts ? timeLabel(toast.ts) : ""}
                      </Typography>
                    </Stack>

                    <Typography
                      sx={{
                        mt: 0.35,
                        fontSize: 13,
                        color: "text.secondary",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {toast?.subtitle || "New message received"}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1.1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={openChat}
                        sx={{
                          textTransform: "none",
                          fontWeight: 950,
                          borderRadius: 999,
                          px: 1.5,
                          bgcolor: "#25D366",
                          "&:hover": { bgcolor: "#1fb85a" },
                        }}
                      >
                        Open chat
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setToast(null)}
                        sx={{
                          textTransform: "none",
                          borderRadius: 999,
                          px: 1.4,
                          borderColor: "rgba(0,0,0,0.18)",
                          color: "rgba(0,0,0,0.75)",
                          "&:hover": { borderColor: "rgba(0,0,0,0.28)" },
                        }}
                      >
                        Dismiss
                      </Button>
                    </Stack>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={() => setToast(null)}
                    sx={{
                      mt: -0.25,
                      color: "rgba(0,0,0,0.55)",
                      "&:hover": { color: "rgba(0,0,0,0.8)" },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>

                {/* Auto-dismiss progress bar (7s) */}
                <Box
                  sx={{
                    mt: 1.25,
                    height: 3,
                    borderRadius: 999,
                    bgcolor: "rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: "100%",
                      bgcolor: "#25D366",
                      transformOrigin: "left",
                      animation: "wa_toast_progress 7s linear forwards",
                      "@keyframes wa_toast_progress": {
                        from: { transform: "scaleX(1)" },
                        to: { transform: "scaleX(0)" },
                      },
                    }}
                  />
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Box>
      </Slide>
    </Box>
  );
} 
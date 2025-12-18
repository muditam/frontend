import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  CircularProgress,
  Chip,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5001";

const TaskNotifications = ({ anchorEl, onClose, onUnreadChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  // --------------------------------------------------
  // READ USER FROM SESSION STORAGE (SOURCE OF TRUTH)
  // --------------------------------------------------
  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const axiosApi = useMemo(() => {
    return axios.create({
      baseURL: API_BASE,
      timeout: 20000,
    });
  }, []);

  const normalizeId = (v) => String(v ?? "");

  // --------------------------------------------------
  // FETCH NOTIFICATIONS
  // --------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    if (!user?.fullName || !user?.role) {
      console.warn("[Notifications] Missing fullName / role", user);
      return;
    }

    try {
      setLoading(true);

      const res = await axiosApi.get("/api/notifications", {
        params: {
          fullName: user.fullName,
          role: user.role,
        },
      });

      const raw = Array.isArray(res.data) ? res.data : [];

      const normalized = raw.map((n) => ({
        ...n,
        id: normalizeId(n.id),
      }));

      setNotifications(normalized);
      onUnreadChange?.(normalized.length);
    } catch (err) {
      console.error(
        "Notification fetch failed:",
        err?.response?.data || err
      );
    } finally {
      setLoading(false);
    }
  }, [axiosApi, user, onUnreadChange]);

  // --------------------------------------------------
  // MARK AS READ
  // --------------------------------------------------
  const markAsRead = useCallback(
    async (n) => {
      const id = normalizeId(n?.id);
      if (!id) return;

      try {
        await axiosApi.patch("/api/notifications/read", {
          type: n.type,
          id,
        });

        setNotifications((prev) => {
          const next = prev.filter((x) => normalizeId(x.id) !== id);
          onUnreadChange?.(next.length);
          return next;
        });

        // navigation
        if (n.type === "TASK") navigate("/task-board");
        if (n.type === "ABANDONED_CART") navigate("/abandoned-analytics");
        if (n.type === "RTO" || n.type === "RTO_DELIVERED") navigate("/orders");
        if (n.type === "ESCALATION") navigate("/escalations");

        onClose?.();
      } catch (err) {
        console.error("Mark read failed:", err?.response?.data || err);
      }
    },
    [axiosApi, navigate, onClose, onUnreadChange]
  );

  // --------------------------------------------------
  // FETCH ON OPEN (CRITICAL)
  // --------------------------------------------------
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // --------------------------------------------------
  // POLLING ONLY WHEN OPEN
  // --------------------------------------------------
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(fetchNotifications, 20000);

    const onVisible = () => {
      if (document.visibilityState === "visible" && open) {
        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [open, fetchNotifications]);

  // --------------------------------------------------
  // CHIP
  // --------------------------------------------------
  const renderChip = (type) => {
    switch (type) {
      case "TASK":
        return <Chip label="Task" size="small" color="primary" />;
      case "ABANDONED_CART":
        return <Chip label="Abandoned" size="small" color="warning" />;
      case "RTO":
        return <Chip label="RTO" size="small" color="error" />;
      case "RTO_DELIVERED":
        return <Chip label="RTO Delivered" size="small" color="success" />;
      case "ESCALATION":
        return <Chip label="Escalation" size="small" color="secondary" />;
      default:
        return <Chip label={type || "Other"} size="small" />;
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={{
        sx: {
          width: 380,
          maxHeight: 460,
          borderRadius: 2,
          boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
        },
      }}
    >
      <Box sx={{ p: 1.5 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography fontWeight={600}>Notifications</Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Body */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ py: 4 }}
          >
            No new notifications
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((n) => (
              <ListItem
                key={normalizeId(n.id)}
                button
                onClick={() => markAsRead(n)}
                sx={{
                  mb: 0.5,
                  borderRadius: 1,
                  bgcolor: "#f9fafb",
                  alignItems: "flex-start",
                  "&:hover": { bgcolor: "#eef2ff" },
                }}
              >
                <ListItemText
                  primary={
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1}
                    >
                      <Typography fontSize={14} fontWeight={600}>
                        {n.title}
                      </Typography>
                      {renderChip(n.type)}
                    </Box>
                  }
                  secondary={
                    <>
                      {n.message && (
                        <Typography variant="caption" color="text.secondary">
                          {n.message}
                        </Typography>
                      )}
                      <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                        <AccessTimeIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption">
                          {n.notifiedAt
                            ? new Date(n.notifiedAt).toLocaleString()
                            : ""}
                        </Typography>
                      </Box>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Popover>
  );
};

export default TaskNotifications;

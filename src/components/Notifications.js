import React, { useState, useEffect } from "react";
import {
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Badge,
  Button,
  ListItemSecondaryAction,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Helper to safely format date
const formatDate = (dateString) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";
  return d.toISOString().split("T")[0];
};

const Notifications = () => {
  const navigate = useNavigate();

  // -------------------------------------------
  // Retrieve logged-in user from sessionStorage
  // -------------------------------------------
  const storedUser = sessionStorage.getItem("user");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : null;

  // -------------------------------------------------------
  // State: notifications array, popover anchor, lastReadTime
  // -------------------------------------------------------
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Load lastReadTime from localStorage or default to 0
  const [lastReadTime, setLastReadTime] = useState(() => {
    const storedTime = localStorage.getItem("notificationLastReadTime");
    return storedTime ? parseInt(storedTime, 10) : 0;
  });

  // Whenever lastReadTime changes, persist to localStorage
  useEffect(() => {
    localStorage.setItem("notificationLastReadTime", lastReadTime.toString());
  }, [lastReadTime]);

  // -------------------------------------------
  // Mark a single notification as read
  // -------------------------------------------
  const markNotificationAsRead = (notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  // -------------------------------------------
  // Mark ALL notifications as read
  // -------------------------------------------
  const markAllAsRead = () => {
    // 1) Find the maximum createdAt timestamp among all notifications
    const maxTimestamp = notifications.reduce((acc, n) => {
      const ts = new Date(n.createdAt).getTime();
      return ts > acc ? ts : acc;
    }, lastReadTime);

    // 2) Update lastReadTime so older notifications won't reappear
    setLastReadTime(maxTimestamp);

    // 3) Clear them from the UI
    setNotifications([]);
  };

  // -------------------------------------------
  // Fetch notifications only when popover is open
  // -------------------------------------------
  useEffect(() => {
    if (!loggedInUser) return;

    if (notifAnchorEl) {
      if (loggedInUser.role === "Manager") {
        // Manager sees new transfer requests (status: 'pending')
        axios
          .get("http://localhost:5000/api/leads/transfer-requests")
          .then((response) => {
            const fetched = response.data || [];
            // Filter out anything older than lastReadTime
            const newItems = fetched.filter(
              (req) => new Date(req.createdAt).getTime() > lastReadTime
            );

            // Convert them to a consistent shape
            const managerNotifs = newItems.map((req) => ({
              id: req._id,
              type: "transferRequest",
              message: `New Request by ${req.requestedBy}`,
              createdAt: req.createdAt,
            }));

            setNotifications(managerNotifs);
          })
          .catch((err) => console.error("Manager fetch error:", err));
      } else {
        // Sales or Retention
        // 1) Assigned leads
        let endpoint = "";
        let params = {};
        if (loggedInUser.role === "Retention Agent") {
          endpoint = "http://localhost:5000/api/leads/retentions";
          params = { fullName: loggedInUser.fullName, email: loggedInUser.email };
        } else {
          endpoint = "http://localhost:5000/api/leads/assigned";
          params = { agentAssigned: loggedInUser.fullName };
        }
        const fetchAssignedLeads = axios.get(endpoint, { params });

        // 2) Transfer requests (approved/rejected)
        const fetchTransferRequests = axios
          .get("http://localhost:5000/api/leads/transfer-requests/all")
          .then((res) => {
            const allReqs = res.data || [];
            return allReqs.filter(
              (r) =>
                r.requestedBy === loggedInUser.fullName &&
                (r.status === "approved" || r.status === "rejected") &&
                new Date(r.createdAt).getTime() > lastReadTime
            );
          });

        Promise.all([fetchAssignedLeads, fetchTransferRequests])
          .then(([assignedRes, transferReqs]) => {
            // Filter leads by lastReadTime if they have a createdAt
            let leads = assignedRes.data || [];
            leads = leads.filter((l) => {
              if (!l.createdAt) return false; // or decide how to handle no createdAt
              return new Date(l.createdAt).getTime() > lastReadTime;
            });

            const leadNotifs = leads.map((l) => ({
              id: l._id,
              type: "lead",
              message: `New lead: ${l.name}`,
              createdAt: l.createdAt,
            }));

            const requestNotifs = transferReqs.map((r) => {
              const statusText = r.status === "approved" ? "Approved" : "Rejected";
              return {
                id: r._id,
                type: "transferStatus",
                message: `Transfer ${statusText} for lead: ${r.leadId?.name || ""}`,
                createdAt: r.createdAt,
              };
            });

            setNotifications([...leadNotifs, ...requestNotifs]);
          })
          .catch((err) => console.error("Sales/Retention fetch error:", err));
      }
    }
  }, [loggedInUser, notifAnchorEl, lastReadTime]);

  if (!loggedInUser || !loggedInUser.role) {
    return null;
  }

  // -------------------------------------------
  // Popover open/close
  // -------------------------------------------
  const handleNotifClick = (e) => {
    setNotifAnchorEl(e.currentTarget);
  };
  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  // -------------------------------------------
  // Rendering manager notifications
  // -------------------------------------------
  const renderManagerContent = () => {
    const managerItems = notifications.filter((n) => n.type === "transferRequest");

    return (
      <Box sx={{ p: 2, minWidth: 300 }}>
        <Typography variant="h6" gutterBottom>
          New Lead Request
        </Typography>
        {managerItems.length === 0 ? (
          <Typography variant="body2">No new lead requests</Typography>
        ) : (
          <>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Button size="small" startIcon={<DoneAllIcon />} onClick={markAllAsRead}>
                Mark all as read
              </Button>
            </Box>
            <List>
              {managerItems.map((item) => (
                <ListItem
                  button
                  key={item.id}
                  divider
                  onClick={() => {
                    // example: navigate to transfer requests page
                    navigate("/transfer-requests");
                    handleNotifClose();
                  }}
                >
                  <ListItemText primary={item.message} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationAsRead(item.id);
                      }}
                    >
                      <CheckCircleIcon sx={{ color: "green" }} />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>
    );
  };

  // -------------------------------------------
  // Rendering agent notifications
  // -------------------------------------------
  const renderAgentContent = () => {
    if (notifications.length === 0) {
      return (
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="body2">No new notifications</Typography>
        </Box>
      );
    }
    return (
      <Box sx={{ p: 2, minWidth: 300 }}>
        <Box
          sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
        >
          <Typography variant="h6">Notifications</Typography>
          <Button size="small" startIcon={<DoneAllIcon />} onClick={markAllAsRead}>
            Mark all as read
          </Button>
        </Box>
        <List>
          {notifications.map((n) => (
            <ListItem
              button={n.type === "lead"} // leads are clickable
              key={n.id}
              divider
              onClick={() => {
                if (n.type === "lead") {
                  // navigate to that lead's page
                  navigate(`/lead/${n.id}`);
                  handleNotifClose();
                }
              }}
            >
              <ListItemText
                primary={n.message}
                secondary={formatDate(n.createdAt)}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    markNotificationAsRead(n.id);
                  }}
                >
                  <CheckCircleIcon sx={{ color: "green" }} />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  // -------------------------------------------
  // Main return
  // -------------------------------------------
  return (
    <>
      {/* Show numeric count of unread notifications */}
      <IconButton color="inherit" onClick={handleNotifClick} sx={{ mr: 1 }}>
        <Badge badgeContent={notifications.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(notifAnchorEl)}
        anchorEl={notifAnchorEl}
        onClose={handleNotifClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {loggedInUser.role === "Manager"
          ? renderManagerContent()
          : renderAgentContent()}
      </Popover>
    </>
  );
};

export default Notifications;

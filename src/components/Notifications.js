// Notifications.jsx
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
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Helper function to safely format date strings
const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "N/A";
  }
  return date.toISOString().split("T")[0];
};

const Notifications = () => {
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  // For Sales/Retention: record when notifications were marked as read
  const [lastReadTime, setLastReadTime] = useState(0);
  const navigate = useNavigate();

  // Retrieve user from sessionStorage unconditionally
  const storedUser = sessionStorage.getItem("user");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : null;

  // Always call the useEffect hook.
  // When the notifications popover is open, fetch notifications from the correct endpoint.
  useEffect(() => {
    if (!loggedInUser) return;
    if (notifAnchorEl) {
      let endpoint;
      let params = {};
      if (loggedInUser.role === "Manager") {
        // For managers, fetch transfer requests
        endpoint = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/transfer-requests";
      } else if (loggedInUser.role === "Retention Agent") {
        // For retention agents, use the retention endpoint.
        endpoint = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retentions";
        // The retention endpoint expects fullName and email.
        params = { fullName: loggedInUser.fullName, email: loggedInUser.email };
      } else {
        // For Sales Agents, use the assigned endpoint.
        endpoint = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/assigned";
        params = { agentAssigned: loggedInUser.fullName };
      }

      axios
        .get(endpoint, { params })
        .then((response) => {
          let fetchedNotifications = response.data || [];
          if (lastReadTime) {
            fetchedNotifications = fetchedNotifications.filter(
              (notif) => new Date(notif.createdAt).getTime() > lastReadTime
            );
          }
          setNotifications(fetchedNotifications);
        })
        .catch((error) => {
          console.error("Error fetching notifications:", error);
        });
    }
  }, [loggedInUser, notifAnchorEl, lastReadTime]);

  // If no user is logged in, do not render the notification icon.
  if (!loggedInUser || !loggedInUser.role) {
    return (
      <Typography variant="body1" sx={{ ml: 2 }}>
        {/* No notifications to display */}
      </Typography>
    );
  }

  const handleNotifClick = (event) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  // For Sales/Retention agents: mark all notifications as read
  const markAllAsRead = () => {
    setLastReadTime(Date.now());
    setNotifications([]);
  };

  // Render popover content based on user role
  const renderContent = () => {
    if (loggedInUser.role === "Manager") {
      return (
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            New Lead Request
          </Typography>
          {notifications.length === 0 ? (
            <Typography variant="body2">No new lead requests</Typography>
          ) : (
            <List>
              {notifications.map((req) => (
                <ListItem
                  button
                  key={req._id}
                  divider
                  onClick={() => {
                    navigate("/transfer-requests");
                    handleNotifClose();
                  }}
                >
                  <ListItemText primary={`New Request by ${req.requestedBy}`} />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      );
    } else { 
      return (
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">New Leads</Typography>
            {notifications.length > 0 && (
              <Button
                size="small"
                startIcon={<DoneAllIcon />}
                onClick={() => {
                  markAllAsRead();
                  handleNotifClose();
                }}
              >
                Mark all as read
              </Button>
            )}
          </Box>
          {notifications.length === 0 ? (
            <Typography variant="body2">No new leads</Typography>
          ) : (
            <List>
              {notifications.map((lead) => (
                <ListItem
                  button
                  key={lead._id}
                  divider
                  onClick={() => {
                    navigate(`/lead/${lead._id}`);
                    handleNotifClose();
                  }}
                >
                  <ListItemText primary={lead.name} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(lead.date)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      );
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleNotifClick} sx={{ mr: 1 }}>
        <Badge color="error" variant="dot" invisible={notifications.length === 0}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(notifAnchorEl)}
        anchorEl={notifAnchorEl}
        onClose={handleNotifClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {renderContent()}
      </Popover>
    </>
  );
};

export default Notifications;

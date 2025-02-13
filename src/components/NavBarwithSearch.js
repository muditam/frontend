import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ClickAwayListener,
  Drawer,
  IconButton,
  Popover,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import axios from "axios";
import MenuBar from "./MenuBar";
import { useNavigate } from "react-router-dom";

// Helper function to safely format date strings
const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "N/A";
  }
  return date.toISOString().split("T")[0];
};

const NavbarWithSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // State for the sidebar

  // State for the notifications popover
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // useNavigate hook for programmatic navigation
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(sessionStorage.getItem("user"));

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim() === "") {
      setResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/search", {
        params: { query: value },
      });
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  };

  const handleClickAway = () => {
    setShowResults(false);
  };

  const toggleMenu = (open) => () => {
    setMenuOpen(open);
  };

  // --- Notifications Popover Handlers ---

  // When the bell icon is clicked, open the popover.
  const handleNotifClick = (event) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  // Mark as read: remove the lead from the notifications state.
  const markAsRead = (leadId) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter((lead) => lead._id !== leadId)
    );
  };

  // When the popover is open, fetch the leads assigned to the logged in agent.
  useEffect(() => {
    if (loggedInUser && notifAnchorEl) { 
      axios
        .get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/assigned", {
          params: { agentAssigned: loggedInUser.fullName },
        })
        .then((response) => {
          // Optionally, further filter for new leads if needed.
          setNotifications(response.data);
        })
        .catch((error) => {
          console.error("Error fetching assigned leads:", error);
        });
    }
  }, [loggedInUser, notifAnchorEl]);

  const open = Boolean(notifAnchorEl);
  const id = open ? "notifications-popover" : undefined;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {/* Menu Bar Icon */}
          <IconButton edge="start" color="inherit" onClick={toggleMenu(true)}>
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Muditam
          </Typography>

          {/* Bell Icon */}
          <IconButton color="inherit" onClick={handleNotifClick} sx={{ mr: 1 }}>
            <NotificationsIcon />
          </IconButton>

          <Box sx={{ position: "relative", width: 300 }}>
            <ClickAwayListener onClickAway={handleClickAway}>
              <div>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search by Name or Number"
                  value={query}
                  onChange={handleSearch}
                  sx={{
                    "& .MuiInputBase-input": {
                      textAlign: "left",
                    },
                  }}
                />
                {showResults && results.length > 0 && (
                  <List
                    sx={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      bgcolor: "purple",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      maxHeight: 200,
                      overflowY: "auto",
                      zIndex: 10,
                    }}
                  >
                    {results.map((item) => (
                      <ListItem
                        key={item._id}
                        button
                        onClick={() => {
                          // Navigate to the lead details page
                          navigate(`/lead/${item._id}`);
                          handleClickAway();
                        }}
                      >
                        <ListItemText
                          primary={`${item.name || "No Name"} (${item.contactNumber}) (${item.agentAssigned}) [${item.healthExpertAssigned}]`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </div>
            </ClickAwayListener>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Notifications Popover */}
      <Popover
        id={id}
        open={open}
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
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            New Leads
          </Typography>
          {notifications.length === 0 ? (
            <Typography variant="body2">No new leads</Typography>
          ) : (
            <List>
              {notifications.map((lead) => (
                <ListItem
                  key={lead._id}
                  divider
                  button
                  onClick={() => {
                    navigate(`/lead/${lead._id}`);
                    handleNotifClose();
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the ListItem onClick
                        markAsRead(lead._id);
                      }}
                    >
                      <DoneAllIcon />
                    </IconButton>
                  }
                >
                  <ListItemText primary={lead.name} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(lead.createdAt)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>

      {/* Sidebar Drawer */}
      <Drawer anchor="left" open={menuOpen} onClose={toggleMenu(false)}>
        <MenuBar toggleDrawer={toggleMenu(false)} />
      </Drawer>
    </>
  );
};

export default NavbarWithSearch;

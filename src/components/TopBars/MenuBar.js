import React, { useState, useEffect } from "react";
import {
  List,
  ListItem,
  ListItemText,
  Collapse,
  Divider,
  Typography,
  Box,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { Link, useNavigate } from "react-router-dom";

const MenuBar = ({ toggleDrawer }) => {
  const [openDropdown, setOpenDropdown] = useState({});
  const [role, setRole] = useState(null);
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem("user")));

  useEffect(() => {
    if (user && user.role) {
      setRole(user.role);
    }
  }, [user]);

  const handleDropdownClick = (menu) => {
    setOpenDropdown((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const styles = {
    drawer: {
      background: "linear-gradient(145deg, #ffffff, #f5f5f5)",
      color: "#333",
      width: "250px",
      height: "100vh",
      padding: "15px",
    },
    header: {
      textAlign: "center",
      fontWeight: "bold",
      color: "#007aff",
      margin: "15px 0",
      fontSize: "1rem",
      whiteSpace: "nowrap",
    },
    listItem: {
      color: "#333",
      padding: "12px 20px",
      margin: "8px 0",
      borderRadius: "10px",
      transition: "background-color 0.3s, transform 0.2s",
      "&:hover": {
        backgroundColor: "#e0f7fa",
        color: "#007aff",
        transform: "scale(1.05)",
      },
    },
    listItemText: {
      whiteSpace: "nowrap",
      fontSize: "1rem",
      fontWeight: 500,
    },
    icon: {
      marginLeft: "auto",
      color: "#888",
      transition: "color 0.3s",
      "&:hover": {
        color: "#007aff",
      },
    },
    divider: {
      backgroundColor: "#e0e0e0",
      margin: "15px 0",
    },
  };


  return (
    <Box sx={styles.drawer}>
      <List>
        <Typography variant="h6" sx={styles.header}>
          {user ? `Welcome, ${user.fullName}` : "Welcome"}
        </Typography>
        <Divider sx={styles.divider} />

        <ListItem
          button
          sx={styles.listItem}
          component={Link}
          to="/"
          onClick={toggleDrawer}
        >
          <DashboardIcon sx={{ marginRight: "10px" }} />
          <ListItemText primary="Home" sx={styles.listItemText} />
        </ListItem>

        <ListItem button sx={styles.listItem} component={Link} to="/my-templates" onClick={toggleDrawer}>
          <ListItemText primary="My Templates" sx={styles.listItemText} />
        </ListItem>

        {user ? (
          <>

            {role === "Manager" && (
              <>
                <ListItem
                  button
                  sx={styles.listItem}
                  component={Link}
                  to="/add-employee"
                  onClick={toggleDrawer}
                >
                  <PersonAddIcon sx={{ marginRight: "10px" }} />
                  <ListItemText
                    primary="Add Employee"
                    sx={styles.listItemText}
                  />
                </ListItem>

                <ListItem
                  button
                  sx={styles.listItem}
                  onClick={() => handleDropdownClick("masterData")}
                >
                  <ListItemText
                    primary="Master Data"
                    sx={styles.listItemText}
                  />
                  {openDropdown.masterData ? (
                    <ExpandLess sx={styles.icon} />
                  ) : (
                    <ExpandMore sx={styles.icon} />
                  )}
                </ListItem>
                <Collapse in={openDropdown.masterData} timeout="auto" unmountOnExit>
                  <List disablePadding>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/master/leads"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="All Leads" />
                    </ListItem>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/master/retention"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="Retention Leads" />
                    </ListItem>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/master/retention-orders"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="Retention Orders" />
                    </ListItem>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/master/new-orders"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="Acquisition Orders" />
                    </ListItem>
                  </List>
                </Collapse>

                {/* New Lost Data Dropdown */}
                <ListItem
                  button
                  sx={styles.listItem}
                  onClick={() => handleDropdownClick("lostData")}
                >
                  <ListItemText primary="Lost Data" sx={styles.listItemText} />
                  {openDropdown.lostData ? (
                    <ExpandLess sx={styles.icon} />
                  ) : (
                    <ExpandMore sx={styles.icon} />
                  )}
                </ListItem>
                <Collapse in={openDropdown.lostData} timeout="auto" unmountOnExit>
                  <List disablePadding>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/lost/acquisition"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="Acquisition Lost" />
                    </ListItem>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/lost/retention"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="Retention Lost" />
                    </ListItem>
                  </List>
                </Collapse>

                <ListItem
                  button
                  sx={styles.listItem}
                  component={Link}
                  to="/bulk-data-upload"
                  onClick={toggleDrawer}
                >
                  <ListItemText primary="Bulk Data Upload" sx={styles.listItemText} />
                </ListItem>
                <ListItem
                  button
                  sx={styles.listItem}
                  component={Link}
                  to="/all-shopify-orders"
                  onClick={toggleDrawer}
                >
                  <ListItemText primary="All Shopify Orders" />
                </ListItem>
                <ListItem
                  button
                  sx={styles.listItem}
                  component={Link}
                  to="/online-orders"
                  onClick={toggleDrawer}
                >
                  <ListItemText primary="Online Orders" />
                </ListItem>
                {/* New Menu Item for Transfer Requests */}
                <ListItem
                  button
                  sx={styles.listItem}
                  component={Link}
                  to="/transfer-requests"
                  onClick={toggleDrawer}
                >
                  <ListItemText
                    primary="Transfer Requests"
                    sx={styles.listItemText}
                  />
                </ListItem>
              </>
            )}

            {role === "Sales Agent" && (
              <>
                <ListItem
                  button
                  sx={styles.listItem}
                  onClick={() => handleDropdownClick("salesAgent")}
                  component={Link}
                >
                  <ListItemText primary="Sales Agent" sx={styles.listItemText} />
                  {openDropdown.salesAgent ? (
                    <ExpandLess sx={styles.icon} />
                  ) : (
                    <ExpandMore sx={styles.icon} />
                  )}
                </ListItem>
                <Collapse in={openDropdown.salesAgent} timeout="auto" unmountOnExit>
                  <List disablePadding>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/sales/my-leads"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="My Leads" />
                    </ListItem>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/sales/my-sales"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="My Sales" />
                    </ListItem>
                  </List>
                </Collapse>
              </>
            )}

            {role === "Retention Agent" && (
              <>
                <ListItem
                  button
                  sx={styles.listItem}
                  onClick={() => handleDropdownClick("retentionAgent")}
                  component={Link}
                >
                  <ListItemText primary="Retention Agent" sx={styles.listItemText} />
                  {openDropdown.retentionAgent ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={openDropdown.retentionAgent} timeout="auto" unmountOnExit>
                  <List disablePadding>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/retention/leads"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="Retention Leads" />
                    </ListItem>
                    <ListItem
                      button
                      sx={styles.listItem}
                      component={Link}
                      to="/retention/sales"
                      onClick={toggleDrawer}
                    >
                      <ListItemText primary="Retention Sales" />
                    </ListItem>
                  </List>
                </Collapse>
              </>
            )}

            <Divider sx={styles.divider} />

            <ListItem
              button
              sx={styles.listItem}
              onClick={handleLogout}
              style={{ cursor: "pointer" }}
            >
              <LogoutIcon sx={{ marginRight: "10px" }} />
              <ListItemText primary="Logout" sx={styles.listItemText} />
            </ListItem>
          </>
        ) : null}
      </List>
    </Box>
  );
};

export default MenuBar;


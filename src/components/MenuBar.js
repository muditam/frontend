import React, { useState, useEffect } from "react";
import { List, ListItem, ListItemText, Collapse } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Link, useNavigate } from "react-router-dom";

const MenuBar = ({ toggleDrawer }) => {
  const [openDropdown, setOpenDropdown] = useState({});
  const [role, setRole] = useState(null); // Store the user's role
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.role) {
      setRole(user.role);
    } else {
      navigate("/login"); // Redirect to login if not authenticated
    }
  }, [navigate]);

  const handleDropdownClick = (menu) => {
    setOpenDropdown((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <List>
      {/* Manager Role */}
      {role === "Manager" && (
        <>
          <ListItem button component={Link} to="/add-employee" onClick={toggleDrawer}>
            <ListItemText primary="Add Employee" />
          </ListItem>
          <ListItem button onClick={() => handleDropdownClick("masterData")}>
            <ListItemText primary="Master Data" />
            {openDropdown.masterData ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={openDropdown.masterData} timeout="auto" unmountOnExit>
            <List disablePadding>
              <ListItem button component={Link} to="/master/leads" onClick={toggleDrawer}>
                <ListItemText primary="Leads" inset />
              </ListItem>
              <ListItem button component={Link} to="/master/retention" onClick={toggleDrawer}>
                <ListItemText primary="Retention" inset />
              </ListItem>
              <ListItem button component={Link} to="/master/new-orders" onClick={toggleDrawer}>
                <ListItemText primary="New Orders" inset />
              </ListItem>
              <ListItem button component={Link} to="/master/retention-orders" onClick={toggleDrawer}>
                <ListItemText primary="Retention Orders" inset />
              </ListItem>
            </List>
          </Collapse>
              <ListItem button component={Link} to="/bulk-data-upload" onClick={toggleDrawer}>
                <ListItemText primary="Bulk Data Upload" />
              </ListItem>
        </>
      )}

      {/* Sales Agent Role */}
      {role === "Sales Agent" && (
        <>
          <ListItem button onClick={() => handleDropdownClick("salesAgent")}>
            <ListItemText primary="Sales Agent" />
            {openDropdown.salesAgent ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={openDropdown.salesAgent} timeout="auto" unmountOnExit>
            <List disablePadding>
              <ListItem button component={Link} to="/sales/my-leads" onClick={toggleDrawer}>
                <ListItemText primary="My Leads" inset />
              </ListItem>
              <ListItem button component={Link} to="/sales/my-sales" onClick={toggleDrawer}>
                <ListItemText primary="My Sales" inset />
              </ListItem>
            </List>
          </Collapse>
        </>
      )}

      {/* Retention Agent Role */}
      {role === "Retention Agent" && (
        <>
          <ListItem button onClick={() => handleDropdownClick("retentionAgent")}>
            <ListItemText primary="Retention Agent" />
            {openDropdown.retentionAgent ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={openDropdown.retentionAgent} timeout="auto" unmountOnExit>
            <List disablePadding>
              <ListItem button component={Link} to="/retention/leads" onClick={toggleDrawer}>
                <ListItemText primary="Retention Leads" inset />
              </ListItem>
              <ListItem button component={Link} to="/retention/sales" onClick={toggleDrawer}>
                <ListItemText primary="Retention Sales" inset />
              </ListItem>
            </List>
          </Collapse>
        </>
      )}

      {/* Logout Button */}
      <ListItem button onClick={handleLogout}>
        <ListItemText primary="Logout" />
      </ListItem>
    </List>
  );
};

export default MenuBar; 
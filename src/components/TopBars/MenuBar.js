import React, { useState, useEffect } from "react";
import {
  List,
  ListItem,
  Collapse,
  Typography,
  Box,
  Drawer,
  Avatar,
  IconButton,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LogoutIcon from "@mui/icons-material/Logout";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import HomeIcon from "@mui/icons-material/Home";
import AssignmentIcon from "@mui/icons-material/Assessment";
import DescriptionIcon from "@mui/icons-material/Description";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import FolderIcon from "@mui/icons-material/Folder";
import PersonIcon from "@mui/icons-material/Person";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DeleteIcon from "@mui/icons-material/Delete";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
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


  return (
    <Drawer
      sx={{
        "& .MuiDrawer-paper": {
          width: 310,
          mt: "64px",
          height: "calc(100vh - 64px)",
          boxSizing: "border-box",
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <List sx={{ paddingBottom: "80px" }}>
        <ListItem
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #ddd",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <AssignmentIcon sx={{ width: 35, height: 35, marginRight: 1 }} />
            {/* Icon on the left */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  letterSpacing: "1px",
                }}
              >
                Muditam
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: "12px",
                  color: "gray",
                  letterSpacing: "1px",
                }}
              >
                Lead Management
              </Typography>
            </Box>
          </Box>
          {/* Add any additional icons/buttons here */}
          <UnfoldMoreIcon />
        </ListItem>


        <ListItem
          button
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "10px 20px",
            borderRadius: "4px",
            margin: "4px 0",
            transition: "background-color 0.3s, transform 0.2s",
            "&:hover": {
              backgroundColor: "#e0f7fa",
              color: "#007aff",
              transform: "scale(1.02)", // Very subtle scaling
            },
          }}
          component={Link}
          to="/"
          onClick={toggleDrawer}
        >
          <HomeIcon sx={{ marginRight: "12px" }} />
          <Typography variant="body1" style={{ fontSize: "14px" }}>
            Home
          </Typography>
        </ListItem>


        <ListItem
          button
          component={Link}
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "10px 20px",
            borderRadius: "4px",
            margin: "4px 0",
            transition: "background-color 0.3s, transform 0.2s",
            "&:hover": {
              backgroundColor: "#e0f7fa",
              color: "#007aff",
              transform: "scale(1.02)", // Very subtle scaling
            },
          }}
          to="/my-templates"
          onClick={toggleDrawer}
        >
          <DescriptionIcon sx={{ marginRight: "12px" }} />
          <Typography variant="body1" style={{ fontSize: "14px" }}>
            My Templates
          </Typography>
        </ListItem>

        <ListItem
          button
          component={Link}
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "10px 20px",
            borderRadius: "4px",
            margin: "4px 0",
            transition: "background-color 0.3s, transform 0.2s",
            "&:hover": {
              backgroundColor: "#e0f7fa",
              color: "#007aff",
              transform: "scale(1.02)",
            },
          }}
          to="/leadmanagement"
          onClick={toggleDrawer}
        >
          <ChatBubbleIcon sx={{ marginRight: "12px" }} />
          <Typography variant="body1" style={{ fontSize: "14px" }}>
            Consultation
          </Typography>
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/escalations"
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "10px 20px",
            borderRadius: "4px",
            margin: "4px 0",
            transition: "background-color 0.3s, transform 0.2s",
            "&:hover": {
              backgroundColor: "#e0f7fa",
              color: "#007aff",
              transform: "scale(1.02)",
            },
          }}
          onClick={toggleDrawer}
        >
          <AssignmentIcon sx={{ fontSize: 18, marginRight: "8px" }} />
          <Typography variant="body1" sx={{ fontSize: "14px" }}>
            Escalations
          </Typography>
        </ListItem>

        {user ? (
          <>
            {role === "Manager" && (
              <>
                <ListItem
                  button
                  component={Link}
                  to="/add-employee"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    margin: "4px 0",
                    transition: "background-color 0.3s, transform 0.2s",
                    "&:hover": {
                      backgroundColor: "#e0f7fa",
                      color: "#007aff",
                    },
                  }}
                  onClick={toggleDrawer}
                >
                  <PersonAddIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                  <Typography variant="body1" sx={{ fontSize: "14px" }}>
                    Add Employee
                  </Typography>
                </ListItem>


                <ListItem
                  button
                  onClick={() => handleDropdownClick("masterData")}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 20px",
                    justifyContent: "space-between",
                    borderRadius: "4px",
                    margin: "4px 0",
                    transition: "background-color 0.3s, transform 0.2s",
                    "&:hover": {
                      backgroundColor: "#e0f7fa",
                      color: "#007aff",
                      transform: "scale(1.02)", // Very subtle scaling
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <FolderIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                    <Typography variant="body1" sx={{ fontSize: "14px" }}>
                      Master Data
                    </Typography>
                  </Box>
                  {openDropdown.masterData ? (
                    <KeyboardArrowDownIcon />
                  ) : (
                    <KeyboardArrowRightIcon />
                  )}
                </ListItem>
                <Collapse
                  in={openDropdown.masterData}
                  timeout="auto"
                  unmountOnExit
                >
                  <List
                    sx={{
                      borderLeft: "2px solid #007aff", // Vertical line for sublist
                      marginLeft: "24px", // Indent sublist
                      paddingLeft: "4px", // Space from vertical line
                    }}
                  >
                    <ListItem
                      button
                      component={Link}
                      to="/master/leads"
                      onClick={toggleDrawer}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "13px" }}
                        onClick={toggleDrawer}
                      >
                        All Leads
                      </Typography>
                    </ListItem>
                    <ListItem
                      button
                      component={Link}
                      to="/master/retention"
                      onClick={toggleDrawer}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "13px" }}
                        onClick={toggleDrawer}
                      >
                        Retention Leads
                      </Typography>
                    </ListItem>
                    <ListItem
                      button
                      component={Link}
                      to="/master/retention-orders"
                      onClick={toggleDrawer}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "13px" }}
                        onClick={toggleDrawer}
                      >
                        Retention Orders
                      </Typography>
                    </ListItem>
                    <ListItem
                      button
                      component={Link}
                      to="/master/new-orders"
                      onClick={toggleDrawer}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "13px" }}
                        onClick={toggleDrawer}
                      >
                        Acquisition Orders
                      </Typography>
                    </ListItem>
                    <ListItem
                      button
                      component={Link}
                      to="/master/Duplicates"
                      onClick={toggleDrawer}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "13px" }}
                        onClick={toggleDrawer}
                      >
                        Duplicate Data
                      </Typography>
                    </ListItem>
                  </List>
                </Collapse>

                <ListItem
                  button
                  component={Link}
                  to="/bulk-data-upload"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    margin: "4px 0",
                    transition: "background-color 0.3s, transform 0.2s",
                    "&:hover": {
                      backgroundColor: "#e0f7fa",
                      color: "#007aff",
                      transform: "scale(1.02)", // Very subtle scaling
                    },
                  }}
                  onClick={toggleDrawer}
                >
                  <UploadFileIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                  <Typography variant="body1" sx={{ fontSize: "14px" }}>
                    Bulk Data Upload
                  </Typography>
                </ListItem>


                <ListItem
                  button
                  component={Link}
                  to="/all-shopify-orders"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    margin: "4px 0",
                    transition: "background-color 0.3s, transform 0.2s",
                    "&:hover": {
                      backgroundColor: "#e0f7fa",
                      color: "#007aff",
                      transform: "scale(1.02)", // Very subtle scaling
                    },
                  }}
                  onClick={toggleDrawer}
                >
                  <ShoppingCartIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                  <Typography variant="body1" sx={{ fontSize: "14px" }}>
                    All Shopify Orders
                  </Typography>
                </ListItem>


                <ListItem
                  button
                  onClick={() => handleDropdownClick("lostData")}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    margin: "4px 0",
                    transition: "background-color 0.3s, transform 0.2s",
                    "&:hover": {
                      backgroundColor: "#e0f7fa",
                      color: "#007aff",
                      transform: "scale(1.02)", // Very subtle scaling
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <DeleteIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                    <Typography variant="body1" sx={{ fontSize: "14px" }}>
                      Lost Data
                    </Typography>
                  </Box>
                  {openDropdown.lostData ? (
                    <KeyboardArrowDownIcon />
                  ) : (
                    <KeyboardArrowRightIcon />
                  )}
                </ListItem>


                <Collapse
                  in={openDropdown.lostData}
                  timeout="auto"
                  unmountOnExit
                >
                  <List
                    sx={{
                      borderLeft: "2px solid #007aff", // Vertical line for sublist
                      marginLeft: "24px", // Indent sublist
                      paddingLeft: "4px", // Space from vertical line
                    }}
                  >
                    {/* Sub-items under Lost Data */}
                    <ListItem
                      button
                      component={Link}
                      to="/lost/acquisition"
                      onClick={toggleDrawer}
                    >
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>
                        Acquisition Lost
                      </Typography>
                    </ListItem>
                    <ListItem
                      button
                      component={Link}
                      to="/lost/retention"
                      onClick={toggleDrawer}
                    >
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>
                        Retention Lost
                      </Typography>
                    </ListItem>
                  </List>
                </Collapse>


                <ListItem
                  button
                  component={Link}
                  to="/online-orders"
                  sx={{
                    display: "flex",
                    alignItems: "center", // Align items to center
                    padding: "10px 20px", // Consistent padding
                    borderRadius: "4px",
                    margin: "4px 0", // Consistent margin
                    transition: "background-color 0.3s, transform 0.2s",
                    "&:hover": {
                      backgroundColor: "#e0f7fa", // Hover background color
                      color: "#007aff", // Hover text color
                      transform: "scale(1.02)", // Very subtle scaling
                    },
                  }}
                  onClick={toggleDrawer}
                >
                  <ShoppingCartIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                  <Typography variant="body1" sx={{ fontSize: "14px" }}>
                    Online Orders
                  </Typography>
                </ListItem>




                <ListItem
                  button
                  component={Link}
                  to="/transfer-requests"
                  sx={{
                    display: "flex",
                    alignItems: "center", // Align items to center
                    padding: "10px 20px", // Consistent padding
                    borderRadius: "4px",
                    margin: "4px 0", // Consistent margin
                    transition: "background-color 0.3s, transform 0.2s",
                    "&:hover": {
                      backgroundColor: "#e0f7fa", // Hover background color
                      color: "#007aff", // Hover text color
                      transform: "scale(1.02)", // Very subtle scaling
                    },
                  }}
                  onClick={toggleDrawer}
                >
                  <CompareArrowsIcon
                    sx={{ fontSize: 18, marginRight: "8px" }}
                  />
                  <Typography variant="body1" sx={{ fontSize: "14px" }}>
                    Transfer Requests
                  </Typography>
                </ListItem>
              </>
            )}


            {role === "Sales Agent" && (
              <>
                <ListItem
                  button
                  onClick={() => handleDropdownClick("salesAgent")}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    margin: "4px 0",
                    transition: "background-color 0.3s, transform 0.2s",
                    "&:hover": {
                      backgroundColor: "#e0f7fa",
                      color: "#007aff",
                      transform: "scale(1.02)", // Very subtle scaling
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <PersonIcon sx={{ fontSize: 18, marginRight: "10px" }} />
                    <Typography variant="body1" sx={{ fontSize: "14px" }}>
                      Sales Agent
                    </Typography>
                  </Box>
                  {openDropdown.salesAgent ? <ExpandLess /> : <ExpandMore />}
                </ListItem>


                <Collapse
                  in={openDropdown.salesAgent}
                  timeout="auto"
                  unmountOnExit
                >
                  <List
                    sx={{
                      borderLeft: "2px solid #007aff", // Vertical line for sublist
                      marginLeft: "24px", // Indent sublist
                      paddingLeft: "4px", // Space from vertical line
                    }}
                  >
                    {/* My Leads */}
                    <ListItem
                      button
                      component={Link}
                      to="/sales/my-leads"
                      onClick={toggleDrawer}
                    >
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>
                        My Leads
                      </Typography>
                    </ListItem>


                    {/* My Sales */}
                    <ListItem
                      button
                      component={Link}
                      to="/sales/my-sales"
                      onClick={toggleDrawer}
                    >
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>
                        My Sales
                      </Typography>
                    </ListItem>
                  </List>
                </Collapse>
              </>
            )}


            {role === "Retention Agent" && (
              <>
                <ListItem
                  button
                  onClick={() => handleDropdownClick("retentionAgent")}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    margin: "4px 0",
                    transition: "background-color 0.3s, transform 0.2s",
                    "&:hover": {
                      backgroundColor: "#e0f7fa",
                      color: "#007aff",
                      transform: "scale(1.02)", // Very subtle scaling
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <PersonIcon sx={{ fontSize: 18, marginRight: "10px" }} />
                    <Typography variant="body1" sx={{ fontSize: "14px" }}>
                      Retention Agent
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: "24px",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {openDropdown.retentionAgent ? (
                      <ExpandLess />
                    ) : (
                      <ExpandMore />
                    )}
                  </Box>
                </ListItem>


                <Collapse
                  in={openDropdown.retentionAgent}
                  timeout="auto"
                  unmountOnExit
                >
                  <List
                    sx={{
                      borderLeft: "2px solid #007aff", // Vertical line for sublist
                      marginLeft: "24px", // Indent sublist
                      paddingLeft: "4px", // Space from vertical line
                    }}
                  >
                    {/* Retention Leads */}
                    <ListItem
                      button
                      component={Link}
                      to="/retention/leads"
                      onClick={toggleDrawer}
                    >
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>
                        Retention Leads
                      </Typography>
                    </ListItem>


                    {/* Retention Sales */}
                    <ListItem
                      button
                      component={Link}
                      to="/retention/sales"
                      onClick={toggleDrawer}
                    >
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>
                        Retention Sales
                      </Typography>
                    </ListItem>
                  </List>
                </Collapse>
              </>
            )}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                padding: "16px",
                justifyContent: "space-between",
                borderTop: "1px solid #ddd",
                position: "fixed",
                backgroundColor: "#fff",
                bottom: 0,
                width: "300px",
              }}
            >
              {/* User Avatar & Details */}
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  sx={{ width: 30, height: 30, marginRight: 1 }}
                  alt={user.fullName}
                  src={user.avatarUrl}
                />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: "14px", fontWeight: "bold" }}
                  >
                    {user.fullName}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: "12px", color: "gray" }}
                  >
                    {user.email}
                  </Typography>
                </Box>
              </Box>


              {/* Logout Icon */}
              <IconButton onClick={handleLogout} sx={{ color: "gray" }}>
                <LogoutIcon />
              </IconButton>
            </Box>
          </>
        ) : null}
      </List>
    </Drawer>
  );
};


export default MenuBar;

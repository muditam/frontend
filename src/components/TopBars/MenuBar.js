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
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import FactCheckIcon from "@mui/icons-material/FactCheck"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EmailIcon from "@mui/icons-material/Email";
import { Link, useNavigate } from "react-router-dom";

// Put this ABOVE the MenuBar component in the same file, or in its own file and import it
const GrowthIcon = ({ size = 22, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="50" width="10" height="12" fill="black" />
    <rect x="18" y="36" width="10" height="26" fill="black" />
    <circle cx="33" cy="17" r="6" fill="black" />
    <rect x="30" y="23" width="6" height="16" fill="black" />
    <rect x="28" y="30" width="10" height="3" rx="1.5" fill="black" transform="rotate(-30 28 30)" />
    <rect x="48" y="22" width="8" height="28" fill="black" />
    <polygon points="52,8 60,22 44,22" fill="black" />
  </svg>
);


const MenuBar = ({ toggleDrawer }) => {
  const [openDropdown, setOpenDropdown] = useState({});
  const [role, setRole] = useState(null);
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem("user")));
  const hasTeam = user && user.hasTeam;

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

  const menuItemStyle = {
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
  };

  const dropdownStyle = {
    ...menuItemStyle,
    justifyContent: "space-between",
  };

  const nestedListStyle = {
    borderLeft: "2px solid #007aff",
    marginLeft: "24px",
    paddingLeft: "4px",
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
              transform: "scale(1.02)",
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

        {role !== "Finance" && role !== "Operations" && (
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
            to="/my-templates"
            onClick={toggleDrawer}
          >
            <DescriptionIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              My Templates
            </Typography>
          </ListItem>
        )}
        {role !== "Finance" && role !== "Operations" && (
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
        )}

        {role !== "Finance" && (
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
        )}

        {hasTeam && (
          <ListItem
            button
            component={Link}
            to="/team"
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
            <PersonIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Team
            </Typography>
          </ListItem>
        )}

        {role !== "Finance" && role !== "Operations" && (
          <ListItem
            button
            component={Link}
            to="/aband"
            sx={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: "4px",
              margin: "4px 0",
              transition: "background-color 0.3s, transform 0.2s",
              "&:hover": { backgroundColor: "#e0f7fa", color: "#007aff", transform: "scale(1.02)" },
            }}
            onClick={toggleDrawer}
          >
            <Inventory2Icon sx={{ fontSize: 18, marginRight: "8px" }} />
            <Typography variant="body1" sx={{ fontSize: "14px" }}>
              Abandoned Cart
            </Typography>
          </ListItem>
        )}

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
                      transform: "scale(1.02)",
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
                      borderLeft: "2px solid #007aff",
                      marginLeft: "24px",
                      paddingLeft: "4px",
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
                      transform: "scale(1.02)",
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
                      transform: "scale(1.02)",
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
                      transform: "scale(1.02)",
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
                      borderLeft: "2px solid #007aff",
                      marginLeft: "24px",
                      paddingLeft: "4px",
                    }}
                  >
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
                      transform: "scale(1.02)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <PersonIcon sx={{ fontSize: 18, marginRight: "10px" }} />
                    <Typography variant="body1" sx={{ fontSize: "14px" }}>
                      Sales Agent
                    </Typography>
                  </Box>
                  {openDropdown.salesAgent ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                </ListItem>

                <Collapse
                  in={openDropdown.salesAgent}
                  timeout="auto"
                  unmountOnExit
                >
                  <List
                    sx={{
                      borderLeft: "2px solid #007aff",
                      marginLeft: "24px",
                      paddingLeft: "4px",
                    }}
                  >
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
                      transform: "scale(1.02)",
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
                      <KeyboardArrowDownIcon />
                    ) : (
                      <KeyboardArrowRightIcon />
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
                      borderLeft: "2px solid #007aff",
                      marginLeft: "24px",
                      paddingLeft: "4px",
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

            {role === "Finance" && (
              <>
                <ListItem
                  button
                  component={Link}
                  to="/order-summary"
                  sx={menuItemStyle}
                  onClick={toggleDrawer}
                >
                  <FactCheckIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                  <Typography variant="body1" sx={{ fontSize: "14px" }}>
                    Order Summary
                  </Typography>
                </ListItem>

                <ListItem
                  button
                  onClick={() => handleDropdownClick("paymentGateway")}
                  sx={dropdownStyle}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CompareArrowsIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                    <Typography variant="body1" sx={{ fontSize: "14px" }}>
                      Prepaid Remittance
                    </Typography>
                  </Box>
                  {openDropdown.paymentGateway ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                </ListItem>

                <Collapse in={openDropdown.paymentGateway} timeout="auto" unmountOnExit>
                  <List sx={nestedListStyle}>
                    <ListItem button component={Link} to="/gateway/razorpay" onClick={toggleDrawer}>
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>Razorpay</Typography>
                    </ListItem>
                    <ListItem button component={Link} to="/gateway/phonepe" onClick={toggleDrawer}>
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>PhonePe</Typography>
                    </ListItem>
                    <ListItem button component={Link} to="/gateway/easebuzz" onClick={toggleDrawer}>
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>Easebuzz</Typography>
                    </ListItem>
                    <ListItem button component={Link} to="/gateway/bank-transfer" onClick={toggleDrawer}>
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>Bank Transfer</Typography>
                    </ListItem>
                  </List>
                </Collapse>

                <ListItem
                  button
                  component={Link}
                  to="/rto-sheet"
                  sx={menuItemStyle}
                  onClick={toggleDrawer}
                >
                  <DeleteIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                  <Typography variant="body1" sx={{ fontSize: "14px" }}>
                    RTO Sheet
                  </Typography>
                </ListItem>

                <ListItem
                  button
                  onClick={() => handleDropdownClick("remittance")}
                  sx={dropdownStyle}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TrendingUpIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                    <Typography variant="body1" sx={{ fontSize: "14px" }}>
                      COD Remittance
                    </Typography>
                  </Box>
                  {openDropdown.remittance ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                </ListItem>

                <Collapse in={openDropdown.remittance} timeout="auto" unmountOnExit>
                  <List sx={nestedListStyle}>
                    <ListItem button component={Link} to="/remittance/bluedart" onClick={toggleDrawer}>
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>Bluedart</Typography>
                    </ListItem>
                    <ListItem button component={Link} to="/remittance/dtdc" onClick={toggleDrawer}>
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>DTDC</Typography>
                    </ListItem>
                    <ListItem button component={Link} to="/remittance/delhivery" onClick={toggleDrawer}>
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>Delhivery</Typography>
                    </ListItem>
                    <ListItem button component={Link} to="/remittance/shiprocket" onClick={toggleDrawer}>
                      <Typography variant="body2" sx={{ fontSize: "13px" }}>Shiprocket</Typography>
                    </ListItem>
                  </List>
                </Collapse>
              </>
            )}

            {role === "Operations" && (
              <ListItem
                button
                component={Link}
                to="/operations/undelivered-orders"
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
                <ErrorOutlineIcon sx={{ fontSize: 20, marginRight: "12px" }} />
                <Typography variant="body1" style={{ fontSize: "14px" }}>
                  Undelivered Orders
                </Typography>
              </ListItem>
            )}

            {role === "Operations" && (
              <ListItem
                button
                component={Link}
                to="/operations/rto-delivered" // updated route
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
                <LocalShippingIcon sx={{ fontSize: 20, marginRight: "12px" }} /> {/* updated icon */}
                <Typography variant="body1" style={{ fontSize: "14px" }}>
                  RTO Delivered
                </Typography>
              </ListItem>
            )}

            {role === "Operations" && (
              <ListItem
                button
                component={Link}
                to="/operations/undelivered" // updated route
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
                <EmailIcon sx={{ fontSize: 20, marginRight: "12px" }} />  
                <Typography variant="body1" style={{ fontSize: "14px" }}>
                  Email Undelivered
                </Typography>
              </ListItem>
            )}

            {role !== "Finance" && role !== "Operations" && (
              <ListItem
                button
                component={Link}
                to="/delivered-sales-record"
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
                <FactCheckIcon sx={{ fontSize: 20, marginRight: "12px" }} />
                <Typography variant="body1" style={{ fontSize: "14px" }}>
                  Delivered Sales Record
                </Typography>
              </ListItem>
            )}

            {role !== "Finance" && role !== "Operations" && (
              <ListItem
                button
                onClick={() => handleDropdownClick("leaderboard")}
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
                    transform: "scale(1.02)",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <EmojiEventsIcon sx={{ fontSize: 24, marginRight: "12px" }} />
                  <Typography variant="body1" sx={{ fontSize: "14px" }}>
                    Leaderboard
                  </Typography>
                </Box>
                {openDropdown.leaderboard ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
              </ListItem>
            )}

            <Collapse in={openDropdown.leaderboard} timeout="auto" unmountOnExit>
              <List
                sx={{
                  borderLeft: "2px solid #007aff",
                  marginLeft: "24px",
                  paddingLeft: "4px",
                }}
              >
                <ListItem
                  button
                  component={Link}
                  to="/leaderboard"
                  onClick={toggleDrawer}
                >
                  <Typography variant="body2" sx={{ fontSize: "13px" }}>
                    All Leaderboard
                  </Typography>
                </ListItem>
                <ListItem
                  button
                  component={Link}
                  to="/bloom-leaderboard"
                  onClick={toggleDrawer}
                >
                  <Typography variant="body2" sx={{ fontSize: "13px" }}>
                    Bloom Leaderboard
                  </Typography>
                </ListItem>
              </List>
            </Collapse>

            {role !== "Finance" && role !== "Operations" && (
              <ListItem
                button
                component={Link}
                to="/my-growth-plan"
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
                <TrendingUpIcon sx={{ fontSize: 24, marginRight: "12px" }} />
                <Typography variant="body1" style={{ fontSize: "14px" }}>
                  Growth At Muditam
                </Typography>
              </ListItem>
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

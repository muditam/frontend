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
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DeleteIcon from "@mui/icons-material/Delete";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import { Link, useNavigate } from "react-router-dom";

// Optional custom icon (unused in logic, just kept as you had)
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
    <rect
      x="28"
      y="30"
      width="10"
      height="3"
      rx="1.5"
      fill="black"
      transform="rotate(-30 28 30)"
    />
    <rect x="48" y="22" width="8" height="28" fill="black" />
    <polygon points="52,8 60,22 44,22" fill="black" />
  </svg>
);

const MenuBar = ({ toggleDrawer }) => {
  const [openDropdown, setOpenDropdown] = useState({});
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  const getUserFromSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState(getUserFromSession());
  const hasTeam = user && user.hasTeam;

  useEffect(() => {
    if (user && user.role) {
      setRole(user.role);
    }
  }, [user]);

  // 🔐 Permission helper
  const menubarPerms = user?.permissions?.menubar || {};
  const can = (key) => !!menubarPerms[key];

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
        {/* Header */}
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

        {/* Everything below should respect permissions */}

        {user && can("home") && (
          <ListItem
            button
            sx={menuItemStyle}
            component={Link}
            to="/"
            onClick={toggleDrawer}
          >
            <HomeIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Home
            </Typography>
          </ListItem>
        )}

        {user && can("myTemplates") && (
          <ListItem
            button
            component={Link}
            sx={menuItemStyle}
            to="/my-templates"
            onClick={toggleDrawer}
          >
            <DescriptionIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              My Templates
            </Typography>
          </ListItem>
        )}

        {user && can("invoices") && (
          <ListItem
            button
            component={Link}
            sx={menuItemStyle}
            to="/invoices"
            onClick={toggleDrawer}
          >
            <ReceiptLongIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Invoices
            </Typography>
          </ListItem>
        )}

        {user && can("accessManagement") && (
          <ListItem
            button
            component={Link}
            sx={menuItemStyle}
            to="/access-management"
            onClick={toggleDrawer}
          >
            <AssignmentIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Access Management
            </Typography>
          </ListItem>
        )}

        {user && can("adminAccessRequests") && (
          <ListItem
            button
            component={Link}
            sx={menuItemStyle}
            to="/admin-requests-admin"
            onClick={toggleDrawer}
          >
            <AssignmentIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Admin Access Requests
            </Typography>
          </ListItem>
        )}


        {user && can("consultation") && (
          <ListItem
            button
            component={Link}
            sx={menuItemStyle}
            to="/leadmanagement"
            onClick={toggleDrawer}
          >
            <ChatBubbleIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Consultation
            </Typography>
          </ListItem>
        )}

        {user && can("whatsaapChats") && (
          <ListItem
            button
            component={Link}
            sx={menuItemStyle}
            to="/whatsaap/chat"
            onClick={toggleDrawer}
          >
            <WhatsAppIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Whatsaap Chats
            </Typography>
          </ListItem>
        )}

        {user && can("escalations") && (
          <ListItem
            button
            component={Link}
            to="/escalations"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <AssignmentIcon sx={{ fontSize: 18, marginRight: "8px" }} />
            <Typography variant="body1" sx={{ fontSize: "14px" }}>
              Escalations
            </Typography>
          </ListItem>
        )}

        {user && hasTeam && can("team") && (
          <ListItem
            button
            component={Link}
            to="/team"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <PersonIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Team
            </Typography>
          </ListItem>
        )}

        {user && can("abandonedCart") && (
          <ListItem
            button
            component={Link}
            to="/aband"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <Inventory2Icon sx={{ fontSize: 18, marginRight: "8px" }} />
            <Typography variant="body1" sx={{ fontSize: "14px" }}>
              Abandoned Cart
            </Typography>
          </ListItem>
        )}

        {/* Order Confirmations dropdown */}
        {user && can("orderConfirmationsMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("orderConfirmations")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <ShoppingCartIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Order Confirmations
                </Typography>
              </Box>
              {openDropdown.orderConfirmations ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse
              in={openDropdown.orderConfirmations}
              timeout="auto"
              unmountOnExit
            >
              <List sx={nestedListStyle}>
                {can("orderConfirmationPage") && (
                  <ListItem
                    button
                    component={Link}
                    to="/order-confirmations"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Order Confirmation
                    </Typography>
                  </ListItem>
                )}

                {can("orderAnalyticsPage") && (
                  <ListItem
                    button
                    component={Link}
                    to="/order-confirmations/analytics"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Order Analytics
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {user && can("unassignedDeliveredOrders") && (
          <ListItem
            button
            component={Link}
            sx={menuItemStyle}
            to="/unassigned-delivered-orders"
            onClick={toggleDrawer}
          >
            <LocalShippingIcon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Unassigned Delivered Orders
            </Typography>
          </ListItem>
        )}

        {/* My RTOs */}
        {user && can("myRTOs") && (
          <ListItem
            button
            component={Link}
            to="/Agent-return"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <AssignmentReturnedIcon
              sx={{ fontSize: 24, marginRight: "12px" }}
            />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              MY RTOs
            </Typography>
          </ListItem>
        )}

        {/* Manager / Admin-type stuff via permissions (no role check) */}
        {user && can("addEmployee") && (
          <ListItem
            button
            component={Link}
            to="/add-employee"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <PersonAddIcon sx={{ fontSize: 18, marginRight: "8px" }} />
            <Typography variant="body1" sx={{ fontSize: "14px" }}>
              Add Employee
            </Typography>
          </ListItem>
        )}

        {user && can("masterDataMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("masterData")}
              sx={dropdownStyle}
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
            <Collapse in={openDropdown.masterData} timeout="auto" unmountOnExit>
              <List sx={nestedListStyle}>
                {can("masterAllLeads") && (
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
                )}
                {can("masterRetentionLeads") && (
                  <ListItem
                    button
                    component={Link}
                    to="/master/retention"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Retention Leads
                    </Typography>
                  </ListItem>
                )}
                {can("masterRetentionOrders") && (
                  <ListItem
                    button
                    component={Link}
                    to="/master/retention-orders"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Retention Orders
                    </Typography>
                  </ListItem>
                )}
                {can("masterNewOrders") && (
                  <ListItem
                    button
                    component={Link}
                    to="/master/new-orders"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Acquisition Orders
                    </Typography>
                  </ListItem>
                )}
                {can("masterDuplicates") && (
                  <ListItem
                    button
                    component={Link}
                    to="/master/Duplicates"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Duplicate Data
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {user && can("lostDataMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("lostData")}
              sx={dropdownStyle}
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
              <List sx={nestedListStyle}>
                {can("lostAcquisition") && (
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
                )}
                {can("lostRetention") && (
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
                )}
              </List>
            </Collapse>
          </>
        )}

        {user && can("onlineOrders") && (
          <ListItem
            button
            component={Link}
            to="/online-orders"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <ShoppingCartIcon sx={{ fontSize: 18, marginRight: "8px" }} />
            <Typography variant="body1" sx={{ fontSize: "14px" }}>
              Online Orders
            </Typography>
          </ListItem>
        )}

        {/* Sales Agent dropdown */}
        {user && can("salesAgentMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("salesAgent")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <PersonIcon sx={{ fontSize: 18, marginRight: "10px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Sales Agent
                </Typography>
              </Box>
              {openDropdown.salesAgent ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse
              in={openDropdown.salesAgent}
              timeout="auto"
              unmountOnExit
            >
              <List sx={nestedListStyle}>
                {can("salesMyLeads") && (
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
                )}

                {can("salesMySales") && (
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
                )}
              </List>
            </Collapse>
          </>
        )}

        {/* Retention Agent dropdown */}
        {user && can("retentionAgentMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("retentionAgent")}
              sx={dropdownStyle}
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
              <List sx={nestedListStyle}>
                {can("retentionLeads") && (
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
                )}

                {can("retentionSales") && (
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
                )}
              </List>
            </Collapse>
          </>
        )}

        {/* Task Manager dropdown */}
        {user && can("taskManagerMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("taskManager")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CheckBoxIcon sx={{ marginRight: "12px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Task Manager
                </Typography>
              </Box>
              {openDropdown.taskManager ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse
              in={openDropdown.taskManager}
              timeout="auto"
              unmountOnExit
            >
              <List sx={nestedListStyle}>
                {can("taskBoard") && (
                  <ListItem
                    button
                    component={Link}
                    to="/task-board"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Task Management
                    </Typography>
                  </ListItem>
                )}

                {can("myReporting") && (
                  <ListItem
                    button
                    component={Link}
                    to="/my-reporting"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      My Reporting
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {/* Smartflo dropdown */}
        {user && can("smartfloMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("smartflo")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <PhoneInTalkIcon sx={{ fontSize: 20, marginRight: "12px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Smartflo
                </Typography>
              </Box>
              {openDropdown.smartflo ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse in={openDropdown.smartflo} timeout="auto" unmountOnExit>
              <List sx={nestedListStyle}>
                {can("smartfloCallLogs") && (
                  <ListItem
                    button
                    component={Link}
                    to="/smartflo/call-logs"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Call Logs
                    </Typography>
                  </ListItem>
                )}
                {can("smartfloDataAnalytics") && (
                  <ListItem
                    button
                    component={Link}
                    to="/smartflo/data-analytics"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Data Analytics
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {user && can("allAnalyticsMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("analytics")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <QueryStatsIcon sx={{ fontSize: 22, marginRight: "12px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Analytics
                </Typography>
              </Box>
              {openDropdown.analytics ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse in={openDropdown.analytics} timeout="auto" unmountOnExit>
              <List sx={nestedListStyle}>
                {can("superAdminAnalytics") && (
                  <ListItem
                    button
                    component={Link}
                    to="/super-admin-analytics"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Super Admin Analytics
                    </Typography>
                  </ListItem>
                )}

                {can("abandonedAnalytics") && (
                  <ListItem
                    button
                    component={Link}
                    to="/abandoned-analytics"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Abandoned Analytics
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {/* Finance-related menus */}
        {user && can("financeOrderSummary") && (
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
        )}

        {user && can("financePrepaidRemittanceMenu") && (
          <>
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
              {openDropdown.paymentGateway ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse
              in={openDropdown.paymentGateway}
              timeout="auto"
              unmountOnExit
            >
              <List sx={nestedListStyle}>
                {can("financePrepaidRazorpay") && (
                  <ListItem
                    button
                    component={Link}
                    to="/gateway/razorpay"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Razorpay
                    </Typography>
                  </ListItem>
                )}
                {can("financePrepaidPhonePe") && (
                  <ListItem
                    button
                    component={Link}
                    to="/gateway/phonepe"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      PhonePe
                    </Typography>
                  </ListItem>
                )}
                {can("financePrepaidEasebuzz") && (
                  <ListItem
                    button
                    component={Link}
                    to="/gateway/easebuzz"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Easebuzz
                    </Typography>
                  </ListItem>
                )}
                {can("financePrepaidCashfree") && (
                  <ListItem
                    button
                    component={Link}
                    to="/gateway/cashfree"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Cashfree
                    </Typography>
                  </ListItem>
                )}

                {can("financePrepaidBankTransfer") && (
                  <ListItem
                    button
                    component={Link}
                    to="/gateway/bank-transfer"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Bank Transfer
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {user && can("financeRtoSheet") && (
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
        )}

        {user && can("financeCodRemittanceMenu") && (
          <>
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
              {openDropdown.remittance ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse in={openDropdown.remittance} timeout="auto" unmountOnExit>
              <List sx={nestedListStyle}>
                {can("financeCodBluedart") && (
                  <ListItem
                    button
                    component={Link}
                    to="/remittance/bluedart"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Bluedart
                    </Typography>
                  </ListItem>
                )}
                {can("financeCodDTDC") && (
                  <ListItem
                    button
                    component={Link}
                    to="/remittance/dtdc"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      DTDC
                    </Typography>
                  </ListItem>
                )}
                {can("financeCodDelhivery") && (
                  <ListItem
                    button
                    component={Link}
                    to="/remittance/delhivery"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Delhivery
                    </Typography>
                  </ListItem>
                )}
                {can("financeCodShiprocket") && (
                  <ListItem
                    button
                    component={Link}
                    to="/remittance/shiprocket"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Shiprocket
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {/* Operations */}
        {user && can("opsUndeliveredOrders") && (
          <ListItem
            button
            component={Link}
            to="/operations/undelivered-orders"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <ErrorOutlineIcon sx={{ fontSize: 20, marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Undelivered Orders
            </Typography>
          </ListItem>
        )}

        {user && can("opsRtoDelivered") && (
          <ListItem
            button
            component={Link}
            to="/operations/rto-delivered"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <LocalShippingIcon sx={{ fontSize: 20, marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              RTO Delivered
            </Typography>
          </ListItem>
        )}

        {user && can("opsEmailUndelivered") && (
          <ListItem
            button
            component={Link}
            to="/operations/undelivered"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <EmailIcon sx={{ fontSize: 20, marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Email Undelivered
            </Typography>
          </ListItem>
        )}

        {user && can("opsOnlyOrderConfirmation") && (
          <ListItem
            button
            component={Link}
            to="/only-order-confirmation"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <AssignmentTurnedInIcon sx={{ fontSize: 20, marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Only Order Confirmation
            </Typography>
          </ListItem>
        )}


        {user && can("deliveredSalesRecord") && (
          <ListItem
            button
            component={Link}
            to="/delivered-sales-record"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <FactCheckIcon sx={{ fontSize: 20, marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Delivered Sales Record
            </Typography>
          </ListItem>
        )}

        {/* HR - Assets */}
        {user && can("hrAddNewAssets") && (
          <ListItem
            button
            component={Link}
            to="/add-new-asset"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <Inventory2Icon sx={{ fontSize: 20, marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Add New Assets
            </Typography>
          </ListItem>
        )}

        {user && can("hrAssetAllotment") && (
          <ListItem
            button
            component={Link}
            to="/AssetAllotment"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <Inventory2Icon sx={{ fontSize: 20, marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Asset Allotment
            </Typography>
          </ListItem>
        )}

        {user && can("myAssets") && (
          <ListItem
            button
            component={Link}
            to="/my-assets"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <Inventory2Icon sx={{ marginRight: "12px" }} />
            <Typography variant="body1" sx={{ fontSize: "14px" }}>
              My Assets
            </Typography>
          </ListItem>
        )}

        {/* Finance records */}
        {user && can("financeRecordsMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("records")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <AnalyticsIcon sx={{ fontSize: 20, marginRight: "12px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Records
                </Typography>
              </Box>
              {openDropdown.records ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse in={openDropdown.records} timeout="auto" unmountOnExit>
              <List sx={nestedListStyle}>
                {can("financePurchaseRecords") && (
                  <ListItem
                    button
                    component={Link}
                    to="/purchase-record"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Purchase Records
                    </Typography>
                  </ListItem>
                )}

                {can("financePaymentRecords") && (
                  <ListItem
                    button
                    component={Link}
                    to="/payment-record"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Payment Records
                    </Typography>
                  </ListItem>
                )}

                {can("financeVendors") && (
                  <ListItem
                    button
                    component={Link}
                    to="/vendors"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      My Vendors
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {user && can("financeBankReconciliationMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("bankReconciliation")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Inventory2Icon sx={{ fontSize: 20, marginRight: "12px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Bank Reconciliation
                </Typography>
              </Box>
              {openDropdown.bankReconciliation ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse
              in={openDropdown.bankReconciliation}
              timeout="auto"
              unmountOnExit
            >
              <List sx={nestedListStyle}>
                {can("bankCapital6389") && (
                  <ListItem
                    button
                    component={Link}
                    to="/BankCapital6389"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Bank - Capital 6389
                    </Typography>
                  </ListItem>
                )}

                {can("bankAxis3361") && (
                  <ListItem
                    button
                    component={Link}
                    to="/BankAxis3361"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Axis - 3361
                    </Typography>
                  </ListItem>
                )}

                {can("bankCc1101") && (
                  <ListItem
                    button
                    component={Link}
                    to="/BankCc1101"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      CC 1101
                    </Typography>
                  </ListItem>
                )}

                {can("bankSbi8285") && (
                  <ListItem
                    button
                    component={Link}
                    to="/BankReconciliation"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      SBI Current 8285
                    </Typography>
                  </ListItem>
                )}

                {can("bankYesCcTejasv") && (
                  <ListItem
                    button
                    component={Link}
                    to="/BankYesCcTejasv"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Yes CC - Tejasv
                    </Typography>
                  </ListItem>
                )}

                {can("bankYesCcAbhay") && (
                  <ListItem
                    button
                    component={Link}
                    to="/BankYesCcAbhay"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Yes CC - Abhay
                    </Typography>
                  </ListItem>
                )}

                {can("bankKotak") && (
                  <ListItem
                    button
                    component={Link}
                    to="/BankKotak"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Bank - Kotak
                    </Typography>
                  </ListItem>
                )}

              </List>
            </Collapse>
          </>
        )}

        {/* Leaderboard */}
        {user && can("leaderboardMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("leaderboard")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <EmojiEventsIcon sx={{ fontSize: 24, marginRight: "12px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Leaderboard
                </Typography>
              </Box>
              {openDropdown.leaderboard ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse
              in={openDropdown.leaderboard}
              timeout="auto"
              unmountOnExit
            >
              <List sx={nestedListStyle}>
                {can("leaderboardAll") && (
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
                )}
                {can("leaderboardBloom") && (
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
                )}
              </List>
            </Collapse>
          </>
        )}

        {/* Manager "Others" via permissions */}
        {user && can("othersMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("others")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FolderIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Others
                </Typography>
              </Box>
              {openDropdown.others ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse in={openDropdown.others} timeout="auto" unmountOnExit>
              <List sx={nestedListStyle}>
                {can("othersSwitchDashboards") && (
                  <ListItem
                    button
                    component={Link}
                    to="/switch-dashboard"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Switch Dashboards
                    </Typography>
                  </ListItem>
                )}

                {can("othersIncentiveCreation") && (
                  <ListItem
                    button
                    component={Link}
                    to="/incentive-creation"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Incentive Creation
                    </Typography>
                  </ListItem>
                )}

                {can("othersScheduleCalls") && (
                  <ListItem
                    button
                    component={Link}
                    to="/schedule-calls"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Schedule Calls
                    </Typography>
                  </ListItem>
                )}

                {can("othersAllProducts") && (
                  <ListItem
                    button
                    component={Link}
                    to="/all-products"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      All Products
                    </Typography>
                  </ListItem>
                )}

                {can("otherswhatsaaptemplates") && (
                  <ListItem
                    button
                    component={Link}
                    to="/template/chat"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Whatsaap Templates
                    </Typography>
                  </ListItem>
                )}

                {can("othersLeadMigration") && (
                  <ListItem
                    button
                    component={Link}
                    to="/lead-migration"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Leads Migrate
                    </Typography>
                  </ListItem>
                )}

                {can("othersDietTemplate") && (
                  <ListItem
                    button
                    component={Link}
                    to="/diet-template"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Diet Plan Builder
                    </Typography>
                  </ListItem>
                )}

                {can("othersAllShopifyOrders") && (
                  <ListItem
                    button
                    component={Link}
                    to="/all-shopify-orders"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      All Shopify Orders
                    </Typography>
                  </ListItem>
                )}

                {can("othersTransferRequests") && (
                  <ListItem
                    button
                    component={Link}
                    to="/transfer-requests"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Lead Transfer Requests
                    </Typography>
                  </ListItem>
                )}

                {can("othersBulkDataUpload") && (
                  <ListItem
                    button
                    component={Link}
                    to="/bulk-data-upload"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Bulk data Upload
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {/* International Agent menus via permissions */}
        {user && can("globalShopifyMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("globalShopify")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <ShoppingCartIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Global Shopify Orders
                </Typography>
              </Box>
              {openDropdown.globalShopify ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse
              in={openDropdown.globalShopify}
              timeout="auto"
              unmountOnExit
            >
              <List sx={nestedListStyle}>
                {can("globalShopifyOrders") && (
                  <ListItem
                    button
                    component={Link}
                    to="/global-shopify-orders"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Shopify Orders
                    </Typography>
                  </ListItem>
                )}

                {can("globalAbandonedCart") && (
                  <ListItem
                    button
                    component={Link}
                    to="/global-aband"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Abandoned Cart
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {user && can("globalRetentionMenu") && (
          <>
            <ListItem
              button
              onClick={() => handleDropdownClick("globalRetention")}
              sx={dropdownStyle}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <PersonIcon sx={{ fontSize: 18, marginRight: "8px" }} />
                <Typography variant="body1" sx={{ fontSize: "14px" }}>
                  Global Retention
                </Typography>
              </Box>
              {openDropdown.globalRetention ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </ListItem>

            <Collapse
              in={openDropdown.globalRetention}
              timeout="auto"
              unmountOnExit
            >
              <List sx={nestedListStyle}>
                {can("globalRetentionLeads") && (
                  <ListItem
                    button
                    component={Link}
                    to="/global-retention-leads"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Global Retention Leads
                    </Typography>
                  </ListItem>
                )}

                {can("globalRetentionSales") && (
                  <ListItem
                    button
                    component={Link}
                    to="/global-retention-sales"
                    onClick={toggleDrawer}
                  >
                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                      Global Retention Sales
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}

        {/* Growth at Muditam */}
        {user && can("myGrowthPlan") && (
          <ListItem
            button
            component={Link}
            to="/my-growth-plan"
            sx={menuItemStyle}
            onClick={toggleDrawer}
          >
            <TrendingUpIcon sx={{ fontSize: 24, marginRight: "12px" }} />
            <Typography variant="body1" style={{ fontSize: "14px" }}>
              Growth At Muditam
            </Typography>
          </ListItem>
        )}

        {/* Bottom user info + logout */}
        {user && (
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

            <IconButton onClick={handleLogout} sx={{ color: "gray" }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        )}
      </List>
    </Drawer>
  );
};

export default MenuBar;

import React, { useRef, useState, useEffect } from "react";
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
  Collapse,
  InputAdornment,
  Dialog,
  DialogContent,
  Button,
  DialogTitle,
  DialogActions,
  Grid,
  Divider,
  Chip,
  Table,
  Slide,
  TableCell,
  TableBody,
  TableHead,
  TableRow,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import MenuBar from "./MenuBar";
import { useNavigate, useLocation } from "react-router-dom";
import Notifications from "../Notifications";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import CartDrawer from "../../ShopifyOrders/CartDrawer";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CloseIcon from '@mui/icons-material/Close'; 
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { Syringe } from "lucide-react";
import pincodeData from "../../LeadConsultation/ProcessTracker/pincodeData";
import DeliveryStatusChecker from "./DeliveryStatusChecker";
import LeaderboardPopover from "./LeaderboardPopover";
import DownloadIcon from '@mui/icons-material/Download';
import { Flower2 } from "lucide-react";
import Bloomleader from "./Bloomleader";

const SlideDown = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});


const getAvatarUrl = (name) =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&radius=50`;


const NavbarWithSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [shopifyQuery, setShopifyQuery] = useState("");
  const [customerData, setCustomerData] = useState(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [target, setTarget] = useState(0);
  const [salesProgress, setSalesProgress] = useState(0);
  const [bloodTestDialog, setBloodTestDialog] = useState(false);
  const [pincode, setPincode] = useState("");
  const [availableLabs, setAvailableLabs] = useState([]);
  const [checkClicked, setCheckClicked] = useState(false);
  const [incentiveOpen, setIncentiveOpen] = useState(false);
  const leaderboardAnchorRef = useRef(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [bloomOpen, setBloomOpen] = useState(false);


  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(sessionStorage.getItem("user"));

  const openBloodTestDialog = () => {
    setPincode("");
    setAvailableLabs([]);
    setCheckClicked(false);
    setBloodTestDialog(true);
  };
  const closeBloodTestDialog = () => setBloodTestDialog(false);

  const handlePincodeChange = (e) => setPincode(e.target.value);

  // Helper to get working days left in this month (Mon-Sat)
  function getWorkingDaysLeft() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();
    let days = 0;
    for (let d = date; d <= lastDay; d++) {
      const check = new Date(year, month, d);
      if (check.getDay() !== 0) days++; // not Sunday
    }
    return days;
  }
  const workingDaysLeft = getWorkingDaysLeft();
  const dailySalesRequired =
    workingDaysLeft > 0 && target - salesProgress > 0
      ? Math.ceil((target - salesProgress) / workingDaysLeft)
      : 0;

  const checkLabs = () => {
    setCheckClicked(true);
    const labs = [];
    const pin = pincode.trim();
    if (!pin) {
      setAvailableLabs([]);
      return;
    }
    if (pincodeData.Redcliff.includes(pin)) labs.push("Redcliff");
    if (pincodeData.Lalpathlab.includes(pin)) labs.push("Lalpathlab"); 
    if (pincodeData.Redcliff.includes(pin)) labs.push("Healthians"); 
    setAvailableLabs(labs);
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim() === "") {
      setResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/search",
        { params: { query: value } }
      );
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  };

  const handleClickAway = () => {
    setShowResults(false);
  };

  const handleShopifyInputChange = (e) => {
    setShopifyQuery(e.target.value);
  };

  useEffect(() => {
    async function fetchTarget() {
      if (!user) return;
      try {
        const response = await axios.get(
          "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
          {
            params: {
              fullName: user.fullName,
              email: user.email,
            },
          }
        );
        if (response.data && response.data[0]) {
          setTarget(response.data[0].target || 0);
        }
      } catch (error) {
        console.error("Error fetching employee target:", error);
      }
    }
    fetchTarget();
  }, [user]);

  useEffect(() => {
    async function fetchSalesProgress() {
      if (!user) return;
      try {
        const response = await axios.get(
          "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress",
          {
            params: { name: user.fullName },
          }
        );
        setSalesProgress(response.data.total || 0);
      } catch (error) {
        console.error("Error fetching retention sales progress:", error);
      }
    }
    fetchSalesProgress();
  }, [user]);

  // Early return after hooks
  if (location.pathname === "/login") {
    return null;
  }

  const executeShopifySearch = async () => {
    if (!shopifyQuery.trim()) {
      setCustomerData(null);
      setShowCustomerDetails(false);
      return;
    }

    try {
      // Call the new endpoint to get customer details
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/shopify/customerDetails",
        {
          params: { phone: shopifyQuery },
        }
      );
      setCustomerData(response.data.customer);
      setShowCustomerDetails(true);
      // Reset orders dropdown
      setShowOrders(false);
      setShowAllOrders(false);
    } catch (error) {
      console.error("Error fetching Shopify customer details:", error);
    }
  };

  const handleShopifyClickAway = () => {
    setShowCustomerDetails(false);
  };

  const toggleOrders = () => {
    setShowOrders((prev) => !prev);
  };

  const toggleShowAllOrders = () => {
    setShowAllOrders((prev) => !prev);
  };

  const toggleMenu = (open) => () => {
    setMenuOpen(open);
  };

  const toggleAddress = (orderId) => {
    setExpandedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleDownloadOrders = async () => {  
    try {
      const response = await axios.get(
        "http://localhost:5001/api/myorders/download",
        { responseType: 'blob' }
      );

      // Create a URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'myorders.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error downloading orders. Please try again.');
      console.error(error);
    }
  };


  const toggleCartDrawer = (open) => () => setCartDrawerOpen(open);

  const smallFont = { fontSize: "0.8rem" };

  return (
    <>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "#000000", // Dark Blue
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          {/* Left side: Menu Icon and Title */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={toggleMenu(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon sx={{ fontSize: "2.3rem" }} />
            </IconButton>
            <Box
              component="img"
              src="https://cdn.shopify.com/s/files/1/0734/7155/7942/files/new_logo_orange_leaf_1_4e0e0f89-08a5-4264-9d2b-0cfe9535d553.png?v=1727508866"
              alt="Muditam Logo"
              sx={{ height: 40, ml: 1 }}
            />
          </Box>


          {/* Center: Shopify Customer Search Bar */}
          <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Box sx={{ position: "relative", width: 300 }}>
              <ClickAwayListener onClickAway={handleShopifyClickAway}>
                <div>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search On Shopify"
                    value={shopifyQuery}
                    onChange={handleShopifyInputChange}
                    sx={{
                      backgroundColor: "#fff",
                      borderRadius: 2,
                      "& .MuiInputBase-input": {
                        padding: "8px 12px",
                        ...smallFont,
                      },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={executeShopifySearch}
                            sx={{ color: "#1976d2" }}
                          >
                            <SearchIcon sx={{ color: "gray" }} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {showCustomerDetails && (
                    <List
                      sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        bgcolor: "#f5f5f5",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        maxHeight: 290,
                        overflowY: "auto",
                        zIndex: 10,
                        color: "black",
                      }}
                    >
                      {customerData ? (
                        <React.Fragment>
                          <ListItem
                            button
                            onClick={toggleOrders}
                            sx={{ py: 1, ...smallFont }}
                          >
                            <ListItemText
                              primary={`${customerData.name}`}
                              secondary={
                                <>
                                  <span>
                                    Total Orders: {customerData.totalOrders} |
                                    Total Spent: ₹{customerData.totalSpent}
                                  </span>
                                  <br />
                                  <span>
                                    Last Order:{" "}
                                    {customerData.lastOrderDate
                                      ? new Date(
                                        customerData.lastOrderDate
                                      ).toLocaleString()
                                      : "N/A"}{" "}
                                    | Payment Status:{" "}
                                    {customerData.lastOrderPaymentStatus ||
                                      "N/A"}
                                  </span>
                                </>
                              }
                              primaryTypographyProps={{ style: smallFont }}
                              secondaryTypographyProps={{ style: smallFont }}
                            />
                            {showOrders ? (
                              <ExpandLessIcon fontSize="small" />
                            ) : (
                              <ExpandMoreIcon fontSize="small" />
                            )}
                          </ListItem>
                          <Collapse
                            in={showOrders}
                            timeout="auto"
                            unmountOnExit
                          >
                            <List component="div" disablePadding>
                              {customerData.orders &&
                                customerData.orders.length > 0 ? (
                                <>
                                  {customerData.orders
                                    .slice(0, 4)
                                    .map((order) => (
                                      <ListItem
                                        key={order.id}
                                        sx={{ pl: 3, py: 0.5, ...smallFont }}
                                      >
                                        <ListItemText
                                          primary={`Order ${order.id} | Total Amount: ₹${order.totalAmount || 0}`}
                                          secondary={
                                            <>
                                              <span>
                                                {new Date(order.created_at).toLocaleString()} | Items: {order.itemCount} | {order.deliveryStatus}
                                              </span>
                                              <br />
                                              {order.lineItems.map((item, idx) => (
                                                <span key={idx}>
                                                  {item.title} - {item.variant} (₹{item.amountPaid}){" "}
                                                </span>
                                              ))}
                                              <br />
                                              <Box
                                                onClick={() => toggleAddress(order.id)}
                                                sx={{
                                                  cursor: "pointer",
                                                  color: "#1976d2",
                                                  mt: 1,
                                                  display: "flex",
                                                  alignItems: "center",
                                                }}
                                              >
                                                {expandedOrderIds.includes(order.id) ? (
                                                  <>
                                                    Show Less Address <ExpandLessIcon fontSize="small" sx={{ ml: 0.5 }} />
                                                  </>
                                                ) : (
                                                  <>
                                                    Show Address <ExpandMoreIcon fontSize="small" sx={{ ml: 0.5 }} />
                                                  </>
                                                )}
                                              </Box>
                                              <Collapse in={expandedOrderIds.includes(order.id)} timeout="auto" unmountOnExit>
                                                <Typography sx={{ mt: 1, ...smallFont }}>
                                                  {order.shippingAddress || "No shipping address found"}
                                                </Typography>
                                              </Collapse>
                                            </>
                                          }
                                          primaryTypographyProps={{
                                            style: smallFont,
                                          }}
                                          secondaryTypographyProps={{
                                            style: smallFont,
                                          }}
                                        />
                                      </ListItem>
                                    ))}
                                  {customerData.orders.length > 4 && (
                                    <ListItem
                                      button
                                      onClick={toggleShowAllOrders}
                                      sx={{ pl: 3, ...smallFont }}
                                    >
                                      <ListItemText
                                        primary={
                                          showAllOrders
                                            ? "Show less orders"
                                            : `${customerData.orders.length - 4
                                            } more orders`
                                        }
                                      />
                                    </ListItem>
                                  )}
                                  {showAllOrders &&
                                    customerData.orders
                                      .slice(4)
                                      .map((order) => (
                                        <ListItem
                                          key={order.id}
                                          sx={{ pl: 3, py: 0.5, ...smallFont }}
                                        >
                                          <ListItemText
                                            primary={`Order ${order.id}`}
                                            secondary={
                                              <>
                                                <span>
                                                  {new Date(
                                                    order.created_at
                                                  ).toLocaleString()}{" "}
                                                  | Items: {order.itemCount} |{" "}
                                                  {order.deliveryStatus}
                                                </span>
                                                <br />
                                                {order.lineItems.map(
                                                  (item, idx) => (
                                                    <span key={idx}>
                                                      {item.title} -{" "}
                                                      {item.variant} (
                                                      {item.amountPaid}){" "}
                                                    </span>
                                                  )
                                                )}
                                              </>
                                            }
                                            primaryTypographyProps={{
                                              style: smallFont,
                                            }}
                                            secondaryTypographyProps={{
                                              style: smallFont,
                                            }}
                                          />
                                        </ListItem>
                                      ))}
                                </>
                              ) : (
                                <ListItem sx={{ pl: 3, py: 1, ...smallFont }}>
                                  <ListItemText primary="No orders found." />
                                </ListItem>
                              )}
                            </List>
                          </Collapse>
                        </React.Fragment>
                      ) : (
                        <ListItem>
                          <ListItemText
                            primary="Customer does not exist."
                            sx={smallFont}
                          />
                        </ListItem>
                      )}
                    </List>
                  )}
                </div>
              </ClickAwayListener>
            </Box>
          </Box>

          {user?.role !== "Manager" && user?.role !== "Finance" && user?.role !== "Operations" && (
            <Box
              sx={{
                mx: 2,
                p: 1,
                bgcolor: "#000",
                borderRadius: 2,
                minWidth: 140,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#fff",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                DRR:
                <span style={{ marginLeft: 5, color: "#19d444", fontWeight: 700 }}>
                  {dailySalesRequired > 0 ? `₹${dailySalesRequired}` : "₹0"}
                </span>
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: "#444" }} />
              <Typography
                variant="caption"
                sx={{
                  color: "#fff",
                  fontSize: "1rem",
                  fontWeight: 500,
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                Target: ({salesProgress} / {target}){" "}
                <span style={{ marginLeft: 8, color: "#f7c942", fontWeight: 700 }}>
                  {target > 0 ? `${Math.round((salesProgress / target) * 100)}%` : "0%"}
                </span>
              </Typography>
            </Box>
          )}

          {/* Right side: Icons and LMS Search */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {user?.role !== "Finance" && user?.role !== "Operations" && (
            <IconButton
              onClick={() => setIncentiveOpen(true)}
              sx={{
                mr: 1,
                color: "#fff",
                "&:hover": { color: "#fff", bgcolor: "#e0e0e0" }
              }}
              title="View Incentive Structure"
            >
              <RocketLaunchIcon />
            </IconButton> 
            )} 
 
            {user?.role !== "Finance" && user?.role !== "Operations" && (
            <IconButton
              onClick={() => setBloomOpen(true)}
              sx={{
                mr: 0.5,
                color: "#fff",
                borderRadius: "50%",
                p: 1.1,
                "&:hover": { bgcolor: "#fff", color: "#e0e0e0" }
              }}
              title="View Bloom Leaderboard"
            >
              <Flower2 />
            </IconButton>
            )}

            {user?.role !== "Finance" && user?.role !== "Operations" && (
            <IconButton
              ref={leaderboardAnchorRef}
              onClick={() => setLeaderboardOpen(true)}
              sx={{
                mr: 0.5,
                color: "#fff",
                borderRadius: "50%",
                p: 1.1,
                "&:hover": { bgcolor: "#fff", color: "#e0e0e0" }
              }}
              title="View Leaderboard"
            >
              <EmojiEventsIcon /> 
            </IconButton>
            )}

            <Bloomleader open={bloomOpen} anchorEl={leaderboardAnchorRef.current} onClose={() => setBloomOpen(false)} />

            <LeaderboardPopover
              open={leaderboardOpen}
              anchorEl={leaderboardAnchorRef.current}
              onClose={() => setLeaderboardOpen(false)}
            />

            {user?.role !== "Finance" && user?.role !== "Operations" && (
            <IconButton
              color="error"
              onClick={openBloodTestDialog}
              sx={{ mr: 0.5, color: "#fff", borderRadius: "50%", p: 1.1, "&:hover": { bgcolor: "#e0e0e0" } }} 
              title="Blood Test Pincode Check"
            >
              <Syringe />
            </IconButton>
            )}

            {user?.role !== "Finance" && user?.role !== "Operations" && ( 
            <IconButton
              onClick={() => setDeliveryDialogOpen(true)}
              sx={{ mr: 0.5, color: "#fff", borderRadius: "50%", p: 1.1, "&:hover": { bgcolor: "#e0e0e0" } }}
              title="Delivery Status Checker"
            >
              <LocalShippingIcon />
            </IconButton>
            )}

            {/* <IconButton
              sx={{
                mr: 1,
                color: "#fff",
                "&:hover": { color: "#fff", bgcolor: "#e0e0e0" } 
              }}
              title="Download All Orders (CSV)" 
              onClick={handleDownloadOrders} 
            >
              <DownloadIcon />
            </IconButton>   */} 
 

            {/* {user && ( 
              <IconButton
                onClick={() => navigate("/my-templates")}
                sx={{ mr: 0.5, "&:hover": { backgroundColor: "#e0e0e0" } }}
              >
                <StickyNote2Icon sx={{ color: "white" }} />
              </IconButton>
            )} */}


            {user && location.pathname !== "/login" && (
              <IconButton
                color="inherit"
                onClick={toggleCartDrawer(true)}
                sx={{ "&:hover": { backgroundColor: "#e0e0e0" } }}
              >
                <ShoppingCartIcon />
              </IconButton>
            )}
            <Box sx={{ position: "relative", width: 200, ml: 2 }}>
              <ClickAwayListener onClickAway={handleClickAway}>
                <div>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="LMS Search"
                    value={query}
                    onChange={handleSearch}
                    sx={{
                      backgroundColor: "#fff",
                      borderRadius: 2,
                      "& .MuiInputBase-input": {
                        textAlign: "left",
                        ...smallFont,
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
                        bgcolor: "#f5f5f5",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        maxHeight: 200,
                        overflowY: "auto",
                        zIndex: 10,
                        color: "black",
                      }}
                    >
                      {results.map((item) => (
                        <ListItem
                          key={item._id}
                          button
                          onClick={() => {
                            navigate(`/lead/${item._id}`);
                            handleClickAway();
                          }}
                          sx={{
                            ...smallFont,
                            backgroundColor: item.source === "customer" ? "#ffe5e5" : "inherit"
                          }}
                        >
                          <ListItemText
                            primary={`${item.name || "No Name"} (${item.contactNumber}) (${item.agentAssigned}) [${item.healthExpertAssigned}]${item.hasOpenEscalation ? " ? " : ""}`} 
                            primaryTypographyProps={{ style: smallFont }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </div>
              </ClickAwayListener>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Dialog
        open={deliveryDialogOpen}
        onClose={() => setDeliveryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2,
            background: "#fff",
          },
        }}
      >
        <DialogContent>
          <DeliveryStatusChecker onClose={() => setDeliveryDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={bloodTestDialog}
        onClose={closeBloodTestDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: 400,
            p: 0,
            background: "#fff",
            boxShadow: "0 6px 24px 0 rgba(110,49,49,0.12)", 
            position: 'relative',
          },
        }}
      >
        {/* Cross (X) Button in top right */}
        <IconButton
          aria-label="close"
          onClick={closeBloodTestDialog}
          sx={{
            position: 'absolute',
            right: 10,
            top: 10,
            color: '#333',
            zIndex: 10,
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt: 3,
            pb: 1,
          }}
        >
          <Syringe style={{ fontSize: "1.5rem", color: "#000" }} />
          <DialogTitle
            sx={{
              textAlign: "center",
              pb: 0,
              fontWeight: 600,
              fontSize: "1.2rem",
            }}
          >
            Blood Test Availability
          </DialogTitle>
          <Box
            sx={{ height: 3, borderRadius: "20px", backgroundColor: "#FFD700", width: "90%" }}
          />
        </Box>
        <DialogContent sx={{ pt: 1 }}>
          <Typography
            variant="body2"
            sx={{ textAlign: "center", color: "#6a6868", fontSize: "14px" }}
          >
            Enter your pincode to check which labs are available for home blood
            test collection.
          </Typography>
          <TextField
            fullWidth
            label="Enter Pincode"
            value={pincode}
            onChange={handlePincodeChange}
            variant="outlined"
            margin="normal"
            inputProps={{
              maxLength: 6,
              inputMode: "numeric",
              pattern: "[0-9]*",
            }}
            sx={{
              background: "#fafbfc",
              borderRadius: 2,
              "& .MuiInputLabel-root": {
                top: "50%",
                transform: "translateY(-50%)",
                transition: "all 0.2s ease-in-out",
                fontSize: "0.85rem",
                paddingLeft: "8px",
              },
              "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled": {
                top: 0,
                color: "gray",
                transform: "translateY(-50%) translateX(8px)",
                paddingLeft: "8px",
                fontSize: "0.75rem",
              },
              "& .MuiOutlinedInput-root": {
                "& input": {
                  padding: "8px !important",
                },
                "&.Mui-focused fieldset": { borderColor: "black" },
                "&:hover fieldset": { borderColor: "black" },
              },
            }}
          />
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 1, borderRadius: 1.5, backgroundColor: "black", color: "white", mb: 2 }}
            onClick={checkLabs}
            size="medium"
          >
            Check
          </Button>
          {checkClicked && (
            <Box
              sx={{
                mt: 1,
                minHeight: 30,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {availableLabs.length === 0 ? (
                <Typography color="error" sx={{ fontWeight: 500, fontSize: "15px" }}>
                  No labs available for this pincode.
                </Typography>
              ) : (
                <>
                  <Typography sx={{ fontWeight: 500, color: "#222", fontSize: "15px" }}>
                    Available Lab{availableLabs.length > 1 ? "s" : ""}:
                  </Typography>
                  <Grid container spacing={1} sx={{ mt: 0.5, width: "100%", justifyContent: "center", display: "flex" }}>
                    {availableLabs.map((lab, idx) => (
                      <Grid item xs={3.5} key={lab} >
                        <Chip
                          label={lab}
                          sx={{
                            width: "100%",
                            bgcolor: "#e3f2fd",
                            color: "#0351a6",
                            fontSize: "14px",
                            borderRadius: "1rem",
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={incentiveOpen}
        TransitionComponent={SlideDown}
        keepMounted
        onClose={() => setIncentiveOpen(false)}
        maxWidth="500"
        PaperProps={{
          sx: {
            borderRadius: 2,
            mt: 3,
            boxShadow: "0 10px 36px 0 rgba(0,0,0,0.22)",
            background: "#fff",
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "1.3rem",
            color: "#222",
          }}
        >
          Incentive Structure
        </DialogTitle>
        <Box
          sx={{ height: 3, borderRadius: "20px", backgroundColor: "#FFD700", ml: 2, mr: 2 }}
        />
        <DialogContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: 15,
                    color: "#000",
                    textAlign: "center",
                  }}
                >
                  Slab (Monthly Sales)
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: 15,
                    color: "#000",
                    textAlign: "center",
                  }}
                >
                  Reward Rate
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: 15,
                    color: "#000",
                    textAlign: "center",
                  }}
                >
                  Monthly Incentive (₹)
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: 15,
                    color: "#000",
                    textAlign: "center",
                  }}
                >
                  Annual Incentive (₹)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                {
                  slab:   "2L – 3L",
                  rate:   "1.50%",
                  monthly: "3,000 – 4,500",
                  annual:  "36,000 – 54,000",
                },
                {
                  slab: "3L – 4L",
                  rate: "2%",
                  monthly: "6,000 – 8,000",
                  annual: "72,000 – 96,000",
                },
                {
                  slab: "4L – 5L",
                  rate: "2.50%",
                  monthly: "10,000 – 12,500",
                  annual: "1,20,000 – 1,50,000",
                },
                {
                  slab: "5L – 6L",
                  rate: "3%",
                  monthly: "15,000 – 18,000",
                  annual: "1,80,000 – 2,16,000",
                },
                {
                  slab: "6L – 8L",
                  rate: "3.50%",
                  monthly: "21,000 – 28,000",
                  annual: "2,52,000 – 3,36,000",
                },
                {
                  slab: "8L – 10L",
                  rate: "4%",
                  monthly: "32,000 – 40,000",
                  annual: "3,84,000 – 4,80,000",
                },
              ].map((row) => (
                <TableRow key={row.slab}>
                  <TableCell align="center">{row.slab}</TableCell>
                  <TableCell align="center">{row.rate}</TableCell>
                  <TableCell align="center">{row.monthly}</TableCell>
                  <TableCell align="center">{row.annual}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
          <Button
            onClick={() => setIncentiveOpen(false)}
            variant="contained"
            sx={{
              bgcolor: "#000",
              color: "#fff",
              borderRadius: 2,
              textTransform: "none",
              px: 4,
              "&:hover": { bgcolor: "#111" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sidebar Drawer */}
      <Drawer
        anchor="left"
        position="absolute"
        open={menuOpen}
        onClose={toggleMenu(false)}
        PaperProps={{
          sx: {
            mt: "64px",
          },
        }}
      >
        <MenuBar toggleDrawer={toggleMenu(false)} />
      </Drawer>

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={cartDrawerOpen}
        onClose={toggleCartDrawer(false)}
      >
        <CartDrawer closeDrawer={toggleCartDrawer(false)} />
      </Drawer>
    </>
  );
};

export default NavbarWithSearch;

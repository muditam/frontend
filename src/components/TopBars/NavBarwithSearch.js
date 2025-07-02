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
import LeaderboardIcon from "@mui/icons-material/Leaderboard"; 
import { Syringe } from "lucide-react";
import pincodeData from "../../LeadConsultation/ProcessTracker/pincodeData";
import LeaderboardPopover from "./LeaderboardPopover";

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
    if (pincodeData.Lalpathlab.includes(pin)) labs.push("Tataonemg");
    if (pincodeData.Redcliff.includes(pin)) labs.push("PathKind");
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
            <Box sx={{ position: "relative", width: 400 }}>
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
                        maxHeight: 300,
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

          {user?.role !== "Manager" && (
            <Box
              sx={{
                mx: 2,
                p: 1,
                bgcolor: "#000",
                borderRadius: 2,
                minWidth: 130,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#fff",
                  fontSize: "1.3rem",
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
            <IconButton
              onClick={() => setIncentiveOpen(true)}
              sx={{
                mr: 1,
                color: "#fff",
                "&:hover": { color: "#fff", bgcolor: "#e0e0e0" }
              }}
              title="View Incentive Structure"
            >
              <EmojiEventsIcon sx={{ fontSize: "2.2rem" }} />
            </IconButton>

            <IconButton
  ref={leaderboardAnchorRef}
  onClick={() => setLeaderboardOpen(true)}
  sx={{
    mr: 1,
    color: "#fff",
    borderRadius: "50%",
    p: 1.1,
    "&:hover": { bgcolor: "#fff", color: "#e0e0e0" }
  }}
  title="View Leaderboard"
>
  <LeaderboardIcon sx={{ fontSize: "2.1rem" }} />
</IconButton>

<LeaderboardPopover
  open={leaderboardOpen}
  anchorEl={leaderboardAnchorRef.current}
  onClose={() => setLeaderboardOpen(false)}
/>
            <IconButton
              color="error"
              onClick={openBloodTestDialog}
              sx={{ mr: 1, color: "#fff", borderRadius: "50%", p: 1.1, "&:hover": { bgcolor: "#e0e0e0" } }}
              title="Blood Test Pincode Check"
            >
              <Syringe style={{ fontSize: "2.1rem" }} />
            </IconButton>

            {user && (
              <IconButton
                onClick={() => navigate("/my-templates")}
                sx={{ mr: 1, "&:hover": { backgroundColor: "#e0e0e0" } }}
              >
                <StickyNote2Icon sx={{ color: "white" }} />
              </IconButton>
            )}
            <Notifications />
            {user && location.pathname !== "/login" && (
              <IconButton
                color="inherit"
                onClick={toggleCartDrawer(true)}
                sx={{ "&:hover": { backgroundColor: "#e0e0e0" } }}
              >
                <ShoppingCartIcon />
              </IconButton>
            )}
            <Box sx={{ position: "relative", width: 240, ml: 2 }}>
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
                          sx={smallFont}
                        >
                          <ListItemText
                            primary={`${item.name || "No Name"} (${item.contactNumber
                              }) (${item.agentAssigned}) [${item.healthExpertAssigned
                              }]`}
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

      <Dialog open={bloodTestDialog} onClose={closeBloodTestDialog} maxWidth="xs" fullWidth PaperProps={{
        sx: {
          borderRadius: 4,
          p: 0,
          background: "#fff",
          boxShadow: "0 6px 24px 0 rgba(110,49,49,0.12)",
        }
      }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 3, pb: 1 }}>
          <Syringe style={{ fontSize: "2.5rem", color: "#e53935" }} />
          <DialogTitle sx={{ textAlign: "center", pb: 0, fontWeight: 600, fontSize: "1.35rem", letterSpacing: 0.5 }}>
            Blood Test Availability
          </DialogTitle>
        </Box>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, textAlign: "center", color: "#6a6868" }}>
            Enter your pincode to check which labs are available for home blood test collection.
          </Typography>
          <TextField
            fullWidth
            label="Enter Pincode"
            value={pincode}
            onChange={handlePincodeChange}
            variant="outlined"
            margin="normal"
            inputProps={{ maxLength: 6, inputMode: "numeric", pattern: "[0-9]*" }}
            sx={{
              background: "#fafbfc",
              borderRadius: 2,
              "& .MuiOutlinedInput-root": { borderRadius: 2 }
            }}
          />
          <Button
            variant="contained"
            color="error"
            fullWidth
            sx={{ mt: 1, fontWeight: 600, letterSpacing: 0.3, borderRadius: 2 }}
            onClick={checkLabs}
            size="large"
          >
            Check
          </Button>
          <Divider sx={{ my: 2 }} />
          {checkClicked && (
            <Box sx={{ mt: 1, minHeight: 30, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {availableLabs.length === 0 ? (
                <Typography color="error" sx={{ fontWeight: 500 }}>
                  No labs available for this pincode.
                </Typography>
              ) : (
                <>
                  <Typography sx={{ mb: 1, fontWeight: 500, color: "#222" }}>
                    Available Lab{availableLabs.length > 1 ? "s" : ""}:
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5, width: "100%" }}>
                    {availableLabs.map((lab, idx) => (
                      <Grid item xs={6} key={lab}>
                        <Chip
                          label={lab}
                          sx={{
                            width: "100%",
                            bgcolor: lab === "Redcliff" ? "#e3f2fd" : "#e3f2fd",
                            color: lab === "Redcliff" ? "#0351a6" : "#0351a6",
                            fontWeight: 600,
                            fontSize: "1.05rem",
                            px: 2,
                            py: 1,
                            borderRadius: "1rem",
                            justifyContent: "center",
                            display: "flex"
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
        <DialogActions sx={{ pb: 2, justifyContent: "center" }}>
          <Button onClick={closeBloodTestDialog} sx={{ color: "#555", fontWeight: 600, letterSpacing: 0.4 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={incentiveOpen}
        TransitionComponent={SlideDown}
        keepMounted
        onClose={() => setIncentiveOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
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
            fontSize: "1.5rem",
            color: "#222",
            letterSpacing: 0.5,
            pt: 3,
            pb: 1
          }}
        >
          Incentive Structure
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Table sx={{ minWidth: 550 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", fontSize: 15, color: "#000", textAlign: "center" }}>Slab (Monthly Sales)</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: 15, color: "#000", textAlign: "center" }}>Reward Rate</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: 15, color: "#000", textAlign: "center" }}>Monthly Incentive (₹)</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: 15, color: "#000", textAlign: "center" }}>Annual Incentive (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { slab: "3L – 4L", rate: "2%", monthly: "6,000 – 8,000", annual: "72,000 – 96,000" },
                { slab: "4L – 5L", rate: "2.50%", monthly: "10,000 – 12,500", annual: "1,20,000 – 1,50,000" },
                { slab: "5L – 6L", rate: "3%", monthly: "15,000 – 18,000", annual: "1,80,000 – 2,16,000" },
                { slab: "6L – 8L", rate: "3.50%", monthly: "21,000 – 28,000", annual: "2,52,000 – 3,36,000" },
                { slab: "8L – 10L", rate: "4%", monthly: "32,000 – 40,000", annual: "3,84,000 – 4,80,000" },
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
              fontWeight: 600,
              "&:hover": { bgcolor: "#111" }
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


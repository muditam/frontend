import React, { useState } from "react";
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";


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

  const navigate = useNavigate();
  const location = useLocation();


  const user = JSON.parse(sessionStorage.getItem("user"));


  if (location.pathname === "/login") {
    return null;
  }

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


  // Styling for small font and neat spacing
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


          {/* Right side: Icons and LMS Search */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
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


// NavbarWithSearch.jsx
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import axios from "axios";
import MenuBar from "./MenuBar";
import { useNavigate } from "react-router-dom";
import Notifications from "./Notifications";  

const NavbarWithSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);  

  const navigate = useNavigate();

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
        {
          params: { query: value },
        }
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

  const toggleMenu = (open) => () => {
    setMenuOpen(open);
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {/* Menu Icon */}
          <IconButton edge="start" color="inherit" onClick={toggleMenu(true)}>
            <MenuIcon />
          </IconButton>

          {/* Title */}
          <Typography variant="h6" sx={{ ml: 2 }}>
            Muditam
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* Container for Notifications and Search Bar */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {/* Notifications placed to the left of the search bar */}
            <Notifications />

            {/* Search Bar */}
            <Box sx={{ position: "relative", width: 300, ml: 2 }}>
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
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer anchor="left" open={menuOpen} onClose={toggleMenu(false)}>
        <MenuBar toggleDrawer={toggleMenu(false)} />
      </Drawer>
    </>
  );
};

export default NavbarWithSearch;

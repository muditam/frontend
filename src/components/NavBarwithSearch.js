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

const NavbarWithSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // State for the sidebar

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim() === "") {
      setResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await axios.get("https://www.60brands.com/api/search", {
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
                      <ListItem key={item._id} button>
                        <ListItemText
                          primary={`${item.name || "No Name"} (${item.contactNumber})`}
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

      {/* Sidebar Drawer */}
      <Drawer anchor="left" open={menuOpen} onClose={toggleMenu(false)}>
        <MenuBar toggleDrawer={toggleMenu(false)} />
      </Drawer>
    </>
  );
};

export default NavbarWithSearch;

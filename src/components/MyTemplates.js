import React, { useState, useEffect } from "react";
import {
  Container,
  TextField,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Snackbar,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Edit,
  Delete,
  AddCircleOutline,
  ContentCopy,
  Close as CloseIcon,
} from "@mui/icons-material";
import ReplayIcon from "@mui/icons-material/Replay"; // Import the icon

import axios from "axios";
import { motion } from "framer-motion";
import { debounce } from "lodash";

const MyTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("All");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [salesAgents, setSalesAgents] = useState([]);
  const [retentionAgents, setRetentionAgents] = useState([]);

  // Assuming the user object has fullName and role properties.
  const user = JSON.parse(sessionStorage.getItem("user"));

  const [form, setForm] = useState({
    purpose: "",
    templateBody: "",
    language: "English",
    // For Manager, default is blank so that he must choose.
    templateFor: user.role === "Manager" ? "" : user.role === "Sales Agent" ? "Acquisition" : "Retention",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTemplates();
    fetchSalesAgents();
    fetchRetentionAgents();
  }, [search, language, selectedAgent, user.role]);

  // Fetch templates with filtering based on the logged-in user's role.
  const fetchTemplates = debounce(async () => {
    try {
      setLoading(true);
      // Build query parameters
      const params = {
        userRole: user.role,
        createdBy: user.fullName,
        language,
        search,
        selectedAgent,
      };

      if (user.role === "Manager") {
        params.createdBy = selectedAgent || user.fullName;
      }
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/templates", {
        params,
      });
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  }, 500);

  const fetchSalesAgents = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", {
        params: { role: "Sales Agent" },
      });
      const activeAgents = response.data.filter(
        (agent) => agent.status === "active"
      );
      setSalesAgents(activeAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const fetchRetentionAgents = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", {
        params: { role: "Retention Agent" },
      });
      const activeAgents = response.data.filter(
        (agent) => agent.status === "active"
      );
      setRetentionAgents(activeAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const handleSubmit = async () => {
    // For Manager, ensure that "Template for" is selected.
    if (user.role === "Manager" && !form.templateFor) {
      setError("Please select 'Template for' before saving.");
      return;
    }
    try {
      const payload = {
        ...form,
        createdBy: user.fullName,
        createdByRole: user.role,
        // For Sales Agent and Retention Agent, enforce default values.
        templateFor:
          user.role === "Manager"
            ? form.templateFor
            : user.role === "Sales Agent"
            ? "Acquisition"
            : "Retention",
      };

      if (editId) {
        await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/templates/${editId}`, payload);
      } else {
        await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/templates", payload);
      }
      fetchTemplates();
      setDialogOpen(false);
      setEditId(null);
      setError("");
      setForm({
        purpose: "",
        templateBody: "",
        language: "English",
        templateFor: user.role === "Manager" ? "" : user.role === "Sales Agent" ? "Acquisition" : "Retention",
      });
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/templates/${id}`);
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbarOpen(true);
  };

  return (
    <Container maxWidth="md">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography
          variant="h4"
          sx={{
            textAlign: "center",
            my: 3,
            fontWeight: "bold",
            color: "black",
          }}
        >
          My Message Templates
        </Typography>

        {/* Search & Filter Options */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            mb: 3,
            justifyContent: "center",
          }}
        >
          <TextField
            label="Search Templates"
            variant="outlined"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              mb: 2,
              mt: 2,
              "& .MuiInputLabel-root": {
                top: "50%",
                transform: "translateY(-50%)",
                transition: "all 0.2s ease-in-out",
                fontSize: "1rem",
                paddingLeft: "16px",
              },
              "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
                {
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
          {/* Language buttons */}
          <Box sx={{ display: "flex", gap: 1 }}>
            {language && (
              <IconButton
                onClick={() => setLanguage("")}
                sx={{
                  color: "#666",
                  "&:hover": {
                    color: "#000",
                  },
                }}
              >
                <ReplayIcon />
              </IconButton>
            )}

            <Button
              variant={language === "English" ? "contained" : "outlined"}
              onClick={() => setLanguage("English")}
              sx={{
                textTransform: "none",
                border: "2px solid black",
                borderRadius: "8px",
                backgroundColor:
                  language === "English" ? "black" : "transparent",
                color: language === "English" ? "#fff" : "black",
                borderColor: "black",
                "&:hover": {
                  backgroundColor: language === "English" ? "#222" : "#E3E3E3",
                },
              }}
            >
              English
            </Button>

            <Button
              variant={language === "Hindi" ? "contained" : "outlined"}
              onClick={() => setLanguage("Hindi")}
              sx={{
                textTransform: "none",
                borderRadius: "8px",
                border: "2px solid black",
                backgroundColor: language === "Hindi" ? "black" : "transparent",
                color: language === "Hindi" ? "#fff" : "black",
                borderColor: "black",
                "&:hover": {
                  backgroundColor: language === "Hindi" ? "#222" : "#E3E3E3",
                },
              }}
            >
              Hindi
            </Button>
          </Box>

          <Select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            displayEmpty
            sx={{
              minWidth: 200,
              borderRadius: "10px",
              backgroundColor: "#fff",
              "& .MuiSelect-select": {
                paddingLeft: "16px",
              },
              "& .MuiSelect-select.Mui-focused, & .MuiSelect-select.MuiFilled":
                {
                  color: "gray",
                },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "black",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "black",
              },
            }}
          >
            <MenuItem value="">My Templates</MenuItem>

            {user.role === "Manager" &&
              [...salesAgents, ...retentionAgents].map((agent) => (
                <MenuItem key={agent.email} value={agent.fullName}>
                  {agent.fullName}
                </MenuItem>
              ))}

            {user.role === "Sales Agent" &&
              salesAgents.map((agent) => (
                <MenuItem key={agent.email} value={agent.fullName}>
                  {agent.fullName}
                </MenuItem>
              ))}

            {user.role === "Retention Agent" &&
              retentionAgents.map((agent) => (
                <MenuItem key={agent.email} value={agent.fullName}>
                  {agent.fullName}
                </MenuItem>
              ))}
          </Select>

          <motion.div whileHover={{ scale: 1.1 }}>
            <Button
              variant="contained"
              startIcon={<AddCircleOutline />}
              onClick={() => {
                setEditId(null);
                setError("");
                setForm({
                  purpose: "",
                  templateBody: "",
                  language: "English",
                  templateFor: user.role === "Manager" ? "" : user.role === "Sales Agent" ? "Acquisition" : "Retention",
                });
                setDialogOpen(true);
              }}
              sx={{ borderRadius: "10px", px: 3, backgroundColor: "black" }}
            >
              Add Template
            </Button>
          </motion.div>
        </Box>

        {/* Spinner while loading */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress sx={{ color: "black" }} />
          </Box>
        ) : (
          /* Templates Grid */
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {templates.map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template._id}>
                <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
                  <Card
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: 4,
                      borderRadius: 2,
                      overflow: "hidden",
                      background: "linear-gradient(145deg, #ffffff, #f5f5f5)",
                      transition: "0.3s",
                      height: "300px",
                    }}
                  >
                    {/* Heading - Fixed Size */}
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="subtitle1" color="black" sx={{ fontWeight: "bold" }}>
                        {template.purpose}
                      </Typography>
                    </CardContent>

                    {/* Scrollable Content */}
                    <Box
                      sx={{
                        flexGrow: 1,
                        overflowY: "auto",
                        px: 2,
                        scrollbarWidth: "none",
                        "&::-webkit-scrollbar": { display: "none" },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: "gray",
                          display: "-webkit-box",
                          WebkitLineClamp: "unset",
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {template.templateBody}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 1,
                        ml: "2px",
                        fontStyle: "italic",
                        color: "#B0B0B0",
                      }}
                    >
                      Language: {template.language}
                      {user?.role === "Manager" && template.templateFor && (
                        <> | For: {template.templateFor}</>
                      )}
                    </Typography>

                    {/* Bottom Buttons - Fixed Size */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        p: "2px",
                        backgroundColor: "#f5f5f5",
                        borderTop: "1px solid black",
                      }}
                    >
                      <Tooltip title="Copy">
                        <IconButton onClick={() => handleCopy(template.templateBody)}>
                          <ContentCopy color="secondary" sx={{ fontSize: "20px" }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={() => {
                            setEditId(template._id);
                            setForm(template);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit color="primary" sx={{ fontSize: "20px" }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(template._id)}>
                          <Delete color="error" sx={{ fontSize: "20px" }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Dialog for Add/Edit Template */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle
            sx={{
              fontWeight: "bold",
              textAlign: "center",
              position: "relative",
            }}
          >
            {editId ? "Edit" : "Add"} Template
            <IconButton onClick={() => setDialogOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <TextField
              label="Purpose"
              fullWidth
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              sx={{
                mb: 2,
                mt: 2,
                "& .MuiInputLabel-root": {
                  top: "50%",
                  transform: "translateY(-50%)",
                  transition: "all 0.2s ease-in-out",
                  fontSize: "1rem",
                  paddingLeft: "16px",
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
            <TextField
              label="Template Body"
              fullWidth
              multiline
              rows={3}
              value={form.templateBody}
              onChange={(e) => setForm({ ...form, templateBody: e.target.value })}
              sx={{
                mb: 2,
                mt: 2,
                "& .MuiInputLabel-root": {
                  top: "50%",
                  transform: "translateY(-50%)",
                  transition: "all 0.2s ease-in-out",
                  fontSize: "1rem",
                  paddingLeft: "16px",
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
            <Select
              fullWidth
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              sx={{
                mb: 2,
                backgroundColor: "#fff",
                borderRadius: "10px",
                "& .MuiSelect-select": {
                  paddingLeft: "16px",
                },
                "& .MuiSelect-select.Mui-focused, & .MuiSelect-select.MuiFilled": {
                  color: "gray",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "black",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "black",
                },
              }}
            >
              <MenuItem value="English">🇬🇧 English</MenuItem>
              <MenuItem value="Hindi">🇮🇳 Hindi</MenuItem>
            </Select>
            {/* Render "Template for" dropdown only for Managers */}
            {user.role === "Manager" && (
              <Select
                fullWidth
                value={form.templateFor}
                onChange={(e) => setForm({ ...form, templateFor: e.target.value })}
                displayEmpty
                sx={{
                  mb: 2,
                  backgroundColor: "#fff",
                  borderRadius: "10px",
                  "& .MuiSelect-select": {
                    paddingLeft: "16px",
                  },
                  "& .MuiSelect-select.Mui-focused, & .MuiSelect-select.MuiFilled": {
                    color: "gray",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "black",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "black",
                  },
                }}
              >
                <MenuItem value="" disabled>
                  Select Template For
                </MenuItem>
                <MenuItem value="Acquisition">Acquisition</MenuItem>
                <MenuItem value="Retention">Retention</MenuItem>
              </Select>
            )}
            {error && (
              <Box sx={{ mb: 2 }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
            <Button variant="contained" onClick={handleSubmit} sx={{ backgroundColor: "black" }}>
              {editId ? "Update" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2000}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert severity="success">Copied to Clipboard!</Alert>
        </Snackbar>
      </motion.div>
    </Container>
  );
};

export default MyTemplates;

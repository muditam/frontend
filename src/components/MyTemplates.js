import React, { useState, useEffect } from "react";
import { 
  Container, TextField, Card, CardContent, Typography, Grid,
  Button, Select, MenuItem, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, Snackbar, Box, Alert,
} from "@mui/material";
import { Edit, Delete, AddCircleOutline, ContentCopy, Close as CloseIcon } from "@mui/icons-material";
import axios from "axios";
import { motion } from "framer-motion";
import { debounce } from "lodash";

const MyTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("All");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState({ purpose: "", templateBody: "", language: "English" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const user = JSON.parse(sessionStorage.getItem("user"));
  
  useEffect(() => {
    fetchTemplates();
    fetchAgents();
  }, [search, language, selectedAgent]);

  const fetchTemplates = debounce(async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/templates", {
        params: { createdBy: selectedAgent || user.fullName, language, search },
      });
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  }, 500);
  
  const fetchAgents = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", { params: { role: "Retention Agent" } });
      setAgents(response.data);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editId) {
        await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/templates/${editId}`, form);
      } else {
        await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/templates", { ...form, createdBy: user.fullName });
      }
      fetchTemplates();
      setDialogOpen(false);
      setEditId(null);
      setForm({ purpose: "", templateBody: "", language: "English" });
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
          sx={{ textAlign: "center", my: 3, fontWeight: "bold", color: "#007BFF" }}
        >
          💡 My Message Templates
        </Typography>

        {/* Search & Filter Options */}
        <Box 
          sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3, justifyContent: "center" }}
        >
          <TextField 
            label="🔍 Search Templates" 
            variant="outlined" 
            fullWidth 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            sx={{ borderRadius: "10px", backgroundColor: "#fff" }}
          />
          <Select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)} 
            sx={{ minWidth: 150, borderRadius: "10px", backgroundColor: "#fff" }}
          >
            <MenuItem value="All">🌍 All Languages</MenuItem>
            <MenuItem value="English">🇬🇧 English</MenuItem>
            <MenuItem value="Hindi">🇮🇳 Hindi</MenuItem>
          </Select>
          <Select 
            value={selectedAgent} 
            onChange={(e) => setSelectedAgent(e.target.value)} 
            displayEmpty 
            sx={{ minWidth: 200, borderRadius: "10px", backgroundColor: "#fff" }}
          >
            <MenuItem value="">🙋‍♂️ My Templates</MenuItem>
            {agents.map((agent) => (
              <MenuItem key={agent.email} value={agent.fullName}>
                {agent.fullName}
              </MenuItem>
            ))}
          </Select>
          <motion.div whileHover={{ scale: 1.1 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddCircleOutline />} 
              onClick={() => {
                setEditId(null);
                setForm({ purpose: "", templateBody: "", language: "English" });
                setDialogOpen(true);
              }}
              sx={{ borderRadius: "10px", px: 3 }}
            >
              ➕ Add Template
            </Button>
          </motion.div>
        </Box>

        {/* Templates Grid */}
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template._id}>
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                transition={{ duration: 0.3 }}
              >
                <Card 
                  sx={{ 
                    boxShadow: 4, 
                    borderRadius: 4, 
                    overflow: "hidden", 
                    background: "linear-gradient(145deg, #ffffff, #f5f5f5)", 
                    transition: "0.3s"
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: "bold" }}>
                      {template.purpose}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "gray", mt: 1 }}>
                      {template.templateBody}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                      Language: {template.language}
                    </Typography>
                  </CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", p: 1, backgroundColor: "#f5f5f5" }}>
                    <Tooltip title="Copy">
                      <IconButton onClick={() => handleCopy(template.templateBody)}>
                        <ContentCopy color="secondary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        onClick={() => { setEditId(template._id); setForm(template); setDialogOpen(true); }}
                      >
                        <Edit color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDelete(template._id)}>
                        <Delete color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Dialog for Add/Edit Template */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle sx={{ fontWeight: "bold", textAlign: "center", position: "relative" }}>
            {editId ? "✏️ Edit" : "🆕 Add"} Template
            <IconButton 
              onClick={() => setDialogOpen(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <TextField 
              label="Purpose" 
              fullWidth 
              value={form.purpose} 
              onChange={(e) => setForm({ ...form, purpose: e.target.value })} 
              sx={{ mb: 2 }}
            />
            <TextField 
              label="Template Body" 
              fullWidth 
              multiline 
              rows={3} 
              value={form.templateBody} 
              onChange={(e) => setForm({ ...form, templateBody: e.target.value })} 
              sx={{ mb: 2 }}
            />
            <Select
              fullWidth
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              sx={{ mb: 2, backgroundColor: "#fff", borderRadius: "10px" }}
            >
              <MenuItem value="English">🇬🇧 English</MenuItem>
              <MenuItem value="Hindi">🇮🇳 Hindi</MenuItem>
            </Select>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
            <Button variant="contained" onClick={handleSubmit}>
              {editId ? "💾 Update" : "✔️ Save"}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbarOpen} autoHideDuration={2000} onClose={() => setSnackbarOpen(false)}>
          <Alert severity="success">Copied to Clipboard!</Alert>
        </Snackbar>

      </motion.div>
    </Container>
  );
};

export default MyTemplates;

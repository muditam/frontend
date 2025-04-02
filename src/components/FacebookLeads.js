import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Grid,
  Snackbar,
  Alert,
  LinearProgress,
  Box,
  Card,
  Drawer,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Update as UpdateIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const FacebookLeads = () => {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });
 
  const fetchLeads = async () => {
    try {
      setLoading(true);
      // Fetch from local backend endpoint
      const response = await axios.get('http://localhost:5000/api/facebook/leads', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter === 'all' ? null : statusFilter
        }
      });
      if (response.data.leads.length === 0) {
        // No local leads found, so fetch directly from Meta
        setSuccess('No local leads found. Fetching directly from Meta.');
        const metaResponse = await axios.get('http://localhost:5000/api/facebook/leads/meta');
        setLeads(metaResponse.data.leads);
        setPagination(prev => ({
          ...prev,
          total: metaResponse.data.total
        }));
      } else {
        setLeads(response.data.leads);
        setPagination(prev => ({
          ...prev,
          total: response.data.total
        }));
      }
    } catch (err) {
      setError('Failed to fetch leads');
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [pagination.page, statusFilter]);

  // Status color mapping for table cells
  const getStatusColor = (status) => {
    const colors = {
      new: '#f0f4c3',
      contacted: '#b3e5fc',
      qualified: '#c8e6c9',
      converted: '#dcedc8'
    };
    return colors[status] || '';
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Dummy functions for updating status, adding notes, and deleting leads
  const handleStatusUpdate = async (newStatus) => {
    if (!selectedLead) return;
    try {
      await axios.put(`http://localhost:5000/api/facebook/leads/${selectedLead._id}`, {
        status: newStatus
      });
      setLeads(prev =>
        prev.map(lead =>
          lead._id === selectedLead._id ? { ...lead, status: newStatus } : lead
        )
      );
      setSuccess('Status updated successfully');
      setSelectedLead(null);
    } catch (err) {
      setError('Failed to update status');
      console.error('Error updating status:', err);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead) return;
    try {
      await axios.put(`http://localhost:5000/api/facebook/leads/${selectedLead._id}`, {
        notes: [...(selectedLead.notes || []), newNote]
      });
      setLeads(prev =>
        prev.map(lead =>
          lead._id === selectedLead._id
            ? { ...lead, notes: [...(lead.notes || []), newNote] }
            : lead
        )
      );
      setSelectedLead(prev => ({
        ...prev,
        notes: [...(prev.notes || []), newNote]
      }));
      setNewNote('');
      setSuccess('Note added successfully');
    } catch (err) {
      setError('Failed to add note');
      console.error('Error adding note:', err);
    }
  };

  const handleDeleteLead = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/facebook/leads/${leadToDelete._id}`);
      setLeads(prev => prev.filter(lead => lead._id !== leadToDelete._id));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      setSuccess('Lead deleted successfully');
      setConfirmOpen(false);
      setLeadToDelete(null);
    } catch (err) {
      setError('Failed to delete lead');
      console.error('Error deleting lead:', err);
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      {/* Notifications */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this lead?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteLead} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Header and Filters */}
      <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="h4" gutterBottom>
            Facebook Leads
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  label="Filter by Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="contacted">Contacted</MenuItem>
                  <MenuItem value="qualified">Qualified</MenuItem>
                  <MenuItem value="converted">Converted</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchLeads}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Leads Table */}
      {loading ? (
        <LinearProgress sx={{ mt: 4 }} />
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Campaign</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead._id || lead.id}
                    hover
                    onClick={() => setSelectedLead(lead)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                        {lead.name || 'N/A'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexDirection="column">
                        <Box display="flex" alignItems="center">
                          <EmailIcon fontSize="small" sx={{ mr: 1 }} />
                          {lead.email || 'N/A'}
                        </Box>
                        <Box display="flex" alignItems="center" mt={1}>
                          <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
                          {lead.phone || 'N/A'}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexDirection="column">
                        <Chip 
                          label={`Ad: ${lead.ad_id || 'N/A'}`} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`Form: ${lead.form_id || 'N/A'}`} 
                          size="small" 
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={lead.status || 'new'}
                        sx={{
                          backgroundColor: getStatusColor(lead.status),
                          textTransform: 'capitalize',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {lead.timestamp
                        ? new Date(lead.timestamp).toLocaleString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                        }}
                      >
                        <UpdateIcon />
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeadToDelete(lead);
                          setConfirmOpen(true);
                        }}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box display="flex" justifyContent="center" mt={3}>
            <Button
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              sx={{ mr: 2 }}
            >
              Previous
            </Button>
            <Typography variant="body1" sx={{ mx: 2, alignSelf: 'center' }}>
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </Typography>
            <Button
              disabled={pagination.page * pagination.limit >= pagination.total}
              onClick={() => handlePageChange(pagination.page + 1)}
              sx={{ ml: 2 }}
            >
              Next
            </Button>
          </Box>
        </>
      )}

      {/* Lead Details Drawer */}
      <Drawer
        anchor="right"
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, p: 3 } }}
      >
        {selectedLead && (
          <Box>
            <Box display="flex" justifyContent="space-between" mb={3}>
              <Typography variant="h6">{selectedLead.name || 'N/A'}</Typography>
              <IconButton onClick={() => setSelectedLead(null)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Card elevation={0} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Lead Details
              </Typography>
              <Box mb={2}>
                <Typography variant="body2">
                  <strong>Email:</strong> {selectedLead.email || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Phone:</strong> {selectedLead.phone || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Ad ID:</strong> {selectedLead.ad_id || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Form ID:</strong> {selectedLead.form_id || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Received:</strong>{' '}
                  {selectedLead.timestamp
                    ? new Date(selectedLead.timestamp).toLocaleString()
                    : 'N/A'}
                </Typography>
              </Box>
            </Card>

            <Card elevation={0} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Update Status
              </Typography>
              <Grid container spacing={1}>
                {['contacted', 'qualified', 'converted'].map((status) => (
                  <Grid item xs={12} key={status}>
                    <Button
                      fullWidth
                      variant={
                        selectedLead.status === status ? 'contained' : 'outlined'
                      }
                      onClick={() => handleStatusUpdate(status)}
                      color={status === 'converted' ? 'success' : 'primary'}
                      disabled={selectedLead.status === status}
                    >
                      Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Card>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Add Note
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your notes here..."
              />
              <Box mt={1} display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  Add Note
                </Button>
              </Box>
            </Box>

            {selectedLead.notes && selectedLead.notes.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Notes History
                </Typography>
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {selectedLead.notes.map((note, index) => (
                    <Card key={index} elevation={0} sx={{ p: 2, mb: 1 }}>
                      <Typography variant="body2">{note}</Typography>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Drawer>
    </Container>
  );
};

export default FacebookLeads;

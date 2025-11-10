// src/components/Finance/PaymentRecords.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow, 
  TablePagination,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Autocomplete,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';


const API_BASE_URL = 'https://muditamleads-14f32a10d7f7.herokuapp.com';


const PaymentRecords = () => {
  const [records, setRecords] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [editingCell, setEditingCell] = useState({ recordId: null, field: null });
  const originalValues = useRef({});


  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [total, setTotal] = useState(0);
 


  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');


  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' // 'success' | 'error' | 'warning' | 'info'
  });


  useEffect(() => {
    fetchVendors();
  }, []);


  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);


  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };


  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar({ ...snackbar, open: false });
  };


  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/vendors`, {
        params: { page: 1, limit: 1000 }
      });


      const list = Array.isArray(res.data)
        ? res.data
        : res.data.vendors || [];


      setVendors(list || []);
    } catch (e) {
      console.error('Error fetching vendors:', e);
      setVendors([]);
      showSnackbar('Failed to fetch vendors', 'error');
    }
  };


  const fetchRecords = async () => {
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage
      };


      const res = await axios.get(`${API_BASE_URL}/api/payment-records`, { params });


      if (Array.isArray(res.data)) {
        setRecords(res.data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
        setTotal(res.data.length);
      } else if (res.data.records) {
        setRecords(res.data.records);
        setTotal(res.data.total || res.data.records.length);
      } else {
        setRecords([]);
        setTotal(0);
      }
    } catch (e) {
      console.error('Fetch error (payment-records):', e);
      setRecords([]);
      setTotal(0);
      showSnackbar('Failed to fetch payment records', 'error');
    }
  };


  const handleAddRow = async () => {
    const newRecord = {
      date: '',
      vendorName: '',
      amountPaid: '',
      amountDue: '',
      screenshot: ''
    };


    try {
      await axios.post(`${API_BASE_URL}/api/payment-records`, newRecord);
      setPage(0);
      fetchRecords();
      showSnackbar('Payment record created successfully', 'success');
    } catch (e) {
      console.error('Create payment record error:', e);
      showSnackbar('Error creating payment record', 'error');
    }
  };


  const handleFieldChange = (id, field, value) => {
    if (!originalValues.current[`${id}-${field}`]) {
      const record = records.find(r => r._id === id);
      if (record) {
        originalValues.current[`${id}-${field}`] = record[field];
      }
    }


    setEditingCell({ recordId: id, field });


    setRecords(prev =>
      prev.map(r => (r._id === id ? { ...r, [field]: value } : r))
    );
  };


  const handleFieldBlur = async (recordId, field, value) => {
    setEditingCell({ recordId: null, field: null });


    if (recordId.toString().startsWith('temp-')) {
      delete originalValues.current[`${recordId}-${field}`];
      return;
    }


    const originalValue = originalValues.current[`${recordId}-${field}`];
    delete originalValues.current[`${recordId}-${field}`];


    if (originalValue === value) return;


    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/payment-records/${recordId}`,
        { [field]: value }
      );


      const updated = res.data;


      setRecords(prev =>
        prev.map(r => (r._id === recordId ? updated : r))
      );
      showSnackbar('Payment record updated successfully', 'success');
    } catch (e) {
      console.error('Save failed (payment-record):', e);
      showSnackbar('Failed to save changes', 'error');
      setRecords(prev =>
        prev.map(r => (r._id === recordId ? { ...r, [field]: originalValue } : r))
      );
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment record?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/payment-records/${id}`);
      fetchRecords();
      showSnackbar('Payment record deleted successfully', 'success');
    } catch (e) {
      console.error('Delete payment record error:', e);
      showSnackbar('Error deleting payment record', 'error');
    }
  };


  const handleFileUpload = async (id, file) => {
    if (!file) return;


    const formData = new FormData();
    formData.append('file', file);
    formData.append('recordId', id);
    formData.append('field', 'screenshot');


    try {
      const res = await axios.post(`${API_BASE_URL}/api/uploadToWasabi`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });


      const fileUrl = res.data.fileUrl || res.data.url;
      if (!fileUrl) throw new Error('No file URL returned from server');


      setRecords(prev =>
        prev.map(r => (r._id === id ? { ...r, screenshot: fileUrl } : r))
      );
      showSnackbar('Screenshot uploaded successfully', 'success');
    } catch (e) {
      console.error('Upload screenshot error:', e.response?.data || e.message);
      showSnackbar(`Upload failed: ${e.response?.data?.details || e.message}`, 'error');
    }
  };


  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageDialogOpen(true);
  };


  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setSelectedImage('');
  };


  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };


  // ---------- STYLES ----------
  const headerCellSx = {
    backgroundColor: '#111827',
    color: '#f9fafb',
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: 'nowrap',
    padding: '8px 10px',
    borderBottom: '1px solid #e5e7eb'
  };


  const inputBorderSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: '#d4d4d4' },
      '&:hover fieldset': { borderColor: '#000' },
      '&.Mui-focused fieldset': { borderColor: '#000' },
    },
    '& .MuiInputBase-input, & .MuiSelect-select': {
      paddingTop: 0.4,
      paddingBottom: 0.4,
      fontSize: 13
    }
  };


  const numberNoSpinnerSx = {
    ...inputBorderSx,
    '& input[type=number]': {
      MozAppearance: 'textfield',
    },
    '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
  };


  const renderCell = (record, field) => {
    const isEditing =
      editingCell.recordId === record._id &&
      editingCell.field === field;


    switch (field) {
      case 'date':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              type="date"
              size="small"
              value={
                record.date
                  ? record.date.toString().split('T')[0]
                  : ''
              }
              onChange={(e) =>
                handleFieldChange(record._id, 'date', e.target.value)
              }
              onBlur={(e) =>
                handleFieldBlur(record._id, 'date', e.target.value)
              }
              onFocus={() =>
                setEditingCell({ recordId: record._id, field: 'date' })
              }
              fullWidth
              sx={{
                minWidth: 140,
                ...inputBorderSx,
                backgroundColor: isEditing ? '#fffef0' : 'transparent'
              }}
            />
          </Box>
        );


      case 'vendorName':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Autocomplete
              freeSolo
              options={Array.isArray(vendors) ? vendors.map((v) => v.name) : []}
              value={record.vendorName || ''}
              onChange={(e, newValue) => {
                handleFieldChange(
                  record._id,
                  'vendorName',
                  newValue || ''
                );
                handleFieldBlur(
                  record._id,
                  'vendorName',
                  newValue || ''
                );
              }}
              onInputChange={(e, newValue) => {
                handleFieldChange(record._id, 'vendorName', newValue);
              }}
              onBlur={(e) =>
                handleFieldBlur(
                  record._id,
                  'vendorName',
                  e.target.value
                )
              }
              onFocus={() =>
                setEditingCell({ recordId: record._id, field: 'vendorName' })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Select or type vendor..."
                  sx={{
                    minWidth: 220,
                    ...inputBorderSx,
                    backgroundColor: isEditing ? '#fffef0' : 'transparent',
                    '& .MuiOutlinedInput-root': {
                      padding: '2px 8px'
                    }
                  }}
                />
              )}
              sx={{ width: '100%' }}
            />
          </Box>
        );


      case 'amountPaid':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              type="number"
              size="small"
              value={record.amountPaid || ''}
              onChange={(e) =>
                handleFieldChange(record._id, 'amountPaid', e.target.value)
              }
              onBlur={(e) =>
                handleFieldBlur(record._id, 'amountPaid', e.target.value)
              }
              onFocus={() =>
                setEditingCell({ recordId: record._id, field: 'amountPaid' })
              }
              fullWidth
              sx={{
                minWidth: 120,
                ...numberNoSpinnerSx,
                backgroundColor: isEditing ? '#fffef0' : 'transparent'
              }}
            />
          </Box>
        );


      case 'amountDue':
        return (
          <Typography sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            {record.amountDue ?? ''}
          </Typography>
        );


      case 'screenshot':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              id={`screenshot-upload-${record._id}`}
              type="file"
              onChange={(e) =>
                handleFileUpload(record._id, e.target.files[0])
              }
            />
            <label htmlFor={`screenshot-upload-${record._id}`}>
              <Button
                variant="contained"
                component="span"
                size="small"
                startIcon={<UploadIcon />}
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#111' }
                }}
              >
                Upload
              </Button>
            </label>
            {record.screenshot && (
              <Box
                component="img"
                src={record.screenshot}
                alt="Payment Screenshot"
                onClick={() => handleImageClick(record.screenshot)}
                sx={{
                  width: 50,
                  height: 50,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: '1px solid #ccc',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    transition: 'all .2s'
                  }
                }}
              />
            )}
          </Box>
        );


      default:
        return null;
    }
  };


  const columns = [
    { field: 'date', label: 'Date' },
    { field: 'vendorName', label: 'Vendor Name' },
    { field: 'amountPaid', label: 'Amount Paid' },
    { field: 'amountDue', label: 'Amount Due' },
    { field: 'screenshot', label: 'Screenshot' }
  ];


  return (
    <Box
      sx={{
        px: 2.5,
        pt: 1.5,
        pb: 2.5,
        backgroundColor: '#f3f4f6',
        minHeight: '100vh'
      }}
    >
      <Paper
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
          px: 2.4,
          py: 1.6,
          borderRadius: 2,
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: '#111827', letterSpacing: '.25px' }}
          >
            Payment Records
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 0.3, color: '#6b7280' }}
          >
          </Typography>
        </Box>


        <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRow}
            sx={{
              px: 2.6,
              py: 1,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              borderRadius: '999px',
              backgroundColor: '#000',
              color: '#fff',
              boxShadow: '0 2px 10px rgba(0,0,0,.18)',
              '&:hover': { backgroundColor: '#111' }
            }}
          >
            Add Payment
          </Button>
        </Box>
      </Paper>


      <Box
        sx={{
          mt: 1,
          borderRadius: 2,
          border: '1px solid #e5e7eb',
          boxShadow: '0 6px 16px rgba(0,0,0,0.05)',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <TableContainer
          sx={{
            maxHeight: 'calc(100vh - 250px)',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Actions</TableCell>
                <TableCell sx={headerCellSx}>S.No.</TableCell>
                {columns.map(col => (
                  <TableCell key={col.field} sx={headerCellSx}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>


            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 2} align="center" sx={{ py: 5 }}>
                    <Typography variant="body1" color="text.secondary">
                      No payment records yet. Click "Add Payment" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record, index) => (
                  <TableRow
                    key={record._id}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                      '&:hover': { backgroundColor: '#f3f4f6' }
                    }}
                  >
                    <TableCell sx={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(record._id)}
                        size="small"
                        sx={{ '&:hover': { backgroundColor: 'rgba(211,47,47,.08)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ padding: '6px 8px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {page * rowsPerPage + index + 1}
                    </TableCell>
                    {columns.map(col => (
                      <TableCell
                        key={col.field}
                        sx={{ padding: '6px 8px', whiteSpace: 'nowrap' }}
                      >
                        {renderCell(record, col.field)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>


        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{
            borderTop: '1px solid #e5e7eb',
            '& .MuiTablePagination-toolbar': {
              justifyContent: 'flex-end',
              minHeight: 40,
              color: '#111',
            },
            '& .MuiTablePagination-spacer': {
              flex: '0 0 0',
            },
            '& .MuiIconButton-root': {
              color: '#000',
              '&:hover': { backgroundColor: 'rgba(0,0,0,.05)' }
            },
            '& .MuiTablePagination-select': {
              color: '#000'
            }
          }}
        />
      </Box>


      <Dialog open={imageDialogOpen} onClose={handleCloseImageDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Payment Screenshot
          <IconButton onClick={handleCloseImageDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, textAlign: 'center' }}>
          <Box
            component="img"
            src={selectedImage}
            alt="Payment Screenshot"
            sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        </DialogContent>
      </Dialog>


      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};


export default PaymentRecords;




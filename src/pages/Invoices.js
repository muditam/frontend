import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Select,
  MenuItem,
  FormControl,
  LinearProgress,
  IconButton, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Tooltip,
  TableFooter,
  TablePagination,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import axios from 'axios';


const API = 'https://muditamleads-14f32a10d7f7.herokuapp.com';


const Invoices = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('pending'); // 🔹 status state for dialog
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: '' });
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewSrc, setImagePreviewSrc] = useState(null);
  const [imagePreviewName, setImagePreviewName] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);


  // ------------- helpers -------------
  const getStoredUser = () => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  };


  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/api/invoices`, {
        withCredentials: true,
        headers: { 'x-user-json': sessionStorage.getItem('user') }, // dev only
      });


      const safeRows = Array.isArray(data)
        ? data.map((d) => ({
            ...d,
            id: d.id || d._id, // 🔹 normalize id
          }))
        : [];


      setRows(safeRows);
    } catch (e) {
      console.error('Load invoices failed', e.response?.data || e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadInvoices();
  }, []);


  const handleUpload = async () => {
    if (!companyName.trim() || !amount || !file) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', file);


      const up = await axios.post(`${API}/api/invoices/upload`, form, {
        withCredentials: true,
        headers: { 'x-user-json': sessionStorage.getItem('user') },
      });


      await axios.post(
        `${API}/api/invoices`,
        {
          companyName: companyName.trim(),
          amount: Number(amount),
          fileUrl: up.data.fileUrl,
          originalFilename: file.name,
          status, // 🔹 send status from dialog
        },
        {
          withCredentials: true,
          headers: { 'x-user-json': sessionStorage.getItem('user') },
        }
      );


      setOpen(false);
      setCompanyName('');
      setAmount('');
      setFile(null);
      setStatus('pending'); // 🔹 reset for next add
      setToast({ open: true, msg: 'Invoice saved successfully' });
      loadInvoices();
    } catch (e) {
      console.error('Upload failed:', e.response?.data || e.message);
    } finally {
      setUploading(false);
    }
  };


  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(
        `${API}/api/invoices/${id}/status`,
        { status: newStatus },
        {
          withCredentials: true,
          headers: { 'x-user-json': sessionStorage.getItem('user') },
        }
      );


      setRows((prev) =>
        prev.map((r) =>
          (r.id || r._id) === id ? { ...r, status: newStatus } : r
        )
      );
    } catch (e) {
      console.error('Status update failed', e.response?.data || e.message);
    }
  };


  const handleToastClose = (_e, reason) => {
    if (reason === 'clickaway') return;
    setToast((t) => ({ ...t, open: false }));
  };


  const isImage = (url) => /\.(png|jpe?g|gif|webp)$/i.test(url || '');
  const isPdf = (url) => /\.pdf$/i.test(url || '');


  const fileNameFrom = (url, originalName) => {
    if (originalName) return originalName;
    try {
      const u = new URL(url, API);
      const p = u.pathname || '';
      const name = decodeURIComponent(p.substring(p.lastIndexOf('/') + 1));
      return name || 'file.pdf';
    } catch {
      return originalName || 'file.pdf';
    }
  };


  const openImageDialog = (src, name) => {
    setImagePreviewSrc(src);
    setImagePreviewName(name || 'Image');
    setImagePreviewOpen(true);
  };


  const closeImageDialog = () => {
    setImagePreviewOpen(false);
    setImagePreviewSrc(null);
    setImagePreviewName(null);
  };


  const pagedRows =
    rowsPerPage > 0
      ? rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      : rows;


  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };


  const currentUser = getStoredUser();
  const isFinanceUser =
    currentUser?.role && currentUser.role.toLowerCase() === 'finance';


  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Invoices
        </Typography>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => setOpen(true)}
        >
          Add Invoice
        </Button>
      </Box>


      {/* Add Invoice Dialog */}
      <Dialog
        open={open}
        onClose={() => !uploading && setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Invoice</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 1,
            }}
          >
            <TextField
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              fullWidth
            />


            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
            />


            {/* 🔹 Status dropdown inside dialog */}
            <FormControl fullWidth size="small">
              <Typography
                sx={{ mb: 0.5, fontSize: 12, fontWeight: 600 }}
              >
                Status
              </Typography>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="clear">Clear</MenuItem>
              </Select>
            </FormControl>


            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              uploading ||
              !companyName.trim() ||
              !amount ||
              !file
            }
            variant="contained"
          >
            {uploading ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Table */}
      <Paper sx={{ p: 0 }}>
        {loading && <LinearProgress />}
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  bgcolor: '#f8fafc',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: 12,
                  borderBottom: '2px solid #cbd5e1',
                },
              }}
            >
              <TableCell sx={{ width: 70 }}>S.No.</TableCell>
              <TableCell>Company Name</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Upload</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>


          <TableBody>
            {pagedRows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No invoices found
                </TableCell>
              </TableRow>
            )}


            {pagedRows.map((r, idx) => {
              const serial = page * rowsPerPage + idx + 1;
              const fileUrl = r.fileUrl;
              const originalName = r.originalFilename || 'file';
              const displayUrl = /^https?:\/\//i.test(fileUrl)
                ? fileUrl
                : `${API}${fileUrl}`;
              const invoiceId = r.id || r._id;
              const statusValue = r.status || 'pending';


              return (
                <TableRow key={invoiceId} hover>
                  <TableCell>{serial}</TableCell>
                  <TableCell>{r.companyName || '-'}</TableCell>
                  <TableCell>{r.amount ?? '-'}</TableCell>


                  {/* File / Image / PDF cell */}
                  <TableCell>
                    {!fileUrl ? (
                      '-'
                    ) : isImage(fileUrl) ? (
                      <Box
                        component="img"
                        src={displayUrl}
                        alt={originalName}
                        onClick={() =>
                          openImageDialog(displayUrl, originalName)
                        }
                        sx={{
                          width: 44,
                          height: 44,
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 0 0 2px #fff',
                        }}
                      />
                    ) : isPdf(fileUrl) ? (
                      (() => {
                        const fname = fileNameFrom(
                          fileUrl,
                          originalName
                        );
                        return (
                          <Tooltip title={fname}>
                            <Button
                              component="a"
                              href={displayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={
                                <PictureAsPdfOutlinedIcon fontSize="small" />
                              }
                              endIcon={
                                <OpenInNewIcon fontSize="small" />
                              }
                              sx={{
                                textTransform: 'none',
                                maxWidth: 260,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                fontWeight: 500,
                              }}
                            >
                              {fname}
                            </Button>
                          </Tooltip>
                        );
                      })()
                    ) : (
                      <IconButton
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        title="Open file"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>


                  {/* Status cell */}
                  <TableCell>
                    {isFinanceUser ? (
                      <FormControl size="small">
                        <Select
                          value={statusValue}
                          onChange={(e) =>
                            updateStatus(invoiceId, e.target.value)
                          }
                          sx={{ minWidth: 110 }}
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="clear">Clear</MenuItem>
                        </Select>
                      </FormControl>
                    ) : (
                      statusValue
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>


          <TableFooter>
            <TableRow>
              <TablePagination
                rowsPerPageOptions={[
                  5,
                  10,
                  20,
                  50,
                  { label: 'All', value: -1 },
                ]}
                colSpan={5}
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{
                  borderTop: '1px solid #e2e8f0',
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
                    {
                      fontSize: 12,
                    },
                }}
              />
            </TableRow>
          </TableFooter>
        </Table>
      </Paper>


      {/* Success snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleToastClose}
          severity="success"
          variant="filled"
        >
          {toast.msg || 'Saved successfully'}
        </Alert>
      </Snackbar>


      {/* Image preview dialog */}
      <Dialog
        open={imagePreviewOpen}
        onClose={closeImageDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {imagePreviewName}
          <IconButton onClick={closeImageDialog} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ textAlign: 'center', bgcolor: '#0f172a' }}
        >
          {imagePreviewSrc && (
            <Box
              component="img"
              src={imagePreviewSrc}
              alt={imagePreviewName}
              sx={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 1,
                boxShadow: '0 0 0 2px rgba(255,255,255,0.08)',
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImageDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


export default Invoices;




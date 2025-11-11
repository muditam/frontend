// PurchaseRecord.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  Box,
  Button,
  TableRow,
  Paper,
  IconButton,
  TextField,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem,
  Select,
  FormControl,
  Typography,
  Autocomplete,
  Switch,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import axios from 'axios';


const API_BASE_URL = 'https://muditamleads-14f32a10d7f7.herokuapp.com';


const PurchaseRecord = () => {
  const [records, setRecords] = useState([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [total, setTotal] = useState(0);


  const [showDeleted, setShowDeleted] = useState(false);


  const [vendors, setVendors] = useState([]);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);


  // 🔹 default GST ON
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    hasGST: true,
    gstNumber: '',
  });


  const bulkInputRef = useRef(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });


  const [editingCell, setEditingCell] = useState({
    recordId: null,
    field: null,
  });
  const originalValues = useRef({});


  const [filters, setFilters] = useState({
    category: '',
    billingGst: '',
    vendorSearch: '',
  });


  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });


  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };


  const handleSnackbarClose = (_event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };


  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchaseFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        const { paymentStatus, ...rest } = parsed;
        setFilters((prev) => ({ ...prev, ...rest }));
      }
    } catch (e) {
      console.error('Failed to load filters from storage', e);
    }
  }, []);


  const categories = Array.from(
    new Set([
      'Advertisement',
      'Assets',
      'Assets (Intangible)',
      'Bank Charges',
      'COGS',
      'Commision',
      'Freight Inwards',
      'Marketing',
      'Operating Expense',
      'Packaging Material',
      'Professional Charges',
      'Services',
      'Software & Tools',
      'Travel Expense',
      'Freight Outwards',
      'Stock transfer',
      'Other',
    ])
  );


  const invoiceTypes = ['Credit Note', 'Tax Invoice', 'Debit Note'];


  const gstLocations = [
    'Himachal Pradesh',
    'Delhi',
    'Maharashtra',
    'Tamil Nadu',
    'Haryana',
    'West Bengal',
  ];


  const paymentStatusOptions = ['Pending', 'Paid', 'Partial Payment'];


  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, filters, showDeleted]);


  useEffect(() => {
    fetchVendors();
  }, []);


  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/vendors`, {
        params: { page: 1, limit: 1000 },
      });


      const list = Array.isArray(res.data)
        ? res.data
        : res.data.vendors || [];


      setVendors(list || []);
    } catch (e) {
      console.error('Error fetching vendors:', e);
      setVendors([]);
    }
  };


  const matchCategory = (csvValue, validCategories) => {
    if (!csvValue) return '';
    const v = csvValue.trim();


    const exact = validCategories.find(
      (c) => c.toLowerCase() === v.toLowerCase()
    );
    if (exact) return exact;


    const typoMap = {
      commision: 'Commission',
      commisson: 'Commission',
      comission: 'Commission',
      advertisment: 'Advertisement',
      assests: 'Assets',
    };
    const typo = typoMap[v.toLowerCase()];
    if (typo) return typo;


    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const vNorm = norm(v);
    const fuzzy = validCategories.find(
      (c) => norm(c).includes(vNorm) || vNorm.includes(norm(c))
    );
    if (fuzzy) return fuzzy;


    return v;
  };


  const matchInvoiceType = (csvValue, validTypes) => {
    if (!csvValue) return '';
    const v = csvValue.trim();
    const exact = validTypes.find((t) => t.toLowerCase() === v.toLowerCase());
    return exact || v;
  };


  const matchGstLocation = (csvValue, validLocations) => {
    if (!csvValue) return '';
    const v = csvValue.trim();
    const exact = validLocations.find(
      (l) => l.toLowerCase() === v.toLowerCase()
    );
    if (exact) return exact;


    const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
    const fuzzy = validLocations.find(
      (l) => norm(l).includes(norm(v)) || norm(v).includes(norm(l))
    );
    return fuzzy || v;
  };


  const fetchRecords = async () => {
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        category: filters.category || undefined,
        billingGst: filters.billingGst || undefined,
        vendorSearch: filters.vendorSearch || undefined,
      };


      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );


      const url = showDeleted
        ? `${API_BASE_URL}/api/deleted-records`
        : `${API_BASE_URL}/api/purchase-records`;


      const res = await axios.get(url, { params });


      let list;
      let totalCount;


      if (Array.isArray(res.data)) {
        const sorted = res.data.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        list = sorted.slice(
          page * rowsPerPage,
          page * rowsPerPage + rowsPerPage
        );
        totalCount = res.data.length;
      } else if (res.data.records) {
        list = res.data.records;
        totalCount = res.data.total || res.data.records.length;
      } else {
        list = [];
        totalCount = 0;
      }


      const normalized = (list || []).map((r) => ({
        ...r,
        category: r.category ? matchCategory(r.category, categories) : '',
      }));


      setRecords(normalized);
      setTotal(totalCount);
    } catch (e) {
      console.error('Fetch error:', e);
      setRecords([]);
      setTotal(0);
      showSnackbar('Failed to fetch records', 'error');
    }
  };


  const handleAddRow = async () => {
    const newRecord = {
      date: '',
      category: '',
      invoiceType: '',
      billingGst: '',
      invoiceNo: '',
      partyName: '',
      invoiceAmount: '',
      physicalInvoice: '',
      link: '',
      matchedWith2B: '',
      invoicingTally: '',
      paymentStatus: '',
      pendingPayment: '',
      paymentDate: '',
      paymentScreenshot: '',
      isDeleted: false,
      deletedAt: null,
    };


    try {
      await axios.post(`${API_BASE_URL}/api/purchase-records`, newRecord);
      setPage(0);
      setShowDeleted(false);
      fetchRecords();
      showSnackbar('Record created successfully', 'success');
    } catch (e) {
      console.error('Create error:', e);
      showSnackbar('Error creating record', 'error');
    }
  };


  // 🔹 ADD VENDOR – with validation for email, phone, GST
const handleAddVendor = async () => {
  if (!newVendor.name.trim()) {
    showSnackbar('Please enter a vendor name', 'error');
    return;
  }

  const email = newVendor.email.trim();
  const phone = newVendor.phoneNumber.trim();
  let gst = (newVendor.gstNumber || '').trim().toUpperCase();
 
  if (phone && !/^\d{10}$/.test(phone)) {
    showSnackbar('Phone number must be exactly 10 digits.', 'error');
    return;
  }
 
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showSnackbar('Please enter a valid email address.', 'error');
    return;
  }
 
  if (newVendor.hasGST) {
    if (!gst) {
      showSnackbar('Please enter GST number (15 characters).', 'error');
      return;
    }
    if (gst.length !== 15) {
      showSnackbar('GST number must be exactly 15 characters.', 'error');
      return;
    }
  } else {
    gst = '';  
  }


  try {
    const res = await axios.post(`${API_BASE_URL}/api/vendors`, {
      name: newVendor.name.trim(),
      email,
      phoneNumber: phone,
      hasGST: newVendor.hasGST,
      gstNumber: gst,
    });


    setVendors((prev) => [...prev, res.data]);
    setNewVendor({
      name: '',
      email: '',
      phoneNumber: '',
      hasGST: true,
      gstNumber: '',
    });
    setVendorDialogOpen(false);
    showSnackbar('Vendor added successfully!', 'success');
  } catch (e) {
    console.error('Error adding vendor:', e);
    const errorMsg =
      e.response?.data?.message ||
      e.response?.data?.error ||
      'Failed to add vendor';
    showSnackbar(errorMsg, 'error');
  }
};




  const handleFieldChange = (id, field, value) => {
    if (showDeleted) return;


    if (!originalValues.current[`${id}-${field}`]) {
      const record = records.find((r) => r._id === id);
      if (record) {
        originalValues.current[`${id}-${field}`] = record[field];
      }
    }


    setEditingCell({ recordId: id, field });


    setRecords((prev) =>
      prev.map((r) => (r._id === id ? { ...r, [field]: value } : r))
    );
  };


  const handleFieldBlur = async (recordId, field, value) => {
    setEditingCell({ recordId: null, field: null });


    if (showDeleted) {
      delete originalValues.current[`${recordId}-${field}`];
      return;
    }


    if (recordId.toString().startsWith('temp-')) {
      delete originalValues.current[`${recordId}-${field}`];
      return;
    }


    const originalValue = originalValues.current[`${recordId}-${field}`];
    delete originalValues.current[`${recordId}-${field}`];


    let finalValue = value;


    if (field === 'category' && value) {
      finalValue = matchCategory(value, categories);
    }


    if (originalValue === finalValue) {
      return;
    }


    try {
      await axios.patch(`${API_BASE_URL}/api/purchase-records/${recordId}`, {
        [field]: finalValue,
      });


      setRecords((prev) =>
        prev.map((r) =>
          r._id === recordId ? { ...r, [field]: finalValue } : r
        )
      );
      showSnackbar('Saved successfully', 'success');
    } catch (e) {
      console.error('Save failed:', e);
      const errorMsg = e.response?.data?.error || 'Failed to save';
      showSnackbar(errorMsg, 'error');
      setRecords((prev) =>
        prev.map((r) =>
          r._id === recordId ? { ...r, [field]: originalValue } : r
        )
      );
    }
  };


  const handleDelete = async (id) => {
    if (showDeleted) return;


    if (!window.confirm('Delete this record?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/purchase-records/${id}`);
      fetchRecords();
      showSnackbar('Record moved to deleted records', 'success');
    } catch (e) {
      console.error('Delete error:', e);
      showSnackbar('Error deleting record', 'error');
    }
  };


  const handleFileUpload = async (id, file, field = 'paymentScreenshot') => {
    if (!file || showDeleted) return;


    const formData = new FormData();
    formData.append('file', file);
    formData.append('recordId', id);
    formData.append('field', field);


    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/uploadToWasabi`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );


      const fileUrl = res.data.fileUrl || res.data.url;
      if (!fileUrl) throw new Error('No file URL returned from server');


      setRecords((prev) =>
        prev.map((r) => (r._id === id ? { ...r, [field]: fileUrl } : r))
      );


      const verifyRes = await axios
        .get(`${API_BASE_URL}/api/purchase-records/${id}`)
        .catch(() => null);
      if (verifyRes?.data) {
        setRecords((prev) =>
          prev.map((r) => (r._id === id ? verifyRes.data : r))
        );
      }


      showSnackbar('File uploaded successfully', 'success');
    } catch (e) {
      console.error('Upload error:', e.response?.data || e.message);
      const msg = e.response?.data?.details || e.message || 'Upload failed';
      showSnackbar(`Upload failed: ${msg}`, 'error');
    }
  };


  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };


  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageDialogOpen(true);
  };
  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setSelectedImage('');
  };


  const parseDate = (val) => {
    if (!val || val.trim() === '') return '';
    const s = val.trim();


    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;


    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }


    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [d, m, y] = s.split('-');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }


    try {
      const d = new Date(s);
      if (!isNaN(d)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      //
    }
    return '';
  };


  const detectDelimiter = (text) => {
    const sample = text.split(/\r?\n/).slice(0, 10).filter(Boolean);
    const candidates = ['\t', ',', ';', '|'];


    let best = '\t',
      bestScore = -Infinity;
    for (const d of candidates) {
      const counts = sample.map((l) => l.split(d).length);
      const maxCols = Math.max(...counts);
      const variance = counts.reduce((a, c) => a + Math.abs(c - maxCols), 0);
      const score = maxCols * 1000 - variance + (d === '\t' ? 10 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  };


  const parseCsv = (text, delimiter = ',') => {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuote = false;


    for (let i = 0; i < text.length; i++) {
      const ch = text[i];


      if (inQuote) {
        if (ch === '"' && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === delimiter) {
          row.push(cell.trim());
          cell = '';
        } else if (ch === '\n') {
          row.push(cell.trim());
          cell = '';
          if (row.some((c) => c !== '')) rows.push(row);
          row = [];
        } else if (ch === '\r') {
          // ignore
        } else {
          cell += ch;
        }
      }
    }
    row.push(cell.trim());
    if (row.some((c) => c !== '')) rows.push(row);
    return rows;
  };


  const normalize = (s) =>
    (s ?? '')
      .toString()
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');


  const cleanNumber = (v) => (v ?? '').toString().replace(/[, ]/g, '').trim();


  const yesNo = (v, dflt = '') => {
    const s = (v ?? '').toString().trim().toLowerCase();
    if (['yes', 'y', 'true', '1'].includes(s)) return 'Yes';
    if (['no', 'n', 'false', '0'].includes(s)) return 'No';
    return dflt;
  };


  const buildIndexMap = (headers) => {
    const H = headers.map(normalize);


    const find = (...candidates) => {
      for (const c of candidates) {
        const i = H.indexOf(normalize(c));
        if (i !== -1) return i;
      }
      for (let i = 0; i < H.length; i++) {
        if (candidates.some((c) => H[i].includes(normalize(c)))) return i;
      }
      return -1;
    };


    return {
      date: find('date', 'invoice date', 'invoicedate'),
      category: find('category', 'expense category'),
      invoiceType: find('invoice type', 'invoicetype', 'type'),
      billingGst: find(
        'billing gst',
        'billinggst',
        'gst',
        'billing state',
        'billingstate'
      ),
      invoiceNo: find(
        'invoice no.',
        'invoice no',
        'invoiceno',
        'invoice number',
        'invoicenumber',
        'inv no',
        'invno',
        'invoice#'
      ),
      partyName: find(
        'party name',
        'partyname',
        'vendor',
        'supplier',
        'customer',
        'name'
      ),
      invoiceAmount: find(
        'invoice amount',
        'invoiceamount',
        'amount',
        'total amount',
        'totalamount',
        'total'
      ),
      physicalInvoice: find('physical invoice', 'physicalinvoice'),
      link: find('link', 'invoice link', 'invoicelink', 'url'),
      matchedWith2B: find(
        'matched with 2b',
        'matchedwith2b',
        'gstr2b matched',
        'gstr2bmatched'
      ),
      invoicingTally: find('invoicing tally', 'invoicingtally', 'tally'),
      paymentStatus: find('payment status', 'paymentstatus', 'status'),
      pendingPayment: find('pending payment', 'pendingpayment'),
      paymentDate: find('payment date', 'paymentdate'),
      paymentScreenshot: find(
        'payment screenshot',
        'paymentscreenshot',
        'screenshot',
        'image',
        'file'
      ),
    };
  };


  const triggerBulkInput = () => bulkInputRef.current?.click();


  const handleBulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBulkUploading(true);
      setBulkProgress({ done: 0, total: 0 });


      const raw = await file.text();
      const text = raw.replace(/^\uFEFF/, '');
      const delimiter = detectDelimiter(text);
      const rows = parseCsv(text, delimiter);
      if (!rows.length) throw new Error('Empty CSV');


      const headersRaw = rows[0];
      const indices = buildIndexMap(headersRaw);


      const requiredKeys = [
        'date',
        'category',
        'invoiceType',
        'billingGst',
        'invoiceNo',
        'partyName',
        'invoiceAmount',
      ];
      const missing = requiredKeys.filter((k) => indices[k] === -1);


      if (missing.length) {
        const ordered = [
          null,
          'date',
          'category',
          'invoiceType',
          'billingGst',
          'invoiceNo',
          'partyName',
          'invoiceAmount',
          'physicalInvoice',
          'link',
          'matchedWith2B',
          'invoicingTally',
          'link',
          'paymentStatus',
          'pendingPayment',
          'paymentDate',
          'paymentScreenshot',
        ];
        for (let i = 0; i < ordered.length; i++) {
          const key = ordered[i];
          if (!key) continue;
          if (indices[key] === -1 && i < headersRaw.length) indices[key] = i;
        }


        const stillMissing = requiredKeys.filter((k) => indices[k] === -1);
        if (stillMissing.length) {
          showSnackbar(
            `CSV missing headers: ${stillMissing.join(
              ', '
            )}. Check console for details.`,
            'error'
          );
          console.error(
            `CSV missing headers: ${stillMissing.join(
              ', '
            )}\n\nFound headers: ${headersRaw.join(', ')}`
          );
          return;
        }
      }


      const val = (r, i) => (i >= 0 ? (r[i] ?? '').trim() : '');


      const recordsToCreate = rows
        .slice(1)
        .filter((r) => r && r.some((c) => (c || '').trim() !== ''))
        .map((r) => ({
          date: parseDate(val(r, indices.date)),
          category: matchCategory(val(r, indices.category), categories),
          invoiceType: matchInvoiceType(
            val(r, indices.invoiceType),
            invoiceTypes
          ),
          billingGst: matchGstLocation(
            val(r, indices.billingGst),
            gstLocations
          ),
          invoiceNo: val(r, indices.invoiceNo) || '',
          partyName: val(r, indices.partyName) || '',
          invoiceAmount: cleanNumber(val(r, indices.invoiceAmount)) || '',
          physicalInvoice: yesNo(val(r, indices.physicalInvoice), ''),
          link: val(r, indices.link) || '',
          matchedWith2B: yesNo(val(r, indices.matchedWith2B), ''),
          invoicingTally: yesNo(val(r, indices.invoicingTally), ''),
          paymentStatus: val(r, indices.paymentStatus) || '',
          pendingPayment: cleanNumber(val(r, indices.pendingPayment)) || '',
          paymentDate: parseDate(val(r, indices.paymentDate)),
          paymentScreenshot: val(r, indices.paymentScreenshot) || '',
          isDeleted: false,
          deletedAt: null,
        }));


      setBulkProgress({ done: 0, total: recordsToCreate.length });


      for (let i = 0; i < recordsToCreate.length; i++) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/purchase-records`,
            recordsToCreate[i]
          );
        } catch (err) {
          console.error(
            `Row ${i + 1} upload failed:`,
            err.response?.data || err.message
          );
        } finally {
          setBulkProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      }


      setPage(0);
      setShowDeleted(false);
      await fetchRecords();
      showSnackbar(
        `Bulk upload completed: ${recordsToCreate.length} records processed`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showSnackbar('Bulk upload failed. Check console for details.', 'error');
    } finally {
      setBulkUploading(false);
      setBulkProgress({ done: 0, total: 0 });
      setTimeout(() => {
        if (e.target) e.target.value = '';
      }, 0);
    }
  };


  const headerCellSx = {
    backgroundColor: '#111827',
    color: '#f9fafb',
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: 'nowrap',
    padding: '8px 10px',
    borderBottom: '1px solid #e5e7eb',
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
      fontSize: 13,
    },
  };


  const columns = [
    { field: 'date', label: 'Date' },
    { field: 'category', label: 'Category' },
    { field: 'invoiceType', label: 'Invoice Type' },
    { field: 'billingGst', label: 'Billing GST' },
    { field: 'invoiceNo', label: 'Invoice No.' },
    { field: 'partyName', label: 'Vendor Name' },
    { field: 'invoiceAmount', label: 'Invoice Amount' },
    { field: 'link', label: 'Invoice Link' },
    { field: 'matchedWith2B', label: 'Matched With 2B' },
    { field: 'invoicingTally', label: 'Invoicing Tally' },
  ];


  const handleVendorSelect = (recordId, name) => {
    handleFieldChange(recordId, 'partyName', name);
    handleFieldBlur(recordId, 'partyName', name);
  };


  const renderCell = (record, field) => {
    const isDeletedView = showDeleted;
    const isEditing =
      !isDeletedView &&
      editingCell.recordId === record._id &&
      editingCell.field === field;


    if (isDeletedView) {
      if (field === 'date' && record[field]) {
        return (
          <Typography sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            {record[field].toString().split('T')[0]}
          </Typography>
        );
      }


      if (field === 'link' && record[field]) {
        return (
          <Box
            component="a"
            href={record[field]}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontSize: '0.85rem',
              color: '#1976d2',
              textDecoration: 'none',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            View
          </Box>
        );
      }


      const value = record[field];
      return (
        <Typography sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
          {value ?? ''}
        </Typography>
      );
    }


    switch (field) {
      case 'partyName':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Autocomplete
              freeSolo
              options={vendors.map((v) => v.name)}
              value={record[field] || ''}
              onChange={(e, newValue) =>
                handleVendorSelect(record._id, newValue || '')
              }
              onInputChange={(e, newValue) =>
                handleFieldChange(record._id, field, newValue)
              }
              onBlur={() =>
                handleFieldBlur(record._id, field, record[field] || '')
              }
              onFocus={() =>
                setEditingCell({ recordId: record._id, field })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Select or type vendor..."
                  sx={{
                    minWidth: 280,
                    ...inputBorderSx,
                    backgroundColor: isEditing ? '#fffef0' : 'transparent',
                    '& .MuiOutlinedInput-root': {
                      padding: '2px 8px',
                    },
                  }}
                />
              )}
              sx={{ width: '100%' }}
            />
          </Box>
        );


      case 'date':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              type="date"
              size="small"
              value={record[field] ? record[field].toString().split('T')[0] : ''}
              onChange={(e) =>
                handleFieldChange(record._id, field, e.target.value)
              }
              onBlur={(e) =>
                handleFieldBlur(record._id, field, e.target.value)
              }
              onFocus={() =>
                setEditingCell({ recordId: record._id, field })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 150,
                ...inputBorderSx,
                backgroundColor: isEditing ? '#fffef0' : 'transparent',
              }}
            />
          </Box>
        );


      case 'category': {
        const value = record[field] || '';
        const normalizedValue = value ? matchCategory(value, categories) : '';
        const options =
          normalizedValue && !categories.includes(normalizedValue)
            ? [normalizedValue, ...categories]
            : categories;


        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl
              fullWidth
              size="small"
              sx={{ minWidth: 180, ...inputBorderSx }}
            >
              <Select
                value={normalizedValue}
                onChange={(e) => {
                  const correctedValue = matchCategory(
                    e.target.value,
                    categories
                  );
                  handleFieldChange(record._id, field, correctedValue);
                  handleFieldBlur(record._id, field, correctedValue);
                }}
                onFocus={() =>
                  setEditingCell({ recordId: record._id, field })
                }
                displayEmpty
                sx={{
                  backgroundColor: isEditing ? '#fffef0' : 'transparent',
                }}
              >
                <MenuItem value="">
                  <em>Select Category</em>
                </MenuItem>
                {options.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );
      }


      case 'invoiceType':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl
              fullWidth
              size="small"
              sx={{ minWidth: 150, ...inputBorderSx }}
            >
              <Select
                value={record[field] || ''}
                onChange={(e) => {
                  handleFieldChange(record._id, field, e.target.value);
                  handleFieldBlur(record._id, field, e.target.value);
                }}
                onFocus={() =>
                  setEditingCell({ recordId: record._id, field })
                }
                displayEmpty
                sx={{
                  backgroundColor: isEditing ? '#fffef0' : 'transparent',
                }}
              >
                <MenuItem value="">
                  <em>Select Type</em>
                </MenuItem>
                {invoiceTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );


      case 'billingGst':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl
              fullWidth
              size="small"
              sx={{ minWidth: 150, ...inputBorderSx }}
            >
              <Select
                value={record[field] || ''}
                onChange={(e) => {
                  handleFieldChange(record._id, field, e.target.value);
                  handleFieldBlur(record._id, field, e.target.value);
                }}
                onFocus={() =>
                  setEditingCell({ recordId: record._id, field })
                }
                displayEmpty
                sx={{
                  backgroundColor: isEditing ? '#fffef0' : 'transparent',
                }}
              >
                <MenuItem value="">
                  <em>Select GST</em>
                </MenuItem>
                {gstLocations.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );


      case 'matchedWith2B':
      case 'invoicingTally': {
        const checked = record[field] === 'Yes';
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Switch
              checked={checked}
              onChange={(e) => {
                const newVal = e.target.checked ? 'Yes' : 'No';
                handleFieldChange(record._id, field, newVal);
                handleFieldBlur(record._id, field, newVal);
              }}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#000',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#000',
                },
              }}
            />
          </Box>
        );
      }


      case 'paymentStatus':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl
              fullWidth
              size="small"
              sx={{ minWidth: 130, ...inputBorderSx }}
            >
              <Select
                value={record[field] || ''}
                onChange={(e) => {
                  handleFieldChange(record._id, field, e.target.value);
                  handleFieldBlur(record._id, field, e.target.value);
                }}
                onFocus={() =>
                  setEditingCell({ recordId: record._id, field })
                }
                displayEmpty
                sx={{
                  backgroundColor: isEditing ? '#fffef0' : 'transparent',
                }}
              >
                <MenuItem value="">
                  <em>Select Status</em>
                </MenuItem>
                {paymentStatusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );


      case 'link':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              id={`link-upload-${record._id}`}
              type="file"
              onChange={(e) =>
                handleFileUpload(record._id, e.target.files[0], 'link')
              }
            />
            <label htmlFor={`link-upload-${record._id}`}>
              <Button
                variant="contained"
                component="span"
                size="small"
                startIcon={<UploadIcon />}
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#111' },
                }}
              >
                Upload
              </Button>
            </label>
            {record[field] && (
              <Box
                component="a"
                href={record[field]}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontSize: '0.85rem',
                  color: '#1976d2',
                  textDecoration: 'none',
                  maxWidth: '100px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                View
              </Box>
            )}
          </Box>
        );


      case 'invoiceAmount':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              type="text"
              inputMode="decimal"
              size="small"
              value={record[field] || ''}
              onChange={(e) =>
                handleFieldChange(record._id, field, e.target.value)
              }
              onBlur={(e) =>
                handleFieldBlur(record._id, field, e.target.value)
              }
              onFocus={() =>
                setEditingCell({ recordId: record._id, field })
              }
              fullWidth
              sx={{
                minWidth: 120,
                ...inputBorderSx,
                backgroundColor: isEditing ? '#fffef0' : 'transparent',
              }}
            />
          </Box>
        );


      default:
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              value={record[field] || ''}
              onChange={(e) =>
                handleFieldChange(record._id, field, e.target.value)
              }
              onBlur={(e) =>
                handleFieldBlur(record._id, field, e.target.value)
              }
              onFocus={() =>
                setEditingCell({ recordId: record._id, field })
              }
              fullWidth
              sx={{
                minWidth: 150,
                ...inputBorderSx,
                backgroundColor: isEditing ? '#fffef0' : 'transparent',
              }}
            />
          </Box>
        );
    }
  };


  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      try {
        localStorage.setItem('purchaseFilters', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save filters', e);
      }
      return next;
    });
    setPage(0);
  };


  const clearFilters = () => {
    const cleared = {
      category: '',
      billingGst: '',
      vendorSearch: '',
    };


    setFilters(cleared);


    try {
      localStorage.setItem('purchaseFilters', JSON.stringify(cleared));
    } catch (e) {
      console.error('Failed to clear filters', e);
    }


    setPage(0);
  };


  return (
    <Box
      sx={{
        px: 2.5,
        pt: 1.5,
        pb: 2.5,
        backgroundColor: '#f3f4f6',
        minHeight: '100vh',
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
            Purchase Records {showDeleted ? '— Deleted' : ''}
          </Typography>
        </Box>


        <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center' }}>
          <input
            ref={bulkInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleBulkFileChange}
          />


          {!showDeleted && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setVendorDialogOpen(true)}
              sx={{
                px: 2.4,
                py: 0.9,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                borderRadius: '999px',
                color: '#111827',
                borderColor: '#d1d5db',
                backgroundColor: '#ffffff',
                '&:hover': {
                  borderColor: '#111827',
                  backgroundColor: '#f9fafb',
                },
              }}
            >
              Add Vendor
            </Button>
          )}


          {!showDeleted && (
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
                '&:hover': { backgroundColor: '#111' },
              }}
            >
              Add Record
            </Button>
          )}


          {!showDeleted && (
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={triggerBulkInput}
              disabled={bulkUploading}
              sx={{
                px: 2.4,
                py: 0.9,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                borderRadius: '999px',
                color: '#111827',
                borderColor: '#d1d5db',
                backgroundColor: '#ffffff',
                '&:hover': {
                  borderColor: '#111827',
                  backgroundColor: '#f9fafb',
                },
              }}
            >
              {bulkUploading
                ? `Uploading ${bulkProgress.done}/${bulkProgress.total}`
                : 'Bulk Upload'}
            </Button>
          )}


          <Button
            variant={showDeleted ? 'contained' : 'outlined'}
            startIcon={<DeleteOutlineIcon />}
            onClick={() => {
              setShowDeleted((prev) => !prev);
              setPage(0);
            }}
            sx={{
              px: 2.4,
              py: 0.9,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              borderRadius: '999px',
              color: showDeleted ? '#fff' : '#991b1b',
              borderColor: '#fecaca',
              backgroundColor: showDeleted ? '#991b1b' : '#ffffff',
              '&:hover': {
                borderColor: '#991b1b',
                backgroundColor: showDeleted ? '#7f1d1d' : '#fef2f2',
              },
            }}
          >
            {showDeleted ? 'Showing Deleted' : 'View Deleted'}
          </Button>
        </Box>
      </Paper>


      <Paper
        sx={{
          mb: 1.5,
          mt: 0,
          px: 2.1,
          py: 1.2,
          borderRadius: 2,
          border: '1px solid #e5e7eb',
          backgroundColor: '#fbfbfb',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            placeholder="Search vendor name..."
            value={filters.vendorSearch}
            onChange={(e) =>
              handleFilterChange('vendorSearch', e.target.value)
            }
            sx={{ minWidth: 220, ...inputBorderSx }}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  🔍
                </Box>
              ),
            }}
          />


          <FormControl size="small" sx={{ minWidth: 180, ...inputBorderSx }}>
            <Select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>All Categories</em>
              </MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>


          <FormControl size="small" sx={{ minWidth: 180, ...inputBorderSx }}>
            <Select
              value={filters.billingGst}
              onChange={(e) =>
                handleFilterChange('billingGst', e.target.value)
              }
              displayEmpty
            >
              <MenuItem value="">
                <em>All GST Locations</em>
              </MenuItem>
              {gstLocations.map((loc) => (
                <MenuItem key={loc} value={loc}>
                  {loc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>


          <Button
            variant="outlined"
            onClick={clearFilters}
            sx={{
              textTransform: 'none',
              color: '#666',
              borderColor: '#ddd',
              '&:hover': { borderColor: '#999', backgroundColor: '#f9f9f9' },
            }}
          >
            Clear Filters
          </Button>


          {(filters.category ||
            filters.billingGst ||
            filters.vendorSearch) && (
            <Typography
              variant="body2"
              sx={{ color: '#666', ml: 'auto' }}
            >
              {Object.values(filters).filter(Boolean).length} filter(s) active
            </Typography>
          )}
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
                {columns.map((col) => (
                  <TableCell key={col.field} sx={headerCellSx}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>


         <TableBody>
  {records.length === 0 ? (
    <TableRow>
      <TableCell
        colSpan={columns.length + 2}
        align="center"
        sx={{ py: 5 }}
      >
        <Typography variant="body1" color="text.secondary">
          {showDeleted ? 'No deleted records.' : 'No records found.'}
        </Typography>
      </TableCell>
    </TableRow>
  ) : (
    records.map((record, index) => (
      <TableRow
        key={record._id}
        sx={{
          '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
          '&:hover': { backgroundColor: '#f3f4f6' },
        }}
      >
        <TableCell
          sx={{ padding: '6px 8px', whiteSpace: 'nowrap' }}
        >
          {!showDeleted && (
            <IconButton
              color="error"
              onClick={() => handleDelete(record._id)}
              size="small"
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(211,47,47,.08)',
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </TableCell>
        <TableCell
          sx={{
            padding: '6px 8px',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}
        >
          {page * rowsPerPage + index + 1}
        </TableCell>
        {columns.map((col) => (
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
              '&:hover': { backgroundColor: 'rgba(0,0,0,.05)' },
            },
            '& .MuiTablePagination-select': {
              color: '#000',
            },
          }}
        />
      </Box>


      {/* Image dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
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

    {/* Add vendor dialog */}
<Dialog
  open={vendorDialogOpen}
  onClose={() => setVendorDialogOpen(false)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle
    sx={{
      fontWeight: 700,
      fontSize: '1.25rem',
      pb: 1.5,
    }}
  >
    Add New Vendor
  </DialogTitle>


  <DialogContent sx={{ pt: 2.5, pb: 2 }}>
    {/* Vendor Name */}
  {/* Vendor Name */}
    <TextField
      autoFocus
      fullWidth
   
      placeholder="Enter vendor name..."
      value={newVendor.name}
      onChange={(e) =>
        setNewVendor((prev) => ({ ...prev, name: e.target.value }))
      }
      InputLabelProps={{ shrink: true }}
      sx={{
        mb: 2.5,
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          backgroundColor: '#fafafa',
          '& fieldset': {
            borderColor: '#d1d5db',
            borderWidth: '1.5px',
          },
          '&:hover fieldset': {
            borderColor: '#111827',
            borderWidth: '1.5px',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#000',
            borderWidth: '2px',
          },
        },
        '& .MuiOutlinedInput-input': {
          padding: '14px 14px',
          fontSize: 14,
        },
        '& .MuiInputLabel-root': {
          fontWeight: 600,
          color: '#4b5563',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: '#000',
        },
      }}
    />


    {/* Email + Phone */}
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
      <TextField
        fullWidth
        label="Email"
        type="email"
        placeholder="vendor@example.com"
        value={newVendor.email}
        onChange={(e) =>
          setNewVendor((prev) => ({ ...prev, email: e.target.value }))
        }
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: '#fafafa',
            '& fieldset': {
              borderColor: '#d1d5db',
              borderWidth: '1.5px',
            },
            '&:hover fieldset': {
              borderColor: '#111827',
              borderWidth: '1.5px',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#000',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 600,
            color: '#6b7280',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#000',
          },
        }}
      />


      <TextField
        fullWidth
        label="Phone"
        type="tel"
        placeholder="+91 98765 43210"
        value={newVendor.phoneNumber}
        onChange={(e) =>
          setNewVendor((prev) => ({
            ...prev,
            phoneNumber: e.target.value.replace(/\D/g, ''), // only digits
          }))
        }
        inputProps={{ maxLength: 10 }}
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: '#fafafa',
            '& fieldset': {
              borderColor: '#d1d5db',
              borderWidth: '1.5px',
            },
            '&:hover fieldset': {
              borderColor: '#111827',
              borderWidth: '1.5px',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#000',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 600,
            color: '#6b7280',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#000',
          },
        }}
      />
    </Box>


    {/* GST toggle + GST number (hidden when toggle OFF) */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Switch
          checked={newVendor.hasGST}
          onChange={(e) =>
            setNewVendor((prev) => ({
              ...prev,
              hasGST: e.target.checked,
              gstNumber: e.target.checked ? prev.gstNumber : '',
            }))
          }
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: '#000' },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: '#000',
            },
          }}
        />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Have GST
        </Typography>
      </Box>


      {newVendor.hasGST && (
        <TextField
          label="GST Number"
          placeholder="15AABCU9603R1ZV"
          value={newVendor.gstNumber}
          onChange={(e) =>
            setNewVendor((prev) => ({
              ...prev,
              gstNumber: e.target.value.toUpperCase(),
            }))
          }
          inputProps={{ maxLength: 15 }}
          sx={{
            minWidth: 220,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: '#fafafa',
              '& fieldset': {
                borderColor: '#d1d5db',
                borderWidth: '1.5px',
              },
              '&:hover fieldset': {
                borderColor: '#111827',
                borderWidth: '1.5px',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#000',
                borderWidth: '2px',
              },
            },
            '& .MuiOutlinedInput-input': {
              padding: '12px 14px',
              fontSize: 14,
            },
            '& .MuiInputLabel-root': {
              fontWeight: 600,
              color: '#6b7280',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#000',
            },
          }}
        />
      )}
    </Box>


    {/* Buttons */}
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        justifyContent: 'flex-end',
      }}
    >
      <Button
        onClick={() => {
          setVendorDialogOpen(false);
          setNewVendor({
            name: '',
            email: '',
            phoneNumber: '',
            hasGST: true, // keep default ON
            gstNumber: '',
          });
        }}
        sx={{
          px: 2.5,
          py: 0.8,
          textTransform: 'none',
          color: '#6b7280',
          fontWeight: 600,
          fontSize: '0.9rem',
          borderRadius: 2,
          '&:hover': {
            backgroundColor: '#f3f4f6',
            color: '#374151',
          },
        }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={handleAddVendor}
        disabled={!newVendor.name.trim()}
        sx={{
          px: 3.5,
          py: 0.8,
          textTransform: 'none',
          backgroundColor: '#000',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.9rem',
          borderRadius: 2,
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          '&:hover': {
            backgroundColor: '#111',
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          },
          '&:disabled': {
            backgroundColor: '#d1d5db',
            color: '#9ca3af',
            boxShadow: 'none',
          },
        }}
      >
        Add Vendor
      </Button>
    </Box>
  </DialogContent>
</Dialog>




      {/* Global Snackbar */}
      <Snackbar
        open={snackbar.open}
          autoHideDuration={snackbar.severity === 'error' ? 7000 : 4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};


export default PurchaseRecord;




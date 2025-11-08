// src/pages/Vendors.js
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
    TextField,
    Switch,
    CircularProgress,
    InputAdornment,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    Sync as SyncIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import axios from 'axios';


const API_BASE_URL = 'https://muditamleads-14f32a10d7f7.herokuapp.com';


const Vendors = () => {
    const [vendors, setVendors] = useState([]);
    const [editingCell, setEditingCell] = useState({
        vendorId: null,
        field: null,
    });
    const originalValues = useRef({});


    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [total, setTotal] = useState(0);


    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');


    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'error',
    });


    const showError = (message) => {
        setSnackbar({ open: true, message, severity: 'error' });
    };


    const showSuccess = (message) => {
        setSnackbar({ open: true, message, severity: 'success' });
    };


    // simple validators
    const isValidPhone = (phone) => !phone || /^\d{10}$/.test(phone.trim());


    const isValidEmail = (email) =>
        !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());


    useEffect(() => {
        fetchVendors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, searchTerm]);


    const fetchVendors = async () => {
        setLoading(true);
        try {
            const params = {
                page: page + 1,
                limit: rowsPerPage,
            };


            const res = await axios.get(`${API_BASE_URL}/api/vendors`, { params });


            let vendorsList = [];
            let totalCount = 0;


            if (res.data.vendors && Array.isArray(res.data.vendors)) {
                vendorsList = res.data.vendors;
                totalCount = res.data.total || res.data.vendors.length;
            } else if (Array.isArray(res.data)) {
                vendorsList = res.data;
                totalCount = res.data.length;
            }


            if (searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase().trim();
                vendorsList = vendorsList.filter(
                    (vendor) =>
                        vendor.name?.toLowerCase().includes(searchLower) ||
                        vendor.phoneNumber?.toLowerCase().includes(searchLower) ||
                        vendor.email?.toLowerCase().includes(searchLower) ||
                        vendor.gstNumber?.toLowerCase().includes(searchLower)
                );
                totalCount = vendorsList.length;
            }


            setVendors(vendorsList);
            setTotal(totalCount);
        } catch (e) {
            console.error('Fetch vendors error:', e);
            showError(
                'Failed to fetch vendors: ' +
                (e.response?.data?.error || e.message || 'Unknown error')
            );
            setVendors([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };


    const handleSyncVendors = async () => {
        if (
            !window.confirm(
                'Sync vendors from purchase records?\n\nThis will create vendor entries for all unique party names found in purchase records.'
            )
        )
            return;


        setSyncing(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/vendors/sync-from-purchases`
            );


            showSuccess(
                `Vendor Sync Complete! New: ${res.data.syncedCount}, Already existed: ${res.data.skippedCount}, Total unique: ${res.data.total}`
            );


            setSearchTerm('');
            setPage(0);
            await fetchVendors();
        } catch (e) {
            console.error('Sync vendors error:', e);
            showError(
                'Failed to sync vendors: ' +
                (e.response?.data?.error || e.message || 'Unknown error')
            );
        } finally {
            setSyncing(false);
        }
    };


    const handleFieldChange = (id, field, value) => {
        if (!originalValues.current[`${id}-${field}`]) {
            const vendor = vendors.find((v) => v._id === id);
            if (vendor) {
                originalValues.current[`${id}-${field}`] = vendor[field];
            }
        }


        setEditingCell({ vendorId: id, field });


        setVendors((prev) =>
            prev.map((v) => (v._id === id ? { ...v, [field]: value } : v))
        );
    };


    const handleFieldBlur = async (vendorId, field, rawValue) => {
        setEditingCell({ vendorId: null, field: null });


        const currentVendor = vendors.find((v) => v._id === vendorId);


        let value = rawValue;
        const key = `${vendorId}-${field}`;
        const originalValue = originalValues.current[key];
        delete originalValues.current[key];


        // PHONE VALIDATION
        if (field === 'phoneNumber') {
            if (!isValidPhone(value)) {
                showError('Phone number must be exactly 10 digits (only numbers).');
                setVendors((prev) =>
                    prev.map((v) =>
                        v._id === vendorId ? { ...v, phoneNumber: originalValue || '' } : v
                    )
                );
                return;
            }
            value = value.trim();
        }


        // EMAIL VALIDATION
        if (field === 'email') {
            if (!isValidEmail(value)) {
                showError('Invalid email format.');
                setVendors((prev) =>
                    prev.map((v) =>
                        v._id === vendorId ? { ...v, email: originalValue || '' } : v
                    )
                );
                return;
            }
            value = value.trim();
        }


        // GST NUMBER VALIDATION
        if (field === 'gstNumber') {
            value = (value || '').toUpperCase().trim();


            if (currentVendor?.hasGST) {
                if (!value) {
                    showError('GST number is required when GST is enabled.');
                    setVendors((prev) =>
                        prev.map((v) =>
                            v._id === vendorId ? { ...v, gstNumber: originalValue || '' } : v
                        )
                    );
                    return;
                }
                if (value.length !== 15) {
                    showError('GST number must be exactly 15 characters.');
                    setVendors((prev) =>
                        prev.map((v) =>
                            v._id === vendorId ? { ...v, gstNumber: originalValue || '' } : v
                        )
                    );
                    return;
                }
            } else {
                if (value) {
                    showError('Enable GST for this vendor to set GST number.');
                    setVendors((prev) =>
                        prev.map((v) =>
                            v._id === vendorId ? { ...v, gstNumber: originalValue || '' } : v
                        )
                    );
                    return;
                }
            }
        }


        // HAS GST TOGGLE – allow turning ON first, then filling GST
        if (field === 'hasGST') {
            const newHasGST = !!value;
            const gst = (currentVendor?.gstNumber || '').toUpperCase().trim();


            if (newHasGST) {
                // turning ON: just update UI, don't hit backend yet
                // (GST will be validated & saved when gstNumber field blurs)
                setVendors((prev) =>
                    prev.map((v) =>
                        v._id === vendorId ? { ...v, hasGST: true } : v
                    )
                );
                return;
            } else {
                // turning OFF: clear GST and save both fields
                value = false;
                setVendors((prev) =>
                    prev.map((v) =>
                        v._id === vendorId ? { ...v, hasGST: false, gstNumber: '' } : v
                    )
                );
            }
        }


        if (originalValue === value) return;


        try {
            const payload = { [field]: value };


            // keep GST / hasGST consistent in payload
            if (field === 'hasGST') {
                payload.hasGST = !!value;
                if (!value) {
                    payload.gstNumber = '';
                }
            }


            if (field === 'gstNumber') {
                payload.gstNumber = value;
                // if GST toggle is ON in UI, make sure backend also hasGST = true
                if (currentVendor?.hasGST) {
                    payload.hasGST = true;
                }
            }


            const res = await axios.patch(
                `${API_BASE_URL}/api/vendors/${vendorId}`,
                payload
            );


            const updated = res.data;
            setVendors((prev) =>
                prev.map((v) => (v._id === vendorId ? updated : v))
            );
        } catch (e) {
            console.error('Save vendor failed:', e);


            const errorMsg =
                e.response?.data?.message ||
                e.response?.data?.error ||
                'Failed to save vendor';
            showError(errorMsg);


            // revert changed value
            setVendors((prev) =>
                prev.map((v) =>
                    v._id === vendorId ? { ...v, [field]: originalValue } : v
                )
            );
        }
    };






    const handleChangePage = (_e, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };


    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };


    const handleClearSearch = () => {
        setSearchTerm('');
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
        borderBottom: '1px solid #e5e7eb',
    };


    const inputBorderSx = {
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#d4d4d4' },
            '&:hover fieldset': { borderColor: '#000' },
            '&.Mui-focused fieldset': { borderColor: '#000' },
        },
        '& .MuiInputBase-input': {
            paddingTop: 0.4,
            paddingBottom: 0.4,
            fontSize: 13,
        },
    };


    const renderCell = (vendor, field) => {
        const isEditing =
            editingCell.vendorId === vendor._id && editingCell.field === field;


        switch (field) {
            case 'name':
                return (
                    <Typography
                        sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                        {vendor.name}
                    </Typography>
                );


            case 'phoneNumber':
                return (
                    <TextField
                        type="text"
                        size="small"
                        value={vendor.phoneNumber || ''}
                        onChange={(e) =>
                            handleFieldChange(vendor._id, 'phoneNumber', e.target.value)
                        }
                        onBlur={(e) =>
                            handleFieldBlur(vendor._id, 'phoneNumber', e.target.value)
                        }
                        onFocus={() =>
                            setEditingCell({ vendorId: vendor._id, field: 'phoneNumber' })
                        }
                        placeholder="Enter phone"
                        fullWidth
                        sx={{
                            minWidth: 140,
                            ...inputBorderSx,
                            backgroundColor: isEditing ? '#fffef0' : 'transparent',
                        }}
                    />
                );


            case 'email':
                return (
                    <TextField
                        type="email"
                        size="small"
                        value={vendor.email || ''}
                        onChange={(e) =>
                            handleFieldChange(vendor._id, 'email', e.target.value)
                        }
                        onBlur={(e) =>
                            handleFieldBlur(vendor._id, 'email', e.target.value)
                        }
                        onFocus={() =>
                            setEditingCell({ vendorId: vendor._id, field: 'email' })
                        }
                        placeholder="Enter email"
                        fullWidth
                        sx={{
                            minWidth: 180,
                            ...inputBorderSx,
                            backgroundColor: isEditing ? '#fffef0' : 'transparent',
                        }}
                    />
                );


            case 'hasGST':
                return (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Switch
                            checked={vendor.hasGST || false}
                            onChange={(e) => {
                                const newValue = e.target.checked;
                                handleFieldChange(vendor._id, 'hasGST', newValue);
                                handleFieldBlur(vendor._id, 'hasGST', newValue);
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


            case 'gstNumber':
                return (
                    <TextField
                        type="text"
                        size="small"
                        value={vendor.gstNumber || ''}
                        onChange={(e) =>
                            handleFieldChange(
                                vendor._id,
                                'gstNumber',
                                e.target.value.toUpperCase()
                            )
                        }
                        onBlur={(e) =>
                            handleFieldBlur(
                                vendor._id,
                                'gstNumber',
                                e.target.value.toUpperCase()
                            )
                        }
                        onFocus={() =>
                            setEditingCell({ vendorId: vendor._id, field: 'gstNumber' })
                        }
                        placeholder="Enter GST number"
                        disabled={!vendor.hasGST}
                        fullWidth
                        sx={{
                            minWidth: 180,
                            ...inputBorderSx,
                            backgroundColor: isEditing ? '#fffef0' : 'transparent',
                            '& .MuiInputBase-input.Mui-disabled': {
                                backgroundColor: '#f5f5f5',
                                cursor: 'not-allowed',
                            },
                        }}
                    />
                );


            default:
                return null;
        }
    };


    const columns = [
        { field: 'name', label: 'Vendor Name' },
        { field: 'phoneNumber', label: 'Phone Number' },
        { field: 'email', label: 'Email' },
        { field: 'hasGST', label: 'GST' },
        { field: 'gstNumber', label: 'GST Number' },
    ];


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
                        sx={{
                            fontWeight: 800,
                            color: '#111827',
                            letterSpacing: '.25px',
                        }}
                    >
                        My Vendors
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.3, color: '#6b7280' }} />
                </Box>


                <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center' }}>
                    <Button
                        variant="outlined"
                        startIcon={
                            syncing ? <CircularProgress size={16} /> : <SyncIcon />
                        }
                        onClick={handleSyncVendors}
                        disabled={syncing}
                        sx={{
                            px: 2.6,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            borderRadius: '999px',
                            borderColor: '#000',
                            color: '#000',
                            '&:hover': {
                                borderColor: '#000',
                                backgroundColor: 'rgba(0,0,0,0.05)',
                            },
                            '&:disabled': {
                                borderColor: '#ccc',
                                color: '#999',
                            },
                        }}
                    >
                        {syncing ? 'Syncing...' : 'Sync from Purchases'}
                    </Button>
                </Box>
            </Paper>


            {/* SEARCH BAR */}
            <Paper
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 1,
                    px: 2,
                    py: 1.2,
                    borderRadius: 2,
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                }}
            >
                <TextField
                    placeholder="Search by vendor name, phone, email, or GST number..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    size="small"
                    fullWidth
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: '#e5e7eb' },
                            '&:hover fieldset': { borderColor: '#000' },
                            '&.Mui-focused fieldset': { borderColor: '#000' },
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: '#6b7280' }} />
                            </InputAdornment>
                        ),
                        endAdornment:
                            searchTerm && (
                                <InputAdornment position="end">
                                    <Button
                                        size="small"
                                        onClick={handleClearSearch}
                                        sx={{
                                            minWidth: 'auto',
                                            p: 0.5,
                                            color: '#6b7280',
                                            '&:hover': {
                                                backgroundColor: 'rgba(0,0,0,0.05)',
                                            },
                                        }}
                                    >
                                        <ClearIcon fontSize="small" />
                                    </Button>
                                </InputAdornment>
                            ),
                    }}
                />
                {searchTerm && (
                    <Typography
                        variant="body2"
                        sx={{ ml: 2, color: '#6b7280', whiteSpace: 'nowrap' }}
                    >
                        {total} result{total !== 1 ? 's' : ''}
                    </Typography>
                )}
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
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <TableContainer
                            sx={{
                                maxHeight: 'calc(100vh - 310px)',
                            }}
                        >
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={headerCellSx}>S.No.</TableCell>
                                        {columns.map((col) => (
                                            <TableCell key={col.field} sx={headerCellSx}>
                                                {col.label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>


                                <TableBody>
                                    {vendors.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length + 1}
                                                align="center"
                                                sx={{ py: 5 }}
                                            >
                                                <Typography
                                                    variant="body1"
                                                    color="text.secondary"
                                                    sx={{ mb: 2 }}
                                                >
                                                    {searchTerm
                                                        ? `No vendors found matching "${searchTerm}"`
                                                        : 'No vendors found.'}
                                                </Typography>
                                                {!searchTerm && (
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        Click "Sync from Purchases" to import vendors from
                                                        purchase records
                                                        <br />
                                                        or add vendors from other parts of the app.
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        vendors.map((vendor, index) => (
                                            <TableRow
                                                key={vendor._id}
                                                sx={{
                                                    '&:nth-of-type(odd)': {
                                                        backgroundColor: '#fafafa',
                                                    },
                                                    '&:hover': { backgroundColor: '#f3f4f6' },
                                                }}
                                            >
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
                                                        sx={{
                                                            padding: '6px 8px',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {renderCell(vendor, col.field)}
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
                                    '&:hover': {
                                        backgroundColor: 'rgba(0,0,0,.05)',
                                    },
                                },
                                '& .MuiTablePagination-select': {
                                    color: '#000',
                                },
                            }}
                        />
                    </>
                )}
            </Box>


            <Snackbar
                open={snackbar.open}
                autoHideDuration={snackbar.severity === 'error' ? 5000 : 4000} // 5s for validation errors
                onClose={(_, reason) => {
                    if (reason === 'clickaway') return; // don't close too fast on outside click
                    setSnackbar((s) => ({ ...s, open: false }));
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    variant="filled"
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>


        </Box>
    );
};


export default Vendors;




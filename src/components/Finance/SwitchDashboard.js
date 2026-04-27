// src/components/Finance/SwitchDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  Divider,
  Chip,
  Avatar,
  Autocomplete,
  Stack,
  Fade
} from '@mui/material';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';


const API_BASE_URL = 'https://muditamleads-14f32a10d7f7.herokuapp.com';
const SWITCH_API_BASE = '/api/switch-dashboard';
const LEGACY_SWITCH_API_BASE = '/api/employees';
const PRIMARY_SWITCH_API_BASE = LEGACY_SWITCH_API_BASE;
const SECONDARY_SWITCH_API_BASE = SWITCH_API_BASE;
const dicebearAvatar = (seed = "Somya") =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    seed || "Somya"
  )}&backgroundType=gradientLinear&radius=50`;




const SwitchDashboard = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });


  const navigate = useNavigate();
  const hasOriginalUser = !!sessionStorage.getItem('originalUser');


  const currentUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);


  const storedProfile = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userProfile') || '{}');
    } catch {
      return {};
    }
  }, []);


  const loggedInEmployeeId = useMemo(
    () => storedProfile?._id || storedProfile?.user?._id || currentUser?._id || '',
    [storedProfile, currentUser]
  );


  useEffect(() => {
    const getWithFallback = async (path = '', config = {}) => {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      try {
        return await axios.get(
          `${API_BASE_URL}${PRIMARY_SWITCH_API_BASE}${normalizedPath}`,
          config
        );
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        return axios.get(
          `${API_BASE_URL}${SECONDARY_SWITCH_API_BASE}${normalizedPath}`,
          config
        );
      }
    };

    const loadEmployees = async () => {
      try {
        const { data } = await getWithFallback('', {
          params: { all: true },
          withCredentials: true,
        });
        const currentEmail = (currentUser?.email || "").toLowerCase();
        const filtered = (data || []).filter((emp) =>
          (emp.email || "").toLowerCase() !== currentEmail && emp._id !== loggedInEmployeeId
        );
        setAllEmployees(filtered);
      } catch (err) {
        console.error("Failed loading employees:", err);
      } finally {
        setLoadingList(false);
      }
    };
    loadEmployees();
  }, [currentUser, loggedInEmployeeId]);


  const handleSwitch = async () => {
    if (!selectedEmployee || switching) return;
    try {
      setSwitching(true);
      const actor = currentUser;
      if (actor && !sessionStorage.getItem('originalUser')) {
        sessionStorage.setItem('originalUser', JSON.stringify(actor));
      }
      const postWithFallback = async (path = '', primaryBody = {}, secondaryBody = null) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const fallbackBody = secondaryBody || primaryBody;
        const primaryUrl = `${API_BASE_URL}${PRIMARY_SWITCH_API_BASE}${normalizedPath}`;
        const secondaryUrl = `${API_BASE_URL}${SECONDARY_SWITCH_API_BASE}${normalizedPath}`;
        try {
          return await axios.post(
            primaryUrl,
            primaryBody,
            { withCredentials: true }
          );
        } catch (err) {
          const status = err?.response?.status;
          if (status === 403 && secondaryBody) {
            try {
              return await axios.post(primaryUrl, fallbackBody, { withCredentials: true });
            } catch (retryErr) {
              if (retryErr?.response?.status !== 404) throw retryErr;
              return axios.post(secondaryUrl, fallbackBody, { withCredentials: true });
            }
          }
          if (status !== 404) throw err;
          return axios.post(secondaryUrl, fallbackBody, { withCredentials: true });
        }
      };

      const { data } = await postWithFallback(
        '/impersonate',
        {
          employeeId: selectedEmployee._id,
          actorRole: actor?.role || '',
          actorEmail: actor?.email || '',
        },
        {
          employeeId: selectedEmployee._id,
          actorDepartment: actor?.department || '',
          actorEmail: actor?.email || '',
        }
      );
      if (data?.user) {
        const toStore = { ...data.user, _id: data.user._id || data.user.id };
        sessionStorage.setItem('user', JSON.stringify(toStore));
        sessionStorage.setItem('switchMeta', JSON.stringify({
          targetName: toStore.fullName,
          switchedAt: Date.now(),
        }));
      }
      navigate('/', { replace: true });
    } catch (err) {
      setSnackbar({ open: true, message: 'Switch failed', severity: 'error' });
    } finally {
      setSwitching(false);
    }
  };


  const handleRevert = async () => {
    try {
      setReverting(true);

      // Frontend originalUser is authoritative for current impersonation cycle.
      const originalStr = sessionStorage.getItem('originalUser');
      if (originalStr) {
        const original = JSON.parse(originalStr);
        sessionStorage.setItem('user', JSON.stringify(original));
        sessionStorage.removeItem('originalUser');
        sessionStorage.removeItem('switchMeta');
        navigate('/switch-dashboard', { replace: true });
        return;
      }

      let data;
      try {
        ({ data } = await axios.post(
          `${API_BASE_URL}${PRIMARY_SWITCH_API_BASE}/revert`,
          {},
          { withCredentials: true }
        ));
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        ({ data } = await axios.post(
          `${API_BASE_URL}${SECONDARY_SWITCH_API_BASE}/revert`,
          {},
          { withCredentials: true }
        ));
      }
      if (data?.user) {
        sessionStorage.setItem('user', JSON.stringify({ ...data.user, _id: data.user._id || data.user.id }));
      }
      sessionStorage.removeItem('originalUser');
      sessionStorage.removeItem('switchMeta');
      navigate('/switch-dashboard', { replace: true });
    } catch (err) {
      setSnackbar({ open: true, message: 'Unable to revert', severity: 'error' });
    } finally {
      setReverting(false);
    }
  };


  return (
    <Box
      sx={{
        minHeight: '93vh',
        bgcolor: '#f4f4f5', // Light gray background
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pt: { xs: 4, md: 10 },
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 600, // Reduced overall paper width
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: '#ffffff',
          border: '1px solid #e4e4e7',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        {/* Header - High Contrast Black */}
        <Box sx={{ p: 3, bgcolor: '#09090b', color: '#ffffff' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: '#ffffff', color: '#09090b', width: 36, height: 36 }}>
                <SwitchAccountIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  Account Switcher
                </Typography>
                <Typography variant="caption" sx={{ color: '#a1a1aa' }}>
                  Select an account to view their workspace
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={`Admin: ${currentUser?.fullName?.split(' ')[0] || 'User'}`}
              size="small"
              sx={{ bgcolor: '#27272a', color: '#ffffff', fontWeight: 600, fontSize: 11 }}
            />
          </Stack>
        </Box>


        {/* Impersonation Banner - Warning Style */}
        {hasOriginalUser && (
          <Box sx={{ px: 3, py: 1.5, bgcolor: '#fafafa', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 12, color: '#52525b', fontWeight: 600 }}>
              Viewing Mode Active
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRevert}
              disabled={reverting}
              startIcon={<ArrowBackIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ textTransform: 'none', color: '#09090b', borderColor: '#09090b', '&:hover': { bgcolor: '#f4f4f5', borderColor: '#000' }, fontWeight: 700, borderRadius: 1.5, fontSize: 11 }}
            >
              Exit
            </Button>
          </Box>
        )}


        {/* Search Content - Focused and Narrow */}
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 420 }}> {/* Strictly reduced width for search area */}
            <Typography variant="caption" sx={{ color: '#71717a', fontWeight: 800, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Find Employee
            </Typography>
          <Autocomplete
  fullWidth
  options={allEmployees}
  loading={loadingList}
  value={selectedEmployee}
  isOptionEqualToValue={(opt, val) => opt?._id === val?._id}
  getOptionLabel={(option) => option?.fullName || option?.email || ""}
  onChange={(e, value) => setSelectedEmployee(value || null)}
  renderOption={(props, option) => (
    <Box
      component="li"
      {...props}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 1,
      }}
    >
      <Avatar
        src={dicebearAvatar(option?.fullName || option?.email || "Somya")}
        sx={{ width: 34, height: 34, borderRadius: 2 }}
        imgProps={{ referrerPolicy: "no-referrer" }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
          {option.fullName}
        </Typography>
        <Typography variant="caption" sx={{ color: "#71717a" }} noWrap>
          {option.email}
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Chip
        label={option.role}
        size="small"
        sx={{
          height: 20,
          fontSize: 10,
          fontWeight: 800,
          bgcolor: "#f4f4f5",
        }}
      />
    </Box>
  )}
  renderInput={(params) => (
    <TextField
      {...params}
      placeholder="Search name..."
      size="small"
      InputProps={{
        ...params.InputProps,
        startAdornment: (
          <>
            <PersonOutlineIcon sx={{ mr: 1, color: "#a1a1aa", fontSize: 20 }} />
            {params.InputProps.startAdornment}
          </>
        ),
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          bgcolor: "#ffffff",
          borderRadius: 2,
          "& fieldset": { borderColor: "#e4e4e7" },
          "&:hover fieldset": { borderColor: "#71717a" },
          "&.Mui-focused fieldset": {
            borderColor: "#09090b",
            borderWidth: "1px",
          },
        },
      }}
    />
  )}
/>


          </Box>


          {/* Action Card */}
          <Box sx={{ width: '100%', maxWidth: 420, mt: 4 }}>
            {selectedEmployee ? (
              <Fade in={true}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    borderColor: '#e4e4e7',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: '0.2s',
                    '&:hover': { borderColor: '#09090b' },
                  }}
                >
                <Box
  sx={{
    width: "100%",
    borderRadius: 2.5,
    p: 2,
    mb: 2,
    background:
      "linear-gradient(135deg, rgba(9,9,11,1) 0%, rgba(39,39,42,1) 60%, rgba(9,9,11,1) 100%)",
    display: "flex",
    alignItems: "center",
    gap: 2,
  }}
>
  <Avatar
    src={dicebearAvatar(selectedEmployee?.fullName || "Somya")}
    sx={{
      width: 64,
      height: 64,
      borderRadius: 3,
      bgcolor: "#fff",
      border: "2px solid rgba(255,255,255,0.25)",
      boxShadow: "0 10px 22px rgba(0,0,0,0.25)",
    }}
    imgProps={{ referrerPolicy: "no-referrer" }}
  />
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ fontWeight: 900, color: "#fff", lineHeight: 1.1 }} noWrap>
      {selectedEmployee.fullName}
    </Typography>
    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }} noWrap>
      {selectedEmployee.email}
    </Typography>


    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
      <Chip
        label={selectedEmployee.role}
        size="small"
        sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: "#ffffff", color: "#09090b" }}
      />
      <Chip
        label="Active"
        size="small"
        sx={{ height: 20, fontSize: 10, fontWeight: 900, bgcolor: "#22c55e", color: "#052e16" }}
      />
    </Stack>
  </Box>
</Box>            
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#09090b' }}>
                    {selectedEmployee.fullName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#71717a', mb: 2 }}>
                    {selectedEmployee.email}
                  </Typography>
                 
                  <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                    <Chip label={selectedEmployee.role} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#f4f4f5' }} />
                    <Chip label="Active" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#f0fdf4', color: '#166534' }} />
                  </Stack>


                  <Button
                    fullWidth
                    variant="contained"
                    disabled={switching}
                    onClick={() => !switching && handleSwitch()}
                    sx={{
                      bgcolor: '#09090b',
                      color: '#ffffff',
                      fontWeight: 800,
                      borderRadius: 2,
                      textTransform: 'none',
                      py: 1,
                      '&:hover': { bgcolor: '#27272a' }
                    }}
                  >
                    {switching ? 'Switching...' : 'Switch Now'}
                  </Button>
                </Paper>
              </Fade>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center', border: '1px dashed #e4e4e7', borderRadius: 3 }}>
                <Typography variant="caption" sx={{ color: '#a1a1aa', fontWeight: 600 }}>
                  Selected employee details will appear here
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>


      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2, bgcolor: '#09090b' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};


export default SwitchDashboard;

// src/components/Finance/SwitchDashboard.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Divider,
  Chip,
  Avatar,
} from '@mui/material';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import CloseIcon from '@mui/icons-material/Close';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://muditamleads-14f32a10d7f7.herokuapp.com';

const SwitchDashboard = () => {
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const navigate = useNavigate();
  const hasOriginalUser = !!sessionStorage.getItem('originalUser');

  // Read once and memoize so dependencies stay stable
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
    () =>
      storedProfile?._id ||
      storedProfile?.user?._id ||
      currentUser?._id ||
      '',
    [storedProfile, currentUser]
  );

  // Track the latest request to avoid race conditions
  const reqStateRef = useRef({ reqId: 0 });

  // Debounced employee search with cancellation and race protection
  useEffect(() => {
    const trimmed = String(search || '').trim();
    if (!trimmed) {
      setSelectedEmployee(null);
      return;
    }
    if (trimmed.length < 2) {
      setSelectedEmployee(null);
      return;
    }

    const controller = new AbortController();
    const thisReqId = ++reqStateRef.current.reqId;
    setSearchLoading(true);

    const t = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/employees`, {
          params: {
            search: trimmed,
            actorRole: currentUser?.role || '',
            actorEmail: currentUser?.email || '',
          },
          withCredentials: true,
          signal: controller.signal,
        });

        // Drop if a newer request has completed
        if (thisReqId !== reqStateRef.current.reqId) return;

        const rawList = Array.isArray(data) ? data : [];
        const currentEmail = (currentUser?.email || '').toLowerCase();

        const filteredList = rawList.filter((emp) => {
          const idMatch =
            loggedInEmployeeId && emp?._id === loggedInEmployeeId;
          const emailMatch =
            currentEmail && (emp?.email || '').toLowerCase() === currentEmail;
          return !idMatch && !emailMatch;
        });

        if (rawList.length && !filteredList.length) {
          setSelectedEmployee(null);
          setSnackbar({
            open: true,
            message: 'You are already viewing this account.',
            severity: 'info',
          });
          return;
        }

        const normalized = trimmed.toLowerCase();
        const match =
          filteredList.find((emp) =>
            (emp.fullName || '').toLowerCase().includes(normalized)
          ) ||
          filteredList.find((emp) =>
            (emp.email || '').toLowerCase().includes(normalized)
          ) ||
          filteredList.find((emp) =>
            (emp.role || '').toLowerCase().includes(normalized)
          );

        setSelectedEmployee(match || null);
        if (!match) {
          setSnackbar({
            open: true,
            message: 'No matching employee found',
            severity: 'warning',
          });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setSelectedEmployee(null);
        setSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Failed to load employee',
          severity: 'error',
        });
      } finally {
        if (thisReqId === reqStateRef.current.reqId) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [search, currentUser?.role, currentUser?.email, loggedInEmployeeId]);

  const handleSwitch = async () => {
    if (!selectedEmployee || switching) return;

    const currentEmail = (currentUser?.email || '').toLowerCase();
    if (
      (loggedInEmployeeId && selectedEmployee._id === loggedInEmployeeId) ||
      (currentEmail &&
        (selectedEmployee.email || '').toLowerCase() === currentEmail)
    ) {
      setSnackbar({
        open: true,
        message: 'You are already viewing this account.',
        severity: 'info',
      });
      setSelectedEmployee(null);
      return;
    }

    try {
      setSwitching(true);

      const actor = currentUser;

      if (actor && !sessionStorage.getItem('originalUser')) {
        sessionStorage.setItem('originalUser', JSON.stringify(actor));
      }

      const { data } = await axios.post(
        `${API_BASE_URL}/api/employees/impersonate`,
        {
          employeeId: selectedEmployee._id,
          actorRole: actor?.role || '',
          actorEmail: actor?.email || '',
        },
        { withCredentials: true }
      );

      if (data?.user) {
        // Ensure _id is present for rest of app
        const toStore = { ...data.user, _id: data.user._id || data.user.id };
        sessionStorage.setItem('user', JSON.stringify(toStore));
        sessionStorage.setItem(
          'switchMeta',
          JSON.stringify({
            actorEmail: actor?.email || null,
            targetEmail: toStore.email,
            targetName: toStore.fullName,
            switchedAt: Date.now(),
          })
        );
      }

      navigate('/', { replace: true });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Switch failed',
        severity: 'error',
      });
    } finally {
      setSwitching(false);
    }
  };

  const handleRevert = async () => {
    try {
      setReverting(true);
      const { data } = await axios.post(
        `${API_BASE_URL}/api/employees/revert`,
        {},
        { withCredentials: true }
      );

      if (data?.user) {
        const toStore = { ...data.user, _id: data.user._id || data.user.id };
        sessionStorage.setItem('user', JSON.stringify(toStore));
      }
      sessionStorage.removeItem('originalUser');
      sessionStorage.removeItem('switchMeta');

      setSnackbar({
        open: true,
        message: 'Returned to your own dashboard',
        severity: 'success',
      });

      navigate('/', { replace: true });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Unable to revert',
        severity: 'error',
      });
    } finally {
      setReverting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #020617 100%)',
        background:
          'radial-gradient(circle at top left, #1d4ed8 0, transparent 55%), radial-gradient(circle at bottom right, #0ea5e9 0, transparent 55%), #020617',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        py: 6,
        px: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: '100%',
          maxWidth: 900,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            bgcolor: 'rgba(15,23,42,0.97)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '999px',
                bgcolor: 'rgba(148,163,184,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SwitchAccountIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Switch Dashboard
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(226,232,240,0.8)', mt: 0.3 }}
              >
                Quickly view any employee&apos;s dashboard without logging out.
              </Typography>
            </Box>
          </Box>

          {currentUser?.fullName && (
            <Chip
              size="small"
              label={`Logged in as: ${currentUser.fullName}`}
              sx={{
                bgcolor: 'rgba(15,118,110,0.15)',
                color: '#a5f3fc',
                borderRadius: 999,
              }}
            />
          )}
        </Box>

        {/* Impersonation Banner */}
        {hasOriginalUser && (
          <Box
            sx={{
              px: 3,
              py: 1.5,
              bgcolor: '#FEF3C7',
              borderBottom: '1px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography sx={{ fontSize: 14, color: '#92400E' }}>
              You are currently impersonating another user. You can safely
              return to your own account at any time.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={handleRevert}
              disabled={reverting}
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{
                textTransform: 'none',
                borderColor: '#92400E',
                color: '#92400E',
                '&:hover': {
                  borderColor: '#78350F',
                  bgcolor: 'rgba(250,204,21,0.2)',
                },
              }}
            >
              {reverting ? 'Returning…' : 'Back to my account'}
            </Button>
          </Box>
        )}

        {/* Content */}
        <Box sx={{ p: 3, bgcolor: '#F9FAFB' }}>
          {/* Search row */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <TextField
              placeholder="Search employee by name, email, or role…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedEmployee(null);
              }}
              fullWidth
              size="medium"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <PersonOutlineIcon
                    sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }}
                  />
                ),
                endAdornment: (
                  <>
                    {searchLoading && (
                      <CircularProgress
                        size={18}
                        sx={{ mr: 1, color: 'text.secondary' }}
                      />
                    )}
                    {search && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearch('');
                          setSelectedEmployee(null);
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </>
                ),
              }}
              sx={{
                maxWidth: 480,
                bgcolor: 'white',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>

          <Typography
            variant="caption"
            sx={{ mt: 1, ml: 0.5, display: 'block', color: 'text.secondary' }}
          >
            Tip: type at least 2 characters to search. Click on the employee card to open their dashboard.
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Selected employee card – clickable to switch */}
          {selectedEmployee ? (
            <Paper
              elevation={0}
              onClick={() => !switching && handleSwitch()}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: '1px solid #E5E7EB',
                bgcolor: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: switching ? 'not-allowed' : 'pointer',
                transition:
                  'background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, transform 0.08s ease',
                '&:hover': !switching && {
                  boxShadow: 3,
                  borderColor: '#BFDBFE',
                  bgcolor: '#EFF6FF',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: '#3B82F6',
                  fontWeight: 600,
                }}
              >
                {(selectedEmployee.fullName || '?')
                  .charAt(0)
                  .toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 16 }}>
                  {selectedEmployee.fullName || 'Unknown'}
                </Typography>
                <Typography
                  sx={{ fontSize: 14, color: 'text.secondary', mt: 0.2 }}
                >
                  {selectedEmployee.email}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={selectedEmployee.role || 'Role: N/A'}
                    sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8' }}
                  />
                  {selectedEmployee.status && (
                    <Chip
                      size="small"
                      label={`Status: ${selectedEmployee.status}`}
                      sx={{ bgcolor: '#ECFDF3', color: '#15803D' }}
                    />
                  )}
                </Box>
              </Box>
              <Box
                sx={{
                  textAlign: 'right',
                  fontSize: 12,
                  color: 'text.secondary',
                }}
              >
                <Typography sx={{ fontSize: 12 }}>
                  Click to switch into this account.
                </Typography>
                <Typography sx={{ fontSize: 12 }}>
                  Your original account is preserved.
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px dashed #D1D5DB',
                bgcolor: '#F3F4F6',
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography variant="body2">
                Start typing above to search for an employee. Their details will
                appear here once selected.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? 7000 : 4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
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

export default SwitchDashboard;
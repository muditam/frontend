import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Stack,
  Typography,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tooltip,
  CircularProgress,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Collapse,
} from "@mui/material";


import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import LaptopMacIcon from "@mui/icons-material/LaptopMac";
import DevicesIcon from "@mui/icons-material/Devices";
import ImageIcon from "@mui/icons-material/Image";
import RefreshIcon from "@mui/icons-material/Refresh";
import HistoryIcon from "@mui/icons-material/History";
import axios from "axios";


const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});


const getUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};


const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};


export default function MyAssets() {
  const user = getUser();
  const userId = user?._id || user?.id || null;


  const [allotments, setAllotments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [gallery, setGallery] = useState({
    open: false,
    images: [],
    title: "",
  });
  const [showHistory, setShowHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


  const fetchAllotments = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg("");


      // ✅ get both active + returned for this employee
      const { data } = await api.get(
        `/api/asset-allotments/employee/${userId}?includeReturned=1`
      );


      const list = Array.isArray(data) ? data : [];
      setAllotments(list);
    } catch (err) {
      console.error("Failed to load my assets", err);
      setErrorMsg("Failed to load your assets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);


  useEffect(() => {
    fetchAllotments();
  }, [fetchAllotments]);


  // optional: auto-refresh when tab regains focus
  useEffect(() => {
    const onFocus = () => {
      setRefreshing(true);
      fetchAllotments();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchAllotments]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allotments;


    return allotments.filter((a) => {
      const hay = [a.name, a.company, a.model, a.assetCode, a.employeeCode]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [allotments, search]);


  const activeAssets = filtered.filter((a) => a.status !== "returned");
  const historyAssets = filtered.filter((a) => a.status === "returned");


  const activeCount = activeAssets.length;
  const historyCount = historyAssets.length;


  if (!userId) {
    return (
      <Box p={{ xs: 2, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6">My Assets</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please log in to view your assigned assets.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }


  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <DevicesIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                My Assets
              </Typography>
            </Stack>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              View all laptops, accessories and other hardware allotted to you.
            </Typography>
          }
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={`Active: ${activeCount}`}
                size="small"
                color="primary"
                variant="filled"
              />
              <Chip
                label={`History: ${historyCount}`}
                size="small"
                color={showHistory ? "secondary" : "default"}
                variant={showHistory ? "filled" : "outlined"}
                icon={<HistoryIcon fontSize="small" />}
                onClick={() => setShowHistory((s) => !s)}
              />
              <Tooltip title="Refresh">
                <span>
                  <IconButton
                    onClick={() => {
                      setRefreshing(true);
                      fetchAllotments();
                    }}
                    disabled={refreshing || loading}
                  >
                    <RefreshIcon
                      fontSize="small"
                      sx={
                        refreshing
                          ? {
                              animation: "spin 0.9s linear infinite",
                              "@keyframes spin": {
                                "0%": { transform: "rotate(0deg)" },
                                "100%": { transform: "rotate(360deg)" },
                              },
                            }
                          : undefined
                      }
                    />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          }
        />


        <CardContent sx={{ pt: 1 }}>
          <Stack spacing={1.5}>
            {/* Search */}
            <TextField
              size="small"
              fullWidth
              placeholder="Search by asset, company, model or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />


            <Divider />


            {/* ACTIVE ASSETS SECTION */}
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: 0.4 }}
            >
              Currently Allotted
            </Typography>


            {loading ? (
              <Stack alignItems="center" py={4}>
                <CircularProgress size={24} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Loading your assets…
                </Typography>
              </Stack>
            ) : activeAssets.length === 0 ? (
              <Stack alignItems="center" py={4} spacing={1}>
                <LaptopMacIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                <Typography variant="body2" color="text.secondary">
                  No active assets allotted to you.
                </Typography>
              </Stack>
            ) : (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Company</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Asset Code</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>
                        Images
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Allotted At
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeAssets.map((a) => {
                      const imgs = Array.isArray(a.allotmentImageUrls)
                        ? a.allotmentImageUrls
                        : [];
                      const firstImgs = imgs.slice(0, 4);
                      const moreCount =
                        imgs.length > 4 ? imgs.length - 4 : 0;


                      return (
                        <TableRow key={a._id} hover>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <LaptopMacIcon
                                fontSize="small"
                                color="primary"
                              />
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {a.name || "Asset"}
                                </Typography>
                                {a.employeeCode && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Employee ID: {a.employeeCode}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>


                          <TableCell>{a.company || "—"}</TableCell>
                          <TableCell>{a.model || "—"}</TableCell>
                          <TableCell>
                            <Typography
                              component="code"
                              variant="body2"
                              sx={{
                                fontFamily: "monospace",
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: "grey.100",
                              }}
                            >
                              {a.assetCode || "—"}
                            </Typography>
                          </TableCell>


                          {/* ACTIVE IMAGES – OPEN IN NEW TAB */}
                          <TableCell>
                            {imgs.length ? (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                flexWrap="wrap"
                                useFlexGap
                                alignItems="center"
                              >
                                {firstImgs.map((url, idx) => (
                                  <Tooltip
                                    key={idx}
                                    title="Click to open in new tab"
                                  >
                                    <Box
                                      component="a"
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{ display: "inline-block" }}
                                    >
                                      <Avatar
                                        src={url}
                                        variant="rounded"
                                        sx={{
                                          width: 32,
                                          height: 32,
                                          borderRadius: 1,
                                          cursor: "zoom-in",
                                        }}
                                      />
                                    </Box>
                                  </Tooltip>
                                ))}


                                {moreCount > 0 && (
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`+${moreCount} more`}
                                    onClick={() =>
                                      setGallery({
                                        open: true,
                                        images: imgs,
                                        title: a.assetCode
                                          ? `Images • ${a.assetCode}`
                                          : "Images",
                                      })
                                    }
                                    sx={{ cursor: "pointer" }}
                                  />
                                )}
                              </Stack>
                            ) : (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                sx={{ color: "text.disabled" }}
                              >
                                <ImageIcon fontSize="small" />
                                <Typography variant="caption">
                                  No images
                                </Typography>
                              </Stack>
                            )}
                          </TableCell>


                          <TableCell>{fmtDateTime(a.allottedAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}


            {errorMsg && (
              <Typography variant="caption" color="error">
                {errorMsg}
              </Typography>
            )}


            {/* HISTORY SECTION – COLLAPSIBLE */}
            <Divider sx={{ mt: 3 }} />


            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", letterSpacing: 0.4 }}
              >
                Asset History (Returned)
              </Typography>
              <Button
                size="small"
                startIcon={<HistoryIcon fontSize="small" />}
                onClick={() => setShowHistory((s) => !s)}
              >
                {showHistory
                  ? "Hide History"
                  : `Show History (${historyCount})`}
              </Button>
            </Stack>


            <Collapse in={showHistory}>
              {historyAssets.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  No returned assets yet.
                </Typography>
              ) : (
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ borderRadius: 2, mt: 1 }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Company</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Asset Code
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Allotted At
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Collected At
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>
                          Images
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Remark</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyAssets.map((a) => {
                        const oldImgs = Array.isArray(a.allotmentImageUrls)
                          ? a.allotmentImageUrls
                          : [];
                        const newImgs = Array.isArray(a.returnImageUrls)
                          ? a.returnImageUrls
                          : [];


                        return (
                          <TableRow key={a._id} hover>
                            <TableCell>{a.name || "Asset"}</TableCell>
                            <TableCell>{a.company || "—"}</TableCell>
                            <TableCell>{a.model || "—"}</TableCell>
                            <TableCell>
                              <Typography
                                component="code"
                                variant="body2"
                                sx={{
                                  fontFamily: "monospace",
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 1,
                                  bgcolor: "grey.100",
                                }}
                              >
                                {a.assetCode || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>{fmtDateTime(a.allottedAt)}</TableCell>
                            <TableCell>{fmtDateTime(a.returnedAt)}</TableCell>


                            {/* HISTORY IMAGES – OLD + NEW, OPEN IN NEW TAB */}
                            <TableCell>
                              {oldImgs.length || newImgs.length ? (
                                <Stack spacing={0.5}>
                                  {oldImgs.length > 0 && (
                                    <Stack
                                      direction="row"
                                      spacing={0.5}
                                      alignItems="center"
                                      flexWrap="wrap"
                                      useFlexGap
                                    >
                                      <Typography
                                        variant="caption"
                                        sx={{ minWidth: 40 }}
                                      >
                                        Old:
                                      </Typography>
                                      {oldImgs.slice(0, 3).map((url, idx) => (
                                        <Tooltip
                                          key={`old-${idx}`}
                                          title="Click to open in new tab"
                                        >
                                          <Box
                                            component="a"
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ display: "inline-block" }}
                                          >
                                            <Avatar
                                              src={url}
                                              variant="rounded"
                                              sx={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 1,
                                                cursor: "zoom-in",
                                              }}
                                            />
                                          </Box>
                                        </Tooltip>
                                      ))}
                                      {oldImgs.length > 3 && (
                                        <Chip
                                          size="small"
                                          variant="outlined"
                                          label={`+${oldImgs.length - 3}`}
                                          onClick={() =>
                                            setGallery({
                                              open: true,
                                              images: oldImgs,
                                              title: a.assetCode
                                                ? `Old Images • ${a.assetCode}`
                                                : "Old Images",
                                            })
                                          }
                                          sx={{ cursor: "pointer" }}
                                        />
                                      )}
                                    </Stack>
                                  )}


                                  {newImgs.length > 0 && (
                                    <Stack
                                      direction="row"
                                      spacing={0.5}
                                      alignItems="center"
                                      flexWrap="wrap"
                                      useFlexGap
                                    >
                                      <Typography
                                        variant="caption"
                                        sx={{ minWidth: 40 }}
                                      >
                                        New:
                                      </Typography>
                                      {newImgs.slice(0, 3).map((url, idx) => (
                                        <Tooltip
                                          key={`new-${idx}`}
                                          title="Click to open in new tab"
                                        >
                                          <Box
                                            component="a"
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ display: "inline-block" }}
                                          >
                                            <Avatar
                                              src={url}
                                              variant="rounded"
                                              sx={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 1,
                                                cursor: "zoom-in",
                                              }}
                                            />
                                          </Box>
                                        </Tooltip>
                                      ))}
                                      {newImgs.length > 3 && (
                                        <Chip
                                          size="small"
                                          variant="outlined"
                                          label={`+${newImgs.length - 3}`}
                                          onClick={() =>
                                            setGallery({
                                              open: true,
                                              images: newImgs,
                                              title: a.assetCode
                                                ? `New Images • ${a.assetCode}`
                                                : "New Images",
                                            })
                                          }
                                          sx={{ cursor: "pointer" }}
                                        />
                                      )}
                                    </Stack>
                                  )}
                                </Stack>
                              ) : (
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  alignItems="center"
                                  sx={{ color: "text.disabled" }}
                                >
                                  <ImageIcon fontSize="small" />
                                  <Typography variant="caption">
                                    No images
                                  </Typography>
                                </Stack>
                              )}
                            </TableCell>


                            <TableCell>{a.notes || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Collapse>
          </Stack>
        </CardContent>
      </Card>


      {/* Image Gallery Dialog */}
      <Dialog
        open={gallery.open}
        onClose={() => setGallery((g) => ({ ...g, open: false }))}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {gallery.title || "Images"}
        </DialogTitle>


        <DialogContent dividers sx={{ p: 2.5 }}>
          {gallery.images && gallery.images.length ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 1.5,
              }}
            >
              {gallery.images.map((src, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{ p: 0.5, borderRadius: 2, overflow: "hidden" }}
                >
                  <img
                    src={src}
                    alt={`asset-img-${idx}`}
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </Paper>
              ))}
            </Box>
          ) : (
            <Stack
              alignItems="center"
              spacing={1}
              sx={{ color: "text.secondary", py: 6 }}
            >
              <ImageIcon fontSize="large" />
              <Typography variant="body2">No images to show.</Typography>
            </Stack>
          )}
        </DialogContent>


        <DialogActions sx={{ p: 1.5 }}>
          <Button
            onClick={() => setGallery((g) => ({ ...g, open: false }))}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}



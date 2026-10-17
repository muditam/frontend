import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

const API_BASE = (
  window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : process.env.REACT_APP_API_BASE_URL || ""
).replace(/\/+$/, "");
const DEMO_EXPERT_IMAGE = "/demo-expert.svg";

const emptyProfile = {
  displayName: "",
  title: "",
  bio: "",
  imageUrl: "",
  signatureText: "",
  isPublished: false,
  badges: [
    { label: "Verified Expert", iconType: "verified", active: true, sortOrder: 0 },
    { label: "M.Sc. Nutrition", iconType: "education", active: true, sortOrder: 1 },
    { label: "5+ Years Experience", iconType: "star", active: true, sortOrder: 2 },
  ],
  testimonials: [
    { customerName: "", city: "", rating: 5, hba1cFrom: "", hba1cTo: "", text: "", imageUrl: "", active: true, sortOrder: 0 },
    { customerName: "", city: "", rating: 5, hba1cFrom: "", hba1cTo: "", text: "", imageUrl: "", active: true, sortOrder: 1 },
    { customerName: "", city: "", rating: 5, hba1cFrom: "", hba1cTo: "", text: "", imageUrl: "", active: true, sortOrder: 2 },
  ],
};

const ui = {
  canvas: "#f6f7fb",
  ink: "#101828",
  muted: "#667085",
  line: "#e4e7ec",
  brand: "#5b358b",
  brandSoft: "#f2eafd",
  green: "#15805a",
  greenSoft: "#e9f7f0",
};

function mergeProfile(employee) {
  const profile = employee?.profile || {};
  return {
    ...emptyProfile,
    ...profile,
    displayName: profile.displayName || employee?.fullName || "",
    title: profile.title || "Certified Dietician",
    badges: profile.badges?.length ? profile.badges.map((badge, index) => ({ active: true, sortOrder: index, ...badge })) : emptyProfile.badges,
    testimonials: profile.testimonials?.length
      ? profile.testimonials.map((item, index) => ({ rating: 5, hba1cFrom: "", hba1cTo: "", active: true, sortOrder: index, ...item }))
      : emptyProfile.testimonials,
  };
}

function ProfilePreview({ profile }) {
  const badges = (profile.badges || []).filter((badge) => badge.active !== false && badge.label);
  const testimonials = (profile.testimonials || []).filter((item) => item.active !== false && item.text).slice(0, 3);
  const image = profile.imageUrl || DEMO_EXPERT_IMAGE;

  return (
    <Paper elevation={0} sx={{ border: `1px solid ${ui.line}`, borderRadius: 3, p: 2, bgcolor: "#fff", position: "sticky", top: 88 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <VisibilityOutlinedIcon sx={{ color: ui.brand }} />
        <Typography sx={{ fontWeight: 900 }}>Checkout preview</Typography>
      </Stack>
      <Card variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 1.5 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={image} sx={{ width: 72, height: 72, border: "1px solid #eee" }} />
          <Box sx={{ minWidth: 0 }}>
            <Chip size="small" label="Your assigned dietitian" sx={{ bgcolor: ui.brandSoft, color: ui.brand, fontWeight: 900, textTransform: "uppercase", fontSize: 10 }} />
            <Typography sx={{ mt: 0.8, fontWeight: 950, fontSize: 22, lineHeight: 1.1 }}>{profile.displayName || "Muditam Expert"}</Typography>
            <Typography sx={{ color: ui.muted, fontWeight: 700 }}>{profile.title || "Wellness Expert"}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.8} sx={{ mt: 1.5 }}>
          {badges.map((badge, index) => (
            <Chip key={`${badge.label}-${index}`} size="small" icon={<VerifiedIcon />} label={badge.label} sx={{ bgcolor: ui.greenSoft, color: ui.green, fontWeight: 800 }} />
          ))}
        </Stack>
        <Typography sx={{ mt: 1.5, color: "#344054", fontSize: 13, lineHeight: 1.55 }}>
          {profile.bio || "Your plan was reviewed by your Muditam wellness expert."}
        </Typography>
      </Card>
      <Typography sx={{ fontWeight: 900, mb: 1 }}>Testimonials</Typography>
      <Stack spacing={1}>
        {testimonials.length ? testimonials.map((item, index) => (
          <Card key={`${item.customerName}-${index}`} variant="outlined" sx={{ borderRadius: 2, p: 1.3 }}>
            <Stack direction="row" spacing={1.2}>
              <Avatar src={item.imageUrl || ""} sx={{ width: 40, height: 40, bgcolor: "#f2f4f7", color: ui.muted }}>
                {!item.imageUrl && <PersonOutlineIcon fontSize="small" />}
              </Avatar>
              <Box>
                <Box sx={{ color: "#f5b301", lineHeight: 1 }}>{Array.from({ length: Number(item.rating || 5) }).map((_, i) => <StarIcon key={i} sx={{ fontSize: 14 }} />)}</Box>
                {(item.hba1cFrom || item.hba1cTo) && <Typography sx={{ mt: 0.4, color: ui.green, fontSize: 11, fontWeight: 900 }}>HbA1c {item.hba1cFrom || "-"} → {item.hba1cTo || "-"}</Typography>}
                <Typography sx={{ fontSize: 12.5, color: "#344054" }}>&quot;{item.text}&quot;</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 12, fontWeight: 900 }}>{item.customerName || "Customer"}</Typography>
                <Typography sx={{ fontSize: 11, color: ui.muted }}>{item.city}</Typography>
              </Box>
            </Stack>
          </Card>
        )) : (
          <Typography sx={{ color: ui.muted, fontSize: 13 }}>No active testimonials yet.</Typography>
        )}
      </Stack>
    </Paper>
  );
}

export default function DieticianProfileManager() {
  const [dieticians, setDieticians] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(emptyProfile);

  const selected = useMemo(() => dieticians.find((item) => String(item.id) === String(selectedId)), [dieticians, selectedId]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API_BASE}/api/dietician-profiles`, { params: { q: query }, withCredentials: true });
      const list = data.dieticians || [];
      setDieticians(list);
      const nextSelected = list.find((item) => String(item.id) === String(selectedId)) || list[0];
      setSelectedId(nextSelected?.id || "");
      setProfile(mergeProfile(nextSelected));
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.message || err?.message || "Could not load dietician profiles.";
      setError(status ? `${detail} (${status})` : detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) setProfile(mergeProfile(selected));
  }, [selectedId, selected]);

  const updateBadge = (index, patch) => {
    setProfile((current) => ({
      ...current,
      badges: current.badges.map((badge, i) => (i === index ? { ...badge, ...patch } : badge)),
    }));
  };

  const updateTestimonial = (index, patch) => {
    setProfile((current) => ({
      ...current,
      testimonials: current.testimonials.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const { data } = await axios.put(`${API_BASE}/api/dietician-profiles/${selectedId}`, profile, { withCredentials: true });
      setDieticians((current) => current.map((item) => (
        String(item.id) === String(selectedId)
          ? { ...item, profile: data.profile, isPublished: data.profile.isPublished, completeness: [
              !!data.profile.imageUrl,
              !!data.profile.title,
              !!data.profile.bio,
              (data.profile.testimonials || []).length > 0,
            ].filter(Boolean).length }
          : item
      )));
      setProfile((current) => ({ ...current, ...data.profile }));
      setMessage(data.profile.isPublished ? "Profile saved and published." : "Profile saved as draft.");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file, onUploaded) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await axios.post(`${API_BASE}/api/dietician-profiles/upload`, form, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (typeof onUploaded === "function") {
        onUploaded(data.url);
      } else {
        setProfile((current) => ({ ...current, imageUrl: data.url }));
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: ui.canvas, px: { xs: 1.5, md: 3 }, py: 3 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 950, letterSpacing: -1 }}>Dietician Profile Manager</Typography>
          <Typography sx={{ color: ui.muted, fontWeight: 600 }}>Control the expert image, bio, badges and testimonials shown on public order links.</Typography>
        </Box>
        <Button variant="contained" disabled={!selectedId || saving} onClick={save} sx={{ alignSelf: { xs: "stretch", md: "center" }, bgcolor: "#101828", borderRadius: 2, textTransform: "none", fontWeight: 900, px: 3 }}>
          {saving ? "Saving..." : profile.isPublished ? "Save published profile" : "Save draft"}
        </Button>
      </Stack>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "330px minmax(0,1fr) 360px" }, gap: 2, alignItems: "start" }}>
        <Paper elevation={0} sx={{ border: `1px solid ${ui.line}`, borderRadius: 3, bgcolor: "#fff", overflow: "hidden" }}>
          <Box sx={{ p: 1.5, borderBottom: `1px solid ${ui.line}` }}>
            <TextField
              fullWidth
              size="small"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") load(); }}
              placeholder="Search dietician"
              InputProps={{ startAdornment: <SearchIcon sx={{ color: ui.muted, mr: 1 }} /> }}
            />
          </Box>
          {loading ? (
            <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress size={26} /></Box>
          ) : (
            <Stack sx={{ maxHeight: { lg: "calc(100vh - 220px)" }, overflow: "auto" }}>
              {dieticians.map((item) => (
                <Box
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  sx={{
                    p: 1.5,
                    cursor: "pointer",
                    borderBottom: `1px solid ${ui.line}`,
                    bgcolor: String(item.id) === String(selectedId) ? "#f6f0ff" : "#fff",
                    "&:hover": { bgcolor: "#faf7ff" },
                  }}
                >
                  <Stack direction="row" spacing={1.3} alignItems="center">
                    <Avatar src={item.profile?.imageUrl || ""}>{String(item.fullName || "M").slice(0, 1)}</Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontWeight: 900 }}>{item.profile?.displayName || item.fullName}</Typography>
                      <Typography noWrap sx={{ color: ui.muted, fontSize: 12 }}>{item.profile?.title || item.role}</Typography>
                    </Box>
                    <Chip size="small" label={item.isPublished ? "Live" : "Draft"} sx={{ bgcolor: item.isPublished ? ui.greenSoft : "#f2f4f7", color: item.isPublished ? ui.green : ui.muted, fontWeight: 800 }} />
                  </Stack>
                  <Typography sx={{ mt: 1, fontSize: 12, color: ui.muted }}>{item.completeness || 0}/4 profile sections complete</Typography>
                </Box>
              ))}
              {!dieticians.length && <Typography sx={{ p: 3, color: ui.muted }}>No dieticians found.</Typography>}
            </Stack>
          )}
        </Paper>

        <Paper elevation={0} sx={{ border: `1px solid ${ui.line}`, borderRadius: 3, bgcolor: "#fff", p: { xs: 1.5, md: 2 } }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
              <Avatar src={profile.imageUrl || DEMO_EXPERT_IMAGE} sx={{ width: 96, height: 96, border: `1px solid ${ui.line}` }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 900, mb: 0.7 }}>Public profile image</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button component="label" variant="outlined" startIcon={<CloudUploadOutlinedIcon />} disabled={uploading} sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2 }}>
                    {uploading ? "Uploading..." : "Upload image"}
                    <input hidden type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} />
                  </Button>
                  <TextField size="small" fullWidth value={profile.imageUrl || ""} onChange={(event) => setProfile({ ...profile, imageUrl: event.target.value })} placeholder="or paste image URL" />
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 800 }}>Published</Typography>
                <Switch checked={!!profile.isPublished} onChange={(event) => setProfile({ ...profile, isPublished: event.target.checked })} />
              </Stack>
            </Stack>

            <Divider />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
              <TextField label="Display name" value={profile.displayName || ""} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
              <TextField label="Public title" value={profile.title || ""} onChange={(event) => setProfile({ ...profile, title: event.target.value })} />
              <TextField label="Signature text" value={profile.signatureText || ""} onChange={(event) => setProfile({ ...profile, signatureText: event.target.value })} />
            </Box>
            <TextField label="Bio shown on checkout" multiline minRows={3} value={profile.bio || ""} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />

            <Divider />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 950 }}>Credential badges</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setProfile((current) => ({ ...current, badges: [...current.badges, { label: "", iconType: "verified", active: true, sortOrder: current.badges.length }] }))}>Add</Button>
              </Stack>
              <Stack spacing={1}>
                {(profile.badges || []).map((badge, index) => (
                  <Stack key={index} direction="row" spacing={1} alignItems="center">
                    <TextField size="small" fullWidth label={`Badge ${index + 1}`} value={badge.label || ""} onChange={(event) => updateBadge(index, { label: event.target.value })} />
                    <Switch checked={badge.active !== false} onChange={(event) => updateBadge(index, { active: event.target.checked })} />
                    <IconButton onClick={() => setProfile((current) => ({ ...current, badges: current.badges.filter((_, i) => i !== index) }))}><DeleteOutlineIcon /></IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 950 }}>Testimonials</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setProfile((current) => ({ ...current, testimonials: [...current.testimonials, { customerName: "", city: "", rating: 5, hba1cFrom: "", hba1cTo: "", text: "", imageUrl: "", active: true, sortOrder: current.testimonials.length }] }))}>Add</Button>
              </Stack>
              <Stack spacing={1.2}>
                {(profile.testimonials || []).map((item, index) => (
                  <Card key={index} variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography sx={{ fontWeight: 900 }}>Testimonial {index + 1}</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Switch checked={item.active !== false} onChange={(event) => updateTestimonial(index, { active: event.target.checked })} />
                        <IconButton onClick={() => setProfile((current) => ({ ...current, testimonials: current.testimonials.filter((_, i) => i !== index) }))}><DeleteOutlineIcon /></IconButton>
                      </Stack>
                    </Stack>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 90px" }, gap: 1 }}>
                      <TextField size="small" label="Customer name" value={item.customerName || ""} onChange={(event) => updateTestimonial(index, { customerName: event.target.value })} />
                      <TextField size="small" label="City" value={item.city || ""} onChange={(event) => updateTestimonial(index, { city: event.target.value })} />
                      <TextField size="small" label="Rating" type="number" value={item.rating || 5} onChange={(event) => updateTestimonial(index, { rating: event.target.value })} />
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr" }, gap: 1, mt: 1 }}>
                      <TextField size="small" label="HbA1c before" value={item.hba1cFrom || ""} onChange={(event) => updateTestimonial(index, { hba1cFrom: event.target.value })} placeholder="e.g. 9.2%" />
                      <TextField size="small" label="HbA1c after" value={item.hba1cTo || ""} onChange={(event) => updateTestimonial(index, { hba1cTo: event.target.value })} placeholder="e.g. 6.8%" />
                    </Box>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }} alignItems={{ xs: "stretch", sm: "center" }}>
                      <Avatar src={item.imageUrl || ""} sx={{ width: 44, height: 44, bgcolor: "#f2f4f7", color: ui.muted }}>
                        {!item.imageUrl && <PersonOutlineIcon fontSize="small" />}
                      </Avatar>
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<CloudUploadOutlinedIcon />}
                        disabled={uploading}
                        sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2, flex: "0 0 auto" }}
                      >
                        Upload customer image
                        <input hidden type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0], (url) => updateTestimonial(index, { imageUrl: url }))} />
                      </Button>
                      <TextField fullWidth size="small" label="Customer image URL optional" value={item.imageUrl || ""} onChange={(event) => updateTestimonial(index, { imageUrl: event.target.value })} />
                    </Stack>
                    <TextField sx={{ mt: 1 }} fullWidth multiline minRows={2} label="Testimonial" value={item.text || ""} onChange={(event) => updateTestimonial(index, { text: event.target.value })} />
                  </Card>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Paper>

        <ProfilePreview profile={profile} />
      </Box>
    </Box>
  );
}

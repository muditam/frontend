import React, { useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import EscalationsPage from "./EscalationsPage";
import SupportTicketsPage from "./SupportTicketsPage";

export default function EscalationsWorkspace() {
  const [tab, setTab] = useState("legacy");
  return <Box sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: "#f6f8fc", minHeight: "100%" }}>
    <Paper elevation={0} sx={{ mb: 2, px: 2, pt: 1.75, border: "1px solid #dbe2ea", borderRadius: 3 }}>
      <Typography sx={{ px: 1, fontSize: { xs: 22, md: 28 }, fontWeight: 800, color: "#0f172a" }}>Escalations</Typography>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 1 }}>
        <Tab value="tickets" label="Support tickets" sx={{ textTransform: "none", fontWeight: 700 }} />
        <Tab value="legacy" label="Legacy escalations" sx={{ textTransform: "none", fontWeight: 700 }} />
      </Tabs>
    </Paper>
    {tab === "tickets" ? <SupportTicketsPage /> : <EscalationsPage />}
  </Box>;
}

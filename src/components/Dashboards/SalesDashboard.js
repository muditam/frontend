import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AgentDashboard from "../../Dashboards/AgentDashboard";
import RetentionAgentDashboard from "../../Dashboards/RetentionDashboard";
import ManagerSalesDashboard from "../../Dashboards/MasterSalesDashboard";
import ManagerRetentionDashboard from "../../Dashboards/MasterRetentionDashboard";
import FinanceDashboard from "../../Dashboards/FinanceDashboard";
import OperationsDashboard from "../../Dashboards/OperationsDashboard";
import { Box, Button, Typography } from "@mui/material";
// import TeamLeaderDashboardRetentionOnly from "../../Dashboards/TeamLeaderDashboard";
import MarketingDashboard from "../../Dashboards/MarketingDashboard";
import SuperAdminAnalytics from "../../pages/SuperAdminAnalytics";
import ItManagerDashboard from "../../Dashboards/ITManagerDashboard";

const SalesDashboard = () => {
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState("Sales");
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [revertLoading, setRevertLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);    
  const [originalUser, setOriginalUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const userStr = sessionStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user || !user.role) {
      navigate("/login");
      return;
    }

    setRole(user.role);
    setCurrentUser(user);

const storedTab = sessionStorage.getItem("activeTab");
if (storedTab === "Retention" || storedTab === "Analytics") {
  setActiveTab(storedTab);
}

    // check if we are impersonating
    const originalStr = sessionStorage.getItem("originalUser");
    if (originalStr) {
      setIsImpersonating(true);
      try {
        setOriginalUser(JSON.parse(originalStr));
      } catch {
        // if parse fails, clear it so banner doesn't show incorrectly
        sessionStorage.removeItem("originalUser");
        sessionStorage.removeItem("switchMeta");
        setIsImpersonating(false);
      }
    }
  }, [navigate]);

  const switchTab = (tabName) => {
    setActiveTab(tabName);
    sessionStorage.setItem("activeTab", tabName);
  };

  // FRONT-END ONLY revert: restore originalUser from sessionStorage
  const handleRevert = () => {
    try {
      setRevertLoading(true);

      const originalStr = sessionStorage.getItem("originalUser");
      if (!originalStr) {
        console.warn("No originalUser found in sessionStorage");
        setRevertLoading(false);
        return;
      }

      const original = JSON.parse(originalStr);

      // restore real user
      sessionStorage.setItem("user", JSON.stringify(original));

      // clear impersonation so button disappears and you can switch to others again
      sessionStorage.removeItem("originalUser");
      sessionStorage.removeItem("switchMeta");
      // full reload so entire app picks up correct user
      window.location.reload();
    } catch (e) {
      console.error("Error while reverting impersonation:", e);
      setRevertLoading(false);
    }
  };

  if (!role) return <div>Loading...</div>;

  return (
  <div> 
    {isImpersonating && originalUser && (
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: (t) => t.zIndex.appBar + 2,
          px: 2,
          py: 1,
          mb: 2,
          backgroundColor: "#FFF3CD",
          border: "1px solid #FFEEBA",
        }}
      >
        <Box
          sx={{
            maxWidth: 1280,
            mx: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "center", md: "space-between" },
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              color: "#856404",
              textAlign: { xs: "center", md: "left" },
            }}
          >
            You are viewing dashboard as{" "}
            <strong>{currentUser?.fullName || "another user"}</strong>. Logged in
            as <strong>{originalUser.fullName || originalUser.email}</strong>.
            Click to return to your own dashboard.
          </Typography>


          <Button
            variant="contained"
            size="small"
            onClick={handleRevert}
            disabled={revertLoading}
            sx={{
              textTransform: "none",
              backgroundColor: "#856404",
              "&:hover": { backgroundColor: "#704f07" },
              alignSelf: { xs: "center", md: "auto" },
              minWidth: { xs: "auto", md: 260 },
            }}
          >
            {revertLoading
              ? "Returning..."
              : `Back to ${originalUser.fullName || "my"} dashboard`}
          </Button>
        </Box>
      </Box>
    )}


    {role === "Manager" && (
      <>
        {/* Tabs Section */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "25px",
            padding: "15px",
          }}
        >
          <div style={{ display: "flex", gap: "10px" }}>
            {/* Sales Button */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => switchTab("Sales")}
                style={{
                  padding: "12px 30px",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: activeTab === "Sales" ? "#fff" : "#333",
                  backgroundColor: activeTab === "Sales" ? "#000" : "#e9ecef",
                  border: "none",
                  borderRadius: "5px",
                  boxShadow:
                    activeTab === "Sales"
                      ? "0 2px 4px rgba(0,0,0,0.2)"
                      : "none",
                  transition: "all 0.5s ease",
                }}
              >
                Sales Dashboard
              </button>
              <Box
                sx={{
                  height: "2px",
                  backgroundColor:
                    activeTab === "Sales" ? "#FFC107" : "transparent",
                  width: "100%",
                  borderRadius: "2px",
                  mt: "4px",
                }}
              />
            </div>


            {/* Retention Button */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => switchTab("Retention")}
                style={{
                  padding: "12px 30px",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: activeTab === "Retention" ? "#fff" : "#333",
                  backgroundColor:
                    activeTab === "Retention" ? "#000" : "#e9ecef",
                  border: "none",
                  borderRadius: "5px",
                  boxShadow:
                    activeTab === "Retention"
                      ? "0 2px 4px rgba(0,0,0,0.2)"
                      : "none",
                  transition: "all 0.5s ease",
                }}
              >
                Retention Dashboard
              </button>
              <Box
                sx={{
                  height: "2px",
                  backgroundColor:
                    activeTab === "Retention" ? "#FFC107" : "transparent",
                  width: "100%",
                  borderRadius: "2px",
                  mt: "4px",
                }}
              />
            </div>


            {/* Analytics Button (3rd tab - right of Retention) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => switchTab("Analytics")}
                style={{
                  padding: "12px 30px",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: activeTab === "Analytics" ? "#fff" : "#333",
                  backgroundColor:
                    activeTab === "Analytics" ? "#000" : "#e9ecef",
                  border: "none",
                  borderRadius: "5px",
                  boxShadow:
                    activeTab === "Analytics"
                      ? "0 2px 4px rgba(0,0,0,0.2)"
                      : "none",
                  transition: "all 0.5s ease",
                }}
              >
                Analytics
              </button>
              <Box
                sx={{
                  height: "2px",
                  backgroundColor:
                    activeTab === "Analytics" ? "#FFC107" : "transparent",
                  width: "100%",
                  borderRadius: "2px",
                  mt: "4px",
                }}
              />
            </div>
          </div>
        </div>


        {/* Active Tab Content */}
        <div style={{ padding: "20px" }}>
          {activeTab === "Sales" && <ManagerSalesDashboard />}
          {activeTab === "Retention" && <ManagerRetentionDashboard />}
          {activeTab === "Analytics" && <SuperAdminAnalytics />}
        </div>
      </>
    )}


    {role === "Sales Agent" && <AgentDashboard />}
    {role === "Retention Agent" && <RetentionAgentDashboard />}
    {/* {role === "Team Leader" && <TeamLeaderDashboardRetentionOnly />} */}
    {role === "Finance" && <FinanceDashboard />}
    {role === "Operations" && <OperationsDashboard />}
    {role === "Marketing" && <MarketingDashboard />}
    {role === "Human Resource" && <ItManagerDashboard />}
  </div>
);
};

export default SalesDashboard;

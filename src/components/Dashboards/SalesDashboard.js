import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AgentDashboard from "../../Dashboards/AgentDashboard";
import RetentionAgentDashboard from "../../Dashboards/RetentionDashboard";
import ManagerSalesDashboard from "../../Dashboards/MasterSalesDashboard";
import ManagerRetentionDashboard from "../../Dashboards/MasterRetentionDashboard";
import { Box } from "@mui/material";


const SalesDashboard = () => {
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState("Sales");

  const navigate = useNavigate();

  // On mount: get user role and restore last‐selected tab
  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user || !user.role) {
      navigate("/login");
      return;
    }
    setRole(user.role);

    const storedTab = sessionStorage.getItem("activeTab");
    if (storedTab === "Retention") {
      setActiveTab("Retention");
    }
    // otherwise defaults to "Sales"
  }, [navigate]);


  // Handler that updates both state and sessionStorage
  const switchTab = (tabName) => {
    setActiveTab(tabName);
    sessionStorage.setItem("activeTab", tabName);
  };

  if (!role) return <div>Loading...</div>;

  return (
    <div>
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

            {/* Sales Button */}
            <div style={{ display: "flex", gap: "10px" }}>
              {/* Sales Button */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
                    boxShadow: activeTab === "Sales" ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
                    transition: "all 0.5s ease",
                  }}
                >
                  Sales Dashboard
                </button>
                <Box
                  sx={{
                    height: "2px",
                    backgroundColor: activeTab === "Sales" ? "#FFC107" : "transparent",
                    width: "100%",
                    borderRadius: "2px",
                    mt: "4px",
                  }}
                />
              </div>

              {/* Retention Button */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <button
                  onClick={() => switchTab("Retention")}
                  style={{
                    padding: "12px 30px",
                    cursor: "pointer",
                    fontSize: "16px",
                    color: activeTab === "Retention" ? "#fff" : "#333",
                    backgroundColor: activeTab === "Retention" ? "#000" : "#e9ecef",
                    border: "none",
                    borderRadius: "5px",
                    boxShadow: activeTab === "Retention" ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
                    transition: "all 0.5s ease",
                  }}
                >
                  Retention Dashboard
                </button>
                <Box
                  sx={{
                    height: "2px",
                    backgroundColor: activeTab === "Retention" ? "#FFC107" : "transparent",
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
            {activeTab === "Sales" ? <ManagerSalesDashboard /> : <ManagerRetentionDashboard />}
          </div>
        </>
      )}
      {role === "Sales Agent" && <AgentDashboard />}
      {role === "Retention Agent" && <RetentionAgentDashboard />}
    </div>
  );
};

export default SalesDashboard;
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AgentDashboard from "../../Dashboards/AgentDashboard";
import RetentionAgentDashboard from "../../Dashboards/RetentionDashboard";
import ManagerSalesDashboard from "../../Dashboards/MasterSalesDashboard";
import ManagerRetentionDashboard from "../../Dashboards/MasterRetentionDashboard";
import TeamLeaderDashboard from "../../Dashboards/TeamLeaderDashboard";
import FinanceDashboard from "../../Dashboards/FinanceDashboard";
import OperationsDashboard from "../../Dashboards/OperationsDashboard";
import { Box } from "@mui/material";
// import TeamLeaderDashboardRetentionOnly from "../../Dashboards/TeamLeaderDashboard";
import MarketingDashboard from "../../Dashboards/MarketingDashboard";
import SuperAdminAnalytics from "../../pages/SuperAdminAnalytics";
import ItManagerDashboard from "../../Dashboards/ITManagerDashboard";
import SuperAdminDashboard from "../../Dashboards/SuperAdminDashboard";


const SalesDashboard = () => {
 const [role, setRole] = useState(null);
 const [activeTab, setActiveTab] = useState("Sales");
 const [currentUser, setCurrentUser] = useState(null);   


 const navigate = useNavigate();
 const normalizedRole = String(role || "").trim().toLowerCase();
 const hasTeam = Boolean(currentUser?.hasTeam);
 const isTeamLeaderLikeRole =
   hasTeam &&
   (normalizedRole === "team leader" ||
     normalizedRole === "team-leader" ||
     normalizedRole === "assistant team lead" ||
     normalizedRole === "retention agent" ||
     normalizedRole === "sales agent");
 const isManagerStyleDashboardRole =
   normalizedRole === "manager";


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
 }, [navigate]);


 const switchTab = (tabName) => {
   setActiveTab(tabName);
   sessionStorage.setItem("activeTab", tabName);
 };

 if (!role) return <div>Loading...</div>;


 return (
 <div>
   {isManagerStyleDashboardRole && (
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




   {isTeamLeaderLikeRole && <TeamLeaderDashboard />}
   {normalizedRole === "sales agent" && !hasTeam && <AgentDashboard />}
   {normalizedRole === "retention agent" && !hasTeam && <RetentionAgentDashboard />}
   {/* {role === "Team Leader" && <TeamLeaderDashboardRetentionOnly />} */}
   {normalizedRole === "finance" && <FinanceDashboard />}
   {normalizedRole === "operations" && <OperationsDashboard />}
   {normalizedRole === "marketing" && <MarketingDashboard />}
   {normalizedRole === "human resource" && <ItManagerDashboard />}
   {(normalizedRole === "super admin" || normalizedRole === "superadmin" || normalizedRole === "super-admin") && <SuperAdminDashboard />}
 </div>
);
};


export default SalesDashboard;



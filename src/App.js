import React from "react";
import "./global.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BulkDataUpload from "./components/BulkDataUpload";
import AddEmployee from "./pages/AddEmployee";
import LeadTable from "./pages/master/MasterLeads";
import RetentionTable from "./pages/master/MasterRetention";
import NewOrders from "./pages/master/MasterNewOrders";
import RetentionOrders from "./pages/master/MasterRetentionOrders";
import DuplicateNumbers from "./pages/master/DuplicateNumbers";
import SalesMyLeads from "./pages/sales/SalesMyLeads";
import SalesMySales from "./pages/sales/SalesMySales";
import RetentionLeads from "./pages/retention/RetentionLeads";
import RetentionSales from "./pages/retention/RetentionSales";
import ShipwayOrders from "./pages/Home";
import Login from "./pages/Login";
import NavbarWithSearch from "./components/TopBars/NavBarwithSearch";
import SalesDashboard from "./components/Dashboards/SalesDashboard";
import OrdersTable from "./ShopifyOrders/AllShopifyOrders";
import OnlineOrders from "./ShopifyOrders/OnlineOrders";
import TransferRequests from "./components/LeadRequests/TransferRequest";
import LeadDetail from "./components/LeadRequests/LeadDetails";
import RetentionData from "./pages/filtered/Retention";
import AcquisitionLost from "./Lostdata/AcquisitionLost";
import RetentionLost from "./Lostdata/RetentionLost";
import PrivateRoute from "./components/PrivateRoute";
import MyTemplates from "./components/MyTemplates";
import LeadManagement from './LeadConsultation/LeadManagement';
import EscalationsPage from './components/EscalationsPage';
import TeamPage from "./components/TeamPage";
import GrowthTracker from "./components/GrowthTracker";
import Leaderboard from "./components/Leaderboard";
import BloomLeaderboard from "./components/BloomLeaderboard";
import DeliveredSalesRecord from "./components/DeliveredSalesRecord";
import DeliveredHistory from "./components/TopBars/DeliveredHistory";
import ShipmentDetails from "./pages/filtered/ShipmentDetails";
import FinanceOrderSummary from "./components/Finance/FinanceOrderSummary";
import RazorpaySettlement from "./components/Finance/Payments/RazorpaySettlement";
import EasebuzzPayout from "./components/Finance/Payments/GokwikSettlement";
import PhonePePayout from "./components/Finance/Payments/PhonepeSettlement";
import BluedartUpload from "./components/Finance/Cod-remittance/BlueDart";
import Delhivery from "./components/Finance/Cod-remittance/Delhivery";
import DTDC from "./components/Finance/Cod-remittance/DtdcUpload";
import OrderSummeryForOperations from "./components/Operation/OrderSummeryForOperations";
import ReturnOrders from "./components/Operation/ReturnOrders";
import AbandonedCheckouts from "./components/AbandonedCheckouts";
import UndeliveredOrders from "./components/Operation/UndeliveredOrders";
import SmartfloCallLogs from "./components/SmartfloCallLogs";
import SmartfloDataAnalytics from "./components/SmartfloDataAnalytics";
import ReturnDeliveredOrders from "./components/ReturnDeliveredOrders";
import DietTemplateAdmin from "./components/DietTemplateAdmin";
import AllProducts from "./components/all-products";
import OrderConfirmations from "./components/OrderConfirmations";
import LeadExpertMigration from "./components/LeadExpertMigration";
import AssetManager from "./components/AssetManager";
import ScheduleCall from "./components/ScheduleCallsData";
import OrderConfirmAnalytics from "./components/OrderConfirmAnalytics";  
import AssetsManagerRole from "./components/AssetsManagerRole"; 
import AssetAllotment from "./components/AssetAllotment"; 
import BankReconciliation from "./components/Finance/BankReconciliation";
import BankCapital6389 from "./components/Finance/BankCapital6389";
import BankAxis3361 from "./components/Finance/BankAxis3361";
import BankCc1101 from "./components/Finance/BankCc1101";
import BankYesCcTejasv from "./components/Finance/BankYesCcTejasv";
import BankYesCcAbhay from "./components/Finance/BankYesCcAbhay";
import TaskBoard from "./components/Dashboards/TaskBoard";
import MyReporting from "./components/Dashboards/MyReporting";
// import purchaseRecord from "./components/Finance/PurchaseRecord";
// import paymentRecord from "./components/Finance/paymentRecord";
// import Vendors from "./components/Finance/Vendors";
import "./realtime/IncomingCallSSEBoot";

const App = () => {
  return (
    <Router>
      <div>
        <NavbarWithSearch />

        <Routes>
          <Route
            path="/shipment-details"
            element={
              <ShipmentDetails />
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/pages/Home" element={<ShipwayOrders />} />
          <Route path="/smartflo/call-logs" element={<SmartfloCallLogs />} />
          <Route path="/smartflo/data-analytics" element={<SmartfloDataAnalytics />} />
          <Route path="/assets" element={<AssetManager />} /> 
          <Route path="/add-new-asset" element={<AssetsManagerRole />} /> 
          <Route path="/AssetAllotment" element={<AssetAllotment />} />
          <Route path="/BankReconciliation" element={<BankReconciliation />} />
          <Route path="/BankCapital6389" element={<BankCapital6389 />} />
          <Route path="/BankAxis3361" element={<BankAxis3361 />} />
          <Route path="/BankCc1101" element={<BankCc1101 />} />
          <Route path="/BankYesCcTejasv" element={<BankYesCcTejasv />} />
          <Route path="/BankYesCcAbhay" element={<BankYesCcAbhay />} />
          <Route path="/task-board" element={<TaskBoard />} />
          <Route path="/my-reporting" element={<MyReporting />} />
          {/* <Route path="/purchase-record" element={<purchaseRecord />} />
          <Route path="/payment-record" element={<paymentRecord />} />
          <Route path="/vendors" element={<Vendors />} /> */}

          <Route
            path="/" 
            element={
              <PrivateRoute>
                <SalesDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/lead/:id"
            element={
              <PrivateRoute>
                <LeadDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/transfer-requests"
            element={
              <PrivateRoute>
                <TransferRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/leadmanagement"
            element={
              <PrivateRoute>
                <LeadManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/bulk-data-upload"
            element={
              <PrivateRoute>
                <BulkDataUpload />
              </PrivateRoute>
            }
          />
          <Route
            path="/all-shopify-orders"
            element={
              <PrivateRoute>
                <OrdersTable />
              </PrivateRoute>
            }
          />
          <Route
            path="/online-orders"
            element={
              <PrivateRoute>
                <OnlineOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-employee"
            element={
              <PrivateRoute>
                <AddEmployee />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/leads"
            element={
              <PrivateRoute>
                <LeadTable />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/retention"
            element={
              <PrivateRoute>
                <RetentionTable />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/new-orders"
            element={
              <PrivateRoute>
                <NewOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/retention-orders"
            element={
              <PrivateRoute>
                <RetentionOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/master/Duplicates"
            element={
              <PrivateRoute>
                <DuplicateNumbers />
              </PrivateRoute>
            }
          />
          <Route
            path="/sales/my-leads"
            element={
              <PrivateRoute>
                <SalesMyLeads />
              </PrivateRoute>
            }
          />
          <Route
            path="/sales/my-sales"
            element={
              <PrivateRoute>
                <SalesMySales />
              </PrivateRoute>
            }
          />
          <Route
            path="/retention/leads"
            element={
              <PrivateRoute>
                <RetentionLeads />
              </PrivateRoute>
            }
          />
          <Route
            path="/retention/sales"
            element={
              <PrivateRoute>
                <RetentionSales />
              </PrivateRoute>
            }
          />
          <Route
            path="/retention/:filterType"
            element={
              <PrivateRoute>
                <RetentionData />
              </PrivateRoute>
            }
          />

          <Route
            path="/lost/acquisition"
            element={
              <PrivateRoute>
                <AcquisitionLost />
              </PrivateRoute>
            }
          />
          <Route
            path="/escalations"
            element={
              <PrivateRoute>
                <EscalationsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/lost/retention"
            element={
              <PrivateRoute>
                <RetentionLost />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-templates"
            element={
              <PrivateRoute>
                <MyTemplates />
              </PrivateRoute>
            }
          />
          <Route
            path="/team"
            element={
              <PrivateRoute>
                <TeamPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-growth-plan"
            element={
              <PrivateRoute>
                <GrowthTracker />
              </PrivateRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <PrivateRoute>
                <Leaderboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/bloom-leaderboard"
            element={
              <PrivateRoute>
                <BloomLeaderboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/delivered-sales-record"
            element={
              <PrivateRoute>
                <DeliveredSalesRecord />
              </PrivateRoute>
            }
          />
          <Route
            path="/aband"
            element={
              <PrivateRoute>
                <AbandonedCheckouts />
              </PrivateRoute>
            }
          />
          <Route
            path="/delivered-history"
            element={
              <PrivateRoute>
                <DeliveredHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/order-summary"
            element={
              <PrivateRoute>
                <FinanceOrderSummary />
              </PrivateRoute>
            }
          />
          <Route
            path="/gateway/razorpay"
            element={
              <PrivateRoute>
                <RazorpaySettlement />
              </PrivateRoute>
            }
          />
          <Route
            path="/gateway/easebuzz"
            element={
              <PrivateRoute>
                <EasebuzzPayout />
              </PrivateRoute>
            }
          />
          <Route
            path="/gateway/phonepe"
            element={
              <PrivateRoute>
                <PhonePePayout />
              </PrivateRoute>
            }
          />
          <Route
            path="/remittance/bluedart"
            element={
              <PrivateRoute>
                <BluedartUpload />
              </PrivateRoute>
            }
          />
          <Route
            path="/remittance/delhivery"
            element={
              <PrivateRoute>
                <Delhivery />
              </PrivateRoute>
            }
          />
          <Route
            path="/remittance/dtdc"
            element={
              <PrivateRoute>
                <DTDC />
              </PrivateRoute>
            }
          />
          <Route
            path="/operations/undelivered-orders"
            element={
              <PrivateRoute>
                <OrderSummeryForOperations />
              </PrivateRoute>
            }
          />
          <Route
            path="/operations/rto-delivered"
            element={
              <PrivateRoute>
                <ReturnOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/Agent-return"
            element={
              <PrivateRoute>
                <ReturnDeliveredOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/all-products"
            element={
              <PrivateRoute>
                <AllProducts />
              </PrivateRoute>
            }
          />
          <Route
            path="/diet-template"
            element={
              <PrivateRoute>
                <DietTemplateAdmin />
              </PrivateRoute>
            }
          />
          <Route
            path="/order-confirmations"
            element={
              <PrivateRoute>
                <OrderConfirmations />
              </PrivateRoute>
            }
          />
          <Route
            path="/operations/undelivered"
            element={
              <PrivateRoute>
                <UndeliveredOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/lead-migration"
            element={
              <PrivateRoute>
                <LeadExpertMigration />
              </PrivateRoute>
            }
          />
          <Route
            path="/order-confirmations/analytics"
            element={
              <PrivateRoute>
                <OrderConfirmAnalytics />
              </PrivateRoute>
            }
          />
          <Route
            path="/schedule-calls"
            element={
              <PrivateRoute>
                <ScheduleCall />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

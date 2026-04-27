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
import CashfreePayout from "./components/Finance/Payments/CashfreeUpload";
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
import AssetsManagerRole from "./components/AddAsset"; 
import AssetAllotment from "./components/AssetAllotment"; 
import MyAssets from "./components/MyAssets";
import BankReconciliation from "./components/Finance/BankReconciliation";
import BankCapital6389 from "./components/Finance/BankCapital6389";
import BankAxis3361 from "./components/Finance/BankAxis3361";
import BankCc1101 from "./components/Finance/BankCc1101";
import BankYesCcTejasv from "./components/Finance/BankYesCcTejasv";
import BankYesCcAbhay from "./components/Finance/BankYesCcAbhay";
import BankKotak from "./components/Finance/BankKotak";
import TaskBoard from "./components/Dashboards/TaskBoard";
import MyReporting from "./components/Dashboards/MyReporting";
import PurchaseRecord from "./components/Finance/PurchaseRecordsPage"; 
import PaymentRecords from "./components/Finance/PaymentRecordsPage";
import Vendors from "./components/Finance/VendorPage";
import SwitchDashboard from "./components/Finance/SwitchDashboard";
import ConfirmedOrder from "./components/OrderConf/ConfirmedOrder";
import GlobalShopifyOrders from "./International/Shopify/GlobalShopifyOrders";
import GlobalAbandonedCarts from "./International/Shopify/GlobalAbandonedCarts";
import GlobalRetentionLeads from "./International/InternationlLeads/GlobalRetentionLeads";
import GlobalRetentionSales from "./International/InternationlLeads/GlobalRetentionSales";
import AccessManagement from "./components/AccessManagement"; 
import AdminAccessRequests from "./components/AdminAccessRequests";
import Invoices from "./pages/Invoices";
import UnassignedDeliveredOrders from "./components/UnassignedDeliveredOrders";
import SuperAdminAnalytics from "./pages/SuperAdminAnalytics"; 
import AbandonedAnalyticsPage from "./pages/AbandonedAnalytics";
import IncentiveCreation from "./components/TopBars/IncentiveCreation";
import WhatsAppUI from "./whatsaap/WhatsAppUI"
import TemplatePanel from "./whatsaap/TemplatesPanel"
import "./realtime/IncomingCallSSEBoot"; 
import WhatsAppNotification from "./whatsaap/WhatsAppNotification";
import ManagerRoute from "./components/ManagerRoute";
import Cutpage from './Marketing/Cutpage';
import Postpage from './Marketing/Postpage';
import Editpage from './Marketing/Editpage';
import Scriptpage from './Marketing/Scriptpage';
import ShootPage from "./Marketing/Shootpage"; 
import OtherVideoIdeationPage from "./Marketing/othervideo/OtherVideoIdeationPage"; 
import OtherVideoShootPage from "./Marketing/othervideo/OtherVideoShootPage";
import OtherVideoCutPage from "./Marketing/othervideo/OtherVideoCutPage";
import OtherVideoEditPage from "./Marketing/othervideo/OtherVideoEditPage";
import OtherVideoPostPage from "./Marketing/othervideo/OtherVideoPostPage";
import StaticCarouselIdeationPage from "./Marketing/staticCarousel/StaticCarouselIdeationPage";
import StaticCarouselShootPage from "./Marketing/staticCarousel/StaticCarouselShootPage";
import StaticCarouselCutPage from "./Marketing/staticCarousel/StaticCarouselCutPage";
import StaticCarouselEditPage from "./Marketing/staticCarousel/StaticCarouselEditPage";
import StaticCarouselPostPage from "./Marketing/staticCarousel/StaticCarouselPostPage";
import AdsIdeationPage from "./Marketing/ads/AdsIdeationPage";
import AdsShootPage from "./Marketing/ads/AdsShootPage";
import AdsCutPage from "./Marketing/ads/AdsCutPage";
import AdsEditPage from "./Marketing/ads/AdsEditPage";
import AdsPostPage from "./Marketing/ads/AdsPostPage"; 
import LeadUtmLinkGenerator from "./components/LeadUtmLinkGenerator";
import UnicommerceOrdersPage from "./components/UnicommerceOrdersPage";
import IncentivesPage from "./pages/IncentivesPage";
import SOPMasterPage from "./pages/SOPMasterPage"; 
import RewardsAdminPage from "./pages/RewardsAdminPage"; 
import KnowledgeBaseManager from "./pages/KnowledgeBaseManager";
import OrganisationTree from "./pages/OrganisationTree";
import DietImageMigrationAdmin from "./components/DietImageMigrationAdmin";

const App = () => {
  return (
    <Router>
      <div>
        <NavbarWithSearch />
        <WhatsAppNotification />

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
          <Route path="/AssetAllotment" element={<AssetAllotment />} />
          <Route path="/BankReconciliation" element={<BankReconciliation />} />
          <Route path="/BankCapital6389" element={<BankCapital6389 />} />
          <Route path="/BankAxis3361" element={<BankAxis3361 />} />
          <Route path="/BankCc1101" element={<BankCc1101 />} />
          <Route path="/BankYesCcTejasv" element={<BankYesCcTejasv />} />
          <Route path="/BankYesCcAbhay" element={<BankYesCcAbhay />} />
          <Route path="/BankKotak" element={<BankKotak />} />
          <Route path="/purchase-record" element={<PurchaseRecord />} />
          <Route path="/payment-record" element={<PaymentRecords />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/super-admin-analytics" element={<SuperAdminAnalytics />} /> 
          <Route path="/abandoned-analytics" element={<AbandonedAnalyticsPage />} />
          <Route path="/whatsaap/chat" element={<WhatsAppUI />} />
          <Route path="/OtherVideo/Ideation" element={<OtherVideoIdeationPage />} />
          <Route path="/OtherVideo/Shoot" element={<OtherVideoShootPage />} />
          <Route path="/OtherVideo/Cut" element={<OtherVideoCutPage />} />
          <Route path="/OtherVideo/Edit" element={<OtherVideoEditPage />} />
          <Route path="/OtherVideo/Post" element={<OtherVideoPostPage />} />
          <Route path="/staticCarousel/Ideation" element={<StaticCarouselIdeationPage />} />
          <Route path="/staticCarousel/Shoot" element={<StaticCarouselShootPage />} />
          <Route path="/staticCarousel/Cut" element={<StaticCarouselCutPage />} />
          <Route path="/staticCarousel/Edit" element={<StaticCarouselEditPage />} />
          <Route path="/staticCarousel/Post" element={<StaticCarouselPostPage />} />
          <Route path="/Ads/Ideation" element={<AdsIdeationPage />} />
          <Route path="/Ads/Shoot" element={<AdsShootPage />} />
          <Route path="/Ads/Cut" element={<AdsCutPage />} />
          <Route path="/Ads/Edit" element={<AdsEditPage />} />
          <Route path="/Ads/Post" element={<AdsPostPage />} /> 
          <Route path="/utmlink-generator" element={<LeadUtmLinkGenerator />} />
          <Route path="/unicommerce" element={<UnicommerceOrdersPage />} />
          <Route path="/incentives" element={<IncentivesPage />} />
          <Route path="/SOP-creation" element={<SOPMasterPage />} /> 
          <Route path="/Rewards-Admin-Page" element={<RewardsAdminPage />} /> 
          <Route path="/knowledge-base" element={<KnowledgeBaseManager />} />
          <Route path="/diet-image-migration-admin" element={ <DietImageMigrationAdmin /> } />

          <Route
           path="/organisation-tree"
           element={
             <PrivateRoute>
               <ManagerRoute>
                 <OrganisationTree />
               </ManagerRoute>
             </PrivateRoute>
           }
         />

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
                <ManagerRoute>
                  <AddEmployee />
                </ManagerRoute>
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
            path="/gateway/cashfree"
            element={
              <PrivateRoute>
                <CashfreePayout />
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
          <Route 
            path="/global-shopify-orders" 
            element={
              <PrivateRoute>
            <GlobalShopifyOrders />
            </PrivateRoute>
            } 
          />
          <Route 
            path="/global-aband" 
            element={
              <PrivateRoute>
                <GlobalAbandonedCarts />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/global-retention-leads" 
            element={
              <PrivateRoute>
                <GlobalRetentionLeads />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/global-retention-sales" 
            element={
              <PrivateRoute>
                <GlobalRetentionSales />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/access-management" 
            element={
              <PrivateRoute>
                <AccessManagement />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin-requests-admin" 
            element={
              <PrivateRoute>
                <AdminAccessRequests />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/unassigned-delivered-orders" 
            element={
              <PrivateRoute>
                <UnassignedDeliveredOrders />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/switch-dashboard" 
            element={
              <PrivateRoute>
                <SwitchDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/only-order-confirmation" 
            element={
              <PrivateRoute>
                <ConfirmedOrder />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/invoices" 
            element={
              <PrivateRoute>
                <Invoices />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/task-board" 
            element={
              <PrivateRoute>
                <TaskBoard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/my-reporting" 
            element={
              <PrivateRoute>
                <MyReporting />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/assets" 
            element={
              <PrivateRoute>
                <AssetManager />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/add-new-asset" 
            element={
              <PrivateRoute>
                <AssetsManagerRole />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/incentive-creation" 
            element={
              <PrivateRoute>
                <IncentiveCreation />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/template/chat" 
            element={
              <PrivateRoute>
                <TemplatePanel />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/my-assets" 
            element={
              <PrivateRoute>
                <MyAssets />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/marketing/cut" 
            element={
              <PrivateRoute>
                <Cutpage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/marketing/post" 
            element={
              <PrivateRoute>
                <Postpage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/marketing/edit" 
            element={
              <PrivateRoute>
                <Editpage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/marketing/script" 
            element={
              <PrivateRoute>
                <Scriptpage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/marketing/shoot" 
            element={
              <PrivateRoute>
                <ShootPage />
              </PrivateRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

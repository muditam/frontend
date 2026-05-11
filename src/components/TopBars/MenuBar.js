import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LogoutIcon from "@mui/icons-material/Logout";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import HomeIcon from "@mui/icons-material/Home";
import AssignmentIcon from "@mui/icons-material/Assessment";
import DescriptionIcon from "@mui/icons-material/Description";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import FolderIcon from "@mui/icons-material/Folder";
import PersonIcon from "@mui/icons-material/Person";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DeleteIcon from "@mui/icons-material/Delete";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import CampaignIcon from "@mui/icons-material/Campaign";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import StorefrontIcon from "@mui/icons-material/Storefront";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');

  .sidebar {
    width: 280px;
    height: 100vh;
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    font-family: 'DM Sans', sans-serif;
    position: fixed;
    left: 0;
    top: 0;
    z-index: 1200;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    background: #ffffff;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-icon {
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .brand-icon svg {
    font-size: 18px !important;
    color: #fff !important;
  }

  .brand-text {
    display: flex;
    flex-direction: column;
  }

  .brand-name {
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: 0.3px;
    line-height: 1.2;
  }

  .brand-subtitle {
    font-size: 10.5px;
    color: #64748b;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    font-weight: 500;
  }

  .workspace-toggle {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 4px;
    cursor: pointer;
    color: #64748b;
    display: flex;
    align-items: center;
    transition: all 0.15s ease;
  }

  .workspace-toggle:hover {
    background: #e2e8f0;
    color: #334155;
  }

  .workspace-toggle svg {
    font-size: 16px !important;
  }

  .nav-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 10px 10px 80px;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }

  .nav-scroll::-webkit-scrollbar {
    width: 3px;
  }

  .nav-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .nav-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
  }

  .nav-section-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #64748b;
    padding: 14px 12px 4px;
    user-select: none;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8.5px 12px;
    border-radius: 8px;
    cursor: pointer;
    text-decoration: none;
    color: #334155;
    font-size: 13.5px;
    font-weight: 400;
    transition: all 0.15s ease;
    position: relative;
    margin: 1px 0;
  }

  .nav-item:hover {
    background: #eef2f7;
    color: #0f172a;
  }

  .nav-item.active {
    background: #e8f0ff;
    color: #1d4ed8;
  }

  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 18px;
    background: #2563eb;
    border-radius: 0 2px 2px 0;
  }

  .nav-item-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.75;
  }

  .nav-item.active .nav-item-icon,
  .nav-item:hover .nav-item-icon {
    opacity: 1;
  }

  .nav-item-icon svg {
    font-size: 17px !important;
  }

  .nav-item-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-item-arrow {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.55;
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .nav-item-arrow svg {
    font-size: 15px !important;
  }

  .nav-item-arrow.open {
    transform: rotate(180deg);
    opacity: 0.9;
  }

  .dropdown-group {
    overflow: hidden;
    transition: max-height 0.25s ease, opacity 0.2s ease;
    max-height: 0;
    opacity: 0;
  }

  .dropdown-group.open {
    max-height: 500px;
    opacity: 1;
  }

  .sub-item {
    display: flex;
    align-items: center;
    padding: 7px 12px 7px 38px;
    border-radius: 7px;
    cursor: pointer;
    text-decoration: none;
    color: #475569;
    font-size: 12.5px;
    font-weight: 400;
    transition: all 0.15s ease;
    margin: 0.5px 0;
    position: relative;
  }

  .sub-item::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #cbd5e1;
    transition: background 0.15s ease;
  }

  .sub-item:hover {
    background: #eef2f7;
    color: #1e40af;
  }

  .sub-item:hover::before {
    background: #2563eb;
  }

  .sub-item.active {
    color: #1d4ed8;
    font-weight: 600;
  }

  .sub-item.active::before {
    background: #2563eb;
  }

  .sidebar-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 14px;
    background: rgba(248, 250, 252, 0.96);
    backdrop-filter: blur(8px);
    border-top: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    overflow: hidden;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    overflow: hidden;
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .user-name {
    font-size: 13px;
    font-weight: 500;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-email {
    font-size: 11px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .logout-btn {
    background: none;
    border: none;
    cursor: pointer;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    color: #64748b;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .logout-btn:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  .logout-btn svg {
    font-size: 16px !important;
  }

  .divider {
    height: 1px;
    background: #e2e8f0;
    margin: 6px 12px;
  }
`;

const MenuBar = ({ toggleDrawer }) => {
  const [openDropdown, setOpenDropdown] = useState({});
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem("user"));
      setUser(u);
    } catch {}
  }, []);
 
  const hasTeam = user?.hasTeam;
  const menubarPerms = user?.permissions?.menubar || {};
  const can = (key) => {
    if (Object.prototype.hasOwnProperty.call(menubarPerms, key)) {
      return !!menubarPerms[key];
    }
    if (String(key || "").startsWith("callingCenter")) return true;
    return false;
  };

  const handleDropdownClick = (menu) => {
    setOpenDropdown((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;
  const isActiveSub = (path) => location.pathname.startsWith(path);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const NavItem = ({ to, icon, label, onClick }) => (
    <Link
      to={to}
      className={`nav-item${isActive(to) ? " active" : ""}`}
      onClick={() => { onClick?.(); toggleDrawer?.(); }}
    >
      <span className="nav-item-icon">{icon}</span>
      <span className="nav-item-text">{label}</span>
    </Link>
  );

  const DropdownGroup = ({ id, icon, label, children }) => (
    <>
      <div
        className={`nav-item${openDropdown[id] ? " active" : ""}`}
        onClick={() => handleDropdownClick(id)}
        style={{ userSelect: "none" }}
      >
        <span className="nav-item-icon">{icon}</span>
        <span className="nav-item-text">{label}</span>
        <span className={`nav-item-arrow${openDropdown[id] ? " open" : ""}`}>
          <KeyboardArrowDownIcon />
        </span>
      </div>
      <div className={`dropdown-group${openDropdown[id] ? " open" : ""}`}>
        {children}
      </div>
    </>
  );

  const SubItem = ({ to, label }) => (
    <Link
      to={to}
      className={`sub-item${isActiveSub(to) ? " active" : ""}`}
      onClick={toggleDrawer}
    >
      {label}
    </Link>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <AssignmentIcon />
            </div>
            <div className="brand-text">
              <span className="brand-name">Muditam</span>
              <span className="brand-subtitle">Lead Management</span>
            </div>
          </div>
          <button className="workspace-toggle">
            <UnfoldMoreIcon />
          </button>
        </div>

        {/* Nav */}
        <div className="nav-scroll">
          {user && can("home") && (
            <NavItem to="/" icon={<HomeIcon />} label="Home" />
          )}

          {user && can("consultation") && (
            <NavItem to="/leadmanagement" icon={<ChatBubbleIcon />} label="Consultation" />
          )}

          {user && can("whatsaapChats") && (
            <NavItem to="/whatsaap/chat" icon={<WhatsAppIcon />} label="WhatsApp Chats" />
          )}

          {user && can("myTemplates") && (
            <NavItem to="/my-templates" icon={<DescriptionIcon />} label="My Templates" />
          )}

          {user && can("invoices") && (
            <NavItem to="/invoices" icon={<ReceiptLongIcon />} label="Invoices" />
          )}

          {user && can("escalations") && (
            <NavItem to="/escalations" icon={<ErrorOutlineIcon />} label="Escalations" />
          )}

          {user && hasTeam && can("team") && (
            <NavItem to="/team" icon={<PersonIcon />} label="Team" />
          )}

          {user && can("abandonedCart") && (
            <NavItem to="/aband" icon={<Inventory2Icon />} label="Abandoned Cart" />
          )}

          {user && can("accessManagement") && (
            <div className="divider" />
          )}

          {user && can("accessManagement") && (
            <NavItem to="/access-management" icon={<AssignmentIcon />} label="Access Management" />
          )}

          {user && can("adminAccessRequests") && (
            <NavItem to="/admin-requests-admin" icon={<AssignmentIcon />} label="Admin Access Requests" />
          )}

          {user && can("addEmployee") && (
            <NavItem to="/add-employee" icon={<PersonAddIcon />} label="Add Employee" />
          )}

          {/* Order Confirmations */}
          {user && can("orderConfirmationsMenu") && (
            <DropdownGroup id="orderConfirmations" icon={<ShoppingCartIcon />} label="Order Confirmations">
              {can("orderConfirmationPage") && <SubItem to="/order-confirmations" label="Order Confirmation" />}
              {can("orderAnalyticsPage") && <SubItem to="/order-confirmations/analytics" label="Order Analytics" />}
            </DropdownGroup>
          )}

          {user && can("unassignedDeliveredOrders") && (
            <NavItem to="/unassigned-delivered-orders" icon={<LocalShippingIcon />} label="Unassigned Delivered Orders" />
          )}

          {user && can("myRTOs") && (
            <NavItem to="/Agent-return" icon={<AssignmentReturnedIcon />} label="My RTOs" />
          )}

          {/* Master Data */}
          {user && can("masterDataMenu") && (
            <DropdownGroup id="masterData" icon={<FolderIcon />} label="Master Data">
              {can("masterAllLeads") && <SubItem to="/master/leads" label="All Leads" />}
              {can("masterRetentionLeads") && <SubItem to="/master/retention" label="Retention Leads" />}
              {can("masterRetentionOrders") && <SubItem to="/master/retention-orders" label="Retention Orders" />}
              {can("masterNewOrders") && <SubItem to="/master/new-orders" label="Acquisition Orders" />}
              {can("masterDuplicates") && <SubItem to="/master/Duplicates" label="Duplicate Data" />}
            </DropdownGroup>
          )}

          {/* Lost Data */}
          {user && can("lostDataMenu") && (
            <DropdownGroup id="lostData" icon={<DeleteIcon />} label="Lost Data">
              {can("lostAcquisition") && <SubItem to="/lost/acquisition" label="Acquisition Lost" />}
              {can("lostRetention") && <SubItem to="/lost/retention" label="Retention Lost" />}
            </DropdownGroup>
          )}

          {user && can("onlineOrders") && (
            <NavItem to="/online-orders" icon={<ShoppingCartIcon />} label="Online Orders" />
          )}

          {/* Sales Agent */}
          {user && can("salesAgentMenu") && (
            <DropdownGroup id="salesAgent" icon={<PersonIcon />} label="Sales Expert">
              {can("salesMyLeads") && <SubItem to="/sales/my-leads" label="My Leads" />}
              {can("salesMySales") && <SubItem to="/sales/my-sales" label="My Sales" />}
            </DropdownGroup>
          )}

          {/* Retention Agent */}
          {user && can("retentionAgentMenu") && (
            <DropdownGroup id="retentionAgent" icon={<PersonIcon />} label="Retention Expert">
              {can("retentionLeads") && <SubItem to="/retention/leads" label="Retention Leads" />}
              {can("retentionSales") && <SubItem to="/retention/sales" label="Retention Sales" />}
              {can("retentionLeads") && <SubItem to="/retention/overview-combined" label="Retention Overview Combined" />}
            </DropdownGroup>
          )}

          {/* Task Manager */}
          {user && can("taskManagerMenu") && (
            <DropdownGroup id="taskManager" icon={<CheckBoxIcon />} label="Task Manager">
              {can("taskBoard") && <SubItem to="/task-board" label="Task Management" />}
              {can("myReporting") && <SubItem to="/my-reporting" label="My Reporting" />}
            </DropdownGroup>
          )}

          {user && can("callingCenterMenu") && (
            <DropdownGroup id="callingCenter" icon={<PhoneInTalkIcon />} label="Calling Center">
              {can("callingCenterAgent") && <SubItem to="/calling-center" label="Agent Console" />}
              {can("callingCenterManager") && <SubItem to="/calling-center/manager" label="Manager Dashboard" />}
              {can("callingCenterQA") && <SubItem to="/calling-center/qa" label="QA Review" />}
            </DropdownGroup>
          )}

          {/* Analytics */}
          {user && can("allAnalyticsMenu") && (
            <DropdownGroup id="analytics" icon={<QueryStatsIcon />} label="Analytics">
              {can("superAdminAnalytics") && <SubItem to="/super-admin-analytics" label="Super Admin Analytics" />}
              {can("abandonedAnalytics") && <SubItem to="/abandoned-analytics" label="Abandoned Analytics" />}
            </DropdownGroup>
          )}

          {/* Finance */}
          {user && (can("financeOrderSummary") || can("financePrepaidRemittanceMenu") || can("financeCodRemittanceMenu") || can("financeRecordsMenu") || can("financeBankReconciliationMenu")) && (
            <div className="nav-section-label">Finance</div>
          )}

          {user && can("financeOrderSummary") && (
            <NavItem to="/order-summary" icon={<FactCheckIcon />} label="Order Summary" />
          )}

          {user && can("financePrepaidRemittanceMenu") && (
            <DropdownGroup id="paymentGateway" icon={<CompareArrowsIcon />} label="Prepaid Remittance">
              {can("financePrepaidRazorpay") && <SubItem to="/gateway/razorpay" label="Razorpay" />}
              {can("financePrepaidPhonePe") && <SubItem to="/gateway/phonepe" label="PhonePe" />}
              {can("financePrepaidEasebuzz") && <SubItem to="/gateway/easebuzz" label="Easebuzz" />}
              {can("financePrepaidCashfree") && <SubItem to="/gateway/cashfree" label="Cashfree" />}
              {can("financePrepaidBankTransfer") && <SubItem to="/gateway/bank-transfer" label="Bank Transfer" />}
            </DropdownGroup>
          )}

          {user && can("financeCodRemittanceMenu") && (
            <DropdownGroup id="remittance" icon={<TrendingUpIcon />} label="COD Remittance">
              {can("financeCodBluedart") && <SubItem to="/remittance/bluedart" label="Bluedart" />}
              {can("financeCodDTDC") && <SubItem to="/remittance/dtdc" label="DTDC" />}
              {can("financeCodDelhivery") && <SubItem to="/remittance/delhivery" label="Delhivery" />}
              {can("financeCodShiprocket") && <SubItem to="/remittance/shiprocket" label="Shiprocket" />}
            </DropdownGroup>
          )}

          {user && can("financeRecordsMenu") && (
            <DropdownGroup id="records" icon={<AnalyticsIcon />} label="Records">
              {can("financePurchaseRecords") && <SubItem to="/purchase-record" label="Purchase Records" />}
              {can("financePaymentRecords") && <SubItem to="/payment-record" label="Payment Records" />}
              {can("financeVendors") && <SubItem to="/vendors" label="My Vendors" />}
            </DropdownGroup>
          )}

          {user && can("financeBankReconciliationMenu") && (
            <DropdownGroup id="bankReconciliation" icon={<Inventory2Icon />} label="Bank Reconciliation">
              {can("bankCapital6389") && <SubItem to="/BankCapital6389" label="Capital 6389" />}
              {can("bankAxis3361") && <SubItem to="/BankAxis3361" label="Axis 3361" />}
              {can("bankCc1101") && <SubItem to="/BankCc1101" label="CC 1101" />}
              {can("bankSbi8285") && <SubItem to="/BankReconciliation" label="SBI Current 8285" />}
              {can("bankYesCcTejasv") && <SubItem to="/BankYesCcTejasv" label="Yes CC – Tejasv" />}
              {can("bankYesCcAbhay") && <SubItem to="/BankYesCcAbhay" label="Yes CC – Abhay" />}
              {can("bankKotak") && <SubItem to="/BankKotak" label="Kotak" />}
            </DropdownGroup>
          )}

          {/* Marketing */}
          {user && (can("marketingMenu") || can("OthervideoMenu") || can("StaticCarouselMenu") || can("adsMenu")) && (
            <div className="nav-section-label">Marketing</div>
          )}

          {user && can("marketingMenu") && (
            <DropdownGroup id="marketingDropdown" icon={<StorefrontIcon />} label="Scripted Videos">
              {can("scriptPage") && <SubItem to="/marketing/script" label="Script" />}
              {can("shootPage") && <SubItem to="/marketing/shoot" label="Shoot" />}
              {can("cutPage") && <SubItem to="/marketing/cut" label="Cut" />}
              {can("editPage") && <SubItem to="/marketing/edit" label="Edit" />}
              {can("postPage") && <SubItem to="/marketing/post" label="Post" />}
            </DropdownGroup>
          )}

          {user && can("OthervideoMenu") && (
            <DropdownGroup id="othervideoDropdown" icon={<VideoLibraryIcon />} label="Other Video">
              {can("OtherscriptPage") && <SubItem to="/OtherVideo/Ideation" label="Ideation" />}
              {can("OthershootPage") && <SubItem to="/OtherVideo/shoot" label="Shoot" />}
              {can("OthercutPage") && <SubItem to="/OtherVideo/cut" label="Cut" />}
              {can("OthereditPage") && <SubItem to="/OtherVideo/edit" label="Edit" />}
              {can("OtherpostPage") && <SubItem to="/OtherVideo/post" label="Post" />}
            </DropdownGroup>
          )}

          {user && can("StaticCarouselMenu") && (
            <DropdownGroup id="StaticCarouselDropdown" icon={<ViewCarouselIcon />} label="Static Carousel">
              {can("StaticCarouselscriptPage") && <SubItem to="/staticCarousel/Ideation" label="Ideation" />}
              {can("StaticCarouselshootPage") && <SubItem to="/staticCarousel/shoot" label="Shoot" />}
              {can("StaticCarouselcutPage") && <SubItem to="/staticCarousel/cut" label="Cut" />}
              {can("StaticCarouseleditPage") && <SubItem to="/staticCarousel/edit" label="Edit" />}
              {can("StaticCarouselpostPage") && <SubItem to="/staticCarousel/post" label="Post" />}
            </DropdownGroup>
          )}

          {user && can("adsMenu") && (
            <DropdownGroup id="AdsDropdown" icon={<CampaignIcon />} label="Ads">
              {can("adsscriptPage") && <SubItem to="/Ads/Ideation" label="Ideation" />}
              {can("adsshootPage") && <SubItem to="/Ads/shoot" label="Shoot" />}
              {can("adscutPage") && <SubItem to="/Ads/cut" label="Cut" />}
              {can("adseditPage") && <SubItem to="/Ads/edit" label="Edit" />}
              {can("adspostPage") && <SubItem to="/Ads/post" label="Post" />}
            </DropdownGroup>
          )}

          {/* Operations */}
          {user && (can("opsUndeliveredOrders") || can("opsRtoDelivered") || can("opsEmailUndelivered") || can("opsOnlyOrderConfirmation") || can("deliveredSalesRecord")) && (
            <div className="nav-section-label">Operations</div>
          )}

          {user && can("opsUndeliveredOrders") && (
            <NavItem to="/operations/undelivered-orders" icon={<ErrorOutlineIcon />} label="Undelivered Orders" />
          )}

          {user && can("opsRtoDelivered") && (
            <NavItem to="/operations/rto-delivered" icon={<LocalShippingIcon />} label="RTO Delivered" />
          )}

          {user && can("opsEmailUndelivered") && (
            <NavItem to="/operations/undelivered" icon={<EmailIcon />} label="Email Undelivered" />
          )}

          {user && can("opsOnlyOrderConfirmation") && (
            <NavItem to="/only-order-confirmation" icon={<AssignmentTurnedInIcon />} label="Only Order Confirmation" />
          )}

          {user && can("deliveredSalesRecord") && (
            <NavItem to="/delivered-sales-record" icon={<FactCheckIcon />} label="Delivered Sales Record" />
          )}

          {/* HR */}
          {user && (can("hrAddNewAssets") || can("hrAssetAllotment") || can("myAssets")) && (
            <div className="nav-section-label">HR & Assets</div>
          )}

          {user && can("hrAddNewAssets") && (
            <NavItem to="/add-new-asset" icon={<Inventory2Icon />} label="Add New Assets" />
          )}

          {user && can("hrAssetAllotment") && (
            <NavItem to="/AssetAllotment" icon={<Inventory2Icon />} label="Asset Allotment" />
          )}

          {user && can("myAssets") && (
            <NavItem to="/my-assets" icon={<Inventory2Icon />} label="My Assets" />
          )}

          {/* Wallet / Incentives */}
          {user && can("incentivesWallet") && (
            <DropdownGroup id="incentivesWallet" icon={<AccountBalanceWalletOutlinedIcon />} label="Wallet">
              {can("incentivesWallet") && <SubItem to="/incentives" label="Incentives Details" />}
              {can("sops") && <SubItem to="/SOP-creation" label="SOPs" />}
              {can("RewardsAdminPage") && <SubItem to="/Rewards-Admin-Page" label="Rewards Creation" />}
            </DropdownGroup>
          )}

          {/* Leaderboard */}
          {user && can("leaderboardMenu") && (
            <DropdownGroup id="leaderboard" icon={<EmojiEventsIcon />} label="Leaderboard">
              {can("leaderboardAll") && <SubItem to="/leaderboard" label="All Leaderboard" />}
              {can("leaderboardBloom") && <SubItem to="/bloom-leaderboard" label="Bloom Leaderboard" />}
            </DropdownGroup>
          )}

          {/* Global */}
          {user && (can("globalShopifyMenu") || can("globalRetentionMenu")) && (
            <div className="nav-section-label">International</div>
          )}

          {user && can("globalShopifyMenu") && (
            <DropdownGroup id="globalShopify" icon={<ShoppingCartIcon />} label="Global Shopify Orders">
              {can("globalShopifyOrders") && <SubItem to="/global-shopify-orders" label="Shopify Orders" />}
              {can("globalAbandonedCart") && <SubItem to="/global-aband" label="Abandoned Cart" />}
            </DropdownGroup>
          )}

          {user && can("globalRetentionMenu") && (
            <DropdownGroup id="globalRetention" icon={<PersonIcon />} label="Global Retention">
              {can("globalRetentionLeads") && <SubItem to="/global-retention-leads" label="Global Retention Leads" />}
              {can("globalRetentionSales") && <SubItem to="/global-retention-sales" label="Global Retention Sales" />}
            </DropdownGroup>
          )}

          {/* Others */}
          {user && can("othersMenu") && (
            <DropdownGroup id="others" icon={<FolderIcon />} label="Others">
              {can("othersSwitchDashboards") && <SubItem to="/switch-dashboard" label="Switch Dashboards" />}
              {can("othersIncentiveCreation") && <SubItem to="/incentive-creation" label="Incentive Creation" />}
              {can("othersScheduleCalls") && <SubItem to="/schedule-calls" label="Schedule Calls" />}
              {can("othersAllProducts") && <SubItem to="/all-products" label="All Products" />}
              {can("otherswhatsaaptemplates") && <SubItem to="/template/chat" label="WhatsApp Templates" />}
              {can("othersLeadMigration") && <SubItem to="/lead-migration" label="Leads Migrate" />}
              {can("othersDietTemplate") && <SubItem to="/diet-template" label="Diet Plan Builder" />}
              {can("othersDietTemplate") && <SubItem to="/diet-image-migration-admin" label="Diet Image Migration" />}
              {can("othersAllShopifyOrders") && <SubItem to="/all-shopify-orders" label="All Shopify Orders" />}
              {can("othersTransferRequests") && <SubItem to="/transfer-requests" label="Lead Transfer Requests" />}
              {can("othersBulkDataUpload") && <SubItem to="/bulk-data-upload" label="Bulk Data Upload" />}
            </DropdownGroup>
          )}

          {user && can("knowledgeBase") && (
            <NavItem to="/knowledge-base" icon={<MenuBookIcon />} label="Knowledge Base" />
          )}

          {user && can("myGrowthPlan") && (
            <NavItem to="/my-growth-plan" icon={<TrendingUpIcon />} label="Growth At Muditam" />
          )}
        </div>

        {/* Footer */}
        {user && (
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.fullName} />
                  : getInitials(user.fullName)
                }
              </div>
              <div className="user-details">
                <span className="user-name">{user.fullName}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <LogoutIcon />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default MenuBar;

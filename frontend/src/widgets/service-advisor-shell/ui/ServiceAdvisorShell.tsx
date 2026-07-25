import {
  CalendarOutlined,
  CarOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  HeartOutlined,
  PlusCircleOutlined,
  SwapOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { ConfigProvider } from "antd";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../shared/auth";
import { BackOfficeShell, advisorPalette } from "../../backoffice-shell";

export { advisorPalette };

function activeMenuKey(pathname: string) {
  if (pathname.startsWith("/advisor/bookings")) return "bookings";
  if (pathname.startsWith("/advisor/reception")) return "reception";
  if (pathname.startsWith("/advisor/inspection")) return "inspection";
  if (pathname.startsWith("/advisor/work-orders")) return "work-orders";
  if (pathname.startsWith("/advisor/quotation")) return "quotation";
  if (pathname.startsWith("/advisor/additional-services"))
    return "additional-services";
  if (pathname.startsWith("/advisor/quality-check")) return "quality-check";
  if (pathname.startsWith("/advisor/transfer-requests"))
    return "transfer-requests";
  if (pathname.startsWith("/advisor/customer-care")) return "customer-care";
  if (pathname.startsWith("/advisor/dashboard")) return "dashboard";
  return "";
}

export function ServiceAdvisorShell({
  title,
  eyebrow = "Service Advisor",
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const profileName = user?.fullName || "Service Advisor";
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || "S";

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: advisorPalette.red,
          colorLink: advisorPalette.red,
          colorLinkHover: advisorPalette.redDeep,
          borderRadius: 10,
        },
      }}
    >
      <BackOfficeShell
        palette={advisorPalette}
        background={advisorPalette.canvas}
        sidebarGradient={`linear-gradient(180deg, #0f172a 0%, #1e293b 100%)`}
        sidebarTitle="Service Advisor"
        sidebarSubtitle="Workshop front desk"
        headerEyebrow={eyebrow}
        headerTitle={title}
        notificationIcon={<CalendarOutlined />}
        profileInitial={profileInitial}
        profileName={profileName}
        profileRole="Service advisor"
        profileAccent={advisorPalette.red}
        profileHref="/advisor/profile"
        onLogout={logout}
        selectedMenuKeys={[activeMenuKey(location.pathname)]}
        menuItems={[
          {
            key: "dashboard",
            icon: <DashboardOutlined />,
            label: <Link to="/advisor/dashboard">Overview</Link>,
          },
          {
            key: "bookings",
            icon: <CalendarOutlined />,
            label: <Link to="/advisor/bookings">Booking requests</Link>,
          },
          {
            key: "reception",
            icon: <CarOutlined />,
            label: <Link to="/advisor/reception">Vehicle reception</Link>,
          },
          {
            key: "inspection",
            icon: <FileSearchOutlined />,
            label: <Link to="/advisor/inspection">Vehicle inspection</Link>,
          },
          {
            key: "quotation",
            icon: <FileTextOutlined />,
            label: <Link to="/advisor/quotation">Quotations</Link>,
          },
          {
            key: "work-orders",
            icon: <ToolOutlined />,
            label: <Link to="/advisor/work-orders">Work orders</Link>,
          },
          {
            key: "additional-services",
            icon: <PlusCircleOutlined />,
            label: (
              <Link to="/advisor/additional-services">Additional services</Link>
            ),
          },
          {
            key: "quality-check",
            icon: <CheckCircleOutlined />,
            label: <Link to="/advisor/quality-check">Quality check</Link>,
          },
          {
            key: "transfer-requests",
            icon: <SwapOutlined />,
            label: (
              <Link to="/advisor/transfer-requests">Transfer requests</Link>
            ),
          },
          {
            key: "customer-care",
            icon: <HeartOutlined />,
            label: <Link to="/advisor/customer-care">Customer care</Link>,
          },
        ]}
      >
        {children}
      </BackOfficeShell>
    </ConfigProvider>
  );
}

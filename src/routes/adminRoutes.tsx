import type { RouteObject } from "react-router-dom";
import { RequireAuth } from "./guards";
import AdminLayout from "../layouts/AdminLayout";
import DashboardHomePage from "../pages/admin/DashboardHomePage";
import RentalPlansPage from "../pages/admin/RentalPlansPage";
import RentalEnquiriesPage from "../pages/admin/RentalEnquiriesPage";
import CustomDomainsPage from "../pages/admin/CustomDomainsPage";
import ThemeManagerPage from "../pages/admin/ThemeManagerPage";
import WhiteLabelPage from "../pages/admin/WhiteLabelPage";
import BusinessDashboardPage from "../pages/admin/BusinessDashboardPage";
import CustomersPage from "../pages/admin/CustomersPage";
import CustomerProfilePage from "../pages/admin/CustomerProfilePage";
import SportsPage from "../pages/admin/SportsPage";
import CouponsPage from "../pages/admin/CouponsPage";
import FeatureFlagsPage from "../pages/admin/FeatureFlagsPage";
import SystemSettingsPage from "../pages/admin/SystemSettingsPage";
import AuditLogsPage from "../pages/admin/AuditLogsPage";
import ActivityLogsPage from "../pages/admin/ActivityLogsPage";
import ContactMessagesPage from "../pages/admin/ContactMessagesPage";
import SupportTicketsPage from "../pages/admin/SupportTicketsPage";
import EmailTemplatesPage from "../pages/admin/EmailTemplatesPage";
import UserManagementPage from "../pages/admin/UserManagementPage";
import AdminTournamentsPage from "../pages/admin/AdminTournamentsPage";
import AdminSubscriptionsPage from "../pages/admin/AdminSubscriptionsPage";
import AdminAnalyticsPage from "../pages/admin/AdminAnalyticsPage";
import ComingSoonPage from "../pages/admin/ComingSoonPage";

// Every sidebar destination not yet built with real CRUD routes to
// ComingSoonPage so navigation never dead-ends. "domains" is intentionally
// absent here — it was a duplicate sidebar entry pointing at a second copy
// of what custom-domains already covers; the sidebar now points it there
// directly instead of rendering a placeholder.
const DEFERRED_PATHS = [
  "website-builder", "homepage-builder", "navigation-builder", "footer-builder",
  "taxes", "payment-settings", "roles", "permissions",
  "teams", "players", "matches", "live-scores", "news", "gallery",
  "sponsors", "cms", "blog", "faq", "testimonials", "advertisements", "notifications",
  "reports", "media-library", "api-keys",
  "webhook-logs", "backup",
];

export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: (
      <RequireAuth roles={["super_admin"]}>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardHomePage /> },
      { path: "rental-plans", element: <RentalPlansPage /> },
      { path: "rental-enquiries", element: <RentalEnquiriesPage /> },
      { path: "custom-domains", element: <CustomDomainsPage /> },
      { path: "themes", element: <ThemeManagerPage /> },
      { path: "white-label", element: <WhiteLabelPage /> },
      { path: "business", element: <BusinessDashboardPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "customers/:id", element: <CustomerProfilePage /> },
      { path: "organizers", element: <CustomersPage /> },
      { path: "sports", element: <SportsPage /> },
      { path: "coupons", element: <CouponsPage /> },
      { path: "feature-flags", element: <FeatureFlagsPage /> },
      { path: "system-settings", element: <SystemSettingsPage /> },
      { path: "audit-logs", element: <AuditLogsPage /> },
      { path: "activity-logs", element: <ActivityLogsPage /> },
      { path: "contact-messages", element: <ContactMessagesPage /> },
      { path: "support-tickets", element: <SupportTicketsPage /> },
      { path: "email-templates", element: <EmailTemplatesPage /> },
      { path: "users", element: <UserManagementPage /> },
      { path: "tournaments", element: <AdminTournamentsPage /> },
      { path: "subscriptions", element: <AdminSubscriptionsPage /> },
      { path: "analytics", element: <AdminAnalyticsPage /> },
      ...DEFERRED_PATHS.map((path) => ({ path, element: <ComingSoonPage /> })),
    ],
  },
];

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
import AdminTeamsPage from "../pages/admin/AdminTeamsPage";
import AdminPlayersPage from "../pages/admin/AdminPlayersPage";
import AdminMatchesPage from "../pages/admin/AdminMatchesPage";
import AdminRolesPermissionsPage from "../pages/admin/AdminRolesPermissionsPage";
import AdminNotificationsPage from "../pages/admin/AdminNotificationsPage";
import AdminNewsPage from "../pages/admin/AdminNewsPage";
import AdminGalleryPage from "../pages/admin/AdminGalleryPage";
import AdminSponsorsPage from "../pages/admin/AdminSponsorsPage";
import AdminMediaLibraryPage from "../pages/admin/AdminMediaLibraryPage";
import AdminWebhookLogsPage from "../pages/admin/AdminWebhookLogsPage";
import AdminApiKeysPage from "../pages/admin/AdminApiKeysPage";
import AdminTestimonialsPage from "../pages/admin/AdminTestimonialsPage";
import ComingSoonPage from "../pages/admin/ComingSoonPage";

// Every sidebar destination not yet built with real CRUD routes to
// ComingSoonPage so navigation never dead-ends. "domains" and "permissions"
// are intentionally absent — see prior notes; they're merged into
// custom-domains and roles respectively.
//
// "blog" and "faq" remain deferred because no backing database tables exist
// for them yet (no blog_posts / faqs tables) — building real admin CRUD
// for those requires a schema migration first, which wasn't done silently.
// "reports" and "backup" have no dedicated table/feature to back them either.
const DEFERRED_PATHS = [
  "website-builder", "homepage-builder", "navigation-builder", "footer-builder",
  "taxes", "payment-settings",
  "live-scores",
  "cms", "blog", "faq", "advertisements",
  "reports", "backup",
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
      { path: "teams", element: <AdminTeamsPage /> },
      { path: "players", element: <AdminPlayersPage /> },
      { path: "matches", element: <AdminMatchesPage /> },
      { path: "roles", element: <AdminRolesPermissionsPage /> },
      { path: "notifications", element: <AdminNotificationsPage /> },
      { path: "news", element: <AdminNewsPage /> },
      { path: "gallery", element: <AdminGalleryPage /> },
      { path: "sponsors", element: <AdminSponsorsPage /> },
      { path: "testimonials", element: <AdminTestimonialsPage /> },
      { path: "media-library", element: <AdminMediaLibraryPage /> },
      { path: "webhook-logs", element: <AdminWebhookLogsPage /> },
      { path: "api-keys", element: <AdminApiKeysPage /> },
      ...DEFERRED_PATHS.map((path) => ({ path, element: <ComingSoonPage /> })),
    ],
  },
];

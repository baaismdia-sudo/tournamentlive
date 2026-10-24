import type { RouteObject } from "react-router-dom";
import LandingPage from "../pages/marketing/LandingPage";
import {
  FeaturesPage, PricingPage, DemoPage, SportsPage, TemplatesPage, BlogIndexPage, ContactPage,
  LegalPlaceholderPage, NotFoundPage,
} from "../pages/marketing/MarketingPages";

/**
 * Marketing site. Every destination linked from the navbar, footer and sign-up
 * form resolves to a real page, and unknown URLs get a branded 404 (the "*"
 * route has the lowest router priority, so it never shadows the other route
 * groups: auth, admin, organizer, live and public tournament sites).
 */
export const marketingRoutes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/features", element: <FeaturesPage /> },
  { path: "/pricing", element: <PricingPage /> },
  { path: "/demo", element: <DemoPage /> },
  { path: "/sports", element: <SportsPage /> },
  { path: "/templates", element: <TemplatesPage /> },
  { path: "/blog", element: <BlogIndexPage /> },
  { path: "/contact", element: <ContactPage /> },
  { path: "/terms", element: <LegalPlaceholderPage kind="terms" /> },
  { path: "/privacy", element: <LegalPlaceholderPage kind="privacy" /> },
  { path: "*", element: <NotFoundPage /> },
];

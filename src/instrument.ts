// Imported FIRST in main.tsx so Sentry is listening before any other module runs
// (errors thrown while the rest of the app is still loading are captured too).
import { initObservability } from "./lib/observability/sentry";

initObservability();

import { supabase } from "../../lib/supabaseClient";
import { log, startRequest, describeError } from "../../lib/observability/logger";

export interface EnquiryInput {
  rentalPlanId: string;
  tournamentId?: string;
  fullName: string;
  organizationName: string;
  tournamentName: string;
  sport: string;
  country: string;
  state: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  tournamentStartsAt?: string;
  tournamentEndsAt?: string;
  expectedTeams?: number;
  expectedPlayers?: number;
  message?: string;
}

/**
 * WhatsApp number is never hardcoded — it's read from system_settings
 * (Super Admin → System Settings), which is exactly what Prompt 11
 * requires: changeable without a code deploy.
 */
async function getPlatformWhatsappNumber(): Promise<string> {
  const { data, error } = await supabase.from("system_settings").select("value").eq("key", "whatsapp_number").single();
  // If this lookup fails, leads are silently routed to the hardcoded fallback number below.
  // That must never happen unnoticed (it is the number customers' enquiries go to).
  if (error || !data?.value) log.warn("rental.whatsapp_number_fallback", { errorCode: error ? describeError(error).errorCode : "missing_setting" });
  const raw = (data?.value as string) ?? "+91 8075350630";
  return raw.replace(/[^\d]/g, ""); // wa.me needs digits only, no + or spaces
}

export async function submitRentalEnquiry(input: EnquiryInput): Promise<{ whatsappUrl: string }> {
  const req = startRequest("rental.enquiry", { rentalPlanId: input.rentalPlanId, sport: input.sport, country: input.country, expectedTeams: input.expectedTeams ?? null });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { data: plan, error: planError } = await supabase.from("rental_plans").select("name").eq("id", input.rentalPlanId).single();
  if (planError) req.warn("rental.enquiry.plan_lookup_failed", { errorCode: describeError(planError).errorCode });

  const { error } = await supabase.from("rental_enquiries").insert({
    organizer_id: userData.user.id,
    rental_plan_id: input.rentalPlanId,
    tournament_id: input.tournamentId ?? null,
    organization_name: input.organizationName,
    contact_name: input.fullName,
    contact_phone: input.contactPhone,
    contact_email: input.contactEmail,
    whatsapp_number: input.whatsappNumber,
    tournament_name: input.tournamentName,
    sport: input.sport,
    country: input.country,
    state: input.state,
    city: input.city,
    tournament_starts_at: input.tournamentStartsAt || null,
    tournament_ends_at: input.tournamentEndsAt || null,
    expected_teams: input.expectedTeams ?? null,
    expected_players: input.expectedPlayers ?? null,
    message: input.message ?? null,
  });
  if (error) {
    // A lost enquiry is a lost customer — always an issue, never just a toast.
    req.fail(error);
    throw error;
  }

  const activity = await supabase.from("activity_logs").insert({
    profile_id: userData.user.id, action: "rental_enquiry_submitted", entity_type: "rental_enquiries",
  });
  if (activity.error) req.warn("rental.enquiry.activity_log_failed", { errorCode: describeError(activity.error).errorCode });
  req.ok();

  // Exact message format from the Prompt 11 spec.
  const lines = [
    "Hello Scorio Team,",
    "",
    "I would like to rent a tournament website.",
    "",
    `Name: ${input.fullName}`,
    `Organization: ${input.organizationName}`,
    `Tournament: ${input.tournamentName}`,
    `Sport: ${input.sport}`,
    `Rental Plan: ${plan?.name ?? "—"}`,
    `Start Date: ${input.tournamentStartsAt || "—"}`,
    `End Date: ${input.tournamentEndsAt || "—"}`,
    `Expected Teams: ${input.expectedTeams ?? "—"}`,
    `Expected Players: ${input.expectedPlayers ?? "—"}`,
    `Email: ${input.contactEmail}`,
    `Phone: ${input.contactPhone}`,
    "",
    "Please contact me regarding activation.",
    "",
    "Thank you.",
  ];

  const platformNumber = await getPlatformWhatsappNumber();
  const whatsappUrl = `https://wa.me/${platformNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  return { whatsappUrl };
}

export async function listOwnEnquiries() {
  const { data, error } = await supabase
    .from("rental_enquiries")
    .select("*, rental_plans(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

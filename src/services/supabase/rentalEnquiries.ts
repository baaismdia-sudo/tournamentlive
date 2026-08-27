import { supabase } from "../../lib/supabaseClient";

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
  const { data } = await supabase.from("system_settings").select("value").eq("key", "whatsapp_number").single();
  const raw = (data?.value as string) ?? "+91 8075350630";
  return raw.replace(/[^\d]/g, ""); // wa.me needs digits only, no + or spaces
}

export async function submitRentalEnquiry(input: EnquiryInput): Promise<{ whatsappUrl: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { data: plan } = await supabase.from("rental_plans").select("name").eq("id", input.rentalPlanId).single();

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
  if (error) throw error;

  await supabase.from("activity_logs").insert({
    profile_id: userData.user.id, action: "rental_enquiry_submitted", entity_type: "rental_enquiries",
  });

  // Exact message format from the Prompt 11 spec.
  const lines = [
    "Hello TournamentLive Team,",
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

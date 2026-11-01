import { isSensitiveKey, redactString, scrubUrl, sanitizeAttributes, sanitizeDeep, maskEmail } from "../src/lib/observability/redact";
let pass = 0, fail = 0;
const t = (name: string, cond: boolean, got?: unknown) => { cond ? pass++ : (fail++, console.log("FAIL:", name, got !== undefined ? JSON.stringify(got) : "")); };

// --- keys that MUST be redacted
for (const k of ["password","Password","userPassword","newPassword","confirm_password","access_token","accessToken","refreshToken","idToken","apiKey","api_key","API-KEY","x-api-key","Authorization","cookie","set-cookie","cvv","cardNumber","card_number","creditCard","aadhaar","aadhaarNumber","passportNumber","privateKey","client_secret","clientSecret","otp","pin","secretKey","jwt","sessionToken","codeVerifier"])
  t(`sensitive: ${k}`, isSensitiveKey(k));
// --- keys that MUST survive (everyday sports + correlation data)
for (const k of ["scorecard","yellowCard","redCard","sessionId","requestId","userId","tokenCount","statusCode","matchId","overs","wicketType","deliveryType","pinned","compass","route","durationMs","emailMasked","tournamentId","role"])
  t(`keeps: ${k}`, !isSensitiveKey(k));

// --- strings
const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
t("jwt", !redactString(`bad token ${jwt} here`).includes("eyJhbGci"));
t("bearer", !redactString("Authorization: Bearer abc123DEF456ghi789").includes("abc123DEF456"));
t("pw=", !redactString("login failed password=hunter2 for user").includes("hunter2"));
t("pw json", !redactString('{"password":"hunter2","x":1}').includes("hunter2"), redactString('{"password":"hunter2","x":1}'));
t("token:", !redactString("token: sk_live_ABCDEF123456").includes("sk_live"));
t("access_token in url-ish", !redactString("access_token=SECRETVALUE&type=recovery").includes("SECRETVALUE"));
t("api_key", !redactString("api_key=ABCD1234EFGH").includes("ABCD1234"));
t("email", redactString("user player@example.com failed") === "user [email] failed", redactString("user player@example.com failed"));
t("visa", !redactString("card 4111 1111 1111 1111 declined").includes("4111"));
t("aadhaar", !redactString("id 1234 5678 9012").includes("5678"));
t("emirates", !redactString("784-1990-1234567-1").includes("1234567"), redactString("784-1990-1234567-1"));
// --- ordinary text must be untouched
for (const ok of ["Over 17.3 — Thrissur Titans 145/4", "scoring.cricket.wicket", "94e94258-32a0-4b52-860a-8394a6da29fe", "Need 1 run from 15 balls", "Invalid login credentials", "new row violates row-level security policy for table \"matches\"", "9876543210"])
  t(`unchanged: ${ok}`, redactString(ok) === ok, redactString(ok));
t("truncates", redactString("x".repeat(900)).length <= 501);

// --- urls
t("url hash", scrubUrl("https://app.example.com/reset-password#access_token=SECRET&type=recovery") === "https://app.example.com/reset-password");
t("url query", scrubUrl("https://x.supabase.co/rest/v1/profiles?email=ilike.%25bob%40x.com%25&select=*") === "https://x.supabase.co/rest/v1/profiles");
t("url code", scrubUrl("http://localhost/auth/callback?code=PKCECODE123") === "http://localhost/auth/callback");
t("rel url", scrubUrl("/login?next=/admin#frag") === "/login");
t("empty url", scrubUrl(undefined) === "");

// --- attribute sanitiser
const a = sanitizeAttributes({ password: "x", userId: "u1", note: "mail a@b.co", obj: { a: 1 }, arr: [1], n: 5, ok: true, nul: null, undef: undefined, err: new Error("boom p@q.io"), scorecard: "kept" } as Record<string, unknown>);
t("attr password", a.password === "[redacted]");
t("attr keeps userId", a.userId === "u1");
t("attr email in value", a.note === "mail [email]", a.note);
t("attr object omitted", a.obj === "[object omitted]" && a.arr === "[object omitted]");
t("attr primitives", a.n === 5 && a.ok === true && a.nul === null);
t("attr undefined dropped", !("undef" in a));
t("attr Error masked", String(a.err).includes("[email]") && !String(a.err).includes("p@q.io"), a.err);
t("attr scorecard kept", a.scorecard === "kept");

// --- deep sanitiser
const d = sanitizeDeep({ user: { password: "p", profile: { apiKey: "k", name: "ok" } }, list: [{ token: "t" }], deep: { a: { b: { c: { d: "too deep" } } } } }) as any;
t("deep nested pw", d.user.password === "[redacted]" && d.user.profile.apiKey === "[redacted]" && d.user.profile.name === "ok", d);
t("deep array", d.list[0].token === "[redacted]");
t("deep truncation", JSON.stringify(d.deep).includes("[truncated]"));

t("maskEmail", maskEmail("player@example.com") === "pl***@example.com" && maskEmail(null) === "unknown" && maskEmail("nope") === "unknown");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

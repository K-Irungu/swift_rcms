import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import type { IAgreementTerms } from "@/lib/models/Property";

// ─── Prompt ───────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a document analyst specialising in Kenyan tenancy agreements.
Extract the following fields from the tenancy agreement text below.
Respond with ONLY a valid JSON object — no commentary, no markdown fences.

Fields to extract:
- leaseDurationMonths (integer): Standard lease term in months. 12 if "1 year", 6 for 6 months, etc.
- noticePeriodDays (integer): Number of days either party must give notice before vacating/terminating.
- latePenaltyPercent (number): Late payment penalty as a percentage of the outstanding rent (e.g. 5 for 5%).
- latePenaltyGraceDays (integer): Grace period in days before the late penalty applies.
- keyRules (array of short strings, max 8 items): Key tenant obligations or restrictions worth flagging (e.g. "No pets allowed", "Tenant pays water bills", "No subletting").

If a field cannot be determined from the document, omit it.

Example output:
{
  "leaseDurationMonths": 12,
  "noticePeriodDays": 30,
  "latePenaltyPercent": 5,
  "latePenaltyGraceDays": 7,
  "keyRules": ["No subletting without consent", "Tenant pays water bills", "No pets allowed"]
}`;

// ─── Regex fallback ───────────────────────────────────────────────────────────
// Applied when Gemini is unavailable or returns unusable output.

function regexExtract(text: string): IAgreementTerms {
  const t = text.toLowerCase();
  const terms: IAgreementTerms = {};

  // Lease duration
  const durationMatch =
    text.match(/term\s+of\s+(\d+)\s+months?/i) ||
    text.match(/(\d+)\s*months?\s+(?:lease|tenancy|term)/i) ||
    text.match(/period\s+of\s+(\d+)\s+months?/i);
  if (durationMatch) terms.leaseDurationMonths = parseInt(durationMatch[1]);
  else if (/\bone\s+year\b|\b1\s*[–-]\s*year\b/i.test(text)) terms.leaseDurationMonths = 12;
  else if (/\btwo\s+years?\b/i.test(text)) terms.leaseDurationMonths = 24;
  else if (/\bsix\s+months?\b/i.test(text)) terms.leaseDurationMonths = 6;

  // Notice period
  const noticeMatch =
    text.match(/(?:give|giving|written)\s+notice\s+of\s+(?:at\s+least\s+)?(\d+)\s+days?/i) ||
    text.match(/(\d+)\s+days?\s+(?:written\s+)?notice/i) ||
    text.match(/(?:one|1)\s+month\s+(?:written\s+)?notice/i);
  if (noticeMatch) {
    terms.noticePeriodDays = noticeMatch[1] ? parseInt(noticeMatch[1]) : 30;
  } else if (/one\s*\(1\)\s*month\s*(?:written\s*)?notice/i.test(text)) {
    terms.noticePeriodDays = 30;
  }

  // Late penalty — look for percentage
  const penaltyPctMatch =
    text.match(/penalty\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*%\s+(?:per\s+(?:day|month)|penalty|surcharge)/i);
  if (penaltyPctMatch) terms.latePenaltyPercent = parseFloat(penaltyPctMatch[1]);

  // Grace period
  const graceMatch =
    text.match(/grace\s+period\s+of\s+(\d+)\s+days?/i) ||
    text.match(/(\d+)\s+days?\s+grace/i) ||
    text.match(/within\s+(\d+)\s+days?\s+(?:of\s+)?(?:the\s+)?due\s+date/i);
  if (graceMatch) terms.latePenaltyGraceDays = parseInt(graceMatch[1]);

  // Key rules — simple keyword detection
  const rules: string[] = [];
  if (/no\s+(?:pets?|animals?|dogs?|cats?)/i.test(t))           rules.push("No pets allowed");
  if (/no\s+subl(?:et|ease|etting)/i.test(t))                   rules.push("No subletting without written consent");
  if (/no\s+(?:trade|business|commercial)/i.test(t))            rules.push("Residential use only — no business activities");
  if (/tenant\s+(?:pays?|responsible for)\s+water/i.test(t) ||
      /water\s+bills?\s+(?:to be paid|payable)\s+by\s+(?:the\s+)?(?:tenant|lessee)/i.test(t))
    rules.push("Tenant responsible for water bills");
  if (/tenant\s+(?:pays?|responsible for)\s+electricity/i.test(t) ||
      /electricity\s+bills?\s+(?:payable\s+by|paid\s+by)\s+(?:the\s+)?(?:tenant|lessee)/i.test(t))
    rules.push("Tenant responsible for electricity bills");
  if (/no\s+(?:structural\s+)?alterations?\s+without/i.test(t)) rules.push("No alterations without landlord consent");
  if (/narcotic|illegal\s+activit|immoral/i.test(t))            rules.push("No illegal or immoral activities on premises");
  if (/personal\s+belongings?\s+insured?/i.test(t))             rules.push("Tenant must insure personal belongings");
  if (rules.length) terms.keyRules = rules.slice(0, 8);

  return terms;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function extractAgreementTerms(
  buffer: Buffer,
): Promise<IAgreementTerms> {
  // Convert .docx → plain text
  const { value: docText } = await mammoth.extractRawText({ buffer });

  if (!docText.trim()) {
    throw new Error("No text could be extracted from the document. Ensure the file is a valid .docx.");
  }

  const truncated = docText.slice(0, 12_000);

  // ── Try Gemini first ────────────────────────────────────────────────────────
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(
        `${EXTRACTION_PROMPT}\n\n---\n\n${truncated}`,
      );
      const rawText = result.response.text().trim();

      // Strip markdown fences if the model included them
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      const terms: IAgreementTerms = {};

      if (typeof parsed.leaseDurationMonths  === "number") terms.leaseDurationMonths  = parsed.leaseDurationMonths;
      if (typeof parsed.noticePeriodDays     === "number") terms.noticePeriodDays     = parsed.noticePeriodDays;
      if (typeof parsed.latePenaltyPercent   === "number") terms.latePenaltyPercent   = parsed.latePenaltyPercent;
      if (typeof parsed.latePenaltyGraceDays === "number") terms.latePenaltyGraceDays = parsed.latePenaltyGraceDays;
      if (Array.isArray(parsed.keyRules) && parsed.keyRules.every((r) => typeof r === "string")) {
        terms.keyRules = parsed.keyRules.slice(0, 8);
      }

      return terms;
    } catch (geminiErr) {
      console.warn("Gemini extraction failed, falling back to regex:", geminiErr);
    }
  } else {
    console.warn("GOOGLE_AI_API_KEY not set — using regex extraction fallback");
  }

  // ── Regex fallback ──────────────────────────────────────────────────────────
  return regexExtract(truncated);
}

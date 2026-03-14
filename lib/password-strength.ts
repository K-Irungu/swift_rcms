export type StrengthResult = { score: number; label: string; color: string; feedback: string[] };

export const getPasswordStrength = (password: string): StrengthResult => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (password.length < 8) feedback.push("Use at least 8 characters");

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (varietyCount >= 2) score += 1;
  if (varietyCount >= 3) score += 1;
  if (varietyCount === 4) score += 1;

  if (!hasUpper) feedback.push("Add uppercase letters");
  if (!hasDigit) feedback.push("Add numbers");
  if (!hasSymbol) feedback.push("Add symbols (e.g. !@#$)");

  const commonPatterns = [
    /^[a-zA-Z]+$/,
    /^[0-9]+$/,
    /(.)\1{2,}/,
    /012|123|234|345|456|567|678|789|890/,
    /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i,
    /qwerty|asdf|zxcv/i,
    /password|letmein|welcome|admin|login/i,
  ];

  const penaltyCount = commonPatterns.filter((p) => p.test(password)).length;
  score = Math.max(0, score - penaltyCount);
  if (penaltyCount > 0) feedback.push("Avoid common patterns or sequences");

  const clampedScore = Math.min(5, Math.max(1, score));

  const levels: Record<number, { label: string; color: string }> = {
    1: { label: "Very Weak", color: "#EF4444" },
    2: { label: "Weak",      color: "#F97316" },
    3: { label: "Fair",      color: "#F59E0B" },
    4: { label: "Good",      color: "#3B82F6" },
    5: { label: "Strong",    color: "#22C55E" },
  };

  return { score: clampedScore, feedback, ...levels[clampedScore] };
};
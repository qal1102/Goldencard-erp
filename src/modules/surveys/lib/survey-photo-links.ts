const URL_PATTERN = /^https?:\/\/.+/i;

export function parseSurveyPhotoLinks(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function isLikelyUrl(value: string): boolean {
  return URL_PATTERN.test(value);
}

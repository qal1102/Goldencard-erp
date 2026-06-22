export function displayQuotationCode(code: string) {
  return code.replace(/-V\d+$/i, '');
}

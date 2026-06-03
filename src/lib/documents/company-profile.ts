/** Shared GoldenCard company profile for document exports (quotation, handover, contract, …). */
export const GOLDENCARD_COMPANY_NAME = 'GOLDENCARD';

export const GOLDENCARD_LEGAL_NAME = 'CÔNG TY TNHH GIẢI PHÁP THẺ VÀNG';

export const GOLDENCARD_COMPANY_ADDRESS = '3/5B Nguyễn Văn Linh, P.Phú Thuận, Q7, TPHCM';

export const GOLDENCARD_COMPANY_PROFILE = {
  name: GOLDENCARD_COMPANY_NAME,
  legalName: GOLDENCARD_LEGAL_NAME,
  address: GOLDENCARD_COMPANY_ADDRESS,
  email: 'info@goldencard.vn',
  hotline: '0903 11 72 77',
  website: 'www.goldencard.vn',
  bankAccount: '115002807079',
  bankBeneficiary: GOLDENCARD_LEGAL_NAME,
  bankName: 'VIETIN BANK - CN 4, TPHCM',
} as const;

export type GoldenCardCompanyProfile = typeof GOLDENCARD_COMPANY_PROFILE;

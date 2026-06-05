import 'server-only';

import QRCode from 'qrcode';

export async function generateWarrantyQrDataUrl(publicCheckUrl: string): Promise<string> {
  return QRCode.toDataURL(publicCheckUrl, {
    width: 280,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

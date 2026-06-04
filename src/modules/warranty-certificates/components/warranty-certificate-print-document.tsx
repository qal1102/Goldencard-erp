'use client';

import { Button } from '@/components/ui/button';
import { PrintReturnButton } from '@/components/navigation/print-return-button';
import type { WarrantyCertificatePrintModel } from '../lib/build-warranty-certificate-print-model';
import styles from './warranty-certificate-print-document.module.css';

type Props = {
  model: WarrantyCertificatePrintModel;
  certificateId: string;
  qrDataUrl: string;
};

function InfoTable({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <table className={styles.warrantyPrintTable}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className={styles.warrantyPrintLabel}>{row.label}</td>
            <td className={styles.warrantyPrintValue}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WarrantyCertificatePrintDocument({ model, certificateId, qrDataUrl }: Props) {
  function handlePrint() {
    window.print();
  }

  const customerRows = [
    { label: 'Khách hàng', value: model.customer.name },
    { label: 'Số điện thoại', value: model.customer.phone },
    { label: 'Địa chỉ lắp đặt', value: model.customer.installationAddress },
  ];

  const warrantyRows = [
    { label: 'Trạng thái', value: model.statusLabel },
    { label: 'Bắt đầu bảo hành', value: model.warrantyStart },
    { label: 'Kết thúc bảo hành', value: model.warrantyEnd },
    { label: 'Hotline hỗ trợ', value: model.supportPhone },
  ];

  return (
    <div className={styles.warrantyPrintRoot}>
      <div className={`${styles.warrantyPrintToolbar} noPrint`}>
        <Button type="button" onClick={handlePrint}>
          In / Lưu PDF
        </Button>
        <PrintReturnButton detailHref={`/warranty-certificates/${certificateId}`}>
          Quay lại phiếu bảo hành
        </PrintReturnButton>
      </div>

      <article className={styles.warrantyPrintPage}>
        <header className={styles.warrantyPrintHeader}>
          <div className={styles.warrantyPrintBrand}>{model.company.name}</div>
          <h1 className={styles.warrantyPrintTitle}>PHIẾU BẢO HÀNH HỆ THỐNG ĐIỆN MẶT TRỜI</h1>
          <div className={styles.warrantyPrintMeta}>
            <div>Mã phiếu: {model.code}</div>
            <div>Ngày in: {model.printedAt}</div>
          </div>
        </header>

        <section className={styles.warrantyPrintSection}>
          <h2 className={styles.warrantyPrintSectionTitle}>Thông tin khách hàng</h2>
          <InfoTable rows={customerRows} />
        </section>

        {model.systemRows.length > 0 && (
          <section className={styles.warrantyPrintSection}>
            <h2 className={styles.warrantyPrintSectionTitle}>Hệ thống đã lắp đặt</h2>
            <InfoTable rows={model.systemRows} />
          </section>
        )}

        <section className={styles.warrantyPrintSection}>
          <h2 className={styles.warrantyPrintSectionTitle}>Thời hạn bảo hành</h2>
          <InfoTable rows={warrantyRows} />
        </section>

        <section className={styles.warrantyPrintSection}>
          <h2 className={styles.warrantyPrintSectionTitle}>Điều khoản bảo hành</h2>
          <p className={styles.warrantyPrintTerms}>{model.warrantyTerms}</p>
        </section>

        <section className={styles.warrantyPrintSection}>
          <h2 className={styles.warrantyPrintSectionTitle}>Tra cứu &amp; yêu cầu hỗ trợ</h2>
          <div className={styles.warrantyPrintQrBlock}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Mã QR tra cứu bảo hành"
              className={styles.warrantyPrintQrImage}
            />
            <p className={styles.warrantyPrintQrHint}>
              Quét mã QR để tra cứu bảo hành, gọi hotline hoặc gửi yêu cầu hỗ trợ kỹ thuật.
            </p>
            <p className={styles.warrantyPrintQrUrl}>{model.publicCheckUrl}</p>
          </div>
        </section>

        <div className={styles.warrantyPrintSignature}>
          <div className={styles.warrantyPrintSigBox}>
            <div>ĐẠI DIỆN GOLDENCARD</div>
            <div className={styles.warrantyPrintSigArea} />
            <div className={styles.warrantyPrintSigLine}>Ký, ghi rõ họ tên</div>
          </div>
          <div className={styles.warrantyPrintSigBox}>
            <div>ĐẠI DIỆN KHÁCH HÀNG</div>
            <div className={styles.warrantyPrintSigArea} />
            <div className={styles.warrantyPrintSigLine}>Ký, ghi rõ họ tên</div>
          </div>
        </div>
      </article>
    </div>
  );
}

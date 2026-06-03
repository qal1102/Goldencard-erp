'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { HandoverPrintModel } from '../lib/build-handover-print-model';
import styles from './handover-print-document.module.css';

type Props = {
  model: HandoverPrintModel;
  handoverId: string;
};

function InfoTable({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <table className={styles.handoverPrintTable}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className={styles.handoverPrintLabel}>{row.label}</td>
            <td className={styles.handoverPrintValue}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DocumentLinkLine({ value }: { value: string }) {
  const trimmed = value.trim();
  const isUrl = /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
  if (isUrl) {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.handoverPrintLink}
      >
        {trimmed}
      </a>
    );
  }
  return <span>{trimmed}</span>;
}

const CONFIRMATION_CHECKLIST = [
  'Hệ thống đã được lắp đặt hoàn tất',
  'Khách hàng đã được hướng dẫn vận hành cơ bản',
  'Khách hàng đã nhận thông tin liên hệ hỗ trợ/bảo hành',
  'Hai bên thống nhất xác nhận bàn giao',
] as const;

export function HandoverPrintDocument({ model, handoverId }: Props) {
  function handlePrint() {
    window.print();
  }

  const customerRows = [
    { label: 'Khách hàng', value: model.customer.name },
    { label: 'Số điện thoại', value: model.customer.phone },
    { label: 'Địa chỉ lắp đặt', value: model.customer.installationAddress },
  ];
  if (model.customer.receiverName) {
    customerRows.push({
      label: 'Người nhận bàn giao phía khách',
      value: model.customer.receiverName,
    });
  }

  const hasHandoverNotes =
    model.handover.note || model.handover.documentLinks.length > 0;

  return (
    <div className={styles.handoverPrintRoot}>
      <div className={`${styles.handoverPrintToolbar} noPrint`}>
        <Button type="button" onClick={handlePrint}>
          In / Lưu PDF
        </Button>
        <Button type="button" variant="outline" render={<Link href={`/handovers/${handoverId}`} />}>
          Quay lại phiếu bàn giao
        </Button>
      </div>

      <article className={styles.handoverPrintPage}>
        <header className={styles.handoverPrintHeader}>
          <div className={styles.handoverPrintBrand}>{model.company.name}</div>
          <h1 className={styles.handoverPrintTitle}>
            BIÊN BẢN BÀN GIAO HỆ THỐNG ĐIỆN MẶT TRỜI
          </h1>
          <div className={styles.handoverPrintMeta}>
            <div>Mã biên bản: {model.code}</div>
            <div>Ngày bàn giao: {model.handoverDate}</div>
            <div>Ngày in: {model.printedAt}</div>
          </div>
          {model.isCancelled && (
            <div className={styles.handoverPrintCancelled}>BIÊN BẢN BÀN GIAO ĐÃ HỦY</div>
          )}
        </header>

        <section className={styles.handoverPrintSection}>
          <h2 className={styles.handoverPrintSectionTitle}>Thông tin công ty</h2>
          <div className={styles.handoverPrintCompanyBlock}>
            <div>{model.company.legalName}</div>
            <div>Địa chỉ: {model.company.address}</div>
            <div>Hotline: {model.company.hotline}</div>
            <div>Email: {model.company.email}</div>
            <div>Website: {model.company.website}</div>
          </div>
        </section>

        <section className={styles.handoverPrintSection}>
          <h2 className={styles.handoverPrintSectionTitle}>
            Thông tin khách hàng và địa điểm lắp đặt
          </h2>
          <InfoTable rows={customerRows} />
        </section>

        <section className={styles.handoverPrintSection}>
          <p className={styles.handoverPrintBasis}>{model.basisText}</p>
        </section>

        <section className={styles.handoverPrintSection}>
          <h2 className={styles.handoverPrintSectionTitle}>Hệ thống đã lắp đặt</h2>
          <InfoTable
            rows={model.systemRows.map((row) => ({
              label: row.label,
              value: row.value,
            }))}
          />
        </section>

        <section className={`${styles.handoverPrintSection} ${styles.handoverPrintSectionTable}`}>
          <h2 className={styles.handoverPrintSectionTitle}>Hạng mục bàn giao / thiết bị chính</h2>
          {model.equipmentFallback ? (
            <p className={styles.handoverPrintFallbackText}>
              Hạng mục bàn giao theo báo giá/hợp đồng đã được hai bên thống nhất.
            </p>
          ) : (
            <table className={styles.handoverPrintEquipmentTable}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Hạng mục</th>
                  <th>Số lượng</th>
                  <th>Đơn vị</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {model.equipmentItems.map((item) => (
                  <tr key={item.index}>
                    <td className={styles.handoverPrintEquipmentIndex}>{item.index}</td>
                    <td>{item.name}</td>
                    <td className={styles.handoverPrintEquipmentQty}>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{item.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={styles.handoverPrintSection}>
          <h2 className={styles.handoverPrintSectionTitle}>Nội dung xác nhận bàn giao</h2>
          <p className={styles.handoverPrintConfirmation}>
            GoldenCard đã hoàn thành việc lắp đặt và bàn giao hệ thống điện mặt trời tại địa chỉ
            nêu trên. Khách hàng đã kiểm tra hiện trạng bàn giao, nhận hướng dẫn vận hành cơ bản
            và thông tin liên hệ hỗ trợ sau bàn giao.
          </p>
          <ul className={styles.handoverPrintChecklist}>
            {CONFIRMATION_CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {hasHandoverNotes && (
          <section className={styles.handoverPrintSection}>
            <h2 className={styles.handoverPrintSectionTitle}>Ghi chú và tài liệu bàn giao</h2>
            {model.handover.note && (
              <div className={styles.handoverPrintNoteBlock}>
                <div className={styles.handoverPrintNoteLabel}>Ghi chú bàn giao</div>
                <p className={styles.handoverPrintNoteText}>{model.handover.note}</p>
              </div>
            )}
            {model.handover.documentLinks.length > 0 && (
              <div className={styles.handoverPrintNoteBlock}>
                <div className={styles.handoverPrintNoteLabel}>Link ảnh/tài liệu bàn giao</div>
                <div className={styles.handoverPrintLinks}>
                  {model.handover.documentLinks.map((link) => (
                    <DocumentLinkLine key={link} value={link} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className={styles.handoverPrintSignatures}>
          <div className={styles.handoverPrintSignatureBox}>
            <div className={styles.handoverPrintSignatureTitle}>ĐẠI DIỆN GOLDENCARD</div>
            <div className={styles.handoverPrintSignatureArea} />
            <div className={styles.handoverPrintSignatureLine} />
            <div className={styles.handoverPrintSignatureHint}>Ký, ghi rõ họ tên</div>
            {model.signatures.goldenCardName && (
              <div className={styles.handoverPrintSignaturePrintedName}>
                Họ tên: {model.signatures.goldenCardName}
              </div>
            )}
          </div>
          <div className={styles.handoverPrintSignatureBox}>
            <div className={styles.handoverPrintSignatureTitle}>ĐẠI DIỆN KHÁCH HÀNG</div>
            <div className={styles.handoverPrintSignatureArea} />
            <div className={styles.handoverPrintSignatureLine} />
            <div className={styles.handoverPrintSignatureHint}>Ký, ghi rõ họ tên</div>
            {model.signatures.customerName && (
              <div className={styles.handoverPrintSignaturePrintedName}>
                Họ tên: {model.signatures.customerName}
              </div>
            )}
          </div>
        </section>
      </article>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { QuotationPrintModel } from '../lib/build-quotation-print-model';
import styles from './quotation-print-document.module.css';

const ITEMS_FALLBACK =
  'Hạng mục theo phương án đã khảo sát và thống nhất giữa GoldenCard và khách hàng.';

type Props = {
  model: QuotationPrintModel;
  quotationId: string;
};

function InfoTable({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <table className={styles.quotationPrintTable}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className={styles.quotationPrintLabel}>{row.label}</td>
            <td className={styles.quotationPrintValue}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function QuotationPrintDocument({ model, quotationId }: Props) {
  function handlePrint() {
    window.print();
  }

  const customerRows = [
    { label: 'Khách hàng', value: model.customer.name },
    { label: 'Số điện thoại', value: model.customer.phone },
    { label: 'Địa chỉ lắp đặt', value: model.customer.installationAddress },
  ];

  return (
    <div className={styles.quotationPrintRoot}>
      <div className={`${styles.quotationPrintToolbar} noPrint`}>
        <Button type="button" onClick={handlePrint}>
          In / Lưu PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          render={<Link href={`/quotations/${quotationId}`} />}
        >
          Quay lại báo giá
        </Button>
      </div>

      <article className={styles.quotationPrintPage}>
        <header className={styles.quotationPrintHeader}>
          <div className={styles.quotationPrintBrand}>{model.company.name}</div>
          <h1 className={styles.quotationPrintTitle}>BÁO GIÁ HỆ THỐNG ĐIỆN MẶT TRỜI</h1>
          <div className={styles.quotationPrintMeta}>
            <div>Số báo giá: {model.codeWithRevision}</div>
            <div>Ngày lập: {model.documentDate}</div>
            {model.validUntil && <div>Hiệu lực đến: {model.validUntil}</div>}
            <div>Ngày in: {model.printedAt}</div>
            <div>Trạng thái: {model.statusLabel}</div>
          </div>
        </header>

        <section className={styles.quotationPrintSection}>
          <h2 className={styles.quotationPrintSectionTitle}>Thông tin công ty</h2>
          <div className={styles.quotationPrintCompanyBlock}>
            <div>{model.company.legalName}</div>
            <div>Địa chỉ: {model.company.address}</div>
            <div>Hotline: {model.company.hotline}</div>
            <div>Email: {model.company.email}</div>
            <div>Website: {model.company.website}</div>
            <div>
              Tài khoản: {model.company.bankAccount} · {model.company.bankName}
            </div>
          </div>
        </section>

        <section className={styles.quotationPrintSection}>
          <h2 className={styles.quotationPrintSectionTitle}>Thông tin khách hàng</h2>
          <InfoTable rows={customerRows} />
          {model.customer.contactNote && (
            <div className={styles.quotationPrintContactNote}>
              <div className={styles.quotationPrintLabel}>Ghi chú / nhu cầu khách hàng</div>
              <p className={styles.quotationPrintNoteText}>{model.customer.contactNote}</p>
            </div>
          )}
        </section>

        <section className={styles.quotationPrintSection}>
          <h2 className={styles.quotationPrintSectionTitle}>Tóm tắt kỹ thuật</h2>
          <InfoTable
            rows={model.technicalRows.map((row) => ({
              label: row.label,
              value: row.value,
            }))}
          />
          {model.zoneSummary && (
            <pre className={styles.quotationPrintZoneSummary}>{model.zoneSummary}</pre>
          )}
        </section>

        <section className={`${styles.quotationPrintSection} ${styles.quotationPrintSectionTable}`}>
          <h2 className={styles.quotationPrintSectionTitle}>Bảng báo giá chi tiết</h2>
          {model.itemsFallback ? (
            <p className={styles.quotationPrintFallbackText}>{ITEMS_FALLBACK}</p>
          ) : (
            <>
              <table className={styles.quotationPrintItemsTable}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Hạng mục</th>
                    <th>ĐVT</th>
                    <th>SL</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {model.items.map((item) => (
                    <tr key={item.index}>
                      <td className={styles.quotationPrintItemsIndex}>{item.index}</td>
                      <td>
                        <div>{item.name}</div>
                        {item.description && (
                          <div className={styles.quotationPrintItemDesc}>{item.description}</div>
                        )}
                      </td>
                      <td>{item.unit}</td>
                      <td className={styles.quotationPrintItemsQty}>{item.quantity}</td>
                      <td className={styles.quotationPrintItemsMoney}>{item.unitPrice}</td>
                      <td className={styles.quotationPrintItemsMoney}>{item.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.quotationPrintTotalsBlock}>
                {model.totals.showBreakdown && (
                  <>
                    <div className={styles.quotationPrintTotalsRow}>
                      <span>Tạm tính</span>
                      <span>{model.totals.subtotal}</span>
                    </div>
                    {model.totals.discount && (
                      <div className={styles.quotationPrintTotalsRow}>
                        <span>Chiết khấu</span>
                        <span>−{model.totals.discount}</span>
                      </div>
                    )}
                    {model.totals.tax && (
                      <div className={styles.quotationPrintTotalsRow}>
                        <span>
                          VAT{model.totals.vatRateLabel ? ` (${model.totals.vatRateLabel})` : ''}
                        </span>
                        <span>{model.totals.tax}</span>
                      </div>
                    )}
                  </>
                )}
                <div className={styles.quotationPrintTotalsGrand}>
                  <span>Tổng cộng</span>
                  <span>{model.totals.grandTotal}</span>
                </div>
              </div>
            </>
          )}
        </section>

        <section className={styles.quotationPrintSection}>
          <h2 className={styles.quotationPrintSectionTitle}>Điều khoản &amp; ghi chú</h2>
          <div className={styles.quotationPrintTermsBlock}>
            {model.quotationNote && (
              <div className={styles.quotationPrintQuotationNote}>
                <strong>Ghi chú báo giá:</strong>
                <p className={styles.quotationPrintNoteText}>{model.quotationNote}</p>
              </div>
            )}
            <p className={styles.quotationPrintWarranty}>{model.warrantyText}</p>
            {model.termsLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <section className={styles.quotationPrintSignatures}>
          <div className={styles.quotationPrintSignatureBox}>
            <div className={styles.quotationPrintSignatureTitle}>ĐẠI DIỆN GOLDENCARD</div>
            <div className={styles.quotationPrintSignatureArea} />
            <div className={styles.quotationPrintSignatureLine} />
            <div className={styles.quotationPrintSignatureHint}>Ký, ghi rõ họ tên</div>
          </div>
          <div className={styles.quotationPrintSignatureBox}>
            <div className={styles.quotationPrintSignatureTitle}>KHÁCH HÀNG</div>
            <div className={styles.quotationPrintSignatureArea} />
            <div className={styles.quotationPrintSignatureLine} />
            <div className={styles.quotationPrintSignatureHint}>Ký, ghi rõ họ tên</div>
          </div>
        </section>
      </article>
    </div>
  );
}

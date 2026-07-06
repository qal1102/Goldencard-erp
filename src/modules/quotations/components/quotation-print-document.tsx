'use client';

import { Button } from '@/components/ui/button';
import { PrintReturnButton } from '@/components/navigation/print-return-button';
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
    ...(model.customer.contactPerson
      ? [{ label: 'Người liên hệ', value: model.customer.contactPerson }]
      : []),
  ];

  return (
    <div className={styles.quotationPrintRoot}>
      <div className={`${styles.quotationPrintToolbar} noPrint`}>
        <Button type="button" onClick={handlePrint}>
          In / Lưu PDF
        </Button>
        <PrintReturnButton detailHref={`/quotations/${quotationId}`}>
          Quay lại báo giá
        </PrintReturnButton>
      </div>

      <article className={styles.quotationPrintPage}>
        <header className={styles.quotationPrintHeader}>
          <div className={styles.quotationPrintBrand}>{model.company.name}</div>
          <h1 className={styles.quotationPrintTitle}>BÁO GIÁ HỆ THỐNG ĐIỆN MẶT TRỜI</h1>
          <div className={styles.quotationPrintMeta}>
            <div>Ngày báo giá: {model.quotationDate}</div>
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
          </div>
        </section>

        <section className={styles.quotationPrintSection}>
          <h2 className={styles.quotationPrintSectionTitle}>Thông tin khách hàng</h2>
          <InfoTable rows={customerRows} />
        </section>

        <section className={`${styles.quotationPrintSection} ${styles.quotationPrintSectionTable}`}>
          <h2 className={styles.quotationPrintSectionTitle}>Nội dung báo giá</h2>
          {model.mainEquipment.length > 0 && (
            <div className={styles.quotationPrintEquipmentGrid}>
              {model.mainEquipment.map((item) => (
                <figure key={item.sku} className={styles.quotationPrintEquipmentCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className={styles.quotationPrintEquipmentImage}
                  />
                  <figcaption className={styles.quotationPrintEquipmentCaption}>
                    <span className={styles.quotationPrintEquipmentSku}>{item.sku}</span>
                    <span className={styles.quotationPrintEquipmentName}>{item.name}</span>
                    {item.specification && (
                      <span className={styles.quotationPrintEquipmentSpec}>
                        {item.specification}
                      </span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          {model.itemsFallback ? (
            <p className={styles.quotationPrintFallbackText}>{ITEMS_FALLBACK}</p>
          ) : (
            <>
              <table className={styles.quotationPrintItemsTable}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Hạng mục</th>
                    <th>Diễn giải</th>
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
                      <td>{item.name}</td>
                      <td className={styles.quotationPrintItemsDesc}>
                        {item.description || '—'}
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
                <div className={styles.quotationPrintTotalsGrand}>
                  <span>Tổng cộng</span>
                  <span>{model.totals.grandTotal}</span>
                </div>
              </div>
            </>
          )}
        </section>

        <section className={styles.quotationPrintSection}>
          <h2 className={styles.quotationPrintSectionTitle}>Điều kiện &amp; ghi chú</h2>
          <div className={styles.quotationPrintTermsBlock}>
            {model.termsSections.map((section) => (
              <div key={section.title} className={styles.quotationPrintTermsItem}>
                <h3 className={styles.quotationPrintTermsHeading}>{section.title}</h3>
                <p className={styles.quotationPrintNoteText}>{section.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.quotationPrintSignatures}>
          <div className={styles.quotationPrintSignatureBox}>
            <div className={styles.quotationPrintSignatureTitle}>
              {model.signatures.goldenCardTitle}
            </div>
            <div className={styles.quotationPrintSignatureArea} />
            <div className={styles.quotationPrintSignatureLine} />
            <div className={styles.quotationPrintSignatureHint}>Ký, ghi rõ họ tên</div>
          </div>
          <div className={styles.quotationPrintSignatureBox}>
            <div className={styles.quotationPrintSignatureTitle}>
              {model.signatures.customerTitle}
            </div>
            <div className={styles.quotationPrintSignatureArea} />
            <div className={styles.quotationPrintSignatureLine} />
            <div className={styles.quotationPrintSignatureHint}>Ký, ghi rõ họ tên</div>
          </div>
        </section>

        {model.footerTrace && (
          <footer className={styles.quotationPrintFooter}>
            Mã tham chiếu nội bộ: {model.footerTrace}
          </footer>
        )}
      </article>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ContractPrintModel } from '../lib/build-contract-print-model';

const ITEMS_FALLBACK =
  'Hạng mục thi công theo báo giá/hồ sơ đã được hai bên thống nhất.';
import styles from './contract-print-document.module.css';

type Props = {
  model: ContractPrintModel;
  contractId: string;
};

function InfoTable({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <table className={styles.contractPrintTable}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className={styles.contractPrintLabel}>{row.label}</td>
            <td className={styles.contractPrintValue}>{row.value}</td>
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
        className={styles.contractPrintLink}
      >
        {trimmed}
      </a>
    );
  }
  return <span>{trimmed}</span>;
}

export function ContractPrintDocument({ model, contractId }: Props) {
  function handlePrint() {
    window.print();
  }

  const partyA = model.company;

  return (
    <div className={styles.contractPrintRoot}>
      <div className={`${styles.contractPrintToolbar} noPrint`}>
        <Button type="button" onClick={handlePrint}>
          In / Lưu PDF
        </Button>
        <Button type="button" variant="outline" render={<Link href={`/contracts/${contractId}`} />}>
          Quay lại hợp đồng
        </Button>
      </div>

      <article className={styles.contractPrintPage}>
        <header className={styles.contractPrintHeader}>
          <div className={styles.contractPrintBrand}>{model.company.name}</div>
          <h1 className={styles.contractPrintTitle}>
            HỢP ĐỒNG THI CÔNG HỆ THỐNG ĐIỆN MẶT TRỜI
          </h1>
          <div className={styles.contractPrintMeta}>
            <div>Số hợp đồng: {model.code}</div>
            <div>Ngày lập: {model.createdAt}</div>
            {model.signedAt && <div>Ngày ký: {model.signedAt}</div>}
            <div>Ngày in: {model.printedAt}</div>
            {!model.isCancelled && <div>Trạng thái: {model.statusLabel}</div>}
          </div>
          {model.isCancelled && (
            <div className={styles.contractPrintCancelled}>HỢP ĐỒNG ĐÃ HỦY</div>
          )}
        </header>

        <section className={styles.contractPrintSection}>
          <h2 className={styles.contractPrintSectionTitle}>Thông tin công ty</h2>
          <div className={styles.contractPrintCompanyBlock}>
            <div>{partyA.legalName}</div>
            <div>Địa chỉ: {partyA.address}</div>
            <div>Hotline: {partyA.hotline}</div>
            <div>Email: {partyA.email}</div>
            <div>Website: {partyA.website}</div>
          </div>
        </section>

        <section className={styles.contractPrintSection}>
          <h2 className={styles.contractPrintSectionTitle}>Các bên tham gia</h2>
          <div className={styles.contractPrintPartiesBlock}>
            <h3 className={styles.contractPrintSubTitle}>A. Bên A — GoldenCard</h3>
            <p>
              <strong>{partyA.legalName}</strong>
            </p>
            <p>Địa chỉ: {partyA.address}</p>
            <p>
              Điện thoại: {partyA.hotline} · Email: {partyA.email} · Website: {partyA.website}
            </p>
            <p className={styles.contractPrintRepresentativeLine}>
              Đại diện:{' '}
              {model.parties.goldenCardRepresentative ?? '_______________________________'}
            </p>

            <h3 className={styles.contractPrintSubTitle}>B. Bên B — Khách hàng</h3>
            <p>
              <strong>{model.parties.customerName}</strong>
            </p>
            <p>Điện thoại: {model.parties.customerPhone}</p>
            <p>Địa chỉ: {model.parties.customerAddress}</p>
            <p>Địa chỉ lắp đặt: {model.parties.installationAddress}</p>
            <p className={styles.contractPrintRepresentativeLine}>
              Đại diện:{' '}
              {model.parties.customerSignerName ?? '_______________________________'}
            </p>
          </div>
        </section>

        <section className={styles.contractPrintSection}>
          <h2 className={styles.contractPrintSectionTitle}>Căn cứ hợp đồng</h2>
          <p className={styles.contractPrintBasis}>{model.basisText}</p>
        </section>

        <section className={styles.contractPrintSection}>
          <h2 className={styles.contractPrintSectionTitle}>
            Phạm vi dự án / hệ thống lắp đặt
          </h2>
          <InfoTable
            rows={model.systemRows.map((row) => ({
              label: row.label,
              value: row.value,
            }))}
          />
        </section>

        <section className={styles.contractPrintSection}>
          <h2 className={styles.contractPrintSectionTitle}>Giá trị hợp đồng</h2>
          <div className={styles.contractPrintValueBlock}>
            {model.value.showBreakdown && (
              <>
                {model.value.subtotal && (
                  <div className={styles.contractPrintValueRow}>
                    <span>Tạm tính</span>
                    <span>{model.value.subtotal}</span>
                  </div>
                )}
                {model.value.discount && (
                  <div className={styles.contractPrintValueRow}>
                    <span>Giảm giá</span>
                    <span>−{model.value.discount}</span>
                  </div>
                )}
                {model.value.tax && (
                  <div className={styles.contractPrintValueRow}>
                    <span>
                      VAT{model.value.vatRateLabel ? ` (${model.value.vatRateLabel})` : ''}
                    </span>
                    <span>{model.value.tax}</span>
                  </div>
                )}
              </>
            )}
            <div className={styles.contractPrintValueTotal}>
              <span>Giá trị hợp đồng</span>
              <span>{model.value.contractValue}</span>
            </div>
            <p className={styles.contractPrintFootnote}>{model.value.footnote}</p>
          </div>
        </section>

        <section className={`${styles.contractPrintSection} ${styles.contractPrintSectionTable}`}>
          <h2 className={styles.contractPrintSectionTitle}>
            Phạm vi thi công / hạng mục chính
          </h2>
          {model.scopeFallback ? (
            <p className={styles.contractPrintFallbackText}>{ITEMS_FALLBACK}</p>
          ) : (
            <table className={styles.contractPrintScopeTable}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Hạng mục</th>
                  <th>Số lượng</th>
                  <th>Đơn vị</th>
                  <th>Ghi chú / diễn giải</th>
                </tr>
              </thead>
              <tbody>
                {model.scopeItems.map((item) => (
                  <tr key={item.index}>
                    <td className={styles.contractPrintScopeIndex}>{item.index}</td>
                    <td>{item.name}</td>
                    <td className={styles.contractPrintScopeQty}>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{item.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={styles.contractPrintSection}>
          <h2 className={styles.contractPrintSectionTitle}>Điều khoản thanh toán</h2>
          <p className={styles.contractPrintBasis}>{model.paymentText}</p>
        </section>

        <section className={styles.contractPrintSection}>
          <h2 className={styles.contractPrintSectionTitle}>
            Trách nhiệm và nghiệm thu
          </h2>
          <ul className={styles.contractPrintClauseList}>
            {model.responsibilities.map((clause) => (
              <li key={clause}>{clause}</li>
            ))}
          </ul>
        </section>

        {model.contractNote && (
          <section className={styles.contractPrintSection}>
            <h2 className={styles.contractPrintSectionTitle}>Ghi chú hợp đồng</h2>
            <p className={styles.contractPrintNoteText}>{model.contractNote}</p>
          </section>
        )}

        {model.signedDocumentUrl && (
          <section className={styles.contractPrintSection}>
            <h2 className={styles.contractPrintSectionTitle}>Hồ sơ hợp đồng đã ký</h2>
            <DocumentLinkLine value={model.signedDocumentUrl} />
          </section>
        )}

        <section className={styles.contractPrintSignatures}>
          <div className={styles.contractPrintSignatureBox}>
            <div className={styles.contractPrintSignatureTitle}>ĐẠI DIỆN GOLDENCARD</div>
            <div className={styles.contractPrintSignatureArea} />
            <div className={styles.contractPrintSignatureLine} />
            <div className={styles.contractPrintSignatureHint}>Ký, ghi rõ họ tên</div>
            {model.signatures.goldenCardName && (
              <div className={styles.contractPrintSignaturePrintedName}>
                Họ tên: {model.signatures.goldenCardName}
              </div>
            )}
          </div>
          <div className={styles.contractPrintSignatureBox}>
            <div className={styles.contractPrintSignatureTitle}>ĐẠI DIỆN KHÁCH HÀNG</div>
            <div className={styles.contractPrintSignatureArea} />
            <div className={styles.contractPrintSignatureLine} />
            <div className={styles.contractPrintSignatureHint}>Ký, ghi rõ họ tên</div>
            {model.signatures.customerName && (
              <div className={styles.contractPrintSignaturePrintedName}>
                Họ tên: {model.signatures.customerName}
              </div>
            )}
          </div>
        </section>
      </article>
    </div>
  );
}

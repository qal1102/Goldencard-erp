'use client';

import { useRef, useState } from 'react';
import { PhoneIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  submitPublicWarrantySupportAction,
  type PublicWarrantyCheckView,
} from '../actions/public-warranty.actions';

const SESSION_SUBMIT_KEY_PREFIX = 'warranty-qr-submitted:';

type Props = {
  publicToken: string;
  initialView: PublicWarrantyCheckView;
};

export function PublicWarrantyCheck({ publicToken, initialView }: Props) {
  const [view] = useState(initialView);
  const [showForm, setShowForm] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [documentLinks, setDocumentLinks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const sessionSubmitKey = `${SESSION_SUBMIT_KEY_PREFIX}${publicToken}`;
  const [sessionBlocked, setSessionBlocked] = useState(false);

  function openSupportForm() {
    setShowForm(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sessionBlocked) {
      setError(
        'Yêu cầu của bạn đã được gửi. Vui lòng gọi hotline nếu cần hỗ trợ thêm trong phiên này.',
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = await submitPublicWarrantySupportAction({
      publicToken,
      issueTitle,
      issueDescription: issueDescription || undefined,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      documentLinks: documentLinks || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccessMessage(result.data.message);
    setShowForm(false);
    try {
      sessionStorage.setItem(sessionSubmitKey, '1');
      setSessionBlocked(true);
    } catch {
      /* ignore private mode */
    }
  }

  const canShowForm = view.canSubmitRequest && !successMessage && !sessionBlocked;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <header className="text-center">
        <p className="text-xs font-semibold tracking-widest text-amber-700">GOLDENCARD</p>
        <h1 className="mt-2 text-lg font-semibold">Tra cứu bảo hành</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{view.code}</p>
      </header>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Trạng thái bảo hành</dt>
            <dd className="font-medium">{view.statusLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Khách hàng</dt>
            <dd className="font-medium">{view.customerName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Địa chỉ lắp đặt</dt>
            <dd>{view.installationAddress}</dd>
          </div>
          {view.systemRows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
          {view.warrantyStart && (
            <div>
              <dt className="text-xs text-muted-foreground">Bắt đầu bảo hành</dt>
              <dd>{view.warrantyStart}</dd>
            </div>
          )}
          {view.warrantyEnd && (
            <div>
              <dt className="text-xs text-muted-foreground">Kết thúc bảo hành</dt>
              <dd>{view.warrantyEnd}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Hotline hỗ trợ</dt>
            <dd className="font-medium">{view.supportPhone}</dd>
          </div>
        </dl>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Nếu hệ thống có lỗi hoặc cần hỗ trợ, vui lòng gọi hotline hoặc gửi yêu cầu kỹ thuật bên
        dưới.
      </p>

      <div className="flex flex-col gap-2">
        {view.supportPhoneTel ? (
          <a
            href={`tel:${view.supportPhoneTel}`}
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
          >
            <PhoneIcon className="size-4" />
            Gọi hotline hỗ trợ
          </a>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Hotline: {view.supportPhone}
          </p>
        )}
        {canShowForm && (
          <Button type="button" className="w-full" onClick={openSupportForm}>
            Gửi yêu cầu kỹ thuật
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {successMessage}
        </div>
      )}

      {sessionBlocked && !successMessage && (
        <p className="text-center text-xs text-muted-foreground">
          Bạn đã gửi yêu cầu trong phiên này. Vui lòng gọi hotline nếu cần hỗ trợ thêm.
        </p>
      )}

      {showForm && canShowForm && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border bg-card p-4"
        >
          <h2 className="text-sm font-semibold">Yêu cầu hỗ trợ kỹ thuật</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issueTitle">Tiêu đề yêu cầu *</Label>
            <Input
              id="issueTitle"
              required
              maxLength={255}
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="VD: Hệ thống không phát điện"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issueDescription">Mô tả chi tiết</Label>
            <Textarea
              id="issueDescription"
              rows={4}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactName">Người liên hệ</Label>
            <Input
              id="contactName"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPhone">Số điện thoại</Label>
            <Input
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="documentLinks">Link ảnh/video nếu có</Label>
            <Textarea
              id="documentLinks"
              rows={2}
              placeholder="Mỗi dòng một link"
              value={documentLinks}
              onChange={(e) => setDocumentLinks(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Huỷ
            </Button>
          </div>
        </form>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Trang tra cứu dành cho khách hàng GoldenCard.
      </p>
    </div>
  );
}

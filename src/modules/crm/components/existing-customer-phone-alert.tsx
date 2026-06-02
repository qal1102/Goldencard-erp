'use client';

import { AlertTriangleIcon, ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { checkPhoneForLeadAction } from '../actions/lead.actions';

type Props = {
  phone: string;
};

type Match = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
};

export function ExistingCustomerPhoneAlert({ phone }: Props) {
  const [match, setMatch] = useState<Match | null>(null);
  const [existingLeadCount, setExistingLeadCount] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const trimmed = phone.trim();

    const timer = setTimeout(async () => {
      if (!/^\d{9,11}$/.test(trimmed)) {
        if (!cancelled) {
          setMatch(null);
          setExistingLeadCount(0);
          setChecking(false);
        }
        return;
      }

      if (!cancelled) setChecking(true);

      const result = await checkPhoneForLeadAction(trimmed);
      if (cancelled) return;

      if (result.success && result.data.existingCustomer) {
        setMatch(result.data.existingCustomer);
        setExistingLeadCount(result.data.existingLeadCount);
      } else {
        setMatch(null);
        setExistingLeadCount(0);
      }
      setChecking(false);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone]);

  if (!match || checking) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex flex-col gap-1 text-xs text-amber-900 dark:text-amber-100">
          <p className="font-medium">Khách hàng hiện có</p>
          <p>
            <span className="text-muted-foreground">Mã khách hàng:</span>{' '}
            <span className="font-mono">{match.code}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Tên:</span> {match.fullName}
          </p>
          {existingLeadCount > 0 && (
            <p className="text-amber-800 dark:text-amber-200">
              Đã có {existingLeadCount} cơ hội với số điện thoại này.
            </p>
          )}
          <p className="text-amber-800 dark:text-amber-200">
            Bạn có thể tạo cơ hội mới cho khách hàng này thay vì tạo khách trùng.
          </p>
        </div>
      </div>
      <Link
        href={`/crm/customers/${match.id}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:underline dark:text-amber-200"
      >
        Xem khách hàng
        <ExternalLinkIcon className="size-3" />
      </Link>
    </div>
  );
}

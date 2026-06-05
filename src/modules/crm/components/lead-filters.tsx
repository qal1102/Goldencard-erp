'use client';

import { SearchIcon, XIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LEAD_STATUS_LABELS, LEAD_STATUSES, type LeadStatus } from '../schema/lead.schema';
import { getLeadStatusLabel } from '../lib/lead-labels';

const ALL_LEAD_STATUSES_VALUE = '__all__';

export function LeadFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') as LeadStatus | null;

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  const hasFilters = search || status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] flex-1">
        <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm tên, số điện thoại..."
          className="pl-8"
          defaultValue={search}
          onChange={(e) => {
            const val = e.target.value;
            const timer = setTimeout(() => updateParams('search', val || null), 400);
            return () => clearTimeout(timer);
          }}
          disabled={isPending}
        />
      </div>

      <Select
        value={status ?? ALL_LEAD_STATUSES_VALUE}
        onValueChange={(val) =>
          updateParams('status', val === ALL_LEAD_STATUSES_VALUE ? null : val || null)
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tất cả trạng thái">
            {(value) =>
              value && value !== ALL_LEAD_STATUSES_VALUE ? getLeadStatusLabel(value) : null
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_LEAD_STATUSES_VALUE}>Tất cả trạng thái</SelectItem>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            startTransition(() => {
              router.replace(pathname);
            });
          }}
        >
          <XIcon className="size-4" />
          Xóa lọc
        </Button>
      )}
    </div>
  );
}

import Link from 'next/link';
import {
  ArrowRightIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  PhoneCallIcon,
  ShieldAlertIcon,
  WrenchIcon,
} from 'lucide-react';
import { and, count, desc, gte, inArray } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { db } from '@/db';
import { leads, quotations, warrantyTickets, workOrders } from '@/db/schema';
import { mainNavItems } from '@/lib/navigation/modules';
import { getLeadStatusLabel } from '@/modules/crm/lib/lead-labels';
import {
  QUOTATION_STATUS_LABELS,
  type QuotationStatus,
} from '@/modules/quotations/schema/quotation.schema';
import { latestQuotationRevisionCondition } from '@/modules/quotations/lib/quotation.queries';
import { displayQuotationCode } from '@/modules/quotations/lib/quotation-display';

const activeLeadStatuses = [
  'new',
  'contacting',
  'consulting',
  'awaiting_survey',
  'quoted',
  'negotiating',
] as const;

const quotationActionStatuses = ['draft', 'sent', 'needs_revision'] as const;
const activeWorkOrderStatuses = ['scheduled', 'in_progress'] as const;
const activeWarrantyStatuses = ['open', 'assigned', 'scheduled', 'in_progress'] as const;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatVnd(value: unknown) {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return '0 VND';
  }

  return `${new Intl.NumberFormat('vi-VN').format(numericValue)} VND`;
}

export default async function DashboardPage() {
  const today = startOfToday();

  const [
    leadsToday,
    activeLeads,
    quotationsToHandle,
    activeWorkOrders,
    activeWarrantyTickets,
    recentLeads,
    recentQuotations,
  ] = await Promise.all([
    db.select({ value: count() }).from(leads).where(gte(leads.createdAt, today)),
    db.select({ value: count() }).from(leads).where(inArray(leads.status, activeLeadStatuses)),
    db
      .select({ value: count() })
      .from(quotations)
      .where(
        and(
          inArray(quotations.status, quotationActionStatuses),
          latestQuotationRevisionCondition(),
        ),
      ),
    db
      .select({ value: count() })
      .from(workOrders)
      .where(inArray(workOrders.status, activeWorkOrderStatuses)),
    db
      .select({ value: count() })
      .from(warrantyTickets)
      .where(inArray(warrantyTickets.status, activeWarrantyStatuses)),
    db.query.leads.findMany({
      columns: {
        id: true,
        code: true,
        fullName: true,
        status: true,
        createdAt: true,
      },
      orderBy: [desc(leads.createdAt)],
      limit: 5,
    }),
    db.query.quotations.findMany({
      columns: {
        id: true,
        code: true,
        status: true,
        grandTotal: true,
        createdAt: true,
      },
      where: and(
        inArray(quotations.status, quotationActionStatuses),
        latestQuotationRevisionCondition(),
      ),
      orderBy: [desc(quotations.createdAt)],
      limit: 5,
    }),
  ]);

  const statCards = [
    {
      label: 'Lead mới hôm nay',
      value: leadsToday[0]?.value ?? 0,
      unit: 'lead',
      href: '/crm/leads',
      icon: PhoneCallIcon,
      tone: 'text-blue-700 bg-blue-50 dark:text-blue-200 dark:bg-blue-950/30',
    },
    {
      label: 'Lead đang xử lý',
      value: activeLeads[0]?.value ?? 0,
      unit: 'lead',
      href: '/crm/leads',
      icon: ClipboardCheckIcon,
      tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/30',
    },
    {
      label: 'Báo giá cần xử lý',
      value: quotationsToHandle[0]?.value ?? 0,
      unit: 'báo giá',
      href: '/quotations',
      icon: FileTextIcon,
      tone: 'text-amber-700 bg-amber-50 dark:text-amber-200 dark:bg-amber-950/30',
    },
    {
      label: 'Lệnh thi công mở',
      value: activeWorkOrders[0]?.value ?? 0,
      unit: 'lệnh',
      href: '/work-orders',
      icon: WrenchIcon,
      tone: 'text-cyan-700 bg-cyan-50 dark:text-cyan-200 dark:bg-cyan-950/30',
    },
    {
      label: 'Bảo hành đang mở',
      value: activeWarrantyTickets[0]?.value ?? 0,
      unit: 'ticket',
      href: '/warranty',
      icon: ShieldAlertIcon,
      tone: 'text-rose-700 bg-rose-50 dark:text-rose-200 dark:bg-rose-950/30',
    },
  ];

  const quickLinks = mainNavItems.filter((item) => item.id !== 'dashboard');

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Badge variant="secondary" className="w-fit rounded-full px-3 text-xs font-medium">
          Tổng quan vận hành
        </Badge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">GoldenCard ERP</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi nhanh các việc cần xử lý trong ngày.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="group block">
              <Card className="h-full border-border/80 shadow-sm transition-colors group-hover:border-primary/40">
                <CardContent className="flex min-h-28 flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <span className={`rounded-md p-2 ${stat.tone}`}>
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-3xl font-semibold tabular-nums">{stat.value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{stat.unit}</p>
                    </div>
                    <ArrowRightIcon className="mb-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lead mới nhất</CardTitle>
            <CardDescription>5 cơ hội vừa được tạo gần đây.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recentLeads.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Chưa có lead.</p>
            )}
            {recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/crm/leads/${lead.id}`}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{lead.fullName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{lead.code}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {getLeadStatusLabel(lead.status)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Báo giá cần xử lý</CardTitle>
            <CardDescription>
              Hiển thị tối đa 5 báo giá: nháp, đã gửi hoặc cần chỉnh sửa.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recentQuotations.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">
                Không có báo giá cần xử lý.
              </p>
            )}
            {recentQuotations.map((quotation) => (
              <Link
                key={quotation.id}
                href={`/quotations/${quotation.id}`}
                className="grid gap-3 rounded-md border px-3 py-3 text-sm transition-colors hover:bg-muted/50 sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="text-[11px] uppercase text-muted-foreground">Mã báo giá</p>
                  <p className="truncate font-mono text-sm font-semibold text-primary">
                    {displayQuotationCode(quotation.code)}
                  </p>
                  <p className="mt-1 text-[11px] uppercase text-muted-foreground">
                    Tổng giá trị
                  </p>
                  <p className="font-medium tabular-nums">{formatVnd(quotation.grandTotal)}</p>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:justify-center">
                  <span className="text-[11px] uppercase text-muted-foreground">
                    Trạng thái
                  </span>
                  <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {QUOTATION_STATUS_LABELS[quotation.status as QuotationStatus] ??
                      quotation.status}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Truy cập nhanh
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.href} className="group block">
                <Card className="border-border/80 shadow-sm transition-colors group-hover:border-primary/40">
                  <CardContent className="flex min-h-20 items-center gap-4 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.phase}</p>
                    </div>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

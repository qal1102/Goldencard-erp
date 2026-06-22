import { requireSuperAdminPage } from '@/lib/auth/super-admin';
import { AuditLogList } from '@/modules/audit-logs/components/audit-log-list';
import { loadAuditLogs } from '@/modules/audit-logs/lib/audit-log-load';
import type { AuditLogFilters } from '@/modules/audit-logs/schema/audit-log.schema';

type AdminActivityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminActivityPage({
  searchParams,
}: AdminActivityPageProps) {
  await requireSuperAdminPage();

  const params = await searchParams;
  const filters: AuditLogFilters = {
    q: getFirstParam(params.q),
    userId: getFirstParam(params.userId),
    resource: getFirstParam(params.resource),
    action: getFirstParam(params.action),
    from: getFirstParam(params.from),
    to: getFirstParam(params.to),
  };
  const result = await loadAuditLogs(filters);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">Super Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Nhật ký hoạt động
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Theo dõi ai đã tạo, sửa, khóa, mở khóa hoặc thao tác dữ liệu trong hệ
          thống. Trang này chỉ dành cho Super Admin.
        </p>
      </div>

      <AuditLogList
        logs={result.success ? result.data : []}
        options={result.options}
        filters={result.success ? result.filters : filters}
        error={result.success ? null : result.error}
      />
    </div>
  );
}

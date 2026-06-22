import type {
  SerializedAuditLogFilterOptions,
  SerializedAuditLogRow,
} from '../lib/audit-log-load';
import type { AuditLogFilters } from '../schema/audit-log.schema';

type Props = {
  logs: SerializedAuditLogRow[];
  options: SerializedAuditLogFilterOptions;
  filters: AuditLogFilters;
  error?: string | null;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function inputClassName() {
  return 'h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40';
}

function selectClassName() {
  return 'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40';
}

function getActorLabel(log: SerializedAuditLogRow) {
  if (!log.actorUserId) return 'Hệ thống';
  return log.actorEmail ? `${log.actorName} · ${log.actorEmail}` : log.actorName;
}

export function AuditLogList({ logs, options, filters, error = null }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <form className="rounded-lg border p-3" action="/admin/activity">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Tìm kiếm</span>
            <input
              name="q"
              defaultValue={filters.q ?? ''}
              className={inputClassName()}
              placeholder="Tóm tắt, action, resource, người thao tác..."
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Người thao tác</span>
            <select name="userId" defaultValue={filters.userId ?? ''} className={selectClassName()}>
              <option value="">Tất cả</option>
              {options.actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name} · {actor.email}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Module / tài nguyên</span>
            <select
              name="resource"
              defaultValue={filters.resource ?? ''}
              className={selectClassName()}
            >
              <option value="">Tất cả</option>
              {options.resources.map((resource) => (
                <option key={resource.value} value={resource.value}>
                  {resource.value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Hành động</span>
            <select name="action" defaultValue={filters.action ?? ''} className={selectClassName()}>
              <option value="">Tất cả</option>
              {options.actions.map((action) => (
                <option key={action.value} value={action.value}>
                  {action.value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Từ ngày</span>
            <input
              type="date"
              name="from"
              defaultValue={filters.from ?? ''}
              className={inputClassName()}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Đến ngày</span>
            <input
              type="date"
              name="to"
              defaultValue={filters.to ?? ''}
              className={inputClassName()}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <a
            href="/admin/activity"
            className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
          >
            Xóa lọc
          </a>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Lọc nhật ký
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          <div>
            <p className="text-sm font-medium">Nhật ký gần nhất</p>
            <p className="text-xs text-muted-foreground">
              Hiển thị tối đa 200 dòng theo bộ lọc hiện tại.
            </p>
          </div>
          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {logs.length} dòng
          </span>
        </div>

        {logs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Chưa có nhật ký phù hợp.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <div className="grid min-w-[980px] grid-cols-[150px_220px_160px_1.3fr_160px] border-b bg-muted/60 px-3 py-2 text-xs font-medium">
              <span>Thời gian</span>
              <span>Người thao tác</span>
              <span>Hành động</span>
              <span>Nội dung</span>
              <span>Tài nguyên</span>
            </div>
            {logs.map((log) => (
              <div
                key={log.id}
                className="grid min-w-[980px] grid-cols-[150px_220px_160px_1.3fr_160px] border-b px-3 py-2 text-xs last:border-b-0"
              >
                <span className="text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                <span className="truncate">{getActorLabel(log)}</span>
                <span className="font-mono text-primary">{log.action}</span>
                <span className="min-w-0">
                  <span className="line-clamp-2">{log.summary ?? 'Không có tóm tắt'}</span>
                  {(log.hasBefore || log.hasAfter) && (
                    <span className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Có dữ liệu audit
                    </span>
                  )}
                </span>
                <span className="truncate">
                  {log.resource}
                  {log.resourceId ? ` · ${log.resourceId}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


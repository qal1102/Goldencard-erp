import { cn } from "@/lib/utils";

type AppBrandProps = {
  className?: string;
  showTagline?: boolean;
};

export function AppBrand({ className, showTagline = false }: AppBrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold tracking-tight text-primary-foreground shadow-sm"
        aria-hidden="true"
      >
        GC
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-base font-semibold tracking-tight text-foreground">
          GoldenCard{" "}
          <span className="font-medium text-muted-foreground">ERP</span>
        </p>
        {showTagline ? (
          <p className="truncate text-xs text-muted-foreground">
            Hệ thống quản trị nội bộ
          </p>
        ) : null}
      </div>
    </div>
  );
}

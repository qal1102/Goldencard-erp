import { Skeleton } from '@/components/ui/skeleton';

export default function CrmLeadsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="flex gap-3 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-[280px] flex-shrink-0 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

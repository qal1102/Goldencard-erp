import { Skeleton } from '@/components/ui/skeleton';

export default function WarrantyLoading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Skeleton className="h-6 w-40" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-44" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

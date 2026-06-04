import { Skeleton } from '@/components/ui/skeleton';

export default function HandoversLoading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-10 w-52" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

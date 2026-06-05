import { Skeleton } from '@/components/ui/skeleton';

export default function WarrantyCertificateDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

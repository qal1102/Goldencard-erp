'use client';

import { useEffect, useState } from 'react';
import { ModuleListError } from '@/components/ui/module-list-error';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomers } from '../hooks/use-customers';
import { CustomerCard } from './customer-card';

export function CustomerList() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const {
    data: customerList,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useCustomers({ search: debouncedSearch || undefined });

  const showSkeleton = isPending && !customerList;
  const showError = !customerList && isError;
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Không thể tải danh sách khách hàng. Vui lòng thử lại.';

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Tìm theo tên hoặc SĐT..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isFetching && customerList && customerList.length > 0 && (
        <p className="text-xs text-muted-foreground">Đang cập nhật danh sách...</p>
      )}

      {showError && (
        <ModuleListError
          message={errorMessage}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      )}

      {showSkeleton && !showError && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!showSkeleton && !showError && customerList?.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {debouncedSearch ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng'}
        </div>
      )}

      {!showSkeleton && !showError && customerList && customerList.length > 0 && (
        <div className="flex flex-col gap-3">
          {customerList.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}

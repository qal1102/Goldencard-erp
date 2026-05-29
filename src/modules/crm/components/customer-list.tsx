'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomers } from '../hooks/use-customers';
import { CustomerCard } from './customer-card';

export function CustomerList() {
  const [search, setSearch] = useState('');
  const { data: customerList, isLoading } = useCustomers({ search: search || undefined });

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Tìm theo tên hoặc SĐT..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!isLoading && (!customerList || customerList.length === 0) && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {search ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng'}
        </div>
      )}

      {!isLoading && customerList && customerList.length > 0 && (
        <div className="flex flex-col gap-3">
          {customerList.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}

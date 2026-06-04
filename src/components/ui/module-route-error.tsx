'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  title: string;
  error: Error & { digest?: string };
  reset: () => void;
};

export function ModuleRouteError({ title, error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[route] ${title}`, error);
    }
  }, [error, title]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-6 text-center">
        <p className="text-sm font-medium text-destructive">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Vui lòng thử lại. Nếu lỗi vẫn tiếp diễn, liên hệ quản trị hệ thống.
        </p>
        <Button type="button" variant="secondary" className="mt-4 min-h-11" onClick={reset}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}

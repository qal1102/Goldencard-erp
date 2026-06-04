'use client';

import { Button } from '@/components/ui/button';

type ModuleListErrorProps = {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
};

export function ModuleListError({ message, onRetry, isRetrying = false }: ModuleListErrorProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-6 text-center">
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="secondary"
          className="mt-4 min-h-11"
          disabled={isRetrying}
          onClick={onRetry}
        >
          {isRetrying ? 'Đang thử lại...' : 'Thử lại'}
        </Button>
      )}
    </div>
  );
}

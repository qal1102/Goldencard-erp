'use client';

import { useState } from 'react';
import { CopyIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  url: string;
  label?: string;
};

export function CopyPublicLinkButton({ url, label = 'Sao chép liên kết công khai' }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Sao chép liên kết:', url);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        void handleCopy();
      }}
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      {copied ? 'Đã sao chép' : label}
    </Button>
  );
}

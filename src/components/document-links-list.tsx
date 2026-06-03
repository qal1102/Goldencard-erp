import { ExternalLinkIcon } from 'lucide-react';

function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
}

function DocumentLinkLine({ value }: { value: string }) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isLikelyUrl(trimmed)) {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        {trimmed}
        <ExternalLinkIcon className="size-3.5 shrink-0" />
      </a>
    );
  }
  return <span className="text-sm">{trimmed}</span>;
}

type Props = {
  value: string | null | undefined;
  emptyLabel?: string;
};

export function DocumentLinksList({ value, emptyLabel = '—' }: Props) {
  if (!value?.trim()) {
    return <span className="text-sm text-muted-foreground">{emptyLabel}</span>;
  }

  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return <span className="text-sm text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, index) => (
        <DocumentLinkLine key={`${index}-${line.slice(0, 24)}`} value={line} />
      ))}
    </div>
  );
}

import { ChevronDownIcon, HelpCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModuleGuideProps = {
  title: string;
  description: string;
  steps: string[];
  note?: string;
  defaultOpen?: boolean;
  className?: string;
};

export function ModuleGuide({
  title,
  description,
  steps,
  note,
  defaultOpen = false,
  className,
}: ModuleGuideProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-sm shadow-sm shadow-sky-950/5 dark:border-sky-900 dark:bg-sky-950/20',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sky-950 outline-none marker:hidden dark:text-sky-100 [&::-webkit-details-marker]:hidden">
        <HelpCircleIcon className="size-4 shrink-0 text-sky-700 dark:text-sky-300" />
        <span className="font-medium">{title}</span>
        <span className="ml-auto hidden text-xs text-sky-700 group-open:inline dark:text-sky-300">
          Thu gọn
        </span>
        <span className="ml-auto text-xs text-sky-700 group-open:hidden dark:text-sky-300">
          Mở hướng dẫn
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-sky-700 transition-transform group-open:rotate-180 dark:text-sky-300" />
      </summary>

      <div className="mt-3 space-y-3 text-muted-foreground">
        <p>{description}</p>
        <ol className="grid gap-2 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li key={`${index}-${step}`} className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-700 text-[11px] font-semibold text-white dark:bg-sky-400 dark:text-sky-950">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {note && (
          <p className="rounded-md bg-white/70 px-3 py-2 text-xs text-sky-950 dark:bg-sky-950/40 dark:text-sky-100">
            {note}
          </p>
        )}
      </div>
    </details>
  );
}

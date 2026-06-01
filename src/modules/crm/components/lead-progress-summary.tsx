import type { ProjectProgressView } from '@/lib/project-progress/types';
import { ProjectProgressPanel } from '@/lib/project-progress/ui/project-progress-panel';

type Props = {
  progress: ProjectProgressView;
  compact?: boolean;
};

/** Compact progress strip for pipeline cards. */
export function LeadProgressSummary({ progress, compact = true }: Props) {
  return <ProjectProgressPanel progress={progress} variant={compact ? 'compact' : 'full'} />;
}

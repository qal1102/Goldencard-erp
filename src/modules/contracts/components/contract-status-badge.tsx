import { Badge } from '@/components/ui/badge';
import {
  CONTRACT_STATUS_LABELS,
  type ContractStatus,
} from '../schema/contract.schema';

const STATUS_STYLES: Record<ContractStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  prepared: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  signed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

type Props = {
  status: ContractStatus | string;
};

export function ContractStatusBadge({ status }: Props) {
  const key = status as ContractStatus;
  const label = CONTRACT_STATUS_LABELS[key] ?? status;
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.draft;

  return (
    <Badge variant="secondary" className={style}>
      {label}
    </Badge>
  );
}

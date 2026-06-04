import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = {
  isActive: boolean;
  className?: string;
};

export function AdminUserStatusBadge({ isActive, className }: Props) {
  return (
    <Badge
      variant={isActive ? 'default' : 'secondary'}
      className={cn(
        isActive ? 'bg-emerald-600/90 hover:bg-emerald-600/90' : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {isActive ? 'Đang hoạt động' : 'Đã khóa'}
    </Badge>
  );
}

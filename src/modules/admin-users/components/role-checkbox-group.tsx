'use client';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '../lib/role-labels';

type RoleOption = {
  id: string;
  name: string;
};

type Props = {
  roles: RoleOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function RoleCheckboxGroup({ roles, selectedIds, onChange, disabled }: Props) {
  function toggle(roleId: string) {
    if (disabled) return;
    if (selectedIds.includes(roleId)) {
      onChange(selectedIds.filter((id) => id !== roleId));
    } else {
      onChange([...selectedIds, roleId]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Vai trò *</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {roles.map((role) => {
          const checked = selectedIds.includes(role.id);
          return (
            <label
              key={role.id}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="checkbox"
                className="size-4 shrink-0 rounded border-input"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(role.id)}
              />
              <span>{getRoleLabel(role.name)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

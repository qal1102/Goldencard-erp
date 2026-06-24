'use client';

import { cn } from '@/lib/utils';

type UserAvatarProps = {
  name: string | null | undefined;
  avatarUrl?: string | null;
  className?: string;
  imageClassName?: string;
};

function getInitials(name: string | null | undefined): string {
  const value = name?.trim();
  if (!value) return '?';

  return value
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserAvatar({
  name,
  avatarUrl,
  className,
  imageClassName,
}: UserAvatarProps) {
  const cleanAvatar = avatarUrl?.trim();
  const initials = getInitials(name);

  if (cleanAvatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cleanAvatar}
        alt={name?.trim() || 'Avatar'}
        className={cn(
          'size-8 shrink-0 rounded-full object-cover ring-1 ring-border',
          className,
          imageClassName,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-border',
        className,
      )}
      aria-label={name?.trim() || 'Nguoi dung'}
    >
      {initials}
    </span>
  );
}

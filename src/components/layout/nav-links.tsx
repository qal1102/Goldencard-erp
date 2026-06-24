"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavItems, canViewNavItem, mainNavItems } from "@/lib/navigation/modules";
import { cn } from "@/lib/utils";

type NavLinksProps = {
  onNavigate?: () => void;
  className?: string;
  userRoles?: string[];
  isSuperAdmin?: boolean;
};

function NavLinkItem({
  item,
  pathname,
  onNavigate,
}: {
  item: (typeof mainNavItems)[number];
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;

  return (
    <Link
      key={item.id}
      href={item.href}
      prefetch={true}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
        "active:scale-[0.99]",
        isActive
          ? "bg-primary/10 text-primary before:absolute before:top-1/2 before:left-0 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary"
          : "text-foreground/75 hover:bg-muted/80 hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-[18px] shrink-0", isActive && "text-primary")}
        aria-hidden="true"
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function NavLinks({
  onNavigate,
  className,
  userRoles = [],
  isSuperAdmin = false,
}: NavLinksProps) {
  const pathname = usePathname();
  const visibleMainItems = mainNavItems.filter((item) =>
    canViewNavItem(item, userRoles, isSuperAdmin),
  );

  return (
    <nav
      className={cn("flex flex-col gap-1", className)}
      aria-label="Điều hướng chính"
    >
      {visibleMainItems.map((item) => (
        <NavLinkItem key={item.id} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}

      {isSuperAdmin && (
        <>
          <p className="mt-3 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị
          </p>
          {adminNavItems.map((item) => (
            <NavLinkItem key={item.id} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/navigation/modules";

type NavLinksProps = {
  onNavigate?: () => void;
  className?: string;
};

export function NavLinks({ onNavigate, className }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("flex flex-col gap-1", className)}
      aria-label="Điều hướng chính"
    >
      {mainNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={item.href}
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
      })}
    </nav>
  );
}

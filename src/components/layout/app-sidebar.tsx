import { AppBrand } from "@/components/layout/app-brand";
import { NavLinks } from "@/components/layout/nav-links";

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-[4.5rem] items-center border-b border-sidebar-border px-5">
        <AppBrand showTagline />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks />
      </div>
    </aside>
  );
}

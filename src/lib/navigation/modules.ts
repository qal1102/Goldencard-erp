import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  phase: string;
  description: string;
};

export const mainNavItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Tổng quan",
    href: "/dashboard",
    icon: LayoutDashboard,
    phase: "Phase 1",
    description: "Theo dõi nhanh tình hình dự án, báo giá và vận hành.",
  },
  {
    id: "crm-leads",
    label: "CRM / Lead",
    href: "/crm/leads",
    icon: UserPlus,
    phase: "Phase 2",
    description: "Quản lý khách tiềm năng và pipeline bán hàng.",
  },
  {
    id: "surveys",
    label: "Khảo sát",
    href: "/surveys",
    icon: ClipboardList,
    phase: "Phase 3",
    description: "Ghi nhận khảo sát hiện trường trước khi báo giá.",
  },
  {
    id: "quotations",
    label: "Báo giá",
    href: "/quotations",
    icon: FileText,
    phase: "Phase 3",
    description: "Lập báo giá, kiểm tra tồn kho và cảnh báo thiếu hàng.",
  },
  {
    id: "inventory",
    label: "Kho",
    href: "/inventory",
    icon: Package,
    phase: "Phase 4",
    description: "Quản lý tồn kho, BOM và xuất kho theo quy trình duyệt.",
  },
  {
    id: "work-orders",
    label: "Lệnh thi công",
    href: "/work-orders",
    icon: Wrench,
    phase: "Phase 5",
    description: "Lập kế hoạch thi công, giám sát và nhập vật tư thực tế.",
  },
  {
    id: "settings",
    label: "Cài đặt",
    href: "/settings",
    icon: Settings,
    phase: "Ongoing",
    description: "Cấu hình hệ thống và mở rộng module.",
  },
];

export function getNavItemByHref(pathname: string): NavItem | undefined {
  return mainNavItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)),
  );
}

export function getModuleById(id: string): NavItem | undefined {
  return mainNavItems.find((item) => item.id === id);
}

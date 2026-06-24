import {
  ClipboardList,
  FileText,
  Handshake,
  BadgeCheck,
  History,
  LifeBuoy,
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  Shield,
  Users,
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
  roles?: string[];
};

const ALL_BUSINESS_ROLES = [
  'admin',
  'director',
  'sales',
  'project_manager',
  'chief_engineer',
  'technician',
  'chief_accountant',
  'accountant',
  'customer_service',
];

const SALES_ROLES = ['admin', 'director', 'sales', 'chief_accountant'];
const FINANCE_ROLES = ['admin', 'director', 'sales', 'chief_accountant', 'accountant'];
const TECHNICAL_ROLES = [
  'admin',
  'director',
  'sales',
  'project_manager',
  'chief_engineer',
  'technician',
];
const INVENTORY_ROLES = [
  'admin',
  'director',
  'project_manager',
  'chief_engineer',
  'technician',
  'chief_accountant',
  'accountant',
];
const AFTER_SALES_ROLES = [
  'admin',
  'director',
  'sales',
  'project_manager',
  'chief_engineer',
  'technician',
  'chief_accountant',
  'accountant',
  'customer_service',
];

export const mainNavItems: NavItem[] = [
  {
    id: "dashboard",
    roles: ALL_BUSINESS_ROLES,
    label: "Tổng quan",
    href: "/dashboard",
    icon: LayoutDashboard,
    phase: "Phase 1",
    description: "Theo dõi nhanh tình hình dự án, báo giá và vận hành.",
  },
  {
    id: "crm-leads",
    roles: SALES_ROLES,
    label: "CRM / Cơ hội",
    href: "/crm/leads",
    icon: UserPlus,
    phase: "Phase 2",
    description: "Quản lý khách tiềm năng và pipeline bán hàng.",
  },
  {
    id: "crm-customers",
    roles: [...SALES_ROLES, 'project_manager', 'chief_engineer', 'customer_service'],
    label: "Khách hàng",
    href: "/crm/customers",
    icon: Users,
    phase: "Phase 2",
    description: "Danh sách khách hàng đã chốt hợp đồng từ pipeline bán hàng.",
  },
  {
    id: "surveys",
    roles: TECHNICAL_ROLES,
    label: "Khảo sát",
    href: "/surveys",
    icon: ClipboardList,
    phase: "Phase 3",
    description: "Ghi nhận khảo sát hiện trường trước khi báo giá.",
  },
  {
    id: "quotations",
    roles: [...FINANCE_ROLES, 'project_manager', 'chief_engineer'],
    label: "Báo giá",
    href: "/quotations",
    icon: FileText,
    phase: "Phase 3",
    description: "Lập báo giá, kiểm tra tồn kho và cảnh báo thiếu hàng.",
  },
  {
    id: "contracts",
    roles: [...FINANCE_ROLES, 'project_manager', 'chief_engineer'],
    label: "Hợp đồng",
    href: "/contracts",
    icon: ScrollText,
    phase: "Phase 4",
    description: "Hợp đồng tạo từ báo giá đã chấp nhận.",
  },
  {
    id: "inventory",
    roles: INVENTORY_ROLES,
    label: "Kho",
    href: "/inventory",
    icon: Package,
    phase: "Phase 4",
    description: "Quản lý tồn kho, BOM và xuất kho theo quy trình duyệt.",
  },
  {
    id: "work-orders",
    roles: TECHNICAL_ROLES,
    label: "Lệnh thi công",
    href: "/work-orders",
    icon: Wrench,
    phase: "Phase 5",
    description: "Lập kế hoạch thi công, giám sát và nhập vật tư thực tế.",
  },
  {
    id: "handovers",
    roles: AFTER_SALES_ROLES,
    label: "Bàn giao",
    href: "/handovers",
    icon: Handshake,
    phase: "Phase 5",
    description: "Phiếu bàn giao sau khi hoàn thành thi công.",
  },
  {
    id: "warranty",
    roles: AFTER_SALES_ROLES,
    label: "Bảo hành / CSKH",
    href: "/warranty",
    icon: LifeBuoy,
    phase: "Phase 6",
    description: "Tiếp nhận và xử lý yêu cầu sau bàn giao.",
  },
  {
    id: "warranty-certificates",
    roles: AFTER_SALES_ROLES,
    label: "Phiếu bảo hành",
    href: "/warranty-certificates",
    icon: BadgeCheck,
    phase: "Phase 6",
    description: "Phiếu bảo hành khách hàng và mã QR tra cứu công khai.",
  },
  {
    id: "settings",
    roles: ALL_BUSINESS_ROLES,
    label: "Cài đặt",
    href: "/settings",
    icon: Settings,
    phase: "Ongoing",
    description: "Cấu hình hệ thống và mở rộng module.",
  },
];

export const adminNavItems: NavItem[] = [
  {
    id: "admin-users",
    label: "Quản lý tài khoản",
    href: "/admin/users",
    icon: Shield,
    phase: "Admin",
    description: "Tạo và quản lý tài khoản nhân viên.",
  },
  {
    id: "admin-activity",
    label: "Nhật ký hoạt động",
    href: "/admin/activity",
    icon: History,
    phase: "Admin",
    description: "Xem ai đã thao tác gì trong hệ thống.",
  },
];

export function canViewNavItem(
  item: NavItem,
  userRoles: string[] = [],
  isSuperAdmin = false,
): boolean {
  if (isSuperAdmin) return true;
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.some((role) => userRoles.includes(role));
}

const allNavItems = [...mainNavItems, ...adminNavItems];

export function getNavItemByHref(pathname: string): NavItem | undefined {
  return allNavItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)),
  );
}

export function getModuleById(id: string): NavItem | undefined {
  return mainNavItems.find((item) => item.id === id);
}

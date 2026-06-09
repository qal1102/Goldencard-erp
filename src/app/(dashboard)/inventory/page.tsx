import Link from 'next/link';
import {
  AlertTriangleIcon,
  BoxesIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  PackageIcon,
  RouteIcon,
  WrenchIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const inventoryReadiness = [
  {
    title: 'Danh mục vật tư',
    description: 'Mã hàng, đơn vị tính, nhóm vật tư, tồn tối thiểu và trạng thái sử dụng.',
    status: 'Cần chốt schema',
    icon: PackageIcon,
  },
  {
    title: 'BOM theo báo giá',
    description: 'Đọc vật tư từ dòng báo giá, sau đó chuẩn hóa thành định mức thi công.',
    status: 'Đang lấy nguồn từ báo giá',
    icon: FileTextIcon,
  },
  {
    title: 'Yêu cầu xuất kho',
    description: 'Tạo phiếu giữ hàng/xuất kho theo lệnh thi công sau khi được duyệt.',
    status: 'Chưa kích hoạt',
    icon: ClipboardCheckIcon,
  },
  {
    title: 'Cảnh báo thiếu hàng',
    description: 'So sánh BOM với tồn khả dụng trước khi lên lịch thi công.',
    status: 'Cần dữ liệu tồn',
    icon: AlertTriangleIcon,
  },
];

const workflowSteps = [
  'Báo giá đã chốt tạo danh sách vật tư dự kiến.',
  'Hợp đồng xác nhận nhu cầu vật tư chính thức.',
  'Lệnh thi công gửi yêu cầu giữ hàng hoặc xuất kho.',
  'Kho xác nhận số lượng thực xuất và phần còn thiếu.',
  'Bàn giao đối soát vật tư thực tế với hồ sơ bảo hành.',
];

const nextDecisions = [
  'Một hay nhiều kho vật lý, có cần vị trí kệ/ngăn hay không.',
  'Tồn kho quản lý theo số lượng tổng hay theo serial/IMEI cho từng thiết bị.',
  'Quy trình duyệt xuất kho: Super Admin, kho, hay trưởng thi công.',
  'Có cho âm kho khi thiếu hàng hay bắt buộc tạo cảnh báo mua bổ sung.',
];

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Phase 4</Badge>
            <Badge variant="outline">Chưa trừ tồn thật</Badge>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Kho</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Màn hình này đang đóng vai trò kiểm tra sẵn sàng trước khi bật quản lý tồn
              kho thật. Hiện hệ thống chưa có bảng tồn kho/BOM riêng, nên chưa tự động giữ
              hàng, trừ hàng hoặc cảnh báo thiếu hàng.
            </p>
          </div>
        </div>
        <Link href="/quotations" className={buttonVariants({ variant: 'outline' })}>
          Xem báo giá nguồn
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {inventoryReadiness.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {item.status}
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="mt-1 text-sm leading-relaxed">
                    {item.description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RouteIcon className="size-4" />
              Luồng kho dự kiến
            </CardTitle>
            <CardDescription>
              Các bước này sẽ được nối vào workflow hiện có, không chạy độc lập.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {workflowSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <WrenchIcon className="size-4" />
              Cần chốt trước khi làm backend
            </CardTitle>
            <CardDescription>
              Chốt các điểm này trước sẽ tránh sửa schema nhiều lần.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {nextDecisions.map((decision) => (
                <div
                  key={decision}
                  className="rounded-md border px-3 py-2 text-sm text-muted-foreground"
                >
                  {decision}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <BoxesIcon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Bước tiếp theo đề xuất</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tạo danh mục vật tư và bảng tồn kho sau khi chốt quy tắc kho, serial và
                duyệt xuất kho.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/work-orders"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Xem lệnh thi công
            </Link>
            <Link href="/quotations" className={buttonVariants({ size: 'sm' })}>
              Kiểm tra dòng vật tư
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

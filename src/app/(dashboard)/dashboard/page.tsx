import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mainNavItems } from "@/lib/navigation/modules";

const statCards = [
  {
    label: "Dự án đang chạy",
    value: "—",
    hint: "Phase 2+",
  },
  {
    label: "Báo giá chờ xử lý",
    value: "—",
    hint: "Phase 3",
  },
  {
    label: "Lệnh thi công",
    value: "—",
    hint: "Phase 5",
  },
  {
    label: "Cảnh báo kho",
    value: "—",
    hint: "Phase 4",
  },
];

const quickLinks = mainNavItems.filter((item) => item.id !== "dashboard");

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section>
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="gap-4 pb-2">
            <Badge variant="secondary" className="w-fit rounded-full px-3 text-xs font-medium">
              Phase 1
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Chào mừng đến GoldenCard ERP
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-relaxed">
                Theo dõi nhanh trên điện thoại, quản lý đầy đủ trên desktop. Các
                chỉ số bên dưới sẽ được kết nối dữ liệu ở các giai đoạn tiếp theo.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1 px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Chỉ số nhanh
          </h2>
          <p className="text-sm text-muted-foreground">
            Tóm tắt vận hành hàng ngày
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => (
            <Card
              key={stat.label}
              className="border-border/80 bg-card shadow-sm"
            >
              <CardHeader className="gap-3 pb-0">
                <CardDescription className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardDescription>
                <CardTitle className="text-4xl font-semibold tracking-tight tabular-nums">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground">
                  Dữ liệu thật: {stat.hint}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-border/60 pt-2">
        <div className="space-y-1 px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Truy cập nhanh
          </h2>
          <p className="text-sm text-muted-foreground">
            Các module chính — nút lớn, dễ chạm trên mobile
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.id} href={item.href} className="group block">
                <Card className="border-border/80 shadow-sm transition-all group-hover:border-primary/30 group-hover:shadow-md">
                  <CardContent className="flex min-h-[4.75rem] items-center gap-4 p-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-semibold tracking-tight">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.phase}</p>
                    </div>
                    <ArrowRightIcon
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

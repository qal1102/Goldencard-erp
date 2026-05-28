import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getModuleById } from "@/lib/navigation/modules";

type ModulePlaceholderProps = {
  moduleId: string;
};

export function ModulePlaceholder({ moduleId }: ModulePlaceholderProps) {
  const navItem = getModuleById(moduleId);

  if (!navItem) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Card className="border-border/80 border-dashed shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 text-xs">
              {navItem.phase}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 text-xs">
              Đang phát triển
            </Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {navItem.label}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {navItem.description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="rounded-xl border border-border/60 bg-muted/40 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
            Module này sẽ được triển khai ở giai đoạn tiếp theo. Hiện tại chỉ có
            khung giao diện để Anh/Chị xem luồng điều hướng trên mobile và desktop.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

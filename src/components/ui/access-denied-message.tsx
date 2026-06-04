type AccessDeniedMessageProps = {
  moduleName: string;
};

export function AccessDeniedMessage({ moduleName }: AccessDeniedMessageProps) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Không có quyền truy cập</p>
      <p className="mt-2">Bạn không có quyền xem {moduleName}.</p>
    </div>
  );
}

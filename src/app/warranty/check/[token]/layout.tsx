export default function PublicWarrantyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30 text-foreground">{children}</div>
  );
}

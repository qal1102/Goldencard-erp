import { ModuleGuide } from '@/components/ui/module-guide';
import { CustomerList } from '@/modules/crm/components/customer-list';

export default function CustomersPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-base font-semibold">Khách hàng</h1>
        <p className="text-xs text-muted-foreground">
          Hồ sơ khách hàng đã xác nhận từ CRM hoặc tạo trực tiếp khi có thông tin đủ rõ.
        </p>
      </div>
      <ModuleGuide
        title="Hướng dẫn nhanh khách hàng"
        description="Đây là nơi giữ thông tin chính thức của khách để tạo khảo sát, báo giá, hợp đồng và bảo hành về sau."
        steps={[
          'Tìm khách trước khi tạo mới để tránh trùng hồ sơ.',
          'Kiểm tra tên, số điện thoại và địa chỉ trước khi tạo khảo sát.',
          'Từ hồ sơ khách, tạo phiếu khảo sát khi khách đã đồng ý cho kiểm tra thực tế.',
          'Các bước sau sẽ nối theo khách này, nên thông tin đầu vào cần sạch.',
        ]}
        note="Nếu khách đổi số điện thoại hoặc địa chỉ, cập nhật tại hồ sơ khách trước để các module sau dùng đúng dữ liệu."
      />
      <CustomerList />
    </div>
  );
}

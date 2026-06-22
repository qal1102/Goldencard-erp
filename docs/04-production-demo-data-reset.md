# Production Demo Data Reset

Mục tiêu: làm sạch dữ liệu demo để bắt đầu nhập dữ liệu thật, nhưng giữ nguyên tài khoản nhân viên và phân quyền.

## Giữ lại

- `users`
- `roles`
- `user_roles`
- `permissions`
- `role_permissions`

## Xóa sạch

- CRM: `leads`, `customers`, `lead_activities`
- Khảo sát: `surveys`, `survey_zones`, `survey_edit_logs`
- Báo giá: `quotations`, `quotation_items`, `quotation_exports`, `quotation_edit_logs`
- Hợp đồng: `contracts`
- Thi công/bàn giao: `work_orders`, `handovers`
- Bảo hành/CSKH: `warranty_certificates`, `warranty_tickets`
- Kho: `inventory_items`, `warehouses`, `inventory_stocks`, `inventory_stock_movements`
- Hoạt động tạm/demo: `notifications`, `audit_logs`

## Reset sequence

Các mã nghiệp vụ sẽ chạy lại từ đầu:

- `lead_code_seq`
- `customer_code_seq`
- `survey_code_seq`
- `quotation_code_seq`
- `contract_code_seq`
- `work_order_code_seq`
- `handover_code_seq`
- `warranty_ticket_code_seq`
- `warranty_certificate_code_seq`
- `audit_logs_id_seq`

## Số lượng hiện tại trước khi reset

Lần kiểm tra gần nhất:

```text
audit_logs: 52
contracts: 1
customers: 3
handovers: 1
inventory_items: 1
inventory_stocks: 0
inventory_stock_movements: 0
lead_activities: 49
leads: 8
notifications: 18
quotation_edit_logs: 0
quotation_exports: 4
quotation_items: 25
quotations: 4
survey_edit_logs: 1
survey_zones: 6
surveys: 10
warehouses: 1
warranty_certificates: 1
warranty_tickets: 1
work_orders: 1
```

Các bảng giữ lại:

```text
users: 8
roles: 7
user_roles: 15
permissions: 0
role_permissions: 0
```

## File reset

SQL nằm ở:

```text
scripts/reset-production-demo-data.sql
```

Script dùng `DELETE` theo thứ tự phụ thuộc thay vì `TRUNCATE CASCADE` để tránh cascade ngoài ý muốn.

## Checklist trước khi chạy production

1. Tạo backup/export production database.
2. Xác nhận lại danh sách bảng giữ lại.
3. Xác nhận lại danh sách bảng xóa.
4. Chạy script reset trong một transaction.
5. Verify các bảng demo về `0`.
6. Verify `users`, `roles`, `user_roles` vẫn còn dữ liệu.
7. Đăng nhập Super Admin trên production.
8. Tạo thử một lead/customer thật hoặc vật tư thật đầu tiên.

## Điều kiện chạy

Không chạy script này nếu chưa có xác nhận rõ ràng kiểu:

```text
Cho phép chạy reset production demo data, giữ users/roles/user_roles.
```

## Kết quả chạy production

Đã chạy reset production vào ngày 2026-06-22.

Kết quả verify sau reset:

```text
audit_logs: 0
contracts: 0
customers: 0
handovers: 0
inventory_items: 0
inventory_stocks: 0
inventory_stock_movements: 0
lead_activities: 0
leads: 0
notifications: 0
quotation_edit_logs: 0
quotation_exports: 0
quotation_items: 0
quotations: 0
survey_edit_logs: 0
survey_zones: 0
surveys: 0
warehouses: 0
warranty_certificates: 0
warranty_tickets: 0
work_orders: 0
```

Bảng giữ lại sau reset:

```text
users: 8
roles: 7
user_roles: 15
permissions: 0
role_permissions: 0
```

Các sequence nghiệp vụ đã reset về `last_value = 1`, `is_called = false`.

# Tong hop GoldenCard ERP

Cap nhat: 2026-06-23

Tai lieu nay tong hop cac yeu cau da thong nhat, cac phan da lam, cac loi/diem da sua, tinh trang module hien tai, va cac hang muc sap co/du tinh cho GoldenCard ERP.

## 1. Muc tieu du an

GoldenCard ERP la he thong noi bo cho cong ty lap dat dien mat troi GoldenCard.

Muc tieu truoc mat:

- Quan ly tron vong cong viec tu CRM den bao hanh.
- Giam viec theo doi bang file roi rac, tin nhan, va ghi chu thu cong.
- Tao du lieu lien thong giua kinh doanh, ky thuat, kho, thi cong, ban giao va CSKH.
- Dam bao moi ho so co trang thai ro, nguoi phu trach ro, va hanh dong tiep theo ro.

Muc tieu dai han:

- Mo rong thanh ERP/SaaS cho cong ty solar va cac nganh lap dat tuong tu.
- Bo sung tu dong hoa qua n8n, luu tru file Cloudflare R2, va tich hop ke toan/bao cao khi quy trinh noi bo on dinh.

## 2. Quy trinh nghiep vu chinh

Luon lay pipeline sau lam truc xuong song:

```text
CRM Lead -> Customer -> Survey -> Quotation -> Contract -> Inventory/BOM -> Work Order -> Installation/Handover -> Warranty/Customer Service
```

Cac giai doan dang duoc he thong hoa trong project progress:

- Co hoi moi hoac co hoi ket thuc.
- Khao sat dang thuc hien, da hoan thanh, da huy.
- Bao gia nhap, da gui, can gui lai, khach dong y, khach tu choi, can chinh, chua phan hoi, het hieu luc.
- Hop dong nhap, hop dong da ky.
- Lenh thi cong moi tao, dang thi cong, da hoan thanh, da huy.
- Cho ban giao, da ban giao, ban giao da huy.
- Bao hanh/CSKH dang xu ly, da xu ly.

## 3. Tech stack hien tai

- Next.js App Router + TypeScript.
- React 19.
- PostgreSQL/Supabase dung nhu Postgres qua `DATABASE_URL`.
- Drizzle ORM.
- Auth.js v5 credentials auth.
- TanStack Query.
- shadcn/ui, Base UI, Tailwind CSS, lucide-react.
- ExcelJS cho import/export Excel.
- QR code cho phieu bao hanh.
- Vercel, Cloudflare R2, n8n nam trong huong tich hop/van hanh.

## 4. Cac vai tro va bao mat

Vai tro hien co:

- `admin`: quan tri he thong.
- `director`: theo doi dieu hanh va phe duyet.
- `sales`: CRM, co hoi, bao gia.
- `technician`: khao sat, BOM, lenh thi cong, lap dat.
- `chief_accountant`: tai chinh, phe duyet, hop dong.
- `accountant`: nghiep vu tai chinh, xuat du lieu ke toan.
- `customer_service`: sau ban giao, bao hanh, su co.

Nguyen tac bao mat da chot:

- Giu Auth.js v5 credentials auth.
- Giu JWT session behavior.
- Giu Super Admin guard.
- Chan user disabled/inactive khi dang nhap.
- Chi Super Admin duoc quan ly user/role/reset password/khoa/mo khoa.
- Khong cho Super Admin khoa chinh minh.
- Khong tao Super Admin thu hai qua UI/API.
- Khong expose secret, `DATABASE_URL`, token, hash mat khau, hoac gia tri `.env`.

## 5. Cac module dang co

### Tong quan

Da co dashboard theo doi nhanh:

- Lead moi hom nay.
- Lead dang xu ly.
- Bao gia can xu ly.
- Lenh thi cong mo.
- Bao hanh dang mo.
- Card bao gia va thong tin van hanh noi bo.
- Dieu huong sang cac module nghiep vu.

### CRM / Co hoi

Da co:

- Danh sach lead dang quan ly.
- Tao/sua/xem lead.
- Lead pipeline va lead card mobile-friendly.
- Chuyen lead thanh customer.
- Theo doi nguon lead, thong tin lien he, dia chi, sale phu trach.
- Bo loc phuc vu sales follow-up.
- Trang thai ban hang va tien do theo doi noi bo.
- Lich su hoat dong lead.
- Sua dia chi co audit.

Da sua/cai tien:

- Fix nested link hydration tren lead card.
- Them lead list view.
- Them bo loc follow-up cho sales.
- Giam runtime load cua CRM.
- Cai thien hien thi tien do ban hang noi bo.

### Khach hang

Da co:

- Danh sach customer.
- Trang chi tiet customer.
- Lien ket tu customer sang survey, quotation, warranty certificate, warranty ticket.
- Luu thong tin referral tu lead sang customer.

Da sua/cai tien:

- Toi uu load customer.
- Lien ket customer voi cac ho so downstream ro hon.

### Khao sat

Da co:

- Tao va xem phieu khao sat.
- Ho tro khao sat co nguon tu lead.
- Ho tro loai du an va chia nhieu khu vuc/zone.
- Ghi nhan thong so ky thuat: cong suat, tam pin, inverter, pha dien, dien ap, thong tin mai/khu vuc.
- GPS check-in vi tri khao sat.
- Dieu kien hoan thanh khao sat truoc khi ket thuc.
- Log chinh sua khao sat.
- Canh bao khi khao sat thay doi sau bao gia.
- KTV co view theo quyen, admin/director/sales co quyen quan ly.

Da sua/cai tien:

- Cho retry GPS check-in.
- Hien thi completion requirements truoc khi finish.
- Cai tien workflow action khao sat.
- Lam ro ghi chu khu vuc khao sat.
- Sua luong quotation revision lien quan thay doi khao sat.
- Server-load danh sach survey bang initial data de tranh loading vo han.
- Fix filter trang thai survey va unsafe select value rong.

### Bao gia

Da co:

- Tao bao gia tu survey.
- Tu dong goi y item bao gia tu thong tin ky thuat khao sat.
- Chi tiet bao gia, sua bao gia, in/xuat bao gia.
- Revision history va hien thi bao gia moi nhat.
- Trang thai: draft, sent, accepted, rejected, needs revision, no response, expired, needs resend.
- Canh bao can gui lai khi survey thay doi sau bao gia.
- Phan quyen view/write/approve theo role.
- Xuat bao gia qua API.

Da sua/cai tien:

- Polish label item va link tai lieu survey.
- Fix loading states cua quotation.
- Clarify dashboard quotation cards.
- Hien thi latest quotation kem revision history.
- Fix quotation revision khi thay doi survey.
- Cai thien hien thi ma bao gia tren cac man hinh lien quan.

### Hop dong

Da co:

- Tao/xem hop dong tu bao gia da chap nhan.
- Danh sach va chi tiet hop dong.
- Trang in hop dong.
- Lien ket hop dong voi customer, quotation, work order.

Da sua/cai tien:

- Fix loading state cua contract.
- Cai thien hien thi ma bao gia moi nhat trong hop dong.
- Lien ket contract trong tien do du an.

### Kho / Inventory

Da co:

- Nen schema inventory.
- Catalog vat tu.
- Import preview catalog.
- Export template/catalog Excel.
- Viet hoa header export.
- Quan ly warehouse.
- Tong quan ton kho theo kho.
- Dieu chinh ton dau/stock adjustment.
- Stock movement.
- Lien ket movement voi work order.
- Transaction cho stock movement duoc harden.
- Read-only access cho mot so role.
- Workspace inventory gom cac khu vuc quan trong.

Da sua/cai tien:

- Polish behavior catalog.
- Tighten import preview.
- Don gian template catalog.
- Cai thien read-only access.
- Cai thien tracking noi bo giua inventory va sales.

Dang can hoan thien:

- BOM theo du an/he thong.
- Gan inventory vao project progress nhu record co du lieu thuc, hien tai module config van de `implemented: false` trong backbone.
- Quy trinh de xuat, duyet, xuat kho va doi chieu vat tu thuc te.
- Canh bao thieu hang trong bao gia/thi cong theo SKU that.

### Lenh thi cong

Da co:

- Danh sach va chi tiet lenh thi cong.
- Tao/quan ly lenh thi cong sau hop dong.
- Phan cong technician.
- Trang thai lenh thi cong.
- Lien ket voi contract, lead, quotation, handover.
- Notification khi phan cong/hoan thanh.

Da sua/cai tien:

- Fix loading state downstream ERP list modules.
- Lien ket inventory movement voi work order.
- Cai thien hien thi ma bao gia trong chi tiet work order.

Dang can hoan thien:

- Module lap dat rieng dang duoc reserved trong pipeline nhung chua implemented.
- Nhat ky thi cong chi tiet, vat tu thuc dung, hinh anh hien truong.

### Ban giao

Da co:

- Danh sach va chi tiet ban giao.
- Tao ban giao tu work order.
- Trang in phieu ban giao.
- Trang thai pending/completed/cancelled.
- Lien ket voi warranty certificate.

Da sua/cai tien:

- Don gian hoa phieu ban giao in cho khach.
- Cai thien lien ket tu cac man hinh chi tiet.

### Bao hanh / CSKH

Da co:

- Danh sach warranty ticket.
- Tao ticket truc tiep.
- Tiep nhan yeu cau sau ban giao.
- Phan loai kenh tiep nhan, muc do uu tien, loai su co.
- Phan cong xu ly cho CSKH/KTV.
- Notification cho ticket moi, ticket khan, ticket da xu ly.

Da sua/cai tien:

- Cai thien intake flow bao hanh.
- Cai thien QR support flow va public request handling.
- Fix loading state warranty.

### Phieu bao hanh va QR cong khai

Da co:

- Danh sach va chi tiet phieu bao hanh.
- Trang in phieu bao hanh.
- QR/public check theo token.
- Khach co the tra cuu thong tin bao hanh cong khai.
- Co the tao ticket bao hanh tu public QR flow.

Da sua/cai tien:

- Enhance public warranty QR check.
- Cai thien support flow tu QR.

### Notification

Da co:

- Notification theo event: survey, quotation, work order, warranty, warranty certificate.
- Wording theo role trong mot so notification.
- Dropdown notification.
- Trang danh sach notification.

Da sua/cai tien:

- Fix import event survey.
- Fix notification dropdown scrolling.
- Cai thien loading trang notifications.

### Admin / User / Audit

Da co:

- Super Admin user management.
- Tao user, sua user, khoa/mo khoa, reset password theo guard.
- Doi mat khau.
- Activity log viewer cho Super Admin.
- Audit log schema/load/query/list.

Da sua/cai tien:

- Fix nullable phone validation cho admin user.
- Tighten admin role management va sign-out feedback.
- Them viewer nhat ky hoat dong.

### Settings

Da co:

- Trang settings va security settings.
- Nen tang cho cau hinh he thong.

Dang can hoan thien:

- Cau hinh module, mau ma, quy tac thong bao, cau hinh tich hop.

## 6. Cac viec ha tang/ky thuat da sua

Da hoan thanh:

- Setup shell ERP mobile-first.
- Setup database foundation, schema va migrations.
- Bao ve route auth.
- Them DB seed roles.
- Toi uu dashboard navigation va database performance.
- Fix infinite loading o cac list module downstream.
- On dinh loading/login flow.
- Fix unsafe empty select values voi Base UI/shadcn Select.
- Server-load survey list initial data.
- Gated module performance logs.
- Cho DB pool max configurable, nhung khong thay doi gia tri pool max neu chua co phe duyet.
- Clean up lint warnings.
- Fix Base UI link button semantics.
- Production demo data reset da duoc document va da chay ngay 2026-06-22.

## 7. Du lieu production/demo

Da co tai lieu rieng: `docs/04-production-demo-data-reset.md`.

Ket qua quan trong:

- Da reset demo data production ngay 2026-06-22.
- Giu lai `users`, `roles`, `user_roles`, `permissions`, `role_permissions`.
- Xoa sach du lieu nghiep vu demo: CRM, survey, quotation, contract, work order, handover, warranty, inventory, notifications, audit logs.
- Reset sequence nghiep vu ve trang thai ban dau.

Nguyen tac:

- Khong chay reset/migrate production neu chua co xac nhan ro.
- Truoc moi thay doi schema phai inspect table/column thuc te.
- Uu tien SQL an toan `IF NOT EXISTS` sau khi da duoc phe duyet.

## 8. Nhung thu dang co nhung con o muc nen/mong

- `permissions` va `role_permissions` da co schema nhung chua co du lieu permission chi tiet.
- Inventory co man hinh va stock movement, nhung BOM va workflow duyet/xuat kho chua day du.
- Installation la stage duoc reserve, chua co module rieng.
- Payment/finance la stage duoc reserve, chua co module rieng.
- Referral info da luu tren lead/customer, commission calculation de danh cho accounting/finance.
- Survey photos/upload duoc ghi chu la future update.
- Gia mac dinh trong quotation item template dang la MVP, ve sau can thay bang Product/SKU catalog.
- Project progress hien co backbone va provider cho chuoi chinh, cac anchor khac co the bo sung sau.

## 9. Cac hang muc sap co / nen lam tiep

Uu tien gan:

1. Hoan thien workflow inventory that su dung:
   - BOM theo survey/quotation/work order.
   - De xuat xuat kho theo work order.
   - Duyet xuat kho.
   - Ghi nhan vat tu thuc te sau thi cong.
   - Canh bao thieu hang theo SKU.

2. Hoan thien module installation:
   - Checklist thi cong.
   - Nhat ky ngay thi cong.
   - Hinh anh truoc/trong/sau lap dat.
   - Xac nhan hoan thanh theo KTV/quan ly.

3. Hoan thien finance/payment:
   - Theo doi dat coc, thanh toan, cong no.
   - Lien ket hop dong/bao gia.
   - Chuan bi export cho ke toan/MISA.
   - Tinh hoa hong/referral khi quy tac duoc chot.

4. Hoan thien file/attachment:
   - Anh khao sat.
   - Ban ve/thiet ke.
   - Hop dong scan.
   - Bien ban ban giao.
   - Luu tru qua Cloudflare R2 neu duoc chot.

5. Hoan thien notification/todo:
   - Nhac viec follow-up lead.
   - Nhac bao gia sap het han.
   - Nhac hop dong/thanh toan.
   - Nhac bao hanh qua SLA.

Uu tien sau:

- Bao cao van hanh theo thang/quy.
- Dashboard KPI cho sales, ky thuat, kho, CSKH.
- Cau hinh mau ma chung tu.
- Cau hinh workflow phe duyet.
- Tich hop n8n cho thong bao/tac vu lap lai.
- Chuan hoa multi-tenant neu chuyen huong SaaS.

## 10. Nguyen tac phat trien tiep

- UI mac dinh tieng Viet.
- Lam tung route/tung bug/tung workflow nho.
- Khong broad-refactor ca app.
- Sau code change can chay `npm run lint` va `npm run build`.
- Neu test/build fail thi bao loi, khong deploy.
- Khong commit file local/ignored/build: `.env.local`, `.vercel`, `.next`, `node_modules`, `tsconfig.tsbuildinfo`.
- List page quan trong nen co server initial data khi hop ly.
- React Query voi initialData khong refetch ngay khi mount.
- Query key nen la primitive/stable.
- Moi man hinh quan trong can co bounded loading, empty, error state.
- Serialize Date/nested DB data truoc khi dua sang client.
- Tranh `SelectItem value=""` voi Base UI/shadcn Select.

## 11. Tom tat trang thai hien tai

He thong da co duong xuong song kha day du tu lead den bao hanh:

```text
Lead/Customer -> Survey -> Quotation -> Contract -> Work Order -> Handover -> Warranty
```

Phan da manh:

- Auth/role guard va Super Admin guard.
- CRM, survey, quotation va warranty flow.
- Project progress backbone.
- Notification theo event.
- Inventory foundation.
- Admin user va audit log.

Phan can tap trung tiep:

- BOM/inventory workflow gan chat voi thi cong.
- Installation module rieng.
- Payment/finance/referral commission.
- Attachment/photo storage.
- Bao cao/KPI va automation.

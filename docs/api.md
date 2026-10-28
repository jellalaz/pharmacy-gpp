# REST API giai đoạn 1

Base URL `/api`. API JSON; lỗi có `message`, lỗi Zod thêm `errors.fieldErrors`. Giá tiền trả dạng chuỗi Decimal. Cookie `gpp_session` được gửi tự động cùng origin. Mọi POST/PUT/PATCH phải có `Origin` đúng `APP_ORIGIN`, kể cả login/logout. Không có API DELETE danh mục.

| Phương thức và đường dẫn                                                             | Vai trò                     | Hành vi                                                                                            |
| ------------------------------------------------------------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------- |
| GET `/health`                                                                        | Công khai                   | SELECT 1 qua Prisma; kiểm tra MySQL                                                                |
| POST `/auth/login`                                                                   | Công khai                   | `{email,password}`; trả user an toàn và set cookie                                                 |
| GET `/auth/me`                                                                       | Đã đăng nhập                | User, role, nhà thuốc hiện tại; không trả hash                                                     |
| POST `/auth/logout`                                                                  | Phiên hiện tại              | Xóa phiên và cookie; 204                                                                           |
| GET `/pharmacies`                                                                    | Admin                       | Danh sách kèm người quản lý và số tài khoản/thuốc                                                  |
| POST `/pharmacies`                                                                   | Admin                       | Tạo nhà thuốc                                                                                      |
| PUT `/pharmacies/:id`                                                                | Admin                       | Thay toàn bộ trường quản lý, trạng thái; tùy chọn gán thêm quản lý                                 |
| GET `/users`                                                                         | Admin / Manager             | Toàn hệ thống / nhân viên thuộc nhà thuốc mình                                                     |
| POST `/users`                                                                        | Admin / Manager             | Tạo, hash password; kiểm tra role/pharmacyId                                                       |
| PUT `/users/:id`                                                                     | Admin / Manager             | Sửa, khóa/mở khóa, đổi mật khẩu tùy chọn, thu hồi phiên                                            |
| GET `/medicines`                                                                     | Manager / Inventory / Sales | Danh mục, lô, tồn; scope từ phiên                                                                  |
| POST `/medicines`                                                                    | Manager                     | Tạo thuốc                                                                                          |
| PUT `/medicines/:id`                                                                 | Manager                     | Sửa thông tin, giá, ngừng kinh doanh                                                               |
| GET `/suppliers`                                                                     | Manager / Inventory         | NCC trong nhà thuốc                                                                                |
| POST `/suppliers`                                                                    | Manager                     | Tạo NCC                                                                                            |
| PUT `/suppliers/:id`                                                                 | Manager                     | Sửa hoặc ngừng hợp tác                                                                             |
| GET `/inventory`                                                                     | Manager / Inventory / Sales | Lô, thông tin thuốc và balance của nhà thuốc                                                       |
| GET `/receipts`                                                                      | Manager / Inventory         | 100 phiếu gần nhất cùng chi tiết                                                                   |
| POST `/receipts`                                                                     | Inventory                   | Tạo **DRAFT**, tính Decimal ở server, không cập nhật tồn                                           |
| POST `/receipts/:id/confirm`                                                         | Inventory                   | 501: Phase 2                                                                                       |
| POST `/stocktakes`                                                                   | Inventory                   | 501: Phase 2                                                                                       |
| GET `/sales`                                                                         | Manager / Sales             | 500 phiếu gần nhất, chi tiết lô, thanh toán mẫu                                                    |
| POST `/sales`                                                                        | Sales                       | 501: Phase 2                                                                                       |
| GET `/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`                                         | Manager                     | Doanh thu, giao dịch, nhập/xuất, top thuốc; tối đa 366 ngày                                        |
| PATCH `/users/:id/role`                                                              | Manager                     | `{role: "INVENTORY" hoặc "SALES"}`; nhân viên cùng cơ sở, thu hồi phiên và audit trong transaction |
| GET `/reports/details?kind=sales\|receipts\|inventory&from=YYYY-MM-DD&to=YYYY-MM-DD` | Manager                     | Báo cáo chi tiết theo dòng; tenant từ phiên, tối đa 366 ngày                                       |

## Payload

Pharmacy: `code`, `name`, `address`, `phone`, `email?`, `active`, `managerId?`. Manager được chọn phải active và chưa thuộc nhà thuốc khác. Bỏ trống managerId giữ nguyên phân công; thay đổi hoặc gỡ phân công tại màn hình tài khoản.

User: `name`, `email`, `role`, `pharmacyId?`, `active`, `password?`. Tạo mới bắt buộc password dài 8–128 ký tự. Admin có pharmacyId null. Manager chỉ tạo Sales/Inventory; backend tự gán tenant và từ chối pharmacyId khác.

Medicine: `code`, `name`, `ingredient`, `strength`, `unit`, `manufacturer`, `category`, `prescription`, `salePrice`, `lowStock`, `description?`, `active`, `barcode?`, `registrationNumber?`, `storageLocation?`. Các trường bổ sung tối đa 64/80/80 ký tự; chuỗi trống chuyển null, trường bị bỏ qua giữ giá trị hiện có khi sửa. Mã vạch nếu có unique trong từng nhà thuốc. Mã thuốc unique trong từng nhà thuốc. Giá từ 0 đến 999.999.999, tối đa 2 chữ số thập phân. `lowStock` là số nguyên không âm.

Supplier: `code`, `name`, `address`, `phone`, `email?`, `active`, `taxCode?` (40), `contactName?` (120), `note?` (2000 ký tự). Mã NCC unique trong từng nhà thuốc.

GoodsReceipt:

```json
{
  "supplierId": "id-nha-cung-cap-trong-nha-thuoc",
  "documentNo": "HD-001",
  "receivedDate": "2026-10-28",
  "note": "Phiếu nháp",
  "items": [
    {
      "medicineId": "id-thuoc-trong-nha-thuoc",
      "quantity": 20,
      "purchasePrice": "1250.25",
      "lotNumber": "LO-001",
      "expiryDate": "2028-10-28"
    }
  ]
}
```

Không nhận `status`, `total`, `createdById`, `pharmacyId` từ client. Số lượng nguyên dương ≤100.000, tối đa 100 dòng. Danh mục/NCC phải active. Lưu nháp có thể ghi nhận lô cần xử lý; Phase 2 phải bổ sung quy tắc từ chối xác nhận lô hết hạn và phát hiện chứng từ/lô nhập trùng. Đơn vị mỗi dòng lấy từ thuốc để ngăn client tạo sai đơn vị.

Mã lỗi: 400 đầu vào sai, 401 thiếu/hết phiên, 403 sai quyền/nguồn/nhà thuốc bị ngừng, 404 không tồn tại trong scope, 409 trùng mã/email, 429 quá nhiều login sai, 501 nghiệp vụ Phase 2, 500 lỗi máy chủ không lộ chi tiết nội bộ.

## Báo cáo chi tiết

`kind=sales` và `kind=receipts` trả `{kind,dataMode,documents,total,discount,rows}`. Mỗi dòng có `id,code,date,partner,staff,name,lot,unit,quantity,price,amount`; số tiền báo cáo ở dạng số JSON, tính bằng Decimal trước khi trả. Chỉ tính chứng từ CONFIRMED. `total` là tổng sau giảm giá toàn phiếu; `amount` từng dòng chưa trừ giảm toàn phiếu, tránh phân bổ hoặc nhân lặp giảm giá.

`kind=inventory` trả `{kind,dataMode,rows}`; mỗi dòng có `id,code,name,unit,opening,incoming,outgoing,adjustment,closing`. Tổng hợp sổ StockMovement trước ngày bắt đầu và trong kỳ. `closing = opening + incoming - outgoing + adjustment`; gồm tồn vật lý của mọi trạng thái lô. Tồn cuối kỳ khác tồn có thể bán. Các tab chi tiết không bị giới hạn 100/500 phiếu của màn hình lịch sử, nhưng giới hạn khoảng ngày 366 ngày.

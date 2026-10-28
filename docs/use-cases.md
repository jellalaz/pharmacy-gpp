# Đối chiếu Use Case giai đoạn 1

Giữ nguyên số UC-01 đến UC-19 và bổ sung UC-20 theo yêu cầu. “Thật” là được API thực hiện với dữ liệu MySQL; dữ liệu gốc của bản trình diễn vẫn là seed. “Prototype” chỉ tương tác trên giao diện, không xác nhận giao dịch.

| Mã    | Use Case                         | Actor                       | Trang / trạng thái                                                                 |
| ----- | -------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| UC-01 | Login                            | User                        | `/login`, `/account`; xác thực, logout, thông tin phiên thật                       |
| UC-02 | Inventory Staff Login            | Inventory Staff             | Chung login, chuyển `/warehouse`                                                   |
| UC-03 | Sales Staff Login                | Sales Staff                 | Chung login, chuyển `/pos`                                                         |
| UC-04 | Admin Login                      | Admin                       | Chung login, chuyển `/admin`                                                       |
| UC-05 | Pharmacy Manager Login           | Pharmacy Manager            | Chung login, chuyển `/overview`                                                    |
| UC-06 | Receive Medicines                | Inventory Staff             | `/receipts`; lưu/đọc nháp thật, xác nhận nhập Phase 2                              |
| UC-07 | Perform Stocktake                | Inventory Staff             | `/stocktake`; prototype kiểm đếm, chênh lệch, ghi chú                              |
| UC-08 | Monitor Expiry Dates             | Inventory / Manager         | `/expiry`; đọc lô thật, lọc 30/60/90 ngày hoặc hết hạn                             |
| UC-09 | Search Medicines and Check Stock | Manager / Inventory / Sales | `/lookup`; đọc, tìm kiếm, lọc, chi tiết lô                                         |
| UC-10 | Sell Medicines                   | Sales Staff                 | `/pos`; prototype phiếu bán, tính tiền và xem trước                                |
| UC-11 | Sell Prescription Medicines      | Sales Staff                 | POS theo đơn, trường kê đơn và kiểm tra minh họa                                   |
| UC-12 | Sell OTC Medicines               | Sales Staff                 | POS OTC, FEFO nhiều lô, chặn vượt tồn ở xem trước                                  |
| UC-13 | View Sales History               | Manager / Sales             | `/sales`; đọc chứng từ mẫu và chi tiết lô từ DB                                    |
| UC-14 | Manage User                      | Admin                       | `/users`; CRUD, gán vai trò/nhà thuốc, khóa/mở khóa thật                           |
| UC-15 | Manage Medicines and Prices      | Pharmacy Manager            | `/medicines`; CRUD và trạng thái thật                                              |
| UC-16 | Manage Suppliers                 | Pharmacy Manager            | `/suppliers`; CRUD và trạng thái thật                                              |
| UC-17 | Monitor Inventory                | Pharmacy Manager            | `/lookup`; đọc tồn thuốc/lô, cảnh báo tồn thấp                                     |
| UC-18 | Manage Staff Accounts            | Pharmacy Manager            | `/staff`; tạo tài khoản, cấp/đổi vai trò Sales/Inventory cùng cơ sở, thu hồi phiên |
| UC-19 | View Reports                     | Pharmacy Manager            | `/reports`; tổng hợp và chi tiết doanh thu/nhập/NXT; lọc ngày, CSV, in             |
| UC-20 | Manage Pharmacies                | Admin                       | `/pharmacies`; CRUD, gán quản lý và trạng thái thật                                |

Customer không có màn hình đăng nhập; việc mua thuốc tại quầy do Sales Staff thao tác. Các quan hệ `extend`/generalization trong ảnh không dẫn đến nhiều cơ chế đăng nhập. Những chỗ cần chỉnh trong báo cáo UML đã ghi tại `architecture.md`.

Quản lý được bổ sung quyền đọc phiếu nhập tại `/receipt-history`, không được tạo/xác nhận phiếu kho hoặc thực hiện POS. Chi tiết ma trận quyền, trường form và kịch bản trình diễn: [management-guide.md](management-guide.md).

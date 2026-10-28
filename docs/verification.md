# Biên bản kiểm chứng giai đoạn 1

Ngày kiểm tra: **28/10/2026**, múi giờ Asia/Ho_Chi_Minh. Thực hiện trực tiếp trong repository `pharmacy-gpp` trên Linux của người dùng. Không push lên GitHub.

## Kết quả cuối cùng

| Hạng mục                             | Kết quả                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------ |
| Cài dependency / lockfile            | Đã hoàn tất ở giai đoạn khởi tạo; bản mở rộng không thêm dependency      |
| `npm run lint`                       | Đạt, không có cảnh báo ESLint                                            |
| `npm run typecheck`                  | Đạt frontend/backend trên mã cuối cùng                                   |
| `npm run build`                      | Đạt frontend/backend; Docker cũng build thành công từ mã bàn giao        |
| `npm test`                           | **16/16**: 6 backend, 10 frontend                                        |
| `npm run test:integration`           | **17/17** trên MySQL thật                                                |
| Playwright trên Vite/Express         | Các luồng hiện có đạt; lượt kiểm tra mới và ảnh **19/19** đạt            |
| Playwright toàn bộ trên Docker/Nginx | **34/34**, gồm nghiệp vụ, quyền, form, menu avatar, responsive và 13 ảnh |
| Prisma migrations                    | Cả **3 migration** đã áp dụng                                            |
| Prisma seed                          | Bổ sung metadata demo còn trống; không đổi tài khoản hoặc tồn            |
| Docker Compose                       | `mysql`, `backend`, `frontend` đều **healthy**                           |
| `/api/health` qua Nginx              | HTTP 200, `status=ok`, `database=mysql`, `phase=1`                       |
| Ảnh báo cáo                          | **13 PNG, mỗi ảnh 1440 × 900**, chụp bản Docker cuối cùng                |
| GitHub Actions                       | Đã cấu hình, chưa chạy trên GitHub vì chưa push                          |

Môi trường: Node 24.19.0 trên host; Node 22 trong Docker/CI; Docker 29.1.3, Compose 2.40.3; MySQL **8.4.13** từ image `mysql:8.4`; Chrome `/usr/bin/google-chrome` cho Playwright. Dịch vụ bàn giao đang chạy tại `http://localhost:8080`; server dev dùng để kiểm tra đã dừng.

Sau tinh chỉnh cuối (ẩn thẻ giới thiệu ở thanh bên khi màn hình thấp), chạy lại **6/6** trường hợp menu avatar và responsive đều đạt. Kiểm tra trực quan tại 390 × 740: cả 9 mục quản lý nằm trong vùng điều hướng, không tràn ngang hoặc dọc ở kích thước này.

## Những hành vi đã kiểm chứng

- Đăng nhập đúng/sai, cookie HttpOnly, không trả passwordHash, logout; cập nhật tài khoản thu hồi phiên cũ.
- Mật khẩu từ 8 đến 128 ký tự ở frontend/backend; chặn 7 và 129 ký tự, nhận đúng mật khẩu 8 ký tự có khoảng trắng mà không tự trim. Khi sửa, để trống giữ mật khẩu cũ. Nút hiện/ẩn mật khẩu và lỗi từng trường hoạt động; lỗi backend được chuyển đến trường tương ứng.
- Ô tiền khách đưa và giảm giá tự thêm dấu phân cách hàng nghìn theo định dạng Việt Nam; giá trị số dùng để tính tổng và tiền thừa không thay đổi.
- Menu avatar mở bằng chuột hoặc bàn phím, chuyển tới hồ sơ/trang chính, đóng bằng Escape hoặc bấm ra ngoài và đăng xuất hủy phiên. Menu nằm trong màn hình ở cả 1440 và 390 px.
- Từ chối ghi thiếu/sai Origin; chặn Sales sửa thuốc, Inventory quản lý tài khoản và Admin truy cập nghiệp vụ tenant.
- Manager không cấp Admin/Manager, không gán nhân viên sang nhà thuốc khác và không sửa người dùng/thuốc ngoài tenant.
- API lấy pharmacyId từ phiên; query do client truyền không đổi phạm vi dữ liệu.
- Admin tạo/sửa/khóa nhà thuốc; tài khoản thuộc nhà thuốc bị ngừng không thể dùng API.
- CRUD nhà thuốc, tài khoản, thuốc và nhà cung cấp qua form trình duyệt, đọc lại được sau reload.
- Lưu phiếu nhập nháp qua giao diện, đọc lại danh sách; tổng tiền được tính ở server, tồn trước/sau không đổi.
- DB từ chối tồn âm và liên kết balance với lô của nhà thuốc khác; giá Decimal giữ đúng hai chữ số lẻ.
- Manager tạo nhân viên từ giao diện, nhân viên đăng nhập được; đổi Sales sang Inventory làm phiên cũ trả 401, đăng nhập lại đúng menu/quyền kho.
- API cấp vai trò riêng chặn quyền cao, payload thêm pharmacyId, tài khoản quản lý và nhân viên cơ sở khác; có audit CHANGE_STAFF_ROLE.
- Manager đọc lịch sử nhập/bán của cơ sở, nhưng POST nhập/bán và xác nhận nhập vẫn bị từ chối.
- Cả ba vai trò tìm thuốc bằng mã vạch, lọc Rx/OTC và xem metadata/lô; mã vạch duy nhất trong cơ sở nhưng có thể giống ở cơ sở khác.
- Báo cáo chi tiết đối chiếu đúng dòng chứng từ; NXT khớp tổng tồn DB ở hai cơ sở, kiểm tra tồn đầu và công thức tồn cuối.
- CSV chứa toàn bộ kết quả cùng nhãn mẫu; unit test xác minh escape dấu nháy/xuống dòng và chặn chuỗi công thức.
- Bản in chứa mọi dòng chứng từ, kể cả ngoài trang hiện tại; chế độ print ẩn app shell và hiển thị đúng nhãn mẫu/nháp.
- Tìm thuốc theo mã vạch trên phiếu nhập và thêm đúng thuốc vào dòng mới.
- FEFO ưu tiên hạn gần, phân bổ nhiều lô, bỏ hết hạn/đến hạn hôm nay/cách ly/thu hồi và không sửa nguồn tồn.
- POS chặn xem trước khi vượt tồn hoặc thiếu thông tin đơn Rx; nút thanh toán thật không được kích hoạt.
- Kiểm kê tính chênh lệch trên giao diện; lọc lô hết hạn, mở chi tiết giao dịch mẫu và lô thuốc.
- Điều hướng đúng quyền; truy cập URL trái quyền bị chặn; tổng quan quản lý, danh mục, nhân viên, tra cứu và báo cáo tại 1440, 1024, 768 và 390 px không tràn toàn trang, bảng cuộn ngang riêng. Thanh bên không có tràn ngang hoặc các mục tài khoản/đăng xuất trùng lặp; menu cuối vẫn truy cập được trên khung điện thoại thấp.
- Chụp ảnh sau khi dữ liệu và font đã tải; không có lỗi trang; vùng thao tác/lưu nháp/xem trước và phân trang cần thiết nằm trong viewport.

Các test ghi dữ liệu dùng mã riêng, tự dọn chỉ các bản ghi test tạo. Ở lượt kiểm chứng bộ dữ liệu mẫu ban đầu, DB có **3 nhà thuốc, 10 user, 60 thuốc, 180 lô, 18 NCC, 168 phiếu bán mẫu**, **3 phiếu nhập mẫu** và **60 thuốc đã có mã vạch demo**; tổng tồn vật lý **23.175 đơn vị quản lý** cho cả ba nhà thuốc. Người dùng có thể thêm dữ liệu sau lượt này. Lượt cập nhật giao diện không chạy lại seed hoặc đặt lại dữ liệu người dùng.

## Lệnh tái kiểm tra bản Docker

```bash
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:8080/api/health
E2E_BASE_URL=http://localhost:8080 PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e
```

Chi tiết kiểm thử nằm ở `backend/tests`, `frontend/src/utils/*.test.ts` và `e2e`. Báo cáo Playwright cục bộ nằm trong `playwright-report/` (được gitignore); mở bằng `npx playwright show-report`. Không bật trace hoặc ảnh lỗi ở màn hình đăng nhập để tránh lưu thông tin xác thực vào artifact.

## Giới hạn đã chủ động giữ

Không kiểm chứng giao dịch nhập/bán chính thức, thanh toán thật hay điều chỉnh tồn vì các chức năng đó chưa được triển khai. Đây không phải thử nghiệm tải, pentest hoặc đánh giá chứng nhận GPP. Chưa có môi trường production, CD, tích hợp ngân hàng hay dữ liệu quốc gia. Mô hình và hạn chế Phase 1 được ghi trong `architecture.md`, `api.md`, `use-cases.md` và README chính.

Chi tiết phạm vi mở rộng, ma trận quyền và kịch bản thuyết trình: [management-guide.md](management-guide.md).

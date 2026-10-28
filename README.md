# Pharmacy GPP · OOAD.G607

Phần mềm quản lý nhiều nhà thuốc độc lập và bán thuốc trực tiếp tại quầy. **Giai đoạn 1: nền tảng, API quản lý và giao diện**. Đây là bản minh họa đồ án, không phải phần mềm đã được chứng nhận tuân thủ GPP, không dùng để tư vấn hoặc điều trị và không phải website bán thuốc online.

## Chạy nhanh bằng Docker trên Linux Mint

Cần Docker Engine và Docker Compose v2. Làm việc trong thư mục repository:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Mở **http://localhost:8080**. Backend đợi MySQL khỏe, tự chạy migration và chỉ seed khi `DEMO_SEED=true`. MySQL **8.4 LTS**, dữ liệu nằm trong volume `pharmacy-gpp_mysql_data`. Chạy `docker compose logs -f backend` nếu chưa đăng nhập được. `docker compose down` dừng dịch vụ và giữ dữ liệu; không dùng `down -v` khi muốn giữ database.

Các biến mẫu chỉ dành cho phát triển. Khi đổi cổng web, đổi đồng thời `FRONTEND_PORT` và `APP_ORIGIN`. Truy cập đúng hostname trong `APP_ORIGIN`; `localhost` và `127.0.0.1` là hai origin khác nhau. Mật khẩu DB trong URL phải percent-encode nếu có ký tự đặc biệt. Không publish bản demo ra Internet. Nếu phát triển triển khai thật, dùng HTTPS, `COOKIE_SECURE=true`, tắt `DEMO_SEED` và quy trình khởi tạo tài khoản riêng.

## Chạy phát triển

Node.js 22.12+ (đã kiểm tra Node 24 trên máy làm việc), npm, Docker. Không cần cài MySQL trực tiếp trên máy:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
npm ci
docker compose up -d mysql
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Mở **http://localhost:5173**. Vite proxy `/api` tới Express cổng 4000; MySQL chạy cổng loopback 3307. Nếu chạy đồng thời Docker web và dev web, mỗi backend dùng `APP_ORIGIN` riêng như cấu hình mẫu. Trên máy đã có file `.env`, chỉnh file hiện có thay vì chạy `cp` ghi đè.

## Tài khoản demo

Mật khẩu khi seed lần đầu theo `.env.example`: **`GppDemo!2026`**. Chỉ dành cho môi trường phát triển. Không hiển thị mật khẩu hoặc token trong ảnh báo cáo.

| Email                                                         | Vai trò            | Phạm vi                               |
| ------------------------------------------------------------- | ------------------ | ------------------------------------- |
| `admin@gpp.demo`                                              | Admin              | Toàn hệ thống: nhà thuốc và tài khoản |
| `manager@gpp.demo`                                            | Pharmacy Manager   | Nhà thuốc An Tâm                      |
| `inventory@gpp.demo`                                          | Inventory Staff    | Nhà thuốc An Tâm                      |
| `sales@gpp.demo`                                              | Sales Staff        | Nhà thuốc An Tâm                      |
| `manager2@gpp.demo`, `inventory2@gpp.demo`, `sales2@gpp.demo` | Theo tên tài khoản | Nhà thuốc Bình An                     |
| `manager3@gpp.demo`, `inventory3@gpp.demo`, `sales3@gpp.demo` | Theo tên tài khoản | Nhà thuốc Minh Châu                   |

Seed có 3 nhà thuốc, 10 tài khoản, 20 thuốc/nhà thuốc, 6 NCC/nhà thuốc, 3 lô/thuốc, 56 phiếu bán mẫu/nhà thuốc và phiếu nhập mẫu có sổ biến động khớp với tồn. Ngày hết hạn được tính tương đối so với ngày seed. Lô gần hạn, lô xa hạn, lô hết hạn và lô cách ly thể hiện rõ FEFO. Tên thuốc, nhà cung cấp đều phục vụ minh họa.

Seed bổ sung mã vạch, số đăng ký, vị trí kệ và liên hệ còn trống trên các ID demo đã biết. Seed **không ghi đè** giá trị hoặc mật khẩu tài khoản đã tồn tại; không bổ sung lại danh mục của nhà thuốc đã có thuốc. Đổi `DEMO_PASSWORD` không thay mật khẩu tài khoản đã seed. Admin có thể đổi mật khẩu trong màn hình người dùng. Sau một thời gian dài, lô mẫu có thể hết hạn; để tạo lại bộ demo hãy dùng database/volume demo mới, không xóa dữ liệu cần giữ.

## Cấu trúc và công nghệ

```text
frontend/
  src/app/           Xác thực và trạng thái phiên
  src/layouts/       Sidebar, header, tài khoản cá nhân
  src/routes/        Điều hướng và Protected Routes
  src/pages/         Các màn hình theo vai trò
  src/features/      Form dùng React Hook Form + Zod
  src/components/    Bảng, bộ lọc, trạng thái, card
  src/components/ui/ Button, Dialog theo shadcn/Radix
  src/services/      Fetch client tập trung
  src/utils/         FEFO, định dạng, kiểm thử
backend/
  src/config/        Prisma và cấu hình môi trường
  src/middlewares/   Authentication, RBAC, phạm vi nhà thuốc
  src/modules/       REST routes theo module
  src/services/      Audit trong cùng transaction
  prisma/            Schema, migration MySQL, seed
  tests/             Unit và integration tests dùng MySQL thật
e2e/                 Playwright kiểm tra luồng và chụp ảnh
docs/                Kiến trúc, API, phạm vi và báo cáo 2.6
.github/workflows/   CI (không CD)
```

React 19, TypeScript, Vite 7, Tailwind 4, thành phần shadcn/ui tùy biến trên Radix, Lucide, React Router, TanStack Query, React Hook Form, Zod, Recharts. Express 5, Node.js, Prisma **6.19** và MySQL **8.4**. Prisma và client được khóa cùng phiên bản để giữ cấu hình migration ổn định cho đồ án; không dùng bản major thử nghiệm. `package-lock.json` cố định dependency thực tế. Font Be Vietnam Pro được đóng gói cục bộ, không gọi CDN khi xem giao diện.

Các trang được chia theo tính năng; API dùng Prisma trực tiếp trong module, tách dịch vụ audit và xác thực. Không thêm repository wrapper chỉ để bọc một lệnh ORM ở giai đoạn này. Tiền lưu `DECIMAL(14,2)` và API trả chuỗi; phiếu nhập tính tổng ở backend bằng `Prisma.Decimal`. POS dùng đơn vị phần trăm đồng khi cộng giá và chỉ xem trước.

## Trạng thái chức năng

| Chức năng                                    | Trạng thái giai đoạn 1                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Login/logout, thông tin tài khoản            | Thật; cookie phiên HttpOnly, hash token trong MySQL, hash mật khẩu scrypt                                           |
| Nhà thuốc, gán quản lý, trạng thái           | CRUD thật; Admin; ngừng nhà thuốc chặn các tài khoản thuộc nhà thuốc                                                |
| Người dùng, nhân viên, vai trò, khóa/mở khóa | CRUD thật; cập nhật thu hồi phiên; Manager chỉ quản lý Sales/Inventory của mình                                     |
| Thuốc, giá, phân loại, trạng thái            | CRUD thật; Manager; không xóa cứng                                                                                  |
| Nhà cung cấp, trạng thái hợp tác             | CRUD thật; Manager                                                                                                  |
| Tra cứu thuốc, tồn và lô, hạn sử dụng        | Đọc MySQL thật; nguồn dữ liệu ban đầu là seed                                                                       |
| Phiếu nhập                                   | Thêm/xóa dòng, kiểm tra, tính tổng và lưu **nháp thật**; xem lại nháp                                               |
| Xác nhận nhập / cộng tồn                     | Chưa triển khai; nút khóa và API trả 501                                                                            |
| Kiểm kê                                      | Prototype nhập số thực tế, chênh lệch, ghi chú; không lưu và không sửa tồn                                          |
| POS OTC / theo đơn / FEFO                    | Prototype tương tác, chia nhiều lô đủ điều kiện, tính tiền, xem trước; không lưu phiếu/đơn thuốc, không giữ chỗ tồn |
| Thanh toán / xác nhận bán / trừ tồn          | Chưa triển khai; nút khóa và API trả 501                                                                            |
| Lịch sử bán                                  | Đọc chứng từ mẫu từ MySQL, xem chi tiết lô và thanh toán mẫu                                                        |
| Báo cáo                                      | Truy vấn tổng hợp thật theo khoảng ngày; chứng từ seed được gắn nhãn dữ liệu demo                                   |
| Dashboard Admin / Manager                    | Thống kê thật, tổng quan hệ thống / cơ sở và các lối vào chức năng                                                  |

Không có khách hàng đăng nhập, shopping online, giao hàng, liên kết ngân hàng thật, dữ liệu dược quốc gia hoặc chuyển kho liên nhà thuốc.

## Bổ sung chức năng quản lý

Quản lý có trang tổng quan riêng với 8 nhóm chức năng; tạo tài khoản và cấp vai trò nhân viên bằng form, khóa/mở khóa và thu hồi phiên cũ. Quản lý, nhân viên kho, nhân viên bán cùng dùng `/lookup` để tra cứu thuốc trong cơ sở theo tên/mã/mã vạch/hoạt chất/số đăng ký, lọc nhóm/đơn vị/Rx–OTC/tồn và xem chi tiết lô.

Quản lý còn xem lịch sử nhập, lịch sử bán và hạn dùng. Danh mục thêm mã vạch, số đăng ký, vị trí kệ; nhà cung cấp thêm mã số thuế, người liên hệ, ghi chú. Báo cáo có chi tiết doanh thu, nhập hàng, nhập–xuất–tồn theo kỳ; xuất CSV và in/lưu PDF. Bản in gồm đầy đủ dòng và nhãn mẫu/nháp. [Hướng dẫn trình diễn và ma trận quyền](docs/management-guide.md) có kịch bản 5–7 phút cho bài tập lớn.

Các nghiệp vụ xác nhận nhập/bán, thanh toán và điều chỉnh tồn vẫn thuộc Phase 2. Bản in chứng từ đã lưu không thay đổi trạng thái chứng từ hoặc tồn.

## Kiểm tra

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run test:integration
```

Integration test cần MySQL đã migrate/seed và `DEMO_SEED=true` trong `backend/.env`. Chạy trên DB demo/test. Test tự tạo bản ghi riêng và dọn **chỉ các ID do test tạo**, không xóa dữ liệu seed hoặc bản ghi của người dùng.

Kiểm tra giao diện (giữ `npm run dev` đang chạy ở terminal khác):

```bash
npx playwright install chromium
npm run test:e2e
```

Nếu đã có Chrome trên Linux Mint:

```bash
PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e
```

Để kiểm tra bản Docker, thêm `E2E_BASE_URL=http://localhost:8080`. CI cài dependency, lint, typecheck, build, unit, MySQL integration và Playwright. Workflow sẽ chạy khi bạn tự push hoặc mở PR; chưa có CD và dự án này không tự push.

## Ảnh Chương 2.6

Mười ba PNG (6 hình bắt buộc và 7 hình mở rộng quản lý/tài khoản) trong [`docs/report/chapter-2-6/images`](docs/report/chapter-2-6/images), kèm mô tả và liên kết UC trong [hướng dẫn ảnh](docs/report/chapter-2-6/README.md). Chụp lại trên ứng dụng thật:

```bash
PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome npm run screenshots
```

Script đăng nhập đúng vai trò, đợi dữ liệu và font, chụp viewport **1440 × 900**, không chụp màn login hoặc thông tin token. POS được thêm ba thuốc OTC để minh họa FEFO; không tạo giao dịch.

## Giai đoạn 2

Xác nhận nhập có idempotency, transaction cộng tồn và khóa chứng từ; bán hàng có transaction phân bổ FEFO/khóa tồn, giá snapshot và không bán âm; lưu và xác minh đơn thuốc; thanh toán đáng tin cậy, hủy/hoàn phiếu, hóa đơn điện tử/chính thức; lưu kiểm kê và phê duyệt điều chỉnh tồn có audit. Bổ sung phân trang/lọc ở server, tiền tệ theo quy tắc làm tròn thống nhất, đơn vị quy đổi, ghi nhận người sửa trên từng thực thể, đối soát tồn theo lô và định giá tồn kho, backup/restore, quản lý quyền chi tiết, hardening và rà soát nghiệp vụ pháp lý riêng trước sử dụng thực tế.

Xem thêm [kiến trúc & khác biệt UML](docs/architecture.md), [API](docs/api.md) và [biên bản kiểm chứng](docs/verification.md).

# Phần mở rộng chức năng quản lý và tra cứu chung

Bổ sung theo yêu cầu và các form tham khảo của người dùng. Giao diện giữ các trường cần thiết cho bài tập lớn, dùng chung thiết kế hiện có. Đây vẫn là giai đoạn 1: thao tác quản lý lưu thật; giao dịch nhập/bán chính thức và điều chỉnh tồn chưa triển khai.

## Phân quyền

| Chức năng                                                      | Quản lý                  | Nhân viên kho | Nhân viên bán thuốc |
| -------------------------------------------------------------- | ------------------------ | ------------- | ------------------- |
| Tra cứu tên, mã, mã vạch, hoạt chất, số đăng ký                | Có                       | Có            | Có                  |
| Lọc nhóm, đơn vị, Rx/OTC, tình trạng tồn; xem từng lô          | Có                       | Có            | Có                  |
| Tạo tài khoản, cấp/đổi vai trò, khóa/mở khóa nhân viên         | Có, nhân viên cùng cơ sở | Không         | Không               |
| Thêm/sửa thông tin thuốc, giá bán, ngưỡng cảnh báo             | Có                       | Không         | Không               |
| Thêm/sửa nhà cung cấp, thông tin liên hệ                       | Có                       | Không         | Không               |
| Lập phiếu nhập nháp                                            | Không                    | Có            | Không               |
| Xem lịch sử và in phiếu nhập                                   | Có                       | Có            | Không               |
| Theo dõi hạn sử dụng                                           | Có                       | Có            | Không               |
| POS xem trước OTC/Rx và FEFO                                   | Không                    | Không         | Có                  |
| Xem lịch sử và in phiếu bán                                    | Có                       | Không         | Có                  |
| Báo cáo tổng hợp, doanh thu chi tiết, nhập hàng, nhập–xuất–tồn | Có                       | Không         | Không               |
| Kiểm kê xem trước                                              | Không                    | Có            | Không               |

Mật khẩu khi tạo tài khoản hoặc đặt mật khẩu mới phải từ **8 đến 128 ký tự**. Form kiểm tra ngay trước khi gửi và hiển thị lỗi cạnh trường tương ứng. Khi chỉnh sửa tài khoản, để trống mật khẩu để giữ mật khẩu hiện tại. Mật khẩu được giữ nguyên ký tự, không tự cắt khoảng trắng. Nút hiện/ẩn mật khẩu giúp kiểm tra lại nội dung trước khi lưu.

Mỗi tài khoản nhân viên có **một vai trò**: Nhân viên kho hoặc Nhân viên bán thuốc. Không cấp Admin/Manager tại màn hình nhân viên. Backend lấy cơ sở từ phiên đăng nhập, bỏ qua cơ sở do client tự chỉ định. Khóa hoặc đổi vai trò thu hồi phiên cũ, nhân viên đăng nhập lại để dùng quyền mới.

## Những màn hình bổ sung

- `/overview`: tổng quan quản lý riêng, thống kê hôm nay, tồn thấp, lô cần theo dõi và 8 nhóm chức năng.
- `/staff`: tạo tài khoản với mật khẩu, chọn vai trò, sửa thông tin, khóa/mở khóa; nút **Cấp vai trò** riêng; lọc theo vai trò/trạng thái và bảng giải thích quyền.
- `/lookup`: trang tra cứu chung cho ba vai trò. Đường dẫn cũ `/inventory` chuyển hướng sang trang này. Chi tiết thuốc có hoạt chất, hàm lượng, nhóm, đơn vị, mã vạch, số đăng ký, nhà sản xuất, vị trí kệ, giá và danh sách lô. Xuất CSV theo bộ lọc hiện tại.
- `/medicines`: bổ sung mã vạch, số đăng ký và vị trí kệ. Mã vạch không bắt buộc, nếu có phải duy nhất trong cùng cơ sở. Không ép mã vạch thành số để giữ số 0 ở đầu.
- `/suppliers`: thêm mã số thuế, người liên hệ và ghi chú; tìm theo tên, mã, điện thoại, mã số thuế hoặc người liên hệ.
- `/receipt-history`: quản lý xem phiếu nháp/đã xác nhận, lọc ngày, tìm chứng từ và nhà cung cấp. Chi tiết và bản in gồm tất cả dòng thuốc, số lô, hạn dùng, giá, số lượng, tổng tiền và nhãn nháp/mẫu.
- `/receipts`: nhân viên kho có ô tìm tên/mã/mã vạch để chọn nhanh thuốc vào phiếu. Các trường lô, hạn, số lượng và giá nhập vẫn chỉnh được theo dòng. Lưu nháp không cộng tồn.
- `/sales`: quản lý và nhân viên bán xem chứng từ, tìm theo mã/khách/nhân viên, lọc ngày, xuất danh sách CSV, xem chi tiết và in/lưu PDF bằng hộp thoại in của trình duyệt.
- `/reports`: bốn thẻ Tổng quan, Doanh thu chi tiết, Nhập hàng chi tiết, Nhập–Xuất–Tồn. Chi tiết hỗ trợ xuất CSV và bản in đầy đủ, không chỉ trang đang nhìn thấy.

Bản in có tên cơ sở và nhãn dữ liệu mẫu/bản nháp. Đây là bản in trình diễn cho báo cáo, chưa phải hóa đơn điện tử hoặc nghiệp vụ xuất hóa đơn chính thức. CSV dùng UTF-8 BOM, escape ký tự đặc biệt và vô hiệu chuỗi có thể bị hiểu là công thức bảng tính.

## Cách tính báo cáo

Doanh thu chi tiết lấy các phiếu bán `CONFIRMED` theo ngày bán, múi giờ Việt Nam. Thành tiền từng dòng = số lượng × đơn giá; tổng doanh thu lấy tổng tiền sau giảm giá của từng phiếu, không nhân lặp giảm giá theo số dòng. Nhập hàng chi tiết chỉ tính phiếu nhập `CONFIRMED`, loại phiếu nháp. Giá và tổng được tính bằng Decimal tại backend.

Nhập–Xuất–Tồn tổng hợp `StockMovement` theo thuốc: tồn đầu là tổng biến động trước ngày bắt đầu; nhập, xuất và điều chỉnh thuộc kỳ; tồn cuối = tồn đầu + nhập − xuất + điều chỉnh. Tồn này là tồn vật lý theo sổ đến cuối kỳ, gồm cả lô hết hạn/cách ly; khác số lượng có thể bán và khác thẻ tồn hiện tại trên tab tổng quan. Khoảng ngày tối đa 366 ngày. Bộ seed có sổ biến động khớp tồn lô; dữ liệu mẫu được gắn nhãn trong bảng, CSV và bản in.

Mã vạch `DEMO-*` và số đăng ký `SDK-MAU-*` trong seed chỉ để thử tìm kiếm. Seed bổ sung các trường thông tin demo còn trống trên những ID mẫu đã biết, giữ giá trị đã có và không sửa tài khoản/mật khẩu. Không dùng các mã này như dữ liệu dược thực tế.

## Kịch bản trình bày 5–7 phút

1. Đăng nhập `manager@gpp.demo`, giới thiệu 8 nhóm chức năng và phạm vi nhà thuốc An Tâm.
2. Vào **Nhân viên & phân quyền**, thêm nhân viên, chọn vai trò bán thuốc. Đăng nhập tài khoản mới ở cửa sổ riêng để thấy menu tương ứng.
3. Dùng nút **Cấp vai trò**, đổi sang nhân viên kho. Phiên cũ hết hiệu lực; đăng nhập lại sẽ vào tổng quan kho.
4. Cả quản lý và nhân viên vào **Tra cứu thuốc**, tìm `DEMO-1-0001`, mở 3 lô để so sánh tồn vật lý/có thể bán và hạn dùng.
5. Quản lý sửa thuốc hoặc thêm nhà cung cấp; tải lại để chứng minh dữ liệu được lưu vào MySQL.
6. Nhân viên kho tìm thuốc và lưu phiếu nháp. Quản lý mở lịch sử nhập, tìm số chứng từ và xem bản in có nhãn **BẢN NHÁP — CHƯA CỘNG TỒN**.
7. Quản lý mở báo cáo chi tiết, chọn khoảng ngày, xuất CSV và trình bày công thức tồn cuối. Nhắc rõ chứng từ xác nhận hiện là dữ liệu seed mẫu.

Xem ảnh và chú thích trong [mục 2.6](report/chapter-2-6/README.md). Bảng quyền phía trên có thể dùng để bổ sung phần đặc tả Actor và Use Case; mở rộng quyền đọc của Manager với UC-08, UC-09 và UC-13, giữ quyền ghi đúng vai trò.

## Menu avatar và bố cục giao diện

Bấm avatar góc phải để xem tên, email, vai trò và cơ sở. Menu có Thông tin tài khoản, Không gian làm việc và Đăng xuất. Có thể dùng Enter/phím mũi tên để mở và di chuyển, Escape để đóng, hoặc bấm ra ngoài. Trên điện thoại, nút thu gọn còn avatar; menu nằm trong khung nhìn. Đăng xuất gọi API hủy phiên và trở về đăng nhập.

Thanh điều hướng chỉ chứa các chức năng nghiệp vụ; tài khoản và đăng xuất nằm trong menu avatar, không lặp lại ở cuối thanh bên. Tên mục tự xuống dòng khi cần nên không tạo thanh cuộn ngang; khung thấp vẫn cuộn dọc để truy cập đủ chức năng.

Thanh điều hướng xanh đậm, trạng thái được nhấn bằng màu rõ hơn và chữ phụ tăng tương phản. Các thẻ chức năng có biểu tượng, màu nhấn và phản hồi khi rê chuột; số lượng cần xử lý trong mục Ưu tiên hôm nay được làm nổi bật.

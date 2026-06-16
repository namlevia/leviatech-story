# LeviaTech Story 1.0

**LeviaTech Story 1.0** là một hệ thống tạo tiểu thuyết thông minh, hoàn thiện và sẵn sàng cho môi trường production. Được viết lại hoàn toàn với kiến trúc hiện đại (Go + Next.js), hệ thống cung cấp một bộ công cụ toàn diện được hỗ trợ bởi AI, thiết kế nhằm giúp các tác giả, nhà văn và nhà sáng tạo trong việc lên ý tưởng, lập dàn ý, viết nháp, viết lại và trau chuốt các tiểu thuyết dài kỳ.

---

## 🌟 Tính năng cốt lõi

- **✍️ Sáng tạo thông minh**: Viết tiểu thuyết từ con số không. Tự động tạo tiêu đề sáng tạo, xây dựng hồ sơ nhân vật chi tiết, thiết kế bối cảnh thế giới và xây dựng dàn ý toàn diện trước khi bắt đầu viết các chương.
- **⏸️ Hỗ trợ tiếp tục & Tự động lưu**: Mỗi thao tác và nội dung sinh ra đều được lưu tự động. Bạn có thể tiếp tục viết chính xác từ vị trí đã dừng thông qua hệ thống Quản lý dự án.
- **🔄 Viết lại & Trau chuốt**: Tải lên văn bản có sẵn của bạn và sử dụng các công cụ trau chuốt nâng cao để nâng cấp câu chữ, tìm lỗi logic, loại bỏ văn phong AI, hoặc tối ưu hóa nhịp độ truyện.
- **⚡ Kiến trúc siêu tốc**: Thay thế toàn bộ mã nguồn cũ bằng Backend viết bằng Go siêu nhẹ và Frontend bằng Next.js tối ưu, mang lại độ phản hồi tức thì và không có độ trễ cho giao diện người dùng.
- **💾 Xuất đa định dạng**: Xuất các dự án đã hoàn thành hoặc đang tiến hành thành các định dạng phổ biến chỉ bằng một cú nhấp chuột.
- **⚙️ Quản lý API linh hoạt**: Quản lý nhiều API backend (OpenAI, Anthropic, Google, v.v.), thiết lập cổng API, khoá và tham số riêng lẻ, kiểm tra cấu hình kết nối trực tiếp từ giao diện.

---

## 🔧 Công nghệ & Kiến trúc

- **Backend**: Go (Golang) 1.23+ cùng Fiber framework, cung cấp API siêu tốc và quản lý luồng đồng thời cực kỳ ổn định.
- **Frontend**: Next.js 15+ (App Router) với React 19, Tailwind CSS v4, mang lại giao diện Web hiện đại, mượt mà và thân thiện với mọi thiết bị.
- **Cơ sở dữ liệu**: SQLite được tích hợp gọn nhẹ để lưu trữ dữ liệu dự án, tiến độ viết và cấu hình hệ thống một cách mạnh mẽ.
- **Lưu trữ I/O**: Quản lý lưu trữ văn bản cục bộ, giảm thiểu phụ thuộc mạng ngoài.

---

## 🚀 Hướng dẫn khởi động nhanh

Dự án đã được tối ưu hóa Docker cực nhẹ (multi-stage build), giúp gộp cả Backend và Frontend vào một môi trường chạy duy nhất, đơn giản hoá tuyệt đối quá trình triển khai.

### 🐳 Chạy qua Docker (Khuyên dùng)

**Yêu cầu**: Đã cài đặt Docker và Docker Compose.

#### Cách 1: Tải Image có sẵn từ Github (Nhanh nhất, gọn nhẹ)
Cách này không cần tải mã nguồn, chỉ cần copy nội dung file dưới đây là chạy được ngay.
1. Tạo một thư mục trống bất kỳ (ví dụ: `leviatech-story`).
2. Tạo file `docker-compose.yml` trong thư mục đó với nội dung sau:
   ```yaml
   version: '3.8'
   services:
     leviatech-story:
       image: ghcr.io/namlevia/leviatech-story:latest
       container_name: leviatech-story
       restart: unless-stopped
       ports:
         - "1997:1997"
       environment:
         - TZ=Asia/Ho_Chi_Minh
       volumes:
         - ./data:/app/data
         - ./logs:/app/logs
         - ./exports:/app/exports
         - ./cache:/app/cache
         - ./backups:/app/backups
   ```
3. Mở Terminal tại thư mục đó và chạy lệnh:
   ```bash
   docker-compose up -d
   ```
4. Mở trình duyệt và truy cập: **`http://localhost:1997`**

#### Cách 2: Tự Build Image từ mã nguồn (Dành cho Developer)
1. **Clone mã nguồn**:
   ```bash
   git clone https://github.com/namlevia/leviatech-story.git
   cd leviatech-story
   ```
2. **Tiến hành Build và chạy**:
   Docker sẽ tự động tải các gói cài đặt, biên dịch Go và Next.js rồi chạy ngầm.
   ```bash
   docker-compose up -d --build
   ```
3. Mở trình duyệt và truy cập: **`http://localhost:1997`**

*Lưu ý: Toàn bộ dữ liệu của bạn (`data`, `logs`, `exports`) sẽ được lưu lại an toàn bên ngoài thư mục máy nhờ cơ chế Volumes của Docker Compose, dù cập nhật hay xóa container thì truyện của bạn vẫn an toàn 100%.*

### 💻 Chạy Local cho Developer (Không dùng Docker)

**Yêu cầu**: 
- Đã cài đặt [Go](https://go.dev/doc/install) 1.23+
- Đã cài đặt [Node.js](https://nodejs.org/) 20+

1. **Khởi động Ứng dụng (Backend & Frontend)**:
   Mở Terminal và chạy:
   ```bash
   go mod download
   go run cmd/api/main.go
   ```
   *Toàn bộ hệ thống (gồm cả giao diện Web và API) sẽ hoạt động tại: **`http://localhost:1997`***

2. **Dành riêng cho Frontend Developer (Nếu muốn sửa Code UI)**:
   Nếu bạn muốn code giao diện và cần tính năng Hot-reload, hãy mở Terminal thứ hai và chạy:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Môi trường Frontend Dev sẽ chạy ở cổng `http://localhost:1998`.*

### 📦 Chạy Bằng Bản Build Sẵn (Dành cho người dùng phổ thông)

Nếu bạn không muốn cài đặt Docker hay thao tác với mã nguồn phức tạp, bạn có thể tải ngay bản chạy sẵn (đã được đóng gói đầy đủ giao diện và hệ thống) trong trang **[Releases](https://github.com/namlevia/leviatech-story/releases)** của Github.

**Hướng dẫn chạy cho từng hệ điều hành:**

*🔹 Dành cho Windows:*
1. Giải nén file ZIP vừa tải về.
2. Nhấp đúp chuột vào file `leviatech-story.exe` để chạy.
3. Nếu có bảng đen (Terminal) hiện lên báo Server đã chạy, hãy mở trình duyệt web và truy cập vào: **`http://localhost:1997`**

*🔹 Dành cho macOS và Linux:*
1. Giải nén file ZIP ra một thư mục.
2. Mở ứng dụng Terminal, dùng lệnh `cd` di chuyển vào thư mục vừa giải nén.
3. Cấp quyền thực thi bằng lệnh: `chmod +x leviatech-story`
4. Chạy ứng dụng bằng lệnh: `./leviatech-story`
5. Mở trình duyệt web và truy cập: **`http://localhost:1997`**

*🔹 Dành cho Android:*
1. Cài đặt ứng dụng **Termux** trên điện thoại.
2. Giải nén file ZIP vào bộ nhớ máy, dùng Termux di chuyển tới thư mục đó.
3. Cấp quyền `chmod +x leviatech-story` và chạy lệnh `./leviatech-story`.
4. Mở trình duyệt Chrome/Safari trên điện thoại truy cập: **`http://localhost:1997`**

**Danh sách các file ZIP hỗ trợ (trên trang Releases):**
- `leviatech-story-windows-amd64.zip` (Dành cho PC/Laptop Windows dùng chip Intel/AMD)
- `leviatech-story-windows-arm64.zip` (Dành cho thiết bị Windows dùng chip Snapdragon/ARM)
- `leviatech-story-linux-amd64.zip` (Dành cho server/máy Linux dùng chip Intel/AMD)
- `leviatech-story-linux-arm64.zip` (Dành cho server/máy Linux dùng chip ARM)
- `leviatech-story-darwin-amd64.zip` (Dành cho máy Mac đời cũ chạy chip Intel)
- `leviatech-story-darwin-arm64.zip` (Dành cho máy Mac đời mới chạy chip Apple Silicon như M1, M2, M3...)
- `leviatech-story-android-arm64.zip` (Dành cho nền tảng Android)

---

## 💻 Đóng góp & Hỗ trợ

Chúng tôi hoan nghênh các yêu cầu đóng góp (pull requests) và báo cáo sự cố (issues)! Nếu bạn gặp vấn đề về kết nối API, hãy kiểm tra kỹ các thông số tại trang **Cài đặt** trên giao diện Web.

### Giấy phép (License)

Dự án này được cấp phép theo **MIT License**. Vui lòng xem tệp [LICENSE](LICENSE) để biết thêm chi tiết.

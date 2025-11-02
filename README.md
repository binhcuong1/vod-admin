# 🧭 README: Start Bootstrap SB Admin 2

**SB Admin 2** là một mẫu giao diện quản trị (Admin Dashboard Template) được xây dựng hoàn toàn bằng **HTML, CSS, JavaScript và Bootstrap 4/5**. Đây là một trong những template admin miễn phí phổ biến nhất của [Start Bootstrap](https://startbootstrap.com/template/sb-admin-2), giúp bạn dễ dàng tạo giao diện quản trị, thống kê hoặc hệ thống nội bộ.

---

## ⚙️ Công nghệ sử dụng

| Thành phần | Mô tả |
|-------------|-------|
| **HTML5** | Cấu trúc trang và bố cục nội dung. |
| **CSS3** | Định dạng giao diện, bố cục, hiệu ứng. |
| **Bootstrap 4** | Framework CSS giúp giao diện phản hồi nhanh (responsive). |
| **JavaScript / jQuery** | Thêm hiệu ứng động, xử lý các sự kiện người dùng. |
| **Font Awesome** | Cung cấp bộ icon phong phú. |
| **Chart.js** | Tạo biểu đồ trực quan (dạng thanh, tròn, đường, v.v). |

---

## 🚀 Cách chạy project

### 🧩 Cách 1 — Mở trực tiếp
1. Giải nén thư mục `startbootstrap-sb-admin-2-gh-pages.zip`.
2. Mở file `index.html` bằng trình duyệt (Chrome, Edge, Firefox, ...).

> ⚠️ Cách này chỉ xem được giao diện tĩnh (không có backend).

---

### 💻 Cách 2 — Chạy bằng VS Code + Live Server
1. Cài **Visual Studio Code**.
2. Cài plugin **Live Server** (tác giả: Ritwick Dey).
3. Nhấp chuột phải vào `index.html` → **Open with Live Server**.
4. Trình duyệt sẽ tự mở ở địa chỉ: `http://127.0.0.1:5500/index.html`

---

### 🧠 Cách 3 — Dùng NodeJS (tùy chọn)
Nếu có NodeJS, bạn có thể chạy server cục bộ:
```bash
npm install -g serve
serve .
```
Sau đó mở trình duyệt theo link hiển thị (thường là `http://localhost:3000`).

---

## 🧱 Cấu trúc thư mục chi tiết

```
sb-admin-2/
├── index.html              # Trang chính (Dashboard tổng quan)
├── charts.html             # Trang biểu đồ (Chart.js)
├── tables.html             # Trang bảng dữ liệu (DataTables)
│
├── css/                    # Toàn bộ CSS của giao diện
│   ├── sb-admin-2.css      # CSS chính cho template
│   ├── sb-admin-2.min.css  # Bản nén tối ưu (dùng khi deploy)
│   ├── bootstrap.min.css   # CSS gốc từ Bootstrap
│   └── fontawesome.min.css # CSS icon từ Font Awesome
│
├── js/                     # JavaScript logic và script tương tác
│   ├── sb-admin-2.js       # Script chính điều khiển hành vi template
│   ├── sb-admin-2.min.js   # Bản nén của script trên
│   ├── bootstrap.bundle.min.js # Gồm Bootstrap JS + Popper.js
│   ├── jquery.min.js       # Thư viện jQuery
│   ├── chart.min.js        # Chart.js (vẽ biểu đồ)
│   └── demo/               # Ví dụ code biểu đồ mẫu
│       ├── chart-area-demo.js
│       ├── chart-bar-demo.js
│       └── chart-pie-demo.js
│
├── vendor/                 # Thư viện bên thứ ba (được import sẵn)
│   ├── bootstrap/          # File JS & CSS của Bootstrap
│   ├── jquery/             # File jQuery
│   ├── fontawesome-free/   # Font Awesome icon
│   ├── chart.js/           # Thư viện Chart.js
│   └── datatables/         # Plugin hiển thị bảng có phân trang, tìm kiếm
│
└── img/                    # (nếu có) chứa hình ảnh minh họa
```

---

## 🧩 Giải thích một số file chính

| File | Vai trò |
|------|----------|
| **index.html** | Trang chủ dashboard hiển thị biểu đồ, số liệu, thẻ thống kê. |
| **charts.html** | Trang riêng hiển thị các biểu đồ mẫu dùng Chart.js. |
| **tables.html** | Trang bảng dữ liệu, hỗ trợ DataTables (tìm kiếm, sắp xếp, phân trang). |
| **css/sb-admin-2.css** | File định dạng giao diện chính, mở rộng từ Bootstrap. |
| **js/sb-admin-2.js** | Điều khiển sidebar, animation, scroll behavior... |
| **vendor/chart.js/** | Thư viện tạo biểu đồ. |
| **vendor/datatables/** | Thư viện xử lý bảng dữ liệu có chức năng nâng cao. |

---

## 🧭 Cách tùy chỉnh giao diện

### 🔹 Thay logo hoặc tên trang
Mở `index.html`, tìm đoạn:
```html
<a class="sidebar-brand d-flex align-items-center justify-content-center" href="index.html">
  <div class="sidebar-brand-icon rotate-n-15">
    <i class="fas fa-laugh-wink"></i>
  </div>
  <div class="sidebar-brand-text mx-3">SB Admin <sup>2</sup></div>
</a>
```
Thay icon `<i>` hoặc nội dung text theo ý muốn.

### 🔹 Thêm menu mới
Thêm vào phần `<ul class="navbar-nav bg-gradient-primary sidebar sidebar-dark accordion" id="accordionSidebar">`:
```html
<li class="nav-item">
  <a class="nav-link" href="my-page.html">
    <i class="fas fa-fw fa-folder"></i>
    <span>Trang mới</span>
  </a>
</li>
```

### 🔹 Thay màu chủ đạo
Mở `css/sb-admin-2.css` → tìm phần `.bg-gradient-primary` → đổi giá trị `background: linear-gradient(...)` sang màu bạn muốn.

---

## 📊 Biểu đồ và dữ liệu mẫu
- Các file demo biểu đồ nằm trong `js/demo/`:
  - `chart-area-demo.js`
  - `chart-bar-demo.js`
  - `chart-pie-demo.js`
- Mỗi file định nghĩa dữ liệu mẫu cho biểu đồ tương ứng trên `charts.html`.

---

## 🌐 Tài nguyên & Tài liệu
- Trang chủ dự án: [https://startbootstrap.com/template/sb-admin-2](https://startbootstrap.com/template/sb-admin-2)
- Demo online: [https://startbootstrap.github.io/startbootstrap-sb-admin-2/](https://startbootstrap.github.io/startbootstrap-sb-admin-2/)
- Tài liệu Bootstrap: [https://getbootstrap.com/docs/4.6/getting-started/introduction/](https://getbootstrap.com/docs/4.6/getting-started/introduction/)
- Chart.js: [https://www.chartjs.org/docs/latest/](https://www.chartjs.org/docs/latest/)

---

## 📜 Giấy phép
- © Start Bootstrap (MIT License)
- Bạn được **sử dụng, chỉnh sửa, phân phối miễn phí** miễn là giữ lại dòng bản quyền gốc.

---

## ✅ Kết luận
**SB Admin 2** là một template HTML đơn giản nhưng mạnh mẽ để tạo giao diện quản trị. Nó hoàn toàn không cần cài đặt framework phức tạp, chỉ cần mở `index.html` là chạy.

> 📘 Rất phù hợp cho sinh viên, người mới học web, hoặc các dự án nhỏ muốn có dashboard nhanh và đẹp.


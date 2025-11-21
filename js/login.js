document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("exampleInputEmail");
    const passInput = document.getElementById("exampleInputPassword");
    const btnLogin = document.getElementById("btnLogin");
    const alertBox = document.getElementById("loginAlert");

    function showMessage(type, text) {
        if (!alertBox) {
            alert(text); 
            return;
        }
        alertBox.className = `alert alert-${type} small mb-3`;
        alertBox.textContent = text;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = emailInput?.value?.trim();
        const password = passInput?.value || "";

        if (!email || !password) {
            showMessage("danger", "Vui lòng nhập email và mật khẩu");
            return;
        }

        const base = window.API_BASE || "http://127.0.0.1:3000";
        const url = `${base}/api/auth/login`;

        btnLogin.disabled = true;
        const oldText = btnLogin.textContent;
        btnLogin.textContent = "Đang đăng nhập...";

        try {
            const res = await axios.post(url, { email, password });

            if (!res.data?.success || !res.data?.token) {
                showMessage("danger", res.data?.error || "Đăng nhập thất bại");
                return;
            }

            // Lưu token + user
            localStorage.setItem("access_token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user || {}));

            showMessage("success", "Đăng nhập thành công, đang chuyển trang...");

            setTimeout(() => {
                window.location.href = "/index.html";
            }, 2000);
        } catch (err) {
            console.error("login failed:", err);
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                "Sai email hoặc mật khẩu";
            showMessage("danger", msg);
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = oldText;
        }
    });
});

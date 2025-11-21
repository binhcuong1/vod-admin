document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "/pages/auth/login.html";
        return;
    }

    let user = null;
    try {
        const raw = localStorage.getItem("user");
        user = raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn("Không parse được user trong localStorage:", e);
    }

    const role =
        user?.role ??
        user?.Role ??
        user?.role_name ??
        user?.Role_name ??
        user?.account_role ??
        user?.Account_role ??
        null;

    const isAdmin =
        role === "admin" ||
        role === "Admin" ||
        role === "ADMIN" ||
        role === 1 ||      
        role === "1";

    if (!user || !isAdmin) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/pages/auth/login.html";
        return;
    }

    // Hiển thị tên admin trên topbar
    try {
        const span = document.getElementById("topUserName");
        if (span) {
            const displayName =
                user.full_name ||
                user.name ||
                user.username ||
                user.email ||
                "Admin";

            span.textContent = displayName;
        }
    } catch (e) {
        console.warn("Không parse được user trong localStorage:", e);
    }

    // Xử lý nút Đăng xuất trong modal
    const btnLogout = document.getElementById("btnLogoutConfirm");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            window.location.href = "/pages/auth/login.html";
        });
    }
});

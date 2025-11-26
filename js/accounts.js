(() => {
  // ================== Boot / SPA-lite ==================
  const bootAccount = () =>
    (window.PageInits && typeof window.PageInits.accounts === "function")
      ? window.PageInits.accounts()
      : initAccountPage();

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("tblAccounts")) bootAccount();
  });

  window.PageInits = window.PageInits || {};
  window.PageInits.accounts = initAccountPage;

  // ================== Config axios ==================
  function setupAxiosAccount() {
    const base = window.API_BASE || "http://127.0.0.1:3000";
    axios.defaults.baseURL = base;
    axios.defaults.headers.common["Content-Type"] = "application/json";
  }

  // ================== Helpers ==================
  function $a(sel) {
    return document.querySelector(sel);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m])
    );
  }

  // ================== API ==================
  const ACCOUNT_PATH = () => window.API_ACCOUNT || "/api/accounts";

  async function apiAccountList() {
    const res = await axios.get(ACCOUNT_PATH() + "/");
    return res.data?.data || res.data || [];
  }

  async function apiAccountCreate(payload) {
    const res = await axios.post(ACCOUNT_PATH() + "/", payload);
    return res.data;
  }

  async function apiAccountUpdate(id, payload) {
    const res = await axios.put(`${ACCOUNT_PATH()}/${id}`, payload);
    return res.data;
  }

  async function apiAccountDelete(id) {
    const res = await axios.delete(`${ACCOUNT_PATH()}/${id}`);
    return res.data;
  }

  async function apiPremiumHistory(accountId) {
    const res = await axios.get(`/api/payments/history/${accountId}`);
    return res.data?.data || [];
  }


  // ================== Render ==================
  function renderAccountRows(accounts) {
    const tbody = $a("#tblAccounts tbody");
    if (!tbody) return;

    tbody.innerHTML = (accounts || [])
      .map(
        (a) => `
      <tr>
        <td>${a.Account_id}</td>
        <td>${escapeHtml(a.Email || "")}</td>
        <td>${escapeHtml(a.role || "")}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-info btn-edit"
                  data-id="${a.Account_id}"
                  data-email="${escapeHtml(a.Email || "")}"
                  data-role="${escapeHtml(a.role || "")}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-del" data-id="${a.Account_id}">
            <i class="fas fa-trash"></i>
          </button>
          <button class="btn btn-sm btn-warning btn-premium-history"
                  data-id="${a.Account_id}"
                  data-email="${escapeHtml(a.Email || "")}">
            <i class="fas fa-receipt"></i>
          </button>
        </td>
      </tr>`
      )
      .join("");

    if (window.jQuery?.fn?.DataTable) {
      const $tbl = window.jQuery("#tblAccounts");
      if (window.jQuery.fn.DataTable.isDataTable($tbl)) $tbl.DataTable().destroy();
      $tbl.DataTable();
    }
  }


  // ================== Init ==================
  function initAccountPage() {
    setupAxiosAccount();
    bindAccountEvents();
    reloadAccountList();
  }

  async function reloadAccountList() {
    try {
      const rows = await apiAccountList();
      renderAccountRows(rows);
    } catch (err) {
      console.error("Lỗi tải tài khoản:", err);
      alert("Không tải được danh sách tài khoản");
    }
  }

  async function openPremiumHistory(accountId, email) {
    const nameSpan = document.querySelector("#phAccEmail");
    const body = document.querySelector("#premiumHistoryBody");

    if (nameSpan) {
      nameSpan.textContent = email || `Account #${accountId}`;
    }

    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">Đang tải...</td>
        </tr>`;
    }

    try {
      const rows = await apiPremiumHistory(accountId);

      if (!body) return;

      if (!rows.length) {
        body.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted">
              Chưa có giao dịch Premium nào.
            </td>
          </tr>`;
      } else {
        const now = new Date();

        body.innerHTML = rows
          .map((p, idx) => {
            const paid = p.Paid_at ? new Date(p.Paid_at) : null;
            const exp = p.Expired_at ? new Date(p.Expired_at) : null;
            const active = exp && exp > now;

            const paidStr = paid ? paid.toLocaleString("vi-VN") : "";
            const expStr = exp ? exp.toLocaleString("vi-VN") : "";

            const statusHtml = active
              ? '<span class="badge badge-success">Còn hiệu lực</span>'
              : '<span class="badge badge-secondary">Hết hạn</span>';

            return `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="text-right">
                  ${Number(p.Amount || 0).toLocaleString("vi-VN")} đ
                </td>
                <td class="text-center">${escapeHtml(p.Method || "")}</td>
                <td class="text-center">${paidStr}</td>
                <td class="text-center">${expStr}</td>
                <td class="text-center">${statusHtml}</td>
              </tr>`;
          })
          .join("");
      }

      if (window.jQuery) {
        window.jQuery("#premiumHistoryModal").modal("show");
      }
    } catch (err) {
      console.error("Lỗi tải lịch sử premium:", err);
      if (body) {
        body.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-danger">
              Lỗi tải dữ liệu.
            </td>
          </tr>`;
      }
      alert("Không tải được lịch sử thanh toán");
    }
  }


  // ================== Event Binding ==================
  function bindAccountEvents() {
    const section = document.querySelector("#tblAccounts")?.closest(".card");
    if (!section) return;

    // Bắt sự kiện click trong vùng riêng của Accounts
    section.addEventListener("click", async (e) => {
      e.stopPropagation(); // 🧱 Chặn lan sang file khác (genres, actors, profiles…)

      const addBtn = e.target.closest("#btnAddAccount");
      const editBtn = e.target.closest(".btn-edit");
      const delBtn = e.target.closest(".btn-del");
      const historyBtn = e.target.closest(".btn-premium-history");

      // --- Thêm ---
      if (addBtn) {
        e.preventDefault();
        $("#Account_id").val("");
        $("#Email").val("");
        $("#Password").val("");
        $("#Role").val("user");
        $("#accountModal").modal("show");
        return;
      }

      // --- Sửa ---
      if (editBtn) {
        e.preventDefault();
        $("#Account_id").val(editBtn.dataset.id);
        $("#Email").val(editBtn.dataset.email);
        $("#Password").val(""); // Không hiển thị mật khẩu
        $("#Role").val(editBtn.dataset.role);
        $("#accountModal").modal("show");
        return;
      }

      // --- Xóa ---
      if (delBtn) {
        e.preventDefault();
        const id = delBtn.dataset.id;
        if (confirm("Xóa tài khoản này?")) {
          try {
            await apiAccountDelete(id);
            reloadAccountList();
          } catch (err) {
            console.error("❌ Lỗi xóa:", err);
            alert("Xóa không thành công");
          }
        }
      }

      // --- Lịch sử Premium ---
      if (historyBtn) {
        e.preventDefault();
        const id = historyBtn.dataset.id;
        const email = historyBtn.dataset.email || "";
        openPremiumHistory(id, email);
        return;
      }
    });

    // --- Submit form ---
    const form = document.getElementById("accountForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const id = $("#Account_id").val();
        const email = ($("#Email").val() || "").trim();
        const password = ($("#Password").val() || "").trim();
        const role = ($("#Role").val() || "user").trim();

        if (!email) return alert("Vui lòng nhập email");
        if (!id && !password) return alert("Vui lòng nhập mật khẩu khi thêm mới");

        const payload = { email, role };
        if (password) payload.password = password;

        try {
          if (id) await apiAccountUpdate(id, payload);
          else await apiAccountCreate(payload);

          $("#accountModal").modal("hide");
          reloadAccountList();
        } catch (err) {
          console.error("❌ Lỗi lưu tài khoản:", err);
          alert("Lưu không thành công");
        }
      });
    }
  }
})();

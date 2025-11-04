(() => {
  // ================== Boot / SPA-lite ==================
  const bootProfile = () =>
    (window.PageInits && typeof window.PageInits.profiles === "function")
      ? window.PageInits.profiles()
      : initProfilePage();

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("tblProfiles")) bootProfile();
  });

  window.PageInits = window.PageInits || {};
  window.PageInits.profiles = initProfilePage;

  // ================== Config axios ==================
  function setupAxiosProfile() {
    const base = window.API_BASE || "http://127.0.0.1:3000";
    axios.defaults.baseURL = base;
    axios.defaults.headers.common["Content-Type"] = "application/json";
  }

  // ================== Helpers ==================
  function $p(sel) { return document.querySelector(sel); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  // ================== API Calls ==================
  const PROFILE_PATH = () => window.API_PROFILE || "/api/profile";

  async function apiProfileList() {
    const res = await axios.get(PROFILE_PATH() + "/");
    return res.data?.data || res.data || [];
  }

  async function apiProfileSearch(keyword) {
    const res = await axios.get(PROFILE_PATH() + "/search", { params: { q: keyword || "" } });
    return res.data?.data || res.data || [];
  }

  async function apiProfileCreate(payload) {
    const res = await axios.post(PROFILE_PATH() + "/", payload);
    return res.data;
  }

  async function apiProfileUpdate(id, payload) {
    const res = await axios.put(`${PROFILE_PATH()}/${id}`, payload);
    return res.data;
  }

  async function apiProfileDelete(id) {
    const res = await axios.delete(`${PROFILE_PATH()}/${id}`);
    return res.data;
  }

  // ================== Render Table ==================
  function renderProfileRows(profiles) {
    const tbody = $p("#tblProfiles tbody");
    if (!tbody) return;

    tbody.innerHTML = (profiles || []).map(p => `
      <tr>
        <td>${p.Profile_id}</td>
        <td>${escapeHtml(p.Profile_name || "")}</td>
        <td>${escapeHtml(p.Email || "Không có")}</td>
        <td>${escapeHtml(p.role || "user")}</td>
        <td class="text-center">
          ${p.Avatar_url
            ? `<img src="${escapeHtml(p.Avatar_url)}" width="60" height="60" style="object-fit:cover;border-radius:8px;">`
            : "<i>Không có ảnh</i>"}
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-info btn-edit"
                  data-id="${p.Profile_id}"
                  data-name="${escapeHtml(p.Profile_name || "")}"
                  data-avatar="${p.Avatar_url || ""}"
                  data-account="${p.Account_id || ""}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-del" data-id="${p.Profile_id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");

    // DataTables
    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.DataTable) {
      const $tbl = window.jQuery("#tblProfiles");
      if (window.jQuery.fn.DataTable.isDataTable($tbl)) {
        $tbl.DataTable().destroy();
      }
      $tbl.DataTable();
    }
  }

  // ================== Page Init ==================
  function initProfilePage() {
    setupAxiosProfile();
    bindProfileEvents();
    reloadProfiles();
  }

  async function reloadProfiles(keyword = "") {
    try {
      const rows = keyword ? await apiProfileSearch(keyword) : await apiProfileList();
      renderProfileRows(rows);
    } catch (err) {
      console.error("❌ Lỗi tải hồ sơ:", err);
      alert("Không tải được danh sách hồ sơ");
    }
  }

  // ================== Event Binding ==================
  function bindProfileEvents() {
    const section = document.querySelector("#tblProfiles")?.closest(".card");
    if (!section) return;

    document.removeEventListener("click", onProfileAddClick);
    document.addEventListener("click", onProfileAddClick);

    document.removeEventListener("click", onProfileRowButtons);
    document.addEventListener("click", onProfileRowButtons);

    document.removeEventListener("input", onProfileAvatarPreview);
    document.addEventListener("input", onProfileAvatarPreview);

    const form = document.getElementById("profileForm");
    if (form) {
      form.removeEventListener("submit", onProfileSubmitForm);
      form.addEventListener("submit", onProfileSubmitForm);
    }
  }

  // ================== Handlers ==================
  function onProfileAddClick(e) {
    const btn = e.target.closest("#btnAddProfile");
    if (!btn) return;
    e.preventDefault();
    $("#Profile_id").val("");
    $("#Profile_name").val("");
    $("#Avatar_url").val("");
    $("#Account_id").val("");
    $("#previewProfileAvatar").hide();
    $("#profileModal").modal("show");
  }

  function onProfileRowButtons(e) {
    const editBtn = e.target.closest(".btn-edit");
    const delBtn = e.target.closest(".btn-del");

    if (editBtn) {
      e.preventDefault();
      const id = editBtn.dataset.id;
      const name = editBtn.dataset.name || "";
      const avatar = editBtn.dataset.avatar || "";
      const account = editBtn.dataset.account || "";

      $("#Profile_id").val(id);
      $("#Profile_name").val(name);
      $("#Avatar_url").val(avatar);
      $("#Account_id").val(account);
      if (avatar && avatar.startsWith("http")) {
        $("#previewProfileAvatar").attr("src", avatar).show();
      } else {
        $("#previewProfileAvatar").hide();
      }
      $("#profileModal").modal("show");
      return;
    }

    if (delBtn) {
      e.preventDefault();
      const id = delBtn.dataset.id;
      if (confirm("Bạn có chắc muốn xóa hồ sơ này?")) {
        apiProfileDelete(id)
          .then(() => reloadProfiles())
          .catch(err => {
            console.error(err);
            alert("Xóa không thành công");
          });
      }
    }
  }

  function onProfileAvatarPreview(e) {
    if (e.target.id === "Avatar_url") {
      const url = e.target.value.trim();
      const preview = document.getElementById("previewProfileAvatar");
      if (!preview) return;
      if (url && url.startsWith("http")) {
        preview.src = url;
        preview.style.display = "block";
      } else {
        preview.style.display = "none";
      }
    }
  }

  async function onProfileSubmitForm(e) {
    e.preventDefault();
    const id = $("#Profile_id").val();
    const name = ($("#Profile_name").val() || "").trim();
    const avatar = ($("#Avatar_url").val() || "").trim();
    const accountId = ($("#Account_id").val() || "").trim();

    if (!name) return alert("Vui lòng nhập tên hồ sơ");

    try {
      if (id)
        await apiProfileUpdate(id, { profile_name: name, avatar_url: avatar, account_id: accountId });
      else
        await apiProfileCreate({ profile_name: name, avatar_url: avatar, account_id: accountId });

      $("#profileModal").modal("hide");
      reloadProfiles();
    } catch (err) {
      console.error("❌ Lỗi lưu hồ sơ:", err);
      alert("Lưu không thành công");
    }
  }
})();

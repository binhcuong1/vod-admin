(() => {
  // ================== Boot ==================
  const bootActor = () =>
    (window.PageInits && typeof window.PageInits.actors === "function")
      ? window.PageInits.actors()
      : initActorPage();

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("tblActors")) bootActor();
  });

  window.PageInits = window.PageInits || {};
  window.PageInits.actors = initActorPage;

  // ================== Axios Config ==================
  function setupAxiosActor() {
    const base = window.API_BASE || "http://127.0.0.1:3000";
    axios.defaults.baseURL = base;
    axios.defaults.headers.common["Content-Type"] = "application/json";
  }

  // ================== Helpers ==================
  const $a = (sel) => document.querySelector(sel);
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
    );

  // ================== API ==================
  const ACTOR_PATH = () => window.API_ACTOR || "/api/actor";

  async function apiActorList() {
    const res = await axios.get(ACTOR_PATH() + "/");
    return res.data?.data || res.data || [];
  }
  async function apiActorCreate(payload) {
    const res = await axios.post(ACTOR_PATH() + "/", payload);
    return res.data;
  }
  async function apiActorUpdate(id, payload) {
    const res = await axios.put(`${ACTOR_PATH()}/${id}`, payload);
    return res.data;
  }
  async function apiActorDelete(id) {
    const res = await axios.delete(`${ACTOR_PATH()}/${id}`);
    return res.data;
  }

  // ================== Render Table ==================
  function renderActorRows(actors) {
    const tbody = $a("#tblActors tbody");
    if (!tbody) return;

    tbody.innerHTML = (actors || [])
      .map(
        (a) => `
      <tr>
        <td>${a.Actor_id}</td>
        <td>${escapeHtml(a.Actor_name || "")}</td>
        <td>${escapeHtml(a.Actor_gender || "")}</td>
        <td class="text-center">
          ${
            a.Actor_avatar
              ? `<img src="${escapeHtml(a.Actor_avatar)}" width="60" height="60" style="object-fit:cover;border-radius:8px;">`
              : "<i>Không có ảnh</i>"
          }
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-info btn-edit"
                  data-id="${a.Actor_id}"
                  data-name="${escapeHtml(a.Actor_name || "")}"
                  data-gender="${a.Actor_gender || ""}"
                  data-avatar="${a.Actor_avatar || ""}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-del" data-id="${a.Actor_id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`
      )
      .join("");

    // Refresh DataTable
    if (window.jQuery?.fn?.DataTable) {
      const $tbl = window.jQuery("#tblActors");
      if (window.jQuery.fn.DataTable.isDataTable($tbl)) {
        $tbl.DataTable().destroy();
      }
      $tbl.DataTable();
    }
  }

  // ================== Init Page ==================
  function initActorPage() {
    setupAxiosActor();
    bindActorEvents();
    reloadActorList();
  }

  async function reloadActorList() {
    try {
      const rows = await apiActorList();
      renderActorRows(rows);
    } catch (err) {
      console.error("❌ Lỗi tải diễn viên:", err);
      alert("Không tải được danh sách diễn viên");
    }
  }

  // ================== Events ==================
  function bindActorEvents() {
    const section = document.querySelector("#tblActors")?.closest(".card");
    if (!section) return;

    // Click trong vùng riêng của Diễn viên
    section.addEventListener("click", (e) => {
      e.stopPropagation();

      const addBtn = e.target.closest("#btnAddActor");
      const editBtn = e.target.closest(".btn-edit");
      const delBtn = e.target.closest(".btn-del");

      // ➕ Thêm mới
      if (addBtn) {
        e.preventDefault();
        $("#Actor_id").val("");
        $("#Actor_name").val("");
        $("#Actor_gender").val("Nam"); // mặc định là Nam
        $("#Actor_avatar").val("");
        $("#previewActorAvatar").hide();
        $("#actorModal").modal("show");
        return;
      }

      // ✏️ Sửa
      if (editBtn) {
        e.preventDefault();
        $("#Actor_id").val(editBtn.dataset.id);
        $("#Actor_name").val(editBtn.dataset.name);
        $("#Actor_gender").val(editBtn.dataset.gender || "Nam");
        $("#Actor_avatar").val(editBtn.dataset.avatar);
        if (editBtn.dataset.avatar?.startsWith("http"))
          $("#previewActorAvatar").attr("src", editBtn.dataset.avatar).show();
        else $("#previewActorAvatar").hide();
        $("#actorModal").modal("show");
        return;
      }

      // ❌ Xóa
      if (delBtn) {
        e.preventDefault();
        const id = delBtn.dataset.id;
        if (confirm("Xóa diễn viên này?")) {
          apiActorDelete(id)
            .then(() => reloadActorList())
            .catch(() => alert("Xóa không thành công"));
        }
      }
    });

    // Form Submit
    const form = document.getElementById("actorForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const id = $("#Actor_id").val();
        const name = $("#Actor_name").val().trim();
        const gender = $("#Actor_gender").val();
        const avatar = $("#Actor_avatar").val().trim();

        if (!name) return alert("Vui lòng nhập tên diễn viên");

        try {
          if (id)
            await apiActorUpdate(id, {
              actor_name: name,
              actor_gender: gender,
              actor_avatar: avatar,
            });
          else
            await apiActorCreate({
              actor_name: name,
              actor_gender: gender,
              actor_avatar: avatar,
            });

          $("#actorModal").modal("hide");
          reloadActorList();
        } catch (err) {
          console.error("❌ Lỗi lưu diễn viên:", err);
          alert("Lưu không thành công");
        }
      });
    }
  }
})();

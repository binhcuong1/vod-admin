(() => {
  // ================== Boot / SPA-lite ==================
  const bootPosterType = () =>
    (window.PageInits && typeof window.PageInits.postertypes === 'function')
      ? window.PageInits.postertypes()
      : initPosterTypesPage();

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tblPosterTypes')) bootPosterType();
  });

  window.PageInits = window.PageInits || {};
  window.PageInits.postertypes = initPosterTypesPage;

  // ================== Config axios ==================
  function setupAxios() {
    const base = window.API_BASE || 'http://localhost:3000';
    axios.defaults.baseURL = base;
    axios.defaults.headers.common['Content-Type'] = 'application/json';
  }

  // ================== Render Table ==================
  function renderRows(types) {
    const tbody = document.querySelector('#tblPosterTypes tbody');
    if (!tbody) return;

    tbody.innerHTML = (types || []).map(t => `
      <tr>
        <td>${t.Postertype_id}</td>
        <td>${t.Postertype_name}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-info btn-edit" 
                  data-id="${t.Postertype_id}" 
                  data-name="${t.Postertype_name}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-del" data-id="${t.Postertype_id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  // ================== API ==================
  const POSTERTYPE_PATH = () => '/api/postertypes';

  async function apiList() {
    const res = await axios.get(POSTERTYPE_PATH());
    return res.data?.data || res.data || []; 
  }

  async function apiCreate(payload) {
    const res = await axios.post(POSTERTYPE_PATH(), payload);
    return res.data;
  }

  async function apiUpdate(id, payload) {
    const res = await axios.put(`${POSTERTYPE_PATH()}/${id}`, payload);
    return res.data;
  }

  async function apiDelete(id) {
    const res = await axios.delete(`${POSTERTYPE_PATH()}/${id}`);
    return res.data;
  }

  // ================== Page Init ==================
  function initPosterTypesPage() {
    setupAxios();
    bindEvents();
    reloadPosterTypes();
  }

  async function reloadPosterTypes() {
    try {
      const rows = await apiList();
      renderRows(rows);
    } catch (err) {
      console.error('Lỗi tải loại poster:', err);
      alert('Không tải được danh sách loại poster');
    }
  }

  // ================== Events ==================
  function bindEvents() {
  // 🔹 Giới hạn vùng sự kiện chỉ trong phần Loại Poster
  const section = document.querySelector('#tblPosterTypes')?.closest('.card');
  if (!section) return;

  section.removeEventListener('click', onAddClick);
  section.addEventListener('click', onAddClick);

  section.removeEventListener('click', onRowButtons);
  section.addEventListener('click', onRowButtons);

  const form = document.getElementById('posterTypeForm');
  if (form) {
    form.removeEventListener('submit', onSubmitForm);
    form.addEventListener('submit', onSubmitForm);
  }
}


  function onAddClick(e) {
    const btn = e.target.closest('#btnAdd');
    if (!btn) return;
    e.preventDefault();
    $('#PosterType_id').val('');
    $('#PosterType_name').val('');
    $('#posterTypeModal').modal('show');
  }

  function onRowButtons(e) {
    const editBtn = e.target.closest('.btn-edit');
    const delBtn = e.target.closest('.btn-del');

    if (editBtn) {
      e.preventDefault();
      const id = editBtn.dataset.id;
      const name = editBtn.dataset.name;
      $('#PosterType_id').val(id);
      $('#PosterType_name').val(name);
      $('#posterTypeModal').modal('show');
      return;
    }

    if (delBtn) {
      e.preventDefault();
      const id = delBtn.dataset.id;
      if (confirm('Xóa loại poster này?')) {
        apiDelete(id)
          .then(() => reloadPosterTypes())
          .catch(err => {
            console.error(err);
            alert('Xóa không thành công');
          });
      }
    }
  }

  async function onSubmitForm(e) {
    e.preventDefault();
    const id = $('#PosterType_id').val();
    const name = ($('#PosterType_name').val() || '').trim();
    if (!name) return alert('Vui lòng nhập tên loại poster');

    try {
      
      if (id) await apiUpdate(id, { postertype_name: name });
      else await apiCreate({ postertype_name: name });

      $('#posterTypeModal').modal('hide');
      reloadPosterTypes();
    } catch (err) {
      console.error('Lỗi lưu loại poster:', err);
      alert('Lưu không thành công');
    }
  }
})();

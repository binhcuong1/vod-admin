(() => {
// ================== Boot / SPA-lite ==================
const bootResolution = () => (window.PageInits && typeof window.PageInits.resolutions === 'function')
  ? window.PageInits.resolutions()
  : initResolutionsPage();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tblResolutions')) bootResolution();
});

window.PageInits = window.PageInits || {};
window.PageInits.resolutions = initResolutionsPage;

// ================== Config axios ==================
function setupAxios() {
  const base = window.API_BASE || 'http://127.0.0.1:3000';
  axios.defaults.baseURL = base;
  axios.defaults.headers.common['Content-Type'] = 'application/json';
}

// ================== Render ==================
function renderRows(list) {
  const tbody = document.querySelector('#tblResolutions tbody');
  tbody.innerHTML = (list || []).map(r => {
    const id = r.Resolution_id || r.resolution_id;
    const name = r.Resolution_type || r.resolution_type;
    return `
      <tr>
        <td>${id}</td>
        <td>${name}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-info btn-edit" data-id="${id}" data-name="${name}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-del" data-id="${id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}


// ================== API ==================
const Resolution_PATH = () => '/api/resolutions';

async function apiList() {
  const res = await axios.get(Resolution_PATH() + '/');
  return res.data?.data || [];
}

async function apiCreate(payload) {
  return await axios.post(Resolution_PATH() + '/', payload);
}

async function apiUpdate(id, payload) {
  return await axios.put(`${Resolution_PATH()}/${id}`, payload);
}

async function apiDelete(id) {
  return await axios.delete(`${Resolution_PATH()}/${id}`);
}

// ================== Page Init ==================
function initResolutionsPage() {
  setupAxios();
  bindEvents();
  reloadResolutions();
}

async function reloadResolutions() {
  try {
    const rows = await apiList();
    renderRows(rows);
  } catch (err) {
    console.error('Lỗi tải độ phân giải:', err);
    alert('Không tải được danh sách độ phân giải');
  }
}

// ================== Events ==================
function bindEvents() {
  const section = document.querySelector('#tblResolutions')?.closest('.card');
  if (!section) return;

  section.removeEventListener('click', onAddClick);
  section.addEventListener('click', onAddClick);

  section.removeEventListener('click', onRowButtons);
  section.addEventListener('click', onRowButtons);

  const form = document.getElementById('resolutionForm');
  if (form) {
    form.removeEventListener('submit', onSubmitForm);
    form.addEventListener('submit', onSubmitForm);
  }
}

function onAddClick(e) {
  const btn = e.target.closest('#btnAdd');
  if (!btn) return;
  e.preventDefault();
  $('#Resolution_id').val('');
  $('#Resolution_type').val('');
  $('#resolutionModal').modal('show');
}

function onRowButtons(e) {
  const editBtn = e.target.closest('.btn-edit');
  const delBtn = e.target.closest('.btn-del');

  if (editBtn) {
    e.preventDefault();
    const id = editBtn.dataset.id;
    const name = editBtn.dataset.name;
    $('#Resolution_id').val(id);
    $('#Resolution_type').val(name);
    $('#resolutionModal').modal('show');
    return;
  }

  if (delBtn) {
    e.preventDefault();
    const id = delBtn.dataset.id;
    if (confirm('Xóa độ phân giải này?')) {
      apiDelete(id).then(() => reloadResolutions()).catch(err => {
        console.error(err);
        alert('Xóa không thành công');
      });
    }
  }
}

async function onSubmitForm(e) {
  e.preventDefault();
  const id = $('#Resolution_id').val();
  const name = ($('#Resolution_type').val() || '').trim();
  if (!name) return alert('Vui lòng nhập độ phân giải');

  try {
    if (id) await apiUpdate(id, { resolution_type: name });
    else await apiCreate({ resolution_type: name });

    $('#resolutionModal').modal('hide');
    reloadResolutions();
  } catch (err) {
    console.error('Lỗi lưu độ phân giải:', err);
    alert('Lưu không thành công');
  }
}
})();
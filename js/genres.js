// Cho phép dùng cả khi load trang rời hoặc trong SPA-lite
const boot = () => (window.PageInits && typeof window.PageInits.genres === 'function')
    ? window.PageInits.genres()
    : initGenresPage();

// Nếu chạy đa trang (mở trực tiếp genres.html), auto init khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Nếu vùng bảng tồn tại => coi như đang ở trang genres.html độc lập
    if (document.getElementById('tblGenres')) boot();
});

// Đăng ký init cho SPA-lite
window.PageInits = window.PageInits || {};
window.PageInits.genres = initGenresPage;

// ================== Config axios ==================
function setupAxios() {
    const base = window.API_BASE || 'http://127.0.0.1:3000';
    axios.defaults.baseURL = base;
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    // Nếu cần cookie phiên:
    // axios.defaults.withCredentials = true;
}

// ================== Selectors dùng chung ==================
function $el(sel) { return document.querySelector(sel); }
function $els(sel) { return Array.from(document.querySelectorAll(sel)); }

// ================== Render Helpers ==================
function renderRows(genres) {
    const tbody = $el('#tblGenres tbody');
    tbody.innerHTML = (genres || []).map(g => `
      <tr>
        <td>${g.Genre_id}</td>
        <td>${g.Genre_name}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-info btn-edit"
                  data-id="${g.Genre_id}"
                  data-name="${escapeHtml(g.Genre_name || '')}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-del" data-id="${g.Genre_id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
    // khởi tạo / refresh DataTable (nếu có)
    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.DataTable) {
        const $tbl = window.jQuery('#tblGenres');
        if (window.jQuery.fn.DataTable.isDataTable($tbl)) {
            $tbl.DataTable().destroy();
        }
        $tbl.DataTable();
    }
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ================== API Calls ==================
const PATH = () => window.API_GENRE || '/api/genre';

async function apiList() {
    // backend của bạn: GET '/' trả toàn bộ
    const res = await axios.get(PATH() + '/');
    return res.data?.data || res.data || [];
}

async function apiSearch(keyword) {
    const res = await axios.get(PATH() + '/search', { params: { q: keyword || '' } });
    return res.data?.data || res.data || [];
}

async function apiCreate(payload) {
    const res = await axios.post(PATH() + '/', payload);
    return res.data;
}

async function apiUpdate(id, payload) {
    const res = await axios.put(`${PATH()}/${id}`, payload);
    return res.data;
}

async function apiDelete(id) {
    const res = await axios.delete(`${PATH()}/${id}`);
    return res.data;
}

// ================== Page Init ==================
function initGenresPage() {
    setupAxios();
    bindEvents();
    reload();
}

async function reload(keyword = '') {
    try {
        const rows = keyword ? await apiSearch(keyword) : await apiList();
        renderRows(rows);
    } catch (err) {
        console.error('Lỗi tải thể loại:', err);
        alert('Không tải được danh sách thể loại');
    }
}

// ================== Event Binding ==================
function bindEvents() {
    //  Giới hạn vùng chỉ trong phần Quản lý thể loại
    const section = document.querySelector('#tblGenres')?.closest('.card');
    if (!section) return;
    // Thêm mới
    document.removeEventListener('click', onAddClick);
    document.addEventListener('click', onAddClick);

    // Sửa & Xóa (event delegation)
    document.removeEventListener('click', onRowButtons);
    document.addEventListener('click', onRowButtons);

    // Submit modal
    const form = document.getElementById('genreForm');
    if (form) {
        form.removeEventListener('submit', onSubmitForm);
        form.addEventListener('submit', onSubmitForm);
    }
}

function onAddClick(e) {
    const btn = e.target.closest('#btnAdd');
    if (!btn) return;
    e.preventDefault();
    $('#Genre_id').val('');
    $('#Genre_name').val('');
    $('#genreModal').modal('show');
}

function onRowButtons(e) {
    const editBtn = e.target.closest('.btn-edit');
    const delBtn = e.target.closest('.btn-del');

    if (editBtn) {
        e.preventDefault();
        const id = editBtn.dataset.id;
        const name = editBtn.dataset.name || '';
        $('#Genre_id').val(id);
        $('#Genre_name').val(name);
        $('#genreModal').modal('show');
        return;
    }

    if (delBtn) {
        e.preventDefault();
        const id = delBtn.dataset.id;
        if (confirm('Xóa thể loại này?')) {
            apiDelete(id).then(() => reload()).catch(err => {
                console.error(err); alert('Xóa không thành công');
            });
        }
        return;
    }
}

function onSearchInput(e) {
    const kw = e.target.value.trim();
    reload(kw);
}

async function onSubmitForm(e) {
    e.preventDefault();
    const id = $('#Genre_id').val();
    const name = ($('#Genre_name').val() || '').trim();
    if (!name) return alert('Vui lòng nhập tên thể loại');

    try {
        if (id) await apiUpdate(id, { genre_name: name });
        else await apiCreate({ genre_name: name });

        $('#genreModal').modal('hide');
        reload();
    } catch (err) {
        console.error('Lỗi lưu thể loại:', err);
        alert('Lưu không thành công');
    }
}
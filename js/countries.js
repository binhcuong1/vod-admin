(() => {
// ================== Boot / SPA-lite ==================
const bootCountry = () => (window.PageInits && typeof window.PageInits.countries === 'function')
    ? window.PageInits.countries()
    : initCountriesPage();

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tblCountries')) bootCountry();
});

window.PageInits = window.PageInits || {};
window.PageInits.countries = initCountriesPage;

// ================== Config axios ==================
function setupAxios() {
    const base = window.API_BASE || 'http://localhost:3000';
    axios.defaults.baseURL = base;
    axios.defaults.headers.common['Content-Type'] = 'application/json';
}

// ================== Helpers ==================
function $el(sel) { return document.querySelector(sel); }
function $els(sel) { return Array.from(document.querySelectorAll(sel)); }

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

// ================== Render Table ==================
function renderRows(countries) {
    const tbody = $el('#tblCountries tbody');
    tbody.innerHTML = (countries || []).map(c => `
      <tr>
        <td>${c.Country_id}</td>
        <td>${escapeHtml(c.Country_name || '')}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-info btn-edit"
                  data-id="${c.Country_id}"
                  data-name="${escapeHtml(c.Country_name || '')}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-del" data-id="${c.Country_id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.DataTable) {
        const $tbl = window.jQuery('#tblCountries');
        if (window.jQuery.fn.DataTable.isDataTable($tbl)) {
            $tbl.DataTable().destroy();
        }
        $tbl.DataTable();
    }
}

// ================== API Calls ==================
const Country_PATH = () => window.API_COUNTRY || '/api/countries';

async function apiList() {
    const res = await axios.get(Country_PATH() + '/');
    return res.data?.data || res.data || [];
}

async function apiSearch(keyword) {
    const res = await axios.get(Country_PATH() + '/search', { params: { q: keyword || '' } });
    return res.data?.data || res.data || [];
}

async function apiCreate(payload) {
    const res = await axios.post(Country_PATH() + '/', payload);
    return res.data;
}

async function apiUpdate(id, payload) {
    const res = await axios.put(`${Country_PATH()}/${id}`, payload);
    return res.data;
}

async function apiDelete(id) {
    const res = await axios.delete(`${Country_PATH()}/${id}`);
    return res.data;
}

// ================== Page Init ==================
function initCountriesPage() {
    setupAxios();
    bindEvents();
    reload();
}

async function reload(keyword = '') {
    try {
        const rows = keyword ? await apiSearch(keyword) : await apiList();
        renderRows(rows);
    } catch (err) {
        console.error('Lỗi tải quốc gia:', err);
        alert('Không tải được danh sách quốc gia');
    }
}

// ================== Event Binding ==================
function bindEvents() {
    const section = document.querySelector('#tblCountries')?.closest('.card');
    if (!section) return;

    // Chỉ bắt sự kiện click trong phần này
    section.removeEventListener('click', onAddClick);
    section.addEventListener('click', onAddClick);

    section.removeEventListener('click', onRowButtons);
    section.addEventListener('click', onRowButtons);

    const form = document.getElementById('countryForm');
    if (form) {
        form.removeEventListener('submit', onSubmitForm);
        form.addEventListener('submit', onSubmitForm);
    }
}


function onAddClick(e) {
    const btn = e.target.closest('#btnAdd');
    if (!btn) return;
    e.preventDefault();
    $('#Country_id').val('');
    $('#Country_name').val('');
    $('#countryModal').modal('show');
}

function onRowButtons(e) {
    const editBtn = e.target.closest('.btn-edit');
    const delBtn = e.target.closest('.btn-del');

    if (editBtn) {
        e.preventDefault();
        const id = editBtn.dataset.id;
        const name = editBtn.dataset.name || '';
        $('#Country_id').val(id);
        $('#Country_name').val(name);
        $('#countryModal').modal('show');
        return;
    }

    if (delBtn) {
        e.preventDefault();
        const id = delBtn.dataset.id;
        if (confirm('Xóa quốc gia này?')) {
            apiDelete(id).then(() => reload()).catch(err => {
                console.error(err); alert('Xóa không thành công');
            });
        }
        return;
    }
}

async function onSubmitForm(e) {
    e.preventDefault();
    const id = $('#Country_id').val();
    const name = ($('#Country_name').val() || '').trim();
    if (!name) return alert('Vui lòng nhập tên quốc gia');

    try {
        if (id) await apiUpdate(id, { country_name: name });
        else await apiCreate({ country_name: name });

        $('#countryModal').modal('hide');
        reload();
    } catch (err) {
        console.error('Lỗi lưu quốc gia:', err);
        alert('Lưu không thành công');
    }
}
})();

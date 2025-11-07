// movies.js (FINAL standalone) — VOD Admin
// - Single modal for Movie + optional Seasons/Episodes
// - Aligned with movies.html fields (no Original_name)
// - Requires axios + (optional) jQuery for Bootstrap modal + (optional) DataTables

(() => {
    // ===== Basic DOM helpers =====
    const qs = (sel, root = document) => root.querySelector(sel);
    const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    // ===== Config / Endpoints =====
    const API_BASE = window.API_BASE || "http://localhost:3000";
    const FILMS = () => `${API_BASE}/api/films`;
    const FILM = (id) => `${API_BASE}/api/films/${id}`;
    const GENRES = () => `${API_BASE}/api/genres`;
    const COUNTRIES = () => `${API_BASE}/api/countries`;
    const PEOPLE = (role) => `${API_BASE}/api/people?role=${encodeURIComponent(role || '')}`; // actor|director

    // Seasons/Episodes (optional)
    const SEASONS = (movieId) => `${API_BASE}/api/movies/${movieId}/seasons`;
    const EPISODES = (seasonId) => `${API_BASE}/api/seasons/${seasonId}/episodes`;

    // ===== Utils =====
    const esc = (s) => String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', '&quot;')
        .replaceAll("'", "&#39;");
    const yesNo = (b) => b ? 'Yes' : 'No';

    function fillSelect(el, rows, getOpt) { el.innerHTML = rows.map(getOpt).join(''); }
    function getMultiValues(sel) {
        return sel?.selectedOptions ? Array.from(sel.selectedOptions).map(o => o.value) : [];
    }
    function selectValues(sel, arr) { const el = qs(sel); if (!el) return; const set = new Set((arr || []).map(String)); Array.from(el.options).forEach(o => o.selected = set.has(String(o.value))); }

    // ===== API =====
    async function mvList() { const r = await axios.get(FILMS()); return r.data?.data ?? r.data ?? []; }
    async function mvGet(id) { const r = await axios.get(FILM(id)); return r.data?.data ?? r.data; }
    async function mvCreate(p) { const r = await axios.post(FILMS(), p); return r.data; }
    async function mvUpdate(id, p) { const r = await axios.put(FILM(id), p); return r.data; }
    async function mvDelete(id) { const r = await axios.delete(FILM(id)); return r.data; }

    async function loadGenres() { const r = await axios.get(GENRES()); return r.data?.data ?? r.data ?? []; }
    async function loadCountries() { const r = await axios.get(COUNTRIES()); return r.data?.data ?? r.data ?? []; }
    async function loadActors() { const r = await axios.get(PEOPLE('actor')); return r.data?.data ?? r.data ?? []; }
    async function loadDirectors() { const r = await axios.get(PEOPLE('director')); return r.data?.data ?? r.data ?? []; }

    // Seasons/Episodes
    async function seList(mid) { const r = await axios.get(SEASONS(mid)); return r.data?.data ?? r.data ?? []; }
    async function seCreate(mid, p) { const r = await axios.post(SEASONS(mid), p); return r.data; }
    async function epList(sid) { const r = await axios.get(EPISODES(sid)); return r.data?.data ?? r.data ?? []; }
    async function epCreate(sid, p) { const r = await axios.post(EPISODES(sid), p); return r.data; }
    async function epUpdate(eid, p) { const r = await axios.put(`${API_BASE}/api/episodes/${eid}`, p); return r.data; }
    async function epDelete(eid) { const r = await axios.delete(`${API_BASE}/api/episodes/${eid}`); return r.data; }

    // ===== Render Table =====
    function renderMovieRows(rows) {
        const table = document.getElementById('tblMovies'); if (!table) return;
        const tb = table.tBodies[0] || table.createTBody();
        tb.innerHTML = (rows || []).map(m => {
            const id = m.id ?? m.Film_id ?? '';
            const name = m.name ?? m.Film_name ?? '';
            const year = m.year ?? m.Release_year ?? '';
            const duration = m.duration ?? m.Duration ?? '';
            const isSeries = !!(m.isSeries ?? m.is_series);
            const active = !!(m.active ?? (m.is_deleted !== undefined ? !m.is_deleted : true));
            return `
        <tr>
          <td>${id}</td>
          <td>${esc(name)}</td>
          <td class="text-center">${year ?? ''}</td>
          <td class="text-center">${duration ? (duration + 'p') : ''}</td>
          <td class="text-center">${isSeries ? 'Yes' : 'No'}</td>
          <td class="text-center">${active ? 'Yes' : 'No'}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-info btn-edit-mv" data-id="${id}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger btn-del-mv" data-id="${id}"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
        }).join('');

        // rebind
        qsa('.btn-edit-mv').forEach(b => b.onclick = () => openEdit(b.dataset.id));
        qsa('.btn-del-mv').forEach(b => b.onclick = async () => {
            if (!confirm('Xoá phim này?')) return;
            await mvDelete(b.dataset.id);
            await reloadMovies();
        });

        if (window.jQuery?.fn?.DataTable) {
            const $tbl = window.jQuery('#tblMovies');
            if (window.jQuery.fn.DataTable.isDataTable('#tblMovies')) $tbl.DataTable().clear().destroy();
            setTimeout(() => $tbl.DataTable(), 0);
        }
    }

    // ===== Modal helpers =====
    function clearMovieForm() {
        const ids = ['Movie_id', 'Movie_name', 'Slug', 'Overview', 'Release_year', 'Duration', 'Poster_url', 'Backdrop_url', 'Trailer_url', 'Language'];
        ids.forEach(i => { const el = qs('#' + i); if (el) el.value = ''; });
        const selIds = ['Country_id', 'Genre_ids', 'Cast_ids', 'Director_ids'];
        selIds.forEach(i => { const el = qs('#' + i); if (el) { el.selectedIndex = -1; if (el.multiple) Array.from(el.options).forEach(o => o.selected = false); } });
        const isSeries = qs('#Is_series'); if (isSeries) isSeries.checked = false;
        const isActive = qs('#Is_active'); if (isActive) isActive.checked = true;
        const seriesBlock = qs('#seriesBlock'); if (seriesBlock) seriesBlock.style.display = 'none';
    }

    function fillForm(m) {
        qs('#Movie_id').value = m.id ?? m.Film_id ?? '';
        qs('#Movie_name').value = m.name ?? m.Film_name ?? '';
        qs('#Slug').value = m.slug ?? '';
        qs('#Overview').value = m.overview ?? m.description ?? '';
        qs('#Release_year').value = m.year ?? m.Release_year ?? '';
        qs('#Duration').value = m.duration ?? m.Duration ?? '';
        qs('#Poster_url').value = m.poster_url ?? '';
        qs('#Backdrop_url').value = m.backdrop_url ?? '';
        qs('#Trailer_url').value = m.trailer_url ?? '';
        qs('#Language').value = m.language ?? '';
        qs('#Is_series').checked = !!(m.isSeries ?? m.is_series);
        qs('#Is_active').checked = !!(m.active ?? (m.is_deleted !== undefined ? !m.is_deleted : true));
        if (m.country_id && qs('#Country_id')) qs('#Country_id').value = String(m.country_id);
        if (Array.isArray(m.genre_ids)) selectValues('#Genre_ids', m.genre_ids);
        if (Array.isArray(m.cast_ids)) selectValues('#Cast_ids', m.cast_ids);
        if (Array.isArray(m.director_ids)) selectValues('#Director_ids', m.director_ids);
    }

    function toggleSeries(show) { const blk = qs('#seriesBlock'); if (blk) blk.style.display = show ? '' : 'none'; }

    // ===== Open modal =====
    async function openAdd() { clearMovieForm(); toggleSeries(false); if (window.jQuery) window.jQuery('#movieModal').modal('show'); else qs('#movieModal')?.classList.remove('d-none'); }
    async function openEdit(id) { clearMovieForm(); const m = await mvGet(id); fillForm(m); toggleSeries(qs('#Is_series').checked); if (window.jQuery) window.jQuery('#movieModal').modal('show'); else qs('#movieModal')?.classList.remove('d-none'); }

    // ===== Submit =====
    async function onSubmit(e) {
        e.preventDefault();

        const id = qs('#Movie_id')?.value?.trim() || '';
        const film_name = qs('#Movie_name')?.value?.trim() || '';
        if (!film_name) return alert('Tên phim là bắt buộc');

        const isSeries = !!qs('#Is_series')?.checked;

        const payload = {
            film_name,
            is_series: isSeries,
            film_info: {
                original_name: qs('#Original_name')?.value?.trim() || null,
                description: qs('#Overview')?.value?.trim() || null,
                release_year: qs('#Release_year')?.value ? Number(qs('#Release_year').value) : null,
                duration: qs('#Duration')?.value ? Number(qs('#Duration').value) : null,
                country_id: qs('#Country_id')?.value ? Number(qs('#Country_id').value) : null,
                maturity_rating: qs('#Maturity_rating')?.value || null,
                film_status: qs('#Film_status')?.value || null,   // "đang chiếu" | "hoàn thành" | "sắp chiếu"
                trailer_url: qs('#Trailer_url')?.value?.trim() || null,
                // nếu đang là series và sau này có input riêng cho tiến độ/tổng tập thì đọc vào; hiện tại để 0
                process_episode: 0,
                total_episode: 0,
            }
        };

        // Chỉ thêm các mảng nếu trên form có control (tránh lỗi khi bạn chưa dùng):
        const gEl = qs('#Genre_ids');
        if (gEl) payload.genre_ids = getMultiValues(gEl).map(Number);

        const cEl = qs('#Cast_ids');
        if (cEl) payload.cast_ids = getMultiValues(cEl).map(Number);

        // posters/sources: chưa có UI trong modal này, để trống; khi bạn thêm input riêng thì push vào payload

        try {
            if (id) await mvUpdate(id, payload);
            else await mvCreate(payload);

            if (window.jQuery) window.jQuery('#movieModal').modal('hide');
            else qs('#movieModal')?.classList.add('d-none');

            await reloadMovies();
        } catch (err) {
            console.error('[movies] create/update failed:', err);
            alert('Lưu phim thất bại. Mở Console để xem chi tiết lỗi.');
        }
    }


    // ===== Seasons UI =====
    function renderSeasonOptions(seasons) {
        const sel = qs('#seasonList'); if (!sel) return;
        sel.innerHTML = (seasons || []).map(s => `<option value="${s.id}">${esc(s.name || ('Season ' + s.number))}</option>`).join('');
        const btnEp = qs('#btnAddEpisode'); if (btnEp) btnEp.disabled = !sel.value;
    }
    function renderEpisodes(episodes) {
        const tb = qs('#episodeBody'); if (!tb) return;
        tb.innerHTML = (episodes || []).map((e, i) => `
      <tr>
        <td class="text-center">${e.number ?? (i + 1)}</td>
        <td>${esc(e.title || '')}</td>
        <td class="text-center">${e.duration ? (e.duration + 'p') : ''}</td>
        <td class="text-center">
          <button class="btn btn-xs btn-info btn-edit-ep" data-ep="${e.id}"><i class="fas fa-edit"></i></button>
          <button class="btn btn-xs btn-danger btn-del-ep" data-ep="${e.id}"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('');
        qsa('.btn-del-ep').forEach(btn => btn.onclick = async () => { if (!confirm('Xoá tập này?')) return; await epDelete(btn.dataset.ep); const sid = qs('#seasonList')?.value; if (sid) { const eps = await epList(sid); renderEpisodes(eps); } });
        qsa('.btn-edit-ep').forEach(btn => btn.onclick = async () => { const ep = btn.dataset.ep; const title = prompt('Tên tập mới:'); if (title == null) return; const d = prompt('Thời lượng (phút):'); await epUpdate(ep, { title, duration: d ? Number(d) : null }); const sid = qs('#seasonList')?.value; if (sid) { const eps = await epList(sid); renderEpisodes(eps); } });
    }

    // ===== Page wiring =====
    async function bindLookups() {
        try {
            const sel = qs('#Country_id');
            if (!sel) { console.warn('[movies] #Country_id not found'); return; }

            const raw = await loadCountries();                 // API: /api/countries

            // Chuẩn hoá key: id/name ⇆ Country_id/Country_name ⇆ country_id/country_name...
            const countries = (Array.isArray(raw) ? raw : []).map(c => ({
                id: c.id ?? c.Country_id ?? c.country_id ?? c.code ?? c.value,
                name: c.name ?? c.Country_name ?? c.country_name ?? c.label ?? c.text
            })).filter(x => x.id != null && x.name);

            // Render: có placeholder trên cùng
            const opts = countries.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
            sel.innerHTML = `<option value="">— Chọn —</option>` + opts;
            sel.value = ""; // hiện placeholder
        } catch (err) {
            console.error('[movies] bindLookups() failed:', err);
            alert('Không tải được danh sách quốc gia.');
        }
    }

    async function reloadMovies() {
        const rows = await mvList();
        renderMovieRows(rows);
    }

    function wirePage() {
        const addBtn = qs('#btnAddMovie'); if (addBtn) addBtn.onclick = (e) => { e.preventDefault(); openAdd(); };
        const form = qs('#movieForm'); if (form) form.onsubmit = onSubmit;
        const isSeriesCb = qs('#Is_series'); if (isSeriesCb) isSeriesCb.onchange = (e) => toggleSeries(e.target.checked);

        // seasons events
        const seasonList = qs('#seasonList'); if (seasonList) { seasonList.onchange = async (e) => { const sid = e.target.value; const btnEp = qs('#btnAddEpisode'); if (btnEp) btnEp.disabled = !sid; if (!sid) return renderEpisodes([]); const eps = await epList(sid); renderEpisodes(eps); }; }
        const btnAddSeason = qs('#btnAddSeason'); if (btnAddSeason) { btnAddSeason.onclick = async () => { const mid = qs('#Movie_id')?.value; if (!mid) return alert('Hãy lưu phim trước rồi mới tạo mùa.'); const name = prompt('Tên mùa (ví dụ: Season 1):', ''); if (!name) return; await seCreate(mid, { name }); const seasons = await seList(mid); renderSeasonOptions(seasons); const sid = qs('#seasonList')?.value; if (sid) { const eps = await epList(sid); renderEpisodes(eps); } }; }
        const btnAddEpisode = qs('#btnAddEpisode'); if (btnAddEpisode) { btnAddEpisode.onclick = async () => { const sid = qs('#seasonList')?.value; if (!sid) return alert('Chọn một mùa trước.'); const title = prompt('Tên tập:', ''); if (!title) return; const d = Number(prompt('Thời lượng (phút):', '')) || null; await epCreate(sid, { title, duration: d }); const eps = await epList(sid); renderEpisodes(eps); }; }
    }

    async function init() {
        wirePage();
        await bindLookups();
        await reloadMovies();
    }

    // Router will call this after injecting movies.html
    window.PageInits = window.PageInits || {}; window.PageInits.movies = init;
})();

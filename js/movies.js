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
    const ACTORS = () => `${API_BASE}/api/actors`;
    const PEOPLE = (role) =>
        `${API_BASE}/api/people?role=${encodeURIComponent(role || "")}`; // actor|director

    const ACTOR_SEARCH = (kw) => `${API_BASE}/api/actors/search?keyword=${encodeURIComponent(kw || '')}`;

    // Seasons/Episodes (optional)
    const SEASONS = (movieId) => `${API_BASE}/api/movies/${movieId}/seasons`;
    const EPISODES = (seasonId) => `${API_BASE}/api/seasons/${seasonId}/episodes`;

    // ===== Utils =====
    const esc = (s) =>
        String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    const yesNo = (b) => (b ? "Yes" : "No");

    function debounce(fn, wait = 300) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(null, args), wait);
        };
    }


    function fillSelect(el, rows, getOpt) {
        el.innerHTML = rows.map(getOpt).join("");
    }
    function getMultiValues(sel) {
        return sel?.selectedOptions
            ? Array.from(sel.selectedOptions).map((o) => o.value)
            : [];
    }
    function selectValues(sel, arr) {
        const el = qs(sel);
        if (!el) return;
        const set = new Set((arr || []).map(String));
        Array.from(el.options).forEach(
            (o) => (o.selected = set.has(String(o.value)))
        );
    }

    // ===== API =====
    async function mvList() {
        const r = await axios.get(FILMS());
        return r.data?.data ?? r.data ?? [];
    }
    async function mvGet(id) {
        const r = await axios.get(FILM(id));
        return r.data?.data ?? r.data;
    }
    async function mvCreate(p) {
        const r = await axios.post(FILMS(), p);
        return r.data;
    }
    async function mvUpdate(id, p) {
        const r = await axios.put(FILM(id), p);
        return r.data;
    }
    async function mvDelete(id) {
        const r = await axios.delete(FILM(id));
        return r.data;
    }

    async function loadGenres() {
        const r = await axios.get(GENRES());
        return r.data?.data ?? r.data ?? [];
    }
    async function loadCountries() {
        const r = await axios.get(COUNTRIES());
        return r.data?.data ?? r.data ?? [];
    }
    async function loadActors() {
        const url = ACTORS();
        const r = await axios.get(url);
        return r.data?.data ?? r.data ?? [];
    }
    async function loadDirectors() {
        const r = await axios.get(PEOPLE("director"));
        return r.data?.data ?? r.data ?? [];
    }

    async function searchActors(keyword) {
        const url = ACTOR_SEARCH(keyword || '');
        const r = await axios.get(url);
        return r.data?.data ?? r.data ?? [];
    }

    // Seasons/Episodes
    async function seList(mid) {
        const r = await axios.get(SEASONS(mid));
        return r.data?.data ?? r.data ?? [];
    }
    async function seCreate(mid, p) {
        const r = await axios.post(SEASONS(mid), p);
        return r.data;
    }
    async function epList(sid) {
        const r = await axios.get(EPISODES(sid));
        return r.data?.data ?? r.data ?? [];
    }
    async function epCreate(sid, p) {
        const r = await axios.post(EPISODES(sid), p);
        return r.data;
    }
    async function epUpdate(eid, p) {
        const r = await axios.put(`${API_BASE}/api/episodes/${eid}`, p);
        return r.data;
    }
    async function epDelete(eid) {
        const r = await axios.delete(`${API_BASE}/api/episodes/${eid}`);
        return r.data;
    }

    // ===== Render Table =====
    function renderMovieRows(rows) {
        const table = document.getElementById("tblMovies");
        if (!table) return;

        // Destroy DataTable trước để tránh lỗi reinit
        if (
            window.jQuery?.fn?.DataTable &&
            window.jQuery.fn.DataTable.isDataTable("#tblMovies")
        ) {
            window.jQuery("#tblMovies").DataTable().clear().destroy();
        }

        const tb = table.tBodies[0] || table.createTBody();
        tb.innerHTML = (rows || [])
            .map((m) => {
                const id = m.id ?? m.Film_id ?? "";
                const name = m.name ?? m.Film_name ?? "";
                const year = m.year ?? m.Release_year ?? "";
                const duration = m.duration ?? m.Duration ?? "";
                const isSeries = !!(m.isSeries ?? m.is_series);
                const active = !!(
                    m.active ?? (m.is_deleted !== undefined ? !m.is_deleted : true)
                );

                return `
      <tr>
        <td>${id}</td>
        <td>${esc(name)}</td>
        <td class="text-center">${year || ""}</td>
        <td class="text-center">${duration ? duration + "p" : ""}</td>
        <td class="text-center">${isSeries ? "Yes" : "No"}</td>
        <td class="text-center">${active ? "Yes" : "No"}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-secondary btn-view-mv" data-id="${id}" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-info btn-edit-mv" data-id="${id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-del-mv" data-id="${id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
            })
            .join("");

        tb.querySelectorAll(".btn-view-mv").forEach(
            (b) => (b.onclick = () => openView(b.dataset.id))
        );

        // Rebind trong phạm vi tbody cho gọn
        tb.querySelectorAll(".btn-edit-mv").forEach(
            (b) => (b.onclick = () => openEdit(b.dataset.id))
        );
        tb.querySelectorAll(".btn-del-mv").forEach(
            (b) =>
            (b.onclick = async () => {
                if (!confirm("Xoá phim này?")) return;
                await mvDelete(b.dataset.id);
                await reloadMovies();
            })
        );
        tb.querySelectorAll(".btn-view-mv").forEach(
            (b) => (b.onclick = () => openView(b.dataset.id))
        );

        // Khởi tạo lại DataTable sau khi đã render xong
        if (window.jQuery?.fn?.DataTable) {
            setTimeout(() => window.jQuery("#tblMovies").DataTable(), 0);
        }
    }

    // ===== Modal helpers =====
    function clearMovieForm() {
        const ids = [
            "Movie_id",
            "Movie_name",
            "Slug",
            "Overview",
            "Release_year",
            "Duration",
            "Poster_url",
            "Backdrop_url",
            "Trailer_url",
            "Language",
        ];
        ids.forEach((i) => {
            const el = qs("#" + i);
            if (el) el.value = "";
        });
        const selIds = ["Country_id", "Genre_ids", "Cast_ids", "Director_ids"];
        selIds.forEach((i) => {
            const el = qs("#" + i);
            if (el) {
                el.selectedIndex = -1;
                if (el.multiple)
                    Array.from(el.options).forEach((o) => (o.selected = false));
            }
        });
        const isSeries = qs("#Is_series");
        if (isSeries) isSeries.checked = false;
        const isActive = qs("#Is_active");
        if (isActive) isActive.checked = true;
        const seriesBlock = qs("#seriesBlock");
        if (seriesBlock) seriesBlock.style.display = "none";
    }

    function fillForm(m) {
        qs("#Movie_id").value = m.id ?? m.Film_id ?? "";
        qs("#Movie_name").value = m.name ?? m.Film_name ?? "";
        qs("#Slug").value = m.slug ?? "";
        qs("#Overview").value = m.overview ?? m.description ?? "";
        qs("#Release_year").value = m.year ?? m.Release_year ?? "";
        qs("#Duration").value = m.duration ?? m.Duration ?? "";
        qs("#Poster_url").value = m.poster_url ?? "";
        qs("#Backdrop_url").value = m.backdrop_url ?? "";
        qs("#Trailer_url").value = m.trailer_url ?? "";
        qs("#Language").value = m.language ?? "";
        qs("#Is_series").checked = !!(m.isSeries ?? m.is_series);
        qs("#Is_active").checked = !!(
            m.active ?? (m.is_deleted !== undefined ? !m.is_deleted : true)
        );
        if (m.country_id && qs("#Country_id"))
            qs("#Country_id").value = String(m.country_id);
        if (Array.isArray(m.genre_ids)) selectValues("#Genre_ids", m.genre_ids);
        if (Array.isArray(m.cast_ids)) selectValues("#Cast_ids", m.cast_ids);
        if (Array.isArray(m.director_ids))
            selectValues("#Director_ids", m.director_ids);
        if (Array.isArray(m.cast_ids)) setCheckedActorIds(m.cast_ids);
    }

    function toggleSeries(show) {
        const blk = qs("#seriesBlock");
        if (blk) blk.style.display = show ? "" : "none";
    }

    // ===== Open modal =====
    async function openAdd() {
        clearMovieForm();
        toggleSeries(false);
        if (window.jQuery) window.jQuery("#movieModal").modal("show");
        else qs("#movieModal")?.classList.remove("d-none");
    }
    async function openEdit(id) {
        clearMovieForm();
        const m = await mvGet(id);
        fillForm(m);
        toggleSeries(qs("#Is_series").checked);
        if (window.jQuery) window.jQuery("#movieModal").modal("show");
        else qs("#movieModal")?.classList.remove("d-none");
    }

    // ===== Submit =====
    async function onSubmit(e) {
        e.preventDefault();

        const id = qs("#Movie_id")?.value?.trim() || "";
        const film_name = qs("#Movie_name")?.value?.trim() || "";
        if (!film_name) return alert("Tên phim là bắt buộc");

        const isSeries = !!qs("#Is_series")?.checked;

        const payload = {
            film_name,
            is_series: isSeries,
            film_info: {
                original_name: qs("#Original_name")?.value?.trim() || null,
                description: qs("#Overview")?.value?.trim() || null,
                release_year: qs("#Release_year")?.value
                    ? Number(qs("#Release_year").value)
                    : null,
                duration: qs("#Duration")?.value ? Number(qs("#Duration").value) : null,
                country_id: qs("#Country_id")?.value
                    ? Number(qs("#Country_id").value)
                    : null,
                maturity_rating: qs("#Maturity_rating")?.value || null,
                film_status: qs("#Film_status")?.value || null, // "đang chiếu" | "hoàn thành" | "sắp chiếu"
                trailer_url: qs("#Trailer_url")?.value?.trim() || null,
                // nếu đang là series và sau này có input riêng cho tiến độ/tổng tập thì đọc vào; hiện tại để 0
                process_episode: 0,
                total_episode: 0,
            },
        };

        // Chỉ thêm các mảng nếu trên form có control (tránh lỗi khi bạn chưa dùng):
        const gEl = qs("#Genre_ids");
        if (gEl) payload.genre_ids = getMultiValues(gEl).map(Number);

        const actorIds = getSelectedActorIds();
        if (actorIds.length) payload.cast_ids = actorIds;

        // posters/sources: chưa có UI trong modal này, để trống; khi bạn thêm input riêng thì push vào payload

        try {
            if (id) await mvUpdate(id, payload);
            else await mvCreate(payload);

            if (window.jQuery) window.jQuery("#movieModal").modal("hide");
            else qs("#movieModal")?.classList.add("d-none");

            await reloadMovies();
        } catch (err) {
            console.error("[movies] create/update failed:", err);
            alert("Lưu phim thất bại. Mở Console để xem chi tiết lỗi.");
        }
    }

    // ===== Seasons UI =====
    function renderSeasonOptions(seasons) {
        const sel = qs("#seasonList");
        if (!sel) return;
        sel.innerHTML = (seasons || [])
            .map(
                (s) =>
                    `<option value="${s.id}">${esc(
                        s.name || "Season " + s.number
                    )}</option>`
            )
            .join("");
        const btnEp = qs("#btnAddEpisode");
        if (btnEp) btnEp.disabled = !sel.value;
    }
    function renderEpisodes(episodes) {
        const tb = qs("#episodeBody");
        if (!tb) return;
        tb.innerHTML = (episodes || [])
            .map(
                (e, i) => `
      <tr>
        <td class="text-center">${e.number ?? i + 1}</td>
        <td>${esc(e.title || "")}</td>
        <td class="text-center">${e.duration ? e.duration + "p" : ""}</td>
        <td class="text-center">
          <button class="btn btn-xs btn-info btn-edit-ep" data-ep="${e.id
                    }"><i class="fas fa-edit"></i></button>
          <button class="btn btn-xs btn-danger btn-del-ep" data-ep="${e.id
                    }"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`
            )
            .join("");
        qsa(".btn-del-ep").forEach(
            (btn) =>
            (btn.onclick = async () => {
                if (!confirm("Xoá tập này?")) return;
                await epDelete(btn.dataset.ep);
                const sid = qs("#seasonList")?.value;
                if (sid) {
                    const eps = await epList(sid);
                    renderEpisodes(eps);
                }
            })
        );
        qsa(".btn-edit-ep").forEach(
            (btn) =>
            (btn.onclick = async () => {
                const ep = btn.dataset.ep;
                const title = prompt("Tên tập mới:");
                if (title == null) return;
                const d = prompt("Thời lượng (phút):");
                await epUpdate(ep, { title, duration: d ? Number(d) : null });
                const sid = qs("#seasonList")?.value;
                if (sid) {
                    const eps = await epList(sid);
                    renderEpisodes(eps);
                }
            })
        );
    }

    // ===== Page wiring =====
    async function bindLookups() {
        try {
            // ===== Countries (giữ nguyên) =====
            const sel = qs("#Country_id");
            if (!sel) {
                console.warn("[movies] #Country_id not found");
                // KHÔNG return nữa để vẫn nạp genres/actors nếu có
            } else {
                const raw = await loadCountries(); // API: /api/countries
                const countries = (Array.isArray(raw) ? raw : [])
                    .map((c) => ({
                        id: c.id ?? c.Country_id ?? c.country_id ?? c.code ?? c.value,
                        name: c.name ?? c.Country_name ?? c.country_name ?? c.label ?? c.text,
                    }))
                    .filter((x) => x.id != null && x.name);

                const opts = countries.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
                sel.innerHTML = `<option value="">— Chọn —</option>` + opts;
                sel.value = ""; // hiện placeholder
            }

            // ===== GENRES: load 1 lần, dùng cho cả checkbox (#Genre_list) và <select multiple> (#Genre_ids) =====
            let genres = [];
            if (typeof loadGenres === "function") {
                const rawG = await loadGenres();
                genres = (Array.isArray(rawG) ? rawG : [])
                    .map(g => ({
                        id: g.id ?? g.Genre_id ?? g.genre_id ?? g.value,
                        name: g.name ?? g.Genre_name ?? g.genre_name ?? g.label ?? g.text,
                    }))
                    .filter(x => x.id != null && x.name);
            }

            // 2.1 Checkbox list (nếu có #Genre_list)
            const boxList = qs("#Genre_list");
            if (boxList && genres.length) {
                // Lưu dict để vẽ chips nhanh
                window.GenreDict = Object.fromEntries(genres.map(g => [String(g.id), g.name]));

                boxList.innerHTML = genres.map(g => `
        <div class="form-check">
          <input class="form-check-input genre-cb" type="checkbox" id="g_${g.id}" value="${g.id}">
          <label class="form-check-label" for="g_${g.id}">${esc(g.name)}</label>
        </div>
      `).join("");

                // Gắn 1 listener duy nhất
                boxList.onchange = () => renderGenreChips(getSelectedGenreIds());
                // Khởi tạo chips
                renderGenreChips(getSelectedGenreIds());
            }

            // 2.2 <select multiple> fallback (nếu bạn vẫn giữ #Genre_ids ở đâu đó)
            const selGenres = qs("#Genre_ids");
            if (selGenres && genres.length) {
                selGenres.innerHTML = genres.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join("");
            }

            // ===== ACTORS (giữ nguyên ý tưởng của bạn) =====
            // ===== ACTORS: checkbox + search + chips =====
            const actList = qs('#Actor_list');    // <div> danh sách checkbox
            const actSearch = qs('#Actor_search');  // <input> ô tìm kiếm
            const actClear = qs('#Actor_clear');   // <button> xoá từ khoá

            if (actList && typeof loadActors === 'function') {
                // 1) Load tất cả diễn viên ban đầu
                const rawA = await loadActors();
                const actors = (Array.isArray(rawA) ? rawA : [])
                    .map(a => ({
                        id: a.id ?? a.Actor_id ?? a.actor_id ?? a.value,
                        name: a.name ?? a.Actor_name ?? a.actor_name ?? a.label ?? a.text,
                    }))
                    .filter(x => x.id != null && x.name);

                // Dict để render chips
                window.ActorDict = Object.fromEntries(actors.map(a => [String(a.id), a.name]));

                // Hàm vẽ danh sách checkbox (giữ tick đã chọn)
                const renderActorList = (rows) => {
                    const cur = new Set(getSelectedActorIds().map(String));
                    actList.innerHTML = (rows || []).map(a => `
      <div class="form-check">
        <input class="form-check-input actor-cb" type="checkbox" id="a_${a.id}" value="${a.id}" ${cur.has(String(a.id)) ? 'checked' : ''}>
        <label class="form-check-label" for="a_${a.id}">${esc(a.name)}</label>
      </div>
    `).join('');
                    actList.onchange = () => renderActorChips(getSelectedActorIds());
                    renderActorChips(getSelectedActorIds());
                };

                renderActorList(actors); // vẽ lần đầu

                // 2) Search nhanh (debounce)
                const doSearch = debounce(async (kw) => {
                    if (!kw) return renderActorList(actors);
                    try {
                        const found = await searchActors(kw);
                        const rows = (Array.isArray(found) ? found : []).map(a => ({
                            id: a.id ?? a.Actor_id ?? a.actor_id ?? a.value,
                            name: a.name ?? a.Actor_name ?? a.actor_name ?? a.label ?? a.text,
                        })).filter(x => x.id != null && x.name);

                        // Cập nhật dict để chips hiển thị tên
                        rows.forEach(a => { window.ActorDict[String(a.id)] = a.name; });

                        renderActorList(rows);
                    } catch (e) {
                        console.warn('[movies] searchActors failed:', e);
                    }
                }, 300);

                if (actSearch) actSearch.oninput = (e) => doSearch(e.target.value.trim());
                if (actClear) actClear.onclick = () => { if (actSearch) actSearch.value = ''; doSearch(''); };
            }


        } catch (err) {
            console.error("[movies] bindLookups() failed:", err);
            alert("Không tải được danh sách quốc gia.");
        }
    }


    async function reloadMovies() {
        const rows = await mvList();
        renderMovieRows(rows);
    }

    function wirePage() {
        const addBtn = qs("#btnAddMovie");
        if (addBtn)
            addBtn.onclick = (e) => {
                e.preventDefault();
                openAdd();
            };
        const form = qs("#movieForm");
        if (form) form.onsubmit = onSubmit;
        const isSeriesCb = qs("#Is_series");
        if (isSeriesCb) isSeriesCb.onchange = (e) => toggleSeries(e.target.checked);

        // seasons events
        const seasonList = qs("#seasonList");
        if (seasonList) {
            seasonList.onchange = async (e) => {
                const sid = e.target.value;
                const btnEp = qs("#btnAddEpisode");
                if (btnEp) btnEp.disabled = !sid;
                if (!sid) return renderEpisodes([]);
                const eps = await epList(sid);
                renderEpisodes(eps);
            };
        }
        const btnAddSeason = qs("#btnAddSeason");
        if (btnAddSeason) {
            btnAddSeason.onclick = async () => {
                const mid = qs("#Movie_id")?.value;
                if (!mid) return alert("Hãy lưu phim trước rồi mới tạo mùa.");
                const name = prompt("Tên mùa (ví dụ: Season 1):", "");
                if (!name) return;
                await seCreate(mid, { name });
                const seasons = await seList(mid);
                renderSeasonOptions(seasons);
                const sid = qs("#seasonList")?.value;
                if (sid) {
                    const eps = await epList(sid);
                    renderEpisodes(eps);
                }
            };
        }
        const btnAddEpisode = qs("#btnAddEpisode");
        if (btnAddEpisode) {
            btnAddEpisode.onclick = async () => {
                const sid = qs("#seasonList")?.value;
                if (!sid) return alert("Chọn một mùa trước.");
                const title = prompt("Tên tập:", "");
                if (!title) return;
                const d = Number(prompt("Thời lượng (phút):", "")) || null;
                await epCreate(sid, { title, duration: d });
                const eps = await epList(sid);
                renderEpisodes(eps);
            };
        }
    }

    async function init() {
        wirePage();
        await bindLookups();
        await reloadMovies();
    }

    // === [Mini helpers - bỏ qua nếu bạn đã khai báo sẵn] ===
    const FILM_DETAIL = (id) => `${API_BASE}/api/films/${id}/detail`;
    async function mvGetDetail(id) {
        const r = await axios.get(FILM_DETAIL(id));
        return r.data?.data ?? r.data;
    }

    // === [B1] Render dữ liệu vào modal chi tiết ===
    function renderDetail(d) {
        if (!d) return;
        const { film, info, genres, posters, sources, cast, seasons, has_series } =
            d;

        // Header
        qs("#mvDtlTitle").textContent = esc(film?.name ?? "");
        const typeEl = qs("#mvDtlType");
        if (typeEl) {
            typeEl.textContent = film?.is_series ? "Series" : "Movie";
            typeEl.className =
                "ml-2 badge " + (film?.is_series ? "badge-warning" : "badge-info");
        }

        // Info
        qs("#mvDtlOriginal").textContent = esc(info?.original_name ?? "");
        qs("#mvDtlYear").textContent = info?.release_year ?? "";
        qs("#mvDtlDuration").textContent = info?.duration
            ? info.duration + "p"
            : "";
        qs("#mvDtlRating").textContent = esc(info?.maturity_rating ?? "");
        qs("#mvDtlCountry").textContent = esc(info?.country?.name ?? "");
        const stEl = qs("#mvDtlStatus");
        if (stEl) {
            const st = String(info?.film_status || "").toLowerCase();
            stEl.textContent = info?.film_status || "";
            stEl.className =
                "badge " +
                (st.includes("đang")
                    ? "badge-success"
                    : st.includes("sắp")
                        ? "badge-warning"
                        : "badge-secondary");
        }
        const trailerEl = qs("#mvDtlTrailer");
        if (trailerEl) {
            trailerEl.href = info?.trailer_url || "#";
            trailerEl.style.pointerEvents = info?.trailer_url ? "auto" : "none";
        }
        qs("#mvDtlDesc").textContent = info?.description || "";

        // Posters
        const postersBox = qs("#mvDtlPosters");
        if (postersBox) {
            postersBox.innerHTML =
                (posters || [])
                    .map(
                        (p) => `
      <div class="mb-2">
        <div class="small text-muted">PosterType #${p.postertype_id ?? ""}</div>
        <img src="${esc(
                            p.poster_url || ""
                        )}" class="img-fluid rounded shadow-sm"
             onerror="this.style.display='none'">
      </div>
    `
                    )
                    .join("") || '<div class="text-muted">Không có poster</div>';
        }

        // Genres
        const gWrap = qs("#mvDtlGenres");
        if (gWrap) {
            gWrap.innerHTML =
                (genres || [])
                    .map(
                        (g) =>
                            `<span class="badge badge-light mr-1 mb-1">${esc(g.name)}</span>`
                    )
                    .join("") || '<span class="text-muted">—</span>';
        }

        // Sources (movie-level)
        const sb = qs("#mvDtlSourceBody");
        if (sb) {
            sb.innerHTML =
                (sources || [])
                    .map(
                        (s) => `
      <tr>
        <td class="text-center">${esc(
                            s.resolution_type || (s.resolution_id ?? "")
                        )}</td>
        <td><a href="${esc(
                            s.source_url || "#"
                        )}" target="_blank" rel="noopener">${esc(s.source_url || "")}</a></td>
      </tr>
    `
                    )
                    .join("") ||
                `<tr><td colspan="2" class="text-center text-muted">—</td></tr>`;
        }

        // Cast
        const castBox = qs("#mvDtlCast");
        if (castBox) {
            castBox.innerHTML =
                (cast || [])
                    .map(
                        (c) => `
      <div class="badge badge-pill badge-secondary mr-1 mb-1">
        ${esc(c.name)}${c.character_name
                                ? ' <small class="text-light">as</small> ' +
                                esc(c.character_name)
                                : ""
                            }
      </div>
    `
                    )
                    .join("") || '<span class="text-muted">—</span>';
        }

        // Series (seasons/episodes)
        const seriesWrap = qs("#mvDtlSeries");
        const seasonsBox = qs("#mvDtlSeasons");
        if (seriesWrap && seasonsBox) {
            seriesWrap.style.display = has_series ? "" : "none";
            if (!has_series) {
                seasonsBox.innerHTML = "";
            } else {
                seasonsBox.innerHTML = (seasons || [])
                    .map(
                        (s) => `
        <div class="card mb-2">
          <div class="card-header py-2"><strong>${esc(
                            s.name || "Season " + (s.number ?? "")
                        )}</strong></div>
          <div class="card-body p-2">
            <div class="table-responsive">
              <table class="table table-sm table-bordered mb-0">
                <thead class="text-center">
                  <tr><th style="width:70px">#</th><th>Tên tập</th><th style="width:100px">Thời lượng</th><th>Nguồn</th></tr>
                </thead>
                <tbody>
                  ${(s.episodes || [])
                                .map(
                                    (ep) => `
                    <tr>
                      <td class="text-center">${ep.number ?? ""}</td>
                      <td>${esc(ep.title || "")}</td>
                      <td class="text-center">${ep.duration ? ep.duration + "p" : ""
                                        }</td>
                      <td>
                        ${(ep.sources || [])
                                            .map(
                                                (src) =>
                                                    `<div>${esc(
                                                        src.resolution_type ||
                                                        (src.resolution_id ?? "")
                                                    )}: 
                            <a href="${esc(
                                                        src.source_url || "#"
                                                    )}" target="_blank" rel="noopener">
                              ${esc(src.source_url || "")}
                            </a>
                          </div>`
                                            )
                                            .join("") || "—"
                                        }
                      </td>
                    </tr>
                  `
                                )
                                .join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `
                    )
                    .join("");
            }
        }
    }

    // === [B2] Lấy dữ liệu và mở modal ===
    async function openView(id) {
        try {
            const data = await mvGetDetail(id);
            renderDetail(data);
            if (window.jQuery) {
                window.jQuery("#movieDetailModal").modal("show");
            } else {
                // fallback nếu không dùng jQuery/Bootstrap
                const el = qs("#movieDetailModal");
                if (el) el.classList.remove("d-none");
            }
        } catch (err) {
            console.error("[movies] view detail failed:", err);
            alert("Không tải được chi tiết phim.");
        }
    }

    // Router will call this after injecting movies.html
    window.PageInits = window.PageInits || {};
    window.PageInits.movies = init;

    // ===== Helpers cho checkbox thể loại =====
    function getSelectedGenreIds() {
        return Array.from(document.querySelectorAll('.genre-cb:checked'))
            .map(cb => Number(cb.value));
    }

    function setCheckedGenreIds(ids) {
        const set = new Set((ids || []).map(String));
        document.querySelectorAll('.genre-cb').forEach(cb => {
            cb.checked = set.has(cb.value);
        });
        renderGenreChips(getSelectedGenreIds());
    }

    function renderGenreChips(ids) {
        const chipsBox = document.querySelector('#Genre_selected');
        if (!chipsBox) return;
        if (!ids || !ids.length) {
            chipsBox.innerHTML = '<span class="text-muted">—</span>';
            return;
        }
        const dict = window.GenreDict || {};
        chipsBox.innerHTML = ids.map(id => {
            const name = (dict[String(id)] ?? id);
            return `<span class="badge badge-primary mr-1 mb-1">${name}</span>`;
        }).join('');
    }

    function getSelectedActorIds() {
        return Array.from(document.querySelectorAll('.actor-cb:checked')).map(cb => Number(cb.value));
    }
    function setCheckedActorIds(ids) {
        const set = new Set((ids || []).map(String));
        document.querySelectorAll('.actor-cb').forEach(cb => cb.checked = set.has(cb.value));
        renderActorChips(getSelectedActorIds());
    }
    function renderActorChips(ids) {
        const box = document.querySelector('#Actor_selected');
        if (!box) return;
        if (!ids || !ids.length) { box.innerHTML = '<span class="text-muted">—</span>'; return; }
        const dict = window.ActorDict || {};
        box.innerHTML = ids.map(id => `<span class="badge badge-info mr-1 mb-1">${esc(dict[String(id)] ?? id)}</span>`).join('');
    }


})();

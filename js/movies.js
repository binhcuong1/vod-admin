// movies.js (FINAL standalone) — VOD Admin
// - Single modal for Movie + optional Seasons/Episodes
// - Aligned with movies.html fields (no Original_name)
// - Requires axios + (optional) jQuery for Bootstrap modal + (optional) DataTables

(() => {
    // ===== Basic DOM helpers =====
    const qs = (sel, root = document) => root.querySelector(sel);
    const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    let _isEdit = false;

    // ===== Config / Endpoints =====
    const API_BASE = window.API_BASE || "http://localhost:3000";
    const FILMS = () => `${API_BASE}/api/films`;
    const FILM = (id) => `${API_BASE}/api/films/${id}`;
    const FILM_BY_ID = (id) => `${API_BASE}/api/films/${id}`;
    const GENRES = () => `${API_BASE}/api/genres`;
    const COUNTRIES = () => `${API_BASE}/api/countries`;
    const ACTORS = () => `${API_BASE}/api/actors`;
    const PEOPLE = (role) =>
        `${API_BASE}/api/people?role=${encodeURIComponent(role || "")}`; // actor|director

    // Sources endpoints
    const FILM_SOURCES = (filmId) => `${API_BASE}/api/films/${filmId}/sources`;
    const EPISODE_SOURCES = (epId) => `${API_BASE}/api/episodes/${epId}/sources`;


    const RESOLUTIONS = [
        { id: 1, label: '360p' },
        { id: 2, label: '480p' },
        { id: 3, label: '720p' },
        { id: 4, label: '1080p' },
        // { id: 5, label: '4K' },
    ];

    const ACTOR_SEARCH = (kw) => `${API_BASE}/api/actors/search?keyword=${encodeURIComponent(kw || '')}`;

    async function mvGetById(id) {
        const r = await axios.get(FILM_DETAIL(id));
        const d = r.data?.data ?? r.data ?? {};

        return {
            Film_id: d.film?.id,
            Film_name: d.film?.name,
            is_series: d.film?.is_series,

            Original_name: d.info?.original_name ?? '',
            Description: d.info?.description ?? '',
            Release_year: d.info?.release_year ?? '',
            Duration: d.info?.duration ?? '',   // có thể là chuỗi
            Country_id: d.info?.country?.id ?? null,
            maturity_rating: d.info?.maturity_rating ?? '',
            film_status: d.info?.film_status ?? '',
            trailer_url: d.info?.trailer_url ?? '',

            genre_ids: (d.genres || []).map(g => g.id),
            cast_ids: (d.cast || []).map(a => a.actor_id),
        };
    }

    // Seasons/Episodes (optional)
    const SEASONS = (movieId) => `${API_BASE}/api/films/${movieId}/seasons`;
    const EPISODES = (seasonId) => `${API_BASE}/api/seasons/${seasonId}/episodes`;
    const SEASON_ONE = (id) => `${API_BASE}/api/seasons/${id}`;

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
        try {
            const r = await axios.get(SEASONS(mid));
            const rows = r.data?.data ?? r.data ?? [];
            // normalize -> {id,name,number}
            return (rows || []).map(s => ({
                id: s.id ?? s.Season_id ?? s.season_id,
                name: s.name ?? s.Season_name ?? s.season_name ?? `Season ${s.number ?? ''}`,
                number: s.number ?? s.Season_number ?? s.season_number ?? null,
            }));
        } catch (e) {
            console.warn('[movies] seList failed:', e?.message || e);
            return [];
        }
    }

    async function epList(sid) {
        const r = await axios.get(EPISODES(sid));
        const rows = r.data?.data ?? r.data ?? [];
        return (rows || []).map(e => ({
            id: e.id ?? e.Episode_id ?? e.episode_id,
            number: e.number ?? e.Episode_number ?? e.episode_number,
            title: e.title ?? e.Title ?? e.episode_title ?? '',
            duration: e.duration ?? e.Duration ?? e.episode_duration ?? null,
        }));
    }

    async function epCreate(seasonId, p) {
        const body = { episode_number: p?.episode_number };
        const r = await axios.post(EPISODES(seasonId), body);
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

    async function seDelete(seasonId) {
        const r = await axios.delete(SEASON_ONE(seasonId));
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
        const seriesNote = qs("#seriesAddNote");
        if (seriesNote) seriesNote.classList.add("d-none");
    }

    function fillForm(m = {}) {
        // id & cơ bản
        setVal('#Movie_id', m.Film_id ?? m.id ?? '');
        setVal('#Movie_name', m.Film_name ?? m.name ?? '');
        setChecked('#Is_series', !!(m.is_series ?? m.isSeries));

        // info
        setVal('#Original_name', m.Original_name ?? m.original_name ?? '');
        setVal('#Overview', m.Description ?? m.description ?? '');
        setVal('#Release_year', m.Release_year ?? m.release_year ?? '');
        // DB mới Duration có thể là chuỗi → đừng + 'p' ở đây
        setVal('#Duration', m.Duration ?? m.duration ?? '');
        setVal('#Maturity_rating', m.maturity_rating ?? m.Maturity_rating ?? '');
        setVal('#Film_status', m.film_status ?? m.Film_status ?? '');
        setVal('#Trailer_url', m.trailer_url ?? m.Trailer_url ?? '');
        selectIf('#Country_id', m.Country_id ?? m.country_id);

        // genres
        if (Array.isArray(m.genre_ids)) {
            if (typeof setCheckedGenreIds === 'function') {
                setCheckedGenreIds(m.genre_ids);            // checkbox flow
            } else {
                // fallback nếu vẫn còn <select multiple>
                if (typeof selectValues === 'function') selectValues('#Genre_ids', m.genre_ids);
            }
        }

        // actors
        if (Array.isArray(m.cast_ids)) {
            if (typeof setCheckedActorIds === 'function') {
                setCheckedActorIds(m.cast_ids);             // checkbox + chips
            } else {
                if (typeof selectValues === 'function') selectValues('#Cast_ids', m.cast_ids);
            }
        }
    }


    function toggleSeries(show) {
        const blk = qs("#seriesBlock");          // khối Seasons & Episodes trong form
        const note = qs("#seriesAddNote");       // dòng hướng dẫn “tick Là series…”
        const mvSrcBlk = qs("#movieSourcesBlock"); // khối Nguồn phát (Movie)

        if (_isEdit) {
            // Khi ĐANG SỬA
            // show = true  -> phim bộ: hiện khối season, ẩn movie sources
            // show = false -> phim lẻ: ẩn khối season, hiện movie sources
            if (blk) blk.style.display = show ? "" : "none";
            if (mvSrcBlk) mvSrcBlk.style.display = show ? "none" : "";
            if (note) note.classList.add("d-none");
        } else {
            // Khi THÊM MỚI
            if (blk) blk.style.display = "none";          // chưa cho tạo season ở bước này
            if (mvSrcBlk) mvSrcBlk.style.display = "none"; // luôn ẩn movie sources khi thêm
            if (note) note.classList.toggle("d-none", !show);
        }
    }



    // ===== Open modal =====
    function openAdd() {
        _isEdit = false;
        clearMovieForm();

        // bỏ tick Là series mặc định
        const chk = qs("#Is_series");
        if (chk) chk.checked = false;

        toggleSeries(false); // phim mới: xem như không phải series, nhưng ở nhánh _isEdit=false nên sẽ ẩn cả 2 khối

        if (window.jQuery) window.jQuery("#movieModal").modal("show");
        else qs("#movieModal")?.classList.remove("d-none");
    }



    async function openEdit(id) {
        try {
            _isEdit = true;
            await bindLookups();            // load quốc gia, thể loại, diễn viên

            const m = await mvGetById(id);  // lấy data phim + info + genres + cast
            fillForm(m);                    // đổ lên form

            // Cập nhật UI: series / movie + movie sources block
            toggleSeries(!!m.is_series);

            // Nếu là phim lẻ -> load nguồn phát (Movie)
            if (!m.is_series && typeof getFilmSources === "function") {
                await getFilmSources(id);
            }

            if (window.jQuery) window.jQuery("#movieModal").modal("show");
            else qs("#movieModal")?.classList.remove("d-none");

            // Nếu là series -> load seasons & episodes (accordion mới)
            if (m.is_series) {
                await renderSeasonsAndEpisodes(id);
            }

        } catch (err) {
            console.error("[movies] openEdit failed:", err);
            alert("Không tải được dữ liệu phim để sửa.");
        }
    }





    // ===== Submit =====
    async function onSubmit(e) {
        e.preventDefault();

        // Chỉ xử lý khi bấm nút Lưu
        if (e.submitter && e.submitter.id !== 'btnSaveMovie') return;

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
                release_year: qs("#Release_year")?.value ? Number(qs("#Release_year").value) : null,
                duration: qs("#Duration")?.value ? Number(qs("#Duration").value) : null,
                country_id: qs("#Country_id")?.value ? Number(qs("#Country_id").value) : null,
                maturity_rating: qs("#Maturity_rating")?.value || null,
                film_status: qs("#Film_status")?.value || null,
                trailer_url: qs("#Trailer_url")?.value?.trim() || null,
                process_episode: 0,
                total_episode: 0,
            },
        };

        // ✳️ Gửi kèm info (phòng trường hợp BE đọc key này)
        payload.info = payload.film_info;

        // ✳️ THỂ LOẠI
        let genreIds = [];
        if (typeof getSelectedGenreIds === "function") {
            genreIds = getSelectedGenreIds();      // đọc từ checkbox .genre-cb
        } else {
            // fallback nếu còn dùng <select multiple>
            const gEl = qs("#Genre_ids");
            if (gEl) genreIds = getMultiValues(gEl).map(Number);
        }
        if (genreIds.length) payload.genre_ids = genreIds;

        // ✳️ DIỄN VIÊN
        let actorIds = [];
        if (typeof getSelectedActorIds === "function") {
            actorIds = getSelectedActorIds();      // đọc từ checkbox .actor-cb
        }
        if (actorIds.length) payload.cast_ids = actorIds;

        console.log("payload gửi lên:", payload);

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



    // ===== Seasons UI (mới: accordion theo mùa) =====

    // Render toàn bộ seasons + episodes cho 1 movie
    async function renderSeasonsAndEpisodes(movieId) {
        const wrap = qs("#seasonAccordion");
        if (!wrap) return;

        const seasons = await seList(movieId);
        if (!seasons.length) {
            wrap.innerHTML = '<div class="text-muted small">Chưa có mùa nào.</div>';
            return;
        }

        wrap.innerHTML = seasons.map((s, idx) => `
          <div class="card mb-2">
            <div class="card-header py-2 season-header" 
                 data-target="#seasonCollapse-${s.id}">
              <div class="d-flex justify-content-between align-items-center">
                <span class="season-title">${esc(s.name)}</span>
                <div class="d-flex align-items-center">
                  <i class="fas fa-chevron-down season-arrow mr-2"></i>
                  <button type="button"
                          class="btn btn-xs btn-outline-danger btn-del-season"
                          data-season="${s.id}">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            <div id="seasonCollapse-${s.id}" class="collapse ${idx === 0 ? "show" : ""}">
              <div class="card-body p-2">
                <div class="table-responsive">
                  <table class="table table-sm table-bordered mb-0">
                    <thead class="text-center">
                      <tr>
                        <th style="width:70px">#</th>
                        <th>Tên tập</th>
                        <th style="width:90px">Thời lượng</th>
                        <th style="width:110px">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody id="epBody-${s.id}">
                      <tr><td colspan="4" class="text-center text-muted">Đang tải...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        `).join("");


        // Sau khi vẽ skeleton, load từng danh sách tập
        for (const s of seasons) {
            const eps = await epList(s.id);
            renderEpisodesForSeason(s.id, eps);
        }

        // Gắn sự kiện mở/đóng cho toàn bộ header
        wrap.querySelectorAll(".season-header").forEach(header => {
            header.onclick = () => {
                const target = header.dataset.target;
                const panel = qs(target);
                const arrow = header.querySelector(".season-arrow");

                // Toggle collapse
                if (panel.classList.contains("show")) {
                    $(panel).collapse("hide");
                    arrow.classList.remove("rotate");
                } else {
                    $(panel).collapse("show");
                    arrow.classList.add("rotate");
                }
            };
        });

        // Xoá mùa
        wrap.querySelectorAll(".btn-del-season").forEach(btn => {
            btn.onclick = async (ev) => {
                ev.preventDefault();
                ev.stopPropagation(); // để click nút xoá không làm mở/đóng accordion

                const sid = btn.dataset.season;
                if (!sid) return alert("Không tìm thấy Season_id.");
                if (!confirm("Xoá mùa này (và các tập bên trong)?")) return;

                try {
                    await seDelete(sid);
                    await renderSeasonsAndEpisodes(movieId); // reload lại danh sách mùa
                } catch (err) {
                    console.error("[movies] delete season failed:", err);
                    alert("Xoá mùa thất bại. Mở Console để xem chi tiết.");
                }
            };
        });


        // Xoay icon khi bootstrap trigger
        wrap.querySelectorAll(".collapse").forEach(col => {
            col.addEventListener("shown.bs.collapse", () => {
                const header = qs(`[data-target="#${col.id}"]`);
                header?.querySelector(".season-arrow")?.classList.add("rotate");
            });
            col.addEventListener("hidden.bs.collapse", () => {
                const header = qs(`[data-target="#${col.id}"]`);
                header?.querySelector(".season-arrow")?.classList.remove("rotate");
            });
        });

    }

    // Render bảng tập cho 1 mùa + dòng "+ Thêm tập"
    function renderEpisodesForSeason(seasonId, episodes) {
        const maxNo = (episodes || []).reduce(
            (m, e) => Math.max(m, e.number || 0),
            0
        );
        const nextNo = maxNo + 1;

        const tb = qs(`#epBody-${seasonId}`);
        if (!tb) return;

        const rowsHtml = (episodes || []).map((e, i) => `
      <tr>
        <td class="text-center align-middle">${e.number ?? (i + 1)}</td>
        <td class="align-middle">${esc(e.title || "")}</td>
        <td class="text-center align-middle">${e.duration ? (e.duration + "p") : ""}</td>
        <td class="text-center align-middle">
          <button type="button" class="btn btn-xs btn-secondary btn-ep-src"
                  data-ep='${JSON.stringify({ id: e.id, number: e.number, title: e.title || "" })}'>
            Src
          </button>
          <button type="button" class="btn btn-xs btn-info btn-edit-ep" data-ep="${e.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button type="button" class="btn btn-xs btn-danger btn-del-ep" data-ep="${e.id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");

        // Dòng cuối: nút + Thêm tập
        const addRow = `
          <tr>
            <td colspan="4" class="text-center">
              <button type="button"
                      class="btn btn-sm btn-outline-success btn-add-ep"
                      data-season="${seasonId}"
                      data-next="${nextNo}">
                + Thêm tập (#${nextNo})
              </button>
            </td>
          </tr>
        `;


        tb.innerHTML = rowsHtml + addRow;

        // Gắn sự kiện cho các nút trong mùa này
        tb.querySelectorAll(".btn-del-ep").forEach(btn => {
            btn.onclick = async (ev) => {
                ev.preventDefault(); ev.stopPropagation();
                const eid = btn.dataset.ep;
                if (!eid) return alert("Không tìm thấy ID tập.");
                if (!confirm("Xoá tập này?")) return;
                await epDelete(eid);
                const eps = await epList(seasonId);
                renderEpisodesForSeason(seasonId, eps);
            };
        });

        tb.querySelectorAll(".btn-edit-ep").forEach(btn => {
            btn.onclick = (ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                const eid = btn.dataset.ep;
                if (!eid) return alert("Không tìm thấy ID tập.");

                // Lấy dòng hiện tại để đọc tên & thời lượng hiện tại
                const row = btn.closest("tr");
                const titleCell = row?.children?.[1];
                const durCell = row?.children?.[2];

                const curTitle = titleCell ? titleCell.textContent.trim() : "";
                const curDurText = durCell ? durCell.textContent.trim().replace("p", "") : "";
                const curDur = curDurText ? Number(curDurText) : "";

                qs("#epEditId").value = eid;
                qs("#epEditSeasonId").value = seasonId;
                qs("#epTitleInput").value = curTitle;
                qs("#epDurationInput").value = curDur;

                if (window.jQuery) jQuery("#episodeEditModal").modal("show");
                else qs("#episodeEditModal")?.classList.remove("d-none");
            };
        });

        const btnEpEditSave = qs("#btnEpEditSave");
        if (btnEpEditSave) {
            btnEpEditSave.onclick = async () => {
                const eid = qs("#epEditId")?.value;
                const sid = qs("#epEditSeasonId")?.value;
                if (!eid || !sid) return;

                const title = qs("#epTitleInput")?.value?.trim() || null;
                const dVal = qs("#epDurationInput")?.value;
                const duration = dVal ? Number(dVal) : null;

                try {
                    await epUpdate(eid, { title, duration });
                    if (window.jQuery) jQuery("#episodeEditModal").modal("hide");
                    else qs("#episodeEditModal")?.classList.add("d-none");

                    const eps = await epList(sid);
                    renderEpisodesForSeason(Number(sid), eps);
                } catch (err) {
                    console.error("[movies] update episode failed:", err);
                    alert("Cập nhật tập thất bại. Mở Console để xem chi tiết.");
                }
            };
        }


        tb.querySelectorAll(".btn-ep-src").forEach(btn => {
            btn.onclick = async (ev) => {
                ev.preventDefault(); ev.stopPropagation();
                const meta = btn.dataset.ep ? JSON.parse(btn.dataset.ep) : null;
                if (!meta?.id) return alert("Không tìm thấy ID tập.");
                await openEpSources(meta);

                const saveBtn = qs("#btnSaveEpSources");
                if (saveBtn) {
                    saveBtn.onclick = async () => {
                        await saveEpSources(meta.id);
                        const eps = await epList(seasonId);
                        renderEpisodesForSeason(seasonId, eps);
                    };
                }
            };
        });

        tb.querySelectorAll(".btn-add-ep").forEach(btn => {
            btn.onclick = async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                const sid = btn.dataset.season;
                if (!sid) return alert("Không tìm thấy Season_id.");

                const nextNo = Number(btn.dataset.next) || 1;

                // Gửi đúng những gì API đang cần
                await epCreate(sid, { episode_number: nextNo });

                // Tạo xong → load lại danh sách tập cho mùa đó
                const eps = await epList(sid);
                renderEpisodesForSeason(sid, eps);
            };
        });

    }


    async function openEpSources(ep) { // ep: {id, number, title}
        // hiển thị tiêu đề
        const ttl = qs('#epSourceTitle');
        if (ttl) ttl.textContent = `#${ep.number} ${ep.title || ''}`;

        // load nguồn hiện tại
        const r = await axios.get(EPISODE_SOURCES(ep.id));
        const rows = r.data?.data ?? [];
        const dict = Object.fromEntries(rows.map(x => [String(x.Resolution_id), x.Source_url || '']));

        // render bảng
        const tb = qs('#epSourceBody');
        if (tb) {
            tb.innerHTML = RESOLUTIONS.map(r => `
      <tr>
        <td class="text-center align-middle">${r.label}</td>
        <td><input class="form-control form-control-sm ep-src-input" 
                   data-res="${r.id}" placeholder="https://... (m3u8/mp4)" 
                   value="${esc(dict[String(r.id)] || '')}"></td>
      </tr>
    `).join('');
        }

        if (window.jQuery) $('#epSourceModal').modal('show');
    }

    async function saveEpSources(epId) {
        const inputs = qsa('.ep-src-input');
        const sources = inputs
            .map(i => ({ resolution_id: Number(i.dataset.res), source_url: i.value.trim() }))
            .filter(x => x.source_url);
        await axios.put(EPISODE_SOURCES(epId), { sources });
        if (window.jQuery) $('#epSourceModal').modal('hide');
        alert('Đã lưu nguồn phát của tập.');
    }


    async function getFilmSources(filmId) {
        const r = await axios.get(FILM_SOURCES(filmId));
        const rows = r.data?.data ?? [];
        const dict = Object.fromEntries(rows.map(x => [String(x.Resolution_id), x.Source_url || ""]));

        const tb = qs("#movieSourceBody");
        if (!tb) return;
        tb.innerHTML = RESOLUTIONS.map(r => `
    <tr>
      <td class="text-center align-middle">${r.label}</td>
      <td>
        <input class="form-control form-control-sm mv-src-input"
               data-res="${r.id}"
               placeholder="https://... (m3u8/mp4)"
               value="${esc(dict[String(r.id)] || "")}">
      </td>
    </tr>
  `).join("");
    }


    async function saveFilmSources(filmId) {
        const inputs = qsa('.mv-src-input');
        const sources = inputs
            .map(i => ({ resolution_id: Number(i.dataset.res), source_url: i.value.trim() }))
            .filter(x => x.source_url); // chỉ gửi những cái có URL
        await axios.put(FILM_SOURCES(filmId), { sources });
        alert('Đã lưu nguồn phát (Movie).');
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

        let _currentMovieIdForSeason = null;

        const btnAddSeason = qs("#btnAddSeason");
        if (btnAddSeason) {
            btnAddSeason.onclick = () => {
                const mid = qs("#Movie_id")?.value;
                if (!mid) return alert("Hãy lưu phim trước rồi mới tạo mùa.");

                _currentMovieIdForSeason = mid;
                const inp = qs("#seasonNameInput");
                if (inp) inp.value = "";

                if (window.jQuery) jQuery("#seasonAddModal").modal("show");
                else qs("#seasonAddModal")?.classList.remove("d-none");
            };
        }

        // nút Lưu trong modal Thêm mùa
        const btnSeasonSave = qs("#btnSeasonSave");
        if (btnSeasonSave) {
            btnSeasonSave.onclick = async () => {
                const mid = _currentMovieIdForSeason;
                if (!mid) return;

                const inp = qs("#seasonNameInput");
                const name = inp?.value?.trim();
                if (!name) return alert("Tên mùa là bắt buộc.");

                try {
                    await seCreate(mid, { name });
                    if (window.jQuery) jQuery("#seasonAddModal").modal("hide");
                    else qs("#seasonAddModal")?.classList.add("d-none");
                    await renderSeasonsAndEpisodes(mid);
                } catch (err) {
                    console.error("[movies] create season failed:", err);
                    alert("Tạo mùa thất bại. Mở Console để xem chi tiết.");
                }
            };
        }


        const btnSaveMovieSources = qs('#btnSaveMovieSources');
        if (btnSaveMovieSources) {
            btnSaveMovieSources.onclick = async () => {
                const mid = qs("#Movie_id")?.value;
                if (!mid) return alert("Chưa có ID phim.");
                await saveFilmSources(mid);
            };
        }

        async function seCreate(mid, p) {
            const body = {
                name: p?.name ?? p?.season_name ?? "Season 1",
                season_name: p?.season_name ?? p?.name ?? "Season 1",
            };
            const r = await axios.post(SEASONS(mid), body);
            return r.data;
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
        const srcCol = qs("#mvDtlSourcesCol");
        const sb = qs("#mvDtlSourceBody");

        if (srcCol) {
            // chỉ show cho PHIM LẺ
            const showSources = film && !film.is_series;
            srcCol.style.display = showSources ? "" : "none";

            if (!showSources || !sb) {
                if (sb) sb.innerHTML = "";
            } else {
                sb.innerHTML =
                    (sources || []).length
                        ? (sources || [])
                            .map(
                                (s) => `
              <tr>
                <td class="text-center">${esc(
                                    s.resolution_type || (s.resolution_id ?? "")
                                )}</td>
                <td>
                  <a href="${esc(s.source_url || "#")}"
                     target="_blank" rel="noopener">
                    ${esc(s.source_url || "")}
                  </a>
                </td>
              </tr>`
                            )
                            .join("")
                        : `<tr><td colspan="2" class="text-center text-muted">—</td></tr>`;
            }
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
            // CHỈ hiện nếu phim là series
            const showSeries = !!(film && film.is_series) && (seasons && seasons.length);
            seriesWrap.style.display = showSeries ? "" : "none";

            if (!showSeries) {
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
                  <tr>
                    <th style="width:70px">#</th>
                    <th>Tên tập</th>
                    <th style="width:100px">Thời lượng</th>
                    <th>Nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  ${(s.episodes || [])
                                .map(
                                    (ep) => `
                    <tr>
                      <td class="text-center">${ep.number ?? ""}</td>
                      <td>${esc(ep.title || "")}</td>
                      <td class="text-center">${ep.duration ? ep.duration + "p" : ""}</td>
                      <td>
                        ${(ep.sources || [])
                                            .map(
                                                (src) => `
                              <div>
                                ${esc(src.resolution_type || (src.resolution_id ?? ""))}: 
                                <a href="${esc(src.source_url || "#")}"
                                   target="_blank" rel="noopener">
                                  ${esc(src.source_url || "")}
                                </a>
                              </div>`
                                            )
                                            .join("") || "—"}
                      </td>
                    </tr>`
                                )
                                .join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>`
                    )
                    .join("");
            }
        }

    }

    // === [B2] Lấy dữ liệu và mở modal ===
    async function openView(id) {
        try {
            const data = await mvGetDetail(id); console.table(data);
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

    function setVal(sel, v) {
        const el = qs(sel);
        if (!el) { console.warn('[fillForm] missing', sel); return; }
        el.value = v ?? '';
    }
    function setChecked(sel, v) {
        const el = qs(sel);
        if (!el) { console.warn('[fillForm] missing', sel); return; }
        el.checked = !!v;
    }
    function selectIf(sel, v) { // cho <select>
        const el = qs(sel);
        if (!el) { console.warn('[fillForm] missing', sel); return; }
        if (v !== undefined && v !== null) el.value = String(v);
    }

})();

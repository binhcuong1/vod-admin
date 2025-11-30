(() => {
    const qs = (sel, root = document) => root.querySelector(sel);
    const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const API_BASE = window.API_BASE || "http://localhost:3000";

    const FILMS = () => `${API_BASE}/api/films`;
    const POSTER_TYPES = () => `${API_BASE}/api/postertypes`;
    const POSTERS_BY_FILM = (filmId) => `${API_BASE}/api/posters/film/${filmId}`;
    const POSTER = (id) => `${API_BASE}/api/posters/${id}`;

    let _filmsCache = [];

    // ========== LOAD DANH SÁCH PHIM ==========

    async function loadFilmList(keyword = "") {
        const tbody = qs("#posterFilmTableBody");
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">Đang tải...</td></tr>`;

        try {
            const res = await axios.get(FILMS());
            const rows = res.data?.data ?? res.data ?? [];
            _filmsCache = rows;

            let filtered = rows;
            if (keyword) {
                const kw = keyword.toLowerCase();
                filtered = rows.filter(r =>
                    (r.Film_name || "").toLowerCase().includes(kw)
                );
            }

            if (!filtered.length) {
                tbody.innerHTML =
                    `<tr><td colspan="5" class="text-center py-3 text-muted">Không có dữ liệu</td></tr>`;
                return;
            }

            tbody.innerHTML = "";
            filtered.forEach(f => {
                const tr = document.createElement("tr");

                const typeLabel = f.is_series ? "Series" : "Phim lẻ";
                const premiumLabel = f.is_premium_only
                    ? '<span class="badge badge-warning">Premium only</span>'
                    : '<span class="badge badge-secondary">Free</span>';

                tr.innerHTML = `
                    <td>${f.Film_id}</td>
                    <td>${f.Film_name}</td>
                    <td>${typeLabel}</td>
                    <td>${premiumLabel}</td>
                    <td>
                        <button 
                            class="btn btn-sm btn-primary" 
                            data-action="manage-posters" 
                            data-id="${f.Film_id}">
                            Quản lý poster
                        </button>
                    </td>
                `;

                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error("[posters] loadFilmList error:", err);
            tbody.innerHTML =
                `<tr><td colspan="5" class="text-center py-3 text-danger">Lỗi tải dữ liệu phim</td></tr>`;
        }
    }

    // ========== LOAD POSTER TYPES + POSTERS CỦA MỘT PHIM ==========

    async function loadPosterRowsForFilm(filmId) {
        const tbody = qs("#posterFilmBody");
        if (!tbody) return;
        tbody.innerHTML =
            `<tr><td colspan="4" class="text-center py-3 text-muted">Đang tải...</td></tr>`;

        try {
            const [typesRes, postersRes] = await Promise.all([
                axios.get(POSTER_TYPES()),
                axios.get(POSTERS_BY_FILM(filmId))
            ]);

            const types = typesRes.data?.data ?? typesRes.data ?? [];
            const posters = postersRes.data?.data ?? postersRes.data ?? [];

            if (!types.length) {
                tbody.innerHTML =
                    `<tr><td colspan="4" class="text-center py-3 text-muted">Chưa có loại poster nào. Hãy tạo ở mục Poster Type.</td></tr>`;
                return;
            }

            tbody.innerHTML = "";
            types.forEach(t => {
                const tr = document.createElement("tr");
                tr.dataset.typeId = t.Postertype_id;

                const existing = posters.find(
                    p => p.Postertype_id === t.Postertype_id
                );

                const urlVal = existing ? (existing.Poster_url || "") : "";
                const posterId = existing ? existing.Poster_id : "";

                tr.dataset.posterId = posterId;

                tr.innerHTML = `
                    <td>${t.Postertype_name}</td>
                    <td>
                        <input type="text" 
                            class="form-control form-control-sm poster-url-input" 
                            value="${urlVal}"
                            placeholder="https://...">
                    </td>
                    <td class="text-center">
                        <img 
                            class="poster-preview-img"
                            src="${urlVal || ""}" 
                            style="max-height:100px;border-radius:4px;max-width:100%;">
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-success mb-1 btn-save-poster">Lưu</button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-poster">Xóa</button>
                    </td>
                `;

                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error("[posters] loadPosterRowsForFilm error:", err);
            tbody.innerHTML =
                `<tr><td colspan="4" class="text-center py-3 text-danger">Lỗi tải dữ liệu poster</td></tr>`;
        }
    }

    // ========== SAVE / DELETE POSTER CHO 1 LOẠI ==========

    async function savePosterForRow(filmId, tr) {
        const typeId = Number(tr.dataset.typeId);
        const posterId = tr.dataset.posterId || "";
        const urlInput = tr.querySelector(".poster-url-input");
        const url = urlInput.value.trim();

        const previewImg = tr.querySelector(".poster-preview-img");
        if (previewImg) previewImg.src = url;

        if (!url) {
            // Nếu không có URL mà lại có posterId -> delete
            if (posterId) {
                if (!confirm("Xóa poster cho loại này?")) return;
                try {
                    await axios.delete(POSTER(posterId));
                    tr.dataset.posterId = "";
                } catch (err) {
                    console.error("[posters] delete poster error:", err);
                    alert("Xóa poster thất bại.");
                }
            }
            return;
        }

        const payload = {
            film_id: filmId,
            postertype_id: typeId,
            poster_url: url
        };

        try {
            if (posterId) {
                // update
                await axios.put(POSTER(posterId), payload);
            } else {
                // create
                const res = await axios.post(`${API_BASE}/api/posters`, payload);
                const created = res.data;
                // cố gắng gán lại posterId nếu BE trả về
                const newId =
                    created?.id ||
                    created?.Poster_id ||
                    created?.data?.Poster_id;
                if (newId) tr.dataset.posterId = newId;
            }
        } catch (err) {
            console.error("[posters] savePosterForRow error:", err);
            alert("Lưu poster thất bại.");
        }
    }

    async function deletePosterForRow(tr) {
        const posterId = tr.dataset.posterId || "";
        if (!posterId) {
            // không có poster để xóa -> chỉ clear URL + preview
            const inp = tr.querySelector(".poster-url-input");
            if (inp) inp.value = "";
            const img = tr.querySelector(".poster-preview-img");
            if (img) img.src = "";
            return;
        }

        if (!confirm("Xóa poster cho loại này?")) return;

        try {
            await axios.delete(POSTER(posterId));
            tr.dataset.posterId = "";
            const inp = tr.querySelector(".poster-url-input");
            if (inp) inp.value = "";
            const img = tr.querySelector(".poster-preview-img");
            if (img) img.src = "";
        } catch (err) {
            console.error("[posters] deletePosterForRow error:", err);
            alert("Xóa poster thất bại.");
        }
    }

    // ========== OPEN MODAL QUẢN LÝ POSTER CHO PHIM ==========

    async function openPosterModal(filmId) {
        const film = _filmsCache.find(f => f.Film_id === Number(filmId));
        if (!film) {
            alert("Không tìm thấy phim.");
            return;
        }

        qs("#posterFilmId").value = film.Film_id;
        qs("#posterFilmName").textContent = film.Film_name;
        qs("#posterModalTitle").textContent = `Quản lý poster - ${film.Film_name}`;

        await loadPosterRowsForFilm(film.Film_id);

        if (window.jQuery) {
            jQuery("#posterModal").modal("show");
        } else {
            // fallback nếu không dùng Bootstrap JS
            qs("#posterModal").classList.remove("d-none");
        }
    }

    // ========== BIND EVENTS ==========

    function bindEvents() {
        const tbodyFilms = qs("#posterFilmTableBody");
        if (tbodyFilms) {
            tbodyFilms.addEventListener("click", (e) => {
                const btn = e.target.closest("button[data-action]");
                if (!btn) return;
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === "manage-posters") {
                    openPosterModal(id);
                }
            });
        }

        const btnSearch = qs("#btnPosterFilmSearch");
        if (btnSearch) {
            btnSearch.addEventListener("click", () => {
                const kw = qs("#posterFilmSearchInput")?.value?.trim() || "";
                loadFilmList(kw);
            });
        }

        const searchInput = qs("#posterFilmSearchInput");
        if (searchInput) {
            searchInput.addEventListener("keyup", (e) => {
                if (e.key === "Enter") {
                    const kw = searchInput.value.trim();
                    loadFilmList(kw);
                }
            });
        }

        const tbodyPoster = qs("#posterFilmBody");
        if (tbodyPoster) {
            tbodyPoster.addEventListener("click", (e) => {
                const tr = e.target.closest("tr[data-type-id]");
                if (!tr) return;

                if (e.target.classList.contains("btn-save-poster")) {
                    const filmId = Number(qs("#posterFilmId").value);
                    savePosterForRow(filmId, tr);
                } else if (e.target.classList.contains("btn-delete-poster")) {
                    deletePosterForRow(tr);
                }
            });

            // preview realtime khi gõ URL
            tbodyPoster.addEventListener("input", (e) => {
                if (e.target.classList.contains("poster-url-input")) {
                    const tr = e.target.closest("tr[data-type-id]");
                    const img = tr?.querySelector(".poster-preview-img");
                    if (img) img.src = e.target.value.trim();
                }
            });
        }
    }

    // ========== INIT CHO ROUTER ==========

    async function init() {
        await loadFilmList();
        bindEvents();
        console.log("[posters] PageInits.posters init done");
    }

    window.PageInits = window.PageInits || {};
    window.PageInits.posters = init;

})();

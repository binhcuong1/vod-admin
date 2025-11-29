const REPORTS_API = "http://127.0.0.1:3000/api/reports";

let statsRevenueChart = null;
let statsTopFilmsChart = null;

let statsFilmPage = 1;
const statsFilmLimit = 10;
let statsFilmTotalPages = 1;

function statsFormatMoney(n) {
    if (!n && n !== 0) return "0 đ";
    return Number(n).toLocaleString("vi-VN") + " đ";
}

function statsFormatDuration(seconds) {
    const s = Number(seconds || 0);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}p`;
    return `${minutes}p`;
}

function statsSetAlert(msg) {
    const el = document.getElementById("stats-alert");
    if (!el) return;
    if (!msg) {
        el.classList.add("d-none");
        el.textContent = "";
    } else {
        el.classList.remove("d-none");
        el.textContent = msg;
    }
}

function statsInitYearOptions() {
    const yearSelect = document.getElementById("stats-filter-year");
    if (!yearSelect) return;
    const now = new Date();
    const currentYear = now.getFullYear();
    const minYear = currentYear - 2;
    const maxYear = currentYear + 1;
    yearSelect.innerHTML = '<option value="">Năm...</option>';
    for (let y = minYear; y <= maxYear; y++) {
        const opt = document.createElement("option");
        opt.value = String(y);
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

function statsGetFilterParams() {
    const activeChip = document.querySelector(".stats-filter-chip.active");
    const month = (document.getElementById("stats-filter-month") || {}).value || "";
    const year = (document.getElementById("stats-filter-year") || {}).value || "";
    const from = (document.getElementById("stats-filter-from") || {}).value || "";
    const to = (document.getElementById("stats-filter-to") || {}).value || "";

    const params = {};
    let label = "";

    if (activeChip && activeChip.dataset.range) {
        const d = activeChip.dataset.range;
        params.lastDays = d;
        label = `${d} ngày gần nhất`;
    } else if (month && year) {
        params.month = month;
        params.year = year;
        label = `Tháng ${month}/${year}`;
    } else if (from && to) {
        params.from = from;
        params.to = to;
        label = `Từ ${from} đến ${to}`;
    } else {
        params.lastDays = 30;
        label = "30 ngày gần nhất (mặc định)";
    }

    const lblEl = document.getElementById("stats-filter-label");
    if (lblEl) lblEl.textContent = label;

    return params;
}

async function statsLoadOverview() {
    try {
        statsSetAlert(null);
        const params = statsGetFilterParams();
        const res = await axios.get(`${REPORTS_API}/overview`, { params });
        const data = res.data;

        if (!data || !data.success) {
            statsSetAlert("Không lấy được dữ liệu tổng quan.");
            return;
        }

        const counters = data.counters || {};
        const charts = data.charts || {};
        const topFilms = data.topFilms || [];
        const filter = data.filter || data.filterMeta || data.filterInfo;

        if (filter && filter.label) {
            const lbl = document.getElementById("stats-filter-label");
            if (lbl) lbl.textContent = filter.label;
        }

        const rev = counters.revenue || {};
        const watching = counters.watching || {};
        const cmts = counters.comments || {};

        const elRev = document.getElementById("stat-revenue-total");
        if (elRev) elRev.textContent = statsFormatMoney(rev.total_amount || 0);

        const elRevPay = document.getElementById("stat-revenue-payments");
        if (elRevPay) elRevPay.textContent = `${rev.total_payments || 0} giao dịch`;

        const elPremCur = document.getElementById("stat-premium-current");
        if (elPremCur) elPremCur.textContent = rev.current_premium_accounts || 0;

        const elPremNew = document.getElementById("stat-premium-new");
        if (elPremNew) elPremNew.textContent = `${rev.new_premium_accounts || 0} mới trong kỳ`;

        const elViews = document.getElementById("stat-views-total");
        if (elViews) elViews.textContent = watching.views || 0;

        const elWatch = document.getElementById("stat-watchtime-total");
        if (elWatch) elWatch.textContent =
            statsFormatDuration(watching.total_watch_seconds || 0);

        const elCmtTotal = document.getElementById("stat-comments-total");
        if (elCmtTotal) elCmtTotal.textContent = cmts.total_comments || 0;

        const elCmtNew = document.getElementById("stat-comments-new");
        if (elCmtNew) elCmtNew.textContent = `${cmts.new_comments || 0} mới trong kỳ`;

        const revenueByDay = charts.revenueByDay || [];
        statsRenderRevenueChart(revenueByDay);
        statsRenderTopFilmsChart(topFilms);

    } catch (err) {
        console.error("[stats] loadOverview error:", err);
        statsSetAlert("Lỗi khi tải dữ liệu tổng quan.");
    }
}

function statsRenderRevenueChart(rows) {
    const ctx = document.getElementById("statsRevenueChart");
    if (!ctx) return;
    const labels = rows.map(r => r.label);
    const values = rows.map(r => Number(r.total_amount || 0));

    if (statsRevenueChart) statsRevenueChart.destroy();

    statsRevenueChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Doanh thu (đ)",
                data: values,
                tension: 0.3
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                y: {
                    ticks: {
                        callback: val => Number(val).toLocaleString("vi-VN")
                    }
                }
            }
        }
    });
}

function statsRenderTopFilmsChart(rows) {
    const ctx = document.getElementById("statsTopFilmsChart");
    if (!ctx) return;
    const labels = rows.map(r => r.Film_name || `ID ${r.Film_id}`);
    const values = rows.map(r => Number(r.views || 0));

    if (statsTopFilmsChart) statsTopFilmsChart.destroy();

    statsTopFilmsChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Lượt xem",
                data: values
            }]
        },
        options: {
            indexAxis: "y",
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: {
                        callback: val => Number(val).toLocaleString("vi-VN")
                    }
                }
            }
        }
    });
}

async function statsLoadFilmStats(page = 1) {
    try {
        statsSetAlert(null);
        const params = statsGetFilterParams();

        const sortBy = (document.getElementById("stats-film-sortBy") || {}).value || "views";
        const order = (document.getElementById("stats-film-order") || {}).value || "desc";

        params.page = page;
        params.limit = statsFilmLimit;
        params.sortBy = sortBy;
        params.order = order;

        const res = await axios.get(`${REPORTS_API}/films`, { params });
        const data = res.data;

        if (!data || !data.success) {
            statsSetAlert("Không lấy được thống kê phim.");
            return;
        }

        statsFilmPage = data.page || 1;
        const total = data.total || 0;
        statsFilmTotalPages = Math.max(Math.ceil(total / statsFilmLimit), 1);

        statsRenderFilmTable(data.data || [], statsFilmPage, total);

    } catch (err) {
        console.error("[stats] loadFilmStats error:", err);
        statsSetAlert("Lỗi khi tải thống kê phim.");
    }
}

function statsRenderFilmTable(rows, page, total) {
    const tbody = document.getElementById("stats-film-tbody");
    const summary = document.getElementById("stats-film-summary");
    if (!tbody || !summary) return;

    tbody.innerHTML = "";

    if (!rows.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="12" class="text-center text-muted py-3">
              Không có dữ liệu trong khoảng thời gian này.
            </td>
          </tr>`;
    } else {
        rows.forEach((r, idx) => {
            const tr = document.createElement("tr");
            const stt = (page - 1) * statsFilmLimit + idx + 1;
            const typeLabel = r.is_series ? "Series" : "Phim lẻ";
            const premiumHtml = r.is_premium_only
                ? '<span class="badge badge-warning">Premium</span>'
                : '<span class="badge badge-secondary">Free</span>';
            const rating = r.avg_rating ? Number(r.avg_rating).toFixed(1) : "-";
            const ratingCount = r.rating_count || 0;
            const country = r.Country_name || "-";
            const genres = r.genres || "-";
            const year = r.Release_year || "";

            tr.innerHTML = `
              <td>${stt}</td>
              <td class="font-weight-bold">${r.Film_name || ""}</td>
              <td>${typeLabel}</td>
              <td>${premiumHtml}</td>
              <td>${country}</td>
              <td>${year}</td>
              <td>${genres}</td>
              <td class="text-right">${r.views || 0}</td>
              <td class="text-right">${statsFormatDuration(r.total_watch_seconds || 0)}</td>
              <td class="text-right">${r.favorites || 0}</td>
              <td class="text-right">
                ${rating}
                <span class="text-muted small">(${ratingCount})</span>
              </td>
              <td class="text-right">${r.comments || 0}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    summary.textContent =
        `Trang ${statsFilmPage} / ${statsFilmTotalPages} – ` +
        `${rows.length || 0} / ${total} phim`;
}

function statsBindEvents() {
    document.querySelectorAll(".stats-filter-chip").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".stats-filter-chip").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const m = document.getElementById("stats-filter-month");
            const y = document.getElementById("stats-filter-year");
            const f = document.getElementById("stats-filter-from");
            const t = document.getElementById("stats-filter-to");
            if (m) m.value = "";
            if (y) y.value = "";
            if (f) f.value = "";
            if (t) t.value = "";

            statsFilmPage = 1;
            statsReloadAll();
        });
    });

    const btnApply = document.getElementById("btn-stats-apply-filter");
    if (btnApply) {
        btnApply.addEventListener("click", () => {
            document.querySelectorAll(".stats-filter-chip").forEach(b => b.classList.remove("active"));
            statsFilmPage = 1;
            statsReloadAll();
        });
    }

    const sortSel = document.getElementById("stats-film-sortBy");
    const orderSel = document.getElementById("stats-film-order");
    if (sortSel) sortSel.addEventListener("change", () => {
        statsFilmPage = 1;
        statsLoadFilmStats(statsFilmPage);
    });
    if (orderSel) orderSel.addEventListener("change", () => {
        statsFilmPage = 1;
        statsLoadFilmStats(statsFilmPage);
    });

    const btnPrev = document.getElementById("stats-film-prev");
    const btnNext = document.getElementById("stats-film-next");
    if (btnPrev) {
        btnPrev.addEventListener("click", () => {
            if (statsFilmPage > 1) {
                statsFilmPage--;
                statsLoadFilmStats(statsFilmPage);
            }
        });
    }
    if (btnNext) {
        btnNext.addEventListener("click", () => {
            if (statsFilmPage < statsFilmTotalPages) {
                statsFilmPage++;
                statsLoadFilmStats(statsFilmPage);
            }
        });
    }
}

function statsReloadAll() {
    statsLoadOverview();
    statsLoadFilmStats(statsFilmPage);
}

// Đăng ký với SPA router
window.PageInits = window.PageInits || {};
window.PageInits.stats = function () {
    console.log("[stats] PageInits.stats() called");

    // đảm bảo đang ở đúng trang (có filter label)
    if (!document.getElementById("stats-filter-label")) {
        console.warn("[stats] stats-filter-label not found, skip init");
        return;
    }

    statsInitYearOptions();

    const firstChip = document.querySelector('.stats-filter-chip[data-range="7"]');
    if (firstChip) firstChip.classList.add("active");

    statsBindEvents();
    statsReloadAll();
};

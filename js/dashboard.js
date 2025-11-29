(function () {
    "use strict";

    // Base API
    const DASHBOARD_API = "http://127.0.0.1:3000/api/dashboard";

    // Helpers
    const $ = (sel) => document.querySelector(sel);

    function formatCurrency(n) {
        if (!n && n !== 0) return "0 đ";
        return Number(n).toLocaleString("vi-VN") + " đ";
    }

    // Chart instances
    let chartTopFilms = null;
    let chartRevenue = null;
    let chartGenre = null;
    let chartCountry = null;

    // ============================
    // 1. KPI Cards
    // ============================
    async function loadStats() {
        try {
            const res = await axios.get(`${DASHBOARD_API}/stats`);
            const data = res.data?.data || {};

            const elFilms = $("#stat-total-films");
            const elAcc = $("#stat-total-accounts");
            const elProfiles = $("#stat-total-profiles");
            const elPrem = $("#stat-premium-active");
            const elRev = $("#stat-revenue-month");
            const elCmt = $("#stat-comments-7d");
            const elViews = $("#stat-views-7d");

            if (!elFilms || !elAcc || !elProfiles || !elPrem || !elRev || !elCmt || !elViews) {
                console.warn("[dashboard] KPI elements not found, skip loadStats");
                return;
            }

            elFilms.textContent = data.total_films ?? 0;
            elAcc.textContent = data.total_accounts ?? 0;
            elProfiles.textContent = data.total_profiles ?? 0;
            elPrem.textContent = data.premium_active ?? 0;

            elRev.textContent = formatCurrency(data.revenue_this_month ?? 0);
            elCmt.textContent = data.comments_7_days ?? 0;
            elViews.textContent = data.views_7_days ?? 0;
        } catch (err) {
            console.error("[dashboard] loadStats error:", err);
        }
    }


    // ============================
    // 2. Top Films (views)
    // ============================
    async function loadTopFilms() {
        const canvas = $("#chartTopFilms");
        if (!canvas || !window.Chart) return;

        try {
            const res = await axios.get(`${DASHBOARD_API}/top-films`, {
                params: { type: "views", limit: 5 },
            });

            const rows = res.data?.data || [];
            const labels = rows.map((r) => r.Film_name);
            const values = rows.map((r) => r.view_count || 0);

            if (chartTopFilms) chartTopFilms.destroy();

            chartTopFilms = new Chart(canvas, {
                type: "bar",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Lượt xem",
                            data: values,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true },
                    },
                    scales: {
                        x: {
                            ticks: { maxRotation: 45, minRotation: 0 },
                        },
                        y: {
                            beginAtZero: true,
                        },
                    },
                },
            });
        } catch (err) {
            console.error("[dashboard] loadTopFilms error:", err);
        }
    }

    // ============================
    // 3. Genre Distribution
    // ============================
    async function loadGenreDistribution() {
        const canvas = $("#chartGenre");
        if (!canvas || !window.Chart) return;

        try {
            const res = await axios.get(`${DASHBOARD_API}/genre-distribution`);
            const rows = res.data?.data || [];

            $("#stat-total-genres").textContent = rows.length || 0;

            const labels = rows.map((r) => r.Genre_name);
            const values = rows.map((r) => r.film_count || 0);

            if (chartGenre) chartGenre.destroy();

            chartGenre = new Chart(canvas, {
                type: "doughnut",
                data: {
                    labels,
                    datasets: [
                        { data: values },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "bottom" },
                    },
                },
            });
        } catch (err) {
            console.error("[dashboard] loadGenreDistribution error:", err);
        }
    }

    // ============================
    // 4. Country Distribution
    // ============================
    async function loadCountryDistribution() {
        const canvas = $("#chartCountry");
        if (!canvas || !window.Chart) return;

        try {
            const res = await axios.get(`${DASHBOARD_API}/country-distribution`);
            const rows = res.data?.data || [];

            const labels = rows.map((r) => r.Country_name);
            const values = rows.map((r) => r.film_count || 0);

            if (chartCountry) chartCountry.destroy();

            chartCountry = new Chart(canvas, {
                type: "pie",
                data: {
                    labels,
                    datasets: [
                        { data: values },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "bottom" },
                    },
                },
            });
        } catch (err) {
            console.error("[dashboard] loadCountryDistribution error:", err);
        }
    }

    // ============================
    // 5. Revenue Line Chart (30 days)
    // ============================
    async function loadRevenueTrend() {
        const canvas = $("#chartRevenue");
        if (!canvas || !window.Chart) return;

        try {
            const res = await axios.get(`${DASHBOARD_API}/revenue`, {
                params: { days: 30 },
            });

            const rows = res.data?.data || [];
            const labels = rows.map((r) => r.day);
            const values = rows.map((r) => r.total_amount || 0);

            if (chartRevenue) chartRevenue.destroy();

            chartRevenue = new Chart(canvas, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Doanh thu (đ)",
                            data: values,
                            fill: false,
                            tension: 0.2,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => formatCurrency(ctx.parsed.y),
                            },
                        },
                    },
                    scales: {
                        y: { beginAtZero: true },
                    },
                },
            });
        } catch (err) {
            console.error("[dashboard] loadRevenueTrend error:", err);
        }
    }

    // ============================
    // INIT
    // ============================
    async function initDashboard() {
        await loadStats();
        loadTopFilms();
        loadGenreDistribution();
        loadCountryDistribution();
        loadRevenueTrend();
    }

    window.PageInits = window.PageInits || {};
    window.PageInits.dashboard = function () {
        if (!document.getElementById("stat-total-films")) {
            console.warn("[dashboard] stat-total-films not found, skip initDashboard");
            return;
        }
        initDashboard();
    };

})();

// Đặt cấu hình dùng chung cho toàn admin
window.API_BASE = "http://127.0.0.1:3000";
window.API_GENRE = "/api/genres";
window.API_MOVIE = "/api/films";

const FILM_DETAIL = (id) => `${API_BASE}/api/films/${id}/detail`; 

async function mvGetDetail(id) {
    const r = await axios.get(FILM_DETAIL(id));
    return r.data?.data ?? r.data;
}
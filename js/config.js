// Đặt cấu hình dùng chung cho toàn admin
window.API_BASE = "http://127.0.0.1:3000";   
window.API_GENRE = "/api/genres";  
window.API_MOVIE = "/api/films";
window.API_COUNTRY = "/api/countries"; 
window.API_POSTERTYPE = "/api/postertypes"; 
window.API_RESOLUTION = "/api/resolutions";                
window.API_GENRE = "/api/genres";       
window.API_ACTOR = "/api/actors";  
window.API_ACCOUNT = "/api/accounts";   
window.API_PROFILE = "/api/profiles";

const FILM_DETAIL = (id) => `${API_BASE}/api/films/${id}/detail`; 

async function mvGetDetail(id) {
    const r = await axios.get(FILM_DETAIL(id));
    return r.data?.data ?? r.data;
}

// SPA-lite: nạp partial vào #main

const container = document.getElementById('main');

async function loadPartial(url, initKey, push = true) {
    const res = await fetch(url, { cache: 'no-cache' });
    const html = await res.text();
    container.innerHTML = html;

    // gọi init trang nếu có
    if (window.PageInits && typeof window.PageInits[initKey] === 'function') {
        setTimeout(() => window.PageInits[initKey](), 0);
    }

    // set active menu
    setActiveLink(initKey);

    if (push) history.pushState({ url, initKey }, '', location.origin + location.pathname + '#/' + initKey);
}

// Bắt click những link có data-partial
document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-partial]');
    if (!a) return;
    e.preventDefault();
    loadPartial(a.dataset.partial, a.dataset.init, true);
});

window.addEventListener('popstate', (e) => {
    if (e.state) loadPartial(e.state.url, e.state.initKey, false);
});

function setActiveLink(initKey) {
    document.querySelectorAll('#accordionSidebar .nav-link, #accordionSidebar .collapse-item')
        .forEach(el => el.classList.remove('active'));
    const link = document.querySelector(`[data-init="${initKey}"]`);
    if (link) {
        link.classList.add('active');
        // mở nhóm collapse chứa link
        const parentCollapse = link.closest('.collapse');
        if (parentCollapse && !parentCollapse.classList.contains('show')) {
            $(parentCollapse).collapse('show');
        }
    }
}

// Khởi động theo hash
(function boot() {
    const hash = location.hash.replace('#/', '').trim();
    if (hash) {
        const link = document.querySelector(`[data-init="${hash}"]`);
        if (link) loadPartial(link.dataset.partial, hash, false);
        else container.innerHTML = '<div class="alert alert-info">Chọn một mục ở sidebar</div>';
    } else {
        container.innerHTML = '<div class="alert alert-info">Chọn một mục ở sidebar</div>';
    }
})();
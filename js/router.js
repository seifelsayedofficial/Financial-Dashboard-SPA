const pages = {};
let currentPage = null;

export const Router = {
    register(name, mod) { pages[name] = mod; },

    async navigate(page, params = {}) {
        const mod = pages[page];
        if (!mod) return;

        const app = document.getElementById('app');
        const titles = {
            dashboard: 'لوحة التحكم',
            'client-invoices': 'فواتير العملاء',
            'shipping-invoices': 'فواتير النقل',
            'bank-transfers': 'التحويلات البنكية',
            'account-statement': 'كشف حساب',
            admin: 'الإدارة'
        };

        // highlight nav
        document.querySelectorAll('.nav-item').forEach(el => {
            const active = el.dataset.page === page;
            el.classList.toggle('bg-slate-700', active);
            el.classList.toggle('text-white', active);
            el.classList.toggle('text-slate-400', !active);
        });

        document.getElementById('page-title').textContent = titles[page] || '';

        // fade out
        app.style.transition = 'opacity .2s ease, transform .2s ease';
        app.style.opacity = '0';
        app.style.transform = 'translateY(8px)';
        await new Promise(r => setTimeout(r, 220));

        // render
        app.innerHTML = mod.render(params);

        // fade in
        requestAnimationFrame(() => {
            app.style.opacity = '1';
            app.style.transform = 'translateY(0)';
        });

        if (mod.init) setTimeout(() => mod.init(params), 60);
        if (window.lucide) lucide.createIcons();

        currentPage = page;
        history.replaceState(null, '', '#' + page);
    },

    current() { return currentPage; },

    boot() {
        const hash = location.hash.replace('#', '') || 'dashboard';
        this.navigate(hash);
    }
};

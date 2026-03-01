/* ============================================
   PRIMULA GESTIONALE — App Core (Router, UI, Utils)
   ============================================ */

const App = {
    currentPage: 'dashboard',

    // --- Inizializzazione ---
    init() {
        DB.seedDemoData();
        this.setupNavigation();
        this.setupModal();
        this.setupSidebar();
        this.updateDate();
        this.navigate('dashboard');
    },

    // --- Controllo accesso pagina ---
    checkPageAccess(page) {
        // Pagina utenti solo per admin
        if (page === 'utenti' && !Auth.isAdmin()) {
            this.toast('Accesso non autorizzato', 'error');
            this.navigate('dashboard');
            return false;
        }
        return true;
    },

    // --- Navigazione ---
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigate(page);
            });
        });
    },

    navigate(page) {
        // Controllo accesso
        if (!this.checkPageAccess(page)) return;

        this.currentPage = page;

        // Aggiorna nav attiva
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Titoli pagina
        const titles = {
            dashboard: 'Dashboard',
            clienti: 'Clienti',
            dipendenti: 'Dipendenti',
            pianificazione: 'Pianificazione',
            preventivi: 'Preventivi',
            fatturazione: 'Fatturazione',
            magazzino: 'Magazzino',
            report: 'Report',
            utenti: 'Gestione Utenti',
        };

        document.getElementById('pageTitle').textContent = titles[page] || page;

        // Chiudi sidebar su mobile
        this.closeSidebar();

        // Renderizza pagina
        this.renderPage(page);
    },

    renderPage(page) {
        const renderers = {
            dashboard: () => Dashboard.render(),
            clienti: () => Clienti.render(),
            dipendenti: () => Dipendenti.render(),
            pianificazione: () => Pianificazione.render(),
            preventivi: () => Preventivi.render(),
            fatturazione: () => Fatturazione.render(),
            magazzino: () => Magazzino.render(),
            report: () => Report.render(),
            utenti: () => Auth.renderUtenti(),
        };

        if (renderers[page]) {
            renderers[page]();
        }
    },

    // --- Sidebar mobile ---
    setupSidebar() {
        const toggle = document.getElementById('menuToggle');
        const close = document.getElementById('sidebarClose');
        const overlay = document.getElementById('sidebarOverlay');

        toggle.addEventListener('click', () => this.openSidebar());
        close.addEventListener('click', () => this.closeSidebar());
        overlay.addEventListener('click', () => this.closeSidebar());
    },

    openSidebar() {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('active');
    },

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    },

    // --- Modal ---
    setupModal() {
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalOverlay')) {
                this.closeModal();
            }
        });
    },

    openModal(title, bodyHtml, footerHtml) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHtml;
        document.getElementById('modalFooter').innerHTML = footerHtml || '';
        document.getElementById('modalOverlay').classList.add('active');
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    },

    // --- Toast ---
    toast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = '0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // --- Data helpers ---
    updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('it-IT', options);
    },

    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
    },

    // --- Content render helper ---
    setContent(html) {
        document.getElementById('contentArea').innerHTML = html;
    },

    // --- Export helper ---
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    // --- Confirm dialog ---
    confirm(message) {
        return window.confirm(message);
    },

    // --- Escape HTML ---
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Avvio applicazione — passa per Auth che decide se mostrare login o app
document.addEventListener('DOMContentLoaded', () => Auth.init());

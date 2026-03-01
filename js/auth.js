/* ============================================
   PRIMULA GESTIONALE — Auth Module
   Autenticazione, sessione, gestione utenti
   ============================================ */

const Auth = {
    STORAGE_KEY: 'primula_utenti',
    SESSION_KEY: 'primula_session',

    // --- Utente corrente ---
    currentUser: null,

    // --- Inizializzazione ---
    init() {
        this.seedDefaultAdmin();
        const session = this.getSession();
        if (session) {
            this.currentUser = session;
            this.showApp();
        } else {
            this.showLogin();
        }
    },

    // --- Crea admin di default se non esiste ---
    seedDefaultAdmin() {
        const users = this.getUsers();
        if (users.length === 0) {
            this.saveUsers([{
                id: 'admin_default',
                username: 'admin',
                passwordHash: this.hashPassword('admin'),
                nome: 'Amministratore',
                ruolo: 'admin',
                attivo: true,
                createdAt: new Date().toISOString(),
            }]);
        }
    },

    // --- Hash password (SHA-256 semplificato con salt statico per demo) ---
    hashPassword(password) {
        let hash = 0;
        const salted = 'primula_salt_' + password;
        for (let i = 0; i < salted.length; i++) {
            const char = salted.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(36);
    },

    // --- CRUD utenti ---
    getUsers() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveUsers(users) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    },

    getUserById(id) {
        return this.getUsers().find(u => u.id === id) || null;
    },

    addUser(userData) {
        const users = this.getUsers();
        if (users.find(u => u.username === userData.username)) {
            return { error: 'Username gia\' in uso' };
        }
        const user = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
            username: userData.username,
            passwordHash: this.hashPassword(userData.password),
            nome: userData.nome,
            ruolo: userData.ruolo || 'operatore',
            dipendenteId: userData.dipendenteId || null,
            attivo: true,
            createdAt: new Date().toISOString(),
        };
        users.push(user);
        this.saveUsers(users);
        return user;
    },

    updateUser(id, updates) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index === -1) return null;

        if (updates.username && updates.username !== users[index].username) {
            if (users.find(u => u.username === updates.username && u.id !== id)) {
                return { error: 'Username gia\' in uso' };
            }
        }

        if (updates.password) {
            updates.passwordHash = this.hashPassword(updates.password);
            delete updates.password;
        }

        users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
        this.saveUsers(users);
        return users[index];
    },

    removeUser(id) {
        if (id === 'admin_default') return false;
        if (this.currentUser && this.currentUser.id === id) return false;
        const users = this.getUsers().filter(u => u.id !== id);
        this.saveUsers(users);
        return true;
    },

    // --- Sessione ---
    getSession() {
        const data = sessionStorage.getItem(this.SESSION_KEY);
        return data ? JSON.parse(data) : null;
    },

    setSession(user) {
        const sessionData = {
            id: user.id,
            username: user.username,
            nome: user.nome,
            ruolo: user.ruolo,
            dipendenteId: user.dipendenteId || null,
        };
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
        this.currentUser = sessionData;
    },

    clearSession() {
        sessionStorage.removeItem(this.SESSION_KEY);
        this.currentUser = null;
    },

    // --- Login ---
    login(username, password) {
        const users = this.getUsers();
        const hash = this.hashPassword(password);
        const user = users.find(u => u.username === username && u.passwordHash === hash && u.attivo);
        if (!user) return false;
        this.setSession(user);
        return true;
    },

    logout() {
        this.clearSession();
        this.showLogin();
    },

    // --- Permessi ---
    isAdmin() {
        return this.currentUser && this.currentUser.ruolo === 'admin';
    },

    isLoggedIn() {
        return !!this.currentUser;
    },

    // --- UI: Schermata di login ---
    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appShell').style.display = 'none';

        const form = document.getElementById('loginForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleLogin();
            };
        }

        // Reset campi
        const uField = document.getElementById('loginUsername');
        const pField = document.getElementById('loginPassword');
        const errEl = document.getElementById('loginError');
        if (uField) uField.value = '';
        if (pField) pField.value = '';
        if (errEl) errEl.textContent = '';

        // Focus
        setTimeout(() => { if (uField) uField.focus(); }, 100);
    },

    handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errEl = document.getElementById('loginError');

        if (!username || !password) {
            errEl.textContent = 'Inserire username e password';
            return;
        }

        if (this.login(username, password)) {
            this.showApp();
        } else {
            errEl.textContent = 'Credenziali non valide o utente disattivato';
            document.getElementById('loginPassword').value = '';
        }
    },

    // --- UI: Mostra applicazione ---
    showApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appShell').style.display = 'contents';

        // Aggiorna info utente in topbar e sidebar
        this.updateUserUI();

        // Configura visibilita' link admin
        this.updateNavVisibility();

        // Avvia l'app
        App.init();
    },

    updateUserUI() {
        const el = document.getElementById('userDisplayName');
        if (el && this.currentUser) {
            el.textContent = this.currentUser.nome || this.currentUser.username;
        }
        const roleEl = document.getElementById('userDisplayRole');
        if (roleEl && this.currentUser) {
            roleEl.textContent = this.currentUser.ruolo === 'admin' ? 'Amministratore' : this.currentUser.ruolo === 'manager' ? 'Manager' : 'Operatore';
        }
    },

    updateNavVisibility() {
        const utentiNav = document.querySelector('[data-page="utenti"]');
        if (utentiNav) {
            utentiNav.style.display = this.isAdmin() ? 'flex' : 'none';
        }

        // "I Miei Lavori" visibile se l'utente ha un dipendente collegato
        const lavoriNav = document.querySelector('[data-page="imiei-lavori"]');
        const separator = document.querySelector('.sidebar-nav-separator');
        if (lavoriNav) {
            const user = this.currentUser ? this.getUserById(this.currentUser.id) : null;
            const hasDipendente = user && user.dipendenteId;
            lavoriNav.style.display = hasDipendente ? 'flex' : 'none';
            if (separator) separator.style.display = hasDipendente ? 'block' : 'none';
        }
    },

    // --- Pagina gestione utenti (solo admin) ---
    renderUtenti() {
        if (!this.isAdmin()) {
            App.setContent('<div class="empty-state"><div class="empty-state-icon">&#9888;</div><div class="empty-state-text">Accesso non autorizzato</div></div>');
            return;
        }

        const users = this.getUsers();

        const html = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <span class="text-muted">Gestione account utente del gestionale</span>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary" onclick="Auth.openUserForm()">+ Nuovo Utente</button>
                </div>
            </div>

            <div class="section-card">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Nome</th>
                                <th>Ruolo</th>
                                <th>Dipendente</th>
                                <th>Stato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => {
                                const dip = u.dipendenteId ? DB.getById(DB.KEYS.dipendenti, u.dipendenteId) : null;
                                const dipNome = dip ? `${dip.nome} ${dip.cognome}` : '—';
                                return `
                                <tr>
                                    <td><strong>${App.escapeHtml(u.username)}</strong></td>
                                    <td>${App.escapeHtml(u.nome || '—')}</td>
                                    <td><span class="badge badge-${u.ruolo === 'admin' ? 'danger' : u.ruolo === 'manager' ? 'warning' : 'info'}">${u.ruolo}</span></td>
                                    <td>${App.escapeHtml(dipNome)}</td>
                                    <td><span class="badge badge-${u.attivo ? 'success' : 'neutral'}">${u.attivo ? 'Attivo' : 'Disattivato'}</span></td>
                                    <td class="actions-cell">
                                        <button class="btn btn-sm btn-primary" onclick="Auth.openUserForm('${u.id}')">Modifica</button>
                                        ${u.id !== 'admin_default' && u.id !== Auth.currentUser.id ? `
                                            <button class="btn btn-sm btn-danger" onclick="Auth.deleteUser('${u.id}')">Elimina</button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section-card">
                <div class="section-header">
                    <h3 class="section-title">Credenziali di default</h3>
                </div>
                <div class="section-body">
                    <p class="text-muted">L'account amministratore predefinito &egrave;: <strong>admin</strong> / <strong>admin</strong>.</p>
                    <p class="text-muted">Si consiglia di cambiare la password al primo accesso.</p>
                </div>
            </div>
        `;

        App.setContent(html);
    },

    openUserForm(id = null) {
        const user = id ? this.getUserById(id) : null;
        const isEdit = !!user;
        const dipendenti = DB.getDipendenti();

        const body = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Username *</label>
                    <input type="text" id="fUsername" value="${App.escapeHtml(user?.username || '')}" ${isEdit && user.id === 'admin_default' ? 'readonly style="background:#f5f5f5;"' : ''} autocomplete="off">
                </div>
                <div class="form-group">
                    <label>Nome completo</label>
                    <input type="text" id="fUserNome" value="${App.escapeHtml(user?.nome || '')}">
                </div>
                <div class="form-group">
                    <label>${isEdit ? 'Nuova password (lasciare vuoto per non cambiare)' : 'Password *'}</label>
                    <input type="password" id="fUserPassword" value="" autocomplete="new-password">
                </div>
                <div class="form-group">
                    <label>Conferma password</label>
                    <input type="password" id="fUserPasswordConfirm" value="" autocomplete="new-password">
                </div>
                <div class="form-group">
                    <label>Ruolo</label>
                    <select id="fUserRuolo">
                        <option value="operatore" ${user?.ruolo === 'operatore' ? 'selected' : ''}>Operatore</option>
                        <option value="manager" ${user?.ruolo === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="admin" ${user?.ruolo === 'admin' ? 'selected' : ''}>Amministratore</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Stato</label>
                    <select id="fUserAttivo">
                        <option value="true" ${user?.attivo !== false ? 'selected' : ''}>Attivo</option>
                        <option value="false" ${user?.attivo === false ? 'selected' : ''}>Disattivato</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Dipendente associato</label>
                    <select id="fUserDipendente">
                        <option value="">— Nessun collegamento —</option>
                        ${dipendenti.map(d => `<option value="${d.id}" ${user?.dipendenteId === d.id ? 'selected' : ''}>${App.escapeHtml(d.nome)} ${App.escapeHtml(d.cognome)} (${d.ruolo || '—'})</option>`).join('')}
                    </select>
                    <small style="color:var(--text-secondary);margin-top:2px;">Collega questo account a un dipendente per abilitare "I Miei Lavori"</small>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="Auth.saveUser('${id || ''}')">${isEdit ? 'Aggiorna' : 'Crea Utente'}</button>
        `;

        App.openModal(isEdit ? 'Modifica Utente' : 'Nuovo Utente', body, footer);
    },

    saveUser(id) {
        const username = document.getElementById('fUsername').value.trim();
        const nome = document.getElementById('fUserNome').value.trim();
        const password = document.getElementById('fUserPassword').value;
        const passwordConfirm = document.getElementById('fUserPasswordConfirm').value;
        const ruolo = document.getElementById('fUserRuolo').value;
        const attivo = document.getElementById('fUserAttivo').value === 'true';
        const dipendenteId = document.getElementById('fUserDipendente').value || null;

        if (!username) {
            App.toast('Inserire un username', 'error');
            return;
        }

        if (password && password !== passwordConfirm) {
            App.toast('Le password non coincidono', 'error');
            return;
        }

        if (id) {
            const updates = { username, nome, ruolo, attivo, dipendenteId };
            if (password) updates.password = password;
            const result = this.updateUser(id, updates);
            if (result && result.error) {
                App.toast(result.error, 'error');
                return;
            }
            App.toast('Utente aggiornato');
        } else {
            if (!password) {
                App.toast('Inserire una password', 'error');
                return;
            }
            if (password.length < 3) {
                App.toast('La password deve avere almeno 3 caratteri', 'error');
                return;
            }
            const result = this.addUser({ username, password, nome, ruolo, dipendenteId });
            if (result && result.error) {
                App.toast(result.error, 'error');
                return;
            }
            App.toast('Utente creato');
        }

        App.closeModal();
        this.renderUtenti();
    },

    deleteUser(id) {
        if (App.confirm('Eliminare questo utente?')) {
            if (this.removeUser(id)) {
                App.toast('Utente eliminato');
                this.renderUtenti();
            } else {
                App.toast('Impossibile eliminare questo utente', 'error');
            }
        }
    },

    // --- Cambio password per l'utente corrente ---
    openChangePassword() {
        const body = `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Password attuale *</label>
                    <input type="password" id="fOldPassword" autocomplete="current-password">
                </div>
                <div class="form-group">
                    <label>Nuova password *</label>
                    <input type="password" id="fNewPassword" autocomplete="new-password">
                </div>
                <div class="form-group">
                    <label>Conferma nuova password *</label>
                    <input type="password" id="fNewPasswordConfirm" autocomplete="new-password">
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="Auth.saveChangePassword()">Cambia Password</button>
        `;

        App.openModal('Cambia Password', body, footer);
    },

    saveChangePassword() {
        const oldPwd = document.getElementById('fOldPassword').value;
        const newPwd = document.getElementById('fNewPassword').value;
        const confirmPwd = document.getElementById('fNewPasswordConfirm').value;

        if (!oldPwd || !newPwd) {
            App.toast('Compilare tutti i campi', 'error');
            return;
        }

        // Verifica password attuale
        const user = this.getUsers().find(u => u.id === this.currentUser.id);
        if (!user || user.passwordHash !== this.hashPassword(oldPwd)) {
            App.toast('Password attuale non corretta', 'error');
            return;
        }

        if (newPwd !== confirmPwd) {
            App.toast('Le nuove password non coincidono', 'error');
            return;
        }

        if (newPwd.length < 3) {
            App.toast('La password deve avere almeno 3 caratteri', 'error');
            return;
        }

        this.updateUser(this.currentUser.id, { password: newPwd });
        App.toast('Password aggiornata');
        App.closeModal();
    }
};

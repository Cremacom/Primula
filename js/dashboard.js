/* ============================================
   PRIMULA GESTIONALE — Dashboard Module
   ============================================ */

const Dashboard = {
    render() {
        const stats = DB.getStats();
        const interventiOggi = stats.interventiOggiList || [];
        const scorteBasse = DB.getProdottiScortaBassa();
        const preventiviRecenti = DB.getPreventivi().slice(-5).reverse();
        const fattureRecenti = DB.getFatture().slice(-5).reverse();

        const html = `
            <!-- Statistiche -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon green">&#9752;</div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.interventiOggi}</span>
                        <span class="stat-label">Interventi oggi</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">&#9823;</div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.totaleClienti}</span>
                        <span class="stat-label">Clienti attivi</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">&#8364;</div>
                    <div class="stat-info">
                        <span class="stat-value">${App.formatCurrency(stats.fatturatoMese)}</span>
                        <span class="stat-label">Fatturato mese</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">&#9888;</div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.prodottiScortaBassa}</span>
                        <span class="stat-label">Scorte basse</span>
                    </div>
                </div>
            </div>

            <!-- Riepilogo aggiuntivo -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon green">&#9881;</div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.totaleDipendenti}</span>
                        <span class="stat-label">Dipendenti</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">&#9998;</div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.preventiviInAttesa}</span>
                        <span class="stat-label">Preventivi in attesa</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">&#9670;</div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.interventiMese}</span>
                        <span class="stat-label">Interventi mese</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">&#8364;</div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.fattureScadute}</span>
                        <span class="stat-label">Fatture scadute</span>
                    </div>
                </div>
            </div>

            <div class="dashboard-grid">
                <!-- Interventi di oggi -->
                <div class="section-card">
                    <div class="section-header">
                        <h3 class="section-title">Interventi di oggi</h3>
                    </div>
                    <div class="section-body">
                        ${interventiOggi.length > 0 ? `
                            <ul class="recent-list">
                                ${interventiOggi.map(i => `
                                    <li>
                                        <div>
                                            <strong>${App.escapeHtml(i.clienteNome)}</strong><br>
                                            <small class="text-muted">${i.ora || ''} — ${App.escapeHtml(i.dipendentiNomi || '')}</small>
                                        </div>
                                        <span class="badge badge-${this.getStatoBadge(i.stato)}">${i.stato}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : '<div class="empty-state"><div class="empty-state-text">Nessun intervento programmato per oggi</div></div>'}
                    </div>
                </div>

                <!-- Scorte basse -->
                <div class="section-card">
                    <div class="section-header">
                        <h3 class="section-title">Scorte basse</h3>
                    </div>
                    <div class="section-body">
                        ${scorteBasse.length > 0 ? `
                            <ul class="recent-list">
                                ${scorteBasse.map(p => `
                                    <li>
                                        <div>
                                            <strong>${App.escapeHtml(p.nome)}</strong><br>
                                            <small class="text-muted">${p.categoria}</small>
                                        </div>
                                        <span class="stock-low">${p.quantita} ${p.unita}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : '<div class="empty-state"><div class="empty-state-text">Tutte le scorte sono in ordine</div></div>'}
                    </div>
                </div>

                <!-- Preventivi recenti -->
                <div class="section-card">
                    <div class="section-header">
                        <h3 class="section-title">Ultimi preventivi</h3>
                    </div>
                    <div class="section-body">
                        ${preventiviRecenti.length > 0 ? `
                            <ul class="recent-list">
                                ${preventiviRecenti.map(p => `
                                    <li>
                                        <div>
                                            <strong>#${p.numero} — ${App.escapeHtml(p.clienteNome)}</strong><br>
                                            <small class="text-muted">${App.formatDate(p.data)} — ${App.formatCurrency(p.totale)}</small>
                                        </div>
                                        <span class="badge badge-${this.getPrevStatoBadge(p.stato)}">${p.stato}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : '<div class="empty-state"><div class="empty-state-text">Nessun preventivo</div></div>'}
                    </div>
                </div>

                <!-- Fatture recenti -->
                <div class="section-card">
                    <div class="section-header">
                        <h3 class="section-title">Ultime fatture</h3>
                    </div>
                    <div class="section-body">
                        ${fattureRecenti.length > 0 ? `
                            <ul class="recent-list">
                                ${fattureRecenti.map(f => `
                                    <li>
                                        <div>
                                            <strong>#${f.numero} — ${App.escapeHtml(f.clienteNome)}</strong><br>
                                            <small class="text-muted">${App.formatDate(f.data)} — ${App.formatCurrency(f.totale)}</small>
                                        </div>
                                        <span class="badge badge-${this.getFattStatoBadge(f.stato)}">${f.stato}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : '<div class="empty-state"><div class="empty-state-text">Nessuna fattura</div></div>'}
                    </div>
                </div>
            </div>
        `;

        App.setContent(html);
    },

    getStatoBadge(stato) {
        const map = { programmato: 'info', 'in corso': 'warning', completato: 'success', annullato: 'danger' };
        return map[stato] || 'neutral';
    },

    getPrevStatoBadge(stato) {
        const map = { bozza: 'neutral', inviato: 'info', accettato: 'success', rifiutato: 'danger' };
        return map[stato] || 'neutral';
    },

    getFattStatoBadge(stato) {
        const map = { pagato: 'success', in_attesa: 'warning', scaduto: 'danger' };
        return map[stato] || 'neutral';
    }
};

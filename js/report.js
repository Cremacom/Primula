/* ============================================
   PRIMULA GESTIONALE — Report Module
   ============================================ */

const Report = {
    render() {
        const html = `
            <div class="tabs">
                <button class="tab active" onclick="Report.showTab('fatturato', this)">Fatturato</button>
                <button class="tab" onclick="Report.showTab('interventi', this)">Interventi</button>
                <button class="tab" onclick="Report.showTab('dipendenti', this)">Dipendenti</button>
                <button class="tab" onclick="Report.showTab('clienti', this)">Clienti</button>
            </div>
            <div id="reportContent">
                ${this.renderFatturato()}
            </div>

            <div class="section-card mt-16">
                <div class="section-header">
                    <h3 class="section-title">Esportazione Dati</h3>
                </div>
                <div class="section-body">
                    <div class="flex flex-wrap gap-8">
                        <button class="btn btn-outline" onclick="Report.exportAll()">Esporta tutto (JSON)</button>
                        <button class="btn btn-outline" onclick="Report.importData()">Importa dati (JSON)</button>
                        <button class="btn btn-outline" onclick="Report.exportCSV('clienti')">CSV Clienti</button>
                        <button class="btn btn-outline" onclick="Report.exportCSV('dipendenti')">CSV Dipendenti</button>
                        <button class="btn btn-outline" onclick="Report.exportCSV('interventi')">CSV Interventi</button>
                        <button class="btn btn-outline" onclick="Report.exportCSV('fatture')">CSV Fatture</button>
                        <button class="btn btn-outline" onclick="Report.exportCSV('magazzino')">CSV Magazzino</button>
                    </div>
                    <input type="file" id="importFile" accept=".json" style="display:none;" onchange="Report.handleImport(event)">
                </div>
            </div>
        `;

        App.setContent(html);
    },

    showTab(tab, el) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');

        const renderers = {
            fatturato: () => this.renderFatturato(),
            interventi: () => this.renderInterventi(),
            dipendenti: () => this.renderDipendenti(),
            clienti: () => this.renderClientiReport(),
        };

        document.getElementById('reportContent').innerHTML = renderers[tab]();
    },

    // --- Report Fatturato ---
    renderFatturato() {
        const fatture = DB.getFatture();
        const now = new Date();
        const mesi = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const nome = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
            const totale = fatture
                .filter(f => f.data && f.data.startsWith(prefix))
                .reduce((s, f) => s + (f.totale || 0), 0);
            mesi.push({ nome, totale, prefix });
        }

        const maxVal = Math.max(...mesi.map(m => m.totale), 1);

        const totaleAnno = fatture
            .filter(f => f.data && f.data.startsWith(String(now.getFullYear())))
            .reduce((s, f) => s + (f.totale || 0), 0);

        const pagatoAnno = fatture
            .filter(f => f.data && f.data.startsWith(String(now.getFullYear())) && f.stato === 'pagato')
            .reduce((s, f) => s + (f.totale || 0), 0);

        return `
            <div class="section-card">
                <div class="section-header">
                    <h3 class="section-title">Fatturato ultimi 6 mesi</h3>
                </div>
                <div class="section-body">
                    <div class="chart-bar-container">
                        ${mesi.map(m => `
                            <div class="chart-bar-row">
                                <span class="chart-bar-label">${m.nome}</span>
                                <div class="chart-bar-track">
                                    <div class="chart-bar-fill" style="width:${Math.max((m.totale / maxVal) * 100, m.totale > 0 ? 8 : 0)}%">
                                        ${m.totale > 0 ? App.formatCurrency(m.totale) : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="stats-grid mt-16">
                <div class="stat-card">
                    <div class="stat-icon green">&#8364;</div>
                    <div class="stat-info">
                        <span class="stat-value">${App.formatCurrency(totaleAnno)}</span>
                        <span class="stat-label">Fatturato ${now.getFullYear()}</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">&#10003;</div>
                    <div class="stat-info">
                        <span class="stat-value">${App.formatCurrency(pagatoAnno)}</span>
                        <span class="stat-label">Incassato ${now.getFullYear()}</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">&#8986;</div>
                    <div class="stat-info">
                        <span class="stat-value">${App.formatCurrency(totaleAnno - pagatoAnno)}</span>
                        <span class="stat-label">Da incassare</span>
                    </div>
                </div>
            </div>
        `;
    },

    // --- Report Interventi ---
    renderInterventi() {
        const interventi = DB.getInterventi();

        const perStato = {};
        interventi.forEach(i => {
            perStato[i.stato] = (perStato[i.stato] || 0) + 1;
        });

        const perTipo = {};
        interventi.forEach(i => {
            perTipo[i.tipo || 'altro'] = (perTipo[i.tipo || 'altro'] || 0) + 1;
        });

        const maxStato = Math.max(...Object.values(perStato), 1);
        const maxTipo = Math.max(...Object.values(perTipo), 1);

        const statoColors = { programmato: '', 'in corso': 'accent', completato: '', annullato: 'danger' };
        const tipoColors = { ordinaria: '', straordinaria: 'accent', sanificazione: 'info', 'post-cantiere': 'danger' };

        return `
            <div class="dashboard-grid">
                <div class="section-card">
                    <div class="section-header">
                        <h3 class="section-title">Interventi per stato</h3>
                    </div>
                    <div class="section-body">
                        <div class="chart-bar-container">
                            ${Object.entries(perStato).map(([stato, count]) => `
                                <div class="chart-bar-row">
                                    <span class="chart-bar-label">${stato}</span>
                                    <div class="chart-bar-track">
                                        <div class="chart-bar-fill ${statoColors[stato] || ''}" style="width:${(count / maxStato) * 100}%">${count}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="section-card">
                    <div class="section-header">
                        <h3 class="section-title">Interventi per tipo</h3>
                    </div>
                    <div class="section-body">
                        <div class="chart-bar-container">
                            ${Object.entries(perTipo).map(([tipo, count]) => `
                                <div class="chart-bar-row">
                                    <span class="chart-bar-label">${tipo}</span>
                                    <div class="chart-bar-track">
                                        <div class="chart-bar-fill ${tipoColors[tipo] || ''}" style="width:${(count / maxTipo) * 100}%">${count}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <div class="stats-grid mt-16">
                <div class="stat-card">
                    <div class="stat-icon blue">&#9776;</div>
                    <div class="stat-info">
                        <span class="stat-value">${interventi.length}</span>
                        <span class="stat-label">Totale interventi</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">&#10003;</div>
                    <div class="stat-info">
                        <span class="stat-value">${interventi.filter(i => i.stato === 'completato').length}</span>
                        <span class="stat-label">Completati</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">&#9881;</div>
                    <div class="stat-info">
                        <span class="stat-value">${interventi.reduce((s, i) => s + (i.durata || 0), 0)}h</span>
                        <span class="stat-label">Ore totali</span>
                    </div>
                </div>
            </div>
        `;
    },

    // --- Report Dipendenti ---
    renderDipendenti() {
        const dipendenti = DB.getDipendenti();
        const interventi = DB.getInterventi();

        const orePerDip = {};
        const intPerDip = {};

        dipendenti.forEach(d => {
            orePerDip[d.id] = 0;
            intPerDip[d.id] = 0;
        });

        interventi.forEach(i => {
            (i.dipendentiIds || []).forEach(did => {
                orePerDip[did] = (orePerDip[did] || 0) + (i.durata || 0);
                intPerDip[did] = (intPerDip[did] || 0) + 1;
            });
        });

        const maxOre = Math.max(...Object.values(orePerDip), 1);

        return `
            <div class="section-card">
                <div class="section-header">
                    <h3 class="section-title">Ore lavorate per dipendente</h3>
                </div>
                <div class="section-body">
                    <div class="chart-bar-container">
                        ${dipendenti.map((d, i) => `
                            <div class="chart-bar-row">
                                <span class="chart-bar-label">${App.escapeHtml(d.nome)} ${App.escapeHtml(d.cognome?.charAt(0) || '')}.</span>
                                <div class="chart-bar-track">
                                    <div class="chart-bar-fill ${['', 'accent', 'info', 'danger'][i % 4]}" style="width:${Math.max((orePerDip[d.id] / maxOre) * 100, orePerDip[d.id] > 0 ? 8 : 0)}%">${orePerDip[d.id]}h</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="section-card mt-16">
                <div class="section-header">
                    <h3 class="section-title">Dettaglio dipendenti</h3>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Dipendente</th>
                                <th>Ruolo</th>
                                <th>Disponibilit&agrave;</th>
                                <th>Interventi</th>
                                <th>Ore totali</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dipendenti.map(d => `
                                <tr>
                                    <td><strong>${App.escapeHtml(d.nome)} ${App.escapeHtml(d.cognome)}</strong></td>
                                    <td>${d.ruolo || '—'}</td>
                                    <td>${d.disponibilita || '—'}</td>
                                    <td>${intPerDip[d.id] || 0}</td>
                                    <td>${orePerDip[d.id] || 0}h</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // --- Report Clienti ---
    renderClientiReport() {
        const clienti = DB.getClienti();
        const interventi = DB.getInterventi();
        const fatture = DB.getFatture();

        const dataClienti = clienti.map(c => {
            const intCount = interventi.filter(i => i.clienteId === c.id).length;
            const fattTotale = fatture
                .filter(f => f.clienteId === c.id)
                .reduce((s, f) => s + (f.totale || 0), 0);
            return { ...c, intCount, fattTotale };
        }).sort((a, b) => b.fattTotale - a.fattTotale);

        const maxFatt = Math.max(...dataClienti.map(c => c.fattTotale), 1);

        return `
            <div class="section-card">
                <div class="section-header">
                    <h3 class="section-title">Fatturato per cliente</h3>
                </div>
                <div class="section-body">
                    <div class="chart-bar-container">
                        ${dataClienti.map((c, i) => `
                            <div class="chart-bar-row">
                                <span class="chart-bar-label">${App.escapeHtml(c.ragioneSociale).substring(0, 20)}</span>
                                <div class="chart-bar-track">
                                    <div class="chart-bar-fill ${['', 'accent', 'info', 'danger'][i % 4]}" style="width:${Math.max((c.fattTotale / maxFatt) * 100, c.fattTotale > 0 ? 8 : 0)}%">${c.fattTotale > 0 ? App.formatCurrency(c.fattTotale) : ''}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="section-card mt-16">
                <div class="section-header">
                    <h3 class="section-title">Dettaglio clienti</h3>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Tipo</th>
                                <th>Interventi</th>
                                <th>Fatturato</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dataClienti.map(c => `
                                <tr>
                                    <td><strong>${App.escapeHtml(c.ragioneSociale)}</strong></td>
                                    <td>${c.tipo || '—'}</td>
                                    <td>${c.intCount}</td>
                                    <td><strong>${App.formatCurrency(c.fattTotale)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // --- Export / Import ---
    exportAll() {
        const data = DB.exportData();
        App.downloadFile(data, 'primula_backup.json', 'application/json');
        App.toast('Backup completo scaricato');
    },

    importData() {
        document.getElementById('importFile').click();
    },

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                DB.importData(e.target.result);
                App.toast('Dati importati con successo');
                this.render();
            } catch (err) {
                App.toast('Errore nel file: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    exportCSV(entity) {
        const key = DB.KEYS[entity];
        if (!key) return;
        const csv = DB.exportCSV(key);
        if (!csv) {
            App.toast('Nessun dato da esportare', 'warning');
            return;
        }
        App.downloadFile(csv, `${entity}_primula.csv`, 'text/csv');
        App.toast(`CSV ${entity} scaricato`);
    }
};

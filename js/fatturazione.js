/* ============================================
   PRIMULA GESTIONALE — Fatturazione Module
   ============================================ */

const Fatturazione = {
    tempRighe: [],

    render() {
        const fatture = DB.getFatture().sort((a, b) => (b.numero || 0) - (a.numero || 0));

        const totPagato = fatture.filter(f => f.stato === 'pagato').reduce((s, f) => s + (f.totale || 0), 0);
        const totAttesa = fatture.filter(f => f.stato === 'in_attesa').reduce((s, f) => s + (f.totale || 0), 0);
        const totScaduto = fatture.filter(f => f.stato === 'scaduto').reduce((s, f) => s + (f.totale || 0), 0);

        const html = `
            <div class="stats-grid" style="margin-bottom:20px;">
                <div class="stat-card">
                    <div class="stat-icon green">&#10003;</div>
                    <div class="stat-info">
                        <span class="stat-value">${App.formatCurrency(totPagato)}</span>
                        <span class="stat-label">Pagato</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">&#8986;</div>
                    <div class="stat-info">
                        <span class="stat-value">${App.formatCurrency(totAttesa)}</span>
                        <span class="stat-label">In attesa</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">&#9888;</div>
                    <div class="stat-info">
                        <span class="stat-value">${App.formatCurrency(totScaduto)}</span>
                        <span class="stat-label">Scaduto</span>
                    </div>
                </div>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <select id="filterStatoFatt" onchange="Fatturazione.onFilter()" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;">
                        <option value="">Tutti gli stati</option>
                        <option value="pagato">Pagato</option>
                        <option value="in_attesa">In attesa</option>
                        <option value="scaduto">Scaduto</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary" onclick="Fatturazione.openForm()">+ Nuova Fattura</button>
                </div>
            </div>

            <div class="section-card">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>N.</th>
                                <th>Data</th>
                                <th>Scadenza</th>
                                <th>Cliente</th>
                                <th>Totale</th>
                                <th>Stato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody id="fattureTableBody">
                            ${this.renderRows(fatture)}
                        </tbody>
                    </table>
                </div>
                ${fatture.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">&#8364;</div><div class="empty-state-text">Nessuna fattura</div><button class="btn btn-primary" onclick="Fatturazione.openForm()">Crea la prima fattura</button></div>' : ''}
            </div>
        `;

        App.setContent(html);
    },

    renderRows(fatture) {
        return fatture.map(f => `
            <tr>
                <td><strong>#${f.numero}</strong></td>
                <td>${App.formatDate(f.data)}</td>
                <td>${f.scadenza ? App.formatDate(f.scadenza) : '—'}</td>
                <td>${App.escapeHtml(f.clienteNome || '—')}</td>
                <td><strong>${App.formatCurrency(f.totale)}</strong></td>
                <td><span class="badge badge-${Dashboard.getFattStatoBadge(f.stato)}">${this.formatStato(f.stato)}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-outline" onclick="Fatturazione.view('${f.id}')">Vedi</button>
                    <button class="btn btn-sm btn-primary" onclick="Fatturazione.openForm('${f.id}')">Modifica</button>
                    <button class="btn btn-sm btn-danger" onclick="Fatturazione.delete('${f.id}')">Elimina</button>
                </td>
            </tr>
        `).join('');
    },

    formatStato(stato) {
        const map = { pagato: 'Pagato', in_attesa: 'In attesa', scaduto: 'Scaduto' };
        return map[stato] || stato;
    },

    onFilter() {
        const stato = document.getElementById('filterStatoFatt').value;
        let fatture = DB.getFatture().sort((a, b) => (b.numero || 0) - (a.numero || 0));
        if (stato) {
            fatture = fatture.filter(f => f.stato === stato);
        }
        document.getElementById('fattureTableBody').innerHTML = this.renderRows(fatture);
    },

    openForm(id = null) {
        const fattura = id ? DB.getById(DB.KEYS.fatture, id) : null;
        const isEdit = !!fattura;
        const clienti = DB.getClienti();

        this.tempRighe = fattura ? [...fattura.righe] : [{ descrizione: '', quantita: 1, prezzoUnitario: 0 }];

        const body = `
            <div class="form-grid">
                <div class="form-group">
                    <label>N. Fattura</label>
                    <input type="number" id="fNumero" value="${fattura?.numero || DB.getNextFatturaNumber()}" readonly style="background:#f5f5f5;">
                </div>
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="fData" value="${fattura?.data || new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Scadenza pagamento</label>
                    <input type="date" id="fScadenza" value="${fattura?.scadenza || ''}">
                </div>
                <div class="form-group">
                    <label>Cliente *</label>
                    <select id="fCliente">
                        <option value="">— Seleziona —</option>
                        ${clienti.map(c => `<option value="${c.id}" data-nome="${App.escapeHtml(c.ragioneSociale)}" ${fattura?.clienteId === c.id ? 'selected' : ''}>${App.escapeHtml(c.ragioneSociale)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Stato</label>
                    <select id="fStato">
                        <option value="in_attesa" ${fattura?.stato === 'in_attesa' ? 'selected' : ''}>In attesa</option>
                        <option value="pagato" ${fattura?.stato === 'pagato' ? 'selected' : ''}>Pagato</option>
                        <option value="scaduto" ${fattura?.stato === 'scaduto' ? 'selected' : ''}>Scaduto</option>
                    </select>
                </div>
            </div>

            <h4 style="margin:16px 0 8px;">Voci della fattura</h4>
            <div id="righeContainer">
                ${this.renderRigheForm()}
            </div>
            <button class="btn btn-outline btn-sm mt-16" onclick="Fatturazione.addRiga()">+ Aggiungi voce</button>

            <div class="line-total mt-16">
                <span>Totale: <strong id="fattTotale">${App.formatCurrency(this.calcTotale())}</strong></span>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="Fatturazione.save('${id || ''}')">${isEdit ? 'Aggiorna' : 'Salva'}</button>
        `;

        App.openModal(isEdit ? 'Modifica Fattura' : 'Nuova Fattura', body, footer);
    },

    renderRigheForm() {
        return this.tempRighe.map((r, i) => `
            <div class="line-item">
                <input type="text" placeholder="Descrizione" value="${App.escapeHtml(r.descrizione || '')}" onchange="Fatturazione.updateRiga(${i}, 'descrizione', this.value)">
                <input type="number" placeholder="Qty" min="1" value="${r.quantita || 1}" onchange="Fatturazione.updateRiga(${i}, 'quantita', this.value)">
                <input type="number" placeholder="Prezzo" min="0" step="0.01" value="${r.prezzoUnitario || 0}" onchange="Fatturazione.updateRiga(${i}, 'prezzoUnitario', this.value)">
                <span style="font-weight:600;white-space:nowrap;">${App.formatCurrency((r.quantita || 0) * (r.prezzoUnitario || 0))}</span>
                <button class="btn btn-sm btn-danger btn-icon" onclick="Fatturazione.removeRiga(${i})">&times;</button>
            </div>
        `).join('');
    },

    updateRiga(index, field, value) {
        if (field === 'quantita' || field === 'prezzoUnitario') {
            this.tempRighe[index][field] = parseFloat(value) || 0;
        } else {
            this.tempRighe[index][field] = value;
        }
        this.refreshRighe();
    },

    addRiga() {
        this.tempRighe.push({ descrizione: '', quantita: 1, prezzoUnitario: 0 });
        this.refreshRighe();
    },

    removeRiga(index) {
        this.tempRighe.splice(index, 1);
        this.refreshRighe();
    },

    refreshRighe() {
        document.getElementById('righeContainer').innerHTML = this.renderRigheForm();
        document.getElementById('fattTotale').textContent = App.formatCurrency(this.calcTotale());
    },

    calcTotale() {
        return this.tempRighe.reduce((sum, r) => sum + (r.quantita || 0) * (r.prezzoUnitario || 0), 0);
    },

    save(id) {
        const clienteSelect = document.getElementById('fCliente');
        const data = {
            numero: parseInt(document.getElementById('fNumero').value) || 0,
            data: document.getElementById('fData').value,
            scadenza: document.getElementById('fScadenza').value,
            clienteId: clienteSelect.value,
            clienteNome: clienteSelect.selectedOptions[0]?.textContent || '',
            stato: document.getElementById('fStato').value,
            righe: this.tempRighe.filter(r => r.descrizione),
            totale: this.calcTotale(),
        };

        if (!data.clienteId) {
            App.toast('Selezionare un cliente', 'error');
            return;
        }

        if (id) {
            DB.updateFattura(id, data);
            App.toast('Fattura aggiornata');
        } else {
            DB.addFattura(data);
            App.toast('Fattura creata');
        }

        App.closeModal();
        this.render();
    },

    delete(id) {
        if (App.confirm('Eliminare questa fattura?')) {
            DB.removeFattura(id);
            App.toast('Fattura eliminata');
            this.render();
        }
    },

    view(id) {
        const f = DB.getById(DB.KEYS.fatture, id);
        if (!f) return;

        const righeHtml = (f.righe || []).map(r => `
            <tr>
                <td>${App.escapeHtml(r.descrizione)}</td>
                <td class="text-right">${r.quantita}</td>
                <td class="text-right">${App.formatCurrency(r.prezzoUnitario)}</td>
                <td class="text-right"><strong>${App.formatCurrency(r.quantita * r.prezzoUnitario)}</strong></td>
            </tr>
        `).join('');

        const body = `
            <div class="print-area">
                <div style="text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid var(--primary);">
                    <h2 style="color:var(--primary);margin-bottom:4px;">&#9752; PRIMULA</h2>
                    <p class="text-muted">Impresa di Pulizia</p>
                </div>
                <div style="margin-bottom:16px;">
                    <p><strong>Fattura N.:</strong> ${f.numero}</p>
                    <p><strong>Data:</strong> ${App.formatDate(f.data)}</p>
                    <p><strong>Scadenza:</strong> ${f.scadenza ? App.formatDate(f.scadenza) : '—'}</p>
                    <p><strong>Cliente:</strong> ${App.escapeHtml(f.clienteNome)}</p>
                    <p><strong>Stato:</strong> <span class="badge badge-${Dashboard.getFattStatoBadge(f.stato)}">${this.formatStato(f.stato)}</span></p>
                </div>
                <table>
                    <thead><tr><th>Descrizione</th><th class="text-right">Qty</th><th class="text-right">Prezzo</th><th class="text-right">Totale</th></tr></thead>
                    <tbody>${righeHtml}</tbody>
                    <tfoot><tr><td colspan="3" class="text-right"><strong>TOTALE</strong></td><td class="text-right"><strong>${App.formatCurrency(f.totale)}</strong></td></tr></tfoot>
                </table>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="window.print()">Stampa</button>
            <button class="btn btn-outline" onclick="App.closeModal()">Chiudi</button>
        `;

        App.openModal(`Fattura #${f.numero}`, body, footer);
    }
};

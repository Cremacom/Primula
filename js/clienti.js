/* ============================================
   PRIMULA GESTIONALE — Clienti Module
   ============================================ */

const Clienti = {
    render() {
        const clienti = DB.getClienti();

        const html = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-box">
                        <input type="text" id="searchClienti" placeholder="Cerca clienti..." oninput="Clienti.onSearch(this.value)">
                    </div>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-outline" onclick="Clienti.exportCSV()">Esporta CSV</button>
                    <button class="btn btn-primary" onclick="Clienti.openForm()">+ Nuovo Cliente</button>
                </div>
            </div>

            <div class="section-card">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Ragione Sociale</th>
                                <th>Tipo</th>
                                <th>Indirizzo</th>
                                <th>Telefono</th>
                                <th>Email</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody id="clientiTableBody">
                            ${this.renderRows(clienti)}
                        </tbody>
                    </table>
                </div>
                ${clienti.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">&#9823;</div><div class="empty-state-text">Nessun cliente registrato</div><button class="btn btn-primary" onclick="Clienti.openForm()">Aggiungi il primo cliente</button></div>' : ''}
            </div>
        `;

        App.setContent(html);
    },

    renderRows(clienti) {
        return clienti.map(c => `
            <tr>
                <td><strong>${App.escapeHtml(c.ragioneSociale)}</strong></td>
                <td><span class="badge badge-${this.tipoBadge(c.tipo)}">${c.tipo || '—'}</span></td>
                <td>${App.escapeHtml(c.indirizzo || '')}</td>
                <td>${App.escapeHtml(c.telefono || '')}</td>
                <td>${App.escapeHtml(c.email || '')}</td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-outline" onclick="Clienti.viewDetails('${c.id}')">Dettagli</button>
                    <button class="btn btn-sm btn-primary" onclick="Clienti.openForm('${c.id}')">Modifica</button>
                    <button class="btn btn-sm btn-danger" onclick="Clienti.delete('${c.id}')">Elimina</button>
                </td>
            </tr>
        `).join('');
    },

    tipoBadge(tipo) {
        const map = { condominio: 'info', ufficio: 'success', commerciale: 'warning', privato: 'neutral' };
        return map[tipo] || 'neutral';
    },

    onSearch(query) {
        const results = DB.searchClienti(query);
        document.getElementById('clientiTableBody').innerHTML = this.renderRows(results);
    },

    openForm(id = null) {
        const cliente = id ? DB.getById(DB.KEYS.clienti, id) : null;
        const isEdit = !!cliente;

        const body = `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Ragione Sociale *</label>
                    <input type="text" id="fRagioneSociale" value="${App.escapeHtml(cliente?.ragioneSociale || '')}" required>
                </div>
                <div class="form-group">
                    <label>Tipo</label>
                    <select id="fTipo">
                        <option value="condominio" ${cliente?.tipo === 'condominio' ? 'selected' : ''}>Condominio</option>
                        <option value="ufficio" ${cliente?.tipo === 'ufficio' ? 'selected' : ''}>Ufficio</option>
                        <option value="commerciale" ${cliente?.tipo === 'commerciale' ? 'selected' : ''}>Commerciale</option>
                        <option value="privato" ${cliente?.tipo === 'privato' ? 'selected' : ''}>Privato</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Telefono</label>
                    <input type="tel" id="fTelefono" value="${App.escapeHtml(cliente?.telefono || '')}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="fEmail" value="${App.escapeHtml(cliente?.email || '')}">
                </div>
                <div class="form-group">
                    <label>Indirizzo</label>
                    <input type="text" id="fIndirizzo" value="${App.escapeHtml(cliente?.indirizzo || '')}">
                </div>
                <div class="form-group full-width">
                    <label>Note</label>
                    <textarea id="fNote">${App.escapeHtml(cliente?.note || '')}</textarea>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="Clienti.save('${id || ''}')">${isEdit ? 'Aggiorna' : 'Salva'}</button>
        `;

        App.openModal(isEdit ? 'Modifica Cliente' : 'Nuovo Cliente', body, footer);
    },

    save(id) {
        const data = {
            ragioneSociale: document.getElementById('fRagioneSociale').value.trim(),
            tipo: document.getElementById('fTipo').value,
            telefono: document.getElementById('fTelefono').value.trim(),
            email: document.getElementById('fEmail').value.trim(),
            indirizzo: document.getElementById('fIndirizzo').value.trim(),
            note: document.getElementById('fNote').value.trim(),
        };

        if (!data.ragioneSociale) {
            App.toast('Inserire la ragione sociale', 'error');
            return;
        }

        if (id) {
            DB.updateCliente(id, data);
            App.toast('Cliente aggiornato');
        } else {
            DB.addCliente(data);
            App.toast('Cliente aggiunto');
        }

        App.closeModal();
        this.render();
    },

    delete(id) {
        if (App.confirm('Eliminare questo cliente?')) {
            DB.removeCliente(id);
            App.toast('Cliente eliminato');
            this.render();
        }
    },

    viewDetails(id) {
        const c = DB.getById(DB.KEYS.clienti, id);
        if (!c) return;

        const interventi = DB.getInterventiByCliente(id);

        const body = `
            <div style="margin-bottom: 16px;">
                <p><strong>Tipo:</strong> ${c.tipo || '—'}</p>
                <p><strong>Indirizzo:</strong> ${App.escapeHtml(c.indirizzo || '—')}</p>
                <p><strong>Telefono:</strong> ${App.escapeHtml(c.telefono || '—')}</p>
                <p><strong>Email:</strong> ${App.escapeHtml(c.email || '—')}</p>
                <p><strong>Note:</strong> ${App.escapeHtml(c.note || '—')}</p>
                <p><strong>Registrato il:</strong> ${App.formatDate(c.createdAt?.split('T')[0])}</p>
            </div>

            <h3 style="margin-bottom: 8px;">Storico Interventi (${interventi.length})</h3>
            ${interventi.length > 0 ? `
                <div class="table-responsive">
                    <table>
                        <thead><tr><th>Data</th><th>Tipo</th><th>Stato</th><th>Note</th></tr></thead>
                        <tbody>
                            ${interventi.map(i => `
                                <tr>
                                    <td>${App.formatDate(i.data)}</td>
                                    <td>${i.tipo || '—'}</td>
                                    <td><span class="badge badge-${Dashboard.getStatoBadge(i.stato)}">${i.stato}</span></td>
                                    <td>${App.escapeHtml(i.note || '')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p class="text-muted">Nessun intervento registrato</p>'}
        `;

        App.openModal(c.ragioneSociale, body, '<button class="btn btn-outline" onclick="App.closeModal()">Chiudi</button>');
    },

    exportCSV() {
        const csv = DB.exportCSV(DB.KEYS.clienti);
        if (!csv) {
            App.toast('Nessun dato da esportare', 'warning');
            return;
        }
        App.downloadFile(csv, 'clienti_primula.csv', 'text/csv');
        App.toast('File CSV scaricato');
    }
};

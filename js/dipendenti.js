/* ============================================
   PRIMULA GESTIONALE — Dipendenti Module
   ============================================ */

const Dipendenti = {
    render() {
        const dipendenti = DB.getDipendenti();

        const html = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-box">
                        <input type="text" id="searchDipendenti" placeholder="Cerca dipendenti..." oninput="Dipendenti.onSearch(this.value)">
                    </div>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-outline" onclick="Dipendenti.exportCSV()">Esporta CSV</button>
                    <button class="btn btn-primary" onclick="Dipendenti.openForm()">+ Nuovo Dipendente</button>
                </div>
            </div>

            <div class="section-card">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Cognome</th>
                                <th>Ruolo</th>
                                <th>Telefono</th>
                                <th>Email</th>
                                <th>Disponibilit&agrave;</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody id="dipendentiTableBody">
                            ${this.renderRows(dipendenti)}
                        </tbody>
                    </table>
                </div>
                ${dipendenti.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">&#9881;</div><div class="empty-state-text">Nessun dipendente registrato</div><button class="btn btn-primary" onclick="Dipendenti.openForm()">Aggiungi il primo dipendente</button></div>' : ''}
            </div>
        `;

        App.setContent(html);
    },

    renderRows(dipendenti) {
        return dipendenti.map(d => `
            <tr>
                <td><strong>${App.escapeHtml(d.nome)}</strong></td>
                <td>${App.escapeHtml(d.cognome)}</td>
                <td>${App.escapeHtml(d.ruolo || '—')}</td>
                <td>${App.escapeHtml(d.telefono || '')}</td>
                <td>${App.escapeHtml(d.email || '')}</td>
                <td><span class="badge badge-${d.disponibilita === 'full-time' ? 'success' : 'warning'}">${d.disponibilita || '—'}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-primary" onclick="Dipendenti.openForm('${d.id}')">Modifica</button>
                    <button class="btn btn-sm btn-danger" onclick="Dipendenti.delete('${d.id}')">Elimina</button>
                </td>
            </tr>
        `).join('');
    },

    onSearch(query) {
        const results = DB.searchDipendenti(query);
        document.getElementById('dipendentiTableBody').innerHTML = this.renderRows(results);
    },

    openForm(id = null) {
        const dip = id ? DB.getById(DB.KEYS.dipendenti, id) : null;
        const isEdit = !!dip;

        const body = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Nome *</label>
                    <input type="text" id="fNome" value="${App.escapeHtml(dip?.nome || '')}">
                </div>
                <div class="form-group">
                    <label>Cognome *</label>
                    <input type="text" id="fCognome" value="${App.escapeHtml(dip?.cognome || '')}">
                </div>
                <div class="form-group">
                    <label>Ruolo</label>
                    <select id="fRuolo">
                        <option value="Operatore" ${dip?.ruolo === 'Operatore' ? 'selected' : ''}>Operatore</option>
                        <option value="Operatrice" ${dip?.ruolo === 'Operatrice' ? 'selected' : ''}>Operatrice</option>
                        <option value="Caposquadra" ${dip?.ruolo === 'Caposquadra' ? 'selected' : ''}>Caposquadra</option>
                        <option value="Responsabile" ${dip?.ruolo === 'Responsabile' ? 'selected' : ''}>Responsabile</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Disponibilit&agrave;</label>
                    <select id="fDisponibilita">
                        <option value="full-time" ${dip?.disponibilita === 'full-time' ? 'selected' : ''}>Full-time</option>
                        <option value="part-time" ${dip?.disponibilita === 'part-time' ? 'selected' : ''}>Part-time</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Telefono</label>
                    <input type="tel" id="fTelefono" value="${App.escapeHtml(dip?.telefono || '')}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="fEmail" value="${App.escapeHtml(dip?.email || '')}">
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="Dipendenti.save('${id || ''}')">${isEdit ? 'Aggiorna' : 'Salva'}</button>
        `;

        App.openModal(isEdit ? 'Modifica Dipendente' : 'Nuovo Dipendente', body, footer);
    },

    save(id) {
        const data = {
            nome: document.getElementById('fNome').value.trim(),
            cognome: document.getElementById('fCognome').value.trim(),
            ruolo: document.getElementById('fRuolo').value,
            disponibilita: document.getElementById('fDisponibilita').value,
            telefono: document.getElementById('fTelefono').value.trim(),
            email: document.getElementById('fEmail').value.trim(),
        };

        if (!data.nome || !data.cognome) {
            App.toast('Inserire nome e cognome', 'error');
            return;
        }

        if (id) {
            DB.updateDipendente(id, data);
            App.toast('Dipendente aggiornato');
        } else {
            DB.addDipendente(data);
            App.toast('Dipendente aggiunto');
        }

        App.closeModal();
        this.render();
    },

    delete(id) {
        if (App.confirm('Eliminare questo dipendente?')) {
            DB.removeDipendente(id);
            App.toast('Dipendente eliminato');
            this.render();
        }
    },

    exportCSV() {
        const csv = DB.exportCSV(DB.KEYS.dipendenti);
        if (!csv) {
            App.toast('Nessun dato da esportare', 'warning');
            return;
        }
        App.downloadFile(csv, 'dipendenti_primula.csv', 'text/csv');
        App.toast('File CSV scaricato');
    }
};

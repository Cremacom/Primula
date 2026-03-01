/* ============================================
   PRIMULA GESTIONALE — Preventivi Module
   ============================================ */

const Preventivi = {
    tempRighe: [],

    render() {
        const preventivi = DB.getPreventivi().sort((a, b) => (b.numero || 0) - (a.numero || 0));

        const html = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <select id="filterStatoPrev" onchange="Preventivi.onFilter()" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;">
                        <option value="">Tutti gli stati</option>
                        <option value="bozza">Bozza</option>
                        <option value="inviato">Inviato</option>
                        <option value="accettato">Accettato</option>
                        <option value="rifiutato">Rifiutato</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary" onclick="Preventivi.openForm()">+ Nuovo Preventivo</button>
                </div>
            </div>

            <div class="section-card">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>N.</th>
                                <th>Data</th>
                                <th>Cliente</th>
                                <th>Totale</th>
                                <th>Stato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody id="preventiviTableBody">
                            ${this.renderRows(preventivi)}
                        </tbody>
                    </table>
                </div>
                ${preventivi.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">&#9998;</div><div class="empty-state-text">Nessun preventivo</div><button class="btn btn-primary" onclick="Preventivi.openForm()">Crea il primo preventivo</button></div>' : ''}
            </div>
        `;

        App.setContent(html);
    },

    renderRows(preventivi) {
        return preventivi.map(p => `
            <tr>
                <td><strong>#${p.numero}</strong></td>
                <td>${App.formatDate(p.data)}</td>
                <td>${App.escapeHtml(p.clienteNome || '—')}</td>
                <td><strong>${App.formatCurrency(p.totale)}</strong></td>
                <td><span class="badge badge-${Dashboard.getPrevStatoBadge(p.stato)}">${p.stato}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-outline" onclick="Preventivi.view('${p.id}')">Vedi</button>
                    <button class="btn btn-sm btn-primary" onclick="Preventivi.openForm('${p.id}')">Modifica</button>
                    ${p.stato === 'accettato' ? `<button class="btn btn-sm btn-accent" onclick="Preventivi.convertToFattura('${p.id}')">Fattura</button>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="Preventivi.delete('${p.id}')">Elimina</button>
                </td>
            </tr>
        `).join('');
    },

    onFilter() {
        const stato = document.getElementById('filterStatoPrev').value;
        let preventivi = DB.getPreventivi().sort((a, b) => (b.numero || 0) - (a.numero || 0));
        if (stato) {
            preventivi = preventivi.filter(p => p.stato === stato);
        }
        document.getElementById('preventiviTableBody').innerHTML = this.renderRows(preventivi);
    },

    openForm(id = null) {
        const prev = id ? DB.getById(DB.KEYS.preventivi, id) : null;
        const isEdit = !!prev;
        const clienti = DB.getClienti();

        this.tempRighe = prev ? [...prev.righe] : [{ descrizione: '', quantita: 1, prezzoUnitario: 0 }];

        const body = `
            <div class="form-grid">
                <div class="form-group">
                    <label>N. Preventivo</label>
                    <input type="number" id="fNumero" value="${prev?.numero || DB.getNextPreventivoNumber()}" readonly style="background:#f5f5f5;">
                </div>
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="fData" value="${prev?.data || new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Cliente *</label>
                    <select id="fCliente">
                        <option value="">— Seleziona —</option>
                        ${clienti.map(c => `<option value="${c.id}" data-nome="${App.escapeHtml(c.ragioneSociale)}" ${prev?.clienteId === c.id ? 'selected' : ''}>${App.escapeHtml(c.ragioneSociale)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Stato</label>
                    <select id="fStato">
                        <option value="bozza" ${prev?.stato === 'bozza' ? 'selected' : ''}>Bozza</option>
                        <option value="inviato" ${prev?.stato === 'inviato' ? 'selected' : ''}>Inviato</option>
                        <option value="accettato" ${prev?.stato === 'accettato' ? 'selected' : ''}>Accettato</option>
                        <option value="rifiutato" ${prev?.stato === 'rifiutato' ? 'selected' : ''}>Rifiutato</option>
                    </select>
                </div>
            </div>

            <h4 style="margin:16px 0 8px;">Voci del preventivo</h4>
            <div id="righeContainer">
                ${this.renderRigheForm()}
            </div>
            <button class="btn btn-outline btn-sm mt-16" onclick="Preventivi.addRiga()">+ Aggiungi voce</button>

            <div class="line-total mt-16">
                <span>Totale: <strong id="prevTotale">${App.formatCurrency(this.calcTotale())}</strong></span>
            </div>

            <div class="form-group full-width mt-16">
                <label>Note</label>
                <textarea id="fNote">${App.escapeHtml(prev?.note || '')}</textarea>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="Preventivi.save('${id || ''}')">${isEdit ? 'Aggiorna' : 'Salva'}</button>
        `;

        App.openModal(isEdit ? 'Modifica Preventivo' : 'Nuovo Preventivo', body, footer);
    },

    renderRigheForm() {
        return this.tempRighe.map((r, i) => `
            <div class="line-item">
                <input type="text" placeholder="Descrizione" value="${App.escapeHtml(r.descrizione || '')}" onchange="Preventivi.updateRiga(${i}, 'descrizione', this.value)">
                <input type="number" placeholder="Qty" min="1" value="${r.quantita || 1}" onchange="Preventivi.updateRiga(${i}, 'quantita', this.value)">
                <input type="number" placeholder="Prezzo" min="0" step="0.01" value="${r.prezzoUnitario || 0}" onchange="Preventivi.updateRiga(${i}, 'prezzoUnitario', this.value)">
                <span style="font-weight:600;white-space:nowrap;">${App.formatCurrency((r.quantita || 0) * (r.prezzoUnitario || 0))}</span>
                <button class="btn btn-sm btn-danger btn-icon" onclick="Preventivi.removeRiga(${i})">&times;</button>
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
        document.getElementById('prevTotale').textContent = App.formatCurrency(this.calcTotale());
    },

    calcTotale() {
        return this.tempRighe.reduce((sum, r) => sum + (r.quantita || 0) * (r.prezzoUnitario || 0), 0);
    },

    save(id) {
        const clienteSelect = document.getElementById('fCliente');
        const data = {
            numero: parseInt(document.getElementById('fNumero').value) || 0,
            data: document.getElementById('fData').value,
            clienteId: clienteSelect.value,
            clienteNome: clienteSelect.selectedOptions[0]?.textContent || '',
            stato: document.getElementById('fStato').value,
            righe: this.tempRighe.filter(r => r.descrizione),
            totale: this.calcTotale(),
            note: document.getElementById('fNote').value.trim(),
        };

        if (!data.clienteId) {
            App.toast('Selezionare un cliente', 'error');
            return;
        }

        if (id) {
            DB.updatePreventivo(id, data);
            App.toast('Preventivo aggiornato');
        } else {
            DB.addPreventivo(data);
            App.toast('Preventivo creato');
        }

        App.closeModal();
        this.render();
    },

    delete(id) {
        if (App.confirm('Eliminare questo preventivo?')) {
            DB.removePreventivo(id);
            App.toast('Preventivo eliminato');
            this.render();
        }
    },

    view(id) {
        const p = DB.getById(DB.KEYS.preventivi, id);
        if (!p) return;

        const righeHtml = (p.righe || []).map(r => `
            <tr>
                <td>${App.escapeHtml(r.descrizione)}</td>
                <td class="text-right">${r.quantita}</td>
                <td class="text-right">${App.formatCurrency(r.prezzoUnitario)}</td>
                <td class="text-right"><strong>${App.formatCurrency(r.quantita * r.prezzoUnitario)}</strong></td>
            </tr>
        `).join('');

        const body = `
            <div class="print-area">
                <div style="margin-bottom:16px;">
                    <p><strong>Preventivo N.:</strong> ${p.numero}</p>
                    <p><strong>Data:</strong> ${App.formatDate(p.data)}</p>
                    <p><strong>Cliente:</strong> ${App.escapeHtml(p.clienteNome)}</p>
                    <p><strong>Stato:</strong> <span class="badge badge-${Dashboard.getPrevStatoBadge(p.stato)}">${p.stato}</span></p>
                </div>
                <table>
                    <thead><tr><th>Descrizione</th><th class="text-right">Qty</th><th class="text-right">Prezzo</th><th class="text-right">Totale</th></tr></thead>
                    <tbody>${righeHtml}</tbody>
                    <tfoot><tr><td colspan="3" class="text-right"><strong>TOTALE</strong></td><td class="text-right"><strong>${App.formatCurrency(p.totale)}</strong></td></tr></tfoot>
                </table>
                ${p.note ? `<p style="margin-top:16px;"><strong>Note:</strong> ${App.escapeHtml(p.note)}</p>` : ''}
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="window.print()">Stampa</button>
            <button class="btn btn-outline" onclick="App.closeModal()">Chiudi</button>
        `;

        App.openModal(`Preventivo #${p.numero}`, body, footer);
    },

    convertToFattura(id) {
        const p = DB.getById(DB.KEYS.preventivi, id);
        if (!p) return;

        if (!App.confirm(`Generare fattura dal preventivo #${p.numero}?`)) return;

        const fattura = {
            numero: DB.getNextFatturaNumber(),
            preventivoId: p.id,
            clienteId: p.clienteId,
            clienteNome: p.clienteNome,
            data: new Date().toISOString().split('T')[0],
            scadenza: '',
            stato: 'in_attesa',
            righe: [...p.righe],
            totale: p.totale,
        };

        DB.addFattura(fattura);
        App.toast(`Fattura #${fattura.numero} generata dal preventivo`);
        this.render();
    }
};

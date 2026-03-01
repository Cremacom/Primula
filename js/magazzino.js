/* ============================================
   PRIMULA GESTIONALE — Magazzino Module
   ============================================ */

const Magazzino = {
    render() {
        const prodotti = DB.getMagazzino();
        const scorteBasse = DB.getProdottiScortaBassa();

        const html = `
            ${scorteBasse.length > 0 ? `
                <div class="section-card" style="border-left:4px solid var(--danger);margin-bottom:20px;">
                    <div class="section-body">
                        <strong class="text-danger">&#9888; Attenzione: ${scorteBasse.length} prodott${scorteBasse.length === 1 ? 'o' : 'i'} con scorte basse!</strong>
                        <span class="text-muted"> — ${scorteBasse.map(p => p.nome).join(', ')}</span>
                    </div>
                </div>
            ` : ''}

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-box">
                        <input type="text" id="searchMagazzino" placeholder="Cerca prodotti..." oninput="Magazzino.onSearch(this.value)">
                    </div>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-outline" onclick="Magazzino.exportCSV()">Esporta CSV</button>
                    <button class="btn btn-primary" onclick="Magazzino.openForm()">+ Nuovo Prodotto</button>
                </div>
            </div>

            <div class="section-card">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Prodotto</th>
                                <th>Categoria</th>
                                <th>Quantit&agrave;</th>
                                <th>Unit&agrave;</th>
                                <th>Scorta min.</th>
                                <th>Prezzo unit.</th>
                                <th>Valore</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody id="magazzinoTableBody">
                            ${this.renderRows(prodotti)}
                        </tbody>
                    </table>
                </div>
                ${prodotti.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">&#9874;</div><div class="empty-state-text">Magazzino vuoto</div><button class="btn btn-primary" onclick="Magazzino.openForm()">Aggiungi il primo prodotto</button></div>' : ''}
            </div>

            ${prodotti.length > 0 ? `
                <div class="section-card">
                    <div class="section-header">
                        <h3 class="section-title">Riepilogo Magazzino</h3>
                    </div>
                    <div class="section-body">
                        <p><strong>Prodotti totali:</strong> ${prodotti.length}</p>
                        <p><strong>Valore totale magazzino:</strong> ${App.formatCurrency(prodotti.reduce((s, p) => s + (p.quantita || 0) * (p.prezzoUnitario || 0), 0))}</p>
                        <p><strong>Categorie:</strong> ${[...new Set(prodotti.map(p => p.categoria).filter(Boolean))].join(', ') || '—'}</p>
                    </div>
                </div>
            ` : ''}
        `;

        App.setContent(html);
    },

    renderRows(prodotti) {
        return prodotti.map(p => {
            const isLow = p.quantita <= (p.scortaMinima || 5);
            const valore = (p.quantita || 0) * (p.prezzoUnitario || 0);
            return `
                <tr>
                    <td><strong>${App.escapeHtml(p.nome)}</strong></td>
                    <td>${App.escapeHtml(p.categoria || '—')}</td>
                    <td class="${isLow ? 'stock-low' : ''}">${p.quantita} ${isLow ? '&#9888;' : ''}</td>
                    <td>${App.escapeHtml(p.unita || '—')}</td>
                    <td>${p.scortaMinima || '—'}</td>
                    <td>${App.formatCurrency(p.prezzoUnitario)}</td>
                    <td>${App.formatCurrency(valore)}</td>
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-outline" onclick="Magazzino.adjustQty('${p.id}')">Carico/Scarico</button>
                        <button class="btn btn-sm btn-primary" onclick="Magazzino.openForm('${p.id}')">Modifica</button>
                        <button class="btn btn-sm btn-danger" onclick="Magazzino.delete('${p.id}')">Elimina</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    onSearch(query) {
        const results = DB.searchMagazzino(query);
        document.getElementById('magazzinoTableBody').innerHTML = this.renderRows(results);
    },

    openForm(id = null) {
        const prod = id ? DB.getById(DB.KEYS.magazzino, id) : null;
        const isEdit = !!prod;

        const body = `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Nome prodotto *</label>
                    <input type="text" id="fNome" value="${App.escapeHtml(prod?.nome || '')}">
                </div>
                <div class="form-group">
                    <label>Categoria</label>
                    <select id="fCategoria">
                        <option value="Detergenti" ${prod?.categoria === 'Detergenti' ? 'selected' : ''}>Detergenti</option>
                        <option value="Sanificazione" ${prod?.categoria === 'Sanificazione' ? 'selected' : ''}>Sanificazione</option>
                        <option value="Consumabili" ${prod?.categoria === 'Consumabili' ? 'selected' : ''}>Consumabili</option>
                        <option value="DPI" ${prod?.categoria === 'DPI' ? 'selected' : ''}>DPI</option>
                        <option value="Attrezzature" ${prod?.categoria === 'Attrezzature' ? 'selected' : ''}>Attrezzature</option>
                        <option value="Altro" ${prod?.categoria === 'Altro' ? 'selected' : ''}>Altro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Unit&agrave; di misura</label>
                    <select id="fUnita">
                        <option value="pezzi" ${prod?.unita === 'pezzi' ? 'selected' : ''}>Pezzi</option>
                        <option value="litri" ${prod?.unita === 'litri' ? 'selected' : ''}>Litri</option>
                        <option value="kg" ${prod?.unita === 'kg' ? 'selected' : ''}>Kg</option>
                        <option value="confezioni" ${prod?.unita === 'confezioni' ? 'selected' : ''}>Confezioni</option>
                        <option value="rotoli" ${prod?.unita === 'rotoli' ? 'selected' : ''}>Rotoli</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Quantit&agrave; attuale</label>
                    <input type="number" id="fQuantita" min="0" value="${prod?.quantita ?? 0}">
                </div>
                <div class="form-group">
                    <label>Scorta minima</label>
                    <input type="number" id="fScortaMinima" min="0" value="${prod?.scortaMinima ?? 5}">
                </div>
                <div class="form-group">
                    <label>Prezzo unitario (&euro;)</label>
                    <input type="number" id="fPrezzo" min="0" step="0.01" value="${prod?.prezzoUnitario ?? 0}">
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="Magazzino.save('${id || ''}')">${isEdit ? 'Aggiorna' : 'Salva'}</button>
        `;

        App.openModal(isEdit ? 'Modifica Prodotto' : 'Nuovo Prodotto', body, footer);
    },

    save(id) {
        const data = {
            nome: document.getElementById('fNome').value.trim(),
            categoria: document.getElementById('fCategoria').value,
            unita: document.getElementById('fUnita').value,
            quantita: parseFloat(document.getElementById('fQuantita').value) || 0,
            scortaMinima: parseFloat(document.getElementById('fScortaMinima').value) || 0,
            prezzoUnitario: parseFloat(document.getElementById('fPrezzo').value) || 0,
        };

        if (!data.nome) {
            App.toast('Inserire il nome del prodotto', 'error');
            return;
        }

        if (id) {
            DB.updateProdotto(id, data);
            App.toast('Prodotto aggiornato');
        } else {
            DB.addProdotto(data);
            App.toast('Prodotto aggiunto');
        }

        App.closeModal();
        this.render();
    },

    delete(id) {
        if (App.confirm('Eliminare questo prodotto?')) {
            DB.removeProdotto(id);
            App.toast('Prodotto eliminato');
            this.render();
        }
    },

    adjustQty(id) {
        const prod = DB.getById(DB.KEYS.magazzino, id);
        if (!prod) return;

        const body = `
            <p>Prodotto: <strong>${App.escapeHtml(prod.nome)}</strong></p>
            <p>Quantit&agrave; attuale: <strong>${prod.quantita} ${prod.unita}</strong></p>
            <div class="form-grid mt-16">
                <div class="form-group">
                    <label>Tipo movimento</label>
                    <select id="fMovTipo">
                        <option value="carico">Carico (+)</option>
                        <option value="scarico">Scarico (-)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Quantit&agrave;</label>
                    <input type="number" id="fMovQty" min="1" value="1">
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="Magazzino.saveAdjust('${id}')">Conferma</button>
        `;

        App.openModal('Carico / Scarico', body, footer);
    },

    saveAdjust(id) {
        const prod = DB.getById(DB.KEYS.magazzino, id);
        if (!prod) return;

        const tipo = document.getElementById('fMovTipo').value;
        const qty = parseFloat(document.getElementById('fMovQty').value) || 0;

        if (qty <= 0) {
            App.toast('Inserire una quantita valida', 'error');
            return;
        }

        let newQty = prod.quantita;
        if (tipo === 'carico') {
            newQty += qty;
        } else {
            newQty -= qty;
            if (newQty < 0) newQty = 0;
        }

        DB.updateProdotto(id, { quantita: newQty });
        App.toast(`${tipo === 'carico' ? 'Carico' : 'Scarico'} registrato: ${prod.nome} = ${newQty} ${prod.unita}`);
        App.closeModal();
        this.render();
    },

    exportCSV() {
        const csv = DB.exportCSV(DB.KEYS.magazzino);
        if (!csv) {
            App.toast('Nessun dato da esportare', 'warning');
            return;
        }
        App.downloadFile(csv, 'magazzino_primula.csv', 'text/csv');
        App.toast('File CSV scaricato');
    }
};

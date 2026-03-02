/* ============================================
   PRIMULA GESTIONALE — Area Dipendente Module
   I Miei Lavori: interventi assegnati, annotazioni, ore
   ============================================ */

const AreaDipendente = {
    currentFilter: 'tutti',

    // --- Trova il dipendenteId collegato all'utente corrente ---
    getMyDipendenteId() {
        if (!Auth.currentUser) return null;
        const user = Auth.getUserById(Auth.currentUser.id);
        return user?.dipendenteId || null;
    },

    // --- Recupera i miei interventi ---
    getMyInterventi() {
        const dipId = this.getMyDipendenteId();
        if (!dipId) return [];
        return DB.getInterventi().filter(i =>
            i.dipendentiIds && i.dipendentiIds.includes(dipId)
        );
    },

    render() {
        const dipId = this.getMyDipendenteId();

        if (!dipId) {
            App.setContent(`
                <div class="empty-state">
                    <div class="empty-state-icon">&#9888;</div>
                    <div class="empty-state-text">
                        Il tuo account non &egrave; collegato a nessun dipendente.<br>
                        Chiedi all'amministratore di associare il tuo account a una scheda dipendente dalla pagina <strong>Gestione Utenti</strong>.
                    </div>
                </div>
            `);
            return;
        }

        let interventi = this.getMyInterventi();

        // Ordina per data (piu' recenti prima)
        interventi.sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.ora || '').localeCompare(a.ora || ''));

        // Filtra per stato
        if (this.currentFilter !== 'tutti') {
            interventi = interventi.filter(i => i.stato === this.currentFilter);
        }

        const oggi = new Date().toISOString().split('T')[0];
        const interventiOggi = this.getMyInterventi().filter(i => i.data === oggi);
        const completati = this.getMyInterventi().filter(i => i.stato === 'completato');
        const oreTotali = this.getMyInterventi().reduce((s, i) => s + (i.oreEffettive || i.durata || 0), 0);

        const html = `
            <!-- Riepilogo personale -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon green">&#9752;</div>
                    <div class="stat-info">
                        <span class="stat-value">${interventiOggi.length}</span>
                        <span class="stat-label">Lavori di oggi</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">&#9776;</div>
                    <div class="stat-info">
                        <span class="stat-value">${this.getMyInterventi().length}</span>
                        <span class="stat-label">Totale assegnati</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">&#10003;</div>
                    <div class="stat-info">
                        <span class="stat-value">${completati.length}</span>
                        <span class="stat-label">Completati</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">&#8986;</div>
                    <div class="stat-info">
                        <span class="stat-value">${oreTotali}h</span>
                        <span class="stat-label">Ore totali</span>
                    </div>
                </div>
            </div>

            <!-- Filtri -->
            <div class="toolbar">
                <div class="toolbar-left">
                    <button class="btn ${this.currentFilter === 'tutti' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="AreaDipendente.setFilter('tutti')">Tutti</button>
                    <button class="btn ${this.currentFilter === 'programmato' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="AreaDipendente.setFilter('programmato')">Programmati</button>
                    <button class="btn ${this.currentFilter === 'in corso' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="AreaDipendente.setFilter('in corso')">In corso</button>
                    <button class="btn ${this.currentFilter === 'completato' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="AreaDipendente.setFilter('completato')">Completati</button>
                </div>
            </div>

            <!-- Lista lavori -->
            ${interventi.length > 0 ? interventi.map(i => this.renderJobCard(i, oggi)).join('') : `
                <div class="empty-state">
                    <div class="empty-state-icon">&#9776;</div>
                    <div class="empty-state-text">Nessun lavoro trovato con questo filtro</div>
                </div>
            `}
        `;

        App.setContent(html);
    },

    renderJobCard(intervento, oggi) {
        const isToday = intervento.data === oggi;
        const isPast = intervento.data < oggi;
        const annotazioni = intervento.annotazioni || [];

        return `
            <div class="section-card job-card ${isToday ? 'job-card-today' : ''} ${isPast && intervento.stato !== 'completato' ? 'job-card-overdue' : ''}">
                <div class="section-header">
                    <div>
                        <h3 class="section-title">${App.escapeHtml(intervento.clienteNome || 'Cliente')}</h3>
                        <span class="text-muted" style="font-size:13px;">${App.formatDate(intervento.data)} ${isToday ? '(OGGI)' : ''} &mdash; ore ${intervento.ora || '—'}</span>
                    </div>
                    <span class="badge badge-${this.getStatoBadge(intervento.stato)}">${intervento.stato}</span>
                </div>
                <div class="section-body">
                    <div class="job-details">
                        <div class="job-detail-row">
                            <span class="job-detail-label">Tipo:</span>
                            <span>${intervento.tipo || '—'}</span>
                        </div>
                        <div class="job-detail-row">
                            <span class="job-detail-label">Durata prevista:</span>
                            <span>${intervento.durata || '—'} ore</span>
                        </div>
                        <div class="job-detail-row">
                            <span class="job-detail-label">Ore effettive:</span>
                            <span><strong>${intervento.oreEffettive != null ? intervento.oreEffettive + 'h' : 'Non compilate'}</strong></span>
                        </div>
                        <div class="job-detail-row">
                            <span class="job-detail-label">Squadra:</span>
                            <span>${App.escapeHtml(intervento.dipendentiNomi || '—')}</span>
                        </div>
                        ${intervento.note ? `
                            <div class="job-detail-row">
                                <span class="job-detail-label">Note lavoro:</span>
                                <span>${App.escapeHtml(intervento.note)}</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Annotazioni -->
                    <div class="job-annotations">
                        <h4 style="margin-bottom:8px;font-size:14px;">Annotazioni (${annotazioni.length})</h4>
                        ${annotazioni.length > 0 ? `
                            <div class="annotation-list">
                                ${annotazioni.map((a, idx) => `
                                    <div class="annotation-item">
                                        <div class="annotation-header">
                                            <span class="annotation-author">${App.escapeHtml(a.autore || '—')}</span>
                                            <span class="annotation-date">${App.formatDate(a.data)} ${a.ora || ''}</span>
                                        </div>
                                        <p class="annotation-text">${App.escapeHtml(a.testo)}</p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted" style="font-size:13px;">Nessuna annotazione ancora</p>'}
                    </div>

                    <!-- Azioni -->
                    <div class="job-actions">
                        <button class="btn btn-sm btn-primary" onclick="AreaDipendente.openAnnotazione('${intervento.id}')">+ Annotazione</button>
                        <button class="btn btn-sm btn-accent" onclick="AreaDipendente.openOreEffettive('${intervento.id}')">Ore effettive</button>
                        ${intervento.stato === 'programmato' ? `<button class="btn btn-sm btn-outline" onclick="AreaDipendente.cambiaStato('${intervento.id}', 'in corso')">Inizia lavoro</button>` : ''}
                        ${intervento.stato === 'in corso' ? `<button class="btn btn-sm btn-outline" style="border-color:var(--success);color:var(--success);" onclick="AreaDipendente.cambiaStato('${intervento.id}', 'completato')">Segna completato</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    getStatoBadge(stato) {
        const map = { programmato: 'info', 'in corso': 'warning', completato: 'success', annullato: 'danger' };
        return map[stato] || 'neutral';
    },

    setFilter(filter) {
        this.currentFilter = filter;
        this.render();
    },

    // --- Cambio stato rapido ---
    cambiaStato(interventoId, nuovoStato) {
        DB.updateIntervento(interventoId, { stato: nuovoStato });
        App.toast(`Stato aggiornato: ${nuovoStato}`);
        this.render();
    },

    // --- Modal: Aggiungi annotazione ---
    openAnnotazione(interventoId) {
        const body = `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Annotazione *</label>
                    <textarea id="fAnnotazione" rows="4" placeholder="Descrivi cosa hai fatto, problemi riscontrati, materiali usati..."></textarea>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="AreaDipendente.saveAnnotazione('${interventoId}')">Salva</button>
        `;

        App.openModal('Aggiungi Annotazione', body, footer);
    },

    saveAnnotazione(interventoId) {
        const testo = document.getElementById('fAnnotazione').value.trim();
        if (!testo) {
            App.toast('Inserire il testo dell\'annotazione', 'error');
            return;
        }

        const intervento = DB.getById(DB.KEYS.interventi, interventoId);
        if (!intervento) return;

        const now = new Date();
        const annotazioni = intervento.annotazioni || [];
        annotazioni.push({
            autore: Auth.currentUser.nome || Auth.currentUser.username,
            data: now.toISOString().split('T')[0],
            ora: now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            testo,
        });

        DB.updateIntervento(interventoId, { annotazioni });
        App.toast('Annotazione aggiunta');
        App.closeModal();
        this.render();
    },

    // --- Modal: Ore effettive ---
    openOreEffettive(interventoId) {
        const intervento = DB.getById(DB.KEYS.interventi, interventoId);
        if (!intervento) return;

        const body = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Durata prevista</label>
                    <input type="text" value="${intervento.durata || '—'} ore" readonly style="background:#f5f5f5;">
                </div>
                <div class="form-group">
                    <label>Ore effettivamente lavorate *</label>
                    <input type="number" id="fOreEffettive" min="0" step="0.25" value="${intervento.oreEffettive ?? ''}" placeholder="Es: 3.5">
                </div>
                <div class="form-group full-width">
                    <label>Note sulle ore (opzionale)</label>
                    <textarea id="fNoteOre" rows="2" placeholder="Es: pausa pranzo 30min, ritardo inizio...">${App.escapeHtml(intervento.noteOre || '')}</textarea>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="AreaDipendente.saveOreEffettive('${interventoId}')">Salva</button>
        `;

        App.openModal('Registra Ore Effettive', body, footer);
    },

    saveOreEffettive(interventoId) {
        const oreStr = document.getElementById('fOreEffettive').value;
        const ore = parseFloat(oreStr);

        if (isNaN(ore) || ore < 0) {
            App.toast('Inserire un numero di ore valido', 'error');
            return;
        }

        const noteOre = document.getElementById('fNoteOre').value.trim();

        DB.updateIntervento(interventoId, { oreEffettive: ore, noteOre });
        App.toast('Ore effettive registrate: ' + ore + 'h');
        App.closeModal();
        this.render();
    }
};

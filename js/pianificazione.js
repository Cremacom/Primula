/* ============================================
   PRIMULA GESTIONALE — Pianificazione Module
   ============================================ */

const Pianificazione = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),

    render() {
        const html = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <button class="btn btn-outline" onclick="Pianificazione.viewList()">Vista Lista</button>
                    <button class="btn btn-outline" onclick="Pianificazione.render()">Vista Calendario</button>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary" onclick="Pianificazione.openForm()">+ Nuovo Intervento</button>
                </div>
            </div>

            <div class="section-card">
                <div class="section-body">
                    ${this.renderCalendar()}
                </div>
            </div>
        `;

        App.setContent(html);
    },

    renderCalendar() {
        const year = this.currentYear;
        const month = this.currentMonth;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDow = (firstDay.getDay() + 6) % 7; // Lunedi = 0

        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

        const interventi = DB.getInterventiByMonth(year, month);
        const oggi = new Date().toISOString().split('T')[0];

        let html = `
            <div class="calendar-header">
                <button class="btn btn-outline btn-sm" onclick="Pianificazione.prevMonth()">&laquo; Prec</button>
                <span class="calendar-title">${monthNames[month]} ${year}</span>
                <button class="btn btn-outline btn-sm" onclick="Pianificazione.nextMonth()">Succ &raquo;</button>
            </div>
            <div class="calendar-grid">
        `;

        // Headers giorni
        dayNames.forEach(d => {
            html += `<div class="calendar-day-header">${d}</div>`;
        });

        // Celle vuote prima del primo giorno
        for (let i = 0; i < startDow; i++) {
            html += '<div class="calendar-day other-month"></div>';
        }

        // Giorni del mese
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayInterventi = interventi.filter(i => i.data === dateStr);
            const isToday = dateStr === oggi;

            html += `<div class="calendar-day ${isToday ? 'today' : ''}" onclick="Pianificazione.onDayClick('${dateStr}')">
                <div class="calendar-day-number">${day}</div>
                ${dayInterventi.slice(0, 3).map(i => `
                    <div class="calendar-event ${i.stato.replace(' ', '-')}" onclick="event.stopPropagation(); Pianificazione.viewIntervento('${i.id}')">
                        ${i.ora || ''} ${App.escapeHtml(i.clienteNome || '').substring(0, 15)}
                    </div>
                `).join('')}
                ${dayInterventi.length > 3 ? `<div class="calendar-event" style="background:#eee;color:#666;">+${dayInterventi.length - 3} altri</div>` : ''}
            </div>`;
        }

        html += '</div>';
        return html;
    },

    prevMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.render();
    },

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.render();
    },

    onDayClick(dateStr) {
        this.openForm(null, dateStr);
    },

    viewList() {
        const interventi = DB.getInterventi().sort((a, b) => (b.data || '').localeCompare(a.data || ''));

        const html = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <button class="btn btn-outline" onclick="Pianificazione.viewList()">Vista Lista</button>
                    <button class="btn btn-outline" onclick="Pianificazione.render()">Vista Calendario</button>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary" onclick="Pianificazione.openForm()">+ Nuovo Intervento</button>
                </div>
            </div>

            <div class="section-card">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Ora</th>
                                <th>Cliente</th>
                                <th>Tipo</th>
                                <th>Squadra</th>
                                <th>Durata (h)</th>
                                <th>Stato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${interventi.map(i => `
                                <tr>
                                    <td>${App.formatDate(i.data)}</td>
                                    <td>${i.ora || '—'}</td>
                                    <td><strong>${App.escapeHtml(i.clienteNome || '—')}</strong></td>
                                    <td>${i.tipo || '—'}</td>
                                    <td>${App.escapeHtml(i.dipendentiNomi || '—')}</td>
                                    <td>${i.durata || '—'}</td>
                                    <td><span class="badge badge-${Dashboard.getStatoBadge(i.stato)}">${i.stato}</span></td>
                                    <td class="actions-cell">
                                        <button class="btn btn-sm btn-primary" onclick="Pianificazione.openForm('${i.id}')">Modifica</button>
                                        <button class="btn btn-sm btn-danger" onclick="Pianificazione.delete('${i.id}')">Elimina</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${interventi.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">&#9776;</div><div class="empty-state-text">Nessun intervento programmato</div></div>' : ''}
            </div>
        `;

        App.setContent(html);
    },

    openForm(id = null, prefillDate = null) {
        const intervento = id ? DB.getById(DB.KEYS.interventi, id) : null;
        const isEdit = !!intervento;
        const clienti = DB.getClienti();
        const dipendenti = DB.getDipendenti();

        const selectedDips = intervento?.dipendentiIds || [];

        const body = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Cliente *</label>
                    <select id="fCliente">
                        <option value="">— Seleziona —</option>
                        ${clienti.map(c => `<option value="${c.id}" ${intervento?.clienteId === c.id ? 'selected' : ''}>${App.escapeHtml(c.ragioneSociale)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Data *</label>
                    <input type="date" id="fData" value="${intervento?.data || prefillDate || ''}">
                </div>
                <div class="form-group">
                    <label>Ora</label>
                    <input type="time" id="fOra" value="${intervento?.ora || '08:00'}">
                </div>
                <div class="form-group">
                    <label>Durata (ore)</label>
                    <input type="number" id="fDurata" min="0.5" step="0.5" value="${intervento?.durata || 2}">
                </div>
                <div class="form-group">
                    <label>Tipo intervento</label>
                    <select id="fTipoInt">
                        <option value="ordinaria" ${intervento?.tipo === 'ordinaria' ? 'selected' : ''}>Ordinaria</option>
                        <option value="straordinaria" ${intervento?.tipo === 'straordinaria' ? 'selected' : ''}>Straordinaria</option>
                        <option value="sanificazione" ${intervento?.tipo === 'sanificazione' ? 'selected' : ''}>Sanificazione</option>
                        <option value="post-cantiere" ${intervento?.tipo === 'post-cantiere' ? 'selected' : ''}>Post-cantiere</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Stato</label>
                    <select id="fStato">
                        <option value="programmato" ${intervento?.stato === 'programmato' ? 'selected' : ''}>Programmato</option>
                        <option value="in corso" ${intervento?.stato === 'in corso' ? 'selected' : ''}>In corso</option>
                        <option value="completato" ${intervento?.stato === 'completato' ? 'selected' : ''}>Completato</option>
                        <option value="annullato" ${intervento?.stato === 'annullato' ? 'selected' : ''}>Annullato</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Dipendenti assegnati</label>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
                        ${dipendenti.map(d => `
                            <label style="display:flex;align-items:center;gap:4px;font-size:14px;cursor:pointer;">
                                <input type="checkbox" class="dipCheck" value="${d.id}" data-nome="${d.nome} ${d.cognome}" ${selectedDips.includes(d.id) ? 'checked' : ''}>
                                ${App.escapeHtml(d.nome)} ${App.escapeHtml(d.cognome)}
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group full-width">
                    <label>Note</label>
                    <textarea id="fNote">${App.escapeHtml(intervento?.note || '')}</textarea>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Annulla</button>
            <button class="btn btn-primary" onclick="Pianificazione.save('${id || ''}')">${isEdit ? 'Aggiorna' : 'Salva'}</button>
        `;

        App.openModal(isEdit ? 'Modifica Intervento' : 'Nuovo Intervento', body, footer);
    },

    save(id) {
        const clienteSelect = document.getElementById('fCliente');
        const clienteId = clienteSelect.value;
        const clienteNome = clienteSelect.selectedOptions[0]?.textContent || '';

        const checkedDips = document.querySelectorAll('.dipCheck:checked');
        const dipendentiIds = Array.from(checkedDips).map(cb => cb.value);
        const dipendentiNomi = Array.from(checkedDips).map(cb => cb.dataset.nome).join(', ');

        const data = {
            clienteId,
            clienteNome,
            data: document.getElementById('fData').value,
            ora: document.getElementById('fOra').value,
            durata: parseFloat(document.getElementById('fDurata').value) || 0,
            tipo: document.getElementById('fTipoInt').value,
            stato: document.getElementById('fStato').value,
            dipendentiIds,
            dipendentiNomi,
            note: document.getElementById('fNote').value.trim(),
        };

        if (!data.clienteId || !data.data) {
            App.toast('Selezionare cliente e data', 'error');
            return;
        }

        if (id) {
            DB.updateIntervento(id, data);
            App.toast('Intervento aggiornato');
        } else {
            DB.addIntervento(data);
            App.toast('Intervento creato');
        }

        App.closeModal();
        this.render();
    },

    delete(id) {
        if (App.confirm('Eliminare questo intervento?')) {
            DB.removeIntervento(id);
            App.toast('Intervento eliminato');
            this.render();
        }
    },

    viewIntervento(id) {
        const i = DB.getById(DB.KEYS.interventi, id);
        if (!i) return;

        const body = `
            <p><strong>Cliente:</strong> ${App.escapeHtml(i.clienteNome)}</p>
            <p><strong>Data:</strong> ${App.formatDate(i.data)}</p>
            <p><strong>Ora:</strong> ${i.ora || '—'}</p>
            <p><strong>Durata:</strong> ${i.durata || '—'} ore</p>
            <p><strong>Tipo:</strong> ${i.tipo}</p>
            <p><strong>Stato:</strong> <span class="badge badge-${Dashboard.getStatoBadge(i.stato)}">${i.stato}</span></p>
            <p><strong>Squadra:</strong> ${App.escapeHtml(i.dipendentiNomi || '—')}</p>
            <p><strong>Note:</strong> ${App.escapeHtml(i.note || '—')}</p>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Chiudi</button>
            <button class="btn btn-primary" onclick="App.closeModal(); Pianificazione.openForm('${id}')">Modifica</button>
        `;

        App.openModal('Dettaglio Intervento', body, footer);
    }
};

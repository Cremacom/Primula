/* ============================================
   PRIMULA GESTIONALE — Database Module (localStorage)
   ============================================ */

const DB = {
    // Chiavi di storage
    KEYS: {
        clienti: 'primula_clienti',
        dipendenti: 'primula_dipendenti',
        interventi: 'primula_interventi',
        preventivi: 'primula_preventivi',
        fatture: 'primula_fatture',
        magazzino: 'primula_magazzino',
    },

    // --- Utility ---
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // --- CRUD generico ---
    getAll(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    saveAll(key, items) {
        localStorage.setItem(key, JSON.stringify(items));
    },

    getById(key, id) {
        return this.getAll(key).find(item => item.id === id) || null;
    },

    add(key, item) {
        const items = this.getAll(key);
        item.id = this.generateId();
        item.createdAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        items.push(item);
        this.saveAll(key, items);
        return item;
    },

    update(key, id, updates) {
        const items = this.getAll(key);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
        this.saveAll(key, items);
        return items[index];
    },

    remove(key, id) {
        const items = this.getAll(key).filter(item => item.id !== id);
        this.saveAll(key, items);
    },

    // --- Ricerca ---
    search(key, query, fields) {
        const q = query.toLowerCase().trim();
        if (!q) return this.getAll(key);
        return this.getAll(key).filter(item =>
            fields.some(field => {
                const val = item[field];
                return val && val.toString().toLowerCase().includes(q);
            })
        );
    },

    // --- Clienti ---
    getClienti() { return this.getAll(this.KEYS.clienti); },
    addCliente(c) { return this.add(this.KEYS.clienti, c); },
    updateCliente(id, c) { return this.update(this.KEYS.clienti, id, c); },
    removeCliente(id) { this.remove(this.KEYS.clienti, id); },
    searchClienti(q) { return this.search(this.KEYS.clienti, q, ['ragioneSociale', 'indirizzo', 'email', 'telefono']); },

    // --- Dipendenti ---
    getDipendenti() { return this.getAll(this.KEYS.dipendenti); },
    addDipendente(d) { return this.add(this.KEYS.dipendenti, d); },
    updateDipendente(id, d) { return this.update(this.KEYS.dipendenti, id, d); },
    removeDipendente(id) { this.remove(this.KEYS.dipendenti, id); },
    searchDipendenti(q) { return this.search(this.KEYS.dipendenti, q, ['nome', 'cognome', 'ruolo', 'telefono']); },

    // --- Interventi ---
    getInterventi() { return this.getAll(this.KEYS.interventi); },
    addIntervento(i) { return this.add(this.KEYS.interventi, i); },
    updateIntervento(id, i) { return this.update(this.KEYS.interventi, id, i); },
    removeIntervento(id) { this.remove(this.KEYS.interventi, id); },

    getInterventiByDate(dateStr) {
        return this.getAll(this.KEYS.interventi).filter(i => i.data === dateStr);
    },

    getInterventiByCliente(clienteId) {
        return this.getAll(this.KEYS.interventi).filter(i => i.clienteId === clienteId);
    },

    getInterventiByMonth(year, month) {
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        return this.getAll(this.KEYS.interventi).filter(i => i.data && i.data.startsWith(prefix));
    },

    // --- Preventivi ---
    getPreventivi() { return this.getAll(this.KEYS.preventivi); },
    addPreventivo(p) { return this.add(this.KEYS.preventivi, p); },
    updatePreventivo(id, p) { return this.update(this.KEYS.preventivi, id, p); },
    removePreventivo(id) { this.remove(this.KEYS.preventivi, id); },

    getNextPreventivoNumber() {
        const preventivi = this.getPreventivi();
        if (preventivi.length === 0) return 1;
        const nums = preventivi.map(p => p.numero || 0);
        return Math.max(...nums) + 1;
    },

    // --- Fatture ---
    getFatture() { return this.getAll(this.KEYS.fatture); },
    addFattura(f) { return this.add(this.KEYS.fatture, f); },
    updateFattura(id, f) { return this.update(this.KEYS.fatture, id, f); },
    removeFattura(id) { this.remove(this.KEYS.fatture, id); },

    getNextFatturaNumber() {
        const fatture = this.getFatture();
        if (fatture.length === 0) return 1;
        const nums = fatture.map(f => f.numero || 0);
        return Math.max(...nums) + 1;
    },

    // --- Magazzino ---
    getMagazzino() { return this.getAll(this.KEYS.magazzino); },
    addProdotto(p) { return this.add(this.KEYS.magazzino, p); },
    updateProdotto(id, p) { return this.update(this.KEYS.magazzino, id, p); },
    removeProdotto(id) { this.remove(this.KEYS.magazzino, id); },
    searchMagazzino(q) { return this.search(this.KEYS.magazzino, q, ['nome', 'categoria']); },

    getProdottiScortaBassa() {
        return this.getMagazzino().filter(p => p.quantita <= (p.scortaMinima || 5));
    },

    // --- Statistiche ---
    getStats() {
        const oggi = new Date().toISOString().split('T')[0];
        const interventi = this.getInterventi();
        const fatture = this.getFatture();
        const now = new Date();
        const meseCorrente = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const interventiOggi = interventi.filter(i => i.data === oggi);
        const interventiMese = interventi.filter(i => i.data && i.data.startsWith(meseCorrente));

        const fatturatoMese = fatture
            .filter(f => f.data && f.data.startsWith(meseCorrente))
            .reduce((sum, f) => sum + (f.totale || 0), 0);

        const fattureScadute = fatture.filter(f => f.stato === 'scaduto');

        return {
            totaleClienti: this.getClienti().length,
            totaleDipendenti: this.getDipendenti().length,
            interventiOggi: interventiOggi.length,
            interventiOggiList: interventiOggi,
            interventiMese: interventiMese.length,
            interventiCompletatiMese: interventiMese.filter(i => i.stato === 'completato').length,
            fatturatoMese,
            fattureScadute: fattureScadute.length,
            prodottiScortaBassa: this.getProdottiScortaBassa().length,
            preventiviInAttesa: this.getPreventivi().filter(p => p.stato === 'inviato').length,
        };
    },

    // --- Export / Import ---
    exportData() {
        const data = {};
        for (const [name, key] of Object.entries(this.KEYS)) {
            data[name] = this.getAll(key);
        }
        return JSON.stringify(data, null, 2);
    },

    importData(jsonString) {
        const data = JSON.parse(jsonString);
        for (const [name, key] of Object.entries(this.KEYS)) {
            if (data[name]) {
                this.saveAll(key, data[name]);
            }
        }
    },

    exportCSV(key) {
        const items = this.getAll(key);
        if (items.length === 0) return '';
        const headers = Object.keys(items[0]);
        const rows = items.map(item =>
            headers.map(h => {
                let val = item[h];
                if (val === null || val === undefined) val = '';
                if (typeof val === 'object') val = JSON.stringify(val);
                val = String(val).replace(/"/g, '""');
                return `"${val}"`;
            }).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
    },

    // --- Seed demo data ---
    seedDemoData() {
        if (this.getClienti().length > 0) return;

        // Clienti demo
        const clienti = [
            { ragioneSociale: 'Condominio Via Roma 15', tipo: 'condominio', indirizzo: 'Via Roma 15, Milano', email: 'admin@condroma15.it', telefono: '02 1234567', note: 'Pulizia scale e cortile' },
            { ragioneSociale: 'Studio Legale Bianchi', tipo: 'ufficio', indirizzo: 'Corso Italia 42, Milano', email: 'info@studiobianchi.it', telefono: '02 7654321', note: 'Pulizia giornaliera uffici' },
            { ragioneSociale: 'Supermercato FreshMart', tipo: 'commerciale', indirizzo: 'Via Torino 8, Milano', email: 'direttore@freshmart.it', telefono: '02 9876543', note: 'Pulizia notturna' },
            { ragioneSociale: 'Famiglia Rossi', tipo: 'privato', indirizzo: 'Via Dante 22, Milano', email: 'rossi@email.it', telefono: '333 1234567', note: 'Pulizia settimanale appartamento' },
        ];
        clienti.forEach(c => this.addCliente(c));

        // Dipendenti demo
        const dipendenti = [
            { nome: 'Marco', cognome: 'Verdi', ruolo: 'Caposquadra', telefono: '334 1111111', email: 'marco.verdi@primula.it', disponibilita: 'full-time' },
            { nome: 'Laura', cognome: 'Neri', ruolo: 'Operatrice', telefono: '335 2222222', email: 'laura.neri@primula.it', disponibilita: 'full-time' },
            { nome: 'Giuseppe', cognome: 'Russo', ruolo: 'Operatore', telefono: '336 3333333', email: 'giuseppe.russo@primula.it', disponibilita: 'part-time' },
            { nome: 'Anna', cognome: 'Colombo', ruolo: 'Operatrice', telefono: '337 4444444', email: 'anna.colombo@primula.it', disponibilita: 'full-time' },
        ];
        dipendenti.forEach(d => this.addDipendente(d));

        // Prodotti magazzino demo
        const prodotti = [
            { nome: 'Detergente pavimenti', categoria: 'Detergenti', quantita: 25, unita: 'litri', scortaMinima: 10, prezzoUnitario: 4.50 },
            { nome: 'Sgrassatore universale', categoria: 'Detergenti', quantita: 15, unita: 'litri', scortaMinima: 5, prezzoUnitario: 6.00 },
            { nome: 'Disinfettante superfici', categoria: 'Sanificazione', quantita: 3, unita: 'litri', scortaMinima: 5, prezzoUnitario: 8.50 },
            { nome: 'Sacchi spazzatura 110L', categoria: 'Consumabili', quantita: 200, unita: 'pezzi', scortaMinima: 50, prezzoUnitario: 0.15 },
            { nome: 'Guanti in lattice (M)', categoria: 'DPI', quantita: 4, unita: 'confezioni', scortaMinima: 5, prezzoUnitario: 7.00 },
            { nome: 'Panno microfibra', categoria: 'Attrezzature', quantita: 30, unita: 'pezzi', scortaMinima: 10, prezzoUnitario: 2.50 },
        ];
        prodotti.forEach(p => this.addProdotto(p));

        // Interventi demo
        const oggi = new Date();
        const formatDate = (d) => d.toISOString().split('T')[0];
        const allClienti = this.getClienti();
        const allDipendenti = this.getDipendenti();

        const interventi = [
            { clienteId: allClienti[0].id, clienteNome: allClienti[0].ragioneSociale, data: formatDate(oggi), ora: '08:00', durata: 3, tipo: 'ordinaria', stato: 'programmato', dipendentiIds: [allDipendenti[0].id, allDipendenti[1].id], dipendentiNomi: 'Marco V., Laura N.', note: 'Pulizia scale piano 1-5' },
            { clienteId: allClienti[1].id, clienteNome: allClienti[1].ragioneSociale, data: formatDate(oggi), ora: '14:00', durata: 2, tipo: 'ordinaria', stato: 'programmato', dipendentiIds: [allDipendenti[2].id], dipendentiNomi: 'Giuseppe R.', note: 'Pulizia uffici e bagni' },
            { clienteId: allClienti[2].id, clienteNome: allClienti[2].ragioneSociale, data: formatDate(new Date(oggi.getTime() + 86400000)), ora: '22:00', durata: 4, tipo: 'straordinaria', stato: 'programmato', dipendentiIds: [allDipendenti[0].id, allDipendenti[3].id], dipendentiNomi: 'Marco V., Anna C.', note: 'Pulizia completa reparto freschi' },
            { clienteId: allClienti[3].id, clienteNome: allClienti[3].ragioneSociale, data: formatDate(new Date(oggi.getTime() - 86400000)), ora: '10:00', durata: 3, tipo: 'ordinaria', stato: 'completato', dipendentiIds: [allDipendenti[1].id], dipendentiNomi: 'Laura N.', note: 'Pulizia appartamento completo' },
        ];
        interventi.forEach(i => this.addIntervento(i));

        // Preventivi demo
        const preventivi = [
            { numero: 1, clienteId: allClienti[0].id, clienteNome: allClienti[0].ragioneSociale, data: formatDate(new Date(oggi.getTime() - 7 * 86400000)), stato: 'accettato', righe: [{ descrizione: 'Pulizia scale settimanale', quantita: 4, prezzoUnitario: 120 }, { descrizione: 'Pulizia cortile', quantita: 2, prezzoUnitario: 80 }], totale: 640, note: 'Contratto mensile' },
            { numero: 2, clienteId: allClienti[2].id, clienteNome: allClienti[2].ragioneSociale, data: formatDate(new Date(oggi.getTime() - 3 * 86400000)), stato: 'inviato', righe: [{ descrizione: 'Sanificazione completa', quantita: 1, prezzoUnitario: 1500 }], totale: 1500, note: 'Intervento una tantum' },
        ];
        preventivi.forEach(p => this.addPreventivo(p));

        // Fatture demo
        const fatture = [
            { numero: 1, preventivoId: null, clienteId: allClienti[0].id, clienteNome: allClienti[0].ragioneSociale, data: formatDate(new Date(oggi.getTime() - 15 * 86400000)), scadenza: formatDate(new Date(oggi.getTime() - 5 * 86400000)), stato: 'pagato', righe: [{ descrizione: 'Pulizia scale - Febbraio', quantita: 4, prezzoUnitario: 120 }, { descrizione: 'Pulizia cortile - Febbraio', quantita: 2, prezzoUnitario: 80 }], totale: 640 },
            { numero: 2, preventivoId: null, clienteId: allClienti[1].id, clienteNome: allClienti[1].ragioneSociale, data: formatDate(new Date(oggi.getTime() - 10 * 86400000)), scadenza: formatDate(new Date(oggi.getTime() + 20 * 86400000)), stato: 'in_attesa', righe: [{ descrizione: 'Pulizia uffici - Febbraio', quantita: 20, prezzoUnitario: 45 }], totale: 900 },
        ];
        fatture.forEach(f => this.addFattura(f));
    }
};

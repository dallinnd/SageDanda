const diceConfig = [
    { id: 'yellow', label: 'Yellow', color: '#fbbf24', text: '#000' },
    { id: 'purple', label: 'Purple (×2)', color: '#a855f7', text: '#fff' },
    { id: 'blue', label: 'Blue (Sparkle ×2)', color: '#3b82f6', text: '#fff' },
    { id: 'red', label: 'Red (Sum × # of Red)', color: '#ef4444', text: '#fff' },
    { id: 'green', label: 'Green', color: '#22c55e', text: '#fff' },
    { id: 'clear', label: 'Clear', color: '#cbd5e1', text: '#000' },
    { id: 'pink', label: 'Pink/Sage', color: '#ec4899', text: '#fff' }
];

let games = JSON.parse(localStorage.getItem('panda_games')) || [];
let settings = JSON.parse(localStorage.getItem('panda_settings')) || { theme: 'dark' };
let activeGame = null;
let keypadValue = '';
let activeInputField = null;
let navPressTimer;

const app = document.getElementById('app');

function applySettings() {
    document.body.classList.toggle('light-theme', settings.theme === 'light');
    localStorage.setItem('panda_settings', JSON.stringify(settings));
}

// --- Home & Setup ---
function showSplash() {
    app.innerHTML = `<div class="h-full flex flex-col items-center justify-center bg-[#0f172a]" onclick="showHome()">
        <h1 class="text-6xl font-black text-green-400">PANDA</h1>
        <h2 class="text-2xl font-bold text-slate-500 tracking-[0.3em] uppercase">Royale</h2>
        <p class="mt-12 text-slate-600 animate-pulse font-bold text-xs uppercase">Tap to Enter</p>
    </div>`;
}

function showHome() {
    activeGame = null;
    const list = games.map((g, i) => `
        <div class="bg-[var(--bg-card)] p-6 rounded-2xl mb-4 flex justify-between items-center border border-[var(--border-ui)] active:scale-[0.98] transition-all" onclick="openGameActions(${i})">
            <div class="flex-1">
                <div class="text-[10px] font-black opacity-40 uppercase tracking-widest">Game #${games.length - i}</div>
                <div class="text-xl font-bold">${g.date}</div>
            </div>
            <div class="text-3xl font-black text-green-500">${calculateGrandTotal(g)}</div>
        </div>`).join('');

    app.innerHTML = `
        <div class="p-6 h-full flex flex-col animate-fadeIn">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-black tracking-tighter">History</h1>
                <button onclick="toggleMenu()" class="p-2 bg-black/5 rounded-xl"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" d="M4 6h16M4 12h16m-7 6h7"></path></svg></button>
            </div>
            <div class="flex-1 overflow-y-auto">${list || '<p class="opacity-30 italic text-center py-20">No history found.</p>'}</div>
            <button onclick="startNewGame()" class="w-full bg-green-600 py-5 rounded-3xl font-black text-xl text-white mt-6 shadow-xl">NEW GAME</button>
        </div>`;
}

// --- Core Render ---
function renderGame() {
    const roundNum = activeGame.currentRound + 1;
    const roundData = activeGame.rounds[activeGame.currentRound];

    let prevYellowHtml = (activeGame.currentRound > 0) ? 
        `<div class="prev-round-box"><span>Prev Round Yellow Total</span><span class="text-xl">${(activeGame.rounds[activeGame.currentRound - 1].yellow || []).reduce((a, b) => a + b, 0)}</span></div>` : '';

    let sageMeterHtml = (roundNum >= 2) ? 
        `<div class="sage-meter-container">
            <div class="flex justify-between items-center"><span class="text-[10px] font-black uppercase opacity-40">Sage Meter</span><span id="sage-percent-text" class="text-[10px] font-black text-teal-500 uppercase">0% Sage</span></div>
            <div class="sage-meter-bg"><div id="sage-meter-bar"></div></div>
        </div>` : '';

    app.innerHTML = `
        <div class="scroll-area" id="game-scroll">
            <div class="sticky top-0 bg-inherit backdrop-blur-md z-50 p-5 border-b border-[var(--border-ui)] flex justify-between items-center">
                <button onclick="showHome()" class="text-[10px] font-black uppercase opacity-50 px-3 py-2 rounded-lg bg-black/5">Exit</button>
                <div class="flex items-center gap-6">
                    <button class="round-nav-btn ${roundNum === 1 ? 'opacity-0 pointer-events-none' : ''}" onmousedown="startNavJump(-1)" onmouseup="endNavJump(-1)" ontouchstart="startNavJump(-1)" ontouchend="endNavJump(-1)">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <div class="text-center"><div class="text-xl font-black uppercase">Round ${roundNum}</div><div id="round-total-display" class="text-5xl font-black">0</div></div>
                    <button class="round-nav-btn ${roundNum === 10 ? 'opacity-0 pointer-events-none' : ''}" onmousedown="startNavJump(1)" onmouseup="endNavJump(1)" ontouchstart="startNavJump(1)" ontouchend="endNavJump(1)">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
                <div class="w-10"></div>
            </div>
            
            <div class="p-4 pb-8">
                ${prevYellowHtml}
                ${sageMeterHtml}
                <div class="space-y-3">
                    ${diceConfig.map(dice => renderDiceRow(dice, roundData)).join('')}
                    
                    <div id="wild-section-header" class="mt-8 border-t border-[var(--border-ui)] pt-6 ${roundNum === 1 ? 'hidden' : ''}">
    
                        <div class="wild-header-container">
                            <span class="text-[10px] font-black uppercase tracking-widest">Wild Dice Counter</span>
        
                            <div class="counter-mini-controls">
                                <button onclick="adjustWildCount(-1)" class="counter-mini-btn btn-minus">-</button>
            
                                <span id="wild-count-num" class="text-3xl font-black text-black">${(roundData.wild || []).length}</span>
            
                                <button onclick="adjustWildCount(1)" class="counter-mini-btn btn-plus">+</button>
                            </div>
                        </div>
    
                        <div class="wild-stack" id="wild-list-container">
                            ${(roundData.wild || []).map((w, idx) => renderWildCardHtml(w, idx)).join('')}
                        </div>
                    </div>
                </div>
                <div class="grand-total-footer"><span class="text-[10px] font-black uppercase opacity-50 block mb-1">Grand Total</span><span id="grand-total-box" class="text-5xl font-black">0</span></div>
            </div>
        </div>

        <div class="keypad-area p-4 shadow-2xl flex flex-col">
            <div id="active-input-display" class="text-center mb-6 h-10 uppercase opacity-60 tracking-[0.2em] text-3xl font-black">-</div>
            <div class="grid grid-cols-4 gap-3 flex-1">
                ${[1,2,3].map(n => `<button onclick="kpInput('${n}')" class="kp-btn bg-black/5 text-inherit text-4xl">${n}</button>`).join('')}
                <button id="add-btn" onclick="kpEnter()" class="kp-btn bg-green-600 text-white row-span-4 h-full">ADD</button>
                ${[4,5,6].map(n => `<button onclick="kpInput('${n}')" class="kp-btn bg-black/5 text-inherit text-4xl">${n}</button>`).join('')}
                ${[7,8,9].map(n => `<button onclick="kpInput('${n}')" class="kp-btn bg-black/5 text-inherit text-4xl">${n}</button>`).join('')}
                <button onclick="kpClear()" class="kp-btn bg-black/5 text-lg font-bold text-slate-400">CLR</button>
                <button onclick="kpInput('0')" class="kp-btn bg-black/5 text-inherit text-4xl">0</button>
                <button onclick="kpToggleNeg()" class="kp-btn bg-black/5 text-inherit text-2xl">+/-</button>
            </div>
        </div>`;
    updateAllDisplays();
}

// --- Navigation with Haptics ---
function startNavJump(dir) {
    navPressTimer = setTimeout(() => {
        navPressTimer = null;
        activeGame.currentRound = (dir === -1) ? 0 : 9;
        if ("vibrate" in navigator) navigator.vibrate([60, 40, 60]);
        renderGame();
    }, 500);
}

function endNavJump(dir) {
    if (navPressTimer) {
        clearTimeout(navPressTimer);
        const next = activeGame.currentRound + dir;
        if (next >= 0 && next < 10) {
            activeGame.currentRound = next;
            if ("vibrate" in navigator) navigator.vibrate(15);
            renderGame();
        }
    }
}

// --- Wild Dice Mini-Counter & Scroll Lock ---
function adjustWildCount(delta) {
    const rd = activeGame.rounds[activeGame.currentRound];
    if (!rd.wild) rd.wild = [];
    const newCount = rd.wild.length + delta;
    if (newCount < 0 || newCount > 9) return;

    const container = document.getElementById('wild-list-container');
    if (delta > 0) {
        const nw = { value: 0, target: 'purple' };
        rd.wild.push(nw);
        const temp = document.createElement('div');
        temp.innerHTML = renderWildCardHtml(nw, rd.wild.length - 1);
        container.appendChild(temp.firstElementChild);
    } else {
        const last = document.getElementById(`wild-card-${rd.wild.length - 1}`);
        if (last) last.remove();
        rd.wild.pop();
        if (activeInputField === `wild-${rd.wild.length}`) activeInputField = null;
    }
    document.getElementById('wild-count-num').textContent = rd.wild.length;
    updateAllDisplays(); saveGame();
}

function updateSageMeter() {
    const round = activeGame.rounds[activeGame.currentRound];
    if (activeGame.currentRound === 0) return;
    const wildTargets = (round.wild || []).filter(w => w.value > 0).map(w => w.target);
    let count = 0;
    diceConfig.forEach(d => { if ((round[d.id] && round[d.id].length > 0) || wildTargets.includes(d.id)) count++; });
    const percent = Math.min(Math.round((count / 6) * 100), 100);
    const bar = document.getElementById('sage-meter-bar');
    const text = document.getElementById('sage-percent-text');
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = percent === 100 ? 'Sage Fulfilled ✨' : percent + '% Sage';
    if (percent === 100 && !round.sagePopupTriggered) {
        round.sagePopupTriggered = true;
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay animate-fadeIn'; overlay.onclick = () => overlay.remove();
        overlay.innerHTML = `<div class="action-popup"><h2 class="text-4xl font-black text-teal-400 mb-4">✨ 100% SAGE!</h2><p class="text-slate-500 font-bold uppercase tracking-widest text-xs">Sage Meter Reached</p></div>`;
        document.body.appendChild(overlay);
    }
}

function updateAllDisplays() {
    const round = activeGame.rounds[activeGame.currentRound];
    const wildBonuses = {};
    (round.wild || []).forEach((w, i) => {
        wildBonuses[w.target] = (wildBonuses[w.target] || 0) + (w.value || 0);
        const displays = document.querySelectorAll('.wild-val-display');
        if (displays[i]) displays[i].textContent = w.value || 0;
    });
    diceConfig.forEach(d => {
        const vals = round[d.id] || [];
        let base = (vals.reduce((a, b) => a + b, 0)) + (wildBonuses[d.id] || 0);
        let score = (d.id === 'purple' || (d.id === 'blue' && round.blueHasSparkle)) ? base * 2 : (d.id === 'red') ? base * vals.length : base;
        if (document.getElementById(`${d.id}-sum`)) document.getElementById(`${d.id}-sum`).textContent = score;
        const valEl = document.getElementById(`${d.id}-values`);
        if (valEl) valEl.innerHTML = vals.map((v, i) => `<span class="bg-black/10 px-3 py-1 rounded-lg text-sm font-black">${v} <button onclick="event.stopPropagation(); removeVal('${d.id}', ${i})" class="ml-2 opacity-30">×</button></span>`).join('');
    });
    document.getElementById('round-total-display').textContent = calculateRoundTotal(round);
    document.getElementById('grand-total-box').textContent = calculateGrandTotal(activeGame);
    updateSageMeter();
}

// Support Handlers
function kpInput(v) { keypadValue += v; updateKpDisplay(); }
function kpClear() { keypadValue = ''; updateKpDisplay(); }
function kpToggleNeg() { keypadValue = keypadValue.startsWith('-') ? keypadValue.substring(1) : (keypadValue ? '-' + keypadValue : '-'); updateKpDisplay(); }
function updateKpDisplay() { const d = document.getElementById('active-input-display'); if (d) d.textContent = keypadValue || (activeInputField ? `Input: ${activeInputField.toUpperCase()}` : '-'); }
function kpEnter() {
    if (!activeInputField || !keypadValue || keypadValue === '-') return;
    const rd = activeGame.rounds[activeGame.currentRound];
    if (activeInputField.startsWith('wild-')) { rd.wild[parseInt(activeInputField.split('-')[1])].value = parseFloat(keypadValue); }
    else { if(!rd[activeInputField]) rd[activeInputField] = []; rd[activeInputField].push(parseFloat(keypadValue)); }
    kpClear(); updateAllDisplays(); saveGame();
}
function setActiveInput(id) {
    activeInputField = id; document.querySelectorAll('.wild-card').forEach(c => c.classList.remove('active-input'));
    const config = diceConfig.find(d => d.id === id);
    diceConfig.forEach(d => { const r = document.getElementById(`row-${d.id}`); if (r) { r.style.backgroundColor = ""; r.style.color = ""; } });
    const activeRow = document.getElementById(`row-${id}`);
    if (activeRow) { activeRow.style.backgroundColor = config.color; activeRow.style.color = config.text; }
    document.querySelectorAll('.kp-btn').forEach(b => { b.style.backgroundColor = config.color; b.style.color = config.text; });
    const addBtn = document.getElementById('add-btn'); if (addBtn) { addBtn.style.backgroundColor = config.text === '#fff' ? '#fff' : '#000'; addBtn.style.color = config.text === '#fff' ? '#000' : '#fff'; }
    updateKpDisplay();
}
function setActiveWildInput(idx) {
    activeInputField = `wild-${idx}`;
    document.querySelectorAll('.wild-card').forEach((c, i) => c.classList.toggle('active-input', i === idx));
    document.querySelectorAll('.dice-row').forEach(r => { r.style.backgroundColor = ""; r.style.color = ""; });
    document.querySelectorAll('.kp-btn').forEach(b => { b.style.backgroundColor = "#fff"; b.style.color = "#000"; });
    const addBtn = document.getElementById('add-btn'); if (addBtn) { addBtn.style.backgroundColor = '#16a34a'; addBtn.style.color = '#fff'; }
    updateKpDisplay();
}
function setWildTarget(idx, targetId) {
    activeGame.rounds[activeGame.currentRound].wild[idx].target = targetId;
    const card = document.getElementById(`wild-card-${idx}`);
    if (card) { card.style.borderLeftColor = diceConfig.find(d => d.id === targetId).color; const items = card.querySelectorAll('.wheel-item'); diceConfig.filter(d => d.id !== 'yellow').forEach((t, i) => items[i].classList.toggle('selected', t.id === targetId)); }
    updateAllDisplays(); saveGame();
}
function renderWildCardHtml(w, idx) {
    const color = diceConfig.find(d => d.id === w.target).color;
    return `<div onclick="setActiveWildInput(${idx})" id="wild-card-${idx}" class="wild-card ${activeInputField === 'wild-'+idx ? 'active-input' : ''}" style="border-left: 8px solid ${color}">
        <div class="flex justify-between items-start"><span class="text-[10px] font-black uppercase opacity-40">Wild Dice #${idx+1}</span><span class="text-3xl font-black wild-val-display">${w.value || 0}</span></div>
        <div class="color-picker-wheel">${diceConfig.filter(d => d.id !== 'yellow').map(d => `<div onclick="event.stopPropagation(); setWildTarget(${idx}, '${d.id}')" class="wheel-item ${w.target === d.id ? 'selected' : ''}" style="background-color: ${d.color}"></div>`).join('')}</div>
    </div>`;
}
function renderDiceRow(dice, roundData) {
    const isBlue = dice.id === 'blue';
    const sparkleBtn = isBlue ? `<button id="sparkle-btn" onclick="event.stopPropagation(); toggleSparkle()" class="sparkle-btn-full ${roundData.blueHasSparkle ? 'sparkle-on' : 'sparkle-off'}">${roundData.blueHasSparkle ? 'Sparkle Activated ✨' : 'Add Sparkle?'}</button>` : '';
    return `<div onclick="setActiveInput('${dice.id}')" id="row-${dice.id}" class="dice-row p-5 rounded-2xl border-l-8 border-transparent cursor-pointer">
        <div class="flex justify-between items-center"><span class="font-black uppercase tracking-tight">${dice.label}</span><span id="${dice.id}-sum" class="text-3xl font-black">0</span></div>
        <div id="${dice.id}-values" class="flex flex-wrap gap-2 mt-2 min-h-[10px]"></div>${sparkleBtn}
    </div>`;
}
function changeRound(s) { const n = activeGame.currentRound + s; if (n >= 0 && n < 10) { activeGame.currentRound = n; renderGame(); } }
function removeVal(id, idx) { activeGame.rounds[activeGame.currentRound][id].splice(idx, 1); updateAllDisplays(); saveGame(); }
function toggleSparkle() { activeGame.rounds[activeGame.currentRound].blueHasSparkle = !activeGame.rounds[activeGame.currentRound].blueHasSparkle; updateAllDisplays(); }
function setTheme(t) { settings.theme = t; applySettings(); toggleMenu(); showHome(); }
function saveGame() { localStorage.setItem('panda_games', JSON.stringify(games)); }
function calculateGrandTotal(g) { return g.rounds.reduce((t, r) => t + calculateRoundTotal(r), 0); }
function calculateRoundTotal(round) {
    let total = 0; const wildBonuses = {}; (round.wild || []).forEach(w => wildBonuses[w.target] = (wildBonuses[w.target] || 0) + (w.value || 0));
    diceConfig.forEach(d => {
        const vals = round[d.id] || []; let base = (vals.reduce((a, b) => a + b, 0)) + (wildBonuses[d.id] || 0);
        if (d.id === 'purple' || (d.id === 'blue' && round.blueHasSparkle)) total += (base * 2); else if (d.id === 'red') total += (base * vals.length); else total += base;
    }); return total;
}
function openGameActions(index) {
    const overlay = document.createElement('div'); overlay.id = 'action-modal'; overlay.className = 'modal-overlay animate-fadeIn'; overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `<div class="action-popup"><h2 class="text-2xl font-black mb-8">Game Actions</h2><div class="flex justify-center gap-10"><button onclick="resumeGame(${index})" class="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center text-white"><svg class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></button><button onclick="confirmDelete(${index})" class="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div></div>`;
    document.body.appendChild(overlay);
}
function resumeGame(i) { activeGame = games[i]; renderGame(); }
function confirmDelete(index) { if(confirm("Delete game?")) { games.splice(index, 1); saveGame(); showHome(); } }
function toggleMenu() {
    const existing = document.getElementById('menu-overlay'); if (existing) { existing.remove(); return; }
    const menu = document.createElement('div'); menu.id = 'menu-overlay'; menu.className = 'modal-overlay justify-end animate-fadeIn'; menu.onclick = (e) => { if(e.target === menu) toggleMenu(); };
    menu.innerHTML = `<div class="menu-panel flex flex-col" style="width: 280px; height: 100%; background: var(--bg-main); padding: 2rem; border-left: 1px solid var(--border-ui);"><h2 class="text-xl font-black uppercase mb-10">Settings</h2><button onclick="setTheme('dark')" class="w-full text-left p-4 rounded-2xl border-2 mb-3">Dark Navy</button><button onclick="setTheme('light')" class="w-full text-left p-4 rounded-2xl border-2">Off-White</button><button onclick="clearHistory()" class="mt-auto text-red-600 font-bold p-4 opacity-50 italic">Clear All History</button></div>`;
    document.body.appendChild(menu);
}
function clearHistory() { if(confirm("Clear all?")) { games = []; saveGame(); toggleMenu(); showHome(); } }
function startNewGame() { activeGame = { id: Date.now(), date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), currentRound: 0, rounds: Array(10).fill(null).map(() => ({ yellow: [], purple: [], blue: [], red: [], green: [], clear: [], pink: [], wild: [], blueHasSparkle: false, sagePopupTriggered: false })) }; games.unshift(activeGame); saveGame(); renderGame(); }

applySettings();
showSplash();

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

const app = document.getElementById('app');

function applySettings() {
    document.body.classList.toggle('light-theme', settings.theme === 'light');
    localStorage.setItem('panda_settings', JSON.stringify(settings));
}

function showHome() {
    activeInputField = null;
    const list = games.map((g, i) => `
        <div class="bg-[var(--bg-card)] p-6 rounded-2xl mb-4 flex justify-between items-center border border-[var(--border-ui)] active:scale-[0.98] transition-all" onclick="openGameActions(${i})">
            <div class="flex-1">
                <div class="text-[10px] font-black opacity-40 uppercase tracking-widest">Game #${games.length - i}</div>
                <div class="text-xl font-bold">${g.date}</div>
            </div>
            <div class="text-3xl font-black" style="color: var(--color-score)">${calculateGrandTotal(g)}</div>
        </div>`).join('');

    app.innerHTML = `<div class="p-6 h-full flex flex-col animate-fadeIn">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-black tracking-tighter">History</h1>
                <button onclick="toggleMenu()" class="p-2 bg-black/5 rounded-xl"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" d="M4 6h16M4 12h16m-7 6h7"></path></svg></button>
            </div>
            <div class="flex-1 overflow-y-auto">${list || '<p class="opacity-30 italic text-center py-20">No games found.</p>'}</div>
            <button onclick="startNewGame()" class="w-full bg-green-600 py-5 rounded-3xl font-black text-xl text-white mt-6 shadow-xl">NEW GAME</button>
        </div>`;
}

function openGameActions(index) {
    const overlay = document.createElement('div');
    overlay.id = 'action-modal';
    overlay.className = 'modal-overlay animate-fadeIn';
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `<div class="action-popup">
        <h2 class="text-2xl font-black mb-8">Game #${games.length - index}</h2>
        <div class="flex justify-center gap-10">
            <button onclick="resumeGame(${index})" class="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><svg class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></button>
            <button onclick="confirmDelete(${index})" class="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function resumeGame(index) {
    activeGame = games[index];
    const modal = document.getElementById('action-modal');
    if (modal) modal.remove();
    renderGame();
}

function confirmDelete(index) {
    if (confirm("Permanently delete this game?")) {
        games.splice(index, 1);
        saveGame();
        document.getElementById('action-modal').remove();
        showHome();
    }
}

function renderGame() {
    const roundNum = activeGame.currentRound + 1;
    const rd = activeGame.rounds[activeGame.currentRound];

    let prevYellowHtml = '';
    if (activeGame.currentRound > 0) {
        const prevSum = (activeGame.rounds[activeGame.currentRound - 1].yellow || []).reduce((a, b) => a + b, 0);
        prevYellowHtml = `<div class="prev-round-box"><span>Prev Round Yellow Total</span><span class="text-4xl">${prevSum}</span></div>`;
    }

    let sageMeterHtml = '';
    if (roundNum >= 2) {
        if (rd.sageQuestComplete) {
            sageMeterHtml = `<div class="sage-meter-container bg-green-500/10 border-green-500/30 text-center py-4"><span class="text-green-500 font-black uppercase tracking-widest text-sm">✨ Sage Quest Complete ✨</span></div>`;
        } else {
            sageMeterHtml = `<div class="sage-meter-container animate-fadeIn"><div class="sage-status-text"><span class="opacity-50">Sage Meter</span><span id="sage-count-text" style="color: #b2ac88">0/6 Colors</span></div><div class="sage-bar-bg"><div id="sage-bar-progress" class="sage-bar-fill"></div></div></div>`;
        }
    }

    const wildCounterHtml = `<div class="wild-counter-top animate-fadeIn"><span class="text-[10px] font-black uppercase opacity-40">Wild Dice Quantity</span><div class="counter-controls"><button onclick="adjustWildCount(-1)" class="counter-btn btn-minus">-</button><span id="wild-count-num" class="text-4xl font-black">${(rd.wild || []).length}</span><button onclick="adjustWildCount(1)" class="counter-btn btn-plus">+</button></div></div>`;

    let kpColor = "bg-black/5"; let kpText = "text-inherit"; let addBtnStyle = "background-color: #16a34a; color: #fff";
    if (activeInputField && !activeInputField.startsWith('wild-')) {
        const config = diceConfig.find(d => d.id === activeInputField);
        kpColor = `style="background-color: ${config.color}"`;
        kpText = `style="color: ${config.text}"`;
        addBtnStyle = `style="background-color: ${config.text === '#fff' ? '#fff' : '#000'}; color: ${config.text === '#fff' ? '#000' : '#fff'}"`;
    }

    app.innerHTML = `<div class="scroll-area" id="game-scroll">
            <div class="sticky top-0 bg-inherit backdrop-blur-md z-50 p-5 border-b border-[var(--border-ui)] flex justify-between items-center">
                <button onclick="showHome()" class="text-[10px] font-black uppercase opacity-50 px-3 py-2 rounded-lg bg-black/5">Exit</button>
                <div class="flex items-center gap-6">
                    <button onclick="changeRound(-1)" class="nav-btn-circle ${roundNum === 1 ? 'disabled' : ''}"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg></button>
                    <div class="text-center"><div class="text-xl font-black uppercase tracking-tighter">Round ${roundNum}</div><div id="round-total-display" class="text-5xl font-black">0</div></div>
                    <button onclick="changeRound(1)" class="nav-btn-circle ${roundNum === 10 ? 'disabled' : ''}"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg></button>
                </div>
                <div class="w-10"></div>
            </div>
            <div class="p-4 pb-8">
                ${prevYellowHtml}
                ${sageMeterHtml}
                <div class="space-y-3">
                    ${diceConfig.map(dice => renderDiceRow(dice, rd)).join('')}
                    <div id="wild-section-header" class="mt-8 border-t border-[var(--border-ui)] pt-6">
                        ${roundNum >= 2 ? wildCounterHtml : ''}
                        <div id="wild-assignments-label" class="text-[10px] font-black uppercase opacity-40 mb-3 ml-2 text-center ${(rd.wild || []).length === 0 ? 'hidden' : ''}">Wild Assignments</div>
                        <div class="wild-stack" id="wild-list-container">${(rd.wild || []).map((w, idx) => renderWildCardHtml(w, idx)).join('')}</div>
                    </div>
                </div>
                <div class="grand-total-footer"><span id="grand-total-box" class="text-5xl font-black">0</span></div>
            </div>
        </div>
        <div class="keypad-area p-4 flex flex-col">
            <div id="active-input-display" class="text-center text-lg font-black mb-3 h-6 uppercase opacity-60">${keypadValue || (activeInputField ? `Adding to ${activeInputField.toUpperCase()}` : '-')}</div>
            <div class="grid grid-cols-4 gap-2 flex-1">
                ${[1,2,3].map(n => `<button onclick="kpInput('${n}')" class="kp-btn ${kpText}" ${kpColor}>${n}</button>`).join('')}
                <button id="add-btn" onclick="kpEnter()" class="kp-btn row-span-4 h-full" ${addBtnStyle}>ADD</button>
                ${[4,5,6].map(n => `<button onclick="kpInput('${n}')" class="kp-btn ${kpText}" ${kpColor}>${n}</button>`).join('')}
                ${[7,8,9].map(n => `<button onclick="kpInput('${n}')" class="kp-btn ${kpText}" ${kpColor}>${n}</button>`).join('')}
                <button onclick="kpClear()" class="kp-btn bg-black/5 text-lg font-bold text-slate-400">CLR</button>
                <button onclick="kpInput('0')" class="kp-btn ${kpText}" ${kpColor}>0</button>
                <button onclick="kpToggleNeg()" class="kp-btn bg-black/5 text-inherit text-2xl">+/-</button>
            </div>
        </div>`;
    updateAllDisplays();
}

function updateAllDisplays() {
    const round = activeGame.rounds[activeGame.currentRound];
    if (!round) return;
    const wildBonuses = {}; const filledColors = new Set();

    (round.wild || []).forEach((w, i) => {
        wildBonuses[w.target] = (wildBonuses[w.target] || 0) + (w.value || 0);
        if (w.value > 0) filledColors.add(w.target);
        const d = document.querySelectorAll('.wild-val-display'); if (d[i]) d[i].textContent = w.value || 0;
    });

    diceConfig.forEach(d => {
        const vals = round[d.id] || []; if (vals.length > 0) filledColors.add(d.id);
        let b = (vals.reduce((a, b) => a + b, 0)) + (wildBonuses[d.id] || 0);
        let s = b;
        if (d.id === 'purple') s = b * 2; else if (d.id === 'blue' && round.blueHasSparkle) s = b * 2; else if (d.id === 'red') s = b * vals.length;
        if (document.getElementById(`${d.id}-sum`)) document.getElementById(`${d.id}-sum`).textContent = s;
        const ve = document.getElementById(`${d.id}-values`);
        if (ve) ve.innerHTML = vals.map((v, idx) => `<span class="bg-black/10 px-3 py-1 rounded-lg text-sm font-black">${v} <button onclick="event.stopPropagation(); removeVal('${d.id}', ${idx})" class="ml-2 opacity-30">×</button></span>`).join('');
    });

    const count = filledColors.size;
    if (count >= 6 && (activeGame.currentRound + 1) >= 2 && !round.sageQuestComplete) { round.sageQuestPending = true; } else { round.sageQuestPending = false; }

    const bar = document.getElementById('sage-bar-progress');
    const text = document.getElementById('sage-count-text');
    if (bar && text) {
        bar.style.width = `${Math.min((count / 6) * 100, 100)}%`; text.textContent = `${count}/6 Colors`;
        if (count >= 6) bar.style.backgroundColor = '#4ade80';
    }
    document.getElementById('round-total-display').textContent = calculateRoundTotal(round);
    document.getElementById('grand-total-box').textContent = calculateGrandTotal(activeGame);
}

function changeRound(s) {
    const rd = activeGame.rounds[activeGame.currentRound];
    if (s > 0 && rd.sageQuestPending && !rd.sageQuestComplete) {
        showSagePopup(() => {
            rd.sageQuestComplete = true; rd.sageQuestPending = false; saveGame();
            const n = activeGame.currentRound + s; if (n >= 0 && n < 10) { activeGame.currentRound = n; renderGame(); }
        });
        return;
    }
    const n = activeGame.currentRound + s; if (n >= 0 && n < 10) { activeGame.currentRound = n; renderGame(); }
}

function showSagePopup(cb) {
    const o = document.createElement('div'); o.className = 'modal-overlay animate-fadeIn cursor-pointer';
    o.onclick = () => { o.remove(); if (cb) cb(); };
    o.innerHTML = `<div class="bg-white rounded-[40px] p-10 flex flex-col items-center shadow-2xl scale-110">
        <h2 class="text-[#b2ac88] text-3xl font-black uppercase tracking-tighter mb-2">Sage Quest</h2>
        <div class="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg mt-6">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <p class="mt-8 text-slate-400 text-[10px] font-black uppercase opacity-50">Tap to Proceed</p>
    </div>`;
    document.body.appendChild(o);
}

function renderDiceRow(dice, roundData) {
    const active = activeInputField === dice.id;
    const style = active ? `style="background-color: ${dice.color}; color: ${dice.text}"` : '';
    const sparkle = dice.id === 'blue' ? `<button onclick="event.stopPropagation(); toggleSparkle()" class="sparkle-btn-full ${roundData.blueHasSparkle ? 'sparkle-on' : 'sparkle-off'}">${roundData.blueHasSparkle ? 'Sparkle Activated ✨' : 'Add Sparkle?'}</button>` : '';
    return `<div onclick="setActiveInput('${dice.id}')" class="dice-row p-5 rounded-2xl border-l-8 cursor-pointer" ${style}>
        <div class="flex justify-between items-center"><span class="font-black uppercase tracking-tight">${dice.label}</span><span id="${dice.id}-sum" class="text-3xl font-black">0</span></div>
        <div id="${dice.id}-values" class="flex flex-wrap gap-2 mt-2 min-h-[10px]"></div>${sparkle}
    </div>`;
}

function renderWildCardHtml(w, idx) {
    const c = diceConfig.find(d => d.id === w.target).color;
    return `<div onclick="setActiveWildInput(${idx})" class="wild-card ${activeInputField === 'wild-'+idx ? 'active-input' : ''}" style="border-left: 8px solid ${c}">
        <div class="flex justify-between items-start"><span class="text-[10px] font-black uppercase opacity-40">Wild #${idx+1}</span><span class="text-3xl font-black wild-val-display">${w.value || 0}</span></div>
        <div class="color-picker-wheel">
            ${diceConfig.filter(d => d.id !== 'yellow').map(d => `<div onclick="event.stopPropagation(); setWildTarget(${idx}, '${d.id}')" class="wheel-item ${w.target === d.id ? 'selected' : ''}" style="background-color: ${d.color}"></div>`).join('')}
        </div>
    </div>`;
}

function adjustWildCount(delta) {
    const rd = activeGame.rounds[activeGame.currentRound];
    if (rd.wild.length + delta < 0 || rd.wild.length + delta > 9) return;
    if (delta > 0) rd.wild.push({ value: 0, target: 'purple' }); else rd.wild.pop();
    renderGame(); saveGame();
}

function setWildTarget(idx, tid) { activeGame.rounds[activeGame.currentRound].wild[idx].target = tid; renderGame(); saveGame(); }
function toggleSparkle() { const rd = activeGame.rounds[activeGame.currentRound]; rd.blueHasSparkle = !rd.blueHasSparkle; renderGame(); saveGame(); }
function setActiveInput(id) { activeInputField = id; renderGame(); }
function setActiveWildInput(idx) { activeInputField = `wild-${idx}`; renderGame(); }
function kpInput(v) { keypadValue += v; renderGame(); }
function kpClear() { keypadValue = ''; renderGame(); }
function kpToggleNeg() { keypadValue = keypadValue.startsWith('-') ? keypadValue.substring(1) : (keypadValue ? '-' + keypadValue : '-'); renderGame(); }
function kpEnter() {
    if (!activeInputField || !keypadValue || keypadValue === '-') return;
    const rd = activeGame.rounds[activeGame.currentRound];
    if (activeInputField.startsWith('wild-')) rd.wild[parseInt(activeInputField.split('-')[1])].value = parseFloat(keypadValue);
    else rd[activeInputField].push(parseFloat(keypadValue));
    keypadValue = ''; renderGame(); saveGame();
}
function removeVal(id, idx) { activeGame.rounds[activeGame.currentRound][id].splice(idx, 1); renderGame(); saveGame(); }
function setTheme(t) { settings.theme = t; applySettings(); showHome(); }
function clearHistory() { if(confirm("Delete ALL games?")) { games = []; saveGame(); showHome(); } }
function saveGame() { localStorage.setItem('panda_games', JSON.stringify(games)); }
function calculateRoundTotal(r) { let t = 0; const wb = {}; (r.wild || []).forEach(w => wb[w.target] = (wb[w.target] || 0) + w.value); diceConfig.forEach(d => { const v = r[d.id] || []; let b = (v.reduce((a,b)=>a+b,0)) + (wb[d.id] || 0); if (d.id === 'purple') t += b*2; else if (d.id === 'blue' && r.blueHasSparkle) t += b*2; else if (d.id === 'red') t += b*v.length; else t += b; }); return t; }
function calculateGrandTotal(g) { return g.rounds.reduce((t, r) => t + calculateRoundTotal(r), 0); }
function startNewGame() { activeGame = { id: Date.now(), date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), currentRound: 0, rounds: Array(10).fill(null).map(() => ({ yellow: [], purple: [], blue: [], red: [], green: [], clear: [], pink: [], wild: [], blueHasSparkle: false, sageQuestComplete: false, sageQuestPending: false })) }; games.unshift(activeGame); saveGame(); renderGame(); }
function toggleMenu() {
    const existing = document.getElementById('menu-overlay'); if (existing) { existing.remove(); return; }
    const m = document.createElement('div'); m.id = 'menu-overlay'; m.className = 'modal-overlay justify-end animate-fadeIn'; m.onclick = (e) => { if(e.target === m) toggleMenu(); };
    m.innerHTML = `<div class="menu-panel flex flex-col"><h2 class="text-xl font-black uppercase mb-10">Settings</h2><button onclick="setTheme('dark')" class="w-full text-left p-4 rounded-2xl border-2 mb-3 ${settings.theme === 'dark' ? 'border-green-600 bg-green-600/10' : 'border-black/5'}">Dark Navy</button><button onclick="setTheme('light')" class="w-full text-left p-4 rounded-2xl border-2 ${settings.theme === 'light' ? 'border-blue-600 bg-blue-600/10' : 'border-black/5'}">Off-White</button><button onclick="clearHistory()" class="mt-auto text-red-500 font-bold p-4 opacity-70 italic">Clear All History</button></div>`;
    document.body.appendChild(m);
}

applySettings();
showHome();

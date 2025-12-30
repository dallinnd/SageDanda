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

// --- Navigation ---
function showSplash() {
    app.innerHTML = `<div class="h-full flex flex-col items-center justify-center bg-[#0f172a]" onclick="showHome()">
        <h1 class="text-6xl font-black text-green-400">PANDA</h1>
        <h2 class="text-2xl font-bold text-slate-500 tracking-[0.3em] uppercase">Royale</h2>
        <p class="mt-12 text-slate-600 animate-pulse font-bold text-xs uppercase">Tap to Enter</p>
    </div>`;
}

function showHome() {
    const gameCards = games.map((g, i) => `
        <div class="bg-[var(--bg-card)] p-6 rounded-2xl mb-4 flex justify-between items-center border border-[var(--border-ui)] active:scale-[0.98] transition-all" onclick="openGameActions(${i})">
            <div class="flex-1">
                <div class="text-[10px] font-black opacity-40 uppercase tracking-widest">Game #${games.length - i}</div>
                <div class="text-xl font-bold">${g.date}</div>
            </div>
            <div class="text-3xl font-black" style="color: var(--color-score)">${calculateGrandTotal(g)}</div>
        </div>`).join('');

    const listContent = gameCards.length > 0 ? gameCards : '<p class="opacity-30 italic text-center py-20">No games found.</p>';

    app.innerHTML = `
        <div class="p-6 h-full flex flex-col animate-fadeIn">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-black tracking-tighter">History</h1>
                <button onclick="toggleMenu()" class="p-2 bg-black/5 rounded-xl">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-width="2.5" stroke-linecap="round" d="M4 6h16M4 12h16m-7 6h7"></path>
                    </svg>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto">${listContent}</div>
            <button onclick="startNewGame()" class="w-full bg-green-600 py-5 rounded-3xl font-black text-xl text-white mt-6 shadow-xl">NEW GAME</button>
        </div>`;
}

// --- UI Popups ---
function openGameActions(index) {
    const overlay = document.createElement('div');
    overlay.id = 'action-modal';
    overlay.className = 'modal-overlay animate-fadeIn';
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `<div class="action-popup">
        <h2 class="text-2xl font-black mb-8">Game #${games.length - index}</h2>
        <div class="flex justify-center gap-10">
            <button onclick="resumeGame(${index})" class="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center text-white"><svg class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></button>
            <button onclick="confirmDelete(${index})" class="w-16 h-16 rounded-2xl flex items-center justify-center text-white" style="background-color: var(--color-danger)"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function showSagePopup() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 backdrop-blur-2xl z-[2000] flex items-center justify-center animate-fadeIn cursor-pointer';
    overlay.onclick = () => overlay.remove();

    overlay.innerHTML = `
        <div class="w-[85%] max-w-[320px] bg-white border-4 border-yellow-500 rounded-[40px] p-8 text-center shadow-[0_0_50px_rgba(234,179,8,0.3)]">
            <div class="flex flex-col items-center gap-6">
                <div class="w-24 h-24 bg-gradient-to-tr from-amber-400 to-yellow-600 rounded-full flex items-center justify-center text-white shadow-xl ring-4 ring-yellow-200">
                    <svg class="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <div>
                    <h2 class="text-3xl font-black text-yellow-600 tracking-tighter mb-1">✨ SAGE QUEST ✨</h2>
                    <h3 class="text-xl font-black uppercase text-slate-400">COMPLETE</h3>
                </div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Tap anywhere to continue</p>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

// --- Logic Helpers ---

function calculateSageProgress(round) {
    const usedColors = new Set();
    diceConfig.forEach(d => {
        if (round[d.id] && round[d.id].length > 0) usedColors.add(d.id);
    });
    if (round.wild) {
        round.wild.forEach(w => { if (w.value !== 0) usedColors.add(w.target); });
    }
    const count = usedColors.size;
    const percentage = Math.min(100, (count / 6) * 100);
    return { count, percentage };
}

// NEW: Checks if Sage Quest was completed in ANY round of this game
function isSageAlreadyComplete() {
    if (!activeGame) return false;
    return activeGame.rounds.some(r => calculateSageProgress(r).count >= 6);
}

// --- Render Engine ---

function renderGame() {
    const roundNum = activeGame.currentRound + 1;
    const roundData = activeGame.rounds[activeGame.currentRound];
    const sageCompletedAnywhere = isSageAlreadyComplete();

    const leftChevron = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>`;
    const rightChevron = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>`;

    let prevRoundInfoHtml = '';
    if (activeGame.currentRound > 0) {
        const prevRound = activeGame.rounds[activeGame.currentRound - 1];
        const prevYellowSum = (prevRound.yellow || []).reduce((a, b) => a + b, 0);
        const prevTotalScore = calculateRoundTotal(prevRound);

        prevRoundInfoHtml = `
            <div class="animate-fadeIn">
                <div class="prev-round-box"><span>Prev Round Yellow Total</span><span class="text-xl">${prevYellowSum}</span></div>
                <div class="prev-total-box"><span>Last Round Total Score</span><span class="text-xl">${prevTotalScore}</span></div>
            </div>
        `;
    }

    let diceRowsHtml = '';
    if (roundNum === 1) {
        const yellowDice = diceConfig.find(d => d.id === 'yellow');
        diceRowsHtml = `<div class="animate-fadeIn">${renderDiceRow(yellowDice, roundData)}</div>
            <div class="mt-12 text-center animate-fadeIn px-4" style="animation-delay: 0.2s">
                <div class="expansion-gradient text-5xl font-black uppercase tracking-tight">Expansion Pack<br>Edition</div>
            </div>`;
    } else {
        diceRowsHtml = diceConfig.map((dice, idx) => `<div class="animate-fadeIn" style="animation-delay: ${idx * 0.05}s">${renderDiceRow(dice, roundData)}</div>`).join('');
    }

    // --- SAGE SECTION LOGIC ---
    let sageSectionHtml = '';
    if (roundNum >= 2) {
        if (sageCompletedAnywhere) {
            // Static "Complete" badge if already done
            sageSectionHtml = `
                <div class="mb-6 p-6 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-3xl flex items-center justify-center gap-4 animate-fadeIn">
                    <span class="text-yellow-600 font-black tracking-tighter text-xl italic decoration-yellow-300">★ SAGE QUEST COMPLETE ★</span>
                </div>`;
        } else {
            // Show Progress Bar if not yet completed
            sageSectionHtml = `
                <div id="sage-container" class="mb-6 p-4 bg-black/5 rounded-3xl border border-[var(--border-ui)] animate-fadeIn">
                    <div class="flex justify-between items-end mb-2">
                        <span class="text-[10px] font-black uppercase tracking-widest opacity-60">Sage Progress</span>
                        <span id="sage-status-text" class="text-xs font-black uppercase text-green-500">0/6 Used</span>
                    </div>
                    <div class="h-4 w-full bg-black/10 rounded-full overflow-hidden">
                        <div id="sage-progress-fill" class="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500" style="width: 0%"></div>
                    </div>
                </div>`;
        }
    }

    app.innerHTML = `
        <div class="scroll-area" id="game-scroll">
            <div class="sticky top-0 bg-inherit backdrop-blur-md z-50 p-5 border-b border-[var(--border-ui)] flex justify-between items-center">
                <button onclick="showHome()" class="text-[10px] font-black uppercase opacity-50 px-3 py-2 rounded-lg bg-black/5">Exit</button>
                <div class="flex items-center gap-6">
                    <button onclick="changeRound(-1)" class="nav-btn ${roundNum === 1 ? 'disabled' : ''}">${leftChevron}</button>
                    <div class="text-center"><div class="text-xl font-black uppercase">Round ${roundNum}</div><div id="round-total-display" class="text-5xl font-black">0</div></div>
                    <button onclick="changeRound(1)" class="nav-btn ${roundNum === 10 ? 'disabled' : ''}">${rightChevron}</button>
                </div>
                <div class="w-10"></div>
            </div>
            
            <div class="p-4 pb-8">
                ${prevRoundInfoHtml}
                ${sageSectionHtml}
                <div class="section-title animate-fadeIn" style="animation-delay: 0.1s"><h3>Dice Calculators</h3></div>
                <div class="space-y-3">
                    ${diceRowsHtml}
                    <div id="wild-section" class="wild-section-container animate-fadeIn ${roundNum < 2 ? 'hidden' : ''}" style="animation-delay: 0.4s">
                        <div class="wild-counter-inline shadow-sm">
                            <span class="text-[10px] font-black uppercase opacity-60">Wild Dice Qty</span>
                            <div class="flex items-center gap-5">
                                <button onclick="adjustWildCount(-1)" class="wild-btn-minus">-</button>
                                <span id="wild-count-num" class="font-black text-2xl">${(roundData.wild || []).length}</span>
                                <button onclick="adjustWildCount(1)" class="wild-btn-plus">+</button>
                            </div>
                        </div>
                        <div class="wild-stack" id="wild-list-container">${(roundData.wild || []).map((w, idx) => renderWildCardHtml(w, idx)).join('')}</div>
                    </div>
                </div>
                <div class="grand-total-footer animate-fadeIn" style="animation-delay: 0.5s">
                    <span class="text-[10px] font-black uppercase opacity-50 block mb-1">Grand Total</span>
                    <span id="grand-total-box" class="text-5xl font-black">0</span>
                </div>
            </div>
        </div>
        <div id="keypad-container" class="keypad-area p-4 flex flex-col">
            <div id="active-input-display" class="text-center text-lg font-black mb-3 h-6 tracking-widest uppercase opacity-60">-</div>
            <div class="grid grid-cols-4 gap-2 flex-1">
                ${[1,2,3].map(n => `<button onclick="kpInput('${n}')" class="kp-btn bg-black/5 text-inherit text-3xl">${n}</button>`).join('')}
                <button id="add-btn" onclick="kpEnter()" class="kp-btn bg-green-600 text-white row-span-4 h-full">ADD</button>
                ${[4,5,6].map(n => `<button onclick="kpInput('${n}')" class="kp-btn bg-black/5 text-inherit text-3xl">${n}</button>`).join('')}
                ${[7,8,9].map(n => `<button onclick="kpInput('${n}')" class="kp-btn bg-black/5 text-inherit text-3xl">${n}</button>`).join('')}
                <button onclick="kpClear()" class="kp-btn bg-black/5 text-lg font-bold text-slate-400">CLR</button>
                <button onclick="kpInput('0')" class="kp-btn bg-black/5 text-inherit text-3xl">0</button>
                <button onclick="kpToggleNeg()" class="kp-btn bg-black/5 text-inherit text-2xl">+/-</button>
            </div>
        </div>`;
    updateAllDisplays();
}

// --- Logic ---

function updateAllDisplays() {
    const round = activeGame.rounds[activeGame.currentRound];
    if (!round) return;
    
    // Check if Sage is complete for UI styling
    const sage = calculateSageProgress(round);
    const sageText = document.getElementById('sage-status-text');
    const sageFill = document.getElementById('sage-progress-fill');
    
    if (sageText) {
        sageText.textContent = `${sage.count}/6 Used${sage.count >= 6 ? ' - SAGE! ✨' : ''}`;
        sageText.classList.toggle('text-yellow-500', sage.count >= 6);
        sageText.classList.toggle('text-green-500', sage.count < 6);
    }
    
    if (sageFill) {
        sageFill.style.width = `${sage.percentage}%`;
        sageFill.className = sage.count >= 6 
            ? "h-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 transition-all duration-500"
            : "h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500";
    }

    const wildBonuses = {};
    (round.wild || []).forEach((w, i) => {
        wildBonuses[w.target] = (wildBonuses[w.target] || 0) + (w.value || 0);
        const displays = document.querySelectorAll('.wild-val-display');
        if (displays[i]) displays[i].textContent = w.value || 0;
    });

    diceConfig.forEach(d => {
        const vals = round[d.id] || [];
        let base = (vals.reduce((a, b) => a + b, 0)) + (wildBonuses[d.id] || 0);
        let score = base;
        if (d.id === 'purple') score = base * 2;
        else if (d.id === 'blue' && round.blueHasSparkle) score = base * 2;
        else if (d.id === 'red') score = base * vals.length;
        if (document.getElementById(`${d.id}-sum`)) document.getElementById(`${d.id}-sum`).textContent = score;
        
        const valEl = document.getElementById(`${d.id}-values`);
        if (valEl) {
            valEl.innerHTML = vals.map((v, i) => `
                <span class="inline-flex items-center bg-black/10 px-5 py-3 rounded-2xl text-xl font-black shadow-sm border border-black/5 active:scale-95 transition-transform">
                    ${v} <button onclick="event.stopPropagation(); removeVal('${d.id}', ${i})" class="ml-4 w-8 h-8 flex items-center justify-center bg-black/20 rounded-full text-lg opacity-60 active:bg-red-500 active:text-white transition-colors">×</button>
                </span>`).join('');
        }
    });
    document.getElementById('round-total-display').textContent = calculateRoundTotal(round);
    document.getElementById('grand-total-box').textContent = calculateGrandTotal(activeGame);
}

function changeRound(s) { 
    const currentRoundIdx = activeGame.currentRound;
    const currentRoundData = activeGame.rounds[currentRoundIdx];
    const sageNow = calculateSageProgress(currentRoundData).count >= 6;

    // Celebration: Only trigger if Sage was JUST completed in this round
    // AND it wasn't already completed in any PREVIOUS rounds.
    const completedPreviously = activeGame.rounds.slice(0, currentRoundIdx).some(r => calculateSageProgress(r).count >= 6);

    if (s === 1 && sageNow && !completedPreviously) {
        showSagePopup();
    }
    
    const n = activeGame.currentRound + s; 
    if (n >= 0 && n < 10) { 
        activeGame.currentRound = n; 
        renderGame(); 
    } 
}

// --- Standard Game Utils (Kept the same) ---
function renderDiceRow(dice, roundData) {
    const isBlue = dice.id === 'blue';
    const sparkleBtn = isBlue ? `<button id="sparkle-btn" onclick="event.stopPropagation(); toggleSparkle()" class="sparkle-btn-full ${roundData.blueHasSparkle ? 'sparkle-on' : 'sparkle-off'}">${roundData.blueHasSparkle ? 'Sparkle Activated ✨' : 'Add Sparkle?'}</button>` : '';
    return `<div onclick="setActiveInput('${dice.id}')" id="row-${dice.id}" class="dice-row p-5 rounded-2xl border-l-8 border-transparent cursor-pointer">
        <div class="flex justify-between items-center"><span class="font-black uppercase tracking-tight">${dice.label}</span><span id="${dice.id}-sum" class="text-3xl font-black">0</span></div>
        <div id="${dice.id}-values" class="flex flex-wrap gap-3 mt-3 min-h-[10px]"></div>${sparkleBtn}</div>`;
}

function renderWildCardHtml(w, idx) {
    const color = diceConfig.find(d => d.id === w.target).color;
    return `<div onclick="setActiveWildInput(${idx})" id="wild-card-${idx}" class="wild-card ${activeInputField === 'wild-'+idx ? 'active-input' : ''}" style="border-left: 8px solid ${color}">
        <div class="flex justify-between items-start"><span class="text-[10px] font-black uppercase opacity-40">Wild #${idx+1}</span><span class="text-3xl font-black wild-val-display">${w.value || 0}</span></div>
        <div class="color-picker-wheel">${diceConfig.filter(d => d.id !== 'yellow').map(d => `<div onclick="event.stopPropagation(); setWildTarget(${idx}, '${d.id}')" class="wheel-item ${w.target === d.id ? 'selected' : ''}" style="background-color: ${d.color}"></div>`).join('')}</div></div>`;
}

function adjustWildCount(delta) {
    const rd = activeGame.rounds[activeGame.currentRound];
    if (!rd.wild) rd.wild = [];
    if (rd.wild.length + delta < 0 || rd.wild.length + delta > 9) return;
    if (delta > 0) rd.wild.push({ value: 0, target: 'purple' }); else rd.wild.pop();
    renderGame(); saveGame();
}

function setWildTarget(idx, targetId) {
    activeGame.rounds[activeGame.currentRound].wild[idx].target = targetId;
    setActiveWildInput(idx); updateAllDisplays(); saveGame();
}

function toggleSparkle() {
    activeGame.rounds[activeGame.currentRound].blueHasSparkle = !activeGame.rounds[activeGame.currentRound].blueHasSparkle;
    updateAllDisplays(); saveGame();
}

function setActiveWildInput(idx) {
    activeInputField = `wild-${idx}`;
    updateKpDisplay(); renderGame(); // Full render to sync classes
}

function setActiveInput(id) {
    activeInputField = id;
    const config = diceConfig.find(d => d.id === id);
    document.querySelectorAll('.dice-row').forEach(r => { r.style.backgroundColor = ""; r.style.color = ""; });
    const activeRow = document.getElementById(`row-${id}`);
    if (activeRow) { activeRow.style.backgroundColor = config.color; activeRow.style.color = config.text; }
    updateKpDisplay();
}

function calculateRoundTotal(round) {
    let total = 0;
    const wildBonuses = {};
    (round.wild || []).forEach(w => { wildBonuses[w.target] = (wildBonuses[w.target] || 0) + (w.value || 0); });
    diceConfig.forEach(d => {
        const vals = round[d.id] || [];
        let base = (vals.reduce((a, b) => a + b, 0)) + (wildBonuses[d.id] || 0);
        if (d.id === 'purple') total += (base * 2);
        else if (d.id === 'blue' && round.blueHasSparkle) total += (base * 2);
        else if (d.id === 'red') total += (base * vals.length);
        else total += base;
    });
    return total;
}

function kpInput(v) { keypadValue += v; updateKpDisplay(); }
function kpClear() { keypadValue = ''; updateKpDisplay(); }
function kpToggleNeg() { keypadValue = keypadValue.startsWith('-') ? keypadValue.substring(1) : (keypadValue ? '-' + keypadValue : '-'); updateKpDisplay(); }
function updateKpDisplay() { const d = document.getElementById('active-input-display'); if (d) d.textContent = keypadValue || (activeInputField ? `Adding to ${activeInputField.toUpperCase()}` : '-'); }
function kpEnter() {
    if (!activeInputField || !keypadValue || keypadValue === '-') return;
    const rd = activeGame.rounds[activeGame.currentRound];
    if (activeInputField.startsWith('wild-')) rd.wild[parseInt(activeInputField.split('-')[1])].value = parseFloat(keypadValue);
    else rd[activeInputField].push(parseFloat(keypadValue));
    kpClear(); updateAllDisplays(); saveGame();
}

function removeVal(id, idx) { activeGame.rounds[activeGame.currentRound][id].splice(idx, 1); updateAllDisplays(); saveGame(); }
function setTheme(t) { settings.theme = t; applySettings(); toggleMenu(); showHome(); }
function saveGame() { localStorage.setItem('panda_games', JSON.stringify(games)); }
function calculateGrandTotal(g) { return g.rounds.reduce((t, r) => t + calculateRoundTotal(r), 0); }
function resumeGame(i) { activeGame = games[i]; if(document.getElementById('action-modal')) document.getElementById('action-modal').remove(); renderGame(); }
function startNewGame() { 
    activeGame = { id: Date.now(), date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), currentRound: 0, rounds: Array(10).fill(null).map(() => ({ yellow: [], purple: [], blue: [], red: [], green: [], clear: [], pink: [], wild: [], blueHasSparkle: false })) }; 
    games.unshift(activeGame); saveGame(); renderGame(); 
}

applySettings();
showSplash();

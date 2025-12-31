// 1. Configuration
const diceConfig = [
    { id: 'yellow', label: 'Yellow', color: '#fbbf24', text: '#000' },
    { id: 'purple', label: 'Purple (×2)', color: '#a855f7', text: '#fff' },
    { id: 'blue', label: 'Blue (Sparkle ×2)', color: '#3b82f6', text: '#fff' },
    { id: 'red', label: 'Red (Sum × # of Red)', color: '#ef4444', text: '#fff' },
    { id: 'green', label: 'Green', color: '#22c55e', text: '#fff' },
    { id: 'clear', label: 'Clear', color: '#cbd5e1', text: '#000' },
    { id: 'pink', label: 'Pink', color: '#ec4899', text: '#fff' }
];

let games = JSON.parse(localStorage.getItem('panda_games')) || [];
let settings = JSON.parse(localStorage.getItem('panda_settings')) || { theme: 'dark' };
let activeGame = null;
let keypadValue = '';
let activeInputField = null;
const app = document.getElementById('app');

// 2. Core Logic Helpers
function calculateRoundTotal(round) {
    if (!round) return 0;
    let total = 0;
    const wildBonuses = {};
    if (round.wild) {
        round.wild.forEach(w => { wildBonuses[w.target] = (wildBonuses[w.target] || 0) + (w.value || 0); });
    }
    diceConfig.forEach(d => {
        const vals = round[d.id] || [];
        let base = (vals.reduce((a, b) => a + b, 0)) + (wildBonuses[d.id] || 0);
        if (d.id === 'purple' || (d.id === 'blue' && round.blueHasSparkle)) total += (base * 2);
        else if (d.id === 'red') total += (base * vals.length);
        else total += base;
    });
    if (round.sage) total += round.sage.reduce((a, b) => a + b, 0);
    return total;
}

function calculateGrandTotal(g) {
    if (!g || !g.rounds) return 0;
    return g.rounds.reduce((t, r) => t + calculateRoundTotal(r), 0);
}

function calculateSageProgress(round) {
    if (!round) return { count: 0, percentage: 0 };
    const usedColors = new Set();
    diceConfig.forEach(d => { if (round[d.id] && round[d.id].length > 0) usedColors.add(d.id); });
    if (round.wild) { round.wild.forEach(w => { if (w && w.value !== 0) usedColors.add(w.target); }); }
    const count = usedColors.size;
    return { count, percentage: Math.min(100, (count / 6) * 100) };
}

function isSageAlreadyCompleteBy(roundIdx) {
    if (!activeGame) return false;
    return activeGame.rounds.slice(0, roundIdx + 1).some(r => calculateSageProgress(r).count >= 6);
}

// 3. Navigation & Main Views
function showSplash() {
    app.innerHTML = `<div class="h-full flex flex-col items-center justify-center bg-[#0f172a] cursor-pointer" onclick="showHome()">
        <h1 class="text-6xl font-black text-green-400">PANDA</h1>
        <h2 class="text-2xl font-bold text-slate-500 tracking-[0.3em] uppercase">Royale</h2>
        <p class="mt-12 text-slate-600 animate-pulse font-bold text-xs uppercase">Tap to Enter</p>
    </div>`;
}

function showHome() {
    activeGame = null;
    const gameCards = games.map((g, i) => `
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
            <button onclick="toggleMenu()" class="p-2 bg-black/5 rounded-xl"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" d="M4 6h16M4 12h16m-7 6h7"></path></svg></button>
        </div>
        <div class="flex-1 overflow-y-auto">${gameCards || '<p class="opacity-30 italic text-center py-20">No games found.</p>'}</div>
        <button onclick="startNewGame()" class="w-full bg-green-600 py-5 rounded-3xl font-black text-xl text-white mt-6 shadow-xl">NEW GAME</button>
    </div>`;
}

// 4. Gameplay Render Engine
function renderGame() {
    if (!activeGame) return;
    const roundNum = activeGame.currentRound + 1;
    const roundData = activeGame.rounds[activeGame.currentRound];
    const sageGlobalStatus = isSageAlreadyCompleteBy(activeGame.currentRound);

    let prevHtml = '';
    if (activeGame.currentRound > 0) {
        const pr = activeGame.rounds[activeGame.currentRound - 1];
        prevHtml = `<div class="animate-fadeIn"><div class="prev-round-box"><span>Prev Round Yellow Total</span><span class="text-xl">${(pr.yellow || []).reduce((a,b)=>a+b,0)}</span></div><div class="prev-total-box"><span>Last Round Score</span><span class="text-xl">${calculateRoundTotal(pr)}</span></div></div>`;
    }

    let diceHtml = (roundNum === 1) 
        ? `<div class="animate-fadeIn">${renderDiceRow(diceConfig[0], roundData)}</div><div class="mt-12 text-center expansion-gradient text-5xl font-black uppercase">Expansion Pack<br>Edition</div>`
        : diceConfig.map((d, i) => `<div class="animate-fadeIn" style="animation-delay:${i*0.05}s">${renderDiceRow(d, roundData)}</div>`).join('');

    let sageBarHtml = '';
    let sageDiceRowHtml = '';
    if (roundNum >= 2) {
        if (sageGlobalStatus) {
            sageDiceRowHtml = `<div onclick="setActiveInput('sage')" id="row-sage" class="dice-row p-5 rounded-2xl border-l-8 border-transparent cursor-pointer bg-yellow-500 text-black mb-3 animate-fadeIn">
                <div class="flex justify-between items-center"><span class="font-black uppercase tracking-widest text-lg">SAGE</span><span id="sage-sum" class="text-4xl font-black">0</span></div>
                <div id="sage-values" class="flex flex-wrap gap-3 mt-3 min-h-[10px]"></div></div>`;
        } else {
            sageBarHtml = `<div id="sage-container" class="mb-6 p-4 bg-black/5 rounded-3xl border border-[var(--border-ui)] animate-fadeIn">
                <div class="flex justify-between items-end mb-2"><span class="text-[10px] font-black uppercase tracking-widest opacity-60">Sage Progress</span><span id="sage-status-text" class="text-xs font-black uppercase">0/6 Used</span></div>
                <div class="h-4 w-full bg-black/10 rounded-full overflow-hidden"><div id="sage-progress-fill" class="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500" style="width: 0%"></div></div></div>`;
        }
    }

    app.innerHTML = `<div class="scroll-area" id="game-scroll">
        <div class="sticky top-0 bg-inherit backdrop-blur-md z-50 p-5 border-b border-[var(--border-ui)] flex justify-between items-center">
            <button onclick="showHome()" class="text-[10px] font-black uppercase opacity-50 px-3 py-2 rounded-lg bg-black/5">Exit</button>
            <div class="flex items-center gap-6">
                <button onclick="changeRound(-1)" class="nav-btn ${roundNum===1?'disabled':''}"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="3" d="M15 19l-7-7 7-7"></path></svg></button>
                <div class="text-center"><div class="text-xl font-black uppercase">Round ${roundNum}</div><div id="round-total-display" class="text-5xl font-black">0</div></div>
                <button onclick="changeRound(1)" class="nav-btn ${roundNum===10?'disabled':''}"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="3" d="M9 5l7 7-7 7"></path></svg></button>
            </div><div class="w-10"></div>
        </div>
        <div class="p-4 pb-8">${prevHtml}${sageBarHtml}<div class="section-title"><h3>Dice Calculators</h3></div><div class="space-y-3">${diceHtml}${sageDiceRowHtml}
            <div id="wild-section" class="wild-section-container ${roundNum<2?'hidden':''}">
                <div class="wild-counter-inline shadow-sm"><span class="text-[10px] font-black uppercase opacity-60">Wild Dice Qty</span><div class="flex items-center gap-5"><button onclick="adjustWildCount(-1)" class="wild-btn-minus">-</button><span id="wild-count-num" class="font-black text-2xl">${(roundData.wild || []).length}</span><button onclick="adjustWildCount(1)" class="wild-btn-plus">+</button></div></div>
                <div id="wild-list-container" class="wild-stack">${(roundData.wild || []).map((w, idx) => renderWildCardHtml(w, idx)).join('')}</div>
            </div></div><div class="grand-total-footer"><span class="text-[10px] font-black uppercase opacity-50 block mb-1">Grand Total</span><span id="grand-total-box" class="text-5xl font-black">0</span></div></div>
    </div>
    <div id="keypad-container" class="keypad-area p-4 flex flex-col"><div id="active-input-display" class="text-center text-lg font-black mb-3 h-6 tracking-widest uppercase opacity-60">-</div><div class="grid grid-cols-4 gap-2 flex-1">${[1,2,3].map(n => `<button onclick="kpInput('${n}')" class="kp-btn bg-black/5 text-inherit text-3xl">${n}</button>`).join('')}<button id="add-btn" onclick="kpEnter()" class="kp-btn bg-green-600 text-white row-span-4 h-full">ADD</button>${[4,5,6].map(n => `<button onclick="kpInput('${n}')" class="kp-btn bg-black/5 text-inherit text-3xl">${n}</button>`).join('')}${[7,8,9].map(n => `<button onclick="kpInput('${n}')" class="kp-btn bg-black/5 text-inherit text-3xl">${n}</button>`).join('')}<button onclick="kpClear()" class="kp-btn bg-black/5 text-lg font-bold text-slate-400">CLR</button><button onclick="kpInput('0')" class="kp-btn bg-black/5 text-inherit text-3xl">0</button><button onclick="kpToggleNeg()" class="kp-btn bg-black/5 text-inherit text-2xl">+/-</button></div></div>`;
    updateAllDisplays();
}

function updateAllDisplays() {
    const rd = activeGame.rounds[activeGame.currentRound];
    if (!rd) return;

    const sageProg = calculateSageProgress(rd);

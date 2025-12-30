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

function renderGame() {
    const roundNum = activeGame.currentRound + 1;
    const rd = activeGame.rounds[activeGame.currentRound];

    // Previous Yellow Box
    let prevYellowHtml = '';
    if (activeGame.currentRound > 0) {
        const prevSum = (activeGame.rounds[activeGame.currentRound - 1].yellow || []).reduce((a, b) => a + b, 0);
        prevYellowHtml = `<div class="prev-round-box"><span>Prev Round Yellow Total</span><span class="text-4xl">${prevSum}</span></div>`;
    }

    // Sage Meter
    let sageMeterHtml = '';
    if (roundNum >= 2) {
        if (rd.sageQuestComplete) {
            sageMeterHtml = `<div class="sage-meter-container bg-green-500/10 border-green-500/30 text-center py-4"><span class="text-green-500 font-black uppercase tracking-widest text-sm">✨ Sage Quest Complete ✨</span></div>`;
        } else {
            sageMeterHtml = `<div class="sage-meter-container animate-fadeIn"><div class="sage-status-text"><span class="opacity-50">Sage Meter</span><span id="sage-count-text" style="color: #b2ac88">0/6 Colors</span></div><div class="sage-bar-bg"><div id="sage-bar-progress" class="sage-bar-fill"></div></div></div>`;
        }
    }

    // Wild Counter with Red/Black Buttons
    const wildCounterHtml = `
        <div class="wild-counter-top animate-fadeIn">
            <span class="text-[10px] font-black uppercase opacity-40">Wild Dice Quantity</span>
            <div class="counter-controls">
                <button onclick="adjustWildCount(-1)" class="counter-btn btn-minus">-</button>
                <span id="wild-count-num" class="text-4xl font-black">${(rd.wild || []).length}</span>
                <button onclick="adjustWildCount(1)" class="counter-btn btn-plus">+</button>
            </div>
        </div>`;

    app.innerHTML = `<div class="scroll-area" id="game-scroll">
            <div class="sticky top-0 bg-inherit backdrop-blur-md z-50 p-5 border-b border-[var(--border-ui)] flex justify-between items-center">
                <button onclick="showHome()" class="text-[10px] font-black uppercase opacity-50 px-3 py-2 rounded-lg bg-black/5">Exit</button>
                <div class="flex items-center gap-6">
                    <button onclick="changeRound(-1)" class="text-4xl font-bold ${roundNum === 1 ? 'opacity-0 pointer-events-none' : 'text-blue-500'}">←</button>
                    <div class="text-center"><div class="text-xl font-black uppercase">Round ${roundNum}</div><div id="round-total-display" class="text-5xl font-black">0</div></div>
                    <button onclick="changeRound(1)" class="text-4xl font-bold ${roundNum === 10 ? 'opacity-0 pointer-events-none' : 'text-blue-500'}">→</button>
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
            <div id="active-input-display" class="text-center text-lg font-black mb-3 h-6 uppercase opacity-60">-</div>
            <div id="kp-grid" class="grid grid-cols-4 gap-2 flex-1">
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

// ... existing helper logic (updateAllDisplays, setActiveInput, kpEnter, etc.) ...

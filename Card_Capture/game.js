// ==========================================
// CONFIGURACIÓN Y CONSTANTES DEL SISTEMA
// ==========================================
const SUITS = {
    SPADES: { icon: '♠', class: 'suit-black', name: 'Armaduras' },
    CLUBS: { icon: '♣', class: 'suit-black', name: 'Blasters' },
    HEARTS: { icon: '♥', class: 'suit-red', name: 'Núcleos' },
    DIAMONDS: { icon: '♦', class: 'suit-red', name: 'Escudos' }
};
const VALUES = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const MECHA_ICONS = { 11: '🦾', 12: '🛰️', 13: '🤖', 14: '👾' };
const PHASE_NAMES = ["INICIO", "FASE ENEMIGA", "FASE DE DESCARTE", "FASE DE ROBO", "FASE DE ACCIÓN"];

let enemyDeck = [], enemyRow = [null, null, null, null];   // índice 0 = POS 4, índice 3 = POS 1
let enemyCapturePile = [];
let playerDeck = [], playerHand = [], playerDiscard = [];
let phase = 0, turn = 0;
let selectedHand = [];
let selectedEnemy = null;
let gameOver = false;
let busy = false;            // bloquea los clics mientras hay animaciones
let fresh = new Set();       // cartas recién llegadas que se animan al dibujarse
let uid = 0;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));

// ==========================================
// INICIALIZACIÓN
// ==========================================
function initGame() {
    enemyDeck = []; enemyRow = [null, null, null, null]; enemyCapturePile = [];
    playerDeck = []; playerHand = []; playerDiscard = [];
    phase = 0; turn = 0; selectedHand = []; selectedEnemy = null; gameOver = false; busy = false; fresh.clear();

    let tempDeck = [];
    Object.keys(SUITS).forEach(suitKey => {
        for (let i = 2; i <= 14; i++) tempDeck.push({ id: ++uid, suit: suitKey, val: i, isJoker: false });
    });
    tempDeck.push({ id: ++uid, isJoker: true, val: 0, suit: 'WILD' }, { id: ++uid, isJoker: true, val: 0, suit: 'WILD' });

    tempDeck.forEach(card => {
        if (card.isJoker || card.val <= 4) playerDeck.push(card);
        else enemyDeck.push(card);
    });
    shuffle(playerDeck);
    shuffle(enemyDeck);

    // La fila inicial nunca empieza con Mechas
    for (let i = 0; i < 4; i++) {
        let guard = 0;
        while (enemyDeck.length > 0 && guard++ < 100) {
            let card = enemyDeck.pop();
            if (card.val >= 11) enemyDeck.unshift(card);
            else { enemyRow[i] = card; fresh.add(card.id); break; }
        }
    }

    // Mano inicial para poder jugar el primer turno
    for (let i = 0; i < 4 && playerDeck.length > 0; i++) { const c = playerDeck.pop(); playerHand.push(c); fresh.add(c.id); }

    startEnemyPhase();
}

function restart() {
    $('end-modal').hidden = true;
    initGame();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// ==========================================
// FLUJO DE FASES
// ==========================================
async function startEnemyPhase() {
    if (gameOver) return;
    phase = 1; turn++; busy = true;
    updateUI();
    msg("FASE ENEMIGA: los sistemas hostiles avanzan hacia la POS 1.");
    await wait(700);

    // Los enemigos se compactan hacia la POS 1 y entran nuevos por la POS 4
    let compactRow = enemyRow.filter(c => c !== null);
    while (compactRow.length < 4 && enemyDeck.length > 0) { const c = enemyDeck.pop(); fresh.add(c.id); compactRow.unshift(c); }
    while (compactRow.length < 4) compactRow.unshift(null);
    enemyRow = compactRow;
    updateUI();
    await wait(800);
    busy = false;
    startDiscardPhase();
}

function startDiscardPhase() {
    if (gameOver) return;
    phase = 2; selectedHand = []; selectedEnemy = null;
    updateUI();
    msg("FASE DE DESCARTE: marca los bots que quieras reciclar, o continúa.");
}

async function confirmDiscard() {
    if (busy || phase !== 2) return;
    busy = true;
    if (selectedHand.length > 0) {
        animateCards(selectedHand.map(i => handEl(i)), 'recycled');
        bump('player-discard');
        floatText("Reciclado", "var(--neon-green)");
        await wait(400);
        selectedHand.sort((a, b) => b - a).forEach(idx => playerDiscard.push(playerHand.splice(idx, 1)[0]));
    }
    busy = false;
    startDrawPhase();
}

async function startDrawPhase() {
    if (gameOver) return;
    phase = 3; selectedHand = []; busy = true;
    updateUI();
    msg("FASE DE ROBO: desplegando unidades...");
    await wait(500);
    while (playerHand.length < 4) {
        if (playerDeck.length === 0) {
            if (playerDiscard.length === 0) break;
            playerDeck = playerDiscard; playerDiscard = [];
            shuffle(playerDeck);
            msg("Reserva vacía. Reciclando el descarte...");
            bump('player-deck');
        }
        const c = playerDeck.pop(); fresh.add(c.id); playerHand.push(c);
    }
    updateUI();
    await wait(600);
    busy = false;
    startCapturePhase();
}

function startCapturePhase() {
    if (gameOver) return;
    phase = 4; selectedHand = []; selectedEnemy = null;
    updateUI();
    if (!anyActionPossible()) {
        lose("Sin bots en la mano: no te queda ninguna acción posible.");
        return;
    }
    msg("FASE DE ACCIÓN: elige un objetivo y tus cartas.");
}

// ==========================================
// SISTEMA DE COMBATE
// ==========================================
const canSacrificeCard = c => c.isJoker || c.val < 11;

// Poder de las cartas elegidas contra un objetivo: misma familia de palo, los comodines copian la carta más alta
function capturePower(target, cards) {
    if (!target || !cards.length) return { ok: false, power: 0, reason: '' };
    if (cards.some(c => !c.isJoker && c.suit !== target.suit)) return { ok: false, power: 0, reason: `Solo cartas de ${SUITS[target.suit].icon} ${SUITS[target.suit].name} (o comodines).` };
    const nonJokers = cards.filter(c => !c.isJoker), jokers = cards.filter(c => c.isJoker);
    if (!nonJokers.length) return { ok: false, power: 0, reason: 'Un comodín necesita al menos una carta normal.' };
    const maxVal = Math.max(...nonJokers.map(c => c.val));
    const power = nonJokers.reduce((s, c) => s + c.val, 0) + jokers.length * maxVal;
    return { ok: power >= target.val, power, reason: '' };
}

function anyActionPossible() {
    if (!playerHand.length) return false;
    if (enemyRow[3]) return true;                                   // recibir daño
    if (playerHand.filter(canSacrificeCard).length >= 2 && enemyRow.some(Boolean)) return true;
    return enemyRow.some(e => e && capturePower(e, playerHand.filter(c => c.isJoker || c.suit === e.suit)).ok);
}

async function actionCapture() {
    if (busy || selectedHand.length === 0 || selectedEnemy === null) return;
    const targetCard = enemyRow[selectedEnemy];
    const res = capturePower(targetCard, selectedHand.map(i => playerHand[i]));
    if (!res.ok) {
        msg(res.reason ? `⚠️ ${res.reason}` : `⚠️ ENERGÍA INSUFICIENTE: necesitas ${targetCard.val}, tienes ${res.power}.`, "var(--neon-red)");
        shakeEl(enemyEl(selectedEnemy));
        return;
    }
    busy = true;
    const target = enemyEl(selectedEnemy);
    selectedHand.forEach(i => zap(handEl(i), target));
    await wait(350);
    animateCards([target, ...selectedHand.map(i => handEl(i))], 'captured');
    floatText("¡CAPTURADO!", "var(--neon-green)");
    bump('player-discard');
    await wait(500);
    playerDiscard.push(targetCard);
    enemyRow[selectedEnemy] = null;
    selectedHand.sort((a, b) => b - a).forEach(idx => playerDiscard.push(playerHand.splice(idx, 1)[0]));
    msg(`Mecha ${label(targetCard)}${SUITS[targetCard.suit].icon} capturado: se une a tu mazo.`, "var(--neon-green)");
    busy = false;
    endCapturePhase();
}

async function actionLetCapture() {
    if (busy || selectedHand.length !== 1 || enemyRow[3] === null) return;
    busy = true;
    animateCards([enemyEl(3), handEl(selectedHand[0])], 'lost');
    bump('enemy-capture');
    damageFlash();
    floatText("¡SISTEMA COMPROMETIDO!", "var(--neon-red)");
    await wait(500);
    const enemyCard = enemyRow[3];
    enemyRow[3] = null;
    const playerSacrifice = playerHand.splice(selectedHand[0], 1)[0];
    enemyCapturePile.push(enemyCard, playerSacrifice);
    busy = false;
    if (checkLoseCondition()) return;
    endCapturePhase();
}

async function actionSacrifice() {
    if (busy || selectedHand.length !== 2 || selectedEnemy === null) return;
    const handCards = selectedHand.map(idx => playerHand[idx]);
    if (!handCards.every(canSacrificeCard)) { msg("⚠️ No puedes sacrificar Mechas (J, Q, K, A).", "var(--neon-red)"); return; }
    busy = true;
    animateCards([enemyEl(selectedEnemy)], 'bounced');
    animateCards(selectedHand.map(i => handEl(i)), 'lost');
    bump('enemy-capture'); bump('enemy-deck');
    floatText("RECARGA TÁCTICA", "var(--neon-blue)");
    await wait(500);
    const targetCard = enemyRow[selectedEnemy];
    enemyRow[selectedEnemy] = null;
    enemyDeck.unshift(targetCard);
    selectedHand.sort((a, b) => b - a).forEach(idx => enemyCapturePile.push(playerHand.splice(idx, 1)[0]));
    busy = false;
    if (checkLoseCondition()) return;
    endCapturePhase();
}

function endCapturePhase() {
    selectedHand = []; selectedEnemy = null;
    updateUI();
    if (checkWinCondition()) return;
    setTimeout(startEnemyPhase, 700);
}

function checkLoseCondition() {
    const mecha = enemyCapturePile.find(c => c.val >= 11 && !c.isJoker);
    if (mecha) { lose(`La IA ha capturado un Mecha (${label(mecha)}${SUITS[mecha.suit].icon}).`); return true; }
    return false;
}

function checkWinCondition() {
    if (enemyDeck.length === 0 && enemyRow.every(c => c === null)) {
        gameOver = true; updateUI();
        msg("🏆 ¡SISTEMA PURGADO! Has ganado la simulación.", "var(--neon-green)");
        showEnd('🏆', 'SISTEMA PURGADO', `Has vaciado el mazo y la fila de la IA en ${turn} turnos.`);
        return true;
    }
    return false;
}

function lose(reason) {
    gameOver = true; updateUI();
    damageFlash();
    msg(`💀 BRECHA CRÍTICA: ${reason}`, "var(--neon-red)");
    showEnd('💀', 'BRECHA CRÍTICA', reason);
}

function showEnd(icon, title, text) {
    $('end-icon').innerText = icon;
    $('end-title').innerText = title; $('end-title').dataset.text = title;
    $('end-text').innerText = text;
    setTimeout(() => { $('end-modal').hidden = false; }, 600);
}

// ==========================================
// SELECCIÓN
// ==========================================
function clickPlayerCard(index) {
    if (busy || (phase !== 2 && phase !== 4)) return;
    const idx = selectedHand.indexOf(index);
    if (idx > -1) selectedHand.splice(idx, 1);
    else selectedHand.push(index);
    updateUI();
}

function clickEnemyCard(index) {
    if (busy || phase !== 4 || enemyRow[index] === null) return;
    selectedEnemy = (selectedEnemy === index) ? null : index;
    updateUI();
}

// ==========================================
// EFECTOS VISUALES
// ==========================================
const handEl = i => $('player-hand').children[i];
const enemyEl = i => $('pos' + (4 - i)).firstElementChild;
const label = c => c.isJoker ? 'WLD' : (VALUES[c.val] || c.val);

function animateCards(els, cls) { els.filter(Boolean).forEach(el => el.classList.add(cls)); }

function bump(id) { const el = $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

function shakeEl(el) { if (!el) return; el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 250 }); }

function damageFlash() {
    document.body.classList.remove('damage-flash'); void document.body.offsetWidth;
    document.body.classList.add('damage-flash');
    setTimeout(() => document.body.classList.remove('damage-flash'), 450);
}

// Rayo de energía desde un bot hasta el objetivo, con chispas de píxeles
function zap(from, to) {
    if (!from || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const x1 = a.left + a.width / 2, y1 = a.top + a.height / 2, x2 = b.left + b.width / 2, y2 = b.top + b.height / 2;
    const z = document.createElement('div');
    z.className = 'zap';
    z.style.left = x1 + 'px'; z.style.top = y1 + 'px';
    z.style.width = Math.hypot(x2 - x1, y2 - y1) + 'px';
    z.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
    document.body.appendChild(z);
    setTimeout(() => z.remove(), 450);
    for (let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        p.className = 'pixel';
        p.style.background = i % 2 ? 'var(--neon-green)' : '#fff';
        p.style.left = x2 + 'px'; p.style.top = y2 + 'px';
        p.style.setProperty('--tx', (Math.random() * 120 - 60) + 'px');
        p.style.setProperty('--ty', (Math.random() * 120 - 60) + 'px');
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 700);
    }
}

function msg(text, color = "var(--text-main)") {
    const b = $('message-board'); b.innerText = text; b.style.color = color;
    b.classList.remove('type'); void b.offsetWidth; b.classList.add('type');
}

function floatText(text, color) {
    const floater = document.createElement('div');
    floater.innerText = text; floater.className = 'floating-text'; floater.style.color = color;
    floater.style.top = '42%';
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 1200);
}

// ==========================================
// RENDERIZADO
// ==========================================
function renderCard(card, onClick, isSelected, isTarget, enterCls) {
    const div = document.createElement('div');
    if (card === null) { div.className = 'slot'; div.innerHTML = '<span>+</span>'; return div; }

    div.className = 'card';
    if (card.isJoker) div.classList.add('joker');
    else { div.classList.add(SUITS[card.suit].class); if (card.val >= 11) div.classList.add('face-card'); }
    if (isSelected) div.classList.add('selected');
    if (isTarget) div.classList.add('enemy-target');
    if (fresh.has(card.id)) { div.classList.add(enterCls); fresh.delete(card.id); }

    const icon = card.isJoker ? '🤖' : (card.val >= 11 ? MECHA_ICONS[card.val] : SUITS[card.suit].icon);
    div.innerHTML = `<div class="shine"></div><div class="card-val">${label(card)}${card.isJoker ? '' : SUITS[card.suit].icon}</div><div class="card-icon">${icon}</div><div class="card-val-bottom">${label(card)}</div>`;
    div.addEventListener('click', onClick);
    return div;
}

function updatePowerMeter() {
    const meter = $('power-meter');
    if (phase !== 4 || selectedEnemy === null || !selectedHand.length || gameOver) { meter.hidden = true; return; }
    const target = enemyRow[selectedEnemy];
    const res = capturePower(target, selectedHand.map(i => playerHand[i]));
    meter.hidden = false;
    $('power-text').innerHTML = res.reason ? `<span style="color:var(--neon-red)">${res.reason}</span>` : `<span>PODER DE HACKEO</span><b>${res.power} / ${target.val}</b>`;
    $('power-fill').style.width = Math.min(100, res.power / target.val * 100) + '%';
    $('power-fill').classList.toggle('ok', res.ok);
}

function updateUI() {
    document.querySelectorAll('#phase-track li').forEach(li => {
        const p = +li.dataset.phase;
        li.classList.toggle('active', p === phase && !gameOver);
        li.classList.toggle('done', p < phase);
    });
    $('turn-label').innerText = `TURNO ${turn}`;
    $('e-deck-count').innerText = enemyDeck.length;
    $('e-capt-count').innerText = enemyCapturePile.length;
    $('p-deck-count').innerText = playerDeck.length;
    $('p-disc-count').innerText = playerDiscard.length;

    for (let i = 0; i < 4; i++) {
        const container = $('pos' + (4 - i));
        container.innerHTML = '';
        container.appendChild(renderCard(enemyRow[i], () => clickEnemyCard(i), false, selectedEnemy === i, 'enter-enemy'));
    }

    const pHandDiv = $('player-hand');
    pHandDiv.innerHTML = '';
    playerHand.forEach((card, index) => {
        const el = renderCard(card, () => clickPlayerCard(index), selectedHand.includes(index), false, 'enter-hand');
        el.style.animationDelay = `${index * 0.08}s`;
        pHandDiv.appendChild(el);
    });

    updatePowerMeter();

    const controls = $('control-panel');
    controls.innerHTML = '';
    if (gameOver) return;

    if (phase === 2) {
        const btn = document.createElement('button');
        btn.className = 'btn action-btn';
        btn.innerHTML = selectedHand.length > 0 ? `Descartar ${selectedHand.length}<small>y robar hasta 4</small>` : 'Continuar<small>sin descartar</small>';
        btn.onclick = confirmDiscard;
        controls.appendChild(btn);
    }
    if (phase === 4) {
        const sel = selectedHand.map(i => playerHand[i]);
        const b1 = document.createElement('button');
        b1.className = 'btn action-btn'; b1.innerHTML = 'Hackear<small>mismo palo ≥ valor</small>';
        b1.disabled = !(selectedHand.length && selectedEnemy !== null && capturePower(enemyRow[selectedEnemy], sel).ok);
        b1.onclick = actionCapture;

        const b2 = document.createElement('button');
        b2.className = 'btn danger-btn'; b2.innerHTML = 'Recibir daño<small>1 carta + POS 1 a la IA</small>';
        b2.disabled = (selectedHand.length !== 1 || enemyRow[3] === null);
        b2.onclick = actionLetCapture;

        const b3 = document.createElement('button');
        b3.className = 'btn'; b3.innerHTML = 'Sacrificar<small>2 cartas: objetivo al fondo</small>';
        b3.disabled = (selectedHand.length !== 2 || selectedEnemy === null || !sel.every(canSacrificeCard));
        b3.onclick = actionSacrifice;

        controls.append(b1, b2, b3);
    }
}

// ==========================================
// MANUAL
// ==========================================
function openManual() { $('manual').hidden = false; }
function closeManual() {
    $('manual').hidden = true;
    try { localStorage.setItem('cardcapture-manual-visto', '1'); } catch (e) {}
}

// INICIAR EL MOTOR
initGame();
let seen = false;
try { seen = localStorage.getItem('cardcapture-manual-visto') === '1'; } catch (e) {}
if (!seen) openManual();

const SUITS = { MONSTER1: 'treboles', MONSTER2: 'picas', POTION: 'corazones', WEAPON: 'diamantes' };
const SUIT_ICON = { treboles: '♣', picas: '♠', corazones: '♥', diamantes: '♦' };
const MAX_HP = 20;

let deck = [], room = [], hp = MAX_HP, weapon = null, weaponStack = [];
let potionsUsedThisRoom = 0, cardsPlayedThisRoom = 0, canRun = true, gameOver = false;
let busy = false;          // bloquea los clics mientras se anima una jugada
let lastPlayed = null;     // para el bonus final del sake

const $ = id => document.getElementById(id);

function getMonsterIcon(val) {
    const icons = { 2: '🐀', 3: '🦇', 4: '🕷️', 5: '🐍', 6: '🧟', 7: '👻', 8: '👺', 9: '👹', 10: '🐺', 11: '🧛', 12: '🧌', 13: '👿', 14: '🐉' };
    return icons[val] || '👾';
}

function getWeaponIcon(val) {
    const icons = { 2: '🔪', 3: '🗡️', 4: '🪓', 5: '⛏️', 6: '🔨', 7: '🏹', 8: '🔱', 9: '⚔️', 10: '🗡️' };
    return icons[val] || '⚔️';
}

// ==========================================
// PARTIDA
// ==========================================
function createDeck() {
    deck = [];
    const createCard = (suit, value, label) => {
        let icon = '', type = '';
        if (suit === SUITS.MONSTER1 || suit === SUITS.MONSTER2) { icon = getMonsterIcon(value); type = 'monster'; }
        else if (suit === SUITS.WEAPON) { icon = getWeaponIcon(value); type = 'weapon'; }
        else { icon = '🍶'; type = 'potion'; }
        return { suit, value, label, icon, type };
    };
    [SUITS.MONSTER1, SUITS.MONSTER2].forEach(suit => {
        for (let i = 2; i <= 10; i++) deck.push(createCard(suit, i, i));
        deck.push(createCard(suit, 11, 'J'), createCard(suit, 12, 'Q'), createCard(suit, 13, 'K'), createCard(suit, 14, 'A'));
    });
    for (let i = 2; i <= 10; i++) deck.push(createCard(SUITS.WEAPON, i, i), createCard(SUITS.POTION, i, i));
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function restart() {
    $('end-modal').hidden = true;
    room = []; hp = MAX_HP; weapon = null; weaponStack = []; canRun = true; gameOver = false; busy = false; lastPlayed = null;
    createDeck();
    msg("La senda del guerrero comienza...");
    dealRoom();
}

function askRestart() {
    if (gameOver || confirm("¿Abandonar esta partida y empezar otra?")) restart();
}

// Rellena la sala hasta 4 cartas. Cuando ya no quedan cartas, la partida acaba al vaciar la sala.
function dealRoom() {
    if (gameOver) return;
    while (room.length < 4 && deck.length > 0) room.push(deck.pop());
    potionsUsedThisRoom = 0; cardsPlayedThisRoom = 0;
    if (room.length === 0) { win(); return; }
    updateUI(true);
}

// La sala termina al jugar 3 cartas (la cuarta pasa a la siguiente) o al vaciarse
function afterPlay() {
    if (gameOver) return;
    if (room.length === 0 || (cardsPlayedThisRoom >= 3 && deck.length > 0)) {
        canRun = true;
        dealRoom();
    } else updateUI(false);
}

function runAway() {
    if (gameOver || busy || !canRun || cardsPlayedThisRoom > 0 || deck.length === 0) return;
    busy = true;
    document.querySelectorAll('#room .card').forEach((c, i) => { c.style.animationDelay = `${i * 0.05}s`; c.classList.add('fled'); });
    msg("Huyes entre las sombras hacia otra sala...", "#cfc2b5");
    setTimeout(() => {
        while (room.length > 0) deck.unshift(room.pop());
        canRun = false; busy = false;
        dealRoom();
    }, 450);
}

// ==========================================
// JUGAR CARTAS
// ==========================================
const weaponUsable = card => weapon && (weaponStack.length === 0 || card.value < weaponStack[weaponStack.length - 1]);

function playCard(index, event) {
    if (gameOver || busy) return;
    const card = room[index];
    if (card.type === 'monster' && weaponUsable(card)) { openFight(index, event); return; }
    resolve(index, event, false);
}

function resolve(index, event, useWeapon) {
    const card = room[index];
    const el = event.currentTarget;
    busy = true;
    let anim = 'slain';

    if (card.type === 'potion') {
        anim = 'drunk';
        if (potionsUsedThisRoom < 1) {
            const old = hp; hp = Math.min(MAX_HP, hp + card.value); potionsUsedThisRoom++;
            msg(`Bebes sake curativo. +${hp - old} de honor.`, "#7fe0b0");
            floatText(`+${hp - old}`, "#7fe0b0", el);
            healGlow();
        } else {
            msg("Ya has bebido en esta sala: el sake se derrama sin efecto.", "#f0b45a");
            floatText("Derramado", "#f0b45a", el);
        }
    }
    else if (card.type === 'weapon') {
        anim = 'equipped';
        weapon = card; weaponStack = [];
        msg(`Empuñas ${card.icon} (poder ${card.value}). Tu arma anterior se descarta.`, "#f2d38a");
        floatText("¡Equipada!", "#f2d38a", el);
    }
    else {
        const damage = useWeapon ? Math.max(0, card.value - weapon.value) : card.value;
        if (useWeapon) weaponStack.push(card.value);
        hp -= damage;
        slashAt(el, useWeapon ? '#ffe9a8' : '#ff4b55');
        if (damage > 0) {
            msg(useWeapon ? `Tu arma corta, pero recibes ${damage} de daño.` : `Luchas a mano: recibes ${damage} de daño.`, "#ff7a82");
            floatText(`-${damage}`, "#ff4b55", el);
            flashDamage();
        } else {
            msg("¡Corte perfecto! Ningún daño.", "#7fe0b0");
            floatText("¡Perfecto!", "#7fe0b0", el);
        }
    }

    lastPlayed = card;
    el.classList.add(anim);
    room.splice(index, 1); cardsPlayedThisRoom++;
    updateHp();
    setTimeout(() => {
        busy = false;
        if (hp <= 0) { lose(); return; }
        afterPlay();
    }, 480);
}

// ==========================================
// ELEGIR CÓMO LUCHAR
// ==========================================
function openFight(index, event) {
    const card = room[index];
    const withWeapon = Math.max(0, card.value - weapon.value);
    $('fight-title').innerText = `${card.icon} Monstruo de ${card.value}`;
    $('fight-weapon').innerText = `⚔️ Con el arma (${weapon.value}): recibes ${withWeapon}`;
    $('fight-bare').innerText = `✊ A mano: recibes ${card.value} y guardas el arma`;
    const target = event.currentTarget;
    $('fight-weapon').onclick = () => { closeFight(); resolve(index, { currentTarget: target }, true); };
    $('fight-bare').onclick = () => { closeFight(); resolve(index, { currentTarget: target }, false); };
    $('fight-modal').hidden = false;
}
function closeFight() { $('fight-modal').hidden = true; }

// ==========================================
// FINAL
// ==========================================
function win() {
    gameOver = true;
    let score = hp;
    let bonus = '';
    if (hp === MAX_HP && lastPlayed && lastPlayed.type === 'potion') { score += lastPlayed.value; bonus = ` (+${lastPlayed.value} por terminar con sake)`; }
    updateUI(false);
    msg("¡Has atravesado la mazmorra!", "#7fe0b0");
    showEnd('勝', '¡Victoria!', `Sales de la mazmorra con ${hp} de honor${bonus}.`, score);
}

function lose() {
    gameOver = true;
    const remaining = [...deck, ...room].filter(c => c.type === 'monster').reduce((s, c) => s + c.value, 0);
    updateUI(false);
    msg("Caes en combate...", "#ff7a82");
    showEnd('死', 'Has caído', `Quedaban monstruos por valor de ${remaining}. Tu puntuación es tu vida menos esa cantidad.`, hp - remaining);
}

function showEnd(kanji, title, text, score) {
    $('end-kanji').innerText = kanji; $('end-title').innerText = title; $('end-text').innerText = text; $('end-score').innerText = score;
    setTimeout(() => { $('end-modal').hidden = false; }, 500);
}

// ==========================================
// EFECTOS VISUALES
// ==========================================
function msg(text, color = "#fff") {
    const b = $('message-board'); b.innerText = text; b.style.color = color;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
}

function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function floatText(text, color, el) {
    const p = el ? centerOf(el) : { x: innerWidth / 2, y: innerHeight * .4 };
    const f = document.createElement('div');
    f.className = 'floating-text'; f.innerText = text; f.style.color = color;
    f.style.left = p.x + 'px'; f.style.top = (p.y - 40) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1000);
}

function slashAt(el, color) {
    const p = centerOf(el);
    const s = document.createElement('div');
    s.className = 'slash';
    s.style.left = (p.x - 80) + 'px'; s.style.top = p.y + 'px';
    s.style.transform = `rotate(${-35 + Math.random() * 20}deg)`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 400);
    for (let i = 0; i < 14; i++) {
        const k = document.createElement('div');
        k.className = 'spark';
        k.style.background = color; k.style.boxShadow = `0 0 6px ${color}`;
        k.style.left = p.x + 'px'; k.style.top = p.y + 'px';
        k.style.setProperty('--tx', (Math.random() * 140 - 70) + 'px');
        k.style.setProperty('--ty', (Math.random() * 140 - 70) + 'px');
        document.body.appendChild(k);
        setTimeout(() => k.remove(), 600);
    }
}

function flashDamage() {
    document.body.classList.remove('damage-flash'); void document.body.offsetWidth;
    document.body.classList.add('damage-flash');
    setTimeout(() => document.body.classList.remove('damage-flash'), 400);
}

function healGlow() {
    const box = $('hp-container');
    box.classList.remove('heal'); void box.offsetWidth; box.classList.add('heal');
}

function makePetals() {
    const box = $('petals');
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'petal';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (9 + Math.random() * 10) + 's';
        p.style.animationDelay = (-Math.random() * 15) + 's';
        p.style.setProperty('--drift', (Math.random() * 120 - 40) + 'px');
        p.style.transform = `scale(${0.6 + Math.random() * 0.8})`;
        box.appendChild(p);
    }
}

// ==========================================
// PANTALLA
// ==========================================
function renderCard(card, onClick, animateDeal, index) {
    const container = document.createElement('div'); container.className = 'card-container';
    const div = document.createElement('div');
    div.className = `card ${card.type}` + (card.type === 'monster' && card.value >= 11 ? ' big' : '') + (onClick ? '' : ' static');
    div.dataset.kanji = { monster: '鬼', weapon: '刀', potion: '酒' }[card.type];
    const typeName = { monster: 'MONSTRUO', weapon: 'ARMA', potion: 'SAKE' }[card.type];
    div.innerHTML = `<div class="card-label">${card.label}</div><div class="card-suit">${SUIT_ICON[card.suit]}</div><div class="card-icon">${card.icon}</div><div class="card-type">${typeName}</div>`;
    if (animateDeal) { div.classList.add('deal-anim'); div.style.animationDelay = `${index * 0.09}s`; }
    if (onClick) div.onclick = onClick;
    container.appendChild(div);
    return container;
}

function updateHp() {
    $('hp').innerText = Math.max(hp, 0);
    $('hp-fill').style.width = Math.max(0, hp) / MAX_HP * 100 + '%';
    $('hp-container').classList.toggle('low', hp > 0 && hp <= 6);
}

function updateUI(animateDeal = false) {
    updateHp();
    $('deck-count').innerText = deck.length;
    $('deck-pile').classList.toggle('empty', deck.length === 0);
    $('run-btn').disabled = gameOver || !canRun || cardsPlayedThisRoom > 0 || deck.length === 0;
    $('room-info').innerText = gameOver ? '' : (deck.length === 0 ? 'Última sala: juega todas las cartas' : `Jugadas ${cardsPlayedThisRoom}/3`);

    const roomDiv = $('room'); roomDiv.innerHTML = '';
    room.forEach((card, index) => roomDiv.appendChild(renderCard(card, gameOver ? null : (e) => playCard(index, e), animateDeal, index)));

    const wSlot = $('weapon-slot'), wInfo = $('weapon-stack-info');
    if (weapon) {
        if (wSlot.dataset.weapon !== `${weapon.suit}${weapon.value}`) {
            wSlot.innerHTML = ''; wSlot.appendChild(renderCard(weapon, null, false, 0));
            wSlot.dataset.weapon = `${weapon.suit}${weapon.value}`;
        }
        const limit = weaponStack.length ? `<span class="limit-chip">solo &lt; ${weaponStack[weaponStack.length - 1]}</span>` : '';
        wInfo.innerHTML = weaponStack.length ? weaponStack.map(v => `<span class="kill-chip">${getMonsterIcon(v)}${v}</span>`).join('') + limit : 'Arma intacta';
    } else {
        wSlot.innerHTML = '<div class="empty-weapon">Desarmado</div>'; wSlot.dataset.weapon = '';
        wInfo.innerHTML = 'Sin arma equipada';
    }
}

// ==========================================
// MANUAL
// ==========================================
function openManual() { $('manual').hidden = false; }
function closeManual() {
    $('manual').hidden = true;
    try { localStorage.setItem('scoundrel-manual-visto', '1'); } catch (e) {}
}

makePetals();
restart();
let seen = false;
try { seen = localStorage.getItem('scoundrel-manual-visto') === '1'; } catch (e) {}
if (!seen) openManual();

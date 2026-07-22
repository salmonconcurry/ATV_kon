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

let enemyDeck = [], enemyRow = [null, null, null, null];
let enemyCapturePile = [];
let playerDeck = [], playerHand = [], playerDiscard = [];
let phase = 0; 
let selectedHand = [];
let selectedEnemy = null;
let gameOver = false;

// ==========================================
// INICIALIZACIÓN (CORREGIDA)
// ==========================================
function initGame() {
    let tempDeck = [];
    Object.keys(SUITS).forEach(suitKey => {
        for(let i = 2; i <= 14; i++) tempDeck.push({ suit: suitKey, val: i, isJoker: false });
    });
    tempDeck.push({ isJoker: true, val: 0, suit: 'WILD' }, { isJoker: true, val: 0, suit: 'WILD' });

    tempDeck.forEach(card => {
        if(card.isJoker || card.val <= 4) playerDeck.push(card);
        else enemyDeck.push(card);
    });

    shuffle(playerDeck);
    shuffle(enemyDeck);

    // Setup enemigo
    for(let i = 0; i < 4; i++) {
        let validCardFound = false;
        while(!validCardFound && enemyDeck.length > 0) {
            let card = enemyDeck.pop();
            if(card.val >= 11) {
                enemyDeck.unshift(card); 
            } else {
                enemyRow[i] = card;
                validCardFound = true;
            }
        }
    }

    // FIX UX: Robar 4 cartas iniciales para poder jugar el Turno 1
    for(let i = 0; i < 4; i++) {
        if(playerDeck.length > 0) playerHand.push(playerDeck.pop());
    }

    startEnemyPhase();
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
function startEnemyPhase() {
    if(gameOver) return;
    phase = 1;
    updateUI();
    msg("FASE ENEMIGA: Los sistemas hostiles se reorganizan.");
    
    setTimeout(() => {
        let compactRow = enemyRow.filter(c => c !== null);
        while(compactRow.length < 4 && enemyDeck.length > 0) compactRow.unshift(enemyDeck.pop());
        while(compactRow.length < 4) compactRow.unshift(null);
        enemyRow = compactRow;
        
        updateUI();
        setTimeout(startDiscardPhase, 1000);
    }, 1000);
}

function startDiscardPhase() {
    if(gameOver) return;
    phase = 2;
    selectedHand = [];
    selectedEnemy = null;
    updateUI();
    msg("FASE DE DESCARTE: Selecciona bots para reciclar, o continúa.");
}

function confirmDiscard() {
    selectedHand.sort((a,b) => b-a).forEach(idx => playerDiscard.push(playerHand.splice(idx, 1)[0]));
    if(selectedHand.length > 0) floatText("Reciclado", "var(--neon-green)");
    startDrawPhase();
}

function startDrawPhase() {
    if(gameOver) return;
    phase = 3;
    selectedHand = [];
    updateUI();
    msg("FASE DE ROBO: Desplegando unidades...");
    
    setTimeout(() => {
        while(playerHand.length < 4) {
            if(playerDeck.length === 0) {
                if(playerDiscard.length === 0) break;
                playerDeck = playerDiscard;
                playerDiscard = [];
                shuffle(playerDeck);
                msg("Reserva vacía. Reciclando descarte...");
            }
            playerHand.push(playerDeck.pop());
        }
        updateUI();
        setTimeout(startCapturePhase, 800);
    }, 800);
}

function startCapturePhase() {
    if(gameOver) return;
    phase = 4;
    selectedHand = [];
    selectedEnemy = null;
    updateUI();
    msg("FASE DE CAPTURA: Elige acción táctica.");
}

// ==========================================
// SISTEMA DE COMBATE
// ==========================================
function actionCapture() {
    if(selectedHand.length === 0 || selectedEnemy === null) return;
    let targetCard = enemyRow[selectedEnemy];
    let handCards = selectedHand.map(idx => playerHand[idx]);
    
    let baseSuit = targetCard.suit;
    if(handCards.some(c => !c.isJoker && c.suit !== baseSuit)) {
        msg("⚠️ FALLO: Palos incompatibles para hackeo.", "var(--neon-red)");
        return;
    }

    let nonJokers = handCards.filter(c => !c.isJoker);
    let jokers = handCards.filter(c => c.isJoker);
    let maxVal = nonJokers.length > 0 ? Math.max(...nonJokers.map(c => c.val)) : 0;
    
    if(nonJokers.length === 0) {
        msg("⚠️ FALLO: Un Comodín necesita unidad base.", "var(--neon-red)");
        return;
    }

    let totalPower = nonJokers.reduce((sum, c) => sum + c.val, 0) + (jokers.length * maxVal);

    if(totalPower >= targetCard.val) {
        playerDiscard.push(targetCard);
        enemyRow[selectedEnemy] = null;
        selectedHand.sort((a,b) => b-a).forEach(idx => playerDiscard.push(playerHand.splice(idx, 1)[0]));
        floatText("¡CAPTURADO!", "var(--neon-green)");
        endCapturePhase();
    } else {
        msg(`⚠️ ENERGÍA INSUFICIENTE: Necesitas ${targetCard.val}, tienes ${totalPower}.`, "var(--neon-red)");
    }
}

function actionLetCapture() {
    if(selectedHand.length !== 1) { msg("⚠️ Elige UNA carta para entregar.", "var(--neon-red)"); return; }
    let pos1Index = 3; 
    if(enemyRow[pos1Index] === null) { msg("⚠️ Sin enemigo en Posición 1.", "var(--neon-red)"); return; }

    let enemyCard = enemyRow[pos1Index];
    enemyRow[pos1Index] = null;
    let playerSacrifice = playerHand.splice(selectedHand[0], 1)[0];
    
    enemyCapturePile.push(enemyCard, playerSacrifice);

    document.body.classList.add('damage-flash');
    setTimeout(() => document.body.classList.remove('damage-flash'), 400);
    floatText("¡SISTEMA COMPROMETIDO!", "var(--neon-red)");
    
    checkLoseCondition();
    if(!gameOver) endCapturePhase();
}

function actionSacrifice() {
    if(selectedHand.length !== 2 || selectedEnemy === null) { msg("⚠️ Elige DOS cartas y UN objetivo.", "var(--neon-red)"); return; }
    let handCards = selectedHand.map(idx => playerHand[idx]);
    if(handCards.some(c => c.val >= 11)) { msg("⚠️ No puedes sacrificar Mechas (J,Q,K,A).", "var(--neon-red)"); return; }

    let targetCard = enemyRow[selectedEnemy];
    enemyRow[selectedEnemy] = null;
    enemyDeck.unshift(targetCard);

    selectedHand.sort((a,b) => b-a).forEach(idx => enemyCapturePile.push(playerHand.splice(idx, 1)[0]));

    floatText("RECARGA TÁCTICA", "var(--neon-blue)");
    checkLoseCondition();
    if(!gameOver) endCapturePhase();
}

function endCapturePhase() {
    selectedHand = [];
    selectedEnemy = null;
    updateUI();
    checkWinCondition();
    if(!gameOver) setTimeout(startEnemyPhase, 800);
}

function checkLoseCondition() {
    if(enemyCapturePile.some(c => c.val >= 11 && !c.isJoker)) {
        gameOver = true;
        msg("💀 BRECHA CRÍTICA: Mecha capturado por la IA. ¡HAS PERDIDO!", "var(--neon-red)");
        updateUI();
    }
}

function checkWinCondition() {
    if(enemyDeck.length === 0 && enemyRow.every(c => c === null)) {
        gameOver = true;
        msg("🏆 ¡SISTEMA PURGADO! Has ganado la simulación.", "var(--neon-green)");
        updateUI();
    }
}

// ==========================================
// RENDERIZADO VISUAL Y EVENTOS (CORREGIDOS)
// ==========================================
function clickPlayerCard(index) {
    if(phase !== 2 && phase !== 4) return;
    let idx = selectedHand.indexOf(index);
    if(idx > -1) selectedHand.splice(idx, 1);
    else selectedHand.push(index);
    updateUI();
}

function clickEnemyCard(index) {
    if(phase !== 4 || enemyRow[index] === null) return;
    selectedEnemy = (selectedEnemy === index) ? null : index;
    updateUI();
}

function renderCard(card, onClick, isSelected, isTarget) {
    let div = document.createElement('div');
    
    if(card === null) { 
        div.className = 'slot'; 
        div.innerHTML = '<span style="opacity:0.2; font-size:1.5rem;">+</span>'; 
        return div; 
    }
    
    div.className = 'card';
    if(card.isJoker) div.classList.add('joker');
    else if(card.val >= 11) div.classList.add('face-card');
    
    if(isSelected) div.classList.add('selected');
    if(isTarget) div.classList.add('enemy-target');
    if(!card.isJoker) div.classList.add(SUITS[card.suit].class);

    let label = card.isJoker ? 'WLD' : (VALUES[card.val] || card.val);
    let icon = card.isJoker ? '🤖' : SUITS[card.suit].icon;

    div.innerHTML = `
        <div class="card-val">${label}</div>
        <div class="card-icon">${icon}</div>
        <div class="card-val-bottom">${label}</div>
    `;
    
    // FIX DOM: Usamos addEventListener para asegurar el registro del clic en cualquier dispositivo
    div.addEventListener('click', onClick);
    return div;
}

function updateUI() {
    const pNames = ["INICIO", "FASE ENEMIGA", "FASE DE DESCARTE", "FASE DE ROBO", "FASE DE CAPTURA"];
    document.getElementById('phase-display').innerText = pNames[phase];
    document.getElementById('e-deck-count').innerText = enemyDeck.length;
    document.getElementById('p-deck-count').innerText = playerDeck.length;
    
    for(let i=0; i<4; i++) {
        let container = document.getElementById('pos' + (4-i));
        container.innerHTML = '';
        container.appendChild(renderCard(enemyRow[i], () => clickEnemyCard(i), false, selectedEnemy === i));
    }
    
    document.getElementById('enemy-capture').innerHTML = enemyCapturePile.length > 0 ? `<b style="font-size:1.2rem">${enemyCapturePile.length}</b><br>Capt` : 'Pila<br>Capt';
    
    let pHandDiv = document.getElementById('player-hand');
    pHandDiv.innerHTML = '';
    playerHand.forEach((card, index) => {
        pHandDiv.appendChild(renderCard(card, () => clickPlayerCard(index), selectedHand.includes(index), false));
    });

    let controls = document.getElementById('control-panel');
    controls.innerHTML = '';
    
    if(gameOver) return;

    if(phase === 2) {
        let btn = document.createElement('button');
        btn.className = 'btn'; btn.innerText = selectedHand.length > 0 ? 'Descartar Selección' : 'Pasar sin Descartar';
        btn.onclick = confirmDiscard;
        controls.appendChild(btn);
    }
    if(phase === 4) {
        let b1 = document.createElement('button'); 
        b1.className = 'btn action-btn'; b1.innerHTML = 'Hackear<br>(Poder)'; 
        b1.disabled = (selectedHand.length === 0 || selectedEnemy === null); 
        b1.onclick = actionCapture;
        
        let b2 = document.createElement('button'); 
        b2.className = 'btn danger-btn'; b2.innerHTML = 'Recibir Daño<br>(A Pos1)'; 
        b2.disabled = (selectedHand.length !== 1 || enemyRow[3] === null); 
        b2.onclick = actionLetCapture;
        
        let b3 = document.createElement('button'); 
        b3.className = 'btn'; b3.innerHTML = 'Sacrificar<br>(2x1)'; 
        b3.disabled = (selectedHand.length !== 2 || selectedEnemy === null); 
        b3.onclick = actionSacrifice;
        
        controls.append(b1, b2, b3);
    }
}

function msg(text, color = "var(--text-main)") {
    const b = document.getElementById('message-board'); b.innerText = text; b.style.color = color;
}

function floatText(text, color) {
    const floater = document.createElement('div');
    floater.innerText = text; floater.className = 'floating-text'; floater.style.color = color;
    floater.style.top = '45%';
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 1200);
}

// INICIAR EL MOTOR
initGame();
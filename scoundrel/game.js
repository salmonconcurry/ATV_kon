const SUITS = { MONSTER1: 'treboles', MONSTER2: 'picas', POTION: 'corazones', WEAPON: 'diamantes' };
let deck = [], room = [], hp = 20, weapon = null, weaponStack = []; 
let potionsUsedThisTurn = 0, cardsPlayedThisRoom = 0, canRun = true, isAudioSetup = false, gameOver = false;

function getMonsterIcon(val) {
    const icons = { 2: '🐀', 3: '🦇', 4: '🕷️', 5: '🐍', 6: '🧟', 7: '👻', 8: '👺', 9: '👹', 10: '🐺', 11: '🧛', 12: '🧌', 13: '👿', 14: '🐉' };
    return icons[val] || '👾';
}

function getWeaponIcon(val) {
    const icons = { 2: '🔪', 3: '🗡️', 4: '🪓', 5: '⛏️', 6: '🔨', 7: '🏹', 8: '🔱', 9: '⚔️', 10: '🗡️' };
    return icons[val] || '⚔️';
}

function createDeck() {
    deck = []; gameOver = false; hp = 20;
    
    const createCard = (suit, value, label) => {
        let icon = '', type = '';
        if (suit === SUITS.MONSTER1 || suit === SUITS.MONSTER2) { icon = getMonsterIcon(value); type = 'monster'; } 
        else if (suit === SUITS.WEAPON) { icon = getWeaponIcon(value); type = 'weapon'; } 
        else { icon = '🍶'; type = 'potion'; } // Sake/Poción
        return { suit, value, label, icon, type };
    };
    
    [SUITS.MONSTER1, SUITS.MONSTER2].forEach(suit => {
        for (let i = 2; i <= 10; i++) deck.push(createCard(suit, i, i));
        deck.push(createCard(suit, 11, 'J'), createCard(suit, 12, 'Q'), createCard(suit, 13, 'K'), createCard(suit, 14, 'A'));
    });
    for (let i = 2; i <= 10; i++) {
        deck.push(createCard(SUITS.WEAPON, i, i), createCard(SUITS.POTION, i, i));
    }
    
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function dealRoom() {
    if (gameOver) return;
    while (room.length < 4 && deck.length > 0) room.push(deck.pop());
    potionsUsedThisTurn = 0; cardsPlayedThisRoom = 0;
    updateUI(true);
    
    if (room.length === 0 && deck.length === 0) {
        msg("¡Has sobrevivido! Honor restante: " + hp, "#4caf50");
        gameOver = true; document.getElementById('run-btn').disabled = true;
    }
}

function runAway() {
    if (gameOver || !canRun || cardsPlayedThisRoom > 0) return;
    while(room.length > 0) deck.unshift(room.pop());
    canRun = false;
    msg("Huyes entre las sombras hacia otra sala...", "#aaa");
    dealRoom();
}

function showFloatingText(text, color, event) {
    const floater = document.createElement('div');
    floater.innerText = text; floater.className = 'floating-text'; floater.style.color = color;
    if (event && event.clientX) { floater.style.left = (event.clientX - 20) + 'px'; floater.style.top = (event.clientY - 30) + 'px'; } 
    else { floater.style.left = '50%'; floater.style.top = '40%'; }
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 1000);
}

function playCard(index, event) {
    if (gameOver) return; 
    const card = room[index]; const cardElement = event.currentTarget; let handled = false;

    if (card.type === 'potion') {
        if (potionsUsedThisTurn < 1) {
            let oldHp = hp; hp = Math.min(20, hp + card.value); potionsUsedThisTurn++;
            msg(`Bebes sake curativo. +${hp - oldHp} Vida.`, "#4caf50");
            showFloatingText(`+${hp - oldHp}`, "#4caf50", event);
            document.getElementById('hp-container').style.animation = "healPulse 0.5s ease";
            setTimeout(() => document.getElementById('hp-container').style.animation = "", 500);
        } else {
            msg(`Ya has bebido en esta sala.`, "#ff9800"); showFloatingText("Inútil", "#ff9800", event);
        }
        handled = true;
    } 
    else if (card.type === 'weapon') {
        weapon = card; weaponStack = []; 
        msg(`Arma equipada: ${card.icon} (Daño: ${card.value}).`, "#fff"); showFloatingText("Equipada", "#fff", event); handled = true;
    } 
    else {
        let lastMonsterVal = weaponStack.length > 0 ? weaponStack[weaponStack.length - 1] : 999;
        if (weapon && card.value < lastMonsterVal) {
            let damage = Math.max(0, card.value - weapon.value);
            hp -= damage; weaponStack.push(card.value);
            if (damage > 0) { 
                msg(`El arma no frena todo. Recibes ${damage} daño.`, "var(--accent-red)"); 
                showFloatingText(`-${damage}`, "var(--accent-red)", event); flashDamage(); 
            } else { 
                msg(`Ataque bloqueado perfectamente.`, "#4caf50"); showFloatingText("Bloqueo", "#4caf50", event); 
            }
        } else {
            hp -= card.value;
            msg(`Ataque enemigo directo. Recibes ${card.value} daño.`, "var(--accent-red)"); 
            showFloatingText(`-${card.value}`, "var(--accent-red)", event); flashDamage();
        }
        handled = true;
    }

    if (handled) {
        cardElement.classList.add('executed'); room.splice(index, 1); cardsPlayedThisRoom++; canRun = true; checkGameOver();
        if (!gameOver) setTimeout(() => { cardsPlayedThisRoom === 3 ? dealRoom() : updateUI(false); }, 300); 
    }
}

function flashDamage() { document.body.classList.add('damage-flash'); setTimeout(() => document.body.classList.remove('damage-flash'), 300); }

function checkGameOver() {
    if (hp <= 0) {
        gameOver = true;
        let remaining = [...deck, ...room].filter(c => c.type === 'monster').reduce((sum, c) => sum + c.value, 0);
        msg(`Seppuku... Puntuación final: ${hp - remaining}`, "var(--accent-red)");
        document.getElementById('room').innerHTML = ''; document.getElementById('run-btn').disabled = true;
    }
}

function msg(text, color = "#fff") {
    const b = document.getElementById('message-board'); b.innerText = text; b.style.color = color;
}

function renderCard(card, onClick, animateDeal, index) {
    const container = document.createElement('div'); container.className = 'card-container';
    const div = document.createElement('div'); 
    div.className = 'card ' + ((card.type === 'potion' || card.type === 'weapon') ? 'red-suit' : 'black-suit');
    
    div.innerHTML = `<div class="card-label">${card.label}</div><div class="card-icon">${card.icon}</div>`;
    
    if (animateDeal) { div.classList.add('deal-anim'); div.style.animationDelay = `${index * 0.1}s`; }
    if (onClick) div.onclick = (e) => onClick(e);
    container.appendChild(div); return container;
}

function updateUI(animateDeal = false) {
    if (gameOver) return; 
    document.getElementById('hp').innerText = hp; document.getElementById('deck-count').innerText = deck.length;
    document.getElementById('run-btn').disabled = (!canRun || cardsPlayedThisRoom > 0);
    
    const roomDiv = document.getElementById('room'); roomDiv.innerHTML = '';
    room.forEach((card, index) => { roomDiv.appendChild(renderCard(card, (e) => playCard(index, e), animateDeal, index)); });

    const wSlot = document.getElementById('weapon-slot'); const wInfo = document.getElementById('weapon-stack-info');
    if (weapon) {
        wSlot.innerHTML = ''; wSlot.appendChild(renderCard(weapon, null, false, 0));
        wInfo.innerHTML = weaponStack.length > 0 ? `Bajas: ${weaponStack.join(" ➔ ")}` : "Arma Intacta";
    } else {
        wSlot.innerHTML = '<div class="empty-weapon">Desarmado</div>'; wInfo.innerHTML = 'Sin arma equipada';
    }
}

function startAudio() {
    // Función auxiliar si decides integrar audio después
    if (!isAudioSetup) { const bgm = document.getElementById('bgm'); if(bgm) bgm.play().catch(()=>{}); isAudioSetup = true; }
}

createDeck(); dealRoom();
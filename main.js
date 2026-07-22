document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('hack-btn');
    const progressBar = document.getElementById('progress-bar');
    const lockScreen = document.getElementById('lock-screen');
    const accessScreen = document.getElementById('access-granted');
    const terminal = document.querySelector('.terminal');
    const headerTitle = document.querySelector('.glitch');

    let isPressing = false;
    let progress = 0;
    let animationFrame;
    const TIME_REQUIRED = 2000; // 2 segundos para hackear
    let startTime = null;

    const fillProgress = (timestamp) => {
        if (!isPressing) return;
        if (!startTime) startTime = timestamp;

        let elapsedTime = timestamp - startTime;
        progress = Math.min((elapsedTime / TIME_REQUIRED) * 100, 100);
        progressBar.style.width = `${progress}%`;

        if (progress >= 100) unlockSystem();
        else animationFrame = requestAnimationFrame(fillProgress);
    };

    const startPress = (e) => {
        e.preventDefault(); 
        if (progress >= 100) return;
        isPressing = true;
        startTime = null; 
        btn.classList.add('hacking');
        animationFrame = requestAnimationFrame(fillProgress);
    };

    const endPress = () => {
        if (!isPressing || progress >= 100) return;
        isPressing = false;
        cancelAnimationFrame(animationFrame);
        btn.classList.remove('hacking');
        
        progress = 0;
        progressBar.style.width = '0%';
        progressBar.style.transition = 'width 0.3s ease-out'; 
        
        setTimeout(() => { progressBar.style.transition = 'width 0.1s'; }, 300);
    };

    const unlockSystem = () => {
        isPressing = false;
        
        // Cambios visuales al tener éxito
        terminal.style.borderColor = 'var(--neon-green)';
        terminal.style.boxShadow = '0 0 20px rgba(57, 255, 20, 0.2)';
        headerTitle.style.color = 'var(--neon-green)';
        headerTitle.style.textShadow = '0 0 10px var(--neon-green)';
        document.querySelector('.status').innerText = 'ESTADO: SISTEMA DESENCRIPTADO';
        document.querySelector('.status').style.color = 'var(--neon-green)';
        document.querySelector('.status').style.animation = 'none';

        // Ocultar pantalla de bloqueo y mostrar los juegos
        lockScreen.classList.add('hidden');
        accessScreen.classList.remove('hidden');
    };

    // Escuchadores de eventos para ratón y pantallas táctiles
    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('touchstart', startPress);
    window.addEventListener('mouseup', endPress);
    window.addEventListener('touchend', endPress);
});
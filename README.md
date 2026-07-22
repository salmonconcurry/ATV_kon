# 🌐 Nexo de Simulaciones Tácticas (ATV_kon)

[![GitHub Pages](https://img.shields.io/badge/Despliegue-GitHub%20Pages-success?style=for-the-badge&logo=github)](https://salmonconcurry.github.io/ATV_kon/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)]()
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)]()

Bienvenido al **Nexo de Simulaciones**. Este repositorio funciona como un *Hub gamificado* (Terminal de Seguridad interactivo) que da acceso a una colección de juegos de cartas y supervivencia desarrollados íntegramente en tecnologías web nativas (Vanilla HTML, CSS, JS).

Accede al portal interactivo aquí: **[▶ JUGAR AHORA](https://salmonconcurry.github.io/ATV_kon/)**

---

## 🕹️ Simulaciones Disponibles

### [1] After The Virus
Juego de supervivencia post-apocalíptica. Gestiona tus recursos y defiéndete de las hordas antes de que el mazo se agote.
* **Temática:** Zombies / Supervivencia
* **Ruta:** `/AfterTheVirus_Web`

### [2] Card Capture: Cyber Mech
Simulación de asalto táctico en un entorno Cyberpunk. Utiliza tus bots (comodines) y empareja los palos de datos para hackear las defensas de la IA enemiga. Si un Mecha enemigo entra en la red, el sistema cae.
* **Temática:** Cyberpunk / Hacking
* **Ruta:** `/Card_Capture`

### [3] Scoundrel: Samurai Edition
Adaptación roguelike del clásico juego de cartas para un solo jugador. Eres un Ronin abriéndote paso por salas hostiles. Equipa armas, bloquea ataques, bebe sake curativo y sobrevive a las 44 cartas de la mazmorra.
* **Temática:** Japón Feudal / Ukiyo-e
* **Ruta:** `/scoundrel`

---

## 🏗️ Arquitectura y Tecnologías

Este proyecto está construido con un enfoque **Modular, Ligero y Responsive**, sin depender de frameworks externos o motores pesados de videojuegos. Todo el renderizado y la lógica de estado se manejan a través del DOM.

*   **Motor Lógico:** Vanilla JavaScript (ES6+). Gestión de estados, barajado de arrays y control de fases mediante bucles de eventos nativos.
*   **Interfaz de Usuario (UI):** CSS3 Moderno. Uso intensivo de Variables CSS, `clamp()` para escalado fluido en dispositivos móviles, animaciones `@keyframes`, y `clip-path` para diseños de cartas no convencionales.
*   **Experiencia de Usuario (UX):** Animaciones de interacción (Glitch, CRT Scanlines, temblores de cámara al recibir daño) y gamificación en el propio menú de navegación (Hackeo de acceso al mantener pulsado).

---

## 📂 Estructura del Repositorio

El repositorio sigue una arquitectura de "Múltiples Módulos", donde la raíz actúa como el Router visual y cada carpeta es un ecosistema cerrado.

```text
ATV_kon/
├── AfterTheVirus_Web/      # Módulo: Supervivencia Zombie
├── Card_Capture/           # Módulo: Hacking Cyberpunk
├── scoundrel/              # Módulo: Roguelike Samurái
├── index.html              # HUB: Interfaz del Terminal
├── style.css               # HUB: Estilos y animaciones (CRT/Glitch)
└── main.js                 # HUB: Lógica de la barra de progreso

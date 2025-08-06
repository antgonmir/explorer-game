document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');

    // --- GAME CONSTANTS ---
    const GAME_WIDTH = 1000;
    const GAME_HEIGHT = 600;
    const GRAVITY = 0.6;
    const PLAYER_SPEED = 5;
    const JUMP_FORCE = -14;
    const DOUBLE_JUMP_FORCE = -12;

    // --- SVG ASSETS ---
    // Using strings for SVGs to keep this example self-contained.
    const SVG_ASSETS = {
        player: `<svg viewBox="0 0 40 60"><g fill="#D2B48C"><rect x="10" y="15" width="20" height="30" rx="5"/><rect x="15" y="0" width="10" height="15" rx="5"/><rect x="10" y="45" width="8" height="15"/><rect x="22" y="45" width="8" height="15"/></g><g fill="#000"><circle cx="17" cy="25" r="2"/><circle cx="23" cy="25" r="2"/></g></svg>`,
        key: `<svg viewBox="0 0 50 50"><g fill="#FFD700" stroke="black" stroke-width="2"><circle cx="35" cy="15" r="10"/><rect x="10" y="12" width="20" height="6"/><rect x="10" y="25" width="6" height="10"/><rect x="22" y="25" width="6" height="10"/></g></svg>`,
        door: `<svg viewBox="0 0 60 100"><rect width="60" height="100" fill="#8B4513" stroke="#000" stroke-width="2"/><circle cx="50" cy="50" r="5" fill="#DAA520"/></svg>`,
        doorOpen: `<svg viewBox="0 0 60 100"><rect width="60" height="100" fill="#8B4513" stroke="#000" stroke-width="2"/><rect x="5" y="5" width="50" height="90" fill="#333" /><circle cx="50" cy="50" r="5" fill="#DAA520"/></svg>`,
        enemy: `<svg viewBox="0 0 50 50"><path d="M5,25 C5,10 45,10 45,25 C45,40 25,40 25,50 C25,40 5,40 5,25 Z" fill="red" stroke="black" stroke-width="2"/><circle cx="18" cy="20" r="3" fill="white"/><circle cx="32" cy="20" r="3" fill="white"/></svg>`,
        spikes: `<svg viewBox="0 0 100 50"><path d="M0,50 L10,0 L20,50 M20,50 L30,0 L40,50 M40,50 L50,0 L60,50 M60,50 L70,0 L80,50 M80,50 L90,0 L100,50 Z" fill="none" stroke="gray" stroke-width="4" stroke-linejoin="round"/></svg>`,
        grass: `<svg viewBox="0 0 20 20"><path d="M2,20 C5,5 5,5 8,20 M12,20 C15,5 15,5 18,20" stroke="green" stroke-width="2" fill="none"/></svg>`,
        rock: `<svg viewBox="0 0 30 20"><path d="M2,18 C-5,10 15,-5 28,10 C35,15 15,25 2,18 Z" fill="darkgray" /></svg>`,
    };

    // --- GAME STATE ---
    let player, platforms, enemies, traps, decorations, key, door, water;
    let keys, playerState;
    let gameLoopId;
    let mainSvg;

    // --- UTILITY FUNCTIONS ---
    const createSvgElement = (svgString) => {
        const div = document.createElement('div');
        div.innerHTML = svgString;
        const svg = div.querySelector('svg');
        svg.style.position = 'absolute';
        return svg;
    };

    const setElementPos = (el, x, y) => {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
    };

    // --- GAME INITIALIZATION ---
    function init() {
        // Remove end screen if it exists
        const endScreen = document.getElementById('end-screen');
        if (endScreen) endScreen.remove();

        gameContainer.style.width = `${GAME_WIDTH}px`;
        gameContainer.style.height = `${GAME_HEIGHT}px`;
        
        if (mainSvg) mainSvg.remove();
        mainSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        mainSvg.setAttribute('width', GAME_WIDTH);
        mainSvg.setAttribute('height', GAME_HEIGHT);
        gameContainer.appendChild(mainSvg);

        keys = {
            'a': false, 'd': false, 'w': false
        };

        playerState = {
            x: 100, y: 100,
            vx: 0, vy: 0,
            width: 40, height: 60,
            onGround: false,
            jumps: 2,
            hasKey: false,
            isDead: false
        };

        generateLevel();
        createPlayer();

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameLoop();
    }

    // --- LEVEL GENERATION ---
    function generateLevel() {
        platforms = [];
        enemies = [];
        traps = [];
        decorations = [];

        // Create ground platforms
        let currentX = 0;
        let currentY = GAME_HEIGHT - 50;

        while (currentX < GAME_WIDTH * 2) { // Generate a level wider than the screen
            const width = 150 + Math.random() * 200;
            const height = 40 + Math.random() * 80;
            
            platforms.push({ x: currentX, y: currentY, width, height, type: 'grass' });

            // Add some decorations on top
            if (Math.random() < 0.5) decorations.push({ x: currentX + Math.random() * (width - 20), y: currentY - 20, type: 'grass' });
            if (Math.random() < 0.3) decorations.push({ x: currentX + Math.random() * (width - 30), y: currentY - 20, type: 'rock' });

            // Add enemies or traps
            if (Math.random() < 0.2 && currentX > 300) {
                enemies.push({ x: currentX + width / 2 - 25, y: currentY - 50, width: 50, height: 50 });
            } else if (Math.random() < 0.15 && currentX > 300) {
                traps.push({ x: currentX + width / 2 - 50, y: currentY - 25, width: 100, height: 25, type: 'spikes' });
            }

            const gap = 80 + Math.random() * 100;
            currentX += width + gap;
            currentY += (Math.random() - 0.5) * 150;
            currentY = Math.max(200, Math.min(GAME_HEIGHT - 50, currentY));
        }

        // Place key on a distant platform
        const keyPlatformIndex = Math.floor(platforms.length * 0.75);
        const keyPlatform = platforms[keyPlatformIndex];
        key = {
            x: keyPlatform.x + keyPlatform.width / 2 - 25,
            y: keyPlatform.y - 60,
            width: 50, height: 50,
            collected: false
        };

        // Place door on the last platform
        const doorPlatform = platforms[platforms.length - 1];
        door = {
            x: doorPlatform.x + doorPlatform.width / 2 - 30,
            y: doorPlatform.y - 100,
            width: 60, height: 100,
            isOpen: false
        };

        // Add water/precipice at the bottom
        water = { x: 0, y: GAME_HEIGHT - 20, width: GAME_WIDTH * 2, height: 20 };

        renderLevel();
    }

    function renderLevel() {
        // Clear previous level elements except player
        while (mainSvg.firstChild) {
            if (mainSvg.firstChild.id !== 'player') {
                mainSvg.firstChild.remove();
            }
        }

        // Render water
        const waterRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        waterRect.setAttribute('id', 'water');
        waterRect.setAttribute('x', 0);
        waterRect.setAttribute('y', water.y);
        waterRect.setAttribute('width', water.width);
        waterRect.setAttribute('height', water.height);
        waterRect.setAttribute('fill', 'blue');
        waterRect.setAttribute('opacity', '0.7');
        mainSvg.appendChild(waterRect);

        // Render platforms
        platforms.forEach(p => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute('class', 'platform');
            rect.setAttribute('x', p.x);
            rect.setAttribute('y', p.y);
            rect.setAttribute('width', p.width);
            rect.setAttribute('height', p.height);
            rect.setAttribute('fill', '#A0522D'); // Dirt color
            mainSvg.appendChild(rect);

            const topRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            topRect.setAttribute('class', 'platform-top');
            topRect.setAttribute('x', p.x);
            topRect.setAttribute('y', p.y);
            topRect.setAttribute('width', p.width);
            topRect.setAttribute('height', 10);
            topRect.setAttribute('fill', '#228B22'); // Grass color
            mainSvg.appendChild(topRect);
        });

        // Render decorations
        decorations.forEach(d => {
            const asset = createSvgElement(SVG_ASSETS[d.type]);
            asset.setAttribute('class', 'decoration');
            asset.setAttribute('x', d.x);
            asset.setAttribute('y', d.y);
            asset.setAttribute('width', d.type === 'rock' ? 30 : 20);
            asset.setAttribute('height', 20);
            mainSvg.appendChild(asset);
        });

        // Render enemies
        enemies.forEach((e, i) => {
            const asset = createSvgElement(SVG_ASSETS.enemy);
            asset.id = `enemy-${i}`;
            asset.setAttribute('class', 'enemy');
            asset.setAttribute('x', e.x);
            asset.setAttribute('y', e.y);
            asset.setAttribute('width', e.width);
            asset.setAttribute('height', e.height);
            mainSvg.appendChild(asset);
        });

        // Render traps
        traps.forEach((t, i) => {
            const asset = createSvgElement(SVG_ASSETS[t.type]);
            asset.id = `trap-${i}`;
            asset.setAttribute('class', 'trap');
            asset.setAttribute('x', t.x);
            asset.setAttribute('y', t.y);
            asset.setAttribute('width', t.width);
            asset.setAttribute('height', t.height);
            mainSvg.appendChild(asset);
        });

        // Render key
        const keyAsset = createSvgElement(SVG_ASSETS.key);
        keyAsset.id = 'key';
        keyAsset.setAttribute('x', key.x);
        keyAsset.setAttribute('y', key.y);
        keyAsset.setAttribute('width', key.width);
        keyAsset.setAttribute('height', key.height);
        mainSvg.appendChild(keyAsset);

        // Render door
        const doorAsset = createSvgElement(SVG_ASSETS.door);
        doorAsset.id = 'door';
        doorAsset.setAttribute('x', door.x);
        doorAsset.setAttribute('y', door.y);
        doorAsset.setAttribute('width', door.width);
        doorAsset.setAttribute('height', door.height);
        mainSvg.appendChild(doorAsset);
    }

    // --- PLAYER CREATION ---
    function createPlayer() {
        player = createSvgElement(SVG_ASSETS.player);
        player.id = 'player';
        player.setAttribute('width', playerState.width);
        player.setAttribute('height', playerState.height);
        mainSvg.appendChild(player);
        setElementPos(player, playerState.x, playerState.y);
    }

    // --- INPUT HANDLING ---
    function handleKeyDown(e) {
        if (playerState.isDead) return;
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = true;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = true;
        if ((e.key === 'w' || e.key === 'W' || e.key === ' ') && !keys.w) {
            keys.w = true;
            jump();
        }
    }

    function handleKeyUp(e) {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = false;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = false;
        if (e.key === 'w' || e.key === 'W' || e.key === ' ') keys.w = false;
    }

    function jump() {
        if (playerState.jumps > 0) {
            playerState.jumps--;
            if (playerState.jumps === 1) { // First jump
                playerState.vy = JUMP_FORCE;
            } else { // Double jump
                playerState.vy = DOUBLE_JUMP_FORCE;
            }
            playerState.onGround = false;
        }
    }

    // --- GAME LOOP ---
    function gameLoop() {
        if (playerState.isDead) {
            showEndScreen("You Died! Click to restart.");
            return;
        }

        updatePlayer();
        updateCamera();
        render();

        gameLoopId = requestAnimationFrame(gameLoop);
    }

    // --- UPDATE FUNCTIONS ---
    function updatePlayer() {
        // Horizontal movement
        if (keys.a) playerState.vx = -PLAYER_SPEED;
        else if (keys.d) playerState.vx = PLAYER_SPEED;
        else playerState.vx = 0;

        playerState.x += playerState.vx;

        // Vertical movement (gravity)
        playerState.vy += GRAVITY;
        playerState.y += playerState.vy;
        playerState.onGround = false; // Assume not on ground until collision check proves otherwise

        // Collision detection
        checkCollisions();
    }

    function updateCamera() {
        // Simple camera: move the whole SVG content
        const cameraX = -playerState.x + GAME_WIDTH / 3;
        mainSvg.style.transform = `translateX(${cameraX}px)`;
    }

    // --- RENDER FUNCTION ---
    function render() {
        setElementPos(player, playerState.x, playerState.y);
    }

    // --- COLLISION DETECTION ---
    function checkCollisions() {
        const p = playerState;

        // Platforms
        platforms.forEach(platform => {
            if (p.x < platform.x + platform.width &&
                p.x + p.width > platform.x &&
                p.y < platform.y + platform.height &&
                p.y + p.height > platform.y) {

                // Check for collision from top
                const prevY = p.y - p.vy;
                if (prevY + p.height <= platform.y) {
                    p.y = platform.y - p.height;
                    p.vy = 0;
                    p.onGround = true;
                    p.jumps = 2; // Reset jumps on landing
                }
                // Side collisions
                else if (p.x + p.width > platform.x && p.x < platform.x + platform.width) {
                     if (p.vx > 0) p.x = platform.x - p.width;
                     if (p.vx < 0) p.x = platform.x + platform.width;
                }
            }
        });

        // Death by falling (precipice/water)
        if (p.y + p.height > water.y) {
            playerState.isDead = true;
        }

        // Enemies
        enemies.forEach(e => {
            if (p.x < e.x + e.width && p.x + p.width > e.x &&
                p.y < e.y + e.height && p.y + p.height > e.y) {
                playerState.isDead = true;
            }
        });

        // Traps
        traps.forEach(t => {
            if (p.x < t.x + t.width && p.x + p.width > t.x &&
                p.y < t.y + t.height && p.y + p.height > t.y) {
                playerState.isDead = true;
            }
        });

        // Key
        if (!key.collected &&
            p.x < key.x + key.width && p.x + p.width > key.x &&
            p.y < key.y + key.height && p.y + p.height > key.y) {
            
            key.collected = true;
            playerState.hasKey = true;
            document.getElementById('key').style.display = 'none';
            
            // Open the door by adding the "open" part to its SVG
            door.isOpen = true;
            const doorEl = document.getElementById('door');
            const openRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            openRect.setAttribute('x', '5');
            openRect.setAttribute('y', '5');
            openRect.setAttribute('width', '50');
            openRect.setAttribute('height', '90');
            openRect.setAttribute('fill', '#333');
            // Insert it before the doorknob (the circle) for correct layering
            doorEl.insertBefore(openRect, doorEl.querySelector('circle'));
        }

        // Door (win condition)
        if (door.isOpen &&
            p.x < door.x + door.width && p.x + p.width > door.x &&
            p.y < door.y + door.height && p.y + p.height > door.y) {
            
            showEndScreen("You Escaped! Click to play again.");
            cancelAnimationFrame(gameLoopId);
        }
    }

    // --- END SCREEN ---
    function showEndScreen(message) {
        // Stop the game loop if it's still running
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }

        const endScreen = document.createElement('div');
        endScreen.id = 'end-screen';
        endScreen.style.position = 'absolute';
        endScreen.style.top = '0';
        endScreen.style.left = '0';
        endScreen.style.width = '100%';
        endScreen.style.height = '100%';
        endScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        endScreen.style.color = 'white';
        endScreen.style.display = 'flex';
        endScreen.style.justifyContent = 'center';
        endScreen.style.alignItems = 'center';
        endScreen.style.fontSize = '48px';
        endScreen.style.cursor = 'pointer';
        endScreen.style.textAlign = 'center';
        endScreen.textContent = message;

        // Use { once: true } to automatically remove the listener after one click
        endScreen.addEventListener('click', init, { once: true });

        gameContainer.appendChild(endScreen);
    }

    // --- START THE GAME ---
    init();
});
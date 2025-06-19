let selectedCharacter = null;

// Charge tous les sprites d'un perso selon le prefix (Peach ou Daisy)
function loadCharacterSprites(prefix) {
  function img(src) { let i = new Image(); i.src = `assets/${src}`; return i; }
  return {
    jumpLeft: img(`${prefix}_Up-L.png`),
    jumpRight: img(`${prefix}_Up-R.png`),
    fallLeft: img(`${prefix}_Down-L.png`),
    fallRight: img(`${prefix}_Down-R.png`),
    landLeft: img(`${prefix}_Landed-L.png`),
    landRight: img(`${prefix}_Landed-R.png`),
    jetpackLeft: img(`${prefix}_Powerup2_L.png`),
    jetpackRight: img(`${prefix}_Powerup2_R.png`)
  };
}

// Structure des persos
const characterData = {
  peach: {
    width: 80,
    height: 100,
    sprites: loadCharacterSprites('Peach'),
    getSprite: function() { return getSpriteFromState(this.sprites); }
  },
  daisy: {
    width: 80,
    height: 100,
    sprites: loadCharacterSprites('Daisy'),
    getSprite: function() { return getSpriteFromState(this.sprites); }
  }
};

// Variables globales du jeu (inchangées)
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 400;
canvas.height = 600;
const gravity = 0.1;
const jumpForce = -5;
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  Space: false,
};

let gameStarted = false;
let cameraY = 0;
let nextPlatformY = 550;
let nextMonsterY = 0;
let nextPowerUpY = 0;
let lastTouchedPlatformY = 0;
let platformGeneratedCount = 0;
let graduationBase = 0;
let gameOver = false;
let gameOverReason = "";
let jetpackAnimTimer = 0;
let jetpackAnimDir = 1;
let lastBoomerangY = 10000;
let lavaY = 0;
let dead = false;
let initialY = 0;
let characterSelectActive = true; // Au début, le menu s'affiche
let characterHoverIndex = 0;      // Pour naviguer au clavier
let characterSpriteHitboxes = []; // Ajoute cette variable globale
let touchX = null;


const characterKeys = Object.keys(characterData); // ['peach', 'daisy']

// Sécurité score/maxHeight
if (!window.GameSecurity) {
  alert("Sécurité absente ! Charge bien game-security.js avant game.js !");
}

const kirby = {
  x: 180, y: 300, width: 80, height: 100,
  dy: 0, shootCooldown: 0, hasJetpack: false, jetpackTime: 0, xSpeed: 0
};

let peachState = "fall";
let peachDirection = "right";
let landTimer = 0;

// Images non-liées au perso (chemins à adapter)
const gameOverImg = new Image();
gameOverImg.src = "assets/gameover.png"; // Mets ici le chemin de ton image de Game Over !

const backgroundImg = new Image(); backgroundImg.src = 'assets/background.png';
const backgroundDaisyImg = new Image();
backgroundDaisyImg.src = 'assets/background_daisy.png';
const iconJetpack = new Image(); iconJetpack.src = 'assets/Powerup_SuperStar.png';
const iconBoost = new Image(); iconBoost.src = 'assets/Bouncing_Shroom.png';
const monsterGroundImg = new Image(); monsterGroundImg.src = 'assets/Ennemy_Ground1.png';
const monsterFlyingLeftImg = new Image(); monsterFlyingLeftImg.src = 'assets/Ennemy_Flying1-L.png';
const monsterFlyingRightImg = new Image(); monsterFlyingRightImg.src = 'assets/Ennemy_Flying1-R.png';
const monsterBoomerangIdleImg = new Image(); monsterBoomerangIdleImg.src = "assets/Ennemy_Ground2_Waiting.png";
const monsterBoomerangThrowImg = new Image(); monsterBoomerangThrowImg.src = "assets/Ennemy_Ground2_Throwing.png";
const monsterBoomerangWaitImg = new Image(); monsterBoomerangWaitImg.src = "assets/Ennemy_Ground2_WeaponInHand.png";
const boomerangImg = new Image(); boomerangImg.src = "assets/Ennemy_Ground2_Weapon.png";
const platformStaticImg = new Image(); platformStaticImg.src = "assets/Platform_Basic.png";
const platformMovingImg = new Image(); platformMovingImg.src = "assets/Platform_Moving.png";
const platformBreakableImg = new Image(); platformBreakableImg.src = "assets/Platform_Breakable.png";
const lavaImg = new Image(); lavaImg.src = "assets/lava.png";

// Sons
const springSound = new Audio('assets/spring.mp3'); springSound.volume = 0.4;
const jetpackLoop = new Audio('assets/jetpack.mp3');
const gameOverSound = new Audio('assets/gameover.mp3'); gameOverSound.volume = 0.6;
const ambianceMusic = new Audio('assets/music.mp3'); ambianceMusic.loop = true; ambianceMusic.volume = 0.4;
function startMusic() { if (ambianceMusic.paused) ambianceMusic.play(); }

// Données de jeu
const platforms = [], monsters = [], powerUps = [], bullets = [], springs = [], enemyBullets = [];
const moveSpeed = 4;
const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");
if (btnLeft && btnRight && btnShoot) {
  btnLeft.addEventListener("touchstart", () => keys.ArrowLeft = true);
  btnLeft.addEventListener("touchend", () => keys.ArrowLeft = false);

  btnRight.addEventListener("touchstart", () => keys.ArrowRight = true);
  btnRight.addEventListener("touchend", () => keys.ArrowRight = false);

  btnShoot.addEventListener("touchstart", shoot);
}
// Boomerang constants
const BOOMERANG_HITBOX = 22; // collision
const BOOMERANG_DRAW_SIZE = 40; // affichage
const BOOMERANG_SPEED = 1.5;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Permet Space uniquement si un perso choisi
canvas.addEventListener('mousedown', function(e) {
  if (!characterSelectActive) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  for (let box of characterSpriteHitboxes) {
    if (
      mouseX >= box.x && mouseX <= box.x + box.width &&
      mouseY >= box.y && mouseY <= box.y + box.height
    ) {
      // Clique sur un perso : sélectionne et démarre
      characterHoverIndex = box.index;
      const key = box.key;
      selectedCharacter = characterData[key];
      kirby.width = selectedCharacter.width;
      kirby.height = selectedCharacter.height;
      characterSelectActive = false;
      gameStarted = true;
      initGame();
      startMusic();
      break;
    }
  }
});
canvas.addEventListener('touchstart', function(e) {
  if (!characterSelectActive) return;
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);
  for (let box of characterSpriteHitboxes) {
    if (
      touchX >= box.x && touchX <= box.x + box.width &&
      touchY >= box.y && touchY <= box.y + box.height
    ) {
      characterHoverIndex = box.index;
      const key = box.key;
      selectedCharacter = characterData[key];
      kirby.width = selectedCharacter.width;
      kirby.height = selectedCharacter.height;
      characterSelectActive = false;
      gameStarted = true;
      initGame();
      startMusic();
      break;
    }
  }
});
canvas.addEventListener('mousemove', function(e) {
  if (!characterSelectActive) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  for (let box of characterSpriteHitboxes) {
    if (
      mouseX >= box.x && mouseX <= box.x + box.width &&
      mouseY >= box.y && mouseY <= box.y + box.height
    ) {
      characterHoverIndex = box.index;
      break;
    }
  }
});

canvas.addEventListener('touchmove', function(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
}, { passive: true });

document.addEventListener("keydown", (e) => {
  if (characterSelectActive) {
    // Gestion sélection personnage avec flèches et espace
    if (e.code === "ArrowLeft") {
      characterHoverIndex--;
      if (characterHoverIndex < 0) characterHoverIndex = characterKeys.length - 1;
    }
    else if (e.code === "ArrowRight") {
      characterHoverIndex++;
      if (characterHoverIndex >= characterKeys.length) characterHoverIndex = 0;
    }
    else if (e.code === "Space" || e.code === "KeyA") {
      selectedCharacter = characterData[characterKeys[characterHoverIndex]];
      kirby.width = selectedCharacter.width;
      kirby.height = selectedCharacter.height;
      characterSelectActive = false;
      gameOver = false; 
      gameStarted = true; 
      gameOverReason = "";
      initGame();
      startMusic();
    }
  } else {
    // Contrôles jeu
    if ((e.code === "Space" || e.code === "KeyA")&& !gameStarted && selectedCharacter) {
      gameOver = false; gameStarted = true; gameOverReason = "";
      initGame(); startMusic();
    }
    if (e.code === "KeyZ") shoot();
    if (e.code === "ArrowLeft" || e.code === "KeyQ") keys.ArrowLeft = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.ArrowRight = true;
  }
});


document.addEventListener("keyup", (e) => {
if (e.code === "ArrowLeft" || e.code === "KeyQ") keys.ArrowLeft = false;
if (e.code === "ArrowRight" || e.code === "KeyD") keys.ArrowRight = false;
});

window.addEventListener('message', (event) => {
  const { type, dir, button, action } = event.data || {};

  if (characterSelectActive) {
    // DPad left/right as dir, action = 'start' or 'end'
    if (type === 'MOVE' && action === 'start') {
      if (dir === 'ArrowLeft') {
        characterHoverIndex--;
        if (characterHoverIndex < 0) characterHoverIndex = characterKeys.length - 1;
        draw(); // redraw immediately so UI updates
      } else if (dir === 'ArrowRight') {
        characterHoverIndex++;
        if (characterHoverIndex >= characterKeys.length) characterHoverIndex = 0;
        draw();
      }
    }
    console.log('[DEBUG] type:', type, 'dir:', dir, 'button:', button, 'action:', action);
    // 'A' button as selection confirm
    if (type === 'ACTION' && button === 'A' && action === 'start') {
      selectedCharacter = characterData[characterKeys[characterHoverIndex]];
      kirby.width = selectedCharacter.width;
      kirby.height = selectedCharacter.height;
      characterSelectActive = false;
      gameOver = false;
      gameStarted = true;
      gameOverReason = "";
      initGame();
      startMusic();
    }
  } else {
    // During gameplay, map controls if needed, e.g. keys.ArrowLeft = true when DPad Left pressed
    if (type === 'MOVE') {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(dir)) {
        keys[dir] = action === 'start';
      }
    }
    if (type === 'ACTION') {
      if (button === 'KeyZ' && action === 'start') shoot();
      // you can map other buttons here as you want
    }
  }
});


function getSpriteFromState(sprites) {
  if (kirby.hasJetpack) return peachDirection === "left" ? sprites.jetpackLeft : sprites.jetpackRight;
  if (peachState === "land") return peachDirection === "left" ? sprites.landLeft : sprites.landRight;
  if (peachState === "jump") return peachDirection === "left" ? sprites.jumpLeft : sprites.jumpRight;
  return peachDirection === "left" ? sprites.fallLeft : sprites.fallRight;
}


// === Logique du jeu (comme avant, aucun alert) ===

function initGame() {
  if (window.GameSecurity && typeof window.GameSecurity.reset === "function") {
    window.GameSecurity.reset();
  }
  gameOverSound.pause();
  jetpackLoop.pause();
  jetpackLoop.currentTime = 0;
  gameOverSound.currentTime = 0;
  dead = false;
  platforms.length = 0;
  monsters.length = 0;
  powerUps.length = 0;
  bullets.length = 0;
  springs.length = 0;
  enemyBullets.length = 0;
  platformGeneratedCount = 0;
  kirby.y = 300; // Position temporaire (va être remplacée après generatePlatforms)
  cameraY = 300;
  nextPlatformY = 550;
  nextMonsterY = kirby.y - 800;
  nextPowerUpY = kirby.y - 1000;

  generatePlatforms();
  const first = platforms[0];
  if (!first) {
    console.error("Aucune plateforme générée !");
    return;
  }
  kirby.x = first.x + first.width / 2 - kirby.width / 2;
  kirby.y = first.y - kirby.height;
  initialY = kirby.y; // Ajoute cette ligne !
  cameraY = kirby.y + kirby.height + 100;
  window.GameSecurity.setMaxHeight(kirby.y); // <-- Ici UNIQUEMENT
  window.GameSecurity.setScore(0);
  console.log("[DEBUG INIT] kirby.y =", kirby.y, "initialY =", initialY);
  console.log("[DEBUG INIT] maxHeight =", window.GameSecurity.getMaxHeight());
  console.log("[DEBUG INIT] getScore =", window.GameSecurity.getScore());

  kirby.dy = 0;
  kirby.hasJetpack = false;
  jetpackAnimTimer = 0;    // Remet l’animation à zéro au début
  jetpackAnimDir = 1;      // Remet le balancement à droite
  lastTouchedPlatformY = kirby.y;
  lavaY = first.y + first.height + 10; // 10px sous la première plateforme, tu peux ajuster

  const pressedKeys = new Map();

  window.addEventListener('message', (event) => {
    const { type, dir, button, action } = event.data || {};
    if (type === 'MOVE' && ['ArrowLeft', 'ArrowRight'].includes(dir)) {
      if (action === 'start') {
        keys[dir] = true;

        if (pressedKeys.has(dir)) clearTimeout(pressedKeys.get(dir));

        const timeout = setTimeout(() => {
          keys[dir] = false;
          pressedKeys.delete(dir);
        }, 150);
        pressedKeys.set(dir, timeout);
      } else if (action === 'end') {
        keys[dir] = false;
        if (pressedKeys.has(dir)) {
          clearTimeout(pressedKeys.get(dir));
          pressedKeys.delete(dir);
        }
      }
    }
      // Add this block to restart on A button press
    if (type === 'ACTION' && button === 'A' && action === 'start') {
      // Only restart if the game is over or not started
      if (gameOver || !gameStarted) {
        gameOver = false;
        gameStarted = true;
        gameOverReason = "";
        initGame();
        startMusic();
      }
    }
  });

}


function generatePlatforms() {
  while (nextPlatformY > kirby.y - 800) {
    const platformCount = 2;
    let created = 0;
    let attempts = 0;
    let monsterAdded = false;
    let boomerangPlaced = false;
    while (created < platformCount && attempts < 20) {
      const width = 100;
      const isMoving = nextPlatformY < -1000 ? Math.random() < 0.2 : false;
      const moveRange = isMoving ? 60 : 0;
      let x = Math.random() * (canvas.width - width - moveRange);
      const rangeStart = x - moveRange;
      const rangeEnd = x + width + moveRange;
      if (rangeStart < 0 || rangeEnd > canvas.width) {
        attempts++;
        continue;
      }
      const overlap = platforms.some(p => {
        if (p.y !== nextPlatformY) return false;
        const pMove = p.dx !== 0 ? 60 : 0;
        const pStart = p.x - pMove;
        const pEnd = p.x + p.width + pMove;
        return rangeEnd > pStart && rangeStart < pEnd;
      });
      if (!overlap) {
        // Anti double cassante :
        const breakableAlreadyPlaced = platforms.some(
          p => p.y === nextPlatformY && p.type === "breakable"
        );
        const isFirstPlatform = (platformGeneratedCount === 0);
        const isBreakable = !breakableAlreadyPlaced && Math.random() < 0.1 && !isFirstPlatform;
        const platform = {
  x,
  y: nextPlatformY,
  width,
  height: 30,
  dx: (isBreakable ? 0 : (isMoving ? 1 : 0)),  // dx=0 si cassable (statique)
  type: isBreakable ? "breakable" : isMoving ? "moving" : "static",
  broken: false,
  breakTimer: isBreakable ? 0 : undefined,
};
        platforms.push(platform);
        created++;
        platformGeneratedCount++;

        // Mobs : doivent toujours être sur une plateforme (sauf volants)
        if (!monsterAdded && platformGeneratedCount > 10 && Math.random() < 0.25) {
          const type = Math.random() < 0.5 ? "ground" : "flying";
          const mobX = platform.x + platform.width / 2 - 20;
          let mobY, mType, mDirection, mSpeed, attachedPlatform = undefined;
          if (type === "ground") {
            mobY = platform.y - 40;
            mType = "ground";
            mDirection = Math.random() < 0.5 ? "left" : "right";
            mSpeed = 0;
            attachedPlatform = platform;
          } else {
            mobY = platform.y - 100;
            mType = "flying";
            mDirection = Math.random() < 0.5 ? "left" : "right";
            mSpeed = 0.3;
          }
          // Vérifier overlap avec powerups déjà existants
          const isMonsterOverlapping = monsters.concat(powerUps).some(obj =>
            Math.abs((obj.x + obj.width / 2) - (platform.x + platform.width / 2)) < 40 &&
            Math.abs(obj.y - mobY) < 35
          );
          if (!isMonsterOverlapping) {
            monsters.push({
              x: mobX,
              y: mobY,
              width: 40,
              height: 40,
              monsterType: mType,
              direction: mDirection,
              speed: mSpeed,
              attachedPlatform: attachedPlatform
            });
            monsterAdded = true;
          }
        }

        // Ajout du BOOMERANG MOB TOUJOURS VERS LE CENTRE
        // Espacement de 3 plateformes (3 * 130px)
        if (
          !boomerangPlaced &&
          window.GameSecurity.getScore() >= 100 &&
          Math.random() < 0.20 &&
          Math.abs(nextPlatformY - lastBoomerangY) >= 3 * 130
        ) {
          const mobX = platform.x + platform.width / 2 - 20;
          let dir;
          if (mobX + 20 < canvas.width / 2) dir = "right";
          else dir = "left";
          // Vérifie qu'aucun monstre ou powerup n'est déjà trop proche
          const isBoomerangOverlapping = monsters.concat(powerUps).some(obj =>
            Math.abs((obj.x + obj.width / 2) - (platform.x + platform.width / 2)) < 40 &&
            Math.abs(obj.y - (platform.y - 40)) < 35
          );
          if (!isBoomerangOverlapping) {
            monsters.push({
              x: mobX,
              y: platform.y - 40,
              width: 40,
              height: 40,
              monsterType: "boomerang",
              direction: dir,
              shootTimer: 0,
              animState: "idle",
              animFrameTimer: 0,
              attachedPlatform: platform
            });
            boomerangPlaced = true;
            lastBoomerangY = nextPlatformY; // Met à jour l'espacement
          }
        }

        // PowerUp
        if (Math.random() < 0.05) {
          const type = Math.random() < 0.5 ? "boost" : "jetpack";
          const powerup = {
            x: platform.x + platform.width / 2 - 15,
            y: type === "boost" ? platform.y - 30 : platform.y + 10,
            width: 30,
            height: 30,
            type
          };
          // Vérifie collision avec un autre powerup ou monstre
          const isOverlapping = powerUps.concat(monsters).some(obj =>
            Math.abs((obj.x + obj.width / 2) - (platform.x + platform.width / 2)) < 40 &&
            Math.abs((obj.y) - (type === "boost" ? platform.y - 30 : platform.y + 10)) < 35
          );
          if (!isOverlapping) {
            powerUps.push(powerup);
          }
        }
      }
      attempts++;
    }
    nextPlatformY -= 130;
  }
}

function shoot() {
  if (kirby.shootCooldown <= 0) {
    bullets.push({ x: kirby.x + kirby.width / 2 - 5, y: kirby.y, width: 10, height: 10, dy: -5 });
    kirby.shootCooldown = 20;
  }
}

// === Toute la logique update (modifié pour Game Over propre et son) ===
function update(deltaTime) {
  if (!gameStarted) return;

  // --- SÉCURITÉ : MAJ des valeurs sécurisées ---
  if (kirby.y < window.GameSecurity.getMaxHeight()) window.GameSecurity.setMaxHeight(kirby.y);
  window.GameSecurity.setScore(Math.max(0, Math.floor((initialY - window.GameSecurity.getMaxHeight()) / 10)));
  // --------------------------------------------
  if (kirby.hasJetpack) {
    kirby.dy = -6;
    kirby.jetpackTime -= deltaTime;
    if (isNaN(kirby.jetpackTime) || kirby.jetpackTime <= 0) {
      kirby.hasJetpack = false;
      kirby.jetpackTime = 0;
      kirby.dy = 0;
      jetpackLoop.pause();
      jetpackLoop.currentTime = 0;
    }
  } else {
    kirby.dy += gravity * deltaTime;
    kirby.dy = Math.max(-10, Math.min(12, kirby.dy));
  }
  kirby.y += kirby.dy * deltaTime;
  if (!isFinite(kirby.dy) || isNaN(kirby.dy)) kirby.dy = 0;
  if (!isFinite(kirby.y) || isNaN(kirby.y)) kirby.y = 300;

kirby.xSpeed = 0;

// Contrôle tactile
if (touchX !== null) {
  const center = kirby.x + kirby.width / 2;
  if (Math.abs(center - touchX) > 5) {
    if (center < touchX) {
      kirby.x += moveSpeed * deltaTime;
      kirby.xSpeed = 1;
    } else {
      kirby.x -= moveSpeed * deltaTime;
      kirby.xSpeed = -1;
    }
  }
}

// Contrôle clavier (flèches ou ZQSD)
if (keys.ArrowLeft) {
  kirby.x -= moveSpeed * deltaTime;
  kirby.xSpeed = -1;
}
if (keys.ArrowRight) {
  kirby.x += moveSpeed * deltaTime;
  kirby.xSpeed = 1;
}

  if (kirby.xSpeed < 0) peachDirection = "left";
  else if (kirby.xSpeed > 0) peachDirection = "right";
  if (kirby.x < -kirby.width) kirby.x = canvas.width;
  if (kirby.x > canvas.width) kirby.x = -kirby.width;
  const targetCameraY = kirby.y - -150;
  cameraY = lerp(cameraY, targetCameraY, 0.2 * deltaTime);
  if (kirby.shootCooldown > 0) kirby.shootCooldown -= deltaTime;
  bullets.forEach((b, i) => {
    b.y += b.dy * deltaTime;
    if (b.y < -10) bullets.splice(i, 1);
  });
  platforms.forEach(p => {
    if (p.dx !== 0) {
      p.x += p.dx * deltaTime;
      if (p.x < 0 || p.x + p.width > canvas.width) {
        p.dx *= -1;
        p.x = Math.max(0, Math.min(p.x, canvas.width - p.width));
      }
      for (let other of platforms) {
        if (other === p || other.y !== p.y) continue;
        if (p.x < other.x + other.width && p.x + p.width > other.x) {
          p.dx *= -1;
          p.x += p.dx * 2 * deltaTime;
          break;
        }
      }
    }
  });
  monsters.forEach(m => {
    if (m.attachedPlatform) {
      m.x = m.attachedPlatform.x + m.attachedPlatform.width / 2 - m.width / 2;
      m.y = m.attachedPlatform.y - m.height;
      if (m.attachedPlatform.broken) delete m.attachedPlatform;
    }
  });
  platforms.forEach(p => {
    if (
      kirby.dy > 0 &&
      kirby.x < p.x + p.width &&
      kirby.x + kirby.width > p.x &&
      kirby.y + kirby.height <= p.y + 10 &&
      kirby.y + kirby.height + kirby.dy >= p.y &&
      !p.broken
    ) {
      if (p.type === "breakable") {
        p.broken = true;
        p.breakTimer = 10;

        // Détruit monstres et power-ups posés sur cette plateforme
        // Supprime les monstres attachés à la plateforme (ground, boomerang)
        for (let i = monsters.length - 1; i >= 0; i--) {
          const m = monsters[i];
          // Pour les mobs "ground" ou "boomerang" attachés à la plateforme
          if (m.attachedPlatform === p) {
            monsters.splice(i, 1);
            continue;
          }
          // Pour les autres (flying) qui sont "juste au-dessus"
          if (
            Math.abs(m.y + m.height - p.y) < 6 && // posé dessus
            m.x + m.width > p.x && m.x < p.x + p.width
          ) {
            monsters.splice(i, 1);
          }
        }

        // Supprime les power-ups posés dessus
        for (let i = powerUps.length - 1; i >= 0; i--) {
          const pu = powerUps[i];
          if (
            Math.abs(pu.y + pu.height - p.y) < 6 && // posé dessus
            pu.x + pu.width > p.x && pu.x < p.x + p.width
          ) {
            powerUps.splice(i, 1);
          }
        }
      } else {
        kirby.y = p.y - kirby.height;
        kirby.dy = jumpForce;
        lastTouchedPlatformY = p.y;
        peachState = "land";
        landTimer = 10;
      }
    }
  });
  // Gestion des monstres
  let localDead = false;
  monsters.forEach((m, i) => {
    const collide =
      kirby.x + 20 < m.x + m.width &&
      kirby.x + kirby.width - 20 > m.x &&
      kirby.y + 10 < m.y + m.height &&
      kirby.y + kirby.height - 10 > m.y;
    if (collide && !localDead) {
      localDead = true;
      handleGameOver("Touché par un monstre !");
    }
    if (m.monsterType === "flying") {
      m.x += (m.direction === "left" ? -m.speed : m.speed) * deltaTime;
      if (m.x < 0) {
        m.x = 0;
        m.direction = "right";
      }
      if (m.x + m.width > canvas.width) {
        m.x = canvas.width - m.width;
        m.direction = "left";
      }
    }
    // Monstre boomerang
    if (m.monsterType === "boomerang") {
      m.animFrameTimer = (m.animFrameTimer || 0) - deltaTime;
      m.shootTimer = (m.shootTimer || 0) - deltaTime;
      if (!enemyBullets.some(b => b.owner === m)) {
        if (m.shootTimer <= 0) {
          m.animState = "throw";
          m.animFrameTimer = 8;
          enemyBullets.push({
            x: m.x + m.width / 2 - BOOMERANG_HITBOX / 2,
            y: m.y + m.height / 2 - BOOMERANG_HITBOX / 2,
            width: BOOMERANG_HITBOX,
            height: BOOMERANG_HITBOX,
            dx: m.direction === "left" ? -BOOMERANG_SPEED : BOOMERANG_SPEED,
            owner: m,
            goingBack: false,
            angle: 0
          });
          m.shootTimer = 120 + Math.random() * 60;
        }
      }
      if (m.animState === "throw" && m.animFrameTimer <= 0) {
        m.animState = "wait";
        m.animFrameTimer = 24;
      } else if (m.animState === "wait" && m.animFrameTimer <= 0) {
        m.animState = "idle";
      }
    }
    // Collision avec les tirs du joueur
    bullets.forEach((b, j) => {
      if (
        b.x < m.x + m.width &&
        b.x + b.width > m.x &&
        b.y < m.y + m.height &&
        b.y + b.height > m.y
      ) {
        monsters.splice(i, 1);
        bullets.splice(j, 1);
      }
    });
  });
  enemyBullets.forEach((b, i) => {
    b.angle = (b.angle || 0) + 0.3 * deltaTime;
    b.x += b.dx * deltaTime;
    if (!b.goingBack && (b.x <= 0 || b.x + b.width >= canvas.width)) {
      b.dx *= -1;
      b.goingBack = true;
    }
    if (
      b.goingBack && b.owner &&
      b.x + b.width > b.owner.x && b.x < b.owner.x + b.owner.width &&
      b.y + b.height > b.owner.y && b.y < b.owner.y + b.owner.height
    ) {
      b.owner.animState = "wait";
      b.owner.animFrameTimer = 40;
      enemyBullets.splice(i, 1);
      return;
    }
    if (
      kirby.y + kirby.height > b.y - 2 && kirby.y < b.y + b.height + 2 &&
      kirby.x < b.x + b.width && kirby.x + kirby.width > b.x && !localDead
    ) {
      localDead = true;
      handleGameOver("Touché par un boomerang !");
    }
  });
  powerUps.forEach((p, i) => {
    if (
      kirby.x < p.x + p.width &&
      kirby.x + kirby.width > p.x &&
      kirby.y < p.y + p.height &&
      kirby.y + kirby.height > p.y
    ) {
      if (p.type === "boost") {
        kirby.dy = jumpForce * 1.5;
        springSound.currentTime = 0;
        springSound.play();
      } else if (p.type === "jetpack") {
        kirby.hasJetpack = true;
        kirby.jetpackTime = 240;
        jetpackLoop.currentTime = 0;
        jetpackLoop.play();
      }
      powerUps.splice(i, 1);
    }
  });
  if (landTimer > 0) {
    landTimer--;
    if (landTimer === 0) {
      peachState = kirby.dy < 0 ? "jump" : "fall";
    }
  } else {
    peachState = kirby.dy < 0 ? "jump" : "fall";
  }
  generatePlatforms();
}

function handleGameOver(reason) {
  if (dead) return; // Empêche plusieurs appels
  dead = true;
  gameOver = true;
  gameStarted = false;
  gameOverReason = reason;
  ambianceMusic.pause();
  jetpackLoop.pause();
  jetpackLoop.currentTime = 0;
  ambianceMusic.currentTime = 0;
  gameOverSound.currentTime = 0;
  gameOverSound.play();
  
}

function getPeachSprite() {
  if (kirby.hasJetpack) return peachDirection === "left" ? peachJetpackLeft : peachJetpackRight;
  if (peachState === "land") return peachDirection === "left" ? peachLandLeft : peachLandRight;
  if (peachState === "jump") return peachDirection === "left" ? peachJumpLeft : peachJumpRight;
  return peachDirection === "left" ? peachFallLeft : peachFallRight;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
if (selectedCharacter === characterData.daisy) {
  ctx.drawImage(backgroundDaisyImg, 0, 0, canvas.width, canvas.height);
} else {
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
}
  
  // === MENU CHOIX DU PERSONNAGE ===
  if (characterSelectActive) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  ctx.font = "bold 32px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("Choose Player", canvas.width/2, 120);

  // Prépare la liste des hitboxes pour la souris/tactile
  characterSpriteHitboxes = [];

  const spacing = 200;
  const baseX = canvas.width/2 - (characterKeys.length-1)*spacing/2;

  characterKeys.forEach((key, i) => {
    const x = baseX + i*spacing;
    const img = characterData[key].sprites.landRight;
    ctx.globalAlpha = (i === characterHoverIndex) ? 1 : 0.55;
    ctx.drawImage(img, x-40, 170, 80, 100);
    ctx.globalAlpha = 1;
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = (i === characterHoverIndex) ? "#fff" : "#bbb";
    ctx.fillText(key.charAt(0).toUpperCase() + key.slice(1), x, 290);
    if (i === characterHoverIndex) {
      ctx.strokeStyle = "gold";
      ctx.lineWidth = 4;
      ctx.strokeRect(x-44, 168, 88, 104);
    }
    // Mémorise la hitbox pour la souris/tactile
    characterSpriteHitboxes.push({
      key,
      x: x-44, y: 168, width: 88, height: 104, index: i
    });
  });
  ctx.restore();
  return;
}

  // Graduation dynamique à gauche
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.font = "bold 14px Arial";
  for (let i = 1; i <= 5; i++) {
    const value = graduationBase + i * 100;
    const screenY = canvas.height - i * 100;
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(30, screenY);
    ctx.stroke();
    ctx.fillStyle = window.GameSecurity.getScore() >= value ? "red" : "#aaa";
    ctx.fillText("→ " + value, 35, screenY + 5);
  }
  const offsetY = cameraY - canvas.height;
  ctx.font = "21px segoe";
ctx.textAlign = "left";
ctx.textBaseline = "top";
ctx.fillStyle = "black";
if (!gameStarted && !gameOver) {
  ctx.fillText("Score : 0", 10, 20);
} else {
ctx.fillText(
  window.GameSecurity.isCheater() ? "Score : CHEAT" : "Score : " + window.GameSecurity.getScore(),
  10, 20
);
}


  // Choix image joueur (Peach ou Daisy)
  let playerImg = selectedCharacter ? selectedCharacter.getSprite() : characterData.peach.getSprite();
  let px = kirby.x;
  if (kirby.x < -kirby.width) px = canvas.width - kirby.width;
  else if (kirby.x > canvas.width) px = 0;
  ctx.drawImage(playerImg, px, kirby.y - (cameraY - canvas.height), kirby.width, kirby.height);


  const laveHeight = 150;
  ctx.drawImage(
    lavaImg,
    0,
    lavaY - offsetY,
    canvas.width,
    laveHeight
  );

  platforms.forEach(p => {
    let img =
      p.type === "breakable"
        ? platformBreakableImg
        : p.type === "moving"
          ? platformMovingImg
          : platformStaticImg;
    if (p.broken && p.type === "breakable") {
      if (p.breakTimer > 0) {
        ctx.fillStyle = "rgba(255,0,0,0.4)";
        ctx.fillRect(p.x, p.y - offsetY, p.width, p.height);
        p.breakTimer--;
      } else {
        return;
      }
    }
    ctx.drawImage(img, p.x, p.y - offsetY, p.width, p.height);
  });
  for (let i = platforms.length - 1; i >= 0; i--) {
    const p = platforms[i];
    if (p.type === "breakable" && p.broken && p.breakTimer <= 0) {
      platforms.splice(i, 1);
    }
  }
  const shroomScale = 2;
  springs.forEach(s => {
    const newWidth = s.width * shroomScale;
    const newHeight = s.height * shroomScale;
    const drawX = s.x + s.width / 2 - newWidth / 2;
    const drawY = s.y - offsetY + s.height - newHeight;
    ctx.drawImage(iconBoost, drawX, drawY, newWidth, newHeight);
  });
  const monsterScale = 1.5;
  monsters.forEach(m => {
    let sprite;
    if (m.monsterType === "flying") {
      sprite = m.direction === "left" ? monsterFlyingLeftImg : monsterFlyingRightImg;
    } else if (m.monsterType === "boomerang") {
      if (m.animState === "throw") sprite = monsterBoomerangThrowImg;
      else if (m.animState === "wait") sprite = monsterBoomerangWaitImg;
      else sprite = monsterBoomerangIdleImg;
    } else {
      sprite = monsterGroundImg;
    }
    const newWidth = m.width * monsterScale;
    const newHeight = m.height * monsterScale;
    const drawX = m.x + m.width / 2 - newWidth / 2;
    const drawY = m.y - (cameraY - canvas.height) + m.height - newHeight;
    if (m.monsterType === "boomerang" && m.direction === "left") {
      ctx.save();
      ctx.translate(drawX + newWidth / 2, drawY + newHeight / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, -newWidth / 2, -newHeight / 2, newWidth, newHeight);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, drawX, drawY, newWidth, newHeight);
    }
  });
  const powerupScale = 1.5;
  powerUps.forEach(p => {
    if (p.type === "jetpack") {
      const powerupScale = 1.5;
      const newWidth = p.width * powerupScale;
      const newHeight = p.height * powerupScale;
      const drawX = p.x + p.width / 2;
      const drawY = p.y - offsetY + p.height - newHeight / 2;

      // Angle de balancement léger (-10° à +10°)
      const angle = jetpackAnimDir * Math.PI / 18; // ~10 degrés

      ctx.save();
      ctx.translate(drawX, drawY + newHeight / 2);
      ctx.rotate(angle);
      ctx.drawImage(
        iconJetpack,
        -newWidth / 2,
        -newHeight / 2,
        newWidth,
        newHeight
      );
      ctx.restore();
    } else {
      // Champignon normal
      const powerupScale = 1.5;
      const newWidth = p.width * powerupScale;
      const newHeight = p.height * powerupScale;
      const drawX = p.x + p.width / 2 - newWidth / 2;
      const drawY = p.y - offsetY + p.height - newHeight;
      ctx.drawImage(iconBoost, drawX, drawY, newWidth, newHeight);
    }
  });

  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y - offsetY, b.width, b.height));
  enemyBullets.forEach(b => {
    ctx.save();
    ctx.translate(b.x + BOOMERANG_DRAW_SIZE / 2, b.y - offsetY + BOOMERANG_DRAW_SIZE / 2);
    ctx.rotate(b.angle || 0);
    ctx.drawImage(boomerangImg, -BOOMERANG_DRAW_SIZE / 2, -BOOMERANG_DRAW_SIZE / 2, BOOMERANG_DRAW_SIZE, BOOMERANG_DRAW_SIZE);
    ctx.restore();
  });

  // Menu de départ
  if (!gameStarted && !gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(40, 250, 320, 100);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 250, 320, 100);
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Press SPACE to start", canvas.width / 2, 310);
    ctx.textAlign = "left";
  }

  // Game Over custom
  if (gameOver) {
    ctx.drawImage(gameOverImg, 0, 0, canvas.width, canvas.height);
    // Position de la box score (exemple, adapte selon ton image de fond)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Score en dessous (plus gros, police custom)
    ctx.fillStyle = "black";
    ctx.font = "bold 45px 'SchaboCondensed', segoe"; // Mets ta police ici
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
let scoreToShow = window.GameSecurity.isCheater() ? "CHEAT" : window.GameSecurity.getScore();
//ctx.fillText("Score:", centerX, centerY - 80); // (optionnel: pour afficher "Score:" juste au-dessus)
ctx.fillText(scoreToShow, centerX, centerY + -48);  }

}
// Sélection du perso (callback de la modale)
function selectCharacter(key) {
  selectedCharacter = characterData[key];
  kirby.width = selectedCharacter.width;
  kirby.height = selectedCharacter.height;
  document.getElementById("characterSelectModal").style.display = "none";
}

// Boucle principale
let lastTime = 0;
function gameLoop(currentTime) {
  if (!lastTime) lastTime = currentTime;
  const deltaTime = (currentTime - lastTime) / 16.666;

  // Sécurité anti-triche, chaque frame
  window.GameSecurity.frameCheck(deltaTime);
  if (window.GameSecurity.isCheater()) {
    handleGameOver("Anti-cheat: Vitesse suspecte !");
    draw();
    return;
  }

  lastTime = currentTime;
  update(deltaTime);

  // Collision avec la lave (bas de l'écran)
  const laveHeight = 80;
  if (
    !dead && // empêche de relancer
    kirby.y + kirby.height > lavaY &&
    kirby.x + kirby.width > 0 &&
    kirby.x < canvas.width
  ) {
    handleGameOver("Touché par la lave !");
  }

  // Animation étoile : toutes les 0.7s on inverse le côté
  jetpackAnimTimer += deltaTime / 60;
  if (jetpackAnimTimer > 0.6) { // vitesse du balancement (0.6 = ~2 fois par sec)
    jetpackAnimDir *= -1;
    jetpackAnimTimer = 0;
  }
  draw();
  requestAnimationFrame(gameLoop);
}
initGame();
requestAnimationFrame(gameLoop);
canvas.addEventListener("touchstart", () => {
  if (!gameStarted) {
    gameOver = false;
    gameStarted = true;
    gameOverReason = "";
    initGame();
    startMusic();
  }
});

// Anti-devtools simple (détection touche F12, Ctrl+Shift+I)
window.addEventListener('keydown', e => {
  if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
    if (window.GameSecurity) window.GameSecurity.flagCheat();
  }
});
window.selectCharacter = selectCharacter;



// ==========================================
// SECURE SHOOTER GAME - COMPLETE VERSION
// ==========================================

// Security system initialization
let secureGame = null;
let onEnemyDestroyed = null;
let onSecureGameOver = null;

// Initialize security system
function initSecurity() {
  if (window.GameSecurity) {
    const securitySystem = window.GameSecurity.initializeSecureGame();
    secureGame = securitySystem.secureGame;
    onEnemyDestroyed = securitySystem.onEnemyDestroyed;
    onSecureGameOver = securitySystem.onGameOver;
    console.log('✓ Security system initialized');
  } else {
    console.warn('⚠ Security system not loaded, falling back to basic mode');
  }
}

// Secure score update function
function updateScore(points) {
  if (secureGame) {
    secureGame.incrementScore(points);
  } else {
    // Fallback amélioré
    if (!game._fallbackScore) game._fallbackScore = 0;
    game._fallbackScore += points;
    console.log('Score updated to:', game._fallbackScore); // Debug
  }
}
// Reset and restart game
function restart() {
  // Reinitialize security system
  initSecurity();
  
  game.speed = game.baseSpeed;
  // Don't reset score directly anymore - security system handles it
  game.coins = 0;
  game.distance = 0;
  game.distanceSinceBoss = 0;
  game.bullets = [];
  game.enemyBullets = [];
  game.particles = [];
  game.missilesPerShot = 1;
  game.lives = 3;
  game.chargeStart = null;
  game.flashTime = 0;
  game.bossActive = false;
  game.bossWarning = false;
  game.bossWarningTime = 0;
  game.boss = null;
  game.lastAutoFire = 0;
  game.autoFireInterval = 300; // Reset fire rate
  game.gameRunning = true;
  game.gameOver = false; // Reset game over state
  game.bossesDefeated = 0; // Reset progression
  game.currentTier = 1; // Reset to tier 1
  player.lane = 1;
  player.y = game.height / 2 - player.height / 2;
  game.mouseY = game.height / 2;
  player.trail = [];
  tiles = [];
  generateTiles();
}

// Load assets (from assets folder)
const enemyImages = [];
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `assets/Ennemy_${i}.webp`;
  enemyImages.push(img);
}

const characterImage = new Image();
characterImage.src = 'assets/Character_1.webp';

const backgroundImage = new Image();
backgroundImage.src = 'assets/background.webp';

const collectableImage = new Image();
collectableImage.src = 'assets/Collectable_Suitch_1.webp';

const powerupBonusImage = new Image();
powerupBonusImage.src = 'assets/PowerUp_Firerate.webp';

const powerupMalusImage = new Image();
powerupMalusImage.src = 'assets/PowerUp_Firerate-.webp';

// Life images
const lifeFullImage = new Image();
lifeFullImage.src = 'assets/Life_Full.webp';

const lifeEmptyImage = new Image();
lifeEmptyImage.src = 'assets/Life_Empty.webp';

// Boss images
const bossImages = [];
for (let i = 1; i <= 2; i++) {
  const img = new Image();
  img.src = `assets/BossEnnemy_${i}.webp`;
  bossImages.push(img);
}

// Boss image processing (clean white for true transparency)
const bossRawImage = new Image();
let bossImage = null;

function loadBossImage(bossType) {
  // Disable transparency processing to avoid CORS errors
  // Use boss images directly
  bossImage = bossImages[bossType - 1];
}

// Game configuration (horizontal mode) - MODIFIED for security
const game = {
  canvas: null,
  ctx: null,
  width: 800,
  height: 480,
  laneHeight: 480 / 3, // 3 horizontal lanes
  speed: 2.5,
  baseSpeed: 2.5,
  speedIncrement: 0.01,
  maxSpeed: 6,
  // SECURE SCORE: Use getter that accesses security system
  get score() {
    return secureGame ? secureGame.score : this._fallbackScore || 0;
  },
  _fallbackScore: 0, // Fallback for when security system isn't loaded
  coins: 0,
  distance: 0,
  distanceSinceBoss: 0,
  bossThreshold: 5000,
  bullets: [],
  enemyBullets: [],
  missilesPerShot: 1,
  lives: 3,
  maxLives: 3, // Maximum number of lives
  gameRunning: false,
  gameOver: false, // Game over state
  bossesDefeated: 0, // Number of bosses defeated
  currentTier: 1, // Current tier (1-4)
  keys: {},
  particles: [],
  bgX: 0, // Background scrolls horizontally
  maxChargeTime: 1000,
  chargeStart: null,
  flashTime: 0,
  bossActive: false,
  bossWarning: false,
  bossWarningTime: 0,
  boss: null,
  bossFireInterval: 2000,
  autoFireInterval: 300, // Auto fire every 300ms (slower)
  lastAutoFire: 0,
  mouseY: 240, // Mouse Y position
  now: () => performance.now()
};

// Fire intervals by monster tier (faster = more dangerous)
const enemyFireInterval = [0, 3000, 2500, 2000, 1500];

// Monster stats by tier
const enemyStats = {
  1: { fireRate: 3000, speed: 1.0, hp: 1 },
  2: { fireRate: 2500, speed: 1.2, hp: 1 },
  3: { fireRate: 2000, speed: 1.5, hp: 2 },
  4: { fireRate: 1500, speed: 2.0, hp: 3 }
};

// Boss stats by tier
const bossStats = {
  1: { hp: 400, fireRate: 1500, speed: 2, patterns: 3, enrageTime: 60000 }, // 40 * 10 = 400 HP, 60s
  2: { hp: 600, fireRate: 1200, speed: 2.5, patterns: 4, enrageTime: 75000 }, // 60 * 10 = 600 HP, 75s
  3: { hp: 800, fireRate: 1000, speed: 3, patterns: 5, enrageTime: 90000 }, // 80 * 10 = 800 HP, 90s
  4: { hp: 1000, fireRate: 800, speed: 3.5, patterns: 5, enrageTime: 120000 } // 100 * 10 = 1000 HP, 120s
};

// Player (horizontal mode)
const player = {
  x: 50, // Fixed position on the left
  y: 0,
  width: 40,
  height: 40,
  lane: 1,
  targetY: 240, // Target position following mouse
  moveSpeed: 0.2,
  trail: []
};

// Tiles (obstacles + coins + powerups) - adapted for horizontal mode
let tiles = [];

// Particle for visual effects
class Particle {
  constructor(x, y, color, velocity) {
    this.x = x; this.y = y;
    this.color = color;
    this.velocity = velocity || { x: Math.random()*2 + 1, y: (Math.random()-0.5)*4 };
    this.life = 1.0; this.decay = 0.02;
    this.size = Math.random()*3 + 2;
  }
  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.life -= this.decay;
    this.size *= 0.98;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

// Generate tiles (vertical columns of enemies)
function generateTiles() {
  while (tiles.length < 30) {
    const lastX = tiles.length ? tiles[tiles.length-1].x : game.width;
    const x = lastX + game.width / 10;
    const lanes = [0,1,2];

    // Obstacles (monsters) - limited by current tier
    const recent = tiles.slice(-3);
    let count = recent.reduce((sum, t) => sum + t.obstacles.length, 0);
    const obstacles = [];
    if (count < 3 && Math.random() < 0.35) {
      const used = recent.flatMap(t => t.obstacles.map(o => o.lane));
      const free = lanes.filter(l => !used.includes(l));
      const lane = free.length
        ? free[Math.floor(Math.random()*free.length)]
        : lanes[Math.floor(Math.random()*lanes.length)];
      
      // Type selection based on current tier
      const availableTypes = [];
      for (let i = 1; i <= Math.min(game.currentTier, 4); i++) {
        availableTypes.push(i);
      }
      
      // Weighting by difficulty (more strong monsters at high tiers)
      let weights;
      if (game.currentTier === 1) weights = [100]; // Only tier 1
      else if (game.currentTier === 2) weights = [70, 30]; // Majority tier 1
      else if (game.currentTier === 3) weights = [50, 30, 20]; // Balanced
      else weights = [30, 25, 25, 20]; // More variety
      
      let r = Math.random() * weights.reduce((a,b)=>a+b,0), type = availableTypes[0];
      for (let i = 0; i < weights.length; i++) {
        if (r < weights[i]) { type = availableTypes[i]; break; }
        r -= weights[i];
      }
      
      let power = null;
      if (Math.random() < 0.2) power = Math.random() < 0.5 ? 'freeze' : 'slow';
      obstacles.push({ 
        lane, 
        type, 
        power, 
        canShoot: false, 
        lastShot: 0,
        hp: enemyStats[type].hp,
        maxHp: enemyStats[type].hp
      });
    }

    // Coin
    let coinLane = null;
    if (Math.random() < 0.2) {
      const used = obstacles.map(o => o.lane);
      const free = lanes.filter(l => !used.includes(l));
      coinLane = free.length
        ? free[Math.floor(Math.random()*free.length)]
        : lanes[Math.floor(Math.random()*lanes.length)];
    }

    // Power-up
    let powerup = null;
    if (Math.random() < 0.1) {
      const used = [...obstacles.map(o=>o.lane), coinLane].filter(x=>x!==null);
      const free = lanes.filter(l => !used.includes(l));
      const lane = free.length
        ? free[Math.floor(Math.random()*free.length)]
        : lanes[Math.floor(Math.random()*lanes.length)];
      powerup = { lane, type: Math.random()<0.5?1:2 };
    }

    tiles.push({ x, obstacles, coinLane, powerup });
  }
}

// Update player & input
function updatePlayer() {
  // Smooth vertical movement following mouse
  const dy = game.mouseY - player.y - player.height/2;
  player.y += dy * player.moveSpeed;
  
  // Keep player within screen bounds
  player.y = Math.max(0, Math.min(game.height - player.height, player.y));
  
  // Calculate current lane based on Y position
  player.lane = Math.floor((player.y + player.height/2) / game.laneHeight);
  player.lane = Math.max(0, Math.min(2, player.lane));
  
  // Trail management
  if (!game.bossActive && !game.bossWarning) {
    player.trail.push({ x: player.x + player.width/2, y: player.y + player.height/2 });
    if (player.trail.length > 8) player.trail.shift();
  } else {
    if (player.trail.length > 0) {
      player.trail.shift();
    }
  }
}

function handleInput() {
  // Optional keyboard controls (for compatibility)
  if (game.keys['ArrowUp']||game.keys['KeyW']) {
    game.mouseY = Math.max(0, game.mouseY - 5);
  }
  if (game.keys['ArrowDown']||game.keys['KeyS']) {
    game.mouseY = Math.min(game.height, game.mouseY + 5);
  }
}

// Auto fire
function handleAutoFire() {
  const now = game.now();
  if (now - game.lastAutoFire >= game.autoFireInterval) {
    game.lastAutoFire = now;
    for (let i = 0; i < game.missilesPerShot; i++) {
      const spread = 8;
      const offset = (i - (game.missilesPerShot-1)/2) * spread;
      shootSingleBeam(1, offset);
    }
  }
}

// Boss spawn
function spawnBoss() {
  // Start with warning
  game.bossWarning = true;
  game.bossWarningTime = 2000; // 2 seconds warning
  
  // Clear all existing content
  tiles = [];
  game.enemyBullets = [];
  game.bullets = [];
  game.particles = [];
  
  // Stop scrolling
  game.speed = 0;
  
  // Cancel any charge in progress
  game.chargeStart = null;
}

function createBoss() {
  const currentBossStats = bossStats[game.currentTier] || bossStats[4];
  const size = 60 * 3;
  
  // Load specific boss image (cycle between 2 available images)
  const bossImageType = ((game.currentTier - 1) % 2) + 1;
  loadBossImage(bossImageType);
  
  game.boss = {
    type: bossImageType,
    tier: game.currentTier,
    hp: currentBossStats.hp,
    maxHp: currentBossStats.hp,
    x: game.width + size, // Start off-screen right
    y: (game.height - size) / 2, // Centered vertically
    targetX: game.width - size - 50, // Final position
    width: size,
    height: size,
    lastShot: 0,
    hitTime: 0,
    moveSpeed: currentBossStats.speed,
    vulnerable: false, // Boss invulnerable at start
    entranceTime: 2000, // 2 seconds entrance
    entranceStart: game.now(),
    attackPattern: 0, // Current attack pattern
    lastPatternChange: 0,
    patternDuration: 3000, // Change pattern every 3 seconds
    moveDirection: 1, // Vertical movement direction
    baseY: (game.height - size) / 2, // Base Y position
    fireRate: currentBossStats.fireRate,
    maxPatterns: currentBossStats.patterns,
    enrageTime: currentBossStats.enrageTime,
    enrageStart: null, // When enrage timer starts
    enraged: false, // Enrage state
    baseFireRate: currentBossStats.fireRate // Save base fire rate
  };
  game.bossActive = true;
  game.bossWarning = false;
}

// Boss fire with varied patterns
function handleBossFire() {
  const now = game.now();
  
  // Change attack pattern periodically (faster for high tiers and when enraged)
  const patternChangeSpeed = game.boss.enraged ? game.boss.patternDuration : Math.max(2000, 4000 - (game.boss.tier * 500));
  if (now - game.boss.lastPatternChange > patternChangeSpeed) {
    game.boss.attackPattern = (game.boss.attackPattern + 1) % game.boss.maxPatterns;
    game.boss.lastPatternChange = now;
    game.boss.lastShot = now; // Reset fire timer
  }
  
  if (now - game.boss.lastShot > game.boss.fireRate) {
    game.boss.lastShot = now;
    const bx = game.boss.x;
    const by = game.boss.y + game.boss.height/2;
    const px = player.x + player.width/2;
    const py = player.y + player.height/2;
    const bulletSpeed = (5 + game.boss.tier) * (game.boss.enraged ? 1.5 : 1); // Faster when enraged
    const enrageMultiplier = game.boss.enraged ? 2 : 1; // Double projectiles when enraged
    
    switch(game.boss.attackPattern) {
      case 0: // Straight line shot (multiple based on tier)
        const lineShots = Math.min(3, game.boss.tier) * enrageMultiplier;
        for (let i = 0; i < lineShots; i++) {
          game.enemyBullets.push({ 
            x: bx, y: by + (i - Math.floor(lineShots/2)) * 20, 
            vx: -bulletSpeed, vy: 0 
          });
        }
        break;
        
      case 1: // Triple fan shot (wider based on tier)
        const spreadCount = (3 + game.boss.tier) * enrageMultiplier;
        for (let i = 0; i < spreadCount; i++) {
          const angle = (i - Math.floor(spreadCount/2)) * 0.3;
          game.enemyBullets.push({ 
            x: bx, y: by, 
            vx: -bulletSpeed * Math.cos(angle), 
            vy: bulletSpeed * Math.sin(angle)
          });
        }
        break;
        
      case 2: // Aimed shot at player (multiple based on tier)
        const dx = px - bx;
        const dy = py - by;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          const homingShots = game.boss.tier * enrageMultiplier;
          for (let i = 0; i < homingShots; i++) {
            const spread = (i - Math.floor(homingShots/2)) * 0.2;
            game.enemyBullets.push({ 
              x: bx, y: by, 
              vx: (dx/dist + spread) * bulletSpeed, 
              vy: (dy/dist + spread) * bulletSpeed 
            });
          }
        }
        break;
        
      case 3: // Intensified vertical barrage
        if (game.boss.tier >= 2) {
          const barrageCount = (3 + game.boss.tier * 2) * enrageMultiplier;
          for (let i = 0; i < barrageCount; i++) {
            game.enemyBullets.push({ 
              x: bx, 
              y: 30 + i * (game.height - 60) / (barrageCount - 1), 
              vx: -bulletSpeed, vy: 0 
            });
          }
        }
        break;
        
      case 4: // Multiple spiral shots
        if (game.boss.tier >= 3) {
          const spiralCount = game.boss.tier * enrageMultiplier;
          for (let j = 0; j < spiralCount; j++) {
            for (let i = 0; i < 4; i++) {
              const angle = (now * 0.008 + i * Math.PI * 2 / 4 + j * Math.PI / spiralCount) % (Math.PI * 2);
              game.enemyBullets.push({ 
                x: bx, y: by, 
                vx: -3 + Math.cos(angle) * (2 + game.boss.tier), 
                vy: Math.sin(angle) * (2 + game.boss.tier)
              });
            }
          }
        }
        break;
    }
  }
}

// Collision and collection handling
function checkObstacleCollision() {
  const cx = player.x + player.width/2, cy = player.y + player.height/2;
  for (let tile of tiles) {
    if (tile.x > cx-50 && tile.x < cx+50) {
      for (let i=0;i<tile.obstacles.length;i++) {
        const obs = tile.obstacles[i];
        const ox = tile.x + 20;
        const oy = obs.lane*game.laneHeight + (game.laneHeight-60)/2;
        if (cx>ox && cx<ox+60 && cy>oy && cy<oy+60) {
          game.flashTime = 20;
          tile.obstacles.splice(i,1);
          return true;
        }
      }
    }
  }
  return false;
}

function checkEnemyBulletCollision() {
  const cx = player.x + player.width/2, cy = player.y + player.height/2;
  for (let i=game.enemyBullets.length-1;i>=0;i--) {
    const b = game.enemyBullets[i];
    if (Math.hypot(b.x-cx, b.y-cy) < 25) {
      game.enemyBullets.splice(i,1);
      game.flashTime = 20;
      return true;
    }
  }
  return false;
}

function checkCoinCollection() {
  const cx = player.x + player.width/2;
  tiles.forEach(tile => {
    if (tile.coinLane!==null && tile.x>cx-50 && tile.x<cx+50) {
      if (tile.coinLane === player.lane) {
        game.coins++;
        for (let i=0;i<10;i++) game.particles.push(new Particle(player.x+player.width/2, player.y+player.height/2, '#FFD700'));
        tile.coinLane = null;
      }
    }
  });
}

function checkPowerupCollection() {
  const cx = player.x + player.width/2;
  tiles.forEach(tile => {
    if (tile.powerup && tile.x>cx-50 && tile.x<cx+50 && tile.powerup.lane === player.lane) {
      if (tile.powerup.type===1) {
        // Bonus: increase fire rate
        game.autoFireInterval = Math.max(100, game.autoFireInterval - 50);
        game.missilesPerShot++;
      } else {
        // Malus: decrease fire rate
        game.autoFireInterval = Math.min(600, game.autoFireInterval + 100);
        game.missilesPerShot = Math.max(1, game.missilesPerShot-1);
      }
      for (let i=0;i<12;i++) game.particles.push(new Particle(player.x+player.width/2, player.y+player.height/2, tile.powerup.type===1?'#00FF00':'#FF0000'));
      tile.powerup = null;
    }
  });
}

// Player shooting
function shootSingleBeam(level, offsetY) {
  const cx = player.x + player.width;
  const cy = player.y + player.height/2 + offsetY;
  const w = 4 + level*4, speed = 10 + level*2;
  game.bullets.push({ x:cx, y:cy, width:w, speed, level });
}

// Main update loop
function update() {
  if (game.gameOver) {
    // Update particles even in game over
    game.particles.forEach(p=>p.update());
    game.particles = game.particles.filter(p=>p.life>0);
    return;
  }
  
  if (!game.gameRunning) return;
  handleInput();
  updatePlayer();
  
  // Continuous auto fire (disabled during boss entrance)
  if (!game.bossWarning && !(game.bossActive && !game.boss.vulnerable)) {
    handleAutoFire();
  }

  // Boss warning handling
  if (game.bossWarning) {
    game.bossWarningTime -= 16; // Approximation of 60fps
    if (game.bossWarningTime <= 0) {
      createBoss();
    }
    return;
  }

  if (game.bossActive) {
    // Boss entrance phase handling
    const now = game.now();
    const elapsedTime = now - game.boss.entranceStart;
    
    if (!game.boss.vulnerable && elapsedTime >= game.boss.entranceTime) {
      game.boss.vulnerable = true; // Boss becomes vulnerable after 2 seconds
      game.boss.lastPatternChange = now; // Start first pattern
      game.boss.enrageStart = now; // Start enrage timer
    }
    
    // Enrage system handling
    if (game.boss.vulnerable && !game.boss.enraged) {
      const enrageElapsed = now - game.boss.enrageStart;
      if (enrageElapsed >= game.boss.enrageTime) {
        // ENRAGE MODE ACTIVATED!
        game.boss.enraged = true;
        game.boss.fireRate = Math.floor(game.boss.baseFireRate * 0.3); // 3x faster
        game.boss.moveSpeed *= 2; // 2x faster
        game.boss.patternDuration = 1500; // Change pattern faster
        
        // Enrage visual effect
        for (let i = 0; i < 30; i++) {
          game.particles.push(new Particle(
            game.boss.x + Math.random() * game.boss.width,
            game.boss.y + Math.random() * game.boss.height,
            '#FF0000',
            { x: (Math.random()-0.5)*6, y: (Math.random()-0.5)*6 }
          ));
        }
      }
    }
    
    // Boss movement to position
    if (game.boss.x > game.boss.targetX) {
      game.boss.x -= game.boss.moveSpeed;
    }
    
    // Boss vertical movement once in position (more aggressive by tier and when enraged)
    if (game.boss.vulnerable && game.boss.x <= game.boss.targetX) {
      const moveSpeed = (1 + (game.boss.tier * 0.5)) * (game.boss.enraged ? 2 : 1);
      game.boss.y += game.boss.moveDirection * moveSpeed;
      if (game.boss.y <= 0 || game.boss.y >= game.height - game.boss.height) {
        game.boss.moveDirection *= -1;
      }
      
      // Occasional horizontal movement for high tiers (more frequent when enraged)
      const horizontalChance = game.boss.enraged ? 0.03 : 0.01;
      if (game.boss.tier >= 3 && Math.random() < horizontalChance) {
        game.boss.targetX += (Math.random() - 0.5) * 100;
        game.boss.targetX = Math.max(game.width - game.boss.width - 100, 
                                   Math.min(game.width - game.boss.width - 20, game.boss.targetX));
      }
    }
    
    // Boss only fires if vulnerable
    if (game.boss.vulnerable) {
      handleBossFire();
    }
    
    // Player bullets vs boss (only if vulnerable) - SECURE SCORING
    game.bullets = game.bullets.filter(b => {
      b.x += b.speed;
      if (b.x > game.width + 50) return false;
      if (game.boss.vulnerable && 
          b.x > game.boss.x && b.x < game.boss.x + game.boss.width &&
          b.y > game.boss.y && b.y < game.boss.y + game.boss.height) {
        game.boss.hp--;
        game.boss.hitTime = 10;
        updateScore(50); // SECURE: Use updateScore instead of direct assignment
        for (let i=0;i<15;i++) game.particles.push(new Particle(b.x, b.y, '#FF4500'));
        return false;
      }
      return true;
    });
    
    if (game.boss.hitTime > 0) game.boss.hitTime--;
    
    // Check if boss is defeated - SECURE SCORING
    if (game.boss.hp <= 0) {
      game.bossActive = false;
      game.bossesDefeated++;
      game.currentTier = Math.min(4, Math.floor(game.bossesDefeated / 1) + 1); // New tier after each boss
      game.boss = null;
      game.distanceSinceBoss = 0;
      game.speed = game.baseSpeed;
      updateScore(5000 * game.currentTier); // SECURE: Much more points to reward effort
      
      // Massive victory effect
      for (let i = 0; i < 100; i++) {
        game.particles.push(new Particle(
          game.width/2 + (Math.random()-0.5)*300, 
          game.height/2 + (Math.random()-0.5)*300, 
          ['#FFD700', '#FF6B35', '#F7931E', '#00FF00'][Math.floor(Math.random()*4)]
        ));
      }
    }
    
    // Update enemy bullets
    game.enemyBullets = game.enemyBullets.filter(b=>{
      b.x += b.vx; b.y += b.vy;
      return b.x > -50 && b.x < game.width+50 && b.y >= -50 && b.y <= game.height+50;
    });
    
    // Check collision with enemy bullets
    if (checkEnemyBulletCollision()) {
      game.lives--;
      if (game.lives <= 0) return gameOver();
    }
    
    game.particles.forEach(p=>p.update());
    game.particles = game.particles.filter(p=>p.life>0);
    if (game.flashTime > 0) game.flashTime--;
    return;
  }

  // Normal game (non-boss) - horizontal scrolling
  game.bgX += game.speed;
  if (game.bgX >= game.width) game.bgX = 0;

  // Distance and boss spawn
  game.distance += game.speed;
  game.distanceSinceBoss += game.speed;
  if (game.distanceSinceBoss >= game.bossThreshold) {
    spawnBoss();
    return;
  }

  // Monster powers
  const cx0 = player.x + player.width/2, cy0 = player.y + player.height/2;
  tiles.forEach(tile => {
    if (tile.x > cx0-60 && tile.x < cx0+60) {
      tile.obstacles.forEach(obs => {
        if (obs.power && obs.lane === player.lane) {
          game.speed = obs.power==='freeze' ? game.baseSpeed : Math.max(game.baseSpeed, game.speed-1);
          for (let i=0;i<12;i++) game.particles.push(new Particle(cx0,cy0, obs.power==='freeze'? '#00FFFF':'#FFA500'));
          obs.power = null;
        }
      });
    }
  });

  // Monster shooting
  const now = game.now();
  tiles.forEach(tile=> tile.obstacles.forEach(obs=>{
    const tx = tile.x + 20;
    if (!obs.canShoot && tx>0 && tx<game.width) {
      obs.canShoot = true;
      obs.lastShot = now - enemyStats[obs.type].fireRate;
    }
    if (obs.canShoot && now - obs.lastShot >= enemyStats[obs.type].fireRate) {
      obs.lastShot = now;
      const ex = tx;
      const ey = obs.lane*game.laneHeight + game.laneHeight/2;
      const dx0 = (player.x+player.width/2)-ex;
      const dy0 = (player.y+player.height/2)-ey;
      const dist = Math.hypot(dx0,dy0);
      if (dist>5) {
        const s = 4 * enemyStats[obs.type].speed; // Speed based on tier
        game.enemyBullets.push({ x:ex, y:ey, vx:dx0/dist*s, vy:dy0/dist*s });
      }
    }
  }));

  // Scroll tiles (to the left)
  tiles.forEach(t=>t.x-=game.speed);
  tiles = tiles.filter(t=>t.x>-200);
  generateTiles();

  if (game.speed<game.maxSpeed) game.speed+=game.speedIncrement;
  updateScore(Math.floor(game.speed)); // SECURE: Use updateScore for continuous scoring

  if (checkObstacleCollision()) {
    game.lives--;
    if (game.lives<=0) return gameOver();
    game.speed = game.baseSpeed;
  }
  if (checkEnemyBulletCollision()) {
    game.lives--;
    if (game.lives<=0) return gameOver();
  }
  checkCoinCollection();
  checkPowerupCollection();

  // Update player bullets vs obstacles - SECURE SCORING
  game.bullets = game.bullets.filter(b=>{
    b.x += b.speed;
    if (b.x > game.width + 50) return false;
    tiles.forEach(tile=>{
      tile.obstacles = tile.obstacles.filter(obs=>{
        const ox = tile.x + 20;
        const oy = obs.lane*game.laneHeight + (game.laneHeight-60)/2;
        const by = b.y - b.width/2;
        if (b.x>ox && b.x<ox+60 && by<oy+60 && by+b.width>oy) {
          obs.hp--; // Decrease HP
          if (obs.hp <= 0) {
            // Monster destroyed - SECURE SCORING
            updateScore(15 * obs.type); // SECURE: More points for high tier monsters
            for (let i=0;i<10;i++) game.particles.push(new Particle(b.x,b.y,'#FF4500'));
            return false;
          } else {
            // Monster hit but not destroyed
            for (let i=0;i<5;i++) game.particles.push(new Particle(b.x,b.y,'#FFAA00'));
          }
        }
        return true;
      });
    });
    return true;
  });

  // Update enemy bullets
  game.enemyBullets = game.enemyBullets.filter(b=>{
    b.x += b.vx; b.y += b.vy;
    return b.x>-50 && b.x<game.width+50 && b.y>=0 && b.y<=game.height;
  });

  // Update particles
  game.particles.forEach(p=>p.update());
  game.particles = game.particles.filter(p=>p.life>0);

  if (game.flashTime>0) game.flashTime--;
}

// Main drawing function
function draw() {
  const ctx = game.ctx;
  
  // Always clear canvas
  ctx.clearRect(0, 0, game.width, game.height);

  // Game Over screen
  if (game.gameOver) {
    // Dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, game.width, game.height);
    
    // End particles
    game.particles.forEach(p => p.draw(ctx));
    
    // GAME OVER title
    ctx.fillStyle = '#FF0000';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    const gameOverText = 'GAME OVER';
    const centerX = game.width / 2;
    const centerY = game.height / 2 - 80;
    ctx.strokeText(gameOverText, centerX, centerY);
    ctx.fillText(gameOverText, centerX, centerY);
    
    // Final score - SECURE DISPLAY
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.font = 'bold 48px Arial';
    ctx.strokeText(`Final Score: ${game.score}`, centerX, centerY + 70);
    ctx.fillText(`Final Score: ${game.score}`, centerX, centerY + 70);
    
    // Coins collected
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`Coins Collected: ${game.coins}`, centerX, centerY + 120);
    
    // Restart instructions
    ctx.fillStyle = '#AAAAAA';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Press SPACE to restart', centerX, centerY + 170);
    
    return;
  }

  // Horizontal background
  if (!game.bossActive && !game.bossWarning) {
    ctx.drawImage(backgroundImage, game.bgX - game.width, 0, game.width, game.height);
    ctx.drawImage(backgroundImage, game.bgX, 0, game.width, game.height);
  } else {
    // Static background during boss phase
    ctx.drawImage(backgroundImage, 0, 0, game.width, game.height);
  }

  // Boss warning
  if (game.bossWarning) {
    // Pulsing effect
    const alpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
    ctx.save();
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
    ctx.fillRect(0, 0, game.width, game.height);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    const text = 'BOSS WARNING!';
    const x = game.width / 2;
    const y = game.height / 2;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
    
    // Still draw player
    ctx.drawImage(characterImage, player.x, player.y, player.width, player.height);
    return;
  }

  if (game.bossActive) {
    // Player
    ctx.drawImage(characterImage, player.x, player.y, player.width, player.height);
    
    // Player bullets
    game.bullets.forEach(b=>{
      const bw=b.level*8+16, bx=b.x, by=b.y-b.width/2;
      ctx.save();
      ctx.globalAlpha=0.7+0.3*(b.level/3);
      ctx.shadowColor='cyan'; ctx.shadowBlur=10+b.level*5;
      ctx.fillStyle=`hsla(180,100%,80%,${0.6+0.2*(b.level/3)})`;
      ctx.fillRect(bx,by,bw,b.width);
      ctx.restore(); ctx.shadowBlur=0;
    });
    
    // Boss - with enrage effect
    const imageToUse = bossImage || bossImages[game.boss.type-1] || enemyImages[0];
    
    // Enrage effect - pulsing red outline
    if (game.boss.enraged) {
      ctx.save();
      const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.02);
      ctx.strokeStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(game.boss.x - 4, game.boss.y - 4, game.boss.width + 8, game.boss.height + 8);
      ctx.restore();
    }
    
    ctx.drawImage(imageToUse, game.boss.x, game.boss.y, game.boss.width, game.boss.height);
    
    // Boss hit effect - red outline instead of white highlight
    if (game.boss.hitTime > 0) {
      ctx.save();
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 4;
      ctx.strokeRect(game.boss.x, game.boss.y, game.boss.width, game.boss.height);
      ctx.restore();
    }
    
    // Vulnerability indicator - ONLY during invulnerability phase
    if (!game.boss.vulnerable) {
      ctx.save();
      ctx.fillStyle = 'rgba(100, 100, 255, 0.3)';
      ctx.fillRect(game.boss.x, game.boss.y, game.boss.width, game.boss.height);
      
      // Blue outline to indicate invulnerability
      ctx.strokeStyle = '#4444FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(game.boss.x, game.boss.y, game.boss.width, game.boss.height);
      ctx.restore();
    }
    
    // Boss health bar (visible only when vulnerable)
    if (game.boss.vulnerable) {
      const barW = game.width * 0.6, barX = (game.width - barW) / 2, barY = 10;
      ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3;
      ctx.strokeRect(barX, barY, barW, 15);
      
      // Bar background
      ctx.fillStyle = '#333';
      ctx.fillRect(barX + 1, barY + 1, barW - 2, 13);
      
      // Health bar
      const ratio = Math.max(game.boss.hp, 0) / game.boss.maxHp;
      const healthColor = ratio > 0.5 ? '#0F0' : ratio > 0.25 ? '#FF0' : '#F00';
      ctx.fillStyle = healthColor;
      ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, 13);
      
      // HP text
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${game.boss.hp}/${game.boss.maxHp}`, game.width/2, barY + 12);
      
      // Current attack pattern display
      const patterns = ['Linear Shot', 'Triple Spread', 'Homing Shot', 'Vertical Barrage', 'Spiral Attack'];
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Attack: ${patterns[game.boss.attackPattern]}`, game.width/2, barY + 35);
      
      // Enrage timer
      if (!game.boss.enraged) {
        const now = game.now();
        const enrageElapsed = now - game.boss.enrageStart;
        const remaining = Math.max(0, (game.boss.enrageTime - enrageElapsed) / 1000);
        
        // Enrage timer bar
        const timerBarW = game.width * 0.4;
        const timerBarX = (game.width - timerBarW) / 2;
        const timerBarY = 55; // Just below health bar
        
        // Bar background
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(timerBarX, timerBarY, timerBarW, 12);
        
        ctx.fillStyle = '#222';
        ctx.fillRect(timerBarX + 1, timerBarY + 1, timerBarW - 2, 10);
        
        // Progress bar (red filling up)
        const timerRatio = Math.min(enrageElapsed / game.boss.enrageTime, 1);
        const timerColor = timerRatio > 0.8 ? '#FF0000' : timerRatio > 0.5 ? '#FF8800' : '#FFAA00';
        ctx.fillStyle = timerColor;
        ctx.fillRect(timerBarX + 1, timerBarY + 1, (timerBarW - 2) * timerRatio, 10);
        
        // Timer text
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`ENRAGE in ${remaining.toFixed(1)}s`, game.width/2, timerBarY + 10);
      } else {
        // ENRAGED display
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        const enrageAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
        ctx.save();
        ctx.globalAlpha = enrageAlpha;
        ctx.fillText('⚡ ENRAGED ⚡', game.width/2, 65);
        ctx.restore();
      }
    } else {
      // Display time remaining before vulnerability
      const now = game.now();
      const elapsedTime = now - game.boss.entranceStart;
      const remaining = Math.max(0, (game.boss.entranceTime - elapsedTime) / 1000);
      
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Boss arrives in ${remaining.toFixed(1)}s`, game.width/2, 50);
    }
    
    // Lives display during boss
    const maxLives = 3;
    const lifeSize = 30;
    for (let i = 0; i < maxLives; i++) {
      const x = game.width - 10 - i * (lifeSize + 5);
      const y = 50; // Lower to avoid boss health bar
      if (i < game.lives) {
        // Full heart
        ctx.drawImage(lifeFullImage, x - lifeSize, y, lifeSize, lifeSize);
      } else {
        // Empty heart
        ctx.drawImage(lifeEmptyImage, x - lifeSize, y, lifeSize, lifeSize);
      }
    }
    
    // Score during boss - SECURE DISPLAY
    ctx.fillStyle='#FFF'; ctx.font='bold 20px Arial'; ctx.textAlign='left';
    ctx.fillText(`Score: ${game.score}`,10,30);
    ctx.fillText(`Coins: ${game.coins}`,10,55);
    ctx.fillText(`Missiles/shot: ${game.missilesPerShot}`,10,80);
    
    // Enemy bullets
    ctx.fillStyle = '#FF4444'; ctx.strokeStyle = '#FF0000'; ctx.lineWidth = 2;
    game.enemyBullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    });
    
    // Particles
    game.particles.forEach(p => p.draw(ctx));
    
    // Flash effect
    if (game.flashTime > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.restore();
    }
    return;
  }

  // Normal game - horizontal lanes
  ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.setLineDash([10,10]);
  ctx.lineDashOffset=-game.score*0.5;
  for (let i=1;i<3;i++){
    const y=i*game.laneHeight;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(game.width,y); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Draw tiles
  tiles.forEach(tile=>{
    if (tile.x>-100 && tile.x<game.width+100) {
      tile.obstacles.forEach(obs=>{
        const x=tile.x+20;
        const y=obs.lane*game.laneHeight+(game.laneHeight-60)/2;
        ctx.drawImage(enemyImages[obs.type-1],x,y,60,60);
      });
      if (tile.coinLane!==null) {
        const cx=tile.x+30;
        const cy=tile.coinLane*game.laneHeight+(game.laneHeight-40)/2;
        ctx.drawImage(collectableImage,cx,cy,40,40);
      }
      if (tile.powerup) {
        const px=tile.x+30;
        const py=tile.powerup.lane*game.laneHeight+(game.laneHeight-40)/2;
        const img=tile.powerup.type===1?powerupBonusImage:powerupMalusImage;
        ctx.drawImage(img,px,py,40,40);
      }
    }
  });

  // Player glow & trail
  let glowR=30;
  if (game.chargeStart) {
    const ratio=Math.min((performance.now()-game.chargeStart)/game.maxChargeTime,1);
    glowR+=ratio*20;
  }
  const pcx=player.x+player.width/2, pcy=player.y+player.height/2;
  const grad=ctx.createRadialGradient(pcx,pcy,0,pcx,pcy,glowR);
  grad.addColorStop(0,'rgba(255,215,0,0.8)');
  grad.addColorStop(1,'rgba(255,215,0,0)');
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.arc(pcx,pcy,glowR,0,Math.PI*2); ctx.fill();

  ctx.strokeStyle='rgba(255,215,0,0.6)'; ctx.lineWidth=3;
  ctx.beginPath();
  player.trail.forEach((pt,i)=>{
    ctx.globalAlpha=(i/player.trail.length)*0.6;
    if (i===0) ctx.moveTo(pt.x,pt.y);
    else ctx.lineTo(pt.x,pt.y);
  });
  ctx.stroke(); ctx.globalAlpha=1;

  // Player
  ctx.drawImage(characterImage,player.x,player.y,player.width,player.height);

  // Player bullets (horizontal)
  game.bullets.forEach(b=>{
    const bw=b.level*8+16, bx=b.x, by=b.y-b.width/2;
    ctx.save();
    ctx.globalAlpha=0.7+0.3*(b.level/3);
    ctx.shadowColor='cyan'; ctx.shadowBlur=10+b.level*5;
    ctx.fillStyle=`hsla(180,100%,80%,${0.6+0.2*(b.level/3)})`;
    ctx.fillRect(bx,by,bw,b.width);
    ctx.restore(); ctx.shadowBlur=0;
  });

  // Enemy bullets
  ctx.fillStyle='#FF4444'; ctx.strokeStyle='#FF0000'; ctx.lineWidth=2;
  game.enemyBullets.forEach(b=>{
    ctx.beginPath();
    ctx.arc(b.x,b.y,5,0,Math.PI*2);
    ctx.fill(); ctx.stroke();
  });

  // Particles
  game.particles.forEach(p=>p.draw(ctx));

  // Simplified UI - SECURE DISPLAY
  ctx.fillStyle='#FFF'; ctx.font='bold 20px Arial'; ctx.textAlign='left';
  ctx.fillText(`Score: ${game.score}`,10,30);
  ctx.fillText(`Coins: ${game.coins}`,10,55);
  ctx.fillText(`Missiles/shot: ${game.missilesPerShot}`,10,80);
  ctx.fillText(`Tier: ${game.currentTier} (Boss defeated: ${game.bossesDefeated})`,10,105);
  
  // Lives display with sprites
  ctx.font='24px Arial'; ctx.textAlign='right';
  const maxLives = 3;
  const lifeSize = 30;
  for (let i = 0; i < maxLives; i++) {
    const x = game.width - 10 - i * (lifeSize + 5);
    const y = 5;
    if (i < game.lives) {
      // Full heart
      ctx.drawImage(lifeFullImage, x - lifeSize, y, lifeSize, lifeSize);
    } else {
      // Empty heart
      ctx.drawImage(lifeEmptyImage, x - lifeSize, y, lifeSize, lifeSize);
    }
  }

  // Boss progress bar
  const pbW=game.width*0.4, pbX=(game.width-pbW)/2, pbY=game.height-20;
  ctx.strokeStyle='#FFF'; ctx.lineWidth=2;
  ctx.strokeRect(pbX,pbY,pbW,8);
  const prog=Math.min(game.distanceSinceBoss/game.bossThreshold,1);
  ctx.fillStyle='#0F0';
  ctx.fillRect(pbX,pbY,pbW*prog,8);

  // Mouse position indicator
  ctx.fillStyle='rgba(255,255,255,0.3)';
  ctx.fillRect(0, game.mouseY-2, 10, 4);

  // Flash effect
  if (game.flashTime>0) {
    ctx.save();
    ctx.fillStyle='rgba(255,0,0,0.5)';
    ctx.fillRect(0,0,game.width,game.height);
    ctx.restore();
  }
}

// Game over - SECURE VERSION
function gameOver() {
  console.log("Game Over triggered!"); 
  console.log("Final Score:", game.score); // Debug to verify score
  console.log("Final Coins:", game.coins); // Debug to verify coins
  
  game.gameRunning = false;
  game.gameOver = true;
  
  // Stop all movement
  game.speed = 0;
  game.bullets = [];
  game.enemyBullets = [];
  
  // Clear particles and add game over particles
  game.particles = [];
  
  // End particles effect
  for (let i = 0; i < 50; i++) {
    game.particles.push(new Particle(
      Math.random() * game.width,
      Math.random() * game.height,
      '#FF0000',
      { x: (Math.random()-0.5)*3, y: (Math.random()-0.5)*3 }
    ));
  }
  
  // SECURE: Use secure game over handling
  if (onSecureGameOver) {
    const result = onSecureGameOver();
    if (result && result.success) {
      console.log('✓ Score securely submitted:', result.score);
      // Call external leaderboard function with validated score
      if (typeof onGameOver === 'function') {
        onGameOver(result.score);
      }
    } else {
      console.warn('⚠ Score validation failed, not submitted to leaderboard');
      console.warn('Error:', result ? result.error : 'No result');
    }
  } else {
    // Fallback for basic mode
    if (typeof onGameOver === 'function') {
      onGameOver(game.score);
    }
  }
}

// Main game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Initialization - SECURE VERSION
function init() {
  game.canvas = document.getElementById('gameCanvas');
  game.ctx = game.canvas.getContext('2d');
  game.width = game.canvas.width;
  game.height = game.canvas.height;
  game.laneHeight = game.height / 3;
  player.y = game.height / 2 - player.height / 2;
  game.mouseY = game.height / 2;

  // Initialize security system
  initSecurity();

  // Mouse handling
  game.canvas.addEventListener('mousemove', e => {
    const rect = game.canvas.getBoundingClientRect();
    const scaleY = game.canvas.height / rect.height;
    game.mouseY = (e.clientY - rect.top) * scaleY;
  });

  const pressedKeys = new Map(); // track timers

  window.addEventListener('message', (event) => {
    const { type, dir, action } = event.data || {};
    if (type === 'MOVE' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(dir)) {
      if (action === 'start') {
        game.keys[dir] = true;

        // Clear any existing timeout
        if (pressedKeys.has(dir)) clearTimeout(pressedKeys.get(dir));

        // Auto-release after 150ms
        const timeout = setTimeout(() => {
          game.keys[dir] = false;
          pressedKeys.delete(dir);
        }, 150);
        pressedKeys.set(dir, timeout);
      }

      if (action === 'end') {
        game.keys[dir] = false;
        if (pressedKeys.has(dir)) {
          clearTimeout(pressedKeys.get(dir));
          pressedKeys.delete(dir);
        }
      }
    }
  });

  // Keyboard handling (optional)
  document.addEventListener('keydown', e => {
    if (e.code==='Space') {
      e.preventDefault();
      if (game.gameOver || !game.gameRunning) {
        restart();
      }
    } else {
      game.keys[e.code] = true;
    }
  });
  
  document.addEventListener('click', () => {
    if (game.gameOver || !game.gameRunning) {
      restart();
    }
  });

  document.addEventListener('touchstart', () => {
    if (game.gameOver || !game.gameRunning) {
      restart();
    }
  });
  
  document.addEventListener('keyup', e => {
    game.keys[e.code] = false;
  });

  // Touch handling
  let touchY = 0;
  game.canvas.addEventListener('touchstart', e=>{
    e.preventDefault();
    touchY = e.touches[0].clientY;
    const rect = game.canvas.getBoundingClientRect();
    game.mouseY = touchY - rect.top;
  });
  
  game.canvas.addEventListener('touchmove', e=>{
    e.preventDefault();
    const rect = game.canvas.getBoundingClientRect();
    game.mouseY = e.touches[0].clientY - rect.top;
  });
  
  game.canvas.addEventListener('touchend', e=>{
    e.preventDefault();
  });

  // Prevent context menu on canvas
  game.canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
  });

  generateTiles();
  restart();
  gameLoop();
}

// Check if security system is loaded, otherwise show warning
function checkSecuritySystem() {
  if (!window.GameSecurity) {
    console.warn('⚠ SECURITY WARNING: game-security.js not loaded!');
    console.warn('⚠ Game is running in UNSECURED mode');
    console.warn('⚠ Scores can be easily manipulated');
    console.warn('⚠ Load game-security.js before this script');
  } else {
    console.log('✓ Security system detected and loaded');
  }
}

// Start the game
if (document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkSecuritySystem();
    init();
  });
} else {
  checkSecuritySystem();
  init();
}

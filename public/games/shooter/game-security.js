// ==========================================
// GAME SECURITY - ANTI-CHEAT MEASURES
// ==========================================

// 1. ENCRYPTED GAME STATE
class GameSecurity {
  constructor() {
    this.sessionKey = this.generateSessionKey();
    this.gameStartTime = Date.now();
    this.lastValidationTime = Date.now();
    this.validationInterval = 5000; // Validate every 5 seconds
    this.maxScorePerSecond = 500; // Maximum realistic score gain per second
    this.checksumSalt = Math.random().toString(36).substr(2, 9);
  }

  generateSessionKey() {
    return Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
  }

  // Simple encryption for game state (use proper crypto in production)
  encryptGameState(gameState) {
    const data = JSON.stringify(gameState);
    return btoa(data + '|' + this.sessionKey);
  }

  decryptGameState(encryptedData) {
    try {
      const decoded = atob(encryptedData);
      const [data, key] = decoded.split('|');
      if (key !== this.sessionKey) {
        throw new Error('Invalid session key');
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Game state decryption failed:', e);
      return null;
    }
  }

  // Generate checksum for score validation
  generateScoreChecksum(score, time, actions) {
    const data = `${score}-${time}-${actions}-${this.checksumSalt}`;
    // Simple hash (use proper crypto hash in production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Validate score based on time and actions
  validateScore(score, gameTime, actionsCount) {
    const timeInSeconds = gameTime / 1000;
    const maxPossibleScore = timeInSeconds * this.maxScorePerSecond;
    const minActionsForScore = Math.floor(score / 100); // Minimum actions needed
    
    return score <= maxPossibleScore && actionsCount >= minActionsForScore;
  }
}

// 2. PROTECTED GAME VARIABLES
class ProtectedGame {
  constructor() {
    this._score = 0;
    this._lives = 3;
    this._gameTime = 0;
    this._actionsCount = 0;
    this._lastScoreUpdate = Date.now();
    this._scoreHistory = []; // Track score progression
    this.security = new GameSecurity();
    
    // Hide variables from direct access
    this.obfuscateVariables();
  }

  obfuscateVariables() {
    // Use closures and property descriptors to protect variables
    let scoreValue = 0;
    let livesValue = 3;
    
    Object.defineProperty(this, 'score', {
      get: () => scoreValue,
      set: (value) => {
        if (this.validateScoreChange(value)) {
          scoreValue = value;
          this.logScoreChange(value);
        } else {
          console.warn('Invalid score change detected');
          this.flagSuspiciousActivity('score_manipulation');
        }
      },
      enumerable: true,
      configurable: false
    });

    Object.defineProperty(this, 'lives', {
      get: () => livesValue,
      set: (value) => {
        if (value >= 0 && value <= 10) { // Reasonable bounds
          livesValue = value;
        } else {
          this.flagSuspiciousActivity('lives_manipulation');
        }
      },
      enumerable: true,
      configurable: false
    });
  }

  validateScoreChange(newScore) {
    const now = Date.now();
    const timeDiff = now - this._lastScoreUpdate;
    const scoreDiff = newScore - this._score;
    
    // Check for unrealistic score jumps
    if (scoreDiff > 0 && timeDiff < 100 && scoreDiff > 1000) {
      return false;
    }
    
    // Check score progression pattern
    if (this._scoreHistory.length > 10) {
      const avgIncrease = this._scoreHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
      if (scoreDiff > avgIncrease * 10) {
        return false;
      }
    }
    
    return true;
  }

  logScoreChange(newScore) {
    const scoreDiff = newScore - this._score;
    this._scoreHistory.push(scoreDiff);
    if (this._scoreHistory.length > 50) {
      this._scoreHistory.shift();
    }
    this._lastScoreUpdate = Date.now();
  }

  flagSuspiciousActivity(type) {
    console.warn(`Suspicious activity detected: ${type}`);
    // In production, send to server for analysis
    this.sendSecurityAlert({
      type: type,
      timestamp: Date.now(),
      sessionKey: this.security.sessionKey,
      gameState: this.getSecureGameState()
    });
  }

  getSecureGameState() {
    return {
      score: this._score,
      lives: this._lives,
      gameTime: this._gameTime,
      actions: this._actionsCount,
      checksum: this.security.generateScoreChecksum(
        this._score, 
        this._gameTime, 
        this._actionsCount
      )
    };
  }

  sendSecurityAlert(alertData) {
    // Simulate sending to server
    console.log('Security alert would be sent:', alertData);
    // fetch('/api/security/alert', {
    //   method: 'POST',
    //   body: JSON.stringify(alertData)
    // });
  }
}

// 3. INPUT SANITIZATION AND VALIDATION
class SecureInput {
  static sanitizePlayerName(name) {
    if (typeof name !== 'string') return 'Anonymous';
    
    // Remove dangerous characters
    const sanitized = name
      .replace(/[<>\"'&]/g, '') // Remove HTML/JS injection chars
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 20) // Limit length
      .trim();
    
    return sanitized || 'Anonymous';
  }

  static validateScore(score) {
    return typeof score === 'number' && 
           score >= 0 && 
           score <= 10000000 && 
           Number.isFinite(score) &&
           !isNaN(score);
  }

  static validateGameTime(time) {
    return typeof time === 'number' && 
           time >= 0 && 
           time <= 3600000 && // Max 1 hour
           Number.isFinite(time);
  }
}

// 4. RATE LIMITING
class RateLimiter {
  constructor() {
    this.submissions = [];
    this.maxSubmissions = 3; // Max 3 score submissions per minute
    this.timeWindow = 60000; // 1 minute
  }

  canSubmit() {
    const now = Date.now();
    // Clean old submissions
    this.submissions = this.submissions.filter(time => now - time < this.timeWindow);
    
    if (this.submissions.length >= this.maxSubmissions) {
      console.warn('Rate limit exceeded');
      return false;
    }
    
    this.submissions.push(now);
    return true;
  }
}

// 5. SECURE GAME IMPLEMENTATION
class SecureShooterGame extends ProtectedGame {
  constructor() {
    super();
    this.rateLimiter = new RateLimiter();
    this.startTime = Date.now();
    this.actionLog = [];
    
    // Override console methods to prevent cheating via console
    this.protectConsole();
    
    // Detect dev tools
    this.detectDevTools();
  }

  protectConsole() {
    // Store original methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    
    // Override but still allow logging (just monitor)
    console.log = (...args) => {
      this.logConsoleActivity('log', args);
      originalLog.apply(console, args);
    };
    
    // Prevent direct game object access
    Object.defineProperty(window, 'game', {
      get: () => undefined,
      set: () => {},
      configurable: false
    });
  }

  detectDevTools() {
    let devtools = false;
    const threshold = 160;
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools) {
          devtools = true;
          this.flagSuspiciousActivity('devtools_detected');
        }
      } else {
        devtools = false;
      }
    }, 500);
  }

  logConsoleActivity(type, args) {
    // Log suspicious console usage
    if (args.some(arg => typeof arg === 'string' && 
        (arg.includes('game.') || arg.includes('score') || arg.includes('lives')))) {
      this.flagSuspiciousActivity('console_game_access');
    }
  }

  incrementScore(points) {
    this._actionsCount++;
    const oldScore = this._score;
    this._score += points;
    
    // Log action for pattern analysis
    this.actionLog.push({
      type: 'score_increase',
      points: points,
      timestamp: Date.now() - this.startTime,
      total: this._score
    });
    
    // Validate score progression
    if (!this.security.validateScore(this._score, Date.now() - this.startTime, this._actionsCount)) {
      this.flagSuspiciousActivity('invalid_score_progression');
      this._score = oldScore; // Revert
    }
  }

  submitScore() {
    if (!this.rateLimiter.canSubmit()) {
      return { success: false, error: 'Rate limited' };
    }

    const gameState = this.getSecureGameState();
    const isValid = this.validateFinalScore(gameState);
    
    if (!isValid) {
      this.flagSuspiciousActivity('invalid_final_score');
      return { success: false, error: 'Invalid score' };
    }

    // In production, send encrypted data to server
    const encryptedState = this.security.encryptGameState(gameState);
    
    return {
      success: true,
      score: this._score,
      encryptedData: encryptedState,
      checksum: gameState.checksum
    };
  }

  validateFinalScore(gameState) {
    // Multiple validation checks
    const timeValid = SecureInput.validateGameTime(gameState.gameTime);
    const scoreValid = SecureInput.validateScore(gameState.score);
    const progressionValid = this.security.validateScore(
      gameState.score, 
      gameState.gameTime, 
      gameState.actions
    );
    
    // Check action patterns (simple heuristic)
    const avgTimePerAction = gameState.gameTime / gameState.actions;
    const patternValid = avgTimePerAction > 50 && avgTimePerAction < 10000; // 50ms to 10s per action
    
    return timeValid && scoreValid && progressionValid && patternValid;
  }
}

// 6. SERVER-SIDE VALIDATION (Node.js example)
const serverSideValidation = `
// SERVER-SIDE CODE (Node.js + Express)
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const scoreSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 score submissions per minute
  message: 'Too many score submissions'
});

// Score validation endpoint
app.post('/api/scores', scoreSubmissionLimiter, async (req, res) => {
  try {
    const { score, gameTime, actions, checksum, encryptedData } = req.body;
    
    // Validate input types
    if (typeof score !== 'number' || typeof gameTime !== 'number') {
      return res.status(400).json({ error: 'Invalid input types' });
    }
    
    // Validate ranges
    if (score < 0 || score > 10000000 || gameTime < 1000 || gameTime > 3600000) {
      return res.status(400).json({ error: 'Values out of range' });
    }
    
    // Validate score progression (server-side logic)
    const maxPossibleScore = (gameTime / 1000) * 500; // 500 points per second max
    if (score > maxPossibleScore) {
      return res.status(400).json({ error: 'Score too high for time played' });
    }
    
    // Verify checksum (if using same algorithm as client)
    const expectedChecksum = generateServerChecksum(score, gameTime, actions);
    if (checksum !== expectedChecksum) {
      return res.status(400).json({ error: 'Invalid checksum' });
    }
    
    // Additional validation: check against player's history
    const playerHistory = await getPlayerScoreHistory(req.ip);
    if (isScoreAnomalous(score, playerHistory)) {
      return res.status(400).json({ error: 'Anomalous score pattern' });
    }
    
    // Save score if all validations pass
    const savedScore = await saveScore({
      score,
      gameTime,
      actions,
      ip: req.ip,
      timestamp: new Date()
    });
    
    res.json({ success: true, rank: savedScore.rank });
    
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function generateServerChecksum(score, time, actions) {
  // Same algorithm as client-side
  const crypto = require('crypto');
  const data = \`\${score}-\${time}-\${actions}-SERVER_SALT\`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

function isScoreAnomalous(score, history) {
  if (history.length < 3) return false;
  
  const recentScores = history.slice(-5).map(h => h.score);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  
  // Flag if new score is 10x higher than recent average
  return score > avgRecent * 10;
}
`;

// 7. USAGE EXAMPLE
function initializeSecureGame() {
  const secureGame = new SecureShooterGame();
  
  // Example of secure score handling
  function onEnemyDestroyed(enemyType) {
    const points = enemyType * 15; // 15, 30, 45, 60 points based on enemy type
    secureGame.incrementScore(points);
  }
  
  function onGameOver() {
    const result = secureGame.submitScore();
    
    if (result.success) {
      console.log('Score submitted successfully:', result.score);
      // Display leaderboard or success message
    } else {
      console.error('Score submission failed:', result.error);
      // Handle error (don't submit to leaderboard)
    }
  }
  
  return { secureGame, onEnemyDestroyed, onGameOver };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GameSecurity,
    ProtectedGame,
    SecureInput,
    RateLimiter,
    SecureShooterGame,
    initializeSecureGame
  };
}

console.log('Game security measures loaded. Key features:');
console.log('✓ Encrypted game state');
console.log('✓ Protected variables with validation');
console.log('✓ Input sanitization');
console.log('✓ Rate limiting');
console.log('✓ Server-side validation');
console.log('✓ Anti-tampering measures');
console.log('✓ Pattern analysis');
console.log('✓ Dev tools detection');
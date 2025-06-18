// app/games/dino-fight/Platform.js
export class Platform {
  constructor({ x, y, width = 16, height = 4 }) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  checkCollision(player) {
    // only top-side collision
    return (
      player.y + player.height <= this.y &&
      player.y + player.height + player.vy >= this.y &&
      player.x + player.width > this.x &&
      player.x < this.x + this.width
    )
  }
}

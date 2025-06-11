// generateSpriteSheets.js
const sharp = require('sharp')
const fs = require('fs-extra')
const path = require('path')

const SPRITES_DIR = path.join(__dirname, 'public', 'sprites')
const DIRECTIONS = ['idle', 'frontWalk', 'backWalk', 'leftWalk', 'rightWalk']
const FRAME_COUNT = 8

async function generateSpriteSheet(character, direction) {
  const frameDir = path.join(SPRITES_DIR, character, direction)
  const outputFile = path.join(SPRITES_DIR, character, `${direction}.png`)

  if (!fs.existsSync(frameDir)) return

  const frameFiles = []
  for (let i = 1; i <= FRAME_COUNT; i++) {
    const filePath = path.join(frameDir, `${direction}_${i}.png`)
    if (!fs.existsSync(filePath)) {
      console.warn(`Missing: ${filePath}`)
      return
    }
    frameFiles.push(filePath)
  }

  const images = await Promise.all(frameFiles.map(file => sharp(file).ensureAlpha().toBuffer()))
  const { width, height } = await sharp(frameFiles[0]).metadata()

  const spriteSheet = sharp({
    create: {
      width: width * FRAME_COUNT,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })

  const composites = images.map((img, i) => ({
    input: img,
    top: 0,
    left: i * width,
  }))

  await spriteSheet.composite(composites).toFile(outputFile)
  console.log(`✅ ${character}/${direction}.png created`)
}

async function processAllCharacters() {
  const characters = await fs.readdir(SPRITES_DIR)
  for (const char of characters) {
    const charPath = path.join(SPRITES_DIR, char)
    const stat = await fs.stat(charPath)
    if (!stat.isDirectory()) continue

    for (const dir of DIRECTIONS) {
      await generateSpriteSheet(char, dir)
    }
  }
}

processAllCharacters()

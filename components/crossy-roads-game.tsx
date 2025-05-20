"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw } from "lucide-react"

export default function CrossyRoadsGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const gameStateRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.OrthographicCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    psyduck: null as THREE.Group | null,
    lanes: [] as Lane[],
    currentLane: 0,
    currentColumn: 0,
    previousTimestamp: 0,
    startMoving: false,
    moves: [] as string[],
    stepStartTimestamp: 0,
    gameOver: false,
  })

  // Constants
  const zoom = 2
  const psyduckSize = 15
  const positionWidth = 42
  const columns = 17
  const boardWidth = positionWidth * columns
  const stepTime = 200 // Milliseconds for psyduck to take a step
  const distance = 500
  const threeHeights = [20, 45, 60]
  const laneTypes = ["car", "truck", "forest"]
  const laneSpeeds = [2, 2.5, 3]
  const vehicleColors = [0x428eff, 0xffef42, 0xff7b42, 0xff426b]

  // Texture creation function
  function createTexture(width: number, height: number, rects: { x: number; y: number; w: number; h: number }[]) {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) return new THREE.Texture()

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.fillStyle = "rgba(0,0,0,0.6)"
    rects.forEach((rect) => {
      context.fillRect(rect.x, rect.y, rect.w, rect.h)
    })
    return new THREE.CanvasTexture(canvas)
  }

  // Create textures
  const carFrontTexture = () => createTexture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }])
  const carBackTexture = () => createTexture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }])
  const carRightSideTexture = () =>
    createTexture(110, 40, [
      { x: 10, y: 0, w: 50, h: 30 },
      { x: 70, y: 0, w: 30, h: 30 },
    ])
  const carLeftSideTexture = () =>
    createTexture(110, 40, [
      { x: 10, y: 10, w: 50, h: 30 },
      { x: 70, y: 10, w: 30, h: 30 },
    ])
  const truckFrontTexture = () => createTexture(30, 30, [{ x: 15, y: 0, w: 10, h: 30 }])
  const truckRightSideTexture = () => createTexture(25, 30, [{ x: 0, y: 15, w: 10, h: 10 }])
  const truckLeftSideTexture = () => createTexture(25, 30, [{ x: 0, y: 5, w: 10, h: 10 }])

  // Game objects
  function createWheel() {
    const wheel = new THREE.Mesh(
      new THREE.BoxGeometry(12 * zoom, 33 * zoom, 12 * zoom),
      new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true }),
    )
    wheel.position.z = 6 * zoom
    return wheel
  }

  function createCar() {
    const car = new THREE.Group()
    const color = vehicleColors[Math.floor(Math.random() * vehicleColors.length)]

    const main = new THREE.Mesh(
      new THREE.BoxGeometry(60 * zoom, 30 * zoom, 15 * zoom),
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
    )
    main.position.z = 12 * zoom
    main.castShadow = true
    main.receiveShadow = true
    car.add(main)

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(33 * zoom, 24 * zoom, 12 * zoom), [
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture() }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture() }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture() }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture() }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }), // bottom
    ])
    cabin.position.x = 6 * zoom
    cabin.position.z = 25.5 * zoom
    cabin.castShadow = true
    cabin.receiveShadow = true
    car.add(cabin)

    const frontWheel = createWheel()
    frontWheel.position.x = -18 * zoom
    car.add(frontWheel)

    const backWheel = createWheel()
    backWheel.position.x = 18 * zoom
    car.add(backWheel)

    car.castShadow = true
    car.receiveShadow = false

    return car
  }

  function createTruck() {
    const truck = new THREE.Group()
    const color = vehicleColors[Math.floor(Math.random() * vehicleColors.length)]

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(100 * zoom, 25 * zoom, 5 * zoom),
      new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true }),
    )
    base.position.z = 10 * zoom
    truck.add(base)

    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(75 * zoom, 35 * zoom, 40 * zoom),
      new THREE.MeshPhongMaterial({ color: 0xb4c6fc, flatShading: true }),
    )
    cargo.position.x = 15 * zoom
    cargo.position.z = 30 * zoom
    cargo.castShadow = true
    cargo.receiveShadow = true
    truck.add(cargo)

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(25 * zoom, 30 * zoom, 30 * zoom), [
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // back
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckFrontTexture() }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckRightSideTexture() }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckLeftSideTexture() }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // bottom
    ])
    cabin.position.x = -40 * zoom
    cabin.position.z = 20 * zoom
    cabin.castShadow = true
    cabin.receiveShadow = true
    truck.add(cabin)

    const frontWheel = createWheel()
    frontWheel.position.x = -38 * zoom
    truck.add(frontWheel)

    const middleWheel = createWheel()
    middleWheel.position.x = -10 * zoom
    truck.add(middleWheel)

    const backWheel = createWheel()
    backWheel.position.x = 30 * zoom
    truck.add(backWheel)

    return truck
  }

  function createTree() {
    const tree = new THREE.Group()

    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(15 * zoom, 15 * zoom, 20 * zoom),
      new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true }),
    )
    trunk.position.z = 10 * zoom
    trunk.castShadow = true
    trunk.receiveShadow = true
    tree.add(trunk)

    const height = threeHeights[Math.floor(Math.random() * threeHeights.length)]

    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(30 * zoom, 30 * zoom, height * zoom),
      new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true }),
    )
    crown.position.z = (height / 2 + 20) * zoom
    crown.castShadow = true
    crown.receiveShadow = false
    tree.add(crown)

    return tree
  }

  function createPsyduck() {
    const psyduck = new THREE.Group()
  
    const bodyYellow = new THREE.MeshPhongMaterial({ color: 0xffeb73, flatShading: true })
    const orange = new THREE.MeshPhongMaterial({ color: 0xffa500, flatShading: true })
    const white = new THREE.MeshPhongMaterial({ color: 0xffffff })
    const black = new THREE.MeshPhongMaterial({ color: 0x000000 })
  
    // Body (shorter and wider)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(12 * zoom, 13 * zoom, 14 * zoom),
      bodyYellow
    )
    body.position.z = 7 * zoom
    psyduck.add(body)
  
    // Head (bigger and rounder)
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(16 * zoom, 15 * zoom, 16 * zoom),
      bodyYellow
    )
    head.position.z = 18 * zoom
    psyduck.add(head)
  
    // Eyes (larger, closer)
    const leftEyeWhite = new THREE.Mesh(
      new THREE.BoxGeometry(4.5 * zoom, 4.5 * zoom, 1.5 * zoom),
      white
    )
    leftEyeWhite.position.set(-2.5 * zoom, 4.5 * zoom, 23 * zoom)
    psyduck.add(leftEyeWhite)
  
    const leftPupil = new THREE.Mesh(
      new THREE.BoxGeometry(1.2 * zoom, 1.2 * zoom, 1.2 * zoom),
      black
    )
    leftPupil.position.set(-2.5 * zoom, 4.5 * zoom, 24 * zoom)
    psyduck.add(leftPupil)
  
    const rightEyeWhite = leftEyeWhite.clone()
    rightEyeWhite.position.x = 2.5 * zoom
    psyduck.add(rightEyeWhite)
  
    const rightPupil = leftPupil.clone()
    rightPupil.position.x = 2.5 * zoom
    psyduck.add(rightPupil)
  
    // Beak (flat and wide)
    const beak = new THREE.Mesh(
      new THREE.BoxGeometry(8 * zoom, 3 * zoom, 2 * zoom),
      orange
    )
    beak.position.set(0, 6 * zoom, 20.5 * zoom)
    psyduck.add(beak)
  
    // Arms (flippers)
    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(2 * zoom, 5 * zoom, 2 * zoom),
      bodyYellow
    )
    leftArm.position.set(-7 * zoom, 0, 11 * zoom)
    psyduck.add(leftArm)
  
    const rightArm = leftArm.clone()
    rightArm.position.x = 7 * zoom
    psyduck.add(rightArm)
  
    // Feet
    const leftFoot = new THREE.Mesh(
      new THREE.BoxGeometry(4 * zoom, 6 * zoom, 2 * zoom),
      orange
    )
    leftFoot.position.set(-3 * zoom, 0, 1 * zoom)
    psyduck.add(leftFoot)
  
    const rightFoot = leftFoot.clone()
    rightFoot.position.x = 3 * zoom
    psyduck.add(rightFoot)
  
    // Longer hair tufts (more iconic)
    for (let i = -1; i <= 1; i++) {
      const tuft = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 * zoom, 0.5 * zoom, 6 * zoom),
        black
      )
      tuft.position.set(i * 1.5 * zoom, 0, 28 * zoom)
      psyduck.add(tuft)
    }
  
    return psyduck
  }  

  function createRoad() {
    const road = new THREE.Group()

    const createSection = (color: number) =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(boardWidth * zoom, positionWidth * zoom),
        new THREE.MeshPhongMaterial({ color }),
      )

    const middle = createSection(0x454a59)
    middle.receiveShadow = true
    road.add(middle)

    const left = createSection(0x393d49)
    left.position.x = -boardWidth * zoom
    road.add(left)

    const right = createSection(0x393d49)
    right.position.x = boardWidth * zoom
    road.add(right)

    return road
  }

  function createGrass() {
    const grass = new THREE.Group()

    const createSection = (color: number) =>
      new THREE.Mesh(
        new THREE.BoxGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
        new THREE.MeshPhongMaterial({ color }),
      )

    const middle = createSection(0x55f472)
    middle.receiveShadow = true
    grass.add(middle)

    const left = createSection(0x46c871)
    left.position.x = -boardWidth * zoom
    grass.add(left)

    const right = createSection(0x46c871)
    right.position.x = boardWidth * zoom
    grass.add(right)

    grass.position.z = 1.5 * zoom
    return grass
  }

  // Lane class
  class Lane {
    index: number
    type: string
    mesh: THREE.Group
    direction?: boolean
    speed?: number
    vehicles?: THREE.Group[]
    occupiedPositions?: Set<number>
    trees?: THREE.Group[]

    constructor(index: number) {
      this.index = index
      this.type = index <= 0 ? "field" : laneTypes[Math.floor(Math.random() * laneTypes.length)]

      switch (this.type) {
        case "field": {
          this.mesh = createGrass()
          break
        }
        case "forest": {
          this.mesh = createGrass()
          this.occupiedPositions = new Set()
          this.trees = [1, 2, 3, 4].map(() => {
            const tree = createTree()
            let position
            do {
              position = Math.floor(Math.random() * columns)
            } while (this.occupiedPositions?.has(position))
            this.occupiedPositions?.add(position)
            tree.position.x = (position * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2
            this.mesh.add(tree)
            return tree
          })
          break
        }
        case "car": {
          this.mesh = createRoad()
          this.direction = Math.random() >= 0.5
          const occupiedPositions = new Set()
          this.vehicles = [1, 2, 3].map(() => {
            const vehicle = createCar()
            let position
            do {
              position = Math.floor((Math.random() * columns) / 2)
            } while (occupiedPositions.has(position))
            occupiedPositions.add(position)
            vehicle.position.x = (position * positionWidth * 2 + positionWidth / 2) * zoom - (boardWidth * zoom) / 2
            if (!this.direction) vehicle.rotation.z = Math.PI
            this.mesh.add(vehicle)
            return vehicle
          })
          this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)]
          break
        }
        case "truck": {
          this.mesh = createRoad()
          this.direction = Math.random() >= 0.5
          const occupiedPositions = new Set()
          this.vehicles = [1, 2].map(() => {
            const vehicle = createTruck()
            let position
            do {
              position = Math.floor((Math.random() * columns) / 3)
            } while (occupiedPositions.has(position))
            occupiedPositions.add(position)
            vehicle.position.x = (position * positionWidth * 3 + positionWidth / 2) * zoom - (boardWidth * zoom) / 2
            if (!this.direction) vehicle.rotation.z = Math.PI
            this.mesh.add(vehicle)
            return vehicle
          })
          this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)]
          break
        }
      }
    }
  }

  // Initialize game
  const initializeGame = () => {
    if (!containerRef.current) return

    // Create scene
    const scene = new THREE.Scene()

    // Create camera
    const camera = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      0.1,
      10000,
    )

    camera.rotation.x = (50 * Math.PI) / 180
    camera.rotation.y = (20 * Math.PI) / 180
    camera.rotation.z = (10 * Math.PI) / 180

    const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance
    const initialCameraPositionX = Math.tan(camera.rotation.y) * Math.sqrt(distance ** 2 + initialCameraPositionY ** 2)
    camera.position.y = initialCameraPositionY
    camera.position.x = initialCameraPositionX
    camera.position.z = distance

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.innerHTML = ""
    containerRef.current.appendChild(renderer.domElement)

    // Create lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6)
    scene.add(hemiLight)

    const initialDirLightPositionX = -100
    const initialDirLightPositionY = -100
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
    dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200)
    dirLight.castShadow = true
    scene.add(dirLight)

    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    const d = 500
    dirLight.shadow.camera.left = -d
    dirLight.shadow.camera.right = d
    dirLight.shadow.camera.top = d
    dirLight.shadow.camera.bottom = -d

    const backLight = new THREE.DirectionalLight(0x000000, 0.4)
    backLight.position.set(200, 200, 50)
    backLight.castShadow = true
    scene.add(backLight)

    // Create psyduck
    const psyduck = createPsyduck()
    scene.add(psyduck)
    dirLight.target = psyduck

    // Generate lanes
    const generateLanes = () => {
      const lanes = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((index) => {
          const lane = new Lane(index)
          lane.mesh.position.y = index * positionWidth * zoom
          scene.add(lane.mesh)
          return lane
        })
        .filter((lane) => lane.index >= 0)
      return lanes
    }

    const lanes = generateLanes()

    // Initialize game state
    gameStateRef.current = {
      scene,
      camera,
      renderer,
      psyduck,
      lanes,
      currentLane: 0,
      currentColumn: Math.floor(columns / 2),
      previousTimestamp: 0,
      startMoving: false,
      moves: [],
      stepStartTimestamp: 0,
      gameOver: false,
    }

    // Position psyduck
    psyduck.position.x = 0
    psyduck.position.y = 0

    // Start animation
    animate(0)

    // Reset score
    setScore(0)
    setGameOver(false)
  }

  // Add lane function
  const addLane = () => {
    const { scene, lanes } = gameStateRef.current
    if (!scene) return

    const index = lanes.length
    const lane = new Lane(index)
    lane.mesh.position.y = index * positionWidth * zoom
    scene.add(lane.mesh)
    gameStateRef.current.lanes.push(lane)
  }

  // Move function
  const move = (direction: string) => {
    const { lanes, currentLane, currentColumn, moves, startMoving, stepStartTimestamp, gameOver } = gameStateRef.current

    if (gameOver) return

    const finalPositions = moves.reduce(
      (position, move) => {
        if (move === "forward") return { lane: position.lane + 1, column: position.column }
        if (move === "backward") return { lane: position.lane - 1, column: position.column }
        if (move === "left") return { lane: position.lane, column: position.column - 1 }
        if (move === "right") return { lane: position.lane, column: position.column + 1 }
        return position
      },
      { lane: currentLane, column: currentColumn },
    )

    if (direction === "forward") {
      if (
        lanes[finalPositions.lane + 1]?.type === "forest" &&
        lanes[finalPositions.lane + 1]?.occupiedPositions?.has(finalPositions.column)
      )
        return
      if (!stepStartTimestamp) gameStateRef.current.startMoving = true
      addLane()
    } else if (direction === "backward") {
      if (finalPositions.lane === 0) return
      if (
        lanes[finalPositions.lane - 1]?.type === "forest" &&
        lanes[finalPositions.lane - 1]?.occupiedPositions?.has(finalPositions.column)
      )
        return
      if (!stepStartTimestamp) gameStateRef.current.startMoving = true
    } else if (direction === "left") {
      if (finalPositions.column === 0) return
      if (
        lanes[finalPositions.lane]?.type === "forest" &&
        lanes[finalPositions.lane]?.occupiedPositions?.has(finalPositions.column - 1)
      )
        return
      if (!stepStartTimestamp) gameStateRef.current.startMoving = true
    } else if (direction === "right") {
      if (finalPositions.column === columns - 1) return
      if (
        lanes[finalPositions.lane]?.type === "forest" &&
        lanes[finalPositions.lane]?.occupiedPositions?.has(finalPositions.column + 1)
      )
        return
      if (!stepStartTimestamp) gameStateRef.current.startMoving = true
    }

    gameStateRef.current.moves.push(direction)
  }

  // Animation function
  const animate = (timestamp: number) => {
    const {
      scene,
      camera,
      renderer,
      psyduck,
      lanes,
      currentLane,
      currentColumn,
      previousTimestamp,
      startMoving,
      moves,
      stepStartTimestamp,
      gameOver,
    } = gameStateRef.current

    if (!scene || !camera || !renderer || !psyduck) return

    requestAnimationFrame(animate)

    const delta = timestamp - (previousTimestamp || timestamp)
    gameStateRef.current.previousTimestamp = timestamp

    // Animate vehicles
    lanes.forEach((lane) => {
      if (lane.type === "car" || lane.type === "truck") {
        const aBitBeforeTheBeginingOfLane = (-boardWidth * zoom) / 2 - positionWidth * 2 * zoom
        const aBitAfterTheEndOFLane = (boardWidth * zoom) / 2 + positionWidth * 2 * zoom
        lane.vehicles?.forEach((vehicle) => {
          if (lane.direction) {
            vehicle.position.x =
              vehicle.position.x < aBitBeforeTheBeginingOfLane
                ? aBitAfterTheEndOFLane
                : vehicle.position.x - ((lane.speed || 0) / 16) * delta
          } else {
            vehicle.position.x =
              vehicle.position.x > aBitAfterTheEndOFLane
                ? aBitBeforeTheBeginingOfLane
                : vehicle.position.x + ((lane.speed || 0) / 16) * delta
          }
        })
      }
    })

    // Handle movement
    if (startMoving) {
      gameStateRef.current.stepStartTimestamp = timestamp
      gameStateRef.current.startMoving = false
    }

    if (stepStartTimestamp) {
      const moveDeltaTime = timestamp - stepStartTimestamp
      const moveDeltaDistance = Math.min(moveDeltaTime / stepTime, 1) * positionWidth * zoom
      const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime / stepTime, 1) * Math.PI) * 8 * zoom

      const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance
      const initialCameraPositionX =
        Math.tan(camera.rotation.y) * Math.sqrt(distance ** 2 + initialCameraPositionY ** 2)
      const initialDirLightPositionX = -100
      const initialDirLightPositionY = -100

      switch (moves[0]) {
        case "forward": {
          const positionY = currentLane * positionWidth * zoom + moveDeltaDistance
          camera.position.y = initialCameraPositionY + positionY
          psyduck.position.y = positionY
          psyduck.position.z = jumpDeltaDistance
          break
        }
        case "backward": {
          const positionY = currentLane * positionWidth * zoom - moveDeltaDistance
          camera.position.y = initialCameraPositionY + positionY
          psyduck.position.y = positionY
          psyduck.position.z = jumpDeltaDistance
          break
        }
        case "left": {
          const positionX =
            (currentColumn * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2 - moveDeltaDistance
          camera.position.x = initialCameraPositionX + positionX
          psyduck.position.x = positionX
          psyduck.position.z = jumpDeltaDistance
          break
        }
        case "right": {
          const positionX =
            (currentColumn * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2 + moveDeltaDistance
          camera.position.x = initialCameraPositionX + positionX
          psyduck.position.x = positionX
          psyduck.position.z = jumpDeltaDistance
          break
        }
      }

      // Once a step has ended
      if (moveDeltaTime > stepTime) {
        switch (moves[0]) {
          case "forward": {
            gameStateRef.current.currentLane++
            setScore(gameStateRef.current.currentLane)
            break
          }
          case "backward": {
            gameStateRef.current.currentLane--
            setScore(gameStateRef.current.currentLane)
            break
          }
          case "left": {
            gameStateRef.current.currentColumn--
            break
          }
          case "right": {
            gameStateRef.current.currentColumn++
            break
          }
        }
        gameStateRef.current.moves.shift()
        gameStateRef.current.stepStartTimestamp = moves.length === 0 ? 0 : timestamp
      }
    }

    // Hit test
    if (lanes[currentLane]?.type === "car" || lanes[currentLane]?.type === "truck") {
      const psyduckMinX = psyduck.position.x - (psyduckSize * zoom) / 2
      const psyduckMaxX = psyduck.position.x + (psyduckSize * zoom) / 2
      const vehicleLength = { car: 60, truck: 105 }[lanes[currentLane].type]

      lanes[currentLane].vehicles?.forEach((vehicle) => {
        const vehicleMinX = vehicle.position.x - (vehicleLength * zoom) / 2
        const vehicleMaxX = vehicle.position.x + (vehicleLength * zoom) / 2

        if (psyduckMaxX > vehicleMinX && psyduckMinX < vehicleMaxX && !gameOver) {
          gameStateRef.current.gameOver = true
          setGameOver(true)
        }
      })
    }

    renderer.render(scene, camera)
  }

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameStateRef.current.gameOver) return

      switch (event.key.toLowerCase()) {
        case "arrowup":
        case "w":
          move("forward")
          break
        case "arrowdown":
        case "s":
          move("backward")
          break
        case "arrowleft":
        case "a":
          move("left")
          break
        case "arrowright":
        case "d":
          move("right")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const { camera, renderer } = gameStateRef.current
      if (!camera || !renderer) return

      camera.left = window.innerWidth / -2
      camera.right = window.innerWidth / 2
      camera.top = window.innerHeight / 2
      camera.bottom = window.innerHeight / -2
      camera.updateProjectionMatrix()

      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Initialize game on mount
  useEffect(() => {
    initializeGame()

    return () => {
      // Clean up Three.js resources
      const { scene, renderer } = gameStateRef.current
      if (scene) {
        while (scene.children.length > 0) {
          const object = scene.children[0]
          scene.remove(object)
        }
      }
      if (renderer) {
        renderer.dispose()
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="absolute top-4 left-4 z-10 bg-black/50 p-2 rounded-md">
        <div className="text-xl font-bold">Score: {score}</div>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70">
          <div className="bg-gray-800 p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <p className="text-xl mb-6">Your score: {score}</p>
            <Button
              onClick={() => {
                initializeGame()
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Play Again
            </Button>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />

      <div className="fixed bottom-8 z-10 flex flex-col items-center">
        <Button onClick={() => move("forward")} className="mb-2 bg-gray-800/80 hover:bg-gray-700/80" size="icon">
          <ChevronUp className="h-6 w-6" />
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => move("left")} className="bg-gray-800/80 hover:bg-gray-700/80" size="icon">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button onClick={() => move("backward")} className="bg-gray-800/80 hover:bg-gray-700/80" size="icon">
            <ChevronDown className="h-6 w-6" />
          </Button>
          <Button onClick={() => move("right")} className="bg-gray-800/80 hover:bg-gray-700/80" size="icon">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}

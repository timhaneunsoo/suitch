"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw } from "lucide-react"
import Link from "next/link"

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

  const zoom = 1
  const psyduckSize = 15
  const positionWidth = 42
  const columns = 17
  const boardWidth = positionWidth * columns
  const stepTime = 200
  const distance = 500
  const threeHeights = [20, 45, 60]
  const laneTypes = ["car", "truck", "forest", "river"]
  const laneSpeeds = [2, 2.5, 3, 1.5]
  const vehicleColors = [0x428eff, 0xffef42, 0xff7b42, 0xff426b]

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
  function createWheel() {
    const wheel = new THREE.Mesh(
      new THREE.BoxGeometry(12 * zoom, 33 * zoom, 12 * zoom),
      new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
    )
    wheel.position.z = 6 * zoom
    return wheel
  }

  function createCar() {
    const car = new THREE.Group()
    const color = vehicleColors[Math.floor(Math.random() * vehicleColors.length)]

    const main = new THREE.Mesh(
      new THREE.BoxGeometry(60 * zoom, 30 * zoom, 15 * zoom),
      new THREE.MeshPhongMaterial({ color, flatShading: true })
    )
    main.position.z = 12 * zoom
    car.add(main)

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(33 * zoom, 24 * zoom, 12 * zoom), [
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture() }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture() }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture() }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture() }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
    ])
    cabin.position.x = 6 * zoom
    cabin.position.z = 25.5 * zoom
    car.add(cabin)

    const frontWheel = createWheel()
    frontWheel.position.x = -18 * zoom
    car.add(frontWheel)

    const backWheel = createWheel()
    backWheel.position.x = 18 * zoom
    car.add(backWheel)

    return car
  }

  function createTruck() {
    const truck = new THREE.Group()
    const color = vehicleColors[Math.floor(Math.random() * vehicleColors.length)]

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(100 * zoom, 25 * zoom, 5 * zoom),
      new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
    )
    base.position.z = 10 * zoom
    truck.add(base)

    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(75 * zoom, 35 * zoom, 40 * zoom),
      new THREE.MeshPhongMaterial({ color: 0xb4c6fc, flatShading: true })
    )
    cargo.position.x = 15 * zoom
    cargo.position.z = 30 * zoom
    truck.add(cargo)

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(25 * zoom, 30 * zoom, 30 * zoom), [
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckFrontTexture() }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckRightSideTexture() }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckLeftSideTexture() }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
    ])
    cabin.position.x = -40 * zoom
    cabin.position.z = 20 * zoom
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

  function createLog() {
    const log = new THREE.Mesh(
      new THREE.BoxGeometry(60 * zoom, 20 * zoom, 10 * zoom),
      new THREE.MeshPhongMaterial({ color: 0x8b4513, flatShading: true })
    )
    log.castShadow = true
    log.receiveShadow = true
    return log
  }

  function createTree() {
    const tree = new THREE.Group()

    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(15 * zoom, 15 * zoom, 20 * zoom),
      new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
    )
    trunk.position.z = 10 * zoom
    tree.add(trunk)

    const height = threeHeights[Math.floor(Math.random() * threeHeights.length)]
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(30 * zoom, 30 * zoom, height * zoom),
      new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true })
    )
    crown.position.z = (height / 2 + 20) * zoom
    tree.add(crown)

    return tree
  }

  function createRiver() {
    const river = new THREE.Group()
    const createSection = (color: number) =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(boardWidth * zoom, positionWidth * zoom),
        new THREE.MeshPhongMaterial({ color }),
      )

    const middle = createSection(0x3070b3)
    middle.receiveShadow = true
    river.add(middle)

    const left = createSection(0x25597e)
    left.position.x = -boardWidth * zoom
    river.add(left)

    const right = createSection(0x25597e)
    right.position.x = boardWidth * zoom
    river.add(right)

    return river
  }

    function createSwitch() {
    const switchGroup = new THREE.Group()

    const screenMaterial = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true })
    const redMaterial = new THREE.MeshPhongMaterial({ color: 0xff3c3c, flatShading: true })
    const blueMaterial = new THREE.MeshPhongMaterial({ color: 0x3c9cff, flatShading: true })
    const blackMaterial = new THREE.MeshPhongMaterial({ color: 0x000000, flatShading: true })

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(30 * zoom, 15 * zoom, 2 * zoom),
      screenMaterial
    )
    screen.position.z = 8 * zoom
    switchGroup.add(screen)

    const leftJoyCon = new THREE.Mesh(
      new THREE.BoxGeometry(5 * zoom, 15 * zoom, 2.5 * zoom),
      redMaterial
    )
    leftJoyCon.position.set(-17.5 * zoom, 0, 8 * zoom)
    switchGroup.add(leftJoyCon)

    const rightJoyCon = new THREE.Mesh(
      new THREE.BoxGeometry(5 * zoom, 15 * zoom, 2.5 * zoom),
      blueMaterial
    )
    rightJoyCon.position.set(17.5 * zoom, 0, 8 * zoom)
    switchGroup.add(rightJoyCon)

    const leftStick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8 * zoom, 0.8 * zoom, 0.5 * zoom, 16),
      blackMaterial
    )
    leftStick.rotation.x = Math.PI / 2
    leftStick.position.set(-17.5 * zoom, 4 * zoom, 9.5 * zoom)
    switchGroup.add(leftStick)

    const rightStick = leftStick.clone()
    rightStick.position.set(17.5 * zoom, 4 * zoom, 9.5 * zoom)
    switchGroup.add(rightStick)

    switchGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })

    return switchGroup
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
        case "river": {
          this.mesh = createRiver()
          this.direction = Math.random() >= 0.5
          const occupiedPositions = new Set()
          this.vehicles = [1, 2, 3].map(() => {
            const log = createLog()
            let position
            do {
              position = Math.floor((Math.random() * columns) / 2)
            } while (occupiedPositions.has(position))
            occupiedPositions.add(position)
            log.position.x = (position * positionWidth * 2 + positionWidth / 2) * zoom - (boardWidth * zoom) / 2
            if (!this.direction) log.rotation.z = Math.PI
            this.mesh.add(log)
            return log
          })
          this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)]
          break
        }
      }
    }
  }

    const initializeGame = () => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.innerHTML = ""
    containerRef.current.appendChild(renderer.domElement)

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6)
    scene.add(hemiLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
    dirLight.position.set(-100, -100, 200)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    const d = 500
    dirLight.shadow.camera.left = -d
    dirLight.shadow.camera.right = d
    dirLight.shadow.camera.top = d
    dirLight.shadow.camera.bottom = -d
    scene.add(dirLight)

    const backLight = new THREE.DirectionalLight(0x000000, 0.4)
    backLight.position.set(200, 200, 50)
    backLight.castShadow = true
    scene.add(backLight)

    const psyduck = createSwitch()
    scene.add(psyduck)
    dirLight.target = psyduck

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

    psyduck.position.x = 0
    psyduck.position.y = 0

    animate(0)
    setScore(0)
    setGameOver(false)
  }

  const addLane = () => {
    const { scene, lanes } = gameStateRef.current
    if (!scene) return

    const index = lanes.length
    const lane = new Lane(index)
    lane.mesh.position.y = index * positionWidth * zoom
    scene.add(lane.mesh)
    gameStateRef.current.lanes.push(lane)
  }

  const move = (direction: string) => {
    const { lanes, currentLane, currentColumn, moves, stepStartTimestamp, gameOver } = gameStateRef.current
    if (gameOver) return

    const finalPositions = moves.reduce(
      (pos, move) => {
        if (move === "forward") return { lane: pos.lane + 1, column: pos.column }
        if (move === "backward") return { lane: pos.lane - 1, column: pos.column }
        if (move === "left") return { lane: pos.lane, column: pos.column - 1 }
        if (move === "right") return { lane: pos.lane, column: pos.column + 1 }
        return pos
      },
      { lane: currentLane, column: currentColumn }
    )

    const nextLane = lanes[finalPositions.lane + (direction === "forward" ? 1 : direction === "backward" ? -1 : 0)]
    const nextColumn =
      finalPositions.column + (direction === "left" ? -1 : direction === "right" ? 1 : 0)

    if (
      (nextLane?.type === "forest" && nextLane.occupiedPositions?.has(nextColumn)) ||
      nextColumn < 0 ||
      nextColumn >= columns ||
      finalPositions.lane < 0
    ) return

    if (!stepStartTimestamp) gameStateRef.current.startMoving = true
    if (direction === "forward") addLane()
    gameStateRef.current.moves.push(direction)
  }

    const animate = (timestamp: number) => {
    const {
      scene, camera, renderer, psyduck, lanes, currentLane, currentColumn,
      previousTimestamp, startMoving, moves, stepStartTimestamp, gameOver
    } = gameStateRef.current

    if (!scene || !camera || !renderer || !psyduck) return
    requestAnimationFrame(animate)

    const delta = timestamp - (previousTimestamp || timestamp)
    gameStateRef.current.previousTimestamp = timestamp

    // Animate moving objects (vehicles, logs)
    lanes.forEach((lane) => {
      if (["car", "truck", "river"].includes(lane.type)) {
        const startX = (-boardWidth * zoom) / 2 - positionWidth * 2 * zoom
        const endX = (boardWidth * zoom) / 2 + positionWidth * 2 * zoom
        lane.vehicles?.forEach((obj) => {
          if (lane.direction) {
            obj.position.x = obj.position.x < startX
              ? endX
              : obj.position.x - ((lane.speed || 0) / 16) * delta
          } else {
            obj.position.x = obj.position.x > endX
              ? startX
              : obj.position.x + ((lane.speed || 0) / 16) * delta
          }
        })
      }
    })

      if (lanes[currentLane]?.type === "river" && !gameOver) {
        const logFound = lanes[currentLane].vehicles?.some((log) => {
          const logMinX = log.position.x - 60 * zoom
          const logMaxX = log.position.x + 60 * zoom
          return psyduck.position.x >= logMinX && psyduck.position.x <= logMaxX
        })

        if (logFound) {
          // Move Psyduck with the log
          const direction = lanes[currentLane].direction ? -1 : 1
          psyduck.position.x += direction * ((lanes[currentLane].speed || 0) / 16) * delta
        } else {
          // No log found under Psyduck
          gameStateRef.current.gameOver = true
          setGameOver(true)
        }
      }

    if (startMoving) {
      gameStateRef.current.stepStartTimestamp = timestamp
      gameStateRef.current.startMoving = false
    }

    if (stepStartTimestamp) {
      const elapsed = timestamp - stepStartTimestamp
      const fraction = Math.min(elapsed / stepTime, 1)
      const moveDist = fraction * positionWidth * zoom
      const jumpHeight = Math.sin(fraction * Math.PI) * 8 * zoom

      const initY = -Math.tan(camera.rotation.x) * distance
      const initX = Math.tan(camera.rotation.y) * Math.sqrt(distance ** 2 + initY ** 2)

      const move = moves[0]
      if (move === "forward") {
        const y = currentLane * positionWidth * zoom + moveDist
        camera.position.y = initY + y
        psyduck.position.y = y
        psyduck.position.z = jumpHeight
      }
      if (move === "backward") {
        const y = currentLane * positionWidth * zoom - moveDist
        camera.position.y = initY + y
        psyduck.position.y = y
        psyduck.position.z = jumpHeight
      }
      if (move === "left") {
        const x = (currentColumn * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2 - moveDist
        camera.position.x = initX + x
        psyduck.position.x = x
        psyduck.position.z = jumpHeight
      }
      if (move === "right") {
        const x = (currentColumn * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2 + moveDist
        camera.position.x = initX + x
        psyduck.position.x = x
        psyduck.position.z = jumpHeight
      }

      if (elapsed > stepTime) {
        switch (move) {
          case "forward": gameStateRef.current.currentLane++; setScore(currentLane + 1); break
          case "backward": gameStateRef.current.currentLane--; setScore(currentLane - 1); break
          case "left": gameStateRef.current.currentColumn--; break
          case "right": gameStateRef.current.currentColumn++; break
        }
        gameStateRef.current.moves.shift()
        gameStateRef.current.stepStartTimestamp = moves.length === 0 ? 0 : timestamp
      }
    }

    // Check collisions with vehicles
    const lane = lanes[currentLane]
    if (["car", "truck"].includes(lane?.type)) {
      const minX = psyduck.position.x - (psyduckSize * zoom) / 2
      const maxX = psyduck.position.x + (psyduckSize * zoom) / 2
      const length = { car: 60, truck: 105 }[lane.type]

      lane.vehicles?.forEach((v) => {
        const vMin = v.position.x - (length * zoom) / 2
        const vMax = v.position.x + (length * zoom) / 2
        if (maxX > vMin && minX < vMax && !gameOver) {
          gameStateRef.current.gameOver = true
          setGameOver(true)
        }
      })
    }

    renderer.render(scene, camera)
  }

  useEffect(() => {
    const keyListener = (e: KeyboardEvent) => {
      if (gameStateRef.current.gameOver) return
      switch (e.key.toLowerCase()) {
        case "arrowup":
        case "w": move("forward"); break
        case "arrowdown":
        case "s": move("backward"); break
        case "arrowleft":
        case "a": move("left"); break
        case "arrowright":
        case "d": move("right"); break
      }
    }

    window.addEventListener("keydown", keyListener)
    return () => window.removeEventListener("keydown", keyListener)
  }, [])

  useEffect(() => {
    const resize = () => {
      const { camera, renderer } = gameStateRef.current
      if (!camera || !renderer) return
      camera.left = window.innerWidth / -2
      camera.right = window.innerWidth / 2
      camera.top = window.innerHeight / 2
      camera.bottom = window.innerHeight / -2
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  useEffect(() => {
    initializeGame()
    return () => {
      const { scene, renderer } = gameStateRef.current
      if (scene) {
        while (scene.children.length > 0) scene.remove(scene.children[0])
      }
      renderer?.dispose()
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
            <div className="flex justify-center gap-4 mt-4">
              <Button onClick={() => initializeGame()} className="bg-green-600 hover:bg-green-700">
                <RotateCcw className="mr-2 h-4 w-4" /> Play Again
              </Button>
            </div>
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

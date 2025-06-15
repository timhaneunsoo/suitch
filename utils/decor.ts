//utils/decor.ts

export type DecorItem = {
  type: string
  x: number
  y: number
  w?: number
  h?: number
  z?: number
  collides?: boolean
}

export const decor: DecorItem[] = [
  { type: "counter", x: 2, y: 6, w: 4, h: 1, z: 20, collides: true },
  { type: "register", x: 3.2, y: 5.5, collides: true },
  { type: "bread", x: .8, y: 5.5, w: 0.8, h: 0.8, collides: true },
  { type: "pastry-stand", x: 1.9, y: 5.5, w: 0.8, h: 0.8, collides: true },
  { type: "fridge", x: 0.5, y: 3.5, w: 1, h: 2, z: 10, collides: true },
  { type: "counter", x: 2.5, y: 3.5, w: 3, h: 1, z: 20, collides: true },
  { type: "coffee-machine", x: 2, y: 3, w: 1, h: 1, collides: true },
  { type: "sink", x: 3.3, y: 2.98, w: .8, h: .8, z: 30, collides: true },
  { type: "sign", x: 5, y: 6, w: 1, h: 1.2, z: 30 },
  { type: "rug", x: 12.5, y: 6, w: 3, h: 2, z: 5 },
  { type: "table-tall", x: 2, y: 9, w: 1, h: 1, collides: true },
  { type: "table-tall", x: 4, y: 9, w: 1, h: 1, collides: true },
  { type: "table-tall", x: 6, y: 9, w: 1, h: 1, collides: true },
  { type: "table", x: 4, y: 13, w: 1.5, h: 1.5, collides: true },
  { type: "table-seat", x: 2.5, y: 12.7, w: .75, h: .75, z: 20},
  { type: "table-seat", x: 5.5, y: 12.7, w: .75, h: .75, z: 20},
  { type: "table2", x: 4, y: 16, w: 1.5, h: 1.5, collides: true },
  { type: "table-seat", x: 2.5, y: 15.7, w: .75, h: .75, z: 20},
  { type: "table-seat", x: 5.5, y: 15.7, w: .75, h: .75, z: 20},
  { type: "couch", x: 22.2, y: 4, w: 3, h: 1.3, z: 20 },
  { type: "plant-tall2", x: 24.3, y: 3.7, w: .73, h: 2.08, z: 20, collides: true },
  { type: "water-pot", x: 16.4, y: 3.7, w: .46, h: .45, z: 20, collides: true },
  { type: "cactus", x: 17, y: 3.7, w: 1, h: 2, z: 20, collides: true },
  { type: "plant-tall", x: 18, y: 3.7, w: 1, h: 1.7, z: 20, collides: true },
  { type: "plant", x: 19, y: 3.7, w: 1, h: 1.3, z: 20, collides: true },
  { type: "crate", x: 19, y: 5, w: 1, h: 1, z: 20, collides: true },
  { type: "sign2", x: 3.3, y: 2.2, w: .9, h: 1.1, z: 10, collides: true },
  { type: "wall-art", x: 22.2, y: 2.4, w: 1.7, h: 2, z: 10, collides: true },
  { type: "window", x: 7, y: 2.5, w: 3, h: 2, z: 10, collides: true },
  { type: "suitch", x: 12.5, y: 2.5, w: 4, h: 2, z: 10, collides: true },
  { type: "window", x: 18, y: 2.5, w: 3, h: 2, z: 10, collides: true },
  { type: "cone", x: 13, y: 15, w: 1, h: 2, z: 10, collides: true },
  { type: "crate", x: 10, y: 15.3, w: 1, h: 1, z: 20, collides: true },
  { type: "crate", x: 11, y: 15.2, w: 1, h: 1, z: 20, collides: true },
  { type: "crate", x: 10.3, y: 16, w: 1, h: 1, z: 20, collides: true },
  { type: "crate", x: 11.3, y: 16.2, w: 1, h: 1, z: 20, collides: true },
  { type: "shell", x: 10.7, y: 15.6, w: 1, h: 1, z: 20, collides: true },
  { type: "jars", x: 10, y: 16.2, w: 1, h: .5, z: 20, collides: true },
  { type: "tv", x: 12, y: 15.5, w: 1, h: 1, z: 20, collides: true },
  { type: "anchor", x: 12.3, y: 15.9, w: 1, h: 1, z: 20, collides: true },
  { type: "log", x: 20, y: 13.5, w: .8, h: .8, z: 20 },
  { type: "log", x: 22, y: 14.2, w: .8, h: .8, z: 20 },
  { type: "log", x: 22.8, y: 16, w: .8, h: .8, z: 20 },
  { type: "log", x: 22, y: 17.8, w: .8, h: .8, z: 20 },
  { type: "log", x: 20, y: 18.5, w: .8, h: .8, z: 20 },
  { type: "log", x: 18, y: 17.8, w: .8, h: .8, z: 20 },
  { type: "log", x: 17.2, y: 16, w: .8, h: .8, z: 20 },
  { type: "log", x: 18, y: 14.2, w: .8, h: .8, z: 20 },
]

// components/gameLibrary.ts

export interface GameEntry {
  id: string
  title: string
  label: string
  route: string
  comingSoon?: boolean
  icon?: string
}

export const gameLibrary: GameEntry[] = [
  {
    id: 'shooter',
    title: 'Samus Shooter',
    label: 'Samus Shooter',
    route: 'shooter',
    icon: '/games/shooter/assets/Character_1.webp',
  },
  {
    id: 'peach-jump',
    title: 'Peach Jump',
    label: 'Peach Jump',
    route: 'peach-jump',
    icon: '/games/peach-jump/assets/Peach_Powerup2_R.png',
  },
  {
    id: 'dino-run',
    title: 'Dino Dash',
    label: 'Dino Dash',
    route: 'dino-run',
    icon: '/games/dino-fight/dino.png',
  },
  {
    id: 'dino-smash',
    title: 'Dino Smash',
    label: 'Dino Smash',
    route: 'dino-fight/lobby',
    icon: '/games/dino-fight/dino.png',
    comingSoon: true, // You can toggle this later
  },
]

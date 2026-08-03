// Conjunto curado de ícones (Lucide) para o badge das competições.
// Importados via ?raw para o Vite embutir o SVG como string, sem carregar a lib inteira.
import trophy from 'lucide-static/icons/trophy.svg?raw'
import medal from 'lucide-static/icons/medal.svg?raw'
import award from 'lucide-static/icons/award.svg?raw'
import crown from 'lucide-static/icons/crown.svg?raw'
import flag from 'lucide-static/icons/flag.svg?raw'
import flame from 'lucide-static/icons/flame.svg?raw'
import zap from 'lucide-static/icons/zap.svg?raw'
import rocket from 'lucide-static/icons/rocket.svg?raw'
import target from 'lucide-static/icons/target.svg?raw'
import star from 'lucide-static/icons/star.svg?raw'
import shield from 'lucide-static/icons/shield.svg?raw'
import gamepad2 from 'lucide-static/icons/gamepad-2.svg?raw'
import cpu from 'lucide-static/icons/cpu.svg?raw'
import code from 'lucide-static/icons/code.svg?raw'
import terminal from 'lucide-static/icons/terminal.svg?raw'
import laptop from 'lucide-static/icons/laptop.svg?raw'
import monitor from 'lucide-static/icons/monitor.svg?raw'
import joystick from 'lucide-static/icons/joystick.svg?raw'
import users from 'lucide-static/icons/users.svg?raw'
import graduationCap from 'lucide-static/icons/graduation-cap.svg?raw'
import puzzle from 'lucide-static/icons/puzzle.svg?raw'
import swords from 'lucide-static/icons/swords.svg?raw'
import brain from 'lucide-static/icons/brain.svg?raw'
import sparkles from 'lucide-static/icons/sparkles.svg?raw'
import timer from 'lucide-static/icons/timer.svg?raw'
import layers from 'lucide-static/icons/layers.svg?raw'
import dice5 from 'lucide-static/icons/dice-5.svg?raw'

export const ICONS = {
  trophy,
  medal,
  award,
  crown,
  flag,
  flame,
  zap,
  rocket,
  target,
  star,
  shield,
  'gamepad-2': gamepad2,
  cpu,
  code,
  terminal,
  laptop,
  monitor,
  joystick,
  users,
  'graduation-cap': graduationCap,
  puzzle,
  swords,
  brain,
  sparkles,
  timer,
  layers,
  'dice-5': dice5,
}

export const ICON_NAMES = Object.keys(ICONS)
export const DEFAULT_ICON = 'trophy'

import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core'
import * as database from '../../data/db.json'

interface NavNode {
  title?: string
  name?: string
  desc?: string
  url?: string
  icon?: string | null
  urls?: Record<string, string>
  nav?: NavNode[]
}

interface PortalSection extends NavNode {
  title: string
  nav: NavNode[]
}

interface LinkMirror {
  label: string
  url: string
}

interface PortalLink {
  id: string
  name: string
  desc: string
  url: string
  icon?: string | null
  section: string
  channel: string
  collection: string
  mirrors: LinkMirror[]
}

interface Petal {
  x: number
  y: number
  size: number
  speed: number
  sideSpeed: number
  sway: number
  phase: number
  rotation: number
  spin: number
  opacity: number
  foreground: boolean
}

interface Glimmer {
  x: number
  y: number
  width: number
  opacity: number
  speed: number
  phase: number
}

@Component({
  selector: 'app-xiejiahe',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sceneCanvas') sceneCanvas?: ElementRef<HTMLCanvasElement>

  readonly allSections = '全部花径'
  readonly allChannels = '全部藏点'
  readonly sections: PortalSection[] = (database as any).default
  readonly links: PortalLink[] = this.flattenNavigation(this.sections)
  readonly totalLinks = this.links.length
  readonly totalCollections = new Set(
    this.links.map(site => `${site.section}/${site.channel}/${site.collection}`)
  ).size

  activeSection = this.allSections
  activeChannel = this.allChannels
  searchTerm = ''
  currentTime = new Date()
  visibleLinks: PortalLink[] = []

  private filteredLinks: PortalLink[] = []
  private visibleLimit = 48
  private readonly pageSize = 48
  private frame = 0
  private clockTimer = 0
  private canvasWidth = 0
  private canvasHeight = 0
  private glimmers: Glimmer[] = []
  private petals: Petal[] = []
  private reducedMotion = false
  private lastPetalDrop = 0

  constructor() {
    this.applyFilters()
    this.clockTimer = window.setInterval(() => {
      this.currentTime = new Date()
    }, 30000)
  }

  get matchingCount(): number {
    return this.filteredLinks.length
  }

  get channels(): string[] {
    const source = this.activeSection === this.allSections
      ? this.links
      : this.links.filter(site => site.section === this.activeSection)
    const values = Array.from(new Set(source.map(site => site.channel)))
    return [this.allChannels, ...values]
  }

  ngAfterViewInit(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.prepareScene()
    if (!this.reducedMotion) {
      this.frame = window.requestAnimationFrame(this.animate)
    }
  }

  ngOnDestroy(): void {
    window.cancelAnimationFrame(this.frame)
    window.clearInterval(this.clockTimer)
  }

  @HostListener('window:resize')
  onResize(): void {
    this.prepareScene()
  }

  @HostListener('document:pointermove', ['$event'])
  trackLight(event: PointerEvent): void {
    const x = `${Math.round((event.clientX / window.innerWidth) * 100)}%`
    const y = `${Math.round((event.clientY / window.innerHeight) * 100)}%`
    document.documentElement.style.setProperty('--cursor-x', x)
    document.documentElement.style.setProperty('--cursor-y', y)
  }

  releasePetals(event: PointerEvent): void {
    if (this.reducedMotion || performance.now() - this.lastPetalDrop < 55) return
    this.lastPetalDrop = performance.now()

    const amount = Math.random() > 0.58 ? 2 : 1
    for (let index = 0; index < amount; index += 1) {
      this.petals.push(this.createPetal(false, event.clientX, event.clientY, true))
    }
    if (this.petals.length > 82) {
      this.petals.splice(0, this.petals.length - 82)
    }
  }

  search(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value.trim()
    this.visibleLimit = this.pageSize
    this.applyFilters()
  }

  clearSearch(): void {
    this.searchTerm = ''
    this.visibleLimit = this.pageSize
    this.applyFilters()
  }

  selectSection(section: string): void {
    this.activeSection = section
    this.activeChannel = this.allChannels
    this.visibleLimit = this.pageSize
    this.applyFilters()
  }

  selectChannel(channel: string): void {
    this.activeChannel = channel
    this.visibleLimit = this.pageSize
    this.applyFilters()
  }

  resetFilters(): void {
    this.activeSection = this.allSections
    this.activeChannel = this.allChannels
    this.searchTerm = ''
    this.visibleLimit = this.pageSize
    this.applyFilters()
  }

  showMore(): void {
    this.visibleLimit += this.pageSize
    this.visibleLinks = this.filteredLinks.slice(0, this.visibleLimit)
  }

  sectionCount(section: string): number {
    return this.links.filter(site => site.section === section).length
  }

  launchRandom(): void {
    const destinations = this.filteredLinks.length ? this.filteredLinks : this.links
    const destination = destinations[Math.floor(Math.random() * destinations.length)]
    if (destination) {
      window.open(destination.url, '_blank', 'noopener,noreferrer')
    }
  }

  hideIcon(event: Event): void {
    const image = event.target as HTMLImageElement
    image.style.display = 'none'
  }

  trackSite(_index: number, site: PortalLink): string {
    return site.id
  }

  private flattenNavigation(nodes: NavNode[]): PortalLink[] {
    const links: PortalLink[] = []

    const visit = (items: NavNode[], trail: string[]): void => {
      items.forEach((item, index) => {
        const title = item.title || ''
        if (item.url && item.name) {
          links.push({
            id: `${item.url}-${links.length}-${index}`,
            name: item.name,
            desc: item.desc || '',
            url: item.url,
            icon: item.icon,
            section: trail[0] || '未分类',
            channel: trail[1] || trail[0] || '未分类',
            collection: trail[2] || trail[1] || trail[0] || '未分类',
            mirrors: Object.entries(item.urls || {}).map(([label, url]) => ({ label, url }))
          })
          return
        }

        if (item.nav?.length) {
          visit(item.nav, title ? [...trail, title] : trail)
        }
      })
    }

    visit(nodes, [])
    return links
  }

  private applyFilters(): void {
    const keyword = this.searchTerm.toLocaleLowerCase()
    this.filteredLinks = this.links.filter(site => {
      const inSection = this.activeSection === this.allSections || site.section === this.activeSection
      const inChannel = this.activeChannel === this.allChannels || site.channel === this.activeChannel
      const haystack = [
        site.name,
        site.desc,
        site.url,
        site.section,
        site.channel,
        site.collection,
        ...site.mirrors.map(mirror => `${mirror.label} ${mirror.url}`)
      ].join(' ').toLocaleLowerCase()
      return inSection && inChannel && (!keyword || haystack.includes(keyword))
    })
    this.visibleLinks = this.filteredLinks.slice(0, this.visibleLimit)
  }

  private prepareScene(): void {
    const canvas = this.sceneCanvas?.nativeElement
    if (!canvas) return

    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    this.canvasWidth = window.innerWidth
    this.canvasHeight = window.innerHeight
    canvas.width = this.canvasWidth * ratio
    canvas.height = this.canvasHeight * ratio
    canvas.style.width = `${this.canvasWidth}px`
    canvas.style.height = `${this.canvasHeight}px`

    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)

    const glimmerCount = this.canvasWidth < 720 ? 15 : 34
    const petalCount = this.canvasWidth < 720 ? 9 : 17
    this.glimmers = Array.from({ length: glimmerCount }, () => ({
      x: Math.random() * this.canvasWidth,
      y: this.canvasHeight * (0.49 + Math.random() * 0.47),
      width: Math.random() * 74 + 18,
      opacity: Math.random() * 0.19 + 0.06,
      speed: Math.random() * 0.3 + 0.08,
      phase: Math.random() * Math.PI * 2
    }))
    this.petals = Array.from({ length: petalCount }, () => this.createPetal(true))
    this.paintScene(0)
  }

  private readonly animate = (time: number): void => {
    this.paintScene(time)
    this.frame = window.requestAnimationFrame(this.animate)
  }

  private paintScene(time: number): void {
    const context = this.sceneCanvas?.nativeElement.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    const tick = time / 1000

    this.glimmers.forEach(glimmer => {
      const drift = Math.sin(tick * glimmer.speed + glimmer.phase) * 30
      const pulse = glimmer.opacity + Math.sin(tick * 1.1 + glimmer.phase) * 0.04
      const gradient = context.createLinearGradient(
        glimmer.x + drift,
        glimmer.y,
        glimmer.x + drift + glimmer.width,
        glimmer.y
      )
      gradient.addColorStop(0, 'rgba(255, 255, 239, 0)')
      gradient.addColorStop(0.48, `rgba(255, 253, 225, ${Math.max(pulse, 0.03)})`)
      gradient.addColorStop(1, 'rgba(255, 255, 239, 0)')
      context.strokeStyle = gradient
      context.lineWidth = glimmer.width > 54 ? 1 : 0.6
      context.beginPath()
      context.moveTo(glimmer.x + drift, glimmer.y)
      context.quadraticCurveTo(
        glimmer.x + drift + glimmer.width / 2,
        glimmer.y + 2,
        glimmer.x + drift + glimmer.width,
        glimmer.y
      )
      context.stroke()
    })

    this.petals.forEach((petal, index) => {
      petal.y += petal.speed
      petal.x += petal.sideSpeed + Math.sin(tick * 2 + petal.phase) * petal.sway
      petal.rotation += petal.spin
      if (petal.y > this.canvasHeight + 35 || petal.x > this.canvasWidth + 48 || petal.x < -48) {
        this.petals[index] = this.createPetal(false)
        return
      }
      this.drawPetal(context, petal)
    })
  }

  private createPetal(
    initial: boolean,
    x = Math.random() * (this.canvasWidth + 80) - 40,
    y = -30,
    foreground = false
  ): Petal {
    return {
      x: foreground ? x + (Math.random() - 0.5) * 24 : x,
      y: foreground ? y + (Math.random() - 0.5) * 14 : (initial ? Math.random() * this.canvasHeight : y),
      size: (foreground ? 7 : 4) + Math.random() * (foreground ? 8 : 7),
      speed: (foreground ? 0.82 : 0.22) + Math.random() * (foreground ? 1.1 : 0.5),
      sideSpeed: (Math.random() - 0.38) * (foreground ? 0.9 : 0.35),
      sway: Math.random() * (foreground ? 0.65 : 0.38) + 0.1,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * (foreground ? 0.045 : 0.018),
      opacity: (foreground ? 0.68 : 0.3) + Math.random() * (foreground ? 0.24 : 0.26),
      foreground
    }
  }

  private drawPetal(context: CanvasRenderingContext2D, petal: Petal): void {
    context.save()
    context.translate(petal.x, petal.y)
    context.rotate(petal.rotation)
    context.beginPath()
    context.moveTo(0, -petal.size)
    context.bezierCurveTo(petal.size * 1.03, -petal.size * 0.48, petal.size * 0.84, petal.size * 0.76, 0, petal.size)
    context.bezierCurveTo(-petal.size * 0.87, petal.size * 0.44, -petal.size * 0.95, -petal.size * 0.43, 0, -petal.size)
    context.fillStyle = `rgba(255, ${petal.foreground ? 137 : 164}, ${petal.foreground ? 174 : 193}, ${petal.opacity})`
    context.shadowBlur = petal.foreground ? 10 : 5
    context.shadowColor = 'rgba(223, 79, 116, .26)'
    context.fill()
    context.restore()
  }
}

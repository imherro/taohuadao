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

interface Spark {
  x: number
  y: number
  radius: number
  opacity: number
  drift: number
  phase: number
}

interface Petal {
  x: number
  y: number
  size: number
  speed: number
  sway: number
  phase: number
  rotation: number
  spin: number
  opacity: number
}

@Component({
  selector: 'app-xiejiahe',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('starfield') starfield?: ElementRef<HTMLCanvasElement>

  readonly allSections = '全部星域'
  readonly allChannels = '全部坐标'
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
  private sparks: Spark[] = []
  private petals: Petal[] = []
  private reducedMotion = false

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
    if (this.reducedMotion) return
    const x = `${Math.round((event.clientX / window.innerWidth) * 100)}%`
    const y = `${Math.round((event.clientY / window.innerHeight) * 100)}%`
    document.documentElement.style.setProperty('--cursor-x', x)
    document.documentElement.style.setProperty('--cursor-y', y)
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
      const matchesSearch = !keyword || haystack.includes(keyword)
      return inSection && inChannel && matchesSearch
    })
    this.visibleLinks = this.filteredLinks.slice(0, this.visibleLimit)
  }

  private prepareScene(): void {
    const canvas = this.starfield?.nativeElement
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

    const sparkCount = this.canvasWidth < 720 ? 32 : 72
    const petalCount = this.canvasWidth < 720 ? 10 : 22
    this.sparks = Array.from({ length: sparkCount }, () => ({
      x: Math.random() * this.canvasWidth,
      y: Math.random() * this.canvasHeight,
      radius: Math.random() * 1.6 + 0.35,
      opacity: Math.random() * 0.55 + 0.25,
      drift: Math.random() * 0.15 + 0.02,
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
    const canvas = this.starfield?.nativeElement
    const context = canvas?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    const tick = time / 1000

    this.sparks.forEach(spark => {
      if (!this.reducedMotion) {
        spark.y -= spark.drift
        if (spark.y < -4) spark.y = this.canvasHeight + 4
      }
      const shimmer = spark.opacity + Math.sin(tick * 1.7 + spark.phase) * 0.18
      context.beginPath()
      context.fillStyle = `rgba(255, 223, 203, ${Math.max(shimmer, 0.08)})`
      context.shadowBlur = 12
      context.shadowColor = 'rgba(255, 139, 168, .72)'
      context.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2)
      context.fill()
    })

    this.petals.forEach((petal, index) => {
      if (!this.reducedMotion) {
        petal.y += petal.speed
        petal.x += Math.sin(tick + petal.phase) * petal.sway
        petal.rotation += petal.spin
        if (petal.y > this.canvasHeight + 32 || petal.x > this.canvasWidth + 45) {
          this.petals[index] = this.createPetal(false)
          petal = this.petals[index]
        }
      }
      this.drawPetal(context, petal)
    })
    context.shadowBlur = 0
  }

  private createPetal(initial: boolean): Petal {
    return {
      x: Math.random() * (this.canvasWidth + 80) - 40,
      y: initial ? Math.random() * this.canvasHeight : -30,
      size: Math.random() * 8 + 6,
      speed: Math.random() * 0.45 + 0.18,
      sway: Math.random() * 0.4 + 0.08,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.012,
      opacity: Math.random() * 0.35 + 0.2
    }
  }

  private drawPetal(context: CanvasRenderingContext2D, petal: Petal): void {
    context.save()
    context.translate(petal.x, petal.y)
    context.rotate(petal.rotation)
    context.beginPath()
    context.moveTo(0, -petal.size)
    context.bezierCurveTo(petal.size, -petal.size * 0.45, petal.size, petal.size * 0.72, 0, petal.size)
    context.bezierCurveTo(-petal.size * 0.85, petal.size * 0.42, -petal.size * 0.78, -petal.size * 0.48, 0, -petal.size)
    context.fillStyle = `rgba(255, 126, 167, ${petal.opacity})`
    context.shadowBlur = 16
    context.shadowColor = 'rgba(255, 98, 154, .45)'
    context.fill()
    context.restore()
  }
}

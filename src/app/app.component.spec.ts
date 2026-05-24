import { CommonModule } from '@angular/common'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AppComponent } from './app.component'

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [AppComponent]
    })
    fixture = TestBed.createComponent(AppComponent)
  })

  it('creates the immersive portal with retained destinations', () => {
    const app = fixture.componentInstance
    expect(app).toBeTruthy()
    expect(app.totalLinks).toBeGreaterThan(800)
  })

  it('filters existing navigation destinations by keyword', () => {
    const app = fixture.componentInstance
    app.search({
      target: { value: 'github' }
    } as unknown as Event)
    expect(app.matchingCount).toBeGreaterThan(0)
    expect(app.visibleLinks.every(site => JSON.stringify(site).toLowerCase().includes('github'))).toBeTrue()
  })

  it('renders the peach blossom island heading', () => {
    fixture.detectChanges()
    const element = fixture.nativeElement as HTMLElement
    expect(element.querySelector('h1')?.textContent).toContain('桃花')
  })
})

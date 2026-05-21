import { TestBed } from '@angular/core/testing';

import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AboutComponent] }).compileComponents();
  });

  it('renders an About heading and at least one paragraph', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('About');
    expect(el.querySelectorAll('p').length).toBeGreaterThan(0);
  });
});

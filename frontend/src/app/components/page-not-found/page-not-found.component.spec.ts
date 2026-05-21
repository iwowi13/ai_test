import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PageNotFoundComponent } from './page-not-found.component';

describe('PageNotFoundComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageNotFoundComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders a 404 heading and a link back to home', () => {
    const fixture = TestBed.createComponent(PageNotFoundComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('404');

    const link = el.querySelector('a');
    expect(link).withContext('home link').not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/');
  });
});

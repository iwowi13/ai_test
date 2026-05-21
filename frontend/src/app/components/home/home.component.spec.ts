import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Post } from '../../models/post';
import { PostsService } from '../../services/posts.service';
import { HomeComponent } from './home.component';

function makePost(over: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: 'Hello',
    slug: 'hello',
    body: 'World',
    image: null,
    authorId: 1,
    createdAt: '2026-05-21T09:00:00Z',
    updatedAt: '2026-05-21T09:00:00Z',
    ...over,
  };
}

function configure(postsSpy: jasmine.SpyObj<PostsService>) {
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [provideRouter([]), { provide: PostsService, useValue: postsSpy }],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  });
}

describe('HomeComponent', () => {
  it('renders one <swiper-slide> per post returned by PostsService.list()', () => {
    const spy = jasmine.createSpyObj<PostsService>('PostsService', ['list']);
    spy.list.and.returnValue(
      of([makePost({ id: 1 }), makePost({ id: 2 }), makePost({ id: 3 })]),
    );
    configure(spy);

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance['posts']().length).toBe(3);
    expect(el.querySelectorAll('swiper-slide').length).toBe(3);
  });

  it('renders "No posts yet." when list is empty', () => {
    const spy = jasmine.createSpyObj<PostsService>('PostsService', ['list']);
    spy.list.and.returnValue(of([]));
    configure(spy);

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('No posts yet.');
    expect((fixture.nativeElement as HTMLElement).querySelector('swiper-container')).toBeNull();
  });

  it('imageFor() builds an API URL for posts with images and falls back to placeholder otherwise', () => {
    const spy = jasmine.createSpyObj<PostsService>('PostsService', ['list']);
    spy.list.and.returnValue(of([]));
    configure(spy);

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      imageFor: (p: Post) => string;
    };

    const withImage = makePost({ image: '/uploads/1.png' });
    const withoutImage = makePost({ image: null });

    expect(inst.imageFor(withImage)).toBe('http://localhost:8000/uploads/1.png');
    expect(inst.imageFor(withoutImage)).toBe('/placeholder.svg');
  });
});

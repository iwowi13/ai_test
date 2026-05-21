import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Post } from '../../models/post';
import { PostsService } from '../../services/posts.service';
import { PostDetailComponent } from './post-detail.component';

const mockPost: Post = {
  id: 42,
  title: 'The Answer',
  slug: 'the-answer',
  body: 'Forty-two.',
  image: '/uploads/42.png',
  authorId: 1,
  createdAt: '2026-05-21T09:00:00Z',
  updatedAt: '2026-05-21T09:00:00Z',
};

function configure(postsSpy: jasmine.SpyObj<PostsService>, idParam: string | null = '42') {
  TestBed.configureTestingModule({
    imports: [PostDetailComponent],
    providers: [
      provideRouter([]),
      { provide: PostsService, useValue: postsSpy },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? idParam : null) } } },
      },
    ],
  });
}

describe('PostDetailComponent', () => {
  it('loads the post and renders its title', () => {
    const spy = jasmine.createSpyObj<PostsService>('PostsService', ['get']);
    spy.get.and.returnValue(of(mockPost));
    configure(spy);

    const fixture = TestBed.createComponent(PostDetailComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(spy.get).toHaveBeenCalledWith(42);
    expect(fixture.componentInstance['post']()?.id).toBe(42);
    expect(el.querySelector('h1')?.textContent).toContain('The Answer');
  });

  it('shows "Post not found" when the API returns 404', () => {
    const spy = jasmine.createSpyObj<PostsService>('PostsService', ['get']);
    spy.get.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
    );
    configure(spy);

    const fixture = TestBed.createComponent(PostDetailComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(fixture.componentInstance['notFound']()).toBeTrue();
    expect(text).toContain('Post not found');
  });

  it('shows a generic error message on non-404 failures', () => {
    const spy = jasmine.createSpyObj<PostsService>('PostsService', ['get']);
    spy.get.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );
    configure(spy);

    const fixture = TestBed.createComponent(PostDetailComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(fixture.componentInstance['notFound']()).toBeFalse();
    expect(text).toContain('Could not load this post.');
  });
});

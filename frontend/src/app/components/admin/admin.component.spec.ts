import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Post } from '../../models/post';
import { PostsService } from '../../services/posts.service';
import { AdminComponent } from './admin.component';

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: 'First',
    slug: 'first',
    body: 'body',
    image: null,
    authorId: 1,
    createdAt: '2026-05-21T10:00:00Z',
    updatedAt: '2026-05-21T10:00:00Z',
    ...overrides,
  };
}

interface PostsSpy extends jasmine.SpyObj<PostsService> {
  list: jasmine.Spy;
  delete: jasmine.Spy;
}

function configure(postsSpy: PostsSpy) {
  TestBed.configureTestingModule({
    imports: [AdminComponent],
    providers: [
      { provide: PostsService, useValue: postsSpy },
      provideRouter([]),
    ],
  });
}

describe('AdminComponent', () => {
  let postsSpy: PostsSpy;

  beforeEach(() => {
    postsSpy = jasmine.createSpyObj<PostsService>('PostsService', [
      'list',
      'delete',
    ]) as PostsSpy;
  });

  it('renders a row per post returned by the service', () => {
    postsSpy.list.and.returnValue(of([makePost({ id: 1, title: 'First' }), makePost({ id: 2, title: 'Second' })]));
    configure(postsSpy);

    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('First');
    expect(rows[1].textContent).toContain('Second');
  });

  it('shows the empty state when the service returns no posts', () => {
    postsSpy.list.and.returnValue(of([]));
    configure(postsSpy);

    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No posts yet.');
  });

  it('deletes a post after the user confirms and removes it from the list', () => {
    postsSpy.list.and.returnValue(of([makePost({ id: 1, title: 'Doomed' }), makePost({ id: 2, title: 'Survivor' })]));
    postsSpy.delete.and.returnValue(of(void 0));
    spyOn(window, 'confirm').and.returnValue(true);
    configure(postsSpy);

    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      delete: (p: Post) => void;
      posts: () => Post[];
    };
    inst.delete(makePost({ id: 1, title: 'Doomed' }));
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalledWith('Delete "Doomed"?');
    expect(postsSpy.delete).toHaveBeenCalledWith(1);
    expect(inst.posts().map((p) => p.id)).toEqual([2]);
  });

  it('does not call the service when the user cancels the confirm', () => {
    postsSpy.list.and.returnValue(of([makePost()]));
    spyOn(window, 'confirm').and.returnValue(false);
    configure(postsSpy);

    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      delete: (p: Post) => void;
    };
    inst.delete(makePost());

    expect(postsSpy.delete).not.toHaveBeenCalled();
  });

  it('shows an error message when delete fails and keeps the row', () => {
    postsSpy.list.and.returnValue(of([makePost({ id: 1, title: 'Doomed' })]));
    postsSpy.delete.and.returnValue(throwError(() => new Error('boom')));
    spyOn(window, 'confirm').and.returnValue(true);
    configure(postsSpy);

    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      delete: (p: Post) => void;
      posts: () => Post[];
      deleteError: () => string | null;
    };
    inst.delete(makePost({ id: 1, title: 'Doomed' }));
    fixture.detectChanges();

    expect(inst.posts().length).toBe(1);
    expect(inst.deleteError()).toContain('Doomed');
  });

  it('navigates to the edit route when Edit is invoked', () => {
    postsSpy.list.and.returnValue(of([makePost({ id: 42 })]));
    configure(postsSpy);

    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const inst = fixture.componentInstance as unknown as { edit: (p: Post) => void };
    inst.edit(makePost({ id: 42 }));

    expect(navSpy).toHaveBeenCalledWith(['/admin/posts', 42, 'edit']);
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Post } from '../../models/post';
import { PostsService } from '../../services/posts.service';
import { AdminPostEditComponent } from './admin-post-edit.component';

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 42,
    title: 'Original title',
    slug: 'original-title',
    body: 'Original body',
    image: null,
    authorId: 1,
    createdAt: '2026-05-21T10:00:00Z',
    updatedAt: '2026-05-21T10:00:00Z',
    ...overrides,
  };
}

interface PostsSpy extends jasmine.SpyObj<PostsService> {
  get: jasmine.Spy;
  update: jasmine.Spy;
  uploadImage: jasmine.Spy;
}

interface ComponentApi {
  form: {
    setValue: (v: { title: string; body: string }) => void;
    value: { title?: string; body?: string };
  };
  submit: () => void;
  cancel: () => void;
  onFileSelected: (e: Event) => void;
  notFound: () => boolean;
  loading: () => boolean;
}

function configure(opts: { postsSpy: PostsSpy; idParam: string | null }) {
  const route = {
    snapshot: {
      paramMap: {
        get: (k: string) => (k === 'id' ? opts.idParam : null),
      },
    },
  };
  TestBed.configureTestingModule({
    imports: [AdminPostEditComponent],
    providers: [
      provideRouter([]),
      { provide: PostsService, useValue: opts.postsSpy },
      // ActivatedRoute must come AFTER provideRouter so our mock wins.
      { provide: ActivatedRoute, useValue: route },
    ],
  });
}

function makeFileEvent(file: File | null): Event {
  const target = {
    files: file ? [file] : [],
    value: 'x',
  } as unknown as HTMLInputElement;
  return { target } as unknown as Event;
}

describe('AdminPostEditComponent', () => {
  let postsSpy: PostsSpy;

  beforeEach(() => {
    postsSpy = jasmine.createSpyObj<PostsService>('PostsService', [
      'get',
      'update',
      'uploadImage',
    ]) as PostsSpy;
  });

  it('pre-fills the form with the loaded post', () => {
    postsSpy.get.and.returnValue(of(makePost({ title: 'T', body: 'B' })));
    configure({ postsSpy, idParam: '42' });

    const fixture = TestBed.createComponent(AdminPostEditComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as ComponentApi;

    expect(postsSpy.get).toHaveBeenCalledWith(42);
    expect(inst.form.value).toEqual(jasmine.objectContaining({ title: 'T', body: 'B' }));
  });

  it('shows the not-found state when the backend returns 404', () => {
    postsSpy.get.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
    );
    configure({ postsSpy, idParam: '404' });

    const fixture = TestBed.createComponent(AdminPostEditComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as ComponentApi;

    expect(inst.notFound()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Post not found');
  });

  it('submits a PATCH and navigates to /admin when no new image is selected', () => {
    postsSpy.get.and.returnValue(of(makePost({ id: 42, title: 'Old', body: 'Old body' })));
    postsSpy.update.and.returnValue(of(makePost({ id: 42, title: 'New', body: 'New body' })));
    configure({ postsSpy, idParam: '42' });

    const fixture = TestBed.createComponent(AdminPostEditComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);

    const inst = fixture.componentInstance as unknown as ComponentApi;
    inst.form.setValue({ title: 'New', body: 'New body' });
    inst.submit();

    expect(postsSpy.update).toHaveBeenCalledWith(42, { title: 'New', body: 'New body' });
    expect(postsSpy.uploadImage).not.toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/admin']);
  });

  it('submits the PATCH then uploads the image when a new file is selected', () => {
    postsSpy.get.and.returnValue(of(makePost({ id: 42, title: 'Old', body: 'Old body' })));
    postsSpy.update.and.returnValue(of(makePost({ id: 42, title: 'New', body: 'New body' })));
    postsSpy.uploadImage.and.returnValue(of(makePost({ id: 42, image: '/uploads/42.png' })));
    configure({ postsSpy, idParam: '42' });

    const fixture = TestBed.createComponent(AdminPostEditComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);

    const file = new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' });
    const inst = fixture.componentInstance as unknown as ComponentApi;
    inst.onFileSelected(makeFileEvent(file));
    inst.form.setValue({ title: 'New', body: 'New body' });
    inst.submit();

    expect(postsSpy.update).toHaveBeenCalledWith(42, { title: 'New', body: 'New body' });
    expect(postsSpy.uploadImage).toHaveBeenCalledWith(42, file);
    expect(navSpy).toHaveBeenCalledWith(['/admin']);
  });

  it('navigates to /admin when Cancel is invoked', () => {
    postsSpy.get.and.returnValue(of(makePost()));
    configure({ postsSpy, idParam: '42' });

    const fixture = TestBed.createComponent(AdminPostEditComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);

    const inst = fixture.componentInstance as unknown as ComponentApi;
    inst.cancel();

    expect(navSpy).toHaveBeenCalledWith(['/admin']);
  });
});

import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Post } from '../../models/post';
import { PostsService } from '../../services/posts.service';
import { AdminPostCreateComponent } from './admin-post-create.component';

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 7,
    title: 'New',
    slug: 'new',
    body: 'body',
    image: null,
    authorId: 1,
    createdAt: '2026-05-21T10:00:00Z',
    updatedAt: '2026-05-21T10:00:00Z',
    ...overrides,
  };
}

interface PostsSpy extends jasmine.SpyObj<PostsService> {
  create: jasmine.Spy;
  uploadImage: jasmine.Spy;
}

interface ComponentApi {
  form: {
    setValue: (v: { title: string; body: string }) => void;
    controls: { title: { errors: Record<string, unknown> | null } };
  };
  submit: () => void;
  onFileSelected: (e: Event) => void;
  imageError: () => string | null;
  selectedFileName: () => string | null;
  errorMsg: () => string | null;
}

function configure(postsSpy: PostsSpy) {
  TestBed.configureTestingModule({
    imports: [AdminPostCreateComponent],
    providers: [
      { provide: PostsService, useValue: postsSpy },
      provideRouter([]),
    ],
  });
}

function makeFileEvent(file: File | null): Event {
  // Build a minimal HTMLInputElement-like target.
  const target = {
    files: file ? [file] : [],
    value: 'something',
  } as unknown as HTMLInputElement;
  return { target } as unknown as Event;
}

describe('AdminPostCreateComponent', () => {
  let postsSpy: PostsSpy;

  beforeEach(() => {
    postsSpy = jasmine.createSpyObj<PostsService>('PostsService', [
      'create',
      'uploadImage',
    ]) as PostsSpy;
  });

  it('does not submit when the form is invalid', () => {
    configure(postsSpy);
    const fixture = TestBed.createComponent(AdminPostCreateComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as ComponentApi;

    inst.submit();

    expect(postsSpy.create).not.toHaveBeenCalled();
    expect(inst.form.controls.title.errors?.['required']).toBeTruthy();
  });

  it('creates a post and navigates to /admin when no image is selected', () => {
    postsSpy.create.and.returnValue(of(makePost({ id: 12 })));
    configure(postsSpy);

    const fixture = TestBed.createComponent(AdminPostCreateComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);

    const inst = fixture.componentInstance as unknown as ComponentApi;
    inst.form.setValue({ title: 'Hello', body: 'World' });
    inst.submit();

    expect(postsSpy.create).toHaveBeenCalledWith({ title: 'Hello', body: 'World' });
    expect(postsSpy.uploadImage).not.toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/admin']);
  });

  it('creates the post and then uploads the image when one is selected', () => {
    postsSpy.create.and.returnValue(of(makePost({ id: 99 })));
    postsSpy.uploadImage.and.returnValue(of(makePost({ id: 99, image: '/uploads/99.png' })));
    configure(postsSpy);

    const fixture = TestBed.createComponent(AdminPostCreateComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);

    const file = new File([new Uint8Array([1, 2, 3])], 'pic.png', { type: 'image/png' });
    const inst = fixture.componentInstance as unknown as ComponentApi;
    inst.onFileSelected(makeFileEvent(file));
    inst.form.setValue({ title: 'Hello', body: 'World' });
    inst.submit();

    expect(postsSpy.create).toHaveBeenCalled();
    expect(postsSpy.uploadImage).toHaveBeenCalledWith(99, file);
    expect(navSpy).toHaveBeenCalledWith(['/admin']);
  });

  it('rejects non-image files client-side without calling the service', () => {
    configure(postsSpy);
    const fixture = TestBed.createComponent(AdminPostCreateComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as ComponentApi;

    const file = new File(['nope'], 'notes.txt', { type: 'text/plain' });
    inst.onFileSelected(makeFileEvent(file));

    expect(inst.imageError()).toContain('image');
    expect(inst.selectedFileName()).toBeNull();
  });

  it('rejects images larger than 5 MB client-side', () => {
    configure(postsSpy);
    const fixture = TestBed.createComponent(AdminPostCreateComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as ComponentApi;

    // Stub a file whose .size reports just over 5 MB.
    const big = new File([new Uint8Array([0])], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    inst.onFileSelected(makeFileEvent(big));

    expect(inst.imageError()).toContain('5 MB');
    expect(inst.selectedFileName()).toBeNull();
  });
});

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { Post } from '../models/post';
import { PostsService } from './posts.service';

const samplePostOut = {
  id: 1,
  title: 'Hello',
  slug: 'hello',
  body: 'World',
  image: '/uploads/1.png',
  author_id: 42,
  created_at: '2026-05-21T09:00:00Z',
  updated_at: '2026-05-21T09:05:00Z',
};

describe('PostsService', () => {
  let service: PostsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PostsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() maps snake_case rows to camelCase Post[]', () => {
    let received: Post[] | undefined;
    service.list().subscribe((rows) => (received = rows));

    const req = httpMock.expectOne('http://localhost:8000/posts');
    expect(req.request.method).toBe('GET');
    req.flush([samplePostOut]);

    expect(received?.length).toBe(1);
    expect(received?.[0].authorId).toBe(42);
    expect(received?.[0].createdAt).toBe('2026-05-21T09:00:00Z');
    expect(received?.[0].updatedAt).toBe('2026-05-21T09:05:00Z');
  });

  it('get(id) maps a single post', () => {
    let received: Post | undefined;
    service.get(1).subscribe((p) => (received = p));

    httpMock.expectOne('http://localhost:8000/posts/1').flush(samplePostOut);

    expect(received?.id).toBe(1);
    expect(received?.authorId).toBe(42);
  });

  it('create() POSTs the body and maps the response', () => {
    let received: Post | undefined;
    service.create({ title: 'Hello', body: 'World' }).subscribe((p) => (received = p));

    const req = httpMock.expectOne('http://localhost:8000/posts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Hello', body: 'World' });
    req.flush(samplePostOut);

    expect(received?.slug).toBe('hello');
    expect(received?.authorId).toBe(42);
  });

  it('uploadImage() sends multipart form-data under field "file"', () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    const file = new File([blob], 'p.png', { type: 'image/png' });
    service.uploadImage(1, file).subscribe();

    const req = httpMock.expectOne('http://localhost:8000/posts/1/image');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush(samplePostOut);
  });
});

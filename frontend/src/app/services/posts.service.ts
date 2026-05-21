import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Post, PostCreate, PostUpdate } from '../models/post';
import { ApiConfigService } from './api-config.service';

/**
 * Backend returns snake_case. We map to camelCase Post objects at this
 * service boundary so the rest of the app never sees `author_id` / `created_at`.
 */
interface PostOut {
  id: number;
  title: string;
  slug: string;
  body: string;
  image: string | null;
  author_id: number;
  created_at: string;
  updated_at: string;
}

function mapPost(raw: PostOut): Post {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    body: raw.body,
    image: raw.image,
    authorId: raw.author_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  list(): Observable<Post[]> {
    return this.http
      .get<PostOut[]>(this.api.buildUrl('/posts'))
      .pipe(map((rows) => rows.map(mapPost)));
  }

  get(id: number): Observable<Post> {
    return this.http
      .get<PostOut>(this.api.buildUrl(`/posts/${id}`))
      .pipe(map(mapPost));
  }

  create(req: PostCreate): Observable<Post> {
    return this.http
      .post<PostOut>(this.api.buildUrl('/posts'), req)
      .pipe(map(mapPost));
  }

  update(id: number, req: PostUpdate): Observable<Post> {
    return this.http
      .patch<PostOut>(this.api.buildUrl(`/posts/${id}`), req)
      .pipe(map(mapPost));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.api.buildUrl(`/posts/${id}`));
  }

  uploadImage(id: number, file: File): Observable<Post> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<PostOut>(this.api.buildUrl(`/posts/${id}/image`), form)
      .pipe(map(mapPost));
  }
}

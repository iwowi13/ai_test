import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Observable, of, switchMap } from 'rxjs';

import { Post } from '../../models/post';
import { PostsService } from '../../services/posts.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-admin-post-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-post-edit.component.html',
  styleUrl: './admin-post-edit.component.scss',
})
export class AdminPostEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly imageError = signal<string | null>(null);
  protected readonly selectedFileName = signal<string | null>(null);

  private postId: number | null = null;
  private selectedFile: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    body: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam !== null ? Number(idParam) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.postId = id;
    this.postsService.get(id).subscribe({
      next: (post: Post) => {
        this.form.setValue({ title: post.title, body: post.body });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.notFound.set(true);
        } else {
          this.loadError.set('Could not load post.');
        }
        this.loading.set(false);
      },
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageError.set(null);

    if (!file) {
      this.selectedFile = null;
      this.selectedFileName.set(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.imageError.set('File must be an image.');
      this.selectedFile = null;
      this.selectedFileName.set(null);
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.imageError.set('Image must be 5 MB or smaller.');
      this.selectedFile = null;
      this.selectedFileName.set(null);
      input.value = '';
      return;
    }
    this.selectedFile = file;
    this.selectedFileName.set(file.name);
  }

  protected submit(): void {
    if (this.form.invalid || this.postId === null) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.imageError()) {
      return;
    }
    this.submitting.set(true);
    this.errorMsg.set(null);

    const id = this.postId;
    const file = this.selectedFile;
    this.postsService
      .update(id, this.form.getRawValue())
      .pipe(
        switchMap((post: Post): Observable<Post> =>
          file ? this.postsService.uploadImage(post.id, file) : of(post),
        ),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/admin']);
        },
        error: (err: unknown) => {
          const status = err instanceof HttpErrorResponse ? err.status : 0;
          if (status === 403) {
            this.errorMsg.set("You can't edit this post — not your post.");
          } else if (status === 404) {
            this.errorMsg.set('Post was deleted while you were editing.');
          } else if (status === 413) {
            this.errorMsg.set('Image is too large (5 MB max).');
          } else if (status === 400) {
            this.errorMsg.set('Server rejected the image.');
          } else {
            this.errorMsg.set('Could not save changes, try again.');
          }
        },
      });
  }

  protected cancel(): void {
    void this.router.navigate(['/admin']);
  }
}


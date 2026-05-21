import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, Observable, of, switchMap } from 'rxjs';

import { Post } from '../../models/post';
import { PostsService } from '../../services/posts.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // mirror backend cap

@Component({
  selector: 'app-admin-post-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-post-create.component.html',
  styleUrl: './admin-post-create.component.scss',
})
export class AdminPostCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly imageError = signal<string | null>(null);
  protected readonly selectedFileName = signal<string | null>(null);

  private selectedFile: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    body: ['', [Validators.required]],
  });

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageError.set(null);

    if (!file) {
      this.selectedFile = null;
      this.selectedFileName.set(null);
      return;
    }
    // Mirror the backend rules so the user gets feedback before the upload.
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Don't proceed if the chosen image was rejected client-side.
    if (this.imageError()) {
      return;
    }
    this.submitting.set(true);
    this.errorMsg.set(null);

    const file = this.selectedFile;
    this.postsService
      .create(this.form.getRawValue())
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
          if (status === 401) {
            this.errorMsg.set('You are not signed in.');
          } else if (status === 413) {
            this.errorMsg.set('Image is too large (5 MB max).');
          } else if (status === 400) {
            this.errorMsg.set('Server rejected the image.');
          } else {
            this.errorMsg.set('Could not create post, try again.');
          }
        },
      });
  }
}


import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { Post } from '../../models/post';
import { PostsService } from '../../services/posts.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);

  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.postsService.list().subscribe({
      next: (rows) => {
        this.posts.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load posts.');
        this.loading.set(false);
      },
    });
  }

  protected edit(post: Post): void {
    void this.router.navigate(['/admin/posts', post.id, 'edit']);
  }

  protected newPost(): void {
    void this.router.navigate(['/admin/posts/new']);
  }

  protected delete(post: Post): void {
    // Native confirm — small UX, no need for a dialog component yet.
    if (!confirm(`Delete "${post.title}"?`)) {
      return;
    }
    this.deleteError.set(null);
    this.postsService.delete(post.id).subscribe({
      next: () => {
        this.posts.update((rows) => rows.filter((p) => p.id !== post.id));
      },
      error: (err: unknown) => {
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        this.deleteError.set(
          status === 403
            ? `You can't delete "${post.title}" — not your post.`
            : `Could not delete "${post.title}".`,
        );
      },
    });
  }
}


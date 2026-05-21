import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Post } from '../../models/post';
import { ApiConfigService } from '../../services/api-config.service';
import { PostsService } from '../../services/posts.service';

const EXCERPT_LIMIT = 500;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  protected readonly apiConfig = inject(ApiConfigService);

  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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

  protected imageFor(post: Post): string {
    return post.image ? this.apiConfig.buildUrl(post.image) : '/placeholder.svg';
  }

  protected excerpt(body: string): string {
    if (body.length <= EXCERPT_LIMIT) {
      return body;
    }
    return body.slice(0, EXCERPT_LIMIT) + '…';
  }
}

import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

/**
 * Small helper exposing the configured API base URL and a builder
 * for full request URLs. Keeps the apiBase string out of every service.
 */
@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  readonly apiBase = environment.apiBase;

  buildUrl(path: string): string {
    if (!path.startsWith('/')) {
      return `${this.apiBase}/${path}`;
    }
    return `${this.apiBase}${path}`;
  }
}

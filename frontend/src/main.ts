import { bootstrapApplication } from '@angular/platform-browser';
import { register as registerSwiperElements } from 'swiper/element/bundle';

import { appConfig } from './app/app.config';
import { App } from './app/app';

// Register <swiper-container> / <swiper-slide> as custom elements once,
// before Angular bootstraps anything that uses them.
registerSwiperElements();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

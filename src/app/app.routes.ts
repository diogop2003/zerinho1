import {
  Routes
} from '@angular/router';

import {
  Setup
} from './pages/setup/setup';

import {
  Draft
} from './pages/draft/draft';

import {
  Result
} from './pages/results/results';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'setup',
    pathMatch: 'full'
  },

  {
    path: 'setup',
    component: Setup
  },

  {
    path: 'draft',
    component: Draft
  },

  {
    path: 'result',
    component: Result
  },

  {
    path: '**',
    redirectTo: 'setup'
  }

];
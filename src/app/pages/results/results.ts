import {
  Component,
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  GameService
} from '../../core/services/game';

@Component({
  selector: 'app-result',

  standalone: true,

  templateUrl: './results.html',

  styleUrl: './results.scss'
})
export class Result {

  gameService =
    inject(GameService);

  router =
    inject(Router);

  users =
    this.gameService.users;

  // ============================================================
  // NOVA PARTIDA
  // ============================================================

  newGame(): void {

    this.gameService.resetGame();

    this.router.navigate([
      '/setup'
    ]);
  }
}
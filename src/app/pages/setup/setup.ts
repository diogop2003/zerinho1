import {
  Component
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  GameService
} from '../../core/services/game';

import {
  PLAYERS
} from '../../data/players';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './setup.html',
  styleUrl: './setup.scss'
})
export class Setup {

  playerCount = 2;

  names: string[] = [];

  constructor(
    public gameService: GameService,
    private router: Router
  ) {
    this.updateNames();
  }

  // ============================================================
  // AUMENTAR PARTICIPANTES
  // ============================================================

  increasePlayers(): void {

    if (
      this.playerCount >=
      this.gameService.MAX_USERS
    ) {
      return;
    }

    this.playerCount++;

    this.updateNames();
  }

  // ============================================================
  // DIMINUIR PARTICIPANTES
  // ============================================================

  decreasePlayers(): void {

    if (
      this.playerCount <= 2
    ) {
      return;
    }

    this.playerCount--;

    this.updateNames();
  }

  // ============================================================
  // ATUALIZAR CAMPOS
  // ============================================================

  updateNames(): void {

    const oldNames =
      this.names;

    this.names =
      Array.from(
        {
          length:
            this.playerCount
        },

        (_, index) =>
          oldNames[index] ?? ''
      );
  }

  // ============================================================
  // INICIAR PARTIDA
  // ============================================================

  startGame(): void {

    const cleanNames =
      this.names.map(
        name =>
          name.trim()
      );

    // ----------------------------------------------------------
    // NOMES PREENCHIDOS
    // ----------------------------------------------------------

    if (
      cleanNames.some(
        name => !name
      )
    ) {

      alert(
        'Preencha o nome de todos os participantes.'
      );

      return;
    }

    // ----------------------------------------------------------
    // NOMES ÚNICOS
    // ----------------------------------------------------------

    const uniqueNames =
      new Set(
        cleanNames.map(
          name =>
            name.toLowerCase()
        )
      );

    if (
      uniqueNames.size !==
      cleanNames.length
    ) {

      alert(
        'Os nomes dos participantes devem ser diferentes.'
      );

      return;
    }

    // ----------------------------------------------------------
    // QUANTIDADE DE JOGADORES
    // ----------------------------------------------------------

    const requiredPlayers =
      cleanNames.length *
      this.gameService.TEAM_SIZE;

    if (
      PLAYERS.length <
      requiredPlayers
    ) {

      alert(
        `São necessários pelo menos ${requiredPlayers} jogadores para esta partida.`
      );

      return;
    }

    // ----------------------------------------------------------
    // INICIA A PARTIDA
    // ----------------------------------------------------------

    try {

      this.gameService.startGame(
        cleanNames
      );

      // Importante:
      // startGame() acontece ANTES da navegação.

      this.router.navigate([
        '/draft'
      ]);

    } catch (error) {

      alert(
        error instanceof Error
          ? error.message
          : 'Não foi possível iniciar a partida.'
      );
    }
  }
}
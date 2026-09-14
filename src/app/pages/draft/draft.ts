import {
  Component,
  computed,
  inject,
  OnInit
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

@Component({
  selector: 'app-draft',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './draft.html',
  styleUrl: './draft.scss'
})
export class Draft implements OnInit {

  public gameService =
    inject(GameService);

  private router =
    inject(Router);

  // ============================================================
  // ESTADO LOCAL
  // ============================================================

  bids: Record<number, number> = {};

  submitting = false;

  auctionCompleted = false;

  message = '';

  winnerName = '';

  winningBid = 0;

  // ============================================================
  // PROTEÇÃO DA PÁGINA
  // ============================================================

  ngOnInit(): void {

    /*
     * Se /draft for acessado diretamente ou
     * a página for atualizada, o GameService
     * não terá uma partida em memória.
     *
     * Nesse caso não devemos mostrar
     * "Draft finalizado".
     */

    if (
      !this.gameService.gameStarted()
    ) {

      this.router.navigate([
        '/setup'
      ]);
    }
  }

  // ============================================================
  // JOGADOR ATUAL
  // ============================================================

  currentPlayer = computed(
    () =>
      this.gameService.currentPlayer()
  );

  // ============================================================
  // USUÁRIOS
  // ============================================================

  users = computed(
    () =>
      this.gameService.users()
  );

  // ============================================================
  // RECRUTAMENTO
  // ============================================================

  recruitablePlayers = computed(
    () =>
      this.gameService.recruitablePlayers()
  );

  recruitmentStarted = computed(
    () =>
      this.gameService.recruitmentStarted()
  );

  recruitmentFinished = computed(
    () =>
      this.gameService.recruitmentFinished()
  );

  // ============================================================
  // PROGRESSO
  // ============================================================

  getProgressWidth(
    teamSize: number
  ): number {

    if (
      teamSize <= 0
    ) {
      return 0;
    }

    return Math.min(
      (
        teamSize /
        this.gameService.TEAM_SIZE
      ) * 100,
      100
    );
  }

  // ============================================================
  // ENVIAR LANCES
  // ============================================================

  submitBids(): void {

    if (
      this.auctionCompleted
    ) {
      return;
    }

    const player =
      this.currentPlayer();

    if (!player) {
      return;
    }

    this.submitting = true;

    this.message = '';

    try {

      const bids =
        this.users().map(
          user => ({
            userId: user.id,

            amount:
              Number(
                this.bids[user.id] ?? 0
              )
          })
        );

      const result =
        this.gameService.submitBids(
          bids
        );

      if (!result) {
        return;
      }

      // --------------------------------------------------------
      // EMPATE
      // --------------------------------------------------------

      if (
        result.tie
      ) {

        this.message =
          `Empate com lance de ${result.winningBid} moedas. Ajuste os lances e tente novamente.`;

        /*
         * Importante:
         * NÃO marcamos auctionCompleted.
         *
         * O mesmo jogador continua na tela
         * para que os jogadores possam corrigir
         * os lances.
         */

        this.auctionCompleted = false;

        return;
      }

      // --------------------------------------------------------
      // NINGUÉM DEU LANCE
      // --------------------------------------------------------

      if (
        result.winnerId === null
      ) {

        this.message =
          `${player.name} ficou disponível para recrutamento.`;

        this.auctionCompleted = true;

        this.finishLastAuctionRound();

        return;
      }

      // --------------------------------------------------------
      // VENCEDOR
      // --------------------------------------------------------

      const winner =
        this.gameService.getUser(
          result.winnerId
        );

      this.winnerName =
        winner?.name ?? '';

      this.winningBid =
        result.winningBid;

      this.message =
        `${player.name} foi para ${this.winnerName} por ${this.winningBid} moedas.`;

      this.auctionCompleted = true;

      this.finishLastAuctionRound();

    } catch (error) {

      this.message =
        error instanceof Error
          ? error.message
          : 'Erro ao processar os lances.';

    } finally {

      this.submitting = false;
    }
  }

  /**
   * Depois do último jogador não existe mais card nem botão "Próximo".
   * A mudança para o recrutamento precisa acontecer imediatamente.
   */
  private finishLastAuctionRound(): void {

    if (
      this.gameService.availablePlayers().length > 0
    ) {
      return;
    }

    this.auctionCompleted = false;

    this.gameService.continueAfterAuction();
  }

  // ============================================================
  // PRÓXIMO JOGADOR
  // ============================================================

  nextPlayer(): void {

    if (
      !this.auctionCompleted
    ) {
      return;
    }

    this.bids = {};

    this.message = '';

    this.winnerName = '';

    this.winningBid = 0;

    this.auctionCompleted = false;

    this.gameService
      .continueAfterAuction();

    // Se o leilão acabou,
    // o HTML automaticamente muda
    // para a tela de recrutamento.
  }

  // ============================================================
  // RECRUTAMENTO AUTOMÁTICO
  // ============================================================

  autoRecruit(): void {

    try {

      this.gameService.autoRecruit();

      if (
        this.gameService.recruitmentFinished()
      ) {

        this.message =
          'Todos os times foram completados automaticamente.';

      } else if (
        this.gameService
          .recruitablePlayers()
          .length === 0
      ) {

        this.message =
          'Não há mais jogadores disponíveis para recrutamento.';

      } else {

        this.message =
          'Os jogadores foram distribuídos automaticamente.';
      }

    } catch (error) {

      this.message =
        error instanceof Error
          ? error.message
          : 'Erro ao recrutar jogadores.';
    }
  }

  // ============================================================
  // RECRUTAMENTO MANUAL
  // ============================================================

  recruitPlayer(
    userId: number,
    playerId: number
  ): void {

    try {

      this.gameService.recruitPlayer(
        userId,
        playerId
      );

      this.message = '';

      if (
        this.gameService
          .recruitmentFinished()
      ) {

        this.message =
          'Todos os times foram completados.';
      }

    } catch (error) {

      this.message =
        error instanceof Error
          ? error.message
          : 'Erro ao recrutar jogador.';
    }
  }

  // ============================================================
  // TAMANHO DO TIME
  // ============================================================

  getTeamSize(
    userId: number
  ): number {

    return this.gameService
      .getUserTeam(userId)
      .length;
  }

  // ============================================================
  // MAIOR LANCE POSSÍVEL
  // ============================================================

  getMaxBid(
    userId: number
  ): number {

    return this.gameService
      .getUser(userId)
      ?.coins ?? 0;
  }

  // ============================================================
  // RESULTADOS
  // ============================================================

  goToResult(): void {

    if (!this.gameService.recruitmentFinished()) {
      this.message =
        'Todos os times precisam ter 18 jogadores antes de ver os resultados.';
      return;
    }

    this.router.navigate(['/result']);
  }

  // ============================================================
  // VOLTAR PARA CONFIGURAÇÃO
  // ============================================================

  goToSetup(): void {
    this.gameService.resetGame();
    this.router.navigate(['/setup']);
  }
}

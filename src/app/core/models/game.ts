import {
  Injectable,
  computed,
  signal
} from '@angular/core';

import { Player } from '../models/player';
import { PLAYERS } from '../../data/players';

export interface User {
  id: number;
  name: string;
  coins: number;
  team: Player[];
}

export interface Bid {
  userId: number;
  amount: number;
}

export interface BidResult {
  winnerId: number | null;
  winningBid: number;
  tie: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {

  // ============================================================
  // CONFIGURAÇÕES
  // ============================================================

  readonly STARTING_COINS = 200;

  readonly TEAM_SIZE = 18;

  readonly MAX_USERS = 4;

  // ============================================================
  // ESTADO DO JOGO
  // ============================================================

  private readonly _users =
    signal<User[]>([]);

  private readonly _players =
    signal<Player[]>([...PLAYERS]);

  private readonly _availablePlayers =
    signal<Player[]>([...PLAYERS]);

  private readonly _recruitablePlayers =
    signal<Player[]>([]);

  private readonly _currentPlayerIndex =
    signal(0);

  private readonly _recruitmentStarted =
    signal(false);

  private readonly _recruitmentFinished =
    signal(false);

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor() {

    console.log('🎮 GAME SERVICE INICIADO');

    console.log(
      '📦 PLAYERS importados:',
      PLAYERS.length
    );

    console.log(
      '🎯 Jogadores disponíveis:',
      this._availablePlayers().length
    );
  }

  // ============================================================
  // SIGNALS PÚBLICOS
  // ============================================================

  readonly users =
    this._users.asReadonly();

  readonly players =
    this._players.asReadonly();

  readonly currentPlayerIndex =
    this._currentPlayerIndex.asReadonly();

  readonly recruitmentStarted =
    this._recruitmentStarted.asReadonly();

  readonly recruitmentFinished =
    this._recruitmentFinished.asReadonly();

  // ============================================================
  // COMPUTEDS
  // ============================================================

  readonly currentPlayer =
    computed(() => {

      if (
        this._recruitmentStarted()
      ) {
        return null;
      }

      const players =
        this._availablePlayers();

      const index =
        this._currentPlayerIndex();

      return players[index] ?? null;
    });

  readonly availablePlayers =
    computed(() => {

      return this._availablePlayers();

    });

  readonly recruitablePlayers =
    computed(() => {

      return this._recruitablePlayers();

    });

  // ============================================================
  // INICIAR PARTIDA
  // ============================================================

  startGame(names: string[]): void {

    console.log('');
    console.log('🚀 GAME SERVICE - START GAME');
    console.log(
      '👥 Participantes:',
      names
    );

    // ----------------------------------------------------------
    // VALIDAÇÃO DE PARTICIPANTES
    // ----------------------------------------------------------

    if (names.length < 1) {

      throw new Error(
        'É necessário pelo menos 1 participante.'
      );

    }

    if (
      names.length >
      this.MAX_USERS
    ) {

      throw new Error(
        `O máximo é de ${this.MAX_USERS} participantes.`
      );

    }

    // ----------------------------------------------------------
    // VALIDAÇÃO DE JOGADORES
    // ----------------------------------------------------------

    const requiredPlayers =
      names.length *
      this.TEAM_SIZE;

    console.log(
      '🎯 Jogadores necessários:',
      requiredPlayers
    );

    console.log(
      '🎮 Jogadores disponíveis:',
      PLAYERS.length
    );

    if (
      PLAYERS.length <
      requiredPlayers
    ) {

      throw new Error(
        `São necessários pelo menos ${requiredPlayers} jogadores para esta partida.`
      );

    }

    // ----------------------------------------------------------
    // CRIA USUÁRIOS
    // ----------------------------------------------------------

    const users: User[] =
      names.map(
        (name, index) => ({

          id: index + 1,

          name,

          coins:
            this.STARTING_COINS,

          team: []

        })
      );

    // ----------------------------------------------------------
    // EMBARALHA JOGADORES
    // ----------------------------------------------------------

    const shuffledPlayers =
      this.shuffleArray(
        [...PLAYERS]
      );

    // ----------------------------------------------------------
    // RESET DO ESTADO
    // ----------------------------------------------------------

    this._users.set(
      users
    );

    this._players.set(
      shuffledPlayers
    );

    this._availablePlayers.set(
      shuffledPlayers
    );

    this._recruitablePlayers.set(
      []
    );

    this._currentPlayerIndex.set(
      0
    );

    this._recruitmentStarted.set(
      false
    );

    this._recruitmentFinished.set(
      false
    );

    console.log(
      '✅ PARTIDA INICIADA'
    );

    console.log(
      '👥 Usuários:',
      this._users()
    );

    console.log(
      '🎮 Jogadores disponíveis:',
      this._availablePlayers().length
    );

    console.log(
      '⭐ Primeiro jogador:',
      this.currentPlayer()
    );
  }

  // ============================================================
  // EMBARALHAR ARRAY
  // ============================================================

  private shuffleArray<T>(
    array: T[]
  ): T[] {

    for (
      let i = array.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );

      [
        array[i],
        array[j]
      ] = [
        array[j],
        array[i]
      ];

    }

    return array;
  }

  // ============================================================
  // ENVIAR LANCES
  // ============================================================

  submitBids(
    bids: Bid[]
  ): BidResult | null {

    const player =
      this.currentPlayer();

    if (!player) {

      console.log(
        '⚠️ Nenhum jogador atual.'
      );

      return null;

    }

    const users =
      this._users();

    // ----------------------------------------------------------
    // NORMALIZA OS LANCES
    // ----------------------------------------------------------

    const normalizedBids =
      users.map(user => {

        const bid =
          bids.find(
            item =>
              item.userId ===
              user.id
          );

        const amount =
          Math.max(
            0,
            Math.floor(
              Number(
                bid?.amount ?? 0
              )
            )
          );

        // ------------------------------------------------------
        // VERIFICA SALDO
        // ------------------------------------------------------

        if (
          amount >
          user.coins
        ) {

          throw new Error(
            `${user.name} não possui moedas suficientes.`
          );

        }

        return {
          userId: user.id,
          amount
        };

      });

    // ----------------------------------------------------------
    // MAIOR LANCE
    // ----------------------------------------------------------

    const highestBid =
      Math.max(
        ...normalizedBids.map(
          bid => bid.amount
        )
      );

    // ----------------------------------------------------------
    // NINGUÉM DEU LANCE
    // ----------------------------------------------------------

    if (
      highestBid <= 0
    ) {

      console.log(
        `⚪ ${player.name} não recebeu nenhum lance.`
      );

      this.addToRecruitment(
        player
      );

      return {
        winnerId: null,
        winningBid: 0,
        tie: false
      };

    }

    // ----------------------------------------------------------
    // PARTICIPANTES COM MAIOR LANCE
    // ----------------------------------------------------------

    const winners =
      normalizedBids.filter(
        bid =>
          bid.amount ===
          highestBid
      );

    // ----------------------------------------------------------
    // EMPATE
    // ----------------------------------------------------------

    if (
      winners.length > 1
    ) {

      console.log(
        '🤝 EMPATE',
        winners
      );

      return {
        winnerId: null,
        winningBid: highestBid,
        tie: true
      };

    }

    // ----------------------------------------------------------
    // VENCEDOR
    // ----------------------------------------------------------

    const winner =
      winners[0];

    const winnerUser =
      users.find(
        user =>
          user.id ===
          winner.userId
      );

    if (!winnerUser) {

      throw new Error(
        'Usuário vencedor não encontrado.'
      );

    }

    // ----------------------------------------------------------
    // DESCONTA MOEDAS E ADICIONA AO TIME
    // ----------------------------------------------------------

    const updatedUsers =
      users.map(user => {

        if (
          user.id !==
          winner.userId
        ) {

          return user;

        }

        return {

          ...user,

          coins:
            user.coins -
            highestBid,

          team: [
            ...user.team,
            player
          ]

        };

      });

    this._users.set(
      updatedUsers
    );

    // ----------------------------------------------------------
    // REMOVE JOGADOR DOS DISPONÍVEIS
    // ----------------------------------------------------------

    this.removePlayerFromAvailable(
      player.id
    );

    console.log(
      `🏆 ${player.name} foi para ${winnerUser.name}`
    );

    console.log(
      `💰 Lance: ${highestBid}`
    );

    console.log(
      `👥 Time de ${winnerUser.name}:`,
      updatedUsers.find(
        user =>
          user.id ===
          winnerUser.id
      )?.team.length
    );

    return {

      winnerId:
        winner.userId,

      winningBid:
        highestBid,

      tie: false

    };
  }

  // ============================================================
  // JOGADOR SEM LANCE
  // ============================================================

  private addToRecruitment(
    player: Player
  ): void {

    const alreadyExists =
      this._recruitablePlayers()
        .some(
          item =>
            item.id ===
            player.id
        );

    if (
      alreadyExists
    ) {

      return;

    }

    this._recruitablePlayers.set([
      ...this._recruitablePlayers(),
      player
    ]);

    this.removePlayerFromAvailable(
      player.id
    );

  }

  // ============================================================
  // REMOVER JOGADOR DOS DISPONÍVEIS
  // ============================================================

  private removePlayerFromAvailable(
    playerId: number
  ): void {

    this._availablePlayers.set(

      this._availablePlayers()
        .filter(
          player =>
            player.id !==
            playerId
        )

    );

    // ----------------------------------------------------------
    // IMPORTANTE
    //
    // Não incrementamos o índice aqui.
    //
    // O próximo jogador ocupa a mesma posição
    // depois que o atual é removido.
    // ----------------------------------------------------------

    const available =
      this._availablePlayers();

    const currentIndex =
      this._currentPlayerIndex();

    if (
      currentIndex >=
      available.length
    ) {

      this._currentPlayerIndex.set(
        Math.max(
          0,
          available.length - 1
        )
      );

    }

  }

  // ============================================================
  // CONTINUAR APÓS LEILÃO
  // ============================================================

  continueAfterAuction(): void {

    console.log(
      '➡️ CONTINUANDO LEILÃO'
    );

    // ----------------------------------------------------------
    // VERIFICA SE TODOS OS TIMES ESTÃO COMPLETOS
    // ----------------------------------------------------------

    if (
      this.allTeamsComplete()
    ) {

      console.log(
        '🏆 TODOS OS TIMES ESTÃO COMPLETOS'
      );

      this._recruitmentFinished.set(
        true
      );

      return;

    }

    // ----------------------------------------------------------
    // VERIFICA JOGADORES DISPONÍVEIS
    // ----------------------------------------------------------

    const available =
      this._availablePlayers();

    const index =
      this._currentPlayerIndex();

    console.log(
      '📊 Jogadores disponíveis:',
      available.length
    );

    console.log(
      '📍 Índice atual:',
      index
    );

    // ----------------------------------------------------------
    // COMO O JOGADOR ANTERIOR FOI REMOVIDO,
    // O PRÓXIMO JOGADOR JÁ ESTÁ NO MESMO ÍNDICE.
    // ----------------------------------------------------------

    if (
      index <
      available.length
    ) {

      console.log(
        '➡️ Próximo jogador:',
        available[index]
      );

      return;

    }

    // ----------------------------------------------------------
    // NÃO HÁ MAIS JOGADORES PARA LEILÃO
    // ----------------------------------------------------------

    console.log(
      '🏁 LEILÃO TERMINOU'
    );

    this.startRecruitment();
  }

  // ============================================================
  // INICIAR RECRUTAMENTO
  // ============================================================

  private startRecruitment(): void {

    console.log(
      '🧩 INICIANDO RECRUTAMENTO'
    );

    this._recruitmentStarted.set(
      true
    );

    this.updateRecruitmentFinished();
  }

  // ============================================================
  // RECRUTAMENTO AUTOMÁTICO
  // ============================================================

  autoRecruit(): void {

    if (
      !this._recruitmentStarted()
    ) {

      console.log(
        '⚠️ Recrutamento ainda não começou.'
      );

      return;

    }

    let users =
      [...this._users()];

    let players =
      [
        ...this._recruitablePlayers()
      ];

    console.log(
      '🤖 RECRUTAMENTO AUTOMÁTICO'
    );

    // ----------------------------------------------------------
    // PREENCHE OS TIMES
    // ----------------------------------------------------------

    for (
      const user of users
    ) {

      while (

        user.team.length <
          this.TEAM_SIZE &&

        players.length > 0

      ) {

        const player =
          players.shift();

        if (!player) {

          break;

        }

        user.team = [
          ...user.team,
          player
        ];

      }

    }

    // ----------------------------------------------------------
    // ATUALIZA ESTADO
    // ----------------------------------------------------------

    this._users.set(
      users
    );

    this._recruitablePlayers.set(
      players
    );

    this.updateRecruitmentFinished();

  }

  // ============================================================
  // RECRUTAMENTO MANUAL
  // ============================================================

  recruitPlayer(
    userId: number,
    playerId: number
  ): void {

    if (
      !this._recruitmentStarted()
    ) {

      return;

    }

    const player =
      this._recruitablePlayers()
        .find(
          item =>
            item.id ===
            playerId
        );

    if (!player) {

      throw new Error(
        'Jogador não está disponível para recrutamento.'
      );

    }

    const users =
      [...this._users()];

    const user =
      users.find(
        item =>
          item.id ===
          userId
      );

    if (!user) {

      throw new Error(
        'Usuário não encontrado.'
      );

    }

    if (
      user.team.length >=
      this.TEAM_SIZE
    ) {

      throw new Error(
        `${user.name} já possui 18 jogadores.`
      );

    }

    // ----------------------------------------------------------
    // RECRUTAMENTO GRATUITO
    // ----------------------------------------------------------

    user.team = [
      ...user.team,
      player
    ];

    // ----------------------------------------------------------
    // REMOVE DA LISTA
    // ----------------------------------------------------------

    this._users.set(
      users
    );

    this._recruitablePlayers.set(

      this._recruitablePlayers()
        .filter(
          item =>
            item.id !==
            playerId
        )

    );

    console.log(
      `📝 ${player.name} recrutado por ${user.name}`
    );

    this.updateRecruitmentFinished();

  }

  // ============================================================
  // VERIFICAR TIMES COMPLETOS
  // ============================================================

  private allTeamsComplete(): boolean {

    const users =
      this._users();

    if (
      users.length === 0
    ) {

      return false;

    }

    return users.every(
      user =>
        user.team.length ===
        this.TEAM_SIZE
    );

  }

  // ============================================================
  // FINALIZAR RECRUTAMENTO
  // ============================================================

  private updateRecruitmentFinished(): void {

    const complete =
      this.allTeamsComplete();

    console.log(
      '🔎 Times completos:',
      complete
    );

    if (complete) {

      console.log(
        '🏆 RECRUTAMENTO FINALIZADO'
      );

      this._recruitmentFinished.set(
        true
      );

      return;

    }

    this._recruitmentFinished.set(
      false
    );

  }

  // ============================================================
  // PEGAR USUÁRIO
  // ============================================================

  getUser(
    userId: number
  ): User | undefined {

    return this._users()
      .find(
        user =>
          user.id ===
          userId
      );

  }

  // ============================================================
  // PEGAR TIME
  // ============================================================

  getUserTeam(
    userId: number
  ): Player[] {

    return (
      this.getUser(userId)
        ?.team ?? []
    );

  }

  // ============================================================
  // RESETAR PARTIDA
  // ============================================================

  resetGame(): void {

    console.log(
      '🔄 RESETANDO GAME'
    );

    this._users.set([]);

    // ----------------------------------------------------------
    // IMPORTANTE:
    // NÃO deixamos players vazio.
    // O Setup precisa conseguir enxergar as cartas.
    // ----------------------------------------------------------

    const resetPlayers =
      [...PLAYERS];

    this._players.set(
      resetPlayers
    );

    this._availablePlayers.set(
      resetPlayers
    );

    this._recruitablePlayers.set(
      []
    );

    this._currentPlayerIndex.set(
      0
    );

    this._recruitmentStarted.set(
      false
    );

    this._recruitmentFinished.set(
      false
    );

    console.log(
      '🎮 Jogadores restaurados:',
      resetPlayers.length
    );

  }
}
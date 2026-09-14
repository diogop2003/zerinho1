import { Injectable, computed, signal } from '@angular/core';

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

  readonly STARTING_COINS = 200;
  readonly TEAM_SIZE = 18;
  readonly MAX_USERS = Math.min(4, Math.floor(PLAYERS.length / this.TEAM_SIZE));

  private readonly _users = signal<User[]>([]);
  private readonly _players = signal<Player[]>([]);

  /** Jogadores que ainda não foram resolvidos no leilão. */
  private readonly _availablePlayers = signal<Player[]>([]);

  /** Jogadores que não receberam nenhum lance e aguardam recrutamento. */
  private readonly _recruitablePlayers = signal<Player[]>([]);

  /** Número da rodada do leilão. Não é o índice da lista mutável. */
  private readonly _currentPlayerIndex = signal(0);

  private readonly _recruitmentStarted = signal(false);
  private readonly _recruitmentFinished = signal(false);

  readonly users = this._users.asReadonly();
  readonly players = this._players.asReadonly();
  readonly availablePlayers = this._availablePlayers.asReadonly();
  readonly currentPlayerIndex = this._currentPlayerIndex.asReadonly();
  readonly recruitmentStarted = this._recruitmentStarted.asReadonly();
  readonly recruitmentFinished = this._recruitmentFinished.asReadonly();

  readonly remainingTeamSlots = computed(() =>
    this._users().reduce(
      (total, user) => total + Math.max(0, this.TEAM_SIZE - user.team.length),
      0
    )
  );

  readonly gameStarted = computed(() =>
    this._users().length > 0 && this._players().length > 0
  );

  /**
   * O jogador atual é SEMPRE o primeiro jogador ainda não resolvido.
   * Assim, remover jogadores da lista nunca quebra o índice da rodada.
   */
  readonly currentPlayer = computed<Player | null>(() => {
    if (!this.gameStarted() || this._recruitmentStarted()) {
      return null;
    }

    return this._availablePlayers()[0] ?? null;
  });

  readonly recruitablePlayers = computed(() =>
    this._recruitablePlayers()
  );

  startGame(names: string[]): void {
    const cleanNames = names.map(name => name.trim());

    if (cleanNames.length < 1) {
      throw new Error('É necessário pelo menos 1 participante.');
    }

    if (cleanNames.length > this.MAX_USERS) {
      throw new Error(`O máximo é de ${this.MAX_USERS} participantes.`);
    }

    if (cleanNames.some(name => !name)) {
      throw new Error('Preencha o nome de todos os participantes.');
    }

    const normalizedNames = cleanNames.map(name => name.toLocaleLowerCase());
    if (new Set(normalizedNames).size !== cleanNames.length) {
      throw new Error('Os nomes dos participantes devem ser diferentes.');
    }

    const requiredPlayers = cleanNames.length * this.TEAM_SIZE;
    if (PLAYERS.length < requiredPlayers) {
      throw new Error(
        `São necessários pelo menos ${requiredPlayers} jogadores para esta partida. ` +
        `A lista atual possui ${PLAYERS.length}.`
      );
    }

    const users: User[] = cleanNames.map((name, index) => ({
      id: index + 1,
      name,
      coins: this.STARTING_COINS,
      team: []
    }));

    const shuffledPlayers = this.shuffleArray([...PLAYERS]);

    this._users.set(users);
    this._players.set(shuffledPlayers);
    this._availablePlayers.set(shuffledPlayers);
    this._recruitablePlayers.set([]);
    this._currentPlayerIndex.set(0);
    this._recruitmentStarted.set(false);
    this._recruitmentFinished.set(false);
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  submitBids(bids: Bid[]): BidResult | null {
    if (!this.gameStarted() || this._recruitmentStarted()) {
      return null;
    }

    const player = this.currentPlayer();
    if (!player) {
      return null;
    }

    const users = this._users();

    const normalizedBids = users.map(user => {
      // Time completo não participa mais dos leilões.
      if (user.team.length >= this.TEAM_SIZE) {
        return { userId: user.id, amount: 0 };
      }

      const rawAmount = bids.find(item => item.userId === user.id)?.amount ?? 0;
      const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));

      if (amount > user.coins) {
        throw new Error(`${user.name} não possui moedas suficientes.`);
      }

      return { userId: user.id, amount };
    });

    const highestBid = Math.max(...normalizedBids.map(bid => bid.amount), 0);

    // Ninguém lançou: vai para a fila de recrutamento.
    if (highestBid === 0) {
      this.addToRecruitment(player);

      return {
        winnerId: null,
        winningBid: 0,
        tie: false
      };
    }

    const winners = normalizedBids.filter(bid => bid.amount === highestBid);

    if (winners.length > 1) {
      return {
        winnerId: null,
        winningBid: highestBid,
        tie: true
      };
    }

    const winner = winners[0];
    const winnerUser = users.find(user => user.id === winner.userId);

    if (!winnerUser) {
      throw new Error('Usuário vencedor não encontrado.');
    }

    if (winnerUser.team.length >= this.TEAM_SIZE) {
      throw new Error(`${winnerUser.name} já possui ${this.TEAM_SIZE} jogadores.`);
    }

    this._users.set(
      users.map(user =>
        user.id === winner.userId
          ? {
              ...user,
              coins: user.coins - highestBid,
              team: [...user.team, player]
            }
          : user
      )
    );

    this.removePlayerFromAvailable(player.id);

    return {
      winnerId: winner.userId,
      winningBid: highestBid,
      tie: false
    };
  }

  private addToRecruitment(player: Player): void {
    const alreadyExists = this._recruitablePlayers().some(
      item => item.id === player.id
    );

    if (!alreadyExists) {
      this._recruitablePlayers.update(players => [...players, player]);
    }

    this.removePlayerFromAvailable(player.id);
  }

  private removePlayerFromAvailable(playerId: number): void {
    this._availablePlayers.update(players =>
      players.filter(player => player.id !== playerId)
    );
  }

  /**
   * Avança somente depois que o resultado da rodada foi confirmado.
   */
  continueAfterAuction(): void {
    if (!this.gameStarted() || this._recruitmentStarted()) {
      return;
    }

    if (this.allTeamsComplete()) {
      this.startRecruitment();
      return;
    }

    const available = this._availablePlayers();

    // Este é o ponto crítico: se a fila acabou, entra SEMPRE no recrutamento.
    if (available.length === 0) {
      this.startRecruitment();
      return;
    }

    // A lista já foi reduzida. O próximo jogador é available[0].
    this._currentPlayerIndex.update(index => index + 1);
  }

  private startRecruitment(): void {
    if (this._recruitmentStarted()) {
      return;
    }

    // Garante que todo jogador ainda não contratado apareça na etapa final.
    const recruitedIds = new Set(
      this._users().flatMap(user => user.team.map(player => player.id))
    );
    const recruitableById = new Map<number, Player>();

    for (const player of [
      ...this._recruitablePlayers(),
      ...this._availablePlayers()
    ]) {
      if (!recruitedIds.has(player.id)) {
        recruitableById.set(player.id, player);
      }
    }

    this._recruitablePlayers.set([...recruitableById.values()]);
    this._availablePlayers.set([]);
    this._recruitmentStarted.set(true);
    this._recruitmentFinished.set(this.allTeamsComplete());
  }

  autoRecruit(): void {
    if (!this._recruitmentStarted() || this._recruitmentFinished()) {
      return;
    }

    const users = this._users().map(user => ({
      ...user,
      team: [...user.team]
    }));

    const available = [...this._recruitablePlayers()];
    let availableIndex = 0;

    // Distribuição equilibrada: sempre coloca no time com menor elenco.
    while (availableIndex < available.length) {
      const candidates = users.filter(
        user => user.team.length < this.TEAM_SIZE
      );

      if (candidates.length === 0) {
        break;
      }

      const minSize = Math.min(...candidates.map(user => user.team.length));
      const target = candidates.find(user => user.team.length === minSize);
      const player = available[availableIndex++];

      if (!target || !player) {
        break;
      }

      target.team.push(player);
    }

    const recruitedIds = new Set(
      users.flatMap(user => user.team.map(player => player.id))
    );

    this._users.set(users);
    this._recruitablePlayers.set(
      available.filter(player => !recruitedIds.has(player.id))
    );

    this.updateRecruitmentFinished();
  }

  recruitPlayer(userId: number, playerId: number): void {
    if (!this._recruitmentStarted()) {
      throw new Error('O recrutamento ainda não começou.');
    }

    if (this._recruitmentFinished()) {
      throw new Error('O recrutamento já foi finalizado.');
    }

    const player = this._recruitablePlayers().find(
      item => item.id === playerId
    );

    if (!player) {
      throw new Error('Jogador não está disponível para recrutamento.');
    }

    const users = this._users().map(user => ({
      ...user,
      team: [...user.team]
    }));

    const user = users.find(item => item.id === userId);

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    if (user.team.length >= this.TEAM_SIZE) {
      throw new Error(`${user.name} já possui ${this.TEAM_SIZE} jogadores.`);
    }

    user.team.push(player);

    this._users.set(users);
    this._recruitablePlayers.update(players =>
      players.filter(item => item.id !== playerId)
    );

    this.updateRecruitmentFinished();
  }

  getUserTeam(userId: number): Player[] {
    return this.getUser(userId)?.team ?? [];
  }

  private allTeamsComplete(): boolean {
    const users = this._users();

    return users.length > 0 && users.every(
      user => user.team.length === this.TEAM_SIZE
    );
  }

  private updateRecruitmentFinished(): void {
    const complete = this.allTeamsComplete();

    if (!complete && this._recruitablePlayers().length < this.remainingTeamSlots()) {
      throw new Error(
        'Não há jogadores suficientes para completar todos os elencos.'
      );
    }

    this._recruitmentFinished.set(complete);
  }

  getUser(userId: number): User | undefined {
    return this._users().find(user => user.id === userId);
  }

  resetGame(): void {
    this._users.set([]);
    this._players.set([]);
    this._availablePlayers.set([]);
    this._recruitablePlayers.set([]);
    this._currentPlayerIndex.set(0);
    this._recruitmentStarted.set(false);
    this._recruitmentFinished.set(false);
  }
}

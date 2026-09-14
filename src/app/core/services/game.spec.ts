import { TestBed } from '@angular/core/testing';

import { GameService } from './game';

describe('GameService', () => {
  let service: GameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameService);
  });

  it('inicia cada participante com 200 moedas e elenco vazio', () => {
    service.startGame(['Ana', 'Bia']);

    expect(service.users()).toHaveLength(2);
    expect(service.users().every(user => user.coins === 200)).toBe(true);
    expect(service.users().every(user => user.team.length === 0)).toBe(true);
    expect(service.remainingTeamSlots()).toBe(36);
  });

  it('impede um lance maior que o saldo', () => {
    service.startGame(['Ana', 'Bia']);

    expect(() => service.submitBids([
      { userId: 1, amount: 201 },
      { userId: 2, amount: 0 }
    ])).toThrowError(/Ana .* moedas suficientes/);

    expect(service.getUser(1)?.coins).toBe(200);
    expect(service.getUser(1)?.team).toHaveLength(0);
  });

  it('desconta o lance e entrega o jogador ao vencedor', () => {
    service.startGame(['Ana', 'Bia']);
    const player = service.currentPlayer();

    const result = service.submitBids([
      { userId: 1, amount: 25 },
      { userId: 2, amount: 10 }
    ]);

    expect(result).toEqual({ winnerId: 1, winningBid: 25, tie: false });
    expect(service.getUser(1)?.coins).toBe(175);
    expect(service.getUser(1)?.team[0]).toEqual(player);
  });

  it('abre o recrutamento com todos os não escolhidos e completa 18 atletas', () => {
    service.startGame(['Ana', 'Bia']);
    const totalPlayers = service.players().length;

    for (let round = 0; round < totalPlayers; round++) {
      service.submitBids([
        { userId: 1, amount: 0 },
        { userId: 2, amount: 0 }
      ]);
      service.continueAfterAuction();
    }

    expect(service.recruitmentStarted()).toBe(true);
    expect(service.recruitablePlayers()).toHaveLength(totalPlayers);

    service.autoRecruit();

    expect(service.users().every(user => user.team.length === 18)).toBe(true);
    expect(service.recruitmentFinished()).toBe(true);
    expect(service.recruitablePlayers()).toHaveLength(totalPlayers - 36);
  });
});

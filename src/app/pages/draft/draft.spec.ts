import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Draft } from './draft';

describe('Draft', () => {
  let component: Draft;
  let fixture: ComponentFixture<Draft>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Draft],
      providers: [provideRouter([{ path: 'setup', component: Draft }])]
    }).compileComponents();

    fixture = TestBed.createComponent(Draft);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('abre o recrutamento automaticamente depois do último jogador', () => {
    component.gameService.startGame(['Ana', 'Bia']);
    const totalPlayers = component.gameService.players().length;

    for (let round = 0; round < totalPlayers; round++) {
      component.bids = { 1: 0, 2: 0 };
      component.submitBids();

      if (round < totalPlayers - 1) {
        component.nextPlayer();
      }
    }

    expect(component.gameService.currentPlayer()).toBeNull();
    expect(component.recruitmentStarted()).toBe(true);
    expect(component.recruitablePlayers()).toHaveLength(totalPlayers);
  });
});

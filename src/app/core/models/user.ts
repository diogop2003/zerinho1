import { Player } from './player';

export interface User {
  id: number;
  name: string;
  coins: number;
  team: Player[];
}
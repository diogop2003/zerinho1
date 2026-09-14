export interface Bid {
  userId: number;
  amount: number;
}

export interface AuctionResult {
  playerId: number;

  winnerId: number | null;

  winningBid: number;

  bids: Bid[];

  tie: boolean;

  round: number;
}
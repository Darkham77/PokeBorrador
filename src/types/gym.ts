
export interface GymDifficulty {
  pokemon: string[];
  levels: number[];
}

export interface Gym {
  id: string;
  name: string;
  city: string;
  leader: string;
  type: string;
  typeColor: string;
  badge: string;
  badgeName: string;
  quote: string;
  victoryQuote: string;
  rewardTM: string;
  pokemon: string[];
  levels: number[];
  badgesRequired: number;
  difficulties: {
    easy: GymDifficulty;
    normal: GymDifficulty;
    hard: GymDifficulty;
  };
}

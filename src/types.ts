/**
 * Shared Type Declarations for Motor Girl Speedway Adventure
 */

export type GameStatus = "START" | "PLAYING" | "PAUSED" | "GAMEOVER";

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  isAnonymous: boolean;
  avatarId: string;
  level: number;
  xp: number;
  xpNeeded: number;
  totalCoins: number;
  highScore: number;
  totalGames: number;
  obstaclesPassedTotal: number;
  coinsCollectedTotal: number;
  dailyStreak: number;
  lastDailyClaimDate: string | null; // format YYYY-MM-DD
  dailyRewardsClaimedBits: number;    // bitmask or simple length tracker (e.g., 0 to 7)
  unlockedCharacters: string[];      // list of ID strings
  equippedCharacterId: string;
  unlockedTrails: string[];
  equippedTrailId: string;
  unlockedThemes: string[];
  equippedThemeId: string;
  unlockedShields: string[];
  achievementsClaimed: string[];     // list of achievement ID strings
  lastAdWatchDate: string | null;
}

export interface MotorGirlSkin {
  id: string;
  name: string;
  tagline: string;
  description: string;
  cost: number;
  primaryColor: string;
  secondaryColor: string;
  sparkColor: string;
  hairColor: string;
  helmetColor: string;
  bikeStyle: "sports" | "chopper" | "hover" | "plasma";
  isLocked: boolean;
}

export interface EngineTrailStyle {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: "sparks" | "circles" | "flares" | "neon";
  colors: string[];
  particleSize: number;
}

export interface SpeedwayThemeStyle {
  id: string;
  name: string;
  description: string;
  cost: number;
  skyGradColors: string[];     // Array of sky hex/rgb codes
  mountainColor: string;
  speedwayFloorColor: string;
  curbWhiteColor: string;
  curbColor: string;           // Contrasting checker color (e.g., red)
  groundCurbH: number;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardCoins: number;
  rewardXp: number;
  requirementType: "highscore" | "games" | "coins" | "obstacles" | "levels" | "special";
  requirementThreshold: number;
}

export interface DailyQuestItem {
  id: string;
  description: string;
  rewardCoins: number;
  rewardXp: number;
  progress: number;
  target: number;
  completed: boolean;
}

export interface LeaderboardEntry {
  uid: string;
  username: string;
  avatarId: string;
  highScore: number;
  level: number;
  totalCoins: number;
  isCurrentUser?: boolean;
}

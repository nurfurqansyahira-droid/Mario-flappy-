import { MotorGirlSkin, EngineTrailStyle, SpeedwayThemeStyle, AchievementItem, DailyQuestItem, LeaderboardEntry } from "./types";

// 🏆 1. MOTOR GIRL RACER RECORD ROSTER
export const MOTOR_GIRLS_RECORDS: MotorGirlSkin[] = [
  {
    id: "HARAJUKU",
    name: "Harajuku Swift",
    tagline: "Cherry Speedster",
    description: "A brilliant cyberpunk street rider packing cherry neon leathers and a lightweight nitro turbine.",
    cost: 0,
    primaryColor: "#FF2E93",     // Cherry Pink
    secondaryColor: "#3BF3FF",   // Sky Cyan
    sparkColor: "#FF2E93",
    hairColor: "#FFFF00",        // Blonde ponytail
    helmetColor: "#111111",       // Glossy jet helmet
    bikeStyle: "sports",
    isLocked: false
  },
  {
    id: "VIPER",
    name: "J-Drifter Viper",
    tagline: "Toxic Drift Rebel",
    description: "A street racing outlaw specialized in tight hairpin maneuvers. Maneuvers in poisonous green armor.",
    cost: 500,
    primaryColor: "#2ECC71",     // Poison Green
    secondaryColor: "#F1C40F",   // Rich Gold
    sparkColor: "#2ECC71",
    hairColor: "#E74C3C",        // Crimson red locks
    helmetColor: "#2C3E50",       // Midnight visor
    bikeStyle: "chopper",
    isLocked: true
  },
  {
    id: "NOVA",
    name: "Nova Comet",
    tagline: "Starlight Cruiser",
    description: "An interplanetary cosmic pilot surfing the void. Rides an anti-gravity hovercraft bike.",
    cost: 1200,
    primaryColor: "#9B59B6",     // Galaxy Purple
    secondaryColor: "#FF7675",   // Peach Aura
    sparkColor: "#9B59B6",
    hairColor: "#00CECB",        // Turquoise bangs
    helmetColor: "#FFFFFF",       // Astronaut white helmet
    bikeStyle: "hover",
    isLocked: true
  },
  {
    id: "VALKYRIE",
    name: "Valkyrie Plasma",
    tagline: "Solar Flare Legend",
    description: "The ultimate hyper-performance speedway champion. Blazes on a plasma fusion ignition core.",
    cost: 2500,
    primaryColor: "#E67E22",     // Sunburst Orange
    secondaryColor: "#E74C3C",   // Crimson Flare
    sparkColor: "#F1C40F",
    hairColor: "#FFFFFF",        // Snow-white ponytail
    helmetColor: "#111111",       // Stealth black helmet
    bikeStyle: "plasma",
    isLocked: true
  }
];

// ☄️ 2. EXHAUST ENGINE TRAILS records
export const ENGINE_TRAILS_RECORDS: EngineTrailStyle[] = [
  {
    id: "SPARKS",
    name: "Standard Sparks",
    description: "Classic neon red-yellow friction sparks spouting from the tailpipe.",
    cost: 0,
    type: "sparks",
    colors: ["#F1C40F", "#E67E22", "#E74C3C"],
    particleSize: 5
  },
  {
    id: "PLASMA",
    name: "Plasma Halo",
    description: "Futuristic circular ripples of highly charged thermal energy.",
    cost: 300,
    type: "circles",
    colors: ["#3498DB", "#00F2FE", "#ECF0F1"],
    particleSize: 7
  },
  {
    id: "GOLD_DUST",
    name: "Sunburst Aura",
    description: "Bling out your speedway cruise with luxurious glittering gold flakes.",
    cost: 800,
    type: "flares",
    colors: ["#F1C40F", "#FFF9C4", "#F39C12"],
    particleSize: 6
  },
  {
    id: "CHERRY",
    name: "Cyber Vortex",
    description: "Whirling high-frequency streams of cybernetic neon-pink particle arcs.",
    cost: 1000,
    type: "neon",
    colors: ["#FF2E93", "#FF7675", "#8E44AD"],
    particleSize: 8
  }
];

// 🌅 3. VISUAL ENVIRONMENT SPEEDWAYS theme records
export const SPEEDWAY_THEMES_RECORDS: SpeedwayThemeStyle[] = [
  {
    id: "SPEEDWAY",
    name: "Horizon Speedway",
    description: "Scenic daytime landscape complete with beautiful hills, cloud cover, and classic checker shoulders.",
    cost: 0,
    skyGradColors: ["#1F618D", "#2980B9", "#AED6F1", "#EBF5FB"],
    mountainColor: "#227093",
    speedwayFloorColor: "#34495E",
    curbWhiteColor: "#FFFFFF",
    curbColor: "#E74C3C", // Classic Red
    groundCurbH: 10
  },
  {
    id: "OUTRUN",
    name: "Neon Outrun grid",
    description: "Glitchy synthwave retro-gradient sky, pink/purple grid lines, and hot neon checker lanes.",
    cost: 600,
    skyGradColors: ["#2C003E", "#510A63", "#A11F74", "#Fe5A80"],
    mountainColor: "#3D1344",
    speedwayFloorColor: "#1A002C",
    curbWhiteColor: "#FF007F", // Neon Pink
    curbColor: "#00F2FE",      // Electric Turquoise
    groundCurbH: 11
  },
  {
    id: "COSMIC",
    name: "Asteroid Nebula",
    description: "Drift in deeper space surrounded by sparkling auroral starscapes, gas clouds, and dark matter curbs.",
    cost: 1200,
    skyGradColors: ["#0B0C10", "#1F2833", "#3F0C52", "#900C3F"],
    mountainColor: "#11141A",
    speedwayFloorColor: "#121213",
    curbWhiteColor: "#9B59B6", // Deep Violet
    curbColor: "#FECA57",      // Star Gold
    groundCurbH: 12
  }
];

// 🏆 4. ACHIEVEMENTS LIST
export const ACHIEVEMENTS_RECORDS: AchievementItem[] = [
  {
    id: "FIRST_FLIGHT",
    title: "First Flight",
    description: "Commence your extreme speedway journey! Play your first complete run.",
    icon: "🏍️",
    rewardCoins: 50,
    rewardXp: 100,
    requirementType: "games",
    requirementThreshold: 1
  },
  {
    id: "SCORE_10",
    title: "Rookie Rider",
    description: "Maneuver and pass 10 speedway pipe gates in a single session.",
    icon: "⚡",
    rewardCoins: 100,
    rewardXp: 200,
    requirementType: "highscore",
    requirementThreshold: 10
  },
  {
    id: "SCORE_50",
    title: "Vapor Racer",
    description: "Prove your skill by dodging and completing 50 obstacles in a single record flow.",
    icon: "🔥",
    rewardCoins: 500,
    rewardXp: 1000,
    requirementType: "highscore",
    requirementThreshold: 50
  },
  {
    id: "SCORE_100",
    title: "Speedway Legend",
    description: "Clear a breathtaking 100 vertical pipe structures in one seamless drift run!",
    icon: "👑",
    rewardCoins: 2000,
    rewardXp: 5000,
    requirementType: "highscore",
    requirementThreshold: 100
  },
  {
    id: "PLAY_50",
    title: "High Mile Cruiser",
    description: "Clock in some serious distance on the engine odometer. File 50 games played.",
    icon: "🏁",
    rewardCoins: 800,
    rewardXp: 2000,
    requirementType: "games",
    requirementThreshold: 50
  },
  {
    id: "COINS_1000",
    title: "Golden Vault",
    description: "Accumulate 1,000 total gold coins through active playing or rewards.",
    icon: "💰",
    rewardCoins: 200,
    rewardXp: 500,
    requirementType: "coins",
    requirementThreshold: 1000
  },
  {
    id: "LEVEL_10",
    title: "Drift Commander",
    description: "Level up your professional profile to Level 10 through dedicated speedways.",
    icon: "🎖️",
    rewardCoins: 600,
    rewardXp: 1500,
    requirementType: "levels",
    requirementThreshold: 10
  }
];

// 📅 5. DAILY LOGIN REWARDS REGISTER (Day 1 -> Day 7)
export interface DailyRewardDay {
  day: number;
  type: "coins" | "skin" | "effect";
  label: string;
  value: number; // For coins, skin index, or effect index
  itemRefId: string; // The unlocked item database ID references!
  bannerImage: string;
}

export const DAILY_LOGIN_REWARDS_LIST: DailyRewardDay[] = [
  {
    day: 1,
    type: "coins",
    label: "Day 1 Reward",
    value: 100,
    itemRefId: "coins_100",
    bannerImage: "🪙 +100"
  },
  {
    day: 2,
    type: "coins",
    label: "Day 2 Reward",
    value: 200,
    itemRefId: "coins_200",
    bannerImage: "🪙 +200"
  },
  {
    day: 3,
    type: "coins",
    label: "Day 3 Reward",
    value: 300,
    itemRefId: "coins_300",
    bannerImage: "🪙 +300"
  },
  {
    day: 4,
    type: "skin",
    label: "Rare Motor Skin",
    value: 0,
    itemRefId: "VIPER", // Day 4 → Rare Skin: J-Drifter Viper!
    bannerImage: "🏍️ Viper"
  },
  {
    day: 5,
    type: "coins",
    label: "Day 5 Reward",
    value: 500,
    itemRefId: "coins_500",
    bannerImage: "🪙 +500"
  },
  {
    day: 6,
    type: "effect",
    label: "Rare Trail FX",
    value: 0,
    itemRefId: "PLASMA", // Day 6 → Special Effect: Plasma Flare trail!
    bannerImage: "☄️ Plasma"
  },
  {
    day: 7,
    type: "skin",
    label: "Epic Motor Skin",
    value: 0,
    itemRefId: "VALKYRIE", // Day 7 → Epic Character Skin: Valkyrie Plasma!
    bannerImage: "🔥 Valkyrie"
  }
];

// 📋 6. INITIAL SEEDED DAILY QUESTS
export const MOCK_DAILY_QUESTS: DailyQuestItem[] = [
  {
    id: "quest_1",
    description: "Launch your motor engine and complete 3 total game runs.",
    rewardCoins: 50,
    rewardXp: 120,
    progress: 0,
    target: 3,
    completed: false
  },
  {
    id: "quest_2",
    description: "Dodge and clear 15 speedway portals on your racing rides.",
    rewardCoins: 100,
    rewardXp: 250,
    progress: 0,
    target: 15,
    completed: false
  },
  {
    id: "quest_3",
    description: "Gather 12 luminous gold coins scattered across the freeway.",
    rewardCoins: 80,
    rewardXp: 180,
    progress: 0,
    target: 12,
    completed: false
  }
];

// 📈 7. SEEDED SHIELDED LEADERBOARD FOR COMPACT VIEWS
export const INITIAL_MOCK_LEADERBOARDS: LeaderboardEntry[] = [
  { uid: "leader_1", username: "DriftQueen_88", avatarId: "avatar_2", highScore: 142, level: 32, totalCoins: 12050 },
  { uid: "leader_2", username: "HyperTurbo_Cyber", avatarId: "avatar_5", highScore: 98, level: 24, totalCoins: 8400 },
  { uid: "leader_3", username: "VaporSlick_X", avatarId: "avatar_1", highScore: 75, level: 18, totalCoins: 6150 },
  { uid: "leader_4", username: "NitroSiren", avatarId: "avatar_3", highScore: 54, level: 14, totalCoins: 4120 },
  { uid: "leader_5", username: "SpeedyViper", avatarId: "avatar_4", highScore: 38, level: 9, totalCoins: 2800 },
  { uid: "leader_6", username: "GridGlide", avatarId: "avatar_6", highScore: 22, level: 5, totalCoins: 1500 }
];

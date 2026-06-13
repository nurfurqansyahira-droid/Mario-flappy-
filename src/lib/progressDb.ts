import { UserProfile, LeaderboardEntry, DailyQuestItem } from "../types";
import { db, isMockFirebase, OperationType, handleFirestoreError } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, limit, query, orderBy } from "firebase/firestore";
import { MOTOR_GIRLS_RECORDS, ENGINE_TRAILS_RECORDS, SPEEDWAY_THEMES_RECORDS, ACHIEVEMENTS_RECORDS, MOCK_DAILY_QUESTS, INITIAL_MOCK_LEADERBOARDS } from "../data";

const LOCAL_PROFILE_KEY = "motorgirl_racer_profile";
const LOCAL_LEADERBOARD_KEY = "motorgirl_local_leaderboard";

// 🏆 Calculate experience points required for a specific level up
export function calculateXpForLevel(level: number): number {
  return level * 100 + 150; // Level 1 needs 250 XP, Level 2 needs 350 XP, etc.
}

// 👤 Default initial profile for Guest or first-time players
export function createDefaultProfile(uid: string, username: string = "Rookie_Driver", email: string = "guest@speedway.com", isAnonymous: boolean = true): UserProfile {
  return {
    uid,
    username,
    email,
    isAnonymous,
    avatarId: "avatar_1",
    level: 1,
    xp: 0,
    xpNeeded: calculateXpForLevel(1),
    totalCoins: 200, // Starts with some tuning capital!
    highScore: 0,
    totalGames: 0,
    obstaclesPassedTotal: 0,
    coinsCollectedTotal: 0,
    dailyStreak: 0,
    lastDailyClaimDate: null,
    dailyRewardsClaimedBits: 0, // claimed rewards counter (0 to 7 claimed)
    unlockedCharacters: ["HARAJUKU"], // starting character is unlocked
    equippedCharacterId: "HARAJUKU",
    unlockedTrails: ["SPARKS"],
    equippedTrailId: "SPARKS",
    unlockedThemes: ["SPEEDWAY"],
    equippedThemeId: "SPEEDWAY",
    unlockedShields: [],
    achievementsClaimed: [],
    lastAdWatchDate: null
  };
}

// 💾 Load User Profile from appropriate source (Firestore or LocalStorage backup)
export async function loadUserProfile(uid: string, fallbackEmail: string = ""): Promise<UserProfile> {
  // Always check LocalStorage cache fallback first to ensure instant rendering
  const localCache = localStorage.getItem(`${LOCAL_PROFILE_KEY}_${uid}`);
  let cachedProfile: UserProfile | null = null;
  if (localCache) {
    try {
      cachedProfile = JSON.parse(localCache);
    } catch (e) {
      console.warn("Could not parse profile cache:", e);
    }
  }

  // If real Firebase connected and not offline mock
  if (!isMockFirebase && uid) {
    const userDocRef = doc(db, "users", uid);
    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const cloudProfile = docSnap.data() as UserProfile;
        // Sync local cache with freshest cloud doc
        localStorage.setItem(`${LOCAL_PROFILE_KEY}_${uid}`, JSON.stringify(cloudProfile));
        return cloudProfile;
      } else {
        // Cloud file not found, provision default cloud document
        const namePart = fallbackEmail ? fallbackEmail.split("@")[0] : `Racer_${Math.floor(1000 + Math.random() * 9000)}`;
        const freshProfile = cachedProfile || createDefaultProfile(uid, namePart, fallbackEmail, false);
        await setDoc(userDocRef, freshProfile);
        localStorage.setItem(`${LOCAL_PROFILE_KEY}_${uid}`, JSON.stringify(freshProfile));
        return freshProfile;
      }
    } catch (error) {
      console.error("Failed to query cloud user database:", error);
      // Fail-safe: trust local cache or default
      return cachedProfile || createDefaultProfile(uid, "Offline_Rider", fallbackEmail, true);
    }
  }

  // If mock/offline or no sync backend, yield cached or fresh profile
  if (cachedProfile) {
    return cachedProfile;
  }
  const defaultGuest = createDefaultProfile(uid);
  localStorage.setItem(`${LOCAL_PROFILE_KEY}_${uid}`, JSON.stringify(defaultGuest));
  return defaultGuest;
}

// 🏷️ Save user profile both into Cache and Firestore (if verified cloud linked)
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (!profile || !profile.uid) return;

  // 1. Persist in local storage cache
  localStorage.setItem(`${LOCAL_PROFILE_KEY}_${profile.uid}`, JSON.stringify(profile));

  // 2. Synchronize to Firestore cloud
  if (!isMockFirebase && !profile.isAnonymous) {
    const userDocRef = doc(db, "users", profile.uid);
    try {
      await setDoc(userDocRef, profile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
    }
  }
}

// 🎖️ Process raw action to reward XP points and handle levels
export function processXpReward(profile: UserProfile, xpAmount: number): { profile: UserProfile; leveledUp: boolean; unlockedItems: string[] } {
  let leveledUp = false;
  const unlockedItems: string[] = [];
  const updated = { ...profile };

  updated.xp += xpAmount;

  while (updated.xp >= updated.xpNeeded) {
    updated.xp -= updated.xpNeeded;
    updated.level += 1;
    updated.xpNeeded = calculateXpForLevel(updated.level);
    leveledUp = true;

    // Progression Unlock Rules (e.g. skin, trail, theme level unlocks!)
    if (updated.level === 3) {
      // Level 3 unlocks Viper Skin Option for purchase or free! Let's make it available.
      unlockedItems.push("J-Drifter Viper Skin purchase unlocked!");
    } else if (updated.level === 5) {
      // Level 5 unlocks Outrun theme for purchase!
      unlockedItems.push("Neon Outrun Theme purchase unlocked!");
    } else if (updated.level === 7) {
      // Level 7 unlocks Nova Comet bike purchase!
      unlockedItems.push("Nova Comet Skin purchase unlocked!");
    }
  }

  return { profile: updated, leveledUp, unlockedItems };
}

// 🏵️ Scan achievements collection to unlock those meeting criteria
export function auditAndUnlockAchievements(profile: UserProfile): { updatedProfile: UserProfile; newlyUnlocked: string[] } {
  const updated = { ...profile };
  const newlyUnlocked: string[] = [];

  for (const ach of ACHIEVEMENTS_RECORDS) {
    // Skip if already unlocked
    if (updated.achievementsClaimed.includes(ach.id)) {
      continue;
    }

    let meetsCriteria = false;
    switch (ach.requirementType) {
      case "highscore":
        meetsCriteria = updated.highScore >= ach.requirementThreshold;
        break;
      case "games":
        meetsCriteria = updated.totalGames >= ach.requirementThreshold;
        break;
      case "coins":
        meetsCriteria = updated.totalCoins >= ach.requirementThreshold;
        break;
      case "obstacles":
        meetsCriteria = updated.obstaclesPassedTotal >= ach.requirementThreshold;
        break;
      case "levels":
        meetsCriteria = updated.level >= ach.requirementThreshold;
        break;
    }

    if (meetsCriteria) {
      updated.achievementsClaimed.push(ach.id);
      updated.totalCoins += ach.rewardCoins;
      
      // Award XP
      const { profile: xpProfile } = processXpReward(updated, ach.rewardXp);
      Object.assign(updated, xpProfile);

      newlyUnlocked.push(ach.title);
    }
  }

  return { updatedProfile: updated, newlyUnlocked };
}

// 🏁 Get Leaderboard entries (Combining active user, simulated racers and real Firebase records)
export async function getGlobalLeaderboard(currentUserProfile: UserProfile | null): Promise<LeaderboardEntry[]> {
  let leaderList = [...INITIAL_MOCK_LEADERBOARDS];

  // 1. Extract cloud leaderboard entries if online Firebase is present
  if (!isMockFirebase) {
    try {
      const q = query(
        collection(db, "users"),
        orderBy("highScore", "desc"),
        limit(20)
      );
      const querySnap = await getDocs(q);
      const cloudEntries: LeaderboardEntry[] = [];
      querySnap.forEach((doc) => {
        const u = doc.data() as UserProfile;
        if (u.highScore > 0) {
          cloudEntries.push({
            uid: u.uid,
            username: u.username || "Rider_Anon",
            avatarId: u.avatarId || "avatar_1",
            highScore: u.highScore,
            level: u.level,
            totalCoins: u.totalCoins
          });
        }
      });
      if (cloudEntries.length > 0) {
        leaderList = cloudEntries;
      }
    } catch (e) {
      console.warn("Could not retrieve cloud rankings, falling back to local simulation:", e);
    }
  }

  // 2. Ensure current user is in the leaderboard
  if (currentUserProfile) {
    const userRankIdx = leaderList.findIndex(x => x.uid === currentUserProfile.uid);
    if (userRankIdx >= 0) {
      leaderList[userRankIdx] = {
        uid: currentUserProfile.uid,
        username: currentUserProfile.username,
        avatarId: currentUserProfile.avatarId,
        highScore: currentUserProfile.highScore,
        level: currentUserProfile.level,
        totalCoins: currentUserProfile.totalCoins,
        isCurrentUser: true
      };
    } else {
      leaderList.push({
        uid: currentUserProfile.uid,
        username: currentUserProfile.username,
        avatarId: currentUserProfile.avatarId,
        highScore: currentUserProfile.highScore,
        level: currentUserProfile.level,
        totalCoins: currentUserProfile.totalCoins,
        isCurrentUser: true
      });
    }
  }

  // Sort and number
  return leaderList.sort((a, b) => b.highScore - a.highScore);
}

// 📋 Load Daily Quests progress
export function loadDailyQuests(): DailyQuestItem[] {
  const localQuests = localStorage.getItem("motorgirl_quests");
  if (localQuests) {
    try {
      return JSON.parse(localQuests);
    } catch (e) {
      console.warn("Error parsing quests cache:", e);
    }
  }
  
  // Set default initial progress
  localStorage.setItem("motorgirl_quests", JSON.stringify(MOCK_DAILY_QUESTS));
  return MOCK_DAILY_QUESTS;
}

// 📋 Update Daily Quests progress after a game run
export function updateQuestsOnGameRun(obstaclesPassed: number, coinsCollected: number): { quests: DailyQuestItem[]; rewardedCoins: number; rewardedXp: number } {
  const quests = loadDailyQuests();
  let rewardedCoins = 0;
  let rewardedXp = 0;

  const updatedQuests = quests.map(q => {
    if (q.completed) return q;

    let updatedProgress = q.progress;
    if (q.id === "quest_1") {
      updatedProgress += 1; // Played 1 game
    } else if (q.id === "quest_2") {
      updatedProgress += obstaclesPassed;
    } else if (q.id === "quest_3") {
      updatedProgress += coinsCollected;
    }

    updatedProgress = Math.min(updatedProgress, q.target);
    const completed = updatedProgress >= q.target;

    if (completed && !q.completed) {
      rewardedCoins += q.rewardCoins;
      rewardedXp += q.rewardXp;
    }

    return {
      ...q,
      progress: updatedProgress,
      completed
    };
  });

  localStorage.setItem("motorgirl_quests", JSON.stringify(updatedQuests));
  return { quests: updatedQuests, rewardedCoins, rewardedXp };
}

// reset daily quests for mock testing or overnight rollover
export function resetDailyQuests(): DailyQuestItem[] {
  const fresh = MOCK_DAILY_QUESTS.map(q => ({ ...q, progress: 0, completed: false }));
  localStorage.setItem("motorgirl_quests", JSON.stringify(fresh));
  return fresh;
}

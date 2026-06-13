import React, { useEffect, useRef, useState } from "react";
import { retroAudio } from "../audio";
import { GameStatus, UserProfile } from "../types";
import { MOTOR_GIRLS_RECORDS, ENGINE_TRAILS_RECORDS, SPEEDWAY_THEMES_RECORDS } from "../data";
import { Volume2, VolumeX, Pause, Play, RotateCcw, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const GAME_WIDTH = 480;
const GAME_HEIGHT = 640;

interface Obstacle {
  x: number;
  gapY: number;      // Y center of the safe gap
  gapHeight: number; // Vertical clearance
  passed: boolean;
  width: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  angleOffset: number;
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // 0 to 1
  decay: number;
  gravity: number;
}

interface GameCanvasProps {
  profile: UserProfile;
  onGameFinished: (score: number, coins: number, restartInGameplay?: boolean) => void;
  isAudioMuted: boolean;
  onMuteToggle: () => void;
  isFullscreen: boolean;
  onToggleFullscreenMode: () => void;
  difficulty: "EASY" | "NORMAL" | "HARD";
}

export default function GameCanvas({
  profile,
  onGameFinished,
  isAudioMuted,
  onMuteToggle,
  isFullscreen,
  onToggleFullscreenMode,
  difficulty
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Parse active cosmetics structures
  const activeSkin = MOTOR_GIRLS_RECORDS.find(m => m.id === profile.equippedCharacterId) || MOTOR_GIRLS_RECORDS[0];
  const activeTrail = ENGINE_TRAILS_RECORDS.find(t => t.id === profile.equippedTrailId) || ENGINE_TRAILS_RECORDS[0];
  const activeTheme = SPEEDWAY_THEMES_RECORDS.find(v => v.id === profile.equippedThemeId) || SPEEDWAY_THEMES_RECORDS[0];

  // Game UI States
  const [gameStatus, setGameStatus] = useState<GameStatus>("START");
  const [score, setScore] = useState<number>(0);
  const [coinsCollectedCount, setCoinsCollectedCount] = useState<number>(0);

  // Revive & Ad Incentive States
  const [reviveCount, setReviveCount] = useState<number>(0);
  const [isWatchingAd, setIsWatchingAd] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(3);

  // Save gating lock to avoid duplicate reward uploads
  const hasSavedCurrentRun = useRef<boolean>(false);

  // Physics engine reference variables
  const engineState = useRef({
    playerY: 240,
    playerVy: 0,
    playerAccY: 0.33,         // gravity speed
    playerFlap: -5.9,          // jump force
    playerRotation: 0,
    playerWidth: 46,
    playerHeight: 28,
    isFlapping: false,
    flapTimer: 0,

    obstacles: [] as Obstacle[],
    coins: [] as Coin[],
    obstacleSpeed: 2.7,
    obstacleSpawnTimer: 0,

    clouds: [] as Cloud[],
    particles: [] as Particle[],
    groundScrollX: 0,
    currentFrame: 0,
    invulnerableFrames: 90 // 1.5 seconds start delay
  });

  // Setup far clouds initially
  useEffect(() => {
    const cloudsArr: Cloud[] = [];
    for (let i = 0; i < 4; i++) {
      cloudsArr.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * 120 + 20,
        speed: Math.random() * 0.25 + 0.1,
        size: Math.random() * 1.3 + 0.7
      });
    }
    engineState.current.clouds = cloudsArr;
  }, []);

  // Sync mute state to audio manager
  useEffect(() => {
    retroAudio.setMute(isAudioMuted);
  }, [isAudioMuted]);

  useEffect(() => {
    retroAudio.setBgmTrack("SPEEDWAY");
    retroAudio.toggleBgm(gameStatus === "PLAYING" && !isAudioMuted);
    return () => {
      retroAudio.toggleBgm(false);
    };
  }, [gameStatus, isAudioMuted]);

  // Keyboard controls listener for Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleJumpAction();
      }
      if (e.code === "KeyP") {
        e.preventDefault();
        if (gameStatus === "PLAYING") {
          setGameStatus("PAUSED");
          retroAudio.toggleBgm(false);
        } else if (gameStatus === "PAUSED") {
          setGameStatus("PLAYING");
          retroAudio.toggleBgm(!isAudioMuted);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameStatus, isAudioMuted]);

  const handleRestartRun = async () => {
    retroAudio.playStart();
    const finalCoinsEarned = getCoinsEarned();
    
    if (!hasSavedCurrentRun.current) {
      console.log(`[Drive Speedway Debug] Executing instant background cashout on restart. Score: ${score}, Coins: ${finalCoinsEarned}`);
      hasSavedCurrentRun.current = true;
      await onGameFinished(score, finalCoinsEarned, true); // update profile database, stay in gameplay
    }

    setReviveCount(0);
    setScore(0);
    setCoinsCollectedCount(0);
    resetGame();
    setGameStatus("PLAYING");
  };

  const handleReturnToGarage = async () => {
    retroAudio.playPoint();
    const finalCoinsEarned = getCoinsEarned();
    
    if (!hasSavedCurrentRun.current) {
      console.log(`[Drive Speedway Debug] Executing final cashout and exit. Score: ${score}, Coins: ${finalCoinsEarned}`);
      hasSavedCurrentRun.current = true;
      await onGameFinished(score, finalCoinsEarned, false); // save and go back to Dashboard
    } else {
      onGameFinished(0, 0, false);
    }
  };

  const handleContinueWithAd = () => {
    if (reviveCount > 0) return;
    
    retroAudio.playPoint();
    setIsWatchingAd(true);
    setAdCountdown(3);

    const interval = setInterval(() => {
      setAdCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsWatchingAd(false);
          setReviveCount(prevRev => prevRev + 1);
          revivePlayer();
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const revivePlayer = () => {
    console.log("[Drive Speedway Debug] Reviving drive line. Clearing pipes and granting shield.");
    engineState.current.obstacles = [];
    engineState.current.coins = [];
    engineState.current.playerY = 240;
    engineState.current.playerVy = 0;
    engineState.current.playerRotation = 0;
    engineState.current.isFlapping = false;
    engineState.current.invulnerableFrames = 120; // 2 seconds invulnerable shield
    setGameStatus("PLAYING");
    retroAudio.playStart();
  };

  const handleJumpAction = () => {
    if (gameStatus === "START") {
      resetGame();
      setGameStatus("PLAYING");
      retroAudio.playStart();
      engineState.current.playerVy = engineState.current.playerFlap;
      engineState.current.isFlapping = true;
      engineState.current.flapTimer = 8;
    } else if (gameStatus === "PLAYING") {
      engineState.current.playerVy = engineState.current.playerFlap;
      engineState.current.isFlapping = true;
      engineState.current.flapTimer = 8;
      retroAudio.playJump();
    } else if (gameStatus === "GAMEOVER") {
      handleRestartRun();
    }
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameStatus === "PLAYING") {
      setGameStatus("PAUSED");
      retroAudio.toggleBgm(false);
    } else if (gameStatus === "PAUSED") {
      setGameStatus("PLAYING");
      retroAudio.toggleBgm(!isAudioMuted);
    }
  };

  const resetGame = () => {
    engineState.current.playerY = 240;
    engineState.current.playerVy = 0;
    engineState.current.playerRotation = 0;
    engineState.current.obstacles = [];
    engineState.current.coins = [];
    engineState.current.obstacleSpawnTimer = 0;
    engineState.current.particles = [];
    engineState.current.currentFrame = 0;
    engineState.current.invulnerableFrames = 90;

    if (difficulty === "EASY") {
      engineState.current.playerAccY = 0.25;
      engineState.current.playerFlap = -5.1;
      engineState.current.obstacleSpeed = 2.0;
    } else if (difficulty === "HARD") {
      engineState.current.playerAccY = 0.39;
      engineState.current.playerFlap = -6.6;
      engineState.current.obstacleSpeed = 3.5;
    } else {
      engineState.current.playerAccY = 0.33;
      engineState.current.playerFlap = -5.9;
      engineState.current.obstacleSpeed = 2.7;
    }

    setScore(0);
    setCoinsCollectedCount(0);
  };

  // Spark generators for score checkpoint passes
  const spawnScoreStars = (px: number, py: number) => {
    const starColors = [activeSkin.primaryColor, activeSkin.secondaryColor, "#FFFFFF", "#FFD700"];
    const particlesArr = engineState.current.particles;
    
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 2.5;
      particlesArr.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        size: Math.random() * 4 + 3.2,
        life: 1.0,
        decay: Math.random() * 0.045 + 0.02,
        gravity: 0.1
      });
    }
  };

  // Spark burst specifically for shiny coin collection
  const spawnCoinCollectionStars = (cx: number, cy: number) => {
    const coinColors = ["#FFD700", "#FFA500", "#FFFFFF", "#FFFFE0"];
    const particlesArr = engineState.current.particles;
    
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      particlesArr.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        color: coinColors[Math.floor(Math.random() * coinColors.length)],
        size: Math.random() * 3 + 2.5,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.03,
        gravity: 0.07
      });
    }
  };

  // Physics updating + Collision logic (60fps animation context)
  const updateGamePhy = () => {
    hasSavedCurrentRun.current = false;
    setReviveCount(0);
    const state = engineState.current;

    if (state.invulnerableFrames > 0) {
      state.invulnerableFrames--;
    }

    // 1. Move atmosphere clouds
    state.clouds.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x + cloud.size * 50 < 0) {
        cloud.x = GAME_WIDTH + 15;
        cloud.y = Math.random() * 110 + 20;
      }
    });

    if (state.isFlapping) {
      state.flapTimer--;
      if (state.flapTimer <= 0) {
        state.isFlapping = false;
      }
    }

    if (gameStatus === "CRASHED" || gameStatus === "GAMEOVER") {
      // Apply gravity to player to rest on ground
      state.playerVy += state.playerAccY * 1.5; // falls faster on crash
      state.playerY += state.playerVy;
      
      // Rotate on crash (spin out!)
      state.playerRotation += 0.12;
      
      const groundLimit = GAME_HEIGHT - 65;
      if (state.playerY + state.playerHeight / 2 >= groundLimit) {
        state.playerY = groundLimit - state.playerHeight / 2;
        state.playerVy = 0;
        state.playerRotation = Math.PI / 2; // Lie flat side-down on Speedway floor
      }
      
      // Update lingering sparks
      state.particles.forEach((part, index) => {
        part.x += part.vx;
        part.y += part.vy;
        part.vy += part.gravity;
        part.life -= part.decay;
        if (part.life <= 0) {
          state.particles.splice(index, 1);
        }
      });
      return;
    }

    if (gameStatus !== "PLAYING") {
      // START context - floating hover animations
      state.playerY = 240 + Math.sin(Date.now() / 240) * 10;
      state.playerRotation = Math.sin(Date.now() / 480) * 0.08;

      // Maintain road rolling for visual life in standby
      state.groundScrollX = (state.groundScrollX - 1.2) % 48;
      
      // Keep moving sparks around
      state.particles.forEach((part, index) => {
        part.x += part.vx;
        part.y += part.vy;
        part.vy += part.gravity;
        part.life -= part.decay;
        if (part.life <= 0) {
          state.particles.splice(index, 1);
        }
      });
      return;
    }

    state.currentFrame++;

    // Spawning engine tail emissions based on active style
    if (state.currentFrame % 2 === 0) {
      const px = GAME_WIDTH / 4 + 5;
      const py = state.playerY + 6;
      const colors = activeTrail.colors;
      
      state.particles.push({
        x: px - (state.playerWidth / 2),
        y: py,
        vx: -state.obstacleSpeed - Math.random() * 1.5,
        vy: (Math.random() * 2 - 1) * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * activeTrail.particleSize + 2,
        life: 1.0,
        decay: Math.random() * 0.06 + 0.03,
        gravity: -0.02
      });
    }

    // 2. Play gravity
    state.playerVy += state.playerAccY;
    state.playerY += state.playerVy;

    // Gradual rotation clamp
    const targetRotation = Math.max(-0.4, Math.min(0.6, state.playerVy * 0.065));
    state.playerRotation += (targetRotation - state.playerRotation) * 0.18;

    // Speedway ground level collision limit
    const groundLimit = GAME_HEIGHT - 65;
    if (state.playerY + state.playerHeight / 2 >= groundLimit) {
      state.playerY = groundLimit - state.playerHeight / 2;
      if (state.invulnerableFrames <= 0) {
        triggerCrash();
      } else {
        // Safe bumper bounce
        state.playerVy = -3.5;
        spawnCoinCollectionStars(GAME_WIDTH / 4 + 20, groundLimit - 10);
      }
    }

    // Sky boundaries bounce
    if (state.playerY - state.playerHeight / 2 <= 0) {
      state.playerY = state.playerHeight / 2;
      state.playerVy = 0.5;
    }

    // 3. Spawning freeway obstacles / portals
    state.obstacleSpawnTimer++;
    
    let obstacleSpawnRate = 120;
    if (difficulty === "EASY") {
      obstacleSpawnRate = Math.max(105, 170 - Math.min(score * 1.0, 35));
    } else if (difficulty === "HARD") {
      obstacleSpawnRate = Math.max(68, 100 - Math.min(score * 1.5, 30));
    } else {
      obstacleSpawnRate = Math.max(82, 142 - Math.min(score * 1.2, 40));
    }
    
    if (state.obstacleSpawnTimer >= obstacleSpawnRate) {
      state.obstacleSpawnTimer = 0;
      
      const boundaryTop = 150;
      const boundaryBot = GAME_HEIGHT - 210;
      const gapY = Math.floor(Math.random() * (boundaryBot - boundaryTop)) + boundaryTop;
      
      // Progressive gap tightening depend on difficulty
      let currentGapH = 140;
      if (difficulty === "EASY") {
        currentGapH = Math.max(120, 175 - Math.min(score * 0.8, 35));
      } else if (difficulty === "HARD") {
        currentGapH = Math.max(82, 115 - Math.min(score * 1.5, 25));
      } else {
        currentGapH = Math.max(96, 150 - Math.min(score * 1.2, 40));
      }

      state.obstacles.push({
        x: GAME_WIDTH,
        gapY: gapY,
        gapHeight: currentGapH,
        passed: false,
        width: 76
      });

      // Spawn gold coin inside path
      state.coins.push({
        x: GAME_WIDTH + 38,
        y: gapY,
        collected: false,
        angleOffset: Math.random() * Math.PI
      });

      // Sparser double coin spawn
      if (Math.random() > 0.55) {
        state.coins.push({
          x: GAME_WIDTH + 140,
          y: gapY + (Math.random() * 70 - 35),
          collected: false,
          angleOffset: Math.random() * Math.PI
        });
      }
    }

    // Accelerate freeway tempo smoothly over time depend on difficulty
    if (difficulty === "EASY") {
      state.obstacleSpeed = 2.0 + Math.min(score * 0.03, 1.2);
    } else if (difficulty === "HARD") {
      state.obstacleSpeed = 3.5 + Math.min(score * 0.08, 4.0);
    } else {
      state.obstacleSpeed = 2.7 + Math.min(score * 0.05, 2.3);
    }

    // Scroll ground tarmac
    state.groundScrollX = (state.groundScrollX - state.obstacleSpeed) % 48;

    // Coins collection auditing
    const px = GAME_WIDTH / 4 + 20;
    state.coins.forEach((coin) => {
      coin.x -= state.obstacleSpeed;

      if (!coin.collected) {
        const d = Math.hypot(coin.x - px, coin.y - state.playerY);
        if (d < (state.playerWidth / 2 + 13)) {
          coin.collected = true;
          setScore(prev => prev + 2); // Coins give +2 points!
          setCoinsCollectedCount(prev => prev + 1);
          spawnCoinCollectionStars(coin.x, coin.y);
          retroAudio.playCoin();
        }
      }
    });
    state.coins = state.coins.filter(c => !c.collected && c.x + 40 > 0);

    // Speedway portals collision check
    state.obstacles.forEach((obs, index) => {
      obs.x -= state.obstacleSpeed;

      const playerLeft = px - (state.playerWidth - 14) / 2;
      const playerRight = px + (state.playerWidth - 14) / 2;
      const playerTop = state.playerY - (state.playerHeight - 10) / 2;
      const playerBottom = state.playerY + (state.playerHeight - 10) / 2;

      const gapTop = obs.gapY - obs.gapHeight / 2;
      const gapBottom = obs.gapY + obs.gapHeight / 2;

      // Horizontal intersection
      if (playerRight > obs.x && playerLeft < obs.x + obs.width) {
        if (playerTop < gapTop || playerBottom > gapBottom) {
          if (state.invulnerableFrames <= 0) {
            triggerCrash();
          } else {
            // Invulnerable sparks splash
            spawnCoinCollectionStars(px, state.playerY);
          }
        }
      }

      // Check passing portal
      if (!obs.passed && obs.x + obs.width / 2 < px) {
        obs.passed = true;
        setScore(prev => prev + 1);
        spawnScoreStars(px, state.playerY);
        retroAudio.playPoint();
      }

      if (obs.x + obs.width < 0) {
        state.obstacles.splice(index, 1);
      }
    });

    // Update lingering sparks
    state.particles.forEach((part, index) => {
      part.x += part.vx;
      part.y += part.vy;
      part.vy += part.gravity;
      part.life -= part.decay;
      if (part.life <= 0) {
        state.particles.splice(index, 1);
      }
    });
  };

  const getCoinsEarned = () => {
    if (difficulty === "EASY") {
      return coinsCollectedCount * 10 + score * 5;
    } else if (difficulty === "HARD") {
      return coinsCollectedCount * 60 + score * 40;
    } else {
      return coinsCollectedCount * 25 + score * 15;
    }
  };

  const triggerCrash = () => {
    setGameStatus("CRASHED");
    retroAudio.playMammaMia();
    
    // Play Store / mobile vibration feedback simulation
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([150, 100, 150]);
      } catch (err) {
        // guard against context restrictions
      }
    }

    // Spawn massive fiery crash particle bursts
    const px = GAME_WIDTH / 4 + 20;
    const py = engineState.current.playerY;
    const crashColors = ["#FF5733", "#FF8D1A", "#FFC300", "#FFFFFF", "#8E44AD"];
    const particlesArr = engineState.current.particles;
    
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5.5 + 2.0;
      particlesArr.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.0,
        color: crashColors[Math.floor(Math.random() * crashColors.length)],
        size: Math.random() * 6 + 3.5,
        life: 1.0,
        decay: Math.random() * 0.035 + 0.015,
        gravity: 0.1
      });
    }

    // Freeze brief moment then reveal Game Over controls (Subway Surfers Style!)
    setTimeout(() => {
      setGameStatus("GAMEOVER");
    }, 850);
  };

  // Canvas painting loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const renderLoop = () => {
      updateGamePhy();

      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 🌅 Drawing Sky Backdrop gradient according to Speedway Theme styles
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT - 60);
      const skyColors = activeTheme.skyGradColors;
      skyColors.forEach((color, idx) => {
        skyGrad.addColorStop(idx / (skyColors.length - 1), color);
      });
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Atmospheric glowing sun/orb
      ctx.save();
      const sunX = GAME_WIDTH - 80;
      const sunY = 80;
      const sunR = 40;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunR + 20);
      sunGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      sunGrad.addColorStop(0.3, "rgba(253, 150, 68, 0.4)");
      sunGrad.addColorStop(1, "rgba(253, 150, 68, 0)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR + 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Clouds
      engineState.current.clouds.forEach(cloud => {
        drawVolumetricCloud(ctx, cloud.x, cloud.y, cloud.size);
      });

      // Parallax Scenery Mountains
      drawParallaxMountains(ctx);

      // Portals obstacles (Pipes)
      engineState.current.obstacles.forEach(obs => {
        const topH = obs.gapY - obs.gapHeight / 2;
        drawGlossyPipe(ctx, obs.x, 0, obs.width, topH, true);

        const botY = obs.gapY + obs.gapHeight / 2;
        const botH = (GAME_HEIGHT - 60) - botY;
        drawGlossyPipe(ctx, obs.x, botY, obs.width, botH, false);
      });

      // Luminous Gold Coins
      engineState.current.coins.forEach(coin => {
        drawMetallicCoin(ctx, coin.x, coin.y, engineState.current.currentFrame);
      });

      // 🚦 Asphalt Speedway Floor
      drawSpeedwayTarmac(ctx);

      // Sparks & Exhaust tailparticles
      engineState.current.particles.forEach(part => {
        ctx.save();
        ctx.fillStyle = part.color;
        ctx.globalAlpha = part.life;
        ctx.shadowColor = part.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1.0;

      // 🏍️ Core: Draw the customized Motor Girl on her bike!
      const playerY = engineState.current.playerY;
      const px = GAME_WIDTH / 4 + 20;
      const size = engineState.current.playerWidth;
      const rotation = engineState.current.playerRotation;

      drawHighResMotorGirl(ctx, px, playerY, size, rotation, engineState.current.currentFrame);

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameStatus, activeSkin, activeTheme, activeTrail]);

  // Cloud utility
  const drawVolumetricCloud = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) => {
    ctx.save();
    const r = 16 * scale;
    const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, "#FFFFFF");
    grad.addColorStop(0.7, "#F3F6FA");
    grad.addColorStop(1, "rgba(202, 215, 237, 0.45)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.8, cy + r * 0.1, r * 0.6, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.8, cy + r * 0.1, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Parallax mountains
  const drawParallaxMountains = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.fillStyle = activeTheme.mountainColor;
    ctx.globalAlpha = 0.35;
    
    // Deep mountain peaks
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT - 60);
    ctx.lineTo(120, GAME_HEIGHT - 170);
    ctx.lineTo(260, GAME_HEIGHT - 100);
    ctx.lineTo(380, GAME_HEIGHT - 190);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - 60);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  };

  // Beautiful Vector customized 3D Speedway Tarmac
  const drawSpeedwayTarmac = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    const groundY = GAME_HEIGHT - 60;
    const h = 60;

    // Asphalt body
    const aspGrad = ctx.createLinearGradient(0, groundY, 0, GAME_HEIGHT);
    aspGrad.addColorStop(0, activeTheme.speedwayFloorColor);
    aspGrad.addColorStop(1, "#11141C");
    ctx.fillStyle = aspGrad;
    ctx.fillRect(0, groundY, GAME_WIDTH, h);

    // Sided checkered shoulders
    const curbH = activeTheme.groundCurbH;
    const curbTileW = 20;
    const startX = engineState.current.groundScrollX % (curbTileW * 2);

    for (let cx = startX - curbTileW * 2; cx < GAME_WIDTH + curbTileW * 2; cx += curbTileW * 2) {
      // White Checker
      ctx.fillStyle = activeTheme.curbWhiteColor;
      ctx.fillRect(cx, groundY, curbTileW, curbH);

      // Contrasting theme checker (Red, gold, cyan)
      ctx.fillStyle = activeTheme.curbColor;
      ctx.fillRect(cx + curbTileW, groundY, curbTileW, curbH);
    }

    // Lane dividing yellow dashes
    ctx.fillStyle = "rgba(241, 196, 15, 0.7)";
    const dashW = 24;
    const dashSpacing = 28;
    const dashY = groundY + (h / 2);
    const dStartX = (engineState.current.groundScrollX * 1.5) % (dashW + dashSpacing);

    for (let dx = dStartX - (dashW + dashSpacing); dx < GAME_WIDTH + (dashW + dashSpacing); dx += (dashW + dashSpacing)) {
      ctx.fillRect(dx, dashY, dashW, 2.5);
    }

    ctx.restore();
  };

  // Shaded Warp Pipe Portal structures for obstacles
  const drawGlossyPipe = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isTop: boolean) => {
    ctx.save();
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, "#1F2833");
    grad.addColorStop(0.3, "#00F2FE"); // High metallic cyan glossy spine
    grad.addColorStop(0.7, "#1F2833");
    grad.addColorStop(1, "#0B0C10");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#45F3FF";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    // wider coupling shoulder ring
    const capH = 24;
    const capY = isTop ? (y + h - capH) : y;
    const capX = x - 4;
    const capW = w + 8;

    const capGrad = ctx.createLinearGradient(capX, y, capX + capW, y);
    capGrad.addColorStop(0, "#011627");
    capGrad.addColorStop(0.35, "#FF007F"); // Hot pink ring highlights
    capGrad.addColorStop(0.7, "#011627");
    capGrad.addColorStop(1, "#000000");
    ctx.fillStyle = capGrad;

    ctx.beginPath();
    ctx.roundRect(capX, capY, capW, capH, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawMetallicCoin = (ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number) => {
    ctx.save();
    const wScale = Math.abs(Math.sin((frame * 0.16) + (cx * 0.05)));
    
    const coinGrad = ctx.createLinearGradient(cx - 8 * wScale, cy - 10, cx + 8 * wScale, cy + 10);
    coinGrad.addColorStop(0, "#FFFFE0");
    coinGrad.addColorStop(0.5, "#FFD700");
    coinGrad.addColorStop(1, "#B8860B");
    ctx.fillStyle = coinGrad;
    ctx.strokeStyle = "#B8860B";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, 8 * wScale, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // 🏍️ Magnificent Vector Render Routine for customized Motor Girl & Sportsbike!
  const drawHighResMotorGirl = (
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    rotation: number,
    frame: number
  ) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);

    const s = size / 40;

    // A. Under-wheels ground shadows
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 14 * s, 22 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // B. Draw Spinning Wheels (Rear: x: -14, Front: x: 14, size: 8)
    const drawBikeWheel = (wx: number, wy: number) => {
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(frame * 0.22); // super spinning

      // Outer tire rim (coal gray)
      ctx.fillStyle = "#1E1F22";
      ctx.beginPath();
      ctx.arc(0, 0, 8.5 * s, 0, Math.PI * 2);
      ctx.fill();

      // Customized neon wheel outline
      ctx.strokeStyle = activeSkin.secondaryColor;
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Spinning spokes inside alloy hub
      ctx.strokeStyle = "#BDC3C7";
      ctx.lineWidth = 1 * s;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 6.5 * s, Math.sin(a) * 6.5 * s);
        ctx.stroke();
      }

      // center pin axle
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(0, 0, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawBikeWheel(-14 * s, 11 * s); // rear wheel
    drawBikeWheel(14 * s, 11 * s);  // front wheel

    // C. Draw Chromium chassis and engine gears
    ctx.strokeStyle = "#7F8C8D";
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    // rear wheel axle bridge to tank fork
    ctx.moveTo(-14 * s, 11 * s);
    ctx.lineTo(-2 * s, 2 * s);
    ctx.lineTo(14 * s, 11 * s); // fork
    ctx.stroke();

    // Exhaust pipe muffler canister
    ctx.fillStyle = "#34495E";
    ctx.beginPath();
    ctx.roundRect(-22 * s, 4 * s, 11 * s, 3.5 * s, 1 * s);
    ctx.fill();

    // D. Sportsbike streamlined aerodynamic fairing pod panels
    const bikeGrad = ctx.createLinearGradient(-15 * s, -6 * s, 13 * s, 11 * s);
    bikeGrad.addColorStop(0, activeSkin.primaryColor);
    bikeGrad.addColorStop(1, activeSkin.secondaryColor);
    ctx.fillStyle = bikeGrad;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.8 * s;

    ctx.beginPath();
    ctx.moveTo(-16 * s, 3 * s);
    ctx.lineTo(-8 * s, -6 * s);   // Seat hump
    ctx.lineTo(6 * s, -7 * s);    // Petrol tank
    ctx.lineTo(13 * s, -1 * s);   // Nose shield cowl
    ctx.lineTo(5 * s, 10 * s);    // Radiator chin
    ctx.lineTo(-12 * s, 10 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glossy decal number badge
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(0, 1 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = "#000000";
    ctx.font = `bold ${5 * s}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G", 0, 1 * s);

    // E. Handlebars steering column
    ctx.strokeStyle = "#2C3E50";
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(6 * s, -7 * s);
    ctx.lineTo(11 * s, -12 * s); // Handle bar stem
    ctx.stroke();

    // F. The Racer Motor Girl rider posture leaning over tank
    // Seated leather pants
    ctx.fillStyle = "#111111"; // leather bottom
    ctx.beginPath();
    ctx.roundRect(-10 * s, -10 * s, 9 * s, 9 * s, 2.8 * s);
    ctx.fill();
    ctx.stroke();

    // Racing leather jersey colors
    const torsoGrad = ctx.createLinearGradient(-5 * s, -16 * s, 5 * s, -8 * s);
    torsoGrad.addColorStop(0, activeSkin.primaryColor);
    torsoGrad.addColorStop(1, activeSkin.secondaryColor);
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.ellipse(-1 * s, -13 * s, 5.5 * s, 4 * s, -Math.PI / 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Leather sleeve holding the handle grips
    ctx.fillStyle = activeSkin.primaryColor;
    ctx.beginPath();
    ctx.ellipse(5 * s, -12 * s, 4 * s, 1.8 * s, -Math.PI / 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // G. Visored sports helmet
    const helmetY = -23 * s;
    const helmetX = 1 * s;
    const helmetR = 6 * s;

    const helmetGrad = ctx.createRadialGradient(helmetX - 2 * s, helmetY - 2 * s, 1 * s, helmetX, helmetY, helmetR);
    helmetGrad.addColorStop(0, "#FFFFFF");
    helmetGrad.addColorStop(0.3, activeSkin.helmetColor);
    helmetGrad.addColorStop(1, "#050505");
    ctx.fillStyle = helmetGrad;

    ctx.beginPath();
    ctx.arc(helmetX, helmetY, helmetR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing glossy windshield visor (high-tech neon wind visor)
    ctx.fillStyle = "rgba(0, 229, 255, 0.85)"; // glowing cyan visor
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.ellipse(helmetX + 2.8 * s, helmetY - 0.5 * s, 2.5 * s, 3.8 * s, Math.PI / 12, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    // H. Gorgeous dynamic ponytail blowing in wind!
    // Ponytail waves backward in a beautiful sine curve of elapsed frames!
    ctx.save();
    ctx.fillStyle = activeSkin.hairColor;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.3 * s;
    
    ctx.beginPath();
    const hairStartX = helmetX - 5.5 * s;
    const hairStartY = helmetY + 1 * s;
    ctx.moveTo(hairStartX, hairStartY);

    // Compute waving bezier nodes
    const hWaveY = Math.sin(frame * 0.22) * 3 * s;
    ctx.bezierCurveTo(
      hairStartX - 8 * s, hairStartY - 2 * s + hWaveY,
      hairStartX - 16 * s, hairStartY + 4 * s - hWaveY,
      hairStartX - 24 * s, hairStartY + hWaveY / 2
    );
    // return thick bundle
    ctx.lineTo(hairStartX - 23 * s, hairStartY + 4 * s + hWaveY / 2);
    ctx.bezierCurveTo(
      hairStartX - 15 * s, hairStartY + 8 * s - hWaveY,
      hairStartX - 8 * s, hairStartY + 3 * s + hWaveY,
      hairStartX, hairStartY + 1.5 * s
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // I. Dizzy crash animation indicator stars
    if (gameStatus === "GAMEOVER") {
      ctx.save();
      const starAngle = (frame * 0.08) % (Math.PI * 2);
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 6;
      for (let i = 0; i < 3; i++) {
        const offset = starAngle + (i * Math.PI * 2) / 3;
        const starX = helmetX + Math.cos(offset) * 11 * s;
        const starY = helmetY - 8 * s + Math.sin(offset) * 3 * s;
        
        ctx.beginPath();
        ctx.arc(starX, starY, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // J. Protection shield bubble
    if (engineState.current.invulnerableFrames > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(0, 229, 255, 0.72)";
      ctx.lineWidth = 2.2 * s;
      ctx.shadowColor = "#00E5FF";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(0, 229, 255, 0.08)";

      const shieldR = (25 + Math.sin(frame * 0.16) * 1.8) * s;
      ctx.beginPath();
      ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };

  const handleInputTrigger = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (e.type === "touchstart") {
      e.stopPropagation();
    }
    handleJumpAction();
  };

  return (
    <div className="w-full h-full bg-neutral-950 flex flex-col justify-between items-center relative font-sans">
      {/* 60 FPS HTML5 graphics canvas */}
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="w-full h-full block bg-black"
        style={{ aspectRatio: "480/640" }}
      />

      {/* Screen HUD Indicators Overlay */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none z-10 select-none">
        {/* Left indicators: GATES passed */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-neutral-900/80 backdrop-blur-md rounded-2xl border border-neutral-800 text-xs font-mono font-bold text-white shadow-lg">
          <Sparkles className="w-4 h-4 text-pink-500 animate-spin" style={{ animationDuration: "3s" }} />
          <span>GATES: {score}</span>
        </div>

        {/* Right controls: pause / mute buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onToggleFullscreenMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreenMode();
              }}
              className="p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-white rounded-xl transition cursor-pointer"
              title={isFullscreen ? "Shrink to Cabinet" : "Go Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}

          <button
            onClick={togglePause}
            className="p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-white rounded-xl transition cursor-pointer"
          >
            {gameStatus === "PAUSED" ? <Play size={13} fill="white" /> : <Pause size={13} />}
          </button>
        </div>
      </div>

      {/* 🚀 Giant Invisible Screen Clickpad Layer for responsive one-handed taps */}
      {gameStatus === "PLAYING" && (
        <div
          onMouseDown={handleInputTrigger}
          onTouchStart={handleInputTrigger}
          className="absolute inset-x-0 bottom-0 top-[12%] z-0 cursor-pointer select-none active:bg-white/[0.04] transition-all flex flex-col justify-end pb-8 items-center"
        >
          {/* Subtle responsive touch help indicator at bottom */}
          <div className="bg-neutral-950/85 backdrop-blur-md border border-neutral-800/80 px-4 py-2 rounded-2xl flex flex-col items-center gap-1.5 text-center max-w-[280px] pointer-events-none shadow-xl border-pink-500/10 animate-pulse">
            <span className="font-mono text-[9px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400 uppercase">
              ⚡ CLICK, TAP OR SPACEBAR TO JUMP
            </span>
            <span className="text-[7.5px] font-mono text-neutral-500 uppercase">
              Bypass pipes • Collect 🪙 coins
            </span>
          </div>
        </div>
      )}

      {/* 🚪 GAME STATUS SCREEN OVERLAYS */}
      <AnimatePresence>
        {gameStatus === "START" && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-20 select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6 max-w-xs"
            >
              <div>
                <span className="font-mono text-[9px] tracking-[0.25em] font-extrabold text-pink-500 uppercase">
                  Ready to Drift?
                </span>
                <h3 className="text-2xl font-black italic tracking-wider text-white mt-1 uppercase">
                  {activeSkin.name}
                </h3>
                <p className="text-[10px] font-mono text-neutral-400 mt-2 lowercase capitalize leading-normal">
                  " {activeSkin.tagline} " • {activeSkin.description}
                </p>
              </div>

              {/* Tap to start button */}
              <button
                id="start-match-action"
                onMouseDown={handleInputTrigger}
                onTouchStart={handleInputTrigger}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 rounded-xl font-bold font-mono tracking-widest text-[11px] text-white shadow-[0_5px_15px_rgba(219,39,119,0.3)] animate-pulse transition cursor-pointer"
              >
                TOUCH TO IGNITE
              </button>
            </motion.div>
          </div>
        )}

        {gameStatus === "PAUSED" && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-20 select-none">
            <div className="space-y-4">
              <h3 className="text-2xl font-black tracking-wider text-pink-500 uppercase">
                ENGINE IDLE
              </h3>
              <p className="font-mono text-[10px] text-neutral-400 uppercase">
                Racing is temporarily suspended.
              </p>
              
              <button
                id="resume-match"
                onClick={togglePause}
                className="px-6 py-2 bg-pink-600 hover:bg-pink-500 font-bold font-mono text-[10px] uppercase rounded-xl tracking-wider cursor-pointer"
              >
                RESUME DRIVE
              </button>
            </div>
          </div>
        )}

        {gameStatus === "GAMEOVER" && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-5 z-20 select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 25 }}
              className="space-y-4 w-full max-w-xs"
            >
              {/* Header Title Accent */}
              <div>
                <span className="font-mono text-[9px] tracking-[0.25em] font-extrabold text-red-500 uppercase">
                  MATCH CONCLUDED
                </span>
                <h3 className="text-3xl font-black italic tracking-widest text-white leading-none mt-1">
                  CRASHED!
                </h3>
              </div>

              {/* Stats Card Overlay */}
              <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 bg-red-600/20 text-red-400 border-l border-b border-red-500/10 font-mono text-[7px] uppercase font-bold tracking-widest rounded-bl-xl">
                  {difficulty}
                </div>

                <div className="space-y-3 font-mono text-[10px]">
                  {/* Gate portals passed */}
                  <div className="flex justify-between items-center border-b border-neutral-800/80 pb-2">
                    <span className="text-neutral-400">GATES PASSED:</span>
                    <span className="text-white font-extrabold text-xs">{score}</span>
                  </div>

                  {/* High Score comparison */}
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-neutral-400">BEST RUN:</span>
                    <span className="text-neutral-300 font-bold">
                      {Math.max(profile.highScore, score)}
                      {score > profile.highScore && (
                        <span className="text-yellow-400 font-black ml-1 text-[8.5px]">⭐ NEW RECORD</span>
                      )}
                    </span>
                  </div>

                  {/* Picked coins summary */}
                  <div className="flex justify-between items-center text-[9px] text-neutral-400">
                    <span>🪙 GEMS PICKED:</span>
                    <span className="text-yellow-400 font-bold">+{coinsCollectedCount}</span>
                  </div>

                  {/* Total run coins payout with bonus */}
                  <div className="flex justify-between items-center text-[9.5px] border-t border-neutral-800/80 pt-2 text-white">
                    <span className="font-bold">COINS AWARDED:</span>
                    <span className="text-yellow-400 font-extrabold text-xs">
                      🪙 +{getCoinsEarned()}
                    </span>
                  </div>

                  {/* Live predicted total wallet */}
                  <div className="flex justify-between items-center border-t border-neutral-800/80 pt-2 text-[9px] text-neutral-500">
                    <span>TOTAL PROFILE WALLET:</span>
                    <span className="text-yellow-300 font-black">
                      🪙 {profile.totalCoins + getCoinsEarned()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subway Surfers Quick Layout Touch Buttons */}
              <div className="flex flex-col gap-2 w-full pt-1">
                {/* 1. Watch ad container revive option */}
                {reviveCount === 0 ? (
                  <button
                    onClick={handleContinueWithAd}
                    className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 font-bold font-mono text-[10.5px] text-white tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(219,39,119,0.3)] select-none border border-pink-500/20 active:scale-95"
                  >
                    <span>📺 CONTINUE RUN (FREE AD)</span>
                  </button>
                ) : (
                  <div className="py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-center text-neutral-500 font-mono text-[8px] tracking-wider uppercase">
                    🔒 Revive option used for this run
                  </div>
                )}

                {/* 2. Restart Run immediately in the gameplay view */}
                <button
                  onClick={handleRestartRun}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 font-bold font-mono text-[10.5px] text-white tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_4px_12px_rgba(13,148,136,0.2)]"
                >
                  <RotateCcw size={11} className="animate-spin" style={{ animationDuration: "6s" }} />
                  <span>🔄 RESTART RUN (INSTANT)</span>
                </button>

                {/* 3. Quit back to Main dashboard garage and save */}
                <button
                  onClick={handleReturnToGarage}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 font-bold font-mono text-[9.5px] text-neutral-300 tracking-wider rounded-xl transition cursor-pointer active:scale-95"
                >
                  🚪 RETURN TO THE GARAGE
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Immersive ad loading counts */}
        {isWatchingAd && (
          <div className="absolute inset-0 bg-black/98 z-30 flex flex-col items-center justify-center text-center p-6 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 max-w-xs"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-pink-500/10 border-2 border-pink-500 flex items-center justify-center animate-spin text-pink-500">
                  <Sparkles className="w-8 h-8" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-mono text-[9px] tracking-[0.2em] font-extrabold text-pink-500 uppercase animate-pulse">
                  📺 SPONSOR PROMO ACTIVE
                </span>
                <h3 className="text-xl font-black text-white uppercase tracking-wider leading-none">
                  CHARGING BOOSTERS
                </h3>
                <p className="text-[10px] font-mono text-neutral-400">
                  Reconstructing sportsbike. Prepare to launch!
                </p>
              </div>

              {/* Countdown metrics */}
              <div className="space-y-3">
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400 font-mono">
                  0:0{adCountdown}
                </div>
                <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: adCountdown, ease: "linear" }}
                    key={adCountdown}
                    className="h-full bg-gradient-to-r from-pink-500 to-indigo-500"
                  />
                </div>
              </div>

              <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest leading-none pt-2">
                Simulating rewards incentive
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

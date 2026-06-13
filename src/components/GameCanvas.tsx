import React, { useEffect, useRef, useState } from "react";
import { retroAudio } from "../audio";
import { Volume2, VolumeX, Pause, Play, RotateCcw, Award, Sparkles } from "lucide-react";

// Logical size for physics & coordinates (independent of screen pixel density)
const GAME_WIDTH = 480;
const GAME_HEIGHT = 640;
const COORD_SCALE = 1; // logical coordinate scale

// Color definitions for palette
const PALETTE = {
  clearSky: "#5C94FC",
  darkSky: "#5C94FC",
  grassLight: "#71C358",
  grassDark: "#4EA33C",
  soilDark: "#4EA33C",
  soilLight: "#71C358",
  brickRed: "#9C4A3A",
  brickDark: "#000000",
  brickLight: "rgba(255, 255, 255, 0.2)",
  stoneGate: "#999999",
  stoneDark: "#555555",
  stoneLight: "#cccccc"
};

type GameStatus = "START" | "PLAYING" | "PAUSED" | "GAMEOVER";

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

// Define accessible retro characters with matching color schemes
const CHARACTERS = [
  {
    id: "MARIO",
    name: "Classic Red",
    primary: "#E52521",
    secondary: "#0A55DC",
    palette: {
      "R": "#E52521", // Cap/Shirt Red
      "B": "#0A55DC", // Overalls Blue
      "S": "#FDB883", // Peach skin
      "K": "#211005", // Mustache & shoes
      "W": "#FFFFFF", // Whites / gloves
      "Y": "#F4D03F"  // Golden yellow buttons
    },
    funFact: "The legendary brick-busting plumber specialist!",
    sparkColor: "#F1C40F"
  },
  {
    id: "LUIGI",
    name: "Forest Green",
    primary: "#2ECC71",
    secondary: "#2C3E50",
    palette: {
      "R": "#2ECC71", // Cap/Shirt Green
      "B": "#2C3E50", // Overalls dark slate
      "S": "#FDB883", // Peach skin
      "K": "#111111", // Mustache & shoes
      "W": "#FFFFFF", // Whites / gloves
      "Y": "#F1C40F"  // Yellow buttons
    },
    funFact: "A high-jump expert with stylish forest apparel!",
    sparkColor: "#2ECC71"
  },
  {
    id: "WARIO",
    name: "Cosmic Purple",
    primary: "#8E44AD",
    secondary: "#F1C40F",
    palette: {
      "R": "#8E44AD", // Cap/Shirt Purple
      "B": "#F1C40F", // Gold yellow overalls
      "S": "#FDB883", // Peach skin
      "K": "#000000", // Dark mustache
      "W": "#FFFFFF", // Whites / gloves
      "Y": "#E74C3C"  // Red buttons
    },
    funFact: "A mischievous treasure hunter who loves golden gold coins!",
    sparkColor: "#9B59B6"
  },
  {
    id: "PEACH",
    name: "Royal Pink",
    primary: "#FC427B",
    secondary: "#FFEAA7",
    palette: {
      "R": "#FC427B", // Cap/Caplet deep pink
      "B": "#FFEAA7", // Pastel yellow/peach skirt base
      "S": "#FFE0CC", // Gentle skin face
      "K": "#443322", // Crown highlights
      "W": "#FFFFFF", // Lace white collar
      "Y": "#FECA57"  // Gold crown elements
    },
    funFact: "Regal royalty visiting from lands of cotton-candy dreams!",
    sparkColor: "#FF8BBB"
  }
];

const SPRITE_NORMAL = [
  ".....RRRRRR.....",
  "....RRRRRRRRR...",
  "....KKKSSKS.....",
  "...KKSKSKSSS....",
  "...KKSKSKKSS....",
  "...KKSKSSSSS....",
  "....KKSSSSSS....",
  ".....RRBRRBRR...",
  "....RRRBBBRRR...",
  "...RRRRBBBRRRR..",
  "...WWRRBBBRRWW..",
  "...WW..BBB..WW..",
  "......BB.BB.....",
  ".....KKK.KKK....",
  "................",
  "................"
];

const SPRITE_JUMP = [
  ".....RRRRRR.....",
  "....RRRRRRRRR...",
  "....KKKSSKS.....",
  "...KKSKSKSSS....",
  "...KKSKSKKSS....",
  "...KKSKSSSSS....",
  "....KKSSSSSS....",
  ".....RRBRRBRR...",
  "....RRRBBBRRR...",
  "...RRRRBBBRRRR..",
  "...WWRRBBBRRWW..",
  "...WW.BBBBB.WW..",
  ".....B.....B....", // split legs for dynamic jump feedback
  "....KKK...KKK...",
  "................",
  "................"
];

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // React-level states for GUI overlay
  const [gameStatus, setGameStatus] = useState<GameStatus>("START");
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [musicOn, setMusicOn] = useState<boolean>(false);
  const [sfxOn, setSfxOn] = useState<boolean>(true);
  const [difficultyLabel, setDifficultyLabel] = useState<string>("NOVICE");

  // New customizable parameters
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("MARIO");
  const [startDifficulty, setStartDifficulty] = useState<"NOVICE" | "CHALLENGING" | "EXPERT">("NOVICE");
  const [activeBgmTrack, setActiveBgmTrack] = useState<"CASTLE" | "SPEEDWAY">("CASTLE");

  // Keep a clean engine reference of physical frames/data to run 60FPS lock
  const engineState = useRef({
    // Player values
    playerY: 280,
    playerVy: 0,
    playerAccY: 0.35, // Gravity
    playerFlap: -6.8, // Lift Impulse
    playerRotation: 0,
    playerWidth: 42,
    playerHeight: 42,
    isFlapping: false,
    flapTimer: 0,

    // Obstacle variables
    obstacles: [] as Obstacle[],
    coins: [] as Coin[], // Floating coin arrays
    obstacleSpeed: 2.8,
    obstacleSpawnTimer: 0,
    baseGapHeight: 165,
    minGapHeight: 110,

    // Environmental offsets
    groundScrollX: 0,
    clouds: [] as Cloud[],
    particles: [] as Particle[],
    
    // Internal counters
    currentFrame: 0,
    lastObstacleScore: 0
  });

  // Load High Score on initial mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem("plumber_high_score");
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }

    // Initialize stars clouds
    const cloudsArr: Cloud[] = [];
    for (let i = 0; i < 5; i++) {
      cloudsArr.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * 150 + 20,
        speed: Math.random() * 0.3 + 0.1,
        size: Math.random() * 1.5 + 0.8
      });
    }
    engineState.current.clouds = cloudsArr;
  }, []);

  // Update mute settings in modern global audio engine
  useEffect(() => {
    retroAudio.setMute(!sfxOn);
  }, [sfxOn]);

  useEffect(() => {
    retroAudio.setBgmTrack(activeBgmTrack);
  }, [activeBgmTrack]);

  useEffect(() => {
    retroAudio.toggleBgm(musicOn && gameStatus === "PLAYING");
  }, [musicOn, gameStatus]);

  // Core Jump action dispatcher, triggers SFX and updates state
  const handleJump = () => {
    if (gameStatus === "START") {
      resetGame();
      setGameStatus("PLAYING");
      retroAudio.playStart();
      retroAudio.toggleBgm(musicOn);
      // Trigger instant start flap
      engineState.current.playerVy = engineState.current.playerFlap;
      engineState.current.isFlapping = true;
      engineState.current.flapTimer = 8;
    } else if (gameStatus === "PLAYING") {
      engineState.current.playerVy = engineState.current.playerFlap;
      engineState.current.isFlapping = true;
      engineState.current.flapTimer = 8;
      retroAudio.playJump();
    } else if (gameStatus === "GAMEOVER") {
      resetGame();
      setGameStatus("PLAYING");
      retroAudio.playStart();
      retroAudio.toggleBgm(musicOn);
    }
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameStatus === "PLAYING") {
      setGameStatus("PAUSED");
      retroAudio.toggleBgm(false);
    } else if (gameStatus === "PAUSED") {
      setGameStatus("PLAYING");
      retroAudio.toggleBgm(musicOn);
    }
  };

  const toggleMusic = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMusicOn(!musicOn);
  };

  const toggleSfx = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSfxOn(!sfxOn);
  };

  // Resets the entire frame logic state based on Difficulty and Characters selection
  const resetGame = () => {
    engineState.current.playerY = 240;
    engineState.current.playerVy = 0;
    engineState.current.playerRotation = 0;
    engineState.current.obstacles = [];
    engineState.current.coins = [];
    engineState.current.obstacleSpawnTimer = 0;
    engineState.current.particles = [];
    engineState.current.currentFrame = 0;

    // Adjust parameters by selected difficulty
    if (startDifficulty === "NOVICE") {
      engineState.current.obstacleSpeed = 2.0;
      engineState.current.baseGapHeight = 175;
      engineState.current.minGapHeight = 125;
      setDifficultyLabel("NOVICE FLYER");
    } else if (startDifficulty === "CHALLENGING") {
      engineState.current.obstacleSpeed = 2.9;
      engineState.current.baseGapHeight = 155;
      engineState.current.minGapHeight = 110;
      setDifficultyLabel("ARCADE JUMPER");
    } else {
      engineState.current.obstacleSpeed = 3.8;
      engineState.current.baseGapHeight = 135;
      engineState.current.minGapHeight = 96;
      setDifficultyLabel("EXPERTS ONLY");
    }

    setScore(0);
  };

  // Spawns gold sparks around the player using their character's thematic colors
  const spawnScoreStars = (px: number, py: number) => {
    const activeChar = CHARACTERS.find(c => c.id === selectedCharacterId) || CHARACTERS[0];
    const starColors = [activeChar.sparkColor, "#FFF", "#FFEA00", "#F1C40F"];
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
        size: Math.random() * 4 + 3,
        life: 1.0,
        decay: Math.random() * 0.045 + 0.02,
        gravity: 0.11
      });
    }
  };

  // Spark burst specifically for shiny coin collection
  const spawnCoinCollectionStars = (cx: number, cy: number) => {
    const coinColors = ["#FFEA00", "#F39C12", "#FFFFFF", "#FFE000"];
    const particlesArr = engineState.current.particles;
    
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.5;
      particlesArr.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        color: coinColors[Math.floor(Math.random() * coinColors.length)],
        size: Math.random() * 3 + 2.5,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.03,
        gravity: 0.08
      });
    }
  };

  // Physics updating + Collision logic (runs inside 60fps loop context)
  const updateGame = () => {
    const state = engineState.current;

    // 1. Move clouds
    state.clouds.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x + cloud.size * 60 < 0) {
        cloud.x = GAME_WIDTH + 20;
        cloud.y = Math.random() * 160 + 20;
      }
    });

    // Handle jump countdown duration for Sprite animation frame
    if (state.isFlapping) {
      state.flapTimer--;
      if (state.flapTimer <= 0) {
        state.isFlapping = false;
      }
    }

    if (gameStatus !== "PLAYING") {
      // In menus, animate player hovering gracefully up and down
      state.playerY = 240 + Math.sin(Date.now() / 250) * 12;
      state.playerRotation = Math.sin(Date.now() / 500) * 0.1;

      // Retain ground scrolling anyway for dynamic interactive backdrop
      state.groundScrollX = (state.groundScrollX - 1.2) % 48;
      
      // Update lingering particles
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

    // 2. Play physics
    state.playerVy += state.playerAccY;
    state.playerY += state.playerVy;

    // Clamp tilt angle rotation based on velocity
    const targetRot = Math.max(-0.4, Math.min(0.8, state.playerVy * 0.07));
    state.playerRotation += (targetRot - state.playerRotation) * 0.18;

    // Ground level collision check
    const LIMIT_HEIGHT = GAME_HEIGHT - 65; // Soil/Grass starts at GAME_HEIGHT-60
    if (state.playerY + state.playerHeight / 2 >= LIMIT_HEIGHT) {
      state.playerY = LIMIT_HEIGHT - state.playerHeight / 2;
      handleGameOver();
    }
    // Ceiling bounce
    if (state.playerY - state.playerHeight / 2 <= 0) {
      state.playerY = state.playerHeight / 2;
      state.playerVy = 0.5;
    }

    // Scroll ground
    state.groundScrollX = (state.groundScrollX - state.obstacleSpeed) % 48;

    // 3. Obstacle Generator and updates
    state.obstacleSpawnTimer++;
    // Spawning frequency depends on current difficulty speed
    const spawnRate = Math.max(80, 140 - Math.min(score * 1.5, 40));
    if (state.obstacleSpawnTimer >= spawnRate) {
      state.obstacleSpawnTimer = 0;
      
      // Select safe gap centered in the screen middle bands
      const minGapY = 150;
      const maxGapY = GAME_HEIGHT - 210;
      const gapY = Math.floor(Math.random() * (maxGapY - minGapY)) + minGapY;
      
      // High score reduces gap size
      const currentGapHeight = Math.max(state.minGapHeight, state.baseGapHeight - Math.min(score * 1.8, 55));

      state.obstacles.push({
        x: GAME_WIDTH,
        gapY: gapY,
        gapHeight: currentGapHeight,
        passed: false,
        width: 76
      });

      // Spawn a shiny coin in the middle of the gap
      state.coins.push({
        x: GAME_WIDTH + 38, // Centered inside the 76px width obstacle
        y: gapY,
        collected: false,
        angleOffset: Math.random() * Math.PI
      });

      // 55% chance to spawn an extra floating coin slightly ahead or behind to reward high precision flight
      if (Math.random() > 0.45) {
        state.coins.push({
          x: GAME_WIDTH + 140, 
          y: gapY + (Math.random() * 90 - 45), 
          collected: false,
          angleOffset: Math.random() * Math.PI
        });
      }
    }

    // Difficulty speed adjustment escalates as score increases
    const startSpeed = startDifficulty === "NOVICE" ? 2.0 : startDifficulty === "CHALLENGING" ? 2.9 : 3.8;
    const currentSpeed = startSpeed + Math.min(score * 0.08, 3.5);
    state.obstacleSpeed = currentSpeed;

    // Update floating coins and check for player contact
    const px = GAME_WIDTH / 4 + 20; // fixed player position X
    const py = state.playerY;
    const pw = state.playerWidth;

    state.coins.forEach((coin, index) => {
      coin.x -= state.obstacleSpeed;

      if (!coin.collected) {
        const contactDist = Math.hypot(coin.x - px, coin.y - py);
        if (contactDist < (pw / 2 + 13)) {
          coin.collected = true;
          setScore(prev => prev + 2); // Coins award a generous +2 points!
          spawnCoinCollectionStars(coin.x, coin.y);
          retroAudio.playCoin();
        }
      }
    });

    // Strip out collected and offscreen coins
    state.coins = state.coins.filter(c => !c.collected && c.x + 40 > 0);

    state.obstacles.forEach((obs, index) => {
      obs.x -= state.obstacleSpeed;

      // Collision checks with plumber
      const px = GAME_WIDTH / 4 + 20; // fixed player X
      const py = state.playerY;
      const pw = state.playerWidth - 8; // tighter hitbox bounds
      const ph = state.playerHeight - 8;

      const playerLeft = px - pw/2;
      const playerRight = px + pw/2;
      const playerTop = py - ph/2;
      const playerBottom = py + ph/2;

      const obsLeft = obs.x;
      const obsRight = obs.x + obs.width;
      const gapTop = obs.gapY - obs.gapHeight / 2;
      const gapBottom = obs.gapY + obs.gapHeight / 2;

      // If player intersects horizontal slot of the obstacle tower
      if (playerRight > obsLeft && playerLeft < obsRight) {
        // Collides with top pipe OR bottom pipe
        if (playerTop < gapTop || playerBottom > gapBottom) {
          handleGameOver();
        }
      }

      // Check passing obstacle to score!
      if (!obs.passed && obs.x + obs.width / 2 < px) {
        obs.passed = true;
        const newScore = score + 1;
        setScore(newScore);
        
        // Spawn shiny celebration effects around player
        spawnScoreStars(px, py);
        retroAudio.playPoint();

        // Increment difficulty visual flags
        if (newScore >= 35) {
          setDifficultyLabel("CLASSIC PLUMBER EXPERT");
        } else if (newScore >= 20) {
          setDifficultyLabel("SMASHING CHALLENGING");
        } else if (newScore >= 10) {
          setDifficultyLabel("SPEEDY ARCADE");
        } else if (newScore >= 5) {
          setDifficultyLabel("ADVANCED RUN");
        }

        // Keep local storage synchronized
        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem("plumber_high_score", newScore.toString());
        }
      }

      // Evict out-of-screen bounds
      if (obs.x + obs.width < 0) {
        state.obstacles.splice(index, 1);
      }
    });

    // 4. Update particles
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

  const handleGameOver = () => {
    setGameStatus("GAMEOVER");
    retroAudio.playMammaMia();
    // Delay the classic game over tone slightly to let the high-pitched "Mamma Mia!" cry ring out clearly first
    const timer = setTimeout(() => {
      retroAudio.playGameOver();
    }, 280);
    return () => clearTimeout(timer);
  };

  // Draw magnificent 3D Speedway Floor with race-track textures and scrolling perspective road-markings
  const draw3DSpeedwayFloor = (ctx: CanvasRenderingContext2D, scrollX: number, y: number, w: number, h: number) => {
    ctx.save();
    
    // 1. Draw solid grassy shoulder base (rich green lawn gradient)
    const grassGrad = ctx.createLinearGradient(0, y, 0, y + h);
    grassGrad.addColorStop(0, "#27AE60"); // Trim grass
    grassGrad.addColorStop(1, "#1E8449"); // Deep turf green
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, y, w, h);

    // 2. Main tarmac asphalt speedway strip running across the bottom
    // We position the asphalt from y + 10 to y + 54 (44px wide race lane!)
    const roadY = y + 10;
    const roadH = h - 10;
    
    // Smooth 3D asphalt linear shading
    const asphaltGrad = ctx.createLinearGradient(0, roadY, 0, roadY + roadH);
    asphaltGrad.addColorStop(0, "#2C3E50");   // Clean charcoal asphalt top rim
    asphaltGrad.addColorStop(0.35, "#34495E"); // Light-absorbing tarmac body
    asphaltGrad.addColorStop(1, "#1F2A38");   // Bottom shade
    
    ctx.fillStyle = asphaltGrad;
    ctx.fillRect(0, roadY, w, roadH);

    // Top white edge safety lines for racing lanes
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.fillRect(0, roadY, w, 2.5); // top white line
    ctx.fillRect(0, roadY + roadH - 2.5, w, 2.5); // bottom white line

    // 3. Scrolling middle dashes (Dashed road markings)
    const dashW = 28;
    const dashH = 3;
    const dashSpacing = 24;
    const dashY = roadY + (roadH / 2) - (dashH / 2);
    const startX = (scrollX * 1.5) % (dashW + dashSpacing); // speed adjustment for parallax feel
    
    ctx.fillStyle = "#F1C40F"; // Bright highway gold/yellow lane divider dashes
    for (let curX = startX - (dashW + dashSpacing); curX < w + (dashW + dashSpacing); curX += (dashW + dashSpacing)) {
      ctx.beginPath();
      ctx.roundRect(curX, dashY, dashW, dashH, 1.5);
      ctx.fill();
    }

    // 4. Subtle speedway tyre skid marks (faded grey arcs for racing vibes)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 3, roadY + 12, 120, 15, -0.05, 0, Math.PI);
    ctx.ellipse(w * 0.75, roadY + 22, 90, 10, -0.02, 0, Math.PI);
    ctx.stroke();

    ctx.restore();
  };

  // Draw gorgeous 3D volumetric glossy cloud with realistic depth gradients and soft drop-shadow
  const draw3DCloud = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) => {
    ctx.save();
    
    const r = 18 * scale;
    
    // Ambient cloud shadow slightly offset below
    ctx.shadowColor = "rgba(10, 30, 80, 0.12)";
    ctx.shadowBlur = 10 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6 * scale;
    
    // Create a beautiful glossy 3D linear gradient for puff cores
    const cloudGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    cloudGrad.addColorStop(0, "#FFFFFF");         // Pure bright sunlit rim
    cloudGrad.addColorStop(0.65, "#F7F9FC");      // Soft clean cloud body
    cloudGrad.addColorStop(1, "#D5E0F2");         // Shadowed ambient blue underside
    
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    
    // Multi-puff 3D volumetric composition
    // 1. Center puff
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    // 2. Left side puff
    ctx.arc(cx - r * 0.85, cy + r * 0.1, r * 0.65, 0, Math.PI * 2);
    // 3. Right side puff
    ctx.arc(cx + r * 0.9, cy + r * 0.05, r * 0.75, 0, Math.PI * 2);
    // 4. Far left mini-puff
    ctx.arc(cx - r * 1.4, cy + r * 0.2, r * 0.45, 0, Math.PI * 2);
    // 5. Far right mini-puff
    ctx.arc(cx + r * 1.45, cy + r * 0.15, r * 0.48, 0, Math.PI * 2);
    
    ctx.fill();
    
    // Glossy highlights (semi-transparent white overlay at the top edges for a 3D bubble shine)
    ctx.shadowColor = "transparent"; // reset shadow
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.5, r * 0.5, r * 0.25, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - r * 0.8, cy - r * 0.2, r * 0.35, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  // Draw beautiful shiny high-resolution 3D Warp Pipes
  const drawWarpPipe = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    w: number, 
    h: number,
    isTop: boolean
  ) => {
    ctx.save();
    
    // 1. Create a beautiful glossy green 3D cylindrical linear gradient for the main pipe body
    const pipeGrad = ctx.createLinearGradient(x, y, x + w, y);
    pipeGrad.addColorStop(0, "#145A32");   // Very dark green edge shadow
    pipeGrad.addColorStop(0.18, "#1E8449"); // Shade transition
    pipeGrad.addColorStop(0.35, "#58D68D"); // Bright vertical reflection stripe (matte shine!)
    pipeGrad.addColorStop(0.65, "#2ECC71"); // Smooth green body
    pipeGrad.addColorStop(0.85, "#27AE60"); // Rich grass green
    pipeGrad.addColorStop(1, "#114B26");   // Back edge shadow

    // Set styling and fill main pipe body
    ctx.fillStyle = pipeGrad;
    ctx.strokeStyle = "#0B3C1A"; // Dark crisp border
    ctx.lineWidth = 3.2;
    
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    // Horizontal dark lines or bands to simulate racing coupling joints on long shafts
    ctx.strokeStyle = "rgba(11, 60, 26, 0.45)";
    ctx.lineWidth = 2.2;
    for (let py = 35; py < h; py += 68) {
      const lineY = isTop ? (y + py) : (y + h - py);
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + w, lineY);
      ctx.stroke();
    }

    // 2. DRAW THE WIDER COUPLING PIPE LIP (26px tall, overhangs slightly)
    const lipHeight = 26;
    const lipY = isTop ? (y + h - lipHeight) : y;
    const lipMargin = 5;
    const lipX = x - lipMargin;
    const lipW = w + lipMargin * 2;

    // Gradient for the Pipe Lip (slightly shifted for perspective 3D shading)
    const lipGrad = ctx.createLinearGradient(lipX, lipY, lipX + lipW, lipY);
    lipGrad.addColorStop(0, "#196F3D");
    lipGrad.addColorStop(0.18, "#2ECC71");
    lipGrad.addColorStop(0.32, "#A9DFBF"); // Intense glossy light flare!
    lipGrad.addColorStop(0.55, "#27AE60");
    lipGrad.addColorStop(0.85, "#1E8449");
    lipGrad.addColorStop(1, "#114B26");

    ctx.fillStyle = lipGrad;
    ctx.beginPath();
    ctx.roundRect(lipX, lipY, lipW, lipHeight, 3);
    ctx.fill();
    ctx.stroke();

    // Dark shadow rim underneath the lip projection
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    const shadowY = isTop ? lipY : (lipY + lipHeight);
    ctx.fillRect(x, shadowY - 4, w, 4);

    // Inner pipe dark aperture depth (where the inner hole is)
    ctx.fillStyle = "#091F0C"; // Deep endless dark green-black hole
    const holeY = isTop ? (y + h - 4) : y;
    ctx.fillRect(x + 2, holeY, w - 4, 4);

    ctx.restore();
  };

  // Draw high-resolution stylized Kart Plumber racer with 3D gradient overlays,
  // glossy racing helmet/cap visor, rotating sports tyres with axles and shiny exhaust sparks!
  const drawHighResKartRacer = (
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    rotation: number,
    char: typeof CHARACTERS[0],
    isFlapping: boolean,
    frame: number
  ) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);

    // Scaling factor based on standard size 40
    const s = size / 40; 

    // --- 1. ENGINE EXHAUST & FLAMES (at the back-left, around x: -18, y: 5) ---
    const exhaustX = -18 * s;
    const exhaustY = 6 * s;
    
    // Exhaust pipe (glossy metal tip)
    ctx.fillStyle = "#7F8C8D";
    ctx.strokeStyle = "#34495E";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(exhaustX, exhaustY - 2 * s, 8 * s, 4 * s);
    ctx.fill();
    ctx.stroke();

    // Animated thrust flame when flapping or idling
    const flameScale = isFlapping ? (1.25 + Math.sin(frame * 0.45) * 0.3) : (0.75 + Math.sin(frame * 0.2) * 0.15);
    if (flameScale > 0.1) {
      const grad = ctx.createLinearGradient(exhaustX, exhaustY, exhaustX - 18 * s * flameScale, exhaustY);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.3, "#F1C40F"); // yellow
      grad.addColorStop(0.7, "#E67E22"); // orange
      grad.addColorStop(1, "rgba(231, 76, 60, 0)"); // red fadeout
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(exhaustX, exhaustY - 3 * s);
      ctx.lineTo(exhaustX - 21 * s * flameScale, exhaustY);
      ctx.lineTo(exhaustX, exhaustY + 3 * s);
      ctx.closePath();
      ctx.fill();
    }

    // --- 2. THE KART CHASSIS (Sleek aerodynamic high-res body) ---
    // Under carriage shadow
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(0, 14 * s, 21 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Side metal rail guards (silver chrome)
    ctx.fillStyle = "#BDC3C7";
    ctx.strokeStyle = "#7F8C8D";
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.roundRect(-14 * s, 8 * s, 25 * s, 4 * s, 2 * s);
    ctx.fill();
    ctx.stroke();

    // Main Nosecone & Body (themed to the character's primary color with 3D gradient)
    const bodyGrad = ctx.createLinearGradient(-15 * s, -4 * s, 18 * s, 12 * s);
    bodyGrad.addColorStop(0, char.primary);
    bodyGrad.addColorStop(0.6, char.primary);
    bodyGrad.addColorStop(1, char.secondary || "#2C3E50");

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2 * s;

    // Drawn as a modern formula-kart pod
    ctx.beginPath();
    ctx.moveTo(-16 * s, 8 * s);
    ctx.lineTo(-12 * s, -1 * s);
    ctx.quadraticCurveTo(-2 * s, -3 * s, 10 * s, 2 * s); // main curvature
    ctx.lineTo(18 * s, 6 * s); // sleek front nose
    ctx.lineTo(16 * s, 12 * s); // front bumper
    ctx.lineTo(-14 * s, 12 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front spoiler nose-wing & spoiler accent color
    const spoilerGrad = ctx.createLinearGradient(10 * s, 3 * s, 19 * s, 11 * s);
    spoilerGrad.addColorStop(0, "#FFFFFF");
    spoilerGrad.addColorStop(0.5, char.primary);
    spoilerGrad.addColorStop(1, "#111111");
    ctx.fillStyle = spoilerGrad;
    ctx.beginPath();
    ctx.moveTo(10 * s, 4 * s);
    ctx.lineTo(19 * s, 5 * s);
    ctx.lineTo(18 * s, 11 * s);
    ctx.lineTo(11 * s, 11 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Racing Number badge white circle
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(4 * s, 6 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Racing digit/letter center (e.g. 'M', 'L', 'W', 'P')
    ctx.fillStyle = "#000000";
    ctx.font = `bold ${6 * s}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char.id[0], 4 * s, 6.5 * s);

    // Steering support bar & Steering Wheel
    ctx.strokeStyle = "#34495E";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(5 * s, 2 * s);
    ctx.lineTo(-1 * s, -4 * s); // bar
    ctx.stroke();

    // Steering wheel (slanted ring)
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.ellipse(-1 * s, -4 * s, 2 * s, 4 * s, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();

    // --- 3. THE DRIVER JUMPER (Sleek high-res shaded graphics) ---
    // Lower overalls torso seated in the middle (x: -5, y: 1)
    ctx.fillStyle = char.palette["B"] || "#0A55DC"; // Blue overalls
    ctx.beginPath();
    ctx.roundRect(-10 * s, -1 * s, 10 * s, 8 * s, 3 * s);
    ctx.fill();
    ctx.stroke();

    // Round golden overall buttons
    ctx.fillStyle = "#F1C40F";
    ctx.beginPath();
    ctx.arc(-4 * s, 2 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.arc(-8 * s, 2 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Red/Green/Purple long sleeves
    ctx.fillStyle = char.primary;
    ctx.beginPath();
    // Left arm holding wheel
    ctx.ellipse(1 * s, -1 * s, 4 * s, 2 * s, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White glove holding wheel
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(3 * s, -2 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Plumber head & Face
    const headX = -5 * s;
    const headY = -9 * s;
    const headR = 6.2 * s;

    // Face skin circle
    ctx.fillStyle = char.palette["S"] || "#FDB883";
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Big shiny racing gaze eye
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(headX + 2.5 * s, headY - 1 * s, 1.5 * s, 2.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = char.id === "LUIGI" ? "#2ECC71" : char.id === "WARIO" ? "#8E44AD" : "#3498DB"; // Pupils color!
    ctx.beginPath();
    ctx.arc(headX + 3.1 * s, headY - 1 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // Cute rounded nose
    ctx.fillStyle = char.palette["S"] || "#FDB883";
    ctx.beginPath();
    ctx.arc(headX + 5.5 * s, headY, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Signature thick curly mustache
    ctx.fillStyle = char.palette["K"] || "#211005";
    ctx.beginPath();
    ctx.ellipse(headX + 3.5 * s, headY + 2.2 * s, 3.5 * s, 1.5 * s, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();

    // Shaded Cap/Helmet
    const capY = headY - 4 * s;
    const capGrad = ctx.createLinearGradient(headX - 7 * s, capY - 4 * s, headX + 7 * s, capY + 1 * s);
    capGrad.addColorStop(0, "#FFFFFF");
    capGrad.addColorStop(0.3, char.primary);
    capGrad.addColorStop(1, char.palette["R"] || char.primary);

    ctx.fillStyle = capGrad;
    ctx.beginPath();
    // Cap dome
    ctx.arc(headX, capY - 0.5 * s, 6.4 * s, Math.PI, 0);
    // Cap visor throwing shade over forehead
    ctx.quadraticCurveTo(headX + 8 * s, capY - 4 * s, headX + 11 * s, capY - 1 * s);
    ctx.lineTo(headX + 6 * s, capY + 1.2 * s);
    ctx.lineTo(headX - 6.4 * s, capY + 1.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cap badge emblem (white circle with character initial)
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(headX, capY - 3 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = char.primary;
    ctx.font = `bold ${3.5 * s}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char.id[0], headX, capY - 2.8 * s);

    // --- 4. RACING TUBE SPORT WHEELS ---
    // We render 2 sports wheels - Front (x: 12, y: 13), Back (x: -12, y: 13)
    const drawSportWheel = (wx: number, wy: number) => {
      ctx.save();
      ctx.translate(wx, wy);
      // Spin rotation based on horizontal travel frame
      ctx.rotate(frame * 0.15);

      // Tire body (dark charcoal)
      const tireGrad = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, 7.5 * s);
      tireGrad.addColorStop(0, "#2C3E50");
      tireGrad.addColorStop(0.7, "#111111");
      tireGrad.addColorStop(1, "#050505");

      ctx.fillStyle = tireGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tire tread details (high-res notches)
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1.2 * s;
      for (let wAngle = 0; wAngle < Math.PI * 2; wAngle += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(wAngle) * 5 * s, Math.sin(wAngle) * 5 * s);
        ctx.lineTo(Math.cos(wAngle) * 7.5 * s, Math.sin(wAngle) * 7.5 * s);
        ctx.stroke();
      }

      // Alloy hubcaps (Silver with center rivet)
      ctx.fillStyle = "#E5E7EB";
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.arc(0, 0, 3.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Golden center axle nut
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(0, 0, 1 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Draw rear wheel
    drawSportWheel(-11 * s, 11 * s);
    // Draw front wheel
    drawSportWheel(12 * s, 11 * s);

    ctx.restore();
  };

  // Parallax Green Hills in background (high-res layered karting speedway landscape)
  const drawHills = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    
    // --- 1. Depth Layer A (Far Mountains, softer dark green with vertical gradients) ---
    const farGrad = ctx.createLinearGradient(0, GAME_HEIGHT - 210, 0, GAME_HEIGHT - 58);
    farGrad.addColorStop(0, "rgba(30, 86, 49, 0.22)");
    farGrad.addColorStop(1, "rgba(14, 58, 30, 0.35)");
    ctx.fillStyle = farGrad;

    // Two big far arches spanning the horizon
    ctx.beginPath();
    ctx.arc(110, GAME_HEIGHT - 55, 145, Math.PI, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(360, GAME_HEIGHT - 55, 165, Math.PI, 0);
    ctx.fill();

    // --- 2. Depth Layer B (Nearer Hills, beautiful vibrant green with highlight rims) ---
    const nearGrad = ctx.createLinearGradient(0, GAME_HEIGHT - 170, 0, GAME_HEIGHT - 55);
    nearGrad.addColorStop(0, "rgba(46, 204, 113, 0.44)");
    nearGrad.addColorStop(1, "rgba(22, 115, 62, 0.52)");
    ctx.fillStyle = nearGrad;

    // Layer of 4 beautiful near overlapping hill arches
    ctx.beginPath();
    ctx.arc(50, GAME_HEIGHT - 55, 96, Math.PI, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(195, GAME_HEIGHT - 55, 118, Math.PI, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(340, GAME_HEIGHT - 55, 126, Math.PI, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(460, GAME_HEIGHT - 55, 102, Math.PI, 0);
    ctx.fill();

    // --- 3. Spectator Speedway elements (Pretty flower bushes on hill tops) ---
    ctx.fillStyle = "rgba(241, 196, 15, 0.55)"; // Soft golden blossom clusters
    const flowerSpots = [
      { x: 50, y: GAME_HEIGHT - 146 },
      { x: 195, y: GAME_HEIGHT - 170 },
      { x: 340, y: GAME_HEIGHT - 178 },
      { x: 460, y: GAME_HEIGHT - 154 }
    ];
    flowerSpots.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.arc(b.x - 5, b.y + 2.8, 4.8, 0, Math.PI * 2);
      ctx.arc(b.x + 5, b.y + 2.8, 4.8, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  // Draw golden spinning coin medallion (gorgeous glossy high-resolution spinning star coin)
  const drawCoin = (ctx: CanvasRenderingContext2D, cx: number, cy: number, frameTick: number) => {
    ctx.save();
    // Use sine rate of elapsed frames for horizontal width rotation scaling
    const widthScale = Math.abs(Math.sin((frameTick * 0.16) + (cx * 0.04)));
    
    // Ambient dark backup shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx + 1, cy + 1.5, 9.5 * widthScale, 11.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer golden round metallic rim (Glossy gradient fill)
    const coinGrad = ctx.createLinearGradient(cx - 9 * widthScale, cy - 11, cx + 9 * widthScale, cy + 11);
    coinGrad.addColorStop(0, "#F5B041");
    coinGrad.addColorStop(0.5, "#F1C40F");
    coinGrad.addColorStop(1, "#D35400");
    ctx.fillStyle = coinGrad;
    
    ctx.strokeStyle = "#9A7D0A"; // Deep luxury gold outline border
    ctx.lineWidth = 1.6;
    
    ctx.beginPath();
    ctx.ellipse(cx, cy, 9.2 * widthScale, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (widthScale > 0.3) {
      // Inner star/groove line stamp detail (classic Mario coin aesthetic)
      ctx.strokeStyle = "#F39C12";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6 * widthScale, 7.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Gleaming central shine rectangle block
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(cx, cy, 1.8 * widthScale, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Specular bright light glare dot at the top-left edge
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.beginPath();
      ctx.arc(cx - 2.8 * widthScale, cy - 3.8, 1.5 * widthScale, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  };

  // Main canvas refresh and update loop
  useEffect(() => {
    let animId: number;
    
    const loop = () => {
      // 1. Core Physics & Game Updates
      updateGame();

      // 2. Render Frame
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

          // RENDER SKY BACKDROP (Gorgeous high-res sky linear altitude gradient)
          const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT - 60);
          skyGrad.addColorStop(0, "#1F618D");   // Royal blue altitude
          skyGrad.addColorStop(0.4, "#2980B9"); // Midday sky blue
          skyGrad.addColorStop(0.8, "#AED6F1"); // Atmospheric sunlit haze
          skyGrad.addColorStop(1, "#EBF5FB");   // Horizon glow
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

          // SUN - Magnificent glowing 3D vector solar aura
          ctx.save();
          const sunX = GAME_WIDTH - 80;
          const sunY = 75;
          const sunRadius = 45;
          
          const sunGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunRadius + 24);
          sunGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");      // Intense white center
          sunGrad.addColorStop(0.2, "rgba(254, 211, 48, 0.90)");     // Rich solar yellow
          sunGrad.addColorStop(0.5, "rgba(253, 150, 68, 0.35)");     // Warm sunset orange flare
          sunGrad.addColorStop(1, "rgba(253, 150, 68, 0)");          // Outer atmosphere fadeout
          
          ctx.fillStyle = sunGrad;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunRadius + 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // RENDER DRIFTING CLOUDS (High-Res 3D Volumetric vector clouds)
          engineState.current.clouds.forEach(cloud => {
            draw3DCloud(ctx, cloud.x, cloud.y, cloud.size);
          });

          // RENDER BACKGROUND PARALLAX HILLS
          drawHills(ctx);

          // RENDER FLOATING CASTLE TOWER OBSTACLES (Vibrant High-Res Green Warp Pipes!)
          engineState.current.obstacles.forEach(obs => {
            // Draw TOP Obstacle (extends from top 0 down to gravity gap boundary)
            const topH = obs.gapY - obs.gapHeight / 2;
            drawWarpPipe(ctx, obs.x, 0, obs.width, topH, true);

            // Draw BOTTOM Obstacle (extends from gap boundary down to grass floor)
            const botY = obs.gapY + obs.gapHeight / 2;
            const botH = (GAME_HEIGHT - 60) - botY;
            drawWarpPipe(ctx, obs.x, botY, obs.width, botH, false);
          });

          // RENDER FLOATING GOLD COINS
          engineState.current.coins.forEach(coin => {
            drawCoin(ctx, coin.x, coin.y, engineState.current.currentFrame);
          });

          // RENDER 3D SPEEDWAY FLOOR
          const groundX = engineState.current.groundScrollX;
          const groundH = 60;
          const groundY = GAME_HEIGHT - 60;
          draw3DSpeedwayFloor(ctx, groundX, groundY, GAME_WIDTH, groundH);

          // Top Border: scrolling Red & White checkered racing curb shoulder matching speedway scroll!
          const curbH = 10; // increase slightly for a chunkier 3D look
          const curbTileW = 20; // width of each checker tile
          const curbY = groundY;
          // Calculate proper scrolling start position
          const curbStartX = groundX % (curbTileW * 2);
          
          for (let cx = curbStartX - curbTileW * 2; cx < GAME_WIDTH + curbTileW * 2; cx += curbTileW * 2) {
            // White checker tile with 3D slope gradient
            const whiteGrad = ctx.createLinearGradient(cx, curbY, cx, curbY + curbH);
            whiteGrad.addColorStop(0, "#FFFFFF");
            whiteGrad.addColorStop(1, "#EAECEE");
            ctx.fillStyle = whiteGrad;
            ctx.fillRect(cx, curbY, curbTileW, curbH);
            
            // Red checker tile with 3D slope gradient
            const redGrad = ctx.createLinearGradient(cx + curbTileW, curbY, cx + curbTileW, curbY + curbH);
            redGrad.addColorStop(0, "#EC7063");
            redGrad.addColorStop(1, "#C0392B");
            ctx.fillStyle = redGrad;
            ctx.fillRect(cx + curbTileW, curbY, curbTileW, curbH);

            // Sleek specular white line segment on top edge of curb to give 3D shiny reflection
            ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
            ctx.fillRect(cx, curbY, curbTileW * 2, 1.5);
          }

          // Sleek dark separation line under racing shoulder
          ctx.fillStyle = "#113A17";
          ctx.fillRect(0, groundY + curbH, GAME_WIDTH, 2);

          // RENDER ACTIVE PARTICLES / SCORE SPARKS (Round 3D glowing vector sparks!)
          engineState.current.particles.forEach(part => {
            ctx.save();
            ctx.fillStyle = part.color;
            ctx.globalAlpha = part.life;
            
            // Add a vibrant 3D neon inner glow
            ctx.shadowColor = part.color;
            ctx.shadowBlur = 6;
            
            ctx.beginPath();
            ctx.arc(part.x, part.y, part.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
          ctx.globalAlpha = 1.0; // restore normal transparency

          // RENDER THE PLUMBER (High-Res 3D/Vector Racing Kart!)
          const playerY = engineState.current.playerY;
          const px = GAME_WIDTH / 4 + 20; // stationary screen placement
          const rotation = engineState.current.playerRotation;
          const size = engineState.current.playerWidth;

          const activeChar = CHARACTERS.find(c => c.id === selectedCharacterId) || CHARACTERS[0];
          drawHighResKartRacer(
            ctx, 
            px, 
            playerY, 
            size, 
            rotation, 
            activeChar, 
            engineState.current.isFlapping, 
            engineState.current.currentFrame
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameStatus, score, highScore, selectedCharacterId, startDifficulty, activeBgmTrack]);

  // Handle global key events for desktop interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spaces, Up Arrow, or Enter initiates action
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameStatus, musicOn, sfxOn]);

  return (
    <div 
      ref={containerRef}
      className="relative flex flex-col items-center justify-center p-1 sm:p-4 select-none w-full max-w-lg mx-auto"
      id="arcade-gamebox"
    >
      {/* Dynamic Status / Retro Score Top Panel */}
      <div className="w-full flex justify-between items-center px-4 py-2 bg-neutral-900 border-x-4 border-t-4 border-neutral-700/80 rounded-t-xl text-neutral-300 font-mono text-xs shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="tracking-wide">MODE: {difficultyLabel}</span>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            id="btn-music"
            onClick={toggleMusic}
            className={`p-1.5 rounded transition ${musicOn ? 'bg-red-600/90 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
            title="Toggle Chiptune Music"
          >
            {musicOn ? <Volume2 size={13} className="text-white" /> : <VolumeX size={13} />}
          </button>
          <button 
            id="btn-sfx"
            onClick={toggleSfx}
            className={`p-1.5 rounded transition ${sfxOn ? 'bg-red-600/90 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
            title="Toggle SFX"
          >
            {sfxOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
        </div>
      </div>

      {/* Main Retro Simulated Monitor Viewport Container */}
      <div 
        onClick={handleJump}
        className="relative shadow-2xl overflow-hidden touch-none border-4 border-neutral-900 bg-black cursor-pointer scanlines crt-screen"
        style={{
          width: "100%",
          maxWidth: `${GAME_WIDTH}px`,
          aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`,
        }}
      >
        {/* Canvas renderer */}
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="w-full h-full block pixelated"
        />

        {/* 1. Score display (top-center, gameplay) */}
        {gameStatus === "PLAYING" && (
          <div className="absolute top-8 left-0 right-0 pointer-events-none flex flex-col items-center">
            <span 
              id="score-overlay"
              style={{ textShadow: "4px 4px 0 #000" }}
              className="font-retro text-4xl text-white tracking-widest leading-none drop-shadow-md"
            >
              {score}
            </span>
          </div>
        )}

        {/* 2. Pause Indicator Trigger */}
        {gameStatus === "PLAYING" && (
          <button
            id="btn-pause-overlay"
            onClick={togglePause}
            className="absolute top-4 right-4 z-25 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg border border-white/20 shadow-md backdrop-blur-xs transition"
          >
            <Pause size={15} />
          </button>
        )}

        {/* 3. MENU SCREEN overlays */}
        {gameStatus === "START" && (
          <div className="absolute inset-0 bg-black/45 flex flex-col justify-between p-6 text-center select-none z-20">
            {/* Title Block */}
            <div className="mt-14 space-y-3">
              <span className="block font-retro text-yellow-400 text-3xl sm:text-4xl leading-tight drop-shadow-[5px_5px_0_rgba(18,18,18,1)] animate-bounce tracking-tight">
                PIXEL<br />PLUMBER
              </span>
              <span className="block font-retro text-white text-md tracking-wider">
                JUMP ADVENTURE
              </span>
            </div>

            {/* Instruction Guides */}
            <div className="bg-neutral-900/90 border-2 border-dashed border-red-500 rounded-xl p-4 mx-4 shadow-xl text-neutral-300 font-mono text-xs leading-relaxed max-w-xs self-center">
              <h3 className="font-retro text-red-400 text-[10px] mb-2 text-center tracking-normal">
                ★ HOW TO PLAY ★
              </h3>
              <ul className="text-left space-y-1.5 list-disc pl-4 text-[11px]">
                <li>Press <span className="bg-neutral-800 text-white px-1 rounded font-bold border border-neutral-600">SPACE</span>, <span className="bg-neutral-800 text-white px-1 rounded font-bold border border-neutral-600">UP ARROW</span> or <span className="bg-red-500 font-retro text-[8px] px-1 text-white rounded">TAP SCREEN</span> to jump.</li>
                <li>Dodge floating brick walls and castle ruins!</li>
                <li>Clear towers to score points & unleash golden star spark bursts.</li>
                <li>Game speed increases as your score rises.</li>
              </ul>
            </div>

            {/* Play CTA Action */}
            <div className="mb-10 space-y-1.5">
              <span className="block font-retro text-neutral-200 text-xs animate-blink tracking-wide">
                - CLICK or TAP TO PLAY -
              </span>
              <p className="font-mono text-[9px] text-neutral-400">
                Turn on Music for real 8-bit procedural soundscapes!
              </p>
            </div>
          </div>
        )}

        {/* 4. PAUSE SCREEN overlay */}
        {gameStatus === "PAUSED" && (
          <div 
            onClick={togglePause}
            className="absolute inset-0 bg-black/75 flex flex-col gap-6 justify-center items-center text-center z-20"
          >
            <div className="bg-neutral-900 border-4 border-yellow-500 p-6 rounded-2xl max-w-xs flex flex-col items-center shadow-2xl">
              <div className="bg-yellow-500/20 text-yellow-400 p-3 rounded-full mb-2">
                <Pause size={28} />
              </div>
              <h2 className="font-retro text-yellow-400 text-lg mb-2 tracking-wide">
                GAME PAUSED
              </h2>
              <p className="font-mono text-neutral-300 text-xs mb-5">
                Take a deep breath! The plumber is resting.
              </p>
              <button
                id="btn-resume"
                onClick={togglePause}
                style={{ boxShadow: "0 4px 0 #7e1e19" }}
                className="bg-red-600 hover:bg-red-500 text-white font-retro text-[10px] py-3.5 px-6 rounded-lg tracking-wider border border-red-400 transition transform hover:-translate-y-0.5 active:translate-y-0"
              >
                RESUME
              </button>
            </div>
          </div>
        )}

        {/* 5. GAMEOVER SCREEN overlay */}
        {gameStatus === "GAMEOVER" && (
          <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center p-6 text-center select-none z-20">
            <div className="bg-neutral-900 border-4 border-red-600 p-6 rounded-2xl max-w-sm w-full flex flex-col items-center shadow-2xl space-y-5">
              
              <div className="space-y-1">
                <span className="block font-retro text-red-500 text-2xl drop-shadow-[3px_3px_0_#211005]">
                  GAME OVER
                </span>
                <span className="block font-mono text-neutral-400 text-[10px]">
                  You hit a castle wall / ground!
                </span>
              </div>

              {/* High Score board */}
              <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-mono">YOUR SCORE:</span>
                  <span className="font-retro text-white text-sm">{score}</span>
                </div>
                <div className="h-px bg-neutral-800/80"></div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-yellow-400 font-mono flex items-center gap-1.5 font-semibold">
                    <Award size={14} className="text-yellow-400 shrink-0" />
                    BEST SCORE:
                  </span>
                  <span className="font-retro text-yellow-400 text-sm flex items-center gap-1">
                    {highScore}
                    {score >= highScore && score > 0 && (
                      <Sparkles size={11} className="text-yellow-400 animate-pulse" />
                    )}
                  </span>
                </div>
              </div>

              {/* Motivational encouragement */}
              <p className="font-mono text-neutral-400 text-[11px] px-2 italic">
                {score >= highScore && score > 0 
                  ? "⭐ UNBELIEVABLE! You broke your high score! ⭐" 
                  : score >= 15 
                    ? "Wow, exceptional flight skills! Give it another go!" 
                    : "You're getting warmer! Press replay to jump again."}
              </p>

              {/* Retry button */}
              <button
                id="btn-replay"
                onClick={handleJump}
                style={{ boxShadow: "0 4px 0 #b38600" }}
                className="bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-retro text-[10px] py-4 px-8 rounded-xl tracking-widest border-2 border-yellow-200 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              >
                <RotateCcw size={13} className="stroke-[3]" />
                REPLAY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🎮 RETRO ARCADE OPTIONS CABINET DASHBOARD */}
      <div 
        className="w-full mt-4 bg-neutral-900 border-4 border-neutral-800 rounded-2xl p-4 text-left font-mono drop-shadow-xl space-y-4"
        id="arcade-dashboard"
      >
        <div className="border-b border-neutral-800 pb-2 flex justify-between items-center text-xs">
          <span className="text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <Sparkles size={13} className="text-yellow-400 shrink-0" /> CUSTOM CUSTOMIZATIONS
          </span>
          <span className="text-neutral-500 font-mono text-[9px]">SYSTEM: CHIP-CABINET</span>
        </div>

        {/* 1. CHARACTER SELECTOR */}
        <div>
          <span className="block text-[10px] font-bold text-neutral-400 mb-2 uppercase tracking-wider">
            ★ SELECT YOUR HERO JUMPER:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTERS.map(char => {
              const isSelected = selectedCharacterId === char.id;
              return (
                <button
                  key={char.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCharacterId(char.id);
                    retroAudio.playJump();
                  }}
                  className={`relative flex items-center gap-2.5 p-2 rounded-xl text-left transition border ${
                    isSelected 
                      ? 'bg-neutral-800 border-yellow-400 text-white shadow-md' 
                      : 'bg-neutral-950 border-neutral-800/80 hover:bg-neutral-800/40 text-neutral-400'
                  }`}
                  id={`char-select-${char.id}`}
                >
                  {/* Dynamic mini-badge preview */}
                  <div 
                    className="w-5.5 h-5.5 rounded-md shrink-0 border border-neutral-800 flex items-center justify-center text-white font-bold text-[10px]"
                    style={{ 
                      backgroundColor: char.primary, 
                      textShadow: "1px 1px 0px rgba(0,0,0,0.8)" 
                    }}
                  >
                    {char.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold truncate leading-none mb-0.5">{char.name}</span>
                    <span className="block text-[8px] text-neutral-500 truncate leading-none">{char.funFact}</span>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. GAME DIFFICULTY SELECTOR */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-[10px] font-bold text-neutral-400 mb-2 uppercase tracking-wider">
              ★ PHYSICS DIFFICULTY:
            </span>
            <div className="flex bg-neutral-950 rounded-lg p-0.5 border border-neutral-850 w-full" id="diff-toggle-group">
              {(["NOVICE", "CHALLENGING", "EXPERT"] as const).map(diff => {
                const isSel = startDifficulty === diff;
                return (
                  <button
                    key={diff}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStartDifficulty(diff);
                      retroAudio.playPoint();
                    }}
                    className={`flex-1 text-center py-2 text-[8px] font-bold rounded transition ${
                      isSel
                        ? 'bg-red-500 text-white font-extrabold shadow-inner'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                    id={`diff-btn-${diff}`}
                  >
                    {diff === "NOVICE" ? "EASY" : diff === "CHALLENGING" ? "NORMAL" : "HARD"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. BGM TRACK SELECTOR */}
          <div>
            <span className="block text-[10px] font-bold text-neutral-400 mb-2 uppercase tracking-wider">
              ★ MUSIC MIX TRACK:
            </span>
            <div className="flex bg-neutral-950 rounded-lg p-0.5 border border-neutral-850 w-full" id="track-toggle-group">
              {(["CASTLE", "SPEEDWAY"] as const).map(track => {
                const isSel = activeBgmTrack === track;
                return (
                  <button
                    key={track}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBgmTrack(track);
                      retroAudio.playStart();
                    }}
                    className={`flex-1 text-center py-2 text-[8px] font-bold rounded transition ${
                      isSel
                        ? 'bg-yellow-400 text-neutral-950 font-extrabold'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                    id={`track-btn-${track}`}
                  >
                    {track === "CASTLE" ? "CASTLE 🏰" : "SPEEDRUN 🏁"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Under-couch visual controls info for accessibility & guidance */}
      <div className="w-full mt-3 px-4 py-2 bg-neutral-800/50 rounded-xl font-mono text-[10px] text-neutral-400 text-center border border-neutral-700/60 leading-normal">
        <span>Desktop: <b>SPACEBAR</b> or <b>UP ARROW</b> to jump.</span>
        <span className="ml-3 border-l border-neutral-700 pl-3">Mobile: <b>TAP</b> anywhere inside the screen.</span>
      </div>
    </div>
  );
}

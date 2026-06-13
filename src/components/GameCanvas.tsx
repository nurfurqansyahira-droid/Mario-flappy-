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
    retroAudio.playGameOver();
  };

  // Drawing routines inside canvas context
  const drawGrassSegment = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // bg-[#71C358]
    ctx.fillStyle = "#71C358";
    ctx.fillRect(x, y, w, h);
    
    // Draw repeating 45deg stripe background overlay (with low opacity, matching design's repeating-linear-gradient)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 2.5;
    for (let currentX = x - h; currentX < x + w + h; currentX += 20) {
      ctx.beginPath();
      ctx.moveTo(currentX, y);
      ctx.lineTo(currentX + h, y + h);
      ctx.stroke();
    }
  };

  // Draw sleek stylish cloud (matches rounded-full opacity-80 shadow-[20px_10px_0_10px_white,-10px_5px_0_5px_white])
  const drawPixCloud = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) => {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    const r = 18 * scale;
    // Main base
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    // Left puff shadow
    ctx.arc(cx - r * 0.9, cy + r * 0.2, r * 0.65, 0, Math.PI * 2);
    // Right secondary puff
    ctx.arc(cx + r * 1.1, cy + r * 0.1, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Draw 8-bit bricks inside floating obstacle towers
  const drawBrickWall = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    w: number, 
    h: number,
    isTop: boolean
  ) => {
    ctx.save();
    
    // Standard tower border container shadow
    ctx.strokeStyle = "#1a0805";
    ctx.lineWidth = 4;
    ctx.fillStyle = PALETTE.brickRed;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    // Brick detailing pattern
    const brickH = 14;
    const brickW = 24;
    ctx.strokeStyle = PALETTE.brickDark;
    ctx.lineWidth = 2.5;

    // Draw bounds horizontal lines
    for (let currentY = 0; currentY < h; currentY += brickH) {
      ctx.beginPath();
      ctx.moveTo(x, y + currentY);
      ctx.lineTo(x + w, y + currentY);
      ctx.stroke();

      // Horizontal bright highlight on top of brick row
      ctx.fillStyle = PALETTE.brickLight;
      ctx.fillRect(x + 2, y + currentY + 1, w - 4, 1.5);

      // Stagger vertical joints
      const rowNum = Math.floor(currentY / brickH);
      const isShifted = rowNum % 2 === 0;
      const startX = isShifted ? brickW / 2 : 0;
      
      for (let currentX = startX; currentX < w; currentX += brickW) {
        ctx.beginPath();
        ctx.moveTo(x + currentX, y + currentY);
        ctx.lineTo(x + currentX, y + currentY + brickH);
        ctx.stroke();

        // Dark right-edge shadow
        ctx.fillStyle = PALETTE.brickDark;
        ctx.fillRect(x + currentX - 1.5, y + currentY + 2, 1.5, brickH - 3);
      }
    }

    // Capping Stone (Tower Edge Interface / Castle crenellations)
    // Draw capping blocks at the end where player passes
    const capHeight = 26;
    const capY = isTop ? (y + h - capHeight) : y;
    
    // Draw actual capping block
    ctx.fillStyle = "#bdc3c7";
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 3.5;
    
    // Cap overhangs slightly on the sides
    const margin = 5;
    const capX = x - margin;
    const capW = w + margin * 2;
    
    ctx.fillRect(capX, capY, capW, capHeight);
    ctx.strokeRect(capX, capY, capW, capHeight);

    // Highlight top-left stone
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(capX + 2, capY + 2, capW - 4, 3);
    ctx.fillRect(capX + 2, capY + 2, 3, capHeight - 4);

    // Stone borders shadow
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(capX + capW - 4, capY + 2, 2.5, capHeight - 4);
    ctx.fillRect(capX + 2, capY + capHeight - 4, capW - 4, 2.5);

    // Add castle detailing slits on the coping stones
    ctx.fillStyle = "#2c3e50";
    // 3 blocks slots
    const slotW = 10;
    const slotH = 12;
    const slitY = isTop ? (capY + capHeight - slotH) : capY;
    ctx.fillRect(capX + capW / 4 - slotW / 2, slitY, slotW, slotH);
    ctx.fillRect(capX + (capW * 3) / 4 - slotW / 2, slitY, slotW, slotH);

    ctx.restore();
  };

  // Renders the plumber using 16x16 pixel blocks scaled to fit
  const drawPixelPlumber = (
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pw: number,
    ph: number,
    angle: number,
    frame: string[],
    palette: Record<string, string>
  ) => {
    ctx.save();
    
    // Translate and rotate around plumber center
    ctx.translate(px, py);
    ctx.rotate(angle);

    const pixelW = pw / 16;
    const pixelH = ph / 16;

    // Draw pixel grid centered around (0,0)
    for (let r = 0; r < 16; r++) {
      const rowStr = frame[r];
      const screenY = -ph / 2 + r * pixelH;
      
      for (let c = 0; c < 16; c++) {
        const char = rowStr[c];
        if (char !== "." && palette[char]) {
          ctx.fillStyle = palette[char];
          // Round positions slightly to maintain solid crisp pixels
          ctx.fillRect(
            Math.round(-pw / 2 + c * pixelW), 
            Math.round(screenY), 
            Math.ceil(pixelW), 
            Math.ceil(pixelH)
          );
        }
      }
    }

    ctx.restore();
  };

  // Parallax Green Hills in background
  const drawHills = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.fillStyle = "rgba(78, 163, 60, 0.40)"; // #4EA33C with 40% opacity

    // Draw the 4 overlapping rounded hill arches exactly like the Sleek template:
    // Hill A: w-[400px] h-[200px] rounded-t-[100px]
    ctx.beginPath();
    ctx.arc(80, GAME_HEIGHT - 60, 100, Math.PI, 0);
    ctx.fill();

    // Hill B: w-[350px] h-[160px] rounded-t-[90px]
    ctx.beginPath();
    ctx.arc(190, GAME_HEIGHT - 60, 90, Math.PI, 0);
    ctx.fill();

    // Hill C: w-[450px] h-[220px] rounded-t-[120px]
    ctx.beginPath();
    ctx.arc(310, GAME_HEIGHT - 60, 120, Math.PI, 0);
    ctx.fill();

    // Hill D: w-[380px] h-[180px] rounded-t-[100px]
    ctx.beginPath();
    ctx.arc(440, GAME_HEIGHT - 60, 100, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  };

  // Draw golden spinning coin medallion
  const drawCoin = (ctx: CanvasRenderingContext2D, cx: number, cy: number, frameTick: number) => {
    ctx.save();
    // Beautiful spinning coin: use Math.abs of sine for metallic width scaling
    const widthScale = Math.abs(Math.sin((frameTick * 0.15) + (cx * 0.05)));
    
    // Outer golden metallic body
    ctx.fillStyle = "#F39C12"; // Deep gold
    ctx.strokeStyle = "#F1C40F"; // Shiny bright gold
    ctx.lineWidth = 1.8;
    
    ctx.beginPath();
    ctx.ellipse(cx, cy, 9 * widthScale, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Secondary inner shine details
    if (widthScale > 0.25) {
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(cx - 2 * widthScale, cy - 2, 1.8 * widthScale, 3.5, 0, 0, Math.PI * 2);
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

          // RENDER SKY BACKDROP (Height Gradient)
          const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT - 60);
          grad.addColorStop(0, PALETTE.clearSky);
          grad.addColorStop(1, PALETTE.darkSky);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

          // SUN - Beautiful retro pixel circle
          ctx.fillStyle = "rgba(255, 235, 140, 0.55)";
          ctx.beginPath();
          ctx.arc(GAME_WIDTH - 80, 70, 48, 0, Math.PI * 2);
          ctx.fill();

          // RENDER DRIFTING CLOUDS
          engineState.current.clouds.forEach(cloud => {
            drawPixCloud(ctx, cloud.x, cloud.y, cloud.size);
          });

          // RENDER BACKGROUND PARALLAX HILLS
          drawHills(ctx);

          // RENDER FLOATING CASTLE TOWER OBSTACLES
          engineState.current.obstacles.forEach(obs => {
            // Draw TOP Obstacle (extends from top 0 down to gravity gap boundary)
            const topH = obs.gapY - obs.gapHeight / 2;
            drawBrickWall(ctx, obs.x, 0, obs.width, topH, true);

            // Draw BOTTOM Obstacle (extends from gap boundary down to grass floor)
            const botY = obs.gapY + obs.gapHeight / 2;
            const botH = (GAME_HEIGHT - 60) - botY;
            drawBrickWall(ctx, obs.x, botY, obs.width, botH, false);
          });

          // RENDER FLOATING GOLD COINS
          engineState.current.coins.forEach(coin => {
            drawCoin(ctx, coin.x, coin.y, engineState.current.currentFrame);
          });

          // RENDER SOIL SCROLLING GROUND
          const groundX = engineState.current.groundScrollX;
          const groundH = 60;
          const groundY = GAME_HEIGHT - 60;
          
          // Draw multiple segments side-by-side to allow slide-scrolling seamlessly
          for (let i = 0; i <= Math.ceil(GAME_WIDTH / 48) + 1; i++) {
            drawGrassSegment(ctx, groundX + i * 48, groundY, 48, 60);
          }

          // Top Border of the ground z-40 relative: border-t-8 border-[#4EA33C]
          ctx.fillStyle = "#4EA33C";
          ctx.fillRect(0, groundY, GAME_WIDTH, 8);

          // RENDER ACTIVE PARTICLES / SCORE SPARKS
          engineState.current.particles.forEach(part => {
            ctx.fillStyle = part.color;
            ctx.globalAlpha = part.life;
            ctx.fillRect(part.x - part.size/2, part.y - part.size/2, part.size, part.size);
          });
          ctx.globalAlpha = 1.0; // restore normal transparency

          // RENDER THE PLUMBER
          const playerY = engineState.current.playerY;
          const px = GAME_WIDTH / 4 + 20; // stationary screen placement
          const rotation = engineState.current.playerRotation;
          const size = engineState.current.playerWidth;
          const activeSprite = engineState.current.isFlapping ? SPRITE_JUMP : SPRITE_NORMAL;

          const activeChar = CHARACTERS.find(c => c.id === selectedCharacterId) || CHARACTERS[0];
          drawPixelPlumber(ctx, px, playerY, size, size, rotation, activeSprite, activeChar.palette);
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

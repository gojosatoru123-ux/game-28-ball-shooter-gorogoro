import React, { useRef, useEffect, useState, useCallback } from 'react';
import { HandTracker } from '../lib/handTracking';
import { useGameLoop } from '../hooks/useGameLoop';
import { Disc, Particle, GameState, HandData, Point, DiscType } from '../types';
import { cn } from '../lib/utils';
import { sounds } from '../lib/sounds';
import { Target, Trophy, MousePointer2, AlertCircle } from 'lucide-react';

const SPAWN_INTERVAL = 1200;
const MAX_DISCS = 8;
const CURSOR_SMOOTHING = 0.25;

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [tracker] = useState(() => new HandTracker());
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    isGameOver: false,
    isStarted: false,
    highScore: 0,
    accuracy: 100,
    shotsFired: 0,
    shotsHit: 0,
    combo: 0,
    maxCombo: 0,
    level: 1,
    isSlowMo: false,
    slowMoTimer: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentHandPoint, setCurrentHandPoint] = useState<Point | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const discsRef = useRef<Disc[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const uiTextsRef = useRef<{ x: number, y: number, text: string, life: number, color: string }[]>([]);
  const handsRef = useRef<HandData[]>([
    { point: { x: 0, y: 0 }, isShooting: false, isVisible: false },
    { point: { x: 0, y: 0 }, isShooting: false, isVisible: false }
  ]);
  const smoothedHandsRef = useRef<Point[]>([{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }]);
  const lastSpawnTimeRef = useRef(0);
  const werePinchingRef = useRef<boolean[]>([false, false]);
  const shakeIntensityRef = useRef(0);
  const flashAlphaRef = useRef(0);
  const flashColorRef = useRef('#fff');
  const shotFXRef = useRef<{ x: number, y: number, life: number }[]>([]);
  const lasersRef = useRef<{ x1: number, y1: number, x2: number, y2: number, life: number }[]>([]);

  // Dedicated initialization function allowing synchronous caller gesture
  const initSystem = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Request camera access with extremely relaxed constraints to prevent OverconstrainedError
      // which some mobile browsers mask as permission errors.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
      } catch (fallbackErr) {
        console.warn("High-res camera failed, falling back to basic video:", fallbackErr);
        // Fallback: Absolute basic video request if constraints fail
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 2. Initialize heavy AI models only after camera is approved
      await tracker.initialize();
      
      if (videoRef.current) {
        tracker.setVideo(videoRef.current);
      }
      
      setIsReady(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Camera Init Error:", err);
      // Detailed error translation for mobile UI
      let errorMsg = "Camera access failed.";
      const errStr = String(err.message || err.name || '').toLowerCase();
      
      if (err.name === 'NotAllowedError' || errStr.includes('denied') || errStr.includes('permission')) {
        errorMsg = "CAMERA BLOCKED BY DEVICE. Tap the 'Aa' or 'Lock' icon in your browser's address bar, choose 'Website Settings', allow Camera access, and click Retry.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "No camera hardware detected on this device.";
      } else {
        errorMsg = err.message || "Unknown camera error occurred.";
      }
      
      setError(errorMsg);
      setIsLoading(false);
    }
  }, [tracker]);

  // Initial Boot
  useEffect(() => {
    initSystem();
    
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [initSystem]);

  const spawnDisc = useCallback((width: number, height: number, time: number) => {
    const id = Math.random().toString(36).substring(7);
    const rand = Math.random();
    
    let type: DiscType = 'normal';
    let color = `hsl(${Math.random() * 360}, 80%, 60%)`;
    let points = 50;
    let radius = 25 + Math.random() * 20;
    let speedMult = 1 + (gameState.level - 1) * 0.2;

    if (rand > 0.95) {
      type = 'gold';
      color = '#fbbf24';
      points = 250;
      radius = 18;
      speedMult *= 1.8;
    } else if (rand > 0.88) {
      type = 'bomb';
      color = '#ef4444';
      points = -500;
      radius = 35;
    } else if (rand > 0.82) {
      type = 'slowmo';
      color = '#06b6d4';
      points = 100;
      radius = 28;
    } else if (rand > 0.75) {
      type = 'shielded';
      color = '#a855f7';
      points = 300;
      radius = 32;
    } else if (rand > 0.68) {
      type = 'splitting';
      color = '#f97316';
      points = 200;
      radius = 30;
    } else if (rand > 0.62) {
      type = 'ghost';
      color = '#94a3b8';
      points = 150;
      radius = 26;
    }

    const priceScaling = type === 'shielded' ? (gameState.level > 5 ? 3 : 2) : 0;
    const angle = Math.random() * Math.PI * 2;
    const speed = (2 + Math.random() * 3) * speedMult;

    const disc: Disc = {
      id,
      type,
      x: Math.random() * (width - radius * 2) + radius,
      y: Math.random() * (height - radius * 2) + radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      color,
      points,
      isDead: false,
      spawnTime: time,
      scale: 0,
      health: priceScaling || 1,
      maxHealth: priceScaling || 1,
      opacity: 1
    };
    discsRef.current.push(disc);
    lastSpawnTimeRef.current = time;
  }, [gameState.level]);

  const createParticles = (x: number, y: number, color: string, type: 'normal' | 'bomb' | 'gold' = 'normal') => {
    const count = type === 'normal' ? 15 : 30;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(36),
        x,
        y,
        vx: (Math.random() - 0.5) * (type === 'gold' ? 20 : 12),
        vy: (Math.random() - 0.5) * (type === 'gold' ? 20 : 12),
        life: 1.0,
        color,
        size: Math.random() * (type === 'gold' ? 6 : 4) + 2
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string = '#fff') => {
    uiTextsRef.current.push({ x, y, text, life: 1.0, color });
  };

  const update = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = canvas;

    // Hand tracking detection
    const results = tracker.detect();
    
    // Reset visibility for hands to re-detect
    handsRef.current.forEach(h => h.isVisible = false);

    if (results && results.landmarks && results.landmarks.length > 0) {
      results.landmarks.slice(0, 2).forEach((landmarks, index) => {
        const indexTip = landmarks[8];
        const targetX = (1 - indexTip.x); 
        const targetY = indexTip.y;

        smoothedHandsRef.current[index].x += (targetX - smoothedHandsRef.current[index].x) * CURSOR_SMOOTHING;
        smoothedHandsRef.current[index].y += (targetY - smoothedHandsRef.current[index].y) * CURSOR_SMOOTHING;

        if (index === 0) {
          setCurrentHandPoint({ x: smoothedHandsRef.current[0].x, y: smoothedHandsRef.current[0].y });
        }

        const isPinching = HandTracker.checkPinch(landmarks);
        const handX = smoothedHandsRef.current[index].x * width;
        const handY = smoothedHandsRef.current[index].y * height;
        const wasPinching = werePinchingRef.current[index];

        handsRef.current[index] = {
          point: { x: handX, y: handY },
          isShooting: isPinching && !wasPinching,
          isVisible: true
        };

        if (isPinching && !wasPinching && gameState.isStarted) {
          sounds.playShot();
          handleShoot(handsRef.current[index].point);
          shotFXRef.current.push({ x: handX, y: handY, life: 1.0 });
          
          lasersRef.current.push({
            x1: handX,
            y1: handY,
            x2: handX + (Math.random() - 0.5) * 50,
            y2: handY + (Math.random() - 0.5) * 50,
            life: 1.0
          });
        }
        werePinchingRef.current[index] = isPinching;
      });
    }

    if (!gameState.isStarted || gameState.isGameOver) return;

    // SlowMo timer
    if (gameState.isSlowMo) {
      if (gameState.slowMoTimer > 0) {
        setGameState(prev => ({ ...prev, slowMoTimer: prev.slowMoTimer - 16.6 }));
      } else {
        setGameState(prev => ({ ...prev, isSlowMo: false, slowMoTimer: 0 }));
      }
    }

    const timeScale = gameState.isSlowMo ? 0.35 : 1.0;

    // Spawning
    const effectiveInterval = SPAWN_INTERVAL / (1 + (gameState.level - 1) * 0.15);
    if (time - lastSpawnTimeRef.current > effectiveInterval && discsRef.current.length < MAX_DISCS + gameState.level) {
      spawnDisc(width, height, time);
    }

    // Update Discs
    discsRef.current.forEach(disc => {
      disc.x += disc.vx * timeScale;
      disc.y += disc.vy * timeScale;

      if (disc.scale < 1) disc.scale += 0.05;

      // Bounce
      if (disc.x - disc.radius < 0 || disc.x + disc.radius > width) {
        disc.vx *= -1;
        disc.x = disc.x < disc.radius ? disc.radius : width - disc.radius;
      }
      if (disc.y - disc.radius < 0 || disc.y + disc.radius > height) {
        disc.vy *= -1;
        disc.y = disc.y < disc.radius ? disc.radius : height - disc.radius;
      }

      // Ghost effect
      if (disc.type === 'ghost') {
        disc.opacity = 0.3 + Math.abs(Math.sin(time / 500)) * 0.7;
      }
    });

    // Update Particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx * timeScale;
      p.y += p.vy * timeScale;
      p.life -= 0.02;
      return p.life > 0;
    });

    // Update Floating texts
    uiTextsRef.current = uiTextsRef.current.filter(t => {
      t.y -= 1.2;
      t.life -= 0.015;
      return t.life > 0;
    });

    // Update Shot FX
    shotFXRef.current = shotFXRef.current.filter(fx => {
      fx.life -= 0.1;
      return fx.life > 0;
    });

    // Update Laser
    lasersRef.current = lasersRef.current.filter(laser => {
      laser.life -= 0.15;
      return laser.life > 0;
    });

    // Update Flash
    if (flashAlphaRef.current > 0) {
      flashAlphaRef.current -= 0.01;
    }

    // Handle Shake
    if (shakeIntensityRef.current > 0) {
      shakeIntensityRef.current -= 0.5;
    }
  }, [tracker, gameState.isStarted, gameState.isGameOver, spawnDisc]);

  const handleShoot = (shootPoint: Point) => {
    let hitSomething = false;

    setGameState(prev => ({ ...prev, shotsFired: prev.shotsFired + 1 }));

    discsRef.current = discsRef.current.filter(disc => {
      const dist = Math.sqrt(Math.pow(disc.x - shootPoint.x, 2) + Math.pow(disc.y - shootPoint.y, 2));
      
      // Multi-hit check
      if (dist < disc.radius) {
        // Ghost check: only hittable if opacity > 0.5
        if (disc.type === 'ghost' && (disc.opacity || 0) < 0.5) return true;

        hitSomething = true;
        
        if (disc.type === 'bomb') {
          handleBombHit(disc);
          return false;
        }

        if (disc.type === 'shielded' && disc.health && disc.health > 1) {
          disc.health -= 1;
          createParticles(disc.x, disc.y, disc.color, 'normal');
          addFloatingText(disc.x, disc.y, "BLOCKED", disc.color);
          sounds.playShieldHit();
          shakeIntensityRef.current = 5;
          return true;
        }

        if (disc.type === 'splitting') {
          handleSplittingHit(disc);
          return false;
        }

        handleTargetHit(disc);
        return false;
      }
      return true;
    });

    if (!hitSomething) {
      sounds.playMiss();
      // Miss logic
      setGameState(prev => ({ 
        ...prev, 
        combo: 0,
        accuracy: Math.round((prev.shotsHit / (prev.shotsFired + 1)) * 100)
      }));
      shakeIntensityRef.current = 4;
      flashAlphaRef.current = 0.15;
      flashColorRef.current = '#ff0000';
    }
  };

  const handleTargetHit = (disc: Disc) => {
    const comboBonus = gameState.combo + 1;
    const finalPoints = Math.round(disc.points * (1 + comboBonus * 0.1));
    
    // Play correct hit sound
    if (disc.type === 'gold') sounds.playGoldHit();
    else sounds.playHit();

    createParticles(disc.x, disc.y, disc.color, disc.type === 'gold' ? 'gold' : 'normal');
    addFloatingText(disc.x, disc.y, `+${finalPoints}`, disc.color);
    if (comboBonus > 1) {
      addFloatingText(disc.x - 20, disc.y - 25, `${comboBonus}x COMBO`, '#fff');
    }

    if (disc.type === 'slowmo') {
      setGameState(prev => ({ ...prev, isSlowMo: true, slowMoTimer: 5000 }));
      addFloatingText(disc.x, disc.y - 40, "SLOW MOTION ACTIVE!", "#06b6d4");
      sounds.playSlowMoActivate();
    }

    shakeIntensityRef.current = 10;
    flashAlphaRef.current = 0.2;
    flashColorRef.current = disc.color;
    setGameState(prev => {
      const nextCombo = prev.combo + 1;
      const nextScore = prev.score + finalPoints;
      // Level up every 1500 points
      const nextLevel = Math.floor(nextScore / 1500) + 1;
      
      if (nextLevel > prev.level) {
        sounds.playLevelUp();
      }

      return {
        ...prev,
        score: nextScore,
        shotsHit: prev.shotsHit + 1,
        combo: nextCombo,
        maxCombo: Math.max(prev.maxCombo, nextCombo),
        accuracy: Math.round(((prev.shotsHit + 1) / (prev.shotsFired + 1)) * 100),
        level: nextLevel
      };
    });
  };

  const handleBombHit = (disc: Disc) => {
    sounds.playBombHit();
    createParticles(disc.x, disc.y, '#ef4444', 'bomb');
    addFloatingText(disc.x, disc.y, "-500 BOMB!", "#ef4444");
    shakeIntensityRef.current = 25;
    setGameState(prev => ({
      ...prev,
      score: Math.max(0, prev.score - 500),
      combo: 0,
      accuracy: Math.round((prev.shotsHit / (prev.shotsFired + 1)) * 100)
    }));
  };

  const handleSplittingHit = (disc: Disc) => {
    sounds.playHit();
    createParticles(disc.x, disc.y, disc.color, 'normal');
    addFloatingText(disc.x, disc.y, "SPLIT!", disc.color);
    
    // Spawn 3 mini discs
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i;
      const radius = 15;
      discsRef.current.push({
        id: Math.random().toString(36).substring(7),
        type: 'normal',
        x: disc.x,
        y: disc.y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        radius,
        color: disc.color,
        points: 50,
        isDead: false,
        spawnTime: performance.now(),
        scale: 1,
        health: 1
      });
    }
    
    handleTargetHit(disc);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { width, height } = canvas;

    // Apply Shake
    ctx.save();
    if (shakeIntensityRef.current > 0) {
      const dx = (Math.random() - 0.5) * shakeIntensityRef.current;
      const dy = (Math.random() - 0.5) * shakeIntensityRef.current;
      ctx.translate(dx, dy);
    }

    ctx.clearRect(0, 0, width, height);

    // Draw Blur Background (Cyberpunk feel)
    // Actually, we'll keep it clean for performance

    // Draw Discs
    discsRef.current.forEach(disc => {
      const drawRadius = disc.radius * disc.scale;
      const opacity = disc.opacity !== undefined ? disc.opacity : 1;
      
      ctx.save();
      ctx.globalAlpha = opacity;
      
      ctx.beginPath();
      ctx.arc(disc.x, disc.y, drawRadius, 0, Math.PI * 2);
      
      // Radiant glow fill (Sleek Theme)
      const gradient = ctx.createRadialGradient(disc.x, disc.y, drawRadius * 0.2, disc.x, disc.y, drawRadius);
      gradient.addColorStop(0, disc.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
      
      ctx.fillStyle = gradient;
      ctx.shadowBlur = disc.type === 'gold' ? 60 : 40;
      ctx.shadowColor = disc.color;
      ctx.fill();

      // Shield layers
      if (disc.type === 'shielded' && disc.health) {
        for (let i = 0; i < disc.health; i++) {
          ctx.beginPath();
          ctx.arc(disc.x, disc.y, drawRadius + (i * 4) + 4, 0, Math.PI * 2);
          ctx.strokeStyle = disc.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Splitting disc pulse
      if (disc.type === 'splitting') {
        const pulse = Math.abs(Math.sin(performance.now() / 200)) * 5;
        ctx.beginPath();
        ctx.arc(disc.x, disc.y, drawRadius + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Inner double border details
      ctx.globalAlpha = opacity * 0.9;
      ctx.beginPath();
      ctx.arc(disc.x, disc.y, drawRadius * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = disc.type === 'bomb' ? '#000' : '#fff';
      ctx.lineWidth = disc.type === 'gold' ? 6 : 4;
      ctx.stroke();

      if (disc.type === 'gold') {
        // Sparkling gold rings
        ctx.beginPath();
        ctx.arc(disc.x, disc.y, drawRadius * 0.95, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Target ID label or Type Label
      ctx.fillStyle = disc.color;
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      const label = disc.type === 'normal' ? `LVL_${gameState.level}_T` : disc.type.toUpperCase();
      ctx.fillText(label, disc.x, disc.y - drawRadius - 10);

      ctx.restore();
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw UI Texts (Floating Score/Combos)
    uiTextsRef.current.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.font = 'black 18px Inter';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });

    // Draw Shot FX
    shotFXRef.current.forEach(fx => {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4 * fx.life;
      ctx.globalAlpha = fx.life;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 40 * (1 - fx.life), 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1.0;

    // Draw Crosshair (Reticle - Sleek Theme)
    handsRef.current.forEach((hand, index) => {
      if (hand.isVisible) {
        const { point } = hand;
        const wasPinching = werePinchingRef.current[index];

        ctx.lineWidth = 1;
        ctx.strokeStyle = index === 0 ? 'rgba(6, 182, 212, 0.8)' : 'rgba(236, 72, 153, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = index === 0 ? 'rgba(6,182,212,0.5)' : 'rgba(236,72,153,0.5)';
        
        // Main circular border
        ctx.beginPath();
        ctx.arc(point.x, point.y, 40, 0, Math.PI * 2);
        ctx.stroke();

        // Dashed outer ring
        ctx.save();
        ctx.strokeStyle = index === 0 ? 'rgba(6, 182, 212, 0.3)' : 'rgba(236, 72, 153, 0.3)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Axis lines
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - 45); ctx.lineTo(point.x, point.y - 30);
        ctx.moveTo(point.x, point.y + 45); ctx.lineTo(point.x, point.y + 30);
        ctx.moveTo(point.x - 45, point.y); ctx.lineTo(point.x - 30, point.y);
        ctx.moveTo(point.x + 45, point.y); ctx.lineTo(point.x + 30, point.y);
        ctx.stroke();

        // Center laser point
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? '#06b6d4' : '#ec4899';
        ctx.fill();

        // Aim Status Label
        if (wasPinching) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(point.x - 35, point.y - 65, 70, 16);
          ctx.fillStyle = index === 0 ? '#06b6d4' : '#ec4899';
          ctx.font = 'bold 8px Inter';
          ctx.textAlign = 'center';
          ctx.fillText('AIM_LOCKED', point.x, point.y - 54);
        }
        
        ctx.shadowBlur = 0;
      }
    });

    // Draw Laser
    lasersRef.current.forEach(laser => {
      ctx.save();
      ctx.globalAlpha = laser.life;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 15 * laser.life;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00f2fe';
      ctx.beginPath();
      ctx.moveTo(laser.x1, laser.y1);
      ctx.lineTo(laser.x2, laser.y2);
      ctx.stroke();

      ctx.lineWidth = 4 * laser.life;
      ctx.strokeStyle = '#00f2fe';
      ctx.stroke();
      ctx.restore();
    });

    // Draw Screen Flash
    if (flashAlphaRef.current > 0) {
      ctx.fillStyle = flashColorRef.current;
      ctx.globalAlpha = flashAlphaRef.current;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }, []);

  useGameLoop((time) => {
    update(time);
    draw();
  }, !isLoading && !error);

  const startGame = async () => {
    // Only request fullscreen on mobile devices to pre-empt desktop takeover
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (containerRef.current && !isFullscreen && isMobile) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn("Fullscreen request failed:", err);
      });
      setIsFullscreen(true);
    }

    if (!isReady) return;

    setGameState(prev => ({ 
      ...prev, 
      isStarted: true, 
      isGameOver: false, 
      score: 0,
      shotsFired: 0,
      shotsHit: 0,
      accuracy: 100,
      combo: 0,
      level: 1,
      isSlowMo: false,
      slowMoTimer: 0
    }));
    discsRef.current = [];
    particlesRef.current = [];
    uiTextsRef.current = [];
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#05070a] overflow-hidden flex flex-col items-center justify-center font-sans select-none">
      {/* Orientation Lock Prompt */}
      <div className="portrait-lock">
        <div className="w-16 h-16 mb-6 text-cyan-400 rotate-90 animate-pulse">
          <MousePointer2 className="w-full h-full" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">HORIZONTAL_ONLY</h2>
        <p className="text-white/50 text-sm uppercase tracking-widest">Rotate your device to enter target space</p>
      </div>

      {/* HUD Bar */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-8 flex justify-between items-start z-20 pointer-events-none">
        <div className="flex gap-4 sm:gap-12 items-center pointer-events-none sm:hud-glass sm:rounded-2xl sm:px-6 sm:py-4">
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-0 sm:mb-1">Score</span>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-xl sm:text-3xl font-mono font-black text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                {gameState.score.toLocaleString('en-US', { minimumIntegerDigits: 5, useGrouping: true })}
              </span>
              {gameState.combo > 1 && (
                <span className="text-pink-500 font-black text-[10px] sm:text-sm animate-bounce">x{gameState.combo}</span>
              )}
            </div>
          </div>
          <div className="w-px h-6 sm:h-10 bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-0 sm:mb-1">Level</span>
            <span className="text-xl sm:text-3xl font-mono font-black text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">0{gameState.level}</span>
          </div>
        </div>

        <div className="flex flex-col items-end sm:hud-glass sm:rounded-2xl sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-0 sm:mb-1">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Active</span>
          </div>
          {gameState.isSlowMo && (
            <div className="text-[8px] sm:text-[10px] text-cyan-400 font-black animate-pulse uppercase mb-0 sm:mb-1">SLOW_MO</div>
          )}
          <span className="text-[10px] text-white/40 font-mono italic hidden sm:block">ACCURACY: {gameState.accuracy}%</span>
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="relative w-full h-full landscape:h-screen sm:h-auto sm:aspect-video sm:max-w-5xl sm:rounded-2xl overflow-hidden shadow-2xl sm:border sm:border-white/5" 
           style={{ background: 'radial-gradient(circle at center, #111827 0%, #05070a 100%)' }}>
        
        {/* Dot Grid Background Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-20 contrast-125 grayscale"
        />
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full"
        />

        {/* Scanline Overlay */}
        <div className="scanline opacity-20" />
        {/* Vignette Overlay */}
        <div className="vignette" />

        {/* Hand Skeleton Data Panel - Desktop Only */}
        {currentHandPoint && gameState.isStarted && !gameState.isGameOver && (
          <div className="absolute bottom-8 left-8 hud-glass rounded-2xl p-4 w-64 border-l-4 border-cyan-500 z-20 hidden lg:block">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-white">Sensor Stream</h3>
            <div className="space-y-2 font-mono text-[10px] text-white/70">
              <div className="flex justify-between font-mono">
                <span>X_VAL</span>
                <span className="text-cyan-400">{currentHandPoint.x.toFixed(3)}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Y_VAL</span>
                <span className="text-cyan-400">{currentHandPoint.y.toFixed(3)}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center font-mono">
                <span className="text-[9px]">GSTR:</span>
                <span className={cn(
                  "px-2 py-0.5 rounded font-bold transition-colors",
                  werePinchingRef.current[0] ? "bg-cyan-500 text-black" : "bg-white/10 text-white/50"
                )}>
                  {werePinchingRef.current[0] ? "LOCK" : "RDY"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Start Overlay */}
        {!gameState.isStarted && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30 p-2">
            <div className="text-center p-4 sm:p-12 hud-glass rounded-xl sm:rounded-3xl w-full max-w-sm sm:max-w-md border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <div className="w-8 h-8 sm:w-20 sm:h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-6 border border-cyan-500/30 hidden sm:flex">
                 <Target className="w-4 h-4 sm:w-10 sm:h-10 text-cyan-400" aria-label="Target Icon" />
              </div>
              <h1 className="text-xl sm:text-4xl font-black text-white mb-1 sm:mb-3 tracking-tighter uppercase leading-none truncate overflow-hidden whitespace-nowrap">REACTION_LAB</h1>
              <p className="text-white/50 mb-4 sm:mb-10 text-[8px] sm:text-sm leading-relaxed uppercase tracking-[0.2em] font-medium hidden sm:block">
                Neural Precision Unit<br />
                AI_POWERED HAND_TRACKING INTERFACE
              </p>
              <p className="text-white/50 mb-3 text-[7px] leading-relaxed uppercase tracking-[0.2em] font-medium sm:hidden">
                HAND_TRACKING INTERFACE
              </p>
              <button
                onClick={startGame}
                aria-label="Engage Neural System"
                className="w-full py-2.5 sm:py-5 bg-white hover:bg-cyan-400 text-black font-black text-[10px] sm:text-sm uppercase tracking-[0.2em] rounded-lg sm:rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                ENGAGE
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay (Simplified to match theme) */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05070a] z-40">
            <div className="w-12 h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
               <div className="h-full bg-cyan-500 animate-[loading_2s_ease-in-out_infinite]" />
            </div>
            <p className="text-cyan-400/80 font-mono text-[10px] tracking-[0.4em] uppercase">Booting Optic_Flow...</p>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 p-6 sm:p-8 text-center text-red-500" role="alert" aria-live="assertive">
            <AlertCircle className="w-12 h-12 mb-4 animate-bounce" />
            <h2 className="text-xl font-black mb-2 uppercase tracking-widest text-white">Sensor Link Failed</h2>
            <p className="font-sans text-[11px] sm:text-xs text-white/80 uppercase tracking-widest leading-relaxed max-w-sm mb-8 bg-red-500/20 p-4 border border-red-500/30 rounded-lg">
              {error}
            </p>
            <button 
              onClick={initSystem} 
              className="px-8 py-4 bg-white hover:bg-cyan-400 text-black font-black text-sm uppercase tracking-[0.2em] rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              Retry Connection
            </button>
          </div>
        )}
        {/* Internal Footer Overlay */}
        <div className="absolute bottom-4 left-0 w-full flex flex-wrap justify-center gap-4 sm:gap-8 text-white/40 text-[7px] sm:text-[9px] font-bold uppercase tracking-[0.2em] px-4 text-center z-20 pointer-events-none">
          <div className="flex items-center gap-2">
             <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_cyan]" />
             OPTIC: MULTI
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_pink]" />
             PULSE: PINCH
          </div>
          <div className="flex items-center gap-2 hidden sm:flex">
             <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_purple]" />
             SHIELD: MULTI
          </div>
          <div className="flex items-center gap-2 hidden sm:flex">
             <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_orange]" />
             SPLIT: FRAG
          </div>
          <div className="flex items-center gap-2 hidden sm:flex">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shadow-[0_0_8px_white]" />
             GHOST: PHASE
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import GameStartMenu from "./CardGame";
import Squares from "./BackgroundGrid";
import Script from "next/script";
import type { Beat, HitCircle, HandCursor, Particle } from "@/types/game";
import { analyzeAudioFile } from "@/lib/essentiaAnalyzer";
import {
  generateHitCircles,
  checkHit,
  calculateScore,
  checkMiss,
  calculateAccuracy,
  getGrade,
} from "@/lib/gameEngine";
import {
  drawHitCircle,
  drawHandCursor,
  drawHitFeedback,
  drawParticles,
  createBurstParticles,
} from "@/lib/renderer";
import { GAME_CONFIG } from "@/lib/constants";

// Define MediaPipe types
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

interface HitFeedbackItem {
  x: number;
  y: number;
  result: "perfect" | "good" | "bad" | "miss";
  alpha: number;
  id: number;
}

const HandRhythmGame: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // MediaPipe refs
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const multiHandLandmarksRef = useRef<any[]>([]);
  const videoImageRef = useRef<any>(null); // Store latest video frame

  // Game state
  const [gameState, setGameState] = useState<
    "menu" | "loading" | "playing" | "paused" | "results"
  >("menu");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Audio analysis state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [bpm, setBpm] = useState(0);

  // MediaPipe loading
  const [areScriptsLoaded, setAreScriptsLoaded] = useState(false);

  // Game refs (for performance)
  const hitCirclesRef = useRef<HitCircle[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const hitFeedbacksRef = useRef<HitFeedbackItem[]>([]);
  const gameStateRef = useRef<typeof gameState>("menu");

  // Stats refs
  const perfectHitsRef = useRef(0);
  const goodHitsRef = useRef(0);
  const badHitsRef = useRef(0);
  const missCountRef = useRef(0);

  // Script loading tracking
  const scriptsLoadedRef = useRef({
    hands: false,
    camera: false,
    drawing: false,
  });

  // Update gameStateRef when gameState changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // File upload handler
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      alert("Please upload a valid audio file (MP3, WAV, etc.)");
      return;
    }

    setGameState("loading");
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const result = await analyzeAudioFile(file, (progress) => {
        setAnalysisProgress(progress);
      });

      setBpm(result.bpm);
      setAudioFile(file);

      // Generate hit circles
      const circles = generateHitCircles(
        result.beats,
        GAME_CONFIG.CANVAS_WIDTH,
        GAME_CONFIG.CANVAS_HEIGHT,
      );
      hitCirclesRef.current = circles;

      // DEBUG: Log circle generation
      console.log(
        `✅ Generated ${circles.length} circles from ${result.beats.length} beats`,
      );
      console.log(
        "First 3 circles:",
        circles.slice(0, 3).map((c) => ({
          id: c.id,
          spawnTime: c.spawnTime,
          beatTimestamp: c.beatTimestamp,
          isVisible: c.isVisible,
        })),
      );
      const negativeSpawns = circles.filter((c) => c.spawnTime < 0);
      if (negativeSpawns.length > 0) {
        console.warn(
          `⚠️ ${negativeSpawns.length} circles have NEGATIVE spawn times!`,
          negativeSpawns.slice(0, 3),
        );
      }

      // Set audio element
      if (audioRef.current) {
        const audioUrl = URL.createObjectURL(file);
        audioRef.current.src = audioUrl;
      }

      setGameState("menu");
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze audio. Please try another file.");
      setGameState("menu");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Start game
  const startGame = () => {
    if (hitCirclesRef.current.length === 0) {
      alert("Please upload and analyze an audio file first!");
      return;
    }

    // DEBUG: Log game start
    console.log(
      "🎮 Starting game with",
      hitCirclesRef.current.length,
      "circles",
    );
    console.log("Audio duration:", audioRef.current?.duration, "seconds");

    // Reset game state
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    perfectHitsRef.current = 0;
    goodHitsRef.current = 0;
    badHitsRef.current = 0;
    missCountRef.current = 0;

    setScore(0);
    setCombo(0);
    setMaxCombo(0);

    // Reset circles
    hitCirclesRef.current.forEach((circle) => {
      circle.isVisible = false;
      circle.isHit = false;
      circle.hitResult = undefined;
    });

    particlesRef.current = [];
    hitFeedbacksRef.current = [];

    // Start audio
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.error("Audio play error:", e));
    }

    console.log("🎵 Audio started, game loop will begin");
    setGameState("playing");
  };

  // Get hand cursor positions for all detected hands
  const getHandCursors = useCallback((): HandCursor[] => {
    if (
      !multiHandLandmarksRef.current ||
      multiHandLandmarksRef.current.length === 0
    ) {
      return [];
    }

    // Return cursors for all detected hands
    return multiHandLandmarksRef.current.map((landmarks, index) => {
      const indexFingerTip = landmarks[8]; // Index finger tip

      return {
        x: (1 - indexFingerTip.x) * GAME_CONFIG.CANVAS_WIDTH,
        y: indexFingerTip.y * GAME_CONFIG.CANVAS_HEIGHT,
        isTracking: true,
        handIndex: index,
      };
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (gameStateRef.current !== "playing") return;

    let animationFrameId: number;
    let feedbackIdCounter = 0;

    const gameLoop = () => {
      if (!canvasRef.current || !audioRef.current) return;

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      // Current audio time (source of truth)
      const currentTime = audioRef.current.currentTime * 1000; // to ms

      // Clear canvas and render video feed as background
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

      // Draw video feed mirrored
      if (videoImageRef.current) {
        ctx.save();
        ctx.translate(GAME_CONFIG.CANVAS_WIDTH, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(
          videoImageRef.current,
          0,
          0,
          GAME_CONFIG.CANVAS_WIDTH,
          GAME_CONFIG.CANVAS_HEIGHT,
        );
        ctx.restore();
      }

      // DEBUG: Log visibility updates (only first 10 frames)
      if (animationFrameId < 10) {
        const visibleCount = hitCirclesRef.current.filter(
          (c) => c.isVisible,
        ).length;
        console.log(
          `Frame ${animationFrameId}: Time=${currentTime.toFixed(0)}ms, Visible=${visibleCount}/${hitCirclesRef.current.length}`,
        );
      }

      // Update circle visibility
      hitCirclesRef.current.forEach((circle) => {
        if (currentTime >= circle.spawnTime && !circle.isHit) {
          if (!circle.isVisible) {
            console.log(
              `[VISIBILITY] Circle ${circle.id} NOW VISIBLE at time ${currentTime.toFixed(0)}ms (spawnTime: ${circle.spawnTime})`,
            );
          }
          circle.isVisible = true;
        }

        // Check miss
        if (checkMiss(circle, currentTime) && !circle.isHit) {
          circle.isHit = true;
          circle.hitResult = "miss";
          comboRef.current = 0;
          setCombo(0);
          missCountRef.current += 1;

          // Add miss feedback
          hitFeedbacksRef.current.push({
            x: circle.x,
            y: circle.y,
            result: "miss",
            alpha: 1.0,
            id: feedbackIdCounter++,
          });
        }
      });

      // Check hits with all detected hands
      const handCursors = getHandCursors();

      hitCirclesRef.current.forEach((circle) => {
        if (!circle.isHit && circle.isVisible) {
          // Check collision with any hand
          for (const cursor of handCursors) {
            const hitResult = checkHit(cursor, circle, currentTime);

            if (hitResult) {
              circle.isHit = true;
              circle.hitResult = hitResult.type;

              // Update stats
              if (hitResult.type === "perfect") perfectHitsRef.current += 1;
              else if (hitResult.type === "good") goodHitsRef.current += 1;
              else if (hitResult.type === "bad") badHitsRef.current += 1;

              // Update score
              const points = calculateScore(hitResult.points, comboRef.current);
              scoreRef.current += points;
              setScore(scoreRef.current);

              // Update combo
              if (hitResult.maintainCombo) {
                comboRef.current += 1;
                setCombo(comboRef.current);

                if (comboRef.current > maxComboRef.current) {
                  maxComboRef.current = comboRef.current;
                  setMaxCombo(maxComboRef.current);
                }
              } else {
                comboRef.current = 0;
                setCombo(0);
              }

              // Create particles
              const color =
                hitResult.type === "perfect"
                  ? "#FFD700"
                  : hitResult.type === "good"
                    ? "#06B6D4"
                    : "#9CA3AF";
              const newParticles = createBurstParticles(
                circle.x,
                circle.y,
                color,
              );
              particlesRef.current.push(...newParticles);

              // Add hit feedback
              hitFeedbacksRef.current.push({
                x: circle.x,
                y: circle.y,
                result: hitResult.type,
                alpha: 1.0,
                id: feedbackIdCounter++,
              });

              break; // Stop checking other hands for this circle
            }
          }
        }
      });

      // Update particles
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02,
        }))
        .filter((p) => p.life > 0);

      // Update hit feedbacks
      hitFeedbacksRef.current = hitFeedbacksRef.current
        .map((f) => ({
          ...f,
          alpha: f.alpha - 0.02,
        }))
        .filter((f) => f.alpha > 0);

      // Render
      const circlesToDraw = hitCirclesRef.current.filter(
        (c) => c.isVisible && !c.isHit,
      );
      console.log(
        `[RENDER LOOPS] Total circles: ${hitCirclesRef.current.length}, Visible: ${circlesToDraw.length}, currentTime: ${currentTime.toFixed(0)}ms`,
      );

      hitCirclesRef.current.forEach((circle) => {
        drawHitCircle(ctx, circle, currentTime);
      });

      // Draw all hand cursors (no need to redeclare, use from earlier)
      handCursors.forEach((cursor: HandCursor) => {
        drawHandCursor(ctx, cursor);
      });

      drawParticles(ctx, particlesRef.current);

      hitFeedbacksRef.current.forEach((feedback) => {
        drawHitFeedback(
          ctx,
          feedback.x,
          feedback.y,
          feedback.result,
          feedback.alpha,
        );
      });

      // Check if song ended
      if (audioRef.current.ended) {
        setGameState("results");
        return;
      }

      // Continue loop
      if (gameStateRef.current === "playing") {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [getHandCursors, gameState]); // Updated to getHandCursors

  // MediaPipe initialization
  const initializeMediaPipe = useCallback(() => {
    if (handsRef.current) return;

    console.log("Initializings MediaPipe...");
    const { Hands, Camera } = window;

    if (!Hands || !Camera) {
      console.error("MediaPipe classes not found on window");
      return;
    }

    const hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    handsRef.current = hands;

    hands.setOptions({
      maxNumHands: 2, // Support both hands
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
      cameraRef.current = camera;
    }
  }, []);

  const onResults = useCallback((results: any) => {
    // Only update landmarks and store video frame, NO RENDERING HERE
    // All rendering happens in game loop for proper synchronization

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      multiHandLandmarksRef.current = results.multiHandLandmarks;
    } else {
      multiHandLandmarksRef.current = [];
    }

    // Store the video frame for rendering in game loop
    if (results.image) {
      videoImageRef.current = results.image;
      // Only log once every 60 frames to avoid spam
      if (Math.random() < 0.016) {
        console.log(
          "[ON_RESULTS] Video frame stored, size:",
          results.image.width,
          "x",
          results.image.height,
        );
      }
    } else {
      console.warn("[ON_RESULTS] No video image in results");
    }
  }, []);

  const checkScriptsLoaded = useCallback(() => {
    if (
      scriptsLoadedRef.current.hands &&
      scriptsLoadedRef.current.camera &&
      scriptsLoadedRef.current.drawing
    ) {
      setAreScriptsLoaded(true);
      initializeMediaPipe();
    }
  }, [initializeMediaPipe]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        // cameraRef.current.stop();
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, []);

  // Calculate final stats
  const accuracy = calculateAccuracy(
    perfectHitsRef.current,
    goodHitsRef.current,
    badHitsRef.current,
    missCountRef.current,
  );
  const grade = getGrade(accuracy);

  return (
    <div className="relative w-full min-h-screen bg-neutral-950 overflow-hidden font-sans">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Squares
          speed={0.3}
          squareSize={75}
          direction="diagonal"
          borderColor="#111325"
        />
      </div>

      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none" />

      {/* MediaPipe Scripts */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Camera Utils loaded");
          scriptsLoadedRef.current.camera = true;
          checkScriptsLoaded();
        }}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Hands loaded");
          scriptsLoadedRef.current.hands = true;
          checkScriptsLoaded();
        }}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Drawing Utils loaded");
          scriptsLoadedRef.current.drawing = true;
          checkScriptsLoaded();
        }}
      />

      {/* Main Content Container */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden p-4">
        {/* HUD */}
        {gameState === "playing" && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex gap-6 px-8 py-3 backdrop-blur-md bg-black/40 border border-white/10 rounded-full shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="text-white font-bold text-2xl tracking-wider flex items-center gap-2">
              SCORE
              <span className="font-mono text-3xl text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                {score}
              </span>
            </div>
            <div className="w-px h-8 bg-white/20 self-center" />
            <div className="text-white font-bold text-2xl tracking-wider flex items-center gap-2">
              COMBO
              <span className="font-mono text-3xl text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">
                {combo}x
              </span>
            </div>
          </div>
        )}

        {/* Main Menu */}
        {gameState === "menu" && !isAnalyzing && (
          <GameStartMenu
            title="HAND RHYTHM"
            color="purple-500"
            colorTo="indigo-800"
            isLoading={!areScriptsLoaded}
            onFileUpload={!(audioFile && bpm > 0) ? handleFileUpload : undefined}
            onStart={audioFile && bpm > 0 ? startGame : undefined}
            startLabel="START GAME"
            uploadLabel="UPLOAD MUSIC"
            description={
              <>
                <p>
                  Use your{" "}
                  <span className="text-purple-400 font-bold">
                    index finger
                  </span>{" "}
                  to hit the circles at the perfect timing!
                </p>
                <p className="text-sm text-gray-500">
                  Osu! inspired rhythm game with hand tracking
                </p>
              </>
            }
            footer={audioFile && bpm > 0 && (
              <div className="mt-4 px-6 py-3 bg-green-900/30 border border-green-500/50 rounded-lg">
                <p className="text-green-400 font-mono text-sm">
                  ✓ Audio analyzed: {bpm} BPM •{" "}
                  {hitCirclesRef.current.length} beats detected
                </p>
              </div>
            )}
          />
        )}

        {/* Loading / Analysis */}
        {gameState === "loading" && isAnalyzing && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-md">
              <div className="group relative">

                <div className="relative bg-black/40 backdrop-blur-md border border-gray-800 rounded-2xl p-12 text-center overflow-hidden">
                  <h2 className="text-4xl font-black text-white mb-8 tracking-tighter uppercase">
                    Analyzing Audio
                  </h2>

                  <div className="relative w-full h-4 bg-white/5 rounded-full border border-white/10 p-1 mb-4 overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-purple-500 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all duration-300"
                      style={{ width: `${analysisProgress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center mb-8">
                    <span className="text-gray-500 text-xs font-mono uppercase tracking-widest">
                      Processing Beats
                    </span>
                    <span className="text-purple-400 font-black font-mono text-xl">
                      {analysisProgress}%
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm font-light leading-relaxed">
                    Detecting BPM and beat positions for the mission.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {gameState === "results" && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="p-10 border-2 border-cyan-500/50 bg-black/60 rounded-3xl text-center shadow-[0_0_50px_rgba(6,182,212,0.4)] relative overflow-hidden group max-w-2xl">
              <div className="absolute inset-0 bg-cyan-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-500 to-blue-900 mb-6 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] tracking-tighter relative z-10">
                {grade}
              </h1>
              <div className="space-y-4 text-2xl text-gray-300 mb-10 relative z-10">
                <p>
                  Score: <span className="text-white font-bold">{score}</span>
                </p>
                <p>
                  Accuracy:{" "}
                  <span className="text-cyan-400 font-bold">{accuracy}%</span>
                </p>
                <p>
                  Max Combo:{" "}
                  <span className="text-yellow-400 font-bold">{maxCombo}x</span>
                </p>
                <div className="grid grid-cols-4 gap-4 mt-6 text-lg">
                  <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                    <div className="text-yellow-400 font-bold">
                      {perfectHitsRef.current}
                    </div>
                    <div className="text-xs text-gray-400">PERFECT</div>
                  </div>
                  <div className="p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                    <div className="text-cyan-400 font-bold">
                      {goodHitsRef.current}
                    </div>
                    <div className="text-xs text-gray-400">GOOD</div>
                  </div>
                  <div className="p-3 bg-gray-900/20 border border-gray-500/30 rounded-lg">
                    <div className="text-gray-400 font-bold">
                      {badHitsRef.current}
                    </div>
                    <div className="text-xs text-gray-400">BAD</div>
                  </div>
                  <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <div className="text-red-400 font-bold">
                      {missCountRef.current}
                    </div>
                    <div className="text-xs text-gray-400">MISS</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setGameState("menu")}
                className="relative z-10 px-12 py-4 bg-gradient-to-r from-cyan-600 to-blue-800 hover:from-cyan-500 hover:to-blue-700 text-white font-bold rounded-xl text-2xl transition-all shadow-[0_0_20px_rgba(8,145,178,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] hover:-translate-y-1 active:scale-95 border border-cyan-400/30"
              >
                BACK TO MENU
              </button>
            </div>
          </div>
        )}

        {/* Hidden video element */}
        <video ref={videoRef} className="hidden" playsInline />
        {/* Hidden audio element */}
        <audio ref={audioRef} />

        {/* Game Canvas */}
        {gameState === "playing" && (
          <div className="relative p-1 rounded-3xl bg-gradient-to-b from-gray-800 to-gray-900 shadow-2xl overflow-hidden group">
            <div className="absolute -inset-[2px] rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />

            <div className="relative rounded-[22px] overflow-hidden bg-black border-4 border-gray-900 shadow-inner">
              <canvas
                ref={canvasRef}
                width={GAME_CONFIG.CANVAS_WIDTH}
                height={GAME_CONFIG.CANVAS_HEIGHT}
                className="block max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HandRhythmGame;

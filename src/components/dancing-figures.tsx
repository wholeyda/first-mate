/**
 * Dancing Figures — Club Dance Floor
 *
 * Silhouette-style figures dancing on a dark floor with disco ball.
 * Each figure represents an active goal with visual traits/accessories.
 * Figures dance to Spotify music with genre-specific dance styles.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Goal } from "@/types/database";

interface DancingFiguresProps {
  goals: Goal[];
}

type DanceStyle =
  | "pop"
  | "rock"
  | "hiphop"
  | "electronic"
  | "country"
  | "classical"
  | "jazz"
  | "blues"
  | "rnb"
  | "folk"
  | "default";

interface NowPlayingData {
  connected: boolean;
  isPlaying: boolean;
  track?: {
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
  };
  danceStyle: DanceStyle;
}

// -- Helpers --

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function goalToAccentColor(title: string): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
    "#BB8FCE", "#85C1E9", "#F1948A", "#82E0AA",
  ];
  return colors[hashString(title) % colors.length];
}

function goalToTrait(title: string, description: string | null): string {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (text.match(/code|program|develop|software|tech|app|web|data/)) return "tech";
  if (text.match(/fit|gym|run|exercise|workout|health|weight|muscle/)) return "fitness";
  if (text.match(/learn|study|read|course|book|education|class/)) return "learning";
  if (text.match(/art|creative|design|music|write|paint|draw|photo/)) return "creative";
  if (text.match(/money|finance|invest|budget|save|business|revenue/)) return "finance";
  return "default";
}

function goalToXPosition(index: number, total: number): number {
  // Organic positioning along the floor
  if (total === 1) return 50;
  const spacing = Math.min(80 / total, 20);
  const startX = 50 - ((total - 1) * spacing) / 2;
  // Add slight random offset based on index for organic feel
  const jitter = ((index * 7 + 3) % 5) - 2;
  return startX + index * spacing + jitter;
}

// -- Disco Ball Component --

function DiscoBall() {
  return (
    <g>
      {/* Wire */}
      <line x1="50%" y1="0" x2="50%" y2="28" stroke="#555" strokeWidth="1" />
      {/* Ball */}
      <circle cx="50%" cy="38" r="12" fill="#888" opacity="0.9" />
      {/* Facets */}
      <circle cx="48%" cy="34" r="2" fill="#ccc" opacity="0.7" />
      <circle cx="52%" cy="36" r="1.5" fill="#ddd" opacity="0.8" />
      <circle cx="50%" cy="40" r="2" fill="#bbb" opacity="0.6" />
      <circle cx="46%" cy="38" r="1" fill="#eee" opacity="0.5" />
      <circle cx="54%" cy="34" r="1.5" fill="#ddd" opacity="0.6" />
      {/* Light rays */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 50 + Math.cos(rad) * 14;
        const y1 = 38 + Math.sin(rad) * 14;
        const x2 = 50 + Math.cos(rad) * 30;
        const y2 = 38 + Math.sin(rad) * 30;
        return (
          <line
            key={angle}
            x1={`${x1}%`}
            y1={y1}
            x2={`${x2}%`}
            y2={y2}
            stroke="#fff"
            strokeWidth="0.5"
            opacity="0.15"
            className="animate-pulse"
          />
        );
      })}
    </g>
  );
}

// -- Silhouette Figure --

interface FigureProps {
  goal: Goal;
  xPercent: number;
  danceStyle: DanceStyle;
  delay: number;
}

function SilhouetteFigure({ goal, xPercent, danceStyle, delay }: FigureProps) {
  const trait = goalToTrait(goal.title, goal.description);
  const accent = goalToAccentColor(goal.title);
  const variant = hashString(goal.id) % 3;

  // Genre → animation class
  const bodyAnim = `${danceStyle}-body`;
  const armsAnim = `${danceStyle}-arms`;
  const legsAnim = `${danceStyle}-legs`;

  // Figure dimensions
  const figH = 120;
  const figW = 60;
  const cx = figW / 2;

  // Body proportions
  const headR = 9;
  const headY = 12;
  const neckY = headY + headR;
  const shoulderY = neckY + 6;
  const hipY = shoulderY + 32;
  const kneeY = hipY + 22;
  const footY = kneeY + 18;
  const armLen = 24;

  // Different body builds
  const builds = [
    { shoulderW: 14, hipW: 10 }, // lean
    { shoulderW: 16, hipW: 14 }, // average
    { shoulderW: 18, hipW: 12 }, // broad
  ];
  const build = builds[variant];

  return (
    <g
      transform={`translate(${xPercent}, 0)`}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Full figure container with body animation */}
      <g
        style={{
          transformOrigin: `${cx}px ${hipY}px`,
          animation: `${bodyAnim} 0.6s ease-in-out ${delay}s infinite`,
        }}
      >
        {/* Head */}
        <circle cx={cx} cy={headY} r={headR} fill="black" />

        {/* Body / torso (tapered) */}
        <path
          d={`M ${cx - build.shoulderW / 2} ${shoulderY}
              L ${cx + build.shoulderW / 2} ${shoulderY}
              L ${cx + build.hipW / 2} ${hipY}
              L ${cx - build.hipW / 2} ${hipY} Z`}
          fill="black"
        />

        {/* Left arm */}
        <line
          x1={cx - build.shoulderW / 2}
          y1={shoulderY}
          x2={cx - build.shoulderW / 2 - armLen * 0.7}
          y2={shoulderY + armLen * 0.7}
          stroke="black"
          strokeWidth="4"
          strokeLinecap="round"
          style={{
            transformOrigin: `${cx - build.shoulderW / 2}px ${shoulderY}px`,
            animation: `${armsAnim} 0.5s ease-in-out ${delay}s infinite`,
          }}
        />

        {/* Right arm */}
        <line
          x1={cx + build.shoulderW / 2}
          y1={shoulderY}
          x2={cx + build.shoulderW / 2 + armLen * 0.7}
          y2={shoulderY + armLen * 0.7}
          stroke="black"
          strokeWidth="4"
          strokeLinecap="round"
          style={{
            transformOrigin: `${cx + build.shoulderW / 2}px ${shoulderY}px`,
            animation: `${armsAnim} 0.55s ease-in-out ${delay + 0.1}s infinite reverse`,
          }}
        />

        {/* Left leg */}
        <g
          style={{
            transformOrigin: `${cx - build.hipW / 2 + 2}px ${hipY}px`,
            animation: `${legsAnim} 0.5s ease-in-out ${delay}s infinite alternate`,
          }}
        >
          <line
            x1={cx - build.hipW / 2 + 2}
            y1={hipY}
            x2={cx - build.hipW / 2 - 2}
            y2={kneeY}
            stroke="black"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1={cx - build.hipW / 2 - 2}
            y1={kneeY}
            x2={cx - build.hipW / 2 - 4}
            y2={footY}
            stroke="black"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Shoe accent */}
          <ellipse
            cx={cx - build.hipW / 2 - 4}
            cy={footY + 1}
            rx={5}
            ry={2}
            fill={accent}
          />
        </g>

        {/* Right leg */}
        <g
          style={{
            transformOrigin: `${cx + build.hipW / 2 - 2}px ${hipY}px`,
            animation: `${legsAnim} 0.5s ease-in-out ${delay + 0.15}s infinite alternate-reverse`,
          }}
        >
          <line
            x1={cx + build.hipW / 2 - 2}
            y1={hipY}
            x2={cx + build.hipW / 2 + 2}
            y2={kneeY}
            stroke="black"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1={cx + build.hipW / 2 + 2}
            y1={kneeY}
            x2={cx + build.hipW / 2 + 4}
            y2={footY}
            stroke="black"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Shoe accent */}
          <ellipse
            cx={cx + build.hipW / 2 + 4}
            cy={footY + 1}
            rx={5}
            ry={2}
            fill={accent}
          />
        </g>

        {/* Goal-based trait accessories */}
        {trait === "tech" && (
          <>
            {/* Glasses */}
            <rect
              x={cx - 7}
              y={headY - 4}
              width={6}
              height={4}
              rx={1}
              fill="none"
              stroke={accent}
              strokeWidth="1"
            />
            <rect
              x={cx + 1}
              y={headY - 4}
              width={6}
              height={4}
              rx={1}
              fill="none"
              stroke={accent}
              strokeWidth="1"
            />
            <line
              x1={cx - 1}
              y1={headY - 2}
              x2={cx + 1}
              y2={headY - 2}
              stroke={accent}
              strokeWidth="0.5"
            />
          </>
        )}
        {trait === "fitness" && (
          <>
            {/* Headband */}
            <path
              d={`M ${cx - headR} ${headY - 2} Q ${cx} ${headY - headR - 3} ${
                cx + headR
              } ${headY - 2}`}
              fill="none"
              stroke={accent}
              strokeWidth="2"
            />
          </>
        )}
        {trait === "learning" && (
          <>
            {/* Graduation cap */}
            <polygon
              points={`${cx - 11},${headY - headR - 1} ${cx + 11},${
                headY - headR - 1
              } ${cx + 8},${headY - headR - 5} ${cx - 8},${
                headY - headR - 5
              }`}
              fill={accent}
            />
            <line
              x1={cx + 10}
              y1={headY - headR - 2}
              x2={cx + 13}
              y2={headY - headR + 5}
              stroke={accent}
              strokeWidth="1"
            />
            <circle cx={cx + 13} cy={headY - headR + 6} r={1.5} fill={accent} />
          </>
        )}
        {trait === "creative" && (
          <>
            {/* Beret */}
            <ellipse
              cx={cx}
              cy={headY - headR + 1}
              rx={headR + 3}
              ry={3}
              fill={accent}
            />
            <circle cx={cx} cy={headY - headR - 2} r={2} fill={accent} />
          </>
        )}
        {trait === "finance" && (
          <>
            {/* Tie */}
            <polygon
              points={`${cx - 2},${neckY} ${cx + 2},${neckY} ${cx + 3},${
                neckY + 4
              } ${cx},${neckY + 12} ${cx - 3},${neckY + 4}`}
              fill={accent}
            />
          </>
        )}
      </g>

      {/* Goal title label */}
      <text
        x={cx}
        y={figH + 8}
        textAnchor="middle"
        fill="#888"
        fontSize="8"
        fontFamily="system-ui, sans-serif"
      >
        {goal.title.length > 12
          ? goal.title.slice(0, 11) + "\u2026"
          : goal.title}
      </text>
    </g>
  );
}

// -- Main Component --

export function DancingFigures({ goals }: DancingFiguresProps) {
  const [score, setScore] = useState(0);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData>({
    connected: false,
    isPlaying: false,
    danceStyle: "default",
  });

  // Fetch productivity score
  useEffect(() => {
    async function fetchScore() {
      try {
        const response = await fetch("/api/review");
        if (response.ok) {
          const data = await response.json();
          setScore(data.score || 0);
        }
      } catch {
        // Silent fail
      }
    }
    fetchScore();
  }, []);

  // Poll Spotify now-playing every 10 seconds
  const fetchNowPlaying = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/now-playing");
      if (response.ok) {
        const data = await response.json();
        setNowPlaying(data);
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 10000);
    return () => clearInterval(interval);
  }, [fetchNowPlaying]);

  const activeGoals = goals.filter((g) => g.status === "active");
  const danceStyle = nowPlaying.isPlaying ? nowPlaying.danceStyle : "default";

  // SVG dimensions
  const svgWidth = 100; // percentage-based internal coords
  const floorY = 75; // percent from top where floor starts
  const figureAreaHeight = 130;
  const totalSvgH = 220;

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Score + Spotify Status */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <p className="text-4xl font-bold text-gray-900">{score}</p>
          <p className="text-xs text-gray-400 mt-1">points this month</p>
        </div>
        {nowPlaying.connected && nowPlaying.isPlaying && nowPlaying.track && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="truncate max-w-[160px]">
              {nowPlaying.track.name} &mdash;{" "}
              {nowPlaying.track.artists[0]?.name}
            </span>
          </div>
        )}
      </div>

      {/* Dance Floor */}
      <div className="flex-1 px-6 py-2 flex flex-col">
        {activeGoals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm text-center">
              Add goals to see your crew dance!
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2">
              {activeGoals.length}{" "}
              {activeGoals.length === 1 ? "goal" : "goals"} dancing
              {nowPlaying.isPlaying ? ` to ${danceStyle}` : ""}
            </p>

            <div className="flex-1 relative">
              <svg
                viewBox={`0 0 ${svgWidth * 6} ${totalSvgH}`}
                className="w-full h-full"
                preserveAspectRatio="xMidYMax meet"
                style={{ maxHeight: "400px" }}
              >
                {/* Background gradient (dark floor) */}
                <defs>
                  <linearGradient
                    id="floorGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#1a1a2e" />
                    <stop offset="100%" stopColor="#16213e" />
                  </linearGradient>
                  <linearGradient
                    id="floorSurface"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#2a2a4a" />
                    <stop offset="100%" stopColor="#1a1a2e" />
                  </linearGradient>
                </defs>

                {/* Dark background */}
                <rect
                  x="0"
                  y="0"
                  width={svgWidth * 6}
                  height={totalSvgH}
                  fill="url(#floorGrad)"
                  rx="8"
                />

                {/* Floor surface */}
                <rect
                  x="0"
                  y={(floorY / 100) * totalSvgH}
                  width={svgWidth * 6}
                  height={totalSvgH - (floorY / 100) * totalSvgH}
                  fill="url(#floorSurface)"
                />

                {/* Floor line */}
                <line
                  x1="0"
                  y1={(floorY / 100) * totalSvgH}
                  x2={svgWidth * 6}
                  y2={(floorY / 100) * totalSvgH}
                  stroke="#444"
                  strokeWidth="0.5"
                />

                {/* Disco ball */}
                <g>
                  <line
                    x1={svgWidth * 3}
                    y1="0"
                    x2={svgWidth * 3}
                    y2="20"
                    stroke="#666"
                    strokeWidth="1"
                  />
                  <circle cx={svgWidth * 3} cy="28" r="10" fill="#999" />
                  <circle
                    cx={svgWidth * 3 - 3}
                    cy="25"
                    r="2"
                    fill="#ddd"
                    opacity="0.7"
                  />
                  <circle
                    cx={svgWidth * 3 + 2}
                    cy="27"
                    r="1.5"
                    fill="#eee"
                    opacity="0.6"
                  />
                  <circle
                    cx={svgWidth * 3}
                    cy="31"
                    r="2"
                    fill="#ccc"
                    opacity="0.5"
                  />
                  {/* Light beams */}
                  {[15, 45, 135, 165, 200, 250, 290, 340].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    return (
                      <line
                        key={angle}
                        x1={svgWidth * 3 + Math.cos(rad) * 12}
                        y1={28 + Math.sin(rad) * 12}
                        x2={svgWidth * 3 + Math.cos(rad) * 50}
                        y2={28 + Math.sin(rad) * 50}
                        stroke="white"
                        strokeWidth="0.3"
                        opacity="0.1"
                      />
                    );
                  })}
                </g>

                {/* Dancing figures */}
                {activeGoals.map((goal, idx) => {
                  const xPct = goalToXPosition(idx, activeGoals.length);
                  const xCoord = (xPct / 100) * svgWidth * 6 - 30;
                  const yCoord = (floorY / 100) * totalSvgH - figureAreaHeight;
                  const delay = (hashString(goal.id) % 1000) / 1000;

                  return (
                    <g
                      key={goal.id}
                      transform={`translate(${xCoord}, ${yCoord})`}
                    >
                      <SilhouetteFigure
                        goal={goal}
                        xPercent={0}
                        danceStyle={danceStyle}
                        delay={delay}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </>
        )}

        {/* Spotify connect button */}
        {!nowPlaying.connected && (
          <div className="mt-2 mb-4 text-center">
            <a
              href="/api/spotify/auth"
              className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Connect Spotify
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

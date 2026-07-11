/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from './Chessboard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { EngineConfig, EnginePersonalityId, EvaluationMode } from '../types';
import { ChessEngine, PERSONALITIES } from '../engine';
import { 
  Cpu, Play, Pause, RotateCcw, X, Zap, Swords, Award, 
  ChevronRight, BarChart2, Shield, Activity, Sparkles 
} from 'lucide-react';

interface EngineDuelArenaProps {
  config1: EngineConfig;
  config2: EngineConfig;
  onClose: () => void;
}

export const EngineDuelArena: React.FC<EngineDuelArenaProps> = ({ config1, config2, onClose }) => {
  // Engine Configurations
  const [whiteConfig, setWhiteConfig] = useState<EngineConfig>({
    maxDepth: 4,
    personality: 'tactical',
    evalMode: 'neural',
    timeLimitMs: 250,
    ...config1
  });

  const [blackConfig, setBlackConfig] = useState<EngineConfig>({
    maxDepth: 4,
    personality: 'positional',
    evalMode: 'hybrid',
    timeLimitMs: 250,
    ...config2
  });

  // Selected Style Mimicry Targets
  const [whiteStyle, setWhiteStyle] = useState<string>('houdini');
  const [blackStyle, setBlackStyle] = useState<string>('caissa');

  // Duel Engine and game state
  const [chess, setChess] = useState<Chess>(new Chess());
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast' | 'insane'>('normal');

  // Highlights and visual states
  const [highlightSquares, setHighlightSquares] = useState<string[]>([]);
  const [engineLastMoveSquares, setEngineLastMoveSquares] = useState<string[]>([]);

  // Move List History
  const [moveList, setMoveList] = useState<{ san: string; from: string; to: string; turn: number; color: 'w' | 'b' }[]>([]);

  // Win probability graph history
  const [probs, setProbs] = useState<{ ply: number; move: string; p1: number; p2: number }[]>([
    { ply: 0, move: 'Start', p1: 50, p2: 50 }
  ]);

  // Performance telemetries
  const [whiteStats, setWhiteStats] = useState({
    nodes: 0,
    depth: 0,
    nps: 0,
    pv: [] as string[],
    score: 0,
    opening: ''
  });

  const [blackStats, setBlackStats] = useState({
    nodes: 0,
    depth: 0,
    nps: 0,
    pv: [] as string[],
    score: 0,
    opening: ''
  });

  // Keep a ref of the chess game for the async loop
  const chessRef = useRef<Chess>(chess);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isCalculatingRef = useRef<boolean>(isCalculating);

  useEffect(() => {
    chessRef.current = chess;
  }, [chess]);

  useEffect(() => {
    isCalculatingRef.current = isCalculating;
  }, [isCalculating]);

  // Handle speed and game loop updates
  useEffect(() => {
    if (isPlaying && !gameResult && !isCalculating) {
      const delay = speed === 'slow' ? 2000 : speed === 'normal' ? 800 : speed === 'fast' ? 250 : 50;
      timerRef.current = setTimeout(() => {
        executeDuelMove();
      }, delay);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, chess, gameResult, isCalculating, speed]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getSpeedLabel = () => {
    switch (speed) {
      case 'slow': return '慢速 (2.0s)';
      case 'normal': return '正常 (0.8s)';
      case 'fast': return '快速 (0.25s)';
      case 'insane': return '極速 (即時)';
    }
  };

  const executeDuelMove = async () => {
    if (isCalculatingRef.current || gameResult) return;

    const currentChess = chessRef.current;
    if (currentChess.isGameOver()) {
      determineGameResult(currentChess);
      setIsPlaying(false);
      return;
    }

    setIsCalculating(true);

    try {
      const turnColor = currentChess.turn(); // 'w' or 'b'
      const activeConfig = turnColor === 'w' ? whiteConfig : blackConfig;
      const activeStyle = turnColor === 'w' ? whiteStyle : blackStyle;

      // Instantiate search worker
      const searchWorker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), { type: 'module' });

      searchWorker.postMessage({
        fen: currentChess.fen(),
        config: {
          ...activeConfig,
          leezaThinkingThreads: activeConfig.evalMode === 'leela_mcts' || activeConfig.evalMode === 'leeza_mcts' ? 4 : undefined
        },
        trainingProgress: 0.75,
        history: currentChess.history()
      });

      searchWorker.onmessage = (e) => {
        const result = e.data;
        searchWorker.terminate();

        if (result.bestMove) {
          let bestMoveStr = '';
          let fromSquare = '';
          let toSquare = '';

          const tempChess = new Chess(currentChess.fen());
          let moveObj;

          if (typeof result.bestMove === 'string') {
            moveObj = tempChess.move(result.bestMove);
            bestMoveStr = result.bestMove;
          } else {
            moveObj = tempChess.move({
              from: result.bestMove.from,
              to: result.bestMove.to,
              promotion: result.bestMove.promotion
            });
            bestMoveStr = moveObj.san;
          }

          fromSquare = moveObj.from;
          toSquare = moveObj.to;

          // Commit move to currentChess
          currentChess.move(bestMoveStr);

          // Highlight squares
          setHighlightSquares([fromSquare, toSquare]);
          setEngineLastMoveSquares([fromSquare, toSquare]);

          // Calculate and normalize score
          const evalScore = result.score;
          const normalizedScore = turnColor === 'w' ? evalScore : -evalScore; // + is white, - is black

          // Convert score to White Win Probability (p1)
          // formula: P(Win) = 1 / (1 + 10^(-cp / 400))
          let p1 = Math.round((1 / (1 + Math.pow(10, -normalizedScore / 400))) * 100);
          if (p1 < 5) p1 = 5;
          if (p1 > 95) p1 = 95;
          const p2 = 100 - p1;

          // Update stats
          const telemetry = {
            nodes: result.nodes,
            depth: result.depth || activeConfig.maxDepth,
            nps: result.nps,
            pv: result.pv || [bestMoveStr],
            score: evalScore,
            opening: result.bookOpeningName || (moveList.length < 10 ? '開局庫計算中' : '中局深層探索')
          };

          if (turnColor === 'w') {
            setWhiteStats(telemetry);
          } else {
            setBlackStats(telemetry);
          }

          // Add to graph history
          const newPly = currentChess.history().length;
          setProbs(prev => [
            ...prev,
            { ply: newPly, move: `${Math.ceil(newPly / 2)}${turnColor === 'w' ? '.' : '...'}${bestMoveStr}`, p1, p2 }
          ]);

          // Add to move list
          setMoveList(prev => [
            ...prev,
            {
              san: bestMoveStr,
              from: fromSquare,
              to: toSquare,
              turn: Math.ceil(newPly / 2),
              color: turnColor
            }
          ]);

          // Re-set Chess instance to force re-render
          setChess(new Chess(currentChess.fen()));

          // Check if game has ended
          if (currentChess.isGameOver()) {
            determineGameResult(currentChess);
            setIsPlaying(false);
          }
        } else {
          // Fallback if search returns nothing
          determineGameResult(currentChess);
          setIsPlaying(false);
        }
        setIsCalculating(false);
      };

      searchWorker.onerror = (err) => {
        console.error('Worker error in engine duel move:', err);
        searchWorker.terminate();
        setIsPlaying(false);
        setIsCalculating(false);
      };

    } catch (err) {
      console.error('Error in engine duel move:', err);
      setIsPlaying(false);
      setIsCalculating(false);
    }
  };

  const determineGameResult = (currentChess: Chess) => {
    if (currentChess.isCheckmate()) {
      const winner = currentChess.turn() === 'w' ? 'Black (黑色引擎)' : 'White (白色引擎)';
      setGameResult(`將軍犯規！${winner} 獲得本局勝利 🏆`);
      
      // Update graph terminal point
      const isWhiteWinner = currentChess.turn() === 'b';
      setProbs(prev => [
        ...prev,
        { ply: prev.length, move: 'End', p1: isWhiteWinner ? 100 : 0, p2: isWhiteWinner ? 0 : 100 }
      ]);
    } else if (currentChess.isDraw()) {
      let drawType = '和局';
      if (currentChess.isStalemate()) drawType = '逼和 (Stalemate)';
      else if (currentChess.isThreefoldRepetition()) drawType = '三次重複走子 (Threefold Repetition)';
      else if (currentChess.isInsufficientMaterial()) drawType = '子力不足 (Insufficient Material)';
      
      setGameResult(`和棋！局勢因 ${drawType} 達成完美均勢 🤝`);
      setProbs(prev => [
        ...prev,
        { ply: prev.length, move: 'End', p1: 50, p2: 50 }
      ]);
    } else {
      setGameResult('對局終止。');
    }
  };

  const handleRestart = () => {
    const freshChess = new Chess();
    setChess(freshChess);
    setGameResult(null);
    setIsPlaying(false);
    setIsCalculating(false);
    setHighlightSquares([]);
    setEngineLastMoveSquares([]);
    setMoveList([]);
    setProbs([{ ply: 0, move: 'Start', p1: 50, p2: 50 }]);
    setWhiteStats({ nodes: 0, depth: 0, nps: 0, pv: [], score: 0, opening: '' });
    setBlackStats({ nodes: 0, depth: 0, nps: 0, pv: [], score: 0, opening: '' });
  };

  const togglePlay = () => {
    if (gameResult) {
      handleRestart();
    }
    setIsPlaying(!isPlaying);
  };

  const formatScore = (score: number, side: 'w' | 'b') => {
    if (Math.abs(score) > 15000) {
      return score > 0 ? `+M${20000 - Math.abs(score)}` : `-M${20000 - Math.abs(score)}`;
    }
    const normalizedScore = side === 'w' ? score : -score;
    const decimal = (normalizedScore / 100).toFixed(2);
    return decimal.startsWith('-') ? `${decimal} cp` : `+${decimal} cp`;
  };

  return (
    <div className="min-h-full w-full bg-slate-950 p-6 text-white flex flex-col relative">
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30">
            <Swords className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              NeuralCore Engine Autoduel Arena
            </h1>
            <p className="text-xs text-slate-400">
              雙神經網路象棋引擎 & 開局大師知識庫實時對抗平台
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start flex-1">
        
        {/* Left column: Board and Config panels (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* White Config */}
            <div className={`p-4 rounded-xl border transition-all ${chess.turn() === 'w' && isPlaying ? 'bg-indigo-950/20 border-indigo-500/50 shadow-md shadow-indigo-500/5' : 'bg-slate-900/40 border-slate-800/80'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-600 block"></span>
                <span className="text-xs font-bold text-slate-200">Engine 1 (White / 白色引擎)</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">評估架構 (Evaluation Mode)</label>
                  <select 
                    value={whiteConfig.evalMode}
                    onChange={(e) => setWhiteConfig(prev => ({ ...prev, evalMode: e.target.value as EvaluationMode }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="neural">NeuralCore NNUE (高性能)</option>
                    <option value="hybrid">Hybrid (混合啟發 + 卷積)</option>
                    <option value="traditional">Traditional (經典香濃啟發式)</option>
                    <option value="leeza_mcts">Leeza MCTS (深度蒙地卡羅樹)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">戰術個性 (Personality)</label>
                    <select 
                      value={whiteConfig.personality}
                      onChange={(e) => setWhiteConfig(prev => ({ ...prev, personality: e.target.value as EnginePersonalityId }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      <option value="tactical">Tactical (進攻極限)</option>
                      <option value="positional">Positional (局面控制)</option>
                      <option value="gambiter">Gambit (戰術犧牲)</option>
                      <option value="defensive">Defensive (鋼鐵防禦)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">風格模仿 (Mimic Style)</label>
                    <select 
                      value={whiteStyle}
                      onChange={(e) => setWhiteStyle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      <option value="houdini">HOUDINI (極致進攻)</option>
                      <option value="caissa">CAISSA (局面大師)</option>
                      <option value="asmfish">ASMFish (實用大師)</option>
                      <option value="slowchess">SlowChess (穩健殘局)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>搜尋深度 (Max Depth)</span>
                    <span className="font-bold text-indigo-400">{whiteConfig.maxDepth} plys</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="8" 
                    value={whiteConfig.maxDepth}
                    onChange={(e) => setWhiteConfig(prev => ({ ...prev, maxDepth: parseInt(e.target.value) }))}
                    className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Black Config */}
            <div className={`p-4 rounded-xl border transition-all ${chess.turn() === 'b' && isPlaying ? 'bg-indigo-950/20 border-indigo-500/50 shadow-md shadow-indigo-500/5' : 'bg-slate-900/40 border-slate-800/80'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-300 block"></span>
                <span className="text-xs font-bold text-slate-200">Engine 2 (Black / 黑色引擎)</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">評估架構 (Evaluation Mode)</label>
                  <select 
                    value={blackConfig.evalMode}
                    onChange={(e) => setBlackConfig(prev => ({ ...prev, evalMode: e.target.value as EvaluationMode }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="hybrid">Hybrid (混合啟發 + 卷積)</option>
                    <option value="neural">NeuralCore NNUE (高性能)</option>
                    <option value="traditional">Traditional (經典香濃啟發式)</option>
                    <option value="leeza_mcts">Leeza MCTS (深度蒙地卡羅樹)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">戰術個性 (Personality)</label>
                    <select 
                      value={blackConfig.personality}
                      onChange={(e) => setBlackConfig(prev => ({ ...prev, personality: e.target.value as EnginePersonalityId }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      <option value="positional">Positional (局面控制)</option>
                      <option value="tactical">Tactical (進攻極限)</option>
                      <option value="gambiter">Gambit (戰術犧牲)</option>
                      <option value="defensive">Defensive (鋼鐵防禦)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">風格模仿 (Mimic Style)</label>
                    <select 
                      value={blackStyle}
                      onChange={(e) => setBlackStyle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      <option value="caissa">CAISSA (局面大師)</option>
                      <option value="houdini">HOUDINI (極致進攻)</option>
                      <option value="asmfish">ASMFish (實用大師)</option>
                      <option value="slowchess">SlowChess (穩健殘局)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>搜尋深度 (Max Depth)</span>
                    <span className="font-bold text-indigo-400">{blackConfig.maxDepth} plys</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="8" 
                    value={blackConfig.maxDepth}
                    onChange={(e) => setBlackConfig(prev => ({ ...prev, maxDepth: parseInt(e.target.value) }))}
                    className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Chessboard */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
            
            <div className="w-full max-w-[480px]">
              <Chessboard 
                fen={chess.fen()} 
                interactive={false}
                highlightSquares={highlightSquares}
                engineLastMoveSquares={engineLastMoveSquares}
              />
            </div>

            {/* Game result modal overlay */}
            {gameResult && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20 transition-all">
                <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/30 mb-3 animate-bounce">
                  <Award className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-md font-bold text-white mb-2">對局終止 (Duel Finished)</h3>
                <p className="text-xs text-slate-300 text-center max-w-xs leading-relaxed mb-5">
                  {gameResult}
                </p>
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg transition-all"
                >
                  開始新對局 (Reset Duel)
                </button>
              </div>
            )}
          </div>

          {/* Controller Bar */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850/80 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all ${
                  isPlaying 
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? '暫停對決 (Pause)' : '啟動自動對決 (Start)'}
              </button>

              <button
                onClick={() => {
                  if (!isPlaying && !isCalculating) executeDuelMove();
                }}
                disabled={isPlaying || isCalculating}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                單步 (Step)
              </button>

              <button
                onClick={handleRestart}
                className="p-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700/60 transition-all"
                title="重新啟動"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Controller */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-medium">對決速度:</span>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850">
                {(['slow', 'normal', 'fast', 'insane'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`text-[10px] px-2.5 py-1 rounded font-bold transition-all capitalize ${
                      speed === s 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Live Telemetries & Charts (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Active Status Display */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-3 border-b border-slate-800 pb-2">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              實時搜索數據流 (Live Search Telemetries)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              
              {/* White Metrics */}
              <div className={`p-3 rounded-lg border ${chess.turn() === 'w' && isCalculating ? 'bg-indigo-950/15 border-indigo-500/40' : 'bg-slate-950/40 border-slate-850'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Engine 1 (White)</span>
                  {chess.turn() === 'w' && isCalculating && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500">估值分數 (Score):</span>
                    <span className="text-xs font-mono font-bold text-indigo-300">{formatScore(whiteStats.score, 'w')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500">搜尋深度 (Depth):</span>
                    <span className="text-xs font-mono font-bold">{whiteStats.depth} plys</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500">節點數量 (Nodes):</span>
                    <span className="text-xs font-mono font-bold">{whiteStats.nodes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500">運算速率 (NPS):</span>
                    <span className="text-xs font-mono font-bold text-slate-400">{whiteStats.nps.toLocaleString()} nps</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/50">
                    <span className="text-[9px] text-slate-500 block">預判走法線 (PV line):</span>
                    <span className="text-[10px] font-mono text-indigo-400/90 font-semibold truncate block mt-0.5" title={whiteStats.pv.join(' ')}>
                      {whiteStats.pv.length > 0 ? whiteStats.pv.slice(0, 3).join(' ') + (whiteStats.pv.length > 3 ? '...' : '') : '待機中'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Black Metrics */}
              <div className={`p-3 rounded-lg border ${chess.turn() === 'b' && isCalculating ? 'bg-indigo-950/15 border-indigo-500/40' : 'bg-slate-950/40 border-slate-850'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Engine 2 (Black)</span>
                  {chess.turn() === 'b' && isCalculating && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500">估值分數 (Score):</span>
                    <span className="text-xs font-mono font-bold text-amber-300">{formatScore(blackStats.score, 'b')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500">搜尋深度 (Depth):</span>
                    <span className="text-xs font-mono font-bold">{blackStats.depth} plys</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500">節點數量 (Nodes):</span>
                    <span className="text-xs font-mono font-bold">{blackStats.nodes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500">運算速率 (NPS):</span>
                    <span className="text-xs font-mono font-bold text-slate-400">{blackStats.nps.toLocaleString()} nps</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/50">
                    <span className="text-[9px] text-slate-500 block">預判走法線 (PV line):</span>
                    <span className="text-[10px] font-mono text-amber-400/90 font-semibold truncate block mt-0.5" title={blackStats.pv.join(' ')}>
                      {blackStats.pv.length > 0 ? blackStats.pv.slice(0, 3).join(' ') + (blackStats.pv.length > 3 ? '...' : '') : '待機中'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Probability Plot (Recharts Line Chart) */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-3 border-b border-slate-800 pb-2">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
              實時勝率震盪曲線 (Win Probability Oscillation)
            </h3>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={probs} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="ply" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    labelClassName="text-slate-400 font-bold"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="p1" 
                    name="White (Engine 1) Win %" 
                    stroke="#818cf8" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="p2" 
                    name="Black (Engine 2) Win %" 
                    stroke="#fbbf24" 
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                White: {probs[probs.length - 1]?.p1}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Plys: {chess.history().length}
              </span>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                Black: {probs[probs.length - 1]?.p2}%
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              </span>
            </div>
          </div>

          {/* Move Log History Container */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col h-56">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2 pb-1 border-b border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              對局棋譜日誌 (Duel Move Log)
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin text-xs font-mono">
              {moveList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 italic text-[11px]">
                  等待對決啟動...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                  {Array.from({ length: Math.ceil(moveList.length / 2) }).map((_, i) => {
                    const whiteMove = moveList[i * 2];
                    const blackMove = moveList[i * 2 + 1];
                    return (
                      <div key={i} className="col-span-2 grid grid-cols-12 py-1 px-1.5 hover:bg-slate-900/60 rounded transition-all">
                        <span className="col-span-2 text-slate-500 text-left font-bold">{i + 1}.</span>
                        
                        <span className="col-span-5 text-slate-200 font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-white border border-slate-500"></span>
                          {whiteMove.san}
                        </span>
                        
                        {blackMove ? (
                          <span className="col-span-5 text-amber-400/90 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 border border-slate-300"></span>
                            {blackMove.san}
                          </span>
                        ) : (
                          <span className="col-span-5 text-slate-600 italic">計算中...</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

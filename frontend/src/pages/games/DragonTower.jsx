import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DragonTower = () => {
  // State management
  const [mode, setMode] = useState('manual');
  const [betAmount, setBetAmount] = useState(10);
  const [displayBet, setDisplayBet] = useState('10.00');
  const [difficulty, setDifficulty] = useState('medium');
  const [gameState, setGameState] = useState('idle'); // idle, playing, finished
  const [gameId, setGameId] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [tower, setTower] = useState([]);
  const [revealedTiles, setRevealedTiles] = useState({});
  const [config, setConfig] = useState({ eggs: 2, tiles: 3, levels: 10 });
  const [loading, setLoading] = useState(false);
  const [totalProfit, setTotalProfit] = useState(0);

  // Difficulty configurations
  const difficultyConfigs = {
    easy: { eggs: 3, tiles: 4, levels: 8, label: 'Easy' },
    medium: { eggs: 2, tiles: 3, levels: 10, label: 'Medium' },
    hard: { eggs: 1, tiles: 3, levels: 12, label: 'Hard' },
    expert: { eggs: 1, tiles: 2, levels: 15, label: 'Expert' },
    master: { eggs: 1, tiles: 4, levels: 20, label: 'Master' }
  };

  // Update total profit when multiplier changes
  useEffect(() => {
    if (gameState === 'playing') {
      setTotalProfit((betAmount * currentMultiplier) - betAmount);
    }
  }, [currentMultiplier, betAmount, gameState]);

  // Handle bet amount change
  const handleBetChange = (value) => {
    const numValue = parseFloat(value) || 0;
    setBetAmount(numValue);
    setDisplayBet(numValue.toFixed(2));
  };

  // Quick bet multipliers
  const handleHalfBet = () => {
    const newBet = betAmount / 2;
    handleBetChange(newBet);
  };

  const handleDoubleBet = () => {
    const newBet = betAmount * 2;
    handleBetChange(newBet);
  };

  // Start game
  const handleBet = async () => {
    if (betAmount <= 0) {
      toast.error('Bet amount must be greater than 0');
      return;
    }

    setLoading(true);
    
    try {
      const response = await api.post('/games/dragon-tower/init', {
        betAmount: parseFloat(betAmount),
        difficulty
      });

      if (response.data.success) {
        const { gameId, config } = response.data.data;
        setGameId(gameId);
        setConfig(config);
        setGameState('playing');
        setCurrentLevel(0);
        setCurrentMultiplier(1.00);
        setRevealedTiles({});
        setTotalProfit(0);
        
        // Initialize tower structure
        const newTower = Array(config.levels).fill(null).map(() => 
          Array(config.tiles).fill('closed')
        );
        setTower(newTower);
        
        toast.success('Game started! Pick your first tile');
      } else {
        toast.error(response.data.error || 'Failed to start game');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  // Handle tile click
  const handleTileClick = async (level, tileIndex) => {
    if (gameState !== 'playing' || level !== currentLevel || loading) return;
    if (revealedTiles[`${level}-${tileIndex}`]) return;

    setLoading(true);

    try {
      const response = await api.post('/games/dragon-tower', {
        gameId,
        level,
        tileIndex,
        action: 'continue'
      });

      if (response.data.success) {
        const result = response.data.result;
        
        // Update revealed tile
        const tileKey = `${level}-${tileIndex}`;
        setRevealedTiles(prev => ({
          ...prev,
          [tileKey]: result.isEgg ? 'egg' : 'bomb'
        }));

        if (result.isEgg) {
          // Egg found - move to next level
          setCurrentLevel(result.currentLevel);
          setCurrentMultiplier(result.multiplier);
          
          // Check if game is complete
          if (result.currentLevel >= config.levels) {
            setGameState('finished');
            toast.success(`🎉 Tower Complete! Won $${result.payout.toFixed(2)}!`);
          } else {
            toast.success(`✅ Egg found! Level ${result.currentLevel + 1}`);
          }
        } else {
          // Bomb hit - game over
          setGameState('finished');
          toast.error('💥 Bomb! Game Over');
        }
      } else {
        toast.error(response.data.error || 'Move failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to make move');
    } finally {
      setLoading(false);
    }
  };

  // Cash out
  const handleCashOut = async () => {
    if (gameState !== 'playing' || currentLevel === 0 || loading) return;

    setLoading(true);

    try {
      const response = await api.post('/games/dragon-tower', {
        gameId,
        action: 'collect'
      });

      if (response.data.success) {
        const result = response.data.result;
        setGameState('finished');
        toast.success(`💰 Cashed out $${result.payout.toFixed(2)}!`);
      } else {
        toast.error(response.data.error || 'Cash out failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cash out');
    } finally {
      setLoading(false);
    }
  };

  // Random pick
  const handleRandomPick = () => {
    if (gameState !== 'playing' || loading) return;
    
    const availableTiles = [];
    for (let i = 0; i < config.tiles; i++) {
      const tileKey = `${currentLevel}-${i}`;
      if (!revealedTiles[tileKey]) {
        availableTiles.push(i);
      }
    }
    
    if (availableTiles.length > 0) {
      const randomIndex = availableTiles[Math.floor(Math.random() * availableTiles.length)];
      handleTileClick(currentLevel, randomIndex);
    }
  };

  // Get tile content (egg or bomb icon)
  const getTileContent = (level, tileIndex) => {
    const tileKey = `${level}-${tileIndex}`;
    const state = revealedTiles[tileKey];

    if (state === 'egg') {
      return (
        <div className="text-3xl">✓</div>
      );
    }
    
    if (state === 'bomb') {
      return (
        <div className="text-3xl">✕</div>
      );
    }

    return null;
  };

  // Get tile styling
  const getTileStyle = (level, tileIndex) => {
    const tileKey = `${level}-${tileIndex}`;
    const state = revealedTiles[tileKey];
    const isCurrentLevel = level === currentLevel && gameState === 'playing';
    const isPastLevel = level < currentLevel;

    if (state === 'egg') {
      return { 
        backgroundColor: '#00ff41', 
        borderColor: '#00ff41',
        color: '#1a1f2e',
        cursor: 'default'
      };
    }
    
    if (state === 'bomb') {
      return { 
        backgroundColor: '#ff4136', 
        borderColor: '#ff4136',
        color: '#ffffff',
        cursor: 'default'
      };
    }

    if (isCurrentLevel && !loading) {
      return { 
        backgroundColor: '#2d4a4f', 
        borderColor: '#3d5a5f', 
        cursor: 'pointer',
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px)'
      };
    }

    if (isPastLevel) {
      return { 
        backgroundColor: '#1a2528', 
        borderColor: '#2a3538',
        opacity: 0.5,
        cursor: 'default'
      };
    }

    return { 
      backgroundColor: '#2d4a4f', 
      borderColor: '#2d4a4f',
      opacity: 0.3,
      cursor: 'default'
    };
  };

  return (
    <Layout>
      <div className="min-h-screen" style={{ backgroundColor: '#1a1f2e' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* LEFT PANEL - 30% */}
            <div className="lg:col-span-3">
              <div 
                className="rounded-xl border p-6"
                style={{ backgroundColor: '#1e2433', borderColor: '#2d3748' }}
              >
                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setMode('manual')}
                    disabled={gameState === 'playing'}
                    className="flex-1 py-2 px-4 rounded-lg font-medium transition-all"
                    style={{
                      backgroundColor: mode === 'manual' ? '#00ff41' : 'transparent',
                      color: mode === 'manual' ? '#1a1f2e' : '#a0aec0',
                      border: `1px solid ${mode === 'manual' ? '#00ff41' : '#2d3748'}`
                    }}
                  >
                    Manual
                  </button>
                  <button
                    onClick={() => setMode('auto')}
                    disabled={gameState === 'playing'}
                    className="flex-1 py-2 px-4 rounded-lg font-medium transition-all"
                    style={{
                      backgroundColor: mode === 'auto' ? '#00ff41' : 'transparent',
                      color: mode === 'auto' ? '#1a1f2e' : '#a0aec0',
                      border: `1px solid ${mode === 'auto' ? '#00ff41' : '#2d3748'}`
                    }}
                  >
                    Auto
                  </button>
                </div>

                {/* Bet Amount Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#a0aec0' }}>
                    Bet Amount
                  </label>
                  <div 
                    className="rounded-lg p-3 mb-2"
                    style={{ backgroundColor: '#1a1f2e' }}
                  >
                    <div className="text-2xl font-bold font-mono" style={{ color: '#e2e8f0' }}>
                      ${displayBet}
                    </div>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => handleBetChange(e.target.value)}
                      disabled={gameState === 'playing'}
                      className="flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:border-blue-500"
                      style={{ 
                        backgroundColor: '#2d3748', 
                        borderColor: '#2d3748',
                        color: '#e2e8f0'
                      }}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleHalfBet}
                      disabled={gameState === 'playing'}
                      className="flex-1 py-2 px-3 rounded-lg font-medium transition-colors"
                      style={{ 
                        backgroundColor: '#2d3748',
                        color: '#e2e8f0',
                        border: '1px solid #2d3748'
                      }}
                    >
                      ½
                    </button>
                    <button
                      onClick={handleDoubleBet}
                      disabled={gameState === 'playing'}
                      className="flex-1 py-2 px-3 rounded-lg font-medium transition-colors"
                      style={{ 
                        backgroundColor: '#2d3748',
                        color: '#e2e8f0',
                        border: '1px solid #2d3748'
                      }}
                    >
                      2×
                    </button>
                  </div>
                </div>

                {/* Difficulty Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#a0aec0' }}>
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    disabled={gameState === 'playing'}
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:border-blue-500"
                    style={{ 
                      backgroundColor: '#2d3748', 
                      borderColor: '#2d3748',
                      color: '#e2e8f0'
                    }}
                  >
                    {Object.entries(difficultyConfigs).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label} ({config.eggs} eggs, {config.tiles} tiles, {config.levels} levels)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bet / Cash Out Button */}
                {gameState === 'idle' && (
                  <button
                    onClick={handleBet}
                    disabled={loading || betAmount <= 0}
                    className="w-full rounded-lg px-6 py-4 font-bold text-lg transition-all mb-3"
                    style={{ 
                      backgroundColor: loading || betAmount <= 0 ? '#2d3748' : '#00ff41',
                      color: '#1a1f2e',
                      cursor: loading || betAmount <= 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Starting...' : 'Bet'}
                  </button>
                )}

                {gameState === 'playing' && currentLevel > 0 && (
                  <button
                    onClick={handleCashOut}
                    disabled={loading}
                    className="w-full rounded-lg px-6 py-4 font-bold text-lg transition-all mb-3"
                    style={{ 
                      backgroundColor: loading ? '#2d3748' : '#00ff41',
                      color: '#1a1f2e',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Cashing Out...' : `Cash Out $${(betAmount * currentMultiplier).toFixed(2)}`}
                  </button>
                )}

                {gameState === 'finished' && (
                  <button
                    onClick={() => {
                      setGameState('idle');
                      setCurrentLevel(0);
                      setCurrentMultiplier(1.00);
                      setRevealedTiles({});
                      setTower([]);
                      setTotalProfit(0);
                    }}
                    className="w-full rounded-lg px-6 py-4 font-bold text-lg transition-all mb-3"
                    style={{ 
                      backgroundColor: '#00ff41',
                      color: '#1a1f2e'
                    }}
                  >
                    New Game
                  </button>
                )}

                {/* Random Pick Button */}
                {gameState === 'playing' && (
                  <button
                    onClick={handleRandomPick}
                    disabled={loading}
                    className="w-full rounded-lg px-6 py-3 font-medium transition-all"
                    style={{ 
                      backgroundColor: '#2d3748',
                      color: '#e2e8f0',
                      border: '1px solid #3d4748'
                    }}
                  >
                    Random Pick
                  </button>
                )}

                {/* Total Profit Display */}
                <div className="mt-6">
                  <div 
                    className="rounded-lg p-4"
                    style={{ backgroundColor: '#1a1f2e' }}
                  >
                    <div className="text-xs font-medium mb-1" style={{ color: '#a0aec0' }}>
                      Total Profit ({currentMultiplier.toFixed(2)}x)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      <span className="text-2xl font-bold font-mono" style={{ 
                        color: totalProfit >= 0 ? '#00ff41' : '#ff4136' 
                      }}>
                        ${totalProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL - 70% (Game Area) */}
            <div className="lg:col-span-7">
              <div 
                className="rounded-xl border p-8"
                style={{ backgroundColor: '#1e2433', borderColor: '#2d3748', minHeight: '600px' }}
              >
                {/* Dragon Visual */}
                {gameState !== 'idle' && (
                  <div className="text-center mb-6">
                    <div className="text-8xl mb-2">🐉</div>
                    <div className="text-sm" style={{ color: '#7a8e9e' }}>
                      {gameState === 'playing' ? 'Choose wisely...' : gameState === 'finished' ? 'Game Over' : ''}
                    </div>
                  </div>
                )}

                {/* Tower Grid */}
                {gameState === 'idle' ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🐉</div>
                      <h3 className="text-2xl font-bold mb-2" style={{ color: '#e2e8f0' }}>
                        Dragon Tower
                      </h3>
                      <p className="text-lg" style={{ color: '#a0aec0' }}>
                        Place your bet to start climbing
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Render tower from top to bottom */}
                    {tower.slice().reverse().map((level, idx) => {
                      const actualLevel = tower.length - 1 - idx;
                      return (
                        <div key={actualLevel} className="flex justify-center gap-3">
                          {level.map((_, tileIndex) => (
                            <button
                              key={tileIndex}
                              onClick={() => handleTileClick(actualLevel, tileIndex)}
                              disabled={actualLevel !== currentLevel || gameState !== 'playing' || loading}
                              className="flex items-center justify-center border-2 rounded-lg transition-all duration-200 font-bold text-2xl"
                              style={{
                                width: '100px',
                                height: '80px',
                                ...getTileStyle(actualLevel, tileIndex)
                              }}
                              onMouseEnter={(e) => {
                                if (actualLevel === currentLevel && gameState === 'playing' && !loading) {
                                  e.target.style.transform = 'scale(1.05)';
                                  e.target.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.3)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              {getTileContent(actualLevel, tileIndex)}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Level Indicator */}
                {gameState === 'playing' && (
                  <div className="mt-6 text-center">
                    <div className="inline-block px-6 py-2 rounded-lg" style={{ backgroundColor: '#1a1f2e' }}>
                      <span style={{ color: '#a0aec0' }}>Level: </span>
                      <span className="font-bold text-xl" style={{ color: '#00ff41' }}>
                        {currentLevel + 1} / {config.levels}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DragonTower;

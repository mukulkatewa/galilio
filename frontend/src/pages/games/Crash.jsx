import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const Crash = () => {
  const [betAmount, setBetAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [hasBet, setHasBet] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(null);
  const [crashed, setCrashed] = useState(false);
  const [result, setResult] = useState(null);
  const [recentCrashes, setRecentCrashes] = useState([]);
  const [chartData, setChartData] = useState([{ x: 0, y: 1.00 }]);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const animationRef = useRef(null);
  const gameCheckInterval = useRef(null);
  const autoCashoutRef = useRef(null);

  // Place bet
  const handleBet = async () => {
    if (betAmount <= 0) {
      toast.error('Bet amount must be greater than 0');
      return;
    }

    if (hasBet) {
      toast.error('You already have an active bet');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/games/crash/bet', {
        betAmount: parseFloat(betAmount)
      });

      if (response.data.success) {
        setHasBet(true);
        toast.success('Bet placed! Game running...');
      } else {
        toast.error(response.data.error || 'Failed to place bet');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  // Manual cashout
  const handleCashout = async () => {
    if (!hasBet) {
      toast.error('No active bet');
      return;
    }

    if (crashed) {
      toast.error('Game already crashed!');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/games/crash/cashout', {
        multiplier: parseFloat(currentMultiplier.toFixed(2))
      });

      if (response.data.success) {
        const result = response.data.result;
        setHasBet(false);
        setResult(result);
        toast.success(`Cashed out at ${result.cashOutMultiplier.toFixed(2)}×! Won $${result.payout.toFixed(2)}`);
      } else {
        toast.error(response.data.error || 'Failed to cash out');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cash out');
    } finally {
      setLoading(false);
    }
  };

  // Fetch and start new game
  const startNewGame = async () => {
    try {
      const response = await api.get('/games/crash/current');
      
      if (response.data.success) {
        const game = response.data.game;
        setCrashPoint(game.crashPoint);
        setGameStartTime(game.startTime);
        setGameRunning(true);
        setCrashed(false);
        setCurrentMultiplier(1.00);
        setChartData([{ x: 0, y: 1.00 }]);
        setResult(null);
        setHasBet(false);
      }
    } catch (error) {
      console.error('Failed to get game state:', error);
    }
  };

  // Animate game with realistic curve
  const animateGame = () => {
    if (!gameStartTime || !crashPoint) return;
    
    const elapsed = Date.now() - gameStartTime;
    // Longer animation: minimum 3 seconds, scale up to 15 seconds for high crashes
    const minDuration = 3000;
    const maxDuration = 15000;
    const timeToGrash = Math.min(minDuration + (crashPoint * 800), maxDuration);
    const progress = Math.min(elapsed / timeToGrash, 1);
    
    if (progress >= 1) {
      // Game crashed
      setCrashed(true);
      setGameRunning(false);
      
      if (hasBet) {
        toast.error(`Crashed at ${crashPoint.toFixed(2)}×! Lost $${betAmount}`);
        setHasBet(false);
      }
      
      setRecentCrashes(prev => [crashPoint, ...prev.slice(0, 9)]);
      
      // Start new game after 5-8 seconds with countdown
      const delayTime = 5000 + Math.floor(Math.random() * 3000); // 5-8 seconds
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setCountdown(Math.floor(delayTime / 1000));
      
      setTimeout(() => {
        clearInterval(countdownInterval);
        setCountdown(0);
        startNewGame();
      }, delayTime);
      
      return;
    }
    
    // Exponential growth with some randomness
    const baseMultiplier = 1 + (crashPoint - 1) * Math.pow(progress, 0.8);
    const noise = (Math.random() - 0.5) * 0.02; // Small random fluctuation
    const multiplier = Math.max(1.00, baseMultiplier + noise);
    
    setCurrentMultiplier(multiplier);
    
    // Auto-cashout check
    if (hasBet && autoCashout && parseFloat(autoCashout) > 0 && multiplier >= parseFloat(autoCashout)) {
      // Trigger auto-cashout
      toast.success(`🎯 Auto-cashout triggered at ${parseFloat(autoCashout).toFixed(2)}×!`);
      handleCashout();
      return;
    }
    
    // Update chart (limit points for performance)
    setChartData(prev => {
      const newData = [...prev, { x: prev.length, y: multiplier }];
      return newData.length > 100 ? newData.slice(-100) : newData;
    });
    
    animationRef.current = requestAnimationFrame(animateGame);
  };

  // Start animation when game is running
  useEffect(() => {
    if (gameRunning && !crashed) {
      animationRef.current = requestAnimationFrame(animateGame);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameRunning, crashed, gameStartTime, crashPoint]);

  // Initialize game on mount
  useEffect(() => {
    startNewGame();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (gameCheckInterval.current) {
        clearInterval(gameCheckInterval.current);
      }
    };
  }, []);

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-semibold mb-6" style={{ color: '#e2e8f0' }}>
          🚀 Crash
        </h1>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* TOP SECTION - 60% */}
          <div 
            className="rounded-xl border p-8"
            style={{ backgroundColor: '#1e2433', borderColor: '#2d3748', minHeight: '400px' }}
          >
            {/* Large Multiplier Display */}
            <div className="text-center mb-6">
              <div 
                className="font-mono font-semibold transition-colors"
                style={{ 
                  fontSize: '80px',
                  color: crashed ? '#f56565' : (gameRunning ? '#48bb78' : '#e2e8f0')
                }}
              >
                {currentMultiplier.toFixed(2)}×
              </div>
              {crashed && countdown > 0 && (
                <div className="text-xl font-semibold mt-2" style={{ color: '#f56565' }}>
                  Crashed at {crashPoint?.toFixed(2)}× - Next round in {countdown}s
                </div>
              )}
              {crashed && countdown === 0 && (
                <div className="text-xl font-semibold mt-2" style={{ color: '#f56565' }}>
                  Crashed at {crashPoint?.toFixed(2)}×
                </div>
              )}
              {!crashed && gameRunning && (
                <div className="text-lg font-semibold mt-2" style={{ color: '#48bb78' }}>
                  Game Running... {hasBet && (
                    <span>
                      (Bet active{autoCashout && ` - Auto @ ${parseFloat(autoCashout).toFixed(2)}×`})
                    </span>
                  )}
                </div>
              )}
              {result && (
                <div className="text-xl font-semibold mt-2" style={{ color: '#48bb78' }}>
                  Cashed out at {result.cashOutMultiplier.toFixed(2)}× - Won ${result.payout.toFixed(2)}
                </div>
              )}
            </div>

            {/* Line Graph */}
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="x" 
                    hide 
                  />
                  <YAxis 
                    domain={[1, 'auto']} 
                    hide 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="y" 
                    stroke={crashed ? '#f56565' : (gameRunning ? '#48bb78' : '#4299e1')}
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BOTTOM SECTION - 40% */}
          <div 
            className="rounded-xl border p-6"
            style={{ backgroundColor: '#1e2433', borderColor: '#2d3748' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Controls */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
                  Controls
                </h3>

                {/* Bet Amount */}
                <div>
                  <label className="block text-sm font-normal mb-2" style={{ color: '#a0aec0' }}>
                    Bet Amount
                  </label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={loading || hasBet}
                    className="w-full rounded-lg border px-4 py-2 focus:outline-none"
                    style={{ 
                      backgroundColor: '#2d3748', 
                      borderColor: '#2d3748',
                      color: '#e2e8f0'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4299e1'}
                    onBlur={(e) => e.target.style.borderColor = '#2d3748'}
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Auto Cashout */}
                <div>
                  <label className="block text-sm font-normal mb-2" style={{ color: '#a0aec0' }}>
                    Auto Cashout at Multiplier (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={autoCashout}
                      onChange={(e) => setAutoCashout(e.target.value)}
                      disabled={loading || hasBet}
                      placeholder="e.g. 2.00 for 2.00×"
                      className="w-full rounded-lg border px-4 py-2 pr-8 focus:outline-none"
                      style={{ 
                        backgroundColor: '#2d3748', 
                        borderColor: '#2d3748',
                        color: '#e2e8f0'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4299e1'}
                      onBlur={(e) => e.target.style.borderColor = '#2d3748'}
                      min="1.01"
                      step="0.01"
                    />
                    <span 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      style={{ color: '#a0aec0', fontSize: '14px' }}
                    >
                      ×
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#718096' }}>
                    Game will auto-cashout when this multiplier is reached
                  </p>
                </div>

                {/* Bet/Cashout Buttons */}
                <div className="space-y-2">
                  {!hasBet ? (
                    <button
                      onClick={handleBet}
                      disabled={loading || crashed}
                      className="w-full rounded-lg px-6 py-3 font-medium transition-colors"
                      style={{ 
                        backgroundColor: (loading || crashed) ? '#2d3748' : '#4299e1',
                        color: '#ffffff',
                        cursor: (loading || crashed) ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => !(loading || crashed) && (e.target.style.backgroundColor = '#3182ce')}
                      onMouseLeave={(e) => !(loading || crashed) && (e.target.style.backgroundColor = '#4299e1')}
                    >
                      {loading ? 'Placing Bet...' : '🚀 PLACE BET'}
                    </button>
                  ) : (
                    <button
                      onClick={handleCashout}
                      disabled={loading || crashed}
                      className="w-full rounded-lg px-6 py-3 font-medium transition-colors"
                      style={{ 
                        backgroundColor: (loading || crashed) ? '#2d3748' : '#48bb78',
                        color: '#ffffff',
                        cursor: (loading || crashed) ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => !(loading || crashed) && (e.target.style.backgroundColor = '#38a169')}
                      onMouseLeave={(e) => !(loading || crashed) && (e.target.style.backgroundColor = '#48bb78')}
                    >
                      {loading ? 'Cashing Out...' : `💰 CASH OUT ${currentMultiplier.toFixed(2)}×`}
                    </button>
                  )}
                </div>
              </div>

              {/* Recent Crash Points */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#e2e8f0' }}>
                  Recent Crashes
                </h3>
                
                {recentCrashes.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: '#a0aec0' }}>
                    No games yet
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {recentCrashes.map((crash, index) => (
                      <div
                        key={index}
                        className="rounded-lg px-4 py-2 font-mono font-semibold"
                        style={{ 
                          backgroundColor: crash < 2 ? '#f56565' : crash < 5 ? '#f6ad55' : '#48bb78',
                          color: '#ffffff'
                        }}
                      >
                        {crash.toFixed(2)}×
                      </div>
                    ))}
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

export default Crash;

const axios = require('axios');

class FullCasinoSimulator {
  constructor() {
    this.token = null;
    this.baseURL = 'http://localhost:5000/api';
    this.results = {
      keno: null,
      limbo: null,
      crash: null,
      dragonTower: null,
      dice: null
    };
  }
  
  async createTestUser() {
    try {
      const username = `testuser_${Date.now()}`;
      const response = await axios.post(`${this.baseURL}/auth/register`, {
        email: `${username}@test.com`,
        username,
        password: 'password123'
      });
      
      this.token = response.data.data.token;
      console.log('✅ Test user created:', username);
      console.log('   Initial balance: $10,000\n');
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to create test user');
      throw error;
    }
  }
  
  async simulateKeno(rounds = 1000) {
    console.log('🎲 Starting Keno simulation...');
    let totalWagered = 0;
    let totalPayout = 0;
    const betAmount = 10;
    
    for (let i = 0; i < rounds; i++) {
      const pickedNumbers = [];
      while (pickedNumbers.length < 10) {
        const num = Math.floor(Math.random() * 80) + 1;
        if (!pickedNumbers.includes(num)) {
          pickedNumbers.push(num);
        }
      }
      
      try {
        const response = await axios.post(
          `${this.baseURL}/games/keno`,
          { betAmount, pickedNumbers },
          { headers: { Authorization: `Bearer ${this.token}` } }
        );
        
        totalWagered += betAmount;
        totalPayout += response.data.result.payout;
      } catch (error) {
        console.error(`Round ${i + 1} failed`);
        break;
      }
      
      if ((i + 1) % 250 === 0) {
        console.log(`   ${i + 1}/${rounds} completed...`);
      }
    }
    
    const houseProfit = totalWagered - totalPayout;
    const houseEdge = (houseProfit / totalWagered) * 100;
    
    this.results.keno = {
      totalWagered,
      totalPayout,
      houseProfit,
      houseEdge,
      expectedEdge: 25
    };
    
    this.printGameResults('KENO', this.results.keno);
  }
  
  async simulateLimbo(rounds = 1000) {
    console.log('🎲 Starting Limbo simulation...');
    let totalWagered = 0;
    let totalPayout = 0;
    const betAmount = 10;
    const targetMultiplier = 2;
    
    for (let i = 0; i < rounds; i++) {
      try {
        const response = await axios.post(
          `${this.baseURL}/games/limbo`,
          { betAmount, targetMultiplier },
          { headers: { Authorization: `Bearer ${this.token}` } }
        );
        
        totalWagered += betAmount;
        totalPayout += response.data.result.payout;
      } catch (error) {
        break;
      }
      
      if ((i + 1) % 250 === 0) {
        console.log(`   ${i + 1}/${rounds} completed...`);
      }
    }
    
    const houseProfit = totalWagered - totalPayout;
    const houseEdge = (houseProfit / totalWagered) * 100;
    
    this.results.limbo = {
      totalWagered,
      totalPayout,
      houseProfit,
      houseEdge,
      expectedEdge: 1
    };
    
    this.printGameResults('LIMBO', this.results.limbo);
  }
  
  async simulateCrash(rounds = 1000) {
    console.log('🎲 Starting Crash simulation...');
    let totalWagered = 0;
    let totalPayout = 0;
    const betAmount = 10;
    const autoCashOut = 2;
    
    for (let i = 0; i < rounds; i++) {
      try {
        const response = await axios.post(
          `${this.baseURL}/games/crash`,
          { betAmount, autoCashOut },
          { headers: { Authorization: `Bearer ${this.token}` } }
        );
        
        totalWagered += betAmount;
        totalPayout += response.data.result.payout;
      } catch (error) {
        break;
      }
      
      if ((i + 1) % 250 === 0) {
        console.log(`   ${i + 1}/${rounds} completed...`);
      }
    }
    
    const houseProfit = totalWagered - totalPayout;
    const houseEdge = (houseProfit / totalWagered) * 100;
    
    this.results.crash = {
      totalWagered,
      totalPayout,
      houseProfit,
      houseEdge,
      expectedEdge: 1
    };
    
    this.printGameResults('CRASH', this.results.crash);
  }
  
  async simulateDragonTower(rounds = 500) {
    console.log('🎲 Starting Dragon Tower simulation...');
    let totalWagered = 0;
    let totalPayout = 0;
    const betAmount = 10;
    const difficulty = 'medium';
    
    for (let i = 0; i < rounds; i++) {
      // Simulate random picks (sometimes cash out early)
      const maxPicks = Math.random() > 0.7 ? 10 : Math.floor(Math.random() * 10) + 1;
      const picks = [];
      
      for (let j = 0; j < maxPicks; j++) {
        picks.push(Math.floor(Math.random() * 4)); // 4 tiles
      }
      
      try {
        const response = await axios.post(
          `${this.baseURL}/games/dragon-tower`,
          { betAmount, difficulty, picks },
          { headers: { Authorization: `Bearer ${this.token}` } }
        );
        
        totalWagered += betAmount;
        totalPayout += response.data.result.payout;
      } catch (error) {
        break;
      }
      
      if ((i + 1) % 100 === 0) {
        console.log(`   ${i + 1}/${rounds} completed...`);
      }
    }
    
    const houseProfit = totalWagered - totalPayout;
    const houseEdge = (houseProfit / totalWagered) * 100;
    
    this.results.dragonTower = {
      totalWagered,
      totalPayout,
      houseProfit,
      houseEdge,
      expectedEdge: 2
    };
    
    this.printGameResults('DRAGON TOWER', this.results.dragonTower);
  }
  
  async simulateDice(rounds = 1000) {
    console.log('🎲 Starting Dice simulation...');
    let totalWagered = 0;
    let totalPayout = 0;
    const betAmount = 10;
    
    for (let i = 0; i < rounds; i++) {
      const target = 50;
      const rollOver = Math.random() > 0.5;
      
      try {
        const response = await axios.post(
          `${this.baseURL}/games/dice`,
          { betAmount, target, rollOver },
          { headers: { Authorization: `Bearer ${this.token}` } }
        );
        
        totalWagered += betAmount;
        totalPayout += response.data.result.payout;
      } catch (error) {
        break;
      }
      
      if ((i + 1) % 250 === 0) {
        console.log(`   ${i + 1}/${rounds} completed...`);
      }
    }
    
    const houseProfit = totalWagered - totalPayout;
    const houseEdge = (houseProfit / totalWagered) * 100;
    
    this.results.dice = {
      totalWagered,
      totalPayout,
      houseProfit,
      houseEdge,
      expectedEdge: 1
    };
    
    this.printGameResults('DICE', this.results.dice);
  }
  
  printGameResults(gameName, results) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`${gameName} SIMULATION RESULTS`);
    console.log('='.repeat(50));
    console.log(`Total Wagered:     $${results.totalWagered.toFixed(2)}`);
    console.log(`Total Payout:      $${results.totalPayout.toFixed(2)}`);
    console.log(`House Profit:      $${results.houseProfit.toFixed(2)}`);
    console.log(`Actual Edge:       ${results.houseEdge.toFixed(2)}%`);
    console.log(`Expected Edge:     ${results.expectedEdge}%`);
    console.log(`Variance:          ${(results.houseEdge - results.expectedEdge).toFixed(2)}%`);
    console.log('='.repeat(50) + '\n');
  }
  
  async printFinalSummary() {
    console.log('\n' + '█'.repeat(60));
    console.log('█' + ' '.repeat(58) + '█');
    console.log('█' + '  FINAL SIMULATION SUMMARY'.padEnd(58) + '█');
    console.log('█' + ' '.repeat(58) + '█');
    console.log('█'.repeat(60) + '\n');
    
    let grandTotalWagered = 0;
    let grandTotalPayout = 0;
    let grandHouseProfit = 0;
    
    Object.entries(this.results).forEach(([game, data]) => {
      if (data) {
        grandTotalWagered += data.totalWagered;
        grandTotalPayout += data.totalPayout;
        grandHouseProfit += data.houseProfit;
        
        console.log(`${game.toUpperCase().padEnd(15)} | Profit: $${data.houseProfit.toFixed(2).padStart(10)} | Edge: ${data.houseEdge.toFixed(2)}%`);
      }
    });
    
    const overallEdge = (grandHouseProfit / grandTotalWagered) * 100;
    
    console.log('\n' + '-'.repeat(60));
    console.log(`GRAND TOTAL        | Wagered: $${grandTotalWagered.toFixed(2)}`);
    console.log(`                   | Payout:  $${grandTotalPayout.toFixed(2)}`);
    console.log(`                   | Profit:  $${grandHouseProfit.toFixed(2)}`);
    console.log(`                   | Edge:    ${overallEdge.toFixed(2)}%`);
    console.log('-'.repeat(60) + '\n');
    
    // Get final user balance
    try {
      const response = await axios.get(
        `${this.baseURL}/user/balance`,
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
      
      const finalBalance = response.data.data.balance;
      const balanceChange = finalBalance - 10000;
      
      console.log(`Player Starting Balance: $10,000.00`);
      console.log(`Player Final Balance:    $${finalBalance.toFixed(2)}`);
      console.log(`Player Net Change:       $${balanceChange.toFixed(2)}`);
      console.log(`\n✅ Casino is ${balanceChange < 0 ? 'PROFITABLE' : 'LOSING'} ✅\n`);
    } catch (error) {
      console.error('Could not fetch final balance');
    }
  }
  
  async runFullSimulation() {
    console.log('\n🎰 CASINO SIMULATION STARTING 🎰\n');
    console.log('This will simulate 1000+ games across all 5 casino games');
    console.log('to verify house edge and profitability.\n');
    
    await this.createTestUser();
    
    await this.simulateKeno(1000);
    await this.simulateLimbo(1000);
    await this.simulateCrash(1000);
    await this.simulateDice(1000);
    await this.simulateDragonTower(500); // Slower game
    
    await this.printFinalSummary();
  }
}

// Run the simulation
const simulator = new FullCasinoSimulator();
simulator.runFullSimulation().catch(console.error);
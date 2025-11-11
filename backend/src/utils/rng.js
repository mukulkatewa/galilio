const crypto = require('crypto');

class ProvablyFairRNG {
  static generateServerSeed() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  static generateClientSeed() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  static generateNumber(serverSeed, clientSeed, nonce, max) {
    const hash = crypto
      .createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest('hex');
    
    const num = parseInt(hash.substring(0, 8), 16);
    return (num % max) + 1;
  }
  
  static generateFloat(serverSeed, clientSeed, nonce) {
    const hash = crypto
      .createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest('hex');
    
    // Use more bytes for better distribution (13 hex chars = 52 bits)
    const hex = hash.substring(0, 13);
    const num = parseInt(hex, 16);
    const max = parseInt('1' + '0'.repeat(13), 16); // Max value for 13 hex digits
    
    return num / max;
  }
  
  static generateMultipleNumbers(serverSeed, clientSeed, nonce, count, max) {
    const numbers = new Set();
    let currentNonce = nonce;
    
    while (numbers.size < count) {
      const num = this.generateNumber(serverSeed, clientSeed, currentNonce, max);
      numbers.add(num);
      currentNonce++;
    }
    
    return Array.from(numbers);
  }
  
  static verifyResult(serverSeed, clientSeed, nonce, expectedResult) {
    // Allow users to verify game results
    const hash = crypto
      .createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest('hex');
    
    return hash;
  }
}

module.exports = ProvablyFairRNG;
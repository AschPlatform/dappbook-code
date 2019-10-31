const SHA256 = require('crypto-js/sha256');

class Block {
  // 构造函数
  constructor(index, timestamp) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = [];
    this.previousHash = '';
    this.hash = this.calculateHash();
  }
  // 计算区块的哈希值
  calculateHash() {
    return SHA256(this.index + this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).toString();
  }
  // 添加新的交易到当前区块
  addNewTransaction(sender, recipient, amount) {
    this.transactions.push({
      sender,
      recipient,
      amount
    })
  }
  // 查看当前区块里的交易信息
  getTransactions() {
    return this.transactions;
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }
  // 创建创始区块
  createGenesisBlock() {
    const genesisBlock = new Block(0, "01/10/2017");
    genesisBlock.previousHash = '0';
    genesisBlock.addNewTransaction('Leo', 'Janice', 520);
    return genesisBlock;
  }
  // 获取最新区块
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }
  // 添加区块到区块链
  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.hash = newBlock.calculateHash();
    this.chain.push(newBlock);
  }
  // 验证当前区块链是否有效
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // 验证当前区块的 hash 是否正确
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      // 验证当前区块的 previousHash 是否等于上一个区块的 hash
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}

// 区块链示例
const testCoin = new Blockchain();
console.log(JSON.stringify(testCoin.chain, undefined, 2));

let block1 = new Block('1', '02/10/2017');
block1.addNewTransaction('Alice', 'Bob', 500);
testCoin.addBlock(block1);

let block2 = new Block('2', '03/10/2017');
block2.addNewTransaction('Jack', 'David', 1000);
testCoin.addBlock(block2);

console.log(JSON.stringify(testCoin.chain, undefined, 2));
console.log(testCoin.isChainValid())

// 验证防篡改特性
// 1. 修改交易
block1.transactions[0].amount = 100;
console.log(block1.getTransactions())
console.log(testCoin.isChainValid())

// 2.修改交易&修改区块哈希
block1.transactions[0].amount = 100;
block1.hash = block1.calculateHash();
console.log(testCoin.isChainValid())
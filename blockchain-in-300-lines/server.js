const fs = require('fs');
const express = require('express');
const uuidv4 = require('uuid/v4');
const Blockchain = require('./blockchain').Blockchain;
const Block = require('./blockchain').Block;

const port = process.env.PORT || 3000;
const app = express();
const nodeIdentifier = uuidv4();
const testCoin = new Blockchain();

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

app.use((req, res, next) => {
  var now = new Date().toString();
  var log = `${now}: ${req.method} ${req.url}`;
  console.log(log);
  fs.appendFile('server.log', log + '\n', (err) => {
    if (err) console.error(err);
  });
  next();
})

// 接口实现
app.get('/mine', (req, res) => {
  const latestBlockIndex = testCoin.chain.length;
  const newBlock = new Block(latestBlockIndex, new Date().toString());
  newBlock.transactions = testCoin.currentTransactions;
  // Get a reward for mining the new block
  newBlock.transactions.unshift({
    sender: '0',
    recipient: nodeIdentifier,
    amount: 50
  });
  testCoin.addBlock(newBlock);
  testCoin.currentTransactions = [];
  res.send(`Mined new block ${JSON.stringify(newBlock, undefined, 2)}`);
});

app.post('/transactions/new', jsonParser, (req, res) => {
  const newTransaction = req.body;
  testCoin.addNewTransaction(newTransaction);
  res.send(`The transaction ${JSON.stringify(newTransaction)} is successfully added to the blockchain.`);
});

app.get('/chain', (req, res) => {
  const response = {
    chain: testCoin.chain,
    length: testCoin.chain.length
  }
  res.send(response);
})

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
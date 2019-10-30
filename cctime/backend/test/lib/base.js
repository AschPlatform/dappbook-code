let supertest = require('supertest')
let debug = require('debug')('base')
let AschJS = require('asch-js')
let assert = require('chai').assert

let host = 'localhost'
let port = 4096
let baseUrl = 'http://' + host + ':' + port
let baseApi = supertest(baseUrl + '/api')
let genesisAccount = {
  address: 'AAjoobuMcmkQ1gS8vTfBy3dQavBiH7sBCF',
  secret: 'almost journey future similar begin type write celery girl month forget breeze'
}

let dapp
let id
let dappUrl
let dappApi

function PIFY(fn, receiver) {
  return (...args) => {
    return new Promise((resolve, reject) => {
      fn.apply(receiver, [
        ...args,
        (err, result) => {
          return err ? reject(err) : resolve(result)
        }
      ])
    })
  }
}

function baseApiGet(path, cb) {
  baseApi
    .get(path)
    .expect('Content-Type', /json/)
    .expect(200)
    .end(function(err, res) {
      cb(err, res && res.body)
    })
}

function dappApiGet(path, cb) {
  let seperator = path.indexOf('?') !== -1 ? '&' : '?'
  dappApi
    .get(path + seperator + '_t=' + new Date().getTime())
    .expect('Content-Type', /json/)
    .expect(200)
    .end(function(err, res) {
      debug('dappApiGet response err: %j, res: ', err, res.body)
      cb(err, res && res.body)
    })
}

function init(cb) {
  baseApiGet('/dapps?name=asch-dapp-cctime-test', function(err, res) {
    debug('init find dapp err: %j, res: ', err, res)
    if (err) return cb('Request error: ' + err)
    if (!res.success) return cb('Server error: ' + err)
    if (!res.dapps.length) return cb('DApp not found')
    dapp = res.dapps[0]
    id = dapp.transactionId
    dappUrl = baseUrl + '/api/dapps/' + id
    dappApi = supertest(dappUrl)
    cb()
  })
}

function getHeight(cb) {
  dappApiGet('/blocks/height', function(err, res) {
    if (err) {
      return cb('Failed to get height: ' + err)
    } else {
      return cb(null, res.height)
    }
  })
}

function sleep(n, cb) {
  setTimeout(cb, n)
}

async function onNewBlockAsync() {
  let firstHeight = await PIFY(getHeight)()
  while (true) {
    await PIFY(sleep)(1000)
    let height = await PIFY(getHeight)()
    if (height > firstHeight) break
  }
}

function randomSecret() {
  return Math.random()
    .toString(36)
    .substring(7)
}

function getRandomAccount(memo=false) {
  var secret = memo || randomSecret()
  var keys = AschJS.crypto.getKeys(secret)
  return {
    address: AschJS.crypto.getAddress(keys.publicKey),
    publicKey: keys.publicKey,
    secret: secret
  }
}

function randomCoin() {
  return String(Math.floor(Math.random() * (1000 * 100000000)) + 100 * 100000000)
}

function giveMoney(address, currency, amount, cb) {
  dappApi
    .put('/transactions/unsigned')
    .set('Accept', 'application/json')
    .send({
      secret: genesisAccount.secret,
      fee: '10000000',
      type: 3,
      args: JSON.stringify([currency, amount, address])
    })
    .expect('Content-Type', /json/)
    .expect(200)
    .end(function(err, res) {
      debug('giveMoney res err: %j, res: ', err, res.body)
      assert(!err)
      assert(res.body.success)
      cb(err, res)
    })
}

async function giveMoneyAndWaitAsync(addresses, currency, amount) {
  for (let i = 0; i < addresses.length; i++) {
    await PIFY(giveMoney)(addresses[i], currency, amount || randomCoin())
  }
  await onNewBlockAsync()
}

function submitInnerTransaction(trs, cb) {
  debug('submitInnerTransaction input: ', trs)
  dappApi
    .put('/transactions/signed')
    .set('Accept', 'application/json')
    .send({
      transaction: trs
    })
    .expect('Content-Type', /json/)
    .expect(200)
    .end(function(err, res) {
      debug('submitInnerTransaction response err: %j, res: ', err, res.body)
      cb(err, res.body)
    })
}

async function postArticleAsync(article, secret) {
  let trs = AschJS.dapp.createInnerTransaction(
    {
      fee: '10000000',
      type: 1000,
      args: [
        article.title,
        article.url,
        article.text,
        article.tags,
        article.cid,
        article.settleHeight
      ]
    },
    secret
  )
  return await PIFY(submitInnerTransaction)(trs)
}

async function postCommentAsync(comment, secret) {
  let trs = AschJS.dapp.createInnerTransaction(
    {
      fee: '10000000',
      type: 1001,
      args: [comment.aid, comment.pid, comment.content]
    },
    secret
  )
  return await PIFY(submitInnerTransaction)(trs)
}

async function voteArticleAsync(vote, secret) {
  let trs = AschJS.dapp.createInnerTransaction(
    {
      fee: '10000000',
      type: 1002,
      args: [vote.aid, vote.amount]
    },
    secret
  )
  return await PIFY(submitInnerTransaction)(trs)
}

async function likeCommentAsync(comment, secret) {
  let trs = AschJS.dapp.createInnerTransaction(
    {
      fee: '10000000',
      type: 1003,
      args: [comment.cid, comment.amount]
    },
    secret
  )
  return await PIFY(submitInnerTransaction)(trs)
}

async function reportAsync(reoport, secret) {
  let trs = AschJS.dapp.createInnerTransaction(
    {
      fee: '10000000',
      type: 1004,
      args: [reoport.topic, reoport.value]
    },
    secret
  )
  return await PIFY(submitInnerTransaction)(trs)
}

async function createChannelAsync(channel, secret) {
  let trs = AschJS.dapp.createInnerTransaction(
    {
      fee: '1000000000000',
      type: 1005,
      args: [channel.name, channel.url, channel.desc]
    },
    secret
  )
  return await PIFY(submitInnerTransaction)(trs)
}

async function updateChannelAsync(channel, secret) {
  let trs = AschJS.dapp.createInnerTransaction(
    {
      fee: '50000000000',
      type: 1006,
      args: [channel.cid, channel.field, channel.value]
    },
    secret
  )
  return await PIFY(submitInnerTransaction)(trs)
}
async function getRewardAsync(voteId, secret) {
  let trs = AschJS.dapp.createInnerTransaction(
    {
      fee: '0',
      type: 1007,
      args: [voteId]
    },
    secret
  )
  return await PIFY(submitInnerTransaction)(trs)
}

async function calculatePrizeAsync(articleId, secret) {
  let trs = AschJS.dapp.createInnerTransaction(
    {
      fee: '10000000',
      type: 1008,
      args: [articleId]
    },
    secret
  )
  return await PIFY(submitInnerTransaction)(trs)
}

function signBytes(bytes, secret) {
  let keys = AschJS.crypto.getKeys(secret)
  return AschJS.crypto.signBytes(bytes, keys)
}

function getPublicKey(secret) {
  return AschJS.crypto.getKeys(secret).publicKey
}

module.exports = {
  dapp: dapp,
  PIFY: PIFY,
  baseApiGetAsync: PIFY(baseApiGet),
  dappApiGetAsync: PIFY(dappApiGet),
  initAsync: PIFY(init),
  onNewBlockAsync: onNewBlockAsync,
  getRandomAccount: getRandomAccount,
  genesisAccount: genesisAccount,
  giveMoneyAndWaitAsync: giveMoneyAndWaitAsync,
  submitInnerTransactionAsync: PIFY(submitInnerTransaction),
  sleepAsync: PIFY(sleep),
  postArticleAsync: postArticleAsync,
  postCommentAsync: postCommentAsync,
  voteArticleAsync: voteArticleAsync,
  likeCommentAsync: likeCommentAsync,
  reportAsync: reportAsync,
  createChannelAsync: createChannelAsync,
  updateChannelAsync: updateChannelAsync,
  getRewardAsync: getRewardAsync,
  calculatePrizeAsync: calculatePrizeAsync,
  signBytes: signBytes,
  getPublicKey: getPublicKey
}

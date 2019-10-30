let base = require('./lib/base')
let utils = require('./lib/utils')
let debug = require('debug')('cctime')
let assert = require('chai').assert
let ByteBuffer = require('bytebuffer')
let constants = require('../lib/constants')
let config = require('../config')
let delegateSecrets = [
  'fit night someone unveil dwarf believe middle evidence puzzle hotel common choose',
  'lawsuit ride civil slice kitchen unfold unable lumber prevent suspect finger chunk',
  'absurd sweet blast dinner battle zero ladder steak coral fork venture coffee',
  'topic ramp throw cloud moment jungle bar series task protect erupt answer',
  'hoot tired know dish rally kiwi snack patrol bunker ocean panel this'
]

describe('cctime', () => {
  before(async function() {
    await base.initAsync()
  })

  it('should be ok to get balance', async function() {
    let res = await base.dappApiGetAsync('/accounts/ABEUciRUdpr3WMqn8tmyurBQqYALvo2G8j')
    assert(res.success)
    assert.isObject(res.account)
    let balance = res.account.balances[0].balance
    assert(balance === '0')
  })

  it('should be ok to get all channels', async function() {
    let m = await base.dappApiGetAsync('/channels')
    debug('get all channels', m)
    assert(m.success, 'get seccess')
    assert.exists(m.count, 'get count')
    assert.isArray(m.channels, 'get result')
  })

  it('should not find a non-existent channel', async function() {
    let m = await base.dappApiGetAsync('/channels/non-existent')
    debug('get non-existent channel', m)
    assert(!m.success)
    assert.match(m.error, /Channel not found/)
  })

  it('should be ok to get all votes', async function() {
    let m = await base.dappApiGetAsync('/votes')
    debug('get all votes', m)
    assert(m.success)
    assert.exists(m.count)
    assert.isArray(m.votes)
  })

  it('should not find a non-existent vote', async function() {
    let m = await base.dappApiGetAsync('/votes/non-existent')
    debug('get non-existent vote', m)
    assert(!m.success)
    assert.match(m.error, /Vote not found/)
  })

  it('should be ok to get all articles', async function() {
    let m = await base.dappApiGetAsync('/articles')
    debug('get all articles', m)
    assert(m.success)
    // assert.exists(m.count)
    assert.isArray(m.articles)
  })

  it('should not find a non-existent article', async function() {
    let m = await base.dappApiGetAsync('/articles/non-existent')
    debug('get non-existent article', m)
    assert(!m.success)
    assert.match(m.error, /Article not found/)
  })

  describe('test channel', () => {
    let channelTransactionId, channelId
    before(async function() {
      let delegateAccount = base.getRandomAccount(delegateSecrets[0])
      await base.giveMoneyAndWaitAsync([delegateAccount.address], 'CCTime.XCT', '1050000000000')
      let res = await base.createChannelAsync(
        {
          name: 'test channel ' + Math.random(),
          desc:
            'this is a channel desc in case to pass the validate of 50 chars ok that is not long enough give you 50 chars ok',
          url: 'http://openmindclub.qiniudn.com/caos/caos.jpg'
        },
        delegateSecrets[0]
      )
      debug('post channel', res)
      channelTransactionId = res.transactionId
      assert(res.success)
      assert(res.transactionId.length === 64)
      await base.onNewBlockAsync()
    })

    it('test channel get', async function() {
      let res = await base.dappApiGetAsync('/channels?tid=' + channelTransactionId)
      assert(res.success)
      assert(res.count === 1)
      assert.isArray(res.channels)
      assert(res.channels.length === 1)
      assert(res.channels[0].tid === channelTransactionId)
      channelId = res.channels[0].id
    })

    it('test channel update name ', async function() {
      let res = await base.updateChannelAsync(
        {
          cid: channelId,
          field: 'name',
          value: 'test'
        },
        delegateSecrets[0]
      )

      debug('update channel name', res)
      assert(!res.success)
      assert.match(res.error, /name not support update/)
    })

    it('test channel update', async function() {
      let res = await base.updateChannelAsync(
        {
          cid: channelId,
          field: 'url',
          value: 'http://test.com/image.jpg'
        },
        delegateSecrets[0]
      )
      debug(res)
      assert(res.success)
      assert(res.transactionId.length === 64)
    })

    it('settle article test', async function() {
      let authorAccount = base.getRandomAccount()
      let user1 = base.getRandomAccount()
      let user2 = base.getRandomAccount()
      let user3 = base.getRandomAccount()
      let addresses = [user1.address, user2.address, user3.address]
      await base.giveMoneyAndWaitAsync(addresses, 'CCTime.XCT', '520000000')
      await base.giveMoneyAndWaitAsync([authorAccount.address], 'CCTime.XCT', '20000000')
      await base.onNewBlockAsync()
      let res = await base.dappApiGetAsync('/blocks/height')
      assert(res.success)

      let currentHeight = res.height
      res = await base.postArticleAsync(
        {
          title: 'settle article title',
          url: '',
          text: 'first settle article desc with chars show it if is greater than 50 ',
          tags: '',
          cid: channelId,
          awardType: 1,
          settleHeight: currentHeight + 2
        },
        authorAccount.secret
      )
      assert(res.success)
      assert(res.transactionId.length === 64)
      let articleTransactionId = res.transactionId

      await base.onNewBlockAsync()

      debug('query articel by tid')
      res = await base.dappApiGetAsync('/articles?tid=' + articleTransactionId)
      assert(res.success)
      // assert(res.count === 1)
      assert.isArray(res.articles)
      let article = res.articles[0]
      assert(res.articles.length === 1)
      assert(article.tid === articleTransactionId)
      assert(article.settleHeight === currentHeight + 2)
      assert(article.awardType === 1)
      assert(article.awardState === 1)
      assert(article.votes === 0)
      articleId = article.id

      await base.onNewBlockAsync()

      debug('vote article 3 users')
      res = await base.voteArticleAsync({ aid: articleId, amount: '250000000' }, user1.secret)
      assert(res.success)
      assert(res.transactionId.length === 64)
      res = await base.voteArticleAsync({ aid: articleId, amount: '300000000' }, user2.secret)
      assert(res.success)
      assert(res.transactionId.length === 64)
      res = await base.voteArticleAsync({ aid: articleId, amount: '400000000' }, user3.secret)
      assert(res.success)
      assert(res.transactionId.length === 64)

      await base.onNewBlockAsync()
      res = await base.voteArticleAsync({ aid: articleId, amount: '200000000' }, user2.secret)
      assert(res.success)
      assert(res.transactionId.length === 64)

      res = await base.voteArticleAsync({ aid: articleId, amount: '100000000' }, user3.secret)
      assert(res.success)
      assert(res.transactionId.length === 64)

      res = await base.voteArticleAsync({ aid: articleId, amount: '250000000' }, user1.secret)
      assert(res.success)
      assert(res.transactionId.length === 64)

      await base.onNewBlockAsync()
      debug('check vote num ')

      res = await base.dappApiGetAsync('/votes?aid=' + articleId)
      assert(res.success)
      assert(res.count === 3)
      assert.isArray(res.votes)
      let vote = res.votes[1]
      assert(vote.type === 1)
      assert(vote.awardState === 1)
      assert(vote.amount === '500000000')

      res = await base.dappApiGetAsync('/articles/' + articleId)
      assert(res.success)
      assert.isObject(res.article)
      article = res.article
      assert(article.votes === 14)

      res = await base.dappApiGetAsync('/channels/' + channelId)
      assert(res.success)
      assert.isObject(res.channel)
      let channel = res.channel
      assert(channel.votes === 14)
      assert(channel.articles === 1)

      debug('check voter balances ')
      // TODO get user balance
      res = await base.dappApiGetAsync('/accounts/' + user3.address)
      assert(res.success)
      assert.isObject(res.account)
      let balance = res.account.balances[0].balance
      assert(balance === '0')

      debug('check vote bids ')
      res = await base.dappApiGetAsync('/bids?vid=' + vote.id)
      assert(res.success)
      assert.isArray(res.bids)
      assert(res.bids.length === 2)

      await base.onNewBlockAsync()

      debug('calc settle prize ')

      res = await base.calculatePrizeAsync(articleId, authorAccount.secret)
      assert(res.success)
      assert(res.transactionId.length === 64)
      await base.onNewBlockAsync()

      debug('check calc article ')

      res = await base.dappApiGetAsync('/articles/' + articleId)
      assert(res.success)
      assert.isObject(res.article)
      article = res.article
      assert(article.awardState === 2)

      debug('check calc article reward ')

      res = await base.dappApiGetAsync('/accounts/' + authorAccount.address)
      assert(res.success)
      assert.isObject(res.account)
      balance = res.account.balances[0].balance
      assert(balance === '450000000')

      debug('check calc vote reward ')

      res = await base.dappApiGetAsync('/votes?aid=' + articleId)
      assert(res.success)
      assert(res.count === 3)
      assert.isArray(res.votes)
      let votes = res.votes.filter(v => {
        return v.settleAmount > 0
      })
      assert(votes.length === 1)
      vote = votes[0]
      let winnerId = vote.voterId
      assert(vote.amount === '500000000')
      assert(vote.settleAmount === 900000000)

      debug('account get prize  ')

      let winnerSecret = utils.getWinnerSecret([user1, user2, user3], winnerId)
      res = await base.getRewardAsync(vote.id, winnerSecret)
      assert(res.success)
      assert(res.transactionId.length === 64)

      await base.onNewBlockAsync()

      debug('check winner balance')

      res = await base.dappApiGetAsync('/accounts/' + winnerId)
      assert(res.success)
      assert.isObject(res.account)
      balance = res.account.balances[0].balance
      assert(balance === '900000000')
    })
  })
})

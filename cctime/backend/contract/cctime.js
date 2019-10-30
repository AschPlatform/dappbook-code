let bignum = require('bignumber')
let constants = require('../lib/constants')
let utils = require('../lib/utils')

const VOTE_UNIT = 100000000
const VOTE_CURRENCY = 'CCTime.XCT'
const COMMENT_REWARD_UNIT = 100000000
const COMMENT_REWARD_CURRENCY = 'CCTime.XCT'

const voteDefaultSettle = (article, amount, trs) => {
  let bAmount = bignum(amount)
  if (bAmount.lt(VOTE_UNIT)) return 'Amount too small'
  amount = bAmount.toString()
  const {
    senderId,
    id,
    timestamp
  } = trs

  let authorReward = bAmount
    .mul(0.5)
    .floor()
    .toString()
  let extraFee = bAmount.sub(authorReward).toString()

  app.balances.decrease(senderId, VOTE_CURRENCY, amount)
  app.balances.increase(article.authorId, VOTE_CURRENCY, authorReward)
  app.feePool.add(VOTE_CURRENCY, extraFee)
  app.sdb.create('Vote', {
    id: app.autoID.increment('vote_max_id'),
    tid: id,
    aid: article.id,
    voterId: senderId,
    timestamp,
    amount: amount,
    type: 0
  })
}

const voteStakeSettle = async (article, amount, trs) => {
  let bAmount = bignum(amount)
  if (bAmount.lt(VOTE_UNIT)) return 'Amount too small'
  amount = bAmount.toString()
  const {
    senderId,
    id,
    timestamp
  } = trs
  const aid = article.id
  const condition = {
    aid: aid,
    voterId: senderId,
    type: constants.AWARD_TYPE.STAKE
  }

  app.sdb.lock('cctime.vote@' + aid + senderId)
  let vote = await app.model.Vote.findOne({
    condition: condition
  })
  app.balances.decrease(senderId, VOTE_CURRENCY, amount)
  let voteId
  if (vote) {
    voteId = vote.id
    app.sdb.increment(
      'Vote', {
        amount: amount
      },
      condition
    )
  } else {
    voteId = app.autoID.increment('vote_max_id')
    app.sdb.create('Vote', {
      id: voteId,
      tid: id,
      aid,
      awardState: constants.AWARD_STATE.NOT_AWARD_YET,
      voterId: senderId,
      timestamp,
      amount: amount,
      type: constants.AWARD_TYPE.STAKE
    })
  }
  // add bid record
  app.sdb.create('Bid', {
    id: app.autoID.increment('bid_max_id'),
    tid: id,
    vid: voteId,
    aid,
    voterId: senderId,
    timestamp,
    amount: amount
  })
}

const decreaseCount = (model, data) => {
  if (model == 'Article') {
    let cid = data.cid
    let votes = data.votes
    // let channel = await app.model.Channel.findOne({ condition: { id: cid } })
    // return 'channel article' + channel.articles + 'reports ' + data.reports
    app.sdb.increment(
      'Channel', {
        articles: -1
      }, {
        id: cid
      }
    )
    app.sdb.increment(
      'Channel', {
        votes: 0 - votes
      }, {
        id: cid
      }
    )
  }
  if (model == 'Comment') {
    let aid = data.aid
    app.sdb.increment(
      'Article', {
        comments: -1
      }, {
        id: aid
      }
    )
  }
}

module.exports = {
  postArticle: async function (title, url, text, tags, cid, settleTimestamp) {
    if (!url && !text) {
      return 'Should provide url or text'
    }
    if (url && text) {
      return 'Both url and text are not supported'
    }
    if (!settleTimestamp) return 'Should provide settleTimestamp'

    settleTimestamp = utils.realTime2BlockTime(settleTimestamp)
    // TODO  get block timestamp
    // return `${settleTimestamp} ---${this.lastBlock.timestamp}--- ${constants.SETTLE_BLOCK_PERIOD}--- ${this.lastBlock.timestamp + constants.SETTLE_BLOCK_PERIOD}`
    if (settleTimestamp <= this.lastBlock.timestamp + constants.SETTLE_BLOCK_PERIOD) {
      return 'Settlement period between  24 hours and 1 month'
    }
    app.validate('string', tags, {
      length: {
        maximum: 256
      }
    })
    app.validate('string', title, {
      length: {
        minimum: 5,
        maximum: 256
      }
    })
    if (text)
      app.validate('string', text, {
        length: {
          minimum: 20,
          maximum: 4096
        }
      })
    if (url) {
      app.validate('string', url, {
        length: {
          minimum: 15,
          maximum: 256
        }
      })
      if (!utils.validateUrl(url)) {
        return 'Invalid url'
      }
    }
    if (text && text.length > 4096) {
      return 'Text too long'
    }
    if (!cid) {
      return 'Should provide channel id'
    } else {
      let exists = await app.model.Channel.exists({
        id: cid,
        reports: {
          $lt: 3
        }
      })
      if (!exists) {
        return 'Channel was baned or not exists'
      }
    }

    if (url) {
      app.sdb.lock('postArticle@' + url)
      let exists = await app.model.Article.exists({
        url: url
      })
      if (exists) {
        return 'Url already exists'
      }
    }

    let data = {
      title: title,
      url: url || '',
      text: text || '',
      // tags: tags,
      id: app.autoID.increment('article_max_id'),
      votes: 0,
      tid: this.trs.id,
      authorId: this.trs.senderId,
      timestamp: this.trs.timestamp,
      comments: 0,
      awardState: constants.AWARD_STATE.NOT_AWARD_YET,
      cid: cid,
      awardType: constants.AWARD_TYPE.STAKE,
      settleTimestamp
    }

    await app.sdb.create('Article', data)
    app.sdb.increment(
      'Channel', {
        articles: 1
      }, {
        id: cid
      }
    )
  },

  postComment: async function (aid, pid, content) {
    if (!aid) {
      return 'Invalid article id'
    }
    if (!content) {
      return 'Invalid content'
    }
    if (content.length > 4096) {
      return 'Content size too long'
    }
    if (pid) {
      let exists = await app.model.Comment.exists({
        id: pid
      })
      if (!exists) {
        return 'Reply comment not exists'
      }
    }
    app.sdb.create('Comment', {
      id: app.autoID.increment('comment_max_id'),
      aid: aid,
      pid: pid,
      content: content,
      rewards: 0,
      tid: this.trs.id,
      authorId: this.trs.senderId
    })
    app.sdb.increment(
      'Article', {
        comments: 1
      }, {
        id: aid
      }
    )
  },

  voteArticle: async function (aid, amount) {
    if (!aid || !amount) return 'Invalid params'
    app.validate('amount', amount)

    let balance = app.balances.get(this.trs.senderId, VOTE_CURRENCY)
    if (balance.lt(amount)) return 'Insufficient balance'

    let article = await app.model.Article.findOne({
      condition: {
        id: aid,
        reports: {
          $lt: 3
        }
      }
    })
    if (!article) return 'Article not found'

    let {
      awardType = constants.AWARD_TYPE.DEFAULT, cid
    } = article
    let res
    switch (awardType) {
      case constants.AWARD_TYPE.DEFAULT:
        res = voteDefaultSettle(article, amount, this.trs)
        break
      case constants.AWARD_TYPE.STAKE:
        res = await voteStakeSettle(article, amount, this.trs)
        break
    }
    if (!!res) return res

    let bAmount = bignum(amount)
    let increment = Number(
      bAmount
      .div(VOTE_UNIT)
      .floor()
      .toString()
    )

    app.sdb.increment(
      'Article', {
        votes: increment
      }, {
        id: aid
      }
    )
    app.sdb.increment(
      'Channel', {
        votes: increment
      }, {
        id: cid
      }
    )
  },

  likeComment: async function (cid, amount) {
    if (!cid || !amount) return 'Invalid params'
    app.validate('amount', amount)

    let balance = app.balances.get(this.trs.senderId, COMMENT_REWARD_CURRENCY)
    if (balance.lt(amount)) return 'Insufficient balance'

    let bAmount = bignum(amount)
    if (bAmount.lt(COMMENT_REWARD_UNIT)) return 'Amount too small'

    let comment = await app.model.Comment.findOne({
      condition: {
        id: cid
      }
    })
    if (!comment) return 'Comment not found'

    //app.balances.transfer(this.trs.senderId, comment.authorId, COMMENT_REWARD_CURRENCY, amount)
    app.balances.transfer(COMMENT_REWARD_CURRENCY, amount, this.trs.senderId, comment.authorId)

    let increment = Number(
      bAmount
      .div(COMMENT_REWARD_UNIT)
      .floor()
      .toString()
    )
    app.sdb.increment(
      'Comment', {
        rewards: increment
      }, {
        id: cid
      }
    )
  },

  report: async function (topic, value) {
    if (!topic || !value) return 'Invalid params'

    topic = Number(topic)
    if ([1, 2, 3].indexOf(topic) === -1) return 'Invalid topic'

    if (app.meta.delegates.indexOf(this.trs.senderPublicKey) === -1) return 'Permission denied'

    let reporter = this.trs.senderId
    app.sdb.lock('cctime.report@' + value)
    let exists = await app.model.Report.exists({
      reporter: reporter,
      topic: topic,
      value: value
    })
    if (exists) return 'Already reported'

    switch (topic) {
      case 1:
        model = 'Article'
        break
      case 2:
        model = 'Comment'
        break
      case 3:
        model = 'Channel'
        break
    }
    let data = await app.model[model].findOne({
      condition: {
        id: value
      }
    })
    if (data.reports == 2) {
      decreaseCount(model, data)
    }
    app.sdb.increment(
      model, {
        reports: 1
      }, {
        id: value
      }
    )
    app.sdb.create('Report', {
      reporter: reporter,
      topic: topic,
      value: value
    })
  },
  createChannel: async function (name, url, desc) {
    // if (app.meta.delegates.indexOf(this.trs.senderPublicKey) === -1) return 'Permission denied'
    app.validate('string', name, {
      length: {
        minimum: 3,
        maximum: 50
      }
    })
    app.validate('string', desc, {
      length: {
        minimum: 50,
        maximum: 1024
      }
    })
    app.validate('string', url, {
      length: {
        minimum: 10,
        maximum: 256
      }
    })

    if (!utils.validateImgUrl(url)) {
      return 'Invalid image url'
    }

    let exists = await app.model.Channel.exists({
      name: name
    })
    if (exists) {
      return 'Channel name already taken'
    }
    app.sdb.lock('channel.create@' + name)

    const {
      id,
      senderId,
      timestamp
    } = this.trs

    app.sdb.create('Channel', {
      id: app.autoID.increment('channel_max_id'),
      tid: id,
      creatorId: senderId,
      name,
      url,
      desc,
      timestamp
    })
  },
  updateChannel: async function (cid, field, value) {
    if (field === 'desc') {
      app.validate('string', value, {
        length: {
          minimum: 50,
          maximum: 1024
        }
      })
    } else if (field === 'url') {
      app.validate('string', value, {
        length: {
          minimum: 10,
          maximum: 256
        }
      })
      if (!utils.validateImgUrl(value)) {
        return 'Invalid image url'
      }
    } else {
      return `Channel ${field} not support update`
    }

    let channel = await app.model.Channel.findOne({
      condition: {
        id: cid,
        reports: {
          $lt: 3
        }
      }
    })
    if (!channel) return 'Channel was baned or not exists'
    if (channel.creatorId !== this.trs.senderId) return 'Permission denied'
    let updateObj = {
      [field]: value
    }
    app.sdb.update('Channel', updateObj, {
      id: cid
    })
  },
  getReward: async function (vid) {
    if (!vid) {
      return 'Invalid param'
    }
    let vote = await app.model.Vote.findOne({
      condition: {
        id: vid,
        awardState: constants.AWARD_STATE.NOT_AWARD_YET,
        type: constants.AWARD_TYPE.STAKE
      }
    })
    if (!vote) return 'Vote not exists'
    if (vote.voterId !== this.trs.senderId) return 'Permission denied'
    if (vote.settleAmount == 0) return 'No reward'
    const aid = vote.aid

    let article = await app.model.Article.findOne({
      condition: {
        id: aid,
        reports: {
          $lt: 3
        },
        awardState: constants.AWARD_STATE.AWARDED,
        settleTimestamp: {
          $lt: this.block.timestamp
        }
      }
    })
    if (!article) return 'Article not exists or settle time not arrived'

    const {
      settleAmount
    } = vote
    app.balances.increase(this.trs.senderId, VOTE_CURRENCY, bignum(settleAmount).toString())
    app.sdb.update(
      'Vote', {
        awardState: constants.AWARD_STATE.AWARDED
      }, {
        id: vid
      }
    )
    app.sdb.update(
      'Article', {
        awardState: constants.AWARD_STATE.AWARDED
      }, {
        id: aid
      }
    )
  },
  calculatePrize: async function (aid) {
    if (!aid) return 'Invalid article id'
    // TODO 
    let article = await app.model.Article.findOne({
      condition: {
        id: aid,
        awardState: constants.AWARD_STATE.NOT_AWARD_YET,
        awardType: constants.AWARD_TYPE.STAKE,
        settleTimestamp: {
          $lt: this.lastBlock.timestamp
        }
      }
    })
    if (!article) return 'Article not exists or settle time not arrived'
    const isDelegate = app.meta.delegates.indexOf(this.trs.senderPublicKey) === -1
    const isAuthor = this.trs.senderId !== article.authorId

    if (isDelegate && isAuthor) return 'Permission denied'

    let votes = await app.model.Vote.findAll({
      condition: {
        aid: aid
      },
      fields: ['amount', 'id']
    })
    if (votes.length == 0) {
      app.sdb.update(
        'Article', {
          awardState: constants.AWARD_STATE.AWARDED
        }, {
          id: aid
        }
      )
      return 'Vote not exists '
    } else {
      let voteIdArr = []
      let probArr = []
      let votesSum = bignum(0)
      votes.forEach(v => {
        votesSum = votesSum.add(v.amount)
      })

      let authorReward = votesSum
        .mul(0.3)
        .floor()
        .toString()

      let extraFee = votesSum
        .mul(0.1)
        .floor()
        .toString()

      let stakePrize = votesSum
        .sub(authorReward)
        .sub(extraFee)
        .toString()

      votes.forEach(vote => {
        voteIdArr.push(vote.id)
        probArr.push(
          Number(
            bignum(vote.amount)
            .div(votesSum)
            .toString()
          )
        )
      })

      let sampleFun = utils.aliasSampler(probArr)
      let index = sampleFun()

      let winnerId = voteIdArr[index]
      app.sdb.update(
        'Vote', {
          settleAmount: stakePrize
        }, {
          id: winnerId
        }
      )
      app.sdb.update(
        'Vote', {
          awardState: constants.AWARD_STATE.NOT_AWARD_YET
        }, {
          id: winnerId
        }
      )
      app.balances.increase(article.authorId, VOTE_CURRENCY, authorReward)
      app.feePool.add(VOTE_CURRENCY, extraFee)
      app.sdb.update(
        'Article', {
          awardState: constants.AWARD_STATE.AWARDED
        }, {
          id: aid
        }
      )
      app.sdb.update(
        'Article', {
          awardType: constants.AWARD_TYPE.DEFAULT
        }, {
          id: aid
        }
      )
    }
  }
}
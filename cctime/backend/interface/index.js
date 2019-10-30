let bignum = require('bignumber')

async function getArticlesByTime(options) {
  let condition = {
    reports: { $lt: 3 }
  }
  if (options.awardType) condition.awardType = options.awardType
  if (options.awardState) condition.awardState = options.awardState
  if (options.authorId) condition.authorId = options.authorId
  if (options.cid) condition.cid = options.cid
  if (options.tid) condition.tid = options.tid
  if (options.height) condition.settleHeight = { $lt: options.height }
  // return JSON.stringify(condition)
  let count = await app.model.Article.count(condition)
  let articles = await app.model.Article.findAll({
    condition: condition,
    limit: options.limit || 50,
    offset: options.offset || 0,
    sort: { timestamp: -1 }
  })
  return { count: count, articles: articles }
}

function calcScore(article) {
  let elapsedHours = (Date.now() - app.getRealTime(article.timestamp)) / 3600000
  return Math.sqrt(article.votes + 1) / Math.pow(elapsedHours + 2, 1.8)
}

async function getArticlesByScore(options) {
  let condition = {
    reports: { $lt: 3 }
  }
  if (options.awardType) condition.awardType = options.awardType
  if (options.awardState) condition.awardState = options.awardState
  if (options.authorId) condition.authorId = options.authorId
  if (options.cid) condition.cid = options.cid
  if (options.tid) condition.tid = options.tid
  if (options.height) condition.settleHeight = { $lt: options.height }
  // return JSON.stringify(condition)
  let latestArticles = await app.model.Article.findAll({
    condition: condition,
    limit: 300,
    sort: { timestamp: -1 }
  })
  let popularArticles = await app.model.Article.findAll({
    limit: 300,
    sort: { votes: -1 }
  })
  let allArticles = []
  let uniqueIds = new Set()
  latestArticles.forEach(a => {
    if (!uniqueIds.has(a.id)) {
      uniqueIds.add(a.id)
      allArticles.push(a)
    }
  })
  popularArticles.forEach(a => {
    if (!uniqueIds.has(a.id)) {
      uniqueIds.add(a.id)
      if (a.reports < 3) allArticles.push(a)
    }
  })
  allArticles.forEach(a => {
    a.score = calcScore(a)
  })
  allArticles.sort((l, r) => {
    return r.score - l.score
  })
  return { articles: allArticles.slice(0, options.limit || 50) }
}

async function channelExists(cid) {
  let channel = await app.model.Channel.findOne({
    condition: { id: cid, reports: { $lt: 3 } }
  })
  if (!channel) throw new Error('Channel not fuound')
  return channel
}

async function setChannelName(arr = [], field = 'cid') {
  let cids = arr.map(a => a[field])
  let channels = await app.model.Channel.findAll({
    condition: {
      id: { $in: cids }
    },
    fields: ['name', 'id', 'reports']
  })
  let channelMap = new Map()
  for (let channel of channels) {
    channelMap.set(channel.id, channel)
  }
  for (let item of arr) {
    let channel = channelMap.get(item[field])
    if (channel) {
      item.channelName = channel.name
      item.channelBanned = channel.reports >= 3
    }
  }
}

async function setUsername(arr = [], field = 'authorId') {
  let addresses = arr.map(a => a[field])
  let accounts = await app.model.Account.findAll({
    condition: {
      address: { $in: addresses }
    },
    fields: ['str1', 'address']
  })
  let accountMap = new Map()
  for (let account of accounts) {
    accountMap.set(account.address, account)
  }
  for (let item of arr) {
    let account = accountMap.get(item[field])
    if (account) {
      item.nickname = account.str1
    }
  }
}

async function setArticleTitle(arr = [], field = 'aid') {
  let ids = arr.map(a => a[field])
  let articles = await app.model.Article.findAll({
    condition: {
      id: { $in: ids }
    },
    fields: ['id', 'title', 'awardState']
  })
  let articleMap = new Map()
  for (let article of articles) {
    articleMap.set(article.id, article)
  }
  for (let item of arr) {
    let article = articleMap.get(item[field])
    if (article) {
      item.articleName = article.title
      item.articleAwardState = article.awardState
    }
  }
}

// async function setCommentAuthorId(arr = [], field = 'pid') {
//   let ids = arr.map(a => a[field])
//   let comments = await app.model.Comment.findAll({
//     condition: {
//       id: { $in: ids }
//     },
//     fields: ['id', 'authorId']
//   })
//   let commentMap = new Map()
//   for (let comment of comments) {
//     commentMap.set(comment.id, comment)
//   }
//   for (let item of arr) {
//     let comment = commentMap.get(item[field])
//     if (comment) {
//       item.pAuthorId = comment.authorId
//     }
//   }
// }

app.route.get('/channels', async req => {
  let query = req.query
  let sort = {}
  if (req.query && query.sortBy) {
    let sortInfo = query.sortBy.split(':')
    if (
      sortInfo.length !== 2 ||
      ['timestamp', 'articles', 'votes'].indexOf(sortInfo[0]) === -1 ||
      ['asc', 'desc'].indexOf(sortInfo[1]) === -1
    ) {
      throw new Error('Invalid sort params')
    }
    sort[sortInfo[0]] = sortInfo[1] === 'asc' ? 1 : -1
  }
  let queryArr = ['channels', query.sortBy, query.limit, query.offset]
  if (query.creatorId) queryArr.push(query.creatorId)
  if (query.tid) queryArr.push(query.tid)
  let key = queryArr.join('_')
  if (app.custom.cache.has(key)) {
    return app.custom.cache.get(key)
  }
  let condition = [{ reports: { $lt: 3 } }]
  if (query.creatorId) condition.push({ creatorId: query.creatorId })
  if (query.tid) condition.push({ tid: query.tid })
  let count = await app.model.Channel.count(condition)
  let channels = await app.model.Channel.findAll({
    condition: condition,
    limit: query.limit || 50,
    offset: query.offset || 0,
    sort: sort
  })

  let result = { count, channels }
  app.custom.cache.set(key, result)
  return result
})

app.route.get('/channels/:id', async req => {
  let id = req.params.id
  let key = 'channel_' + id
  if (app.custom.cache.has(key)) {
    return app.custom.cache.get(key)
  }
  let channel = await app.model.Channel.findOne({
    condition: { id: id }
  })
  if (!channel) throw new Error('Channel not found')
  if (channel.reports >= 3) throw new Error('Channel was banned')
  let account = await app.model.Account.findOne({
    condition: { address: channel.creatorId }
  })
  if (account) {
    channel.nickname = account.str1
  }
  let result = { channel: channel }
  app.custom.cache.set(key, result)
  return result
})

app.route.get('/articles', async req => {
  let query = req.query
  let cid = query.cid
  // if (!cid) throw new Error('Invalid channel id')
  if (!query.sortBy) {
    query.sortBy = 'score'
  }
  let queryArr = ['articles', query.sortBy, query.limit, query.offset]
  if (query.awardType) queryArr.push(query.awardType)
  if (query.awardState) queryArr.push(query.awardState)
  if (query.authorId) queryArr.push(query.authorId)
  if (query.cid) queryArr.push(query.cid)
  if (query.tid) queryArr.push(query.tid)
  if (query.height) queryArr.push(query.height)

  let key = queryArr.join('_')
  if (app.custom.cache.has(key)) {
    return app.custom.cache.get(key)
  }

  if (query.cid) {
    let channel = await channelExists(cid)
  }

  let res = null
  if (query.sortBy === 'timestamp') {
    res = await getArticlesByTime(query)
  } else if (query.sortBy === 'score') {
    res = await getArticlesByScore(query)
  } else {
    throw new Error('Sort field not supported')
  }
  await setUsername(res.articles)
  await setChannelName(res.articles)
  app.custom.cache.set(key, res)
  return res
})

app.route.get('/articles/:id', async req => {
  let id = req.params.id
  let key = 'article_' + id
  if (app.custom.cache.has(key)) {
    return app.custom.cache.get(key)
  }
  let article = await app.model.Article.findOne({
    condition: { id: id }
  })
  if (!article) throw new Error('Article not found')
  if (article.reports >= 3) throw new Error('Article not allowed')
  let channel = await channelExists(article.cid)
  let account = await app.model.Account.findOne({
    condition: { address: article.authorId }
  })
  if (account) {
    article.nickname = account.str1
  }
  article.channelName = channel.name
  let result = { article: article }
  app.custom.cache.set(key, result)
  return result
})

// app.route.get('/channels/:cid/articles/:id', async req => {
//   let id = req.params.id
//   let cid = req.params.cid

//   let key = 'article_' + id
//   if (app.custom.cache.has(key)) {
//     return app.custom.cache.get(key)
//   }
//   let channel = await channelExists(cid)
//   let article = await app.model.Article.findOne({
//     condition: { id: id }
//   })
//   if (!article) throw new Error('Article not found')
//   if (article.reports >= 3) throw new Error('Article not allowed')
//   let account = await app.model.Account.findOne({
//     condition: { address: article.authorId }
//   })
//   if (account) {
//     article.nickname = account.str1
//   }
//   article.channelName = channel.name

//   let result = { article: article }
//   app.custom.cache.set(key, result)
//   return result
// })

app.route.get('/articles/:id/comments', async req => {
  let id = req.params.id
  let sort = {}
  if (req.query && req.query.sortBy) {
    let sortInfo = req.query.sortBy.split(':')
    if (
      sortInfo.length !== 2 ||
      ['timestamp'].indexOf(sortInfo[0]) === -1 ||
      ['asc', 'desc'].indexOf(sortInfo[1]) === -1
    ) {
      throw new Error('Invalid sort params')
    }

    sort[sortInfo[0]] = sortInfo[1] === 'asc' ? 1 : -1
  }
  let key = ['comments', id, req.query.sortBy, req.query.limit, req.query.offset].join('_')
  if (app.custom.cache.has(key)) {
    return app.custom.cache.get(key)
  }
  let count = await app.model.Comment.count({ aid: id, reports: { $lt: 3 } })
  let comments = await app.model.Comment.findAll({
    condition: [{ aid: id }, { reports: { $lt: 3 } }],
    limit: req.query.limit || 50,
    offset: req.query.offset || 0,
    sort: sort
  })
  let replyIds = []
  for (let c of comments) {
    if (c.pid) replyIds.push(c.pid)
  }
  let replyComments = await app.model.Comment.findAll({
    condition: {
      id: { $in: replyIds }
    },
    fields: ['authorId', 'id']
  })
  let replyAuthorMap = new Map()
  for (let rc of replyComments) {
    replyAuthorMap.set(rc.id, rc.authorId)
  }
  let addresses = comments.map(c => c.authorId).concat(replyComments.map(rc => rc.authorId))
  let accounts = await app.model.Account.findAll({
    condition: {
      address: { $in: addresses }
    },
    fields: ['str1', 'address']
  })
  let accountMap = new Map()
  for (let account of accounts) {
    accountMap.set(account.address, account)
  }
  for (let c of comments) {
    let account = accountMap.get(c.authorId)
    if (account) {
      c.nickname = account.str1
    }
    let replyAuthorId = replyAuthorMap.get(c.pid)
    if (replyAuthorId) {
      c.replyAuthorId = replyAuthorId
      let replyAccount = accountMap.get(replyAuthorId)
      if (replyAccount) c.replyAuthorName = replyAccount.str1
    }
  }
  let result = { comments: comments, count: count }
  app.custom.cache.set(key, result)
  return result
})

// app.route.get('/articles/:id/votes/', async req => {
//   let id = req.params.id
//   let query = req.query
//   let sort = {}
//   if (req.query && query.sortBy) {
//     let sortInfo = query.sortBy.split(':')
//     if (
//       sortInfo.length !== 2 ||
//       ['timestamp', 'amount', 'settleAmount'].indexOf(sortInfo[0]) === -1 ||
//       ['asc', 'desc'].indexOf(sortInfo[1]) === -1
//     ) {
//       throw new Error('Invalid sort params')
//     }
//
//     sort[sortInfo[0]] = sortInfo[1] === 'asc' ? 1 : -1
//   }
//   let queryArr = ['votes', id, query.sortBy, query.limit, query.offset]
//   if (query.type) queryArr.push(query.type)
//   if (query.awardState) queryArr.push(query.awardState)
//   let key = queryArr.join('_')
//   if (app.custom.cache.has(key)) {
//     return app.custom.cache.get(key)
//   }
//   let condition = [{ aid: id }, { reports: { $lt: 3 } }]
//   let count = await app.model.Vote.count({ aid: id })

//   if (query.type) condition.push({ type: query.type })
//   if (query.awardState) condition.push({ awardState: query.awardState })

//   let votes = await app.model.Vote.findAll({
//     condition: condition,
//     limit: query.limit || 50,
//     offset: query.offset || 0,
//     sort: sort
//   })
//   await setUsername(votes, 'voterId')
//   let result = { votes: votes, count: count }
//   app.custom.cache.set(key, result)
//   return result
// })

app.route.get('/votes', async req => {
  let query = req.query
  let sort = {
    timestamp: 1
  }
  if (req.query && query.sortBy) {
    let sortInfo = query.sortBy.split(':')
    if (
      sortInfo.length !== 2 ||
      ['timestamp', 'amount', 'settleAmount'].indexOf(sortInfo[0]) === -1 ||
      ['asc', 'desc'].indexOf(sortInfo[1]) === -1
    ) {
      throw new Error('Invalid sort params')
    }
    sort = {}
    sort[sortInfo[0]] = sortInfo[1] === 'asc' ? 1 : -1
  }

  let queryArr = ['votes', query.sortBy, query.limit, query.offset]
  if (query.type) queryArr.push(query.type)
  if (query.awardState) queryArr.push(query.awardState)
  if (query.voterId) queryArr.push(query.voterId)
  if (query.aid) queryArr.push(query.aid)
  if (query.settleAmount) queryArr.push(query.settleAmount)
  let key = queryArr.join('_')
  if (app.custom.cache.has(key)) {
    return app.custom.cache.get(key)
  }

  let condition = []
  if (query.type) condition.push({ type: query.type })
  if (query.awardState) condition.push({ awardState: query.awardState })
  if (query.voterId) condition.push({ voterId: query.voterId })
  if (query.aid) condition.push({ aid: query.aid })
  if (query.settleAmount) condition.push({ settleAmount: { $gt: 0 } })

  if (condition.length == 0) condition = {}
  let count = await app.model.Vote.count(condition)

  let votes = await app.model.Vote.findAll({
    condition: condition,
    limit: query.limit || 50,
    offset: query.offset || 0,
    sort: sort
  })
  await setUsername(votes, 'voterId')
  await setArticleTitle(votes)
  let result = { votes: votes, count: count }
  app.custom.cache.set(key, result)
  return result
})

app.route.get('/votes/:id', async req => {
  let id = req.params.id
  let key = 'vote_' + id
  if (app.custom.cache.has(key)) {
    return app.custom.cache.get(key)
  }
  let vote = await app.model.Vote.findOne({
    condition: { id: id }
  })
  if (!vote) throw new Error('Vote not found')

  await setArticleTitle([vote])
  await setUsername([vote], 'voterId')
  let result = { vote: vote }
  app.custom.cache.set(key, result)
  return result
})

app.route.get('/bids', async req => {
  let query = req.query
  let sort = {
    timestamp: 1
  }
  if (req.query && query.sortBy) {
    let sortInfo = query.sortBy.split(':')
    if (
      sortInfo.length !== 2 ||
      ['timestamp', 'amount'].indexOf(sortInfo[0]) === -1 ||
      ['asc', 'desc'].indexOf(sortInfo[1]) === -1
    ) {
      throw new Error('Invalid sort params')
    }
    sort = {}
    sort[sortInfo[0]] = sortInfo[1] === 'asc' ? 1 : -1
  }

  let queryArr = ['bids', query.sortBy, query.limit, query.offset]
  if (query.tid) queryArr.push(query.tid)
  if (query.vid) queryArr.push(query.vid)
  if (query.aid) queryArr.push(query.aid)
  if (query.voterId) queryArr.push(query.voterId)
  let key = queryArr.join('_')
  if (app.custom.cache.has(key)) {
    return app.custom.cache.get(key)
  }

  let condition = []
  if (query.tid) condition.push({ tid: query.tid })
  if (query.vid) condition.push({ vid: query.vid })
  if (query.aid) condition.push({ aid: query.aid })
  if (query.voterId) condition.push({ voterId: query.voterId })

  if (condition.length == 0) condition = {}
  let count = await app.model.Bid.count(condition)

  let bids = await app.model.Bid.findAll({
    condition: condition,
    limit: query.limit || 50,
    offset: query.offset || 0,
    sort: sort
  })
  await setUsername(bids, 'voterId')
  await setArticleTitle(bids)
  let result = { bids: bids, count: count }
  app.custom.cache.set(key, result)
  return result
})

app.route.get('/access', async req => {
  let { id, type } = req.query
  if (type == 2) {
    let article = await app.model.Article.findOne({
      condition: { id: id }
    })
    if (!article) throw new Error('Article not found')
    if (article.reports >= 3) {
      return { errorType: 2, access: false }
    } else {
      let channel = await await app.model.Channel.findOne({
        condition: { id: article.cid }
      })
      if (channel.reports >= 3) return { errorType: 1, access: false }
    }
    return { access: true }
  } else if (type == 3) {
    let vote = await app.model.Vote.findOne({
      condition: { id: id }
    })
    if (!vote) throw new Error('Vote not found')

    let article = await app.model.Article.findOne({
      condition: { id: vote.aid, reports: { $lt: 3 } }
    })
    if (!article) throw new Error('Article not found')
    if (article.reports >= 3) {
      return { errorType: 2, access: false }
    } else {
      let channel = await await app.model.Channel.findOne({
        condition: { id: article.cid }
      })
      if (channel.reports >= 3) return { errorType: 1, access: false }
    }
    return { access: true }
  }
})

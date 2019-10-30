const IntervalCache = require('./lib/interval-cache')

module.exports = async function() {
  app.logger.info('enter dapp init')

  app.registerContract(1000, 'cctime.postArticle')
  app.registerContract(1001, 'cctime.postComment')
  app.registerContract(1002, 'cctime.voteArticle')
  app.registerContract(1003, 'cctime.likeComment')
  app.registerContract(1004, 'cctime.report')
  app.registerContract(1005, 'cctime.createChannel')
  app.registerContract(1006, 'cctime.updateChannel')
  app.registerContract(1007, 'cctime.getReward')
  app.registerContract(1008, 'cctime.calculatePrize')

  app.setDefaultFee('10000000', 'CCTime.XCT')
  app.registerFee(1007, '0')
  app.registerFee(1005, '1000000000000')
  app.registerFee(1006, '50000000000')

  app.custom.cache = new IntervalCache(10 * 1000)

  // await app.sdb.load(
  //   'Vote',
  //   ['awardState', 'amount', 'voterId', 'timestamp', 'aid', 'id', 'settleAmount', 'type'],
  //   [['id', 'voterId', 'aid']]
  // )

  // await app.sdb.load('Channel', ['name', 'reports', 'id'], ['id'])
}

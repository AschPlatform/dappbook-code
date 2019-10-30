const urlReg = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/
const imgReg = /^https?:\/\/([\w]+\.)+[\w]{2,3}(\/[\w]+)+\.(jpg|jpeg|png)+$/
const asch = require('asch-js')

const aliasSampler = inputProbabilities => {
  let probabilities, aliases

  // First copy and type-check the input probabilities,
  // also taking their sum.
  probabilities = inputProbabilities.map(function (p, i) {
    if (Number.isNaN(Number(p))) {
      throw new TypeError('Non-numerical value in distribution at index ' + i)
    }
    return Number(p)
  })
  const probsum = inputProbabilities.reduce(function (sum, p) {
    return sum + p
  }, 0)

  // Scale all of the probabilities such that their average is 1
  // (i.e. if all of the input probabilities are the same, then they
  // are all set to 1 by this procedure)
  const probMultiplier = inputProbabilities.length / probsum
  probabilities = probabilities.map(function (p, i) {
    return p * probMultiplier
  })

  // Sort the probabilities into overFull and underFull queues
  let overFull = [],
    underFull = []
  probabilities.forEach(function (p, i) {
    if (p > 1) overFull.push(i)
    else if (p < 1) underFull.push(i)
    else if (p !== 1) {
      throw new Error(
        'User program has disrupted JavaScript defaults ' +
        'and prevented this function from executing correctly.'
      )
    }
  })

  // Construct the alias table.
  // In each iteration, the remaining space in an underfull cell
  // will be filled by surplus space from an overfull cell, such
  // that the underfull cell becomes exactly full.
  // The overfull cell will then be reclassified as to how much
  // probability it has left.
  aliases = []
  while (overFull.length > 0 || underFull.length > 0) {
    if (overFull.length > 0 && underFull.length > 0) {
      aliases[underFull[0]] = overFull[0]
      probabilities[overFull[0]] += probabilities[underFull[0]] - 1
      underFull.shift()
      if (probabilities[overFull[0]] > 1) overFull.push(overFull.shift())
      else if (probabilities[overFull[0]] < 1) underFull.push(overFull.shift())
      else overFull.shift()
    } else {
      // Because the average of all the probabilities is 1, mathematically speaking,
      // this block should never be reached. However, because of rounding errors
      // posed by floating-point numbers, a tiny bit of surplus can be left over.
      // The error is typically neglegible enough to ignore.
      var notEmptyArray = overFull.length > 0 ? overFull : underFull
      notEmptyArray.forEach(function (index) {
        probabilities[index] = 1
      })
      notEmptyArray.length = 0
    }
  }

  // Finally, create and return the sampler. With the creation of the alias table,
  // each box now represents a biased coin whose possibilities are either it or
  // its corresponding alias (the overfull cell it took from). The sampler picks
  // one of these coins with equal probability for each, then flips it and returns
  // the result.
  return function sample() {
    var index = Math.floor(Math.random() * probabilities.length)
    return Math.random() < probabilities[index] ? index : aliases[index]
  }
}

const realTime2BlockTime = timestamp => {
  return asch.utils.slots.getTime(timestamp)
}

module.exports = {
  validateUrl: url => urlReg.test(url),
  validateImgUrl: url => imgReg.test(url),
  aliasSampler,
  realTime2BlockTime
}
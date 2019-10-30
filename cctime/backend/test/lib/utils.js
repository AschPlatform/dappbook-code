module.exports = {
  getWinnerSecret: (arr, address) => {
    let secret = ''
    arr.forEach(element => {
      if (element.address === address) {
        secret = element.secret
      }
    })
    return secret
  }
}

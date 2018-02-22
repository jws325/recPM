const RECPM = artifacts.require("./RECPM.sol");

module.exports = function (deployer) {
  let totalSupply = 10000 * 10 ** 6; // 10,000 Tokens with 6 decimals

  deployer.deploy(RECPM, totalSupply);
};
const RPM = artifacts.require("./RPM.sol");

module.exports = function (deployer) {
  let totalSupply = 10000 * 10 ** 6; // 10,000 Tokens with 6 decimals

  deployer.deploy(RPM, totalSupply);
};
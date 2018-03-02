const RECPM = artifacts.require("./RECPM.sol");
const promisify = require("promisify-es6");

async function run() {
  let amountToBurn = parseFloat(process.argv[4]) * 10 ** 6;
  if (!amountToBurn) {
    console.log("Amount to burn needed as argument");
    return;
  }

  const web3 = RECPM.web3;
  const accounts = await promisify(web3.eth.getAccounts)();

  const tokenInstance = await RECPM.deployed();

  let ownerBalance = await tokenInstance.balanceOf(accounts[0]);
  if (ownerBalance.toNumber() < amountToBurn) {
    console.log("Can't burn more than owner balance:", ownerBalance.toNumber() / 10 ** 6);
    return;
  }

  let totalSupply = await tokenInstance.totalSupply();
  if (totalSupply.toNumber() < amountToBurn) {
    console.log("Can't burn more than total supply:", totalSupply.toNumber() / 10 ** 6);
    return;
  }

  console.log("Burning RECPM, ownerBalance:", ownerBalance.toNumber() / 10 ** 6, "totalSupply", totalSupply.toNumber() / 10 ** 6);

  await tokenInstance.burn(amountToBurn, { from: accounts[0], gas: 200000 });

  totalSupply = await tokenInstance.totalSupply();
  ownerBalance = await tokenInstance.balanceOf(accounts[0]);

  console.log("Tokens Burning done, ownerBalance:", ownerBalance.toNumber() / 10 ** 6, "totalSupply", totalSupply.toNumber() / 10 ** 6);
}

module.exports = function (callback) {
  try {
    run().then(() => {
      callback();
    })
  }
  catch (err) {
    callback(err);
  }
};

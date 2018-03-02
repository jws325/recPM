const RECPM = artifacts.require("./RECPM.sol");
const proxiedWeb3Handler = require('../test/support/proxiedWeb3Handler.js');

async function run() {
  let userAddress = process.argv[4];
  if (!userAddress) {
    throw Error("User Address needed as argument");
  }

  let amountToTransfer = parseFloat(process.argv[5]) * 10 ** 6;
  if (!amountToTransfer) {
    console.log("Amount to transfer needed as argument");
    return;
  }

  const web3 = RECPM.web3;
  const proxiedWeb3 = new Proxy(web3, proxiedWeb3Handler);
  const accounts = await proxiedWeb3.eth.getAccounts();

  const tokenInstance = await RECPM.deployed();

  let ownerBalance = await tokenInstance.balanceOf(accounts[0]);
  if (ownerBalance.toNumber() < amountToTransfer) {
    console.log("Can't transfer more than owner balance:", ownerBalance.toNumber() / 10 ** 6);
    return;
  }

  console.log("Transferring ...");
  await tokenInstance.transfer(userAddress, amountToTransfer, { from: accounts[0] });

  ownerBalance = await tokenInstance.balanceOf(accounts[0]);
  let userBalance = await tokenInstance.balanceOf(userAddress);

  console.log(`Transfer OK - New Balances - owner: ${ownerBalance.toNumber() / 10 ** 6} destination user: ${userBalance.toNumber() / 10 ** 6}`);
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

const RECPM = artifacts.require("./RECPM.sol");
const promisify = require("promisify-es6");

async function run() {
  let amountToDistribute = parseFloat(process.argv[4]) * 10 ** 6;
  if (!amountToDistribute) {
    console.log("Amount to distribute needed as argument");
    return;
  }

  const web3 = RECPM.web3;
  const accounts = await promisify(web3.eth.getAccounts)();

  const tokenInstance = await RECPM.deployed();

  let canDistributeTokens = await tokenInstance.canDistributeTokens();
  if (!canDistributeTokens) {
    let nextTokensDistributionTimeStamp = await tokenInstance.nextTokensDistributionTimeStamp();
    console.log("Can't distribute tokens until:", new Date(nextTokensDistributionTimeStamp.toNumber() * 1000));
    return;
  }

  let totalUpvotesReceivedThisWeek = await tokenInstance.totalUpvotesReceivedThisWeek();
  if (totalUpvotesReceivedThisWeek.toNumber() === 0) {
    console.log("Can't distribute tokens: no upvotes received this week");
    return;
  }

  let lastTokensDistributionTimestamp = await tokenInstance.lastTokensDistributionTimestamp();
  const oldTokendDistributionTimeStamp = lastTokensDistributionTimestamp.toNumber();

  // Distribute until timestamp changes
  while (oldTokendDistributionTimeStamp === lastTokensDistributionTimestamp.toNumber()) {
    let tokensDistributionPage = await tokenInstance.tokensDistributionPage();
    console.log("Distributing Tokens, page:", tokensDistributionPage);

    await tokenInstance.distributeTokens(amountToDistribute, { from: accounts[0], gas: 500000 });

    // update last token distribution timestamp
    lastTokensDistributionTimestamp = await tokenInstance.lastTokensDistributionTimestamp();
  }

  let nextTokensDistributionTimeStamp = await tokenInstance.nextTokensDistributionTimeStamp();
  console.log("Tokens Distribution done, next tokens distribution possible on:", new Date(nextTokensDistributionTimeStamp.toNumber() * 1000));
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

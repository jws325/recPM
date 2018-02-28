const RECPM = artifacts.require("./RECPM.sol");
const promisify = require("promisify-es6");

async function run() {
  let amountToDistribute = parseInt(process.argv[4], 10);
  if (!amountToDistribute) {
    console.log("Amount to distribute needed as argument");
    return;
  }

  const web3 = RECPM.web3;
  const accounts = await promisify(web3.eth.getAccounts)();

  const tokenInstance = await RECPM.deployed();

  let canDistributeVotes = await tokenInstance.canDistributeVotes();
  if (!canDistributeVotes) {
    let nextVotesDistributionTimeStamp = await tokenInstance.nextVotesDistributionTimeStamp();
    console.log("Can't distribute votes until:", new Date(nextVotesDistributionTimeStamp.toNumber() * 1000));
    return;
  }

  let totalStaked = await tokenInstance.totalStaked();
  if (totalStaked.toNumber() === 0) {
    console.log("Can't distribute votes: no tokens are staked");
    return;
  }

  let lastVotesDistributionTimestamp = await tokenInstance.lastVotesDistributionTimestamp();
  const oldVotedDistributionTimeStamp = lastVotesDistributionTimestamp.toNumber();

  // Distribute until timestamp changes
  while (oldVotedDistributionTimeStamp === lastVotesDistributionTimestamp.toNumber()) {
    let votesDistributionPage = await tokenInstance.votesDistributionPage();
    console.log("Distributing Votes, page:", votesDistributionPage);

    await tokenInstance.distributeVotes(amountToDistribute, { from: accounts[0], gas: 500000 });

    // update last vote distribution timestamp
    lastVotesDistributionTimestamp = await tokenInstance.lastVotesDistributionTimestamp();
  }

  let nextVotesDistributionTimeStamp = await tokenInstance.nextVotesDistributionTimeStamp();
  console.log("Votes Distribution done, next votes distribution possible on:", new Date(nextVotesDistributionTimeStamp.toNumber() * 1000));
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

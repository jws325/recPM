import contractService from '../lib/contractService';
import web3Service from '../lib/web3Service';

const ethUtil = require('ethereumjs-util');
const promisify = require("promisify-es6");

async function addProjectAddress(web3, address) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let results = await tokenInstance.addProjectAddress(address, {
    from: web3.eth.defaultAccount,
    gas: 200000
  });

  if (ethUtil.addHexPrefix(results.receipt.status.toString()) !== "0x1") {
    throw  new Error("Contract execution failed")
  }

  return results;
}

async function getProjectAddresses(web3) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let projectAddresses = await tokenInstance.getProjectAddresses();
  return projectAddresses;
}


async function getBalances(web3) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let promises = [
    tokenInstance.balanceOf(web3.eth.defaultAccount),
    tokenInstance.stakedBalanceOf(web3.eth.defaultAccount),
    tokenInstance.bountyLockedBalances(web3.eth.defaultAccount),
    tokenInstance.votesToUse(web3.eth.defaultAccount),
    tokenInstance.totalStaked(),
    tokenInstance.totalSupply(),
    tokenInstance.totalUpvotesReceivedThisWeek(),
  ];

  let [balance, stakedBalance, bountyLockedBalance, votesToUse, totalStaked, totalSupply, totalUpvotesReceivedThisWeek] = await Promise.all(promises);

  return {
    balance: balance.toNumber() / 10 ** 6,
    stakedBalance: stakedBalance.toNumber() / 10 ** 6,
    bountyLockedBalance: bountyLockedBalance.toNumber() / 10 ** 6,
    votesToUse,
    totalStaked: totalStaked.toNumber() / 10 ** 6,
    totalSupply: totalSupply.toNumber() / 10 ** 6,
    totalUpvotesReceivedThisWeek: totalUpvotesReceivedThisWeek.toNumber(),
  };
}

async function stakeTokens(web3, amount) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let amountToStake = amount * 10 ** 6;

  if (!amountToStake || amountToStake <= 0) {
    throw new Error("Needs to be a positive number")
  }

  let balance = await tokenInstance.balanceOf(web3.eth.defaultAccount);
  if (balance.toNumber() < amountToStake) {
    throw new Error("Can't stake more than balance")
  }

  let results = await tokenInstance.stakeTokens(amountToStake, {
    from: web3.eth.defaultAccount,
    gas: 200000
  });

  if (ethUtil.addHexPrefix(results.receipt.status.toString()) !== "0x1") {
    throw new Error("Contract execution failed")
  }

  return results;
}


async function unstakeTokens(web3, amount) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let amountToUnstake = amount * 10 ** 6;

  if (!amountToUnstake || amountToUnstake <= 0) {
    throw new Error("Needs to be a positive number")
  }

  let stakedBalance = await tokenInstance.stakedBalanceOf(web3.eth.defaultAccount);
  if (stakedBalance.toNumber() < amountToUnstake) {
    throw new Error("Can't unstake more than staked balance")
  }

  let results = await tokenInstance.unstakeTokens(amountToUnstake, {
    from: web3.eth.defaultAccount,
    gas: 200000
  });

  if (ethUtil.addHexPrefix(results.receipt.status.toString()) !== "0x1") {
    throw new Error("Contract execution failed")
  }

  return results;
}


async function stakedBalanceOf(web3, address) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let stakedBalance = await tokenInstance.stakedBalanceOf(address);

  return stakedBalance.toNumber() / 10 ** 6;
}


async function vote(web3, projectAddress, votes) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  if (!votes || votes <= 0) {
    throw new Error("Votes needs to be a positive number")
  }

  let votesToUse = await tokenInstance.votesToUse(web3.eth.defaultAccount);
  if (votesToUse.toNumber() < votes) {
    throw new Error("Not enough votes left to use")
  }

  let projectAddressInitialized = await tokenInstance.projectAddressInitialized(projectAddress);
  if (!projectAddressInitialized) {
    throw new Error("Project Address not in the list of projects")
  }

  let votingPaused = await tokenInstance.votingPaused();
  if (votingPaused) {
    throw new Error("Voting is currently paused ...")
  }

  let results = await tokenInstance.vote(projectAddress, votes, {
    from: web3.eth.defaultAccount,
    gas: 200000
  });

  if (ethUtil.addHexPrefix(results.receipt.status.toString()) !== "0x1") {
    throw new Error("Contract execution failed")
  }

  return results;
}


async function getVotesPerProject(web3) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let projectAddresses = await getProjectAddresses();

  let votesPerProject = {};

  for (let i = 0; i < projectAddresses.length; i++) {
    let projectAddress = projectAddresses[i];
    let votes = await tokenInstance.upvotesReceivedThisWeek(projectAddress);
    votesPerProject[projectAddress] = votes.toNumber();
  }

  return votesPerProject;
}


async function createBounty(web3, projectAddress, amount, deadlineBlock) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let amountForBounty = amount * 10 ** 6;

  if (!amountForBounty || amountForBounty <= 0) {
    throw new Error("Amount needs to be a positive number")
  }

  let balance = await tokenInstance.balanceOf(web3.eth.defaultAccount);
  if (balance.toNumber() < amountForBounty) {
    throw new Error("Amount can't be more than balance")
  }

  let projectAddressInitialized = await tokenInstance.projectAddressInitialized(projectAddress);
  if (!projectAddressInitialized) {
    throw new Error("Project Address not in the list of projects")
  }

  let currentBlockNumber = await promisify(web3.eth.getBlockNumber)();
  if (deadlineBlock < currentBlockNumber) {
    throw new Error(`Deadline block needs to be higher than current block number (${currentBlockNumber})`)
  }

  let results = await tokenInstance.createBounty(projectAddress, amountForBounty, deadlineBlock, {
    from: web3.eth.defaultAccount,
    gas: 400000
  });

  if (ethUtil.addHexPrefix(results.receipt.status.toString()) !== "0x1") {
    throw new Error("Contract execution failed")
  }

  return results;
}

async function getBounty(web3, projectAddress, bountyId) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let bountyData = await tokenInstance.getBountyData(projectAddress, bountyId);

  let bounty = {
    id: bountyData[0].toNumber(),
    bountyCreator: bountyData[1],
    bountyAmount: bountyData[2].toNumber() / 10 ** 6,
    deadlineBlockNumber: bountyData[3].toNumber(),
    successfullyClaimed: bountyData[4],
    totalBountyAmount: bountyData[5].toNumber() / 10 ** 6,
    active: bountyData[6],
    refunded: bountyData[7],
  };

  return bounty;
}

async function getActiveBounties(web3, projectAddress) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let activeBounties = [];

  let bountiesLength = await tokenInstance.getBountiesLength(projectAddress);

  for (let i = 0; i < bountiesLength; i++) {
    let bounty = await getBounty(web3, projectAddress, i + 1);

    if (bounty.active) {
      activeBounties.push(bounty);
    }
  }

  return activeBounties;
}

async function getExpiredBounties(web3, projectAddress) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let expiredBounties = [];

  let bountiesLength = await tokenInstance.getBountiesLength(projectAddress);

  for (let i = 0; i < bountiesLength; i++) {
    let bounty = await getBounty(web3, projectAddress, i + 1);

    let currentBlockNumber = await promisify(web3.eth.getBlockNumber)();
    if (currentBlockNumber >= bounty.deadlineBlockNumber) {
      expiredBounties.push(bounty);
    }
  }

  return expiredBounties;
}


async function addToBounty(web3, projectAddress, bountyId, amount) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let amountForBounty = amount * 10 ** 6;

  if (!amountForBounty || amountForBounty <= 0) {
    throw new Error("Amount needs to be a positive number")
  }

  let balance = await tokenInstance.balanceOf(web3.eth.defaultAccount);
  if (balance.toNumber() < amountForBounty) {
    throw new Error("Amount can't be more than balance")
  }

  let projectAddressInitialized = await tokenInstance.projectAddressInitialized(projectAddress);
  if (!projectAddressInitialized) {
    throw new Error("Project Address not in the list of projects")
  }

  let bountiesLength = await tokenInstance.getBountiesLength(projectAddress);
  if (!bountyId || bountyId > bountiesLength) {
    throw new Error(`Bounty ID invalid`)
  }

  let bounty = await getBounty(web3, projectAddress, bountyId);
  if (!bounty.active) {
    throw new Error(`Bounty inactive`)
  }

  let results = await tokenInstance.addToBounty(projectAddress, bountyId, amountForBounty, {
    from: web3.eth.defaultAccount,
    gas: 400000
  });

  if (ethUtil.addHexPrefix(results.receipt.status.toString()) !== "0x1") {
    throw new Error("Contract execution failed")
  }

  return results;
}

async function createBountyClaim(web3, projectAddress, bountyId) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let projectAddressInitialized = await tokenInstance.projectAddressInitialized(projectAddress);
  if (!projectAddressInitialized) {
    throw new Error("Project Address not in the list of projects")
  }

  let bountiesLength = await tokenInstance.getBountiesLength(projectAddress);
  if (!bountyId || bountyId > bountiesLength) {
    throw new Error(`Bounty ID invalid`)
  }

  let bounty = await getBounty(web3, projectAddress, bountyId);
  if (!bounty.active) {
    throw new Error(`Bounty inactive`)
  }

  let results = await tokenInstance.createBountyClaim(projectAddress, bountyId, {
    from: web3.eth.defaultAccount,
    gas: 400000
  });

  if (ethUtil.addHexPrefix(results.receipt.status.toString()) !== "0x1") {
    throw new Error("Contract execution failed")
  }

  return results;
}


async function getBountyClaim(web3, projectAddress, bountyClaimId) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let bountyClaimData = await tokenInstance.getBountyClaimData(projectAddress, bountyClaimId);

  let bountyClaim = {
    bountyClaimId: bountyClaimData[0].toNumber(),
    bountyId: bountyClaimData[1].toNumber(),
    claimerAddress: bountyClaimData[2],
    successfulClaim: bountyClaimData[3],
  };

  return bountyClaim;
}


async function getBountyClaims(web3, projectAddress) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let bountyClaims = [];

  let bountyClaimsLength = await tokenInstance.getBountyClaimsLength(projectAddress);

  for (let i = 0; i < bountyClaimsLength; i++) {
    let bounty = await getBountyClaim(web3, projectAddress, i + 1);

    bountyClaims.push(bounty);
  }

  return bountyClaims;
}


async function acceptBountyClaim(web3, projectAddress, bountyClaimId) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let projectAddressInitialized = await tokenInstance.projectAddressInitialized(projectAddress);
  if (!projectAddressInitialized) {
    throw new Error("Project Address not in the list of projects")
  }

  let bountyClaimsLength = await tokenInstance.getBountyClaimsLength(projectAddress);
  if (!bountyClaimId || bountyClaimId > bountyClaimsLength) {
    throw new Error(`Bounty Claim ID invalid`)
  }

  let bountyClaim = await getBountyClaim(web3, projectAddress, bountyClaimId);

  let bounty = await getBounty(web3, projectAddress, bountyClaim.bountyId);
  if (!bounty.active) {
    throw new Error(`Bounty inactive`)
  }
  if (bounty.bountyCreator !== web3.eth.defaultAccount) {
    throw new Error(`Only the bounty creator can accept a claim`)
  }

  let results = await tokenInstance.acceptBountyClaim(projectAddress, bountyClaimId, {
    from: web3.eth.defaultAccount,
    gas: 600000
  });

  if (ethUtil.addHexPrefix(results.receipt.status.toString()) !== "0x1") {
    throw new Error("Contract execution failed")
  }

  return results;
}


async function refundMyBountyShare(web3, projectAddress, bountyId) {
  const tokenInstance = await contractService.getDeployedInstance(web3, "RECPM");

  let projectAddressInitialized = await tokenInstance.projectAddressInitialized(projectAddress);
  if (!projectAddressInitialized) {
    throw new Error("Project Address not in the list of projects")
  }

  let bountiesLength = await tokenInstance.getBountiesLength(projectAddress);
  if (!bountyId || bountyId > bountiesLength) {
    throw new Error(`Bounty ID invalid`)
  }

  let bounty = await getBounty(web3, projectAddress, bountyId);
  if (bounty.active) {
    throw new Error(`Bounty still active`)
  }

  let results = await tokenInstance.refundMyBountyShare(projectAddress, bountyId, {
    from: web3.eth.defaultAccount,
    gas: 400000
  });

  if (ethUtil.addHexPrefix(results.receipt.status.toString()) !== "0x1") {
    throw new Error("Contract execution failed")
  }

  return results;
}


let recpmService = {
  addProjectAddress,
  getProjectAddresses,
  getBalances,
  stakeTokens,
  unstakeTokens,
  stakedBalanceOf,
  vote,
  getVotesPerProject,
  createBounty,
  getActiveBounties,
  getExpiredBounties,
  addToBounty,
  createBountyClaim,
  getBountyClaims,
  acceptBountyClaim,
  refundMyBountyShare,
};

export default recpmService;
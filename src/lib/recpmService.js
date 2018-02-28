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
  ];

  let [balance, stakedBalance, bountyLockedBalance, votesToUse] = await Promise.all(promises);

  return {
    balance: balance.toNumber() / 10 ** 6,
    stakedBalance: stakedBalance.toNumber() / 10 ** 6,
    bountyLockedBalance: bountyLockedBalance.toNumber() / 10 ** 6,
    votesToUse
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


let recpmService = {
  addProjectAddress,
  getProjectAddresses,
  getBalances,
  stakeTokens,
  unstakeTokens,
};

export default recpmService;
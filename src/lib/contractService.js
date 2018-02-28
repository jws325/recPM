const truffleContract = require('truffle-contract');

const RECPM = require('../../build/contracts/RECPM.json');

const contracts = {
  RECPM,
};

const deployedInstances = {};

async function getDeployedInstance(web3, contractName) {
  if (deployedInstances[contractName]) {
    return deployedInstances[contractName];
  }

  const contract = truffleContract(contracts[contractName]);
  contract.setProvider(web3.currentProvider);
  const instance = await contract.deployed();

  deployedInstances[contractName] = instance;

  return instance;
}

let contractService = {
  getDeployedInstance,
};

export default contractService;
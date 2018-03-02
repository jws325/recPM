const RECPM = artifacts.require("./RECPM.sol");
const promisify = require("promisify-es6");

async function run() {
  let newPageSize = parseInt(process.argv[4], 10);
  if (!newPageSize) {
    console.log("Page Size needed as argument");
    return;
  }

  const web3 = RECPM.web3;
  const accounts = await promisify(web3.eth.getAccounts)();

  const tokenInstance = await RECPM.deployed();

  console.log(`Setting Page size`);

  await tokenInstance.setPageSize(newPageSize, { from: accounts[0], gas: 200000 });

  let pageSize = await tokenInstance.pageSize();

  console.log("Page Size set, pageSize:", pageSize.toNumber());
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

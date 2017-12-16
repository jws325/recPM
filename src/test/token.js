const ICO = artifacts.require("BountyContract");

const tokenName = "RPM";
const decimalUnits = 6;
const tokenSymbol = 'RPM';

const durationTime = 28; //4 weeks

const timeController = (() => {
  
    const addSeconds = (seconds) => new Promise((resolve, reject) =>
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: new Date().getTime()
      }, (error, result) => error ? reject(error) : resolve(result.result)));
  
    const addDays = (days) => addSeconds(days * 24 * 60 * 60);
  
    const currentTimestamp = () => web3.eth.getBlock(web3.eth.blockNumber).timestamp;
  
    return {
      addSeconds,
      addDays,
      currentTimestamp
    };
  })();
  
async function advanceToBlock(number) {
  await timeController.addDays(number);
}

contract('RPM Token', function(accounts) {
  beforeEach(async function () {
    this.token = await ICO.new(accounts[0], 0);
  });

  it("should have symbol RPM", async function () {
    const actual = await this.token.symbol();
    assert.equal(actual, tokenSymbol, "Symbol should be RPM");
  });

  it("should have name RPM", async function () {
    const actual = await this.token.name();
    assert.equal(actual, tokenName, "Name should be RPM");
  });

  it("should get bounty id", async function () {
    const actual = await this.token.getNextBountyId();
    assert.equal(actual, 1, "Bounty Id should be 1");
  });

  it("should get next additional bounty id", async function () {
    const actual = await this.token.getNextAdditionalBountyId(1);
    assert.equal(actual, 1, "Bounty Addition Id should be 1");
  });

  it("should get next bounty claim id", async function () {
    const actual = await this.token.getNextBountyClaimId(1);
    assert.equal(actual, 1, "Bounty Claim Id should be 1");
  });
});
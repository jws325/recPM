const RECPM = artifacts.require("./RECPM.sol");

const expectRequireFailure = require('./support/expectRequireFailure');
const proxiedWeb3Handler = require('./support/proxiedWeb3Handler.js');

contract('RECPM', function (accounts) {

  let tokenInstance, web3, proxiedWeb3;

  before(async function beforeTest() {
    web3 = RECPM.web3;
    proxiedWeb3 = new Proxy(web3, proxiedWeb3Handler);
    tokenInstance = await RECPM.deployed();
  });

  describe('proper instantiation', function () {
    it("ok", async function () {
      let name = await tokenInstance.name();
      assert.equal(name, "RECPM");
      let symbol = await tokenInstance.symbol();
      assert.equal(symbol, "RECPM");
      let decimals = await tokenInstance.decimals();
      assert.equal(decimals.toNumber(), 6);
      let totalSupply = await tokenInstance.totalSupply();
      assert.equal(totalSupply.toNumber(), 10000 * 10 ** 6);
      let creatorBalance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(creatorBalance.toNumber(), 10000 * 10 ** 6);

      // check address initialized in token holders list
      let holderAddress_0 = await tokenInstance.holderAddresses(0);
      assert.equal(holderAddress_0, accounts[0]);
      let address_0_initialized = await tokenInstance.holderAddressInitialized(accounts[0]);
      assert.equal(address_0_initialized, true);
    });
  });

  describe('transfer', function () {
    it("transferable to user 1", async function () {
      await tokenInstance.transfer(accounts[1], 500 * Math.pow(10, 6), { from: accounts[0] });

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 9500 * Math.pow(10, 6));

      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 500 * Math.pow(10, 6));

      // check address initialized in token holders list
      let holderAddress_1 = await tokenInstance.holderAddresses(1);
      assert.equal(holderAddress_1, accounts[1]);
      let address_1_initialized = await tokenInstance.holderAddressInitialized(accounts[1]);
      assert.equal(address_1_initialized, true);
    });

    it("transferable to user 2", async function () {
      await tokenInstance.transfer(accounts[2], 500 * Math.pow(10, 6), { from: accounts[0] });

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 9000 * Math.pow(10, 6));

      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 500 * Math.pow(10, 6));

      // check address initialized in token holders list
      let holderAddress_2 = await tokenInstance.holderAddresses(2);
      assert.equal(holderAddress_2, accounts[2]);
      let address_2_initialized = await tokenInstance.holderAddressInitialized(accounts[2]);
      assert.equal(address_2_initialized, true);
    });

    it("cannot transfer more than balance", async function () {
      await expectRequireFailure(() => tokenInstance.transfer(accounts[1], 12000 * Math.pow(10, 6), { from: accounts[0] }));
    });
  });

  describe('approve /transferFrom', function () {
    it("transferable to other preapproved user", async function () {
      await tokenInstance.approve(accounts[1], 400 * Math.pow(10, 6), { from: accounts[0] });

      await tokenInstance.transferFrom(accounts[0], accounts[1], 400 * Math.pow(10, 6), { from: accounts[1] });

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 8600 * Math.pow(10, 6));

      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 900 * Math.pow(10, 6));
    });

    it("cannot transfer more than preapproved", async function () {
      await expectRequireFailure(() => tokenInstance.transferFrom(accounts[0], accounts[1], 600 * Math.pow(10, 6), { from: accounts[1] }));
    });
  });

  let project_1 = accounts[8];
  let project_2 = accounts[9];

  describe('add project addresses', function () {
    it("ok", async function () {
      // Project added by user 1
      await tokenInstance.addProjectAddress(project_1, { from: accounts[1] });

      let projectAddress_1 = await tokenInstance.projectAddresses(0);
      assert.equal(projectAddress_1, project_1);
      let address_1_initialized = await tokenInstance.projectAddressInitialized(project_1);
      assert.equal(address_1_initialized, true);

      // Project added by user 5
      await tokenInstance.addProjectAddress(project_2, { from: accounts[5] });

      let projectAddress_2 = await tokenInstance.projectAddresses(1);
      assert.equal(projectAddress_2, project_2);
      let address_2_initialized = await tokenInstance.projectAddressInitialized(project_2);
      assert.equal(address_2_initialized, true);
    });
  });

  describe("distributeVotes", function () {
    it("not allowed if not owner", async function () {
      await expectRequireFailure(() => tokenInstance.distributeVotes(1000, { from: accounts[1] }));
    });

    it("increases votesToUse", async function () {
      let results = await tokenInstance.distributeVotes(1000, { from: accounts[0] });

      let log = results.logs[0];
      let block = await proxiedWeb3.eth.getBlock(log.blockNumber);

      let lastVotesDistributionTimestamp = await tokenInstance.lastVotesDistributionTimestamp();
      assert.equal(lastVotesDistributionTimestamp.toNumber(), block.timestamp);

      let votedToUse_0 = await tokenInstance.votesToUse(accounts[0]);
      assert.equal(votedToUse_0.toNumber(), 860);
      let votedToUse_1 = await tokenInstance.votesToUse(accounts[1]);
      assert.equal(votedToUse_1.toNumber(), 90);
      let votedToUse_2 = await tokenInstance.votesToUse(accounts[2]);
      assert.equal(votedToUse_2.toNumber(), 50);
    });
  });

  describe("vote", function () {
    it("ok", async function () {
      await tokenInstance.vote(project_1, { from: accounts[0] });
      await tokenInstance.vote(project_2, { from: accounts[0] });
      await tokenInstance.vote(project_1, { from: accounts[1] });
      await tokenInstance.vote(project_1, { from: accounts[2] });

      let votedToUse_0 = await tokenInstance.votesToUse(accounts[0]);
      assert.equal(votedToUse_0.toNumber(), 858);
      let votedToUse_1 = await tokenInstance.votesToUse(accounts[1]);
      assert.equal(votedToUse_1.toNumber(), 89);
      let votedToUse_2 = await tokenInstance.votesToUse(accounts[2]);
      assert.equal(votedToUse_2.toNumber(), 49);

      let upvotesReceivedThisWeek_1 = await tokenInstance.upvotesReceivedThisWeek(project_1);
      assert.equal(upvotesReceivedThisWeek_1.toNumber(), 3);
      let upvotesReceivedThisWeek_2 = await tokenInstance.upvotesReceivedThisWeek(project_2);
      assert.equal(upvotesReceivedThisWeek_2.toNumber(), 1);

      let totalUpvotesReceivedThisWeek = await tokenInstance.totalUpvotesReceivedThisWeek();
      assert.equal(totalUpvotesReceivedThisWeek.toNumber(), 4);
    });
  });

  describe("distributeTokens", function () {
    it("not allowed if not owner", async function () {
      await expectRequireFailure(() => tokenInstance.distributeTokens(1000 * Math.pow(10, 6), { from: accounts[1] }));
    });

    it("ok", async function () {
      let results = await tokenInstance.distributeTokens(1000 * Math.pow(10, 6), { from: accounts[0] });

      let log = results.logs[0];
      let block = await proxiedWeb3.eth.getBlock(log.blockNumber);

      let lastTokensDistributionTimestamp = await tokenInstance.lastTokensDistributionTimestamp();
      assert.equal(lastTokensDistributionTimestamp.toNumber(), block.timestamp);

      let totalSupply = await tokenInstance.totalSupply();
      assert.equal(totalSupply, 11000 * Math.pow(10, 6));

      let project_1_balance = await tokenInstance.balanceOf(project_1);
      assert.equal(project_1_balance.toNumber(), 750 * Math.pow(10, 6));

      let project_2_balance = await tokenInstance.balanceOf(project_2);
      assert.equal(project_2_balance.toNumber(), 250 * Math.pow(10, 6));

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 8600 * Math.pow(10, 6));
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 900 * Math.pow(10, 6));
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 500 * Math.pow(10, 6));

      // check votes reset

      let upvotesReceivedThisWeek_1 = await tokenInstance.upvotesReceivedThisWeek(project_1);
      assert.equal(upvotesReceivedThisWeek_1.toNumber(), 0);
      let upvotesReceivedThisWeek_2 = await tokenInstance.upvotesReceivedThisWeek(project_2);
      assert.equal(upvotesReceivedThisWeek_2.toNumber(), 0);

      let totalUpvotesReceivedThisWeek = await tokenInstance.totalUpvotesReceivedThisWeek();
      assert.equal(totalUpvotesReceivedThisWeek.toNumber(), 0);
    });
  });

  describe("burn", function () {
    it("not allowed if not owner", async function () {
      await expectRequireFailure(() => tokenInstance.burn(1000 * Math.pow(10, 6), { from: accounts[1] }));
    });

    it("ok", async function () {
      await tokenInstance.burn(2000 * Math.pow(10, 6), { from: accounts[0] });

      let totalSupply = await tokenInstance.totalSupply();
      assert.equal(totalSupply, 9000 * Math.pow(10, 6));

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 6600 * Math.pow(10, 6));
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 900 * Math.pow(10, 6));
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 500 * Math.pow(10, 6));
      let project_1_balance = await tokenInstance.balanceOf(project_1);
      assert.equal(project_1_balance.toNumber(), 750 * Math.pow(10, 6));
      let project_2_balance = await tokenInstance.balanceOf(project_2);
      assert.equal(project_2_balance.toNumber(), 250 * Math.pow(10, 6));
    });
  });

});
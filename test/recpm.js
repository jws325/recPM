const RECPM = artifacts.require("./RECPM.sol");

const expectRequireFailure = require('./support/expectRequireFailure');
const proxiedWeb3Handler = require('./support/proxiedWeb3Handler.js');
const sleep = require('./support/sleep.js');

contract('RECPM', function (accounts) {

  let tokenInstance, web3, proxiedWeb3;

  // Multiplier to represent 6 decimals
  const T_MUL = 10 ** 6;

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
      let pageSize = await tokenInstance.pageSize();
      assert.equal(pageSize.toNumber(), 1000);
      let totalSupply = await tokenInstance.totalSupply();
      assert.equal(totalSupply.toNumber(), 10000 * T_MUL);
      let creatorBalance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(creatorBalance.toNumber(), 10000 * T_MUL);

      // check address initialized in token holders list
      let holderAddress_0 = await tokenInstance.holderAddresses(0);
      assert.equal(holderAddress_0, accounts[0]);
      let address_0_initialized = await tokenInstance.holderAddressInitialized(accounts[0]);
      assert.equal(address_0_initialized, true);
    });
  });


  describe('transfer', function () {
    it("transferable to user 1", async function () {
      await tokenInstance.transfer(accounts[1], 500 * T_MUL, { from: accounts[0] });

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 9500 * T_MUL);

      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 500 * T_MUL);

      // check address initialized in token holders list
      let holderAddress_1 = await tokenInstance.holderAddresses(1);
      assert.equal(holderAddress_1, accounts[1]);
      let address_1_initialized = await tokenInstance.holderAddressInitialized(accounts[1]);
      assert.equal(address_1_initialized, true);
    });

    it("transferable to user 2", async function () {
      await tokenInstance.transfer(accounts[2], 500 * T_MUL, { from: accounts[0] });

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 9000 * T_MUL);

      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 500 * T_MUL);

      // check address initialized in token holders list
      let holderAddress_2 = await tokenInstance.holderAddresses(2);
      assert.equal(holderAddress_2, accounts[2]);
      let address_2_initialized = await tokenInstance.holderAddressInitialized(accounts[2]);
      assert.equal(address_2_initialized, true);
    });

    it("cannot transfer more than balance", async function () {
      await expectRequireFailure(() => tokenInstance.transfer(accounts[1], 12000 * T_MUL, { from: accounts[0] }));
    });
  });

  describe('setPageSize', function () {
    it("only owner can call", async function () {
      await expectRequireFailure(() => tokenInstance.setPageSize(2, { from: accounts[1] }));
    });

    it("ok", async function () {
      await tokenInstance.setPageSize(2, { from: accounts[0] });

      let pageSize = await tokenInstance.pageSize();
      assert.equal(pageSize.toNumber(), 2);
    });
  });

  describe('approve /transferFrom', function () {
    it("transferable to other preapproved user", async function () {
      await tokenInstance.approve(accounts[1], 400 * T_MUL, { from: accounts[0] });

      await tokenInstance.transferFrom(accounts[0], accounts[1], 400 * T_MUL, { from: accounts[1] });

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 8600 * T_MUL);

      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 900 * T_MUL);
    });

    it("cannot transfer more than preapproved", async function () {
      await expectRequireFailure(() => tokenInstance.transferFrom(accounts[0], accounts[1], 600 * T_MUL, { from: accounts[1] }));
    });
  });

  let project_1 = "0x0000000000000000000000000000000000000001";
  let project_2 = "0x0000000000000000000000000000000000000002";
  let project_3 = "0x0000000000000000000000000000000000000003";

  describe('add project addresses', function () {
    it("ok", async function () {
      // Project added by user 1
      await tokenInstance.addProjectAddress(project_1, { from: accounts[1] });

      let projectAddress_1 = await tokenInstance.projectAddresses(0);
      assert.equal(projectAddress_1, project_1);
      let address_1_initialized = await tokenInstance.projectAddressInitialized(project_1);
      assert.equal(address_1_initialized, true);

      // Projects added by user 5
      await tokenInstance.addProjectAddress(project_2, { from: accounts[5] });

      let projectAddress_2 = await tokenInstance.projectAddresses(1);
      assert.equal(projectAddress_2, project_2);
      let address_2_initialized = await tokenInstance.projectAddressInitialized(project_2);
      assert.equal(address_2_initialized, true);

      await tokenInstance.addProjectAddress(project_3, { from: accounts[5] });

      let projectAddress_3 = await tokenInstance.projectAddresses(2);
      assert.equal(projectAddress_3, project_3);
      let address_3_initialized = await tokenInstance.projectAddressInitialized(project_3);
      assert.equal(address_3_initialized, true);
    });
  });

  describe("distributeVotes with pagination and pausing", function () {
    let amountToDistribute = 1000;

    it("not allowed if not owner", async function () {
      await expectRequireFailure(() => tokenInstance.distributeVotes(amountToDistribute, { from: accounts[1] }));
    });

    it("increases votesToUse, first call , page 0", async function () {
      let results = await tokenInstance.distributeVotes(amountToDistribute, { from: accounts[0] });

      let lastVotesDistributionTimestamp = await tokenInstance.lastVotesDistributionTimestamp();
      assert.equal(lastVotesDistributionTimestamp.toNumber(), 0);

      let votesDistributionPage = await tokenInstance.votesDistributionPage();
      assert.equal(votesDistributionPage.toNumber(), 1);

      let votedToUse_0 = await tokenInstance.votesToUse(accounts[0]);
      assert.equal(votedToUse_0.toNumber(), 860);
      let votedToUse_1 = await tokenInstance.votesToUse(accounts[1]);
      assert.equal(votedToUse_1.toNumber(), 90);
      // not distributed yet
      let votedToUse_2 = await tokenInstance.votesToUse(accounts[2]);
      assert.equal(votedToUse_2.toNumber(), 0);
    });

    it("transfers fail during distribution", async function () {
      await expectRequireFailure(() => tokenInstance.transfer(accounts[1], 500 * T_MUL, { from: accounts[0] }));
    });

    it("increases votesToUse, second call, page 1", async function () {
      let results = await tokenInstance.distributeVotes(amountToDistribute, { from: accounts[0] });

      let block = await proxiedWeb3.eth.getBlock(results.receipt.blockNumber);

      let lastVotesDistributionTimestamp = await tokenInstance.lastVotesDistributionTimestamp();
      assert.equal(lastVotesDistributionTimestamp.toNumber(), block.timestamp);

      let votesDistributionPage = await tokenInstance.votesDistributionPage();
      assert.equal(votesDistributionPage.toNumber(), 0);

      let votedToUse_0 = await tokenInstance.votesToUse(accounts[0]);
      assert.equal(votedToUse_0.toNumber(), 860);
      let votedToUse_1 = await tokenInstance.votesToUse(accounts[1]);
      assert.equal(votedToUse_1.toNumber(), 90);
      let votedToUse_2 = await tokenInstance.votesToUse(accounts[2]);
      assert.equal(votedToUse_2.toNumber(), 50);
    });

    it("increases votesToUse, third call fails (distribution already completed)", async function () {
      await expectRequireFailure(() => tokenInstance.distributeVotes(amountToDistribute, { from: accounts[0] }));
    });

  });

  describe("vote", function () {
    it("ok", async function () {
      await tokenInstance.vote(project_1, { from: accounts[0] });
      await tokenInstance.vote(project_1, { from: accounts[1] });
      await tokenInstance.vote(project_1, { from: accounts[2] });

      await tokenInstance.vote(project_2, { from: accounts[0] });

      await tokenInstance.vote(project_3, { from: accounts[2] });

      let votedToUse_0 = await tokenInstance.votesToUse(accounts[0]);
      assert.equal(votedToUse_0.toNumber(), 858);
      let votedToUse_1 = await tokenInstance.votesToUse(accounts[1]);
      assert.equal(votedToUse_1.toNumber(), 89);
      let votedToUse_2 = await tokenInstance.votesToUse(accounts[2]);
      assert.equal(votedToUse_2.toNumber(), 48);

      let upvotesReceivedThisWeek_1 = await tokenInstance.upvotesReceivedThisWeek(project_1);
      assert.equal(upvotesReceivedThisWeek_1.toNumber(), 3);
      let upvotesReceivedThisWeek_2 = await tokenInstance.upvotesReceivedThisWeek(project_2);
      assert.equal(upvotesReceivedThisWeek_2.toNumber(), 1);
      let upvotesReceivedThisWeek_3 = await tokenInstance.upvotesReceivedThisWeek(project_3);
      assert.equal(upvotesReceivedThisWeek_3.toNumber(), 1);

      let totalUpvotesReceivedThisWeek = await tokenInstance.totalUpvotesReceivedThisWeek();
      assert.equal(totalUpvotesReceivedThisWeek.toNumber(), 5);
    });
  });

  describe("distributeTokens", function () {
    it("not allowed if not owner", async function () {
      await expectRequireFailure(() => tokenInstance.distributeTokens(1000 * T_MUL, { from: accounts[1] }));
    });

    it("first call , page 0", async function () {
      let results = await tokenInstance.distributeTokens(1000 * T_MUL, { from: accounts[0] });

      let lastTokensDistributionTimestamp = await tokenInstance.lastTokensDistributionTimestamp();
      assert.equal(lastTokensDistributionTimestamp.toNumber(), 0);

      let tokensDistributionPage = await tokenInstance.tokensDistributionPage();
      assert.equal(tokensDistributionPage.toNumber(), 1);

      let totalSupply = await tokenInstance.totalSupply();
      assert.equal(totalSupply, 11000 * T_MUL);

      let project_1_balance = await tokenInstance.balanceOf(project_1);
      assert.equal(project_1_balance.toNumber(), 600 * T_MUL);

      let project_2_balance = await tokenInstance.balanceOf(project_2);
      assert.equal(project_2_balance.toNumber(), 200 * T_MUL);

      let project_3_balance = await tokenInstance.balanceOf(project_3);
      assert.equal(project_3_balance.toNumber(), 0);

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 8800 * T_MUL);
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 900 * T_MUL);
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 500 * T_MUL);

      // check votes reset (for page 0)

      let upvotesReceivedThisWeek_1 = await tokenInstance.upvotesReceivedThisWeek(project_1);
      assert.equal(upvotesReceivedThisWeek_1.toNumber(), 0);
      let upvotesReceivedThisWeek_2 = await tokenInstance.upvotesReceivedThisWeek(project_2);
      assert.equal(upvotesReceivedThisWeek_2.toNumber(), 0);
      let upvotesReceivedThisWeek_3 = await tokenInstance.upvotesReceivedThisWeek(project_3);
      assert.equal(upvotesReceivedThisWeek_3.toNumber(), 1);

      let totalUpvotesReceivedThisWeek = await tokenInstance.totalUpvotesReceivedThisWeek();
      assert.equal(totalUpvotesReceivedThisWeek.toNumber(), 5);
    });

    it("votes fail during distribution", async function () {
      await expectRequireFailure(() => tokenInstance.vote(project_1, { from: accounts[0] }));
    });

    it("second call , page 1", async function () {
      let results = await tokenInstance.distributeTokens(1000 * T_MUL, { from: accounts[0] });

      let block = await proxiedWeb3.eth.getBlock(results.receipt.blockNumber);

      let lastTokensDistributionTimestamp = await tokenInstance.lastTokensDistributionTimestamp();
      assert.equal(lastTokensDistributionTimestamp.toNumber(), block.timestamp);

      let tokensDistributionPage = await tokenInstance.tokensDistributionPage();
      assert.equal(tokensDistributionPage.toNumber(), 0);

      let totalSupply = await tokenInstance.totalSupply();
      assert.equal(totalSupply, 11000 * T_MUL);

      let project_1_balance = await tokenInstance.balanceOf(project_1);
      assert.equal(project_1_balance.toNumber(), 600 * T_MUL);

      let project_2_balance = await tokenInstance.balanceOf(project_2);
      assert.equal(project_2_balance.toNumber(), 200 * T_MUL);

      let project_3_balance = await tokenInstance.balanceOf(project_3);
      assert.equal(project_3_balance.toNumber(), 200 * T_MUL);

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 8600 * T_MUL);
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 900 * T_MUL);
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 500 * T_MUL);

      // check votes reset

      let upvotesReceivedThisWeek_1 = await tokenInstance.upvotesReceivedThisWeek(project_1);
      assert.equal(upvotesReceivedThisWeek_1.toNumber(), 0);
      let upvotesReceivedThisWeek_2 = await tokenInstance.upvotesReceivedThisWeek(project_2);
      assert.equal(upvotesReceivedThisWeek_2.toNumber(), 0);
      let upvotesReceivedThisWeek_3 = await tokenInstance.upvotesReceivedThisWeek(project_3);
      assert.equal(upvotesReceivedThisWeek_3.toNumber(), 0);

      let totalUpvotesReceivedThisWeek = await tokenInstance.totalUpvotesReceivedThisWeek();
      assert.equal(totalUpvotesReceivedThisWeek.toNumber(), 0);
    });

    it("third call fails (distribution already completed)", async function () {
      await expectRequireFailure(() => tokenInstance.distributeTokens(1000 * T_MUL, { from: accounts[0] }));
    });

  });

  describe("burn", function () {
    it("not allowed if not owner", async function () {
      await expectRequireFailure(() => tokenInstance.burn(1000 * T_MUL, { from: accounts[1] }));
    });

    it("ok", async function () {
      await tokenInstance.burn(2000 * T_MUL, { from: accounts[0] });

      let totalSupply = await tokenInstance.totalSupply();
      assert.equal(totalSupply, 9000 * T_MUL);

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 6600 * T_MUL);
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 900 * T_MUL);
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 500 * T_MUL);
      let project_1_balance = await tokenInstance.balanceOf(project_1);
      assert.equal(project_1_balance.toNumber(), 600 * T_MUL);
      let project_2_balance = await tokenInstance.balanceOf(project_2);
      assert.equal(project_2_balance.toNumber(), 200 * T_MUL);
      let project_3_balance = await tokenInstance.balanceOf(project_3);
      assert.equal(project_3_balance.toNumber(), 200 * T_MUL);
    });
  });

  describe("createBounty", function () {
    it("bounty 1", async function () {
      let deadlineBlockNumber = web3.eth.blockNumber + 100;
      let bountyAmount = 100 * T_MUL;
      await tokenInstance.createBounty(project_1, bountyAmount, deadlineBlockNumber, { from: accounts[1] });

      let bountiesLength = await tokenInstance.getBountiesLength(project_1);
      assert.equal(bountiesLength.toNumber(), 1);

      let bountyData = await tokenInstance.getBountyData(project_1, 1);
      assert.equal(bountyData[0].toNumber(), 1);
      assert.equal(bountyData[1], accounts[1]);
      assert.equal(bountyData[2].toNumber(), bountyAmount);
      assert.equal(bountyData[3].toNumber(), deadlineBlockNumber);
      assert.equal(bountyData[4], false);
      assert.equal(bountyData[5], bountyAmount);
      assert.equal(bountyData[6], true);
      assert.equal(bountyData[7], false);

      // check transfer ok
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 800 * T_MUL);
      let token_contract_balance = await tokenInstance.balanceOf(RECPM.address);
      assert.equal(token_contract_balance.toNumber(), 100 * T_MUL);

      // check lock ok
      let account_1_locked_balance = await tokenInstance.bountyLockedBalances(accounts[1]);
      assert.equal(account_1_locked_balance.toNumber(), 100 * T_MUL);
    });

    it("bounty 2", async function () {
      let deadlineBlockNumber = web3.eth.blockNumber + 30;
      let bountyAmount = 200 * T_MUL;
      await tokenInstance.createBounty(project_1, bountyAmount, deadlineBlockNumber, { from: accounts[2] });

      let bountiesLength = await tokenInstance.getBountiesLength(project_1);
      assert.equal(bountiesLength.toNumber(), 2);

      let bountyData = await tokenInstance.getBountyData(project_1, 2);
      assert.equal(bountyData[0].toNumber(), 2);
      assert.equal(bountyData[1], accounts[2]);
      assert.equal(bountyData[2].toNumber(), bountyAmount);
      assert.equal(bountyData[3].toNumber(), deadlineBlockNumber);
      assert.equal(bountyData[4], false);
      assert.equal(bountyData[5], bountyAmount);
      assert.equal(bountyData[6], true);
      assert.equal(bountyData[7], false);

      // check transfer ok
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 300 * T_MUL);
      let token_contract_balance = await tokenInstance.balanceOf(RECPM.address);
      assert.equal(token_contract_balance.toNumber(), 300 * T_MUL);

      // check lock ok
      let account_2_locked_balance = await tokenInstance.bountyLockedBalances(accounts[2]);
      assert.equal(account_2_locked_balance.toNumber(), 200 * T_MUL);
    });
  });


  describe("addToBounty", function () {
    it("bounty 1 ", async function () {
      let bountyId = 1;

      await tokenInstance.addToBounty(project_1, bountyId, 20 * T_MUL, { from: accounts[1] });
      await tokenInstance.addToBounty(project_1, bountyId, 30 * T_MUL, { from: accounts[2] });

      let bountyAdditionsLength = await tokenInstance.getBountyAdditionsLength(project_1, bountyId);
      assert.equal(bountyAdditionsLength.toNumber(), 2);

      let bountyAddition_1_Data = await tokenInstance.getBountyAdditionData(project_1, bountyId, 0);
      assert.equal(bountyAddition_1_Data[0].toNumber(), bountyId);
      assert.equal(bountyAddition_1_Data[1], accounts[1]);
      assert.equal(bountyAddition_1_Data[2].toNumber(), 20 * T_MUL);
      assert.equal(bountyAddition_1_Data[3], false);

      let bountyAddition_2_Data = await tokenInstance.getBountyAdditionData(project_1, bountyId, 1);
      assert.equal(bountyAddition_2_Data[0].toNumber(), bountyId);
      assert.equal(bountyAddition_2_Data[1], accounts[2]);
      assert.equal(bountyAddition_2_Data[2].toNumber(), 30 * T_MUL);
      assert.equal(bountyAddition_2_Data[3], false);

      // check transfer ok
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 780 * T_MUL);
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 270 * T_MUL);
      let token_contract_balance = await tokenInstance.balanceOf(RECPM.address);
      assert.equal(token_contract_balance.toNumber(), 350 * T_MUL);

      // check lock ok
      let account_1_locked_balance = await tokenInstance.bountyLockedBalances(accounts[1]);
      assert.equal(account_1_locked_balance.toNumber(), 120 * T_MUL);
      let account_2_locked_balance = await tokenInstance.bountyLockedBalances(accounts[2]);
      assert.equal(account_2_locked_balance.toNumber(), 230 * T_MUL);
    });

    it("bounty 2 ", async function () {
      let bountyId = 2;

      await tokenInstance.addToBounty(project_1, bountyId, 10 * T_MUL, { from: accounts[1] });
      await tokenInstance.addToBounty(project_1, bountyId, 15 * T_MUL, { from: accounts[2] });

      let bountyAdditionsLength = await tokenInstance.getBountyAdditionsLength(project_1, bountyId);
      assert.equal(bountyAdditionsLength.toNumber(), 2);

      let bountyAddition_1_Data = await tokenInstance.getBountyAdditionData(project_1, bountyId, 0);
      assert.equal(bountyAddition_1_Data[0].toNumber(), bountyId);
      assert.equal(bountyAddition_1_Data[1], accounts[1]);
      assert.equal(bountyAddition_1_Data[2].toNumber(), 10 * T_MUL);
      assert.equal(bountyAddition_1_Data[3], false);

      let bountyAddition_2_Data = await tokenInstance.getBountyAdditionData(project_1, bountyId, 1);
      assert.equal(bountyAddition_2_Data[0].toNumber(), bountyId);
      assert.equal(bountyAddition_2_Data[1], accounts[2]);
      assert.equal(bountyAddition_2_Data[2].toNumber(), 15 * T_MUL);
      assert.equal(bountyAddition_2_Data[3], false);

      // check transfer ok
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 770 * T_MUL);
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 255 * T_MUL);
      let token_contract_balance = await tokenInstance.balanceOf(RECPM.address);
      assert.equal(token_contract_balance.toNumber(), 375 * T_MUL);

      // check lock ok
      let account_1_locked_balance = await tokenInstance.bountyLockedBalances(accounts[1]);
      assert.equal(account_1_locked_balance.toNumber(), 130 * T_MUL);
      let account_2_locked_balance = await tokenInstance.bountyLockedBalances(accounts[2]);
      assert.equal(account_2_locked_balance.toNumber(), 245 * T_MUL);
    });

  });

  describe("getActiveBounties", function () {
    it("ok", async function () {
      let activeBounties = [];

      let bountiesLength = await tokenInstance.getBountiesLength(project_1);
      assert.equal(bountiesLength.toNumber(), 2);

      for (i = 0; i < bountiesLength; i++) {
        let bountyData = await tokenInstance.getBountyData(project_1, i + 1);

        let bounty = {
          id: bountyData[0].toNumber(),
          bountyCreator: bountyData[1],
          bountyAmount: bountyData[2].toNumber(),
          deadlineBlockNumber: bountyData[3].toNumber(),
          successfullyClaimed: bountyData[4],
          totalBountyAmount: bountyData[5].toNumber(),
          active: bountyData[6],
          refunded: bountyData[7],
        };

        if (bounty.active) {
          activeBounties.push(bounty);
        }
      }

      assert.equal(activeBounties.length, 2);

      assert.equal(activeBounties[0].id, 1);
      assert.equal(activeBounties[0].bountyAmount, 100 * T_MUL);
      assert.equal(activeBounties[0].totalBountyAmount, 150 * T_MUL);

      assert.equal(activeBounties[1].id, 2);
      assert.equal(activeBounties[1].bountyAmount, 200 * T_MUL);
      assert.equal(activeBounties[1].totalBountyAmount, 225 * T_MUL);
    });
  });

  describe("createBountyClaim", function () {
    it("ok", async function () {
      let bountyId = 1;
      await tokenInstance.createBountyClaim(project_1, bountyId, { from: accounts[3] });

      let bountyClaimsLength = await tokenInstance.getBountyClaimsLength(project_1);
      assert.equal(bountyClaimsLength.toNumber(), 1);

      let bountyClaimData = await tokenInstance.getBountyClaimData(project_1, 1);
      assert.equal(bountyClaimData[0].toNumber(), 1);
      assert.equal(bountyClaimData[1].toNumber(), 1);
      assert.equal(bountyClaimData[2], accounts[3]);
      assert.equal(bountyClaimData[3], false);
    });
  });


  describe("acceptBountyClaim", function () {
    let bountyClaimId = 1;

    it("not allowed if not bounty creator", async function () {
      await expectRequireFailure(() => tokenInstance.acceptBountyClaim(project_1, bountyClaimId, { from: accounts[2] }));
    });

    it("ok", async function () {
      // check balances before claim
      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 6600 * T_MUL);
      let account_3_balance = await tokenInstance.balanceOf(accounts[3]);
      assert.equal(account_3_balance.toNumber(), 0);

      await tokenInstance.acceptBountyClaim(project_1, bountyClaimId, { from: accounts[1] });

      // check transfer ok
      account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 6615 * T_MUL);
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 770 * T_MUL);
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 255 * T_MUL);
      account_3_balance = await tokenInstance.balanceOf(accounts[3]);
      assert.equal(account_3_balance.toNumber(), 135 * T_MUL);
      let token_contract_balance = await tokenInstance.balanceOf(RECPM.address);
      assert.equal(token_contract_balance.toNumber(), 225 * T_MUL);

      // check lock ok
      let account_1_locked_balance = await tokenInstance.bountyLockedBalances(accounts[1]);
      assert.equal(account_1_locked_balance.toNumber(), 10 * T_MUL);
      let account_2_locked_balance = await tokenInstance.bountyLockedBalances(accounts[2]);
      assert.equal(account_2_locked_balance.toNumber(), 215 * T_MUL);

      // check claim marked successful
      let bountyClaimData = await tokenInstance.getBountyClaimData(project_1, 1);
      assert.equal(bountyClaimData[3], true);

      // check claimed and therefore inactive
      let bountyData = await tokenInstance.getBountyData(project_1, 1);
      assert.equal(bountyData[4], true);
      assert.equal(bountyData[6], false);
      assert.equal(bountyData[7], false);
    });
  });

  describe("refundMyBountyShare", function () {
    let bountyId = 2;

    it("not allowed if bounty already claimed", async function () {
      await expectRequireFailure(() => tokenInstance.refundMyBountyShare(project_1, 1, { from: accounts[2] }));
    });

    it("ok", async function () {
      let bountyData = await tokenInstance.getBountyData(project_1, bountyId);

      let deadlineBlockNumber = bountyData[3].toNumber();
      let currentBlockNumber = await proxiedWeb3.eth.getBlockNumber();

      // check that it fails until deadline passes
      await expectRequireFailure(() => tokenInstance.refundMyBountyShare(project_1, bountyId, { from: accounts[1] }));

      while (currentBlockNumber < deadlineBlockNumber) {
        // mine to advance block number
        web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_mine", params: [], id: 0 });

        // sleep to avoid testrpc crash
        await sleep(50);

        // update current blocknumber
        currentBlockNumber = await proxiedWeb3.eth.getBlockNumber();
      }

      // not allowed if not bounty participant
      await expectRequireFailure(() => tokenInstance.refundMyBountyShare(project_1, bountyId, { from: accounts[3] }));

      // Account 2 claims refund
      await tokenInstance.refundMyBountyShare(project_1, bountyId, { from: accounts[2] });

      // check transfer ok
      account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 6615 * T_MUL);
      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 770 * T_MUL);
      let account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 470 * T_MUL);
      account_3_balance = await tokenInstance.balanceOf(accounts[3]);
      assert.equal(account_3_balance.toNumber(), 135 * T_MUL);
      let token_contract_balance = await tokenInstance.balanceOf(RECPM.address);
      assert.equal(token_contract_balance.toNumber(), 10 * T_MUL);

      // check lock ok
      let account_1_locked_balance = await tokenInstance.bountyLockedBalances(accounts[1]);
      assert.equal(account_1_locked_balance.toNumber(), 10 * T_MUL);
      let account_2_locked_balance = await tokenInstance.bountyLockedBalances(accounts[2]);
      assert.equal(account_2_locked_balance.toNumber(), 0);

      // check bounty additions refund state updated
      let bountyAddition_1_Data = await tokenInstance.getBountyAdditionData(project_1, bountyId, 0);
      assert.equal(bountyAddition_1_Data[1], accounts[1]);
      assert.equal(bountyAddition_1_Data[3], false);

      let bountyAddition_2_Data = await tokenInstance.getBountyAdditionData(project_1, bountyId, 1);
      assert.equal(bountyAddition_2_Data[1], accounts[2]);
      assert.equal(bountyAddition_2_Data[3], true);

      // check bounty marked refunded and is inactive
      bountyData = await tokenInstance.getBountyData(project_1, bountyId);
      assert.equal(bountyData[4], false);
      assert.equal(bountyData[6], false);
      assert.equal(bountyData[7], true);


      // Account 1 claims refund
      await tokenInstance.refundMyBountyShare(project_1, bountyId, { from: accounts[1] });

      // check transfer ok
      account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 6615 * T_MUL);
      account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 780 * T_MUL);
      account_2_balance = await tokenInstance.balanceOf(accounts[2]);
      assert.equal(account_2_balance.toNumber(), 470 * T_MUL);
      account_3_balance = await tokenInstance.balanceOf(accounts[3]);
      assert.equal(account_3_balance.toNumber(), 135 * T_MUL);
      token_contract_balance = await tokenInstance.balanceOf(RECPM.address);
      assert.equal(token_contract_balance.toNumber(), 0);

      // check lock ok
      account_1_locked_balance = await tokenInstance.bountyLockedBalances(accounts[1]);
      assert.equal(account_1_locked_balance.toNumber(), 0);
      account_2_locked_balance = await tokenInstance.bountyLockedBalances(accounts[2]);
      assert.equal(account_2_locked_balance.toNumber(), 0);

      // check bounty additions refund state updated
      bountyAddition_1_Data = await tokenInstance.getBountyAdditionData(project_1, bountyId, 0);
      assert.equal(bountyAddition_1_Data[1], accounts[1]);
      assert.equal(bountyAddition_1_Data[3], true);

      bountyAddition_2_Data = await tokenInstance.getBountyAdditionData(project_1, bountyId, 1);
      assert.equal(bountyAddition_2_Data[1], accounts[2]);
      assert.equal(bountyAddition_2_Data[3], true);

      // check bounty marked refunded and is inactive
      bountyData = await tokenInstance.getBountyData(project_1, bountyId);
      assert.equal(bountyData[4], false);
      assert.equal(bountyData[6], false);
      assert.equal(bountyData[7], true);
    });

  });

});


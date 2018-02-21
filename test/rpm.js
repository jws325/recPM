const RPM = artifacts.require("./RPM.sol");

const expectRequireFailure = require('./support/expectRequireFailure');


contract('RPM', function (accounts) {

  let tokenInstance;

  before(async function beforeTest() {
    tokenInstance = await RPM.deployed();
  });

  describe('proper instantiation', function () {
    it("ok", async function () {
      let name = await tokenInstance.name();
      assert.equal(name, "RPM");
      let symbol = await tokenInstance.symbol();
      assert.equal(symbol, "RPM");
      let decimals = await tokenInstance.decimals();
      assert.equal(decimals.toNumber(), 6);
      let totalSupply = await tokenInstance.totalSupply();
      assert.equal(totalSupply.toNumber(), 10000 * 10 ** 6);
      let creatorBalance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(creatorBalance.toNumber(), 10000 * 10 ** 6);
    });
  });

  describe('transfer', function () {
    it("transferable to other user", async function () {
      await tokenInstance.transfer(accounts[1], 500 * Math.pow(10, 6), { from: accounts[0] });

      let account_0_balance = await tokenInstance.balanceOf(accounts[0]);
      assert.equal(account_0_balance.toNumber(), 9500 * Math.pow(10, 6));

      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 500 * Math.pow(10, 6));
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
      assert.equal(account_0_balance.toNumber(), 9100 * Math.pow(10, 6));

      let account_1_balance = await tokenInstance.balanceOf(accounts[1]);
      assert.equal(account_1_balance.toNumber(), 900 * Math.pow(10, 6));
    });

    it("cannot transfer more than preapproved", async function () {
      await expectRequireFailure(() => tokenInstance.transferFrom(accounts[0], accounts[1], 600 * Math.pow(10, 6), { from: accounts[1] }));
    });
  });

});
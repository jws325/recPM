import web3Service from './lib/web3Service';
import recpmService from './lib/recpmService';

let web3Data = {};

async function initWeb3() {
  let { web3, networkName } = await web3Service.getWeb3();
  web3Data.web3 = web3;
  web3Data.networkName = networkName;
}

initWeb3().then(() => {
  let web3 = web3Data.web3;
  if (!web3 || !web3.eth.defaultAccount) {
    alert("Metamask not detected");
    return;
  }

  async function refreshBalances() {
    $("#balance").text("Loading ..");
    $("#total-supply").text("Loading ..");
    $("#staked-balance").text("Loading ..");
    $("#total-staked").text("Loading ..");
    $("#bounty-locked-balance").text("Loading ..");
    $("#votes-to-use").text("Loading ..");
    $("#total-upvotes-received-this-week").text("Loading ..");

    try {
      let balances = await recpmService.getBalances(web3);

      $("#balance").text(balances.balance);
      $("#total-supply").text(balances.totalSupply);
      $("#staked-balance").text(balances.stakedBalance);
      $("#total-staked").text(balances.totalStaked);
      $("#bounty-locked-balance").text(balances.bountyLockedBalance);
      $("#votes-to-use").text(balances.votesToUse);
      $("#total-upvotes-received-this-week").text(balances.totalUpvotesReceivedThisWeek);
    }
    catch (err) {
      console.log("refreshBalances err", err.message);
    }
  }

  refreshBalances();

  $("#refresh-balances-button").click(refreshBalances);

  $("#add-project-address-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#add-project-address-address").val();
    try {
      await recpmService.addProjectAddress(web3, projectAddress);
      resultsText = "OK";
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#get-project-addresses-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    try {
      let projectAddresses = await recpmService.getProjectAddresses(web3);
      resultsText = "Project Addresses:\r\n" + JSON.stringify(projectAddresses);
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#stake-tokens-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let amount = parseFloat($("#stake-tokens-amount").val());
    try {
      await recpmService.stakeTokens(web3, amount);
      resultsText = "OK";
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#unstake-tokens-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let amount = parseFloat($("#unstake-tokens-amount").val());
    try {
      await recpmService.unstakeTokens(web3, amount);
      resultsText = "OK";
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#staked-balance-of-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let address = $("#staked-balance-of-address").val();
    try {
      let stakedBalance = await recpmService.stakedBalanceOf(web3, address);
      resultsText = "Staked Balance:\r\n" + stakedBalance;
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#vote-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#vote-project-address").val();
    let votes = parseFloat($("#vote-votes").val());
    try {
      await recpmService.vote(web3, projectAddress, votes);
      resultsText = "OK";
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#votes-per-project-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    try {
      let votesPerProject = await recpmService.getVotesPerProject(web3);
      resultsText = "Votes Per Project:\r\n" + JSON.stringify(votesPerProject);
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#create-bounty-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#create-bounty-project-address").val();
    let amount = parseFloat($("#create-bounty-amount").val());
    let deadlineBlock = parseInt($("#create-bounty-deadline-block").val(), 10);
    try {
      await recpmService.createBounty(web3, projectAddress, amount, deadlineBlock);
      resultsText = "OK";
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#active-bounties-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#active-bounties-project-address").val();
    try {
      let activeBounties = await recpmService.getActiveBounties(web3, projectAddress);
      resultsText = "Active Bounties:\r\n" + JSON.stringify(activeBounties);
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#expired-bounties-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#expired-bounties-project-address").val();
    try {
      let expiredBounties = await recpmService.getExpiredBounties(web3, projectAddress);
      resultsText = "Expired Bounties:\r\n" + JSON.stringify(expiredBounties);
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#add-to-bounty-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#add-to-bounty-project-address").val();
    let bountyId = parseInt($("#add-to-bounty-bounty-id").val(), 10);
    let amount = parseFloat($("#add-to-bounty-amount").val());
    try {
      await recpmService.addToBounty(web3, projectAddress, bountyId, amount);
      resultsText = "OK";
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#create-bounty-claim-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#create-bounty-claim-project-address").val();
    let bountyId = parseInt($("#create-bounty-claim-bounty-id").val(), 10);
    try {
      await recpmService.createBountyClaim(web3, projectAddress, bountyId);
      resultsText = "OK";
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });


  $("#bounty-claims-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#bounty-claims-project-address").val();
    try {
      let bountyClaims = await recpmService.getBountyClaims(web3, projectAddress);
      resultsText = "Bounty Claims:\r\n" + JSON.stringify(bountyClaims);
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#accept-bounty-claim-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#accept-bounty-claim-project-address").val();
    let bountyClaimId = parseInt($("#accept-bounty-claim-bounty-claim-id").val(), 10);
    try {
      await recpmService.acceptBountyClaim(web3, projectAddress, bountyClaimId);
      resultsText = "OK";
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });

  $("#refund-my-bounty-share-button").click(async function () {
    let resultsText;
    let $resultsField = $(this).siblings(".results");

    $resultsField.val("Running Transaction ...");

    let projectAddress = $("#refund-my-bounty-share-project-address").val();
    let bountyId = parseInt($("#refund-my-bounty-share-bounty-id").val(), 10);
    try {
      await recpmService.refundMyBountyShare(web3, projectAddress, bountyId);
      resultsText = "OK";
    }
    catch (err) {
      resultsText = err.message;
    }

    $resultsField.val(resultsText);
  });


});



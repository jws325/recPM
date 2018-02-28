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
    $("#staked-balance").text("Loading ..");
    $("#bounty-locked-balance").text("Loading ..");
    $("#votes-to-use").text("Loading ..");

    try {
      let balances = await recpmService.getBalances(web3);

      $("#balance").text(balances.balance);
      $("#staked-balance").text(balances.stakedBalance);
      $("#bounty-locked-balance").text(balances.bountyLockedBalance);
      $("#votes-to-use").text(balances.votesToUse);
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


});



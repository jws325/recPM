pragma solidity ^0.4.18;

import './zeppelin/SafeMath.sol';
import './zeppelin/PausableToken.sol';

contract RECPM is PausableToken {
  using SafeMath for uint;

  /*
   * Events
   */
  event TokensStaked(address _userAddress, uint _amount);
  event TokensUnstaked(address _userAddress, uint _amount);
  event VotesDistributed(uint _amount);
  event TokensDistributed(uint _amount);
  event PauseVoting();
  event UnpauseVoting();
  event NewBounty(address _projectAddress, uint _bountyId);
  event NewBountyAddition(address _projectAddress, uint _bountyId);
  event NewBountyClaim(address _projectAddress, uint _bountyId, uint _bountyClaimId);
  event BountyClaimAccepted(address _projectAddress, uint _bountyId, uint _bountyClaimId);

  /*
   * Storage
   */

  // Token Info
  string public name = "RECPM";
  string public symbol = "RECPM";
  uint256 public decimals = 6;

  // structures to keep track of token holders
  mapping(address => bool) public holderAddressInitialized;
  address[] public holderAddresses;

  // structures to keep track of project addresses
  mapping(address => bool) public projectAddressInitialized;
  address[] public projectAddresses;

  // staked balance per address
  mapping(address => uint256) public stakedBalances;
  // staked Tokens Staked
  uint public totalStaked;

  /** START Voting Variables **/

  mapping(address => uint) public upvotesReceivedThisWeek;
  uint public totalUpvotesReceivedThisWeek;

  // variables to control distributions pagination
  uint public pageSize = 1000;
  uint public votesDistributionPage;
  uint public tokensDistributionPage;

  uint public lastVotesDistributionTimestamp;
  uint public lastTokensDistributionTimestamp;

  // votes to use
  mapping(address => uint) public votesToUse;

  bool public votingPaused = false;


  /** END Voting Variables **/


  /** START Bounty Variables **/

  struct Bounty {
    // For each project, bountyId will start from 1 and each new bounty will increment by 1.
    uint bountyId;
    address bountyCreator;
    uint bountyAmount;
    uint deadlineBlockNumber;
    bool successfullyClaimed;
    bool refunded;
  }

  struct BountyAddition {
    uint bountyId;
    address adderAddress;
    uint addedBountyAmount;
    bool refunded;
  }

  struct BountyClaim {
    // For each project, bountyClaimId will start from 1 and each new bounty will increment by 1.
    uint bountyClaimId;
    uint bountyId;
    address claimerAddress;
    bool successfulClaim;
  }

  // locked balances per address
  mapping(address => uint256) public bountyLockedBalances;

  // mapping project address => Bounties
  mapping(address => Bounty[]) public bountyMap;
  // mapping project address => Bounty Claims
  mapping(address => BountyClaim[]) public bountyClaimMap;
  // mapping project address => bounty id => Bounty additions
  mapping(address => mapping(uint => BountyAddition[])) public bountyAdditionMap;


  /** END Bounty Variables **/


  /*
   * Modifiers
   */

  /**
   * @dev Modifier to make a function callable only when the voting is not paused.
   */
  modifier whenVotingNotPaused() {
    require(!votingPaused);
    _;
  }

  /**
   * @dev Modifier to make a function callable only when the voting is paused.
   */
  modifier whenVotingPaused() {
    require(votingPaused);
    _;
  }

  /*
   * Functions
   */

  /**
  * @dev Contract constructor
  * @param _totalSupply Initial Token Supply
  */
  function RECPM(uint _totalSupply) public {
    totalSupply = _totalSupply;

    // allocate initial supply to creator
    balances[owner] = totalSupply;
    tryAddHolderAddress(owner);
  }

  /**
   * @dev add project address
   * @param _address Project Address
   */
  function addProjectAddress(address _address) public {
    if (!projectAddressInitialized[_address]) {
      projectAddresses.push(_address);
      projectAddressInitialized[_address] = true;
    }
  }

  /**
   * @dev Stake Tokens
   * @param _amount Amount
   */
  function stakeTokens(uint _amount) public {
    require(_amount > 0);

    // transfer
    transfer(this, _amount);

    // add to staked balance
    increaseStakedBalance(msg.sender, _amount);

    // Log event
    TokensStaked(msg.sender, _amount);
  }

  /**
   * @dev Unstake Tokens
   * @param _amount Amount
   */
  function unstakeTokens(uint _amount) public {
    // check that staked balance is sufficient
    require(stakedBalances[msg.sender].sub(bountyLockedBalances[msg.sender]) >= _amount);

    // remove from staked balance
    decreaseStakedBalance(msg.sender, _amount);

    // transfer tokens from the contract to the user
    balances[msg.sender] = balances[msg.sender].add(_amount);
    balances[this] = balances[this].sub(_amount);
    // Log transfer event
    Transfer(this, msg.sender, _amount);

    // Log unstake event
    TokensUnstaked(msg.sender, _amount);
  }

  /**
   * @dev Increase Staked Balance
   * @param _userAddress User Address
   * @param _amount Amount
   */
  function increaseStakedBalance(address _userAddress, uint _amount) internal {
    // add the tokens to the user's staked balance
    stakedBalances[_userAddress] = stakedBalances[_userAddress].add(_amount);
    // increase total
    totalStaked = totalStaked.add(_amount);
  }

  /**
  * @dev Decrease Staked Balance
  * @param _userAddress User Address
  * @param _amount Amount
  */
  function decreaseStakedBalance(address _userAddress, uint _amount) internal {
    // remove the tokens from the user's staked balance
    stakedBalances[_userAddress] = stakedBalances[_userAddress].sub(_amount);
    // decrease total
    totalStaked = totalStaked.sub(_amount);
  }

  /**
   * @dev Distribute Votes
   * @param _votesToDistribute Amount of votes to distribute
   */
  function distributeVotes(uint _votesToDistribute) external onlyOwner {
    require(_votesToDistribute > 0);
    // 7 days minimum between distributions
    require(now >= lastVotesDistributionTimestamp + 7 days);

    if (votesDistributionPage == 0) {
      // distribution is starting, pause token transfers
      pause();
    }

    uint startingIndex = votesDistributionPage * pageSize;
    uint endingIndex = startingIndex + pageSize;

    for (uint i = startingIndex; i < endingIndex; i++) {
      if (i < holderAddresses.length) {
        address holderAddress = holderAddresses[i];
        votesToUse[holderAddress] = votesToUse[holderAddress].add(stakedBalanceOf(holderAddress).mul(_votesToDistribute).div(totalStaked));
      }
      else {
        //we've updated all of the holder addresses

        // update timestamp;
        lastVotesDistributionTimestamp = now;

        // Log event
        VotesDistributed(_votesToDistribute);

        // Reset the page
        votesDistributionPage = 0;

        // Now we're done distributing the votes for the week
        // distribution is ending, unpause token transfers
        unpause();
        return;
      }
    }

    // if we get here, we increment page and return, then call the function again in the next block to process the next page
    votesDistributionPage = votesDistributionPage.add(1);
  }

  /**
   * @dev Vote
   * @param _projectAddress Project address
   */
  function vote(address _projectAddress) whenVotingNotPaused public {
    require(votesToUse[msg.sender] > 0);
    // check project is in the list
    require(projectAddressInitialized[_projectAddress]);

    // decrease votes available
    votesToUse[msg.sender] = votesToUse[msg.sender].sub(1);

    // count vote in
    upvotesReceivedThisWeek[_projectAddress] = upvotesReceivedThisWeek[_projectAddress].add(1);
    totalUpvotesReceivedThisWeek = totalUpvotesReceivedThisWeek.add(1);
  }

  /**
   * @dev called by the owner to pause voting
   */
  function pauseVoting() onlyOwner whenVotingNotPaused public {
    votingPaused = true;
    PauseVoting();
  }

  /**
   * @dev called by the owner to unpause voting
   */
  function unpauseVoting() onlyOwner whenVotingPaused public {
    votingPaused = false;
    UnpauseVoting();
  }


  /**
   * @dev Distribute Tokens
   * @param _newTokens Amount of tokens to distribute
   */
  function distributeTokens(uint _newTokens) public onlyOwner {
    require(_newTokens > 0);
    require(totalUpvotesReceivedThisWeek > 0);
    // 7 days minimum between distributions
    require(now >= lastTokensDistributionTimestamp + 7 days);

    if (tokensDistributionPage == 0) {
      // distribution is starting, pause token transfers
      pauseVoting();

      // mint tokens to owner
      increaseSupply(_newTokens, owner);
    }

    uint startingIndex = tokensDistributionPage * pageSize;
    uint endingIndex = startingIndex + pageSize;

    for (uint i = startingIndex; i < endingIndex; i++) {
      if (i < projectAddresses.length) {
        address projectAddress = projectAddresses[i];

        uint tokensToTransfer = upvotesReceivedThisWeek[projectAddress].mul(_newTokens).div(totalUpvotesReceivedThisWeek);
        // transfer tokens
        transfer(projectAddress, tokensToTransfer);

        // reset upvotes
        upvotesReceivedThisWeek[projectAddress] = 0;
      }
      else {
        //we've updated all of the projects

        // reset total votes
        totalUpvotesReceivedThisWeek = 0;

        // update timestamp;
        lastTokensDistributionTimestamp = now;

        // Log event
        TokensDistributed(_newTokens);

        // Reset the page
        tokensDistributionPage = 0;

        // Now we're done distributing the votes for the week
        // distribution is ending, unpause voting
        unpauseVoting();
        return;
      }
    }

    // if we get here, we increment page and return, then call the function again in the next block to process the next page
    tokensDistributionPage = tokensDistributionPage.add(1);
  }

  /**
   * @dev Increase Token Supply
   * @param _value amount of tokens
   * @param _to Destination address
   */
  function increaseSupply(uint _value, address _to) private onlyOwner returns (bool) {
    totalSupply = totalSupply.add(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(0, _to, _value);
    return true;
  }

  /**
  * @dev overwrite token transfer function to add holder address to the list
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    // add holder address if necessary
    tryAddHolderAddress(_to);

    return super.transfer(_to, _value);
  }

  /**
   * @dev overwrite token transferFrom function to add holder address to the list
   * @param _to The address to transfer to.
   * @param _value The amount to be transferred.
   */
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    // add holder address if necessary
    tryAddHolderAddress(_to);

    return super.transferFrom(_from, _to, _value);
  }

  /**
   * @dev Add token holder address if necessary
   * @param _address Token holder Address to be added
   */
  function tryAddHolderAddress(address _address) internal {
    // do not add already initialized addresses and the contract's address to the list
    if (!holderAddressInitialized[_address] && _address != address(this)) {
      holderAddresses.push(_address);
      holderAddressInitialized[_address] = true;
    }
  }

  /**
   * @dev Burn tokens
   * @param _value Amount of tokens to burn
   */
  function burn(uint _value) public onlyOwner returns (bool) {
    totalSupply = totalSupply.sub(_value);
    balances[msg.sender] = balances[msg.sender].sub(_value);
    Transfer(msg.sender, 0, _value);
    return true;
  }

  /**
   * @dev Set Page Size (needed in case of block gas limit issues)
   * @param _pageSize Page Size
   */
  function setPageSize(uint _pageSize) public onlyOwner {
    require(_pageSize > 0);
    pageSize = _pageSize;
  }

  /**
   * @dev Create Bounty
   * @param _projectAddress Project Address
   * @param _amount Amount
   * @param _deadlineBlockNumber Deadline Block Number
   */
  function createBounty(address _projectAddress, uint _amount, uint _deadlineBlockNumber) public {
    require(_projectAddress != address(0));
    require(_amount > 0);
    // check deadline is in the future
    require(_deadlineBlockNumber > block.number);
    // check sender's balance is sufficient
    require(balanceOf(msg.sender) >= _amount);

    // lock and stake the tokens
    lockAndStakeForBounty(_amount);

    uint bountyId = getNextBountyId(_projectAddress);
    bountyMap[_projectAddress].push(Bounty(bountyId, msg.sender, _amount, _deadlineBlockNumber, false, false));

    NewBounty(_projectAddress, bountyId);
  }

  /**
   * @dev Lock tokens tokens and stake them for bounty
   * @param _amount Amount
   */
  function lockAndStakeForBounty(uint _amount) internal {
    // lock
    bountyLockedBalances[msg.sender] = bountyLockedBalances[msg.sender].add(_amount);
    // stake
    stakeTokens(_amount);
  }

  /**
   * @dev Add to Bounty
   * @param _projectAddress Project Address
   * @param _bountyId Bounty Id
   * @param _amount Amount
   */
  function addToBounty(address _projectAddress, uint _bountyId, uint _amount) public {
    require(_projectAddress != address(0));
    require(_amount > 0);
    // check sender's balance is sufficient
    require(balanceOf(msg.sender) >= _amount);
    // check bounty not claimed
    require(!bountyMap[_projectAddress][_bountyId - 1].successfullyClaimed);
    // check bounty not expired
    require(bountyMap[_projectAddress][_bountyId - 1].deadlineBlockNumber > block.number);

    // lock and stake the tokens
    lockAndStakeForBounty(_amount);

    bountyAdditionMap[_projectAddress][_bountyId - 1].push(BountyAddition(_bountyId, msg.sender, _amount, false));

    NewBountyAddition(_projectAddress, _bountyId);
  }

  /**
   * @dev Create Bounty Claim
   * @param _projectAddress Project Address
   * @param _bountyId Bounty Id
   */
  function createBountyClaim(address _projectAddress, uint _bountyId) public {
    // check bounty not claimed
    require(!bountyMap[_projectAddress][_bountyId - 1].successfullyClaimed);
    // check bounty not expired
    require(bountyMap[_projectAddress][_bountyId - 1].deadlineBlockNumber > block.number);

    // save bounty claim
    uint bountyClaimId = getNextBountyClaimId(_projectAddress);
    bountyClaimMap[_projectAddress].push(BountyClaim(bountyClaimId, _bountyId, msg.sender, false));

    // log event
    NewBountyClaim(_projectAddress, _bountyId, bountyClaimId);
  }

  /**
   * @dev Accept Bounty Claim
   * @param _projectAddress Project Address
   * @param _bountyClaimId Bounty Claim Id
   */
  function acceptBountyClaim(address _projectAddress, uint _bountyClaimId) public {
    require(_projectAddress != address(0));

    BountyClaim storage bountyClaim = bountyClaimMap[_projectAddress][_bountyClaimId - 1];
    Bounty storage bounty = bountyMap[_projectAddress][bountyClaim.bountyId - 1];

    // check bounty not claimed
    require(!bounty.successfullyClaimed);
    // check bounty not expired
    require(bounty.deadlineBlockNumber > block.number);
    // check sender is creator
    require(bounty.bountyCreator == msg.sender);

    // unlock main bounty tokens
    bountyLockedBalances[bounty.bountyCreator] = bountyLockedBalances[bounty.bountyCreator].sub(bounty.bountyAmount);
    // remove from staked balance
    decreaseStakedBalance(bounty.bountyCreator, bounty.bountyAmount);
    // Log unstake event
    TokensUnstaked(bounty.bountyCreator, bounty.bountyAmount);
    // transfer main bounty tokens
    balances[this] = balances[this].sub(bounty.bountyAmount);
    balances[bountyClaim.claimerAddress] = balances[bountyClaim.claimerAddress].add(bounty.bountyAmount.mul(9).div(10));
    balances[owner] = balances[owner].add(bounty.bountyAmount.mul(1).div(10));

    uint amountToClaimer = bounty.bountyAmount.mul(9).div(10);
    uint amountToOwner = bounty.bountyAmount.mul(1).div(10);

    // transfer bounty additions
    for (uint i = 0; i < bountyAdditionMap[_projectAddress][bountyClaim.bountyId - 1].length; i++) {
      BountyAddition memory bountyAddition = bountyAdditionMap[_projectAddress][bountyClaim.bountyId - 1][i];

      // unlock
      bountyLockedBalances[bountyAddition.adderAddress] = bountyLockedBalances[bountyAddition.adderAddress].sub(bountyAddition.addedBountyAmount);
      // remove from staked balance
      decreaseStakedBalance(bountyAddition.adderAddress, bountyAddition.addedBountyAmount);
      // Log unstake event
      TokensUnstaked(bountyAddition.adderAddress, bountyAddition.addedBountyAmount);
      // transfer
      balances[this] = balances[this].sub(bountyAddition.addedBountyAmount);
      balances[bountyClaim.claimerAddress] = balances[bountyClaim.claimerAddress].add(bountyAddition.addedBountyAmount.mul(9).div(10));
      balances[owner] = balances[owner].add(bountyAddition.addedBountyAmount.mul(1).div(10));

      amountToClaimer = amountToClaimer.add(bountyAddition.addedBountyAmount.mul(9).div(10));
      amountToOwner = amountToClaimer.add(bountyAddition.addedBountyAmount.mul(1).div(10));
    }

    // log transfer
    Transfer(this, bountyClaim.claimerAddress, amountToClaimer);
    Transfer(this, owner, amountToOwner);

    // mark as claimed
    bounty.successfullyClaimed = true;
    bountyClaim.successfulClaim = true;

    // log event
    BountyClaimAccepted(_projectAddress, bountyClaim.bountyId, bountyClaim.bountyClaimId);
  }

  /**
   * @dev Refund share of Bounty to the sender
   * @param _projectAddress Project Address
   * @param _bountyId Bounty Id
   */
  function refundMyBountyShare(address _projectAddress, uint _bountyId) public {
    require(_projectAddress != address(0));

    Bounty storage bounty = bountyMap[_projectAddress][_bountyId - 1];

    // check bounty not claimed
    require(!bounty.successfullyClaimed);
    // check bounty expired
    require(bounty.deadlineBlockNumber <= block.number);

    uint amountRefunded = 0;

    // refund bounty if sender is creator and share wasn't already refunded
    if (bounty.bountyCreator == msg.sender && !bounty.refunded) {
      // unlock main bounty tokens
      bountyLockedBalances[msg.sender] = bountyLockedBalances[msg.sender].sub(bounty.bountyAmount);
      // remove from staked balance
      decreaseStakedBalance(msg.sender, bounty.bountyAmount);
      // transfer main bounty tokens
      balances[this] = balances[this].sub(bounty.bountyAmount);
      balances[msg.sender] = balances[msg.sender].add(bounty.bountyAmount);

      // mark as refunded
      bounty.refunded = true;

      // add to total refunded
      amountRefunded = amountRefunded.add(bounty.bountyAmount);
    }

    // check bounty additions
    for (uint i = 0; i < bountyAdditionMap[_projectAddress][_bountyId - 1].length; i++) {
      BountyAddition storage bountyAddition = bountyAdditionMap[_projectAddress][_bountyId - 1][i];

      // refund bounty addition if sender is creator
      if (bountyAddition.adderAddress == msg.sender && !bountyAddition.refunded) {
        // unlock
        bountyLockedBalances[msg.sender] = bountyLockedBalances[msg.sender].sub(bountyAddition.addedBountyAmount);
        // remove from staked balance
        decreaseStakedBalance(msg.sender, bountyAddition.addedBountyAmount);
        // transfer
        balances[this] = balances[this].sub(bountyAddition.addedBountyAmount);
        balances[msg.sender] = balances[msg.sender].add(bountyAddition.addedBountyAmount);

        // mark as refunded
        bountyAddition.refunded = true;

        // add to total refunded
        amountRefunded = amountRefunded.add(bountyAddition.addedBountyAmount);
      }
    }

    // fail if nothing to refund
    require(amountRefunded > 0);

    // log events
    Transfer(this, msg.sender, amountRefunded);
    TokensUnstaked(msg.sender, amountRefunded);
  }

  /**
   * @dev Get Next Bounty Id
   * @param _projectAddress Project Address
   */
  function getNextBountyId(address _projectAddress) public constant returns (uint) {
    return getBountiesLength(_projectAddress).add(1);
  }

  /**
   * @dev Get Next Bounty Claim Id
   * @param _projectAddress Project Address
   */
  function getNextBountyClaimId(address _projectAddress) public constant returns (uint) {
    return getBountyClaimsLength(_projectAddress).add(1);
  }

  /**
   * @dev Get Bounty Data
   * @param _projectAddress Project Address
   * @param _bountyId Bounty ID
   */
  function getBountyData(address _projectAddress, uint _bountyId) public constant
  returns (uint, address, uint, uint, bool, uint, bool, bool) {
    Bounty memory bounty = bountyMap[_projectAddress][_bountyId - 1];

    uint totalBountyAmount = getTotalBountyAmount(_projectAddress, _bountyId);

    return (bounty.bountyId, bounty.bountyCreator, bounty.bountyAmount, bounty.deadlineBlockNumber, bounty.successfullyClaimed,
    totalBountyAmount, !bounty.successfullyClaimed && bounty.deadlineBlockNumber > block.number, bounty.refunded);
  }

  /**
   * @dev Get Total bounty amount
   * @param _projectAddress Project Address
   * @param _bountyId Bounty ID
   */
  function getTotalBountyAmount(address _projectAddress, uint _bountyId) public constant
  returns (uint) {
    uint totalBountyAmount = bountyMap[_projectAddress][_bountyId - 1].bountyAmount;

    for (uint i = 0; i < bountyAdditionMap[_projectAddress][_bountyId - 1].length; i++) {
      totalBountyAmount = totalBountyAmount.add(bountyAdditionMap[_projectAddress][_bountyId - 1][i].addedBountyAmount);
    }

    return (totalBountyAmount);
  }

  /**
   * @dev Get Bounty Addition Data
   * @param _projectAddress Project Address
   * @param _bountyId Bounty ID
   * @param _index Bounty Addition index
   */
  function getBountyAdditionData(address _projectAddress, uint _bountyId, uint _index) public constant
  returns (uint, address, uint, bool){
    BountyAddition memory bountyAddition = bountyAdditionMap[_projectAddress][_bountyId - 1][_index];

    return (bountyAddition.bountyId, bountyAddition.adderAddress, bountyAddition.addedBountyAmount, bountyAddition.refunded);
  }

  /**
   * @dev Get Bounty Claim Data
   * @param _projectAddress Project Address
   * @param _bountyClaimId Bounty claim Id
   */
  function getBountyClaimData(address _projectAddress, uint _bountyClaimId) public constant
  returns (uint, uint, address, bool){
    BountyClaim memory bountyClaim = bountyClaimMap[_projectAddress][_bountyClaimId - 1];

    return (bountyClaim.bountyClaimId, bountyClaim.bountyId, bountyClaim.claimerAddress, bountyClaim.successfulClaim);
  }

  /**
   * @dev Get Number of Bounties for a project
   * @param _projectAddress Project Address
   */
  function getBountiesLength(address _projectAddress) public constant returns (uint) {
    return bountyMap[_projectAddress].length;
  }

  /**
   * @dev Get Number of Bounties for a project
   * @param _projectAddress Project Address
   * @param _bountyId Bounty ID
   */
  function getBountyAdditionsLength(address _projectAddress, uint _bountyId) public constant returns (uint) {
    return bountyAdditionMap[_projectAddress][_bountyId - 1].length;
  }


  /**
   * @dev Get Number of Bounties for a project
   * @param _projectAddress Project Address
   */
  function getBountyClaimsLength(address _projectAddress) public constant returns (uint) {
    return bountyClaimMap[_projectAddress].length;
  }

  /**
   * @dev Gets the staked balance of the specified address.
   * @param _userAddress The address to query the the balance of.
   */
  function stakedBalanceOf(address _userAddress) public constant returns (uint balance) {
    return stakedBalances[_userAddress];
  }

}
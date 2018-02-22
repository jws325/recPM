pragma solidity ^0.4.18;

import './zeppelin/SafeMath.sol';
import './zeppelin/StandardToken.sol';
import './zeppelin/Ownable.sol';

contract RECPM is StandardToken, Ownable {
  using SafeMath for uint;

  /*
   * Events
   */
  event VotesDistributed(uint _amount);
  event TokensDistributed(uint _amount);

  /*
   * Storage
   */

  string public name = "RECPM";
  string public symbol = "RECPM";
  uint256 public decimals = 6;

  // structures to keep track of token holders
  mapping(address => bool) public holderAddressInitialized;
  address[] public holderAddresses;

  mapping(address => uint) public upvotesReceivedThisWeek;

  // structures to keep track of project addresses
  mapping(address => bool) public projectAddressInitialized;
  address[] public projectAddresses;

  uint public totalUpvotesReceivedThisWeek;

  uint public lastVotesDistributionTimestamp;
  uint public lastTokensDistributionTimestamp;

  // votes to use
  mapping(address => uint) public votesToUse;

  /*
   * Public functions
   */

  /**
  * @dev Contract constructor
  * @param _totalSupply Initial Token Supply
  */
  function RECPM(uint256 _totalSupply) public {
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
   * @dev Distribute Votes
   * @param _votesToDistribute Amount of votes to distribute
   */
  function distributeVotes(uint _votesToDistribute) external onlyOwner {
    require(_votesToDistribute > 0);
    // 7 days minimum between distributions
    require(now >= lastVotesDistributionTimestamp + 7 days);

    for (uint i = 0; i < holderAddresses.length; i++) {
      address holderAddress = holderAddresses[i];
      votesToUse[holderAddress] = votesToUse[holderAddress].add(balanceOf(holderAddress).mul(_votesToDistribute).div(totalSupply));
    }

    // update timestamp;
    lastVotesDistributionTimestamp = now;

    // Log event
    VotesDistributed(_votesToDistribute);
  }

  /**
   * @dev Vote
   * @param _projectAddress Project address
   */
  function vote(address _projectAddress) public {
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
   * @dev Distribute Tokens
   * @param _newTokens Amount of tokens to distribute
   */
  function distributeTokens(uint _newTokens) public onlyOwner {
    require(_newTokens > 0);
    require(totalUpvotesReceivedThisWeek > 0);
    // 7 days minimum between distributions
    require(now >= lastTokensDistributionTimestamp + 7 days);

    uint previousOwnerBalance = balanceOf(owner);

    // mint tokens to owner
    increaseSupply(_newTokens, owner);

    for (uint i = 0; i < projectAddresses.length; i++) {
      address projectAddress = projectAddresses[i];
      uint tokensToTransfer = upvotesReceivedThisWeek[projectAddress].mul(_newTokens).div(totalUpvotesReceivedThisWeek);
      transfer(projectAddress, tokensToTransfer);
      upvotesReceivedThisWeek[projectAddress] = 0;
    }

    // reset total votes
    totalUpvotesReceivedThisWeek = 0;
    // update timestamp;
    lastTokensDistributionTimestamp = now;

    // make sure we didn't redistribute more tokens than created
    assert(balanceOf(owner) >= previousOwnerBalance);

    // Log event
    TokensDistributed(_newTokens);
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
    if (!holderAddressInitialized[_address]) {
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

}
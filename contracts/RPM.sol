pragma solidity ^0.4.18;

import './zeppelin/SafeMath.sol';
import './zeppelin/StandardToken.sol';
import './zeppelin/Ownable.sol';

contract RPM is StandardToken, Ownable {
  using SafeMath for uint;

  /*
   * Storage
   */

  string public name = "RPM";
  string public symbol = "RPM";
  uint256 public decimals = 6;

  // structures to keep track of token holders
  mapping(address => bool) holderAddressInitialized;
  address[] public holderAddresses;

  uint256 public nextTokenDistribution;
  uint256 public nextVoteDistribution;

  // Project votes
  mapping(address => uint) public projects;
  address[] public projectKeys;
  uint256 public totalVotesReceived;

  //vote balance
  mapping(address => uint256) votesToUse;

  /*
   * Public functions
   */

  /**
  * @dev Contract constructor
  * @param _totalSupply Initial Token Supply
  * @param _nextTokenDistribution First Allowed Token Distribution
  * @param _nextVoteDistribution First Allowed Vote Distribution
  */

  function RPM(uint256 _totalSupply, uint256 _nextTokenDistribution, uint256 _nextVoteDistribution) public {
    totalSupply = _totalSupply;

    nextTokenDistribution = _nextTokenDistribution;
    nextVoteDistribution = _nextVoteDistribution;

    // allocate initial supply to creator
    balances[owner] = totalSupply;
    tryAddHolderAddress(owner);
  }

  function distributeTokens(uint _amount) external onlyOwner returns (bool) {
    require(_amount > 0);
    require(canDistributeTokens());

    //Set back to false to stop double
    nextTokenDistribution += 7 * 24 * 60 * 60;

    for (uint i = 0; i < projectKeys.length; i++) {
      address project = projectKeys[i];
      balances[project] += getProjectTokens(project);
    }

    totalVotesReceived = 0;
    return true;
  }

  function distributeVotes(uint _amount) external onlyOwner returns (bool) {
    require(_amount > 0);
    require(canDistributeVotes());

    //Set back to false to stop double
    nextVoteDistribution += 7 * 24 * 60 * 60;

    for (uint i = 0; i < holderAddresses.length; i++) {
      address holder = holderAddresses[i];
      votesToUse[holder] += getHoldersVoteAllocation(holder).mul(_amount);
    }

    return true;
  }

  function vote(address _address, uint _amount) public {
    require(votesToUse[msg.sender] >= _amount);

    votesToUse[msg.sender] -= _amount;
    projects[_address] += _amount;

    totalVotesReceived++;
  }

  function canDistributeTokens() public constant returns (bool) {
    require(now > nextTokenDistribution);
    return true;
  }

  function canDistributeVotes() public constant returns (bool) {
    require(now > nextVoteDistribution);
    return true;
  }

  // Get rpm holders voting shares allocation
  function getHoldersVoteAllocation(address _owner) public constant returns (uint256) {
    uint256 rpmx = balances[_owner];
    uint256 vwx = rpmx.div(totalSupply);
    return vwx;
  }

  // Get rpm tokens for a project
  function getProjectTokens(address _project) public constant returns (uint) {
    require(balances[_project] > 0);

    uint256 uwX = votesToUse[_project].div(totalVotesReceived);
    return uwX;
  }

  // Vote balances
  function voteBalanceOf(address addr) public constant returns (uint) {
    return votesToUse[addr];
  }

  function projectVotes(address addr) public constant returns (uint) {
    return projects[addr];
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

  function burn(uint _amount) public onlyOwner {
    require(balanceOf(owner) >= _amount);

    balances[owner] = balances[owner].sub(_amount);
  }

}
pragma solidity ^0.4.18;

// https://github.com/OpenZeppelin/zeppelin-solidity/blob/4d263b7fc32b6690cd2275081624eba03ac73f19/contracts/token/ERC20Basic.sol
/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  uint256 public totalSupply;
  function balanceOf(address who) public view returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}
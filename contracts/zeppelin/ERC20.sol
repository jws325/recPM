pragma solidity ^0.4.18;


import "./ERC20Basic.sol";

// https://github.com/OpenZeppelin/zeppelin-solidity/blob/4d263b7fc32b6690cd2275081624eba03ac73f19/contracts/token/ERC20.sol
/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender) public view returns (uint256);
  function transferFrom(address from, address to, uint256 value) public returns (bool);
  function approve(address spender, uint256 value) public returns (bool);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}
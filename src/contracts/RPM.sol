pragma solidity ^0.4.18;

//import "./ERC20.sol";
import "./SafeMath.sol";

contract RPM {
    using SafeMath for uint;

    struct Bounty {
        uint bountyId;  // bountyId will start from 1 and each new bounty will increment by 1.
        address bountyCreator;  // msg.sender
        uint bountyAmount;
        uint256 lodgedDate;
        uint deadlineBlockNumber;
        bool successfullyClaimed;  // starts as false
    }

    struct BountyAddition {
        address adderAddress;  // msg.sender
        uint addedBountyAmount;
        uint256 lodgedDate;
    }

    struct BountyClaim {
        address claimerAddress;
        bool successfulClaim;
        uint256 lodgedDate;
    }

    string public name = "RPM";
    string public symbol = "RPM";
    uint256 public decimals = 6;
    uint256 public totalSupply;

    mapping (address => uint256) balances;
    mapping (address => uint256) votesToUse; //vote balance
    mapping (address => mapping (address => uint256)) allowed;

    address[] public holderKeys; //make private after testing
    
    address private owner;
    uint256 public nextTokenDistribution;
    uint256 public nextVoteDistribution;

    uint256 public totalVotesRecevied;

    // Project votes
    mapping (address => uint) public projects;
    address[] public projectKeys;

    mapping(address => Bounty[]) bountyMap;
    address[] public bountyIndexes;

    mapping(uint => BountyAddition[]) bountyAdditionMap; //uint is bounty id
    mapping(uint => BountyClaim[]) bountyClaimMap; //uint is bounty id

    uint public bountyCount;

    // Token balance
    function balanceOf(address addr) public constant returns (uint) {
		return balances[addr];
	}

    // Vote balances
    function voteBalanceOf(address addr) public constant returns (uint) {
		return votesToUse[addr];
	}

    function projectVotes(address addr) public constant returns (uint) {
		return projects[addr];
	}

    function RPM(uint256 _totalSupply, uint256 _nextTokenDistribution, uint256 _nextVoteDistribution) public {
        owner = msg.sender;
        totalSupply = _totalSupply;

        balances[msg.sender] = totalSupply * (10 ** decimals);
        nextTokenDistribution = _nextTokenDistribution;
        nextVoteDistribution = _nextVoteDistribution;
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

        totalVotesRecevied = 0;
        return true;
    }

    function distributeVotes(uint _amount) external onlyOwner returns (bool) {
        require(_amount > 0);
        require(canDistributeVotes());

        //Set back to false to stop double
        nextVoteDistribution += 7 * 24 * 60 * 60;

        for (uint i = 0; i < holderKeys.length; i++) {
            address holder = holderKeys[i];
            votesToUse[holder] += getHoldersVoteAllocation(holder).mul(_amount).div(10 ** decimals);
        }

        return true;
    }

    function vote(address _address, uint _amount) public {
        require(votesToUse[msg.sender] >= _amount);

        votesToUse[msg.sender] -= _amount;
        projects[_address] += _amount;

        totalVotesRecevied++;
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

        uint256 uwX = votesToUse[_project].div(totalVotesRecevied);
        return uwX;
    }

    //ERC20 functions
    function transfer(address _to, uint _value) public returns (bool) {
        require(_to != address(0));

        balances[msg.sender] = balances[msg.sender].sub(_value * 10 ** decimals);
        balances[_to] = balances[_to].add(_value * 10 ** decimals);
        
        //Iterate all holders and add new ones
        bool inArray = false;
        for (uint i = 0; i < holderKeys.length; i++) {
            address holder = holderKeys[i];

            if (holder == _to) {
                inArray = true;
                break;
            }
        }

        if (inArray == false) {
            holderKeys.push(_to);
        }
        
        Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint _amount) public returns (bool success) {
        if (balances[_from] >= _amount && allowed[_from][msg.sender] >= _amount && _amount > 0 && balances[_to] + _amount > balances[_to]) {

            balances[_from] = balances[_from].sub(_amount * 10 ** decimals);
            allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_amount * 10 ** decimals);
            balances[_to] = balances[_to].add(_amount * 10 ** decimals);

            return true;
        } else {
            return false;
        }
    }

    function approve(address _spender, uint _amount) public returns (bool success) {
        allowed[msg.sender][_spender] = _amount * 10 ** decimals;
        return true;
    }

    function allowance(address _owner, address _spender) public constant returns (uint remaining) {
        return allowed[_owner][_spender];
    }

    function burn(uint _amount) public {
        require(msg.sender == owner);
        require(balanceOf(owner) >= _amount);

        balances[owner] = balances[owner].sub(_amount);
    }

    function getHour(uint timestamp) pure internal returns (uint8) {
        return uint8((timestamp / 60 / 60) % 24);
    }

    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint _value);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
}
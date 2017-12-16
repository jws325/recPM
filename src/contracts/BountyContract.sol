pragma solidity ^0.4.18;

import "./RPM.sol";

contract BountyContract is RPM {

    function BountyContract() RPM(0, 0, 0) public {
    }

    function createBounty(address _projectAddress, uint _amount, uint _deadlineBlockNumber) public {
        require(_projectAddress != address(0));
        require(_amount > 0);
        require(_deadlineBlockNumber > 0);

        uint bountyId = getNextBountyId();

        if (bountyId > 0) {
            bountyMap[_projectAddress][bountyId] = Bounty(bountyId, msg.sender, _amount, now, _deadlineBlockNumber, false);
            bountyIndexes[bountyId] = _projectAddress;
            bountyCount ++;
        }
    }

    function addToBounty(address _projectAddress, uint _bountyId, uint _amount) public {
        require(_projectAddress != address(0));
        require(_amount > 0);

        require(bountyMap[_projectAddress][_bountyId].successfullyClaimed != true);
        require(bountyMap[_projectAddress][_bountyId].deadlineBlockNumber < now);

        require(balanceOf(msg.sender) >= _amount);

        BountyAddition memory bountyAddtion = BountyAddition(msg.sender, _amount, now);
        bountyAdditionMap[_bountyId].push(bountyAddtion);
    }

    function getActiveBounties(address _projectAddress) public returns (Bounty[]) {
        require(_projectAddress != address(0));
        Bounty[] storage activeBounties;

        for (uint256 i = 0; i < bountyMap[_projectAddress].length; i++) {
            uint bountyId = bountyMap[_projectAddress][i].bountyId;

            if (bountyMap[_projectAddress][i].successfullyClaimed != true && bountyMap[_projectAddress][i].deadlineBlockNumber > now) {
                
                address bountyCreator = bountyMap[_projectAddress][i].bountyCreator;
                uint amount = bountyMap[_projectAddress][i].bountyAmount;
                uint256 lodgedDate = bountyMap[_projectAddress][i].lodgedDate;
                uint deadlineBlockNumber = bountyMap[_projectAddress][i].deadlineBlockNumber;

                for (uint256 j = 0; j < bountyAdditionMap[bountyId].length; j++) {
                    amount += bountyAdditionMap[bountyId][j].addedBountyAmount;
                }

                Bounty memory newBounty = Bounty(bountyId, bountyCreator, amount, lodgedDate, deadlineBlockNumber, false);
                activeBounties.push(newBounty);
            }
        }

        return activeBounties;
    }

    function createBountyClaim(uint _bountyId) public {
        bountyClaimMap[_bountyId].push(BountyClaim(msg.sender, false, now));
    }

    function acceptBountyClaim(address _projectAddress, uint _bountyId, uint _bountyClaimId) public {
        require(_projectAddress != address(0));
        Bounty storage bounty = bountyMap[_projectAddress][_bountyId];

        //Maybe make modifier
        require(bounty.bountyCreator == msg.sender);

        bounty.successfullyClaimed = true;
        BountyClaim[] storage bountyClaim = bountyClaimMap[_bountyId];
        bountyClaim[_bountyClaimId].successfulClaim = true;

        //send tokens
        uint amount = bounty.bountyAmount;
        bounty.bountyAmount = 0; //Review

        //Get all additional bounties too
        for (uint i = 0; i < bountyAdditionMap[_bountyId].length; i++) {
            amount += bountyAdditionMap[_bountyId][i].addedBountyAmount;
            bountyAdditionMap[_bountyId][i].addedBountyAmount = 0; //Review
        }

        address claimerAddress = bountyClaim[_bountyClaimId].claimerAddress;
        balances[claimerAddress] += amount;
    }

    function refundBounty(address _projectAddress, uint _bountyId) public {
        require(_projectAddress != address(0));
        Bounty storage bounty = bountyMap[_projectAddress][_bountyId];

        require(bounty.bountyCreator == msg.sender);
        require(bounty.successfullyClaimed == false);
        require(bounty.deadlineBlockNumber > now);

        uint amount = bounty.bountyAmount;
        bounty.bountyAmount = 0;

        balances[bounty.bountyCreator] = balances[bounty.bountyCreator].add(amount);

        //Refund all additional bounties too
        for (uint i = 0; i < bountyAdditionMap[_bountyId].length; i++) {
            amount += bountyAdditionMap[_bountyId][i].addedBountyAmount;
            bountyAdditionMap[_bountyId][i].addedBountyAmount = 0; //Review
        }
    }

    function getNextBountyId() public constant returns (uint) {
        return bountyCount + 1;
    }

    function getNextAdditionalBountyId(uint _bountyId) public constant returns (uint) {
        return bountyAdditionMap[_bountyId].length + 1;
    }

    function getNextBountyClaimId(uint _bountyId) public constant returns (uint) {
        return bountyClaimMap[_bountyId].length + 1;
    }
}
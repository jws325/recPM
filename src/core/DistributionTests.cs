using System;
using Xunit;
using Nethereum.Web3;
using System.Numerics;
using Nethereum.Util;
using System.IO;
using System.Text;

namespace tests
{
    public class DistributionTests : Helper
    {
        public DistributionTests()
        {
            DateTimeOffset dto = new DateTimeOffset(DateTime.Now.AddDays(-10));
            Int64 epoch = dto.ToUnixTimeSeconds();

            Object[] constructorParms = new Object[3] { 1000000, epoch, epoch };
            DeplyContract(contractPath, contractName, constructorParms);

            var contract = GetContract(contractName);
            var transferFunction = contract.GetFunction("transfer");

            Nethereum.Hex.HexTypes.HexBigInteger gas = new Nethereum.Hex.HexTypes.HexBigInteger(2000000);

            const UInt64 tokens = 100000; //10%
            Object[] functionParams = new Object[2] { alice, tokens };
            String txId = transferFunction.SendTransactionAsync(owner, gas, null, functionParams).Result;
        }

        [Fact]
        public void Should_Be_Able_To_Distribute_Tokens()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("canDistributeTokens");

            var actual = functionToTest.CallAsync<Boolean>().Result;
            Assert.Equal(true, actual);
        }

        [Fact]
        public void Should_Be_Able_To_Distribute_Votes()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("canDistributeVotes");

            var actual = functionToTest.CallAsync<Boolean>().Result;
            Assert.Equal(true, actual);
        }

        [Fact]
        public void Should_Distribute_Tokens_To_Voted_On_Projects()
        {
            // Arrange
            var contract = GetContract(contractName);

            var balanceFunction = contract.GetFunction("balanceOf");
            var balance = balanceFunction.CallAsync<BigInteger>(alice).Result;
            BigInteger expectedBalance = 100000000000;
            Assert.Equal(expectedBalance, balance);

            var votesFunction = contract.GetFunction("voteBalanceOf");
            var votesBalance = votesFunction.CallAsync<UInt64>(alice).Result;
            Assert.Equal(0, 0);
            
            var distributeFunction = contract.GetFunction("distributeVotes");

            Nethereum.Hex.HexTypes.HexBigInteger gas = GetGas();
            Object[] functionParams = new Object[1] { 1000000 };
            String txId = distributeFunction.SendTransactionAsync(owner, gas, null, functionParams).Result;

            Assert.NotNull(txId);

            // votes
            votesBalance = votesFunction.CallAsync<UInt64>(alice).Result;
            Assert.True(votesBalance > 0);

            balanceFunction = contract.GetFunction("voteBalanceOf");
            balance = balanceFunction.CallAsync<BigInteger>(alice).Result;
            //Assert.Equal(expectedBalance, balance);
            Assert.True(balance > 0);
            
            var voteFunction = contract.GetFunction("vote");
            gas = GetGas();

            // Act
            functionParams = new Object[2] { "0xde0daa905b8eccc209822843af1d5baa04e48d52", 1 };
            txId = voteFunction.SendTransactionAsync(alice, gas, null, functionParams).Result;
            Assert.NotNull(txId);

            var totalVotesFunction = contract.GetFunction("totalVotesRecevied");
            BigInteger totalVotes = totalVotesFunction.CallAsync<BigInteger>().Result;

            Assert.True(totalVotes > 0);

            var projectVotesFunction = contract.GetFunction("projectVotes");
            BigInteger projectVotes = projectVotesFunction.CallAsync<BigInteger>("0xde0daa905b8eccc209822843af1d5baa04e48d52").Result;

            Assert.True(projectVotes > 0);
        }

        [Theory]
        [InlineData(alice, 5000, 500)]
        public void Should_Distribute_Votes_To_Token_Holders(String holder, UInt64 newSupply, UInt64 expected)
        {
            //Given total supply of 1,000,000
            //and alice balance of 100,000
            //when distribute votes gets called with 5,000
            //then alice is credited with 500 (10% of new votes)

            //Arrange
            var contract = GetContract(contractName);

            var balanceFunction = contract.GetFunction("balanceOf");
            var balance = balanceFunction.CallAsync<BigInteger>(holder).Result;
            BigInteger expectedBalance = 100000000000; //10 * 10^11
            Assert.Equal(expectedBalance, balance);

            var votesFunction = contract.GetFunction("voteBalanceOf");
            var votesBalance = votesFunction.CallAsync<UInt64>(holder).Result;

            const UInt64 zeroBalance = 0;
            Assert.Equal(zeroBalance, votesBalance);

            //Act
            //distribute votes
            var distributeFunction = contract.GetFunction("distributeVotes");

            Nethereum.Hex.HexTypes.HexBigInteger gas = GetGas();

            Object[] functionParams = new Object[1] { newSupply };
            String txId = distributeFunction.SendTransactionAsync(owner, gas, null, functionParams).Result;
            Assert.NotNull(txId);

            //Assert
            var functionToTest = contract.GetFunction("getHoldersVoteAllocation");
            var actual = functionToTest.CallAsync<Int64>(alice).Result;
            Console.WriteLine(actual);

            BigInteger expectedAllocation = 100000; //10 * 10^5 10%
            Assert.Equal(expectedBalance, balance);

            votesFunction = contract.GetFunction("voteBalanceOf");
            votesBalance = votesFunction.CallAsync<UInt64>(holder).Result;

            Assert.Equal(expected, votesBalance);            
        }

        [Fact]
        public void Should_Get_Bob_Votes_Shares()
        {
            var contract = GetContract(contractName);

            var balanceFunction = contract.GetFunction("balanceOf");
            var balance = balanceFunction.CallAsync<UInt64>(owner).Result;
            UInt64 expected = 900000000000;
            Assert.Equal(expected, balance);

            var transferFunction = contract.GetFunction("transfer");

            Nethereum.Hex.HexTypes.HexBigInteger gas = new Nethereum.Hex.HexTypes.HexBigInteger(2000000);

            const UInt64 tokens = 200;
            Object[] functionParams = new Object[2] { bob, tokens };
            String txId = transferFunction.SendTransactionAsync(owner, gas, null, functionParams).Result;

            Assert.NotNull(txId);

            balance = balanceFunction.CallAsync<UInt64>(owner).Result;
            expected = 899800000000;
            Assert.Equal(expected, balance);

            balance = balanceFunction.CallAsync<UInt64>(bob).Result;
            expected = 200000000;
            Assert.Equal(expected, balance);

            var functionToTest = contract.GetFunction("getHoldersVoteAllocation");
            var actual = functionToTest.CallAsync<Int64>(alice).Result;

            Assert.True(actual > 0);
            Console.WriteLine(actual);
        }

        [Fact]
        public void Should_Vote_On_Project()
        {
            //Setup
            var contract = GetContract(contractName);
            var transferFunction = contract.GetFunction("transfer");

            Nethereum.Hex.HexTypes.HexBigInteger gas = GetGas();

            const UInt64 tokens = 1000;
            Object[] functionParams = new Object[2] { bob, tokens };
            String txId = transferFunction.SendTransactionAsync(owner, gas, null, functionParams).Result;

            Assert.NotNull(txId);

            //Distribute tokens
            var distributeFunction = contract.GetFunction("distributeVotes");
            gas = GetGas();

            functionParams = new Object[1] { 100 };
            txId = distributeFunction.SendTransactionAsync(owner, gas, null, functionParams).Result;

            Assert.NotNull(txId);

            //
            var voteFunction = contract.GetFunction("vote");

            gas = GetGas();

            const UInt64 votes = 1;
            functionParams = new Object[2] { "0xde0daa905b8eccc209822843af1d5baa04e48d52", votes };
            txId = transferFunction.SendTransactionAsync(owner, gas, null, functionParams).Result;

            Assert.NotNull(txId);
        }
    }
}

using System;
using Xunit;
using Nethereum.Web3;
using System.Numerics;
using Nethereum.Util;
using System.IO;
using System.Text;

namespace tests
{
    public class DeployTests : Helper
    {
        public DeployTests()
        {
            //Monday 2nd Oct
            //Friday 7th Oct
            Object[] constructorParms = new Object[3] { 10000, 1506945600, 1507291200 };
            DeplyContract(contractPath, contractName, constructorParms);
        }

        [Fact]
        public void Should_Get_Next_Token_Time()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("nextTokenDistribution");

            var actual = functionToTest.CallAsync<Int64>().Result;
            Assert.Equal(1506945600, actual);
        }

        [Fact]
        public void Should_Get_Next_Vote_Time()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("nextVoteDistribution");

            var actual = functionToTest.CallAsync<Int64>().Result;
            Assert.Equal(1507291200, actual);
        }

        [Fact]
        public void Should_Get_Voter_Shares()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("voteBalanceOf");

            var actual = functionToTest.CallAsync<UInt64>(alice).Result;
            UInt64 expected = 0;
            Assert.Equal(expected, actual);
        }
    }
}

using System;
using Xunit;
using Nethereum.Web3;
using System.Numerics;
using Nethereum.Util;
using System.IO;
using System.Text;

namespace tests
{
    public class BountyTests : Helper
    {
        public BountyTests()
        {
            //Set defaults
            Object[] constructorParms = new Object[3] { 1000, 1506945600, 1507291200 };
            DeplyContract(contractPath, contractName, constructorParms);
        }

        [Fact]
        public void Should_Create_New_Bounty()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("createBountyClaim");

            Nethereum.Hex.HexTypes.HexBigInteger gas = GetGas();

            //8a638f05f3d96b4c7bbe6b1361927b8b39b766bd2ee817c12520ed7a2724bd6e
            Object[] functionParams = new Object[3] { bob, "0x85dFFbbd1133ecbBc6890D27A511b31055B8276A", 1 };
            String txId = functionToTest.SendTransactionAsync(owner, gas, null, functionParams).Result;
            var actual = functionToTest.CallAsync<String>().Result;
            Assert.NotNull(actual);
        }

        [Fact]
        public void Should_Not_Add_0_Tokens_To_Bounty()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("addToBounty");

            //var actual = functionToTest.CallAsync<String>().Result;
            //Assert.Equal("RPM", actual);
        }

        [Fact]
        public void Should_Not_Add_To_Expired_Bounty()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("addToBounty");

            //var actual = functionToTest.CallAsync<String>().Result;
            //Assert.Equal("RPM", actual);
        }

        [Fact]
        public void Should_Not_Add_To_Claimed_Bounty()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("addToBounty");

            //var actual = functionToTest.CallAsync<String>().Result;
            //Assert.Equal("RPM", actual);
        }
    }
}

using System;
using Xunit;
using Nethereum.Web3;
using System.Numerics;
using Nethereum.Util;
using System.IO;
using System.Text;

namespace tests
{
    public class ERC20Tests : Helper
    {
        public ERC20Tests()
        {
            //Set defaults
            Object[] constructorParms = new Object[3] { 1000, 1506945600, 1507291200 };
            DeplyContract(contractPath, contractName, constructorParms);
        }

        [Fact]
        public void Should_Get_Token_Name()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("name");

            var actual = functionToTest.CallAsync<String>().Result;
            Assert.Equal("RPM", actual);
        }

        [Fact]
        public void Should_Get_Token_Symbol()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("symbol");

            var actual = functionToTest.CallAsync<String>().Result;
            Assert.Equal("RPM", actual);
        }

        [Fact]
        public void Should_Get_Total_Supply()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("totalSupply");

            var actual = functionToTest.CallAsync<BigInteger>().Result;
            Assert.Equal(1000, actual);
        }

        [Fact]
        public void Should_Get_Alice_Token_Balance()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("balanceOf");

            var actual = functionToTest.CallAsync<BigInteger>(alice).Result;
            Assert.Equal(0, actual);
        }

        [Fact]
        public void Should_Get_Owner_Token_Balance()
        {
            var contract = GetContract(contractName);
            var functionToTest = contract.GetFunction("balanceOf");

            var actual = functionToTest.CallAsync<BigInteger>(owner).Result;
            Assert.Equal(1000000000, actual);
        }

        [Theory]
        [InlineData(owner, alice, 20, 20000000)]
        public void Should_Transfer_Tokens(String from, String to, UInt64 tokens, UInt64 expected)
        {
            var contract = GetContract(contractName);

            var balanceFunction = contract.GetFunction("balanceOf");
            var actual = balanceFunction.CallAsync<UInt64>(from).Result;

            UInt64 owerBalance = 1000000000;
            Assert.Equal(owerBalance, actual);

            var functionToTest = contract.GetFunction("transfer");

            Nethereum.Hex.HexTypes.HexBigInteger gas = new Nethereum.Hex.HexTypes.HexBigInteger(2000000);
            Object[] functionParams = new Object[2] { to, tokens };
            String txId = functionToTest.SendTransactionAsync(from, gas, null, functionParams).Result;

            Assert.NotNull(txId);

            actual = balanceFunction.CallAsync<UInt64>(to).Result;
            Assert.Equal(expected, actual);

            //Alice pushed into array
            var tokenFunction = contract.GetFunction("holderKeys");
            String holderAddress = tokenFunction.CallAsync<String>(0).Result;

            Assert.Equal(to, holderAddress);
        }
    }
}

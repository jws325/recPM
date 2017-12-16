using System;
using System.IO;
using System.Text;
using Nethereum.Web3;

namespace tests
{
    public abstract class Helper
    {
        //0x221bbb8b9b508c2841a60f862e9d03c1997097f99ee83db94e077ff180265247
        public const String owner = "0xe2356d29d5dfecb4ee43c031204aeded24749959";

        //0x9790dbc40d24723c34cf942f4dafac69ceb9e52bb9c92135221596ac25ba4270
        public const String alice = "0xa5f8ff129c19dbc0849619916c16010738ab5b1f";

        //0x68296c6629c546483664ea232e33f187f60ca4ba123692c707168f2ac330dacf
        public const String bob = "0xaa727c20b128c298c13d56de8f087e998da28ab1";


        public const String contractName = "Bounty";
        
        //Desktop
        public String contractPath = "/home/lucascullen/GitHub/RPM/bin/src/contracts/";

        //Mac
        //public String contractPath = "/Users/lucascullen/GitHub/BitcoinBrisbane/RPM/bin/src/contracts/";
        
        public String contractAddress = "";
        
        public Web3 web3 = new Web3("http://localhost:8545");
        //public Web3 web3 = new Web3("http://60.226.74.183:8545");

        public static DateTime FromUnixTime(long unixTime)
        {
            return epoch.AddSeconds(unixTime);
        }

        private static readonly DateTime epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        protected static string GetABIFromFile(String path)
        {
            var fileStream = new FileStream(path, FileMode.Open, FileAccess.Read);
            using (var streamReader = new StreamReader(fileStream, Encoding.UTF8))
            {
                String text = streamReader.ReadToEnd();
                return text;
            }
        }

        protected static string GetBytesFromFile(String path)
        {
            var fileStream = new FileStream(path, FileMode.Open, FileAccess.Read);
            using (var streamReader = new StreamReader(fileStream, Encoding.UTF8))
            {
                String text = streamReader.ReadToEnd();
                return "0x" + text;
            }
        }
        
        protected static string GetBytesFromFile(String path, String contractname)
        {
            var fileStream = new FileStream(String.Format("{0}/{1}.bin",path, contractname) , FileMode.Open, FileAccess.Read);
            using (var streamReader = new StreamReader(fileStream, Encoding.UTF8))
            {
                String text = streamReader.ReadToEnd();
                return "0x" + text;
            }
        }

        public void DeplyContract(String contractPath, String contractName, Object[] param)
        {
            String bytes = GetBytesFromFile(contractPath + contractName + ".bin");
            Nethereum.Hex.HexTypes.HexBigInteger gas = new Nethereum.Hex.HexTypes.HexBigInteger(2000000);
            
            String abi = GetABIFromFile(String.Format("{0}{1}.abi", contractPath, contractName));

            //web3.Personal.UnlockAccount.SendRequestAsync(owner, "Test12345", new Nethereum.Hex.HexTypes.HexBigInteger(120));

            if (param != null)
            {
                String tx = web3.Eth.DeployContract.SendRequestAsync(abi, bytes, owner, gas, param).Result;
                contractAddress = MonitorTx(tx);
            }
            else
            {
                String tx =  web3.Eth.DeployContract.SendRequestAsync(bytes, owner, gas).Result;
                contractAddress = MonitorTx(tx);
            }
        }

        public String MonitorTx(String transactionHash)
        {
            var receipt = web3.Eth.Transactions.GetTransactionReceipt.SendRequestAsync(transactionHash).Result;

            while (receipt == null)
            {
                Console.WriteLine("Sleeping for 5 seconds");
                System.Threading.Thread.Sleep(5000);
                receipt = web3.Eth.Transactions.GetTransactionReceipt.SendRequestAsync(transactionHash).Result;
            }

            Console.WriteLine("Contract address {0} block height {1}", receipt.ContractAddress, receipt.BlockNumber.Value);

            return receipt.ContractAddress;
        }

        protected Nethereum.Contracts.Contract GetContract(String contractName)
        {
            String abi = GetABIFromFile(String.Format(@"{0}{1}.abi", contractPath, contractName));
            return web3.Eth.GetContract(abi, contractAddress);
        }

        protected Nethereum.Hex.HexTypes.HexBigInteger GetGas()
        {
            return new Nethereum.Hex.HexTypes.HexBigInteger(2000000);
        }
    }
}
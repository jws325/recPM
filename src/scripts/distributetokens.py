## Note, requires pip install json-rpc
## pip install 'jsonrpcclient[requests]'
## pip install ethjsonrpc

import requests
import json
import jsonrpcclient

node_url = '127.0.0.1' # Test RPC
#node_url = '60.226.74.183' # Ropsten node

contract_address = '0x8db2caae9ef066aedf81423b9ae0e92a2603c533' # Testrpc
#contract_address = '0x89f3e42Db3ef5979c206c62D3F73DbD51d2b8Dc9' # Ropsten

from ethjsonrpc import EthJsonRpc
c = EthJsonRpc(node_url, 8545)

# Test connect
blockHeight = c.eth_blockNumber()
print('')
print(blockHeight)

contract_owner = 'e2356d29d5dfecb4ee43c031204aeded24749959' # Test rpc
# contract_owner = 'a2a8d81485a1DEe0ace2D5d6600225423Dd573B5' # Ropsten
new_supply = 1000

tx = c.call_with_transaction(contract_owner, contract_address, 'distributeTokens(uint256)', [new_supply])

print()
print(tx)
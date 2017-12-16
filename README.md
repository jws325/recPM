# RPM

Private repo for moneo job #612

## Notes
Ropsten contract owner 0xa2a8d81485a1dee0ace2d5d6600225423dd573b5 0x2be5a725ab178efeb4155ee1589196e21ed6c91fa8857af78cb8c975163ac1f6 Test12345

The RPM token is an ERC20 compatible token on the Ethereum blockchain.  RPM is a utility token allowing token holders to vote for their favorite projects on the RPM platform. Each project has its own Ethereum address.

Every Monday at 12 PM UTC, votes will be distributed to RPM holders in proportion to the number of RPM tokens they hold, as per the equation:

VwX = (RPMX / RPMT) · VwT

Where VwX is votes distributed to Account X for the week, RPMX is RPM held by Account X, RPMT is the total amount of RPM tokens in existence, and VwT is the total number of votes distributed this week.

These votes do not expire: they can be used to upvote projects at any time.

Every Friday at 12 PM UTC, RPM tokens will be distributed to project maintainers in proportion to the number of upvotes their projects received that week, as per the equation:

RPMwX = (∪wX / ∪wT) · RPMwT

Where RPMwX is RPM awarded to Project X for the week, ∪wX is the number of upvotes that Project X received that week, ∪wT is the total number of upvotes all RPM projects received that week, and RPMwT is the total amount of RPM awarded this week.

These new RPM tokens will be minted by increasing the supply of RPM tokens, in a method similar to increaseSupply here: https://github.com/ethereum/EIPs/pull/621

## Notes

RPM and Vote balances are represented to 10^6, this is due to potential rounding issues.

### TestRPC
```
testrpc --account="0x221bbb8b9b508c2841a60f862e9d03c1997097f99ee83db94e077ff180265247,500000000000000000000000"
```
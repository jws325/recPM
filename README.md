# RECPM

## Notes

RECPM balances are represented to 10^6, this is due to potential rounding issues.

## Instructions

Install packages

```$ npm install```

Start testrpc

```$ testrpc```

To run tests : 

```$ npm test```

To deploy contracts : 

```$ npm run migrate```

# Frontend
To Start : 

```$ npm run dev```

# Backend scripts

## Transfer Tokens

```$ npm run transfer -- [DESTINATION_ADDRESS] [AMOUNT_TO_TRANSFER_IN_RECPM]``` 

## Distribute Votes

```$ npm run distribute-votes -- [AMOUNT_TO_DISTRIBUTE]``` 

## Distribute Tokens

```$ npm run distribute-tokens -- [AMOUNT_TO_DISTRIBUTE_IN_RECPM]``` 

## Burn RECPM

```$ npm run burn -- [AMOUNT_TO_DISTRIBUTE_IN_RECPM]``` 

## Set Page Size 

```$ npm run set-page-size -- [PAGE_SIZE]``` 
## Subsquid Data Ingestion

The Subsquid project ingests from different Substrate chains like Polkadot, Kusama, Acala, Astar, Phala, Statemine, Statemint, HydraDX and many more. The data becomes available indexed on a PostgreSQL database.

The data:

- **AccountInteraction**: to determine if a token transfer has happened between 2 accounts. A positive only rating matrix of account <-> account interactions.
- **AccountActivity**: every signed transaction from every account with a timestamp. Because it is more likely that accounts are acquainted with one another when they are doing things at the same time.
- **AccountIdentity**: the last known identity per account, listening to `set_identity` function calls from Polkadot & Kusama. Account labels are nice for visualization.

## Prerequisites

* node 16.x
* docker
* npm -- note that `yarn` package manager is not supported

## Run

```bash
# 1. Update Squid SDK and install dependencies
npm run update
npm ci

# 2. Compile typescript files
make build

# 3. Start target Postgres database and detach
make up

# 4. Start the processor
make process
```

# squid

Indexes the following data:

- account: list of accounts with their overall `transfer_volume`
- transfer_account_pair: every `account` to `account` transfer with the according `volume`
- account_identity: latest identity data per `account`

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

# squid

Indexes the following data:

- account_activity: all account calls with their `timestamp`
- account_interaction: holds every `account` to `account` transfer as a distinct list
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

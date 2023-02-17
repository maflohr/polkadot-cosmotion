# Polkadot Cosmotion 🌌

The project utilizes [collaborative filtering](https://en.wikipedia.org/wiki/Collaborative_filtering) methods on on-chain data, such as token transfers, to determine the proximity between accounts and assess the probability of them having the same owner or being acquainted with one another.

[Here you can see a **running demo** of the results produced by the code of this repository.](https://polkadot.cosmotion.ai)

## Use Cases

The result can be used for the following use cases:

- 🔭 general exploration and visualization
- 🕵️ forensic analytics for tracking and interpreting token flows
- 👾 detection of anomalies and inorganic behavior, from bots or fake accounts
- 💰 to recommend token, chains, contracts, NFTs based on the a persons on-chain history

## Pipeline & Repository Structure ⚗️

The project is organized into several distinct artifacts. By clicking on each of the artifacts, you can access the corresponding code and view more detailed explanations.

1. 🦑 **[squid](squid/)**: the [Subsquid](https://www.subsquid.io) for on-chain data ingestion and indexing
2. 🪄 **[mf](mf/)**: where the magic happens (AKA matrix factorization)
3. 🤖 **[api](api/)**: the API provides embeddings for various use cases in a simple and straightforward manner
4. 🚀 **[ui](ui/)**: launch into the cosmos - a 3d embedded space

### Launch Sequence (Run) 🚀

It is recommended to run the project using `docker compose` on a powerful machine. A complete run might take **24 hours** and consume up to **32 GB RAM** on a modern workstation.

The sequence contains of 3 phases.

```bash
# start ingestion & db - runs ∞ in background to catch up on new blocks
docker compose --profile ingest up

# should be run when the ingestion is in sync with all chains
# needs the db running in the background (previous command)
docker compose run mf

# launch api & ui after the mf run is complete
# doesn't need any other services running
docker compose --profile serve up
```


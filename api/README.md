## API

ASP.NET Core API application to serve the embeddings.

Also does:

- in-memory **caching** for faster results
- indexing for **full text search and filtering**

### Run

Needs access to the data from [Matrix Factorization](../mf/) in `../data`. Using the `docker compose` [from here](../) is therefore highly recommended.

```bash
# using .NET CLI
dotnet run

# using Docker
docker build -t substrate-cosmotion-api .
docker run -d substrate-cosmotion-api
```

### Endpoints

- **/accounts** - list of all accounts with labels
    - with 3d factors
- **/accounts/&lt;id&gt;** - list of all accounts with labels and also most similar accounts
    - with 3d factors
    - with the `euclidean distance` to the given account

The endpoints are additionally FTS queriable by using the `q` parameter.

```bash
curl https://cosmotion.ai/api/accounts?q=alice+und+bob
```

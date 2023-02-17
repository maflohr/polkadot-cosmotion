## Matrix Factorization

We have a substantial number of pairs of account interactions. These pairs are organized into an account matrix, with accounts listed as both the rows and columns, and the values indicating whether they have interacted with each other. This matrix can be likened to a user <-> item rating matrix commonly utilized in recommendation engines.

|       | Acc 1 | Acc 2 | Acc 3 | Acc 4 |
| ----- |:-----:|:-----:|:-----:|:-----:|
| Acc 1 | -     | x     |       | x     |
| Acc 2 | x     | -     |       |       |
| Acc 3 |       |       | -     | x     |
| Acc 4 | x     |       | x     | -     |

*Acc 1 and Acc 2 are very similar to each other and different from Acc 3 and Acc 4.*

We are able to measure the distance between accounts by using `Euclidean Distance`. To do this with much more accounts and interactions, we need to take the information into an embedded space of a reasonable amount of factors/dimensions.

For visualization we need to take the information into a 2d or 3d space. This can be achieved by using `Principle Component Analysis` or `t-SNE`. It should be noted that when reducing to 3d, a lot of information is lost and the visualization only provides a rough orientation of existing clusters.

The output of the process:

- items.tsv: metadata of the accounts, labels
- factors.tsv: account embeddings, 24d
- factors-3d.tsv: those embeddings in 3d by using [t-SNE](https://distill.pub/2016/misread-tsne/)

**Implicit vs Explicit Ratings**

Collaborative filtering and matrix factorization algorithms usually differ from the type of data: if it is implicit collected or explicit.

Explicit datapoints might be a list of movies with 1-5 star ratings from users. Implicit datapoints might be clickstream data of users visiting URLs of a website. Implicit data is often more sparse than explicit data.

In the context of on-chain transactions, an implicit rating system is more appropriate due to the limited value of non-interactions between accounts. Ratings tend to be both sparse and positive. The `SVD++` algorithm (Singular Value Decomposition++) is designed to work with implicit and explicit feedback and values, such as token transaction amounts serving as ratings. I have also [incorporated some experiments](experimental/) utilizing the `SVD++` algorithm.

Algorithms such as `Alternating Least Squares` or `Bayesian Personalized Ranking` are highly effective in **fastly** processing implicit data, and can do so at a significantly faster pace. Additionally, the execution of these algorithms can be parallelized and the data can be stored in a sparse matrix, which requires **much less RAM**.

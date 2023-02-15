import os
import logging
from surprise import Dataset, Reader
from auto_surprise.engine import Engine
import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv()

os.environ["OPENBLAS_NUM_THREADS"] = "1"

logging.basicConfig(
    format="%(asctime)s cosmotion %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.info("Start")

numThreads = os.environ.get("numThreads")

if numThreads == None:
    numThreads = 1
else:
    numThreads = int(numThreads)

sqlHost = os.environ.get("sqlHost")

if sqlHost == None:
    raise RuntimeError("sqlHost not set")

sqlPort = os.environ.get("sqlPort")

if sqlPort == None:
    raise RuntimeError("sqlPort not set")

sqlDatabase = os.environ.get("sqlDatabase")

if sqlDatabase == None:
    raise RuntimeError("sqlDatabase not set")

sqlUser = os.environ.get("sqlUser")

if sqlUser == None:
    raise RuntimeError("sqlUser not set")

sqlPassword = os.environ.get("sqlPassword")

if sqlPassword == None:
    raise RuntimeError("sqlPassword not set")

sqlConnection = psycopg2.connect(
    host=sqlHost,
    port=sqlPort,
    database=sqlDatabase,
    user=sqlUser,
    password=sqlPassword,
)

logging.info("Load Data")

cursorRating = sqlConnection.cursor()

cursorRating.execute(
    """
    with account as (
        select
            account,
            SUM(amount) as total_transfer_amount
        from (
            select
                account1 as account,
                amount
            from
                account_transfer
            union all
            select
                account2 as account,
                amount
            from
                account_transfer
        ) unioned
        group by account
    ),
    account_transfer_pair as (
        select
            account1,
            account2,
            sum(amount) total_transfer_amount
        from
        (
            select
                account1 as account1,
                account2 as account2,
                amount
            from
                account_transfer
            union all
            select
                account2 as account1,
                account1 as account2,
                amount
            from
                account_transfer
        ) unioned
        group by account1, account2
    ),
    rating as (
        select
            account_transfer_pair.account1 as user,
            account_transfer_pair.account2 as item,
            round(least(account_transfer_pair.total_transfer_amount / (account.total_transfer_amount / 2) * 4, 4) + 1) as rating
        from account_transfer_pair
        left join account on account.account=account_transfer_pair.account1
    )
    select * from rating
    """
)

df = pd.DataFrame(cursorRating.fetchall(), columns=["user", "item", "rating"])

reader = Reader(rating_scale=(1, 5))

data = Dataset.load_from_df(df, reader)

logging.info("Auto Surprise")

engine = Engine(verbose=True, algorithms=["svdpp", "svd", "nmf"])

best_algo, best_params, best_score, tasks = engine.train(
    data=data,
    target_metric="test_rmse",
    cpu_time_limit=60 * 60 * 12,
#    max_evals=100,
#    hpo_algo=hyperopt.atpe.suggest
)

model = engine.build_model(best_algo, best_params)

print(best_algo)
print(best_params)

logging.info("Done")

import os
import io
import logging
from surprise import Dataset, SVD, Reader
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

logging.info("Fetch Meta")

cursorMeta = sqlConnection.cursor()

cursorMeta.execute("SELECT id, display FROM account_identity")

metaDict = {}

while True:
    rows = cursorMeta.fetchmany(1000000)
    if not rows:
        break

    for row in rows:
        metaDict[row[0]] = row[1]

logging.info("Fetch Ratings")

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

usersDict = {}
itemsDict = {}
users = []
items = []

df = pd.DataFrame(cursorRating.fetchall(), columns=["user", "item", "rating"])

for i in df.index:
    if df["user"][i] not in usersDict:
        usersDict[df["user"][i]] = len(usersDict)
    if df["item"][i] not in itemsDict:
        itemsDict[df["item"][i]] = len(itemsDict)

cursorTimeseries = sqlConnection.cursor()

cursorTimeseries.execute(
    """
        SELECT date_bin('15 minutes', TIMESTAMP '2020-02-11 15:44:17', TIMESTAMP '1970-01-01');
        select
            account_transfer.account1 as user,
            date_bin('15 minutes', account_transfer.timestamp, TIMESTAMP '1970-01-01') as item,
            5 as rating
        from account_transfer
    """
)

df = pd.concat(
    [df, pd.DataFrame(cursorTimeseries.fetchall(), columns=["user", "item", "rating"])]
)

logging.info("Build Data")

reader = Reader(rating_scale=(1, 5))

data = Dataset.load_from_df(df, reader)

m = SVD(verbose=True, n_factors=100, n_epochs=100, lr_all=0.005, reg_all=0.01)

logging.info("Fit")

m.fit(data.build_full_trainset())

logging.info("Write")

if not os.path.exists("data"):
    os.makedirs("data")

itemsFileName = "data/items.tsv"
factorsFileName = "data/factors.tsv"

itemsList = list(itemsDict.keys())

with io.open(itemsFileName, "w", encoding="utf-8") as itemsFile:
    with io.open(factorsFileName, "w", encoding="utf-8") as factorsFile:
        itemsFile.write("address\tname\n")
        for idx, i in enumerate(m.qi):
            if idx >= len(itemsList):
                break

            account = itemsList[idx]

            if (
                account not in metaDict
                or metaDict[account] is None
                or len(metaDict[account].strip()) == 0
            ):
                continue

            factorsFile.write("\t".join(map(str, i)) + "\n")
            label = ""

            if account in metaDict and metaDict[account] != None:
                label = metaDict[account]

            itemsFile.write(account + "\t" + label + "\n")

logging.info("Done")

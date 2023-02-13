import os
import io
import logging
from scipy.sparse import csr_matrix
from implicit.bpr import BayesianPersonalizedRanking
from implicit.evaluation import train_test_split, AUC_at_k
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
            cast(round(least(account_transfer_pair.total_transfer_amount / (account.total_transfer_amount / 2) * 4, 4) + 1) as int) as rating
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
ratings = []

df = pd.DataFrame(cursorRating.fetchall(), columns=["user", "item", "rating"])

numItems = len(df)

cursorTimeseries = sqlConnection.cursor()

cursorTimeseries.execute(
    """
        SELECT date_bin('15 minutes', TIMESTAMP '2020-02-11 15:44:17', TIMESTAMP '1970-01-01');
        select
            account_transfer.account1 as user,
            date_bin('15 minutes', account_transfer.timestamp, TIMESTAMP '1970-01-01') as item,
            cast(5 as int) as rating
        from account_transfer
    """
)

df = pd.concat([df, pd.DataFrame(cursorTimeseries.fetchall(), columns=["user", "item", "rating"])])

for row in df.itertuples():
    if(row.user not in usersDict):
        usersDict[row.user] = len(usersDict)
    if(row.item not in itemsDict):
        itemsDict[row.item] = len(itemsDict)

    users.append(usersDict[row.user])
    items.append(itemsDict[row.item])
    ratings.append(row.rating)

logging.info("Build Data")

data = csr_matrix((ratings, (items, users))).T.tocsr()

logging.info("Fit")

train, test = train_test_split(data)

factors = [ 127, 255, 512 ]
iterations = [ 127, 256, 512 ]
regularization = [ 0.01, 0.02, 0.05, 0.005, 0.001 ]
learning_rates = [ 0.01, 0.02, 0.05, 0.005, 0.001 ]

bestmodel = None
bestauc = None

totalTests = len(factors) * len(iterations) * len(regularization) * len(learning_rates)
currentTest = 0

if totalTests > 1:
    for factor in factors:
        for iteration in iterations:
            for reg in regularization:
                for learning_rate in learning_rates:
                    currentTest += 1
                    m = BayesianPersonalizedRanking(factors=factor, iterations=iteration, regularization=reg, learning_rate=learning_rate, verify_negative_samples=True, num_threads=numThreads)
                    m.fit(train)
                    auc = AUC_at_k(m, train, test, K=round(test.shape[0]/8), num_threads=numThreads)
                    logging.info("[%s of %s] (%s) Factor: %s, Iteration: %s, Regularization: %s, Learning Rate: %s" % (currentTest, totalTests, auc, factor, iteration, reg, learning_rate))
                    if bestauc == None or auc > bestauc:
                        logging.info("New best AUC: %s" % (auc))
                        bestauc = auc
                        bestmodel = m

if bestmodel != None:
    m = bestmodel
else:
    m = BayesianPersonalizedRanking(factors=factors[0], iterations=iterations[0], regularization=regularization[0], learning_rate=learning_rates[0], verify_negative_samples=True, num_threads=numThreads)

m.fit(data)

logging.info("Write")

if not os.path.exists("data"):
    os.makedirs("data")

itemsFileName = "data/items.tsv"
factorsFileName = "data/factors.tsv"

itemsList = list(itemsDict.keys())

with io.open(itemsFileName, "w", encoding="utf-8") as itemsFile:
    with io.open(factorsFileName, "w", encoding="utf-8") as factorsFile:
        itemsFile.write("address\tname\n")
        for idx, i in enumerate(m.item_factors):
            if(idx >= numItems):
                break
            account = itemsList[idx]
            if account not in metaDict or metaDict[account] is None or len(metaDict[account].strip()) == 0:
                continue
            factorsFile.write("\t".join(map(str, i)) + "\n")
            label = ""
            if account in metaDict and metaDict[account] != None:
                label = metaDict[account]
            itemsFile.write(account + "\t" + label + "\n")

logging.info("Done")

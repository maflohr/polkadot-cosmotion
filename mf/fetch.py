import os
import logging
import pandas as pd
import psycopg2
from dotenv import load_dotenv

os.chdir(os.path.dirname(__file__))

load_dotenv()

os.environ["OPENBLAS_NUM_THREADS"] = "1"

logging.basicConfig(
    format="%(asctime)s fetch %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.info("Start")

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

cursorMeta.execute("SELECT id as address, display as label FROM account_identity")

dfMeta = pd.DataFrame(cursorMeta.fetchall(), columns=["address", "label"])

logging.info("Fetch Ratings")

cursorRating = sqlConnection.cursor()

cursorRating.execute(
    """
        select
            account_interaction.account1 as user,
            account_interaction.account2 as item
        from account_interaction
        union all
        select
            account_interaction.account2 as user,
            account_interaction.account1 as item
        from account_interaction
    """
)

dfRating = pd.DataFrame(cursorRating.fetchall(), columns=["user", "item"])

cursorTimeseries = sqlConnection.cursor()

cursorTimeseries.execute(
    """
        select
            account_activity.account as user,
            date_bin('4 hours', account_activity.timestamp, TIMESTAMP '1970-01-01') as item
        from account_activity
    """
)

dfRating = pd.concat([dfRating, pd.DataFrame(cursorTimeseries.fetchall(), columns=["user", "item"])])

logging.info("Save")

dfMeta.to_pickle("../data/meta.pkl")
dfRating.to_pickle("../data/ratings.pkl")

logging.info("Done")

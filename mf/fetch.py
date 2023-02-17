import os
import logging
import pandas as pd
import psycopg2
from dotenv import load_dotenv

if len(os.path.dirname(__file__)) > 0:
    os.chdir(os.path.dirname(__file__))

load_dotenv()

os.environ["OPENBLAS_NUM_THREADS"] = "1"

logging.basicConfig(
    format="%(asctime)s fetch %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.info("Start")

DB_HOST = os.environ.get("DB_HOST")

if DB_HOST == None:
    raise RuntimeError("DB_HOST not set")

DB_PORT = os.environ.get("DB_PORT")

if DB_PORT == None:
    raise RuntimeError("DB_PORT not set")

DB_NAME = os.environ.get("DB_NAME")

if DB_NAME == None:
    raise RuntimeError("DB_NAME not set")

DB_USER = os.environ.get("DB_USER")

if DB_USER == None:
    raise RuntimeError("DB_USER not set")

DB_PASS = os.environ.get("DB_PASS")

if DB_PASS == None:
    raise RuntimeError("DB_PASS not set")

sqlConnection = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASS,
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

import os
import io
import logging
import numpy
from scipy.sparse import csr_matrix
from implicit.bpr import BayesianPersonalizedRanking
import pandas as pd
from sklearn.manifold import TSNE
from dotenv import load_dotenv

path = os.path.dirname(__file__)

if len(path) > 0:
    os.chdir(path)

load_dotenv()

os.environ["OPENBLAS_NUM_THREADS"] = "1"

logging.basicConfig(
    format="%(asctime)s mf %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.info("Start")

numThreads = os.environ.get("numThreads")

if numThreads == None:
    numThreads = 1
else:
    numThreads = int(numThreads)

fileNameMeta = "../data/meta.pkl"
fileNameRatings = "../data/ratings.pkl"

if not os.path.isfile(fileNameMeta) or not os.path.isfile(fileNameRatings):
    raise Exception("Run fetch.py first")

logging.info("Load")

dfMeta = pd.read_pickle(fileNameMeta)
dfRatings = pd.read_pickle(fileNameRatings)

dictMeta = dfMeta.set_index("address").to_dict("index")

logging.info("Index")

dictUser = {}
dictItem = {}
users = []
items = []

for row in dfRatings.itertuples():
    if row.user not in dictUser:
        dictUser[row.user] = len(dictUser)
    if row.item not in dictItem:
        dictItem[row.item] = len(dictItem)

    users.append(dictUser[row.user])
    items.append(dictItem[row.item])

data = csr_matrix((numpy.ones(len(items)), (items, users))).T.tocsr()

logging.info("Cleanup")

del dfMeta, dfRatings, users, items

logging.info("Fit")

m = BayesianPersonalizedRanking(
    factors=23,
    iterations=512,
    regularization=0.01,
    learning_rate=0.01,
    verify_negative_samples=True,
    num_threads=numThreads
)

m.fit(data)

logging.info("Fit 3D")

m3d = TSNE(n_components=3, init="pca", learning_rate="auto")

embeddings3d = m3d.fit_transform(m.item_factors)

m3d.fit(data)

logging.info("Write")

fileNameItems = "../data/items.tsv"
fileNameFactors = "../data/factors.tsv"
fileNameFactors3d = "../data/factors-3d.tsv"

listItems = list(dictItem.keys())

with io.open(fileNameItems, "w", encoding="utf-8") as fileItems:
    with io.open(fileNameFactors, "w", encoding="utf-8") as fileFactors:
        with io.open(fileNameFactors3d, "w", encoding="utf-8") as fileFactors3d:
            fileItems.write("label\taddress\n")
            for idx, i in enumerate(m.item_factors):
                i3d = embeddings3d[idx]

                account = listItems[idx]

                if type(account) is pd.Timestamp or len(account) == 0:
                    continue

                account = listItems[idx]

                fileFactors.write("\t".join(map(str, i)) + "\n")
                fileFactors3d.write("\t".join(map(str, i3d)) + "\n")

                if (
                    account in dictMeta
                    and dictMeta[account] != None
                    and len(str(dictMeta[account]["label"])) > 0
                ):
                    label = str(dictMeta[account]["label"])
                else:
                    label = ""

                fileItems.write(label + "\t" + str(account) + "\n")

logging.info("Done")

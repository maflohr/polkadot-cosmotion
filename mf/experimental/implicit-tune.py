import os
import logging
import numpy
from scipy.sparse import csr_matrix
from implicit.bpr import BayesianPersonalizedRanking
from implicit.evaluation import train_test_split, AUC_at_k
import pandas as pd

os.environ["OPENBLAS_NUM_THREADS"] = "1"

logging.basicConfig(
    format="%(asctime)s implicit-tune %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.info("Start")

if not os.path.isfile("../../data/meta.csv") or not os.path.isfile("../../data/ratings.csv"):
    logging.error("Run fetch.py first")

logging.info("Load")

dfMeta = pd.read_csv("../../data/meta.csv")
dfRatings = pd.read_csv("../../data/ratings.csv")

dictMeta = dfMeta.set_index("address").to_dict("index")

logging.info("Index")

users = []
items = []

data = csr_matrix((numpy.ones(len(items)), (items, users))).T.tocsr()

logging.info("Cleanup")

del dfMeta, dfRatings, users, items

logging.info("Fit")

train, test = train_test_split(data)

# 2023-02-14 01:08:52 cosmotion [4 of 18] (0.8398416270336296) Factor: 127, Iteration: 256, Regularization: 0.01, Learning Rate: 0.0005

factors = [ 23 ]
iterations = [ 1 ]
regularization = [ 0.01 ]
learning_rates = [ 0.01 ]

bestmodel = None
bestauc = None

totalTests = len(factors) * len(iterations) * len(regularization) * len(learning_rates)
currentTest = 0

for factor in factors:
    for iteration in iterations:
        for reg in regularization:
            for learning_rate in learning_rates:
                currentTest += 1

                m = BayesianPersonalizedRanking(factors=factor, iterations=iteration, regularization=reg, learning_rate=learning_rate, verify_negative_samples=True, num_threads=-2)
                m.fit(train)

                auc = AUC_at_k(m, train, test, K=round(test.shape[0]/8), num_threads=-2)

                logging.info("[%s of %s] (%s) Factor: %s, Iteration: %s, Regularization: %s, Learning Rate: %s" % (currentTest, totalTests, auc, factor, iteration, reg, learning_rate))

                if bestauc == None or auc > bestauc:
                    logging.info("New best AUC: %s" % (auc))

                    bestauc = auc
                    bestmodel = m

logging.info("Done")

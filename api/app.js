import express from "express"
import * as fs from "fs"
import * as url from "url"
import readline from "readline"

const __dirname = url.fileURLToPath(new URL(".", import.meta.url))

function distance(a, b) {
    return a
        .map((x, i) => Math.abs(x - b[i]) ** 2)
        .reduce((sum, now) => sum + now)
        ** (1 / 2)
}

var data = (() => {
    let loadPromise = null

    let data = {
        items: [],
        itemsDict: {},
        labeledItems: [],
        labeledItemsDict: {}
    }

    return async () => {
        if (loadPromise) {
            return loadPromise
        }

        loadPromise = new Promise(resolve => {
            const itemsFileName = __dirname + "../data/items.tsv"
            const factorsFileName = __dirname + "../data/factors.tsv"
            const factors3dFileName = __dirname + "../data/factors-3d.tsv"

            const itemsFileNameCounter = ((i = 0) => () => ++i)();

            readline.createInterface({
                input: fs.createReadStream(itemsFileName),
                crlfDelay: Infinity
            }).on("line", (line, lineno = itemsFileNameCounter()) => {
                if (lineno === 1) {
                    return
                } else {
                    lineno--
                }

                let item = {
                    address: line.split("\t")[1],
                    label: line.split("\t")[0],
                    index: lineno - 1
                }

                data.items.push(item)
                data.itemsDict[item.address] = item

                if (item.label && item.label.length) {
                    data.labeledItems.push(item)
                    data.labeledItemsDict[item.address] = item
                }
            }).on("close", () => {
                console.log("items loaded")

                const factorsFileNameCounter = ((i = 0) => () => ++i)();

                readline.createInterface({
                    input: fs.createReadStream(factorsFileName),
                    crlfDelay: Infinity
                }).on("line", (line, lineno = factorsFileNameCounter()) => {
                    data.items[lineno - 1].factors = line.split("\t").map(parseFloat)
                }).on("close", () => {
                    console.log("factors loaded")

                    const factors3dFileNameCounter = ((i = 0) => () => ++i)();

                    readline.createInterface({
                        input: fs.createReadStream(factors3dFileName),
                        crlfDelay: Infinity
                    }).on("line", (line, lineno = factors3dFileNameCounter()) => {
                        data.items[lineno - 1].factors3d = line.split("\t").map(parseFloat)
                    }).on("close", () => {
                        console.log("factors3d loaded")
    
                        resolve(data)
                    })
                })
            })
        })

        return loadPromise
    }
})()

var app = express()

app.listen(3000, () => {
    console.log("Server running on port 3000")
})

app.get("/accounts", async (req, res, next) => {
    console.log("/accounts")

    let d = await data()

    res.json(d.labeledItems)
})

app.get("/accounts/:id", async (req, res, next) => {
    let id = req.params.id

    console.log("/accounts/" + id)

    let d = await data()
    let selectedItem = d.itemsDict[req.params.id]

    if (!selectedItem) {
        res.send(404, "Account not found: " + req.params.id)
        return
    }

    let result = d.items
        .map(i => {
            return {
                index: i.index,
                distance: distance(selectedItem.factors, i.factors)
            }
        })
        .sort((a, b) => { return a.distance - b.distance })
        .slice(0, 100)
        .map(i => { return d.items[i.index] })

    result = [...result, ...d.labeledItems.filter(i => result.indexOf(i) === -1)]

    result = result.map(i => {
        return {
            address: i.address,
            label: i.label,
            distance: distance(selectedItem.factors, i.factors),
            factors3d: i.factors3d
        }
    }).sort((a, b) => { return a.distance - b.distance })

    res.json(result)
})

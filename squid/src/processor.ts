import { lookupArchive, KnownArchivesSubstrate } from "@subsquid/archive-registry"
import * as ss58 from "@subsquid/ss58"
import { In } from "typeorm"
import { BatchContext, BatchProcessorItem, SubstrateBatchProcessor, decodeHex } from "@subsquid/substrate-processor"
import { CallItem } from "@subsquid/substrate-processor/lib/interfaces/dataSelection"
import { Store, TypeormDatabase } from "@subsquid/typeorm-store"
import { AccountInteraction, AccountIdentity, AccountActivity } from "./model"
import { BalancesTransferEvent, AssetsTransferredEvent } from "./types/events"
import { IdentitySetIdentityCall } from "./types/calls"

let prometheusBasePort = 9000

/*
    Identity.set_identity
*/

let identityArchives: KnownArchivesSubstrate[] = [
    "kusama",
    "polkadot",
    "rococo",
]

identityArchives.map((archive, index) => {
    return {
        chain: archive,
        processorName: `identity_set_identity_${archive}`,
        processor: new SubstrateBatchProcessor()
            .setPrometheusPort(prometheusBasePort + index)
            .setDataSource({
                archive: lookupArchive(archive, { release: "FireSquid" })
            })
            .addCall("Identity.set_identity", {
                data: {
                    call: {
                        args: true,
                        origin: true,
                    },
                },
            } as const)
    }
}).forEach(({ processorName, processor }) => {
    type Item = BatchProcessorItem<typeof processor>
    type Ctx = BatchContext<Store, Item>

    function getIdentities(
        ctx: Ctx,
        item: CallItem<"Identity.set_identity", { call: { args: true } }>
    ) {
        let c = new IdentitySetIdentityCall(ctx, item.call)

        if (c.isV1030) {
            let { info } = c.asV1030
            return {
                display: unwrapData(info.display),
                legal: unwrapData(info.legal),
                web: unwrapData(info.web),
                riot: unwrapData(info.riot),
                email: unwrapData(info.email),
                twitter: null,
            }
        } else if (c.isV1032) {
            let { info } = c.asV1032
            return {
                display: unwrapData(info.display),
                legal: unwrapData(info.legal),
                web: unwrapData(info.web),
                riot: unwrapData(info.riot),
                email: unwrapData(info.email),
                twitter: unwrapData(info.twitter),
            }
        } else {
            throw new UknownVersionError()
        }
    }

    function getAccountIdentity(m: Map<string, AccountIdentity>, id: string): AccountIdentity {
        let acc = m.get(id)
        if (acc == null) {
            acc = new AccountIdentity()
            acc.id = id
            m.set(id, acc)
        }
        return acc
    }

    async function saveAccountIdentities(ctx: Ctx, identitiesData: AccountIdentityEvent[]) {
        let accountIds = new Set<string>()
        for (let i of identitiesData) {
            accountIds.add(i.id)
        }

        let accountIdentities = await ctx.store
            .findBy(AccountIdentity, { id: In([...accountIds]) })
            .then((accounts) => {
                return new Map(accounts.map((a) => [a.id, a]))
            })

        for (let i of identitiesData) {
            let accountIdentity = getAccountIdentity(accountIdentities, i.id)
            accountIdentity.display = i.display
            accountIdentity.email = i.email
            accountIdentity.legal = i.legal
            accountIdentity.riot = i.riot
            accountIdentity.twitter = i.twitter
            accountIdentity.web = i.web
        }

        let ais = Array.from(accountIdentities.values())

        let uniqueAis = [...new Set(ais.map(i => i.id))].map(id => ais.find(i => i.id == id)!)

        await ctx.store.save([...uniqueAis])
    }

    processor.run(new TypeormDatabase({ stateSchema: processorName }), async ctx => {
        let accountIdentities: AccountIdentityEvent[] = []

        for (let block of ctx.blocks) {
            for (let item of block.items) {
                if (item.kind !== "call" || !item.call.success) {
                    continue
                }

                switch (item.name) {
                    case "Identity.set_identity":
                        if (!item.call.origin) {
                            continue
                        }

                        let data = getIdentities(ctx, item)

                        accountIdentities.push({
                            id: getOriginAccountId(item.call.origin),
                            ...data,
                        })

                        break
                }
            }
        }

        await saveAccountIdentities(ctx, accountIdentities)
    })
})

prometheusBasePort = prometheusBasePort + identityArchives.length

/*
    Balances.Transfer
*/

let transferArchives: KnownArchivesSubstrate[] = [
    "acala",
    //"aleph-zero-testnet",
    //"amplitude",
    "astar",
    //"bajun",
    "bifrost",
    //"calamari",
    //"crust",
    //"efinity",
    //"elysium",
    //"elysium-testnet",
    //"equilibrium",
    //"gear-testnet",
    //"gemini-2a-testnet",
    "gmordie",
    "hydradx",
    "interlay",
    //"invarch-tinkernet",
    //"joystream",
    "karura",
    "khala",
    "kintsugi",
    "kusama",
    //"litentry",
    //"litmus",
    //"moonbase",
    //"moonbeam",
    //"moonriver",
    //"opal",
    //"peaq",
    "phala",
    "polkadot",
    //"quartz",
    //"reef",
    //"reef-testnet",
    "rococo",
    //"shibuya",
    "shiden",
    //"snow",
    "statemine",
    "statemint",
    //"subsocial-parachain",
    //"t0rn",
    //"unique",
    //"vara"
]

transferArchives.map((archive, index) => {
    return {
        chain: archive,
        processorName: `balances_transfer_${archive}`,
        processor: new SubstrateBatchProcessor()
            .setPrometheusPort(prometheusBasePort + index)
            .setDataSource({
                archive: lookupArchive(archive, { release: "FireSquid" })
            })
            .addEvent("Balances.Transfer", {
                data: {
                    event: {
                        args: true,
                        extrinsic: {
                            hash: true,
                            fee: true
                        }
                    }
                }
            } as const)
    }
}).forEach(({ processorName, processor }) => {
    processor.run(new TypeormDatabase({ stateSchema: processorName }), async ctx => {
        type Item = BatchProcessorItem<typeof processor>
        type Ctx = BatchContext<Store, Item>

        function getAccountInteractions(ctx: Ctx): AccountInteractionEvent[] {
            let accountInteractions: AccountInteractionEvent[] = []
            for (let block of ctx.blocks) {
                for (let item of block.items) {
                    if (item.name == "Balances.Transfer") {
                        let e = new BalancesTransferEvent(ctx, item.event)
                        let rec: { from: Uint8Array, to: Uint8Array, amount: bigint }
                        if (e.isV1020) {
                            let [from, to, amount] = e.asV1020
                            rec = { from, to, amount }
                        } else if (e.isV1050) {
                            let [from, to, amount] = e.asV1050
                            rec = { from, to, amount }
                        } else if (e.isV9130) {
                            rec = e.asV9130
                        } else {
                            throw new Error("Unsupported spec")
                        }

                        let t = null

                        let from = encodeId(rec.from)
                        let to = encodeId(rec.to)

                        try {
                            t = {
                                id: to > from ? `${to}-${from}` : `${from}}-${to}`,
                                account1: to > from ? to : from,
                                account2: to > from ? from : to
                            }
                        } catch {
                            continue
                        }

                        accountInteractions.push(t)
                    }
                }
            }
            return accountInteractions
        }

        let accountInteractions = Array.from(getAccountInteractions(ctx).map(
            t => new AccountInteraction({
                id: t.id,
                account1: t.account1,
                account2: t.account2
            })
        ))

        let uniqueAccountInterctions = [...new Set(accountInteractions.map(i => i.id))].map(id => accountInteractions.find(i => i.id == id)!)

        await ctx.store.save(uniqueAccountInterctions)
    })
})

prometheusBasePort = prometheusBasePort + transferArchives.length

/*
    assets.Transferred
*/

let statemineArchives: KnownArchivesSubstrate[] = [
    "statemine",
    "statemint"
]

statemineArchives.map((archive, index) => {
    return {
        chain: archive,
        processorName: `assets_transferred_${archive}`,
        processor: new SubstrateBatchProcessor()
            .setPrometheusPort(prometheusBasePort + index)
            .setDataSource({
                archive: lookupArchive(archive, { release: "FireSquid" })
            })
            .addEvent("assets.Transferred", {
                data: {
                    event: {
                        args: true,
                        extrinsic: {
                            hash: true,
                            fee: true
                        }
                    }
                }
            } as const)
    }
}).forEach(({ processorName, processor }) => {
    processor.run(new TypeormDatabase({ stateSchema: processorName }), async ctx => {
        type Item = BatchProcessorItem<typeof processor>
        type Ctx = BatchContext<Store, Item>

        function getAccountInteractions(ctx: Ctx): AccountInteractionEvent[] {
            let accountInteractions: AccountInteractionEvent[] = []
            for (let block of ctx.blocks) {
                for (let item of block.items) {
                    if (item.name == "assets.Transferred") {
                        const event = new AssetsTransferredEvent(ctx, item.event)
                        let rec: { from: Uint8Array, to: Uint8Array }
                        if (event.isV3) {
                            const [assetId, from, to, amount] = event.asV3
                            rec = { from, to }
                        }
                        if (event.isV504) {
                            const [assetId, from, to, amount] = event.asV504
                            rec = { from, to }
                        }
                        if (event.isV700) {
                            const { assetId, from, to, amount } = event.asV700
                            rec = { from, to }
                        } else {
                            throw new Error("No Runtime version found")
                        }

                        let t = null

                        let from = encodeId(rec.from)
                        let to = encodeId(rec.to)

                        try {
                            t = {
                                id: to > from ? `${to}-${from}` : `${from}}-${to}`,
                                account1: to > from ? to : from,
                                account2: to > from ? from : to
                            }
                        } catch {
                            continue
                        }

                        accountInteractions.push(t)
                    }
                }
            }
            return accountInteractions
        }

        let accountInteractions = Array.from(getAccountInteractions(ctx).map(
            t => new AccountInteraction({
                id: t.id,
                account1: t.account1,
                account2: t.account2
            })
        ))

        let uniqueAccountInterctions = [...new Set(accountInteractions.map(i => i.id))].map(id => accountInteractions.find(i => i.id == id)!)

        await ctx.store.save(uniqueAccountInterctions)
    })
})

prometheusBasePort = prometheusBasePort + statemineArchives.length

/*
    * calls
*/

let callArchives: KnownArchivesSubstrate[] = [
    "acala",
    //"aleph-zero-testnet",
    //"amplitude",
    "astar",
    //"bajun",
    "bifrost",
    //"calamari",
    //"crust",
    //"efinity",
    //"elysium",
    //"elysium-testnet",
    //"equilibrium",
    //"gear-testnet",
    //"gemini-2a-testnet",
    "gmordie",
    "hydradx",
    "interlay",
    //"invarch-tinkernet",
    //"joystream",
    "karura",
    "khala",
    "kintsugi",
    "kusama",
    //"litentry",
    //"litmus",
    //"moonbase",
    //"moonbeam",
    //"moonriver",
    //"opal",
    //"peaq",
    "phala",
    "polkadot",
    //"quartz",
    //"reef",
    //"reef-testnet",
    "rococo",
    "shibuya",
    "shiden",
    //"snow",
    "statemine",
    "statemint",
    //"subsocial-parachain",
    //"t0rn",
    //"unique",
    //"vara"
]

callArchives.map((archive, index) => {
    return {
        chain: archive,
        processorName: `calls_${archive}`,
        processor: new SubstrateBatchProcessor()
            .setPrometheusPort(prometheusBasePort + index)
            .setDataSource({
                archive: lookupArchive(archive, { release: "FireSquid" })
            })
            .addCall("*", {
                data: {
                    call: {
                        origin: true
                    },
                },
            } as const)
    }
}).forEach(({ chain, processorName, processor }) => {
    type Item = BatchProcessorItem<typeof processor>
    type Ctx = BatchContext<Store, Item>

    processor.run(new TypeormDatabase({ stateSchema: processorName }), async ctx => {
        let accountActivities: AccountActivity[] = []

        for (let block of ctx.blocks) {
            for (let item of block.items) {
                if (item.kind !== "call" || !item.call.success || !item.call.origin || item.call.origin.value.__kind !== "Signed") {
                    continue
                }

                accountActivities.push(new AccountActivity({
                    id: `${chain}_${item.call.id}`,
                    account: getOriginAccountId(item.call.origin),
                    timestamp: new Date(block.header.timestamp)
                }))
            }
        }

        await ctx.store.insert([...accountActivities])
    })
})

prometheusBasePort = prometheusBasePort + callArchives.length

interface AccountInteractionEvent {
    id: string,
    account1: string
    account2: string
}

interface AccountIdentityEvent {
    id: string,
    display: string | null
    legal: string | null
    web: string | null
    riot: string | null
    email: string | null
    twitter: string | null
}

function unwrapData(data: { __kind: string; value?: Uint8Array }) {
    switch (data.__kind) {
        case "None":
        case "BlakeTwo256":
        case "Sha256":
        case "Keccak256":
        case "ShaThree256":
            return null
        default:
            return Buffer.from(data.value!).toString("utf-8")
    }
}

export function getOriginAccountId(origin: any): string {
    if (
        origin &&
        origin.__kind === "system" &&
        origin.value.__kind === "Signed"
    ) {
        const id = origin.value.value
        if (id.__kind === "Id") {
            return encodeId(decodeHex(id.value))
        } else {
            return encodeId(decodeHex(id))
        }
    } else {
        throw new Error("Unexpected origin")
    }
}

function encodeId(id: Uint8Array): string {
    return ss58.codec("polkadot").encode(id)
}

class UknownVersionError extends Error {
    constructor() {
        super("Uknown verson")
    }
}

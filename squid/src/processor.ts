import { lookupArchive, KnownArchivesSubstrate } from "@subsquid/archive-registry"
import * as ss58 from "@subsquid/ss58"
import { In } from "typeorm";
import { BatchContext, BatchProcessorItem, SubstrateBatchProcessor, decodeHex } from "@subsquid/substrate-processor"
import { CallItem } from "@subsquid/substrate-processor/lib/interfaces/dataSelection";
import { Store, TypeormDatabase } from "@subsquid/typeorm-store"
import { AccountTransfer, AccountIdentity } from "./model"
import { BalancesTransferEvent } from "./types/events"
import { IdentitySetIdentityCall } from "./types/calls";

let prometheusBasePort = 9000

/*
    AccountIdentity
*/

let identityArchives: KnownArchivesSubstrate[] = [
    "kusama",
    "polkadot",
    "rococo",
]

identityArchives.map((archive, index) => {
    return {
        chain: archive,
        processorName: `account_identity_${archive}`,
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
        let c = new IdentitySetIdentityCall(ctx, item.call);

        if (c.isV1030) {
            let { info } = c.asV1030;
            return {
                display: unwrapData(info.display),
                legal: unwrapData(info.legal),
                web: unwrapData(info.web),
                riot: unwrapData(info.riot),
                email: unwrapData(info.email),
                twitter: null,
            };
        } else if (c.isV1032) {
            let { info } = c.asV1032;
            return {
                display: unwrapData(info.display),
                legal: unwrapData(info.legal),
                web: unwrapData(info.web),
                riot: unwrapData(info.riot),
                email: unwrapData(info.email),
                twitter: unwrapData(info.twitter),
            };
        } else {
            throw new UknownVersionError();
        }
    }

    function getAccountIdentity(m: Map<string, AccountIdentity>, id: string): AccountIdentity {
        let acc = m.get(id);
        if (acc == null) {
            acc = new AccountIdentity();
            acc.id = id;
            m.set(id, acc);
        }
        return acc;
    }

    async function saveAccountIdentities(ctx: Ctx, identitiesData: AccountIdentityEvent[]) {
        let accountIds = new Set<string>();
        for (let i of identitiesData) {
            accountIds.add(i.id);
        }

        let accountIdentities = await ctx.store
            .findBy(AccountIdentity, { id: In([...accountIds]) })
            .then((accounts) => {
                return new Map(accounts.map((a) => [a.id, a]));
            });

        for (let i of identitiesData) {
            let accountIdentity = getAccountIdentity(accountIdentities, i.id);
            accountIdentity.display = i.display;
            accountIdentity.email = i.email;
            accountIdentity.legal = i.legal;
            accountIdentity.riot = i.riot;
            accountIdentity.twitter = i.twitter;
            accountIdentity.web = i.web;
        }

        let ais = Array.from(accountIdentities.values())

        let uniqueAis = [...new Set(ais.map(i => i.id))].map(id => ais.find(i => i.id == id)!)

        await ctx.store.save([...uniqueAis]);
    }

    processor.run(new TypeormDatabase({ stateSchema: processorName }), async ctx => {
        let accountIdentities: AccountIdentityEvent[] = [];

        for (let block of ctx.blocks) {
            for (let item of block.items) {
                if (item.kind !== "call" || !item.call.success) {
                    continue;
                }

                switch (item.name) {
                    case "Identity.set_identity":
                        if (!item.call.origin) {
                            continue;
                        }

                        let data = getIdentities(ctx, item);

                        accountIdentities.push({
                            id: getOriginAccountId(item.call.origin),
                            ...data,
                        });

                        break;
                }
            }
        }

        await saveAccountIdentities(ctx, accountIdentities);
    })
})

prometheusBasePort = prometheusBasePort + identityArchives.length

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
        processorName: `account_transfer_${archive}`,
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
}).forEach(({ chain, processorName, processor }) => {
    processor.run(new TypeormDatabase({ stateSchema: processorName }), async ctx => {
        type Item = BatchProcessorItem<typeof processor>
        type Ctx = BatchContext<Store, Item>

        function getTransfers(ctx: Ctx): TransferEvent[] {
            let transfers: TransferEvent[] = []
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
                            throw new Error('Unsupported spec')
                        }

                        let t = null

                        try {
                            t = {
                                id: `${chain}_${item.event.id}`,
                                chain: chain,
                                blockNumber: block.header.height,
                                timestamp: new Date(block.header.timestamp),
                                from: encodeId(rec.from),
                                to: encodeId(rec.to),
                                amount: rec.amount
                            }
                        } catch {
                            continue
                        }

                        transfers.push(t)
                    }
                }
            }
            return transfers
        }

        let accountTransfers = getTransfers(ctx).map(
            t => new AccountTransfer({
                id: t.id,
                chain: chain,
                blockNumber: t.blockNumber,
                timestamp: t.timestamp,
                account1: t.from,
                account2: t.to,
                amount: t.amount
            })
        )

        await ctx.store.insert(accountTransfers)
    })
})

interface TransferEvent {
    id: string,
    chain: string,
    blockNumber: number,
    timestamp: Date,
    from: string
    to: string,
    amount: bigint
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
            return null;
        default:
            return Buffer.from(data.value!).toString("utf-8");
    }
}

export function getOriginAccountId(origin: any): string {
    if (
        origin &&
        origin.__kind === "system" &&
        origin.value.__kind === "Signed"
    ) {
        const id = origin.value.value;
        if (id.__kind === "Id") {
            return encodeId(decodeHex(id.value));
        } else {
            return encodeId(decodeHex(id));
        }
    } else {
        throw new Error("Unexpected origin");
    }
}

function encodeId(id: Uint8Array): string {
    return ss58.codec("polkadot").encode(id);
}

class UknownVersionError extends Error {
    constructor() {
        super("Uknown verson");
    }
}

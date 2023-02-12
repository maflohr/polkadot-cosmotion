import { lookupArchive } from "@subsquid/archive-registry"
import * as ss58 from "@subsquid/ss58"
import { In } from "typeorm";
import { BatchContext, BatchProcessorItem, SubstrateBatchProcessor, decodeHex } from "@subsquid/substrate-processor"
import { CallItem } from "@subsquid/substrate-processor/lib/interfaces/dataSelection";
import { Store, TypeormDatabase } from "@subsquid/typeorm-store"
import { TransferAccountPair, Account, AccountIdentity } from "./model"
import { BalancesTransferEvent } from "./types/events"
import { IdentitySetIdentityCall } from "./types/calls";

let processor = new SubstrateBatchProcessor()
    .setDataSource({
        archive: lookupArchive("kusama", { release: "FireSquid" })
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
    .addCall("Identity.set_identity", {
        data: {
            call: {
                args: true,
                origin: true,
            },
        },
    } as const)

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
                        id: item.event.id,
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

    await ctx.store.save([...accountIdentities.values()]);
}

processor.run(new TypeormDatabase(), async ctx => {
    let transferAccountPairs = getTransfers(ctx).map(
        t => new TransferAccountPair({
            id: t.from < t.to ? t.from + "-" + t.to : t.to + "-" + t.from,
            account1: t.from < t.to ? t.from : t.to,
            account2: t.from < t.to ? t.to : t.from,
            volume: t.amount
        })
    )

    let uniqueTransferAccountPairs = [...new Set(transferAccountPairs.map(i => i.id))].map(id => transferAccountPairs.find(i => i.id == id)!)

    uniqueTransferAccountPairs.forEach(async tap => {
        const dbTransferAccountPair = await ctx.store.findOne(TransferAccountPair,
            {
                where: {
                    account1: tap.account1,
                    account2: tap.account2
                }
            }
        )

        if (dbTransferAccountPair) {
            tap.volume += dbTransferAccountPair.volume
        }
    })

    let accounts = uniqueTransferAccountPairs
        .map(tap => new Account({ id: tap.account1, transferVolume: tap.volume })).concat(
            uniqueTransferAccountPairs
                .map(tap => new Account({ id: tap.account2, transferVolume: tap.volume })))

    let uniqueAccounts = [...new Set(accounts.map(i => i.id))].map(id => {
        let account = new Account({ id })
        account.transferVolume = accounts.filter(i => i.id == id).reduce((a, b) => a + b.transferVolume, BigInt(0))
        return account
    })

    uniqueAccounts.forEach(async a => {
        const dbAccount = await ctx.store.findOne(Account,
            {
                where: {
                    id: a.id
                }
            }
        )

        if (dbAccount) {
            a.transferVolume += dbAccount.transferVolume
        }
    })

    let accountIdentities: AccountIdentityEvent[] = [];

    for (let block of ctx.blocks) {
        for (let item of block.items) {
            if (item.kind !== "call" || !item.call.success) continue;
            switch (item.name) {
                case "Identity.set_identity":
                    if (!item.call.origin) continue;
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
    await ctx.store.save(uniqueTransferAccountPairs)
    await ctx.store.save(uniqueAccounts)
})

interface TransferEvent {
    id: string
    from: string
    to: string,
    amount: bigint
}

interface AccountIdentityEvent {
    id: string
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

function getAccount(m: Map<string, Account>, id: string): Account {
    let acc = m.get(id);
    if (acc == null) {
        acc = new Account();
        acc.id = id;
        m.set(id, acc);
    }
    return acc;
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
    return ss58.codec("kusama").encode(id);
}

class UknownVersionError extends Error {
    constructor() {
        super("Uknown verson");
    }
}

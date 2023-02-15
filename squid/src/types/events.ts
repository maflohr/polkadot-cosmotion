import assert from 'assert'
import { Chain, ChainContext, EventContext, Event, Result, Option, deprecateLatest } from './support'
import * as v504 from './v504'
import * as v700 from './v700'

export class BalancesTransferEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'Balances.Transfer')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     *  Transfer succeeded (from, to, value, fees).
     */
    get isV1020(): boolean {
        return this._chain.getEventHash('Balances.Transfer') === '72e6f0d399a72f77551d560f52df25d757e0643d0192b3bc837cbd91b6f36b27'
    }

    /**
     *  Transfer succeeded (from, to, value, fees).
     */
    get asV1020(): [Uint8Array, Uint8Array, bigint, bigint] {
        assert(this.isV1020)
        return this._chain.decodeEvent(this.event)
    }

    /**
     *  Transfer succeeded (from, to, value).
     */
    get isV1050(): boolean {
        return this._chain.getEventHash('Balances.Transfer') === 'dad2bcdca357505fa3c7832085d0db53ce6f902bd9f5b52823ee8791d351872c'
    }

    /**
     *  Transfer succeeded (from, to, value).
     */
    get asV1050(): [Uint8Array, Uint8Array, bigint] {
        assert(this.isV1050)
        return this._chain.decodeEvent(this.event)
    }

    /**
     * Transfer succeeded.
     */
    get isV9130(): boolean {
        return this._chain.getEventHash('Balances.Transfer') === '0ffdf35c495114c2d42a8bf6c241483fd5334ca0198662e14480ad040f1e3a66'
    }

    /**
     * Transfer succeeded.
     */
    get asV9130(): { from: Uint8Array, to: Uint8Array, amount: bigint } {
        assert(this.isV9130)
        return this._chain.decodeEvent(this.event)
    }
}

export class AssetsTransferredEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'assets.Transferred')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     *  Some assets were transferred. \[asset_id, from, to, amount\]
     */
    get isV3(): boolean {
        return this._chain.getEventHash('assets.Transferred') === '5940cf5f83945a6024e99655f1979c05762583b5af1201dba66c10c18b56cff1'
    }

    /**
     *  Some assets were transferred. \[asset_id, from, to, amount\]
     */
    get asV3(): [number, Uint8Array, Uint8Array, bigint] {
        assert(this.isV3)
        return this._chain.decodeEvent(this.event)
    }

    /**
     * Some assets were transferred. \[asset_id, from, to, amount\]
     */
    get isV504(): boolean {
        return this._chain.getEventHash('assets.Transferred') === 'd6b774c5b258baa877a8319bea3e3f8d42d54077cfd3ad4848765f205196496c'
    }

    /**
     * Some assets were transferred. \[asset_id, from, to, amount\]
     */
    get asV504(): [number, v504.AccountId32, v504.AccountId32, bigint] {
        assert(this.isV504)
        return this._chain.decodeEvent(this.event)
    }

    /**
     * Some assets were transferred.
     */
    get isV700(): boolean {
        return this._chain.getEventHash('assets.Transferred') === 'd868858871cc662d14a67687feea357ae842db006bcaef16e832ad8bf3f67215'
    }

    /**
     * Some assets were transferred.
     */
    get asV700(): { assetId: number, from: v700.AccountId32, to: v700.AccountId32, amount: bigint } {
        assert(this.isV700)
        return this._chain.decodeEvent(this.event)
    }

    get isLatest(): boolean {
        deprecateLatest()
        return this.isV700
    }

    get asLatest(): { assetId: number, from: v700.AccountId32, to: v700.AccountId32, amount: bigint } {
        deprecateLatest()
        return this.asV700
    }
}
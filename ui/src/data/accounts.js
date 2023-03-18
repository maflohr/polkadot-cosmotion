import base from "./base.js";
import {decode, encode} from "@subsquid/ss58-codec"

function potentiallyEncodeAddress(q) {
    let result = q;

    if (q && q.length >= 32) {
        try {
            let a = decode(q);
            a.prefix = 0;
            result = encode(a);
        } catch (e) {
            // ignore
        }
    }

    return result;
}

export default {
    async all(q) {
        return await base.get("/accounts", { params: { q: potentiallyEncodeAddress(q) } });
    },
    async get(id, q) {
        return await base.get(`/accounts/${id}`, { params: { q: potentiallyEncodeAddress(q) } });
    }
}

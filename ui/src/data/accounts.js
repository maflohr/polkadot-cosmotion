import base from "./base.js";

export default {
    async all(q) {
        return await base.get("/accounts", { params: { q: q } });
    },
    async get(id, q) {
        return await base.get(`/accounts/${id}`, { params: { q: q } });
    }
}

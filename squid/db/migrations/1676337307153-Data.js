module.exports = class Data1676337307153 {
    name = 'Data1676337307153'

    async up(db) {
        await db.query(`CREATE TABLE "account_identity" ("id" character varying NOT NULL, "display" text, "legal" text, "web" text, "riot" text, "email" text, "twitter" text, CONSTRAINT "PK_ff3623f6775193bb2a7286c2e81" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "account_transfer" ("id" character varying NOT NULL, "chain" text NOT NULL, "block_number" integer NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "account1" text NOT NULL, "account2" text NOT NULL, "amount" numeric NOT NULL, CONSTRAINT "PK_3b959a286b97fc83be6cec239a9" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_281af355f4a52503d977f03ce8" ON "account_transfer" ("block_number") `)
        await db.query(`CREATE INDEX "IDX_96fa360213e5ac56986b459f3d" ON "account_transfer" ("timestamp") `)
        await db.query(`CREATE INDEX "IDX_b4d7368ebcab6352fa37a92592" ON "account_transfer" ("account1") `)
        await db.query(`CREATE INDEX "IDX_ce31e5190c71eed1ac41f49ce8" ON "account_transfer" ("account2") `)
    }

    async down(db) {
        await db.query(`DROP TABLE "account_identity"`)
        await db.query(`DROP TABLE "account_transfer"`)
        await db.query(`DROP INDEX "public"."IDX_281af355f4a52503d977f03ce8"`)
        await db.query(`DROP INDEX "public"."IDX_96fa360213e5ac56986b459f3d"`)
        await db.query(`DROP INDEX "public"."IDX_b4d7368ebcab6352fa37a92592"`)
        await db.query(`DROP INDEX "public"."IDX_ce31e5190c71eed1ac41f49ce8"`)
    }
}

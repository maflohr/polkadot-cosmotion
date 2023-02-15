module.exports = class Data1676352043826 {
    name = 'Data1676352043826'

    async up(db) {
        await db.query(`CREATE TABLE "account_identity" ("id" character varying NOT NULL, "display" text, "legal" text, "web" text, "riot" text, "email" text, "twitter" text, CONSTRAINT "PK_ff3623f6775193bb2a7286c2e81" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "account_interaction" ("id" character varying NOT NULL, "account1" text NOT NULL, "account2" text NOT NULL, CONSTRAINT "PK_b91d22c61bf2b5462da30b1d17d" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_898c04a828bfc4f9e112346099" ON "account_interaction" ("account1") `)
        await db.query(`CREATE INDEX "IDX_75a372ddcbeacc0866bd09cfce" ON "account_interaction" ("account2") `)
        await db.query(`CREATE TABLE "account_activity" ("id" character varying NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "account" text NOT NULL, CONSTRAINT "PK_b7ec3361aff04ce86cabbedf545" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_9e927b09d439f10d1c73f1703a" ON "account_activity" ("timestamp") `)
        await db.query(`CREATE INDEX "IDX_8a6ac0b43eb747f006a956b0d8" ON "account_activity" ("account") `)
    }

    async down(db) {
        await db.query(`DROP TABLE "account_identity"`)
        await db.query(`DROP TABLE "account_interaction"`)
        await db.query(`DROP INDEX "public"."IDX_898c04a828bfc4f9e112346099"`)
        await db.query(`DROP INDEX "public"."IDX_75a372ddcbeacc0866bd09cfce"`)
        await db.query(`DROP TABLE "account_activity"`)
        await db.query(`DROP INDEX "public"."IDX_9e927b09d439f10d1c73f1703a"`)
        await db.query(`DROP INDEX "public"."IDX_8a6ac0b43eb747f006a956b0d8"`)
    }
}

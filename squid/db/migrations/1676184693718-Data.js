module.exports = class Data1676184693718 {
    name = 'Data1676184693718'

    async up(db) {
        await db.query(`CREATE TABLE "account" ("id" character varying NOT NULL, "transfer_volume" numeric NOT NULL, CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "account_identity" ("id" character varying NOT NULL, "display" text, "legal" text, "web" text, "riot" text, "email" text, "twitter" text, CONSTRAINT "PK_ff3623f6775193bb2a7286c2e81" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "transfer_account_pair" ("id" character varying NOT NULL, "account1" text NOT NULL, "account2" text NOT NULL, "volume" numeric NOT NULL, CONSTRAINT "PK_2beb381935a24494a2a128e83e8" PRIMARY KEY ("id"))`)
    }

    async down(db) {
        await db.query(`DROP TABLE "account"`)
        await db.query(`DROP TABLE "account_identity"`)
        await db.query(`DROP TABLE "transfer_account_pair"`)
    }
}

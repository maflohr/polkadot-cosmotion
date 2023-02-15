import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_} from "typeorm"

@Entity_()
export class AccountInteraction {
    constructor(props?: Partial<AccountInteraction>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @Column_("text", {nullable: false})
    account1!: string

    @Index_()
    @Column_("text", {nullable: false})
    account2!: string
}

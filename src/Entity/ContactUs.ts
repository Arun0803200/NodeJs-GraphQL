import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_contact_us')
export class ContactUs {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Field()
    @Column({ name: 'sender_name', type: 'varchar', length: '255' })
    public senderName: string;

    @Field()
    @Column({ name: 'sender_email', type: 'varchar', length: '255' })
    public senderEmail: string;

    @Field()
    @Column({ name: 'message', type: 'text', default: null })
    public message: string;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}

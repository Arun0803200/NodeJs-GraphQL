import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
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

    // Inbox state, shared by the portfolio owner and admins
    @Field()
    @Index('idx_contact_unread')
    @Column({ name: 'is_read', type: 'boolean', default: false })
    public isRead: boolean;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'read_at', type: 'timestamp', nullable: true })
    public readAt: Date | null;

    @Field()
    @Column({ name: 'is_starred', type: 'boolean', default: false })
    public isStarred: boolean;

    @Field()
    @Column({ name: 'is_archived', type: 'boolean', default: false })
    public isArchived: boolean;

    // website (published template site) | portfolio (legacy section page)
    @Field()
    @Column({ name: 'source', type: 'varchar', length: 20, default: 'portfolio' })
    public source: string;

    @Column({ name: 'sender_ip', type: 'varchar', length: 64, nullable: true })
    public senderIp: string | null;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}

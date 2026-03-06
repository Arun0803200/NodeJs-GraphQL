import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";
import { SocialMediaTypes } from "../Config/SettingsTypes";

@ObjectType()
@Entity('tbl_users')
export class User {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Column({ name: 'full_name', type: 'varchar', length: '255', nullable: false })
    public fullName: string;

    @Field()
    @Column({ name: 'designation', type: 'varchar', length: '255', nullable: false })
    public designation: string;

    @Field()
    @Index('idx_unique_user_uuid', { unique: true })
    @Column({
        name: "user_uuid",
        type: "uuid",
        default: () => "gen_random_uuid()"
    })
    public userUuid: string;

    @Field()
    @Column({ name: 'contact_us_description', type: 'varchar', length: '255' })
    public contactUsDescription: string;

    @Field()
    @Index('idx_unique_user_email', { unique: true })
    @Column({ name: 'email', type: 'varchar', length: '255' })
    public email: string;

    @Field()
    @Index('idx_unique_user_mobile_no', { unique: true })
    @Column({ name: 'mobile_no', type: 'varchar', length: '10' })
    public mobileNo: string;

    @Field()
    @Column({ name: 'address', type: 'varchar', length: '255' })
    public address: string;

    @Field(() => [SocialMediaTypes])
    @Column({ name: 'social_media', type: 'jsonb' })
    public socialMedia: SocialMediaTypes[];

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public updatedAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_auth')
export class Auth {

    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Index()
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Field()
    @Index({ unique: true })
    @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
    public email: string;

    @Column({ name: 'password', type: 'varchar', length: 255 })
    public password: string;

    @Field()
    @Column({ name: 'role', type: 'varchar', length: 20, default: 'user' })
    public role: string;

    @Field()
    @Column({ name: 'is_active', type: 'boolean', default: true })
    public isActive: boolean;

    // sha256 of the emailed reset token; the raw token is never stored
    @Column({ name: 'reset_token_hash', type: 'varchar', length: 64, nullable: true })
    public resetTokenHash: string | null;

    @Column({ name: 'reset_token_expires_at', type: 'timestamp', nullable: true })
    public resetTokenExpiresAt: Date | null;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}

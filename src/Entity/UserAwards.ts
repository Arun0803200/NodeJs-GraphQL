import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_users_awards')
export class UserAwards {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Field()
    @Column({ name: 'title', type: 'varchar', length: '225' })
    public title: string;

    @Field()
    @Column({ name: 'description', type: 'varchar', length: '225' })
    public description: string;

    @Field()
    @Column({ name: 'company_id', type: 'int' })
    public companyId: number;

    @Field()
    @Column({ name: 'event_date', type: 'timestamp' })
    public eventDate: string;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}
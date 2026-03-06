import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_user_experience')
export class UserExperience {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Field()
    @Column({ name: 'company_name', type: 'varchar', length: '255' })
    public companyName: string;

    @Field()
    @Column({ name: 'company_url', type: 'varchar', length: '255' })
    public companyUrl: string;

    @Field()
    @Column({ name: 'company_location', type: 'varchar', length: '255' })
    public companyLocation: string;

    @Field()
    @Column({ name: 'designation', type: 'varchar', length: '255' })
    public designation: string;

    @Field()
    @Column({ name: 'start_date', type: 'date' })
    public startDate: Date;

    @Field()
    @Column({ name: 'end_date', type: 'date', default: null })
    public endDate: Date;

    @Field()
    @Column({ name: 'is_currently_working', type: 'boolean', default: false })
    public isCurrentlyWorking: boolean;

    @Field()
    @Column({ name: 'job_description', type: 'text' })
    public jobDescription: string;

    @Field()
    @Column({ name: 'skills', type: 'jsonb' })
    public skills: string[];

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}
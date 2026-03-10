import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_user_experience')
export class UserExperience {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Index('idx_user_experience_uuid')
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

    @Field(() => Date)
    @Column({ name: 'start_date', type: 'timestamp', nullable: true })
    public startDate: Date;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'end_date', type: 'timestamp', nullable: true })
    public endDate?: Date;

    @Field()
    @Column({ name: 'is_currently_working', type: 'boolean', default: false })
    public isCurrentlyWorking: boolean;

    @Field()
    @Column({ name: 'job_description', type: 'text' })
    public jobDescription: string;

    @Field(() => [String])
    @Column({ name: 'skills', type: 'jsonb' })
    public skills: string[];

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}
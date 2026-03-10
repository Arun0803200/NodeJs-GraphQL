import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_user_projects')
export class UserProjects {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Index('idx_user_projects_uuid')
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Field()
    @Column({ name: 'project_name', type: 'varchar', length: '255', nullable: false })
    public projectName: string;

    @Field()
    @Column({ name: 'project_description', type: 'text', nullable: false })
    public projectDescription: string;

    @Field()
    @Column({ name: 'project_url', type: 'varchar', length: '255', nullable: true })
    public projectUrl: string;

    @Field()
    @Column({ name: 'project_start_date', type: 'timestamp', nullable: false })
    public projectStartDate: Date;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'project_end_date', type: 'timestamp', nullable: true })
    public projectEndDate: Date;

    @Field()
    @Column({ name: 'is_current_project', type: 'boolean', default: false })
    public isCurrentProject: boolean;

    @Field()
    @Column({ name: 'project_long_description', type: 'text', nullable: false })
    public projectLongDescription: string;

    @Field(() => [String])
    @Column({ name: 'key_features', type: 'jsonb', nullable: false })
    public keyFeatures: string[];

    @Field(() => [String])
    @Column({ name: 'technologies_skills', type: 'jsonb', nullable: false })
    public technologiesSkills: string[];

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}

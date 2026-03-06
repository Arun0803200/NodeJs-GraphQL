import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_user_projects')
export class UserProjects {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Field()
    @Column({ name: 'project_name', type: 'varchar', length: '255' })
    public projectName: string;

    @Field()
    @Column({ name: 'project_description', type: 'text' })
    public projectDescription: string;

    @Field()
    @Column({ name: 'project_url', type: 'varchar', length: '255' })
    public projectUrl: string;

    @Field()
    @Column({ name: 'project_start_date', type: 'date' })
    public projectStartDate: Date;

    @Field()
    @Column({ name: 'project_end_date', type: 'date', default: null })
    public projectEndDate: Date;

    @Field()
    @Column({ name: 'is_current_project', type: 'boolean', default: false })
    public isCurrentProject: boolean;

    @Field()
    @Column({ name: 'project_long_description', type: 'text' })
    public projectLongDescription: string;

    @Field()
    @Column({ name: 'key_features', type: 'jsonb' })
    public keyFeatures: any;

    @Field()
    @Column({ name: 'technologies_skills', type: 'jsonb' })
    public technologiesSkills: any;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}

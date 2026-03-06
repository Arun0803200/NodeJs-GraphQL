import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_about')
export class About {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Index('idx_about_user_uuid')
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Field()
    @Column({ name: 'title', type: 'varchar', length: '255' })
    public title: string;

    @Field()
    @Column({ name: 'description', type: 'text' })
    public description: string;

    @Field()
    @Column({ name: 'long_description', type: 'text' })
    public longDescription: string;

    @Field()
    @Column({ name: 'total_experience', type: 'int' })
    public totalExperience: number;

    @Field()
    @Column({ name: 'total_projects', type: 'int' })
    public totalProjects: number;

    @Field()
    @Column({ name: 'total_awards', type: 'int' })
    public totalAwards: number;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}
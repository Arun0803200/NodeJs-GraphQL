import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_user_education')

export class UserEducation {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Field()
    @Column({ name: 'degree', type: 'varchar', length: '255' })
    public degree: string;

    @Field()
    @Column({ name: 'field_of_study', type: 'varchar', length: '255' })
    public fieldOfStudy: string;

    @Field()
    @Column({ name: 'institution', type: 'varchar', length: '255' })
    public institution: string;

    @Field()
    @Column({ name: 'institution_location', type: 'varchar', length: '255' })
    public institutionLocation: string;

    @Field()
    @Column({ name: 'start_date', type: 'timestamp' })
    public startYear: string;

    @Field()
    @Column({ name: 'end_date', type: 'timestamp' })
    public endYear: string;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}
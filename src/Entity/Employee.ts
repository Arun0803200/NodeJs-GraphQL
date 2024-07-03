import { Entity, PrimaryGeneratedColumn, Column, In } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_employee')
export class Employee {
    @Field(() => Int)
    @PrimaryGeneratedColumn({name: 'id'})
    public id: number;

    @Field()
    @Column({name: 'first_name', type: 'varchar', length: '255'})
    public firstName: string;
    
    @Field()
    @Column({name: 'role', type: 'int'})
    public role: number;
}
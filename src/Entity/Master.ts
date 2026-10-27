import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

// A master type is one lookup list (e.g. "degree", "skill"). Its values live in tbl_master_values.
@ObjectType()
@Entity('tbl_master_types')
export class MasterType {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    // Stable key the frontend asks for, e.g. masters(typeCode: "degree")
    @Field()
    @Index('idx_unique_master_type_code', { unique: true })
    @Column({ name: 'code', type: 'varchar', length: 60 })
    public code: string;

    @Field()
    @Column({ name: 'name', type: 'varchar', length: 120 })
    public name: string;

    @Field()
    @Column({ name: 'description', type: 'text', default: '' })
    public description: string;

    // Values of this type may point at a value of the parent type (e.g. skill -> skill_category)
    @Field(() => Int, { nullable: true })
    @Column({ name: 'parent_type_id', type: 'int', nullable: true })
    public parentTypeId: number | null;

    // Seeded types the app relies on; their code is locked and they cannot be deleted
    @Field()
    @Column({ name: 'is_system', type: 'boolean', default: false })
    public isSystem: boolean;

    @Field()
    @Column({ name: 'is_active', type: 'boolean', default: true })
    public isActive: boolean;

    @Field(() => Int)
    @Column({ name: 'sort_order', type: 'int', default: 0 })
    public sortOrder: number;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public updatedAt: Date;
}

@ObjectType()
@Entity('tbl_master_values')
@Index('idx_unique_master_value_code', ['typeId', 'code'], { unique: true })
export class MasterValue {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field(() => Int)
    @Index('idx_master_value_type')
    @Column({ name: 'type_id', type: 'int' })
    public typeId: number;

    @ManyToOne(() => MasterType, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'type_id' })
    public type?: MasterType;

    @Field()
    @Column({ name: 'code', type: 'varchar', length: 120 })
    public code: string;

    @Field()
    @Column({ name: 'label', type: 'varchar', length: 255 })
    public label: string;

    @Field()
    @Column({ name: 'description', type: 'text', default: '' })
    public description: string;

    @Field(() => Int, { nullable: true })
    @Column({ name: 'parent_id', type: 'int', nullable: true })
    public parentId: number | null;

    @ManyToOne(() => MasterValue, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'parent_id' })
    public parent?: MasterValue | null;

    @Field()
    @Column({ name: 'is_active', type: 'boolean', default: true })
    public isActive: boolean;

    @Field(() => Int)
    @Column({ name: 'sort_order', type: 'int', default: 0 })
    public sortOrder: number;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public updatedAt: Date;
}

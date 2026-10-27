import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int, Float } from "type-graphql";

// numeric columns come back from pg as strings; expose them as numbers
const numericTransformer = {
    to: (value?: number | null) => value,
    from: (value?: string | null) => (value === null || value === undefined ? null : parseFloat(value)),
};

export const TEMPLATE_CATEGORIES = ["free", "premium"] as const;

@ObjectType()
@Entity('tbl_templates')
export class Template {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Column({ name: 'name', type: 'varchar', length: 120 })
    public name: string;

    @Field()
    @Index('idx_unique_template_slug', { unique: true })
    @Column({ name: 'slug', type: 'varchar', length: 120 })
    public slug: string;

    // Which frontend design renders this template (see frontend/src/templates/registry.ts)
    @Field()
    @Column({ name: 'design_key', type: 'varchar', length: 60 })
    public designKey: string;

    @Field()
    @Index('idx_template_category')
    @Column({ name: 'category', type: 'varchar', length: 20, default: 'free' })
    public category: string;

    @Field()
    @Column({ name: 'description', type: 'text', default: '' })
    public description: string;

    @Field(() => [String])
    @Column({ name: 'tags', type: 'jsonb', default: () => "'[]'::jsonb" })
    public tags: string[];

    @Field(() => Float)
    @Column({ name: 'original_price', type: 'numeric', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
    public originalPrice: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'discount_price', type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: numericTransformer })
    public discountPrice: number | null;

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

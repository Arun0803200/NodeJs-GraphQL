import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

// A user's website: the chosen template plus the content they filled in.
// One site per user. Publishing submits it for admin review; once approved it is served at /<user_name>.
@ObjectType()
@Entity('tbl_user_sites')
export class UserSite {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Index('idx_unique_user_site_user', { unique: true })
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Field(() => Int)
    @Column({ name: 'template_id', type: 'int' })
    public templateId: number;

    @Column({ name: 'content', type: 'jsonb', default: () => "'{}'::jsonb" })
    public content: Record<string, unknown>;

    // Review state of the latest submitted content: draft | pending | approved | rejected
    @Field()
    @Index('idx_user_site_status')
    @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
    public status: string;

    @Field(() => String, { nullable: true })
    @Column({ name: 'review_note', type: 'text', nullable: true })
    public reviewNote: string | null;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
    public submittedAt: Date | null;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
    public reviewedAt: Date | null;

    // Snapshot an admin approved; this is what /<user_name> serves while newer edits await review
    @Column({ name: 'live_template_id', type: 'int', nullable: true })
    public liveTemplateId: number | null;

    @Column({ name: 'live_content', type: 'jsonb', nullable: true })
    public liveContent: Record<string, unknown> | null;

    // True while an approved snapshot is online
    @Field()
    @Column({ name: 'is_published', type: 'boolean', default: false })
    public isPublished: boolean;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'published_at', type: 'timestamp', nullable: true })
    public publishedAt: Date | null;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public updatedAt: Date;
}

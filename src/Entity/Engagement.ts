import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

// A visitor's rating & review of the business, a driver or a vehicle (per owner-defined rating type)
@Entity('tbl_reviews')
@Index('idx_review_owner_status', ['ownerUuid', 'status'])
export class Review {
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Column({ name: 'owner_uuid', type: 'uuid' })
    public ownerUuid: string;

    @Column({ name: 'type_id', type: 'varchar', length: 40 })
    public typeId: string;

    // business | driver | vehicle
    @Column({ name: 'target', type: 'varchar', length: 10 })
    public target: string;

    // Driver / vehicle id within the site content; null for the business
    @Column({ name: 'target_id', type: 'varchar', length: 40, nullable: true })
    public targetId: string | null;

    // Name at the time of review, so the owner still sees it if the driver/vehicle is renamed or removed
    @Column({ name: 'target_name', type: 'varchar', length: 120, nullable: true })
    public targetName: string | null;

    @Column({ name: 'rating', type: 'smallint' })
    public rating: number;

    // { criterionId: 1-5 }
    @Column({ name: 'criteria', type: 'jsonb', default: () => "'{}'::jsonb" })
    public criteria: Record<string, number>;

    @Column({ name: 'comment', type: 'text', nullable: true })
    public comment: string | null;

    @Column({ name: 'reviewer_name', type: 'varchar', length: 80 })
    public reviewerName: string;

    // Private to the owner (to verify genuine customers); never shown publicly
    @Column({ name: 'reviewer_phone', type: 'varchar', length: 20, nullable: true })
    public reviewerPhone: string | null;

    // pending | approved | hidden
    @Column({ name: 'status', type: 'varchar', length: 10, default: 'pending' })
    public status: string;

    @Column({ name: 'owner_reply', type: 'text', nullable: true })
    public ownerReply: string | null;

    @Column({ name: 'lang', type: 'varchar', length: 5, default: 'en' })
    public lang: string;

    @Column({ name: 'ip', type: 'varchar', length: 64, nullable: true })
    public ip: string | null;

    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public updatedAt: Date;
}

// Answers sent through one of the owner's custom forms
@Entity('tbl_form_submissions')
@Index('idx_form_sub_owner_created', ['ownerUuid', 'createdAt'])
export class FormSubmission {
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Index('idx_form_sub_ref', { unique: true })
    @Column({ name: 'ref', type: 'varchar', length: 16 })
    public ref: string;

    @Column({ name: 'owner_uuid', type: 'uuid' })
    public ownerUuid: string;

    @Column({ name: 'form_id', type: 'varchar', length: 40 })
    public formId: string;

    // Title at submission time (forms can be renamed later)
    @Column({ name: 'form_title', type: 'varchar', length: 120 })
    public formTitle: string;

    // [{ fieldId, label, value }] — labels/values in the visitor's language
    @Column({ name: 'answers', type: 'jsonb' })
    public answers: { fieldId: string; label: string; value: string }[];

    // new | done | archived
    @Column({ name: 'status', type: 'varchar', length: 10, default: 'new' })
    public status: string;

    @Column({ name: 'owner_note', type: 'text', nullable: true })
    public ownerNote: string | null;

    @Column({ name: 'lang', type: 'varchar', length: 5, default: 'en' })
    public lang: string;

    @Column({ name: 'ip', type: 'varchar', length: 64, nullable: true })
    public ip: string | null;

    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public updatedAt: Date;
}

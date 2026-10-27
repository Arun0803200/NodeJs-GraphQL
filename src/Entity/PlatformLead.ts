import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

// A "Contact us" enquiry to the platform (admins), sent from any website or the storefront
@Entity('tbl_platform_leads')
@Index('idx_platform_lead_status_created', ['status', 'createdAt'])
export class PlatformLead {
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Index('idx_platform_lead_ref', { unique: true })
    @Column({ name: 'ref', type: 'varchar', length: 16 })
    public ref: string;

    @Column({ name: 'name', type: 'varchar', length: 120 })
    public name: string;

    @Column({ name: 'phone', type: 'varchar', length: 20 })
    public phone: string;

    @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
    public email: string | null;

    // new-website | pricing | support | partnership | other
    @Column({ name: 'purpose', type: 'varchar', length: 20 })
    public purpose: string;

    @Column({ name: 'message', type: 'text' })
    public message: string;

    // Where the visitor was: a website username, or "storefront"
    @Column({ name: 'source', type: 'varchar', length: 80 })
    public source: string;

    @Column({ name: 'page_url', type: 'varchar', length: 300, nullable: true })
    public pageUrl: string | null;

    // new | contacted | converted | closed
    @Column({ name: 'status', type: 'varchar', length: 12, default: 'new' })
    public status: string;

    @Column({ name: 'admin_note', type: 'text', nullable: true })
    public adminNote: string | null;

    @Column({ name: 'lang', type: 'varchar', length: 5, default: 'en' })
    public lang: string;

    @Column({ name: 'ip', type: 'varchar', length: 64, nullable: true })
    public ip: string | null;

    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public updatedAt: Date;
}

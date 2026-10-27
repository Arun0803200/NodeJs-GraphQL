import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

// A "Drive with us" application sent from a travels website. Document photos are private storage keys.
@Entity('tbl_driver_applications')
@Index('idx_driver_app_owner_created', ['ownerUuid', 'createdAt'])
export class DriverApplication {
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    // Shared with the applicant and in the WhatsApp message, e.g. DRV-7K3Q9A
    @Index('idx_driver_app_ref', { unique: true })
    @Column({ name: 'ref', type: 'varchar', length: 16 })
    public ref: string;

    @Column({ name: 'owner_uuid', type: 'uuid' })
    public ownerUuid: string;

    // new | shortlisted | hired | rejected
    @Column({ name: 'status', type: 'varchar', length: 12, default: 'new' })
    public status: string;

    @Column({ name: 'full_name', type: 'varchar', length: 120 })
    public fullName: string;

    @Column({ name: 'phone', type: 'varchar', length: 20 })
    public phone: string;

    @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
    public email: string | null;

    @Column({ name: 'age', type: 'int', nullable: true })
    public age: number | null;

    @Column({ name: 'area', type: 'varchar', length: 200 })
    public area: string;

    @Column({ name: 'experience_years', type: 'int', default: 0 })
    public experienceYears: number;

    @Column({ name: 'license_number', type: 'varchar', length: 40 })
    public licenseNumber: string;

    // LMV | LMV-TR (transport / badge) | HMV
    @Column({ name: 'license_type', type: 'varchar', length: 20 })
    public licenseType: string;

    @Column({ name: 'license_valid_till', type: 'varchar', length: 20 })
    public licenseValidTill: string;

    @Column({ name: 'vehicle_types', type: 'jsonb', default: () => "'[]'::jsonb" })
    public vehicleTypes: string[];

    @Column({ name: 'languages', type: 'varchar', length: 200, default: '' })
    public languages: string;

    // full-time | part-time | weekends | on-call
    @Column({ name: 'availability', type: 'varchar', length: 20 })
    public availability: string;

    // city | outstation | both
    @Column({ name: 'trip_preference', type: 'varchar', length: 12 })
    public tripPreference: string;

    @Column({ name: 'expected_salary', type: 'varchar', length: 60, nullable: true })
    public expectedSalary: string | null;

    @Column({ name: 'own_vehicle', type: 'varchar', length: 120, nullable: true })
    public ownVehicle: string | null;

    @Column({ name: 'about', type: 'text', nullable: true })
    public about: string | null;

    @Column({ name: 'photo_key', type: 'varchar', length: 300, nullable: true })
    public photoKey: string | null;

    @Column({ name: 'license_front_key', type: 'varchar', length: 300, nullable: true })
    public licenseFrontKey: string | null;

    @Column({ name: 'license_back_key', type: 'varchar', length: 300, nullable: true })
    public licenseBackKey: string | null;

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

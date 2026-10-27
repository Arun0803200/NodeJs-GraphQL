import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int, Float } from "type-graphql";

const numeric = {
    to: (v?: number | null) => v,
    from: (v?: string | null) => (v === null || v === undefined ? null : parseFloat(v)),
};

// A trip request made on a travels/taxi website; the fare is recomputed on the server from the owner's published rates
@ObjectType()
@Entity('tbl_trip_bookings')
@Index('idx_trip_owner_created', ['ownerUuid', 'createdAt'])
export class TripBooking {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    // Short code shared with the customer and in the WhatsApp message, e.g. TRP-7K3Q9A
    @Field()
    @Index('idx_trip_ref', { unique: true })
    @Column({ name: 'booking_ref', type: 'varchar', length: 16 })
    public bookingRef: string;

    @Field()
    @Column({ name: 'owner_uuid', type: 'uuid' })
    public ownerUuid: string;

    // new | confirmed | completed | cancelled
    @Field()
    @Column({ name: 'status', type: 'varchar', length: 12, default: 'new' })
    public status: string;

    @Field()
    @Column({ name: 'customer_name', type: 'varchar', length: 120 })
    public customerName: string;

    @Field()
    @Column({ name: 'customer_phone', type: 'varchar', length: 20 })
    public customerPhone: string;

    @Field(() => String, { nullable: true })
    @Column({ name: 'customer_email', type: 'varchar', length: 255, nullable: true })
    public customerEmail: string | null;

    // city | oneway | round (as priced)
    @Field()
    @Column({ name: 'trip_type', type: 'varchar', length: 10 })
    public tripType: string;

    @Field()
    @Column({ name: 'from_label', type: 'varchar', length: 300 })
    public fromLabel: string;

    @Field(() => Float)
    @Column({ name: 'from_lat', type: 'numeric', precision: 9, scale: 6, transformer: numeric })
    public fromLat: number;

    @Field(() => Float)
    @Column({ name: 'from_lon', type: 'numeric', precision: 9, scale: 6, transformer: numeric })
    public fromLon: number;

    @Field()
    @Column({ name: 'to_label', type: 'varchar', length: 300 })
    public toLabel: string;

    @Field(() => Float)
    @Column({ name: 'to_lat', type: 'numeric', precision: 9, scale: 6, transformer: numeric })
    public toLat: number;

    @Field(() => Float)
    @Column({ name: 'to_lon', type: 'numeric', precision: 9, scale: 6, transformer: numeric })
    public toLon: number;

    @Field()
    @Column({ name: 'pickup_at', type: 'timestamp' })
    public pickupAt: Date;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'return_at', type: 'timestamp', nullable: true })
    public returnAt: Date | null;

    @Field(() => Int)
    @Column({ name: 'passengers', type: 'int', default: 1 })
    public passengers: number;

    @Field(() => String, { nullable: true })
    @Column({ name: 'vehicle_name', type: 'varchar', length: 120, nullable: true })
    public vehicleName: string | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'driver_name', type: 'varchar', length: 120, nullable: true })
    public driverName: string | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'driver_phone', type: 'varchar', length: 20, nullable: true })
    public driverPhone: string | null;

    @Field(() => Float)
    @Column({ name: 'distance_km', type: 'numeric', precision: 8, scale: 1, transformer: numeric })
    public distanceKm: number;

    @Field(() => Int)
    @Column({ name: 'duration_min', type: 'int' })
    public durationMin: number;

    @Field(() => Int)
    @Column({ name: 'toll_count', type: 'int', default: 0 })
    public tollCount: number;

    @Field(() => Float)
    @Column({ name: 'toll_amount', type: 'numeric', precision: 10, scale: 2, default: 0, transformer: numeric })
    public tollAmount: number;

    @Field(() => Float)
    @Column({ name: 'chargeable_km', type: 'numeric', precision: 8, scale: 1, transformer: numeric })
    public chargeableKm: number;

    @Field(() => Float)
    @Column({ name: 'rate_per_km', type: 'numeric', precision: 8, scale: 2, transformer: numeric })
    public ratePerKm: number;

    @Field(() => Float)
    @Column({ name: 'km_fare', type: 'numeric', precision: 10, scale: 2, transformer: numeric })
    public kmFare: number;

    @Field(() => Float)
    @Column({ name: 'driver_bata', type: 'numeric', precision: 10, scale: 2, transformer: numeric })
    public driverBata: number;

    @Field(() => Int)
    @Column({ name: 'days', type: 'int', default: 1 })
    public days: number;

    @Field(() => Float)
    @Column({ name: 'total_fare', type: 'numeric', precision: 10, scale: 2, transformer: numeric })
    public totalFare: number;

    @Field(() => String, { nullable: true })
    @Column({ name: 'notes', type: 'text', nullable: true })
    public notes: string | null;

    // Owner's private note, e.g. assigned driver or confirmation details
    @Field(() => String, { nullable: true })
    @Column({ name: 'owner_note', type: 'text', nullable: true })
    public ownerNote: string | null;

    @Field()
    @Column({ name: 'lang', type: 'varchar', length: 5, default: 'en' })
    public lang: string;

    @Column({ name: 'ip', type: 'varchar', length: 64, nullable: true })
    public ip: string | null;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public updatedAt: Date;
}

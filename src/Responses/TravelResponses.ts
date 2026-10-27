import { ObjectType, InputType, Field, Int, Float } from "type-graphql";
import { TripBooking } from "../Entity/TripBooking";

@ObjectType()
export class PlaceResult {
    @Field() public label: string;
    @Field() public detail: string;
    @Field(() => Float) public lat: number;
    @Field(() => Float) public lon: number;
}

@ObjectType()
export class PlaceListResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => [PlaceResult]) public data: PlaceResult[];
}

@ObjectType()
export class TollPoint {
    @Field() public name: string;
    @Field(() => Float) public lat: number;
    @Field(() => Float) public lon: number;
}

@ObjectType()
export class TripQuote {
    @Field() public tripType: string;
    @Field() public requestedType: string;
    @Field(() => Float) public distanceKm: number;
    @Field(() => Int) public durationMin: number;
    @Field(() => Int) public tollCount: number;
    @Field(() => [String]) public tollNames: string[];
    @Field(() => Float) public tollPerPlaza: number;
    @Field(() => Float) public tollAmount: number;
    @Field(() => Int) public days: number;
    @Field(() => Float) public chargeableKm: number;
    @Field(() => Float) public ratePerKm: number;
    @Field(() => Float) public kmFare: number;
    @Field(() => Float) public driverBata: number;
    @Field(() => Float) public totalFare: number;
    @Field() public vehicleName: string;
    @Field(() => [String]) public notes: string[];
    @Field() public approximate: boolean;
    @Field(() => [TollPoint]) public tolls: TollPoint[];
    // [lat, lon] pairs for the route map
    @Field(() => [[Float]]) public path: number[][];
}

@ObjectType()
export class TripQuoteResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => TripQuote, { nullable: true }) public data?: TripQuote | null;
}

@InputType()
export class TripQuoteInput {
    // Published website owner; their saved rates are used
    @Field({ nullable: true }) public userName?: string;
    // Builder/storefront preview: rates from the unsaved draft (JSON of the travel settings)
    @Field({ nullable: true }) public configJson?: string;
    @Field() public tripType: string;
    @Field(() => Float) public fromLat: number;
    @Field(() => Float) public fromLon: number;
    @Field(() => Float) public toLat: number;
    @Field(() => Float) public toLon: number;
    @Field(() => Int, { nullable: true }) public vehicleIndex?: number | null;
    // Local date-times, e.g. 2026-10-20T09:30
    @Field({ nullable: true }) public pickupAt?: string;
    @Field({ nullable: true }) public returnAt?: string;
}

@InputType()
export class TripBookingInput {
    @Field() public userName: string;
    @Field() public tripType: string;
    @Field() public fromLabel: string;
    @Field(() => Float) public fromLat: number;
    @Field(() => Float) public fromLon: number;
    @Field() public toLabel: string;
    @Field(() => Float) public toLat: number;
    @Field(() => Float) public toLon: number;
    @Field() public pickupAt: string;
    @Field({ nullable: true }) public returnAt?: string;
    @Field(() => Int, { nullable: true }) public passengers?: number;
    @Field(() => Int, { nullable: true }) public vehicleIndex?: number | null;
    @Field(() => Int, { nullable: true }) public driverIndex?: number | null;
    @Field() public customerName: string;
    @Field() public customerPhone: string;
    @Field({ nullable: true }) public customerEmail?: string;
    @Field({ nullable: true }) public notes?: string;
    @Field({ nullable: true }) public lang?: string;
    // Honeypot
    @Field({ nullable: true }) public company?: string;
}

@ObjectType()
export class BookingDriver {
    @Field() public name: string;
    @Field() public phone: string;
    @Field() public licenseNumber: string;
    @Field() public licenseValidTill: string;
    @Field(() => Int) public experienceYears: number;
}

@ObjectType()
export class TripBookingResult {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => String, { nullable: true }) public bookingRef?: string | null;
    // Number the website opens WhatsApp with (digits, country code included)
    @Field(() => String, { nullable: true }) public whatsapp?: string | null;
    @Field(() => TripQuote, { nullable: true }) public quote?: TripQuote | null;
    @Field(() => BookingDriver, { nullable: true }) public driver?: BookingDriver | null;
}

@ObjectType()
export class TripBookingCounts {
    @Field(() => Int) public new: number;
    @Field(() => Int) public confirmed: number;
    @Field(() => Int) public completed: number;
    @Field(() => Int) public cancelled: number;
    @Field(() => Int) public all: number;
}

@ObjectType()
export class TripBookingListResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => Int) public total: number;
    @Field(() => [TripBooking]) public data: TripBooking[];
    @Field(() => TripBookingCounts, { nullable: true }) public counts?: TripBookingCounts | null;
}

@InputType()
export class TripBookingFilter {
    @Field({ nullable: true }) public status?: string;
    @Field({ nullable: true }) public search?: string;
    @Field(() => Int, { nullable: true }) public limit?: number;
    @Field(() => Int, { nullable: true }) public offset?: number;
}

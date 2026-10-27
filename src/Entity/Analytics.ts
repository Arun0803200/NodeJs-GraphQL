import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";
import { GraphQLJSONObject } from "graphql-scalars";

// One row per GraphQL request, written by the analytics plugin (src/Utils/analytics.ts)
@ObjectType()
@Entity('tbl_api_events')
@Index('idx_api_event_status_created', ['status', 'createdAt'])
export class ApiEvent {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Column({ name: 'operation_name', type: 'varchar', length: 120 })
    public operationName: string;

    // query | mutation | unknown (request failed before parsing)
    @Field()
    @Column({ name: 'operation_type', type: 'varchar', length: 20 })
    public operationType: string;

    // Root fields called, e.g. ["adminCreateTemplate"]
    @Field(() => [String])
    @Column({ name: 'fields', type: 'jsonb', default: () => "'[]'::jsonb" })
    public fields: string[];

    // success | failed (resolver returned status 0) | error (GraphQL error thrown)
    @Field()
    @Column({ name: 'status', type: 'varchar', length: 10 })
    public status: string;

    @Field(() => String, { nullable: true })
    @Column({ name: 'error_message', type: 'text', nullable: true })
    public errorMessage: string | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'error_code', type: 'varchar', length: 60, nullable: true })
    public errorCode: string | null;

    @Field(() => Int)
    @Column({ name: 'duration_ms', type: 'int' })
    public durationMs: number;

    @Field(() => String, { nullable: true })
    @Column({ name: 'user_uuid', type: 'uuid', nullable: true })
    public userUuid: string | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'user_email', type: 'varchar', length: 255, nullable: true })
    public userEmail: string | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'role', type: 'varchar', length: 20, nullable: true })
    public role: string | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'ip', type: 'varchar', length: 64, nullable: true })
    public ip: string | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'user_agent', type: 'varchar', length: 300, nullable: true })
    public userAgent: string | null;

    @Field()
    @Index('idx_api_event_created')
    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;
}

// One row per page the browser shows, sent by the frontend tracker
@ObjectType()
@Entity('tbl_page_views')
export class PageView {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    // Random id kept in the visitor's browser; counts unique visitors without identifying anyone
    @Field()
    @Index('idx_page_view_visitor')
    @Column({ name: 'visitor_id', type: 'varchar', length: 64 })
    public visitorId: string;

    @Field()
    @Column({ name: 'session_id', type: 'varchar', length: 64 })
    public sessionId: string;

    @Field()
    @Column({ name: 'path', type: 'varchar', length: 300 })
    public path: string;

    // home | template | customize | portfolio | auth | admin | user | other
    @Field()
    @Column({ name: 'page_type', type: 'varchar', length: 20 })
    public pageType: string;

    @Field(() => String, { nullable: true })
    @Column({ name: 'referrer', type: 'varchar', length: 255, nullable: true })
    public referrer: string | null;

    @Field()
    @Column({ name: 'device', type: 'varchar', length: 20 })
    public device: string;

    @Field()
    @Column({ name: 'browser', type: 'varchar', length: 30 })
    public browser: string;

    @Field()
    @Column({ name: 'os', type: 'varchar', length: 30 })
    public os: string;

    @Field(() => String, { nullable: true })
    @Column({ name: 'user_uuid', type: 'uuid', nullable: true })
    public userUuid: string | null;

    @Field()
    @Index('idx_page_view_created')
    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;
}

// Audit trail: one row per mutation, with who did it and what it targeted
@ObjectType()
@Entity('tbl_activity_logs')
export class ActivityLog {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field(() => String, { nullable: true })
    @Column({ name: 'actor_uuid', type: 'uuid', nullable: true })
    public actorUuid: string | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'actor_email', type: 'varchar', length: 255, nullable: true })
    public actorEmail: string | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'actor_role', type: 'varchar', length: 20, nullable: true })
    public actorRole: string | null;

    // Mutation name, e.g. adminUpdateTemplate
    @Field()
    @Index('idx_activity_action')
    @Column({ name: 'action', type: 'varchar', length: 120 })
    public action: string;

    // auth | admin | profile | site | template | master | media | guest | other
    @Field()
    @Column({ name: 'category', type: 'varchar', length: 20 })
    public category: string;

    @Field()
    @Column({ name: 'status', type: 'varchar', length: 10 })
    public status: string;

    // Message the resolver returned, e.g. "Template updated"
    @Field(() => String, { nullable: true })
    @Column({ name: 'message', type: 'text', nullable: true })
    public message: string | null;

    // Main thing acted on: an id, uuid, slug or email taken from the arguments
    @Field(() => String, { nullable: true })
    @Column({ name: 'target', type: 'varchar', length: 255, nullable: true })
    public target: string | null;

    // Arguments with secrets redacted and long values trimmed
    @Field(() => GraphQLJSONObject, { nullable: true })
    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    public metadata: Record<string, unknown> | null;

    @Field(() => String, { nullable: true })
    @Column({ name: 'ip', type: 'varchar', length: 64, nullable: true })
    public ip: string | null;

    @Field()
    @Index('idx_activity_created')
    @Column({ name: 'created_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    public createdAt: Date;
}

import { ObjectType, InputType, Field, Int } from "type-graphql";

@ObjectType()
export class InboxMessage {
    @Field(() => Int) public id: number;
    @Field() public senderName: string;
    @Field() public senderEmail: string;
    @Field() public message: string;
    @Field() public isRead: boolean;
    @Field() public isStarred: boolean;
    @Field() public isArchived: boolean;
    @Field() public source: string;
    @Field() public createdAt: string;
    @Field(() => String, { nullable: true }) public readAt: string | null;
    // Portfolio owner the message was sent to
    @Field() public recipientUuid: string;
    @Field() public recipientName: string;
    @Field() public recipientUserName: string;
    @Field() public recipientEmail: string;
}

@ObjectType()
export class InboxCounts {
    @Field(() => Int) public inbox: number;
    @Field(() => Int) public unread: number;
    @Field(() => Int) public starred: number;
    @Field(() => Int) public archived: number;
    @Field(() => Int) public all: number;
}

@ObjectType()
export class InboxResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => Int) public total: number;
    @Field(() => [InboxMessage]) public data: InboxMessage[];
    @Field(() => InboxCounts, { nullable: true }) public counts?: InboxCounts | null;
}

@InputType()
export class InboxFilter {
    // inbox | unread | starred | archived | all
    @Field({ nullable: true }) public folder?: string;
    @Field({ nullable: true }) public search?: string;
    // Admin only: messages to one portfolio owner
    @Field({ nullable: true }) public recipientUuid?: string;
    @Field(() => Int, { nullable: true }) public limit?: number;
    @Field(() => Int, { nullable: true }) public offset?: number;
}

@InputType()
export class ContactMessageInput {
    // Portfolio owner, by public username
    @Field() public userName: string;
    @Field() public senderName: string;
    @Field() public senderEmail: string;
    @Field() public message: string;
    // website | portfolio
    @Field({ nullable: true }) public source?: string;
    // Honeypot: hidden from people, filled by bots
    @Field({ nullable: true }) public company?: string;
}

// Sidebar badges
@ObjectType()
export class NavCounts {
    @Field(() => Int) public unreadMessages: number;
    @Field(() => Int) public pendingApprovals: number;
    // Admin: messages received platform-wide in the last 24 hours
    @Field(() => Int) public newMessages: number;
    // Owner: trip bookings waiting for confirmation
    @Field(() => Int) public newBookings: number;
    // Owner: driver applications not yet reviewed
    @Field(() => Int) public newDriverApplications: number;
    @Field(() => Int) public pendingReviews: number;
    @Field(() => Int) public newFormSubmissions: number;
    // Admin: platform enquiries not yet handled
    @Field(() => Int) public newLeads: number;
}

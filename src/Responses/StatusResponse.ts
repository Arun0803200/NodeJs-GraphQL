import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
export class StatusResponse {
    @Field(() => Int)
    public status: number;

    @Field()
    public message: string;
}

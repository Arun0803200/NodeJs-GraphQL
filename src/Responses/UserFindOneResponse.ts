import { ObjectType, Field, Int } from "type-graphql";
import { User } from "../Entity/User";

@ObjectType()
export class UserFindOneResponse {
    @Field(() => Int)
    public status: number;

    @Field()
    public message: string;

    @Field(() => User, { nullable: true })
    public data: User | null;
}
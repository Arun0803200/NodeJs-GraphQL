import { ObjectType, Field, Int } from 'type-graphql';
import { Employee } from '../Entity/Employee';

@ObjectType()
export class EmployeeResponses {
  @Field(() => Int)
  public status: number;

  @Field()
  public message: string;

  @Field(() => Employee, { nullable: true })
  public data: Employee | null;
}

import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { EmployeeResponses } from "../Responses/EmployeeResponses";
import { getRepository } from "typeorm";
import { Employee } from "../Entity/Employee";

@Resolver()
export class EmployeeResolver {

    @Mutation(() => EmployeeResponses)
    public async createEmployee(
        @Arg('firstName') firstName: string, 
        @Arg('role') role: number
    ): Promise<EmployeeResponses> {
        const employeeRepo = getRepository(Employee);
        const newEmployee = new Employee();
        newEmployee.firstName = firstName;
        newEmployee.role = role;
        const saveEmployee = await employeeRepo.save(newEmployee);
        if (saveEmployee) {
            return {
                status: 1,
                message: 'Successfully created the employee data!',
                data: saveEmployee,
            };
        }
        return {
            status: 0,
            message: 'Unable to create the Employee data!',
            data: null,
        };
    }

    @Query(() => String)
    public hello(): string {
        return "Hello, World!";
    }
}

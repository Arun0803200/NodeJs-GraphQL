import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { EmployeeResponses } from "../Responses/EmployeeResponses";
import { getRepository } from "typeorm";
import { Employee } from "../Entity/Employee";
import { EmployeeFindResponses } from "../Responses/EmployeeFindResponses";
@Resolver()
export class EmployeeResolver {

    @Mutation(() => EmployeeResponses)
    public async createEmployee(
        @Arg('firstName') firstName: string, 
        @Arg('role') role: number
    ): Promise<EmployeeResponses> {
        const newEmployee = new Employee();
        newEmployee.firstName = firstName;
        newEmployee.role = role;
        const employeeRepo = getRepository(Employee);
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

    @Query(() => EmployeeFindResponses)
    public async getEmployee(
        @Arg('limit', () => Number) limit: number,
        @Arg('offset', () => Number) offset: number,
        @Arg('count', () => Boolean) count: boolean
    ): Promise<EmployeeFindResponses> {
        const employeeRepo = getRepository(Employee);
        
        let findEmployee: Employee[] | null | number;
        if (count) {
            findEmployee = await employeeRepo.count();
        } else {
            findEmployee = await employeeRepo.find({
                take: limit,
                skip: offset
            });
        }

        const responseData: EmployeeFindResponses = {
            status: 1,
            message: `Successfully got the ${count ? 'count' : 'list'} of employee!`,
            data: findEmployee
        };

        return responseData;
    }
}

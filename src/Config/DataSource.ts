import { DataSource } from 'typeorm';

import { User } from '../Entity/User';
import { UserImages } from '../Entity/UserImages';
import { About } from '../Entity/About';
import { UserExperience } from '../Entity/UserExperience';
import { UserProjects } from '../Entity/UserProjects';

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "root",
    password: "Welcome123$",
    database: "user_portfolio",
    synchronize: true,
    logging: true,
    entities: [User, UserImages, About, UserExperience, UserProjects],
});
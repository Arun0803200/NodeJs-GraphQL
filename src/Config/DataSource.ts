import { DataSource } from 'typeorm';
import { env } from './env';

import { User } from '../Entity/User';
import { UserImages } from '../Entity/UserImages';
import { About } from '../Entity/About';
import { UserExperience } from '../Entity/UserExperience';
import { UserProjects } from '../Entity/UserProjects';
import { UserSkills } from '../Entity/UserSkills';
import { UserAwards } from '../Entity/UserAwards';
import { UserEducation } from '../Entity/UserEducation';
import { ContactUs } from '../Entity/ContactUs';
import { Auth } from '../Entity/Auth';
import { Template } from '../Entity/Template';
import { UserSite } from '../Entity/UserSite';
import { MasterType, MasterValue } from '../Entity/Master';
import { ApiEvent, PageView, ActivityLog } from '../Entity/Analytics';
import { TripBooking } from '../Entity/TripBooking';
import { DriverApplication } from '../Entity/DriverApplication';
import { FormSubmission, Review } from '../Entity/Engagement';
import { PlatformLead } from '../Entity/PlatformLead';

export const AppDataSource = new DataSource({
    type: "postgres",
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: true,
    logging: true,
    entities: [
        User,
        UserImages,
        About,
        UserExperience,
        UserProjects,
        UserSkills,
        UserAwards,
        UserEducation,
        ContactUs,
        Auth,
        Template,
        UserSite,
        MasterType,
        MasterValue,
        ApiEvent,
        PageView,
        ActivityLog,
        TripBooking,
        DriverApplication,
        Review,
        FormSubmission,
        PlatformLead,
    ],
});

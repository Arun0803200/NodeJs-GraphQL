import { ApolloServer } from 'apollo-server-express';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload-ts'
import { env } from './Config/env';
import { AppDataSource } from './Config/DataSource';
import { authChecker, buildContext } from './Middleware/authChecker';

// Legacy resolvers (kept for backward compatibility)
import { UserResolver } from './Resolers/UserResolver';
import { UploadResolver } from './Resolers/UploadResolver';
import { AboutResolver } from './Resolers/AboutResolver';
import { UserExperienceResolver } from './Resolers/UserExperienceResolver';
import { UserProjectResolver } from './Resolers/UserProjectResolver';

// New panel resolvers
import { AuthResolver } from './Resolvers/Auth/AuthResolver';
import { AdminUserResolver } from './Resolvers/Admin/AdminUserResolver';
import { AdminPortfolioResolver } from './Resolvers/Admin/AdminPortfolioResolver';
import { AdminUserListResolver } from './Resolvers/Admin/AdminUserListResolver';
import { UserProfileResolver } from './Resolvers/User/UserProfileResolver';
import { GuestResolver } from './Resolvers/Guest/GuestResolver';
import { TemplateResolver } from './Resolvers/Template/TemplateResolver';
import { SiteResolver } from './Resolvers/Site/SiteResolver';
import { seedTemplates } from './Seeds/templates';
import { seedMasters } from './Seeds/masters';
import { MasterResolver } from './Resolvers/Master/MasterResolver';
import { AnalyticsResolver } from './Resolvers/Analytics/AnalyticsResolver';
import { MessageResolver } from './Resolvers/Message/MessageResolver';
import { TravelResolver } from './Resolvers/Travel/TravelResolver';
import { DriverCareerResolver } from './Resolvers/Travel/DriverCareerResolver';
import { EngagementResolver } from './Resolvers/Engagement/EngagementResolver';
import { PlatformLeadResolver } from './Resolvers/Platform/PlatformLeadResolver';
import { initTollData } from './Utils/travel';
import { analyticsPlugin, scheduleAnalyticsCleanup } from './Utils/analytics';
import { MediaResolver } from './Resolvers/Media/MediaResolver';
import { serveMedia, servePrivateMedia } from './Utils/storage';

async function startServer() {
    const app = express();

    // Middleware for handling file uploads
    app.use(
        graphqlUploadExpress({
            maxFileSize: 10000000,
            maxFiles: 5,
        })
    );

    // Uploaded images (local disk or S3, see STORAGE_DRIVER)
    app.get('/media/*', serveMedia);
    // Private documents (driver licences) via short-lived signed links only
    app.get('/private-media/*', servePrivateMedia);

    await AppDataSource.initialize()
        .then(async () => {
            console.log("Database connected successfully");
            await seedTemplates().catch((error) => console.log("Template seed error:", error));
            await seedMasters().catch((error) => console.log("Master seed error:", error));
            scheduleAnalyticsCleanup();
            initTollData();
        })
        .catch((error: any) => {
            console.log("Database connection error:", error);
        });

    const schema = await buildSchema({
        resolvers: [
            // Legacy (guest-facing, no auth)
            UserResolver,
            UploadResolver,
            AboutResolver,
            UserExperienceResolver,
            UserProjectResolver,

            // Auth
            AuthResolver,

            // Admin panel (role: admin)
            AdminUserResolver,
            AdminPortfolioResolver,
            AdminUserListResolver,

            // User panel (role: user/admin)
            UserProfileResolver,

            // Guest panel (public, no auth)
            GuestResolver,

            // Templates marketplace (public list + admin management) and user websites
            TemplateResolver,
            SiteResolver,
            MediaResolver,

            // Master data (public lookups + admin management)
            MasterResolver,

            // Analytics dashboard, API/activity logs and the page-view tracker
            AnalyticsResolver,

            // Contact messages: public form, user inbox, admin oversight, sidebar badges
            MessageResolver,

            // Travels/taxi websites: place search, fare quotes, trip bookings
            TravelResolver,
            DriverCareerResolver,
            // Ratings & reviews and owner-built custom forms
            EngagementResolver,
            // "Contact us" enquiries to the platform admins
            PlatformLeadResolver,
        ],
        authChecker,
    });

    const server = new ApolloServer({
        schema,
        context: buildContext,
        // Records every request (API log) and every mutation (activity log)
        plugins: [analyticsPlugin],
    });

    await server.start();
    server.applyMiddleware({ app: app as any });

    app.listen(env.PORT, () => {
        console.log(`Server is listening at http://localhost:${env.PORT}/graphql`);
    });
}

startServer();

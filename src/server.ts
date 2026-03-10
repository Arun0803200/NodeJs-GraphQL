import { ApolloServer } from 'apollo-server-express';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import express from 'express'; // Use import instead of require
import { graphqlUploadExpress } from 'graphql-upload-ts'
import { AppDataSource } from './Config/DataSource';
import { UserResolver } from './Resolers/UserResolver';
import { UploadResolver } from './Resolers/UploadResolver';
import { AboutResolver } from './Resolers/AboutResolver';
import { UserExperienceResolver } from './Resolers/UserExperienceResolver';
import {UserProjectResolver} from './Resolers/UserProjectResolver';
async function startServer() {
    const app = express();

    // Middleware for handling file uploads
    app.use(
        graphqlUploadExpress({
            maxFileSize: 10000000,
            maxFiles: 5,
        })
    );

    await AppDataSource.initialize()
        .then(() => {
            console.log("Database connected successfully");
        })
        .catch((error: any) => {
            console.log("Database connection error:", error);
        });

    const schema = await buildSchema({
        resolvers: [
            UserResolver,
            UploadResolver,
            AboutResolver,
            UserExperienceResolver,
            UserProjectResolver,
        ],
    });

    const server = new ApolloServer({ schema }); // Wrap schema in an object

    await server.start();
    server.applyMiddleware({ app }); // Apply middleware to the app

    app.listen(4000, () => {
        console.log(`Server is listening at http://localhost:4000/graphql`);
    });
}

startServer();

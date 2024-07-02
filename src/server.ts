import { ApolloServer } from 'apollo-server-express';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import express from 'express'; // Use import instead of require
import { Employee } from './Entity/Employee';
import { EmployeeResolver } from './Resolers/EmployeeResoler';
import { createConnection } from 'typeorm';

async function startServer() {
    const app = express();

    await createConnection({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: '',
        database: 'arundhika_graphql',
        synchronize: true,
        logging: true,
        entities: [Employee],
    });

    const schema = await buildSchema({
        resolvers: [EmployeeResolver],
    });

    const server = new ApolloServer({ schema }); // Wrap schema in an object

    await server.start();
    server.applyMiddleware({ app }); // Apply middleware to the app

    app.listen(4000, () => {
        console.log(`Server is listening at http://localhost:4000/graphql`);
    });
}

startServer();

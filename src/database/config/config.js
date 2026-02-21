import dotenv from "dotenv";
dotenv.config();

export default {
    development: {
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        host: process.env.DATABASE_HOST,
        dialect: "mysql",
        seederStorage: "sequelize",
        logQueryParameters: true,
    },
    staging: {
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        host: process.env.DATABASE_HOST,
        dialect: "mysql",
        seederStorage: "sequelize",
        logQueryParameters: true,
    },
    production: {
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        host: process.env.DATABASE_HOST,
        dialect: "mysql",
        seederStorage: "sequelize",
        logQueryParameters: true,
    },
};

import Fighter from "./Fighter.js";
import LastBet from "./LastBet.js";
import Matchup from "./Matchup.js";
import { Sequelize } from "sequelize";
import configsPerEnv from "../config/config.js";

const env = process.env.NODE_ENV || "development";
// eslint-disable-next-line security/detect-object-injection
const config = configsPerEnv[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    sequelize = new Sequelize(
        config.database,
        config.username,
        config.password,
        config
    );
}

[Fighter, LastBet, Matchup].forEach((Model) => {
    const model = Model(sequelize);
    db[model.name] = model;
});

Object.keys(db).forEach((modelName) => {
    // eslint-disable-next-line security/detect-object-injection
    db[modelName].associate?.(db);
});

db.sequelize = sequelize;

export default db;

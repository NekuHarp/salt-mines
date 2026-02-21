import "dotenv/config"; // Load .env into process.env

import { app } from "./src/app.js";
import db from "./src/database/models/index.js";

const PORT = process.env.PORT;

try {
    // Test the connection to the database before launching the server
    await db.sequelize.authenticate();
    app.listen(PORT, () =>
        console.log(`App listening at http://localhost:${PORT}`)
    );
} catch (error) {
    console.error("Connection to database failed.", error);
    throw error;
}

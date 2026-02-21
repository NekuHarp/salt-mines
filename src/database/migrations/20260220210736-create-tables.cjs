"use strict";
const fs = require("fs");
const path = require("path");

module.exports = {
    async up(queryInterface) {
        // Reads file and converts its content into a string
        const createTablesSql = fs.readFileSync(
            path.join(__dirname, "tables-structures.sql"),
            {
                encoding: "utf8",
            }
        );

        await queryInterface.sequelize.transaction(
            async (transaction) =>
                await Promise.all(
                    // Split each sql statement of the file and remove empty line
                    createTablesSql
                        .split(";\n")
                        .filter(Boolean)
                        .map((statement) =>
                            queryInterface.sequelize.query(statement, {
                                transaction,
                                raw: true,
                            })
                        )
                )
        );
    },

    async down(queryInterface) {
        await queryInterface.dropAllTables();
    },
};

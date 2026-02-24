"use strict";

const MATCH_MODES = Object.freeze({
    MATCHMAKING: "Matchmaking",
    TOURNAMENT: "Tournament",
    EXHIBITION: "Exhibition",
});

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.createTable(
                "Remainings",
                {
                    uuid: {
                        type: Sequelize.DataTypes.UUID,
                        defaultValue: Sequelize.UUIDV4,
                        allowNull: false,
                        unique: true,
                        primaryKey: true,
                    },
                    value: {
                        type: Sequelize.DataTypes.STRING,
                        unique: true,
                        allowNull: false,
                    },
                    mode: {
                        type: Sequelize.DataTypes.ENUM,
                        values: Object.values(MATCH_MODES),
                        allowNull: false,
                    },
                    createdAt: {
                        type: Sequelize.DataTypes.DATE(3),
                        allowNull: false,
                    },
                    updatedAt: {
                        type: Sequelize.DataTypes.DATE(3),
                        allowNull: false,
                    },
                },
                { transaction }
            );

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable("Remainings");
    },
};

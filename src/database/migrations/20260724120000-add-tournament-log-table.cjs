"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.createTable(
                "TournamentLogs",
                {
                    uuid: {
                        type: Sequelize.DataTypes.UUID,
                        defaultValue: Sequelize.UUIDV4,
                        allowNull: false,
                        unique: true,
                        primaryKey: true,
                    },
                    p1name: {
                        type: Sequelize.DataTypes.STRING,
                        allowNull: false,
                    },
                    p2name: {
                        type: Sequelize.DataTypes.STRING,
                        allowNull: false,
                    },
                    remaining: {
                        type: Sequelize.DataTypes.STRING,
                        allowNull: true,
                    },
                    balance: {
                        type: Sequelize.DataTypes.BIGINT.UNSIGNED,
                        allowNull: true,
                    },
                    balanceContext: {
                        type: Sequelize.DataTypes.TEXT,
                        allowNull: true,
                    },
                    selectedplayer: {
                        type: Sequelize.DataTypes.STRING,
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
        await queryInterface.dropTable("TournamentLogs");
    },
};

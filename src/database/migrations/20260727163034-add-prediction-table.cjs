"use strict";

// Duplicated from src/constants/database.js: migrations are CommonJS and
// cannot import the ESM constants.
const MATCH_MODES = Object.freeze({
    MATCHMAKING: "Matchmaking",
    TOURNAMENT: "Tournament",
    EXHIBITION: "Exhibition",
});

const MATCH_WINNERS = Object.freeze({
    P1: "p1",
    P2: "p2",
});

const SELECTED_PLAYERS = Object.freeze({
    P1: "player1",
    P2: "player2",
});

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.createTable(
                "Predictions",
                {
                    uuid: {
                        type: Sequelize.DataTypes.UUID,
                        defaultValue: Sequelize.UUIDV4,
                        allowNull: false,
                        unique: true,
                        primaryKey: true,
                    },
                    p1Uuid: {
                        type: Sequelize.DataTypes.UUID,
                        allowNull: false,
                        references: { model: "Fighters", key: "uuid" },
                        onDelete: "CASCADE",
                        onUpdate: "RESTRICT",
                    },
                    p2Uuid: {
                        type: Sequelize.DataTypes.UUID,
                        allowNull: false,
                        references: { model: "Fighters", key: "uuid" },
                        onDelete: "CASCADE",
                        onUpdate: "RESTRICT",
                    },
                    mode: {
                        type: Sequelize.DataTypes.ENUM,
                        values: Object.values(MATCH_MODES),
                        allowNull: false,
                    },
                    winner: {
                        type: Sequelize.DataTypes.ENUM,
                        values: Object.values(MATCH_WINNERS),
                        allowNull: false,
                    },
                    p1WinChance: {
                        type: Sequelize.DataTypes.DECIMAL(5, 2),
                        allowNull: false,
                    },
                    p1Matches: {
                        type: Sequelize.DataTypes.INTEGER.UNSIGNED,
                        allowNull: false,
                    },
                    p1Wins: {
                        type: Sequelize.DataTypes.INTEGER.UNSIGNED,
                        allowNull: false,
                    },
                    p2Matches: {
                        type: Sequelize.DataTypes.INTEGER.UNSIGNED,
                        allowNull: false,
                    },
                    p2Wins: {
                        type: Sequelize.DataTypes.INTEGER.UNSIGNED,
                        allowNull: false,
                    },
                    h2hMatches: {
                        type: Sequelize.DataTypes.INTEGER.UNSIGNED,
                        allowNull: false,
                    },
                    h2hP1Wins: {
                        type: Sequelize.DataTypes.INTEGER.UNSIGNED,
                        allowNull: false,
                    },
                    p1Total: {
                        type: Sequelize.DataTypes.BIGINT.UNSIGNED,
                        allowNull: true,
                    },
                    p2Total: {
                        type: Sequelize.DataTypes.BIGINT.UNSIGNED,
                        allowNull: true,
                    },
                    selectedPlayer: {
                        type: Sequelize.DataTypes.ENUM,
                        values: Object.values(SELECTED_PLAYERS),
                        allowNull: true,
                    },
                    wager: {
                        type: Sequelize.DataTypes.BIGINT.UNSIGNED,
                        allowNull: true,
                    },
                    balanceBefore: {
                        type: Sequelize.DataTypes.BIGINT.UNSIGNED,
                        allowNull: true,
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

            await queryInterface.addIndex("Predictions", ["createdAt"], {
                transaction,
            });
            await queryInterface.addIndex(
                "Predictions",
                ["mode", "createdAt"],
                { transaction }
            );
            await queryInterface.addIndex(
                "Predictions",
                ["p1Uuid", "p2Uuid"],
                { transaction }
            );

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable("Predictions");
    },
};

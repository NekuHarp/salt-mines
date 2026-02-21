"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        const tempDate = new Date();
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.createTable(
                "LastBets",
                {
                    id: {
                        type: Sequelize.DataTypes.INTEGER.UNSIGNED,
                        defaultValue: 0,
                        allowNull: false,
                        unique: true,
                        primaryKey: true,
                    },
                    content: {
                        type: Sequelize.DataTypes.JSON,
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

            await queryInterface.bulkInsert(
                "LastBets",
                [
                    {
                        id: 0,
                        content: null,
                        createdAt: tempDate,
                        updatedAt: tempDate,
                    },
                ],
                { transaction: transaction, ignoreDuplicates: true }
            );

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable("LastBets");
    },
};

"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Kept out of `content` on purpose: that column is rewritten wholesale
        // on every tick (and by autoDataScrape), which would drop the pending
        // bet. A separate column survives those rewrites untouched.
        await queryInterface.addColumn("LastBets", "bet", {
            type: Sequelize.DataTypes.JSON,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("LastBets", "bet");
    },
};

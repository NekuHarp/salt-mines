import Sequelize from "sequelize";

export default (sequelize) => {
    class LastBet extends Sequelize.Model {}

    LastBet.init(
        {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                defaultValue: 0,
                allowNull: false,
                unique: true,
                primaryKey: true,
            },
            content: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            /**
             * The bet placed on the match currently described by `content`, as
             * `{ selectedPlayer, wager, balanceBefore }`, or null when no bet
             * was placed. Consumed and cleared when that match resolves.
             *
             * Deliberately a column of its own rather than a key inside
             * `content`: `content` is rewritten wholesale on every tick and by
             * autoDataScrape, which would drop it.
             */
            bet: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            createdAt: { type: Sequelize.DATE(3) },
            updatedAt: { type: Sequelize.DATE(3) },
        },
        {
            sequelize,
            modelName: "LastBet",
        }
    );

    return LastBet;
};

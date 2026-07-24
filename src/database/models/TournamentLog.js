import Sequelize from "sequelize";

export default (sequelize) => {
    class TournamentLog extends Sequelize.Model {}

    TournamentLog.init(
        {
            uuid: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                unique: true,
                primaryKey: true,
            },
            p1name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            p2name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            remaining: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            balance: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: true,
            },
            balanceContext: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            selectedplayer: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            createdAt: { type: Sequelize.DATE(3) },
            updatedAt: { type: Sequelize.DATE(3) },
        },
        {
            sequelize,
            modelName: "TournamentLog",
        }
    );

    return TournamentLog;
};

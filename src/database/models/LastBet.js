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

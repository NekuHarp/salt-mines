import Sequelize from "sequelize";

export default (sequelize) => {
    class Fighter extends Sequelize.Model {
        static associate(models) {
            models.Fighter.hasMany(models.Matchup, {
                foreignKey: "p1Uuid",
                as: "MatchupsAsP1",
            });
            models.Fighter.hasMany(models.Matchup, {
                foreignKey: "p2Uuid",
                as: "MatchupsAsP2",
            });
        }
    }

    Fighter.init(
        {
            uuid: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                unique: true,
                primaryKey: true,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            matches: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },
            wins: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },
            losses: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },
            createdAt: { type: Sequelize.DATE(3) },
            updatedAt: { type: Sequelize.DATE(3) },
        },
        {
            sequelize,
            modelName: "Fighter",
        }
    );

    return Fighter;
};

import Sequelize from "sequelize";

export default (sequelize) => {
    class Matchup extends Sequelize.Model {
        static associate(models) {
            models.Matchup.belongsTo(models.Fighter, {
                as: "P1",
                foreignKey: "p1Uuid",
                onDelete: "CASCADE",
                onUpdate: "RESTRICT",
            });
            models.Matchup.belongsTo(models.Fighter, {
                as: "P2",
                foreignKey: "p2Uuid",
                onDelete: "CASCADE",
                onUpdate: "RESTRICT",
            });
        }
    }

    Matchup.init(
        {
            uuid: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                unique: true,
                primaryKey: true,
            },
            p1Uuid: {
                type: Sequelize.UUID,
                references: {
                    model: sequelize.models.Fighter,
                    key: "uuid",
                },
                allowNull: false,
                unique: "compositeKey",
            },
            p2Uuid: {
                type: Sequelize.UUID,
                references: {
                    model: sequelize.models.Fighter,
                    key: "uuid",
                },
                allowNull: false,
                unique: "compositeKey",
            },
            matches: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },
            p1Wins: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },
            p2Wins: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },
            createdAt: { type: Sequelize.DATE(3) },
            updatedAt: { type: Sequelize.DATE(3) },
        },
        {
            sequelize,
            modelName: "Matchup",
        }
    );

    return Matchup;
};

import { MATCH_MODES } from "../../constants/index.js";
import Sequelize from "sequelize";

export default (sequelize) => {
    class Remaining extends Sequelize.Model {}

    Remaining.init(
        {
            uuid: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                unique: true,
                primaryKey: true,
            },
            value: {
                type: Sequelize.STRING,
                unique: true,
                allowNull: false,
            },
            mode: {
                type: Sequelize.ENUM,
                values: Object.values(MATCH_MODES),
                allowNull: false,
            },
            createdAt: { type: Sequelize.DATE(3) },
            updatedAt: { type: Sequelize.DATE(3) },
        },
        {
            sequelize,
            modelName: "Remaining",
        }
    );

    return Remaining;
};

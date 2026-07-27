import {
    MATCH_MODES,
    MATCH_WINNERS,
    SELECTED_PLAYERS,
} from "../../constants/index.js";
import Sequelize from "sequelize";

/**
 * mysql2 hands BIGINT and DECIMAL back as strings so it never silently loses
 * precision past 2^53. Nothing stored here gets remotely close to that, and the
 * rest of the codebase treats balances and win chances as numbers (see
 * getBalance), so these columns are converted on read.
 */
const numeric = (type, field, options = {}) => ({
    type,
    ...options,
    get() {
        const value = this.getDataValue(field);
        return value === null || value === undefined ? null : Number(value);
    },
});

export default (sequelize) => {
    /**
     * One row per recorded match: what we predicted, what we knew when we
     * predicted it, and what the bet did (if we placed one).
     *
     * Rows are written for exactly the matches the listener records, so
     * exhibitions never appear here and tournaments only appear when strict
     * mode is off. Every betting column is nullable, because the listener
     * records matches whether or not betting mode is on.
     */
    class Prediction extends Sequelize.Model {
        static associate(models) {
            models.Prediction.belongsTo(models.Fighter, {
                as: "P1",
                foreignKey: "p1Uuid",
                onDelete: "CASCADE",
                onUpdate: "RESTRICT",
            });
            models.Prediction.belongsTo(models.Fighter, {
                as: "P2",
                foreignKey: "p2Uuid",
                onDelete: "CASCADE",
                onUpdate: "RESTRICT",
            });
        }
    }

    Prediction.init(
        {
            uuid: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                unique: true,
                primaryKey: true,
            },

            // The live match's own p1/p2 slots, which Salty Bet assigns
            // arbitrarily. Stored directly rather than as a matchupUuid so the
            // orientation is unambiguous and both fighters eager-load in one
            // query, and so a never-before-seen pairing can still be logged.
            p1Uuid: {
                type: Sequelize.UUID,
                references: { model: sequelize.models.Fighter, key: "uuid" },
                allowNull: false,
            },
            p2Uuid: {
                type: Sequelize.UUID,
                references: { model: sequelize.models.Fighter, key: "uuid" },
                allowNull: false,
            },

            mode: {
                type: Sequelize.ENUM,
                values: Object.values(MATCH_MODES),
                allowNull: false,
            },
            winner: {
                type: Sequelize.ENUM,
                values: Object.values(MATCH_WINNERS),
                allowNull: false,
            },

            // --- Prediction, and the inputs it was made from ---------------
            // Fighter and Matchup rows mutate after every match, so the stats
            // below are frozen at prediction time. Without them the inputs the
            // model actually saw cannot be reconstructed, which makes the
            // history useless for retraining or backtesting.
            p1WinChance: numeric(Sequelize.DECIMAL(5, 2), "p1WinChance", {
                allowNull: false,
            }),
            p1Matches: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
            },
            p1Wins: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
            },
            p2Matches: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
            },
            p2Wins: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
            },
            // Combined head-to-head at prediction time (see getHeadToHead),
            // oriented to p1 — h2hP2Wins is h2hMatches - h2hP1Wins.
            h2hMatches: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
            },
            h2hP1Wins: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
            },

            // --- Pots -------------------------------------------------------
            // Nullable: the API reports 0 for both until betting locks, so
            // these are only meaningful once read after the lock, and are left
            // null if that read is missed.
            p1Total: numeric(Sequelize.BIGINT.UNSIGNED, "p1Total", {
                allowNull: true,
            }),
            p2Total: numeric(Sequelize.BIGINT.UNSIGNED, "p2Total", {
                allowNull: true,
            }),

            // --- Bet --------------------------------------------------------
            // All null when betting mode is off, or when the bet was skipped
            // or rejected.
            //
            // There is deliberately no balanceAfter: it is derivable, either as
            // the next row's balanceBefore or exactly from the pots, since a
            // parimutuel payout is wager * loserPot / winnerPot on a win and
            // -wager on a loss.
            selectedPlayer: {
                type: Sequelize.ENUM,
                values: Object.values(SELECTED_PLAYERS),
                allowNull: true,
            },
            wager: numeric(Sequelize.BIGINT.UNSIGNED, "wager", {
                allowNull: true,
            }),
            balanceBefore: numeric(Sequelize.BIGINT.UNSIGNED, "balanceBefore", {
                allowNull: true,
            }),

            createdAt: { type: Sequelize.DATE(3) },
            updatedAt: { type: Sequelize.DATE(3) },
        },
        {
            sequelize,
            modelName: "Prediction",
            indexes: [
                // Calibration and backtesting both read time-ordered windows,
                // usually split by mode.
                { fields: ["createdAt"] },
                { fields: ["mode", "createdAt"] },
                // Pair lookups, and doubles as the FK index for p1Uuid.
                { fields: ["p1Uuid", "p2Uuid"] },
            ],
        }
    );

    return Prediction;
};

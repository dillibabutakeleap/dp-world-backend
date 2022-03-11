const Sequelize = require("sequelize");
const sequelize = require("../utils/database");
const GameStageLevels = require("./game-stage-levels");
const User = require("./user-model");

const UserCompletedGameLevels = sequelize.define("user_completed_game_levels", {
  id: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    allowNull: false,
  },
  isCompleted: {
    type: Sequelize.BOOLEAN,
    default: true,
    allowNull: false,
  },
  
  spentTimeInSec: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
  },
});
User.hasMany(UserCompletedGameLevels, { foreignKey: "userId" });
UserCompletedGameLevels.belongsTo(User, { foreignKey: "userId" });
GameStageLevels.hasMany(UserCompletedGameLevels, { foreignKey: "levelId" });
UserCompletedGameLevels.belongsTo(GameStageLevels, { foreignKey: "levelId" });


module.exports = UserCompletedGameLevels;

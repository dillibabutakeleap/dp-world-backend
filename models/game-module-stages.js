const Sequelize = require("sequelize");
const sequelize = require("../utils/database");
const GameStageLevels = require("./game-stage-levels");

const GameModuleStages = sequelize.define("game_module_stages", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  name: Sequelize.STRING,
  position: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
  },
});

GameModuleStages.hasMany(GameStageLevels, { foreignKey: "stageId" });
GameStageLevels.belongsTo(GameModuleStages, { foreignKey: "stageId" });

module.exports = GameModuleStages;

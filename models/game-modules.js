const Sequelize = require("sequelize");
const sequelize = require("../utils/database");
const GameModuleStages = require("./game-module-stages");

const GameModules = sequelize.define("game_modules", {
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
  isActive: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
});

GameModules.hasMany(GameModuleStages, { foreignKey: "gameModuleId" });
GameModuleStages.belongsTo(GameModules, { foreignKey: "gameModuleId" });

module.exports = GameModules;

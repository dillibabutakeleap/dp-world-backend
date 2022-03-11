const Sequelize = require("sequelize");
const sequelize = require("../utils/database");

const GameStageLevels = sequelize.define("game_stage_levels", {
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
  commonIdentifier: {
    type: Sequelize.STRING,
    defaultValue: null,
  },
});

module.exports = GameStageLevels;

const Sequelize = require("sequelize");
const sequelize = require("../utils/database");

const SubscriptionNotes = sequelize.define("subscription_notes", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  data: Sequelize.STRING,
  position: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
  },
});

module.exports = SubscriptionNotes;

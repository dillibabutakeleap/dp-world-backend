const Sequelize = require("sequelize");
const sequelize = require("../utils/database");
const SubscriptionNotes = require("./subscription-notes");
const User = require("./user-model");

const Subscriptions = sequelize.define("subscriptions", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  name: Sequelize.STRING,
  originalPrice: Sequelize.DOUBLE,
  offerPrice: Sequelize.DOUBLE,
  finalPrice: Sequelize.DOUBLE,
  finalPriceINR: Sequelize.INTEGER,
  subscriptionValidityInDays: Sequelize.INTEGER,
  isPopular: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  noOfLicenses: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
  },
  position: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
  },
  priceId: Sequelize.STRING,
});

Subscriptions.hasMany(SubscriptionNotes, { foreignKey: "subscriptionId" });
SubscriptionNotes.belongsTo(Subscriptions, { foreignKey: "subscriptionId" });

module.exports = Subscriptions;

const Sequelize = require("sequelize");
const sequelize = require("../utils/database");
const User = require("./user-model");

const UserTeam = sequelize.define("user_teams", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
});

User.hasMany(UserTeam, { foreignKey: "teamAdminId" });
UserTeam.belongsTo(User, { foreignKey: "teamAdminId" });
User.hasOne(UserTeam, { foreignKey: "teamUserId", as: "teamUser" });
UserTeam.belongsTo(User, { foreignKey: "teamUserId", as: "teamUser" });

module.exports = UserTeam;

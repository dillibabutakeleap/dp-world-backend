const Sequelize = require("sequelize");
const sequelize = require("../utils/database");
const _ = require("lodash");
const UserRoles = require("./user-roles");

const User = sequelize.define("users", {
  userId: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    allowNull: false,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  accessToken: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  lastLogin: Sequelize.DATE,
  employeeId: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  phoneNumber:   {
    type: Sequelize.STRING,
    allowNull: true,
  },
  trainingCompletedOn:   {
    type: Sequelize.DATE,
    allowNull: true,
  },
});
User.prototype.toJSON = function () {
  const values = {
    ..._.omit(this.get(), ["password", "user_roles"]),
  };
  if (this.get().user_roles && this.get().user_roles.length) {
    values.userRoles = this.get()
      .user_roles.map((role) => role.roleName)
      .toString();
  }
  return values;
};

User.hasMany(UserRoles, { foreignKey: "userId" });
UserRoles.belongsTo(User, { foreignKey: "userId" });
module.exports = User;

const cryptor = require("../utils/cryptor");
const jwt = require("../utils/jwt");
const User = require("../models/user-model");
const UserRoles = require("../models/user-roles");
const { Op } = require("sequelize");

exports.login = async (req, res) => {
  try {
    const payload = req.body;
    console.log('====================================');
    console.log(payload);
    console.log('====================================');
    const fethedUser = await User.findOne({
      where: {
        [Op.or]: [{ email: payload.email }, { employeeId: payload.email }],
      },
      include: UserRoles,
    });
    const errorResponse = { status: 400, message: "Invalid email or password" };
    if (!fethedUser) {
      return res.status(400).send(errorResponse);
    }
    const isValidPassword = await cryptor.isValidPassword(
      payload.password,
      fethedUser.password
    );
    if (!isValidPassword) {
      return res.status(400).send(errorResponse);
    }
    const accessToken = jwt.generateJwtToken(fethedUser);
    fethedUser.set("lastLogin", new Date());
    fethedUser.set("accessToken", accessToken);
    await fethedUser.save();
    const response = {
      status: 200,
      message: "Login  successfully.",
      user: fethedUser,
    };
    res.send(response);
  } catch (err) {
    return res.status(400).send({
      status: 400,
      message: "Failed to Login",
      devMessage: err.message,
    });
  }
};

exports.register = async (req, res) => {
  const payload = req.body;
  const existingUser = await User.findOne({ where: { email: payload.email } });
  if (existingUser) {
    return res
      .status(400)
      .send({ status: 400, message: "User already exists with the email" });
  }
  const encryptedPassword = await cryptor.encrypt(payload.password);
  const user = {
    name: payload.name,
    email: payload.email,
    password: encryptedPassword,
    user_roles: [
      {
        roleName: "USER",
      },
    ],
  };

  const savedUser = await User.create(user, { include: [UserRoles] });
  const accessToken = jwt.generateJwtToken(savedUser);
  savedUser.set("lastLogin", new Date());
  savedUser.set("accessToken", accessToken);
  await savedUser.save();
  const response = {
    status: 200,
    message: "Registered successfully.",
    user: savedUser,
  };
  res.send(response);
};

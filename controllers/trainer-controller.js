const sequelize = require("../utils/database");
const User = require("../models/user-model");
const UserRoles = require("../models/user-roles");
const UserTeam = require("../models/user-team");
const { USER } = require("../utils/constants");
const GameStageLevels = require("../models/game-stage-levels");
const UserCompletedGameLevels = require("../models/user-completed-game-levels");
const Sequelize = require("sequelize");

exports.addTrainee = async (req, res) => {
  const t = await sequelize.transaction();
  const payload = req.body;
  try {
    // checking if the user is already exists
    const existingUser = await User.findOne({
      where: { employeeId: payload.employeeId },
    });
    if (existingUser) {
      return res
        .status(400)
        .send({ status: 400, message: "User already exists" });
    }

    // creating a user record
    let user = {
      name: payload.name,
      email: payload.email,
      password: null,
      employeeId: payload.employeeIkd,
      phoneNumber: payload.phoneNumber,
      user_roles: [
        {
          roleName: USER,
        },
      ],
    };

    const savedUser = await User.create(user, {
      include: [UserRoles],
      transaction: t,
    });
    // adding the saved user to team
    const savedTeamUserDetails = await UserTeam.create(
      {
        teamAdminId: req.loggedInUser.userId,
        teamUserId: savedUser.dataValues.userId,
      },
      {
        transaction: t,
      }
    );
    t.commit();
    return res.send({ status: 200, message: "Trainee added successfully." });
  } catch (err) {
    console.error(err);
    t.rollback();
    return res.status(400).send({
      status: 400,
      message: "Failed to add trainee",
      devMessage: err.message,
    });
  }
};

exports.checkIfUserExists = async (req, res) => {
  try {
    let payload = req.body;
    let isReturnProgressData = req.query.isReturnProgressData;
    const user = await User.findOne({
      where: { employeeId: payload.employeeId },
    });
    if (user) {
      let progressData = null;
      if (isReturnProgressData) {
        // get user progress data
        const gameStageLevels = await GameStageLevels.findAll({
          include: [
            {
              model: UserCompletedGameLevels,
              where: { userId: user.userId },
              required: false,
            },
          ],
          order: [["position", "desc"]],
          raw: true,
          nest: true,
        });
        if (gameStageLevels && gameStageLevels.length) {
          gameStageLevels.forEach((gameStage, index) => {
            gameStage["isCompleted"] = gameStage.user_completed_game_levels.id
              ? true
              : false;
            if (index > 0) {
              gameStage.isEnable = gameStageLevels[index - 1].isCompleted
                ? true
                : false;
            } else {
              gameStage.isEnable = true;
            }
            gameStage.user_completed_game_levels = undefined;
          });
          progressData = gameStageLevels;
        }
      }
      return res.send({
        status: 200,
        message: "User already exists",
        isRegistered: true,
        progressData: progressData,
      });
    } else {
      return res.send({
        status: 200,
        message: "User does not exists",
        isRegistered: false,
      });
    }
  } catch (err) {
    return res.status(400).send({
      devMessage: err.message,
      status: 400,
      message: "Failed to check user",
    });
  }
};

exports.getTrainees = async (req, res) => {
  const trainerId = req.params.trainerId;
  console.log("coming");
  try {
    let size = +req.query.size || 10;
    let page = +req.query.page || 0;
    const data = await UserTeam.findAndCountAll({
      where: { teamAdminId: trainerId },
      limit: size,
      offset: size * page,
      include: [
        {
          model: User,
          as: "teamUser",
          attributes: [
            "userId",
            "name",
            "employeeId",
            "phoneNumber",
            "email",
            "createdAt",
            "updatedAt",
            "lastLogin",
            Sequelize.literal(
              "(select ((count(distinct ucgl.userId,ucgl.levelId)/(select count(*) from game_stage_levels))*100) from user_completed_game_levels ucgl where userId=`user_teams`.`teamUserId`) as progress"
            ),
          ],
        },
      ],
      raw: true,
      nest: true,
    });
    return res.send({
      status: 200,
      message: "Loaded trainees successfully.",
      trainees: data.rows,
      totalRecords: data.count,
    });
  } catch (err) {
    return res.status(400).send({
      devMessage: err.message,
      status: 400,
      message: "Failed to get Trainees",
    });
  }
};

const UserTeam = require("../models/user-team");
const User = require("../models/user-model");
const GameModuleStages = require("../models/game-module-stages");
const GameStageLevels = require("../models/game-stage-levels");
const UserCompletedGameLevels = require("../models/user-completed-game-levels");
const Sequelize = require("sequelize");
const { PASSWORD_SET_EMAIL_LINK } = require("../utils/config");
const { QueryTypes } = require("sequelize");
const cryptor = require("../utils/cryptor");
const {
  USER,
  TRAINER,
  TRANSFER_LICENSE_CONDITIONS,
} = require("../utils/constants");
const UserRoles = require("../models/user-roles");
const sequelize = require("../utils/database");

const addUserToDatabase = async (t, payload, loggedInUserId) => {
  try {
    // checking if user exists already
    let user = await User.findOne({
      where: { employeeId: payload.employeeId },
    });

    if (user) {
      throw new Error("User already registered");
    }

    const encryptedPassword = await cryptor.encrypt(payload.password);

    user = {
      name: payload.name,
      email: payload.email,
      password: encryptedPassword,
      employeeId: payload.employeeId,
      phoneNumber: payload.phoneNumber,
      user_roles: [
        {
          roleName: USER,
        },
        {
          roleName: payload.roleName,
        },
      ],
    };

    const savedUser = await User.create(user, {
      include: [UserRoles],
      transaction: t,
    });
    // adding the saved user to team
    const userTeam = UserTeam.build({
      teamAdminId: loggedInUserId,
      teamUserId: savedUser.dataValues.userId,
    });
    const savedTeamUserDetails = await userTeam.save({
      transaction: t,
    });
    return savedTeamUserDetails;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.addTrainer = async (req, res) => {
  const t = await sequelize.transaction();
  const payload = req.body;
  try {
    payload["roleName"] = TRAINER;
    const savedTeamUserDetails = await addUserToDatabase(
      t,
      payload,
      req.loggedInUser.userId
    );
    await t.commit();
    res.send({
      status: 200,
      message: "Added User Successfully.",
      details: savedTeamUserDetails,
    });
  } catch (err) {
    console.error(err);
    try {
      await t.rollback();
    } catch (err) {
      console.error(err);
    }
    if (!res.headersSent) {
      return res.status(400).send({
        status: 400,
        message: "Failed to add User.",
        devMessage: err.message,
      });
    }
  }
};

exports.getTeamUsers = async (req, res) => {
  try {
    let size = +req.query.size || 10;
    let page = +req.query.page || 0;
    const data = await UserTeam.findAndCountAll({
      where: { teamAdminId: req.loggedInUser.userId },
      limit: size,
      offset: size * page,
      include: [
        {
          model: User,
          as: "teamUser",
          attributes: [
            "userId",
            "name",
            "email",
            "createdAt",
            "updatedAt",
            "lastLogin",
            // Sequelize.literal(
            //   "(select ((count(ucgl.userId)/(select count(*) from game_stage_levels))*100) from user_completed_game_levels ucgl where userId=`user_team`.`teamUserId`) as progress"
            // ),
          ],
        },
      ],
      raw: true,
      nest: true,
    });

    const licensesCount = await UserLicenses.count({
      where: { webAdminUserId: req.loggedInUser.userId },
    });
    const gameEnvironments = await GameEnvironments.findAll();
    if (
      gameEnvironments &&
      gameEnvironments.length &&
      data.rows &&
      data.rows.length
    ) {
      for (let row of data.rows) {
        let userProgress = {};
        for (let gameEnvironment of gameEnvironments) {
          const progressValue = await sequelize.query(
            `select ((count(distinct ucgl.userId,ucgl.levelId)/(SELECT Count(*) FROM   game_stage_levels where id in 
            (SELECT gsl.id FROM   game_stage_levels gsl JOIN game_module_stages gms ON gms.id = gsl.stageid JOIN game_modules
               gm ON gm.id = gms.gamemoduleid JOIN game_environments ge ON ge.id = gm.environmentid WHERE
                 ge.id ='${gameEnvironment.id}')))*100) as progress from user_completed_game_levels ucgl
           where userId='${row.teamUserId}' and ucgl.levelId in (SELECT gsl.id FROM   game_stage_levels gsl JOIN game_module_stages gms
                     ON gms.id = gsl.stageid JOIN game_modules gm ON gm.id = gms.gamemoduleid JOIN game_environments
                      ge ON ge.id = gm.environmentid WHERE  ge.id = '${gameEnvironment.id}')`,
            {
              type: QueryTypes.SELECT,
            }
          );
          userProgress[gameEnvironment.name] = +progressValue[0]?.progress || 0;
        }
        row.teamUser["userProgressData"] = userProgress;
      }
    }
    return res.send({
      status: 200,
      message: "Team users loaded successfully",
      licensesCount: licensesCount,
      teamUsers: data.rows,
      totalRecords: data.count,
    });
  } catch (err) {
    return res.status(400).send({
      status: 400,
      message: "Failed fetching Users.",
      devMessage: err.message,
    });
  }
};

exports.getTrainers = async (req, res) => {
  try {
    let size = +req.query.size || 10;
    let page = +req.query.page || 0;
    const data = await UserTeam.findAndCountAll({
      where: { teamAdminId: req.loggedInUser.userId },
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
          ],
        },
      ],
      raw: true,
      nest: true,
    });
    return res.send({
      status: 200,
      message: "Loaded trainers successfully.",
      trainers: data.rows,
      totalRecords: data.count,
    });
  } catch (err) {
    return res.status(400).send({
      status: 400,
      message: "Failed fetching Users.",
      devMessage: err.message,
    });
  }
};

async function getProgressDataForDashboard(teamAdminId) {
  try {
    const gameModuleStages = await GameModuleStages.findAll({});
    let progressData = {};
    if (gameModuleStages && gameModuleStages.length) {
      for (let gameStage of gameModuleStages) {
        const data = await sequelize.query(
          `select (((select count(ucgl.id) from user_completed_game_levels ucgl join user_teams
               ut on ut.teamUserId=ucgl.userId where ut.teamAdminId in (select teamUserId from user_teams where teamAdminId='${teamAdminId}') and 
               ucgl.levelId in (select gsl.id from game_stage_levels gsl join game_module_stages gms on gms.id=gsl.stageId 
               where gms.id='${gameStage.id}')))
               /((select count(ut.id) from user_teams ut where teamAdminId in (select teamUserId from user_teams where teamAdminId='${teamAdminId}'))
               *(select count(gsl.id) from game_stage_levels gsl join game_module_stages gms on gms.id=gsl.stageId 
               where gms.id='${gameStage.id}'))*100) as completedPercentage`,
          { type: Sequelize.SELECT }
        );
        console.log(data);
        progressData[gameStage.name] =
          data && data.length && data[0] && data[0].length
            ? +data[0][0].completedPercentage
            : 0;
      }
      // calculating unCompleted percentage

      totalUCPercent = 0;
      let totalProgress = 0;
      Object.keys(progressData).forEach((key) => {
        totalProgress += progressData[key];
        totalUCPercent += 100 - +progressData[key];
      });

      totalUCPercent = totalUCPercent / Object.keys(progressData).length;

      progressData["unCompleted"] = totalUCPercent;
      Object.keys(progressData).forEach((key) => {
        progressData[key] =
          (+progressData[key] / (totalProgress + totalUCPercent)) * 100;
      });
    }
    return new Promise((resolve) => resolve(progressData));
  } catch (err) {
    console.error(err);
    throw err;
  }
}

exports.getDashboardData = async (req, res) => {
  try {
    // total trainees
    let countOfTrainees = await sequelize.query(
      `select count(*) as totalTrainees from user_teams where teamAdminId in (select teamUserId from user_teams where teamAdminId=?);`,
      { type: QueryTypes.SELECT, replacements: [req.loggedInUser.userId] }
    );

    countOfTrainees =
      countOfTrainees && countOfTrainees.length
        ? countOfTrainees[0]["totalTrainees"]
        : 0;
    const countOfTrainers = await UserTeam.count({
      where: { teamAdminId: req.loggedInUser.userId },
    });

    // Get team users completed totalLevels
    const completedStatus = await sequelize.query(
      `select count(ucgl.id) as totalCompletedLevels,sum(spentTimeInSec) as totalTimeInSec from user_completed_game_levels
       ucgl join user_teams ut on ut.teamUserId=ucgl.userId where ut.teamAdminId in (select teamUserId from user_teams where teamAdminId='${req.loggedInUser.userId}')`,
      { type: QueryTypes.SELECT }
    );

    progressData = await getProgressDataForDashboard(req.loggedInUser.userId);
    return res.send({
      totalTrainees: countOfTrainees,
      totalTrainers: countOfTrainers,
      totalVRSessions:
        completedStatus && completedStatus.length
          ? completedStatus[0].totalCompletedLevels
          : 0,
      totalSessionTimeInSecs:
        completedStatus && completedStatus.length
          ? completedStatus[0].totalTimeInSec
          : 0,
      progressData: progressData,
    });
  } catch (e) {
    if (!res.headersSent) {
      return res.status(500).send({
        status: 500,
        message: "Failed to fetch Dashboard Data",
        devMessage: e.message,
      });
    }
  }
};
const getUserGameStageProgress = async (userId, gameStageId) => {
  try {
    const moduleProgress = await sequelize.query(
      `select ((count(distinct ucgl.userId,ucgl.levelId)/(SELECT Count(*) FROM   game_stage_levels where id in 
      (SELECT gsl.id FROM   game_stage_levels gsl JOIN game_module_stages gms ON gms.id = gsl.stageid WHERE
           gms.id =?)))*100) as progress from user_completed_game_levels ucgl
     where userId=? and ucgl.levelId in (SELECT gsl.id FROM   game_stage_levels gsl JOIN game_module_stages gms
      ON gms.id = gsl.stageid WHERE  gms.id = ?)`,
      {
        type: QueryTypes.SELECT,
        replacements: [gameStageId, userId, gameStageId],
      }
    );
    return moduleProgress && moduleProgress.length
      ? +moduleProgress[0].progress
      : 0;
  } catch (e) {
    console.error(e);
    throw e;
  }
};
const getUserGameModuleProgress = async (userId, gameModuleId) => {
  try {
    const moduleProgress = await sequelize.query(
      `select ((count(distinct ucgl.userId,ucgl.levelId)/(SELECT Count(*) FROM   game_stage_levels where id in 
      (SELECT gsl.id FROM   game_stage_levels gsl JOIN game_module_stages gms ON gms.id = gsl.stageid JOIN game_modules
         gm ON gm.id = gms.gamemoduleid  WHERE
           gm.id =?)))*100) as progress from user_completed_game_levels ucgl
     where userId=? and ucgl.levelId in (SELECT gsl.id FROM   game_stage_levels gsl JOIN game_module_stages gms
               ON gms.id = gsl.stageid JOIN game_modules gm ON gm.id = gms.gamemoduleid  WHERE  gm.id = ?)`,
      {
        type: QueryTypes.SELECT,
        replacements: [gameModuleId, userId, gameModuleId],
      }
    );
    return moduleProgress && moduleProgress.length
      ? +moduleProgress[0].progress
      : 0;
  } catch (e) {
    console.error(e);
    throw e;
  }
};
const getUserGameLevelStats = async (userId, levelId) => {
  try {
    const gameLevelStats = await sequelize.query(
      `select count(userId) as count,SUM(spentTimeInSec) as spentTimeInSec from user_completed_game_levels where userId=? and levelId=?`,
      {
        type: QueryTypes.SELECT,
        replacements: [userId, levelId],
      }
    );
    return gameLevelStats && gameLevelStats.length
      ? gameLevelStats[0]
      : { count: 0, spentTimeInSec: 0 };
  } catch (e) {
    console.error(e);
    throw e;
  }
};
exports.getUserProgressData = async (req, res) => {
  try {
    const userId = req.params.userId;
    const gameModuleStages = await GameModuleStages.findAll({
      include: [
        {
          model: GameStageLevels,
          required: false,
          attributes: ["id", "name"],
        },
      ],
    });
    const gameStages = [];
    if (gameModuleStages && gameModuleStages.length) {
      for (let gs of gameModuleStages) {
        let gameStageProgress = await getUserGameStageProgress(userId, gs.id);
        let gsObj = {
          id: gs.id,
          title: gs.name,
          gameLevels: [],
          progress: gameStageProgress,
        };
        if (gs.game_stage_levels && gs.game_stage_levels.length) {
          for (let gsl of gs.game_stage_levels) {
            const userGameLevelStats = await getUserGameLevelStats(
              userId,
              gsl.id
            );
            gsObj.gameLevels.push({
              title: gsl.name,
              isCompleted: userGameLevelStats.count
                ? userGameLevelStats.count
                : 0,
              timeDurationInSec: userGameLevelStats.spentTimeInSec,
              noOfTimesCompleted: +userGameLevelStats.count,
            });
          }
        }
        gameStages.push(gsObj);
      }
    }

    return res.send({
      status: 200,
      message: "User Progress data is loaded successfully",
      data: gameStages,
    });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      return res.status(400).send({
        status: 400,
        message: "Failed to fetch User Progress Data",
        devMessage: e.message,
      });
    }
  }
};

exports.resetTrainerPassword = async (req, res) => {
  try {
    const t = await sequelize.transaction();
    let payload = req.body;
    const user = await User.findOne({ userId: payload.trainerId });
    if (!user) {
      return res.status(400).send({ status: 400, message: "No Trainer Found" });
    }
    const encryptedPassword = await cryptor.encrypt(payload.password);
    user.password = encryptedPassword;
    console.log(encryptedPassword);
    await sequelize.query(
      "update users set password = '" +
        encryptedPassword +
        "' where userId='" +
        payload.trainerId +
        "'",
      { type: QueryTypes.UPDATE }
    );
    // await User.update(user);
    // await user.save({ transaction: t });
    // await t.commit();
    return res
      .status(200)
      .send({ status: 200, message: "Trainer password updated successfully." });
  } catch (e) {
    console.error(e);
    return res.status(400).send({
      status: 400,
      message: "Failed to fetch User Progress Data",
      devMessage: e.message,
    });
  }
};

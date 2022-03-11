const UserTeam = require("../models/user-team");
const User = require("../models/user-model");
const GameModules = require("../models/game-modules");
const GameModuleStages = require("../models/game-module-stages");
const GameStageLevels = require("../models/game-stage-levels");
const UserCompletedGameLevels = require("../models/user-completed-game-levels");
const Sequelize = require("sequelize");
const UserLicenses = require("../models/user-licenses");
const { PASSWORD_SET_EMAIL_LINK } = require("../utils/config");
const { QueryTypes } = require("sequelize");
const {
  USER,
  TRANSFER_LICENSE_CONDITIONS,
  TRANSFER_LICENSE_ALLOWED_TIMES,
  TRANSFER_LICENSE_MAX_COMPLETION_PERCENTAGE,
  GAME_RESET_AVAILABLE_MAX_LEVEL,
  TRANSFER_LICENSE_MAX_TIME_IN_DAYS,
} = require("../utils/constants");
const UserRoles = require("../models/user-roles");
const sequelize = require("../utils/database");
const Conditions = require("../models/conditions-model");
const jwt = require("../utils/jwt");

const addUserToDatabase = async (t, req, res) => {
  try {
    // Checking if user is already consumed all available licenses
    const userTeamCount = await UserTeam.count({
      where: { teamAdminId: req.loggedInUser.userId },
    });
    const availableLicense = await UserLicenses.findOne({
      where: { webAdminUserId: req.loggedInUser.userId, userId: null },
    });

    if (req.loggedInUser.userLicenses <= userTeamCount || !availableLicense) {
      // user already consumed all available licenses
      return res.status(400).send({
        status: 400,
        message:
          "You've consumed all licenses please upgrade your subscription to add more users",
      });
    }

    // checking if user exists already
    const payload = req.body;
    let user = await User.findOne({ where: { email: payload.email } });
    if (user) {
      return res
        .status(400)
        .send({ status: 400, message: "User already registered" });
    }
    //   user = User.build({ email: payload.email, name: payload.name });
    const passwordResetToken = jwt.generatePasswordResetToken();
    user = {
      name: payload.name,
      email: payload.email,
      password: null,
      passwordResetToken: passwordResetToken,
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
    const userTeam = UserTeam.build({
      teamAdminId: req.loggedInUser.userId,
      teamUserId: savedUser.dataValues.userId,
    });

    const savedTeamUserDetails = await userTeam.save({
      transaction: t,
    });

    // assigning the user to license

    availableLicense.set("userId", savedUser.userId);
    await availableLicense.save({ transaction: t });

    // saving the current license record to history
    const userLicenseHistory = UserLicenseHistory.build({
      license: availableLicense.license,
      userId: savedUser.userId,
      webAdminUserId: req.loggedInUser.userId,
    });
    await userLicenseHistory.save({
      transaction: t,
    });

    // Send email to user to set password
    const passwordResetLink = PASSWORD_SET_EMAIL_LINK + passwordResetToken;
    const sesResponse = await sendPasswordSetEmail(
      savedUser.email,
      savedUser.name,
      passwordResetLink
    );
    console.log("aws email send response");
    console.log(sesResponse);

    return savedTeamUserDetails;
  } catch (err) {
    console.log(err);
    t.rollback();
    throw err;
  }
};

exports.addUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const savedTeamUserDetails = await addUserToDatabase(t, req, res);
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

exports.getTransferLicenseConditions = async (req, res) => {
  const conditions = await Conditions.findOne({
    where: { name: TRANSFER_LICENSE_CONDITIONS },
  });
  let transferLicenseConditions = conditions ? conditions.value.split("|") : [];

  return res.send({
    status: 200,
    message: "Transfer license conditions loaded successfully",
    conditions: transferLicenseConditions,
  });
};

exports.transferUserLicense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const teamUserId = req.body.teamUserId;
    const userLicense = await UserLicenses.findOne({
      where: { userId: teamUserId },
    });
    if (!userLicense) {
      return res
        .status(400)
        .send({ status: 400, message: "No Active license found" });
    }
    // checking for each conditions satisfactions.
    // creating a default error response;
    const errorResponse = {
      status: 400,
      message: "License Transfer is not allowed",
    };

    // checking for number of time license is already transferred
    const maxLicenseTransfersAllowed = await Conditions.findOne({
      where: { name: TRANSFER_LICENSE_ALLOWED_TIMES },
    });
    const userLicenseHistory = await UserLicenseHistory.findAll({
      order: [["createdAt", "ASC"]],
      where: { license: userLicense.license },
    });
    if (maxLicenseTransfersAllowed) {
      // increasing the max allowed times by 1, because initial assignment of license also stored in history
      if (userLicenseHistory.length >= +maxLicenseTransfersAllowed.value + 1) {
        return res.status(400).send(errorResponse);
      }
    }

    // checking for max days allowed for transferred
    const maxDaysAllowed = await Conditions.findOne({
      where: { name: TRANSFER_LICENSE_MAX_TIME_IN_DAYS },
    });
    if (maxDaysAllowed && userLicenseHistory.length) {
      const firstTransferredLicense = userLicenseHistory[0];

      let startDate = firstTransferredLicense.createdAt;
      let endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + maxDaysAllowed);

      const diffDays = parseInt(
        (endDate - startDate) / (1000 * 60 * 60 * 24),
        10
      );
      if (diffDays > maxDaysAllowed) {
        return res.status(400).send(errorResponse);
      }
    }

    // Maximum percentage allowed to transfer license.
    // if current license consuming user completed more percentage than the specified
    //  limit then transfer is not allowed.
    const maxCompletionPercentageAllowed = await Conditions.findOne({
      where: { name: TRANSFER_LICENSE_MAX_COMPLETION_PERCENTAGE },
    });
    if (maxCompletionPercentageAllowed) {
      const totalLevels = await GameStageLevels.count();
      const userCompletedLevels = await UserCompletedGameLevels.count({
        where: { userId: userLicense.userId, isCompleted: true },
      });
      if (totalLevels > 0 && userCompletedLevels > 0) {
        const currentUserCompletionPercentage =
          (+userCompletedLevels / +totalLevels) * 100;
        if (
          currentUserCompletionPercentage >
          +maxCompletionPercentageAllowed.value
        ) {
          return res.status(400).send(errorResponse);
        }
      }
    }

    try {
      const savedTeamUserDetails = await addUserToDatabase(t, req, res);
      console.log(savedTeamUserDetails);
      console.log(savedTeamUserDetails.teamAdminId);
      const savedUserId = savedTeamUserDetails.dataValues.teamUserId;
      userLicense.set("userId", savedUserId);
      userLicense.save({ transaction: t });
      // copying the data to user license history

      const newUserLicenseHistory = UserLicenseHistory.build({
        license: userLicense.license,
        webAdminUserId: userLicense.dataValues.webAdminUserId,
        userId: savedUserId,
      });
      await newUserLicenseHistory.save({ transaction: t });
      await t.commit();
      return res.send({
        status: 200,
        message: "License Transferred Successfully.",
      });
    } catch (e) {
      console.error(e);
      return res;
    }
  } catch (e) {
    console.error(e);
    try {
      await t.rollback();
    } catch (err) {
      console.error(err);
    }
    if (!res.headersSent) {
      return res.status(500).send({
        status: 400,
        message: "License transfer failed",
        devMessage: e.message,
      });
    }
  }
};

async function getProgressDataForDashboard(teamAdminId) {
  try {
    const teamUsers = UserTeam.findAll({ webAdminUserId: teamAdminId });

    const gameEnvironments = await GameEnvironments.findAll({
      include: [
        { model: GameModules, where: { isActive: true }, required: false },
      ],
    });
    let progressData = {};
    if (gameEnvironments && gameEnvironments.length) {
      for (let ge of gameEnvironments) {
        progressData[ge.name] = {};
        if (ge.game_modules && ge.game_modules.length) {
          for (let module of ge.game_modules) {
            const data = await sequelize.query(
              `select (((select count(ucgl.id) from user_completed_game_levels ucgl join user_teams
               ut on ut.teamUserId=ucgl.userId where ut.teamAdminId='${teamAdminId}' and 
               ucgl.levelId in (select gsl.id from game_stage_levels gsl join game_module_stages gms on gms.id=gsl.stageId 
               join game_modules gm on gm.id=gms.gameModuleId
               where gameModuleId='${module.id}' and gm.isActive = true)))
               /((select count(ut.id) from user_teams ut where teamAdminId='${teamAdminId}')
               *(select count(gsl.id) from game_stage_levels gsl join game_module_stages gms on gms.id=gsl.stageId 
               join game_modules gm on gm.id=gms.gameModuleId
               where gameModuleId='${module.id}' and gm.isActive = true))*100) as completedPercentage`,
              { type: Sequelize.SELECT }
            );
            console.log(data);
            progressData[ge.name][module.name] =
              data && data.length && data[0] && data[0].length
                ? +data[0][0].completedPercentage
                : 0;
          }
          // calculating unCompleted percentage

          totalUCPercent = 0;
          let totalProgress = 0;
          Object.keys(progressData[ge.name]).forEach((key) => {
            totalProgress += progressData[ge.name][key];
            totalUCPercent += 100 - +progressData[ge.name][key];
          });

          totalUCPercent =
            totalUCPercent / Object.keys(progressData[ge.name]).length;

          progressData[ge.name]["unCompleted"] = totalUCPercent;
          Object.keys(progressData[ge.name]).forEach((key) => {
            progressData[ge.name][key] =
              (+progressData[ge.name][key] / (totalProgress + totalUCPercent)) *
              100;
          });
        }
      }
    }
    return new Promise((resolve) => resolve(progressData));
  } catch (err) {
    console.error(err);
    throw err;
  }
}

exports.getDashboardData = async (req, res) => {
  try {
    // Total Licenses Used
    const userLicenses = await UserLicenses.count({
      where: {
        userId: { [Sequelize.Op.not]: null },
        webAdminUserId: req.loggedInUser.userId,
      },
    });
    const totalUserLicenses = await UserLicenses.count({
      where: {
        webAdminUserId: req.loggedInUser.userId,
      },
    });

    // Get team users completed totalLevels
    const completedStatus = await sequelize.query(
      `select count(ucgl.id) as totalCompletedLevels,sum(spentTimeInSec) as totalTimeInSec from user_completed_game_levels
       ucgl join user_teams ut on ut.teamUserId=ucgl.userId where ut.teamAdminId='${req.loggedInUser.userId}'`,
      { type: QueryTypes.SELECT }
    );

    progressData = await getProgressDataForDashboard(req.loggedInUser.userId);
    return res.send({
      totalUserLicenses: totalUserLicenses,
      licensesUsed: userLicenses,
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
    const gameEnvironments = await GameEnvironments.findAll({
      include: [
        {
          model: GameModules,
          where: { isActive: true },
          required: false,
          attributes: ["name", "id"],
          include: [
            {
              model: GameModuleStages,
              required: false,
              attributes: ["id", "name"],
              include: [
                {
                  model: GameStageLevels,
                  required: false,
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
      ],
    });
    let dataObj = {};
    if (gameEnvironments && gameEnvironments.length) {
      for (let ge of gameEnvironments) {
        const geName = ge.name;
        dataObj[geName] = {};
        if (ge.game_modules && ge.game_modules.length) {
          for (let gm of ge.game_modules) {
            const gmName = gm.name;
            // get progress by module
            const moduleProgress = await getUserGameModuleProgress(
              userId,
              gm.id
            );
            const gameStages = [];
            if (gm.game_module_stages && gm.game_module_stages.length) {
              for (let gs of gm.game_module_stages) {
                let gsObj = {
                  id: gs.id,
                  title: gs.name,
                  gameLevels: [],
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
            dataObj[geName][gmName] = {
              progress: moduleProgress,
              gameStages: gameStages,
            };
          }
        }
      }
    }
    return res.send({
      status: 200,
      message: "User Progress data is loaded successfully",
      data: dataObj,
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

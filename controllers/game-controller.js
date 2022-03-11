const GameModuleStages = require("../models/game-module-stages");
const GameModules = require("../models/game-modules");
const GameStageLevels = require("../models/game-stage-levels");
const UserCompletedGameLevels = require("../models/user-completed-game-levels");
const User = require("../models/user-model");
const sequelize = require("../utils/database");
exports.getGameModules = async (req, res) => {
  try {
    const query = req.query;
    const order = [];
    const gameModules = await GameModules.findAll({
      where: { isActive: true },
      order: [["position", "desc"], ...order],
      include: [
        {
          model: GameModuleStages,
          include: {
            model: GameStageLevels,
          },
        },
      ],
    });
    res.send({
      status: 200,
      status: "Fetched Game Modules successfully",
      gameModules: gameModules,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).send({
      status: 400,
      message: "Failed to Game Modules.",
      devMessage: err.message,
    });
  }
};

exports.getModuleById = async (req, res) => {
  const moduleId = req.params.moduleId;
  const userProgress = req.query.userProgress;
  const gameModule = await GameModules.findByPk(moduleId, {
    order: [
      ["position", "desc"],
      [{ model: GameModuleStages }, "position", "desc"],
      [
        { model: GameModuleStages },
        { model: GameStageLevels },
        "position",
        "desc",
      ],
    ],
    include: {
      model: GameModuleStages,
      include: {
        model: GameStageLevels,
        include: {
          model: UserCompletedGameLevels,
          required: false,
          where: {
            userId: req.loggedInUser.userId,
          },
        },
        required: false,
      },
      required: false,
    },
    nest: true,
  });

  if (userProgress && gameModule) {
    if (gameModule.game_module_stages && gameModule.game_module_stages.length) {
      gameModule.game_module_stages.forEach((stage) => {
        if (stage.game_stage_levels && stage.game_stage_levels.length) {
          stage.game_stage_levels.forEach((level, index) => {
            level.setDataValue(
              "isCompleted",
              level.user_completed_game_levels &&
                level.user_completed_game_levels.length
                ? true
                : false
            );
            if (index > 0) {
              level.setDataValue(
                "isEnable",
                stage.game_stage_levels[index - 1]?.dataValues.isCompleted
                  ? true
                  : false
              );
            } else {
              level.setDataValue("isEnable", true);
            }
            level.setDataValue("user_completed_game_levels", undefined);
          });
        }
      });
    }
  }
  return res.send({
    status: 200,
    message: "Loaded game module loaded successfully",
    gameModule: gameModule,
  });
};

exports.updateUserGameLevelStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payload = req.body;
    let fetchedGameLevel = await GameStageLevels.findAll({
      where: { id: payload.levelId },
    });
    if (!fetchedGameLevel || !fetchedGameLevel.length) {
      return res
        .status(400)
        .send({ status: 400, message: "Game level not found" });
    }

    let user = await User.findOne({ employeeId: payload.employeeId });
    if (!user) {
      return res.status(400).send({ status: 400, message: "User not found" });
    }

    // if game level is common for both environments update the status for both levels
    if (fetchedGameLevel[0].dataValues.commonIdentifier) {
      fetchedGameLevel = await GameStageLevels.findAll({
        where: {
          commonIdentifier: fetchedGameLevel.dataValues.commonIdentifier,
        },
      });
    }
    // const commonGameLevels=
    fetchedGameLevel.forEach(async (gameLevel) => {
      try {
        let existingUserCompletedLevel = await UserCompletedGameLevels.findOne({
          where: { levelId: gameLevel.id, userId: user.userId },
        });
        existingUserCompletedLevel = UserCompletedGameLevels.build({
          isCompleted: true,
          userId: user.userId,
          levelId: gameLevel.id,
          spentTimeInSec: payload.spentTimeInSec,
        });
        await existingUserCompletedLevel.save({ transaction: t });
        await t.commit();
      } catch (e) {
        console.error(e);
        throw e;
      }
    });
    return res.send({
      status: 200,
      message: "User game level completed status update successfully.",
    });
  } catch (err) {
    t.rollback();
    return res.status(500).send({
      status: 400,
      message: "Updating user game level status failed",
      devMessage: err.message,
    });
  }
};

exports.getRecentlyCompletedLevels = async (req, res) => {
  const recentlyCompletedLevels = await UserCompletedGameLevels.findAll({
    order: [["updatedAt", "desc"]],
    where: { userId: req.loggedInUser.userId, isCompleted: true },
    limit: 3,
  });

  return res.send({
    status: 200,
    message: "Fetched successfully.",
    recentlyCompletedLevels: recentlyCompletedLevels,
  });
};

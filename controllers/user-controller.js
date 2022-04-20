const { isAdmin } = require("../utils/auth-validation");
const User = require("../models/user-model");
const fs = require("fs");
const html_to_pdf = require("html-pdf-node");
exports.getUserDetails = async (req, res) => {
  const userId = req.query.userId;
  let loggedInUser = req.loggedInUser;
  console.log(isAdmin(loggedInUser));
  if (userId && isAdmin(loggedInUser)) {
    const fetchedUser = await User.findByPk(userId);
    if (!fetchedUser) {
      return res.status(400).send({ status: 400, message: "User not found" });
    }
    loggedInUser = fetchedUser;
  }
  res.send({
    status: 200,
    message: "User details loaded successfully.",
    user: loggedInUser,
  });
};

exports.getUserGameLevels = async (req, res) => {
  console.log("loggedIn userId: " + req.loggedInUser.userId);
  const gameStageLevels = await GameStageLevels.findAll({
    include: [
      {
        model: UserCompletedGameLevels,
        where: { userId: req.loggedInUser.userId },
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
  }
  // console.log(gameStageLevels);
  return res.send({
    status: 200,
    message: "Fetched User Game levels successfully.",
    gameLevels: gameStageLevels,
  });
};

exports.getUserCompletionCertificate = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    const filePath =
      process.cwd() + "/training-certificates/" + user.userId + ".pdf";
    try {
      if (fs.existsSync(filePath)) {
        //file exists
        console.log("file exists");
        return res.download(filePath);
      }
    } catch (err) {
      console.error(err);
    }

    fs.readFile(
      process.cwd() + "/html/CERTIFICATE-FILE.html",
      "utf8",
      (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        let d = new Date();
        d.getMonth();
        data = data.replace("Name of the Trainee", user.name);
        data = data.replace(
          "Month",
          user.trainingCompletedOn
            ? (user.trainingCompletedOn.getMonth() + 1)
                .toString()
                .padStart(2, "0")
            : "-"
        );
        data = data.replace(
          "Year-",
          user.trainingCompletedOn
            ? user.trainingCompletedOn.getFullYear()
            : "-"
        );
        html_to_pdf
          .generatePdf({ content: data }, { format: "A4" })
          .then((pdfBuffer) => {
            fs.writeFile(filePath, pdfBuffer, (err) => {
              if (err) console.log(err);
              else {
                res.download(filePath);
                console.log("File written successfully\n");
                console.log("The written has the following contents:");
              }
            });
          });
      }
    );

    // res.send({
    //   status: 200,
    //   message: "Generated user training completion certificate.",
    // });
  } catch (err) {
    return res.status(400).send({
      status: 400,
      message: "Error while fetching the user training completion certificate.",
      devMessage: err.message,
    });
  }
};

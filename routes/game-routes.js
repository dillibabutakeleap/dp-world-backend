const express = require("express");
const gameController = require("../controllers/game-controller");
const { validateAuthorization } = require("../utils/auth-validation");
const router = express.Router();
const { body } = require("express-validator");
const { checkForErrors } = require("../utils/validation-errors-checker");

/**
 * @swagger
 * definitions:
 *   UpdateUserCompletedGameLevel:
 *     properties:
 *       employeeId:
 *          type: string
 *       levelId:
 *          type: string
 *       spentTimeInSec:
 *          type: integer 
 *   BaseResponse:
 *     properties:
 *       status:
 *          type: integer
 *       message:
 *          type: string
 *   GameStagesResponse:
 *     properties:
 *       status:
 *          type: integer
 *       message:
 *          type: string
 *       gameStages:
 *          type: array
 *          items: 
 *              properties:
 *                id:
 *                    type: integer
 *                name:
 *                    type: string
 *                position:
 *                    type: integer
 *                createdAt:
 *                    type: string
 *                updatedAt:
 *                    type: string
 *                game_stage_levels:
 *                    type: array
 *                    items:
 *                        properties: 
 *                           id:
 *                              type: integer
 *                           name:
 *                              type: string
 *                           position:
 *                              type: integer
 *                           createdAt:
 *                              type: string
 *                           updatedAt:
 *                              type: string
 *                           stageId:
 *                              type: integer
 *                            
 *
 */

/**
 * @swagger
 * /game/stages:
 *    get:
 *      tags:
 *        - Game Management
 *      summary: API to get all game stages
 *      produces:
 *          - application/json
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *            in: header
 *      responses:
 *          200:
 *              description: Successfully inserted a user
 *              content:
 *                  'application/json':
 *                      schema:
 *                            $ref: '#/definitions/GameStagesResponse'
 *
 */

router.get("/stages", gameController.getGameStages);

// router.get(
//   "/modules",

//   gameController.getGameModules
// );

// router.get("/modules/:moduleId", gameController.getModuleById);

/**
 * @swagger
 * /game/update-user-game-level-status:
 *    post:
 *      tags:
 *        - Game Management
 *      summary: API to update user game completion status
 *      produces:
 *          - application/json
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/definitions/UpdateUserCompletedGameLevel'
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *            in: header
 *      responses:
 *          200:
 *              description: returns Base response
  *              content:
 *                  'application/json':
 *                     schema:
 *                        $ref: '#/definitions/BaseResponse'
 *
 */
router.post(
  "/update-user-game-level-status",
  [
    body("employeeId").not().isEmpty(),
    body("levelId").not().isEmpty(),
    checkForErrors,
  ],
  gameController.updateUserGameLevelStatus
);

router.get(
  "/user-recently-completed-levels",
  gameController.getRecentlyCompletedLevels
);

module.exports = router;

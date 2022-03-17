const express = require("express");
const router = express.Router();
const trainerController = require("../controllers/trainer-controller");

const { body } = require("express-validator");
const { checkForErrors } = require("../utils/validation-errors-checker");
/**
 * @swagger
 * definitions:
 *   traineeAdd:
 *     properties:
 *       name:
 *          type: string
 *       email:
 *          type: string
 *       employeeId:
 *          type: string
 *       phoneNumber:
 *          type: string
 *   UserExistsResponse:
 *     properties:
 *       status:
 *          type: integer
 *       message:
 *          type: string
 *       isRegistered:
 *          type: boolean
 *       progressData:
 *          type: array
 *          items: 
 *              properties:
 *                id:
 *                    type: integer
 *                name:
 *                    type: string
 *                position:
 *                    type: integer
 *                commonIdentifier:
 *                    type: string
 *                createdAt:
 *                    type: string
 *                stageId:
 *                    type: integer
 *                isCompleted:
 *                    type: boolean
 *                isEnable:
 *                    type: boolean
 *
 */

/**
 * @swagger
 * definitions:
 *   traineeExistsCheck:
 *     properties:
 *       employeeId:
 *          type: string
 */

/**
 * @swagger
 * /trainer/add-trainee:
 *    post:
 *      tags:
 *        - Trainer Management
 *      summary: API To add Trainee to the database.
 *      produces:
 *          - application/json
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/definitions/RegisterRequest'
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *            in: header
 *      responses:
 *          200:
 *              description: returns base response 
 *              content:
 *                  'application/json':
 *                      schema:
 *                          $ref: '#/definitions/BaseResponse'
 *
 */
router.post(
  "/add-trainee",
  [
    body("employeeId").not().isEmpty(),
    body("name").trim().escape(),
    checkForErrors,
  ],
  trainerController.addTrainee
);

/**
 * @swagger
 * /trainer/user-exists:
 *    post:
 *      tags:
 *        - Trainer Management
 *      summary: API to check if any users exists with the the employeeId.
 *      produces:
 *          - application/json
*      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/definitions/traineeExistsCheck'
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *            in: header
 *      responses:
 *          200:
 *              description: returns base response with progressData if user is exists
 *              content:
 *                  'application/json':
 *                      schema:
 *                          $ref: '#/definitions/UserExistsResponse'
 *
 */
router.post(
  "/user-exists",
  [
    body("employeeId").not().isEmpty(),
    checkForErrors,
  ],
  trainerController.checkIfUserExists
);

router.get(
  "/:trainerId/trainees",
  trainerController.getTrainees
);

module.exports = router;

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
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *          - name: Model
 *            description: Request Body
 *            in: body
 *            required: true
 *            schema:
 *                 $ref: '#/definitions/traineeAdd'

 *      responses:
 *          200:
 *              description: returns user object
 *              schema:
 *                 $ref: '#/definitions/LoginResponse'
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
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *          - name: Model
 *            description: Request Body
 *            in: body
 *            required: true
 *            schema:
 *                 $ref: '#/definitions/traineeExistsCheck'

 *      responses:
 *          200:
 *              description: returns user object
 *              schema:
 *                 $ref: '#/definitions/LoginResponse'
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

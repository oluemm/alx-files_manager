const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static getStatus(request, response) {
    const data = { redis: redisClient.isAlive(), db: dbClient.isAlive() };
    response.status(200).send(data);
  }

  static async getStats(request, response) {
    const data = { users: await dbClient.nbUsers(), files: await dbClient.nbFiles() };
    response.status(200).send(data);
  }
}
module.exports = AppController;

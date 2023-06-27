const sha1 = require('sha1');
const uuid4 = require('uuid').v4;
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AuthController {
  static async getConnect(request, response) {
    let credential = '';
    let statusCode = 400;
    let message = { error: 'Unauthorized' };
    // const auth = request.get('Authorization'); // works too
    const auth = (request.headers.authorization || '');
    // Authorization header validation
    if ((!auth) || (typeof (auth) !== 'string') || (auth.slice(0, 6) !== 'Basic ')) {
      statusCode = 401;
      message = { error: 'Unauthorized' };
    } else {
      credential = auth.split(' ')[1] || '';
      // console.log(credential);
    }
    // eslint hates atob(auth)
    const credentials = Buffer.from(credential, 'base64').toString('utf8');
    // console.log(credentials);
    const [email, password] = credentials.split(':');
    if (!email || !password) {
      statusCode = 401;
      message = { error: 'Unauthorized' };
    } else {
    // access users collection in mongo
      const users = dbClient.db.collection('users');
      // console.log(email, password);
      const hashedPassword = sha1(password);
      // retrieve user whose password and email matches the given
      const user = await users.findOne({ email, password: hashedPassword });
      // console.log(user);
      if (!user) { // if no user is found
        statusCode = 401;
        message = { error: 'Unauthorized' };
      } else {
        const token = uuid4();
        // console.log(token);
        const key = `auth_${token}`;
        // console.log(user);
        await redisClient.set(key, user._id.toString(), 24 * 60 * 60);
        statusCode = 200;
        message = { token };
      }
    }
    response.status(statusCode).send(message);
  }

  static async getDisconnect(request, response) {
    const token = request.get('X-Token');
    // console.log(token);
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    // console.log(userId);
    if (!userId) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      await redisClient.del(key);
      response.status(204).send({});
    }
  }
}

module.exports = AuthController;

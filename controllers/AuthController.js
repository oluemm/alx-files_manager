import sha1 from 'sha1';
import { v4 as uuid4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(request, response) {
    // const auth = request.get('Authorization'); // works too
    const auth = (request.headers.authorization || '').split(' ')[1] || '';
    // console.log(atob(auth));
    // Authorization header validation
    if ((!auth) || (typeof (auth) !== 'string') || (auth.slice(0, 6) !== 'Basic ')) {
      response.status(401).send({ error: 'Unauthorized' });
    }
    // eslint hates atob(auth)
    const credentials = Buffer.from(auth, 'base64').toString('utf8');
    const [email, password] = credentials.split(':');
    if (!email || !password) {
      response.status(401).send({ error: 'Unauthorized' });
    }
    // access users collection in mongo
    const users = dbClient.db.collection('users');
    // console.log(email, password);
    const hashedPassword = sha1(password);
    // retrieve user whose password and email matches the given
    const user = await users.findOne({ email, password: hashedPassword });
    // console.log(user);
    if (!user) { // if no user is found
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const token = uuid4();
      // console.log(token);
      const key = `auth_${token}`;
      // console.log(user);
      await redisClient.set(key, user._id.toString(), 24 * 60 * 60);
      response.status(200).send({ token });
    }
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

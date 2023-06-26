import crypto from 'crypto';
import { v4 as uuid4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(request, response) {
    // const auth = request.get('Authorization'); // works too
    const auth = (request.headers.authorization || '').split(' ')[1] || '';
    // console.log(atob(auth));
    const [email, password] = atob(auth).split(':');
    const users = dbClient.db.collection('users');
    // console.log(email, password);
    const hashedPassword = crypto.createHash('sha1')
      .update(password)
      .digest('hex');
    const user = await users.findOne({ email, password: hashedPassword });
    // console.log(user);
    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const uuid = uuid4();
      // console.log(uuid);
      const key = `auth_${uuid}`;
      // console.log(key);
      await redisClient.set(key, auth, 24 * 60 * 60);
      response.status(200).send({ token: uuid });
    }
  }

  static async getDisconnect(request, response) {
    const xToken = request.get('X-Token');
    // console.log(xToken);
    // console.log(`auth_${xToken}`);
    const authToken = await redisClient.get(`auth_${xToken}`);
    // console.log(authToken);
    if (!authToken) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      await redisClient.del(`auth_${xToken}`);
      response.status(204).send();
    }
  }
}

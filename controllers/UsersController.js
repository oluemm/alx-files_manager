import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class UsersController {
  static async postNew(request, response) {
    // extract data ffrom request body
    const { email, password } = request.body;
    // validate datasets
    if (!email) {
      response.status(400).send({ error: 'Missing email' });
    } else if (!password) {
      response.status(400).send({ error: 'Missing password' });
    } else {
    // establish conn to users collection
      const users = dbClient.db.collection('users');
      // check if email exists in database
      const validEmail = await users.findOne({ email });
      // console.log(validEmail);
      // since .find() returns a list, any len grt than 0 means email FOUND
      if (validEmail) {
      // console.log(validEmail);
      // return error response wit status 400
        response.status(400).send({ error: 'Already exist' });
      } else {
      // hash the user's password
        const hashedPassword = crypto.createHash('sha1')
          .update(password)
          .digest('hex');
        // create new user in db
        const userList = await users.insertOne({ email, password: hashedPassword });
        const newUser = userList.ops[0];
        // console.log(newUser);
        response.status(201).send({ id: newUser.id, email: newUser.email });
      }
    }
  }

  static async getMe(request, response) {
    const xToken = request.get('X-Token');
    // console.log(xToken);
    // console.log(`auth_${xToken}`);
    const authToken = await redisClient.get(`auth_${xToken}`);
    // console.log(authToken);
    if (!authToken) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const [email, password] = atob(authToken).split(':');
      const users = dbClient.db.collection('users');
      // console.log(email, password);
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
      const user = await users.findOne({ email, password: hashedPassword });
      response.status(200).send({ id: user._id, email: user.email });
    }
  }
}

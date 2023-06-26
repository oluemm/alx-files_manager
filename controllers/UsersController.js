import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { ObjectID } from 'mongodb';

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
        const hashedPassword = sha1(password);
        // create new user in db
        const userList = await users.insertOne({ email, password: hashedPassword });
        // console.log(userList);
        const newUser = userList.ops[0];
        // console.log(newUser);
        response.status(201).send({ id: newUser._id, email });
      }
    }
  }

  static async getMe(request, response) {
    const xToken = request.get('X-Token');
    // console.log(xToken);
    // console.log(`auth_${xToken}`);
    const userId = await redisClient.get(`auth_${xToken}`);
    if (!userId) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      // console.log(userId); 
      const id = new ObjectID(userId);
      const users = dbClient.db.collection('users');
      const user = await users.findOne({ _id: id });
      if (user) {
        response.send({ id: user._id, email: user.email });
      } else {
        response.status(401).send({ error: 'Unauthorized' });
      }
    }
  }
}

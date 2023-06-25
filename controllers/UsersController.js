import crypto from 'crypto';
import dbClient from '../utils/db';

export default class UsersController {
  static async postNew(request, response) {
    // extract data ffrom request body
    const { email, password } = request.body;
    // validate datasets
    if (!email) {
      response.status(400).send({ error: 'Missing email' });
    } else if (!password) {
      response.status(400).send({ error: 'Missing password' });
    }
    // establish conn to users collection
    const users = dbClient.db.collection('users');
    // check if email exists in database
    const validEmail = await users.find({ email }).toArray();
    // since .find() returns a list, any len grt than 0 means email FOUND
    if (validEmail.length > 0) {
      // console.log(validEmail);
      // return error response wit status 400
      response.status(400).send({ error: 'Already exist' });
    } else {
      // hash the user's password
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
      // create new user in db
      const userList = await users.insertOne({ email, password: hashedPassword });
      const newUser = userList.ops[0];
      // console.log(newUser);
      response.status(201).send({ _id: newUser.id, email: newUser.email });
    }
  }
}

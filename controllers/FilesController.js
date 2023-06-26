import multer from 'multer';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import crypto from 'crypto';
import { ObjectID } from 'mongodb';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileStorage = multer.diskStorage({
  destination: (req, res, next) => {
    next(null, FOLDER_PATH);
  },
  filename: (req, res, next) => {
    next(null, file.originalname);
  }
});
const upload = multer({ storage: fileStorage }).single('file_handler');

export default class FilesController {
  static async postUpload(request, response) {
    const acceptedTypes = ['folder', 'file', 'image'];
    const xToken = request.get('X-Token');
    // console.log(xToken);
    // console.log(`auth_${xToken}`);
    const authToken = await redisClient.get(`auth_${xToken}`);
    const userObjId = new ObjectID(authToken);
    const users = dbClient.db.collection('users');
    const existingUser = await users.findOne({ _id: userObjId });

    console.log(existingUser);
    // const userLogin = atob(authToken);
    // const [email, password] = userLogin.split(":");
    // const hashedPassword = crypto.createHash("sha1")
    //   .update(password).digest("hex");
    // const users = dbClient.db.collection('users')
    // const validUser = users.findOne({email, password: hashedPassword});
    let statusCode = 400;
    let returnData = '';
    if (!authToken) {
      statusCode = 401;
      returnData = { error: 'Unauthorized' };
    } else {
      // await redisClient.del(`auth_${xToken}`);
      const {
        name, type, data,
      } = request.body;
      let { parentId, isPublic } = request.body;

      if (!name) {
        statusCode = 400;
        returnData = { error: 'Missing name' };
        // response.status(400).send({ error: 'Missing name' });
      } else if (!type || !acceptedTypes.includes(type)) {
        statusCode = 400;
        returnData = { error: 'Missing type' };
      } else if (!data && type !== 'folder') {
        statusCode = 400;
        returnData = { error: 'Missing data' };
      } else if (parentId) {
        const files = dbClient.db.collection('files');
        const currentFile = await files.findOne({ id: parentId });
        if (!currentFile) {
          statusCode = 400;
          returnData = { error: 'Parent not found' };
        } else if (currentFile.type !== 'folder') {
          statusCode = 400;
          returnData = { error: 'Parent is not a folder' };
        }
      } else {
        if (!parentId) { parentId = 0; }
        if (!isPublic) { isPublic = false; }
        statusCode = 200;
        returnData = {
          name, type, parentId, isPublic, data, success: 'All is well',
        };
      }
    }
    response.status(statusCode).send(returnData);
  }
}

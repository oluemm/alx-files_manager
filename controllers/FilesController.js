const uuidv4 = require('uuid').v4;
const Queue = require('bull/lib/queue');
const fs = require('fs').promises;
const { ObjectID } = require('mongodb');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

const fileQueue = new Queue('thumbnail generation');

class FilesController {
  static async postUpload(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    // Retrieve the user id from redis based on the token
    const userId = await redisClient.get(key);
    // convert id from string to the ObjectID format it usually is in mongodb
    const userObjId = new ObjectID(userId);
    if (userId) { // if token is valid
      // Retrieve the user
      const users = dbClient.db.collection('users');
      const existingUser = await users.findOne({ _id: userObjId });
      // if user with given id doesnt exist
      if (!existingUser) {
        response.status(401).json({ error: 'Unauthorized' });
        return;
      }
      // xtract details from request body
      const { name, type, data } = request.body;
      const parentId = request.body.parentId || 0; // defaults to 0
      const isPublic = request.body.isPublic || false; // defaults to false
      const allowedTypes = ['file', 'folder', 'image'];
      // error response for missing file/folder names
      if (!name) {
        response.status(400).json({ error: 'Missing name' });
        return;
      }
      // If the type is missing or not part of the list of accepted type
      if (!type || !allowedTypes.includes(type)) {
        response.status(400).json({ error: 'Missing type' });
        return;
      }
      // error response if data is empty when not a folder
      if (!data && type !== 'folder') {
        response.status(400).json({ error: 'Missing data' });
        return;
      }
      // console.log(parentId);
      if (parentId) { // if parentId is given
        // in files collection
        const filesCollection = dbClient.db.collection('files');
        const parentidObject = new ObjectID(parentId);
        const existingFileWithParentId = await filesCollection.findOne(
          { _id: parentidObject, userId: existingUser._id },
        );
        // if no file in dB
        if (!existingFileWithParentId) {
          response.status(400).json({ error: 'Parent not found' });
          return;
        }
        // if the file type isnt a folder
        if (existingFileWithParentId.type !== 'folder') {
          response.status(400).json({ error: 'Parent is not a folder' });
          return;
        }
      }
      // FOLDERS Handler
      if (type === 'folder') {
        const filesCollection = dbClient.db.collection('files');
        const inserted = await filesCollection.insertOne(
          {
            userId: existingUser._id,
            name,
            type,
            isPublic,
            parentId,
          },
        );
        const id = inserted.insertedId;
        response.status(201).json({
          id, userId, name, type, isPublic, parentId,
        });
      } else {
        const filesCollection = dbClient.db.collection('files');
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        const uuidstr = uuidv4();
        // folder + file name
        const filePath = `${folderPath}/${uuidstr}`;
        // decode data from base64
        const buff = Buffer.from(data, 'base64');
        // console.log(buff.toString());
        try { // try creating the folder path
          await fs.mkdir(folderPath);
        } catch (error) {
          // do nothing if folder already exists
        }
        // check if the user already created file to avoid multiple creations
        const fileExists = await filesCollection.findOne({
          userId: existingUser._id,
          name,
          type,
        });
        // console.log(fileExists);
        if (fileExists) {
          response.status(201).json({
            id: fileExists._id, userId, name, type, isPublic, parentId,
          });
        } else {
          try { // create the file in the folder and write contents to it
            await fs.writeFile(filePath, buff, 'utf-8');
          } catch (error) {
            console.log(error);
          }
          const inserted = await filesCollection.insertOne(
            {
              userId: existingUser._id,
              name,
              type,
              isPublic,
              parentId,
              localPath: filePath,
            },
          );
          const fileId = inserted.insertedId;
          // console.log(fileId);
          // start thumbnail generation worker
          if (type === 'image') {
            const jobName = `Image thumbnail [${userId}-${fileId}]`;
            fileQueue.add({ userId, fileId, name: jobName });
          }
          response.status(201).json({
            id: fileId, userId, name, type, isPublic, parentId,
          });
        }
      }
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = FilesController;

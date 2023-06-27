import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull/lib/queue';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const fileQueue = new Queue('thumbnail generation');

class FilesController {
  static async postUpload(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    // convert id from string to the ObjectID format it usually is in mongodb
    const userObjId = new ObjectID(userId);
    if (userId) {
      const users = dbClient.db.collection('users');
      const existingUser = await users.findOne({ _id: userObjId });
      if (!existingUser) {
        response.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { name, type, data } = request.body;
      const parentId = request.body.parentId || 0;
      const isPublic = request.body.isPublic || false;
      const allowedTypes = ['file', 'folder', 'image'];
      if (!name) {
        response.status(400).json({ error: 'Missing name' });
        return;
      }
      // If the type is missing or not part of the list of accepted type
      if (!type || !allowedTypes.includes(type)) {
        response.status(400).json({ error: 'Missing type' });
        return;
      }
      if (!data && type !== 'folder') {
        response.status(400).json({ error: 'Missing data' });
        return;
      }
      if (parentId) {
        const filesCollection = dbClient.db.collection('files');
        const parentidObject = new ObjectID(parentId);
        const existingFileWithParentId = await filesCollection.findOne(
          { _id: parentidObject, userId: existingUser._id },
        );
        if (!existingFileWithParentId) {
          response.status(400).json({ error: 'Parent not found' });
          return;
        }
        if (existingFileWithParentId.type !== 'folder') {
          response.status(400).json({ error: 'Parent is not a folder' });
          return;
        }
      }
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
        const parentidObject = new ObjectID(parentId);
        // file name
        const filePath = `${folderPath}/${uuidstr}`;
        const buff = Buffer.from(data, 'base64');
        try {
          await fs.mkdir(folderPath);
        } catch (error) {
          // do nothing if folder already exists
        }
        try {
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
            parentId: parentidObject,
            localPath: filePath,
          },
        );
        const fileId = inserted.insertedId;
        // start thumbnail generation worker
        if (type === 'image') {
          const id = inserted.insertedId;
          const jobName = `Image thumbnail [${userId}-${id}]`;
          fileQueue.add({ userId, fileId, name: jobName });
        }
        response.status(201).json({
          id: fileId, userId, name, type, isPublic, parentId,
        });
      }
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = FilesController;

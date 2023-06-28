const { contentType } = require('mime-types');

const uuidv4 = require('uuid').v4;
const Queue = require('bull/lib/queue'); // direct path
// const Queue = require('bull'); // indirect
const fs = require('fs').promises;
const { stat, existsSync, realpath } = require('fs');
const { promisify } = require('util');
const { ObjectID } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const {
  getUserFromToken, unauthorizedLogin, notFound,
} = require('../utils/helpers');

// create a thumbnail generation queue in redis
const fileQueue = new Queue('thumbnail generation');

class FilesController {
  static async postUpload(request, response) {
    const token = request.header('X-Token');
    const { userObjId, userId } = await getUserFromToken(token);
    // console.log(userObjId, userId);

    if (userId) { // if token is valid
      // Retrieve the user
      const users = dbClient.db.collection('users');
      const existingUser = await users.findOne({ _id: userObjId });
      // if user with given id doesnt exist
      if (!existingUser) {
        unauthorizedLogin(response);
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
      unauthorizedLogin(response);
    }
  }

  static async getShow(request, response) {
    const token = request.header('X-Token');
    const { userId } = await getUserFromToken(token);
    if (!userId) { // valid user
      return unauthorizedLogin();
    }
    // const file = await
    const fileId = request.params.id;
    // connect to files collection
    const filesCollection = dbClient.db.collection('files');
    // convert id from string to the ObjectID format it usually is in mongodb
    const userObjId = new ObjectID(userId);
    const fileObjId = new ObjectID(fileId);
    const requiredFile = await filesCollection.findOne({ userId: userObjId, _id: fileObjId });
    if (!requiredFile) {
      return notFound(response);
    }
    // console.log(requiredFile);
    const {
      name, type, isPublic, parentId,
    } = requiredFile;
    return response.send({
      id: requiredFile._id, userId, name, type, isPublic, parentId,
    });
  }

  static async getIndex(request, response) {
    // convert id from string to the ObjectID format it usually is in mongodb
    const { parentId } = request.query;
    const page = parseInt(request.query.page, 10) || 0;
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    // convert id from string to the ObjectID format it usually is in mongodb
    const userObjId = new ObjectID(userId);
    if (userId) {
      const users = dbClient.db.collection('users');
      const filesCollection = dbClient.db.collection('files');
      const existingUser = await users.findOne({ _id: userObjId });
      if (existingUser) {
        if (parentId) {
          const parentObjId = new ObjectID(parentId);
          // if parentId is set and does not exist, return empty list.
          const existingParentFolder = await filesCollection.findOne(
            {
              _id: parentObjId,
              userId: existingUser._id,
            },
          );
          if (!existingParentFolder) {
            response.status(201).send([]);
            return;
          }
          // get all files in parent directory
          // pagination syntax is from mongodb documentation.
          const requestedFiles = await filesCollection.find(
            {
              userId: userObjId,
              parentId: parentObjId,
            },
          ).sort(
            { _id: 1 },
          ).skip(page * 20).limit(20)
            .toArray();
          // to remove the local path and change id representation
          // from _id to id
          const finalFilesArray = [];

          for (const file of requestedFiles) {
            const fileobj = {
              id: file._id,
              userId: file.userId,
              name: file.name,
              type: file.type,
              isPublic: file.isPublic,
              parentId: file.parentId,
            };
            finalFilesArray.push(fileobj);
          }
          response.status(201).send(finalFilesArray);
        } else {
          const requestedFiles = await filesCollection.find(
            {
              userId: userObjId,
            },
          ).sort(
            { _id: 1 },
          ).skip(page * 20).limit(20)
            .toArray();
          // to remove the local path and change id representation
          // from _id to id
          const finalFilesArray = [];

          for (const file of requestedFiles) {
            const fileobj = {
              id: file._id,
              userId: file.userId,
              name: file.name,
              type: file.type,
              isPublic: file.isPublic,
              parentId: file.parentId,
            };
            finalFilesArray.push(fileobj);
          }
          response.status(201).send(finalFilesArray);
        }
      } else {
        response.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }

  static async putPublish(req, res) {
    const { id } = req.params;
    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    // convert id from string to the ObjectID format it usually is in mongodb
    const userObjId = new ObjectID(userId);
    const fileId = new ObjectID(id);
    if (userId) {
      const fileFilter = {
        _id: fileId,
        userId: userObjId,
      };
      const filesCollection = dbClient.db.collection('files');
      const file = await filesCollection.findOne(fileFilter);
      if (!file) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      await filesCollection.updateOne(fileFilter, { $set: { isPublic: true } });
      res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: true,
        parentId: file.parentId,
      });
    }
  }

  static async putUnPublish(req, res) {
    const { id } = req.params;
    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    // convert id from string to the ObjectID format it usually is in mongodb
    const userObjId = new ObjectID(userId);
    const fileId = new ObjectID(id);
    if (userId) {
      const fileFilter = {
        _id: fileId,
        userId: userObjId,
      };
      const filesCollection = dbClient.db.collection('files');
      const file = await filesCollection.findOne(fileFilter);
      if (!file) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      await filesCollection.updateOne(fileFilter, { $set: { isPublic: false } });
      res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: false,
        parentId: file.parentId,
      });
    }
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const size = req.query.size || null;
    console.log(req);
    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    // convert id from string to the ObjectID format it usually is in mongodb
    const fileId = new ObjectID(id);
    if (userId) {
      const fileFilter = {
        _id: fileId,
      };
      const filesCollection = dbClient.db.collection('files');
      const file = await filesCollection.findOne(fileFilter);
      if (!file) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (file.type === 'folder') {
        res.status(400).json({ error: 'A folder doesnt\'t have content' });
        return;
      }
      let filePath = file.localPath;
      if (size) {
        filePath = `${file.localPath}_${size}`;
      }
      const statAsync = promisify(stat);
      const realpathAsync = promisify(realpath);
      if (existsSync(filePath)) {
        const fileInfo = await statAsync(filePath);
        if (!fileInfo.isFile()) {
          res.status(404).json({ error: 'Not found' });
          return;
        }
      } else {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const absoluteFilePath = await realpathAsync(filePath);
      res.setHeader('Content-Type', contentType(file.name) || 'text/plain; charset=utf-8');
      res.status(200).sendFile(absoluteFilePath);
    }
  }
}

module.exports = FilesController;

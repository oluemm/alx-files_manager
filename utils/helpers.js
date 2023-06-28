const { Response } = require('express');
const { ObjectID } = require('mongodb');
const dbClient = require('./db');
const redisClient = require('./redis');

/**
 * 401 error handler
 * @param {Response} response
 */
function unauthorizedLogin(response) {
  response.status(401).json({ error: 'Unauthorized' });
}

/**
 * 404 error handler
 * @param {Response} response
 */
function notFound(response) {
  response.status(404).json({ error: 'Not found' });
}

/**
 * Helper func to avoid repitition
 * @param {string} token the user's login token
 * @returns list containing the user's id as Object and string
 */
async function getUserFromToken(token) {
  const key = `auth_${token}`;
  // Retrieve the user id from redis based on the token
  const userId = await redisClient.get(key);
  return { userId };
}

async function userExists(userId) {
  const users = dbClient.db.collection('users');
  const userObjId = new ObjectID(userId);
  const existingUser = await users.findOne({ _id: userObjId });
  return existingUser;
}
module.exports = {
  unauthorizedLogin, getUserFromToken, notFound, userExists,
};

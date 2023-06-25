#!/usr/bin/node
import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    // any error of the redis client must be displayed in the console
    this.client = createClient();

    this.client.on('error', (error) => {
      console.log(error);
    });
  }

  // check connection status and report
  /**
   * Check connection status
   * @returns `true` when the connection to Redis is a success
  */
  isAlive() {
    return this.client.connected;
  }

  /**
   * Async function that takes a `key` as argument and returns it's value.
   * @param {String} key
   * @returns null or value of the given key
   */
  async get(key) {
    const getter = promisify(this.client.get).bind(this.client);
    const value = await getter(key);
    return value;
  }

  /**
   * Stores a given `key` and `value` pair and expires at given `duration`
   * @param {String} key name of the key to be stored
   * @param {String} value corresponding value
   * @param {Number} duration expiration time in seconnds
   */
  async set(key, value, duration) {
    const setter = promisify(this.client.set).bind(this.client);
    await setter(key, value);
    if (duration) { this.client.expire(key, duration); }
  }

  /**
   * Deletes a key and it's value from storage
   * @param {String} key key to be deleted
   */
  async del(key) {
    const delet = promisify(this.client.del).bind(this.client);
    await delet(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;

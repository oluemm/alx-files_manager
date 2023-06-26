import redisClient from './utils/redis';

(async () => {
  console.log(redisClient.isAlive());
  // console.log(await redisClient.get('myKey'));
  await redisClient.set('myKey', 12, 5);
  console.log(await redisClient.get('myKey'));

  // setTimeout(async () => {
  //   console.log(await redisClient.get('myKey'));
  // }, 1000 * 10);
  // testing delete
  // await redisClient.set('year', 2023);
  // console.log(`Value of year is: ${await redisClient.get('year')}`);
  // console.log('Deleting key: year');
  // await redisClient.del('year');
  // console.log(`Value of year is: ${await redisClient.get('year')}`);
})();

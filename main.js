import redisClient from './utils/redis';


(async () => {
  console.log(redisClient.isAlive());
  console.log(await redisClient.get('myKey'));
  await redisClient.set('myKey', 12, 5);
  console.log(await redisClient.get('myKey'));
  
  setTimeout(async () => {
    console.log(await redisClient.get('myKey'));
  }, 1000 * 10);
  console.log('Deleting key: ping');
  await redisClient.del('ping')
  console.log(`Value of ping is: ${await redisClient.get('ping')}`);
})();

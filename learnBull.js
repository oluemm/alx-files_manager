const Bull = require('bull');

const redisUrl = 'redis://127.0.0.1:6379';
const emailQueue = new Bull('email_queue', { redis: redisUrl }); // {redis: redis}

// creating a producer function
const emailSender = (data) => {
  // a producer is simply used to add a new job to the queue
  emailQueue.add(data, {
    attempts: 3, // instruct bull to retry failed jobs thrice
  });
};
emailQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} has been completed`);
});
emailSender({ text: 'I love you', phoneNum: '09031380883' });
console.log('Now listening');

// consumers or workers checks a job and carries out a func based on it
emailQueue.process(async (job) => {
  console.log(`Message "${job.data.text}" has been sent to ${job.data.phoneNum}`);
});


  static async getIndex(request, response) {
    const token = request.header('X-Token');
    // console.log(request.query);
    const { parentId } = request.query || 0;
    const page = parseInt(request.query.page, 10) || 0;

    const { userId } = await getUserFromToken(token);
    const existingUser = await userExists(userId);
    if (!userId || !existingUser) {
      return unauthorizedLogin();
    }
    // connect to files collection
    const filesCollection = dbClient.db.collection('files');
    // convert id from string to the ObjectID format it usually is in mongodb
    const userObjId = new ObjectID(userId);
    const parentObjId = new ObjectID(parentId);
    // if parentId is set but doesn't exist, return empty list.
    const existingParentFolder = await filesCollection.findOne(
      {
        _id: parentObjId,
        userId: userObjId,
      },
    );
    if (!existingParentFolder) {
      return response.status(201).send([]);
    }
    // otherwise return all files having such parent
    const requiredFiles = await filesCollection.find({
      userId: userObjId, parentId: parentObjId,
    }).sort({ _id: 1 }).skip(page * 20).limit(20)
      .toArray();

    if (requiredFiles.length === 0) { //
      return notFound(response);
    }
    console.log(requiredFiles);
    const respData = [];
    // const file = await
    // return response.send({
    //   id: requiredFile._id, userId, name, type, isPublic, parentId,
    // });
    return response.send();
  }
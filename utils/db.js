const { MongoClient } = require('mongodb');

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const connUrl = `mongodb://${host}:${port}`;

class DBClient {
  constructor() {
    // console.log(connUrl);
    this.client = new MongoClient(connUrl, { useUnifiedTopology: true });
    // { useUnifiedTopology: true } new server discover & monitoring engine
    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
      }).catch((err) => {
        console.log(err);
      });
    /* UNCOMMENT TOT SHOW client object, methods and properties */
    // console.log(this.client);
  }

  isAlive() {
    // switches from connecting to connected once a connection
    // has been established
    const status = this.client.topology.s.state;
    if (status === 'connected') { return true; } return false;
  }

  async nbUsers() {
    const users = this.db.collection('users');
    const num = await users.countDocuments();
    return num;
  }

  async nbFiles() {
    const files = this.db.collection('files');
    const num = await files.countDocuments();
    return num;
  }
}
const dbClient = new DBClient();
module.exports = dbClient;

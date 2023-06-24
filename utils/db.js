import { MongoClient } from 'mongodb';

class DBClient{
  constructor () {
    this.client = new MongoClient();
    this.host = process.env.DB_HOST || "localhost";
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
  }
}
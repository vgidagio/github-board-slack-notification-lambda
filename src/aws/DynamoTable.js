const AWS = require('aws-sdk');
const dynamoTable = new AWS.DynamoDB.DocumentClient();

class DynamoTable {
  tableName;

  constructor(tableName) {
    this.tableName = tableName;
  }

  async put(data) {
    return this.query('put', { Item: data });
  }

  async get(id) {
    const d = await this.query('get', { Key: { id: id } })
    return d.Item;
  }

  async list(params = {}) {
    const data = await this.query('scan', params);
    return data.Items;
  }

  async delete(id) {
    return await this.query('delete', { Key: { id: id } })
  }

  query(method, params) {
    params.TableName = this.tableName;
    return dynamoTable[method](params).promise();
  }
}

module.exports = DynamoTable;


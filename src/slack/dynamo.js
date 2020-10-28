const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

class DynoTable {
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

  /**
   * Dynamo Query
   *
   * @param {String} method - The query action to run
   * @param {Object} params - The query parameters
   * @return {Promise} A Promise with the get result
   */
  query(method, params) {
    params.TableName = this.tableName;

    return new Promise((resolve, reject) => {
      dynamo[method](params, (err, data) => {
        err ? reject(err) : resolve(data);
      });
    });
  }
}

module.exports = DynoTable;







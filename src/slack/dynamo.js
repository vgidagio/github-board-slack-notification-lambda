const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();

class Store {
  tableName;

  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Dynamo Save
   *
   * @param {Object} data - The data to save
   * @return {Promise} A Promise with the save results
   */
  save(data) {
    data.id = data.team_id;
    return this.query('put', { Item: data });
  }

  /**
   * Dynamo Get
   *
   * @param {String} id - The record's key
   * @return {Promise} A Promise with the get result
   */
  get(id) {
    return this.query('get', { Key: { id: id } }).then(d => {
      return Promise.resolve(d.Item);
    });
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

module.exports = Store;







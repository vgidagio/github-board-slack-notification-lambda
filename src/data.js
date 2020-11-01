const DynamoTable = require('./aws/DynamoTable');
const store = new DynamoTable(process.env.ASSOC_TABLE_NAME);

const getId = (channel_id, project_url) =>
  channel_id + '--' + project_url

module.exports.addSubscription = async ({channel_id, project_url, project}) => {
  const id = getId(channel_id, project_url)
  return await store.put({ id, channel_id, project_url, project });
}

module.exports.removeSubscription = async ({channel_id, project_url }) => {
  const id = getId(channel_id, project_url)
  return await store.delete(id)
}

module.exports.getSubscriptions = async () => {
  return await store.list();
}

module.exports.getSubscriptionsForChannelId = async (channel_id) => {
  return await store.list({
    ProjectionExpression: '#channel_id, project_url, #project',
    FilterExpression: "#channel_id = :channel_id",
    ExpressionAttributeNames:{
      "#channel_id": "channel_id",
      "#project": "project"
    },
    ExpressionAttributeValues: {
      ":channel_id": channel_id,
    }
  });
}

module.exports.getSubscriptionsForProjectUrl = async (project_url) => {
  return await store.list({
    ProjectionExpression: '#channel_id, #project_url, #project',
    FilterExpression: "#project_url = :project_url",
    ExpressionAttributeNames:{
      "#channel_id": "channel_id",
      "#project_url": "project_url",
      "#project": "project"
    },
    ExpressionAttributeValues: {
      ":project_url": project_url,
    }
  });
}

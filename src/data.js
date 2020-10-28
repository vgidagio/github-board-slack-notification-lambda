const DynamoTable = require('./aws/DynamoTable');
const store = new DynamoTable(process.env.ASSOC_TABLE_NAME);


module.exports.addAssoc = async (channel, project_url) => {
  const id = channel + '--' + project_url;
  return await store.put({ id, channel, project_url });
}

module.exports.getAllProjectContentUrls = async () => {
  return await store.list();
}

module.exports.getSlackWebhooksForProjectContentUrl = async (project_content_url) => {
  const list = await store.list();
  return list.reduce((accumulator, item) => {
    if (item.project_url === project_content_url) {
      return [...accumulator, item.project_url];
    }
    return accumulator;
  }, [])
}

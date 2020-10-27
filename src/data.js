const list = require('./data/project-url-to-slack-webhook-url');


module.exports.getAllProjectContentUrls = () =>
  list.reduce((accumulator, { project_content_url }) => {
    return [...accumulator, project_content_url];
  }, [])

module.exports.getSlackWebhooksForProjectContentUrl = (project_content_url) =>
  list.reduce((accumulator, item) => {
    if (item.project_content_url === project_content_url) {
      return [...accumulator, item.slack_webhook_url];
    }
    return accumulator;
  }, [])

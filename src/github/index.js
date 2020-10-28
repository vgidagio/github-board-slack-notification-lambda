const { Webhooks } = require('@octokit/webhooks');
const { request: gitHubRequest } = require('@octokit/request');

class GitHub {
  constructor({ webhookSecret, authToken, org }) {
    if (!webhookSecret) {
      throw new Error('Missing GITHUB_WEBHOOK_SECRET');
    }

    if (!authToken) {
      throw new Error('Missing GITHUB_TOKEN');
    }

    if (!org) {
      throw new Error('Missing GITHUB_ORG');
    }

    this.org = org;
    this.webhookSecret = webhookSecret;
    this.request = gitHubRequest.defaults({
      headers: {
        authorization: `token ${authToken}`,
      },
      mediaType: {
        previews: [
          'inertia'
        ]
      }
    });
  }

  validateEvent = async (gitHubEvent, payload, signature) => {
    const webhooks = new Webhooks({
      secret: this.webhookSecret,
    });

    return await webhooks.verifyAndReceive({
      name: gitHubEvent,
      payload: payload,
      signature: signature,
    });
  }

  async fetchOrgProjects() {
    const response = await this.request(`GET /orgs/{org}/projects`, {
      org: this.org,
    });

    return response.data;
  }

  async fetchRepoProjects(repo) {
    const response = await this.request(`GET /repos/{owner}/{repo}/projects`, {
      owner: this.org,
      repo: repo,
    });

    return response.data;
  }

  async fetchProject(url) {
    const response = await this.request(url);
    return response.data;
  }

  // will get overwritten
  request () {};
}

module.exports = GitHub;

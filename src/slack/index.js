const EventEmitter = require('events');
const qs = require('querystring');

const Client = require('./client');
const oauthStore = require('../aws/DynamoTable');


class Slack extends EventEmitter {
  options;
  store;
  ignoreBots;

  constructor(options = {
    oauthTableName: null,
    installRedirect: null,
    verificationToken: null,
    ignoreBots: true,
    clientId: null,
    clientSecret: null,
    clientScopes: null,
  }) {
    super();
    this.options = options;
    this.oauthStore = new oauthStore(options.oauthTableName);
    this.ignoreBots = options.ignoreBots;
  }

  handler(event, context, callback) {
    switch (event.httpMethod) {
      case 'GET':
        this.oauth(event, context, callback);
        break;
      case 'POST':
        this.event(event, context, callback);
        break;
    }
  }

  async oauth(event, context, callback) {
    let payload = event.queryStringParameters;

    console.log('payload:', payload);
    let redirectUrl = `${this.options.installRedirect}?state=${payload.state}`;

    const fail = error => {
      this.emit('*', error, payload);
      this.emit('install_error', error, payload);
      callback(`${redirectUrl}&error=${JSON.stringify(error)}`);
    }

    if (payload.code) {
      try {
        const options = {
          clientId: this.options.clientId,
          clientSecret: this.options.clientSecret,
        };
        const response = await Client.install(options, payload);
        const item = {
          id: response.team.id,
          access_token: response.access_token,
          url: response.incoming_webhook.url,
          channel: response.incoming_webhook.channel,
          channel_id: response.incoming_webhook.channel_id,
          team: response.team,
        };
        const result = await this.oauthStore.put(item);
        console.log('result:', result);

        this.emit('*', payload);
        this.emit('install_success', payload);

        const redirect = {
          statusCode: 301,
          headers: {
            Location: redirectUrl,
          },
          body: '',
        };

        callback(null, redirect);
      } catch (e) {
        fail(e);
      }
    } else {
      // sends a 301 redirect
      // wut.
      //callback(this.client.getAuthUrl(payload));
    }
  }

  async event(event, context, callback) {
    console.log('event:', JSON.stringify(event));
    let payload = event.body;
    if (payload.charAt(0) === "{") {
      payload = JSON.parse(payload);
    } else {
      payload = qs.parse(payload);
    }

    if (payload.payload) {
      payload = JSON.parse(payload.payload);
    }

    console.log('payload:', payload);

    // Verification Token
    const verificationToken = this.options.verificationToken;
    if (verificationToken && verificationToken !== payload.token) {
      return context.fail('[401] Unauthorized');
    }

    // Events API challenge
    if (payload.challenge) {
      const response = {
        statusCode: 200,
        body: payload.challenge
      };
      return callback(null, response);
    } else {
      const response = {
        statusCode: 200,
        body: null
      };
      callback(null, response);
    }

    // Ignore Bot Messages
    if (!this.ignoreBots || !(payload.event || payload).bot_id) {
      // Load Auth And Trigger Events
      const teamId = payload.team_id || payload.team.id;
      const auth = await this.oauthStore.get(teamId);
      this.notify(payload, auth);
    }
  }

  /**
   * Notify message and process events
   * @param {Object} payload - The Lambda event
   * @param {Object} auth - The Slack authentication
   */
  notify(payload, auth) {
    let events = ['*'];
    let bot = new Client(auth, payload);

    // notify incoming message by type
    if (payload.type) events.push(payload.type);

    // notify event triggered by event type
    if (payload.event) events.push('event', payload.event.type);

    // notify slash command by command
    if (payload.command) events.push('slash_command', payload.command);

    // notify webhook triggered by trigger word
    if (payload.trigger_word) events.push('webhook', payload.trigger_word);

    // notify message button triggered by callback_id
    if (payload.callback_id) events.push('interactive_message', payload.callback_id);

    // trigger all events
    events.forEach(name => this.emit(name, payload, bot, this.store));
  }

}

module.exports = Slack;

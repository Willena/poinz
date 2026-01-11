import {PoinzBot} from './bot.js';
import JiraClient from 'jira-client';
import * as path from 'node:path';
import fs from 'node:fs';

const JIRA_BOT_USER_ID = '58089a08-cab8-4324-a173-83491d39734a';
const JIRA_BOT_USER_NAME = 'JiraBot';
const JIRA_KEY_PATTERN = /^([A-Za-z][A-Za-z0-9]+-\d+)\s+/;

const DEFAULT_JIRA_STORY_POINT_FIELD = 'customfield_10002';

class JiraPoinzBot extends PoinzBot {
  constructor(serverUrl, roomId, jiraBotOptions) {
    super(serverUrl, roomId, {
      username: JIRA_BOT_USER_NAME,
      joinAsSpectator: true,
      userId: JIRA_BOT_USER_ID,
      config: jiraBotOptions
    });

    const url = new URL(jiraBotOptions.jira.url);
    this.jira = new JiraClient({
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port,
      username: jiraBotOptions.jira.username,
      password: jiraBotOptions.jira.password,
      apiVersion: jiraBotOptions.jira.apiVersion,
      strictSSL: jiraBotOptions.jira.strictSSL
    });
  }

  async handleCommand(command, story) {
    const [cmd, ...args] = command.split(' ');

    if (cmd === 'loadIssue') {
      for (const issueId of args) {
        const issue = await this.jira.findIssue(issueId);
        this.createTicketFromJiraIssue(issue);
      }
    }

    if (cmd === 'loadJQL') {
      const jql = command.slice(cmd.length);
      const results = await this.jira.searchJira(jql);
      for (const issue of results.issues) {
        this.createTicketFromJiraIssue(issue);
      }
    }
  }

  createTicketFromJiraIssue(issue) {
    console.log(`Jira issue`, issue);
    const jiraLink = `${this.config.jira.url}/browse/${issue.key}`;
    this.sendCommand('addStory', {
      title: `${issue.key} - ${issue.fields.summary}`,
      description: `Jira Link: ${jiraLink}\n\n${issue.fields.summary}\n\n${issue.fields.description}`
    });
  }

  async handleEvent(event) {
    switch (event.name) {
      case 'consensusAchieved':
        await this.onConsensusAchieved(event.payload);
        break;
      case 'newEstimationRoundStarted':
        await this.setJiraValue(event.payload.storyId, null);
        break;
    }
  }

  async setJiraValue(storyId, value) {
    const story = this.roomState.stories.find((s) => s.id === storyId);
    // If the title looks like a Jira Key (e.g., PROJ-123)
    console.log(story);
    if (story && JIRA_KEY_PATTERN.test(story.title)) {
      const jiraKey = story.title.match(JIRA_KEY_PATTERN)[1];
      console.log(`Pushing estimate ${value} for ${story.title} back to JIRA id ${jiraKey}`);
      await this.jira.updateIssue(jiraKey, {
        fields: {
          [this.config.jira.estimationField]: value
        }
      });
      console.log(`JIRA ${jiraKey} updated successfully.`);
    }
  }

  async onConsensusAchieved(payload) {
    console.log(`Estimation finished for story ${payload.value}`);
    return await this.setJiraValue(payload.storyId, payload.value);
  }
}

async function startBot() {
  console.log('Initializing Poinz JiraBot...');

  const configPath =
    process.argv[0] ||
    process.env.CONFIG_FILE_PATH ||
    path.resolve(process.cwd(), 'bot.config.json');
  let fileConfig = {};

  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      console.log('Loaded configuration from bot.config.json');
    } catch (e) {
      console.error('Failed to parse bot.config.json', e);
    }
  }

  const serverUrl = process.env.POINZ_SERVER_URL || fileConfig.serverUrl || 'http://localhost:3000';
  const roomId = process.env.POINZ_ROOM_ID || fileConfig.roomId || 'test';

  const jiraOptions = {
    jira: {
      url: process.env.JIRA_URL || fileConfig.jira.url,
      username: process.env.JIRA_USERNAME || fileConfig.jira?.username,
      password: process.env.JIRA_PASSWORD || fileConfig.jira?.password,
      apiVersion: process.env.JIRA_API_VERSION || fileConfig.jira?.apiVersion || '2',
      strictSSL: process.env.JIRA_STRICT_SSL !== 'false' && fileConfig.jira?.strictSSL !== false,
      estimationField:
        process.env.JIRA_ESTIMATION_FIELD ||
        fileConfig.jira?.estimationField ||
        DEFAULT_JIRA_STORY_POINT_FIELD
    },
    serverUrl: serverUrl,
    roomId: roomId
  };

  console.log(`Starting JiraBot for room "${roomId}" on ${serverUrl}...`);

  const bot = new JiraPoinzBot(serverUrl, roomId, jiraOptions);
  await bot.connect();
}

startBot().catch(console.error);

import { io } from 'socket.io-client';
import {v4 as uuidv4} from 'uuid';

export class PoinzBot {
  constructor(serverUrl, roomId, options = {}) {
    this.serverUrl = serverUrl;
    this.roomId = roomId;
    this.userId = options.userId;
    this.user = null;
    this.username = options.username || 'PoinzBot';
    this.joinAsSpectator = !!options.joinAsSpectator;
    this.socket = null;
    this.roomState = null;
    this.config = options.config || {};
    this.lastEventTime = null
  }

  async connect() {
    this.socket = io(this.serverUrl);

    return new Promise((resolve) => {
      this.socket.on('connect', () => {
        console.log(`Joining room at ${this.serverUrl} with id ${this.roomId} as ${this.username}`);
        this.sendCommand('joinRoom', {username: this.username});
      });

      this.socket.on('event', (event) => {
        console.log(`Received event`, event);
        this.baseHandleEvent(event);

        if (event.name === 'joinedRoom') {
          console.log(`Joined room ${this.roomId}; User user id is ${this.userId}`);
          resolve(event.payload);
        }
      });
    });
  }

  sendCommand(name, payload) {
    this.socket.emit('command', {
      id: uuidv4(),
      name,
      roomId: this.roomId,
      userId: this.userId,
      payload
    });
  }

  baseHandleEvent(event) {
    this.lastEventTime = new Date();
    switch (event.name) {
      case 'kicked':
        console.warn(`Kicked from room, no more event will be processed`,event);
        return;
      case 'commandRejected':
        console.error(`Command rejected`,event);
        return
      case 'joinedRoom':
        this.userId = event.userId;
        this.user = event.payload.users.find(u => u.id === this.userId);
        console.log(`Current user is`, this.user);
        this.roomState = event.payload;
        if (this.joinAsSpectator && !this.user.excluded) {
          this.sendCommand('toggleExclude', { userId: this.userId });
        }
        // this.ensureConfigTicket();
        break;
      case 'storyAdded':
        this.roomState.stories.push(event.payload);
        this.checkCommandTicket(event.payload);
        break;
    }

    this.handleEvent(event).catch(console.error);
  }

  // ensureConfigTicket() {
  //   const CONFIG_TITLE = 'bot:config';
  //   const configTicket = this.roomState.stories.find(s => s.title === CONFIG_TITLE);
  //   if (!configTicket) {
  //     this.sendCommand('addStory', { title: CONFIG_TITLE, description: '{}' });
  //   } else {
  //     this.configTicketId = configTicket.storyId;
  //     try { this.config = JSON.parse(configTicket.description); } catch (e) {}
  //   }
  // }

  async checkCommandTicket(story) {
    if (story.title.trim().startsWith('/')) {
      const command = story.title.trim().slice(1);
      this.sendCommand('changeStory', {
        storyId: story.storyId,
        title: `bot(processing): /${command}`,
        description: ""
      });

      const result = await this.onCommand(command, story);

      if (result) {
        this.sendCommand('changeStory', {
          storyId: story.storyId,
          title: `bot(result): ${command}`,
          description: result
        });
      } else {
        this.sendCommand('trashStory', {storyId: story.storyId});
        this.sendCommand('deleteStory', { storyId: story.storyId });
      }
    }
  }

  async onCommand(command, story) {
    console.log(`Received command ${command} for story ${story.storyId}`);
    if (command === 'ping'){
      return 'Pong!';
    }

    return await this.handleCommand(command, story);

  }

  async handleCommand(command, story) {}
  async handleEvent(event) {}
}

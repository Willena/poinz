import uuid from '../../../src/uuid';
import {prepTwoUsersInOneRoomWithOneStory} from '../../testUtils.js';

test('Should produce storyChanged event', async () => {
  const {processor, roomId, userIdOne, storyId} = await prepTwoUsersInOneRoomWithOneStory(
    'mySuperUser',
    'nice Story'
  );
  const commandId = uuid();
  const {producedEvents, room} = await processor(
    {
      id: commandId,
      roomId,
      name: 'changeStory',
      payload: {
        storyId,
        title: 'NewTitle',
        description: 'New Description'
      }
    },
    userIdOne
  );

  expect(producedEvents).toMatchEvents(commandId, roomId, 'storyChanged');

  const [storyChangedEvent] = producedEvents;

  expect(storyChangedEvent.payload).toMatchObject({
    storyId,
    title: 'NewTitle',
    description: 'New Description'
  });

  expect(room.stories[0].title).toEqual('NewTitle');
  expect(room.stories[0].description).toEqual('New Description');
});

test('Users marked as excluded can still change stories', async () => {
  const {processor, roomId, userIdOne, storyId, mockRoomsStore} =
    await prepTwoUsersInOneRoomWithOneStory('mySuperUser', 'nice Story');

  mockRoomsStore.manipulate((room) => {
    room.users[0].excluded = true;
    return room;
  });

  const commandId = uuid();
  const {producedEvents} = await processor(
    {
      id: commandId,
      roomId,
      name: 'changeStory',
      payload: {
        storyId,
        title: 'NewTitle',
        description: 'New Description'
      }
    },
    userIdOne
  );

  expect(producedEvents).toMatchEvents(commandId, roomId, 'storyChanged');
});

describe('preconditions', () => {
  test('Should throw if room does not contain matching story', async () => {
    const {processor, roomId, userIdOne} = await prepTwoUsersInOneRoomWithOneStory(
      'mySuperUser',
      'nice Story'
    );

    return expect(
      processor(
        {
          id: uuid(),
          roomId,
          name: 'changeStory',
          payload: {
            storyId: uuid(), // <<- new uuid that does not match any story in the room
            title: 'NewTitle',
            description: 'New Description'
          }
        },
        userIdOne
      )
    ).rejects.toThrow(
      /Precondition Error during "changeStory": Given story .* does not belong to room .*/
    );
  });

  test('Should throw if story is trashed', async () => {
    const {processor, roomId, storyId, userIdOne, mockRoomsStore} =
      await prepTwoUsersInOneRoomWithOneStory('mySuperUser', 'nice Story');

    mockRoomsStore.manipulate((room) => {
      room.stories[0].trashed = true;
      return room;
    });

    return expect(
      processor(
        {
          id: uuid(),
          roomId,
          name: 'changeStory',
          payload: {
            storyId,
            title: 'NewTitle',
            description: 'New Description'
          }
        },
        userIdOne
      )
    ).rejects.toThrow(
      /Precondition Error during "changeStory": Given story .* is marked as "trashed" and cannot be selected or manipulated.*/
    );
  });

  test('Should fail, if story title is too long (more than 1000 chars)', async () => {
    const {processor, roomId, storyId, userIdOne} = await prepTwoUsersInOneRoomWithOneStory(
      'mySuperUser',
      'nice Story'
    );

    return expect(
      processor(
        {
          id: uuid(),
          roomId: roomId,
          name: 'changeStory',
          payload: {
            storyId,
            title: 't'.repeat(1001),
            description: 'kdjgk'
          }
        },
        userIdOne
      )
    ).rejects.toThrow('String is too long (1001 chars), maximum 1000 in /payload/title');
  });

  test('Should fail, if story description is too long (more than 20k chars)', async () => {
    const {processor, roomId, storyId, userIdOne} = await prepTwoUsersInOneRoomWithOneStory(
      'mySuperUser',
      'nice Story'
    );

    return expect(
      processor(
        {
          id: uuid(),
          roomId: roomId,
          name: 'changeStory',
          payload: {
            storyId,
            title: 'test',
            description: 't'.repeat(20001)
          }
        },
        userIdOne
      )
    ).rejects.toThrow('String is too long (20001 chars), maximum 20000 in /payload/description');
  });
});

import {
  EventTopic,
  getEventSource,
  getPublisher,
  getSubscriber,
  SubscriberHandler,
} from '../../modules/events';

const eventSource = getEventSource();

describe('eventSource', () => {
  afterEach(() => {
    eventSource.flush();
  });

  it('should publish and consume an action created event with one subscriber', async () => {
    expect.assertions(1);
    const handlerSpy = jest.fn();

    const subscriber = getSubscriber(EventTopic.ActionCreated);
    subscriber.subscribe((eventData) => {
      handlerSpy(eventData);
    })

    const publisher = getPublisher(EventTopic.ActionCreated)
    publisher.publish({
      type: 'user',
      version: '1',
      data: {
        firstName: 'James',
        lastName: 'Doe',
        email: 'james.doe@email.com',
      },
    });

    expect(handlerSpy).toHaveBeenCalledWith({
      firstName: 'James',
      lastName: 'Doe',
      email: 'james.doe@email.com',
    })
  });

  it('should publish and consume an action created event with multiple subscribers', async () => {
    expect.assertions(2);
    const firstSubscriberSpy = jest.fn();
    const secondSubscriberSpy = jest.fn();

    const firstSubscriber = getSubscriber(EventTopic.ActionCreated);
    firstSubscriber.subscribe((eventData) => {
      firstSubscriberSpy(eventData);
    })
    const secondSubscriber = getSubscriber(EventTopic.ActionCreated);
    secondSubscriber.subscribe((eventData) => {
      secondSubscriberSpy(eventData);
    })

    const publisher = getPublisher(EventTopic.ActionCreated)
    publisher.publish({
      type: 'user',
      version: '1',
      data: {
        firstName: 'James',
        lastName: 'Doe',
        email: 'james.doe@email.com',
      },
    });

    expect(firstSubscriberSpy).toHaveBeenCalledWith({
      firstName: 'James',
      lastName: 'Doe',
      email: 'james.doe@email.com',
    })

    expect(secondSubscriberSpy).toHaveBeenCalledWith({
      firstName: 'James',
      lastName: 'Doe',
      email: 'james.doe@email.com',
    })
  });

  it('should unsubscribe subscriber from event store', async () => {
    expect.assertions(2);
    const subscriberSpy = jest.fn();

    const handler: SubscriberHandler = (eventData) => {
      subscriberSpy(eventData);
    };

    const subscriber = getSubscriber(EventTopic.ActionCreated);
    const publisher = getPublisher(EventTopic.ActionCreated)

    subscriber.subscribe(handler);

    publisher.publish({
      type: 'user',
      version: '1',
      data: {
        firstName: 'James',
        lastName: 'Doe',
        email: 'james.doe@email.com',
      },
    });

    expect(subscriberSpy).toHaveBeenCalledWith({
      firstName: 'James',
      lastName: 'Doe',
      email: 'james.doe@email.com',
    });

    subscriberSpy.mockReset();
    subscriber.unsubscribe(handler);
    publisher.publish({
      type: 'user',
      version: '1',
      data: {
        firstName: 'Janet',
        lastName: 'Duo',
        email: 'janet.duo@email.com',
      },
    });

    expect(subscriberSpy).not.toHaveBeenCalledWith({
      firstName: 'Janet',
      lastName: 'Duo',
      email: 'janet.duo@email.com',
    })
  });

  it('should find an event from the event store by id', async () => {
    expect.assertions(4);
    const publisher = getPublisher(EventTopic.ActionCreated)

    const firstEventResponse = publisher.publish({
      type: 'user',
      version: '1',
      data: {
        firstName: 'James',
        lastName: 'Doe',
        email: 'james.doe@email.com',
      },
    });

    expect(firstEventResponse).toEqual(
      expect.objectContaining({ eventId: expect.any(String)}),
    );

    const firstEvent = eventSource.findById(firstEventResponse.eventId);

    expect(firstEvent?.id).toBe(firstEventResponse.eventId);
    expect(firstEvent?.data).toEqual({
      firstName: 'James',
      lastName: 'Doe',
      email: 'james.doe@email.com',
    });
    expect(firstEvent?.consumedAt).toBe(null)
  });

  it('should set value for consumedAt if event has been consumed', async () => {
    expect.assertions(6);
    const subscriberSpy = jest.fn();

    const publisher = getPublisher(EventTopic.ActionCreated);
    const subscriber = getSubscriber(EventTopic.ActionCreated);

    const firstEventResponse = publisher.publish({
      type: 'user',
      version: '1',
      data: {
        firstName: 'James',
        lastName: 'Doe',
        email: 'james.doe@email.com',
      },
    });

    expect(firstEventResponse).toEqual(
      expect.objectContaining({ eventId: expect.any(String)}),
    );

    let firstEvent = eventSource.findById(firstEventResponse.eventId);

    expect(firstEvent?.id).toBe(firstEventResponse.eventId);
    expect(firstEvent?.consumedAt).toBe(null);

    subscriber.subscribe((eventData) => {
      subscriberSpy(eventData);
    });

    firstEvent = eventSource.findById(firstEventResponse.eventId);

    expect(firstEvent?.id).toBe(firstEventResponse.eventId);
    expect(firstEvent?.consumedAt).not.toBe(null)
    expect(subscriberSpy).toHaveBeenCalledWith({
      firstName: 'James',
      lastName: 'Doe',
      email: 'james.doe@email.com',
    });
  });

  it('should republish an event', async () => {
    const handlerSpy = jest.fn();

    const subscriber = getSubscriber(EventTopic.ActionCreated);
    subscriber.subscribe((eventData) => {
      handlerSpy(eventData);
    });

    const publisher = getPublisher(EventTopic.ActionCreated)
    const { eventId } = publisher.publish({
      type: 'user',
      version: '1',
      data: {
        firstName: 'James',
        lastName: 'Doe',
        email: 'james.doe@email.com',
      },
    });

    expect(handlerSpy).toHaveBeenCalledWith({
      firstName: 'James',
      lastName: 'Doe',
      email: 'james.doe@email.com',
    });

    const firstEvent = eventSource.findById(eventId);

    handlerSpy.mockReset();
    expect(handlerSpy).not.toHaveBeenCalled();

    const [{ eventId: secondEventId }] = publisher.republish({ publishedAt: firstEvent?.publishedAt });
    const secondEvent = eventSource.findById(secondEventId);
    console.log(firstEvent?.consumedAt, secondEvent?.consumedAt, "consumed at")
    expect(eventId).not.toEqual(secondEventId);
    expect(firstEvent?.data).toEqual(secondEvent?.data);
    expect(firstEvent?.publishedAt).not.toEqual(secondEvent?.publishedAt);
    expect(firstEvent?.consumedAt).not.toEqual(secondEvent?.consumedAt);
  });

  it('should replay an event', async () => {
    // expect.assertions(1);
    const handlerSpy = jest.fn();

    const subscriber = getSubscriber(EventTopic.ActionCreated);
    subscriber.subscribe((eventData) => {
      handlerSpy(eventData);
    });

    const publisher = getPublisher(EventTopic.ActionCreated)
    const { eventId } = publisher.publish({
      type: 'user',
      version: '1',
      data: {
        firstName: 'James',
        lastName: 'Doe',
        email: 'james.doe@email.com',
      },
    });

    expect(handlerSpy).toHaveBeenCalledWith({
      firstName: 'James',
      lastName: 'Doe',
      email: 'james.doe@email.com',
    });

    const firstEvent = eventSource.findById(eventId);

    handlerSpy.mockReset();
    expect(handlerSpy).not.toHaveBeenCalled();

    const [{ eventId: secondEventId }] = publisher.replay({ publishedAt: firstEvent?.publishedAt });
    const secondEvent = eventSource.findById(secondEventId);

    expect(eventId).toEqual(secondEventId);
    expect(firstEvent?.data).toEqual(secondEvent?.data);
    expect(firstEvent?.publishedAt).toEqual(secondEvent?.publishedAt);
    expect(firstEvent?.consumedAt).not.toEqual(secondEvent?.consumedAt);
  });
});

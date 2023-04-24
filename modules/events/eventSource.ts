import { randomUUID } from "crypto";
import { EventData, RequiredFields } from "./eventData";
import { EventTopic } from "./eventTopic";

export type PublisherData = { data: EventData[keyof EventData] } & RequiredFields;
export type SubscriberHandler = (data: PublisherData['data']) => void;

export interface FilterableFields {
  topic?: EventTopic;
  type?: string;
  version?: string;
  publishedAt?: Date;
  consumedAt?: Date | null;
}

interface Event {
  id: string;
  topic: EventTopic;
  type: string;
  version: string;
  data: EventData[keyof EventData];
  publishedAt: Date;
  consumedAt: Date | null;
}

class EventSource {
  private static instance: EventSource;

  private eventStore: Event[] = [];

  private subscribers: Record<EventTopic, SubscriberHandler[]> = {} as Record<EventTopic, SubscriberHandler[]>;

  // Making this class a singleton class, so we only have one instance
  // for the app.
  static new() {
    if (!this.instance) {
      this.instance = new EventSource();
    }

    return this.instance;
  }

  /**
   * Unsubscribes a consumer from a given topic
   * @param topic EventTopic to unsubscribe from
   * @param subscriberHandler SubscriberHandler to remove from the event store
   * @returns
   */
  unsubscribe(topic: EventTopic, subscriberHandler: SubscriberHandler) {
    const topicSubscribers = this.subscribers[topic] || [];
    this.subscribers[topic] = topicSubscribers.filter(handler => {
      return handler !== subscriberHandler});

    // If true, it means we have successfully removed handler from the list
    return this.subscribers[topic].length < topicSubscribers.length;
  }

  /**
   * Consumes data from a given topic
   * @param topic EventTopic to consume from
   * @param subscriberHandler Function to process event data
   */
  subscribe(topic: EventTopic, subscriberHandler: SubscriberHandler) {
    const topicSubscribers = this.subscribers[topic] || [];
    this.subscribers[topic] = [...topicSubscribers, subscriberHandler];

    const unconsumedEvents = this.findAll({ topic, consumedAt: null });

    if (unconsumedEvents.length === 0) {
      return;
    }

    for(const event of unconsumedEvents) {
      subscriberHandler.call(null, event.data);
      this.updateStore(event.id, { consumedAt: new Date() })
    }

  }

  /**
   * Publishes an event to a given topic
   * @param topic EventTopic to publish to
   * @param eventData EventData to publish
   * @returns { eventId } Object containing event it
   */
  publish(topic: EventTopic, eventData: PublisherData): { eventId: string } {
    const event: Event = {
      id: randomUUID(),
      topic,
      type: eventData.type,
      version: eventData.version,
      data: eventData.data,
      publishedAt: new Date(),
      consumedAt: null,
    }

    this.eventStore.push(event)

    if (this.sendToSubscribers(event)) {
      this.updateStore(event.id, { consumedAt: new Date() })
    }

    return { eventId: event.id };
  }

  /**
   * Republishes events matched by fields by recreating them with new ids
   * @param itemFields
   * @returns Array of republished ids
   */
  republish(itemFields: FilterableFields): { eventId: string }[] {
    const matchedEvents = this.findAll(itemFields);

    return matchedEvents.map(event => {
      return this.publish(event.topic, event);
    })
  }

  /**
   * Replays events matched by fields without recreating them
   * @param itemFields
   * @returns Array of replayed event ids
   */
  replay(itemFields: FilterableFields): { eventId: string }[] {
    const matchedEvents = this.findAll(itemFields);

    return matchedEvents.map(event => {
      if (this.sendToSubscribers(event)) {
        this.updateStore(event.id, { consumedAt: new Date() })
      }

      return { eventId: event.id };
    })
  }

  /**
   * Find event by id from the event store
   * @param id Number
   * @returns Event
   */
  findById(id: string): Event | null {
    return this.eventStore.find(event => event.id === id) || null;
  }

  /**
   * Find events in store but filterable fields
   * @param itemFields FilterableFields
   * @returns Event[]
   */
  findAll(itemFields: FilterableFields): Event[] {
    return this.eventStore.filter(event => {
      if ('topic' in itemFields && itemFields.topic !== event.topic) {
        return false;
      }

      if ('type' in itemFields && itemFields.type !== event.type) {
        return false;
      }

      if ('version' in itemFields && itemFields.version !== event.version) {
        return false;
      }

      if ('consumedAt' in itemFields && itemFields.consumedAt !== event.consumedAt) {
        return false;
      }

      if ('publishedAt' in itemFields && itemFields.publishedAt !== event.publishedAt) {
        return false;
      }

      return true;
    });
  }

  /**
   * Clears the store and the subscribers list
   */
  public flush() {
    this.eventStore = [];
    this.subscribers = {} as Record<EventTopic, SubscriberHandler[]>;
  }

  /**
   * Sends data to all subscribers to a given topic
   * @param event
   * @returns void
   */
  private sendToSubscribers(event: Event): number {
    const { topic, data, id } = event;

    const topicSubscribers = this.subscribers[topic] || [];

    for (const subscriber of topicSubscribers) {
      subscriber.call(null, data);
    }

    return topicSubscribers.length
  }

  /**
   * Update the event in the store
   * @param itemId
   * @param itemData
   */
  private updateStore(itemId: string, itemData: Partial<Event>) {
    const itemPos = this.eventStore.findIndex(event => event.id === itemId);

    if (itemPos === -1) {
      throw new Error(`Item with id ${itemId} not found.`);
    }

    this.eventStore[itemPos] = {
      ...this.eventStore[itemPos],
      ...itemData,
    };
  }
}

export const createEventSource = () => EventSource.new();

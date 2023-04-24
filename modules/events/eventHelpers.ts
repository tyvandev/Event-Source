import { createEventSource, FilterableFields, PublisherData, SubscriberHandler } from "./eventSource";
import { EventTopic } from "./eventTopic";
import { requiredFieldsValidator } from "./eventValidator";

const eventSource = createEventSource();

export const getPublisher = (topic: EventTopic) => {
  const publisher = <T extends PublisherData>() => {
    return {
      publish(data: T) {
        const eventData = requiredFieldsValidator.safeParse(data);

        if (!eventData.success) {
          throw new Error('Required parameters are missing.');
        }

        return eventSource.publish(topic, data);
      },
      republish(fields: FilterableFields) {
        return eventSource.republish(fields);
      },
      replay(fields: FilterableFields) {
        return eventSource.replay(fields);
      }
    };
  }

  return publisher<PublisherData>();
}

export const getSubscriber = (topic: EventTopic) => {
  const subscriber = <H extends SubscriberHandler>() => {
    return {
      subscribe(handler: H) {
        eventSource.subscribe(topic, handler);
      },
      unsubscribe(handler: H) {
        eventSource.unsubscribe(topic, handler);
      },
    };
  }

  return subscriber<SubscriberHandler>();
}

export const getEventSource = () => eventSource;

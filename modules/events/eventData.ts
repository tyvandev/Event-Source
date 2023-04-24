import { z } from 'zod';
import { EventTopic } from './eventTopic';
import {
  requiredFieldsValidator,
  actionCreatedEventDataValidator,
  actionDeletedEventDataValidator,
  actionUpdatedEventDataValidator,
} from './eventValidator';

export type RequiredFields = z.infer<typeof requiredFieldsValidator>

export type EventData = {
  [EventTopic.ActionCreated]: z.infer<typeof actionCreatedEventDataValidator>;
  [EventTopic.ActionUpdated]: z.infer<typeof actionUpdatedEventDataValidator>;
  [EventTopic.ActionDeleted]: z.infer<typeof actionDeletedEventDataValidator>;
}

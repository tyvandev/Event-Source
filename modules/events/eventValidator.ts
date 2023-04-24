import { z } from 'zod';

export const requiredFieldsValidator = z.object({
  type: z.string(),
  version: z.string(),
});

export const actionCreatedEventDataValidator = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
})

export const actionUpdatedEventDataValidator = z.object({
  actionId: z.number(),
})

export const actionDeletedEventDataValidator = actionUpdatedEventDataValidator.extend({})

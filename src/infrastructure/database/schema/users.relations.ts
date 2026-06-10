import { relations } from 'drizzle-orm';
import { users, userContacts } from './users.entity';
import { otpVerifications } from './otp-verification.entity';
import { sessions } from './sessions.entity';
import { products } from './products.entity';

// USER RELATIONS
const userRelations = relations(users, ({ many }) => ({
  contacts: many(userContacts),
  otps: many(otpVerifications),
  sessions: many(sessions),
  createdProducts: many(products),
}));

const userContactRelations = relations(userContacts, ({ one }) => ({
  user: one(users, {
    fields: [userContacts.userId],
    references: [users.id],
  }),
}));

export { userRelations, userContactRelations };

import { relations } from 'drizzle-orm';
import { users, userContacts } from './users.entity';
import { otpVerifications } from './otp-verification.entity';
import { sessions } from './sessions.entity';
import { products } from './products.entity';
import { outlets } from './outlets.entity';

// USER RELATIONS
const userRelations = relations(users, ({ one, many }) => ({
  outlet: one(outlets, {
    fields: [users.outletId],
    references: [outlets.id],
  }),
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

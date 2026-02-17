/**
 * MongoDB Index Initialization
 *
 * Run once on setup to create required indexes.
 * Usage: npx tsx src/mongo-indexes.ts
 */

import { getMongoDb, closeMongoDb, events, persons, reviews, registrations, referrals, userReferralCodes, supportTickets, analyticsEvents, follows } from "./mongodb.js";

async function createIndexes() {
  const db = await getMongoDb();
  console.log("Connected to MongoDB. Creating indexes...");

  // Events
  const eventsCol = events(db);
  await eventsCol.createIndex({ slug: 1 }, { unique: true });
  await eventsCol.createIndex({ shortCode: 1 }, { unique: true });
  await eventsCol.createIndex({ startDate: 1 });
  await eventsCol.createIndex({ category: 1 });
  await eventsCol.createIndex({ "location.address.addressLocality": 1 });
  await eventsCol.createIndex({ isPublished: 1, eventStatus: 1 });
  await eventsCol.createIndex({ "organizer.identifier": 1 });
  await eventsCol.createIndex({ dateCreated: -1 });
  console.log("  events: 8 indexes created");

  // Persons
  const personsCol = persons(db);
  await personsCol.createIndex({ email: 1 }, { unique: true });
  await personsCol.createIndex({ alternateName: 1 }, { unique: true, sparse: true });
  await personsCol.createIndex({ stytchUserId: 1 }, { sparse: true });
  await personsCol.createIndex({ mukokoOrgMemberId: 1 }, { sparse: true });
  await personsCol.createIndex({ role: 1 });
  console.log("  persons: 5 indexes created");

  // Reviews
  const reviewsCol = reviews(db);
  await reviewsCol.createIndex({ itemReviewed: 1, author: 1 }, { unique: true });
  await reviewsCol.createIndex({ itemReviewed: 1 });
  await reviewsCol.createIndex({ author: 1 });
  await reviewsCol.createIndex({ "reviewRating.ratingValue": 1 });
  await reviewsCol.createIndex({ datePublished: -1 });
  console.log("  reviews: 5 indexes created");

  // Registrations
  const registrationsCol = registrations(db);
  await registrationsCol.createIndex({ event: 1, agent: 1 }, { unique: true });
  await registrationsCol.createIndex({ event: 1 });
  await registrationsCol.createIndex({ agent: 1 });
  console.log("  registrations: 3 indexes created");

  // Referrals
  const referralsCol = referrals(db);
  await referralsCol.createIndex({ referralCode: 1 }, { unique: true });
  await referralsCol.createIndex({ referrerUserId: 1 });
  await referralsCol.createIndex({ event: 1 });
  await referralsCol.createIndex({ status: 1 });
  console.log("  referrals: 4 indexes created");

  // User Referral Codes
  const codesCol = userReferralCodes(db);
  await codesCol.createIndex({ referralCode: 1 }, { unique: true });
  console.log("  userReferralCodes: 1 index created");

  // Support Tickets
  const ticketsCol = supportTickets(db);
  await ticketsCol.createIndex({ userId: 1 });
  await ticketsCol.createIndex({ status: 1 });
  console.log("  supportTickets: 2 indexes created");

  // Analytics Events
  const analyticsCol = analyticsEvents(db);
  await analyticsCol.createIndex({ eventType: 1 });
  await analyticsCol.createIndex({ eventId: 1 });
  await analyticsCol.createIndex({ dateCreated: -1 });
  console.log("  analyticsEvents: 3 indexes created");

  // Follows
  const followsCol = follows(db);
  await followsCol.createIndex({ followerId: 1, followingId: 1 }, { unique: true });
  await followsCol.createIndex({ followingId: 1 });
  console.log("  follows: 2 indexes created");

  console.log("All indexes created successfully.");
  await closeMongoDb();
}

createIndexes().catch((err) => {
  console.error("Failed to create indexes:", err);
  process.exit(1);
});

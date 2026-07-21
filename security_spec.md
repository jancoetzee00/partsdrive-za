# Security Specification: PartsDrive ZA Firestore Rules

## 1. Data Invariants
- Anyone can read parts lists (`parts` collection) and individual parts.
- Only the creator (with `sellerId == request.auth.uid`) can create, update, or delete a part listing.
- Anyone can increment the `views` field of any part by exactly 1.
- Only the owner (`sellerId == request.auth.uid`) can write or update their `sellers` profile.
- Immutable fields like `createdAt` and `sellerId` on a part must not be mutated on update.
- Users cannot change their own roles or subscription states unless authorized (for parts, the sellerVerified reflects their payment state from their seller profile).

## 2. The "Dirty Dozen" Malicious Payloads
1. **Unauthenticated Part Deletion**: Attempting to delete `/parts/somePart` without signing in.
2. **Identity Spoofing on Part Creation**: Signing in as `userA` but setting `sellerId = "userB"` on a part creation.
3. **Privilege Escalation on User Profile**: Mutating `subscriptionActive = true` on `sellers/userA` directly from the client SDK without a valid subscription payment.
4. **Mutating Immutable Fields**: Attempting to modify `createdAt` of an existing part listing.
5. **View Hijacking (Incremental Spoofing)**: Trying to update a part's `views` field to `99999` instead of increments of 1.
6. **Malicious ID Injection**: Creating a part doc with an ID like `/parts/$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$` to cause wallet-denial or path injection.
7. **Cross-Seller Part Mutation**: Authenticating as `userA` and trying to edit `title` on a part where `sellerId == "userB"`.
8. **Malicious Part Payload (Type Poisoning)**: Sending a string like `price = "one million"` instead of a number.
9. **Spamming Empty Fields**: Creating a part listing missing required fields like `title`, `category`, etc.
10. **Spoofing Verification Status on Part Listing**: Creating a part listing with `sellerVerified = true` when the user's `sellers` profile is actually unsubscribed.
11. **Altering Another Seller's Profile**: Authenticating as `userA` and updating `sellers/userB`'s name or contact phone.
12. **Out of Range Numeric Field**: Submitting `price = -500` or `year = 50000` to poison the catalog query logic.

## 3. Security Rules Verification
The `firestore.rules` file contains strict type checks, identity guards, and structural validators to ensure all the malicious payloads return `PERMISSION_DENIED`.

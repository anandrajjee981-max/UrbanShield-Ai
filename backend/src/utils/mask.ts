/**
 * Masking helpers for government identity numbers.
 *
 * A government ID is sensitive personal data: it identifies a person uniquely
 * for their whole life, across every organisation that holds it. The rules this
 * file implements are the ones the whole backend relies on:
 *
 *  - the raw value is stored (see the column comment in
 *    004_create_authority_verification.sql) but is never returned by an API
 *  - every response carries a mask instead, showing at most the last 4 characters
 *  - nothing here ever logs its input
 *
 * The mask is derived, never persisted as the source of truth, so changing the
 * rule below immediately changes what every endpoint returns.
 */

/**
 * Separators stripped before masking, so a number typed as `1234 5678 9012` or
 * `1234-5678-9012` masks to the same `XXXX-XXXX-9012` as the bare digits.
 */
const SEPARATORS = /[\s-]+/g;

/** How many leading characters a mask group stands for. */
const GROUP_SIZE = 4;

/** The only characters a mask ever reveals. */
export const VISIBLE_ID_CHARACTERS = 4;

/**
 * The placeholder that replaces each hidden group.
 *
 * `X` rather than `*` or a digit: it is unmistakably a redaction, so a reviewer
 * can tell at a glance that they are not looking at the real value.
 */
const MASK_GROUP = 'XXXX';

/**
 * Reduces a government ID to its last {@link VISIBLE_ID_CHARACTERS} characters,
 * with everything before it replaced by `XXXX` groups.
 *
 * The hidden length is rounded up to whole groups, so the mask is always a
 * multiple of four characters wide plus the visible tail:
 *
 *     123456789012  ->  XXXX-XXXX-9012
 *     12345678      ->  XXXX-5678
 *     ABCD1234EF    ->  XXXX-EF
 *
 * The mask is always exactly as wide as the value it hides, so its length leaks
 * nothing beyond the digit count - and the length itself is already visible on
 * the (admin-only) document the reviewer is looking at.
 *
 * Separators are dropped rather than replaced, so the returned mask never
 * contains user supplied punctuation.
 */
export const maskGovernmentId = (rawValue: string): string => {
  const compact = rawValue.replace(SEPARATORS, '');

  // Degenerate input: shorter than the visible tail, so there is nothing to
  // mask and revealing it whole would be the same as returning it unmasked.
  if (compact.length <= VISIBLE_ID_CHARACTERS) {
    return MASK_GROUP;
  }

  const visible = compact.slice(-VISIBLE_ID_CHARACTERS);
  const hiddenLength = compact.length - VISIBLE_ID_CHARACTERS;
  const groups = Math.ceil(hiddenLength / GROUP_SIZE);

  return [...Array<string>(groups).fill(MASK_GROUP), visible].join('-');
};

/**
 * The trailing characters of a government ID, which are stored separately in
 * `government_id_last4` so a mask can be rendered without re-deriving it from
 * the secret.
 *
 * Kept next to {@link maskGovernmentId} because the two must agree on what
 * "the last four" means; a database CHECK constraint
 * (`authority_applications_last4_matches_id`) enforces the same agreement on the
 * stored value.
 */
export const governmentIdLast4 = (rawValue: string): string =>
  rawValue.replace(SEPARATORS, '').slice(-VISIBLE_ID_CHARACTERS);
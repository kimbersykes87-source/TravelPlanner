/**
 * Shared scenario/bucket-list icon set.
 *
 * Used by both the Future > Scenarios editor and the Future > Bucket List
 * editor so the two pages can't drift out of sync (they used to keep two
 * separate copies of this list).
 *
 * `value` is also the SVG filename under public/assets/scenario-icons/.
 */
export const SCENARIO_ICONS = [
  // Original set
  { value: 'adventure', label: 'Adventure' },
  { value: 'beach', label: 'Beach' },
  { value: 'camping', label: 'Camping' },
  { value: 'dining', label: 'Dining' },
  { value: 'hikiing', label: 'Hiking' },
  { value: 'mountains', label: 'Mountains' },
  { value: 'nature', label: 'Nature' },
  { value: 'resort', label: 'Resort' },
  { value: 'roadTrip', label: 'Road Trip' },
  { value: 'SilverSprings', label: 'Silver Springs' },
  { value: 'snowboarding', label: 'Snowboarding' },
  { value: 'sunny', label: 'Sunny' },
  { value: 'tropical', label: 'Tropical' },
  { value: 'vineyard', label: 'Vineyard' },

  // Wildlife & outdoors
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'safari', label: 'Safari' },
  { value: 'dogFriendly', label: 'Dog Friendly' },
  { value: 'horseback', label: 'Horseback' },
  { value: 'fishing', label: 'Fishing' },
  { value: 'forest', label: 'Forest' },
  { value: 'exploring', label: 'Exploring' },

  // Water & snow
  { value: 'diving', label: 'Diving' },
  { value: 'sailing', label: 'Sailing' },
  { value: 'cruise', label: 'Cruise' },
  { value: 'island', label: 'Island' },
  { value: 'skiing', label: 'Skiing' },
  { value: 'winter', label: 'Winter' },
  { value: 'hotSprings', label: 'Hot Springs' },
  { value: 'volcano', label: 'Volcano' },

  // Wellness & slow travel
  { value: 'yoga', label: 'Yoga' },
  { value: 'campfire', label: 'Campfire' },
  { value: 'vanLife', label: 'Van Life' },
  { value: 'workation', label: 'Workation' },

  // City & culture
  { value: 'city', label: 'City' },
  { value: 'history', label: 'History' },
  { value: 'temple', label: 'Temple' },
  { value: 'theatre', label: 'Theatre' },
  { value: 'museum', label: 'Museum' },
  { value: 'market', label: 'Market' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'cafe', label: 'Café' },
  { value: 'festival', label: 'Festival' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'familyVisit', label: 'Family Visit' },

  // Getting there & getting active
  { value: 'flying', label: 'Flying' },
  { value: 'train', label: 'Train' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'worldTour', label: 'World Tour' },
  { value: 'photography', label: 'Photography' },
  { value: 'stargazing', label: 'Stargazing' },
];

/** value -> label lookup, for quick display. */
export const SCENARIO_ICON_LABELS = Object.fromEntries(
  SCENARIO_ICONS.map((o) => [o.value, o.label])
);

/**
 * Older records can carry icon values that never had (or no longer have) a
 * matching SVG. Map those onto a real file instead of showing a broken image.
 */
const LEGACY_ICON_MAP = {
  hiking: 'hikiing',
  future: 'adventure',
};

/** Resolve an icon value to its SVG path under public/assets/scenario-icons/. */
export function scenarioIconPath(value) {
  const v = value || 'adventure';
  const file = LEGACY_ICON_MAP[v] || v;
  return `/assets/scenario-icons/${file}.svg`;
}

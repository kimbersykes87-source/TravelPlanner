/**
 * Icon component – loads from /assets/icons/v2/.
 * Uses CSS mask so icons inherit parent color (for nav active states).
 * Use <Icon name="us" size={24} />
 */
const ICON_MAP = {
  // Bottom nav
  us: 'us',
  past: 'earth',
  present: 'clipboard-list',
  future: 'globe-x',
  // Sub-menu Past
  'all-time': 'medal',
  relationship: 'heart-handshake',
  map: 'map-pinned',
  // Sub-menu Present
  'to-book': 'ticket-x',
  booked: 'ticket-check',
  // Sub-menu Future
  scenarios: 'route',
  'bucket-list': 'paint-bucket',
  // Booking / misc
  plane: 'plane',
  ship: 'ship',
  train: 'train-front',
  car: 'car-front',
  bed: 'bed',
  'baggage-claim': 'baggage-claim',
  star: 'star',
  medal: 'medal',
  'chevron-down': 'chevron-down',
  'chevron-up': 'chevron-up',
  passport: 'passport',
  'calendar-days': 'calendar-days',
  'x-close': 'x-close',
  'arrow-right-left': 'arrow-right-left',
  delete: 'delete',
};

const BASE = import.meta.env.BASE_URL || '/';

const ICON_PATH_OVERRIDE = {
  passport: 'assets/icons/passport.svg',
  travels: 'assets/icons/travels.svg',
};

export function Icon({ name, size = 24, className = '', style = {}, ...props }) {
  const file = ICON_MAP[name] || name;
  const src = ICON_PATH_OVERRIDE[name]
    ? `${BASE}${ICON_PATH_OVERRIDE[name]}`
    : `${BASE}assets/icons/v2/${file}.svg`;

  return (
    <span
      className={className}
      role="img"
      aria-hidden
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
        maskImage: `url(${src})`,
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: 'contain',
        WebkitMaskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        WebkitMaskSize: 'contain',
        backgroundColor: 'currentColor',
        ...style,
      }}
      {...props}
    />
  );
}

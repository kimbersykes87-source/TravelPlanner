// Global variables
// Production mode detection - set to false for verbose debug logging
const IS_PRODUCTION = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const DEBUG_MODE = !IS_PRODUCTION || (window.location.search.includes('debug=true'));

// Centralized logging utility
const logger = {
    debug: (...args) => {
        if (DEBUG_MODE) console.log(...args);
    },
    info: (...args) => {
        if (DEBUG_MODE) console.log(...args);
    },
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    // Always log important status messages
    status: (...args) => console.log(...args)
};

let currentData = {
    profiles: [],
    countries: [],
    relationshipLog: [],
    presentBookings: [],
    futureScenarios: [],
    scenarioStays: [],
    statistics: [],
    toBookTasks: [],
    bookedUpcoming: [],
    bookingTypeMeta: [],
    visaRules: [],
    futureScenarioModels: []
};

let currentTab = 'us';
let worldMap = null;
let currentMonth = new Date();
const BOOKING_EMOJI_MAP = {
    'flight': '✈️',
    'flight/s': '✈️',
    'accommodation': '🏨',
    'hire car': '🚗',
    'car': '🚗',
    'ferry': '⛴️',
    'train': '🚆',
    'transport': '🚆',
    'default': '🗺️'
};
const BOOKING_ICON_MAP = {
    'flight': 'assets/icons/flight.svg',
    'flights': 'assets/icons/flight.svg',
    'flightss': 'assets/icons/flight.svg',
    'accommodation': 'assets/icons/accomodation.svg',
    'accomodation': 'assets/icons/accomodation.svg',
    'stay': 'assets/icons/accomodation.svg',
    'hotel': 'assets/icons/accomodation.svg',
    'hirecar': 'assets/icons/hireCar.svg',
    'carhire': 'assets/icons/hireCar.svg',
    'car': 'assets/icons/hireCar.svg',
    'ferry': 'assets/icons/ferry.svg',
    'train': 'assets/icons/train.svg',
    'rail': 'assets/icons/train.svg'
};
const SCENARIO_CREATOR_OPTIONS = [
    { value: 'kimber', label: 'Kimber' },
    { value: 'siona', label: 'Siona' },
    { value: 'both', label: 'Both of us' }
];
// Get scenario map colors from CSS variables
const SCENARIO_MAP_COLORS = (() => {
    const root = getComputedStyle(document.documentElement);
    return [
        root.getPropertyValue('--color-scenario-map-1').trim() || '#F2E9FF',
        root.getPropertyValue('--color-scenario-map-2').trim() || '#C9A7FF',
        root.getPropertyValue('--color-scenario-map-3').trim() || '#9A6BFF',
        root.getPropertyValue('--color-scenario-map-4').trim() || '#6B31FF',
        root.getPropertyValue('--color-scenario-map-5').trim() || '#2E007A'
    ];
})();
const SCENARIO_CARD_FLAG_LIMIT = 5;
const SCENARIO_ICON_OPTIONS = [
    { value: 'adventure', label: 'Adventure', path: 'assets/scenario-icons/adventure.svg' },
    { value: 'beach', label: 'Beach', path: 'assets/scenario-icons/beach.svg' },
    { value: 'camping', label: 'Camping', path: 'assets/scenario-icons/camping.svg' },
    { value: 'dining', label: 'Dining', path: 'assets/scenario-icons/dining.svg' },
    { value: 'hiking', label: 'Hiking', path: 'assets/scenario-icons/hikiing.svg' },
    { value: 'mountains', label: 'Mountains', path: 'assets/scenario-icons/mountains.svg' },
    { value: 'nature', label: 'Nature', path: 'assets/scenario-icons/nature.svg' },
    { value: 'resort', label: 'Resort', path: 'assets/scenario-icons/resort.svg' },
    { value: 'roadtrip', label: 'Road Trip', path: 'assets/scenario-icons/roadTrip.svg' },
    { value: 'snowboarding', label: 'Snowboarding', path: 'assets/scenario-icons/snowboarding.svg' },
    { value: 'sunny', label: 'Sunny', path: 'assets/scenario-icons/sunny.svg' },
    { value: 'tropical', label: 'Tropical', path: 'assets/scenario-icons/tropical.svg' },
    { value: 'vineyard', label: 'Vineyard', path: 'assets/scenario-icons/vineyard.svg' },
    { value: 'silversprings', label: 'Silver Springs', path: 'assets/scenario-icons/SilverSprings.svg' }
];
const SCENARIO_ACCOMMODATION_ICONS = {
    campervan: '🚐',
    van: '🚐',
    rv: '🚐',
    vanfrito: '🚐',
    vantutu: '🚐',
    house: '🏡',
    home: '🏡',
    privatehouse: '🏡',
    apartment: '🏢',
    hotel: '🏨',
    airbnb: '🏠',
    cabin: '🛖'
};
const SCENARIO_STAY_ACCOMMODATION_OPTIONS = [
    { value: '', label: 'Select accommodation', path: '' },
    { value: 'VanFrito', label: 'VanFrito', path: 'assets/accommodation-icons/vanFrito.svg' },
    { value: 'VanTutu', label: 'VanTutu', path: 'assets/accommodation-icons/vanTutu.svg' },
    { value: 'AirBNB', label: 'AirBNB', path: 'assets/accommodation-icons/airbnb.svg' },
    { value: 'Private House', label: 'Private House', path: 'assets/accommodation-icons/house.svg' },
    { value: 'Hotel', label: 'Hotel', path: 'assets/accommodation-icons/Hotel.svg' }
];
const SPREADSHEET_ID = '1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8';
let currentScenarioFilter = 'all';
let scenarioEditorState = null;
const scenarioValidationCache = new Map();
const scenarioMaps = {};
let scenarioCountryOptionsCache = [];
let activeScenarioIconSelect = null;
let activeScenarioAccommodationSelect = null;
let bookingMetaIndex = null;
let currentConvertTaskId = null;
let currentEditingToBookId = null;
let currentEditingBookingId = null;
const LOCAL_STORAGE_KEYS = {
    toBook: 'travelPlanner.toBookLocal',
    booked: 'travelPlanner.bookedLocal'
};
const WRITE_API_URL = 'https://script.google.com/macros/s/AKfycbw-FAVP_ipImIsN9tJ3gwFCdYWVYrRV7iRH-QQd5bwCGIYOLhewxXXESynuPSqwPPR3/exec';
const WRITE_API_TOKEN = 'KIMBER_SIONA_TRAVEL_PLANNER';
let calendarTooltipEl = null;
const LOCAL_WORLD_GEOJSON_PATH = './assets/data/countries.geojson';
const REMOTE_WORLD_GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
let worldGeoJsonPromise = null;
let countryGeoJsonIndex = null;
let relationshipTimelineCache = null;
let relationshipTimelineMapCache = null;
let relationshipTimelineSourceRef = null;
const scenarioRatingTimers = new Map();
const SCENARIO_RATING_SAVE_DELAY = 30000;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    resetToBookFormState();

    const typeSelect = document.getElementById('toBookType');
    if (typeSelect) {
        typeSelect.addEventListener('change', updateToBookTypeHint);
    }
    
    // Initialize calendar shell if elements already exist
    if (document.getElementById('calendarGrid')) {
    updateCalendar();
    }
    
    // Auto-load data after a short delay
    setTimeout(() => {
        loadData();
    }, 1000);
});

window.addEventListener('beforeunload', () => {
    if (scenarioRatingTimers.size > 0) {
        flushAllScenarioRatingDrafts({ keepalive: true, silent: true });
    }
});

function getLocalStorageSafe() {
    try {
        return window && window.localStorage ? window.localStorage : null;
    } catch (error) {
        console.warn('Local storage unavailable:', error?.message || error);
        return null;
    }
}

function loadLocalEntries(key) {
    const store = getLocalStorageSafe();
    if (!store) return [];
    try {
        const raw = store.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Unable to load local entries for', key, error);
        return [];
    }
}

function saveLocalEntries(key, entries) {
    const store = getLocalStorageSafe();
    if (!store) return;
    try {
        store.setItem(key, JSON.stringify(entries));
    } catch (error) {
        console.warn('Unable to persist local entries for', key, error);
    }
}

function extractRowKey(row, fieldName) {
    if (!row) return '';
    if (Array.isArray(row)) {
        return row[0] || '';
    }
    return row[fieldName] || row[0] || '';
}

function mergeRows(existingRows, localRows, keyName) {
    const map = new Map();
    (Array.isArray(existingRows) ? existingRows : []).forEach(row => {
        const key = extractRowKey(row, keyName);
        if (key) {
            map.set(key, row);
        }
    });
    (Array.isArray(localRows) ? localRows : []).forEach(row => {
        const key = extractRowKey(row, keyName);
        if (key) {
            map.set(key, row);
        }
    });
    return Array.from(map.values());
}

function applyLocalPresentOverrides() {
    const localToBook = loadLocalEntries(LOCAL_STORAGE_KEYS.toBook);
    if (localToBook.length > 0) {
        currentData.toBookTasks = mergeRows(currentData.toBookTasks, localToBook, 'taskId');
    }

    const localBooked = loadLocalEntries(LOCAL_STORAGE_KEYS.booked);
    if (localBooked.length > 0) {
        // Filter out malformed bookings before merging
        const cleanedLocalBooked = localBooked.filter(booking => {
            const normalized = Array.isArray(booking) ? booking[0] : booking.bookingId;
            if (!normalized) return false;
            const bookingId = normalized.toString().trim();
            // Reject malformed bookingIds (containing multiple commas)
            const isMalformed = bookingId.includes(',') && bookingId.split(',').length > 2;
            if (isMalformed) {
                console.warn('Filtering out malformed booking from local storage:', bookingId);
                return false;
            }
            return true;
        });
        
        if (cleanedLocalBooked.length < localBooked.length) {
            // Some malformed bookings were removed, update local storage
            const locals = cleanedLocalBooked.filter(row => !Array.isArray(row) && row.__local);
            saveLocalEntries(LOCAL_STORAGE_KEYS.booked, locals);
        }
        
        currentData.bookedUpcoming = mergeRows(currentData.bookedUpcoming, cleanedLocalBooked, 'bookingId');
    }
}

function persistLocalToBook() {
    const locals = (currentData.toBookTasks || []).filter(row => !Array.isArray(row) && row.__local);
    saveLocalEntries(LOCAL_STORAGE_KEYS.toBook, locals);
}

function persistLocalBooked() {
    const locals = (currentData.bookedUpcoming || []).filter(row => !Array.isArray(row) && row.__local);
    saveLocalEntries(LOCAL_STORAGE_KEYS.booked, locals);
}

async function persistToBookRemote(task) {
    if (!task) return { success: false, error: 'No task payload supplied.' };
    if (!isWriteApiConfigured()) {
        return { skipped: true };
    }

    try {
        const payload = new URLSearchParams();
        payload.append('token', WRITE_API_TOKEN);
        payload.append('action', 'upsertToBook');
        payload.append('toBook', JSON.stringify({
            taskId: task.taskId,
            assignee: task.assignee,
            bookingType: task.bookingType,
            startDate: task.startDate,
            endDate: task.endDate,
            instruction: task.instruction,
            deadline: task.deadline,
            notes: task.notes,
            status: task.status || 'pending',
            createdAt: task.createdAt,
            updatedAt: task.updatedAt || new Date().toISOString()
        }));

        const response = await fetch(WRITE_API_URL, {
            method: 'POST',
            body: payload
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.warn('Unable to parse To Book write response:', parseError, text);
            data = { success: false, raw: text };
        }

        if (!response.ok) {
            return { success: false, status: response.status, data };
        }

        return data;
    } catch (error) {
        console.error('persistToBookRemote error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

function isWriteApiConfigured() {
    return WRITE_API_URL && WRITE_API_TOKEN &&
        !WRITE_API_URL.includes('REPLACE_WITH') &&
        !WRITE_API_TOKEN.includes('REPLACE_WITH');
}

async function persistBookedToRemote(bookingRow, options = {}) {
    if (!bookingRow) {
        return { success: false, error: 'No booking payload supplied.' };
    }

    if (!isWriteApiConfigured()) {
        return { skipped: true };
    }

    try {
        const formData = new URLSearchParams();
        formData.append('token', WRITE_API_TOKEN);
        formData.append('action', 'upsertBooked');
        formData.append('booking', JSON.stringify({
            bookingId: bookingRow.bookingId,
            bookingType: bookingRow.bookingType,
            headline: bookingRow.headline,
            details: bookingRow.details,
            startDate: bookingRow.startDate,
            endDate: bookingRow.endDate,
            travellers: bookingRow.travellers,
            confirmationData: bookingRow.confirmationData,
            notes: bookingRow.notes,
            createdFromTask: bookingRow.createdFromTask || '',
            createdAt: bookingRow.createdAt,
            updatedAt: bookingRow.updatedAt || new Date().toISOString()
        }));
        formData.append('sourceTaskId', options?.sourceTaskId || '');

        const response = await fetch(WRITE_API_URL, {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.warn('Unable to parse booking write response:', parseError, text);
            data = { success: false, raw: text };
        }

        if (!response.ok) {
            return { success: false, status: response.status, data };
        }

        return data;
    } catch (error) {
        console.error('persistBookedToRemote error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function deleteBookedRemote(bookingId) {
    if (!bookingId) {
        return { success: false, error: 'No bookingId supplied.' };
    }
    if (!isWriteApiConfigured()) {
        return { skipped: true };
    }

    try {
        const formData = new URLSearchParams();
        formData.append('token', WRITE_API_TOKEN);
        formData.append('action', 'deleteBooked');
        formData.append('bookingId', bookingId);

        const response = await fetch(WRITE_API_URL, {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.warn('Unable to parse booking delete response:', parseError, text);
            data = { success: false, raw: text };
        }

        if (!response.ok) {
            return { success: false, status: response.status, data };
        }

        return data;
    } catch (error) {
        console.error('deleteBookedRemote error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function validateScenarioRemote(payload) {
    if (!isWriteApiConfigured()) {
        return { success: false, error: 'Write API not configured.' };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('token', WRITE_API_TOKEN);
        formData.append('action', 'validateScenario');
        formData.append('scenario', JSON.stringify(payload));

        const response = await fetch(WRITE_API_URL, {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.warn('Unable to parse scenario validation response:', parseError, text);
            data = { success: false, raw: text };
        }

        if (!response.ok) {
            return { success: false, status: response.status, data };
        }
        return data;
    } catch (error) {
        console.error('validateScenarioRemote error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function upsertScenarioRemote(payload, options = {}) {
    if (!isWriteApiConfigured()) {
        return { success: false, error: 'Write API not configured.' };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('token', WRITE_API_TOKEN);
        formData.append('action', 'upsertScenario');
        formData.append('scenario', JSON.stringify(payload));

        const fetchOptions = {
            method: 'POST',
            body: formData
        };
        if (options.keepalive) {
            fetchOptions.keepalive = true;
        }

        const response = await fetch(WRITE_API_URL, fetchOptions);

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.warn('Unable to parse scenario save response:', parseError, text);
            data = { success: false, raw: text };
        }

        if (!response.ok) {
            return { success: false, status: response.status, data };
        }

        return data;
    } catch (error) {
        console.error('upsertScenarioRemote error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function deleteScenarioRemote(scenarioId) {
    if (!isWriteApiConfigured()) {
        return { success: false, error: 'Write API not configured.' };
    }
    if (!scenarioId) {
        return { success: false, error: 'scenarioId must be supplied.' };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('token', WRITE_API_TOKEN);
        formData.append('action', 'deleteScenario');
        formData.append('scenarioId', scenarioId);

        const response = await fetch(WRITE_API_URL, {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.warn('Unable to parse scenario delete response:', parseError, text);
            data = { success: false, raw: text };
        }

        if (!response.ok) {
            return { success: false, status: response.status, data };
        }

        return data;
    } catch (error) {
        console.error('deleteScenarioRemote error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

// Debug function to check data loading
function debugDataLoading() {
    logger.debug('🔍 DEBUG: Current data status:');
    logger.debug('Profiles:', currentData.profiles?.length || 0, 'entries');
    logger.debug('Countries:', currentData.countries?.length || 0, 'entries');
    logger.debug('RelationshipLog:', currentData.relationshipLog?.length || 0, 'entries');
    logger.debug('PresentBookings:', currentData.presentBookings?.length || 0, 'entries');
    logger.debug('FutureScenarios:', currentData.futureScenarios?.length || 0, 'entries');
    logger.debug('ScenarioStays:', currentData.scenarioStays?.length || 0, 'entries');
    logger.debug('Statistics:', currentData.statistics?.length || 0, 'entries');
    logger.debug('ToBookTasks:', currentData.toBookTasks?.length || 0, 'entries');
    logger.debug('BookedUpcoming:', currentData.bookedUpcoming?.length || 0, 'entries');
    logger.debug('BookingTypeMeta:', currentData.bookingTypeMeta?.length || 0, 'entries');
    logger.debug('VisaRules:', currentData.visaRules?.length || 0, 'entries');
    
    if (DEBUG_MODE) {
        if (currentData.relationshipLog && currentData.relationshipLog.length > 0) {
            logger.debug('📊 RelationshipLog sample:', currentData.relationshipLog.slice(0, 3));
        }
        if (currentData.statistics && currentData.statistics.length > 0) {
            logger.debug('📊 Statistics sample:', currentData.statistics.slice(0, 3));
        }
        if (currentData.futureScenarioModels && currentData.futureScenarioModels.length > 0) {
            logger.debug('📊 FutureScenarioModels sample:', currentData.futureScenarioModels.slice(0, 1));
        }
    }
}

// Make debug function available globally
window.debugDataLoading = debugDataLoading;

// Date formatting helpers
function parseISOToLocalDate(isoDate) {
    if (!isoDate) return null;
    // Robustly parse YYYY-MM-DD without timezone shifts
    if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        const [y, m, d] = isoDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    if (typeof isoDate === 'string') {
        const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const [, y, m, d] = match;
            return new Date(Number(y), Number(m) - 1, Number(d));
        }
    }
    const d = new Date(isoDate);
    if (isNaN(d)) return null;
    return d;
}

function formatLongDate(isoDate) {
    const d = parseISOToLocalDate(isoDate);
    if (!d) return isoDate || '';
    const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDDMMYYYY(isoDate) {
    const d = parseISOToLocalDate(isoDate);
    if (!d) return isoDate || '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

function formatDDMMYY(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : parseISOToLocalDate(date);
    if (!d || isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
}

// Create personalized fallback avatar with initials
function createFallbackAvatar(fullName) {
    const initials = fullName.split(' ').map(name => name.charAt(0)).join('').toUpperCase();
    // Get avatar colors from CSS variables
    const root = getComputedStyle(document.documentElement);
    const colors = [
        root.getPropertyValue('--color-avatar-1').trim() || '#FF6B6B',
        root.getPropertyValue('--color-avatar-2').trim() || '#4ECDC4',
        root.getPropertyValue('--color-avatar-3').trim() || '#45B7D1',
        root.getPropertyValue('--color-avatar-4').trim() || '#96CEB4',
        root.getPropertyValue('--color-avatar-5').trim() || '#FFEAA7',
        root.getPropertyValue('--color-avatar-6').trim() || '#DDA0DD',
        root.getPropertyValue('--color-avatar-7').trim() || '#98D8C8',
        root.getPropertyValue('--color-avatar-8').trim() || '#F7DC6F'
    ];
    const colorIndex = fullName.length % colors.length;
    const backgroundColor = colors[colorIndex];
    
    const svg = `
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="40" fill="${backgroundColor}"/>
            <text x="40" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">${initials}</text>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Get GitHub profile picture URL as fallback
function getGitHubProfileUrl(fullName) {
    const name = fullName.toLowerCase();
    if (name.includes('kimber')) {
        return 'https://raw.githubusercontent.com/kimbersykes87-source/TravelPlanner/main/Kimber_Profile_Pic.jpg';
    } else if (name.includes('siona')) {
        return 'https://raw.githubusercontent.com/kimbersykes87-source/TravelPlanner/main/Siona_Profile_Pic.jpg';
    }
    return null;
}

// Override profile picture URLs to use GitHub directly
function getProfilePictureUrl(profilePicUrl, fullName) {
    // Use GitHub URLs directly since they're more reliable
    const githubUrl = getGitHubProfileUrl(fullName);
    return githubUrl || profilePicUrl;
}

// Configuration functions
function showStatus(message, type = 'success') {
    const status = document.getElementById('status');
    if (type === 'loading') {
        document.body.classList.add('cursor-busy');
        status.className = 'status loading';
        status.innerHTML = `
            <div class="loading">
                <img src="assets/icons/simplePlane.svg" alt="Loading" class="loading-plane">
                <div class="loading-text">${message}</div>
            </div>
        `;
    } else {
        document.body.classList.remove('cursor-busy');
        status.textContent = message;
        status.className = `status ${type}`;
        if (type === 'success') {
            setTimeout(() => {
                try { hideStatus(); } catch (e) {}
            }, 2000);
        }
    }
    status.classList.remove('hidden');
}

function hideStatus() {
    document.body.classList.remove('cursor-busy');
    document.getElementById('status').classList.add('hidden');
}

function showToastSpinner(message) {
    const spinner = document.getElementById('toastSpinner');
    const text = document.getElementById('toastSpinnerText');
    if (spinner && text) {
        text.textContent = message || 'Loading...';
        spinner.classList.remove('hidden');
    }
}

function hideToastSpinner() {
    const spinner = document.getElementById('toastSpinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}


function toggleMapFullscreen() {
    const mapContainer = document.querySelector('.map-container');
    const fullscreenIcon = document.getElementById('fullscreenIcon');
    
    if (mapContainer.classList.contains('fullscreen')) {
        // Exit fullscreen
        mapContainer.classList.remove('fullscreen');
        fullscreenIcon.textContent = '⛶';
        document.body.style.overflow = 'auto';
    } else {
        // Enter fullscreen
        mapContainer.classList.add('fullscreen');
        fullscreenIcon.textContent = '✕';
        document.body.style.overflow = 'hidden';
        
        // Refresh map size when entering fullscreen
        setTimeout(() => {
            if (worldMap) {
                worldMap.invalidateSize();
            }
        }, 100);
    }
}

function showServerInstructions() {
    // Config panel removed, just log to console
    console.log('Run a local server if you encounter CORS issues');
}

async function testConnection() {
    // Hardcoded API key and spreadsheet ID
    const apiKey = 'AIzaSyC-gqtpKGeG1c9AVMWWrVKbcS60XWlm9zk';
    const spreadsheetId = '1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8';

    if (!apiKey || !spreadsheetId) {
        showStatus('Please enter both API Key and Spreadsheet ID', 'error');
        return;
    }

    showStatus('Testing connection...', 'loading');

    try {
        // Use centralized proxy list
        const proxies = CORS_PROXIES;
        
        let response;
        let lastError;
        
        for (const proxy of proxies) {
            try {
                const url = proxy + encodeURIComponent(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`);
                response = await fetch(url);
                if (response.ok) break;
            } catch (error) {
                lastError = error;
                continue;
            }
        }
        
        if (response && response.ok) {
            showStatus('✅ Connection successful! Ready to load data.', 'success');
        } else {
            throw lastError || new Error('All proxy services failed');
        }
        
    } catch (error) {
        showStatus(`❌ Connection failed: ${error.message}`, 'error');
    }
}
async function loadData() {
    showStatus('Loading your amazing adventures', 'loading');

    try {
        // Try to use Cloudflare Pages API first (if available)
        // Falls back to individual CORS proxy requests if not on Cloudflare Pages
        const useCloudflareAPI = await tryCloudflarePagesAPI();
        
        if (useCloudflareAPI) {
            logger.debug('Using Cloudflare Pages API for data loading');
            // Data already loaded in tryCloudflarePagesAPI, just initialize app
            resetBookingMetaIndex();
            initializeApp();
            showStatus('All of your amazing adventures have been loaded', 'success');
            document.getElementById('mainApp').classList.remove('hidden');
            return;
        }
        
        // Fallback to individual sheet loading via CORS proxy
        logger.debug('Using CORS proxy fallback for data loading');
        const spreadsheetId = SPREADSHEET_ID;
        
        // Load all sheets with individual error handling
        const dataPromises = [
            { name: 'Profiles', promise: loadSheetData(spreadsheetId, 'Profiles') },
            { name: 'Countries', promise: loadSheetData(spreadsheetId, 'Countries') },
            { name: 'RelationshipLog', promise: loadSheetData(spreadsheetId, 'RelationshipLog') },
            { name: 'PresentBookings', promise: loadSheetData(spreadsheetId, 'PresentBookings') },
            { name: 'FutureScenarios', promise: loadSheetData(spreadsheetId, 'FutureScenarios') },
            { name: 'ScenarioStays', promise: loadSheetData(spreadsheetId, 'ScenarioStays') },
            { name: 'Statistics', promise: loadSheetData(spreadsheetId, 'Statistics') },
            { name: 'ToBook', promise: loadSheetData(spreadsheetId, 'ToBook') },
            { name: 'BookedUpcoming', promise: loadSheetData(spreadsheetId, 'BookedUpcoming') },
            { name: 'BookingTypeMeta', promise: loadSheetData(spreadsheetId, 'BookingTypeMeta') },
            { name: 'VisaRules', promise: loadSheetData(spreadsheetId, 'VisaRules') }
        ];

        const results = await Promise.allSettled(dataPromises.map(d => d.promise));

        // Initialize with empty data
        currentData = {
            profiles: [],
            countries: [],
            relationshipLog: [],
            presentBookings: [],
            futureScenarios: [],
            scenarioStays: [],
            statistics: [],
            toBookTasks: [],
            bookedUpcoming: [],
            bookingTypeMeta: [],
            visaRules: [],
            futureScenarioModels: []
        };

        let successCount = 0;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const dataName = dataPromises[index].name;
                const data = result.value;
                // Convert to camelCase for consistent access
                const camelCaseKey = dataName.charAt(0).toLowerCase() + dataName.slice(1);
                logger.debug(`🔍 DEBUG: Converting "${dataName}" to "${camelCaseKey}"`);
                
                // Handle special cases for proper camelCase
                let finalKey = camelCaseKey;
                if (dataName === 'RelationshipLog') finalKey = 'relationshipLog';
                else if (dataName === 'PresentBookings') finalKey = 'presentBookings';
                else if (dataName === 'FutureScenarios') finalKey = 'futureScenarios';
                else if (dataName === 'ScenarioStays') finalKey = 'scenarioStays';
                else if (dataName === 'ToBook') finalKey = 'toBookTasks';
                else if (dataName === 'BookedUpcoming') finalKey = 'bookedUpcoming';
                else if (dataName === 'BookingTypeMeta') finalKey = 'bookingTypeMeta';
                else if (dataName === 'VisaRules') finalKey = 'visaRules';
                else if (dataName === 'ToBook') finalKey = 'toBookTasks';
                else if (dataName === 'BookedUpcoming') finalKey = 'bookedUpcoming';
                else if (dataName === 'BookingTypeMeta') finalKey = 'bookingTypeMeta';
                
                logger.debug(`🔍 DEBUG: Final key: "${finalKey}"`);
                if (data && data.length > 0) {
                    let cleanedData = data.slice(1);
                    
                    // Clean up malformed bookings from BookedUpcoming data
                    if (finalKey === 'bookedUpcoming') {
                        const originalLength = cleanedData.length;
                        cleanedData = cleanedData.filter(row => {
                            if (!row || !Array.isArray(row) || row.length === 0) return false;
                            const bookingId = (row[0] || '').toString().trim();
                            // Reject malformed bookingIds (containing multiple commas - CSV parsing error)
                            const isMalformed = bookingId.includes(',') && bookingId.split(',').length > 2;
                            if (isMalformed) {
                                logger.warn(`⚠️ Filtering out malformed booking from sheet: ${bookingId.substring(0, 50)}...`);
                                return false;
                            }
                            return true;
                        });
                        
                        if (cleanedData.length < originalLength) {
                            logger.warn(`⚠️ Removed ${originalLength - cleanedData.length} malformed booking(s) from BookedUpcoming`);
                        }
                    }
                    
                    currentData[finalKey] = cleanedData;
                    successCount++;
                    logger.status(`✅ ${dataName} loaded successfully: ${cleanedData.length} rows`);
                } else {
                    logger.warn(`⚠️ ${dataName} loaded but empty`);
                    currentData[finalKey] = [];
                }
            } else {
                logger.error(`❌ Failed to load ${dataPromises[index].name}:`, result.reason);
                const dataName = dataPromises[index].name;
                let finalKey = dataName.charAt(0).toLowerCase() + dataName.slice(1);
                if (dataName === 'RelationshipLog') finalKey = 'relationshipLog';
                else if (dataName === 'PresentBookings') finalKey = 'presentBookings';
                else if (dataName === 'FutureScenarios') finalKey = 'futureScenarios';
                else if (dataName === 'ScenarioStays') finalKey = 'scenarioStays';
                else if (dataName === 'VisaRules') finalKey = 'visaRules';
                currentData[finalKey] = [];
            }
        });

        if (successCount === 0) {
            throw new Error('Failed to load any data. Please check your internet connection and try again.');
        }

        resetBookingMetaIndex();

        // Debug: Log what data we actually have (only in debug mode)
        logger.debug('🔍 DEBUG: Current data structure:');
        logger.debug('Profiles:', currentData.profiles?.length || 0, 'entries');
        logger.debug('Countries:', currentData.countries?.length || 0, 'entries');
        logger.debug('RelationshipLog:', currentData.relationshipLog?.length || 0, 'entries');
        logger.debug('PresentBookings:', currentData.presentBookings?.length || 0, 'entries');
        logger.debug('FutureScenarios:', currentData.futureScenarios?.length || 0, 'entries');
        logger.debug('ScenarioStays:', currentData.scenarioStays?.length || 0, 'entries');
        logger.debug('VisaRules:', currentData.visaRules?.length || 0, 'entries');
        logger.debug('Statistics:', currentData.statistics?.length || 0, 'entries');
        logger.debug('ToBookTasks:', currentData.toBookTasks?.length || 0, 'entries');
        logger.debug('BookedUpcoming:', currentData.bookedUpcoming?.length || 0, 'entries');
        logger.debug('BookingTypeMeta:', currentData.bookingTypeMeta?.length || 0, 'entries');
        
        // Show detailed data for debugging (only in debug mode)
        if (DEBUG_MODE) {
            Object.keys(currentData).forEach(key => {
                const data = currentData[key];
                if (data && data.length > 0) {
                    logger.debug(`📊 ${key} data (first 3 rows):`, data.slice(0, 3));
                } else {
                    logger.debug(`⚠️ ${key} is empty or undefined`);
                }
            });
            
            // Debug all loaded data
            logger.debug('🔍 All loaded data keys:', Object.keys(currentData));
            logger.debug('🔍 Data lengths:', {
                profiles: currentData.profiles?.length || 0,
                countries: currentData.countries?.length || 0,
                relationshipLog: currentData.relationshipLog?.length || 0,
                presentBookings: currentData.presentBookings?.length || 0,
                futureScenarios: currentData.futureScenarios?.length || 0,
                scenarioStays: currentData.scenarioStays?.length || 0,
                statistics: currentData.statistics?.length || 0,
                toBookTasks: currentData.toBookTasks?.length || 0,
                bookedUpcoming: currentData.bookedUpcoming?.length || 0,
                bookingTypeMeta: currentData.bookingTypeMeta?.length || 0,
                visaRules: currentData.visaRules?.length || 0
            });
        }
        
        applyLocalPresentOverrides();
        hydrateFutureScenarioModels();
        refreshScenarioCountryOptions();
        // Call debug function to show current status
        debugDataLoading();

        // Initialize the application
        resetBookingMetaIndex();
        initializeApp();
        showStatus('All of your amazing adventures have been loaded', 'success');
        
        // Show main app
        document.getElementById('mainApp').classList.remove('hidden');

    } catch (error) {
        console.error('Error loading data:', error);
        showStatus(`❌ Failed to load data: ${error.message}`, 'error');
        
        // Initialize with empty data to prevent further errors
        currentData = {
            profiles: [],
            countries: [],
            relationshipLog: [],
            presentBookings: [],
            futureScenarios: [],
            statistics: [],
            toBookTasks: [],
            bookedUpcoming: [],
            bookingTypeMeta: []
        };
        applyLocalPresentOverrides();
        hydrateFutureScenarioModels();
        refreshScenarioCountryOptions();
        initializeApp();
        document.getElementById('mainApp').classList.remove('hidden');
    }
}
/**
 * Try to load data from Cloudflare Pages API
 * Returns true if successful, false otherwise
 */
async function tryCloudflarePagesAPI() {
    try {
        // Try to fetch from Cloudflare Pages Function
        const response = await fetch('/api/sheets', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            logger.debug('Cloudflare Pages API not available:', response.status);
            return false;
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // Map the API response data to currentData structure
            currentData = {
                profiles: result.data.profiles || [],
                countries: result.data.countries || [],
                relationshipLog: result.data.relationshipLog || [],
                presentBookings: result.data.presentBookings || [],
                futureScenarios: result.data.futureScenarios || [],
                scenarioStays: result.data.scenarioStays || [],
                statistics: result.data.statistics || [],
                toBookTasks: result.data.toBookTasks || [],
                bookedUpcoming: result.data.bookedUpcoming || [],
                bookingTypeMeta: result.data.bookingTypeMeta || [],
                visaRules: result.data.visaRules || [],
                futureScenarioModels: []
            };
            
            // Log errors if any sheets failed
            if (result.errors && Object.keys(result.errors).length > 0) {
                logger.warn('Some sheets failed to load via API:', result.errors);
            }
            
            logger.status('✅ Data loaded via Cloudflare Pages API');
            return true;
        } else {
            logger.debug('Cloudflare Pages API returned unsuccessful response');
            return false;
        }
    } catch (error) {
        // API not available or error - fall back to CORS proxy
        logger.debug('Cloudflare Pages API not available, using fallback:', error.message);
        return false;
    }
}

// Centralized CORS proxy list - prioritized by reliability
// Note: api.allorigins.win is unreliable, so we prioritize corsproxy.io
const CORS_PROXIES = [
    'https://corsproxy.io/?',  // Most reliable based on logs
    'https://api.allorigins.win/raw?url=',  // Fallback (often fails but sometimes works)
    'https://thingproxy.freeboard.io/fetch/',  // Alternative
    'https://api.codetabs.com/v1/proxy?quest='  // Alternative
];

async function loadSheetData(spreadsheetId, sheetName) {
    try {
        // Use Google Sheets CSV export URL with CORS proxy
        const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
        
        // Use centralized proxy list
        const proxies = CORS_PROXIES;
        
        let csvText = '';
        let lastError = null;
        
        for (let i = 0; i < proxies.length; i++) {
            const proxy = proxies[i];
            try {
                const url = proxy + encodeURIComponent(baseUrl);
                logger.debug(`🔄 Loading ${sheetName} from: ${url}`);
                
                const response = await fetch(url);
                if (!response.ok) {
                    logger.debug(`❌ Proxy failed: ${proxy} - HTTP ${response.status}`);
                    continue;
                }
                
                csvText = await response.text();
                logger.status(`✅ ${sheetName} loaded: ${csvText.length} characters`);
                
                // Check if we got actual data or an error page
                if (csvText.includes('This browser version is no longer supported') || 
                    csvText.includes('Access denied') || 
                    csvText.includes('CORS') ||
                    csvText.includes('Cross-Origin') ||
                    csvText.length < 100) {
                    logger.debug(`❌ ${sheetName} returned error page, trying next proxy`);
                    if (DEBUG_MODE) {
                        logger.debug(`❌ Error content preview: ${csvText.substring(0, 200)}`);
                    }
                    continue;
                }
                
                // Success! Log which proxy worked (for debugging)
                if (i > 0) {
                    logger.debug(`✅ ${sheetName} loaded successfully using fallback proxy #${i + 1}`);
                }
                break;
                
            } catch (error) {
                logger.debug(`❌ Proxy ${proxy} failed:`, error.message);
                lastError = error;
                continue;
            }
        }
        
        if (!csvText) {
            logger.error(`❌ All CORS proxies failed for ${sheetName}`);
            logger.error('Last error:', lastError);
            
            // Show user-friendly error message (only in production or if critical)
            if (IS_PRODUCTION) {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    position: fixed; top: 20px; right: 20px; z-index: 10000;
                    background: #ff4444; color: white; padding: 15px; border-radius: 5px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 300px;
                `;
                errorDiv.innerHTML = `
                    <strong>CORS Error</strong><br>
                    Unable to load data from Google Sheets.<br>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px; background: white; color: #ff4444; border: none; border-radius: 3px; cursor: url('assets/cursor/link%20select.ani'), pointer;">
                        Retry
                    </button>
                `;
                document.body.appendChild(errorDiv);
            }
            
            throw new Error(`All proxies failed. Last error: ${lastError?.message || 'Unknown error'}`);
        }
        
        // Debug the first few lines of the CSV
        const lines = csvText.split('\n');
        logger.debug(`📊 ${sheetName} CSV preview (first 3 lines):`, lines.slice(0, 3));
        
        // Convert CSV to array of arrays
        // Handles escaped quotes ("" inside quoted fields) properly
        const data = lines.map(line => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = i + 1 < line.length ? line[i + 1] : '';
                
                // Handle escaped quotes ("" inside quoted field = single quote)
                if (char === '"' && nextChar === '"' && inQuotes) {
                    current += '"'; // Add single quote character
                    i++; // Skip the next quote character
                } else if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            
            result.push(current);
            return result;
        });
        
        logger.debug(`📊 ${sheetName} parsed: ${data.length} rows`);
        return data;
        
    } catch (error) {
        logger.error(`❌ Error loading ${sheetName}:`, error);
        throw error;
    }
}

function initializeApp() {
    // Initialize all tabs
    loadUsTab();
    loadPastTab();
    loadPresentTab();
    loadFutureTab();
}
// Country Name Standardization System
// This system maps common country name variations to standardized 3-letter codes
const countryNameMapping = {
    // United States variations (enhanced)
    'United States': 'USA',
    'United States of America': 'USA',
    'US': 'USA',
    'USA': 'USA',
    'America': 'USA',
    'U.S.': 'USA',
    'U.S.A.': 'USA',
    'U.S.A': 'USA',
    'United States of America (USA)': 'USA',
    'US of A': 'USA',
    
    // United Kingdom variations
    'United Kingdom': 'GBR',
    'UK': 'GBR',
    'Great Britain': 'GBR',
    'Britain': 'GBR',
    'England': 'GBR',
    'Scotland': 'GBR',
    'Wales': 'GBR',
    'Northern Ireland': 'GBR',
    
    // Serbia variations (enhanced)
    'Serbia': 'SRB',
    'Republic of Serbia': 'SRB',
    'Serbian': 'SRB',
    'Serbia and Montenegro': 'SRB', // Historical reference
    
    // Vietnam variations (enhanced)
    'Vietnam': 'VNM',
    'Viet Nam': 'VNM',
    'Socialist Republic of Vietnam': 'VNM',
    'Vietnam (Socialist Republic)': 'VNM',
    'Việt Nam': 'VNM',
    'Vietnam, Socialist Republic of': 'VNM',
    
    // Morocco variations
    'Morocco': 'MAR',
    'Kingdom of Morocco': 'MAR',
    'Moroccan': 'MAR',

    // Common Europe destinations
    'Spain': 'ESP',
    'Kingdom of Spain': 'ESP',
    'Andorra': 'AND',
    'Principality of Andorra': 'AND',
    'Portugal': 'PRT',
    'Portuguese Republic': 'PRT',
    
    // Add more common variations as needed
    'South Korea': 'KOR',
    'Republic of Korea': 'KOR',
    'Korea': 'KOR',
    'South Africa': 'ZAF',
    'Republic of South Africa': 'ZAF',
    'Czech Republic': 'CZE',
    'Czechia': 'CZE',
    'Slovakia': 'SVK',
    'Slovak Republic': 'SVK',
    'Netherlands': 'NLD',
    'Holland': 'NLD',
    'United Arab Emirates': 'ARE',
    'UAE': 'ARE',
    'Russia': 'RUS',
    'Russian Federation': 'RUS',
    'China': 'CHN',
    'People\'s Republic of China': 'CHN',
    'Taiwan': 'TWN',
    'Republic of China': 'TWN',
    'Hong Kong': 'HKG',
    'Hong Kong SAR': 'HKG',
    'Kosovo': 'XKX',
    'Republic of Kosovo': 'XKX',
    'North Macedonia': 'MKD',
    'Republic of North Macedonia': 'MKD',
    'Macedonia': 'MKD',
    
    // Additional missing countries
    'East Timor': 'TLS',
    'Timor-Leste': 'TLS',
    'Democratic Republic of Timor-Leste': 'TLS',
    'United Republic of Tanzania': 'TZA',
    'Tanzania': 'TZA',
    'West Bank': 'PSE',
    'Palestine': 'PSE',
    'State of Palestine': 'PSE',
    'Palestinian Territory': 'PSE',
'Somaliland': 'SOM',
'Swaziland': 'SWZ',
'Syria': 'SYR',
'Syrian Arab Republic': 'SYR',
'Puerto Rico': 'PRI',
'North Korea': 'PRK',
'Democratic People\'s Republic of Korea': 'PRK',
'Western Sahara': 'ESH',
'Sahrawi Arab Democratic Republic': 'ESH',

// Additional missing countries from user report
'New Caledonia': 'NCL',
'Laos': 'LAO',
'Lao People\'s Democratic Republic': 'LAO',
'Greenland': 'GRL',
'Guinea-Bissau': 'GNB',
'Guinea Bissau': 'GNB',
'Falkland Islands': 'FLK',
'Islas Malvinas': 'FLK',
'Northern Cyprus': 'CYP',
'Republic of Congo': 'COG',
'Congo': 'COG',
'Republic of the Congo': 'COG',
'Democratic Republic of Congo': 'COD',
'Democratic Republic of the Congo': 'COD',
'DRC': 'COD',
'Congo-Kinshasa': 'COD',
'Ivory Coast': 'CIV',
'Côte d\'Ivoire': 'CIV',
'The Bahamas': 'BHS',
'Bahamas': 'BHS',
'French Southern and Antarctic Lands': 'ATF',
'Antarctica': 'ATA',

// Additional common country variations that may cause standardization issues
'Myanmar': 'MMR',
'Burma': 'MMR',
'Republic of the Union of Myanmar': 'MMR',
'Myanmar (Burma)': 'MMR',

'Iran': 'IRN',
'Islamic Republic of Iran': 'IRN',
'Iran, Islamic Republic of': 'IRN',

'Libya': 'LBY',
'State of Libya': 'LBY',
'Libyan Arab Jamahiriya': 'LBY',

'Sudan': 'SDN',
'Republic of the Sudan': 'SDN',

'South Sudan': 'SSD',
'Republic of South Sudan': 'SSD',

'Venezuela': 'VEN',
'Bolivarian Republic of Venezuela': 'VEN',

'Bolivia': 'BOL',
'Plurinational State of Bolivia': 'BOL',

'Brunei': 'BRN',
'Brunei Darussalam': 'BRN',
'Nation of Brunei, the Abode of Peace': 'BRN',

'Moldova': 'MDA',
'Republic of Moldova': 'MDA',
'Moldova, Republic of': 'MDA',

'Belarus': 'BLR',
'Republic of Belarus': 'BLR',
'Byelorussia': 'BLR',

'Switzerland': 'CHE',
'Swiss Confederation': 'CHE',

'Luxembourg': 'LUX',
'Grand Duchy of Luxembourg': 'LUX',

'Monaco': 'MCO',
'Principality of Monaco': 'MCO',

'Liechtenstein': 'LIE',
'Principality of Liechtenstein': 'LIE',

'San Marino': 'SMR',
'Republic of San Marino': 'SMR',

'Vatican City': 'VAT',
'Vatican': 'VAT',
'Holy See': 'VAT',
'Vatican City State': 'VAT',

'Maldives': 'MDV',
'Republic of Maldives': 'MDV',

'Mauritius': 'MUS',
'Republic of Mauritius': 'MUS',

'Seychelles': 'SYC',
'Republic of Seychelles': 'SYC',

'Cape Verde': 'CPV',
'Cabo Verde': 'CPV',
'Republic of Cabo Verde': 'CPV',

'São Tomé and Príncipe': 'STP',
'Sao Tome and Principe': 'STP',
'Democratic Republic of São Tomé and Príncipe': 'STP',

'Trinidad and Tobago': 'TTO',
'Republic of Trinidad and Tobago': 'TTO',

'Saint Kitts and Nevis': 'KNA',
'Federation of Saint Kitts and Nevis': 'KNA',
'St. Kitts and Nevis': 'KNA',

'Saint Vincent and the Grenadines': 'VCT',
'St. Vincent and the Grenadines': 'VCT',

'Saint Lucia': 'LCA',
'St. Lucia': 'LCA',

'Antigua and Barbuda': 'ATG',

'Bosnia and Herzegovina': 'BIH',
'Bosnia-Herzegovina': 'BIH',

'Papua New Guinea': 'PNG',
'Independent State of Papua New Guinea': 'PNG',

'Solomon Islands': 'SLB',

'Marshall Islands': 'MHL',
'Republic of the Marshall Islands': 'MHL',

'Micronesia': 'FSM',
'Federated States of Micronesia': 'FSM',

'Palau': 'PLW',
'Republic of Palau': 'PLW',

'Comoros': 'COM',
'Union of the Comoros': 'COM',

'Eswatini': 'SWZ',
'Kingdom of Eswatini': 'SWZ',
'Swaziland': 'SWZ' // Legacy name
};

// Function to standardize country names to 3-letter codes
function standardizeCountryName(countryName) {
    if (!countryName) return null;
    
    // Normalize input - trim whitespace
    const trimmed = countryName.toString().trim();
    if (!trimmed) return null;
    
    // First check direct mapping (exact match)
    const directMatch = countryNameMapping[trimmed];
    if (directMatch) return directMatch;
    
    // Check case-insensitive mapping
    const lowerName = trimmed.toLowerCase();
    for (const [key, value] of Object.entries(countryNameMapping)) {
        if (key.toLowerCase() === lowerName) {
            return value;
        }
    }
    
    const upper = trimmed.toUpperCase();
    if (upper.length === 3 && /^[A-Z]{3}$/.test(upper)) {
        return upper;
    }
    if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
        if (currentData.countries) {
            const match = currentData.countries.find(row => (row[2] || '').toString().toUpperCase() === upper);
            if (match) {
                return (match[1] || '').toString().toUpperCase() || upper;
            }
        }
        return upper;
    }
    
    // If no mapping found, try to find in countries data
    if (currentData.countries) {
        const country = currentData.countries.find(c => {
            const name = c[0]; // Country name
            const alpha3 = c[1]; // Alpha3 code
            return name.toLowerCase() === lowerName || 
                   alpha3.toLowerCase() === lowerName;
        });
        if (country) {
            return country[1]; // Return Alpha3 code
        }
    }
    
    // Return original name if no standardization found
    // Only warn in debug mode and skip summary rows
    const countryStr = (countryName || '').toString().trim();
    if (DEBUG_MODE && countryStr && !countryStr.includes('Total') && !countryStr.includes('Updated')) {
        logger.warn(`No standardization found for country: ${countryName}`);
    }
    return countryName;
}

// Function to get proper English name from 3-letter code
function getProperEnglishName(alpha3Code) {
    if (!currentData.countries) return alpha3Code;
    
    const country = currentData.countries.find(c => c[1] === alpha3Code);
    return country ? country[0] : alpha3Code; // Return proper name or code if not found
}

function findCountryEntry(countryInput) {
    if (!currentData.countries || !countryInput) return null;
    const value = (countryInput || '').toString().trim();
    if (!value) return null;

    const countries = currentData.countries;
    const upper = value.toUpperCase();
    const lower = value.toLowerCase();

    let entry = countries.find(row => (row[1] || '').toUpperCase() === upper);
    if (!entry) {
        entry = countries.find(row => (row[2] || '').toUpperCase() === upper);
    }
    if (!entry) {
        entry = countries.find(row => (row[0] || '').toLowerCase() === lower);
    }
    if (!entry) {
        const alpha3 = standardizeCountryName(value);
        if (alpha3 && alpha3.length === 3 && alpha3.toUpperCase() !== upper) {
            entry = countries.find(row => (row[1] || '').toUpperCase() === alpha3.toUpperCase());
        }
    }
    return entry || null;
}

function getCountryDisplay(countryInput) {
    const entry = findCountryEntry(countryInput);
    if (entry) {
        return {
            name: entry[0] || countryInput || '',
            alpha3: entry[1] || '',
            alpha2: entry[2] || '',
            flag: entry[3] || ''
        };
    }
    return {
        name: countryInput || '',
        alpha3: '',
        alpha2: '',
        flag: ''
    };
}

function renderCountryTag(countryName, extraClass = '') {
    const display = getCountryDisplay(countryName);
    const safeName = sanitizeText(display.name);
    const flagMarkup = display.flag ? `<img class="country-flag" src="${sanitizeAttribute(display.flag)}" alt="${safeName} flag">` : '';
    const classes = ['country-tag'];
    if (extraClass) classes.push(extraClass);
    return `<span class="${classes.join(' ')}">${flagMarkup}<span>${safeName}</span></span>`;
}

function renderTimelineCountryChip(countryName, roleLabel = '') {
    if (!countryName) return '';
    const display = getCountryDisplay(countryName);
    const safeName = sanitizeText(display.name);
    const flagMarkup = display.flag ? `<img class="country-flag" src="${sanitizeAttribute(display.flag)}" alt="${safeName} flag">` : '';
    const roleSuffix = roleLabel ? ` <span style="color:#a1a1aa;font-size:0.85em;">(${sanitizeText(roleLabel)})</span>` : '';
    return `<span class="timeline-country-chip">${flagMarkup}<span>${safeName}${roleSuffix}</span></span>`;
}

function renderTimelineCountries(period) {
    if (!period) return '';
    if (period.type === 'together') {
        const country = period.kimberCountry || period.countries;
        return renderTimelineCountryChip(country);
    }
    const chips = [];
    const kimberCountry = period.kimberCountry || (period.countries?.split('/')?.[0] || '').trim();
    const sionaCountry = period.sionaCountry || (period.countries?.split('/')?.[1] || '').trim();
    const kimberChip = renderTimelineCountryChip(kimberCountry, 'Kimber');
    const sionaChip = renderTimelineCountryChip(sionaCountry, 'Siona');
    if (kimberChip) chips.push(kimberChip);
    if (kimberChip && sionaChip) chips.push('<span class="timeline-country-divider">/</span>');
    if (sionaChip) chips.push(sionaChip);
    return chips.join('');
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');

    currentTab = tabName;

    // Initialize specific tab content
    switch(tabName) {
        case 'us':
            loadUsTab();
            break;
        case 'past':
            loadPastTab();
            break;
        case 'present':
            loadPresentTab();
            break;
        case 'future':
            loadFutureTab();
            break;
    }
}


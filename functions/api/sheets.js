/**
 * Cloudflare Pages Function for Google Sheets API proxy
 * This function aggregates all 11 sheet requests into a single response
 * Eliminates CORS issues and reduces network requests from 11 to 1
 * 
 * Usage: GET /api/sheets
 * 
 * Environment Variables Required:
 * - SPREADSHEET_ID (from Cloudflare Pages dashboard)
 */

export async function onRequestGet(context) {
    const { env, request } = context;
    
    // Get spreadsheet ID from environment variable or use default
    const SPREADSHEET_ID = env.SPREADSHEET_ID || '1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8';
    
    // List of all sheets to fetch
    const SHEETS = [
        'Profiles',
        'Countries',
        'RelationshipLog',
        'PresentBookings',
        'FutureScenarios',
        'ScenarioStays',
        'Statistics',
        'ToBook',
        'BookedUpcoming',
        'BookingTypeMeta',
        'VisaRules'
    ];
    
    try {
        // Fetch all sheets in parallel
        const sheetPromises = SHEETS.map(sheetName => 
            fetchSheetData(SPREADSHEET_ID, sheetName)
        );
        
        const results = await Promise.allSettled(sheetPromises);
        
        // Process results and convert to object
        const data = {};
        const errors = {};
        
        results.forEach((result, index) => {
            const sheetName = SHEETS[index];
            const camelCaseKey = convertSheetNameToKey(sheetName);
            
            if (result.status === 'fulfilled') {
                // Skip header row and clean data
                const rawData = result.value;
                let cleanedData = Array.isArray(rawData) && rawData.length > 0 
                    ? rawData.slice(1) 
                    : [];
                
                // Filter out summary rows
                if (camelCaseKey === 'statistics' || camelCaseKey === 'countries') {
                    cleanedData = cleanedData.filter(row => {
                        const firstCol = (row[0] || '').toString().trim();
                        return firstCol && 
                               firstCol !== 'Country' && 
                               firstCol !== 'SUMMARY' &&
                               !firstCol.includes('Total') && 
                               !firstCol.includes('Updated') &&
                               firstCol !== '';
                    });
                }
                
                data[camelCaseKey] = cleanedData;
            } else {
                errors[sheetName] = result.reason?.message || 'Unknown error';
                data[camelCaseKey] = [];
            }
        });
        
        // Return aggregated data with CORS headers
        return new Response(JSON.stringify({
            success: true,
            data,
            errors: Object.keys(errors).length > 0 ? errors : undefined,
            timestamp: new Date().toISOString()
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            }
        });
        
    } catch (error) {
        console.error('Error fetching sheets data:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to fetch sheets data'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

/**
 * Fetch data from a single Google Sheets sheet
 */
async function fetchSheetData(spreadsheetId, sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${sheetName}: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    // Convert CSV to array of arrays
    return parseCSV(csvText);
}

/**
 * Convert CSV text to array of arrays
 */
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    return lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = i + 1 < line.length ? line[i + 1] : '';
            
            // Handle escaped quotes ("" inside quoted field = single quote)
            if (char === '"' && nextChar === '"' && inQuotes) {
                current += '"';
                i++; // Skip the next quote
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
    }).filter(row => row.length > 0 || row.some(cell => cell.trim() !== ''));
}

/**
 * Convert sheet name to camelCase key
 */
function convertSheetNameToKey(sheetName) {
    const specialCases = {
        'RelationshipLog': 'relationshipLog',
        'PresentBookings': 'presentBookings',
        'FutureScenarios': 'futureScenarios',
        'ScenarioStays': 'scenarioStays',
        'ToBook': 'toBookTasks',
        'BookedUpcoming': 'bookedUpcoming',
        'BookingTypeMeta': 'bookingTypeMeta',
        'VisaRules': 'visaRules'
    };
    
    if (specialCases[sheetName]) {
        return specialCases[sheetName];
    }
    
    return sheetName.charAt(0).toLowerCase() + sheetName.slice(1);
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        }
    });
}


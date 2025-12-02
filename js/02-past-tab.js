// Past Tab Functions
function loadPastTab() {
    // Load All Time content by default
    switchPastSubTab('all-time');
}

function switchPastSubTab(subTabName) {
    // Update sub-tab buttons
    document.querySelectorAll('.sub-tab').forEach(btn => btn.classList.remove('active'));
    const activeButton = document.querySelector(`.sub-tab[onclick*="'${subTabName}'"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Hide all sub-tab content
    document.querySelectorAll('.sub-tab-content').forEach(content => content.classList.add('hidden'));

    // Show selected sub-tab content
    switch(subTabName) {
        case 'all-time':
            document.getElementById('all-time-content').classList.remove('hidden');
            loadTimeline('combined');
            break;
        case 'relationship':
            document.getElementById('relationship-content').classList.remove('hidden');
            loadTimeline('individual');
            break;
        case 'map':
            document.getElementById('map-content').classList.remove('hidden');
            // Show loading overlay
            const mapLoadingOverlay = document.getElementById('mapLoadingOverlay');
            if (mapLoadingOverlay) {
                mapLoadingOverlay.classList.remove('hidden');
            }
            // Initialize map only when Map tab is selected
            if (!worldMap) {
                initializeMap();
            } else {
                // Map already exists, just invalidate size in case it was hidden
                setTimeout(() => {
                    if (worldMap) {
                        worldMap.invalidateSize();
                    }
                    // Hide loading overlay since map already exists
                    if (mapLoadingOverlay) {
                        mapLoadingOverlay.classList.add('hidden');
                    }
                }, 100);
            }
            break;
    }
}

function initializeMap() {
    if (worldMap) {
        worldMap.remove();
        worldMap = null;
    }

    // Ensure the map container is visible and has proper dimensions
    const mapContainer = document.getElementById('worldMap');
    if (mapContainer) {
        mapContainer.style.height = '500px';
        mapContainer.style.width = '100%';
    }

    // Initialize the map
    worldMap = L.map('worldMap', {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: false
    });

    // Add tile layer with English labels (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '',
        maxZoom: 18,
        subdomains: 'abcd',
        ext: 'png'
    }).addTo(worldMap);

    // Add country markers based on travel data
    addTravelMarkers().then(() => {
        // Hide loading overlay when map is fully loaded
        const mapLoadingOverlay = document.getElementById('mapLoadingOverlay');
        if (mapLoadingOverlay) {
            mapLoadingOverlay.classList.add('hidden');
        }
    });

    // Force map to resize
    setTimeout(() => {
        if (worldMap) {
            worldMap.invalidateSize();
        }
    }, 100);
}
async function addTravelMarkers() {
    if (!worldMap) {
        logger.error('Map not initialized');
        return;
    }

    logger.debug('Adding travel markers...');
    
    // Group countries by visit type
    const visitedCountries = {
        together: new Set(),        // Together post-Sep 2023 (Priority 1)
        separately: new Set(),      // Both visited pre-relationship but not together post-relationship (Priority 2)
        kimber: new Set(),          // Kimber only pre-relationship (Priority 3)
        siona: new Set()            // Siona only pre-relationship (Priority 4)
    };

    // Process data from Statistics sheet (consolidated data)
    if (currentData.statistics && currentData.statistics.length > 0) {
        logger.debug('📊 Processing Statistics data for map...');
        
        const isYes = (v) => v === 'Yes' || v === 'TRUE' || v === 'True' || v === true || v === 1 || v === '1';
        currentData.statistics.forEach(entry => {
            // Expected columns: A Country, B Code, C Kimber_Days, D Siona_Days, E Together_Days, F Total_Days, G Rank, H Kimber_Visited, I Siona_Visited, J Together_Visited
            const [country, countryCode, kimberDays, sionaDays, togetherDays, totalDays, rank, kimberVisited, sionaVisited, togetherVisited] = entry;
            
            // Skip header row and summary rows (including "Total", "Updated", etc.)
            const countryStr = (country || '').toString().trim();
            if (!countryStr || 
                countryStr === 'Country' || 
                countryStr === 'SUMMARY' || 
                countryStr.includes('Total') || 
                countryStr.includes('Updated') ||
                countryStr === '') return;
            
            // Standardize to get country code - ensure we trim whitespace from Statistics sheet
            let standardizedCode = countryCode ? countryCode.toString().trim() : '';
            if (!standardizedCode || standardizedCode === '') {
                standardizedCode = standardizeCountryName(country);
            }
            
            // Ensure code is uppercase
            if (standardizedCode) {
                standardizedCode = standardizedCode.toString().trim().toUpperCase();
            }
            
            if (!standardizedCode) return;
            
            // Convert code to proper English name for map matching
            const properCountryName = getProperEnglishName(standardizedCode.toString().trim().toUpperCase());
            const countryNameForMap = properCountryName && properCountryName !== standardizedCode ? properCountryName : country;
            
            // Get ISO2 code from Countries sheet if available
            const countryRef = getCountryReference(countryNameForMap);
            const iso2Code = countryRef?.alpha2 || '';
            const iso3Code = standardizedCode.toString().trim().toUpperCase();
            
            // Store country with codes as a string key that includes the codes
            // Format: "CountryName|ISO3|ISO2" so we can extract codes later
            const countryKey = `${countryNameForMap}|${iso3Code}|${iso2Code}`;
            
            // Debug logging for USA, Serbia, Viet Nam
            if (DEBUG_MODE && (iso3Code === 'USA' || iso3Code === 'SRB' || iso3Code === 'VNM')) {
                logger.debug(`📊 Creating countryKey for ${country}: "${countryKey}" (from Statistics: country="${country}", code="${countryCode}")`);
            }
            
            // Determine visit type based on the data
            if (isYes(togetherVisited) && Number(togetherDays || 0) > 0) {
                // Together visited (highest priority)
                visitedCountries.together.add(countryKey);
                if (DEBUG_MODE) {
                    logger.debug(`Together: ${country} -> ${countryNameForMap} (${iso3Code}/${iso2Code}) - ${togetherDays} days`);
                }
            } else if (isYes(kimberVisited) && isYes(sionaVisited)) {
                // Both visited but not together (separately)
                visitedCountries.separately.add(countryKey);
                if (DEBUG_MODE) {
                    logger.debug(`Separately: ${country} -> ${countryNameForMap} (${iso3Code}/${iso2Code})`);
                }
            } else if (isYes(kimberVisited) && !isYes(sionaVisited)) {
                // Kimber only
                visitedCountries.kimber.add(countryKey);
                if (DEBUG_MODE) {
                    logger.debug(`Kimber only: ${country} -> ${countryNameForMap} (${iso3Code}/${iso2Code})`);
                }
            } else if (isYes(sionaVisited) && !isYes(kimberVisited)) {
                // Siona only
                visitedCountries.siona.add(countryKey);
                if (DEBUG_MODE) {
                    logger.debug(`Siona only: ${country} -> ${countryNameForMap} (${iso3Code}/${iso2Code})`);
                }
            }
        });
        
        if (DEBUG_MODE) {
            logger.debug('📊 Final country counts:');
            logger.debug('Together:', visitedCountries.together.size);
            logger.debug('Separately:', visitedCountries.separately.size);
            logger.debug('Kimber only:', visitedCountries.kimber.size);
            logger.debug('Siona only:', visitedCountries.siona.size);
        }
    }

    // All data processing is now done above using Statistics sheet

    if (DEBUG_MODE) {
        logger.debug('=== DEBUG: Final Country Processing ===');
        logger.debug('Together countries:', Array.from(visitedCountries.together));
        logger.debug('Separately countries:', Array.from(visitedCountries.separately));
        logger.debug('Final Kimber-only countries:', Array.from(visitedCountries.kimber));
        logger.debug('Final Siona-only countries:', Array.from(visitedCountries.siona));
    }

    // Load country GeoJSON data and render countries
    await loadCountryBorders(visitedCountries);
    
    // Add Kosovo using proper GeoJSON data
    addKosovoGeoJSON(visitedCountries);

    logger.debug('Markers added successfully');
}

function getVisitTypeLabel(type) {
    const labels = {
        scenario: 'Scenario Country',
        together: 'Together',
        kimber: 'Kimber',
        siona: 'Siona',
        separately: 'Separately',
        preRelationship: 'Pre-Relationship Visit',
        bothVisited: 'Both Visited (Pre 30 Sep 2023)'
    };
    return labels[type] || type;
}

async function loadCountryBorders(visitedCountries, targetMap = worldMap, options = {}) {
    if (!targetMap) {
        logger.warn('loadCountryBorders: target map not available');
        return;
    }
    const { fitBounds = false, colorOverrides = null } = options;

    const countriesSheet = Array.isArray(currentData.countries) ? currentData.countries : [];
    const sheetEntryByNormalized = new Map();
    countriesSheet.forEach(row => {
        if (!row) return;
        const canonicalName = (row[0] || '').toString().trim();
        if (!canonicalName) return;
        const normalized = normalizeScenarioCountryName(canonicalName);
        if (!normalized) return;
        const iso3 = (row[1] || '').toString().trim().toUpperCase();
        const iso2 = (row[2] || '').toString().trim().toUpperCase();
        sheetEntryByNormalized.set(normalized, { row, canonicalName, iso3, iso2 });
    });

    const simpleNormalize = (value) => normalizeCountryIdentifier(
        (value ?? '').toString().trim().toLowerCase()
    );

    const visitedEntries = [];
    Object.entries(visitedCountries).forEach(([type, countries]) => {
        countries.forEach(countryKey => {
            // Extract country name and codes from the key format "CountryName|ISO3|ISO2"
            // Handle both new format (with codes) and old format (just country name) for backward compatibility
            let countryName, iso3FromKey = '', iso2FromKey = '';
            
            if (countryKey.includes('|')) {
                // New format: "CountryName|ISO3|ISO2"
                const parts = countryKey.split('|');
                countryName = parts[0];
                iso3FromKey = parts[1] || '';
                iso2FromKey = parts[2] || '';
            } else {
                // Old format: just country name (backward compatibility)
                countryName = countryKey;
            }
            
            const normalized = normalizeScenarioCountryName(countryName);
            if (!normalized) return;
            let sheetEntry = sheetEntryByNormalized.get(normalized);
            
            // Normalize ISO codes to uppercase
            const normalizedIso3 = iso3FromKey ? iso3FromKey.toString().trim().toUpperCase() : '';
            const normalizedIso2 = iso2FromKey ? iso2FromKey.toString().trim().toUpperCase() : '';
            
            // If sheetEntry is null but we have ISO codes from Statistics, use them
            if (!sheetEntry && (normalizedIso3 || normalizedIso2)) {
                // Try to find the country row by ISO code
                const countryRow = currentData.countries?.find(c => {
                    const alpha3 = (c[1] || '').toString().trim().toUpperCase();
                    const alpha2 = (c[2] || '').toString().trim().toUpperCase();
                    return (normalizedIso3 && alpha3 === normalizedIso3) || 
                           (normalizedIso2 && alpha2 === normalizedIso2);
                });
                
                if (countryRow) {
                    const canonicalName = (countryRow[0] || '').toString().trim();
                    const iso3 = (countryRow[1] || '').toString().trim().toUpperCase();
                    const iso2 = (countryRow[2] || '').toString().trim().toUpperCase();
                    sheetEntry = { row: countryRow, canonicalName, iso3, iso2 };
                } else {
                    // Use the codes we have from Statistics even if we can't find the row
                    sheetEntry = { 
                        row: null, 
                        canonicalName: countryName, 
                        iso3: normalizedIso3, 
                        iso2: normalizedIso2 
                    };
                    
                    // Debug logging for USA, Serbia, Viet Nam
                    if (DEBUG_MODE && (normalizedIso3 === 'USA' || normalizedIso3 === 'SRB' || normalizedIso3 === 'VNM')) {
                        logger.debug(`🔍 Country not found in sheet but using codes: ${countryName} (${normalizedIso3}/${normalizedIso2})`);
                    }
                }
            }
            
            const finalIso3 = sheetEntry?.iso3 || normalizedIso3 || '';
            const finalIso2 = sheetEntry?.iso2 || normalizedIso2 || '';
            
            // Debug logging for USA, Serbia, Viet Nam
            if (DEBUG_MODE && (finalIso3 === 'USA' || finalIso3 === 'SRB' || finalIso3 === 'VNM')) {
                logger.debug(`🗺️ Processing ${countryName}: iso3=${finalIso3}, iso2=${finalIso2}, canonicalName=${sheetEntry?.canonicalName || normalized}`);
            }
            
            visitedEntries.push({
                type,
                normalized,
                canonicalName: sheetEntry?.canonicalName || normalized,
                iso3: finalIso3,
                iso2: finalIso2,
                row: sheetEntry?.row || null,
                rendered: false
            });
        });
    });

    if (visitedEntries.length === 0) {
        logger.warn('loadCountryBorders: no countries provided');
        return;
    }

    const iso3Set = new Set(visitedEntries.filter(entry => entry.iso3).map(entry => entry.iso3));
    const iso2Set = new Set(visitedEntries.filter(entry => entry.iso2).map(entry => entry.iso2));
    const normalizedNameSet = new Set(visitedEntries.map(entry => simpleNormalize(entry.canonicalName)));
    
    // Debug logging for ISO sets
    if (DEBUG_MODE) {
        logger.debug('🔍 ISO3 Set:', Array.from(iso3Set).sort());
        logger.debug('🔍 ISO2 Set:', Array.from(iso2Set).sort());
        logger.debug('🔍 Checking for USA, SRB, VNM in sets:', {
        'USA in iso3Set': iso3Set.has('USA'),
        'SRB in iso3Set': iso3Set.has('SRB'),
        'VNM in iso3Set': iso3Set.has('VNM'),
        'US in iso2Set': iso2Set.has('US'),
        'RS in iso2Set': iso2Set.has('RS'),
        'VN in iso2Set': iso2Set.has('VN')
    });
    }

    const countryTypes = {};
    visitedEntries.forEach(entry => {
        countryTypes[entry.canonicalName] = entry.type;
    });

    const boundsAccumulator = fitBounds ? L.latLngBounds() : null;

    const resolveColorOverride = (name) => {
        if (!colorOverrides) return null;
        const directKey = name;
        const lowerKey = (name ?? '').toString().trim().toLowerCase();
        const normalizedKey = simpleNormalize(name);
        if (colorOverrides instanceof Map) {
            return colorOverrides.get(directKey) ||
                   colorOverrides.get(normalizedKey) ||
                   colorOverrides.get(lowerKey);
        }
        if (typeof colorOverrides === 'object') {
            return colorOverrides[directKey] ||
                   colorOverrides[normalizedKey] ||
                   colorOverrides[lowerKey];
        }
        return null;
    };

    if (DEBUG_MODE) {
        logger.debug('=== MAP DATA LOADING DEBUG ===');
        logger.debug('Countries to display:', visitedEntries.map(entry => entry.canonicalName));
        logger.debug('Country types breakdown:', visitedCountries);
        logger.debug('Countries sheet data:', currentData.countries ? currentData.countries.length + ' countries loaded' : 'NOT LOADED');
    
    if (currentData.countries && currentData.countries.length > 0) {
            logger.debug('First few countries from sheet:', currentData.countries.slice(0, 3));
    }
    
    // Show some examples of what's in countryTypes
        logger.debug('Sample countryTypes entries:', Object.entries(countryTypes).slice(0, 5));
    }
    
    logger.debug('Loading country borders for', Object.keys(countryTypes).length, 'countries');

    try {
        // Load GeoJSON data
        let response;
        try {
            response = await fetch(LOCAL_WORLD_GEOJSON_PATH, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`Local GeoJSON request failed: ${response.status}`);
            }
        } catch (localError) {
            logger.warn('Map: local GeoJSON load failed, falling back to remote', localError);
            response = await fetch(REMOTE_WORLD_GEOJSON_URL);
        }
        const geoJsonData = await response.json();

        // Render each country
        let matchedCountries = 0;
        let renderedCountries = 0;
        
            // First pass: find and log all USA, Serbia, Viet Nam features
            const targetCountries = ['USA', 'SRB', 'VNM', 'United States', 'Serbia', 'Viet Nam', 'Vietnam'];
            geoJsonData.features.forEach(feature => {
                const props = feature.properties || {};
                const name = props.NAME || props.name || props.ADMIN || '';
                // Check all possible ISO code property names
                const iso3 = props.ISO_A3 || props.ADM0_A3 || props['ISO3166-1-Alpha-3'] || props['ISO3166-1-ALPHA-3'] || props.ISO3166_1_Alpha_3 || '';
                const iso2 = props.ISO_A2 || props['ISO3166-1-Alpha-2'] || props['ISO3166-1-ALPHA-2'] || props.ISO3166_1_Alpha_2 || '';
                
                if (DEBUG_MODE && targetCountries.some(tc => 
                    name && name.includes(tc) || 
                    iso3 && iso3.includes(tc) ||
                    normalizeCountryIdentifier(iso3) === normalizeCountryIdentifier(tc)
                )) {
                    logger.debug(`🔍 Found potential match in GeoJSON: name="${name}", ISO_A3="${props.ISO_A3}", ADM0_A3="${props.ADM0_A3}", ISO_A2="${props.ISO_A2}", ISO3166-1-Alpha-3="${props['ISO3166-1-Alpha-3']}", ISO3166-1-Alpha-2="${props['ISO3166-1-Alpha-2']}"`, props);
                }
            });
        
        geoJsonData.features.forEach(feature => {
            const props = feature.properties || {};
            const countryName = props.NAME || props.name;
            // Check multiple possible property names for ISO codes
            const featureIso3 = normalizeCountryIdentifier(
                props.ISO_A3 || 
                props.ADM0_A3 || 
                props['ISO3166-1-Alpha-3'] || 
                props['ISO3166-1-ALPHA-3'] ||
                props.ISO3166_1_Alpha_3 ||
                ''
            );
            const featureIso2 = normalizeCountryIdentifier(
                props.ISO_A2 || 
                props['ISO3166-1-Alpha-2'] || 
                props['ISO3166-1-ALPHA-2'] ||
                props.ISO3166_1_Alpha_2 ||
                ''
            );
            const normalizedFeatureName = simpleNormalize(countryName);
            
            // Debug logging for USA, Serbia, Viet Nam in GeoJSON
            if (DEBUG_MODE && (featureIso3 === 'USA' || featureIso3 === 'SRB' || featureIso3 === 'VNM' || 
                countryName && (countryName.includes('United States') || countryName.includes('Serbia') || countryName.includes('Viet')))) {
                logger.debug(`🌍 GeoJSON feature: ${countryName} (${featureIso3}/${featureIso2}) - raw props:`, {
                    ISO_A3: feature.properties.ISO_A3,
                    ADM0_A3: feature.properties.ADM0_A3,
                    ISO_A2: feature.properties.ISO_A2,
                    NAME: feature.properties.NAME,
                    name: feature.properties.name,
                    normalizedIso3: featureIso3,
                    normalizedIso2: featureIso2,
                    iso3InSet: iso3Set.has(featureIso3),
                    iso2InSet: iso2Set.has(featureIso2),
                    nameInSet: normalizedNameSet.has(normalizedFeatureName)
                });
            }

            if (
                (!featureIso3 || !iso3Set.has(featureIso3)) &&
                (!featureIso2 || !iso2Set.has(featureIso2)) &&
                (!normalizedFeatureName || !normalizedNameSet.has(normalizedFeatureName))
            ) {
                return;
            }

            const entry = visitedEntries.find(candidate =>
                (featureIso3 && candidate.iso3 && candidate.iso3 === featureIso3) ||
                (featureIso2 && candidate.iso2 && candidate.iso2 === featureIso2) ||
                (normalizedFeatureName && normalizeCountryIdentifier(candidate.canonicalName) === normalizedFeatureName)
            );
            
            // Debug logging when entry is found
            if (DEBUG_MODE && entry && (featureIso3 === 'USA' || featureIso3 === 'SRB' || featureIso3 === 'VNM')) {
                logger.debug(`✅ Matched ${countryName}: entry found with iso3=${entry.iso3}, iso2=${entry.iso2}, canonicalName=${entry.canonicalName}`);
            }

            if (!entry || entry.rendered) {
                if (DEBUG_MODE && (featureIso3 === 'USA' || featureIso3 === 'SRB' || featureIso3 === 'VNM') && !entry) {
                    logger.warn(`❌ No entry found for ${countryName} (${featureIso3}/${featureIso2})`);
                }
                return;
            }
            
            // Find matching country in our data using standardized codes
            const country = entry.row || currentData.countries.find(c => {
                const name = (c[0] || '').toString().trim();
                return normalizeCountryIdentifier(name) === normalizeCountryIdentifier(entry.canonicalName);
            });

            if (country) {
                matchedCountries++;
                const [name, alpha3, alpha2, flagUrl] = country;
                // Use the standardized code to find the visit type
                const visitType = entry.type;
                
                // Debug logging for first few matches
                if (DEBUG_MODE && matchedCountries <= 5) {
                    logger.debug(`Match ${matchedCountries}: GeoJSON="${countryName}" -> Sheet="${name}" (${alpha3}) -> visitType="${visitType}"`);
                }
                
                if (visitType) {
                    renderedCountries++;
                    let color = getCountryColor(visitType);
                    let strokeColor = getCountryStrokeColor(visitType);
                    const override = resolveColorOverride(entry.canonicalName);
                    if (override) {
                        color = override.fill || color;
                        strokeColor = override.stroke || strokeColor;
                    }
                    
                    // Debug logging for Netherlands
                    if (DEBUG_MODE && (alpha3 === 'NLD' || name === 'Netherlands')) {
                        logger.debug(`Netherlands found: name=${name}, alpha3=${alpha3}, visitType=${visitType}, color=${color}`);
                    }
                    
                    // Debug logging for first few countries to see what's happening
                    if (DEBUG_MODE && renderedCountries <= 5) {
                        logger.debug(`Country ${renderedCountries}: name=${name}, alpha3=${alpha3}, visitType=${visitType}, color=${color}`);
                    }
                    
                    // Create GeoJSON layer with proper styling
                    const countryLayer = L.geoJSON(feature, {
                        style: {
                            fillColor: color,
                            fillOpacity: 0.55,
                            color: strokeColor,
                            weight: 1.5,
                            opacity: 0.8
                        }
                    }).addTo(targetMap);
                    if (boundsAccumulator) {
                        try {
                            const layerBounds = countryLayer.getBounds();
                            if (layerBounds && layerBounds.isValid && layerBounds.isValid()) {
                                boundsAccumulator.extend(layerBounds);
                            }
                        } catch (layerError) {
                            logger.warn('Unable to extend bounds for polygon', layerError);
                        }
                    }

                    countryLayer.bindPopup(`
                        <div style="text-align: center;">
                            <img src="${flagUrl}" style="width: 30px; height: 20px; margin-bottom: 5px;">
                            <br><strong>${name}</strong>
                            <br><small>${getVisitTypeLabel(visitType)}</small>
                        </div>
                    `);

                    entry.rendered = true;
                }
            }
        });

        if (DEBUG_MODE) {
            logger.debug('GeoJSON matching results:');
            logger.debug('- Matched countries:', matchedCountries);
            logger.debug('- Rendered countries:', renderedCountries);
        }

        logger.debug('Country borders loaded successfully');

        const remaining = { scenario: new Set(), together: new Set(), separately: new Set(), kimber: new Set(), siona: new Set() };
        visitedEntries.filter(entry => !entry.rendered).forEach(entry => {
            if (!remaining[entry.type]) {
                remaining[entry.type] = new Set();
            }
            remaining[entry.type].add(entry.canonicalName);
        });
        if (Object.values(remaining).some(set => set && set.size > 0)) {
            renderCountriesWithBounds(remaining, targetMap, { fitBounds, boundsAccumulator, colorOverrides });
        }

        if (boundsAccumulator && boundsAccumulator.isValid()) {
            targetMap.fitBounds(boundsAccumulator.pad(0.12));
        }
    } catch (error) {
        logger.error('Error loading country borders:', error);
        // Fallback to bounding box approach
        renderCountriesWithBounds(visitedCountries, targetMap, { fitBounds, colorOverrides });
    }
}

function renderCountriesWithBounds(visitedCountries, targetMap = worldMap, options = {}) {
    if (!targetMap) {
        logger.warn('renderCountriesWithBounds: target map not available');
        return;
    }
    const { fitBounds = false, boundsAccumulator = fitBounds ? L.latLngBounds() : null, colorOverrides = null } = options;
    const resolveColorOverride = (name) => {
        if (!colorOverrides) return null;
        const directKey = name;
        const lowerKey = (name ?? '').toString().trim().toLowerCase();
        const normalizedKey = normalizeCountryIdentifier(name || '');
        if (colorOverrides instanceof Map) {
            return colorOverrides.get(directKey) ||
                   colorOverrides.get(normalizedKey) ||
                   colorOverrides.get(lowerKey);
        }
        if (typeof colorOverrides === 'object') {
            return colorOverrides[directKey] ||
                   colorOverrides[normalizedKey] ||
                   colorOverrides[lowerKey];
        }
        return null;
    };
    // Fallback: render countries with bounding boxes
    Object.entries(visitedCountries).forEach(([type, countries]) => {
        countries.forEach(countryName => {
            const country = currentData.countries.find(c => normalizeCountryIdentifier(c[0]) === normalizeCountryIdentifier(countryName));
            if (country) {
                const [name, alpha3, alpha2, flagUrl] = country;
                const bounds = getCountryBounds(name);
                
                if (bounds) {
                    let color = getCountryColor(type);
                    let strokeColor = getCountryStrokeColor(type);
                    const override = resolveColorOverride(name);
                    if (override) {
                        color = override.fill || color;
                        strokeColor = override.stroke || strokeColor;
                    }
                    const fillOpacity = type === 'preRelationship' ? 0.3 : 0.6;
                    
                    const rect = L.rectangle(bounds, {
                        fillColor: color,
                        fillOpacity: fillOpacity,
                        color: strokeColor,
                        weight: 2,
                        opacity: 0.8
                    }).addTo(targetMap);
                    if (boundsAccumulator) {
                        boundsAccumulator.extend(rect.getBounds());
                    }

                    rect.bindPopup(`
                        <div style="text-align: center;">
                            <img src="${flagUrl}" style="width: 30px; height: 20px; margin-bottom: 5px;">
                            <br><strong>${name}</strong>
                            <br><small>${getVisitTypeLabel(type)}</small>
                        </div>
                    `);
                }
            }
        });
    });
    if (boundsAccumulator && boundsAccumulator.isValid()) {
        targetMap.fitBounds(boundsAccumulator.pad(0.12));
    }
}
function getCountryBounds(countryName) {
    // Country bounding boxes [southLat, westLng, northLat, eastLng]
    // These are approximate bounds for visualization
    const bounds = {
        'Australia': [[-44, 113], [-10, 154]],
        'United States': [[25, -125], [49, -66]],
        'United Kingdom': [[49, -8], [61, 2]],
        'France': [[42, -5], [51, 10]],
        'Germany': [[47, 5], [55, 15]],
        'Italy': [[36, 6], [47, 19]],
        'Spain': [[36, -10], [44, 4]],
        'Netherlands': [[50, 3], [54, 8]],
        'Belgium': [[49, 2], [51, 7]],
        'Austria': [[46, 9], [49, 17]],
        'Switzerland': [[46, 6], [48, 10]],
        'Portugal': [[37, -10], [42, -6]],
        'Mexico': [[14, -118], [33, -86]],
        'Canada': [[42, -141], [83, -50]],
        'Brazil': [[-34, -74], [6, -32]],
        'Argentina': [[-56, -74], [-21, -53]],
        'Colombia': [[-4, -82], [12, -67]],
        'Turkey': [[36, 26], [42, 45]],
        'Georgia': [[41, 40], [43, 47]],
        'Bulgaria': [[42, 23], [44, 29]],
        'Albania': [[40, 19], [43, 21]],
        'Montenegro': [[42, 18], [43, 20]],
        'Kosovo': [[42, 21], [43, 21]],
        'North Macedonia': [[41, 20], [42, 23]],
        'Croatia': [[43, 13], [47, 19]],
        'Qatar': [[25, 51], [26, 51]],
        'United Arab Emirates': [[22, 51], [26, 56]],
        'Ireland': [[51, -10], [55, -6]],
        'Nicaragua': [[11, -88], [15, -82]],
        'Panama': [[7, -83], [10, -77]],
        'Greece': [[35, 20], [42, 28]],
        'Morocco': [[21, -17], [36, -1]],
        'Brazil': [[-34, -74], [6, -32]],
        'Japan': [[24, 123], [46, 146]],
        'Thailand': [[6, 97], [21, 106]],
        'Viet Nam': [[9, 102], [24, 110]],
        'India': [[6, 68], [37, 97]],
        'China': [[18, 73], [54, 135]],
        'Indonesia': [[-11, 95], [6, 141]],
        'Malaysia': [[1, 100], [7, 120]],
        'Singapore': [[1, 104], [1, 104]],
        'Philippines': [[5, 117], [21, 128]],
        'Cambodia': [[10, 102], [15, 108]],
        'Laos': [[14, 100], [22, 108]],
        'Myanmar': [[10, 92], [28, 102]],
        'South Korea': [[33, 125], [43, 132]],
        'Egypt': [[22, 25], [32, 37]],
        'Peru': [[-20, -82], [0, -68]],
        'Bolivia': [[-23, -70], [-10, -57]],
        'Chile': [[-57, -76], [-17, -66]],
        'Ecuador': [[-5, -81], [2, -75]],
        'El Salvador': [[13, -90], [15, -87]],
        'Guatemala': [[13, -93], [18, -88]],
        'Honduras': [[13, -90], [16, -83]],
        'Belize': [[16, -90], [18, -87]],
        'Costa Rica': [[8, -86], [11, -82]],
        'Venezuela': [[0, -74], [12, -60]],
        'Uruguay': [[-35, -58], [-30, -53]],
        'Paraguay': [[-28, -63], [-19, -54]],
        'Guyana': [[2, -62], [9, -56]],
        'Suriname': [[2, -58], [6, -54]],
        'Denmark': [[54, 8], [58, 13]],
        'Finland': [[60, 20], [70, 32]],
        'Norway': [[58, 4], [71, 31]],
        'Sweden': [[55, 11], [69, 24]],
        'Poland': [[49, 14], [55, 25]],
        'Czech Republic': [[48, 12], [51, 19]],
        'Hungary': [[46, 16], [49, 23]],
        'Romania': [[44, 20], [48, 30]],
        'Greece': [[35, 20], [42, 28]],
        'Serbia': [[42, 19], [46, 23]],
        'Bosnia and Herzegovina': [[43, 16], [45, 20]],
        'Slovenia': [[46, 14], [47, 17]],
        'Luxembourg': [[50, 6], [50, 6]],
        'Andorra': [[42, 2], [43, 2]],
        'Monaco': [[44, 7], [44, 8]],
        'Iceland': [[63, -25], [67, -13]],
        'Greenland': [[60, -74], [84, -11]],
        'New Zealand': [[-52, 166], [-29, 179]],
        'Fiji': [[-20, 177], [-16, 180]],
        'Papua New Guinea': [[-13, 141], [-2, 158]],
        'Tunisia': [[30, 8], [37, 12]],
        'Jamaica': [[18, -79], [19, -76]],
        'Cuba': [[20, -85], [23, -74]],
        'Gambia': [[13, -17], [14, -12]],
        'Senegal': [[12, -17], [17, -11]],
        'Japan': [[24, 123], [46, 146]],
        'Vietnam': [[9, 102], [24, 110]],
        'South Africa': [[-35, 17], [-22, 33]],
        'Kenya': [[-5, 34], [6, 42]],
        'Tanzania': [[-12, 29], [-1, 40]],
        'Zimbabwe': [[-23, 26], [-16, 33]],
        'Botswana': [[-27, 20], [-18, 30]],
        'Namibia': [[-28, 12], [-17, 25]],
        'Zambia': [[-18, 22], [-8, 33]],
        'Malawi': [[-17, 33], [-10, 36]],
        'Mozambique': [[-27, 30], [-10, 41]],
        'Madagascar': [[-26, 43], [-12, 50]],
        'Mauritius': [[-21, 57], [-20, 58]],
        'Seychelles': [[-10, 46], [-4, 56]],
        'India': [[6, 68], [37, 97]],
        'Nepal': [[26, 80], [30, 89]],
        'Bangladesh': [[20, 88], [27, 93]],
        'Sri Lanka': [[6, 80], [10, 82]],
        'Maldives': [[4, 73], [7, 73]],
        'Mongolia': [[42, 87], [52, 120]],
        'Kazakhstan': [[41, 47], [55, 87]],
        'Uzbekistan': [[37, 56], [46, 73]],
        'Kyrgyzstan': [[39, 69], [43, 80]],
        'Tajikistan': [[36, 67], [41, 75]],
        'Afghanistan': [[29, 61], [39, 75]],
        'Pakistan': [[24, 61], [37, 78]],
        'Iran': [[25, 44], [40, 64]],
        'Iraq': [[29, 38], [37, 49]],
        'Saudi Arabia': [[16, 35], [32, 55]],
        'Yemen': [[12, 43], [19, 54]],
        'Oman': [[17, 52], [27, 60]],
        'United Arab Emirates': [[22, 51], [26, 56]],
        'Kuwait': [[29, 47], [31, 49]],
        'Qatar': [[25, 51], [26, 51]],
        'Bahrain': [[26, 51], [26, 51]],
        'Israel': [[30, 34], [33, 36]],
        'Lebanon': [[33, 35], [35, 36]],
        'Syria': [[33, 36], [37, 42]],
        'Jordan': [[29, 35], [33, 39]],
        'Georgia': [[42, 40], [43, 47]],
        'Armenia': [[39, 44], [41, 47]],
        'Azerbaijan': [[39, 45], [42, 50]],
        'Russia': [[41, 20], [82, 180]],
        'Ukraine': [[45, 22], [53, 41]],
        'Belarus': [[52, 23], [57, 33]],
        'Lithuania': [[54, 21], [56, 27]],
        'Latvia': [[56, 21], [58, 28]],
        'Estonia': [[58, 22], [60, 28]],
        'Finland': [[60, 20], [70, 32]],
        'Norway': [[58, 4], [71, 31]],
        'Sweden': [[55, 11], [69, 24]],
        'Denmark': [[54, 8], [58, 13]],
        'Iceland': [[63, -25], [67, -13]],
        'Ireland': [[51, -10], [55, -6]],
        'United Kingdom': [[49, -8], [61, 2]],
        'Netherlands': [[50, 3], [54, 8]],
        'Belgium': [[50, 2], [51, 7]],
        'France': [[42, -5], [51, 10]],
        'Switzerland': [[46, 6], [48, 10]],
        'Austria': [[46, 9], [49, 17]],
        'Italy': [[36, 6], [47, 19]],
        'Spain': [[36, -10], [44, 4]],
        'Portugal': [[37, -10], [42, -6]],
        'Malta': [[36, 14], [36, 15]],
        'Cyprus': [[35, 32], [36, 35]],
        'Greece': [[35, 20], [42, 28]],
        'Albania': [[40, 19], [43, 21]],
        'North Macedonia': [[41, 20], [42, 23]],
        'Kosovo': [[42, 21], [43, 21]],
        'Montenegro': [[42, 18], [43, 20]],
        'Bosnia and Herzegovina': [[43, 16], [45, 20]],
        'Croatia': [[43, 13], [47, 19]],
        'Slovenia': [[46, 14], [47, 17]],
        'Serbia': [[42, 19], [46, 23]],
        'Bulgaria': [[42, 23], [44, 29]],
        'Romania': [[44, 20], [48, 30]],
        'Moldova': [[45, 26], [48, 30]],
        'Hungary': [[46, 16], [49, 23]],
        'Slovakia': [[48, 17], [50, 23]],
        'Czech Republic': [[48, 12], [51, 19]],
        'Poland': [[49, 14], [55, 25]],
        'Germany': [[47, 5], [55, 15]],
        'Luxembourg': [[49, 6], [50, 6]],
        'Liechtenstein': [[47, 10], [47, 10]],
        'Monaco': [[44, 7], [44, 8]],
        'Andorra': [[42, 2], [43, 2]],
        'San Marino': [[44, 12], [44, 12]],
        'Vatican City': [[42, 12], [42, 13]],
        'Tunisia': [[30, 8], [37, 12]],
        'Algeria': [[19, -9], [37, 12]],
        'Morocco': [[21, -17], [36, -1]],
        'Libya': [[20, 10], [33, 25]],
        'Egypt': [[22, 25], [32, 37]],
        'Sudan': [[9, 22], [22, 39]],
        'Ethiopia': [[4, 33], [15, 48]],
        'Eritrea': [[13, 36], [18, 43]],
        'Djibouti': [[11, 41], [13, 44]],
        'Somalia': [[-2, 41], [12, 52]],
        'Uganda': [[-2, 29], [5, 35]],
        'Rwanda': [[-3, 29], [-1, 31]],
        'Burundi': [[-5, 29], [-2, 31]],
        'Democratic Republic of the Congo': [[-14, 12], [5, 31]],
        'Republic of the Congo': [[-5, 11], [4, 19]],
        'Central African Republic': [[3, 14], [11, 28]],
        'Chad': [[7, 14], [24, 24]],
        'Niger': [[12, 0], [24, 16]],
        'Mali': [[10, -12], [26, 5]],
        'Burkina Faso': [[10, -6], [15, 2]],
        'Nigeria': [[4, 3], [14, 15]],
        'Benin': [[6, 1], [12, 4]],
        'Togo': [[6, 0], [11, 2]],
        'Ghana': [[5, -4], [11, 2]],
        "Côte d'Ivoire": [[4, -9], [11, -3]],
        'Liberia': [[4, -11], [8, -8]],
        'Sierra Leone': [[7, -13], [10, -10]],
        'Guinea': [[8, -15], [13, -8]],
        'Guinea-Bissau': [[11, -17], [12, -14]],
        'Senegal': [[12, -17], [17, -11]],
        'Gambia': [[13, -17], [14, -12]],
        'Mauritania': [[15, -17], [27, -5]],
        'Western Sahara': [[21, -17], [28, -9]],
        'Cameroon': [[2, 9], [13, 16]],
        'Equatorial Guinea': [[1, 5], [4, 12]],
        'Gabon': [[-4, 9], [2, 14]],
        'Sao Tome and Principe': [[0, 6], [2, 8]],
        'Angola': [[-18, 11], [-4, 24]],
        'Zambia': [[-18, 22], [-8, 33]],
        'Malawi': [[-17, 33], [-10, 36]],
        'Mozambique': [[-27, 30], [-10, 41]],
        'Zimbabwe': [[-23, 26], [-16, 33]],
        'Botswana': [[-27, 20], [-18, 30]],
        'Namibia': [[-28, 12], [-17, 25]],
        'South Africa': [[-35, 17], [-22, 33]],
        'Lesotho': [[-31, 28], [-29, 30]],
        'Eswatini': [[-27, 31], [-26, 32]],
        'Madagascar': [[-26, 43], [-12, 50]],
        'Mauritius': [[-21, 57], [-20, 58]],
        'Seychelles': [[-10, 46], [-4, 56]],
        'Comoros': [[-13, 43], [-11, 45]],
        'Indonesia': [[-11, 95], [6, 141]],
        'Malaysia': [[1, 100], [7, 120]],
        'Singapore': [[1, 103], [2, 105]],
        'Brunei': [[4, 114], [5, 116]],
        'Philippines': [[5, 117], [21, 128]],
        'Vietnam': [[9, 102], [24, 110]],
        'Thailand': [[6, 97], [21, 106]],
        'Myanmar': [[10, 92], [28, 102]],
        'Laos': [[14, 100], [22, 108]],
        'Cambodia': [[10, 102], [15, 108]],
        'China': [[18, 73], [54, 135]],
        'Mongolia': [[42, 87], [52, 120]],
        'Taiwan': [[22, 120], [25, 122]],
        'Hong Kong': [[22, 114], [23, 115]],
        'Macau': [[22, 113], [23, 114]],
        'Japan': [[24, 123], [46, 146]],
        'South Korea': [[33, 125], [43, 132]],
        'North Korea': [[38, 124], [43, 131]],
        'Bangladesh': [[20, 88], [27, 93]],
        'India': [[6, 68], [37, 97]],
        'Nepal': [[26, 80], [30, 89]],
        'Bhutan': [[27, 89], [29, 92]],
        'Sri Lanka': [[6, 80], [10, 82]],
        'Maldives': [[4, 73], [7, 73]],
        'Pakistan': [[24, 61], [37, 78]],
        'Afghanistan': [[29, 61], [39, 75]],
        'Iran': [[25, 44], [40, 64]],
        'Iraq': [[29, 38], [37, 49]],
        'Kuwait': [[29, 47], [31, 49]],
        'Saudi Arabia': [[16, 35], [32, 55]],
        'Yemen': [[12, 43], [19, 54]],
        'Oman': [[17, 52], [27, 60]],
        'United Arab Emirates': [[22, 51], [26, 56]],
        'Qatar': [[25, 51], [26, 51]],
        'Bahrain': [[26, 51], [26, 51]],
        'Israel': [[30, 34], [33, 36]],
        'Palestine': [[32, 35], [32, 36]],
        'Lebanon': [[33, 35], [35, 36]],
        'Syria': [[33, 36], [37, 42]],
        'Jordan': [[29, 35], [33, 39]],
        'Iraq': [[29, 38], [37, 49]],
        'Turkey': [[36, 26], [42, 45]],
        'Georgia': [[42, 40], [43, 47]],
        'Armenia': [[39, 44], [41, 47]],
        'Azerbaijan': [[39, 45], [42, 50]],
        'Russia': [[41, 20], [82, 180]],
        'Kazakhstan': [[41, 47], [55, 87]],
        'Uzbekistan': [[37, 56], [46, 73]],
        'Turkmenistan': [[35, 52], [43, 67]],
        'Kyrgyzstan': [[39, 69], [43, 80]],
        'Tajikistan': [[36, 67], [41, 75]],
        'Afghanistan': [[29, 61], [39, 75]],
        'Pakistan': [[24, 61], [37, 78]],
        'India': [[6, 68], [37, 97]],
        'Nepal': [[26, 80], [30, 89]],
        'Bangladesh': [[20, 88], [27, 93]],
        'Myanmar': [[10, 92], [28, 102]],
        'Thailand': [[6, 97], [21, 106]],
        'Laos': [[14, 100], [22, 108]],
        'Cambodia': [[10, 102], [15, 108]],
        'Vietnam': [[9, 102], [24, 110]],
        'China': [[18, 73], [54, 135]],
        'Mongolia': [[42, 87], [52, 120]],
        'North Korea': [[38, 124], [43, 131]],
        'South Korea': [[33, 125], [43, 132]],
        'Japan': [[24, 123], [46, 146]],
        'Taiwan': [[22, 120], [25, 122]],
        'Philippines': [[5, 117], [21, 128]],
        'Malaysia': [[1, 100], [7, 120]],
        'Brunei': [[4, 114], [5, 116]],
        'Singapore': [[1, 103], [2, 105]],
        'Indonesia': [[-11, 95], [6, 141]],
        'Timor-Leste': [[-10, 124], [-8, 128]],
        'Papua New Guinea': [[-13, 141], [-2, 158]],
        'Solomon Islands': [[-13, 156], [-6, 167]],
        'Vanuatu': [[-20, 167], [-13, 170]],
        'New Caledonia': [[-23, 164], [-20, 168]],
        'Fiji': [[-20, 177], [-16, 180]],
        'Tonga': [[-23, -179], [-16, -174]],
        'Samoa': [[-15, -173], [-13, -171]],
        'Cook Islands': [[-23, -166], [-9, -157]],
        'French Polynesia': [[-28, -155], [-8, -134]],
        'New Zealand': [[-52, 166], [-29, 179]],
        'Australia': [[-44, 113], [-10, 154]],
        'Christmas Island': [[-11, 105], [-10, 106]],
        'Norfolk Island': [[-29, 168], [-29, 169]],
        'Cocos Islands': [[-12, 97], [-12, 97]],
        'Canada': [[42, -141], [83, -50]],
        'United States': [[25, -125], [49, -66]],
        'Alaska': [[55, -179], [72, -130]],
        'Mexico': [[14, -118], [33, -86]],
        'Guatemala': [[13, -93], [18, -88]],
        'Belize': [[16, -90], [18, -87]],
        'El Salvador': [[13, -90], [15, -87]],
        'Honduras': [[13, -90], [16, -83]],
        'Nicaragua': [[11, -88], [15, -82]],
        'Costa Rica': [[8, -86], [11, -82]],
        'Panama': [[7, -83], [10, -77]],
        'Cuba': [[20, -85], [23, -74]],
        'Jamaica': [[18, -79], [19, -76]],
        'Haiti': [[18, -75], [20, -71]],
        'Dominican Republic': [[18, -72], [20, -68]],
        'Puerto Rico': [[18, -67], [18, -65]],
        'Trinidad and Tobago': [[10, -62], [11, -61]],
        'Barbados': [[13, -60], [13, -59]],
        'Dominica': [[14, -61], [14, -61]],
        'Saint Lucia': [[14, -61], [14, -61]],
        'Saint Vincent and the Grenadines': [[13, -62], [13, -62]],
        'Grenada': [[12, -62], [12, -61]],
        'Antigua and Barbuda': [[17, -62], [18, -61]],
        'Saint Kitts and Nevis': [[18, -63], [18, -63]],
        'Anguilla': [[18, -64], [18, -63]],
        'Montserrat': [[17, -62], [17, -62]],
        'British Virgin Islands': [[18, -65], [18, -64]],
        'US Virgin Islands': [[18, -65], [19, -64]],
        'Bahamas': [[21, -80], [27, -73]],
        'Bermuda': [[32, -65], [32, -64]],
        'Cayman Islands': [[19, -82], [20, -79]],
        'Turks and Caicos Islands': [[21, -73], [22, -71]],
        'Aruba': [[13, -70], [13, -69]],
        'Curacao': [[12, -69], [12, -69]],
        'Bonaire': [[12, -69], [12, -68]],
        'Colombia': [[-4, -82], [12, -67]],
        'Venezuela': [[0, -74], [12, -60]],
        'Guyana': [[2, -62], [9, -56]],
        'Suriname': [[2, -58], [6, -54]],
        'French Guiana': [[2, -54], [6, -51]],
        'Brazil': [[-34, -74], [6, -32]],
        'Ecuador': [[-5, -81], [2, -75]],
        'Peru': [[-20, -82], [0, -68]],
        'Bolivia': [[-23, -70], [-10, -57]],
        'Chile': [[-57, -76], [-17, -66]],
        'Argentina': [[-56, -74], [-21, -53]],
        'Uruguay': [[-35, -58], [-30, -53]],
        'Paraguay': [[-28, -63], [-19, -54]],
        'Falkland Islands': [[-53, -62], [-51, -57]],
        'South Georgia and the South Sandwich Islands': [[-60, -42], [-54, -25]]
    };
    
    const countryBounds = bounds[countryName];
    if (countryBounds) {
        return countryBounds;
    }
    
    // Fallback: try to find by partial match
    for (const [name, coords] of Object.entries(bounds)) {
        if (name.toLowerCase().includes(countryName.toLowerCase()) || countryName.toLowerCase().includes(name.toLowerCase())) {
            return coords;
        }
    }
    
    return null;
}

function getCountryColor(type) {
    const root = getComputedStyle(document.documentElement);
    const colors = {
        scenario: root.getPropertyValue('--color-scenario').trim() || '#9A6BFF',
        together: root.getPropertyValue('--color-together').trim() || '#28a745',
        kimber: root.getPropertyValue('--color-kimber').trim() || '#3b82f6',
        siona: root.getPropertyValue('--color-siona').trim() || '#ec4899',
        separately: root.getPropertyValue('--color-separately').trim() || '#a855f7'
    };
    return colors[type] || '#6c757d';
}

function getCountryStrokeColor(type) {
    const root = getComputedStyle(document.documentElement);
    const scenarioColor = root.getPropertyValue('--color-scenario').trim() || '#9A6BFF';
    const strokeColors = {
        scenario: darkenHexColor(scenarioColor, 0.35),
        together: root.getPropertyValue('--color-together-dark').trim() || '#155724',
        kimber: root.getPropertyValue('--color-kimber-dark').trim() || '#1e40af',
        siona: root.getPropertyValue('--color-siona-dark').trim() || '#9d174d',
        separately: root.getPropertyValue('--color-separately-dark').trim() || '#7c3aed'
    };
    return strokeColors[type] || root.getPropertyValue('--color-slate-950').trim() || '#1f2937';
}
function addKosovoGeoJSON(visitedCountries) {
    // Check if Kosovo should be displayed
    const kosovoVisitType = visitedCountries.scenario?.has('XKX') ? 'scenario' :
                           visitedCountries.together.has('XKX') ? 'together' :
                           visitedCountries.separately.has('XKX') ? 'separately' :
                           visitedCountries.kimber.has('XKX') ? 'kimber' :
                           visitedCountries.siona.has('XKX') ? 'siona' : null;

    if (!kosovoVisitType) return; // Kosovo not visited

    logger.debug(`Adding Kosovo GeoJSON with visit type: ${kosovoVisitType}`);

    // Kosovo GeoJSON data with accurate borders
    const kosovoGeoJSON = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": "CS-KM",
                "properties": {
                    "name": "Kosovo",
                    "iso_a2": "XK",
                    "iso_a3": "XKX"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [20.76216, 42.05186], [20.71731, 41.84711], [20.59023, 41.85541], [20.52295, 42.21787], [20.28374, 42.32025],
                            [20.0707, 42.58863], [20.25758, 42.81275], [20.49679, 42.88469], [20.63508, 43.21671], [20.81448, 43.27205],
                            [20.95651, 43.13094], [21.143395, 43.068685], [21.27421, 42.90959], [21.43866, 42.86255], [21.63302, 42.67717],
                            [21.77505, 42.6827], [21.66292, 42.43922], [21.54332, 42.32025], [21.576636, 42.245224], [21.3527, 42.2068],
                            [20.76216, 42.05186]
                        ]
                    ]
                }
            }
        ]
    };

    // Style function for Kosovo
    function styleKosovo(feature) {
        return {
            fillColor: getCountryColor(kosovoVisitType),
            fillOpacity: 0.7,
            color: getCountryStrokeColor(kosovoVisitType),
            weight: 2,
            opacity: 1
        };
    }

    // Add Kosovo to the map
    L.geoJSON(kosovoGeoJSON, {
        style: styleKosovo,
        onEachFeature: function(feature, layer) {
            const label = getVisitTypeLabel(kosovoVisitType);
            layer.bindPopup(`
                <div style="text-align: center;">
                    <strong>Kosovo</strong><br>
                    <span style="color: ${getCountryColor(kosovoVisitType)};">●</span> ${label}
                </div>
            `);
        }
    }).addTo(worldMap);

    // Add to legend if not already there
    const legend = document.querySelector('.legend');
    if (legend && !document.querySelector('.legend-item[data-country="kosovo"]')) {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.setAttribute('data-country', 'kosovo');
        legendItem.innerHTML = `
            <div class="legend-color ${kosovoVisitType}"></div>
            <span>Kosovo (${getVisitTypeLabel(kosovoVisitType)})</span>
        `;
        legend.appendChild(legendItem);
    }
}

function loadTimeline(view) {
    // Determine which timeline div to use based on view
    let timeline;
    if (view === 'combined') {
        timeline = document.getElementById('timeline-all-time');
    } else {
        timeline = document.getElementById('timeline-relationship');
    }
    
    if (!timeline) {
        logger.error('Timeline container not found');
        return;
    }
    
    timeline.innerHTML = '';

    if (view === 'combined') {
        // All Time view - show country counts and pre-relationship countries only
        const countryCounts = calculateCountryCounts();
        const countsTile = createCountryCountsTile(countryCounts);
        timeline.appendChild(countsTile);
        
        // Show pre-relationship countries timeline
        const preRelTimeline = createPreRelationshipTimeline();
        timeline.appendChild(preRelTimeline);
    } else {
        // Relationship Log view - show top 5 countries and full relationship timeline
        const top5Countries = calculateTop5RelationshipCountries();
        const top5Tile = createTop5CountriesTile(top5Countries);
        timeline.appendChild(top5Tile);
        
        // Show full relationship log timeline
        const relationshipTimeline = createRelationshipTimeline();
        timeline.appendChild(relationshipTimeline);
    }
}

function processTimelineData(view) {
    // Group consecutive days with same countries
    const periods = [];
    let currentPeriod = null;

    // Filter data up to today's date for relationship log
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const filteredData = currentData.relationshipLog.filter(entry => {
        const [date, kimberCountry, sionaCountry] = entry;
        const entryDate = parseDate(date);
        return entryDate <= today;
    });

    filteredData.forEach(entry => {
        const [date, kimberCountry, sionaCountry, notes] = entry;
        
        if (view === 'individual') {
            // Show individual timelines
            if (kimberCountry && (!currentPeriod || currentPeriod.kimberCountry !== kimberCountry)) {
                if (currentPeriod) periods.push(currentPeriod);
                currentPeriod = {
                    startDate: date,
                    endDate: date,
                    kimberCountry: kimberCountry,
                    sionaCountry: sionaCountry,
                    type: kimberCountry === sionaCountry ? 'together' : 'separate',
                    countries: kimberCountry === sionaCountry ? kimberCountry : `${kimberCountry} / ${sionaCountry}`,
                    notes: notes
                };
            } else if (currentPeriod && currentPeriod.kimberCountry === kimberCountry) {
                currentPeriod.endDate = date;
            }
        } else {
            // Show combined timeline
            const countries = kimberCountry === sionaCountry ? kimberCountry : `${kimberCountry} / ${sionaCountry}`;
            const type = kimberCountry === sionaCountry ? 'together' : 'separate';
            
            if (!currentPeriod || currentPeriod.countries !== countries) {
                if (currentPeriod) periods.push(currentPeriod);
                currentPeriod = {
                    startDate: date,
                    endDate: date,
                    countries: countries,
                    type: type,
                    notes: notes
                };
            } else {
                currentPeriod.endDate = date;
            }
        }
    });

    if (currentPeriod) periods.push(currentPeriod);
    return periods.slice(0, 20); // Show last 20 periods
}

function calculateCountryCounts() {
    // Use Statistics sheet data if available
    if (currentData.statistics) {
        if (DEBUG_MODE) {
            logger.debug('📊 Statistics sheet data available:', currentData.statistics.length, 'entries');
            logger.debug('📊 First few entries:', currentData.statistics.slice(0, 3));
        }
        
        // Count from individual entries (no summary section in new structure)
        let kimberCount = 0;
        let sionaCount = 0;
        let togetherCount = 0;
        
        const kimberCountries = [];
        const sionaCountries = [];
        const togetherCountries = [];
        
        const isYes = (v) => v === 'Yes' || v === 'TRUE' || v === 'True' || v === true || v === 1 || v === '1';
        currentData.statistics.forEach(entry => {
            // Expected columns: A,B,C,D,E,F,G,H,I,J (H-J are visited flags)
            const [country, code, kimberDays, sionaDays, togetherDays, totalDays, rank, kimberVisited, sionaVisited, togetherVisited] = entry;
            // Skip header row and summary rows (including "Total", "Updated", etc.)
            const countryStr = (country || '').toString().trim();
            if (!countryStr || 
                countryStr === 'Country' || 
                countryStr === 'SUMMARY' || 
                countryStr.includes('Total') || 
                countryStr.includes('Updated') ||
                countryStr === '') return;
            
            if (isYes(kimberVisited)) {
                kimberCount++;
                kimberCountries.push(country);
            }
            if (isYes(sionaVisited)) {
                sionaCount++;
                sionaCountries.push(country);
            }
            if (isYes(togetherVisited)) {
                togetherCount++;
                togetherCountries.push(country);
            }
        });
        
        if (DEBUG_MODE) {
            logger.debug('📊 Calculated counts from Statistics:', { kimber: kimberCount, siona: sionaCount, together: togetherCount });
            logger.debug('👨 Kimber countries:', kimberCountries.sort());
            logger.debug('👩 Siona countries:', sionaCountries.sort());
            logger.debug('💕 Together countries:', togetherCountries.sort());
        }
        
        // Also check relationship log for together countries
        if (currentData.relationshipLog) {
            const relationshipTogetherCountries = new Set();
            currentData.relationshipLog.forEach(entry => {
                const [date, kimberCountry, sionaCountry] = entry;
                if (kimberCountry === sionaCountry && kimberCountry) {
                    relationshipTogetherCountries.add(kimberCountry);
                }
            });
            // console.log('💕 Relationship log together countries:', Array.from(relationshipTogetherCountries).sort());
        }
        
        return {
            kimber: kimberCount,
            siona: sionaCount,
            together: togetherCount
        };
    }
    
    // No fallback - Statistics sheet is required
    if (DEBUG_MODE) {
        logger.debug('❌ Statistics sheet not available - cannot calculate country counts');
    }
    const counts = {
        kimber: 0,
        siona: 0,
        together: 0
    };
    
    if (DEBUG_MODE) {
        logger.debug('📊 No data available - returning zero counts');
    }
    
    return counts;
}

function calculateTop5RelationshipCountries() {
    if (DEBUG_MODE) {
        logger.debug('🔍 DEBUG: calculateTop5RelationshipCountries called');
        logger.debug('🔍 DEBUG: currentData.statistics available:', !!currentData.statistics);
        logger.debug('🔍 DEBUG: currentData.statistics length:', currentData.statistics?.length || 0);
    }
    
    // Use Statistics sheet data if available
    if (currentData.statistics && currentData.statistics.length > 0) {
        return currentData.statistics
            .filter(entry => {
                const [country, code, kimberDays, sionaDays, togetherDays, totalDays, rank, kimberVisited, sionaVisited, togetherVisited] = entry;
                return country !== 'Country' && togetherVisited === 'Yes' && Number(togetherDays || 0) > 0;
            })
            .map(entry => {
                const [country, code, kimberDays, sionaDays, togetherDays] = entry;
                return { country: country, days: Number(togetherDays || 0) };
            })
            .sort((a, b) => b.days - a.days)
            .slice(0, 5);
    }
    
    // Fallback to old calculation if Statistics sheet not available
    const countryDays = {};
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (currentData.relationshipLog) {
        currentData.relationshipLog.forEach(entry => {
            const [date, kimberCountry, sionaCountry] = entry;
            const entryDate = parseDate(date);
            if (entryDate > today) return; // Skip future dates
            
            // Only count days when both were in the same country
            if (kimberCountry === sionaCountry && kimberCountry) {
                const standardizedCountry = standardizeCountryName(kimberCountry);
                if (standardizedCountry) {
                    if (!countryDays[standardizedCountry]) {
                        countryDays[standardizedCountry] = 0;
                    }
                    countryDays[standardizedCountry]++;
                }
            }
        });
    }

    // Sort by days and get top 5
    return Object.entries(countryDays)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([country, days]) => ({ country, days }));
}

function createCountryCountsTile(counts) {
    const tile = document.createElement('div');
    tile.className = 'stats-tile';
    tile.innerHTML = `
        <h3><img src="assets/icons/countries.svg" alt="Countries">All Time Country Counts</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-number">${counts.together}</div>
                <div class="stat-label">Together</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${counts.kimber}</div>
                <div class="stat-label">Kimber's Countries</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${counts.siona}</div>
                <div class="stat-label">Siona's Countries</div>
            </div>
        </div>
    `;
    return tile;
}

function createTop5CountriesTile(top5Countries) {
    const tile = document.createElement('div');
    tile.className = 'stats-tile';
    
    const countriesList = top5Countries.map((item, index) => {
        const display = getCountryDisplay(item.country);
        const safeName = sanitizeText(display.name);
        const flagMarkup = display.flag ? `<img class=\"country-flag\" src=\"${sanitizeAttribute(display.flag)}\" alt=\"${safeName} flag\">` : '';
        return `
        <div class="top-country-item">
            <div class="rank">${index + 1}</div>
            <div class="country-name">${flagMarkup}<span>${safeName}</span></div>
            <div class="days-count">${item.days} days</div>
        </div>`;
    }).join('');

    tile.innerHTML = `
        <h3><img src="assets/icons/top5.svg" alt="Top 5 Countries">Top 5 Relationship Countries</h3>
        <div class="top-countries-list">
            ${countriesList}
        </div>
    `;
    return tile;
}
function createPreRelationshipTimeline() {
    const container = document.createElement('div');
    container.className = 'timeline-section';
    
    const header = document.createElement('h3');
    header.innerHTML = '<img src="assets/icons/allTime.svg" alt="All Time">All Time Countries';
    header.style.color = 'white';
    header.style.marginBottom = '15px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '10px';
    container.appendChild(header);
    
    // Use Statistics sheet data instead of PreRelationshipCountries
    if (!currentData.statistics || currentData.statistics.length === 0) {
        const noData = document.createElement('div');
        noData.textContent = 'No statistics data available';
        noData.style.color = '#ccc';
        container.appendChild(noData);
        return container;
    }
    
    if (DEBUG_MODE) {
        logger.debug('🔍 Statistics data structure:', currentData.statistics.slice(0, 2));
    }
    
    // Group countries by visit status
    const togetherCountries = [];
    const kimberCountries = [];
    const sionaCountries = [];
    
    currentData.statistics.forEach((entry, index) => {
        // Handle different data structures - check if it's the old format (10 columns) or new format (8 columns)
        let country, kimberVisited, sionaVisited, togetherVisited;
        
        // Extract country name first to check if we should skip this entry
        country = entry[0];
        // Skip header row and summary rows (including "Total", "Updated", etc.)
        const countryStr = (country || '').toString().trim();
        if (!countryStr || 
            countryStr === 'Country' || 
            countryStr === 'SUMMARY' || 
            countryStr.includes('Total') || 
            countryStr.includes('Updated') ||
            countryStr === '') return;
        
        // Debug the actual data structure first
        if (DEBUG_MODE && index < 3) {
            logger.debug(`🔍 Raw entry ${index}:`, entry);
        }
        
        if (entry.length >= 10) {
            // Old format: [country, code, kimberDays, sionaDays, togetherDays, totalDays, rank, kimberVisited, sionaVisited, togetherVisited]
            [country, , , , , , , kimberVisited, sionaVisited, togetherVisited] = entry;
        } else if (entry.length >= 8) {
            // New format: [country, code, kimberDays, sionaDays, togetherDays, totalDays, rank, kimberVisited]
            // sionaVisited and togetherVisited need to be calculated from the data
            [country, , kimberDaysStr, sionaDaysStr, togetherDaysStr, , , kimberVisited] = entry;
            
            // Convert days to numbers (handle empty strings and convert to 0)
            const kimberDays = parseFloat(kimberDaysStr) || 0;
            const sionaDays = parseFloat(sionaDaysStr) || 0;
            const togetherDays = parseFloat(togetherDaysStr) || 0;
            
            // Calculate sionaVisited and togetherVisited based on days
            sionaVisited = (sionaDays > 0) ? 'Yes' : 'No';
            togetherVisited = (togetherDays > 0) ? 'Yes' : 'No';
            
            // Debug for first few entries
            if (DEBUG_MODE && index < 3) {
                logger.debug(`📊 Days calculation for ${country}:`, {
                    kimberDays,
                    sionaDays,
                    togetherDays,
                    kimberVisited,
                    sionaVisited,
                    togetherVisited
                });
            }
        } else {
            logger.warn(`Unexpected data structure for entry ${index}:`, entry);
            return;
        }
        
        if (country === 'Country') return; // Skip header
        
        // Debug first few entries
        if (DEBUG_MODE && index < 3) {
            logger.debug(`🔍 Parsed entry ${index}:`, {
                country,
                kimberVisited,
                sionaVisited,
                togetherVisited
            });
        }
        
        // Use country name directly since Statistics sheet contains proper names
        const englishName = country;
        
        // Statistics sheet contains "Yes"/"No" for Together, but "1"/"0"/empty for individual visits
        const kimberVisitedNorm = (kimberVisited === 'Yes' || kimberVisited === '1' || kimberVisited === 1) ? 'Yes' : 'No';
        const sionaVisitedNorm = (sionaVisited === 'Yes' || sionaVisited === '1' || sionaVisited === 1) ? 'Yes' : 'No';
        const togetherVisitedNorm = togetherVisited === 'Yes' ? 'Yes' : 'No';
        
        // Debug for first few entries
        if (DEBUG_MODE && index < 3) {
            logger.debug(`🎯 Categorizing ${country}:`, {
                kimberVisitedNorm,
                sionaVisitedNorm,
                togetherVisitedNorm
            });
        }
        
        // Countries Visited Together (Together_Visited = "Yes")
        // This takes priority - if visited together, don't count as individual
        if (togetherVisitedNorm === 'Yes') {
            togetherCountries.push(englishName);
        }
        // Kimber Countries (Kimber_Visited = "Yes" AND Siona_Visited = "No")
        else if (kimberVisitedNorm === 'Yes' && sionaVisitedNorm === 'No') {
            kimberCountries.push(englishName);
        }
        // Siona Countries (Kimber_Visited = "No" AND Siona_Visited = "Yes")
        else if (kimberVisitedNorm === 'No' && sionaVisitedNorm === 'Yes') {
            sionaCountries.push(englishName);
        }
    });
    
    if (DEBUG_MODE) {
        logger.debug('🏗️ Creating tiles with counts:', {
        together: togetherCountries.length,
        kimber: kimberCountries.length,
        siona: sionaCountries.length
    });
    }
    
    // Create tiles in the specified order
    
    // Sort lists alphabetically
    togetherCountries.sort((a,b) => a.localeCompare(b));
    kimberCountries.sort((a,b) => a.localeCompare(b));
    sionaCountries.sort((a,b) => a.localeCompare(b));

    // 1. Countries Visited Together (Together_Visited = "Yes")
    if (togetherCountries.length > 0) {
        const togetherTile = document.createElement('div');
        togetherTile.className = 'country-tile both-tile';
        togetherTile.innerHTML = `
            <div class="tile-header">
                <div class="tile-icon both">💕</div>
                <div class="tile-title">Countries Visited Together</div>
                <div class="tile-count">${togetherCountries.length} countries</div>
            </div>
            <div class="tile-countries">
                ${togetherCountries.map(country => renderCountryTag(country, 'both')).join('')}
            </div>
        `;
        container.appendChild(togetherTile);
    }

    // 2. Kimber Countries (Kimber_Visited = "Yes" AND Siona_Visited = "No")
    if (kimberCountries.length > 0) {
        const kimberTile = document.createElement('div');
        kimberTile.className = 'country-tile kimber-tile';
        kimberTile.innerHTML = `
            <div class="tile-header">
                <img src="https://raw.githubusercontent.com/kimbersykes87-source/TravelPlanner/main/Kimber_Profile_Pic.jpg" alt="Kimber" class="tile-avatar"/>
                <div class="tile-title">Kimber Countries</div>
                <div class="tile-count">${kimberCountries.length} countries</div>
            </div>
            <div class="tile-countries">
                ${kimberCountries.map(country => renderCountryTag(country, 'kimber')).join('')}
            </div>
        `;
        container.appendChild(kimberTile);
    }

    // 3. Siona Countries (Kimber_Visited = "No" AND Siona_Visited = "Yes")
    if (sionaCountries.length > 0) {
        const sionaTile = document.createElement('div');
        sionaTile.className = 'country-tile siona-tile';
        sionaTile.innerHTML = `
            <div class="tile-header">
                <img src="https://raw.githubusercontent.com/kimbersykes87-source/TravelPlanner/main/Siona_Profile_Pic.jpg" alt="Siona" class="tile-avatar"/>
                <div class="tile-title">Siona Countries</div>
                <div class="tile-count">${sionaCountries.length} countries</div>
            </div>
            <div class="tile-countries">
                ${sionaCountries.map(country => renderCountryTag(country, 'siona')).join('')}
            </div>
        `;
        container.appendChild(sionaTile);
    }
    
    return container;
}
function createRelationshipTimeline() {
    if (DEBUG_MODE) {
        logger.debug('🔄 Creating relationship timeline...');
        logger.debug('RelationshipLog data available:', currentData.relationshipLog?.length || 0, 'entries');
    }
    
    const container = document.createElement('div');
    container.className = 'timeline-section';
    
    const header = document.createElement('h3');
    header.innerHTML = '<img src="assets/icons/passport.svg" alt="Passport">Relationship Timeline';
    header.style.color = 'white';
    header.style.marginBottom = '15px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '10px';
    container.appendChild(header);
    
    // Get relationship log data from present day back to Sep 30, 2023
    const relationshipData = getRelationshipTimelineData();
    if (DEBUG_MODE) {
        logger.debug('📊 Processed relationship data:', relationshipData.length, 'periods');
    }
    
    if (relationshipData.length === 0) {
        const noDataMsg = document.createElement('div');
        noDataMsg.textContent = 'No relationship data found for the selected period.';
        noDataMsg.style.color = '#ccc';
        noDataMsg.style.textAlign = 'center';
        noDataMsg.style.padding = '20px';
        container.appendChild(noDataMsg);
        return container;
    }
    
    // Split periods that span across years and group by year
    const periodsByYear = {};
    
    relationshipData.forEach(period => {
        const startDate = parseDate(period.startDate);
        const endDate = parseDate(period.endDate);
        
        if (!startDate || !endDate) {
            logger.error('Invalid date parsing for period:', period);
            return;
        }
        
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        
        if (startYear === endYear) {
            // Period is within a single year
            if (!periodsByYear[startYear]) {
                periodsByYear[startYear] = [];
            }
            periodsByYear[startYear].push(period);
        } else {
            // Period spans across years - split it
            let currentYear = startYear;
            
            while (currentYear <= endYear) {
                const splitPeriod = {
                    startDate: currentYear === startYear ? period.startDate : `${currentYear}-01-01`,
                    endDate: currentYear === endYear ? period.endDate : `${currentYear}-12-31`,
                    countries: period.countries,
                    type: period.type,
                    notes: period.notes,
                    albumUrl: period.albumUrl || ''
                };
                
                if (!periodsByYear[currentYear]) {
                    periodsByYear[currentYear] = [];
                }
                periodsByYear[currentYear].push(splitPeriod);
                
                currentYear++;
            }
        }
    });
    
    // Create year sections with expandable dropdowns
    const years = Object.keys(periodsByYear).sort((a, b) => b - a); // Most recent first
    
    years.forEach(year => {
        const yearSection = document.createElement('div');
        yearSection.className = 'year-section';
        
        const yearHeader = document.createElement('div');
        yearHeader.className = 'year-header';
        yearHeader.innerHTML = `
            <h4><img src="assets/icons/calendar.svg" alt="Calendar" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 6px;"> ${year} (${periodsByYear[year].length} periods)</h4>
            <span class="year-toggle">▼</span>
        `;
        yearHeader.style.cursor = 'pointer';
        yearHeader.style.padding = '10px';
        yearHeader.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        yearHeader.style.borderRadius = '8px';
        yearHeader.style.marginBottom = '10px';
        yearHeader.style.display = 'flex';
        yearHeader.style.justifyContent = 'space-between';
        yearHeader.style.alignItems = 'center';
        yearHeader.style.color = 'white';
        
        const yearContent = document.createElement('div');
        yearContent.className = 'year-content';
        yearContent.style.display = 'none';
        yearContent.style.paddingLeft = '20px';
        
        // Add periods for this year (sort newest first within year)
        const yearPeriods = periodsByYear[year].sort((a, b) => {
            const dateA = parseDate(a.startDate);
            const dateB = parseDate(b.startDate);
            return dateB - dateA; // Newest first within year
        });
        
        yearPeriods.forEach(period => {
            const timelineItem = document.createElement('div');
            timelineItem.className = `timeline-item ${period.type}`;
            timelineItem.style.marginBottom = '10px';
            timelineItem.style.padding = '10px';
            timelineItem.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            timelineItem.style.borderRadius = '6px';
            timelineItem.style.borderLeft = period.type === 'together' ? '4px solid #4CAF50' : '4px solid #FF9800';
            
            // Format date display - show "Present" for current period
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format
            const endDateDisplay = period.endDate === todayStr ? 'Present' : period.endDate;
            
            // Calculate number of days
            let daysCount = 1; // Default to 1 day for same start/end date
            if (period.startDate !== period.endDate) {
                const startDate = parseDate(period.startDate);
                const endDate = parseDate(period.endDate);
                if (startDate && endDate) {
                    const timeDiff = endDate.getTime() - startDate.getTime();
                    daysCount = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end days
                }
            }
            
            const countriesMarkup = renderTimelineCountries(period) || sanitizeText(period.countries || '');
            const notesMarkup = period.notes ? sanitizeText(period.notes) : '';
            
            // Google Photos album support
            const albumUrl = period.albumUrl || '';
            const photosMarkup = albumUrl ? `
                <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                    <a href="${sanitizeAttribute(albumUrl)}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 6px; color: var(--color-primary); text-decoration: none; font-size: 0.85em;">
                        <img src="https://www.gstatic.com/images/icons/material/system/1x/photo_library_white_24dp.png" alt="Photos" style="width: 20px; height: 20px; filter: brightness(0) invert(1) sepia(100%) saturate(200%) hue-rotate(200deg); opacity: 0.8;">
                        <span>View photos</span>
                    </a>
                </div>
            ` : '';

            timelineItem.innerHTML = `
                <div style="display: flex; align-items: flex-start; margin-bottom: 5px;">
                    <div class="timeline-date" style="color: #ccc; font-size: 0.9em; font-family: 'Courier New', monospace; min-width: 200px; margin-right: 15px; flex-shrink: 0;">
                        <div>${period.startDate} - ${endDateDisplay}</div>
                        <div style="font-size: 0.8em; color: #999; margin-top: 2px;">${daysCount} day${daysCount !== 1 ? 's' : ''}</div>
                    </div>
                    <div style="flex: 1;">
                        <div class="timeline-countries" style="color: white; font-weight: bold; margin-bottom: 3px; display:flex; flex-wrap: wrap; gap:8px;">${countriesMarkup}</div>
                        <div class="timeline-notes" style="color: #ccc; font-size: 0.9em;">${notesMarkup}</div>
                        ${photosMarkup}
                    </div>
                </div>
            `;
            
            yearContent.appendChild(timelineItem);
        });
        
        // Toggle functionality
        yearHeader.addEventListener('click', () => {
            const isExpanded = yearContent.style.display !== 'none';
            yearContent.style.display = isExpanded ? 'none' : 'block';
            yearHeader.querySelector('.year-toggle').textContent = isExpanded ? '▼' : '▲';
        });
        
        yearSection.appendChild(yearHeader);
        yearSection.appendChild(yearContent);
        container.appendChild(yearSection);
    });
    
    return container;
}

function getRelationshipTimelineData() {
    if (DEBUG_MODE) {
        logger.debug('🔄 Getting relationship timeline data...');
        logger.debug('Raw relationshipLog data:', currentData.relationshipLog?.slice(0, 3));
    }
    
    const periods = [];
    let currentPeriod = null;
    
    // Filter data from Sep 30, 2023 onwards up to today (exclude future dates)
    const startDate = new Date('2023-09-30');
    const today = new Date();
    today.setHours(23,59,59,999);
    
    if (DEBUG_MODE) {
        logger.debug('Filtering data from', startDate.toDateString(), 'to today');
    }
    
    const filteredData = currentData.relationshipLog.filter(entry => {
        const [date, kimberCountry, sionaCountry] = entry;
        const entryDate = parseDate(date);
        return entryDate >= startDate && entryDate <= today;
    });
    
    if (DEBUG_MODE) {
        logger.debug('Filtered data:', filteredData.length, 'entries');
        logger.debug('Sample filtered entries:', filteredData.slice(0, 3));
    }
    
    // Sort by date (oldest first for proper grouping)
    filteredData.sort((a, b) => parseDate(a[0]) - parseDate(b[0]));
    
    filteredData.forEach(entry => {
        const [date, kimberCountry, sionaCountry, notes, albumUrl] = entry;
        
        const countries = kimberCountry === sionaCountry ? kimberCountry : `${kimberCountry} / ${sionaCountry}`;
        const type = kimberCountry === sionaCountry ? 'together' : 'separate';
        
        if (!currentPeriod || currentPeriod.countries !== countries) {
            if (currentPeriod) periods.push(currentPeriod);
            currentPeriod = {
                startDate: date,
                endDate: date,
                countries: countries,
                type: type,
                notes: notes,
                albumUrl: albumUrl || ''
            };
        } else {
            currentPeriod.endDate = date;
            // If this entry has an album URL and the period doesn't, add it
            if (albumUrl && !currentPeriod.albumUrl) {
                currentPeriod.albumUrl = albumUrl;
            }
        }
    });
    
    if (currentPeriod) periods.push(currentPeriod);
    return periods; // Show all periods
}


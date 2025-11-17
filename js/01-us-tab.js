// Us Tab Functions
function loadUsTab() {
    const profilesGrid = document.getElementById('profilesGrid');
    profilesGrid.innerHTML = '';

    currentData.profiles.forEach(profile => {
        const profileCard = createProfileCard(profile);
        profilesGrid.appendChild(profileCard);
    });
}

function createProfileCard(profile) {
    const card = document.createElement('div');
    card.className = 'profile-card';

    // Parse profile data with new fields
    // Note: New fields (Passport2, USVisa) are AFTER ProfilePictureURL to match sheet structure
    const [profileId, fullName, dob, passportNumber, passportExpiry, passportIssued, placeOfBirth, 
            ff1, ff1Number, ff1Status, ff2, ff2Number, ff2Status, ff3, ff3Number, ff3Status, profilePicUrl,
            passport2Number, passport2Country, passport2Expiry, passport2Issued,
            usVisaNumber, usVisaExpiry, usVisaIssued] = profile;

    const bornText = `${formatLongDate(dob)} in ${placeOfBirth}`;
    const passportCountry = 'UK'; // Requested formatting
    const passportLabel = `${passportCountry} Passport:`;
    const passportExpiryText = formatDDMMYYYY(passportExpiry);

    // Build passport section
    let passportSection = `<p>${passportLabel} ${passportNumber} (Expiry ${passportExpiryText})</p>`;
    
    // Add second passport if present (for Kimber - Australian passport)
    if (passport2Number && passport2Country) {
        const passport2ExpiryText = formatDDMMYYYY(passport2Expiry);
        passportSection += `<p>${passport2Country} Passport: ${passport2Number}${passport2Expiry ? ` (Expiry ${passport2ExpiryText})` : ''}</p>`;
    }
    
    // Add US Visa information if present (for Siona - B1/B2 visa)
    // Display format: "US B1/B2 Visa: Number (Expiry)" - matching passport format
    let visaSection = '';
    if (usVisaNumber) {
        const usVisaExpiryText = usVisaExpiry ? formatDDMMYYYY(usVisaExpiry) : '';
        visaSection = `<p>US B1/B2 Visa: ${usVisaNumber}${usVisaExpiryText ? ` (Expiry ${usVisaExpiryText})` : ''}</p>`;
    }

    // Calculate visa tracking
    const visaData = calculateVisaTracking(profileId);

    card.innerHTML = `
        <div class="profile-header">
            <img src="${getProfilePictureUrl(profilePicUrl, fullName)}" alt="${fullName}" class="profile-pic" 
                 onerror="this.src=createFallbackAvatar('${fullName}'); this.onerror=null;">
            <div class="profile-info">
                <h3>${fullName}</h3>
                <p>Born: ${bornText}</p>
                ${passportSection}
                ${visaSection}
                ${[ff1, ff2, ff3].some(x => x) ? `
                <div style="margin-top:8px;">
                    <div style="font-weight:600;color:#e2e8f0; margin-bottom:4px;">Frequent Flyer</div>
                    <div style="color:#cbd5e1; font-size:0.9rem;">
                        ${ff1 ? `${ff1}: ${ff1Number || ''} ${ff1Status ? `(${ff1Status})` : ''}<br/>` : ''}
                        ${ff2 ? `${ff2}: ${ff2Number || ''} ${ff2Status ? `(${ff2Status})` : ''}<br/>` : ''}
                        ${ff3 ? `${ff3}: ${ff3Number || ''} ${ff3Status ? `(${ff3Status})` : ''}` : ''}
                    </div>
                </div>` : ''}
            </div>
        </div>
        <div class="visa-tracker">
            <h4><img src="assets/icons/passport.svg" alt="Visa Tracking" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;">Visa Tracking</h4>
            ${visaData.map(visa => {
                // ESTA Visa Display
                if (visa.isESTA) {
                    const daysSince = visa.daysSinceEntryExit;
                    const admission = visa.currentAdmission;
                    const upcoming = visa.upcomingUSDays;
                    
                    let status = 'success';
                    if (admission) {
                        if (admission.remaining < 0) status = 'danger';
                        else if (admission.remaining < 10) status = 'danger';
                        else if (admission.remaining < 20) status = 'warning';
                    }
                    
                    // Determine main blue text
                    let mainText = '';
                    if (daysSince) {
                        mainText = `${daysSince.days} days since last ${daysSince.eventType}`;
                    } else if (admission) {
                        mainText = `Current admission: ${admission.days} days (${admission.remaining} remaining)`;
                    } else {
                        mainText = 'No recent activity';
                    }
                    
                    return `
                        <div class="visa-item ${status}">
                            <div class="visa-info">
                                <span class="visa-name">${visa.name}</span>
                                <span class="visa-days ${status}" style="font-weight: 600;">${mainText}</span>
                            </div>
                            <div class="visa-reset">
                                ${upcoming && upcoming.days > 0 ? `
                                    <small>Upcoming visits: ${upcoming.days} days</small>
                                    ${upcoming.plannedEntryDate ? `
                                        <small style="display: block; margin-top: 2px;">Planned entry: ${formatDDMMYY(upcoming.plannedEntryDate)}</small>
                                    ` : '<small style="display: block; margin-top: 2px;">Planned entry: -</small>'}
                                    ${upcoming.plannedExitDate ? `
                                        <small style="display: block; margin-top: 2px;">Planned exit: ${formatDDMMYY(upcoming.plannedExitDate)}</small>
                                    ` : '<small style="display: block; margin-top: 2px;">Planned exit: -</small>'}
                                ` : admission && admission.terminationDate ? `
                                    <small>ESTA termination: ${formatDDMMYY(admission.terminationDate)}</small>
                                    <small style="display: block; margin-top: 2px;">-</small>
                                    <small style="display: block; margin-top: 2px;">-</small>
                                ` : `
                                    <small>-</small>
                                    <small style="display: block; margin-top: 2px;">-</small>
                                    <small style="display: block; margin-top: 2px;">-</small>
                                `}
                            </div>
                        </div>
                    `;
                }
                
                // B1/B2 Visa Display
                if (visa.isB1B2) {
                    const rolling = visa.rolling365;
                    const upcoming = visa.upcomingUSDays;
                    
                    let rollingStatus = 'success';
                    if (rolling.remaining < 0) rollingStatus = 'danger';
                    else if (rolling.remaining < 20) rollingStatus = 'warning';
                    else if (rolling.remaining < 40) rollingStatus = 'warning';
                    
                    return `
                        <div class="visa-item ${rollingStatus}">
                            <div class="visa-info">
                                <span class="visa-name">${visa.name}</span>
                                <span class="visa-days ${rollingStatus}" style="font-weight: 600;">${rolling.remaining} days remaining</span>
                            </div>
                            <div class="visa-reset">
                                ${upcoming && upcoming.days > 0 ? `
                                    <small>Upcoming visits: ${upcoming.days} days</small>
                                    ${upcoming.plannedEntryDate ? `
                                        <small style="display: block; margin-top: 2px;">Planned entry: ${formatDDMMYY(upcoming.plannedEntryDate)}</small>
                                    ` : '<small style="display: block; margin-top: 2px;">Planned entry: -</small>'}
                                    ${upcoming.plannedExitDate ? `
                                        <small style="display: block; margin-top: 2px;">Planned exit: ${formatDDMMYY(upcoming.plannedExitDate)}</small>
                                    ` : '<small style="display: block; margin-top: 2px;">Planned exit: -</small>'}
                                ` : `
                                    <small>-</small>
                                    <small style="display: block; margin-top: 2px;">-</small>
                                    <small style="display: block; margin-top: 2px;">-</small>
                                `}
                            </div>
                        </div>
                    `;
                }
                
                // Standard visa display (UK, Schengen)
                // Schengen uses rolling window (no reset date), UK uses fixed tax year
                const isSchengen = visa.name === 'Schengen';
                
                return `
                <div class="visa-item ${visa.status}">
                    <div class="visa-info">
                        <span class="visa-name">${visa.name}</span>
                            ${visa.isRemaining ? `
                                <span class="visa-days ${visa.status}">${visa.remaining} days remaining</span>
                            ` : `
                        <span class="visa-days ${visa.status}">${visa.days} days</span>
                            `}
                    </div>
                        ${visa.isRemaining || isSchengen ? `
                    <div class="visa-reset">
                                ${visa.isRemaining ? `
                                    <small>(${visa.days} days used)</small>
                                ` : ''}
                                ${isSchengen ? `
                                    ${visa.expirationDate ? `
                                        <small style="display: block; margin-top: 2px;">Projected end date: ${formatDDMMYY(visa.expirationDate)}</small>
                                    ` : '<small style="display: block; margin-top: 2px;">Projected end date: -</small>'}
                                    ${visa.fullRefreshDate ? `
                                        <small style="display: block; margin-top: 2px;">Full refresh date: ${formatDDMMYY(visa.fullRefreshDate)}</small>
                                    ` : '<small style="display: block; margin-top: 2px;">Full refresh date: -</small>'}
                                ` : ''}
                                ${!isSchengen && visa.resetDate ? `
                                    <small style="display: block; margin-top: 2px;">Tax year ends: ${formatDDMMYY(new Date(visa.resetDate.getTime() - 86400000))}</small>
                                    <small style="display: block; margin-top: 2px;">Resets: ${formatDDMMYY(visa.resetDate)}</small>
                                ` : ''}
                    </div>
                        ` : ''}
                </div>
                `;
            }).join('')}
        </div>
    `;

    return card;
}
function getUKTaxYear(today) {
    // UK tax year runs from 6 April to 5 April
    const currentYear = today.getFullYear();
    const april6Current = new Date(currentYear, 3, 6); // April 6 of current calendar year
    const april6Next = new Date(currentYear + 1, 3, 6); // April 6 of next calendar year
    
    if (today >= april6Current) {
        // Current tax year started on April 6 of current year
        return {
            start: april6Current,
            end: new Date(april6Next.getTime() - 1), // April 5 of next year (end of day)
            resetDate: april6Next
        };
    } else {
        // Current tax year started on April 6 of previous year
        const april6Previous = new Date(currentYear - 1, 3, 6);
        return {
            start: april6Previous,
            end: new Date(april6Current.getTime() - 1), // April 5 of current year (end of day)
            resetDate: april6Current
        };
    }
}

function calculateVisaTracking(profileId) {
    console.log(`🔍 Calculating visa tracking for ${profileId}`);
    console.log('RelationshipLog data:', currentData.relationshipLog?.length || 0, 'entries');
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const currentYear = today.getFullYear();
    
    // Get UK tax year (6 Apr - 5 Apr)
    const ukTaxYear = getUKTaxYear(today);
    console.log(`📅 UK Tax Year: ${ukTaxYear.start.toLocaleDateString()} to ${ukTaxYear.end.toLocaleDateString()}`);
    
    if (!currentData.relationshipLog || currentData.relationshipLog.length === 0) {
        console.log('❌ No relationship log data available');
        if (profileId === 'kimber') {
        return [
                { name: 'UK Tax Days', days: 0, remaining: 120, status: 'success', resetDate: ukTaxYear.resetDate, isRemaining: true },
                { name: 'UK Work Days', days: 0, remaining: 39, status: 'success', resetDate: ukTaxYear.resetDate, isRemaining: true, isWorkDays: true },
                { name: 'US ESTA', daysSinceEntryExit: null, currentAdmission: null, upcomingUSDays: { days: 0, plannedEntryDate: null, plannedExitDate: null }, isESTA: true },
                { name: 'Schengen', days: 0, remaining: 90, status: 'success', isRemaining: true, expirationDate: null, fullRefreshDate: null }
            ];
        } else {
            return [
                { name: 'UK Tax Days', days: 0, remaining: 120, status: 'success', resetDate: ukTaxYear.resetDate, isRemaining: true },
                { name: 'UK Work Days', days: 0, remaining: 39, status: 'success', resetDate: ukTaxYear.resetDate, isRemaining: true, isWorkDays: true },
                { name: 'US B1/B2', rolling365: { days: 0, remaining: 180 }, upcomingUSDays: { days: 0, plannedEntryDate: null, plannedExitDate: null }, isB1B2: true },
                { name: 'Schengen', days: 0, remaining: 90, status: 'success', isRemaining: true, expirationDate: null, fullRefreshDate: null }
            ];
        }
    }
    
    // Filter entries within UK tax year
    const taxYearEntries = currentData.relationshipLog.filter(entry => {
        if (!entry || !entry[0]) return false;
        
        try {
            // Handle different date formats
            let entryDate;
            if (entry[0].includes('/')) {
                // DD/MM/YYYY format
                const parts = entry[0].split('/');
                entryDate = new Date(parts[2], parts[1] - 1, parts[0]);
            } else if (entry[0].includes('-')) {
                // YYYY-MM-DD format - parse explicitly to avoid timezone issues
                const parts = entry[0].split('-');
                entryDate = new Date(parts[0], parts[1] - 1, parts[2]);
            } else {
                return false;
            }
            
            // Set to end of day for comparison
            entryDate.setHours(23, 59, 59, 999);
            return entryDate >= ukTaxYear.start && entryDate <= ukTaxYear.end;
        } catch (error) {
            console.log('Date parsing error for entry:', entry[0], error);
            return false;
        }
    });
    
    console.log(`📊 Found ${taxYearEntries.length} entries in current UK tax year`);

    const visaData = [];

    if (profileId === 'kimber') {
        // Kimber's visa requirements
        // Column B (index 1) = KimberCountry
        // Column E (index 4) = KSUKWorkDays
        const ukDays = taxYearEntries.filter(entry => entry[1] === 'United Kingdom').length;
        const ukWorkDays = taxYearEntries.filter(entry => {
            const country = entry[1]; // KimberCountry
            const workDay = entry[4]; // KSUKWorkDays
            return country === 'United Kingdom' && (workDay === 'Yes' || workDay === 'yes' || workDay === 'YES' || workDay === true || workDay === '1');
        }).length;
        
        // ESTA US Visa Tracking
        const daysSinceEntryExit = calculateDaysSinceLastEntryOrExit('kimber', currentData.relationshipLog, today);
        const currentAdmission = calculateCurrentAdmissionDays('kimber', currentData.relationshipLog, today);
        const upcomingUSDays = calculateUpcomingUSDays('kimber', currentData.relationshipLog, today);
        
        // Schengen rolling 180-day calculation
        const schengenRolling = calculateRolling180SchengenDays('kimber', currentData.relationshipLog, today);
        
        console.log(`📊 Kimber visa days - UK: ${ukDays}, UK Work: ${ukWorkDays}, ESTA admission: ${currentAdmission?.days || 0}, Schengen: ${schengenRolling.days}`);

        const remainingUKDays = 120 - ukDays;
        const remainingUKWorkDays = 39 - ukWorkDays;
        const ukWorkStatus = ukWorkDays >= 40 ? 'danger' : ukWorkDays >= 35 ? 'warning' : 'success';

        // Build ESTA visa data
        const estaVisaData = {
            name: 'US ESTA',
            daysSinceEntryExit: daysSinceEntryExit,
            currentAdmission: currentAdmission,
            upcomingUSDays: upcomingUSDays,
            isESTA: true
        };

        const schengenStatus = schengenRolling.days > 80 ? 'danger' : schengenRolling.days > 60 ? 'warning' : 'success';

        visaData.push(
            { name: 'UK Tax Days', days: ukDays, remaining: remainingUKDays, status: remainingUKDays < 0 ? 'danger' : remainingUKDays < 20 ? 'warning' : 'success', resetDate: ukTaxYear.resetDate, isRemaining: true },
            { name: 'UK Work Days', days: ukWorkDays, remaining: remainingUKWorkDays, status: ukWorkStatus, resetDate: ukTaxYear.resetDate, isRemaining: true, isWorkDays: true },
            estaVisaData,
            { name: 'Schengen', days: schengenRolling.days, remaining: schengenRolling.remaining, status: schengenStatus, isRemaining: true, expirationDate: schengenRolling.expirationDate, fullRefreshDate: schengenRolling.fullRefreshDate }
        );
    } else if (profileId === 'siona') {
        // Siona's visa requirements
        // Column C (index 2) = SionaCountry
        // Column F (index 5) = SSUKWorkDays
        const ukDays = taxYearEntries.filter(entry => entry[2] === 'United Kingdom').length;
        const ukWorkDays = taxYearEntries.filter(entry => {
            const country = entry[2]; // SionaCountry
            const workDay = entry[5]; // SSUKWorkDays
            return country === 'United Kingdom' && (workDay === 'Yes' || workDay === 'yes' || workDay === 'YES' || workDay === true || workDay === '1');
        }).length;
        
        // B1/B2 US Visa Tracking
        const rolling365 = calculateRolling365USDays('siona', currentData.relationshipLog, today);
        const upcomingUSDays = calculateUpcomingUSDays('siona', currentData.relationshipLog, today);
        
        // Schengen rolling 180-day calculation
        const schengenRolling = calculateRolling180SchengenDays('siona', currentData.relationshipLog, today);
        
        console.log(`📊 Siona visa days - UK: ${ukDays}, UK Work: ${ukWorkDays}, Rolling 365: ${rolling365.days}, Schengen: ${schengenRolling.days}`);

        const remainingUKDays = 120 - ukDays;
        const remainingUKWorkDays = 39 - ukWorkDays;
        const ukWorkStatus = ukWorkDays >= 40 ? 'danger' : ukWorkDays >= 35 ? 'warning' : 'success';

        // Build B1/B2 visa data
        const b1b2VisaData = {
            name: 'US B1/B2',
            rolling365: rolling365,
            upcomingUSDays: upcomingUSDays,
            isB1B2: true
        };

        const schengenStatus = schengenRolling.days > 80 ? 'danger' : schengenRolling.days > 60 ? 'warning' : 'success';

        visaData.push(
            { name: 'UK Tax Days', days: ukDays, remaining: remainingUKDays, status: remainingUKDays < 0 ? 'danger' : remainingUKDays < 20 ? 'warning' : 'success', resetDate: ukTaxYear.resetDate, isRemaining: true },
            { name: 'UK Work Days', days: ukWorkDays, remaining: remainingUKWorkDays, status: ukWorkStatus, resetDate: ukTaxYear.resetDate, isRemaining: true, isWorkDays: true },
            b1b2VisaData,
            { name: 'Schengen', days: schengenRolling.days, remaining: schengenRolling.remaining, status: schengenStatus, isRemaining: true, expirationDate: schengenRolling.expirationDate, fullRefreshDate: schengenRolling.fullRefreshDate }
        );
    }

    return visaData;
}

// Helper function to parse date from RelationshipLog entry
function parseRelationshipLogDate(dateStr) {
    if (!dateStr) return null;
    try {
        let entryDate;
        if (dateStr.includes('/')) {
            // DD/MM/YYYY format
            const parts = dateStr.split('/');
            entryDate = new Date(parts[2], parts[1] - 1, parts[0]);
        } else if (dateStr.includes('-')) {
            // YYYY-MM-DD format - parse explicitly to avoid timezone issues
            const parts = dateStr.split('-');
            entryDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
            return null;
        }
        // Set to start of day for consistent comparison
        entryDate.setHours(0, 0, 0, 0);
        return entryDate;
    } catch (error) {
        console.log('Date parsing error:', dateStr, error);
        return null;
    }
}

// Check if country is contiguous territory (Canada or Mexico)
function isContiguousTerritory(country) {
    return country === 'Canada' || country === 'Mexico';
}

// Check if country is US or contiguous territory
function isUSOrContiguous(country) {
    return country === 'United States' || isContiguousTerritory(country);
}

// Calculate days between two dates (inclusive of both dates)
// Entry day counts as Day 1
function calculateDaysInclusive(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const diff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    return diff + 1; // +1 because entry day counts as Day 1
}

// Detect US admission periods for ESTA
function detectUSAdmissionPeriods(profileId, relationshipLog, today) {
    if (!relationshipLog || relationshipLog.length === 0) return [];
    
    const countryIndex = profileId === 'kimber' ? 1 : 2;
    const periods = [];
    let currentPeriod = null;
    
    // Sort entries by date
    const sortedEntries = relationshipLog
        .map(entry => ({
            date: parseRelationshipLogDate(entry[0]),
            country: entry[countryIndex],
            rawDate: entry[0]
        }))
        .filter(entry => entry.date !== null)
        .sort((a, b) => a.date - b.date);
    
    for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const prevCountry = i > 0 ? sortedEntries[i - 1].country : null;
        const isUSOrContig = isUSOrContiguous(entry.country);
        const wasUSOrContig = prevCountry ? isUSOrContiguous(prevCountry) : false;
        
        // Entry: Transition from non-US/contiguous to US/contiguous
        if (!wasUSOrContig && isUSOrContig) {
            if (currentPeriod) {
                // Close previous period
                periods.push({...currentPeriod, endDate: sortedEntries[i - 1].date});
            }
            // Start new admission period
            currentPeriod = {
                entryDate: entry.date,
                entryCountry: entry.country,
                endDate: null,
                exitDate: null
            };
        }
        
        // Exit: Transition from US/contiguous to non-US/contiguous
        // Exit happens on the day they transition, but the last day in US/contiguous is the previous day
        if (wasUSOrContig && !isUSOrContig && currentPeriod) {
            // The last day in US/contiguous territory is the previous entry's date
            const lastDayInContiguous = sortedEntries[i - 1].date;
            currentPeriod.endDate = lastDayInContiguous;
            currentPeriod.exitDate = entry.date; // Exit date is the day they left (current entry date)
            periods.push({...currentPeriod});
            currentPeriod = null;
        }
    }
    
    // If still in an admission period, add it
    if (currentPeriod) {
        currentPeriod.endDate = today;
        periods.push(currentPeriod);
    }
    
    return periods;
}
// Calculate days since last entry or exit for ESTA
// Only uses dates on or before today
function calculateDaysSinceLastEntryOrExit(profileId, relationshipLog, today) {
    const countryIndex = profileId === 'kimber' ? 1 : 2;
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    // Filter to only dates on or before today
    const validEntries = relationshipLog
        .map(entry => ({
            date: parseRelationshipLogDate(entry[0]),
            country: entry[countryIndex],
            rawDate: entry[0]
        }))
        .filter(entry => entry.date !== null && entry.date <= todayStart)
        .sort((a, b) => b.date - a.date); // Sort descending (most recent first)
    
    if (validEntries.length === 0) return null;
    
    // Find the most recent entry or exit from US/contiguous territory
    // Look for transitions going backwards in time (most recent first)
    let lastEventDate = null;
    let eventType = null;
    
    // Check if most recent entry is US or non-US
    const mostRecentEntry = validEntries[0];
    const mostRecentIsUS = isUSOrContiguous(mostRecentEntry.country);
    
    // If most recent entry is non-US, look for exit (transition from US to non-US)
    if (!mostRecentIsUS) {
        // Look for the most recent transition from US to non-US
        for (let i = 0; i < validEntries.length - 1; i++) {
            const currentEntry = validEntries[i];
            const nextEntry = validEntries[i + 1];
            const currentIsUS = isUSOrContiguous(currentEntry.country);
            const nextIsUS = isUSOrContiguous(nextEntry.country);
            
            if (!currentIsUS && nextIsUS) {
                // Found transition from US (nextEntry) to non-US (currentEntry)
                // Exit date is the last day in US = nextEntry.date
                lastEventDate = nextEntry.date;
                eventType = 'exit';
                break;
            }
        }
    } else {
        // Most recent entry is US, so we're currently in US
        // Look for the most recent entry date (transition from non-US to US)
        for (let i = 0; i < validEntries.length - 1; i++) {
            const currentEntry = validEntries[i];
            const nextEntry = validEntries[i + 1];
            const currentIsUS = isUSOrContiguous(currentEntry.country);
            const nextIsUS = isUSOrContiguous(nextEntry.country);
            
            if (currentIsUS && !nextIsUS) {
                // Found transition from non-US (nextEntry) to US (currentEntry)
                // Entry date is the first day in US = currentEntry.date
                lastEventDate = currentEntry.date;
                eventType = 'entry';
                break;
            }
        }
        
        // If no transition found, find the earliest US entry in the valid entries
        if (!lastEventDate) {
            for (let i = validEntries.length - 1; i >= 0; i--) {
                if (isUSOrContiguous(validEntries[i].country)) {
                    lastEventDate = validEntries[i].date;
                    eventType = 'entry';
                    break;
                }
            }
        }
    }
    
    if (!lastEventDate) return null;
    
    // Calculate days since (inclusive: today is day 0 if event was today)
    const eventStart = new Date(lastEventDate);
    eventStart.setHours(0, 0, 0, 0);
    const daysSince = Math.floor((todayStart - eventStart) / (1000 * 60 * 60 * 24));
    
    return { days: daysSince, eventType, eventDate: lastEventDate };
}

// Calculate current admission period days for ESTA (including contiguous territory)
// This counts all days in US + contiguous territory since entry
function calculateCurrentAdmissionDays(profileId, relationshipLog, today) {
    const periods = detectUSAdmissionPeriods(profileId, relationshipLog, today);
    if (periods.length === 0) return null;
    
    const currentPeriod = periods[periods.length - 1];
    if (currentPeriod.exitDate) return null; // Not currently in an admission period
    
    // Count actual days in RelationshipLog from entry to today (inclusive)
    // Entry day counts as Day 1
    const countryIndex = profileId === 'kimber' ? 1 : 2;
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const periodEntryStart = new Date(currentPeriod.entryDate);
    periodEntryStart.setHours(0, 0, 0, 0);
    
    // Count days in RelationshipLog where country is US or contiguous
    const daysInPeriod = relationshipLog.filter(entry => {
        const entryDate = parseRelationshipLogDate(entry[0]);
        if (!entryDate) return false;
        const entryDateStart = new Date(entryDate);
        entryDateStart.setHours(0, 0, 0, 0);
        return entryDateStart >= periodEntryStart && entryDateStart <= todayStart && isUSOrContiguous(entry[countryIndex]);
    }).length;
    
    const remainingDays = 90 - daysInPeriod;
    
    // Calculate termination date (last day you can be in US)
    // Entry day = Day 1, so Day 90 = entryDate + 89 days
    const terminationDate = new Date(currentPeriod.entryDate);
    terminationDate.setDate(terminationDate.getDate() + 89);
    
    return {
        days: daysInPeriod,
        remaining: remainingDays,
        entryDate: currentPeriod.entryDate,
        entryCountry: currentPeriod.entryCountry,
        terminationDate: terminationDate
    };
}
// Calculate upcoming US visit days from future RelationshipLog entries
// Returns object with days, plannedEntryDate, and plannedExitDate
function calculateUpcomingUSDays(profileId, relationshipLog, today) {
    if (!relationshipLog || relationshipLog.length === 0) return { days: 0, plannedEntryDate: null, plannedExitDate: null };
    
    const countryIndex = profileId === 'kimber' ? 1 : 2;
    let upcomingDays = 0;
    let inUpcomingPeriod = false;
    let plannedEntryDate = null;
    let plannedExitDate = null;
    
    // Sort entries by date
    const sortedEntries = relationshipLog
        .map(entry => ({
            date: parseRelationshipLogDate(entry[0]),
            country: entry[countryIndex],
            rawDate: entry[0]
        }))
        .filter(entry => entry.date !== null && entry.date > today)
        .sort((a, b) => a.date - b.date);
    
    for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const isUSOrContig = isUSOrContiguous(entry.country);
        
        if (isUSOrContig) {
            if (!inUpcomingPeriod) {
                inUpcomingPeriod = true;
                plannedEntryDate = entry.date; // First US/contiguous entry
            }
            plannedExitDate = entry.date; // Update exit date (last US/contiguous entry)
            upcomingDays++;
        } else {
            if (inUpcomingPeriod) {
                // Exit from contiguous territory, stop counting
                break;
            }
        }
    }
    
    return {
        days: upcomingDays,
        plannedEntryDate: plannedEntryDate,
        plannedExitDate: plannedExitDate
    };
}

// Calculate rolling 365-day US days total for B1/B2
function calculateRolling365USDays(profileId, relationshipLog, today) {
    if (!relationshipLog || relationshipLog.length === 0) return { days: 0, remaining: 180 };
    
    const countryIndex = profileId === 'kimber' ? 1 : 2;
    const yearStart = new Date(today);
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    yearStart.setHours(0, 0, 0, 0);
    
    const usDays = relationshipLog.filter(entry => {
        const entryDate = parseRelationshipLogDate(entry[0]);
        if (!entryDate) return false;
        return entryDate >= yearStart && entryDate <= today && entry[countryIndex] === 'United States';
    }).length;
    
    const remainingDays = 180 - usDays;
    return { days: usDays, remaining: remainingDays };
}

// Check if a country is part of Schengen Area
function isSchengenCountry(country) {
    const schengenCountries = [
        'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Czech Republic', 'Denmark', 
        'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 
        'Italy', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 
        'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Slovakia', 
        'Slovenia', 'Spain', 'Sweden', 'Switzerland',
        // Microstates (treated as inside for practical stays)
        'Monaco', 'San Marino', 'Vatican City'
    ];
    return schengenCountries.includes(country);
}

// Calculate rolling 180-day Schengen days total
// Returns the Schengen days in the last 180 days from TODAY
function calculateRolling180SchengenDays(profileId, relationshipLog, today) {
    if (!relationshipLog || relationshipLog.length === 0) {
        return { days: 0, remaining: 90, expirationDate: null };
    }
    
    const countryIndex = profileId === 'kimber' ? 1 : 2;
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    // Calculate the 180-day window ending today
    const windowStart = new Date(todayStart);
    windowStart.setDate(windowStart.getDate() - 179); // 180 days inclusive (179 days back + today)
    windowStart.setHours(0, 0, 0, 0);
    
    // Get all Schengen entries in the last 180 days
    const schengenEntries = relationshipLog
        .map(entry => ({
            date: parseRelationshipLogDate(entry[0]),
            country: entry[countryIndex],
            rawDate: entry[0]
        }))
        .filter(entry => {
            if (!entry.date) return false;
            const entryStart = new Date(entry.date);
            entryStart.setHours(0, 0, 0, 0);
            return entryStart >= windowStart && entryStart <= todayStart && isSchengenCountry(entry.country);
        });
    
    const daysInLast180 = schengenEntries.length;
    const remainingDays = 90 - daysInLast180;
    
    // Calculate expiration date: if they continue staying in Schengen, when would they hit 90 days?
    // This is today + remaining days (assuming continuous stay)
    let expirationDate = null;
    if (remainingDays > 0 && remainingDays < 90) {
        expirationDate = new Date(todayStart);
        expirationDate.setDate(expirationDate.getDate() + remainingDays);
    } else if (daysInLast180 >= 90) {
        // Already at or over limit
        expirationDate = todayStart;
    }
    
    // Calculate full refresh date: when will all current Schengen days fall outside the 180-day window?
    // If list is empty, full 90 is available today
    // Otherwise, take the latest (most recent) Schengen day and add 180 days
    let fullRefreshDate = null;
    if (schengenEntries.length === 0) {
        // Full 90 days available today
        fullRefreshDate = new Date(todayStart);
    } else {
        // Find the latest (most recent) Schengen day
        const latestDay = schengenEntries.reduce((latest, entry) => {
            return entry.date > latest ? entry.date : latest;
        }, schengenEntries[0].date);
        
        const latestDate = new Date(latestDay);
        latestDate.setHours(0, 0, 0, 0);
        fullRefreshDate = new Date(latestDate);
        fullRefreshDate.setDate(fullRefreshDate.getDate() + 180); // 180 days after the latest day
    }
    
    return { 
        days: daysInLast180, 
        remaining: remainingDays,
        expirationDate: expirationDate,
        fullRefreshDate: fullRefreshDate
    };
}


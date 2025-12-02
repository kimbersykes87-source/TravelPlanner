function loadFutureTab() {
    hydrateFutureScenarioModels();
    setupScenarioFilterControl();
    renderFutureScenarioList();
}

function setupScenarioFilterControl() {
    const filterSelect = document.getElementById('scenarioFilter');
    if (!filterSelect) return;
    if (!filterSelect.dataset.bound) {
        filterSelect.addEventListener('change', (event) => {
            updateScenarioFilter(event.target.value || 'all');
        });
        filterSelect.dataset.bound = 'true';
    }
    filterSelect.value = currentScenarioFilter;
}

function updateScenarioFilter(value) {
    currentScenarioFilter = value || 'all';
    renderFutureScenarioList();
}

function collectScenarioCountryInfos(scenario) {
    if (!scenario) return [];

    const entries = [];
    const indexByKey = new Map();

    const resolveCode = (info, rawName) => {
        const candidates = [
            info?.alpha3,
            standardizeCountryName(info?.name || ''),
            standardizeCountryName(rawName || ''),
            info?.alpha2
        ].map(value => (value || '').toString().trim().toUpperCase())
         .filter(Boolean);

        const alpha3 = candidates.find(value => /^[A-Z]{3}$/.test(value));
        if (alpha3) return alpha3;

        const alpha2 = candidates.find(value => /^[A-Z]{2}$/.test(value));
        if (alpha2) return alpha2;

        const fallback = (info?.name || rawName || '').toString().trim().slice(0, 3).toUpperCase();
        return fallback || '???';
    };

    const ensureEntry = (countryName) => {
        if (!countryName) return null;
        const info = getCountryReference(countryName);
        const keySource = info.alpha3 || standardizeCountryName(countryName) || standardizeCountryName(info.name || '') || countryName;
        const key = (keySource || '').toString().trim().toUpperCase();
        if (!key) return null;

        let entry = indexByKey.get(key);
        if (!entry) {
            entry = {
                info: {
                    name: info.name || countryName,
                    alpha2: info.alpha2 || '',
                    alpha3: info.alpha3 || '',
                    flagUrl: info.flagUrl || ''
                },
                code: resolveCode(info, countryName),
                days: 0
            };
            indexByKey.set(key, entry);
            entries.push(entry);
        } else {
            if (!entry.info.flagUrl && info.flagUrl) {
                entry.info.flagUrl = info.flagUrl;
            }
            if (!entry.info.name && info.name) {
                entry.info.name = info.name;
            }
            if (!entry.info.alpha2 && info.alpha2) {
                entry.info.alpha2 = info.alpha2;
            }
            if (!entry.info.alpha3 && info.alpha3) {
                entry.info.alpha3 = info.alpha3;
                entry.code = resolveCode(entry.info, countryName);
            }
        }
        return entry;
    };

    let hasDurationEntries = false;

    if (Array.isArray(scenario.stays)) {
        scenario.stays.forEach(stay => {
            if (!stay || !stay.country) return;
            let duration = calculateDurationInDays(stay.startDate, stay.endDate);
            if ((!Number.isFinite(duration) || duration <= 0) && stay.startDate) {
                duration = 1;
            }
            if (!Number.isFinite(duration) || duration <= 0) {
                return;
            }
            const entry = ensureEntry(stay.country);
            if (!entry) return;
            entry.days += duration;
            hasDurationEntries = true;
        });
    }

    if (!hasDurationEntries) {
        const registerCountry = (value) => {
            if (!value) return;
            ensureEntry(value);
        };

        if (Array.isArray(scenario.countries)) {
            scenario.countries.forEach(registerCountry);
        }
        if (typeof scenario.headline === 'string' && scenario.headline) {
            scenario.headline
                .replace(/&/g, ' and ')
                .split(/,| and |\/|\||•|·/i)
                .map(part => part.trim())
                .filter(Boolean)
                .forEach(registerCountry);
        }
    }

    const entriesWithData = hasDurationEntries
        ? entries.filter(entry => entry.days > 0)
        : entries.slice();

    entriesWithData.sort((a, b) => {
        if (hasDurationEntries && Number.isFinite(a.days) && Number.isFinite(b.days) && a.days !== b.days) {
            return b.days - a.days;
        }
        const codeA = (a.code || '').toString();
        const codeB = (b.code || '').toString();
        return codeA.localeCompare(codeB);
    });

    return entriesWithData;
}

function renderScenarioFlagIcons(scenario) {
    const infos = collectScenarioCountryInfos(scenario);
    if (!infos.length) return '';

    const displayed = infos.slice(0, SCENARIO_CARD_FLAG_LIMIT);
    const extraCount = infos.length - displayed.length;

    const linesMarkup = displayed.map(entry => {
        const name = entry.info.name || entry.code || 'Country';
        const codeLabel = (entry.code || '???').toString().slice(0, 3).toUpperCase();
        const dayCount = Math.max(0, Math.round(entry.days));
        const dayLabel = `${String(dayCount).padStart(2, '0')} ${dayCount === 1 ? 'day' : 'days'}`;
        const flagContent = entry.info.flagUrl
            ? `<img src="${sanitizeAttribute(entry.info.flagUrl)}" alt="${sanitizeAttribute(`${name} flag`)}">`
            : sanitizeText('🌍');

        return `
            <div class="scenario-card__flag-line">
                <span class="scenario-card__flag">${flagContent}</span>
                <span class="scenario-card__flag-code">${sanitizeText(codeLabel)}</span>
                <span class="scenario-card__flag-days">${sanitizeText(dayLabel)}</span>
            </div>
        `;
    }).join('');

    const extraMarkup = extraCount > 0
        ? `<div class="scenario-card__flag-extra">${sanitizeText(`+${extraCount} more ${extraCount === 1 ? 'country' : 'countries'}`)}</div>`
        : '';

    return `
        <div class="scenario-card__flags" aria-label="${sanitizeAttribute('Scenario countries and total days')}">
            ${linesMarkup}${extraMarkup}
        </div>
    `;
}

function renderFutureScenarioList() {
    const scenarioList = document.getElementById('scenarioList');
    if (!scenarioList) return;
    disposeScenarioMaps();
    scenarioList.innerHTML = '';

    const models = currentData.futureScenarioModels || [];
    const filtered = currentScenarioFilter === 'all'
        ? models
        : models.filter(model => model.createdBy === currentScenarioFilter);

    if (filtered.length === 0) {
        scenarioList.innerHTML = `
            <div class="scenario-editor-stays-empty">
                No scenarios yet. Start planning your next adventure!
            </div>
        `;
        return;
    }

    filtered.forEach(model => {
        const card = buildScenarioCardElement(model);
        scenarioList.appendChild(card);
    });
}

function buildScenarioCardElement(scenario) {
    const iconPath = getScenarioIconPath(scenario.icon);
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.dataset.scenarioId = scenario.scenarioId;
    const ratingMarkup = renderScenarioRating(scenario.rating, { scenarioId: scenario.scenarioId });
    const flagMarkup = renderScenarioFlagIcons(scenario);
    const summaryChips = renderScenarioSummaryChips(scenario);
    const updatedLabel = scenario.lastUpdated ? `Updated ${formatRelativeDate(scenario.lastUpdated)}` : '';

    card.innerHTML = `
        <div class="scenario-card__header">
            <div class="scenario-card__icon">
                <img src="${sanitizeAttribute(iconPath)}" alt="">
            </div>
            <div class="scenario-card__meta">
                <h3>${sanitizeText(scenario.headline)}</h3>
                <p>${renderScenarioCreatorLabel(scenario.createdBy)} • ${formatScenarioDateRange(scenario.startDate, scenario.endDate)}</p>
            </div>
            <div class="scenario-card__actions">
                <button class="btn secondary" type="button" onclick="openScenarioEditor('${scenario.scenarioId}')">Edit</button>
                <button class="btn ghost" type="button" onclick="handleScenarioDelete('${scenario.scenarioId}')">Delete</button>
            </div>
        </div>
        ${flagMarkup}
        <div class="scenario-card__summary">
            ${ratingMarkup}
            <div class="scenario-card__badges">${summaryChips}</div>
            ${updatedLabel ? `<span class="scenario-badge">${sanitizeText(updatedLabel)}</span>` : ''}
        </div>
        <details>
            <summary>View itinerary & visa checks</summary>
            <div class="scenario-detail" id="scenarioDetail-${scenario.scenarioId}">
                <div class="scenario-detail-loading">Fetching visa projections…</div>
            </div>
        </details>
    `;

    const details = card.querySelector('details');
    if (details) {
        details.addEventListener('toggle', () => {
            if (details.open) {
                renderScenarioDetail(scenario.scenarioId);
            }
        });
    }

    return card;
}

function renderScenarioSummaryChips(scenario) {
    const chips = [];
    if (scenario.durationDays) {
        chips.push(`<span class="scenario-badge">${sanitizeText(`${scenario.durationDays} ${scenario.durationDays === 1 ? 'day' : 'days'}`)}</span>`);
    }
    if (scenario.countryCount) {
        chips.push(`<span class="scenario-badge">${sanitizeText(`${scenario.countryCount} ${scenario.countryCount === 1 ? 'country' : 'countries'}`)}</span>`);
    }
    if (scenario.travellers && scenario.travellers.length) {
        const travellerLabel = scenario.travellers.length === 1 && scenario.travellers[0] !== 'both'
            ? (scenario.travellers[0] === 'kimber' ? 'Kimber solo' : 'Siona solo')
            : 'Together';
        chips.push(`<span class="scenario-badge">${sanitizeText(travellerLabel)}</span>`);
    }
    if (scenario.accommodationType) {
        // Use getAccommodationIcon to get SVG icon instead of emoji
        const accommodationIcon = getAccommodationIcon(scenario.accommodationType);
        chips.push(`<span class="scenario-badge">${accommodationIcon}</span>`);
    }
    return chips.join('');
}

function renderScenarioRating(rating, options = {}) {
    const { interactive = false, scenarioId = '', showValue = true } = options;
    const safeRating = clampScenarioRating(Number(rating) || 0);
    const classes = ['scenario-rating'];
    if (interactive) {
        classes.push('scenario-rating--interactive');
    }

    const attributes = [];
    if (scenarioId) {
        attributes.push(`data-scenario-id="${sanitizeAttribute(scenarioId)}"`);
    }
    attributes.push(`data-rating="${safeRating.toFixed(1)}"`);

    const label = `${safeRating.toFixed(1)} out of 5 stars`;
    if (interactive) {
        attributes.push(`role="slider"`);
        attributes.push(`aria-valuemin="0"`);
        attributes.push(`aria-valuemax="5"`);
        attributes.push(`aria-valuenow="${safeRating.toFixed(1)}"`);
        attributes.push(`tabindex="0"`);
    }
    attributes.push(`aria-label="${sanitizeAttribute(label)}"`);
    attributes.push(`title="${sanitizeAttribute(label)}"`);

    const starsMarkup = Array.from({ length: 5 }, (_, index) => {
        const starNumber = index + 1;
        const starState = getScenarioRatingStarState(safeRating, starNumber);
        return `<span class="scenario-rating__star" data-index="${starNumber}" data-state="${starState}"></span>`;
    }).join('');

    const valueMarkup = showValue
        ? `<span class="scenario-rating__value">${safeRating.toFixed(1)}</span>`
        : '';

    return `
        <div class="${classes.join(' ')}" ${attributes.join(' ')}>
            <div class="scenario-rating__stars">
                ${starsMarkup}
            </div>
            ${valueMarkup}
        </div>
    `;
}

function clampScenarioRating(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    const clamped = Math.min(5, Math.max(0, numeric));
    return Math.round(clamped * 2) / 2;
}

function getScenarioRatingStarState(rating, starNumber) {
    if (rating >= starNumber - 0.0001) {
        return 'full';
    }
    if (rating >= starNumber - 0.5 - 0.0001) {
        return 'half';
    }
    return 'empty';
}

function setScenarioRatingVisual(container, rating) {
    if (!container) return;
    const safeRating = clampScenarioRating(Number(rating) || 0);
    const label = `${safeRating.toFixed(1)} out of 5 stars`;
    container.dataset.rating = safeRating.toFixed(1);
    container.setAttribute('aria-label', label);
    container.setAttribute('title', label);
    if (container.classList.contains('scenario-rating--interactive')) {
        container.setAttribute('aria-valuenow', safeRating.toFixed(1));
    }
    const valueEl = container.querySelector('.scenario-rating__value');
    if (valueEl) {
        valueEl.textContent = safeRating.toFixed(1);
    }
    container.querySelectorAll('.scenario-rating__star').forEach((star, index) => {
        star.setAttribute('data-state', getScenarioRatingStarState(safeRating, index + 1));
    });
}

function escapeScenarioIdForSelector(value) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
    }
    return value.replace(/["\\]/g, '\\$&');
}

function updateScenarioRatingElements(scenarioId, rating) {
    if (!scenarioId) return;
    const safeId = escapeScenarioIdForSelector(scenarioId);
    document.querySelectorAll(`.scenario-rating[data-scenario-id="${safeId}"]`).forEach(element => {
        setScenarioRatingVisual(element, rating);
    });
}

function markScenarioRatingPendingState(scenarioId, pending) {
    const safeId = escapeScenarioIdForSelector(scenarioId);
    document.querySelectorAll(`.scenario-rating[data-scenario-id="${safeId}"]`).forEach(element => {
        if (pending) {
            element.classList.add('scenario-rating--pending');
        } else {
            element.classList.remove('scenario-rating--pending');
            element.classList.remove('scenario-rating--busy');
        }
    });
}

function scheduleScenarioRatingPersist(scenarioId, rating) {
    if (!scenarioId) return;
    const existing = scenarioRatingTimers.get(scenarioId);
    if (existing && existing.timeoutId) {
        clearTimeout(existing.timeoutId);
    }
    const scenario = (currentData.futureScenarioModels || []).find(model => model.scenarioId === scenarioId);
    const savedRating = clampScenarioRating(Number(scenario?.rating) || 0);
    if (savedRating === clampScenarioRating(rating)) {
        scenarioRatingTimers.delete(scenarioId);
        markScenarioRatingPendingState(scenarioId, false);
        return;
    }
    markScenarioRatingPendingState(scenarioId, true);
    const timeoutId = setTimeout(() => {
        flushScenarioRatingDraft(scenarioId).catch(error => {
            logger.error('Failed to persist scenario rating:', error);
        });
    }, SCENARIO_RATING_SAVE_DELAY);
    scenarioRatingTimers.set(scenarioId, { timeoutId, rating });
}

async function flushScenarioRatingDraft(scenarioId, options = {}) {
    const entry = scenarioRatingTimers.get(scenarioId);
    if (!entry) return;
    scenarioRatingTimers.delete(scenarioId);
    const result = await persistScenarioRating(scenarioId, entry.rating, options);
    if (!result && options.restoreOnFailure !== false) {
        // restore UI to saved rating if persistence failed
        const scenario = (currentData.futureScenarioModels || []).find(model => model.scenarioId === scenarioId);
        const fallback = clampScenarioRating(Number(scenario?.rating) || 0);
        updateScenarioRatingElements(scenarioId, fallback);
    }
}

function flushAllScenarioRatingDrafts(options = {}) {
    const ids = Array.from(scenarioRatingTimers.keys());
    ids.forEach(id => {
        const entry = scenarioRatingTimers.get(id);
        if (entry && entry.timeoutId) {
            clearTimeout(entry.timeoutId);
        }
        flushScenarioRatingDraft(id, Object.assign({}, options, { restoreOnFailure: false })).catch(error => {
            console.error('Failed to persist scenario rating during flush:', error);
        });
    });
}

async function persistScenarioRating(scenarioId, rating, options = {}) {
    const scenario = (currentData.futureScenarioModels || []).find(model => model.scenarioId === scenarioId);
    if (!scenario) return false;

    const desiredRating = clampScenarioRating(rating);
    const previousSavedRating = clampScenarioRating(Number(scenario.rating) || 0);
    if (previousSavedRating === desiredRating && !options.force) {
        updateScenarioRatingElements(scenarioId, desiredRating);
        return true;
    }

    const payload = buildScenarioPayloadFromScenario(scenario);
    payload.rating = desiredRating;
    payload.lastUpdated = new Date().toISOString();

    markScenarioRatingPendingState(scenarioId, true);
    const result = await upsertScenarioRemote(payload, { keepalive: Boolean(options.keepalive) });
    markScenarioRatingPendingState(scenarioId, false);
    if (!result || result.success === false) {
        logger.error('Failed to update scenario rating', result);
        if (!options.silent) {
            showStatus('❌ Unable to update the scenario rating right now.', 'error');
        }
        updateScenarioRatingElements(scenarioId, previousSavedRating);
        return false;
    }

    scenario.rating = desiredRating;
    scenario.lastUpdated = payload.lastUpdated;
    updateScenarioRatingElements(scenarioId, desiredRating);
    const safeId = escapeScenarioIdForSelector(scenarioId);
    const card = document.querySelector(`.scenario-card[data-scenario-id="${safeId}"]`);
    if (card && scenario.lastUpdated) {
        const summary = card.querySelector('.scenario-card__summary');
        if (summary) {
            const badge = Array.from(summary.querySelectorAll('.scenario-badge')).find(element => {
                const text = (element.textContent || '').trim().toLowerCase();
                return text.startsWith('updated ');
            });
            const label = `Updated ${formatRelativeDate(scenario.lastUpdated)}`;
            if (badge) {
                badge.textContent = label;
            } else {
                const newBadge = document.createElement('span');
                newBadge.className = 'scenario-badge';
                newBadge.textContent = label;
                summary.appendChild(newBadge);
            }
        }
    }
    if (!options.silent) {
        showStatus('Scenario rating updated.', 'success');
    }
    return true;
}

function computeScenarioRatingFromClientX(container, clientX) {
    if (!container) return null;
    const stars = Array.from(container.querySelectorAll('.scenario-rating__star'));
    if (!stars.length) return null;

    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const rect = star.getBoundingClientRect();
        const starNumber = i + 1;

        if (clientX < rect.left) {
            return clampScenarioRating(starNumber - 1);
        }

        if (clientX <= rect.right) {
            const midpoint = rect.left + rect.width / 2;
            return clampScenarioRating(clientX <= midpoint ? starNumber - 0.5 : starNumber);
        }
    }

    return 5;
}

function initializeScenarioRatingControl(scenario) {
    if (!scenario || !scenario.scenarioId) return;
    const detailContainer = document.getElementById(`scenarioDetail-${scenario.scenarioId}`);
    if (!detailContainer) return;

    const selectorId = escapeScenarioIdForSelector(scenario.scenarioId);
    const ratingContainer = detailContainer.querySelector(`.scenario-rating--interactive[data-scenario-id="${selectorId}"]`);
    if (!ratingContainer || ratingContainer.dataset.initialized === 'true') return;

    ratingContainer.dataset.initialized = 'true';
    let committedRating = clampScenarioRating(Number(scenario.rating) || 0);
    setScenarioRatingVisual(ratingContainer, committedRating);

    ratingContainer.addEventListener('mousemove', event => {
        const preview = computeScenarioRatingFromClientX(ratingContainer, event.clientX);
        if (preview == null) return;
        setScenarioRatingVisual(ratingContainer, preview);
    });

    ratingContainer.addEventListener('mouseleave', () => {
        setScenarioRatingVisual(ratingContainer, committedRating);
    });

    ratingContainer.addEventListener('click', async event => {
        const nextRating = computeScenarioRatingFromClientX(ratingContainer, event.clientX);
        if (nextRating == null || nextRating === committedRating) {
            setScenarioRatingVisual(ratingContainer, committedRating);
            return;
        }

        committedRating = nextRating;
        setScenarioRatingVisual(ratingContainer, committedRating);
        scheduleScenarioRatingPersist(scenario.scenarioId, committedRating);
    });

    ratingContainer.addEventListener('keydown', async event => {
        let nextRating = null;
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowUp':
                nextRating = clampScenarioRating(committedRating + 0.5);
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                nextRating = clampScenarioRating(committedRating - 0.5);
                break;
            case 'Home':
            case '0':
                nextRating = 0;
                break;
            case 'End':
                nextRating = 5;
                break;
            default:
                return;
        }

        event.preventDefault();
        if (nextRating === committedRating) return;

        committedRating = nextRating;
        setScenarioRatingVisual(ratingContainer, committedRating);
        scheduleScenarioRatingPersist(scenario.scenarioId, committedRating);
    });
}

function openScenarioEditor(scenarioId) {
    const modal = document.getElementById('scenarioEditorModal');
    if (!modal) return;

    let scenarioModel = null;
    if (scenarioId) {
        scenarioModel = (currentData.futureScenarioModels || []).find(model => model.scenarioId === scenarioId);
    }

    const defaultScenarioIcon = (SCENARIO_ICON_OPTIONS[0]?.value) || 'camping';
    const scenario = scenarioModel ? {
        scenarioId: scenarioModel.scenarioId,
        headline: scenarioModel.headline,
        createdBy: scenarioModel.createdBy || 'kimber',
        rating: Number(scenarioModel.rating) || 0,
        startDate: scenarioModel.startDate || '',
        endDate: scenarioModel.endDate || '',
        summary: scenarioModel.summary || '',
        icon: (() => {
            const normalized = (scenarioModel.icon || '').toString().toLowerCase();
            return SCENARIO_ICON_OPTIONS.some(option => option.value === normalized)
                ? normalized
                : defaultScenarioIcon;
        })(),
        accommodationType: scenarioModel.accommodationType || '',
        lastUpdated: scenarioModel.lastUpdated || ''
    } : {
        scenarioId: '',
        headline: '',
        createdBy: 'kimber',
        rating: 0,
        startDate: '',
        endDate: '',
        summary: '',
        icon: defaultScenarioIcon,
        accommodationType: '',
        lastUpdated: ''
    };

    const stays = scenarioModel ? (scenarioModel.stays || []).map(stay => ({ ...stay })) : [];

    scenarioEditorState = {
        scenario,
        stays,
        validation: null,
        errors: []
    };

    modal.classList.add('active');
    renderScenarioEditor();
}

function createScenario() {
    openScenarioEditor();
}

function closeScenarioEditor() {
    const modal = document.getElementById('scenarioEditorModal');
    if (modal) {
        modal.classList.remove('active');
    }
    closeScenarioIconMenu();
    scenarioEditorState = null;
}

function renderScenarioEditor() {
    if (!scenarioEditorState) return;
    const { scenario } = scenarioEditorState;

    const title = document.getElementById('scenarioEditorTitle');
    if (title) {
        title.textContent = scenario.scenarioId ? 'Edit Scenario' : 'Create Scenario';
    }

    const headlineInput = document.getElementById('scenarioHeadline');
    if (headlineInput) headlineInput.value = scenario.headline || '';

    const summaryInput = document.getElementById('scenarioSummary');
    if (summaryInput) summaryInput.value = scenario.summary || '';

    const creatorSelect = document.getElementById('scenarioCreator');
    if (creatorSelect) {
        creatorSelect.innerHTML = SCENARIO_CREATOR_OPTIONS.map(option => `
            <option value="${option.value}" ${option.value === scenario.createdBy ? 'selected' : ''}>
                ${option.label}
            </option>
        `).join('');
    }

    renderScenarioIconSelector(scenario.icon);
    renderScenarioEditorStays();
    updateScenarioDateInputs();
    renderScenarioEditorMessages();
    
    // Reset Save button to disabled (must check scenario first)
    const saveButton = document.getElementById('scenarioEditorSaveButton');
    if (saveButton) {
        saveButton.disabled = true;
        
        // Setup save button click handler for spinner
        // Remove any existing listeners by cloning the button
        const newSaveButton = saveButton.cloneNode(true);
        saveButton.parentNode.replaceChild(newSaveButton, saveButton);
        
        // Add click listener to show spinner immediately
        newSaveButton.addEventListener('click', function(event) {
            showToastSpinner('Saving proposed scenario...');
        });
    }
}

function renderScenarioRatingPicker(selectedRating) {
    const picker = document.getElementById('scenarioRatingPicker');
    if (!picker) return;
    picker.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const button = document.createElement('button');
        button.type = 'button';
        if (i <= selectedRating) {
            button.classList.add('active');
        }
        button.textContent = '★';
        button.setAttribute('aria-label', `${i} star${i === 1 ? '' : 's'}`);
        button.addEventListener('click', () => {
            if (!scenarioEditorState) return;
            scenarioEditorState.scenario.rating = i;
            renderScenarioRatingPicker(i);
        });
        picker.appendChild(button);
    }
}

function renderScenarioEditorStays() {
    const container = document.getElementById('scenarioEditorStays');
    if (!container || !scenarioEditorState) return;
    const stays = scenarioEditorState.stays || [];
    if (stays.length === 0) {
        container.innerHTML = `
            <div class="scenario-editor-stays-empty">
                Add your first stay to begin plotting the adventure.
            </div>
        `;
        updateScenarioDateInputs();
        return;
    }

    closeScenarioAccommodationMenu();
    container.innerHTML = stays.map((stay, index) => buildScenarioStayCard(stay, index)).join('');
    updateScenarioDateInputs();
}

function buildScenarioStayCard(stay, index) {
    const profileScope = (stay.profileScope || 'both').toLowerCase();
    const accommodationType = stay.accommodationType || '';
    const countryOptions = renderScenarioCountryOptions(stay.country || '', true);
    const flagMarkup = getCountryFlagHtml(stay.country);
    const datalistId = `scenario-country-options-${index}`;
    const travellersSelectId = `scenarioStayTravellers-${index}`;
    const countryInputId = `scenarioStayCountry-${index}`;
    const startInputId = `scenarioStayStart-${index}`;
    const endInputId = `scenarioStayEnd-${index}`;
    const notesId = `scenarioStayNotes-${index}`;
    const routeId = `scenarioStayRoute-${index}`;

    const accommodationOptions = getScenarioAccommodationOptions(accommodationType);
    const normalizedAccommodation = (accommodationType || '').toLowerCase();
    const selectedAccommodation = accommodationOptions.find(option => option.value.toLowerCase() === normalizedAccommodation)
        || accommodationOptions[0]
        || { value: '', label: 'Select accommodation', path: '' };
    const triggerIconMarkup = selectedAccommodation.path
        ? `<img src="${sanitizeAttribute(selectedAccommodation.path)}" alt="">`
        : `<span class="scenario-accommodation-select__icon-placeholder">${sanitizeText((selectedAccommodation.label || selectedAccommodation.value || '?').charAt(0) || '?')}</span>`;
    const triggerLabel = sanitizeText(selectedAccommodation.label || selectedAccommodation.value || 'Select accommodation');

    const accommodationMenuMarkup = accommodationOptions.map(option => {
        const isActive = option.value.toLowerCase() === normalizedAccommodation;
        const optionIconMarkup = option.path
            ? `<img src="${sanitizeAttribute(option.path)}" alt="">`
            : `<span class="scenario-accommodation-select__option-placeholder">${sanitizeText((option.label || option.value || '?').charAt(0) || '?')}</span>`;
        const optionLabel = sanitizeText(option.label || option.value || 'Select accommodation');
        return `
            <button type="button" class="scenario-accommodation-select__option${isActive ? ' active' : ''}" data-value="${sanitizeAttribute(option.value)}" onclick="selectScenarioAccommodationFromButton(${index}, this)">
                ${optionIconMarkup}
                <span>${optionLabel}</span>
            </button>
        `;
    }).join('');

    return `
        <div class="scenario-editor-stay-card" data-stay-index="${index}">
            <div class="stay-card-header">
                <h5>Stay ${index + 1}</h5>
                <button class="btn ghost" type="button" onclick="removeScenarioStayRow(${index})">Remove</button>
            </div>
            <div class="scenario-editor-stay-grid">
                <div class="form-field">
                    <label>Travellers</label>
                    <select id="${travellersSelectId}" onchange="onScenarioStayFieldChange(${index}, 'profileScope', this.value)">
                        <option value="both" ${profileScope === 'both' ? 'selected' : ''}>Together</option>
                        <option value="kimber" ${profileScope === 'kimber' ? 'selected' : ''}>Kimber</option>
                        <option value="siona" ${profileScope === 'siona' ? 'selected' : ''}>Siona</option>
                    </select>
                </div>
                <div class="form-field form-field--full">
                    <label>Country</label>
                    <div class="scenario-country-select">
                        <span class="scenario-country-flag">${flagMarkup}</span>
                        <input type="text"
                               id="${countryInputId}"
                               class="scenario-country-input"
                               list="${datalistId}"
                               placeholder="Start typing a country"
                               value="${sanitizeAttribute(stay.country || '')}"
                               oninput="onScenarioStayCountryInput(${index}, this)"
                               onchange="commitScenarioStayCountryInput(${index}, this)"
                               onblur="commitScenarioStayCountryInput(${index}, this)">
                        <datalist id="${datalistId}">
                            ${countryOptions}
                        </datalist>
                    </div>
                </div>
                <div class="form-field scenario-date-field">
                    <label>Start date</label>
                    <div class="scenario-input-with-icon">
                        <button type="button" class="scenario-date-trigger" aria-label="Open start date picker" onclick="openSiblingDatePicker(this)">
                            <img src="assets/icons/calendar.svg" alt="">
                        </button>
                        <input type="date" id="${startInputId}" value="${sanitizeAttribute(stay.startDate || '')}" onchange="onScenarioStayFieldChange(${index}, 'startDate', this.value)">
                    </div>
                </div>
                <div class="form-field scenario-date-field">
                    <label>End date</label>
                    <div class="scenario-input-with-icon">
                        <button type="button" class="scenario-date-trigger" aria-label="Open end date picker" onclick="openSiblingDatePicker(this)">
                            <img src="assets/icons/calendar.svg" alt="">
                        </button>
                        <input type="date" id="${endInputId}" value="${sanitizeAttribute(stay.endDate || '')}" onchange="onScenarioStayFieldChange(${index}, 'endDate', this.value)">
                    </div>
                </div>
                <div class="form-field">
                    <label>Accommodation</label>
                    <div class="scenario-accommodation-select" data-open="false">
                        <button type="button" class="scenario-accommodation-select__trigger" onclick="toggleScenarioAccommodationMenu(${index}, this)">
                            <span class="scenario-accommodation-select__icon">${triggerIconMarkup}</span>
                            <span class="scenario-accommodation-select__label">${triggerLabel}</span>
                            <span class="scenario-accommodation-select__chevron">▾</span>
                        </button>
                        <div class="scenario-accommodation-select__menu" role="listbox">
                            ${accommodationMenuMarkup}
                        </div>
                    </div>
                </div>
            </div>
            <div class="form-field form-field--full">
                <label>Notes</label>
                <textarea id="${notesId}" rows="2" oninput="onScenarioStayFieldInput(${index}, 'notes', this.value)">${sanitizeText(stay.notes || '')}</textarea>
            </div>
            <div class="form-field form-field--full">
                <label>Route / key cities</label>
                <textarea id="${routeId}" rows="2" oninput="onScenarioStayFieldInput(${index}, 'routeNotes', this.value)">${sanitizeText(stay.routeNotes || '')}</textarea>
            </div>
            <div class="form-field form-field--full">
                <label>Image URL (optional)</label>
                <input type="url" 
                       id="scenarioStayImage-${index}" 
                       placeholder="https://..."
                       value="${sanitizeAttribute(stay.imageUrl || '')}"
                       oninput="onScenarioStayFieldInput(${index}, 'imageUrl', this.value)">
                ${stay.imageUrl ? `<div style="margin-top: 8px;"><img src="${sanitizeAttribute(stay.imageUrl)}" alt="Stay image" style="max-width: 200px; max-height: 150px; border-radius: 8px; object-fit: cover;"></div>` : ''}
            </div>
        </div>
    `;
}

function renderScenarioEditorMessages() {
    const errorContainer = document.getElementById('scenarioEditorErrors');
    const footerErrorContainer = document.getElementById('scenarioEditorFooterErrors');
    const validationContainer = document.getElementById('scenarioEditorValidation');
    if (!scenarioEditorState) {
        if (errorContainer) errorContainer.classList.remove('active');
        if (footerErrorContainer) footerErrorContainer.innerHTML = '';
        if (validationContainer) validationContainer.innerHTML = '';
        return;
    }

    const errors = scenarioEditorState.errors || [];
    
    // Hide top error container (replaced by validation container)
    if (errorContainer) {
        errorContainer.classList.remove('active');
        errorContainer.innerHTML = '';
    }

    // Clear footer errors (moved to validation container)
    if (footerErrorContainer) {
        footerErrorContainer.innerHTML = '';
    }

    // Display errors and validation in the validation container
    if (validationContainer) {
        const validation = scenarioEditorState.validation;
        
        // Show errors if any exist
        if (errors.length > 0) {
            validationContainer.innerHTML = `
                <div class="scenario-editor-validation-errors">
                    <strong>Validation Errors:</strong>
                    <ul>
                        ${errors.map(err => `<li>${sanitizeText(err)}</li>`).join('')}
                    </ul>
                    <div style="margin-top: 12px; font-size: 0.85rem; color: #94a3b8;">
                        Please fix these errors before saving.
                    </div>
                </div>
            `;
        } else if (!validation) {
            validationContainer.innerHTML = '<em>Click "Check Scenario" to validate visa requirements and other checks.</em>';
        } else {
            const warnings = validation.warnings || [];
            const breakdown = validation.breakdown || [];
            const hasErrors = breakdown.some(item => item.status === 'error');
            
            validationContainer.innerHTML = `
                <strong>Visa Check Results:</strong>
                ${hasErrors ? '<div style="color: #f87171; margin-top: 8px;">⚠️ Some visa rules have errors. Please review below.</div>' : ''}
                ${warnings.length ? `<div class="scenario-warning" style="margin-top: 8px;">${warnings.map(w => sanitizeText(w)).join('<br>')}</div>` : ''}
                ${!hasErrors && !warnings.length ? '<div style="margin-top: 8px;">✅ All visa checks passed!</div>' : ''}
                ${breakdown.length ? `
                    <div style="margin-top:12px; font-size: 0.85rem;">
                        ${breakdown.map(item => {
                            const statusEmoji = item.status === 'error' ? '❌' : item.status === 'warning' ? '⚠️' : '✅';
                            const statusColor = item.status === 'error' ? '#f87171' : item.status === 'warning' ? '#fbbf24' : '#10b981';
                            return `<div style="color: ${statusColor}; margin: 4px 0;">${statusEmoji} ${sanitizeText(item.label || item.ruleId)} — ${sanitizeText(item.usedDays || item.projected)}/${sanitizeText(item.limit)} days ${item.remainingDays != null ? `(${item.remainingDays >= 0 ? '+' : ''}${sanitizeText(item.remainingDays)} remaining)` : ''}</div>`;
                        }).join('')}
                    </div>
                ` : ''}
                ${!hasErrors && !warnings.length ? '<div style="margin-top: 12px; color: #10b981; font-weight: 600;">✓ Ready to save</div>' : ''}
            `;
        }
    }
}

function onScenarioFieldChange(field, value) {
    if (!scenarioEditorState) return;
    if (field === 'createdBy' || field === 'icon') {
        scenarioEditorState.scenario[field] = (value || '').toString().trim().toLowerCase();
    } else {
        scenarioEditorState.scenario[field] = value;
    }
}

function onScenarioStayFieldChange(index, field, value) {
    if (!scenarioEditorState || !scenarioEditorState.stays[index]) return;
    scenarioEditorState.stays[index][field] = value;
    if (field === 'startDate' || field === 'endDate') {
        const aligned = autoAlignStayChainStateFrom(index + 1);
        syncScenarioDatesFromStays();
        updateScenarioDateInputs();
        if (aligned) {
            renderScenarioEditorStays();
        }
    }
}

function onScenarioStayCountryInput(index, inputElement) {
    if (!scenarioEditorState || !scenarioEditorState.stays[index] || !inputElement) return;
    const rawValue = inputElement.value || '';
    scenarioEditorState.stays[index].country = rawValue;
    const flagContainer = inputElement.closest('.scenario-country-select')?.querySelector('.scenario-country-flag');
    if (flagContainer) {
        flagContainer.innerHTML = getCountryFlagHtml(rawValue);
    }
}

function commitScenarioStayCountryInput(index, inputElement) {
    if (!scenarioEditorState || !scenarioEditorState.stays[index] || !inputElement) return;
    const resolved = resolveScenarioCountryValue(inputElement.value || '');
    scenarioEditorState.stays[index].country = resolved;
    inputElement.value = resolved;
    const flagContainer = inputElement.closest('.scenario-country-select')?.querySelector('.scenario-country-flag');
    if (flagContainer) {
        flagContainer.innerHTML = getCountryFlagHtml(resolved);
    }
}

function resolveScenarioCountryValue(inputValue) {
    const value = (inputValue || '').trim();
    if (!value) return '';

    const options = getScenarioCountryOptions();
    const normalizedValue = standardizeCountryName(value);

    const exactMatch = options.find(option =>
        standardizeCountryName(option.name) === normalizedValue ||
        (option.alpha3 && standardizeCountryName(option.alpha3) === normalizedValue) ||
        (option.alpha2 && standardizeCountryName(option.alpha2) === normalizedValue)
    );
    if (exactMatch) {
        return exactMatch.name;
    }

    if (value.length >= 3) {
        const lowerValue = value.toLowerCase();
        const prefixMatch = options.find(option =>
            option.name.toLowerCase().startsWith(lowerValue) ||
            (option.alpha3 && option.alpha3.toLowerCase().startsWith(lowerValue)) ||
            (option.alpha2 && option.alpha2.toLowerCase().startsWith(lowerValue))
        );
        if (prefixMatch) {
            return prefixMatch.name;
        }
    }

    return value;
}

function openSiblingDatePicker(triggerButton) {
    if (!triggerButton) return;
    const container = triggerButton.closest('.scenario-input-with-icon');
    const input = container ? container.querySelector('input[type="date"]') : null;
    if (input) {
        if (typeof input.showPicker === 'function') {
            input.showPicker();
        } else {
            input.focus();
        }
    }
}

function onScenarioStayFieldInput(index, field, value) {
    if (!scenarioEditorState || !scenarioEditorState.stays[index]) return;
    scenarioEditorState.stays[index][field] = value;
}

function addScenarioStayRow() {
    if (!scenarioEditorState) return;
    const stays = scenarioEditorState.stays;
    const newStay = {
        scenarioId: scenarioEditorState.scenario.scenarioId || '',
        stayId: '',
        profileScope: 'both',
        country: '',
        city: '',
        startDate: scenarioEditorState.scenario.startDate || '',
        endDate: scenarioEditorState.scenario.endDate || '',
        notes: '',
        accommodationType: '',
        routeNotes: '',
        imageUrl: ''
    };

    if (Array.isArray(stays) && stays.length > 0) {
        const previousStay = stays[stays.length - 1];
        const anchorDate = previousStay.endDate || previousStay.startDate;
        if (anchorDate) {
            const nextStart = addDaysToIsoDate(anchorDate, 1);
            newStay.startDate = nextStart;
            newStay.endDate = nextStart;
        }
    }

    scenarioEditorState.stays.push(newStay);
    autoAlignStayChainStateFrom(scenarioEditorState.stays.length - 1);
    syncScenarioDatesFromStays();
    updateScenarioDateInputs();
    renderScenarioEditorStays();
}

function removeScenarioStayRow(index) {
    if (!scenarioEditorState) return;
    scenarioEditorState.stays.splice(index, 1);
    autoAlignStayChainStateFrom(index);
    syncScenarioDatesFromStays();
    updateScenarioDateInputs();
    renderScenarioEditorStays();
}

function syncScenarioDatesFromStays() {
    if (!scenarioEditorState) return;
    const stays = scenarioEditorState.stays.filter(stay => stay.startDate);
    if (stays.length === 0) {
        scenarioEditorState.scenario.startDate = '';
        scenarioEditorState.scenario.endDate = '';
        return;
    }
    const sorted = [...stays].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    const minStart = sorted[0].startDate;
    const maxEnd = sorted.reduce((latest, current) => {
        if (!current.endDate) return latest;
        if (!latest) return current.endDate;
        return current.endDate > latest ? current.endDate : latest;
    }, sorted[0].endDate || sorted[0].startDate);

    if (!scenarioEditorState.scenario.startDate || scenarioEditorState.scenario.startDate > minStart) {
        scenarioEditorState.scenario.startDate = minStart;
    }
    if (!scenarioEditorState.scenario.endDate || scenarioEditorState.scenario.endDate < maxEnd) {
        scenarioEditorState.scenario.endDate = maxEnd;
    }
}

function updateScenarioDateInputs() {
    if (!scenarioEditorState) return;
    const summaryEl = document.getElementById('scenarioDateSummary');
    if (!summaryEl) return;

    const { scenario } = scenarioEditorState;
    const start = scenario.startDate;
    const end = scenario.endDate;

    let summaryText = 'Dates TBC';
    if (start && end) {
        const rangeText = formatScenarioDateRange(start, end);
        const duration = calculateDurationInDays(start, end);
        const durationText = duration ? ` • ${duration} ${duration === 1 ? 'day' : 'days'}` : '';
        summaryText = `${rangeText}${durationText}`;
    } else if (start) {
        summaryText = `Starting ${formatLongDate(start)}`;
    } else if (end) {
        summaryText = `Wrapping ${formatLongDate(end)}`;
    }

    summaryEl.textContent = summaryText;
}

async function checkScenario() {
    if (!scenarioEditorState) return;

    const checkButton = document.getElementById('scenarioEditorCheckButton');
    const saveButton = document.getElementById('scenarioEditorSaveButton');
    
    if (checkButton) checkButton.disabled = true;
    
    // Show spinner
    showToastSpinner('Checking visa requirements...');

    try {
        syncScenarioDatesFromStays();
        const payload = buildScenarioPayloadFromState();

        const validation = await validateScenarioRemote(payload);
        if (!validation || validation.success === false && validation.error) {
            scenarioEditorState.errors = [validation?.error || 'Unable to validate scenario.'];
            scenarioEditorState.validation = null;
            renderScenarioEditorMessages();
            if (saveButton) saveButton.disabled = true;
            return;
        }

        scenarioEditorState.validation = validation;
        scenarioEditorState.errors = validation.errors || [];
        renderScenarioEditorMessages();

        // Enable Save button only if no errors (check both errors array and breakdown)
        const hasErrors = (validation.errors && validation.errors.length > 0) || 
                         (validation.breakdown && validation.breakdown.some(item => item.status === 'error'));
        
        if (saveButton) {
            saveButton.disabled = hasErrors;
        }
    } catch (error) {
        logger.error('Scenario check failed:', error);
        scenarioEditorState.errors = ['Unable to check scenario. Please try again.'];
        scenarioEditorState.validation = null;
        renderScenarioEditorMessages();
        if (saveButton) saveButton.disabled = true;
    } finally {
        hideToastSpinner();
        if (checkButton) checkButton.disabled = false;
    }
}

async function submitScenarioEditor(event) {
    // Prevent default form submission since we're handling it asynchronously
    event.preventDefault();
    if (!scenarioEditorState) {
        hideToastSpinner();
        return;
    }

    const saveButton = document.getElementById('scenarioEditorSaveButton');
    if (saveButton) saveButton.disabled = true;

    // Ensure spinner is shown (click handler should have already shown it)
    showToastSpinner('Saving proposed scenario...');

    try {
        // Validation already done via Check Scenario button
        // Save button is only enabled if validation passed, so we can proceed directly
        syncScenarioDatesFromStays();
        const payload = buildScenarioPayloadFromState();

        const saveResult = await upsertScenarioRemote(payload);
        if (!saveResult || saveResult.success === false) {
            scenarioEditorState.errors = [saveResult?.error || 'Unable to save scenario right now.'];
            renderScenarioEditorMessages();
            hideToastSpinner();
            if (saveButton) saveButton.disabled = false;
            return;
        }

        ensureScenarioPayloadIds(payload, saveResult);
        upsertScenarioLocalModelFromPayload(payload);
        
        // Hide spinner immediately after successful save
        hideToastSpinner();
        
        closeScenarioEditor();
        showStatus('Scenario saved successfully!', 'success');
        
        // Refresh data in background (don't wait for it)
        refreshScenarioData().catch(refreshError => {
            logger.warn('Refresh scenario data failed, using local cache:', refreshError);
        });
    } catch (error) {
        logger.error('Save scenario failed:', error);
        hideToastSpinner();
        if (saveButton) saveButton.disabled = false;
    }
}

function buildScenarioPayloadFromState() {
    if (!scenarioEditorState) return null;
    const scenario = scenarioEditorState.scenario;
    const stays = scenarioEditorState.stays || [];
    return {
        scenarioId: scenario.scenarioId || '',
        headline: scenario.headline || '',
        createdBy: scenario.createdBy || 'kimber',
        rating: Number(scenario.rating) || 0,
        startDate: scenario.startDate || '',
        endDate: scenario.endDate || '',
        summary: scenario.summary || '',
        icon: scenario.icon || 'future',
        accommodationType: scenario.accommodationType || '',
        lastUpdated: new Date().toISOString(),
        stays: stays.map(stay => ({
            stayId: stay.stayId || '',
            profileScope: stay.profileScope || 'both',
            country: stay.country || '',
            city: stay.city || '',
            startDate: stay.startDate || '',
            endDate: stay.endDate || stay.startDate || '',
            notes: stay.notes || '',
            accommodationType: stay.accommodationType || '',
            routeNotes: stay.routeNotes || '',
            imageUrl: stay.imageUrl || ''
        }))
    };
}

function buildScenarioPayloadFromScenario(scenario) {
    return {
        scenarioId: scenario.scenarioId || '',
        headline: scenario.headline || '',
        createdBy: scenario.createdBy || 'kimber',
        rating: Number(scenario.rating) || 0,
        startDate: scenario.startDate || '',
        endDate: scenario.endDate || '',
        summary: scenario.summary || '',
        icon: scenario.icon || 'future',
        accommodationType: scenario.accommodationType || '',
        lastUpdated: scenario.lastUpdated || new Date().toISOString(),
        stays: (scenario.stays || []).map(stay => ({
            stayId: stay.stayId || '',
            profileScope: stay.profileScope || 'both',
            country: stay.country || '',
            city: stay.city || '',
            startDate: stay.startDate || '',
            endDate: stay.endDate || stay.startDate || '',
            notes: stay.notes || '',
            accommodationType: stay.accommodationType || '',
            routeNotes: stay.routeNotes || '',
            imageUrl: stay.imageUrl || ''
        }))
    };
}

async function refreshScenarioData() {
    try {
        const [scenariosSheet, staysSheet, visaRulesSheet] = await Promise.all([
            loadSheetData(SPREADSHEET_ID, 'FutureScenarios'),
            loadSheetData(SPREADSHEET_ID, 'ScenarioStays'),
            loadSheetData(SPREADSHEET_ID, 'VisaRules')
        ]);

        currentData.futureScenarios = Array.isArray(scenariosSheet) ? scenariosSheet.slice(1) : [];
        currentData.scenarioStays = Array.isArray(staysSheet) ? staysSheet.slice(1) : [];
        if (Array.isArray(visaRulesSheet) && visaRulesSheet.length > 1) {
            currentData.visaRules = visaRulesSheet.slice(1);
        }

        scenarioValidationCache.clear();
        hydrateFutureScenarioModels();
        renderFutureScenarioList();
    } catch (error) {
        logger.error('Failed to refresh scenario data:', error);
        showStatus(`❌ Unable to refresh scenarios: ${error.message}`, 'error');
    }
}

async function handleScenarioDelete(scenarioId) {
    if (!scenarioId) return;
    const scenario = (currentData.futureScenarioModels || []).find(model => model.scenarioId === scenarioId);
    const name = scenario ? scenario.headline : 'this scenario';
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
        return;
    }

    const result = await deleteScenarioRemote(scenarioId);
    if (!result || result.success === false) {
        showStatus(`❌ Unable to delete scenario: ${result?.error || 'Unknown error'}`, 'error');
        return;
    }

    showStatus('Scenario deleted.', 'success');
    await refreshScenarioData();
}

async function renderScenarioDetail(scenarioId) {
    const container = document.getElementById(`scenarioDetail-${scenarioId}`);
    if (!container) return;

    const scenario = (currentData.futureScenarioModels || []).find(model => model.scenarioId === scenarioId);
    if (!scenario) {
        container.innerHTML = '<div class="scenario-detail-loading">Scenario not found.</div>';
        return;
    }

    // Show toast spinner
    showToastSpinner('Loading proposed itinerary...');

    try {
        // Always clear cache and re-validate to ensure we get latest server-side calculations
        // This ensures ESTA filtering works correctly
        scenarioValidationCache.delete(scenarioId);
        
        container.innerHTML = '<div class="scenario-detail-loading">Running visa projections…</div>';
        const payload = buildScenarioPayloadFromScenario(scenario);
        const validation = await validateScenarioRemote(payload);
        if (!validation || validation.success === false && validation.error) {
            container.innerHTML = `<div class="scenario-detail-loading">Unable to calculate visa projections: ${sanitizeText(validation?.error || 'Unknown error')}</div>`;
            hideToastSpinner();
            return;
        }
        scenarioValidationCache.set(scenarioId, validation);

        container.innerHTML = buildScenarioDetailHtml(scenario, validation);
        initializeScenarioRatingControl(scenario);
        await ensureScenarioMap(scenario);
    } finally {
        hideToastSpinner();
    }
}

function buildScenarioDetailHtml(scenario, validation) {
    const summaryRows = computeScenarioVisaSummaryRows(scenario, validation);
    const warnings = validation.warnings || [];
    const errors = validation.errors || [];

    const breakdownRows = summaryRows.length ? summaryRows.map(row => {
        const statusClass = row.status === 'error'
            ? 'status-error'
            : row.status === 'warning'
                ? 'status-warning'
                : 'status-ok';
        const statusLabel = row.status === 'error'
            ? 'Exceeded'
            : row.status === 'warning'
                ? 'Warning'
                : 'OK';
        const startDays = Number.isFinite(row.startDays) ? Math.round(row.startDays) : '—';
        const endDays = Number.isFinite(row.endDays) ? Math.round(row.endDays) : '—';
        const usedDays = Number.isFinite(row.usedDays) ? Math.round(row.usedDays) : '—';
        const remainingDays = Number.isFinite(row.remainingDays) ? Math.round(row.remainingDays) : '—';
        const label = row.label || row.ruleId || 'Rule';
        return `
            <tr>
                <td>${sanitizeText(label)}</td>
                <td>${sanitizeText(startDays)}</td>
                <td>${sanitizeText(endDays)}</td>
                <td>${sanitizeText(usedDays)}</td>
                <td>${sanitizeText(remainingDays)}</td>
                <td class="${statusClass}">${sanitizeText(statusLabel)}</td>
            </tr>
        `;
    }).join('') : '<tr><td colspan="6">No visa impacts detected.</td></tr>';

    const warningsHtml = warnings.length
        ? `<div class="scenario-warning">${warnings.map(w => sanitizeText(w)).join('<br>')}</div>`
        : '';
    const errorsHtml = errors.length
        ? `<div class="scenario-error">${errors.map(e => sanitizeText(e)).join('<br>')}</div>`
        : '';

    const ratingControl = renderScenarioRating(scenario.rating, {
        interactive: true,
        scenarioId: scenario.scenarioId,
        showValue: true
    });

    return `
        <div class="scenario-detail-rating">
            <h4 style="margin:0;">Scenario rating</h4>
            ${ratingControl}
        </div>
        <div>
            <h4 style="margin:8px 0;">Map highlights</h4>
            <div class="scenario-map" id="scenario-map-${scenario.scenarioId}"></div>
        </div>
        <div class="scenario-visa-table">
            <table>
                <thead>
                    <tr>
                        <th>Rule</th>
                        <th>Start days</th>
                        <th>End days</th>
                        <th>Days used</th>
                        <th>Days remaining</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${breakdownRows}
                </tbody>
            </table>
        </div>
        ${warningsHtml}
        ${errorsHtml}
        <div>
            <h4 style="margin:8px 0;">Itinerary</h4>
            <div class="scenario-timeline">
                ${buildScenarioTimelineHtml(scenario)}
            </div>
        </div>
    `;
}

function buildScenarioTimelineHtml(scenario) {
    if (!scenario.stays || scenario.stays.length === 0) {
        return `<div class="scenario-editor-stays-empty">No stays added for this scenario.</div>`;
    }
    return scenario.stays.map(stay => {
        const duration = calculateDurationInDays(stay.startDate, stay.endDate);
        const accommodationIcon = getAccommodationIcon(stay.accommodationType);
        const profileLabel = stay.profileScope === 'kimber'
            ? 'Kimber solo'
            : stay.profileScope === 'siona'
                ? 'Siona solo'
                : 'Together';
        const flag = getCountryFlagHtml(stay.country);
        const locationLabel = stay.city
            ? `${stay.city}, ${stay.country}`
            : (stay.country || 'Destination');
        const metadata = [
            formatScenarioDateRange(stay.startDate, stay.endDate),
            duration ? `${duration} ${duration === 1 ? 'day' : 'days'}` : null,
            profileLabel
        ].filter(Boolean).map(item => sanitizeText(item));
        
        // Add accommodation icon separately (may contain HTML)
        if (accommodationIcon) {
            metadata.push(accommodationIcon);
        }

        const notes = stay.notes ? `<div class="scenario-timeline__notes">${sanitizeText(stay.notes)}</div>` : '';
        const routeNotes = stay.routeNotes ? `<div class="scenario-timeline__notes"><em>${sanitizeText(stay.routeNotes)}</em></div>` : '';
        const imageThumbnail = stay.imageUrl ? `
            <div class="scenario-timeline__image">
                <a href="${sanitizeAttribute(stay.imageUrl)}" target="_blank" rel="noopener noreferrer">
                    <img src="${sanitizeAttribute(stay.imageUrl)}" alt="Stay image" style="max-width: 200px; max-height: 150px; border-radius: 8px; object-fit: cover; cursor: pointer; margin-top: 8px;">
                </a>
            </div>
        ` : '';

        return `
            <div class="scenario-timeline__row">
                <div class="scenario-timeline__header">
                    <div class="scenario-timeline__flag">${flag}</div>
                    <div>${sanitizeText(locationLabel)}</div>
                </div>
                <div class="scenario-timeline__meta">
                    ${metadata.map(item => `<span>${item}</span>`).join('')}
                </div>
                ${imageThumbnail}
                ${notes}
                ${routeNotes}
            </div>
        `;
    }).join('');
}

async function loadWorldGeoJson() {
    if (!worldGeoJsonPromise) {
        worldGeoJsonPromise = fetch(LOCAL_WORLD_GEOJSON_PATH, { cache: 'no-cache' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Local GeoJSON request failed: ${response.status}`);
                }
                return response.json();
            })
            .catch(async localError => {
                logger.warn('Scenario map: local GeoJSON load failed, falling back to remote source.', localError);
                const remoteResponse = await fetch(REMOTE_WORLD_GEOJSON_URL);
                if (!remoteResponse.ok) {
                    worldGeoJsonPromise = null;
                    throw new Error(`Remote GeoJSON request failed: ${remoteResponse.status}`);
                }
                return remoteResponse.json();
            });
    }
    return worldGeoJsonPromise;
}

async function loadCountryGeoJsonIndex() {
    if (countryGeoJsonIndex) {
        return countryGeoJsonIndex;
    }
    try {
        const geoJson = await loadWorldGeoJson();
        const iso3Map = new Map();
        const iso2Map = new Map();
        const nameMap = new Map();
    
        (geoJson.features || []).forEach(feature => {
            const props = feature?.properties || {};
            const iso3 = normalizeCountryIdentifier(props.ISO_A3 || props.ADM0_A3 || '');
            const iso2 = normalizeCountryIdentifier(props.ISO_A2 || '');
            const name = normalizeCountryIdentifier(props.NAME || props.ADMIN || props.BRK_NAME || '');
            if (iso3 && !iso3Map.has(iso3)) iso3Map.set(iso3, feature);
            if (iso2 && !iso2Map.has(iso2)) iso2Map.set(iso2, feature);
            if (name && !nameMap.has(name)) nameMap.set(name, feature);
        });
    
        if (iso3Map.size === 0 && iso2Map.size === 0 && nameMap.size === 0) {
            throw new Error('GeoJSON index appears empty');
        }
    
        countryGeoJsonIndex = { geoJson, iso3Map, iso2Map, nameMap };
        console.info('[ScenarioMap] Built country GeoJSON index', {
            iso3Entries: iso3Map.size,
            iso2Entries: iso2Map.size,
            nameEntries: nameMap.size
        });
        return countryGeoJsonIndex;
    } catch (error) {
        logger.error('[ScenarioMap] Unable to build GeoJSON index, falling back to rectangle rendering.', error);
        countryGeoJsonIndex = null;
        throw error;
    }
}

function normalizeCountryIdentifier(value) {
    return value ? value.toString().trim().toUpperCase() : '';
}

function findMatchingGeoJsonFeature(geoJson, country) {
    if (!geoJson || !Array.isArray(geoJson.features)) return null;

    const scenarioIdentifiers = new Set();
    [country.name, country.alpha3, country.alpha2, country.original]
        .filter(Boolean)
        .forEach(identifier => scenarioIdentifiers.add(normalizeCountryIdentifier(identifier)));

    const standardizedName = standardizeCountryName(country.name);
    if (standardizedName) {
        scenarioIdentifiers.add(normalizeCountryIdentifier(standardizedName));
    }
    const standardizedOriginal = standardizeCountryName(country.original);
    if (standardizedOriginal) {
        scenarioIdentifiers.add(normalizeCountryIdentifier(standardizedOriginal));
    }

    for (const feature of geoJson.features) {
        const props = feature.properties || {};
        const featureIdentifiers = [
            props.ISO_A3,
            props.ADM0_A3,
            props.ISO_A2,
            props.SOVEREIGNT,
            props.BRK_NAME,
            props.NAME,
            props.name,
            props.ADMIN
        ].map(normalizeCountryIdentifier).filter(Boolean);

        for (const identifier of scenarioIdentifiers) {
            if (identifier && featureIdentifiers.includes(identifier)) {
                return { feature, matchKey: identifier };
            }
        }
    }

    return null;
}

async function ensureScenarioMap(scenario) {
    const containerId = `scenario-map-${scenario.scenarioId}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    if (scenarioMaps[scenario.scenarioId]) {
        setTimeout(() => {
            try {
                scenarioMaps[scenario.scenarioId].invalidateSize();
            } catch (error) {
                logger.warn('Unable to invalidate map size', error);
            }
        }, 200);
        return;
    }

    const map = L.map(containerId, {
        attributionControl: false,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true
    });

    map.addControl(L.control.zoom({ position: 'bottomright' }));

    scenarioMaps[scenario.scenarioId] = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 8,
        minZoom: 1
    }).addTo(map);

    console.groupCollapsed(`[ScenarioMap] Countries for scenario: ${scenario.headline || scenario.scenarioId}`);

    const visitedCountries = {
        scenario: new Set(),
        together: new Set(),
        separately: new Set(),
        kimber: new Set(),
        siona: new Set()
    };

    const countriesSheet = Array.isArray(currentData.countries) ? currentData.countries : [];
    const normalizedToSheet = new Map();
    countriesSheet.forEach(row => {
        const name = (row[0] || '').toString().trim();
        const normalized = normalizeScenarioCountryName(name);
        if (!normalized) return;
        normalizedToSheet.set(normalized, name);
    });

    const addCountry = (name) => {
        const normalized = normalizeScenarioCountryName(name);
        if (!normalized) return;
        const sheetName = normalizedToSheet.get(normalized) || normalized;
        visitedCountries.scenario.add(sheetName);
    };

    if (Array.isArray(scenario.countries) && scenario.countries.length) {
        scenario.countries.forEach(addCountry);
    }
    if (visitedCountries.scenario.size === 0 && Array.isArray(scenario.stays)) {
        scenario.stays.forEach(stay => addCountry(stay?.country));
    }
    if (visitedCountries.scenario.size === 0 && typeof scenario.headline === 'string') {
        scenario.headline
            .replace(/&/g, ' and ')
            .split(/,| and |\/|\||•|·/i)
            .map(part => part.trim())
            .filter(Boolean)
            .forEach(addCountry);
    }

    if (visitedCountries.scenario.size === 0) {
        logger.warn('[ScenarioMap] No countries found for scenario.');
        map.setView([20, 0], 2);
        setTimeout(() => {
            try {
                map.invalidateSize();
            } catch (error) {
                logger.warn('Unable to invalidate map size', error);
            }
            console.groupEnd();
        }, 200);
        return;
    }

    if (DEBUG_MODE) {
        logger.debug('Scenario countries:', Array.from(visitedCountries.scenario));
    }

    const scenarioColorOverrides = new Map();
    Array.from(visitedCountries.scenario).forEach((countryName, index) => {
        const paletteColor = SCENARIO_MAP_COLORS[index % SCENARIO_MAP_COLORS.length];
        const override = {
            fill: paletteColor,
            stroke: darkenHexColor(paletteColor, 0.35)
        };
        scenarioColorOverrides.set(countryName, override);
        scenarioColorOverrides.set(normalizeCountryIdentifier(countryName), override);
        scenarioColorOverrides.set(countryName.toLowerCase(), override);
    });

    try {
        await loadCountryBorders(visitedCountries, map, { fitBounds: true, colorOverrides: scenarioColorOverrides });
    } catch (error) {
        logger.error('[ScenarioMap] loadCountryBorders failed, using rectangles', error);
        renderCountriesWithBounds(visitedCountries, map, { fitBounds: true, colorOverrides: scenarioColorOverrides });
    } finally {
        setTimeout(() => {
            try {
                map.invalidateSize();
            } catch (error) {
                logger.warn('Unable to invalidate map size', error);
            }
            console.groupEnd();
        }, 200);
    }
}

function getRelationshipTimelineEntries() {
    if (relationshipTimelineSourceRef !== currentData.relationshipLog) {
        relationshipTimelineSourceRef = currentData.relationshipLog;
        const rawLog = Array.isArray(currentData.relationshipLog) ? currentData.relationshipLog : [];
        const entries = [];
        const map = new Map();
        rawLog.forEach(row => {
            if (!row || !row[0]) return;
            const parsedDate = parseRelationshipLogDate(row[0]);
            if (!parsedDate || Number.isNaN(parsedDate.getTime())) return;
            const day = new Date(parsedDate.getTime());
            day.setHours(0, 0, 0, 0);
            const iso = formatIsoDate(day);
            const rawKimber = (row[1] || '').toString().trim();
            const rawSiona = (row[2] || '').toString().trim();
            const normalizedKimber = normalizeScenarioCountryName(rawKimber);
            const normalizedSiona = normalizeScenarioCountryName(rawSiona);
            entries.push({
                date: day,
                iso,
                kimber: normalizedKimber,
                siona: normalizedSiona,
                rawKimber,
                rawSiona
            });
            map.set(iso, {
                date: day,
                kimber: normalizedKimber,
                siona: normalizedSiona,
                rawKimber,
                rawSiona
            });
        });
        entries.sort((a, b) => a.date - b.date);
        relationshipTimelineCache = entries;
        relationshipTimelineMapCache = map;
    }
    return relationshipTimelineCache || [];
}

function getRelationshipTimelineMap() {
    getRelationshipTimelineEntries();
    return relationshipTimelineMapCache || new Map();
}

function normalizeToDayStart(date) {
    if (!(date instanceof Date) || Number.isNaN(date)) return null;
    const copy = new Date(date.getTime());
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function addDaysCopy(date, amount) {
    if (!(date instanceof Date) || Number.isNaN(date)) return null;
    const copy = new Date(date.getTime());
    copy.setDate(copy.getDate() + amount);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function normalizeScenarioCountryName(country) {
    if (!country) return '';
    const aliasMap = {
        'usa': 'United States',
        'us': 'United States',
        'u.s.': 'United States',
        'u.s.a.': 'United States',
        'united states of america': 'United States',
        'states': 'United States',
        'uk': 'United Kingdom',
        'u.k.': 'United Kingdom',
        'gb': 'United Kingdom',
        'great britain': 'United Kingdom',
        'england': 'United Kingdom'
    };
    const reference = getCountryReference(country);
    const name = (reference && reference.name) ? reference.name : country;
    const trimmed = (name || '').toString().trim();
    if (!trimmed) return '';
    const lower = trimmed.toLowerCase();
    if (aliasMap[lower]) return aliasMap[lower];
    return trimmed;
}

function darkenHexColor(hex, intensity = 0.25) {
    if (!hex) return '#1f2937';
    let normalized = hex.replace('#', '').trim();
    if (normalized.length === 3) {
        normalized = normalized.split('').map(ch => ch + ch).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return '#1f2937';
    }
    const amount = Math.min(Math.max(intensity, 0), 1);
    const num = parseInt(normalized, 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    r = Math.max(0, Math.min(255, Math.round(r * (1 - amount))));
    g = Math.max(0, Math.min(255, Math.round(g * (1 - amount))));
    b = Math.max(0, Math.min(255, Math.round(b * (1 - amount))));
    const toHex = (value) => value.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function extractScenarioCountryNames(scenario) {
    const names = [];
    const seen = new Set();

    function addName(rawName) {
        if (!rawName) return;
        const normalized = normalizeScenarioCountryName(rawName);
        if (!normalized) return;
        const key = normalizeCountryIdentifier(normalized);
        if (key && seen.has(key)) return;
        if (key) seen.add(key);
        names.push(normalized);
    }

    const headline = (scenario?.headline || '').toString();
    if (headline) {
        const replaced = headline
            .replace(/&/g, ' and ')
            .replace(/[\u2013\u2014]/g, ',');
        replaced.split(/,| and |\/|\||•|·/i)
            .map(part => part.trim())
            .filter(Boolean)
            .forEach(addName);
    }

    if (Array.isArray(scenario?.countries)) {
        scenario.countries.forEach(addName);
    }

    if (Array.isArray(scenario?.stays)) {
        scenario.stays.forEach(stay => {
            if (stay && stay.country) {
                addName(stay.country);
            }
        });
    }

    return names;
}

function countRelationshipDaysInRange(profileId, startDate, endDate, predicate) {
    if (!startDate || !endDate || !(startDate instanceof Date) || !(endDate instanceof Date) || !predicate) {
        return 0;
    }
    const start = normalizeToDayStart(startDate);
    const end = normalizeToDayStart(endDate);
    if (!start || !end || start > end) return 0;
    const map = getRelationshipTimelineMap();
    if (!map || map.size === 0) return 0;
    const profileKey = profileId === 'siona' ? 'siona' : 'kimber';
    let count = 0;
    for (let cursor = new Date(start.getTime()); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const entry = map.get(formatIsoDate(cursor));
        if (!entry) continue;
        const country = entry[profileKey];
        if (predicate(country, entry)) {
            count += 1;
        }
    }
    return count;
}

function calculateUSAdmissionDaysOnDate(profileId, referenceDate) {
    const map = getRelationshipTimelineMap();
    if (!map || map.size === 0 || !referenceDate) return 0;
    const profileKey = profileId === 'siona' ? 'siona' : 'kimber';
    let count = 0;
    let cursor = normalizeToDayStart(referenceDate);
    for (let i = 0; i < 365; i++) {
        if (!cursor) break;
        const entry = map.get(formatIsoDate(cursor));
        if (!entry) break;
        const country = entry[profileKey];
        if (!isUSOrContiguous(country)) break;
        count += 1;
        cursor = addDaysCopy(cursor, -1);
    }
    return count;
}

function countRollingSchengenDaysOnDate(profileId, referenceDate) {
    if (!referenceDate) return 0;
    const end = normalizeToDayStart(referenceDate);
    if (!end) return 0;
    const start = addDaysCopy(end, -179);
    return countRelationshipDaysInRange(profileId, start, end, (country) => isSchengenCountry(country));
}

function countRollingUSDaysOnDate(profileId, referenceDate) {
    if (!referenceDate) return 0;
    const end = normalizeToDayStart(referenceDate);
    if (!end) return 0;
    const start = addDaysCopy(end, -364);
    return countRelationshipDaysInRange(profileId, start, end, (country) => country === 'United States');
}

function countUKTaxDaysUpToDate(profileId, referenceDate) {
    if (!referenceDate) return 0;
    const normalized = normalizeToDayStart(referenceDate);
    if (!normalized) return 0;
    const taxYear = getUKTaxYear(normalized);
    if (!taxYear || !taxYear.start) return 0;
    const taxYearStart = normalizeToDayStart(taxYear.start);
    return countRelationshipDaysInRange(profileId, taxYearStart, normalized, (country) => country === 'United Kingdom');
}

function normalizeProfileScope(scope) {
    const value = (scope || 'both').toString().toLowerCase();
    if (value === 'kimber') return ['kimber'];
    if (value === 'siona') return ['siona'];
    if (value === 'both' || value === 'together') return ['kimber', 'siona'];
    return ['kimber', 'siona'];
}

function countScenarioDaysForRule(scenario, profileId, ruleId) {
    if (!scenario || !Array.isArray(scenario.stays)) return 0;
    const normalizedRule = (ruleId || '').toUpperCase();
    let predicate = null;
    if (normalizedRule === 'US-ADMISSION') {
        predicate = (country) => country === 'United States';
    } else if (normalizedRule === 'US-ROLLING365') {
        predicate = (country) => country === 'United States';
    } else if (normalizedRule === 'SCHENGEN-ROLLING') {
        predicate = (country) => isSchengenCountry(country);
    } else if (normalizedRule === 'UK-TAX') {
        predicate = (country) => country === 'United Kingdom';
    } else {
        return 0;
    }

    let count = 0;
    scenario.stays.forEach(stay => {
        if (!stay) return;
        const travellers = normalizeProfileScope(stay.profileScope);
        if (!travellers.includes(profileId)) return;
        const startDate = parseISOToLocalDate(stay.startDate);
        const endDate = parseISOToLocalDate(stay.endDate || stay.startDate);
        if (!startDate || !endDate) return;
        const start = normalizeToDayStart(startDate);
        const end = normalizeToDayStart(endDate);
        if (!start || !end) return;
        const countryName = normalizeScenarioCountryName(stay.country || '');
        for (let cursor = new Date(start.getTime()); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
            if (predicate(countryName, cursor)) {
                count += 1;
            }
        }
    });
    return count;
}

function countConsecutiveUSDaysEndingOnDate(profileId, referenceDate) {
    const map = getRelationshipTimelineMap();
    if (!map || map.size === 0 || !referenceDate) return 0;
    const profileKey = profileId === 'siona' ? 'siona' : 'kimber';
    let count = 0;
    let cursor = normalizeToDayStart(referenceDate);
    for (let i = 0; i < 365; i++) {
        if (!cursor) break;
        const entry = map.get(formatIsoDate(cursor));
        if (!entry) break;
        const country = entry[profileKey];
        if (country !== 'United States') {
            break;
        }
        count += 1;
        cursor = addDaysCopy(cursor, -1);
    }
    return count;
}

function computeStartDaysForRule(ruleId, profileId, referenceDate) {
    if (!referenceDate) return 0;
    const normalizedRule = (ruleId || '').toUpperCase();
    switch (normalizedRule) {
        case 'US-ADMISSION':
            return countConsecutiveUSDaysEndingOnDate(profileId, referenceDate);
        case 'US-ROLLING365':
            return countRollingUSDaysOnDate(profileId, referenceDate);
        case 'SCHENGEN-ROLLING':
            return countRollingSchengenDaysOnDate(profileId, referenceDate);
        case 'UK-TAX':
            return countUKTaxDaysUpToDate(profileId, referenceDate);
        default:
            return 0;
    }
}

function computeScenarioVisaSummaryRows(scenario, validation) {
    const breakdown = Array.isArray(validation?.breakdown) ? validation.breakdown : [];
    if (!breakdown.length) return [];

    const stays = Array.isArray(scenario?.stays) ? scenario.stays : [];
    const firstStay = stays[0];
    const lastStay = stays[stays.length - 1];

    // Scenario dates are used for context, but calculations are done server-side
    const scenarioStart = parseISOToLocalDate(scenario?.startDate) ||
        (firstStay ? parseISOToLocalDate(firstStay.startDate) : null);
    const scenarioEnd = parseISOToLocalDate(scenario?.endDate) ||
        (lastStay ? parseISOToLocalDate(lastStay.endDate || lastStay.startDate) : scenarioStart);

    return breakdown.map(entry => {
        if (!entry) return null;
        const profileId = (entry.profileId || '').toString().toLowerCase();
        const ruleId = (entry.ruleId || entry.jurisdiction || '').toString().toUpperCase();
        if (!profileId || !ruleId) return null;

        // Backend now filters out visas with no days, so all entries here should be valid
        const hasServerValues = Number.isFinite(entry.baseline) && Number.isFinite(entry.projected);
        
        const label = entry.label || `${profileId} — ${ruleId}`;
        const limitRaw = Number(entry.limit ?? entry.maxDays ?? entry.threshold ?? NaN);
        const limit = Number.isFinite(limitRaw) ? limitRaw : null;

        // Use server-side baseline/projected values (calculated at scenario start date)
        // These are the authoritative values from backend
        const startDays = hasServerValues 
            ? entry.baseline 
            : 0;
        const endDays = hasServerValues 
            ? entry.projected 
            : 0;
        const scenarioDays = endDays - startDays;
        
        // Use server-side remaining if available, otherwise calculate from projected
        const remainingDays = hasServerValues && Number.isFinite(entry.remaining)
            ? entry.remaining
            : (limit != null && hasServerValues ? limit - entry.projected : null);

        // Status from server, or check if remaining days < 0 or projected > limit
        const status = entry.status || (
            (remainingDays != null && remainingDays < 0) || 
            (limit != null && endDays > limit) 
            ? 'error' 
            : 'ok'
        );

        return {
            label,
            profileId,
            ruleId,
            limit,
            startDays,
            usedDays: scenarioDays,
            endDays,
            remainingDays,
            status
        };
    }).filter(Boolean);
}

function getCountryReference(countryName) {
    if (!countryName) return { name: '', alpha2: '', alpha3: '', flagUrl: '' };
    const normalized = standardizeCountryName(countryName);
    const match = (currentData.countries || []).find(row => {
        if (!row) return false;
        const name = (row[0] || '').toString();
        const alpha3 = (row[1] || '').toString();
        const alpha2 = (row[2] || '').toString();
        return standardizeCountryName(name) === normalized ||
               standardizeCountryName(alpha3) === normalized ||
               standardizeCountryName(alpha2) === normalized;
    });
    if (match) {
        return {
            name: match[0],
            alpha3: match[1],
            alpha2: match[2],
            flagUrl: match[3] || ''
        };
    }
    return { name: countryName, alpha2: '', alpha3: '', flagUrl: '' };
}

function getCountryFlagHtml(countryName) {
    const info = getCountryReference(countryName);
    if (info.flagUrl) {
        return `<img src="${sanitizeAttribute(info.flagUrl)}" alt="${sanitizeAttribute(info.name || countryName)} flag">`;
    }
    if (info.alpha2) {
        const codePoints = info.alpha2.trim().toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
        try {
            return String.fromCodePoint(...codePoints);
        } catch (error) {
            return '🌍';
        }
    }
    return '🌍';
}

// Bucket List Functions
let currentBucketListData = [];
let bucketListItemEditorState = null;

function switchFutureSubTab(subTabName) {
    // Update sub-tab buttons
    document.querySelectorAll('.present-sub-tab').forEach(btn => btn.classList.remove('active'));
    const activeButton = document.querySelector(`.present-sub-tab[onclick*="'${subTabName}'"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Hide all sub-tab content
    document.querySelectorAll('.present-sub-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Show selected sub-tab content
    if (subTabName === 'scenarios') {
        document.getElementById('future-scenarios-content').classList.add('active');
    } else if (subTabName === 'bucket-list') {
        document.getElementById('future-bucket-list-content').classList.add('active');
        loadBucketList();
    }
}

function loadBucketList() {
    // Load bucket list data from Google Sheets (assuming a BucketList sheet exists)
    // For now, we'll use a local array and later integrate with the backend
    renderBucketList();
}

function renderBucketList() {
    const container = document.getElementById('bucketList');
    if (!container) return;

    if (currentBucketListData.length === 0) {
        container.innerHTML = '<div class="scenario-editor-stays-empty">No bucket list items yet. Start adding your travel dreams!</div>';
        return;
    }

    container.innerHTML = currentBucketListData.map(item => buildBucketListItemHtml(item)).join('');
}

function buildBucketListItemHtml(item) {
    const iconPath = getScenarioIconPath(item.icon || 'future');
    const userClass = item.user === 'siona' ? 'siona' : 'kimber';
    const completedClass = item.completed ? 'completed' : '';
    const completedBadge = item.completed && item.completedDate
        ? `<div class="bucket-list-item__completed-badge">✓ Completed ${formatLongDate(item.completedDate)}</div>`
        : '';
    const imageHtml = item.imageUrl
        ? `<div class="bucket-list-item__image"><a href="${sanitizeAttribute(item.imageUrl)}" target="_blank" rel="noopener noreferrer"><img src="${sanitizeAttribute(item.imageUrl)}" alt="Bucket list image"></a></div>`
        : '';
    const notesHtml = item.notes ? `<div class="bucket-list-item__notes">${sanitizeText(item.notes)}</div>` : '';

    return `
        <div class="bucket-list-item ${userClass} ${completedClass}" data-item-id="${sanitizeAttribute(item.id || '')}">
            <div class="bucket-list-item__header">
                <div class="bucket-list-item__icon">
                    <img src="${sanitizeAttribute(iconPath)}" alt="">
                </div>
                <div class="bucket-list-item__content">
                    <div class="bucket-list-item__title">${sanitizeText(item.description)}</div>
                    <div class="bucket-list-item__meta">
                        ${item.country ? sanitizeText(item.country) : 'No country specified'}
                    </div>
                </div>
            </div>
            ${imageHtml}
            ${notesHtml}
            ${completedBadge}
            <div class="bucket-list-item__actions">
                <button class="btn secondary" type="button" onclick="openBucketListItemEditor('${sanitizeAttribute(item.id || '')}')">Edit</button>
                ${!item.completed ? `<button class="btn" type="button" onclick="completeBucketListItem('${sanitizeAttribute(item.id || '')}')">Mark Complete</button>` : ''}
                <button class="btn ghost" type="button" onclick="deleteBucketListItem('${sanitizeAttribute(item.id || '')}')">Delete</button>
            </div>
        </div>
    `;
}

function openBucketListItemEditor(itemId) {
    const modal = document.getElementById('bucketListItemEditorModal');
    if (!modal) return;

    let item = null;
    if (itemId) {
        item = currentBucketListData.find(i => i.id === itemId);
    }

    bucketListItemEditorState = {
        item: item ? { ...item } : {
            id: '',
            user: 'kimber',
            icon: 'future',
            description: '',
            country: '',
            imageUrl: '',
            notes: '',
            completed: false,
            completedDate: ''
        }
    };

    modal.classList.add('active');
    renderBucketListItemEditor();
}

function closeBucketListItemEditor() {
    const modal = document.getElementById('bucketListItemEditorModal');
    if (modal) {
        modal.classList.remove('active');
    }
    bucketListItemEditorState = null;
}

function renderBucketListItemEditor() {
    if (!bucketListItemEditorState) return;
    const { item } = bucketListItemEditorState;

    const title = document.getElementById('bucketListItemEditorTitle');
    if (title) {
        title.textContent = item.id ? 'Edit Bucket List Item' : 'New Bucket List Item';
    }

    const userSelect = document.getElementById('bucketListItemUser');
    if (userSelect) userSelect.value = item.user || 'kimber';

    // Render icon selector - function only takes selectedValue, container is fixed
    renderBucketListIconSelector(item.icon || 'future');

    const descriptionInput = document.getElementById('bucketListItemDescription');
    if (descriptionInput) descriptionInput.value = item.description || '';

    const countryInput = document.getElementById('bucketListItemCountry');
    if (countryInput) {
        countryInput.value = item.country || '';
        // Populate country datalist
        const datalist = document.getElementById('bucketListItemCountryOptions');
        if (datalist) {
            datalist.innerHTML = renderScenarioCountryOptions(item.country || '', true);
        }
    }

    const imageUrlInput = document.getElementById('bucketListItemImageUrl');
    if (imageUrlInput) imageUrlInput.value = item.imageUrl || '';

    const notesInput = document.getElementById('bucketListItemNotes');
    if (notesInput) notesInput.value = item.notes || '';

    const completedCheckbox = document.getElementById('bucketListItemCompleted');
    const completedDateField = document.getElementById('bucketListItemCompletedDateField');
    const completedDateInput = document.getElementById('bucketListItemCompletedDate');
    if (completedCheckbox) {
        completedCheckbox.checked = item.completed || false;
        completedCheckbox.addEventListener('change', function() {
            if (completedDateField) {
                completedDateField.style.display = this.checked ? 'block' : 'none';
            }
        });
        if (completedDateField) {
            completedDateField.style.display = item.completed ? 'block' : 'none';
        }
    }
    if (completedDateInput) {
        completedDateInput.value = item.completedDate || '';
    }

    const itemIdInput = document.getElementById('bucketListItemId');
    if (itemIdInput) itemIdInput.value = item.id || '';
}

function submitBucketListItem(event) {
    event.preventDefault();
    if (!bucketListItemEditorState) return;

    const item = bucketListItemEditorState.item;
    item.user = document.getElementById('bucketListItemUser').value;
    // Get icon from the custom dropdown
    const iconSelectContainer = document.getElementById('bucketListItemIconSelect');
    if (iconSelectContainer) {
        const activeOption = iconSelectContainer.querySelector('.scenario-icon-select__option.active');
        item.icon = activeOption ? activeOption.dataset.value : 'future';
    } else {
        item.icon = 'future';
    }
    item.description = document.getElementById('bucketListItemDescription').value;
    item.country = document.getElementById('bucketListItemCountry').value;
    item.imageUrl = document.getElementById('bucketListItemImageUrl').value;
    item.notes = document.getElementById('bucketListItemNotes').value;
    item.completed = document.getElementById('bucketListItemCompleted').checked;
    item.completedDate = item.completed ? (document.getElementById('bucketListItemCompletedDate').value || new Date().toISOString().split('T')[0]) : '';

    if (!item.id) {
        item.id = generateLocalId('bucket');
        currentBucketListData.push(item);
    } else {
        const index = currentBucketListData.findIndex(i => i.id === item.id);
        if (index >= 0) {
            currentBucketListData[index] = item;
        }
    }

    // If completed, create relationship log entry
    if (item.completed && item.completedDate) {
        createBucketListRelationshipLogEntry(item);
    }

    closeBucketListItemEditor();
    renderBucketList();
    showStatus('Bucket list item saved.', 'success');
}

function completeBucketListItem(itemId) {
    const item = currentBucketListData.find(i => i.id === itemId);
    if (!item) return;

    const completionDate = prompt('Enter completion date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!completionDate) return;

    item.completed = true;
    item.completedDate = completionDate;

    // Create relationship log entry
    createBucketListRelationshipLogEntry(item);

    renderBucketList();
    showStatus('Bucket list item marked as completed.', 'success');
}

function createBucketListRelationshipLogEntry(item) {
    // This would create an entry in the relationship log
    // For now, we'll just log it - actual implementation would call the write API
    const logEntry = {
        date: item.completedDate,
        description: `Completed bucket list: ${item.description}`,
        bucketListItemId: item.id
    };
    // TODO: Integrate with relationship log write API
    console.log('Would create relationship log entry:', logEntry);
}

function deleteBucketListItem(itemId) {
    const item = currentBucketListData.find(i => i.id === itemId);
    if (!item) return;

    if (!confirm(`Are you sure you want to delete "${item.description}"?`)) {
        return;
    }

    const index = currentBucketListData.findIndex(i => i.id === itemId);
    if (index >= 0) {
        currentBucketListData.splice(index, 1);
    }

    renderBucketList();
    showStatus('Bucket list item deleted.', 'success');
}

function renderBucketListIconSelector(selectedValue) {
    const container = document.getElementById('bucketListItemIconSelect');
    if (!container) return;
    
    const normalizedValue = (selectedValue || 'future').toString().toLowerCase();
    const options = SCENARIO_ICON_OPTIONS || [];
    const currentOption = options.find(opt => opt.value === normalizedValue) || options[0];
    
    const menuMarkup = options.map(option => `
        <button type="button" class="scenario-icon-select__option${option.value === normalizedValue ? ' active' : ''}" data-value="${sanitizeAttribute(option.value)}" onclick="selectBucketListIcon('${sanitizeAttribute(option.value)}')">
            <img src="${sanitizeAttribute(option.path)}" alt="">
            <span>${sanitizeText(option.label)}</span>
        </button>
    `).join('');
    
    container.innerHTML = `
        <button type="button" class="scenario-icon-select__trigger" onclick="toggleBucketListIconMenu(event)">
            <img src="${sanitizeAttribute(currentOption?.path || 'assets/icons/future.svg')}" alt="">
            <span>${sanitizeText(currentOption?.label || 'Select icon')}</span>
            <span class="scenario-icon-select__chevron">▾</span>
        </button>
        <div class="scenario-icon-select__menu" role="listbox" style="display: none;">
            ${menuMarkup}
        </div>
    `;
    container.dataset.open = 'false';
}

function toggleBucketListIconMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    const container = document.getElementById('bucketListItemIconSelect');
    if (!container) return;
    const menu = container.querySelector('.scenario-icon-select__menu');
    const isOpen = container.dataset.open === 'true';
    
    // Close other icon menus first
    document.querySelectorAll('.scenario-icon-select').forEach(other => {
        if (other !== container) {
            other.dataset.open = 'false';
            const otherMenu = other.querySelector('.scenario-icon-select__menu');
            if (otherMenu) otherMenu.style.display = 'none';
        }
    });
    
    if (isOpen) {
        menu.style.display = 'none';
        container.dataset.open = 'false';
        document.removeEventListener('click', handleBucketListIconOutsideClick, true);
    } else {
        menu.style.display = 'grid';
        container.dataset.open = 'true';
        // Add click outside handler
        setTimeout(() => {
            document.addEventListener('click', handleBucketListIconOutsideClick, true);
        }, 0);
    }
}

function handleBucketListIconOutsideClick(event) {
    const container = document.getElementById('bucketListItemIconSelect');
    if (container && !container.contains(event.target)) {
        const menu = container.querySelector('.scenario-icon-select__menu');
        if (menu) menu.style.display = 'none';
        container.dataset.open = 'false';
        document.removeEventListener('click', handleBucketListIconOutsideClick, true);
    }
}

function selectBucketListIcon(value) {
    const container = document.getElementById('bucketListItemIconSelect');
    if (!container) return;
    
    const option = SCENARIO_ICON_OPTIONS.find(opt => opt.value === value);
    if (!option) return;
    
    // Update active state
    container.querySelectorAll('.scenario-icon-select__option').forEach(opt => opt.classList.remove('active'));
    container.querySelector(`.scenario-icon-select__option[data-value="${value}"]`)?.classList.add('active');
    
    // Update trigger
    const trigger = container.querySelector('.scenario-icon-select__trigger');
    if (trigger) {
        const img = trigger.querySelector('img');
        const span = trigger.querySelector('span:not(.scenario-icon-select__chevron)');
        if (img) img.src = option.path;
        if (span) span.textContent = option.label;
    }
    
    // Close menu
    container.dataset.open = 'false';
    container.querySelector('.scenario-icon-select__menu').style.display = 'none';
    
    // Update state
    onBucketListItemFieldChange('icon', value);
}

window.toggleBucketListIconMenu = toggleBucketListIconMenu;
window.selectBucketListIcon = selectBucketListIcon;

// Make functions globally available
window.switchFutureSubTab = switchFutureSubTab;
window.openBucketListItemEditor = openBucketListItemEditor;
window.closeBucketListItemEditor = closeBucketListItemEditor;
window.submitBucketListItem = submitBucketListItem;
window.completeBucketListItem = completeBucketListItem;
window.deleteBucketListItem = deleteBucketListItem;

// VERSION: 2025-01-11-emoji-fix - Accommodation icons now use SVG instead of emojis
function getAccommodationIcon(accommodationType) {
    if (!accommodationType) return '';
    
    // Remove emojis from accommodation type (in case it's stored with emoji like "🏨 Hotel")
    // Extended emoji regex to catch all emoji ranges including building emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2190}-\u{21FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}-\u{2B55}]|[\u{3030}-\u{303F}]|[\u{3297}-\u{3299}]|[\u{FE00}-\u{FE0F}]|[\u{1F004}-\u{1F0CF}]|[\u{1F170}-\u{1F251}]/gu;
    const cleanEmoji = (text) => {
        if (!text) return '';
        // Remove emojis and also common building/house emojis specifically
        return text.toString()
            .replace(/🏨/g, '') // Hotel emoji
            .replace(/🏡/g, '') // House emoji
            .replace(/🏠/g, '') // Home emoji
            .replace(/🏢/g, '') // Office building emoji
            .replace(/🛖/g, '') // Hut emoji
            .replace(/🚐/g, '') // Van emoji
            .replace(emojiRegex, '')
            .trim();
    };
    let cleaned = cleanEmoji(accommodationType);
    
    // Debug logging - always log to help diagnose
    if (DEBUG_MODE) {
        logger.debug('[getAccommodationIcon] Input:', accommodationType, 'Cleaned:', cleaned);
    }
    if (accommodationType && (accommodationType.includes('🏨') || accommodationType.includes('🏡') || accommodationType.includes('🏠'))) {
        logger.warn('[getAccommodationIcon] Found emoji in accommodationType:', accommodationType, 'cleaned to:', cleaned);
    }
    
    // Normalize the accommodation type for matching
    const normalized = cleaned;
    const normalizedLower = normalized.toLowerCase().replace(/\s+/g, '');
    
    // First, try to find exact or case-insensitive match in SCENARIO_STAY_ACCOMMODATION_OPTIONS
    let accommodationOption = SCENARIO_STAY_ACCOMMODATION_OPTIONS.find(opt => {
        if (!opt.value) return false;
        const optValue = opt.value.toString();
        const optLabel = (opt.label || opt.value).toString();
        const optValueLower = optValue.toLowerCase().replace(/\s+/g, '');
        const optLabelLower = optLabel.toLowerCase().replace(/\s+/g, '');
        return optValueLower === normalizedLower || 
               optLabelLower === normalizedLower ||
               optValue.toLowerCase().trim() === normalized.toLowerCase().trim() ||
               optLabel.toLowerCase().trim() === normalized.toLowerCase().trim();
    });
    
    // If no direct match, try partial matching (e.g., "hotel" matches "Hotel")
    if (!accommodationOption) {
        accommodationOption = SCENARIO_STAY_ACCOMMODATION_OPTIONS.find(opt => {
            if (!opt.value || !opt.label) return false;
            const optValue = opt.value.toString();
            const optLabel = (opt.label || opt.value).toString();
            const optValueLower = optValue.toLowerCase().replace(/\s+/g, '');
            const optLabelLower = optLabel.toLowerCase().replace(/\s+/g, '');
            const normalizedTrimmed = normalized.toLowerCase().trim();
            return normalizedLower.includes(optValueLower) || 
                   optValueLower.includes(normalizedLower) ||
                   normalizedLower.includes(optLabelLower) ||
                   optLabelLower.includes(normalizedLower) ||
                   normalizedTrimmed.includes(optValue.toLowerCase().trim()) ||
                   optValue.toLowerCase().trim().includes(normalizedTrimmed) ||
                   normalizedTrimmed.includes(optLabel.toLowerCase().trim()) ||
                   optLabel.toLowerCase().trim().includes(normalizedTrimmed);
        });
    }
    
    // If still no match, try direct emoji-to-accommodation mapping
    if (!accommodationOption) {
        const originalLower = accommodationType.toString().toLowerCase();
        // Direct mapping based on emoji presence or common patterns
        if (originalLower.includes('🏨') || originalLower.includes('hotel')) {
            accommodationOption = SCENARIO_STAY_ACCOMMODATION_OPTIONS.find(opt => opt.value === 'Hotel');
        } else if (originalLower.includes('🏡') || originalLower.includes('🏠') || originalLower.includes('house') || originalLower.includes('home')) {
            // Check if it's AirBNB or Private House
            if (originalLower.includes('airbnb') || originalLower.includes('air bnb')) {
                accommodationOption = SCENARIO_STAY_ACCOMMODATION_OPTIONS.find(opt => opt.value === 'AirBNB');
            } else {
                accommodationOption = SCENARIO_STAY_ACCOMMODATION_OPTIONS.find(opt => opt.value === 'Private House');
            }
        } else if (originalLower.includes('airbnb') || originalLower.includes('air bnb')) {
            accommodationOption = SCENARIO_STAY_ACCOMMODATION_OPTIONS.find(opt => opt.value === 'AirBNB');
        } else if (originalLower.includes('vanfrito')) {
            accommodationOption = SCENARIO_STAY_ACCOMMODATION_OPTIONS.find(opt => opt.value === 'VanFrito');
        } else if (originalLower.includes('vantutu')) {
            accommodationOption = SCENARIO_STAY_ACCOMMODATION_OPTIONS.find(opt => opt.value === 'VanTutu');
        }
    }
    
    // If still no match, try mapping from SCENARIO_ACCOMMODATION_ICONS to find corresponding SVG
    if (!accommodationOption) {
        // Check if the accommodation type matches any key in SCENARIO_ACCOMMODATION_ICONS
        const iconKey = Object.keys(SCENARIO_ACCOMMODATION_ICONS).find(key => {
            const keyNormalized = key.toLowerCase().replace(/\s+/g, '');
            return normalizedLower === keyNormalized || 
                   normalizedLower.includes(keyNormalized) ||
                   keyNormalized.includes(normalizedLower);
        });
        
        if (iconKey) {
            // Map common accommodation types to their SVG options
            const iconToOptionMap = {
                'hotel': 'Hotel',
                'house': 'Private House',
                'home': 'Private House',
                'privatehouse': 'Private House',
                'airbnb': 'AirBNB',
                'vanfrito': 'VanFrito',
                'vantutu': 'VanTutu'
            };
            
            const mappedValue = iconToOptionMap[iconKey.toLowerCase()];
            if (mappedValue) {
                accommodationOption = SCENARIO_STAY_ACCOMMODATION_OPTIONS.find(opt => 
                    opt.value === mappedValue
                );
            }
        }
    }
    
    // Ensure displayText never contains emojis
    const displayText = cleaned || cleanEmoji(accommodationType) || '';
    const finalDisplayText = displayText || 'Accommodation';
    
    if (accommodationOption && accommodationOption.path) {
        // Return HTML with SVG icon (use cleaned text without emoji)
        if (DEBUG_MODE) {
            logger.debug('Matched accommodation:', accommodationType, '->', accommodationOption.value, 'path:', accommodationOption.path, 'displayText:', finalDisplayText);
        }
        return `<img src="${accommodationOption.path}" alt="${finalDisplayText}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px; display: inline-block; filter: brightness(0) invert(1);">${finalDisplayText}`;
    }
    
    // Final fallback: return accommodation type text only (no emoji)
    logger.warn('No SVG match found for accommodationType:', accommodationType, 'cleaned:', cleaned, 'finalDisplayText:', finalDisplayText);
    return finalDisplayText;
}

// Utility functions
function formatDate(date) {
    return date.toLocaleDateString('en-GB');
}

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    
    // Handle different date formats
    if (dateStr.includes('/')) {
        // DD/MM/YYYY format
        const parts = dateStr.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]);
    } else if (dateStr.includes('-')) {
        // YYYY-MM-DD format - parse explicitly to avoid timezone issues
        const parts = dateStr.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
        // Fallback to direct parsing
        return new Date(dateStr);
    }
}

// Scenario Export Functions
function openScenarioExport() {
    const exportView = document.getElementById('scenarioExportView');
    if (!exportView) return;
    
    exportView.classList.remove('hidden');
    renderScenarioExport();
}

function closeScenarioExport() {
    const exportView = document.getElementById('scenarioExportView');
    if (exportView) {
        exportView.classList.add('hidden');
    }
}

function renderScenarioExport() {
    const container = document.getElementById('scenarioExportContent');
    if (!container) return;
    
    const models = currentData.futureScenarioModels || [];
    if (models.length === 0) {
        container.innerHTML = '<p>No scenarios to export.</p>';
        return;
    }
    
    // Determine if we need compact mode (more than 6 scenarios)
    const useCompact = models.length > 6;
    
    const cardsHtml = models.map(scenario => {
        const iconPath = getScenarioIconPath(scenario.icon);
        const dateRange = formatScenarioDateRange(scenario.startDate, scenario.endDate);
        const duration = scenario.durationDays ? `${scenario.durationDays} ${scenario.durationDays === 1 ? 'day' : 'days'}` : 'TBC';
        const countryInfos = collectScenarioCountryInfos(scenario);
        const countries = countryInfos.map(entry => entry.info.name || entry.code).join(', ');
        const countryCount = countryInfos.length;
        
        // Calculate metrics
        const metrics = [];
        if (scenario.durationDays) {
            metrics.push({ label: 'Duration', value: duration });
        }
        if (countryCount > 0) {
            metrics.push({ label: 'Countries', value: `${countryCount} ${countryCount === 1 ? 'country' : 'countries'}` });
        }
        if (scenario.travellers && scenario.travellers.length) {
            const travellerLabel = scenario.travellers.length === 1 && scenario.travellers[0] !== 'both'
                ? (scenario.travellers[0] === 'kimber' ? 'Kimber solo' : 'Siona solo')
                : 'Together';
            metrics.push({ label: 'Travellers', value: travellerLabel });
        }
        
        const metaItems = [
            { label: 'Dates', value: dateRange },
            ...metrics
        ];
        
        const metaHtml = metaItems.map(item => `
            <div class="scenario-export-card__meta-item">
                <span class="scenario-export-card__meta-label">${sanitizeText(item.label)}:</span>
                <span>${sanitizeText(item.value)}</span>
            </div>
        `).join('');
        
        const countriesHtml = countries ? `
            <div class="scenario-export-card__countries">
                <div class="scenario-export-card__meta-label">Countries:</div>
                <div class="scenario-export-card__countries-list">
                    ${countryInfos.slice(0, 5).map(entry => {
                        const name = entry.info.name || entry.code;
                        return `<span class="scenario-export-card__country-tag">${sanitizeText(name)}</span>`;
                    }).join('')}
                    ${countryInfos.length > 5 ? `<span class="scenario-export-card__country-tag">+${countryInfos.length - 5} more</span>` : ''}
                </div>
            </div>
        ` : '';
        
        return `
            <div class="scenario-export-card ${useCompact ? 'compact' : ''}">
                <div class="scenario-export-card__header">
                    <div class="scenario-export-card__icon">
                        <img src="${sanitizeAttribute(iconPath)}" alt="">
                    </div>
                    <h3 class="scenario-export-card__title">${sanitizeText(scenario.headline)}</h3>
                </div>
                <div class="scenario-export-card__meta">
                    ${metaHtml}
                </div>
                ${countriesHtml}
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="scenario-export-grid">
            ${cardsHtml}
        </div>
    `;
}
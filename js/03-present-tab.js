// Present Tab Functions
function resetBookingMetaIndex() {
    bookingMetaIndex = null;
}

function loadPresentTab() {
    logger.debug('🔄 Loading Present tab...');
    renderToBookBoard();
    renderBookedList();
    updateCalendar();
    updateToBookTypeHint();
}

function switchPresentSubTab(subTabName, evt) {
    if (evt && typeof evt.preventDefault === 'function') {
        evt.preventDefault();
    }
    document.querySelectorAll('.present-sub-tab').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('active');
    } else {
        const fallbackButton = document.querySelector(`.present-sub-tab[onclick*="${subTabName}"]`);
        if (fallbackButton) fallbackButton.classList.add('active');
    }
    document.querySelectorAll('.present-sub-tab-content').forEach(section => section.classList.remove('active'));
    const targetId = subTabName === 'to-book' ? 'toBookContent' : 'bookedContent';
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.add('active');
    }
    if (subTabName === 'booked') {
        updateCalendar();
    }
}

function toggleToBookForm(forceState) {
    const form = document.getElementById('toBookForm');
    const toggleBtn = document.getElementById('toBookToggleButton');
    if (!form || !toggleBtn) return;

    const shouldShow = typeof forceState === 'boolean' ? forceState : form.classList.contains('hidden');
    form.classList.toggle('hidden', !shouldShow);

    if (shouldShow) {
        if (!currentEditingToBookId) {
            setToBookFormMode('new');
            resetToBookFormFields();
        }
    } else {
        resetToBookFormState();
    }

    const icon = toggleBtn.querySelector('.btn-icon');
    const label = toggleBtn.querySelector('.btn-label');

    if (shouldShow) {
        toggleBtn.classList.add('secondary');
        if (icon) icon.textContent = '×';
        if (label) label.textContent = 'Close form';
        toggleBtn.setAttribute('aria-expanded', 'true');
    } else {
        toggleBtn.classList.remove('secondary');
        if (icon) icon.textContent = '＋';
        if (label) label.textContent = 'Add To Book';
        toggleBtn.setAttribute('aria-expanded', 'false');
    }
}

function setToBookFormMode(mode) {
    const title = document.getElementById('toBookFormTitle');
    const submitButton = document.getElementById('toBookSubmitButton');
    if (title) {
        title.textContent = mode === 'edit' ? 'Edit Booking Request' : 'New Booking Request';
    }
    if (submitButton) {
        submitButton.textContent = mode === 'edit' ? 'Update Request' : 'Save Request';
    }
}

function resetToBookFormFields() {
    const todayIso = new Date().toISOString().split('T')[0];
    const assigneeSelect = document.getElementById('toBookAssignee');
    const typeSelect = document.getElementById('toBookType');
    const startInput = document.getElementById('toBookStartDate');
    const endInput = document.getElementById('toBookEndDate');
    const deadlineInput = document.getElementById('toBookDeadline');
    const instruction = document.getElementById('toBookInstruction');
    const notes = document.getElementById('toBookNotes');

    if (assigneeSelect) {
        assigneeSelect.querySelectorAll('option[data-temp-option="true"]').forEach(opt => opt.remove());
        if (assigneeSelect.options.length > 0) {
            assigneeSelect.selectedIndex = 0;
        }
    }

    if (typeSelect) {
        typeSelect.querySelectorAll('option[data-temp-option="true"]').forEach(opt => opt.remove());
        if (typeSelect.options.length > 0) {
            typeSelect.selectedIndex = 0;
        }
    }

    if (startInput) startInput.value = todayIso;
    if (endInput) endInput.value = '';
    if (deadlineInput) deadlineInput.value = todayIso;
    if (instruction) instruction.value = '';
    if (notes) notes.value = '';

    [startInput, endInput, deadlineInput].forEach(input => {
        if (input) {
            input.style.backgroundImage = 'url("assets/icons/calendar.svg")';
        }
    });

    updateToBookTypeHint();
}

function resetToBookFormState() {
    currentEditingToBookId = null;
    setToBookFormMode('new');
    resetToBookFormFields();
}

function setSelectValueWithFallback(selectElement, value) {
    if (!selectElement) return;
    const valueToSet = value || '';

    if (!valueToSet) {
        if (selectElement.options.length > 0) {
            selectElement.selectedIndex = 0;
        }
        return;
    }

    const hasOption = Array.from(selectElement.options).some(opt => opt.value === valueToSet);
    if (!hasOption) {
        const tempOption = document.createElement('option');
        tempOption.value = valueToSet;
        tempOption.textContent = valueToSet;
        tempOption.setAttribute('data-temp-option', 'true');
        selectElement.appendChild(tempOption);
    }

    selectElement.value = valueToSet;
}

function fillToBookFormFromTask(task) {
    if (!task) return;

    const assigneeSelect = document.getElementById('toBookAssignee');
    const typeSelect = document.getElementById('toBookType');
    const startInput = document.getElementById('toBookStartDate');
    const endInput = document.getElementById('toBookEndDate');
    const deadlineInput = document.getElementById('toBookDeadline');
    const instruction = document.getElementById('toBookInstruction');
    const notes = document.getElementById('toBookNotes');

    setSelectValueWithFallback(assigneeSelect, task.assignee);
    setSelectValueWithFallback(typeSelect, task.bookingType);

    if (startInput) startInput.value = task.startDate || '';
    if (endInput) endInput.value = task.endDate || '';
    if (deadlineInput) deadlineInput.value = task.deadline || '';
    if (instruction) instruction.value = task.instruction || '';
    if (notes) notes.value = task.notes || '';

    [startInput, endInput, deadlineInput].forEach(input => {
        if (input) {
            input.style.backgroundImage = 'url("assets/icons/calendar.svg")';
        }
    });

    updateToBookTypeHint();
}

function editToBookTask(taskId) {
    const { data } = findToBookTask(taskId);
    if (!data) {
        showStatus('Unable to find that booking request.', 'error');
        return;
    }

    currentEditingToBookId = taskId;
    setToBookFormMode('edit');
    fillToBookFormFromTask(data);
    toggleToBookForm(true);

    const form = document.getElementById('toBookForm');
    if (form && typeof form.scrollIntoView === 'function') {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const instructionField = document.getElementById('toBookInstruction');
    if (instructionField) {
        instructionField.focus();
    }
}

function updateToBookTypeHint() {
    const typeSelect = document.getElementById('toBookType');
    const hint = document.getElementById('toBookTypeHint');
    if (!typeSelect || !hint) return;

    hint.textContent = 'Tip: add deadlines so urgent tasks jump to the top.';
}

async function saveToBookTask() {
    const assignee = document.getElementById('toBookAssignee')?.value || '';
    const bookingType = document.getElementById('toBookType')?.value || '';
    const startDate = document.getElementById('toBookStartDate')?.value || '';
    const endDate = document.getElementById('toBookEndDate')?.value || '';
    const instruction = document.getElementById('toBookInstruction')?.value?.trim() || '';
    const deadline = document.getElementById('toBookDeadline')?.value || '';
    const notes = document.getElementById('toBookNotes')?.value?.trim() || '';
    const isEditing = Boolean(currentEditingToBookId);
    let targetTaskIndex = null;
    let targetTask = null;
    let currentStatus = 'pending';

    if (!assignee || !bookingType || !instruction || !startDate || !deadline) {
        showStatus('Please fill the required fields (assignee, type, instruction, start date, deadline).', 'error');
        return;
    }

    const nowIso = new Date().toISOString();
    let baseMessage = isEditing ? 'Booking request updated.' : 'Booking request added to your To Book list.';
    let messageType = 'success';

    if (isEditing) {
        const { index, row } = findToBookTask(currentEditingToBookId);
        if (index === -1 || !row) {
            showStatus('Unable to locate that booking request for updating.', 'error');
            resetToBookFormState();
            return;
        }

        if (Array.isArray(row)) {
            row[1] = assignee;
            row[2] = bookingType;
            row[3] = startDate;
            row[4] = endDate;
            row[5] = instruction;
            row[6] = deadline;
            row[7] = notes;
            row[10] = nowIso;
            currentStatus = row[8] || 'pending';
            currentData.toBookTasks[index] = row;
        } else {
            row.assignee = assignee;
            row.bookingType = bookingType;
            row.startDate = startDate;
            row.endDate = endDate;
            row.instruction = instruction;
            row.deadline = deadline;
            row.notes = notes;
            row.updatedAt = nowIso;
            currentStatus = row.status || 'pending';
            currentData.toBookTasks[index] = row;
        }

        persistLocalToBook();
        targetTaskIndex = index;
        targetTask = normalizeToBookRow(currentData.toBookTasks[index]);
    } else {
        const taskId = `TB-${Date.now().toString().slice(-6)}`;
        const newRow = {
            taskId,
            assignee,
            bookingType,
            startDate,
            endDate,
            instruction,
            deadline,
            notes,
            status: 'pending',
            createdAt: nowIso,
            updatedAt: nowIso,
            __local: true
        };

        if (!Array.isArray(currentData.toBookTasks)) {
            currentData.toBookTasks = [];
        }
        currentData.toBookTasks.push(newRow);
        persistLocalToBook();

        targetTaskIndex = currentData.toBookTasks.length - 1;
        targetTask = normalizeToBookRow(currentData.toBookTasks[targetTaskIndex]);
        currentStatus = targetTask.status || 'pending';
    }

    renderToBookBoard();
    toggleToBookForm(false);

    const todayIso = new Date().toISOString().split('T')[0];
    if (document.getElementById('toBookStartDate')) document.getElementById('toBookStartDate').value = todayIso;
    if (document.getElementById('toBookEndDate')) document.getElementById('toBookEndDate').value = '';
    if (document.getElementById('toBookDeadline')) document.getElementById('toBookDeadline').value = todayIso;
    if (document.getElementById('toBookInstruction')) document.getElementById('toBookInstruction').value = '';
    if (document.getElementById('toBookNotes')) document.getElementById('toBookNotes').value = '';

    if (targetTaskIndex === null || !targetTask) {
        showStatus(baseMessage, messageType);
        return;
    }

    targetTask.status = currentStatus;

    try {
        const syncResult = await persistToBookRemote(targetTask);
        if (syncResult?.success && syncResult.toBook) {
            const normalized = syncResult.toBook;
            currentData.toBookTasks[targetTaskIndex] = {
                taskId: normalized.taskId,
                assignee: normalized.assignee,
                bookingType: normalized.bookingType,
                startDate: normalizeDateInput(normalized.startDate),
                endDate: normalizeDateInput(normalized.endDate),
                instruction: normalized.instruction,
                deadline: normalizeDateInput(normalized.deadline),
                notes: normalized.notes,
                status: normalized.status || 'pending',
                createdAt: normalized.createdAt,
                updatedAt: normalized.updatedAt,
                __local: false
            };
            persistLocalToBook();
            renderToBookBoard();
            baseMessage = isEditing ? 'Booking request updated.' : 'Booking request added to your To Book list.';
            messageType = 'success';
        } else if (syncResult?.skipped) {
            baseMessage = isEditing
                ? 'Booking request updated locally. Configure the write endpoint to sync with Sheets.'
                : 'Booking request added locally. Configure the write endpoint to sync with Sheets.';
            messageType = 'success';
        } else {
            logger.warn('To Book sync failed:', syncResult);
            baseMessage = 'Booking request saved locally; sync failed. Try again later.';
            messageType = 'error';
        }
    } catch (error) {
        logger.error('To Book sync error:', error);
        baseMessage = 'Booking request saved locally; sync failed. Try again later.';
        messageType = 'error';
    }

    showStatus(baseMessage, messageType);
}

function renderToBookBoard() {
    const columns = {
        'Kimber': {
            list: document.getElementById('kimberToBookList'),
            count: document.getElementById('kimberToBookCount')
        },
        'Siona': {
            list: document.getElementById('sionaToBookList'),
            count: document.getElementById('sionaToBookCount')
        }
    };

    const tasks = getToBookTasks();
    Object.entries(columns).forEach(([assignee, elements]) => {
        const { list, count } = elements;
        if (!list) return;

        const assigneeTasks = tasks.filter(task => task.assignee.toLowerCase() === assignee.toLowerCase());
        assigneeTasks.sort(compareByDeadlineThenCreated);

        if (count) {
            count.textContent = assigneeTasks.length === 1 ? '1 task' : `${assigneeTasks.length} tasks`;
        }

        if (assigneeTasks.length === 0) {
            list.innerHTML = `<div class="present-empty-state">No tasks assigned to ${assignee} yet.</div>`;
            return;
        }

        list.innerHTML = assigneeTasks.map(task => buildToBookCard(task)).join('');
    });
}
function buildToBookCard(task) {
    const deadlineInfo = getDeadlineInfo(task.deadline);
    const instructionHtml = task.instruction ? formatMultilineText(task.instruction) : '<em>Instruction coming soon.</em>';
    const notesBlock = task.notes ? `<div class="notes">${formatMultilineText(task.notes)}</div>` : '';
    const iconUrl = getBookingIconUrl(task.bookingType);
    const bookingLabel = sanitizeText(task.bookingType || 'Booking');
    const typeBadgeContent = iconUrl
        ? `<img src="${iconUrl}" alt="${bookingLabel} icon">${bookingLabel}`
        : bookingLabel;

    return `
        <div class="to-book-card ${deadlineInfo.isOverdue ? 'overdue' : ''}" data-task-id="${task.taskId}">
            <div class="card-header">
                <span class="type-badge">${typeBadgeContent}</span>
                <span class="deadline-badge ${deadlineInfo.badgeClass}">${deadlineInfo.label}</span>
            </div>
            <div class="card-body">${instructionHtml}</div>
            <div class="card-meta">
                <div><strong>Start:</strong> ${task.startDate ? sanitizeText(formatDDMMYY(task.startDate)) : 'TBC'}</div>
                <div><strong>End:</strong> ${task.endDate ? sanitizeText(formatDDMMYY(task.endDate)) : '—'}</div>
                <div><strong>Deadline:</strong> ${sanitizeText(deadlineInfo.dateLabel)}</div>
            </div>
            ${notesBlock}
            <div class="card-actions">
                <button class="btn" type="button" onclick="openConvertToBooked('${task.taskId}')">Move to Booked</button>
                <button class="btn secondary" type="button" onclick="editToBookTask('${task.taskId}')">Edit</button>
                <button class="btn ghost" type="button" onclick="deleteToBookTask('${task.taskId}')">Delete</button>
            </div>
        </div>
    `;
}
function getDeadlineInfo(deadline) {
    if (!deadline) {
        return {
            label: 'No deadline',
            dateLabel: '—',
            badgeClass: '',
            isOverdue: false
        };
    }

    const date = parseISOToLocalDate(deadline);
    if (!date) {
        return {
            label: 'No deadline',
            dateLabel: '—',
            badgeClass: '',
            isOverdue: false
        };
    }

    const today = getTodayStart();
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));

    let badgeClass = '';
    let isOverdue = false;
    let label;

    if (diffDays < 0) {
        label = `Overdue ${Math.abs(diffDays)}d`;
        badgeClass = 'overdue';
        isOverdue = true;
    } else if (diffDays === 0) {
        label = 'Due today';
        badgeClass = 'overdue';
        isOverdue = true;
    } else if (diffDays <= 3) {
        label = `Due in ${diffDays}d`;
        badgeClass = 'upcoming';
    } else {
        label = `Due ${formatDDMMYY(deadline)}`;
    }

    return {
        label,
        dateLabel: formatLongDate(deadline),
        badgeClass,
        isOverdue
    };
}

function getToBookTasks(options = {}) {
    const { includeConverted = false } = options;
    const rows = Array.isArray(currentData.toBookTasks) ? currentData.toBookTasks : [];
    return rows
        .map(normalizeToBookRow)
        .filter(task => task && (includeConverted || task.status === 'pending'));
    }

function normalizeToBookRow(row) {
    if (!row) return null;
    if (Array.isArray(row)) {
        return {
            taskId: row[0] || '',
            assignee: row[1] || '',
            bookingType: row[2] || '',
            startDate: normalizeDateInput(row[3]),
            endDate: normalizeDateInput(row[4]),
            instruction: row[5] || '',
            deadline: normalizeDateInput(row[6]),
            notes: row[7] || '',
            status: (row[8] || 'pending').toLowerCase(),
            createdAt: row[9] || '',
            updatedAt: row[10] || ''
        };
    }

    return {
        taskId: row.taskId || '',
        assignee: row.assignee || '',
        bookingType: row.bookingType || '',
        startDate: normalizeDateInput(row.startDate),
        endDate: normalizeDateInput(row.endDate),
        instruction: row.instruction || '',
        deadline: normalizeDateInput(row.deadline),
        notes: row.notes || '',
        status: (row.status || 'pending').toLowerCase(),
        createdAt: row.createdAt || '',
        updatedAt: row.updatedAt || ''
    };
}

function findToBookTask(taskId) {
    const rows = Array.isArray(currentData.toBookTasks) ? currentData.toBookTasks : [];
    for (let i = 0; i < rows.length; i++) {
        const data = normalizeToBookRow(rows[i]);
        if (data && data.taskId === taskId) {
            return { index: i, row: rows[i], data };
        }
    }
    return { index: -1, row: null, data: null };
}

function findBookedEntry(bookingId) {
    const rows = Array.isArray(currentData.bookedUpcoming) ? currentData.bookedUpcoming : [];
    for (let i = 0; i < rows.length; i++) {
        const data = normalizeBookedRow(rows[i]);
        if (data && data.bookingId === bookingId) {
            return { index: i, row: rows[i], data };
        }
    }
    return { index: -1, row: null, data: null };
}

async function deleteToBookTask(taskId) {
    const { index, row, data } = findToBookTask(taskId);
    if (index === -1) {
        showStatus('Unable to find that booking request.', 'error');
        return;
    }
    
    const taskName = data?.instruction || data?.bookingType || 'this booking request';
    if (!confirm(`Are you sure you want to delete "${taskName}"?`)) {
        return;
    }
    
    // Delete from remote database
    const result = await deleteToBookTaskRemote(taskId);
    if (!result || result.success === false) {
        // If remote delete fails, still allow local deletion if it's a local-only item
        if (!row.__local) {
            showStatus(`❌ Unable to delete booking request: ${result?.error || 'Unknown error'}`, 'error');
            return;
        }
    }
    
    // Remove from local array
    currentData.toBookTasks.splice(index, 1);
    
    // Update local storage
    persistLocalToBook();
    
    showStatus('Booking request deleted.', 'success');
    renderToBookBoard();
}

function openConvertToBooked(taskId) {
    const { data } = findToBookTask(taskId);
    if (!data) {
        showStatus('Unable to find that booking request.', 'error');
        return;
    }
    
    currentConvertTaskId = taskId;

    const dialog = document.getElementById('presentDialog');
    const bookingTypeField = document.getElementById('convertBookingType');
    const headlineField = document.getElementById('convertHeadline');
    const travellersField = document.getElementById('convertTravellers');
    const startField = document.getElementById('convertStartDate');
    const endField = document.getElementById('convertEndDate');
    const confirmationField = document.getElementById('convertConfirmation');
    const notesField = document.getElementById('convertNotes');
    const requiredHint = document.getElementById('convertRequiredFieldsHint');
    const hiddenTaskField = document.getElementById('convertTaskId');

    if (!dialog || !bookingTypeField || !headlineField || !travellersField || !startField || !endField || !confirmationField || !notesField || !requiredHint || !hiddenTaskField) {
        showStatus('Conversion form not ready yet.', 'error');
        return;
    }

    bookingTypeField.value = data.bookingType || '';
    headlineField.value = data.instruction ? data.instruction.slice(0, 80) : `${data.bookingType} booking`;
    travellersField.value = data.assignee && data.assignee.toLowerCase() === 'siona'
        ? 'Siona'
        : (data.assignee && data.assignee.toLowerCase() === 'kimber' ? 'Kimber' : 'Both');
    startField.value = data.startDate || '';
    endField.value = data.endDate || '';
    confirmationField.value = '';
    notesField.value = data.notes || '';
    hiddenTaskField.value = taskId;

    const meta = getBookingMeta(data.bookingType);
    requiredHint.textContent = '';

    dialog.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePresentDialog() {
    const dialog = document.getElementById('presentDialog');
    if (dialog) {
        dialog.classList.remove('active');
    }
    const form = document.getElementById('convertToBookedForm');
    if (form) {
        form.reset();
    }
    currentConvertTaskId = null;
    document.body.style.overflow = 'auto';
}

async function submitConvertToBooked(event) {
    event.preventDefault();
    if (!currentConvertTaskId) {
        showStatus('Select a task to convert first.', 'error');
        return;
    }

    const { index, row, data } = findToBookTask(currentConvertTaskId);
    if (index === -1 || !data) {
        showStatus('Unable to locate that booking request.', 'error');
        closePresentDialog();
        return;
    }

    const headline = document.getElementById('convertHeadline')?.value.trim();
    const travellers = document.getElementById('convertTravellers')?.value || 'Both';
    const startDate = document.getElementById('convertStartDate')?.value;
    const endDate = document.getElementById('convertEndDate')?.value || startDate;
    const confirmationData = document.getElementById('convertConfirmation')?.value.trim() || '';
    const convertNotes = document.getElementById('convertNotes')?.value.trim() || '';

    if (!headline || !startDate) {
        showStatus('Headline and start date are required to move a booking.', 'error');
        return;
    }

    const provisionalBookingId = `BK-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const combinedNotes = [data.notes, convertNotes].filter(Boolean).join(' | ') || '';
    const details = data.instruction || headline;

    const newBookingRow = {
        bookingId: provisionalBookingId,
        bookingType: data.bookingType || '',
        headline,
        details,
        startDate,
        endDate,
        travellers,
        confirmationData,
        notes: combinedNotes,
        createdFromTask: data.taskId,
        createdAt: nowIso,
        updatedAt: nowIso,
        __local: true
    };

    if (!Array.isArray(currentData.bookedUpcoming)) {
        currentData.bookedUpcoming = [];
    }
    currentData.bookedUpcoming.push(newBookingRow);
    const newBookingIndex = currentData.bookedUpcoming.length - 1;

    if (Array.isArray(row)) {
        row[8] = 'converted';
        row[10] = nowIso;
        currentData.toBookTasks[index] = row;
    } else {
        row.status = 'converted';
        row.updatedAt = nowIso;
        currentData.toBookTasks[index] = row;
    }

    persistLocalToBook();
    persistLocalBooked();
    closePresentDialog();
    renderToBookBoard();
    renderBookedList();
    updateCalendar();

    try {
        const syncResult = await persistBookedToRemote(newBookingRow, { sourceTaskId: data.taskId });
        if (syncResult?.success) {
            const bookingData = syncResult.booking || {};
            currentData.bookedUpcoming[newBookingIndex] = Object.assign({}, bookingData, { __local: false });
            if (Array.isArray(row)) {
                row[8] = 'converted';
                row[10] = bookingData.updatedAt || nowIso;
                currentData.toBookTasks[index] = row;
            } else if (row) {
                row.status = 'converted';
                row.updatedAt = bookingData.updatedAt || nowIso;
                row.__local = false;
                currentData.toBookTasks[index] = row;
            }
            persistLocalToBook();
            persistLocalBooked();
            renderBookedList();
            updateCalendar();
            showStatus('Booking moved to the Booked list. ✈️', 'success');
        } else if (syncResult?.skipped) {
            showStatus('Booking saved locally. Configure the write endpoint to sync with Sheets.', 'success');
        } else {
            console.error('Booking sync failed:', syncResult);
            showStatus('Booking saved locally; sync failed. Try again later.', 'error');
        }
    } catch (error) {
        console.error('Booking sync error:', error);
        showStatus('Booking saved locally; sync failed. Try again later.', 'error');
    }
}

function resetBookedEditorForm() {
    const form = document.getElementById('bookedEditorForm');
    if (!form) return;
    form.reset();
    const todayIso = new Date().toISOString().split('T')[0];
    const startInput = document.getElementById('bookedEditorStartDate');
    const endInput = document.getElementById('bookedEditorEndDate');
    if (startInput && !startInput.value) startInput.value = todayIso;
    if (endInput) endInput.value = '';
}

function openBookedEditor(bookingId) {
    const dialog = document.getElementById('bookedEditorDialog');
    const title = document.getElementById('bookedEditorTitle');
    const idField = document.getElementById('bookedEditorId');
    if (!dialog || !title || !idField) return;

    resetBookedEditorForm();

    const typeSelect = document.getElementById('bookedEditorType');
    populateBookingTypeSelect(typeSelect, bookingId ? '' : null);

    if (bookingId) {
        const { data } = findBookedEntry(bookingId);
        if (!data) {
            showStatus('Unable to find that booking.', 'error');
            return;
        }
        currentEditingBookingId = bookingId;
        title.textContent = 'Edit Booking';
        idField.value = bookingId;
        populateBookingTypeSelect(typeSelect, data.bookingType || '');
        document.getElementById('bookedEditorHeadline').value = data.headline || '';
        document.getElementById('bookedEditorTravellers').value = data.travellers || 'Both';
        document.getElementById('bookedEditorStartDate').value = data.startDate || '';
        document.getElementById('bookedEditorEndDate').value = data.endDate || '';
        document.getElementById('bookedEditorDetails').value = data.details || '';
        document.getElementById('bookedEditorConfirmation').value = data.confirmationData || '';
        document.getElementById('bookedEditorNotes').value = data.notes || '';
    } else {
        currentEditingBookingId = null;
        title.textContent = 'Add Booking';
        idField.value = '';
        populateBookingTypeSelect(typeSelect, null);
    }

    dialog.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBookedEditor() {
    const dialog = document.getElementById('bookedEditorDialog');
    if (dialog) {
        dialog.classList.remove('active');
    }
    currentEditingBookingId = null;
    document.body.style.overflow = 'auto';
}

async function submitBookedEditor(event) {
    event.preventDefault();
    const bookingType = document.getElementById('bookedEditorType')?.value?.trim() || '';
    const headline = document.getElementById('bookedEditorHeadline')?.value?.trim() || '';
    const travellers = document.getElementById('bookedEditorTravellers')?.value || 'Both';
    const startDate = document.getElementById('bookedEditorStartDate')?.value || '';
    const endDate = document.getElementById('bookedEditorEndDate')?.value || '';
    const details = document.getElementById('bookedEditorDetails')?.value?.trim() || '';
    const confirmationData = document.getElementById('bookedEditorConfirmation')?.value?.trim() || '';
    const notes = document.getElementById('bookedEditorNotes')?.value?.trim() || '';

    if (!bookingType || !headline || !startDate) {
        showStatus('Booking type, headline, and start date are required.', 'error');
        return;
    }

    const nowIso = new Date().toISOString();
    const isEditing = Boolean(currentEditingBookingId);
    let bookingId = currentEditingBookingId || `BK-${Date.now().toString().slice(-6)}`;
    let createdAt = nowIso;
    let createdFromTask = '';
    let targetIndex = -1;

    if (isEditing) {
        const { index, data } = findBookedEntry(bookingId);
        if (index === -1 || !data) {
            showStatus('Unable to locate that booking.', 'error');
            closeBookedEditor();
            return;
        }
        createdAt = data.createdAt || nowIso;
        createdFromTask = data.createdFromTask || '';
        targetIndex = index;
    }

    const booking = {
        bookingId,
        bookingType,
        headline,
        details,
        startDate,
        endDate,
        travellers,
        confirmationData,
        notes,
        createdFromTask,
        createdAt,
        updatedAt: nowIso,
        __local: true
    };

    if (targetIndex === -1) {
        if (!Array.isArray(currentData.bookedUpcoming)) {
            currentData.bookedUpcoming = [];
        }
        currentData.bookedUpcoming.push(booking);
        targetIndex = currentData.bookedUpcoming.length - 1;
    } else {
        currentData.bookedUpcoming[targetIndex] = booking;
    }

    persistLocalBooked();
    renderBookedList();
    updateCalendar();
    closeBookedEditor();

    let baseMessage = isEditing ? 'Booking updated.' : 'Booking added to the Booked list.';
    let messageType = 'success';

    try {
        const syncResult = await persistBookedToRemote(booking);
        if (syncResult?.success && syncResult.booking) {
            currentData.bookedUpcoming[targetIndex] = Object.assign({}, syncResult.booking, { __local: false });
            persistLocalBooked();
            renderBookedList();
            updateCalendar();
            baseMessage = isEditing ? 'Booking updated.' : 'Booking added to the Booked list.';
            messageType = 'success';
        } else if (syncResult?.skipped) {
            baseMessage = isEditing
                ? 'Booking updated locally. Configure the write endpoint to sync with Sheets.'
                : 'Booking added locally. Configure the write endpoint to sync with Sheets.';
            messageType = 'success';
        } else {
            console.warn('Manual booking sync failed:', syncResult);
            baseMessage = 'Booking saved locally; sync failed. Try again later.';
            messageType = 'error';
        }
    } catch (error) {
        console.error('Manual booking sync error:', error);
        baseMessage = 'Booking saved locally; sync failed. Try again later.';
        messageType = 'error';
    }

    showStatus(baseMessage, messageType);
}

async function deleteBookedEntry(bookingId, headline, bookingType) {
    if (!bookingId || bookingId === 'undefined' || bookingId === 'null' || bookingId.trim() === '') {
        showStatus('Select a booking to delete.', 'error');
        return;
    }

    const confirmation = confirm('Delete this booking? This cannot be undone.');
    if (!confirmation) return;

    let { index, data } = findBookedEntry(bookingId);
    
    // If not found by bookingId, try to find by matching properties (for TBC bookings)
    if (index === -1 && (headline || bookingType)) {
        const rows = Array.isArray(currentData.bookedUpcoming) ? currentData.bookedUpcoming : [];
        for (let i = 0; i < rows.length; i++) {
            const normalized = normalizeBookedRow(rows[i]);
            if (normalized) {
                // Match by headline and bookingType, and check if it's a TBC booking
                const headlineMatch = !headline || !normalized.headline || normalized.headline === headline;
                const typeMatch = !bookingType || !normalized.bookingType || normalized.bookingType === bookingType;
                const isTBC = !normalized.startDate && !normalized.endDate;
                
                if (headlineMatch && typeMatch && isTBC) {
                    index = i;
                    data = normalized;
                    break;
                }
            }
        }
    }
    
    if (index === -1) {
        showStatus('Unable to locate that booking.', 'error');
        return;
    }

    // Get the actual booking data to use the real bookingId for remote deletion
    const actualBooking = data || normalizeBookedRow(currentData.bookedUpcoming[index]);
    let actualBookingId = actualBooking?.bookingId || bookingId;
    
    // Clean up the bookingId
    if (actualBookingId && typeof actualBookingId === 'string') {
        actualBookingId = actualBookingId.trim();
    }
    
    // Remove from local data first
    currentData.bookedUpcoming.splice(index, 1);
    persistLocalBooked();
    renderBookedList();
    updateCalendar();

    // Check if bookingId is valid for remote deletion
    const isGeneratedTBCId = actualBookingId && actualBookingId.startsWith('TBC-');
    const looksMalformed = actualBookingId && actualBookingId.includes(',') && actualBookingId.split(',').length > 2;
    const isValidBookingId = actualBookingId && actualBookingId.trim() !== '' && 
                            !isGeneratedTBCId && 
                            !looksMalformed && // Explicitly reject malformed IDs
                            actualBookingId.length < 200 && // Reasonable length
                            actualBookingId.match(/^[A-Z0-9-]+$/i); // Only alphanumeric and hyphens (like BK-123456)
    
    if (!isValidBookingId) {
        // No valid bookingId means it's not in the sheet properly, so just delete locally
        logger.debug('Skipping remote delete - invalid or malformed bookingId:', actualBookingId);
        if (looksMalformed) {
            logger.warn('Malformed bookingId detected - this booking was likely corrupted by CSV parsing. It has been removed locally.');
        }
        showStatus('Booking deleted locally (invalid bookingId - not in database).', 'success');
        return;
    }

    try {
        logger.debug('Attempting to delete booking with ID:', actualBookingId);
        const syncResult = await deleteBookedRemote(actualBookingId);
        if (syncResult?.success || syncResult?.skipped) {
            showStatus('Booking deleted.', 'success');
        } else {
            console.warn('Delete booking sync failed:', syncResult);
            showStatus('Booking removed locally; sync failed. Try again later.', 'error');
        }
    } catch (error) {
        console.error('Delete booking sync error:', error);
        showStatus('Booking removed locally; sync failed. Try again later.', 'error');
    }
}

function ensureCalendarTooltip() {
    if (calendarTooltipEl) return calendarTooltipEl;
    calendarTooltipEl = document.createElement('div');
    calendarTooltipEl.className = 'calendar-tooltip';
    document.body.appendChild(calendarTooltipEl);
    return calendarTooltipEl;
}

function attachCalendarTooltipHandlers() {
    const tooltip = ensureCalendarTooltip();
    const icons = document.querySelectorAll('.calendar-booking-icon');
    icons.forEach(icon => {
        if (icon._tooltipBound) return;
        icon._tooltipBound = true;

        const show = (event) => {
            const text = icon.dataset.tooltip || '';
            const normalized = text.replace(/&#10;/g, '\n');
            tooltip.textContent = normalized;
            tooltip.classList.add('visible');
            positionTooltip(event);
        };

        const hide = () => {
            tooltip.classList.remove('visible');
        };

        const positionTooltip = (event) => {
            const tooltipRect = tooltip.getBoundingClientRect();
            const offset = 12;
            let x = event.clientX + offset;
            let y = event.clientY + offset;

            if (x + tooltipRect.width > window.innerWidth - 10) {
                x = window.innerWidth - tooltipRect.width - 10;
            }
            if (y + tooltipRect.height > window.innerHeight - 10) {
                y = event.clientY - tooltipRect.height - offset;
            }

            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
        };

        icon.addEventListener('mouseenter', show);
        icon.addEventListener('mousemove', positionTooltip);
        icon.addEventListener('mouseleave', hide);
        icon.addEventListener('touchstart', (event) => {
            const touch = event.touches[0];
            const text = icon.dataset.tooltip || '';
            tooltip.textContent = text.replace(/&#10;/g, '\n');
            tooltip.classList.add('visible');
            positionTooltip(touch);
        }, { passive: true });
        icon.addEventListener('touchmove', (event) => {
            positionTooltip(event.touches[0]);
        }, { passive: true });
        icon.addEventListener('touchend', hide);
    });
}

function getBookingMeta(type) {
    if (!type) return null;
    const map = getBookingMetaMap();
    return map[type.toLowerCase()] || null;
}

function getBookingMetaMap() {
    if (bookingMetaIndex) return bookingMetaIndex;
    const map = {};
    (currentData.bookingTypeMeta || []).forEach(row => {
        if (!row || row.length === 0) return;
        const typeKey = (row[0] || '').toLowerCase();
        if (!typeKey) return;
        map[typeKey] = {
            type: row[0],
            iconName: row[1] || '',
            requiredFields: (row[2] || '').split(',').map(item => item.trim()).filter(Boolean),
            accentColor: row[3] || 'rgba(59, 130, 246, 0.6)'
        };
    });
    bookingMetaIndex = map;
    return map;
}

function getBookingTypeOptions() {
    const meta = currentData.bookingTypeMeta || [];
    const options = meta
        .map(row => Array.isArray(row) ? (row[0] || '').trim() : (row.type || '').trim())
        .filter(Boolean);
    const unique = Array.from(new Set(options));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
}

function populateBookingTypeSelect(selectElement, selectedValue) {
    if (!selectElement) return;
    const options = getBookingTypeOptions();
    selectElement.innerHTML = '';

    if (options.length === 0) {
        const fallback = document.createElement('option');
        fallback.value = selectedValue || '';
        fallback.textContent = selectedValue || 'Booking';
        selectElement.appendChild(fallback);
        selectElement.disabled = options.length === 0;
        selectElement.value = fallback.value;
        return;
    }

    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        selectElement.appendChild(opt);
    });

    if (selectedValue && options.includes(selectedValue)) {
        selectElement.value = selectedValue;
    } else {
        selectElement.value = options[0];
    }
    selectElement.disabled = false;
}

function getBookingEmoji(type) {
    const meta = getBookingMeta(type);
    if (meta && meta.iconName) {
        const key = meta.iconName.toLowerCase();
        if (BOOKING_EMOJI_MAP[key]) {
            return BOOKING_EMOJI_MAP[key];
        }
    }
    const typeKey = (type || '').toLowerCase();
    return BOOKING_EMOJI_MAP[typeKey] || BOOKING_EMOJI_MAP['default'];
}

function normalizeBookingIconKey(value) {
    return (value || '')
        .toString()
        .toLowerCase()
        .replace(/[^a-z]/g, '');
}

function getBookingIconUrl(type) {
    const candidates = [];
    const meta = getBookingMeta(type);
    if (meta?.iconName) {
        candidates.push(meta.iconName);
    }
    if (type) {
        candidates.push(type);
    }
    for (const candidate of candidates) {
        const key = normalizeBookingIconKey(candidate);
        if (BOOKING_ICON_MAP[key]) {
            return BOOKING_ICON_MAP[key];
        }
    }
    return '';
}

function getCalendarIconInfo(booking) {
    const type = (booking.bookingType || '').toLowerCase();
    const meta = getBookingMeta(booking.bookingType);
    const accent = meta?.accentColor || '#bfdbfe';

    const iconMap = {
        flight: 'assets/icons/flight.svg',
        'flight/s': 'assets/icons/flight.svg',
        flights: 'assets/icons/flight.svg',
        ferry: 'assets/icons/ferry.svg',
        train: 'assets/icons/train.svg',
        'hire car': 'assets/icons/hireCar.svg',
        hirecar: 'assets/icons/hireCar.svg',
        'car hire': 'assets/icons/hireCar.svg',
        car: 'assets/icons/hireCar.svg',
        accomodation: 'assets/icons/accomodation.svg',
        accommodation: 'assets/icons/accomodation.svg'
    };

    const icon = iconMap[type] || 'assets/icons/travelHub.svg';
    return { icon, color: accent };
}
function getBookingIndicatorsForDate(date) {
    const bookings = getBookedEntries({ includePast: true });
    if (!bookings.length) return '';

    // Filter out TBC bookings (no start or end date)
    const bookingsWithDates = bookings.filter(booking => booking.startDate || booking.endDate);
    if (!bookingsWithDates.length) return '';

    const iso = date.toISOString().split('T')[0];
    const matches = bookingsWithDates.filter(booking => {
        if (!isDateWithinRange(iso, booking.startDate, booking.endDate)) return false;

        const type = (booking.bookingType || '').toLowerCase();
        const startIso = booking.startDate ? booking.startDate.split('T')[0] : '';
        const endIso = booking.endDate ? booking.endDate.split('T')[0] : '';

        if (['flight', 'flight/s', 'flights'].includes(type) && startIso && endIso && startIso !== endIso) {
            return iso === startIso || iso === endIso;
        }

        return true;
    });

    if (matches.length === 0) return '';

    const badges = matches.slice(0, 3).map(booking => {
        const iconInfo = getCalendarIconInfo(booking);
        const tooltip = sanitizeAttribute(buildBookingTooltipContent(booking));
        const iconPath = iconInfo.icon.replace(/'/g, "\\'");
        const color = sanitizeAttribute(iconInfo.color || '#bfdbfe');
        return `<span class="calendar-booking-icon" data-tooltip="${tooltip}" style="background-color:${color};-webkit-mask:url('${iconPath}') center/contain no-repeat;mask:url('${iconPath}') center/contain no-repeat;"></span>`;
    }).join('');

    return `<div class="calendar-bookings">${badges}</div>`;
}

function buildBookingTooltipContent(booking) {
    const headline = booking.headline || booking.bookingType || 'Booking';
    return headline.toString();
}

function getBookedEntries(options = {}) {
    const { includePast = false } = options;
    const entries = (currentData.bookedUpcoming || [])
        .map(normalizeBookedRow)
        .filter(Boolean);

    if (entries.length === 0 && Array.isArray(currentData.presentBookings) && currentData.presentBookings.length > 0) {
        entries.push(...currentData.presentBookings.map(normalizeLegacyPresentBooking).filter(Boolean));
    }

    entries.sort(compareByStartDate);

    if (includePast) {
        return entries;
    }

    const cutoffDate = getTodayStart();
    cutoffDate.setDate(cutoffDate.getDate() - 2);
    const cutoffValue = cutoffDate.getTime();

    return entries.filter(entry => {
        const endValue = parseDateValue(entry.endDate || entry.startDate);
        if (isFinite(endValue) && endValue < cutoffValue) {
            return false;
        }
        return true;
    });
}

function normalizeBookedRow(row) {
    if (!row) return null;
    if (Array.isArray(row)) {
        return {
            bookingId: row[0] || '',
            bookingType: row[1] || '',
            headline: row[2] || '',
            details: row[3] || '',
            startDate: normalizeDateInput(row[4]),
            endDate: normalizeDateInput(row[5]) || normalizeDateInput(row[4]) || '',
            travellers: row[6] || '',
            confirmationData: row[7] || '',
            notes: row[8] || '',
            createdFromTask: row[9] || '',
            createdAt: row[10] || '',
            updatedAt: row[11] || ''
        };
    }

    return {
        bookingId: row.bookingId || '',
        bookingType: row.bookingType || '',
        headline: row.headline || '',
        details: row.details || '',
        startDate: normalizeDateInput(row.startDate),
        endDate: normalizeDateInput(row.endDate) || normalizeDateInput(row.startDate) || '',
        travellers: row.travellers || '',
        confirmationData: row.confirmationData || '',
        notes: row.notes || '',
        createdFromTask: row.createdFromTask || '',
        createdAt: row.createdAt || '',
        updatedAt: row.updatedAt || ''
    };
}
function normalizeLegacyPresentBooking(row) {
    if (!Array.isArray(row)) return null;
    return {
        bookingId: row[0] || '',
        bookingType: row[2] || row[1] || '',
        headline: `${row[2] || ''} ${row[3] || ''}`.trim(),
        details: row[8] || '',
        startDate: normalizeDateInput(row[4]),
        endDate: normalizeDateInput(row[5]) || normalizeDateInput(row[4]) || '',
        travellers: row[1] || '',
        confirmationData: '',
        notes: row[9] || '',
        createdFromTask: '',
        createdAt: '',
        updatedAt: ''
    };
}
function renderBookedList() {
    const timeline = document.getElementById('bookedTimeline');
    if (!timeline) return;

    const bookings = getBookedEntries();
    if (bookings.length === 0) {
        timeline.innerHTML = '<div class="present-empty-state">No upcoming bookings yet. Move requests across from "To Book" when you confirm them.</div>';
        return;
    }

    timeline.innerHTML = bookings.map((booking, index) => buildBookedCard(booking, index)).join('');
}

function buildBookedCard(booking, index) {
    const meta = getBookingMeta(booking.bookingType);
    const accent = meta?.accentColor || 'rgba(59, 130, 246, 0.6)';
    const emoji = getBookingEmoji(booking.bookingType);
    const iconUrl = getBookingIconUrl(booking.bookingType);
    const travellerLabel = booking.travellers ? sanitizeText(booking.travellers) : '—';
    const confirmationRow = booking.confirmationData ? buildDetailRow('Confirmation', booking.confirmationData) : '';
    const notesRow = booking.notes ? buildDetailRow('Notes', booking.notes) : '';
    const detailsRow = buildDetailRow('Details', booking.details || 'Details to follow.');
    const typeMarker = iconUrl
        ? `<span class="booked-type-icon" style="background-color:${accent};-webkit-mask:url('${iconUrl}') center/contain no-repeat;mask:url('${iconUrl}') center/contain no-repeat;"></span>`
        : `<span class="booked-type-icon" style="background:${accent};display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:16px;color:#0f172a;">${emoji}</span>`;

    // Use bookingId if available, otherwise use a unique identifier based on booking properties
    const bookingId = booking.bookingId && booking.bookingId.trim() !== '' 
        ? booking.bookingId 
        : `TBC-${sanitizeAttribute(booking.headline || booking.bookingType || 'Booking')}-${index}`;

    return `
        <details class="booked-card" style="border-left: 4px solid ${accent};">
            <summary>
                ${typeMarker}
                <div>
                    <div>${sanitizeText(booking.headline || booking.bookingType || 'Booking')}</div>
                    <div class="booked-dates">${sanitizeText(formatDateRange(booking.startDate, booking.endDate))}</div>
            </div>
                <span class="booked-dates">${travellerLabel}</span>
            </summary>
            <div class="booked-body">
                ${detailsRow}
                ${confirmationRow}
                ${notesRow}
                <div class="booked-actions">
                    <button class="btn secondary" type="button" onclick="openBookedEditor('${sanitizeAttribute(bookingId)}')">Edit</button>
                    <button class="btn ghost" type="button" onclick="deleteBookedEntry('${sanitizeAttribute(bookingId)}', '${sanitizeAttribute(booking.headline || '')}', '${sanitizeAttribute(booking.bookingType || '')}')">Delete</button>
                </div>
            </div>
        </details>
    `;
}

function buildDetailRow(label, value) {
    if (!value) return '';
    return `<div><div class="label">${sanitizeText(label)}</div><div>${formatMultilineText(value)}</div></div>`;
}

function formatMultilineText(value) {
    return sanitizeText(value || '').replace(/\n/g, '<br>');
}

function formatDateRange(start, end) {
    if (!start && !end) return 'Dates TBC';
    if (!end || !start || start === end) {
        return formatLongDate(start || end);
    }
    return `${formatLongDate(start)} → ${formatLongDate(end)}`;
}

function compareByDeadlineThenCreated(a, b) {
    const aDeadline = parseDateValue(a.deadline);
    const bDeadline = parseDateValue(b.deadline);
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;

    const aStart = parseDateValue(a.startDate);
    const bStart = parseDateValue(b.startDate);
    if (aStart !== bStart) return aStart - bStart;

    const aCreated = parseDateValue(a.createdAt) || 0;
    const bCreated = parseDateValue(b.createdAt) || 0;
    return aCreated - bCreated;
}

function compareByStartDate(a, b) {
    const aStart = parseDateValue(a.startDate);
    const bStart = parseDateValue(b.startDate);
    if (aStart !== bStart) return aStart - bStart;

    const typeWeight = (bookingType) => {
        const key = (bookingType || '').toString().trim().toLowerCase();
        switch (key) {
            case 'flight':
            case 'flights':
            case 'flight/s':
                return 0;
            case 'ferry':
                return 1;
            case 'train':
                return 2;
            case 'hire car':
            case 'hirecar':
            case 'car hire':
            case 'car':
                return 3;
            case 'accommodation':
            case 'accommodation ':
                return 4;
            default:
                return 5;
        }
    };

    const aWeight = typeWeight(a.bookingType);
    const bWeight = typeWeight(b.bookingType);
    if (aWeight !== bWeight) return aWeight - bWeight;

    return (a.headline || '').localeCompare(b.headline || '');
}

function parseDateValue(dateStr) {
    const date = parseISOToLocalDate(dateStr);
    return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

function getTodayStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function sanitizeText(value) {
    return (value ?? '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeAttribute(value) {
    return (value ?? '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '&#10;');
}

function formatIsoDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDaysToIsoDate(isoDate, days) {
    const baseDate = parseISOToLocalDate(isoDate);
    if (!baseDate || Number.isNaN(baseDate.getTime())) return '';
    const nextDate = new Date(baseDate.getTime());
    nextDate.setDate(nextDate.getDate() + Number(days || 0));
    return formatIsoDate(nextDate);
}

function autoAlignStayChainStateFrom(startIndex) {
    if (!scenarioEditorState) return false;
    const stays = scenarioEditorState.stays || [];
    if (!Array.isArray(stays) || stays.length < 2) return false;

    let changed = false;
    const begin = Math.max(1, startIndex || 1);

    for (let i = begin; i < stays.length; i++) {
        const previous = stays[i - 1];
        const current = stays[i];
        if (!previous || !current) continue;

        const anchor = previous.endDate || previous.startDate;
        if (!anchor) continue;

        const nextStart = addDaysToIsoDate(anchor, 1);
        if (!nextStart) continue;

        const previousEndDate = parseISOToLocalDate(anchor);
        const currentStartDate = parseISOToLocalDate(current.startDate);

        if (!current.startDate || (previousEndDate && currentStartDate && currentStartDate <= previousEndDate)) {
            if (current.startDate !== nextStart) {
                current.startDate = nextStart;
                changed = true;
            }
        }

        const newStartDate = parseISOToLocalDate(current.startDate);
        const currentEndDate = parseISOToLocalDate(current.endDate);
        if (!current.endDate || (currentEndDate && newStartDate && currentEndDate < newStartDate)) {
            if (current.endDate !== current.startDate) {
                current.endDate = current.startDate;
                changed = true;
            }
        }
    }

    return changed;
}

function normalizeDateInput(value) {
    if (!value && value !== 0) return '';

    if (value instanceof Date) {
        return formatIsoDate(value);
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
        const excelEpochOffset = 25569; // days between 1899-12-30 and 1970-01-01
        const msPerDay = 24 * 60 * 60 * 1000;
        const date = new Date(Math.round((value - excelEpochOffset) * msPerDay));
        return formatIsoDate(date);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return '';

        const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        }

        const parsed = new Date(trimmed);
        if (!isNaN(parsed)) {
            return formatIsoDate(parsed);
        }
    }

    return '';
}

function updateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthElement = document.getElementById('currentMonth');
    if (!calendarGrid || !currentMonthElement) return;

    currentMonthElement.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    calendarGrid.innerHTML = '';

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.textContent = day;
        header.style.fontWeight = 'bold';
        header.style.background = 'rgba(148, 163, 184, 0.2)';
        header.style.padding = '10px 5px';
        header.style.textAlign = 'center';
        calendarGrid.appendChild(header);
    });

    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
        const today = getTodayStart();
        
        if (currentDate.getTime() === today.getTime()) {
            dayElement.classList.add('today');
        } else if (currentDate.getTime() < today.getTime()) {
            dayElement.classList.add('past-date');
        }

        dayElement.innerHTML = `<div>${day}</div>${getDayIndicators(currentDate)}`;
        calendarGrid.appendChild(dayElement);
    }

    attachCalendarTooltipHandlers();
}

function getDayIndicators(date) {
    return getTravelIndicatorsForDate(date) + getBookingIndicatorsForDate(date);
}

function getTravelIndicatorsForDate(date) {
    if (!Array.isArray(currentData.relationshipLog) || currentData.relationshipLog.length === 0) {
        return '';
    }

    const dateStr = date.toLocaleDateString('en-GB');
    const dayTravel = currentData.relationshipLog.find(entry => entry[0] === dateStr);
    if (!dayTravel) return '';

    const [, kimberCountry, sionaCountry] = dayTravel;
    let indicators = '';

    if (kimberCountry && sionaCountry) {
        if (kimberCountry === sionaCountry) {
            indicators += '<div class="travel-indicator both"></div>';
        } else {
            indicators += '<div class="travel-indicator kimber"></div>';
            indicators += '<div class="travel-indicator siona"></div>';
        }
    } else if (kimberCountry) {
        indicators += '<div class="travel-indicator kimber"></div>';
    } else if (sionaCountry) {
        indicators += '<div class="travel-indicator siona"></div>';
    }

    return indicators;
}

function isDateWithinRange(targetIso, startIso, endIso) {
    if (!targetIso) return false;
    const target = parseISOToLocalDate(targetIso);
    const start = parseISOToLocalDate(startIso || targetIso);
    const end = parseISOToLocalDate(endIso || startIso || targetIso);
    if (!target || !start || !end) return false;

    const targetValue = target.getTime();
    return targetValue >= start.getTime() && targetValue <= end.getTime();
}

function previousMonth() {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    updateCalendar();
}

function nextMonth() {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    updateCalendar();
}

// Future Tab Functions
function hydrateFutureScenarioModels() {
    try {
        const scenarios = (currentData.futureScenarios || [])
            .map(normalizeScenarioRow)
            .filter(Boolean);
        const stays = (currentData.scenarioStays || [])
            .map(normalizeScenarioStayRow)
            .filter(Boolean);

        const staysByScenario = new Map();
        stays.forEach(stay => {
            if (!staysByScenario.has(stay.scenarioId)) {
                staysByScenario.set(stay.scenarioId, []);
            }
            staysByScenario.get(stay.scenarioId).push(stay);
        });

        scenarios.forEach(scenario => {
            const scenarioStays = staysByScenario.get(scenario.scenarioId) || [];
            scenarioStays.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
            const derived = computeScenarioDerivedData(scenario, scenarioStays);
            Object.assign(scenario, derived);
            scenario.stays = scenarioStays;
        });

        scenarios.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
        currentData.futureScenarioModels = scenarios;

        const validIds = new Set(scenarios.map(s => s.scenarioId));
        Array.from(scenarioValidationCache.keys()).forEach(key => {
            if (!validIds.has(key)) {
                scenarioValidationCache.delete(key);
            }
        });
    } catch (error) {
        logger.error('Failed to hydrate scenario models:', error);
    }
}

function normalizeScenarioRow(row) {
    if (!row) return null;
    if (Array.isArray(row)) {
        return {
            scenarioId: (row[0] || '').toString().trim(),
            headline: (row[1] || '').toString().trim() || 'Untitled Scenario',
            createdBy: (row[2] || 'kimber').toString().trim().toLowerCase(),
            rating: Number(row[3]) || 0,
            startDate: normalizeDateInput(row[4]),
            endDate: normalizeDateInput(row[5]),
            summary: (row[6] || '').toString().trim(),
            icon: (row[7] || 'future').toString().trim(),
            accommodationType: (row[8] || '').toString().trim(),
            lastUpdated: normalizeDateTime(row[9])
        };
    }
    return {
        scenarioId: (row.scenarioId || '').toString().trim(),
        headline: (row.headline || '').toString().trim() || 'Untitled Scenario',
        createdBy: (row.createdBy || 'kimber').toString().trim().toLowerCase(),
        rating: Number(row.rating) || 0,
        startDate: normalizeDateInput(row.startDate),
        endDate: normalizeDateInput(row.endDate),
        summary: (row.summary || '').toString().trim(),
        icon: (row.icon || 'future').toString().trim(),
        accommodationType: (row.accommodationType || '').toString().trim(),
        lastUpdated: normalizeDateTime(row.lastUpdated)
    };
}

function normalizeScenarioStayRow(row) {
    if (!row) return null;
    if (Array.isArray(row)) {
        return {
            scenarioId: (row[0] || '').toString().trim(),
            stayId: (row[1] || '').toString().trim(),
            profileScope: (row[2] || 'both').toString().trim().toLowerCase(),
            country: (row[3] || '').toString().trim(),
            city: (row[4] || '').toString().trim(),
            startDate: normalizeDateInput(row[5]),
            endDate: normalizeDateInput(row[6]),
            notes: (row[7] || '').toString().trim(),
            accommodationType: (row[8] || '').toString().trim(),
            routeNotes: (row[9] || '').toString().trim()
        };
    }
    return {
        scenarioId: (row.scenarioId || '').toString().trim(),
        stayId: (row.stayId || '').toString().trim(),
        profileScope: (row.profileScope || 'both').toString().trim().toLowerCase(),
        country: (row.country || '').toString().trim(),
        city: (row.city || '').toString().trim(),
        startDate: normalizeDateInput(row.startDate),
        endDate: normalizeDateInput(row.endDate),
        notes: (row.notes || '').toString().trim(),
        accommodationType: (row.accommodationType || '').toString().trim(),
        routeNotes: (row.routeNotes || '').toString().trim()
    };
}

function normalizeDateTime(value) {
    if (!value && value !== 0) return '';
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
        return new Date(value).toISOString();
    }
    return value.toString();
}

function computeScenarioDerivedData(baseScenario, stays) {
    const startDates = stays.map(stay => stay.startDate).filter(Boolean).sort();
    const endDates = stays.map(stay => stay.endDate).filter(Boolean).sort();

    const startDate = startDates[0] || baseScenario.startDate || '';
    const endDate = endDates[endDates.length - 1] || baseScenario.endDate || startDate;

    const durationDays = calculateDurationInDays(startDate, endDate);
    const countries = Array.from(new Set(stays.map(stay => stay.country).filter(Boolean)));
    const travellers = Array.from(new Set(stays.map(stay => stay.profileScope || 'both')));

    return {
        startDate,
        endDate,
        durationDays,
        countries,
        countryCount: countries.length,
        travellers,
        displayDateRange: formatScenarioDateRange(startDate, endDate)
    };
}

function calculateDurationInDays(startIso, endIso) {
    const start = parseISOToLocalDate(startIso);
    const end = parseISOToLocalDate(endIso);
    if (!start || !end) return 0;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
}

function formatScenarioDateRange(startIso, endIso) {
    if (!startIso && !endIso) return 'Dates TBC';
    if (!endIso || startIso === endIso) {
        return formatLongDate(startIso || endIso);
    }
    return `${formatLongDate(startIso)} → ${formatLongDate(endIso)}`;
}

function formatRelativeDate(value) {
    if (!value) return 'just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return sanitizeText(value);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

function getScenarioIconPath(iconKey) {
    const match = SCENARIO_ICON_OPTIONS.find(option => option.value === (iconKey || '').toLowerCase());
    return match ? match.path : (SCENARIO_ICON_OPTIONS[0]?.path || 'assets/icons/future.svg');
}

function refreshScenarioCountryOptions() {
    const countries = Array.isArray(currentData.countries) ? currentData.countries : [];
    const options = countries.map(row => {
        if (!row) return null;
        const name = (row[0] || '').toString().trim();
        if (!name) return null;
        const alpha3 = (row[1] || '').toString().trim();
        const alpha2 = (row[2] || '').toString().trim();
        const flag = (row[3] || '').toString().trim();
        return { name, alpha3, alpha2, flag };
    }).filter(Boolean);
    options.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    scenarioCountryOptionsCache = options;
}

function getScenarioCountryOptions() {
    if (!scenarioCountryOptionsCache.length && Array.isArray(currentData.countries) && currentData.countries.length) {
        refreshScenarioCountryOptions();
    }
    return scenarioCountryOptionsCache;
}

function renderScenarioCountryOptions(selectedValue, skipPlaceholder = false) {
    const options = getScenarioCountryOptions();
    const normalizedSelected = selectedValue ? standardizeCountryName(selectedValue) : '';
    let found = false;
    const optionMarkup = [];

    if (!skipPlaceholder) {
        optionMarkup.push(`<option value=""${normalizedSelected ? '' : ' selected'}>Select a country</option>`);
    }

    options.forEach(option => {
        const isSelected = normalizedSelected && standardizeCountryName(option.name) === normalizedSelected;
        if (isSelected) {
            found = true;
        }
        optionMarkup.push(`
            <option value="${sanitizeAttribute(option.name)}"${isSelected ? ' selected' : ''}>
                ${sanitizeText(option.name)}
            </option>
        `);
    });

    if (selectedValue && !found) {
        optionMarkup.push(`
            <option value="${sanitizeAttribute(selectedValue)}" selected>
                ${sanitizeText(selectedValue)}
            </option>
        `);
    }

    return optionMarkup.join('');
}

function getScenarioAccommodationOptions(selectedValue) {
    const currentValue = (selectedValue ?? '').toString();
    const options = [...SCENARIO_STAY_ACCOMMODATION_OPTIONS];
    if (currentValue && !options.some(option => option.value.toLowerCase() === currentValue.toLowerCase())) {
        options.push({ value: currentValue, label: currentValue, path: '' });
    }
    return options;
}

function generateLocalId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function extractScenarioId(row) {
    if (!row) return '';
    if (Array.isArray(row)) {
        return (row[0] || '').toString().trim();
    }
    return (row.scenarioId || '').toString().trim();
}

function ensureScenarioPayloadIds(payload, saveResult) {
    if (!payload) return;
    if (!payload.scenarioId) {
        payload.scenarioId = (saveResult?.scenario?.scenarioId) || generateLocalId('scenario');
    }
    payload.stays = (payload.stays || []).map((stay, index) => {
        const matchedStay = Array.isArray(saveResult?.stays) ? saveResult.stays[index] : null;
        const stayId = stay.stayId || matchedStay?.stayId || generateLocalId(`stay-${index + 1}`);
        return Object.assign({}, stay, { stayId });
    });
}

function upsertScenarioLocalModelFromPayload(payload) {
    if (!payload || !payload.scenarioId) return;

    const scenarioRow = {
        scenarioId: payload.scenarioId,
        headline: payload.headline || 'Untitled Scenario',
        createdBy: (payload.createdBy || 'kimber').toString().trim().toLowerCase(),
        rating: Number(payload.rating) || 0,
        startDate: payload.startDate || '',
        endDate: payload.endDate || '',
        summary: payload.summary || '',
        icon: (payload.icon || 'future').toString().trim(),
        accommodationType: (payload.accommodationType || '').toString().trim(),
        lastUpdated: payload.lastUpdated || new Date().toISOString()
    };

    const stayRows = (payload.stays || []).map(stay => ({
        scenarioId: scenarioRow.scenarioId,
        stayId: (stay.stayId || generateLocalId('stay')).toString().trim(),
        profileScope: (stay.profileScope || 'both').toString().trim().toLowerCase(),
        country: (stay.country || '').toString().trim(),
        city: (stay.city || '').toString().trim(),
        startDate: stay.startDate || '',
        endDate: stay.endDate || stay.startDate || '',
        notes: (stay.notes || '').toString().trim(),
        accommodationType: (stay.accommodationType || '').toString().trim(),
        routeNotes: (stay.routeNotes || '').toString().trim()
    }));

    const filteredScenarios = (currentData.futureScenarios || []).filter(row => extractScenarioId(row) !== scenarioRow.scenarioId);
    filteredScenarios.push(scenarioRow);
    currentData.futureScenarios = filteredScenarios;

    const filteredStays = (currentData.scenarioStays || []).filter(row => extractScenarioId(row) !== scenarioRow.scenarioId);
    filteredStays.push(...stayRows);
    currentData.scenarioStays = filteredStays;

    hydrateFutureScenarioModels();
    scenarioValidationCache.delete(scenarioRow.scenarioId);
    renderFutureScenarioList();
}

function toggleScenarioAccommodationMenu(index, triggerButton) {
    const container = triggerButton?.closest('.scenario-accommodation-select');
    if (!container) return;
    const isOpen = container.dataset.open === 'true';
    closeScenarioAccommodationMenu();
    if (!isOpen) {
        container.dataset.open = 'true';
        activeScenarioAccommodationSelect = { container, index };
        document.addEventListener('click', handleScenarioAccommodationOutsideClick, true);
    }
}

function handleScenarioAccommodationOutsideClick(event) {
    if (activeScenarioAccommodationSelect && !activeScenarioAccommodationSelect.container.contains(event.target)) {
        closeScenarioAccommodationMenu();
    }
}

function closeScenarioAccommodationMenu() {
    if (activeScenarioAccommodationSelect && activeScenarioAccommodationSelect.container) {
        activeScenarioAccommodationSelect.container.dataset.open = 'false';
    }
    if (activeScenarioAccommodationSelect) {
        document.removeEventListener('click', handleScenarioAccommodationOutsideClick, true);
        activeScenarioAccommodationSelect = null;
    }
}

function selectScenarioAccommodationFromButton(index, button) {
    const value = button?.getAttribute('data-value') || '';
    selectScenarioAccommodation(index, value);
}

function selectScenarioAccommodation(index, value) {
    closeScenarioAccommodationMenu();
    if (!scenarioEditorState || !scenarioEditorState.stays[index]) return;
    scenarioEditorState.stays[index].accommodationType = value;
    renderScenarioEditorStays();
}

function renderScenarioIconSelector(selectedValue) {
    const container = document.getElementById('scenarioIconSelect');
    if (!container) return;

    const normalizedValue = (selectedValue || '').toString().toLowerCase();
    const fallbackOption = SCENARIO_ICON_OPTIONS[0] || null;
    let currentOption = SCENARIO_ICON_OPTIONS.find(option => option.value === normalizedValue) || fallbackOption;

    if (!currentOption && fallbackOption && scenarioEditorState) {
        onScenarioFieldChange('icon', fallbackOption.value);
        currentOption = fallbackOption;
    }

    const labelText = currentOption ? currentOption.label : 'Select icon';
    const menuMarkup = SCENARIO_ICON_OPTIONS.map(option => `
        <button type="button" class="scenario-icon-select__option${option.value === (currentOption?.value || '') ? ' active' : ''}" data-value="${sanitizeAttribute(option.value)}">
            <img src="${sanitizeAttribute(option.path)}" alt="">
            <span>${sanitizeText(option.label)}</span>
        </button>
    `).join('');

    container.innerHTML = `
        <button type="button" class="scenario-icon-select__trigger" onclick="toggleScenarioIconMenu(event)">
            <span>${sanitizeText(labelText)}</span>
            <span class="scenario-icon-select__chevron">▾</span>
        </button>
        <div class="scenario-icon-select__menu" role="listbox">
            ${menuMarkup}
        </div>
    `;
    container.dataset.open = 'false';
    requestAnimationFrame(() => {
        container.querySelectorAll('.scenario-icon-select__option').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const value = button.getAttribute('data-value') || '';
                selectScenarioIcon(value);
            });
        });
    });
}

function toggleScenarioIconMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget.closest('.scenario-icon-select');
    if (!container) return;
    const isOpen = container.dataset.open === 'true';
    closeScenarioIconMenu();
    if (!isOpen) {
        container.dataset.open = 'true';
        activeScenarioIconSelect = container;
        document.addEventListener('click', handleScenarioIconOutsideClick, true);
    }
}

function handleScenarioIconOutsideClick(event) {
    if (activeScenarioIconSelect && !activeScenarioIconSelect.contains(event.target)) {
        closeScenarioIconMenu();
    }
}

function closeScenarioIconMenu() {
    if (activeScenarioIconSelect) {
        activeScenarioIconSelect.dataset.open = 'false';
        activeScenarioIconSelect = null;
        document.removeEventListener('click', handleScenarioIconOutsideClick, true);
    }
}

function selectScenarioIcon(value) {
    closeScenarioIconMenu();
    if (!scenarioEditorState) return;
    onScenarioFieldChange('icon', value);
    renderScenarioIconSelector(value);
}

function renderScenarioCreatorLabel(value) {
    const normalized = (value || 'kimber').toLowerCase();
    switch (normalized) {
        case 'siona':
            return 'Created by Siona';
        case 'both':
            return 'Created together';
        default:
            return 'Created by Kimber';
    }
}

function disposeScenarioMaps() {
    Object.values(scenarioMaps).forEach(mapInstance => {
        try {
            if (mapInstance && typeof mapInstance.remove === 'function') {
                mapInstance.remove();
            }
        } catch (error) {
            logger.warn('Unable to dispose map instance:', error);
        }
    });
    Object.keys(scenarioMaps).forEach(key => delete scenarioMaps[key]);
}


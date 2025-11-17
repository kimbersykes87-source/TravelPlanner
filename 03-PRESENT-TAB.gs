/**
 * PRESENT TAB - Current Bookings and ToBook Management
 * Functions for managing BookedUpcoming entries and ToBook tasks
 */

/**
 * Webhook entry point for write operations (bookings, task updates)
 */
function doPost(e) {
  if (!e || !e.parameter) {
    return createJsonResponse_({ success: false, error: 'No request data supplied.' });
  }

  return handleWriteApiRequest_(e);
}

/**
 * Handle write API request
 */
function handleWriteApiRequest_(e) {
  try {
    if (!isWriteApiConfigured_()) {
      throw new Error('Write API token not configured.');
    }

    const params = e.parameter;
    const token = params.token || '';
    if (token !== WRITE_API_TOKEN) {
      return createJsonResponse_({ success: false, error: 'Unauthorized request.' });
    }

    const action = params.action || '';
    switch (action) {
      case 'addBooked': {
        const bookingPayload = params.booking ? JSON.parse(params.booking) : null;
        if (!bookingPayload) {
          return createJsonResponse_({ success: false, error: 'Missing booking payload.' });
        }
        const sourceTaskId = params.sourceTaskId || '';
        const result = addBookedUpcomingEntry_(bookingPayload, sourceTaskId);
        return createJsonResponse_(Object.assign({ success: true }, result));
      }
      case 'upsertToBook': {
        const toBookPayload = params.toBook ? JSON.parse(params.toBook) : null;
        if (!toBookPayload) {
          return createJsonResponse_({ success: false, error: 'Missing To Book payload.' });
        }
        const result = upsertToBookEntry_(toBookPayload);
        return createJsonResponse_(Object.assign({ success: true }, result));
      }
      case 'upsertBooked': {
        const bookingPayload = params.booking ? JSON.parse(params.booking) : null;
        if (!bookingPayload) {
          return createJsonResponse_({ success: false, error: 'Missing booking payload.' });
        }
        const sourceTaskId = params.sourceTaskId || '';
        const result = upsertBookedUpcomingEntry_(bookingPayload, sourceTaskId);
        return createJsonResponse_(Object.assign({ success: true }, result));
      }
      case 'deleteBooked': {
        const bookingId = params.bookingId || '';
        if (!bookingId) {
          return createJsonResponse_({ success: false, error: 'Missing bookingId parameter.' });
        }
        try {
          const deleted = deleteBookedUpcomingEntry_(bookingId);
          return createJsonResponse_({ success: deleted, bookingId });
        } catch (error) {
          console.error('deleteBooked error:', error);
          return createJsonResponse_({ success: false, error: error.message || String(error), bookingId });
        }
      }
      case 'upsertScenario': {
        const scenarioPayload = params.scenario ? JSON.parse(params.scenario) : null;
        if (!scenarioPayload) {
          return createJsonResponse_({ success: false, error: 'Missing scenario payload.' });
        }
        const result = upsertScenarioEntry_(scenarioPayload);
        return createJsonResponse_(Object.assign({ success: true }, result));
      }
      case 'deleteScenario': {
        const scenarioId = params.scenarioId || '';
        if (!scenarioId) {
          return createJsonResponse_({ success: false, error: 'Missing scenarioId parameter.' });
        }
        const deleted = deleteScenarioEntry_(scenarioId);
        return createJsonResponse_({ success: deleted, scenarioId });
      }
      case 'validateScenario': {
        const scenarioPayload = params.scenario ? JSON.parse(params.scenario) : null;
        if (!scenarioPayload) {
          return createJsonResponse_({ success: false, error: 'Missing scenario payload.' });
        }
        const result = validateScenarioPayload_(scenarioPayload);
        return createJsonResponse_(Object.assign({ success: true }, result));
      }
      default:
        return createJsonResponse_({ success: false, error: `Unknown action "${action}".` });
    }
  } catch (error) {
    console.error('Write API error:', error);
    return createJsonResponse_({ success: false, error: error.message || String(error) });
  }
}

/**
 * Add booked upcoming entry (wrapper for upsert)
 */
function addBookedUpcomingEntry_(payload, sourceTaskId) {
  return upsertBookedUpcomingEntry_(payload, sourceTaskId);
}

/**
 * Sanitize booking payload
 */
function sanitizeBookingPayload_(payload) {
  const nowIso = new Date().toISOString();
  return {
    bookingId: sanitizeString_(payload.bookingId) || generateBookingId_(),
    bookingType: sanitizeString_(payload.bookingType),
    headline: sanitizeString_(payload.headline),
    details: sanitizeString_(payload.details),
    startDate: sanitizeString_(payload.startDate),
    endDate: sanitizeString_(payload.endDate),
    travellers: sanitizeString_(payload.travellers),
    confirmationData: sanitizeString_(payload.confirmationData),
    notes: sanitizeString_(payload.notes),
    createdFromTask: sanitizeString_(payload.createdFromTask),
    createdAt: sanitizeString_(payload.createdAt) || nowIso,
    updatedAt: sanitizeString_(payload.updatedAt) || nowIso
  };
}

/**
 * Generate booking ID
 */
function generateBookingId_() {
  return 'BK-' + Utilities.getUuid().replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
}

/**
 * Update ToBook status
 */
function updateToBookStatus_(taskId, status, updatedAt) {
  if (!taskId) return false;
  const sheet = getSheetByExpectedName(TO_BOOK_SHEET_NAME);
  if (!sheet) return false;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const currentId = (data[i][0] || '').toString().trim();
    if (currentId && currentId === taskId.toString().trim()) {
      sheet.getRange(i + 1, 9).setValue(status);
      sheet.getRange(i + 1, 11).setValue(updatedAt);
      return true;
    }
  }
  return false;
}

/**
 * Upsert ToBook entry
 */
function upsertToBookEntry_(payload) {
  const sanitized = sanitizeToBookPayload_(payload || {});
  const sheet = getSheetByExpectedName(TO_BOOK_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet "${TO_BOOK_SHEET_NAME}" not found.`);
  }

  const data = sheet.getDataRange().getValues();
  let targetRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const currentId = (data[i][0] || '').toString().trim();
    if (currentId && currentId === sanitized.taskId) {
      targetRowIndex = i + 1; // sheets are 1-based
      break;
    }
  }

  const values = [
    sanitized.taskId,
    sanitized.assignee,
    sanitized.bookingType,
    sanitized.startDate,
    sanitized.endDate,
    sanitized.instruction,
    sanitized.deadline,
    sanitized.notes,
    sanitized.status,
    sanitized.createdAt,
    sanitized.updatedAt
  ];

  if (targetRowIndex === -1) {
    sheet.appendRow(values);
    targetRowIndex = sheet.getLastRow();
  } else {
    sheet.getRange(targetRowIndex, 1, 1, values.length).setValues([values]);
  }

  return {
    toBook: sanitized,
    rowIndex: targetRowIndex
  };
}

/**
 * Upsert booked upcoming entry
 */
function upsertBookedUpcomingEntry_(payload, sourceTaskId) {
  const sanitized = sanitizeBookingPayload_(payload || {});
  const sheet = getSheetByExpectedName(BOOKED_UPCOMING_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet "${BOOKED_UPCOMING_SHEET_NAME}" not found.`);
  }

  const data = sheet.getDataRange().getValues();
  let targetRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const currentId = (data[i][0] || '').toString().trim();
    if (currentId && currentId === sanitized.bookingId) {
      targetRowIndex = i + 1;
      break;
    }
  }

  const values = [
    sanitized.bookingId,
    sanitized.bookingType,
    sanitized.headline,
    sanitized.details,
    sanitized.startDate,
    sanitized.endDate,
    sanitized.travellers,
    sanitized.confirmationData,
    sanitized.notes,
    sanitized.createdFromTask,
    sanitized.createdAt,
    sanitized.updatedAt
  ];

  if (targetRowIndex === -1) {
    sheet.appendRow(values);
    targetRowIndex = sheet.getLastRow();
  } else {
    sheet.getRange(targetRowIndex, 1, 1, values.length).setValues([values]);
  }

  let toBookUpdated = false;
  if (sourceTaskId) {
    toBookUpdated = updateToBookStatus_(sourceTaskId, 'converted', sanitized.updatedAt);
  }

  return {
    booking: sanitized,
    rowIndex: targetRowIndex,
    toBookUpdated
  };
}

/**
 * Delete booked upcoming entry
 */
function deleteBookedUpcomingEntry_(bookingId) {
  if (!bookingId || bookingId.trim() === '') {
    console.error('deleteBookedUpcomingEntry_: Empty bookingId provided');
    return false;
  }

  const sheet = getSheetByExpectedName(BOOKED_UPCOMING_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet "${BOOKED_UPCOMING_SHEET_NAME}" not found.`);
  }

  const data = sheet.getDataRange().getValues();
  const normalizedBookingId = bookingId.toString().trim();
  
  for (let i = 1; i < data.length; i++) {
    const currentId = (data[i][0] || '').toString().trim();
    if (currentId && currentId === normalizedBookingId) {
      sheet.deleteRow(i + 1);
      console.log(`deleteBookedUpcomingEntry_: Deleted booking with ID "${normalizedBookingId}" at row ${i + 1}`);
      return true;
    }
  }
  
  console.warn(`deleteBookedUpcomingEntry_: Booking ID "${normalizedBookingId}" not found in sheet`);
  return false;
}

/**
 * Sanitize ToBook payload
 */
function sanitizeToBookPayload_(payload) {
  const nowIso = new Date().toISOString();
  const taskId = sanitizeString_(payload.taskId) || generateTaskId_();
  const createdAt = sanitizeString_(payload.createdAt) || nowIso;

  return {
    taskId,
    assignee: sanitizeString_(payload.assignee),
    bookingType: sanitizeString_(payload.bookingType),
    startDate: sanitizeString_(payload.startDate),
    endDate: sanitizeString_(payload.endDate),
    instruction: sanitizeString_(payload.instruction),
    deadline: sanitizeString_(payload.deadline),
    notes: sanitizeString_(payload.notes),
    status: sanitizeString_(payload.status) || 'pending',
    createdAt,
    updatedAt: sanitizeString_(payload.updatedAt) || nowIso
  };
}

/**
 * Generate task ID
 */
function generateTaskId_() {
  return 'TB-' + Utilities.getUuid().replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
}


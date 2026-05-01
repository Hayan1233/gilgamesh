// Wait for DOM to be fully loaded
$(document).ready(function() {
    // Toggle sidebar
    $("#menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("toggled");
    });

    // Close sidebar when clicking outside on mobile
    $(document).on('click', function(e) {
        const $wrapper = $("#wrapper");
        const $sidebar = $("#sidebar-wrapper");
        
        // Check if we're on mobile and sidebar is open
        if ($(window).width() <= 991.98 && $wrapper.hasClass("toggled")) {
            // Check if click is outside sidebar and not on menu toggle
            if (!$(e.target).closest('#sidebar-wrapper').length && !$(e.target).is('#menu-toggle') && !$(e.target).closest('#menu-toggle').length) {
                // Close sidebar
                $wrapper.removeClass("toggled");
            }
        }
    });

    // Also handle escape key for sidebar
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            const $wrapper = $("#wrapper");
            if ($(window).width() <= 991.98 && $wrapper.hasClass("toggled")) {
                $wrapper.removeClass("toggled");
            }
        }
    });
});

// Ticket form handling
let currentTicketId = null;
let ticketModal = null;
let deleteModal = null;
let modalMode = 'add';
let tripDatesPickerInstance = null;
let returnTripDatesPickerInstance = null;
let skipReturnDates = false;

const TRAVEL_CLASSES = [
    'الدرجة السياحية',
    'درجة رجال الأعمال',
    'الدرجة الأولى'
];

function normalizeSelectedClasses(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.filter(Boolean);
            }
        } catch (error) {
            return [trimmed];
        }
        return [trimmed];
    }
    return [];
}

function normalizeTripDates(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return [...new Set(value.map((date) => String(date).trim()).filter(Boolean))];
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return [...new Set(parsed.map((date) => String(date).trim()).filter(Boolean))];
            }
        } catch (error) {
            return [...new Set(trimmed.split(',').map((date) => date.trim()).filter(Boolean))];
        }
        return [...new Set(trimmed.split(',').map((date) => date.trim()).filter(Boolean))];
    }
    return [];
}

function renderTripDatesPreview(dates = []) {
    const $preview = $('#tripDatesPreview');
    $preview.empty();

    if (!dates.length) {
        $preview.html('<span class="trip-dates-empty">لم يتم اختيار أي تاريخ بعد.</span>');
        return;
    }

    dates.forEach((date) => {
        $preview.append(`<span class="trip-date-badge">${date}</span>`);
    });
}

function renderReturnTripDatesPreview(dates = []) {
    const $preview = $('#returnTripDatesPreview');
    $preview.empty();

    if (!dates.length) {
        $preview.html('<span class="trip-dates-empty">لم يتم اختيار أي تاريخ بعد.</span>');
        return;
    }

    dates.forEach((date) => {
        $preview.append(`<span class="trip-date-badge">${date}</span>`);
    });
}

function setTripDatesInForm(dates = []) {
    const normalizedDates = normalizeTripDates(dates);
    $('#tripDates').val(JSON.stringify(normalizedDates));
    renderTripDatesPreview(normalizedDates);

    if (tripDatesPickerInstance) {
        tripDatesPickerInstance.setDate(normalizedDates, false, 'Y-m-d');
    }
}

function initTripDatesPicker() {
    const pickerElement = document.getElementById('tripDatesPicker');
    if (!pickerElement || typeof flatpickr !== 'function') return;

    if (tripDatesPickerInstance) {
        tripDatesPickerInstance.destroy();
    }

    tripDatesPickerInstance = flatpickr(pickerElement, {
        mode: 'multiple',
        dateFormat: 'Y-m-d',
        minDate: 'today',
        disableMobile: true,
        allowInput: false,
        locale: {
            firstDayOfWeek: 6
        },
        onChange: function(selectedDates, dateStr, instance) {
            const selectedDateStrings = instance.selectedDates.map((date) => instance.formatDate(date, 'Y-m-d'));
            $('#tripDates').val(JSON.stringify(selectedDateStrings));
            renderTripDatesPreview(selectedDateStrings);
        }
    });

    renderTripDatesPreview([]);
}

function setReturnTripDatesInForm(dates = []) {
    const normalizedDates = normalizeTripDates(dates);
    $('#returnTripDates').val(JSON.stringify(normalizedDates));
    renderReturnTripDatesPreview(normalizedDates);

    if (returnTripDatesPickerInstance) {
        returnTripDatesPickerInstance.setDate(normalizedDates, false, 'Y-m-d');
    }
}

function initReturnTripDatesPicker() {
    const pickerElement = document.getElementById('returnTripDatesPicker');
    if (!pickerElement || typeof flatpickr !== 'function') return;

    if (returnTripDatesPickerInstance) {
        returnTripDatesPickerInstance.destroy();
    }

    returnTripDatesPickerInstance = flatpickr(pickerElement, {
        mode: 'multiple',
        dateFormat: 'Y-m-d',
        minDate: 'today',
        disableMobile: true,
        allowInput: false,
        locale: {
            firstDayOfWeek: 6
        },
        onChange: function(selectedDates, dateStr, instance) {
            const selectedDateStrings = instance.selectedDates.map((date) => instance.formatDate(date, 'Y-m-d'));
            $('#returnTripDates').val(JSON.stringify(selectedDateStrings));
            renderReturnTripDatesPreview(selectedDateStrings);
        }
    });

    renderReturnTripDatesPreview([]);
}

function resetTripDatesSelection() {
    $('#tripDates').val('[]');
    $('#tripDatesPicker').val('');
    renderTripDatesPreview([]);
    if (tripDatesPickerInstance) {
        tripDatesPickerInstance.clear();
    }
}

function resetReturnTripDatesSelection() {
    $('#returnTripDates').val('[]');
    $('#returnTripDatesPicker').val('');
    renderReturnTripDatesPreview([]);
    if (returnTripDatesPickerInstance) {
        returnTripDatesPickerInstance.clear();
    }
}

function setSkipReturnDates(isSkipping) {
    skipReturnDates = Boolean(isSkipping);
    const $picker = $('#returnTripDatesPicker');
    const $checkbox = $('#skipReturnDates');

    if ($checkbox.length) {
        $checkbox.prop('checked', skipReturnDates);
    }

    if (skipReturnDates) {
        resetReturnTripDatesSelection();
        $picker.prop('disabled', true);
        $picker.attr('placeholder', 'تم تعطيل تواريخ العودة (ذهاب فقط)');
        if (returnTripDatesPickerInstance) {
            returnTripDatesPickerInstance.clear();
        }
    } else {
        $picker.prop('disabled', false);
        $picker.attr('placeholder', 'اختر تواريخ العودة (اختياري)');
    }
}

function getTripDatesFromPicker() {
    if (!tripDatesPickerInstance || !Array.isArray(tripDatesPickerInstance.selectedDates)) {
        return [];
    }
    return tripDatesPickerInstance.selectedDates.map((date) => tripDatesPickerInstance.formatDate(date, 'Y-m-d'));
}

function getReturnTripDatesFromPicker() {
    if (!returnTripDatesPickerInstance || !Array.isArray(returnTripDatesPickerInstance.selectedDates)) {
        return [];
    }
    return returnTripDatesPickerInstance.selectedDates.map((date) => returnTripDatesPickerInstance.formatDate(date, 'Y-m-d'));
}

function getClassPricesFromForm() {
    const classPrices = {};
    $('#classPricesContainer .class-price-group').each(function() {
        const className = $(this).data('class');
        if (!className) return;
        classPrices[className] = {
            pricego: $(this).find('.class-price-go').val() || '',
            priceback: $(this).find('.class-price-back').val() || ''
        };
    });
    return classPrices;
}

function renderClassPriceFields(selectedClasses, existingPrices = {}) {
    const $container = $('#classPricesContainer');
    const classes = Array.isArray(selectedClasses) ? selectedClasses : [];
    $container.empty();

    if (!classes.length) {
        $container.html('<div id="classPricePlaceholder" class="text-muted">اختر درجة سفر واحدة على الأقل لإظهار حقول الأسعار.</div>');
        return;
    }

    classes.forEach((className) => {
        const classPrice = existingPrices[className] || {};
        const goValue = classPrice.pricego ?? '';
        const backValue = classPrice.priceback ?? '';
        const classKey = className.replace(/\s+/g, '-');

        $container.append(`
            <div class="class-price-group mb-3 p-3 border rounded bg-white" data-class="${className}">
                <h6 class="mb-3 text-primary"><i class="fas fa-tag me-2"></i>${className}</h6>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">سعر الذهاب (دولار)</label>
                        <input type="number" class="form-control text-start class-price-go" id="pricego-${classKey}" min="0" step="0.01" value="${goValue}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">سعر الذهاب والعودة (دولار)</label>
                        <input type="number" class="form-control text-start class-price-back" id="priceback-${classKey}" min="0" step="0.01" value="${backValue}">
                    </div>
                </div>
            </div>
        `);
    });
}

function getSelectedTravelClasses() {
    const classes = [];
    $('.class-selector-btn.active').each(function() {
        classes.push($(this).data('class-value'));
    });
    return classes;
}

function updateSelectedClassesInputAndPrices() {
    const selectedClasses = getSelectedTravelClasses();
    $('#selectedClasses').val(JSON.stringify(selectedClasses));
    renderClassPriceFields(selectedClasses, getClassPricesFromForm());
}

function setSelectedTravelClasses(selectedClasses, options = {}) {
    const classesSet = new Set(selectedClasses);
    $('.class-selector-btn').each(function() {
        const classValue = $(this).data('class-value');
        $(this).toggleClass('active', classesSet.has(classValue));
    });
    $('#selectedClasses').val(JSON.stringify(selectedClasses));
    renderClassPriceFields(selectedClasses, options.classPrices || {});
}

function resetClassSelection() {
    setSelectedTravelClasses([], { classPrices: {} });
}

function renderLogoPreview(logoFileName) {
    if (logoFileName && logoFileName.trim() !== '') {
        $('#logoPreview').html(`
            <div class="mt-2 p-2 border rounded" style="display: inline-block;">
                <img src="/logo/${logoFileName}" alt="شعار الشركة" 
                     style="max-width: 120px; max-height: 120px; border-radius: 8px; display: block;">
                <small class="text-muted d-block mt-1">${logoFileName}</small>
            </div>
        `);
    } else {
        $('#logoPreview').html('');
    }
}

function syncSelectedAirlineLogo() {
    const $selectedOption = $('#arlinename option:selected');
    const selectedLogo = ($selectedOption.data('logo') || '').toString().trim();

    if (selectedLogo) {
        $('#logo').val(selectedLogo);
        renderLogoPreview(selectedLogo);
        $('#logoUpload').val('');
    } else if (currentTicketId === null) {
        // In add mode, clear logo if no airline is selected.
        $('#logo').val('');
        renderLogoPreview('');
    }
}

// Initialize modals when DOM is ready
$(document).ready(function() {
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize modals only if elements exist
    const ticketModalElement = document.getElementById('ticketModal');
    const deleteModalElement = document.getElementById('deleteModal');
    
    if (ticketModalElement) {
        ticketModal = new bootstrap.Modal(ticketModalElement);
        initTripDatesPicker();
        initReturnTripDatesPicker();
    }
    if (deleteModalElement) {
        deleteModal = new bootstrap.Modal(deleteModalElement);
    }
    
    // Show add ticket modal when button is clicked
    $('[data-bs-target="#ticketModal"]').on('click', function() {
        currentTicketId = null;
        modalMode = 'add';
        $('#ticketForm')[0].reset();
        $('#logo').val('');
        $('#img').val('');
        $('#logoPreview').html('');
        $('#imgPreview').html('');
        $('#modalTitle').text('إضافة تذكرة جديدة');
        resetClassSelection();
        resetTripDatesSelection();
        resetReturnTripDatesSelection();
        setSkipReturnDates(false);
        syncSelectedAirlineLogo();
        // تأكد من تحديث الحقل المخفي tripDates بقيمة فارغة
        $('#tripDates').val('[]');
        $('#returnTripDates').val('[]');
        if (ticketModal) {
            ticketModal.show();
        }
    });

    $(document).on('change', '#arlinename', function() {
        syncSelectedAirlineLogo();
    });
});

$(document).on('change', '#skipReturnDates', function() {
    setSkipReturnDates($(this).is(':checked'));
});

$(document).on('click', '.class-selector-btn', function() {
    if (modalMode === 'edit') {
        $('.class-selector-btn').removeClass('active');
        $(this).addClass('active');
    } else {
        $(this).toggleClass('active');
    }
    updateSelectedClassesInputAndPrices();
});

// Edit ticket
$(document).on('click', '.edit-ticket', function() {
    const ticketData = $(this).data('ticket');
    currentTicketId = $(this).data('id');
    modalMode = 'edit';
    
    // Fill the form with ticket data
    Object.keys(ticketData).forEach(key => {
        if (key === 'daraga' || key === 'pricego' || key === 'priceback' || key === 'tripDates') return;
        $(`#${key}`).val(ticketData[key] ?? '');
    });

    // Ensure airline exists in select options during edit.
    if (ticketData.arlinename && !$('#arlinename option').filter(function() {
        return $(this).val() === ticketData.arlinename;
    }).length) {
        $('#arlinename').append(
            $('<option>', {
                value: ticketData.arlinename,
                text: ticketData.arlinename
            })
        );
    }
    $('#arlinename').val(ticketData.arlinename || '');
    
    // Show preview images if they exist
    renderLogoPreview(ticketData.logo);
    if (ticketData.img && ticketData.img.trim() !== '') {
        $('#imgPreview').html(`
            <div class="mt-2 p-2 border rounded" style="display: inline-block;">
                <img src="/img/${ticketData.img}" alt="صورة الوجهة" 
                     style="max-width: 250px; max-height: 200px; border-radius: 8px; display: block;">
                <small class="text-muted d-block mt-1">${ticketData.img}</small>
            </div>
        `);
    } else {
        $('#imgPreview').html('');
    }
    
    // Reset file inputs
    $('#logoUpload').val('');
    $('#imgUpload').val('');

    const editClass = ticketData.daraga || '';
    const editClassPrices = editClass
        ? {
            [editClass]: {
                pricego: ticketData.pricego || '',
                priceback: ticketData.priceback || ''
            }
        }
        : {};
    const editSelectedClasses = editClass ? [editClass] : [];
    setSelectedTravelClasses(editSelectedClasses, { classPrices: editClassPrices });
    setTripDatesInForm(ticketData.tripDates || ticketData.date || []);
    setReturnTripDatesInForm(ticketData.returnTripDates || ticketData.returnDate || []);
    setSkipReturnDates(!(normalizeTripDates(ticketData.returnTripDates || ticketData.returnDate || []).length));
    
    $('#modalTitle').text('تعديل التذكرة');
    if (ticketModal) {
        ticketModal.show();
    }
});

// Delete ticket
let ticketToDelete = null;
$(document).on('click', '.delete-ticket', function() {
    ticketToDelete = $(this).data('id');
    if (deleteModal) {
        deleteModal.show();
    }
});

$('#confirmDelete').on('click', function() {
    if (ticketToDelete !== null) {
        $.ajax({
            url: `/api/tickets/${ticketToDelete}`,
            type: 'DELETE',
            success: function(response) {
                if (response.success) {
                    showAlert('تم حذف التذكرة بنجاح', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            },
            error: function() {
                showAlert('حدث خطأ أثناء حذف التذكرة', 'danger');
            }
        });
        if (deleteModal) {
            deleteModal.hide();
        }
    }
});

// Handle form submission
$('#ticketForm').on('submit', function(e) {
    e.preventDefault();
    
    const formData = {};
    $(this).serializeArray().forEach(item => {
        formData[item.name] = item.value;
    });

    const selectedClasses = normalizeSelectedClasses(formData.selectedClasses);
    if (!selectedClasses.length) {
        showAlert('الرجاء اختيار درجة سفر واحدة على الأقل', 'warning');
        return;
    }

    const classPrices = getClassPricesFromForm();
    const emptyPriceClass = selectedClasses.find(className => {
        const classPrice = classPrices[className] || {};
        return !String(classPrice.pricego || '').trim();
    });

    if (emptyPriceClass) {
        showAlert(`الرجاء إدخال سعر الذهاب لدرجة ${emptyPriceClass}`, 'warning');
        return;
    }

    // دائماً اعتمد على التواريخ المختارة من الـ picker فقط
    const pickerTripDates = getTripDatesFromPicker();
    const selectedTripDates = normalizeTripDates(pickerTripDates);
    if (!selectedTripDates.length) {
        showAlert('الرجاء اختيار تاريخ رحلة واحد على الأقل', 'warning');
        return;
    }

    const returnPickerTripDates = getReturnTripDatesFromPicker();
    const selectedReturnTripDates = normalizeTripDates(returnPickerTripDates);
    const finalReturnTripDates = skipReturnDates ? [] : selectedReturnTripDates;

    // حدث الحقل المخفي دائماً
    $('#tripDates').val(JSON.stringify(selectedTripDates));
    $('#returnTripDates').val(JSON.stringify(finalReturnTripDates));
    formData.tripDates = selectedTripDates;
    formData.date = selectedTripDates[0];
    formData.returnTripDates = finalReturnTripDates;
    formData.returnDate = finalReturnTripDates[0] || '';

    if (currentTicketId === null) {
        // عند الإضافة فقط
        formData.selectedClasses = selectedClasses;
        formData.classPrices = classPrices;
    }

    if (currentTicketId !== null && selectedClasses[0]) {
        formData.daraga = selectedClasses[0];
        formData.pricego = classPrices[selectedClasses[0]]?.pricego || '';
        formData.priceback = classPrices[selectedClasses[0]]?.priceback || '';
    }

    const method = currentTicketId === null ? 'POST' : 'PUT';
    const url = currentTicketId === null ? '/api/tickets' : `/api/tickets/${currentTicketId}`;

    $.ajax({
        url: url,
        type: method,
        data: JSON.stringify(formData),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                showAlert('تم حفظ التذكرة بنجاح', 'success');
                if (ticketModal) {
                    ticketModal.hide();
                }
                setTimeout(() => window.location.reload(), 1000);
            }
        },
        error: function() {
            showAlert('حدث خطأ أثناء حفظ التذكرة', 'danger');
        }
    });
});

// Show alert message
function showAlert(message, type) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    $('.alerts-container').html(alertHtml);
    
    // Auto-hide alert after 5 seconds
    setTimeout(() => {
        $('.alert').alert('close');
    }, 5000);
}

// Close modal and reset form
$(document).ready(function() {
    const ticketModalElement = document.getElementById('ticketModal');
    if (ticketModalElement && ticketModal) {
        ticketModalElement.addEventListener('hidden.bs.modal', function () {
            $('#ticketForm')[0].reset();
            $('#logo').val('');
            $('#img').val('');
            $('#logoPreview').html('');
            $('#imgPreview').html('');
            currentTicketId = null;
            modalMode = 'add';
            resetClassSelection();
            resetTripDatesSelection();
            resetReturnTripDatesSelection();
        });
    }
});

// Initialize DataTables if available
$(document).ready(function() {
    if ($.fn.DataTable) {
        $('table').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Arabic.json'
            },
            responsive: true,
            order: [[0, 'desc']]
        });
    }
});

function applyTicketsSearchFilter() {
    const destinationQuery = ($('#searchDestination').val() || '').trim().toLowerCase();
    const airlineQuery = ($('#searchAirline').val() || '').trim().toLowerCase();

    $('table tbody tr').each(function() {
        const $row = $(this);
        const airlineText = ($row.find('td').eq(1).text() || '').trim().toLowerCase();
        const destinationText = ($row.find('td').eq(3).text() || '').trim().toLowerCase();
        const isDestinationMatch = !destinationQuery || destinationText.includes(destinationQuery);
        const isAirlineMatch = !airlineQuery || airlineText === airlineQuery;
        const shouldShow = isDestinationMatch && isAirlineMatch;
        $row.toggle(shouldShow);
    });

    $('.mobile-ticket-card').each(function() {
        const $card = $(this);
        const airlineText = ($card.find('.mobile-card-company').text() || '').trim().toLowerCase();
        const destinationText = ($card.find('.mobile-card-row').eq(1).text() || '').trim().toLowerCase();
        const isDestinationMatch = !destinationQuery || destinationText.includes(destinationQuery);
        const isAirlineMatch = !airlineQuery || airlineText === airlineQuery;
        const shouldShow = isDestinationMatch && isAirlineMatch;
        $card.toggle(shouldShow);
    });
}

$(document).on('input', '#searchDestination, #searchAirline', function() {
    applyTicketsSearchFilter();
});

$(document).ready(function() {
    setTimeout(() => applyTicketsSearchFilter(), 300);
});

let ticketsSearchResizeTimer = null;
$(window).on('resize', function() {
    clearTimeout(ticketsSearchResizeTimer);
    ticketsSearchResizeTimer = setTimeout(() => applyTicketsSearchFilter(), 400);
});

// Handle logo upload
$(document).on('change', '#logoUpload', function(e) {
    const file = e.target.files[0];
    if (file) {
        const $preview = $('#logoPreview');
        var formData = new FormData();
        formData.append('logo', file);
        
        $.ajax({
            url: '/api/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success && response.files.logo) {
                    $('#logo').val(response.files.logo);
                    renderLogoPreview(response.files.logo);
                    showAlert('تم رفع شعار الشركة بنجاح', 'success');
                } else {
                    showAlert('حدث خطأ أثناء رفع شعار الشركة', 'danger');
                    $preview.html('');
                }
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON?.error || 'حدث خطأ أثناء رفع شعار الشركة';
                showAlert(errorMsg, 'danger');
                $preview.html('');
            }
        });
    }
});

// Handle destination image upload
$(document).on('change', '#imgUpload', function(e) {
    const file = e.target.files[0];
    if (file) {
        // Allow any image file - no restrictions
        const $preview = $('#imgPreview');
        $preview.html('<div class="text-muted"><i class="fas fa-spinner fa-spin"></i> جاري الرفع...</div>');
        
        const formData = new FormData();
        formData.append('image', file);
        
        $.ajax({
            url: '/api/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success && response.files.image) {
                    $('#img').val(response.files.image);
                    $preview.html(`
                        <div class="mt-2 p-2 border rounded" style="display: inline-block;">
                            <img src="/img/${response.files.image}" alt="صورة الوجهة" 
                                 style="max-width: 250px; max-height: 200px; border-radius: 8px; display: block;">
                            <small class="text-muted d-block mt-1">${response.files.image}</small>
                        </div>
                    `);
                    showAlert('تم رفع صورة الوجهة بنجاح', 'success');
                } else {
                    showAlert('حدث خطأ أثناء رفع صورة الوجهة', 'danger');
                    $preview.html('');
                }
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON?.error || 'حدث خطأ أثناء رفع صورة الوجهة';
                showAlert(errorMsg, 'danger');
                $preview.html('');
            }
        });
    }
});

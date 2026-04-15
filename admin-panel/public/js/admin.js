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

// Initialize modals when DOM is ready
$(document).ready(function() {
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize modals only if elements exist
    const ticketModalElement = document.getElementById('ticketModal');
    const deleteModalElement = document.getElementById('deleteModal');
    
    if (ticketModalElement) {
        ticketModal = new bootstrap.Modal(ticketModalElement);
    }
    if (deleteModalElement) {
        deleteModal = new bootstrap.Modal(deleteModalElement);
    }
    
    // Show add ticket modal when button is clicked
    $('[data-bs-target="#ticketModal"]').on('click', function() {
        currentTicketId = null;
        $('#ticketForm')[0].reset();
        $('#logo').val('');
        $('#img').val('');
        $('#logoPreview').html('');
        $('#imgPreview').html('');
        $('#modalTitle').text('إضافة تذكرة جديدة');
        if (ticketModal) {
            ticketModal.show();
        }
    });
});

// Edit ticket
$(document).on('click', '.edit-ticket', function() {
    const ticketData = $(this).data('ticket');
    currentTicketId = $(this).data('id');
    
    // Fill the form with ticket data
    Object.keys(ticketData).forEach(key => {
        $(`#${key}`).val(ticketData[key]);
    });
    
    // Show preview images if they exist
    if (ticketData.logo && ticketData.logo.trim() !== '') {
        $('#logoPreview').html(`
            <div class="mt-2 p-2 border rounded" style="display: inline-block;">
                <img src="/logo/${ticketData.logo}" alt="شعار الشركة" 
                     style="max-width: 120px; max-height: 120px; border-radius: 8px; display: block;">
                <small class="text-muted d-block mt-1">${ticketData.logo}</small>
            </div>
        `);
    } else {
        $('#logoPreview').html('');
    }
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

// Handle logo upload
$(document).on('change', '#logoUpload', function(e) {
    const file = e.target.files[0];
    if (file) {
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
                    $preview.html(`
                        <div class="mt-2 p-2 border rounded" style="display: inline-block;">
                            <img src="/logo/${response.files.logo}" alt="شعار الشركة" 
                                 style="max-width: 120px; max-height: 120px; border-radius: 8px; display: block;">
                            <small class="text-muted d-block mt-1">${response.files.logo}</small>
                        </div>
                    `);
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

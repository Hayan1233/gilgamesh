// News form handling
var currentNewsId = null;
var newsModal = null;
var deleteNewsModal = null;

// Initialize modals when DOM is ready
$(document).ready(function() {
    // Initialize modals only if elements exist
    var newsModalElement = document.getElementById('newsModal');
    var deleteNewsModalElement = document.getElementById('deleteNewsModal');
    
    if (newsModalElement) {
        newsModal = new bootstrap.Modal(newsModalElement);
    }
    if (deleteNewsModalElement) {
        deleteNewsModal = new bootstrap.Modal(deleteNewsModalElement);
    }
    
    // Show add news modal when button is clicked
    $('[data-bs-target="#newsModal"]').on('click', function() {
        currentNewsId = null;
        $('#newsForm')[0].reset();
        $('#newsImg').val('');
        $('#newsImagePreview').html('');
        $('#newsModalTitle').text('إضافة خبر جديد');
        if (newsModal) {
            newsModal.show();
        }
    });
    
    // Close modal and reset form
    if (newsModal) {
        $(document).on('hidden.bs.modal', '#newsModal', function() {
            $('#newsForm')[0].reset();
            $('#newsImg').val('');
            $('#newsImagePreview').html('');
            currentNewsId = null;
        });
    }
});

// Edit news
$(document).on('click', '.edit-news', function() {
    var newsData = $(this).data('news');
    currentNewsId = $(this).data('id');
    
    // Fill form with news data
    $('#newsH1').val(newsData.h1 || '');
    $('#newsP').val(newsData.p || '');
    $('#newsImg').val(newsData.img || '');
    
    // Show preview image if it exists
    if (newsData.img && newsData.img.trim() !== '') {
        $('#newsImagePreview').html(
            '<div class="mt-2 p-2 border rounded" style="display: inline-block;">' +
                '<img src="/imgnews/' + newsData.img + '" alt="صورة الخبر" ' +
                     'style="max-width: 250px; max-height: 200px; border-radius: 8px; display: block;">' +
                '<small class="text-muted d-block mt-1">' + newsData.img + '</small>' +
            '</div>'
        );
    } else {
        $('#newsImagePreview').html('');
    }
    
    // Reset file input
    $('#newsImageUpload').val('');
    
    $('#newsModalTitle').text('تعديل الخبر');
    if (newsModal) {
        newsModal.show();
    }
});

// Delete news
var newsToDelete = null;
$(document).on('click', '.delete-news', function() {
    newsToDelete = $(this).data('id');
    if (deleteNewsModal) {
        deleteNewsModal.show();
    }
});

$('#confirmDeleteNews').on('click', function() {
    if (newsToDelete !== null) {
        $.ajax({
            url: '/api/news/' + newsToDelete,
            type: 'DELETE',
            success: function(response) {
                if (response.success) {
                    showNewsAlert('تم حذف الخبر بنجاح', 'success');
                    setTimeout(function() { window.location.reload(); }, 1000);
                }
            },
            error: function() {
                showNewsAlert('حدث خطأ أثناء حذف الخبر', 'danger');
            }
        });
        if (deleteNewsModal) {
            deleteNewsModal.hide();
        }
    }
});

// Handle form submission
$('#newsForm').on('submit', function(e) {
    e.preventDefault();
    
    var formData = {
        img: $('#newsImg').val() || '',
        h1: $('#newsH1').val() || '',
        p: $('#newsP').val() || ''
    };
    
    var method = currentNewsId === null ? 'POST' : 'PUT';
    var url = currentNewsId === null ? '/api/news' : '/api/news/' + currentNewsId;
    
    $.ajax({
        url: url,
        type: method,
        data: JSON.stringify(formData),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                showNewsAlert('تم حفظ الخبر بنجاح', 'success');
                if (newsModal) {
                    newsModal.hide();
                }
                setTimeout(function() { window.location.reload(); }, 1000);
            }
        },
        error: function() {
            showNewsAlert('حدث خطأ أثناء حفظ الخبر', 'danger');
        }
    });
});

// Show alert message
function showNewsAlert(message, type) {
    var alertHtml = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' +
            message +
            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
        '</div>';
    
    $('.alerts-container').html(alertHtml);
    
    // Auto-hide alert after 5 seconds
    setTimeout(function() {
        $('.alert').alert('close');
    }, 5000);
}

// Handle news image upload
$(document).on('change', '#newsImageUpload', function(e) {
    var file = e.target.files[0];
    if (file) {
        // Allow any image file - no restrictions
        var formData = new FormData();
        formData.append('newsImage', file);
        
        $.ajax({
            url: '/api/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success && response.files.newsImage) {
                    $('#newsImg').val(response.files.newsImage);
                    $preview.html(
                        '<div class="mt-2 p-2 border rounded" style="display: inline-block;">' +
                            '<img src="/imgnews/' + response.files.newsImage + '" alt="صورة الخبر" ' +
                                 'style="max-width: 250px; max-height: 200px; border-radius: 8px; display: block;">' +
                            '<small class="text-muted d-block mt-1">' + response.files.newsImage + '</small>' +
                        '</div>'
                    );
                    showNewsAlert('تم رفع صورة الخبر بنجاح', 'success');
                } else {
                    showNewsAlert('حدث خطأ أثناء رفع صورة الخبر', 'danger');
                    $preview.html('');
                }
            },
            error: function(xhr) {
                var errorMsg = xhr.responseJSON ? xhr.responseJSON.error : 'حدث خطأ أثناء رفع صورة الخبر';
                showNewsAlert(errorMsg, 'danger');
                $preview.html('');
            }
        });
    }
});


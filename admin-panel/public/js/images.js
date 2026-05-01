let deleteImageModal = null;
let imageToDelete = null;

function renderImageCard(item, type) {
    const usageText = type === 'logo'
        ? `مستخدمة في التذاكر: ${item.usedInTickets} | الشركات: ${item.usedInAirlines}`
        : `مستخدمة في التذاكر: ${item.usedInTickets}`;

    return `
        <div class="image-card">
            <div class="image-preview-wrap">
                <img src="${item.url}" alt="${item.fileName}" class="image-preview">
            </div>
            <div class="image-meta">
                <div class="image-file-name">${item.fileName}</div>
                <div class="image-usage">${usageText}</div>
            </div>
            <button class="btn btn-danger btn-sm delete-image-btn"
                    data-type="${type}"
                    data-filename="${item.fileName}">
                <i class="fas fa-trash-alt me-1"></i> حذف
            </button>
        </div>
    `;
}

function renderEmptyState(targetSelector, message) {
    $(targetSelector).html(`<div class="text-muted">${message}</div>`);
}

function loadImagesAssets() {
    $.ajax({
        url: '/api/images/assets',
        type: 'GET',
        success: function(response) {
            if (!response.success) {
                showAlert('فشل في تحميل الصور', 'danger');
                return;
            }

            const logos = Array.isArray(response.logos) ? response.logos : [];
            const destinations = Array.isArray(response.destinations) ? response.destinations : [];

            if (!logos.length) {
                renderEmptyState('#logosGrid', 'لا توجد شعارات متاحة.');
            } else {
                $('#logosGrid').html(logos.map((item) => renderImageCard(item, 'logo')).join(''));
            }

            if (!destinations.length) {
                renderEmptyState('#destinationsGrid', 'لا توجد صور وجهات متاحة.');
            } else {
                $('#destinationsGrid').html(destinations.map((item) => renderImageCard(item, 'destination')).join(''));
            }
        },
        error: function() {
            showAlert('حدث خطأ أثناء تحميل الصور', 'danger');
        }
    });
}

$(document).ready(function() {
    const deleteImageModalElement = document.getElementById('deleteImageModal');
    if (deleteImageModalElement) {
        deleteImageModal = new bootstrap.Modal(deleteImageModalElement);
    }

    loadImagesAssets();

    $('#refreshImagesBtn').on('click', function() {
        loadImagesAssets();
    });
});

$(document).on('click', '.delete-image-btn', function() {
    imageToDelete = {
        type: $(this).data('type'),
        fileName: $(this).data('filename')
    };
    $('#deleteImageName').text(imageToDelete.fileName || '');
    if (deleteImageModal) {
        deleteImageModal.show();
    }
});

$('#confirmDeleteImage').on('click', function() {
    if (!imageToDelete) return;

    $.ajax({
        url: '/api/images/assets',
        type: 'DELETE',
        data: JSON.stringify(imageToDelete),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                showAlert('تم حذف الصورة بنجاح', 'success');
                loadImagesAssets();
            } else {
                showAlert(response.error || 'تعذر حذف الصورة', 'danger');
            }
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON?.error || 'حدث خطأ أثناء حذف الصورة';
            showAlert(errorMsg, 'danger');
        },
        complete: function() {
            imageToDelete = null;
            if (deleteImageModal) {
                deleteImageModal.hide();
            }
        }
    });
});

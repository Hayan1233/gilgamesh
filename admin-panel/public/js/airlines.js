// airlines.js - إدارة شركات الطيران

document.addEventListener('DOMContentLoaded', function() {
    loadAirlines().catch(() => {
        alert('تعذر تحميل شركات الطيران. تأكد من إعادة تشغيل السيرفر.');
    });

    document.getElementById('addAirlineForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('airlineName').value;
        const logoInput = document.getElementById('airlineLogo');
        const formData = new FormData();
        formData.append('airlineName', name);
        formData.append('airlineLogo', logoInput.files[0]);
        const res = await fetch('/admin/airlines', {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            document.getElementById('addAirlineForm').reset();
            loadAirlines().catch(() => {
                alert('تعذر تحديث قائمة شركات الطيران');
            });
        } else {
            alert('حدث خطأ أثناء الإضافة');
        }
    });
});

async function loadAirlines() {
    const res = await fetch('/admin/airlines?format=json', {
        headers: { 'Accept': 'application/json' }
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('الاستجابة ليست JSON');
    }

    const data = await res.json();
    const list = document.getElementById('airlinesList');
    list.innerHTML = '';
    data.airlines.forEach(airline => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-center justify-content-between';
        li.innerHTML = `
            <span>
                <img src="/logo/${airline.logo}" alt="logo" style="width:40px;height:40px;object-fit:contain;margin-left:10px;">
                ${airline.name}
            </span>
            <button class="btn btn-danger btn-sm delete-airline" data-name="${airline.name}">حذف</button>
        `;
        li.querySelector('.delete-airline').onclick = async function() {
            if (confirm('هل أنت متأكد من حذف الشركة؟')) {
                await fetch('/admin/airlines/' + encodeURIComponent(airline.name), { method: 'DELETE' });
                loadAirlines().catch(() => {
                    alert('تعذر تحديث قائمة شركات الطيران');
                });
            }
        };
        list.appendChild(li);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const resultForm = document.getElementById('resultForm');
    const submitBtn = document.getElementById('submitBtn');

    if (resultForm) {
        resultForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form values
        const enrollment = document.getElementById('enrollment').value.trim();
        const facultyNo = document.getElementById('facultyNo').value.trim();
        const fullName = document.getElementById('fullName').value.trim();

        if (!enrollment || !facultyNo || !fullName) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const response = await fetch('/aka819', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    enrollment: enrollment,
                    faculty_no: facultyNo,
                    full_name: fullName
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();

            // Decode base64 to binary
            const binaryString = window.atob(data.content_base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Create Blob and trigger download
            const blob = new Blob([bytes], { type: data.mime_type });
            const downloadUrl = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            showToast(`Result downloaded as ${data.filename}`, 'success');

        } catch (error) {
            console.error('Error fetching result:', error);
            showToast(error.message || 'Failed to fetch result. Please try again later.', 'error');
        } finally {
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
    }

    // Global Sidebar Handlers
    const sidebarToggle = document.getElementById('global-sidebar-toggle');
    const sidebar = document.getElementById('global-sidebar');
    const overlay = document.getElementById('global-sidebar-overlay');
    const sidebarClose = document.getElementById('global-sidebar-close');

    if (sidebarToggle && sidebar && overlay) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('show');
        });

        const closeSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        };

        if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);
    }
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Add icon based on type
    const icon = type === 'success' 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 5000);
}

function copyConfig() {
    const configText = document.getElementById('config-code').innerText;
    navigator.clipboard.writeText(configText).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        btn.style.background = '#10b981';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard', 'error');
    });
}

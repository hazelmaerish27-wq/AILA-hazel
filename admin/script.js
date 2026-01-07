// ========== User Table & Pop-up Logic ========== //

// Sample: Fetch users from backend (replace with real API call)
async function fetchUsers() {
    // Replace with your backend endpoint
    // Example response structure:
    return [
        {
            id: 'user-1',
            email: 'user1@example.com',
            name: 'User One',
            created_at: '2025-12-01T10:00:00Z',
            last_sign_in_at: '2026-01-07T15:00:00Z',
            role: 'user',
            trial_end: '2026-01-15T00:00:00Z', // ISO string
        },
        {
            id: 'user-2',
            email: 'user2@example.com',
            name: 'User Two',
            created_at: '2025-12-10T12:00:00Z',
            last_sign_in_at: '2026-01-06T09:00:00Z',
            role: 'admin',
            trial_end: '2026-01-10T00:00:00Z',
        },
    ];
}

// Render the user table
function renderUserTable(users) {
    const table = document.getElementById('userTableBody');
    table.innerHTML = '';
    users.forEach((user, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.userId = user.id;
        // Use a placeholder or user avatar from metadata if available
        const avatar = user.avatar_url || user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.email || 'User');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><img src="${avatar}" alt="avatar" class="user-avatar"></td>
            <td>${user.id}</td>
            <td>${user.email}</td>
            <td>${user.name || ''}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>${formatDate(user.last_sign_in_at)}</td>
            <td>${user.role || ''}</td>
            <td><span class="trial-countdown" data-trial-end="${user.trial_end}"></span></td>
        `;
        tr.addEventListener('click', (e) => onUserRowClick(e, user, idx));
        table.appendChild(tr);
    });
}

// Format date utility
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString();
}

// Handle row click to show pop-up
let currentPopup = null;
function onUserRowClick(event, user, idx) {
    if (currentPopup) currentPopup.remove();
    const popup = document.createElement('div');
    popup.className = 'user-popup-menu-modern';
    // Use avatar and name for the header
    const avatar = user.avatar_url || user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.email || 'User');
    const displayName = user.name || user.user_metadata?.full_name || user.email.split('@')[0];
    popup.innerHTML = `
        <div class="popup-header">
            <img src="${avatar}" alt="avatar" class="popup-avatar">
            <div class="popup-user-info">
                <div class="popup-user-name">${displayName}</div>
                <div class="popup-user-email">${user.email}</div>
            </div>
        </div>
        <div class="popup-actions">
            <button class="popup-action-btn" onclick="banUser('${user.id}')">🚫 Ban</button>
            <button class="popup-action-btn" onclick="setTrialDate('${user.id}')">⏳ Set Trial Days</button>
            <button class="popup-action-btn" onclick="loginAsUser('${user.id}')">🔑 Login as</button>
            <button class="popup-action-btn" onclick="sendRecoveryLink('${user.id}')">🔄 Send Recovery Link</button>
            <button class="popup-action-btn" onclick="sendGmail('${user.id}')">📧 Send Gmail</button>
        </div>
    `;
    document.body.appendChild(popup);
    // Position pop-up near the row (use mouse event)
    const rect = event.target.getBoundingClientRect();
    popup.style.position = 'absolute';
    popup.style.left = `${event.clientX + 10}px`;
    popup.style.top = `${event.clientY + 10}px`;
    popup.style.zIndex = 1000;
    function closePopup(e) {
        if (!popup.contains(e.target)) {
            popup.remove();
            document.removeEventListener('mousedown', closePopup);
            currentPopup = null;
        }
    }
    document.addEventListener('mousedown', closePopup);
    currentPopup = popup;
}

// Modern action handlers (replace with real logic)
function banUser(userId) { alert('Ban user: ' + userId); if (currentPopup) currentPopup.remove(); }
function setTrialDate(userId) { alert('Set trial date for: ' + userId); if (currentPopup) currentPopup.remove(); }
function loginAsUser(userId) { alert('Login as: ' + userId); if (currentPopup) currentPopup.remove(); }
function sendRecoveryLink(userId) { alert('Send recovery link to: ' + userId); if (currentPopup) currentPopup.remove(); }
function sendGmail(userId) { alert('Send Gmail to: ' + userId); if (currentPopup) currentPopup.remove(); }

// Dummy action handlers
function banUser(userId) {
    alert('Ban user: ' + userId);
    if (currentPopup) currentPopup.remove();
}
function setTrialDate(userId) {
    alert('Set trial date for: ' + userId);
    if (currentPopup) currentPopup.remove();
}

// Real-time trial countdown
function updateTrialCountdowns() {
    const now = new Date();
    document.querySelectorAll('.trial-countdown').forEach(span => {
        const end = new Date(span.dataset.trialEnd);
        const diff = end - now;
        if (isNaN(end.getTime())) {
            span.textContent = 'N/A';
        } else if (diff <= 0) {
            span.textContent = 'Expired';
            span.classList.add('expired');
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const mins = Math.floor((diff / (1000 * 60)) % 60);
            const secs = Math.floor((diff / 1000) % 60);
            span.textContent = `${days}d ${hours}h ${mins}m ${secs}s`;
            span.classList.remove('expired');
        }
    });
}
setInterval(updateTrialCountdowns, 1000);

// On page load, fetch and render users
window.addEventListener('DOMContentLoaded', async () => {
    const users = await fetchUsers();
    renderUserTable(users);
    updateTrialCountdowns();
});

// ========== End User Table & Pop-up Logic ========== //
const SUPABASE_URL = "https://woqlvcgryahmcejdlcqz.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcWx2Y2dyeWFobWNlamRsY3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDg5NTMsImV4cCI6MjA4MDMyNDk1M30.PXL0hJ-8Hv7BP21Fly3tHXonJoxfVL0GNCY7oWXDKRA";

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- START: Security Check ---
const DEVELOPER_EMAILS = ["narvasajoshua61@gmail.com", "levercrafter@gmail.com"];

let allUsers = []; // Store all users for filtering/sorting
let currentSort = { field: 'created', direction: 'desc' };
let selectedUserEmail = null;

_supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN") {
        if (!session || !DEVELOPER_EMAILS.includes(session.user.email)) {
            window.location.replace("../index.html");
        } else {
            await loadAllUsers();
            startGlobalTrialTimer();
        }
    } else if (event === "SIGNED_OUT") {
        window.location.replace("../index.html");
    }
});
// --- END: Security Check ---

async function loadAllUsers() {
    const loadingMessage = document.getElementById('loading-message');
    const userTableContainer = document.getElementById('user-table-container');

    try {
        const { data, error } = await _supabase.functions.invoke('get-all-users');

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        allUsers = data.users.map(user => {
            const trialDays = user.user_metadata.custom_trial_days !== undefined ? user.user_metadata.custom_trial_days : 30;
            const trialEndDate = new Date(new Date(user.created_at).setDate(new Date(user.created_at).getDate() + trialDays));
            const isExpired = new Date() > trialEndDate;
            
            return {
                ...user,
                trialDays,
                trialEndDate,
                isExpired,
                displayName: user.user_metadata.full_name || 'N/A'
            };
        });

        renderTable();
        loadingMessage.classList.add('hidden');
        userTableContainer.classList.remove('hidden');
        attachEventListeners();

    } catch (error) {
        loadingMessage.textContent = `Error loading users: ${error.message}`;
        console.error(error);
    }
}

function renderTable() {
    const userTableBody = document.querySelector('#user-table tbody');
    userTableBody.innerHTML = '';

    // Filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    let filteredUsers = allUsers.filter(user => {
        const matchesSearch = user.email.toLowerCase().includes(searchTerm) || 
                              user.displayName.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || 
                              (statusFilter === 'active' && !user.isExpired) || 
                              (statusFilter === 'expired' && user.isExpired);
        return matchesSearch && matchesStatus;
    });

    // Sort
    filteredUsers.sort((a, b) => {
        let valA, valB;
        switch(currentSort.field) {
            case 'email': valA = a.email; valB = b.email; break;
            case 'name': valA = a.displayName; valB = b.displayName; break;
            case 'created': valA = new Date(a.created_at); valB = new Date(b.created_at); break;
            case 'status': valA = a.isExpired; valB = b.isExpired; break;
            default: valA = new Date(a.created_at); valB = new Date(b.created_at);
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.email}</td>
            <td>${user.displayName}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td class="${user.isExpired ? 'expired' : 'active'}">
                ${user.isExpired ? 'Expired' : 'Active'} (${user.trialDays} days)
            </td>
            <td>
                <button class="action-btn options-btn" data-email="${user.email}">Options</button>
            </td>
        `;
        userTableBody.appendChild(row);
    });

    // Re-attach listeners for the new buttons
    document.querySelectorAll('.options-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedUserEmail = e.target.dataset.email;
            openOptionsModal(selectedUserEmail);
        });
    });
}

function attachEventListeners() {
    // Search & Filter
    document.getElementById('searchInput').addEventListener('input', renderTable);
    document.getElementById('statusFilter').addEventListener('change', renderTable);

    // Sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (currentSort.field === field) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.direction = 'asc';
            }
            renderTable();
        });
    });

    // Modal Close Buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(btn.dataset.modal).classList.add('hidden');
        });
    });

    // Options Modal Buttons
    document.getElementById('optSetTrial').addEventListener('click', () => {
        document.getElementById('optionsModal').classList.add('hidden');
        document.getElementById('modalUserEmail').textContent = selectedUserEmail;
        document.getElementById('trialModal').classList.remove('hidden');
    });

    document.getElementById('optLoginAs').addEventListener('click', async () => {
        if (confirm(`Login as ${selectedUserEmail}?`)) {
            await adminLoginAsUser(selectedUserEmail);
        }
    });

    document.getElementById('optBanUser').addEventListener('click', () => {
        alert('Ban functionality coming soon!');
    });

    document.getElementById('optResetPwd').addEventListener('click', async () => {
        if (confirm(`Send password reset email to ${selectedUserEmail}?`)) {
            const { error } = await _supabase.auth.resetPasswordForEmail(selectedUserEmail);
            if (error) alert('Error: ' + error.message);
            else alert('Password reset email sent.');
        }
    });

    document.getElementById('optSendEmail').addEventListener('click', () => {
        window.location.href = `mailto:${selectedUserEmail}`;
    });

    // Set Trial Form
    document.getElementById('setTrialForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const days = parseInt(document.getElementById('trialDaysInput').value, 10);
        if (!isNaN(days)) {
            await adminSetTrialDays(selectedUserEmail, days);
            document.getElementById('trialModal').classList.add('hidden');
            loadAllUsers(); // Refresh data
        }
    });
}

function openOptionsModal(email) {
    document.getElementById('optionsUserEmail').textContent = email;
    document.getElementById('optionsModal').classList.remove('hidden');
}

function startGlobalTrialTimer() {
    const timerEl = document.getElementById('trial-timer');
    
    setInterval(() => {
        // Just showing a simple running clock or aggregate stat for now
        // as "remaining time left for all users" is ambiguous.
        // Let's show the count of active users vs total.
        if (allUsers.length > 0) {
            const activeCount = allUsers.filter(u => !u.isExpired).length;
            timerEl.textContent = `${activeCount} Active / ${allUsers.length} Total Users`;
        }
    }, 1000);
}

// --- Admin Actions ---

async function adminSetTrialDays(targetEmail, days) {
  try {
    const { data, error } = await _supabase.functions.invoke("set-trial-days", {
      body: { targetEmail, days },
    });
    if (error) throw error;
    if (data.error) {
      alert(`Error: ${data.error}`);
    } else {
      alert(`Success: ${data.message}`);
    }
  } catch (error) {
    console.error("Invocation failed:", error);
    alert("Failed to update trial days.");
  }
}

async function adminLoginAsUser(targetEmail) {
  try {
    const { data, error } = await _supabase.functions.invoke("impersonate-user", {
        body: { targetEmail },
      }
    );
    if (error) throw error;
    if (data.error) {
      alert(`Error: ${data.error}`);
    } else {
      window.open(data.magicLink, '_blank');
    }
  } catch (error) {
    console.error("Invocation failed:", error);
    alert("Failed to generate login link.");
  }
}

// Initial check
(async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session || !DEVELOPER_EMAILS.includes(session.user.email)) {
        window.location.replace("../index.html");
    } else {
        await loadAllUsers();
        startGlobalTrialTimer();
    }
})();

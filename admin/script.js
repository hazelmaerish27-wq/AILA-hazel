// ========== Supabase Configuration ========== //
const SUPABASE_URL = "https://woqlvcgryahmcejdlcqz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcWx2Y2dyeWFobWNlamRsY3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDg5NTMsImV4cCI6MjA4MDMyNDk1M30.PXL0hJ-8Hv7BP21Fly3tHXonJoxfVL0GNCY7oWXDKRA";
const DEVELOPER_EMAILS = ["narvasajoshua61@gmail.com", "levercrafter@gmail.com"];

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== User Table & Pop-up Logic ========== //

// Fetch users from Supabase backend
// Pagination state
let currentPage = 1;
let currentSearch = '';
let totalPages = 1;
let currentSortColumn = 'uid';
let currentSortDirection = 'asc';

async function fetchUsers(page = 1, search = '') {
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session || !session.access_token) {
      throw new Error('No active session. Please log in first.');
    }
    
    // Build query string
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', '30');
    if (search) {
      params.append('search', search);
    }
    
    // Make direct fetch request to the edge function with query params
    const url = `${SUPABASE_URL}/functions/v1/get-users?${params.toString()}`;
    console.log('Fetching:', url);
    console.log('Auth token present:', !!session.access_token);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.error) throw new Error(data.error);
    
    // Store pagination info
    currentPage = data.page || 1;
    totalPages = data.totalPages || 1;
    
    // Map API response to table format
    return (data.users || []).map(user => {
      const trialDays = user.user_metadata?.custom_trial_days || 30;
      
      // Safely parse created_at date
      let createdDate = new Date();
      if (user.created_at) {
        try {
          const parsed = new Date(user.created_at);
          if (!isNaN(parsed.getTime())) {
            createdDate = parsed;
          }
        } catch (e) {
          console.warn('Invalid date for user', user.id, user.created_at);
        }
      }
      
      // Calculate trial end date
      let trialEndDate = new Date();
      try {
        trialEndDate = new Date(createdDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
        if (isNaN(trialEndDate.getTime())) {
          trialEndDate = new Date();
        }
      } catch (e) {
        console.warn('Error calculating trial end date for user', user.id);
        trialEndDate = new Date();
      }
      
      return {
        id: user.id,
        email: user.email,
        name: user.name || user.user_metadata?.full_name || 'N/A',
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: user.last_sign_in_at || null,
        role: user.role || 'user',
        trial_end: trialEndDate.toISOString(),
        trial_days: trialDays,
        avatar_url: user.avatar_url,
        user_metadata: user.user_metadata || {}
      };
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    alert('Failed to load users: ' + error.message);
    return [];
  }
}

// Render the user table
function renderUserTable(users) {
    const table = document.getElementById('userTableBody');
    const totalCount = document.getElementById('totalUsersCount');
    table.innerHTML = '';
    totalCount.textContent = users.length > 0 ? `${users.length} of ${totalPages > 1 ? (currentPage - 1) * 30 + users.length + (totalPages - currentPage) * 30 : users.length}` : '0';
    
    // Update pagination UI
    document.getElementById('currentPageNum').textContent = currentPage;
    document.getElementById('totalPageNum').textContent = totalPages;
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    
    users.forEach((user, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.userId = user.id;
        tr.dataset.userEmail = user.email;
        const avatar = user.avatar_url || user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.email || 'User');
        const createdDate = formatDate(user.created_at);
        const lastSignInDate = formatDate(user.last_sign_in_at);
        
        tr.innerHTML = `
            <td class="avatar-col" data-column="avatar"><img src="${avatar}" alt="avatar" class="user-avatar"></td>
            <td class="uid-text" data-column="uid">${user.id}</td>
            <td data-column="name">${user.name || '-'}</td>
            <td data-column="email">${user.email}</td>
            <td data-column="phone">-</td>
            <td data-column="providers">Google</td>
            <td data-column="provider_type">Social</td>
            <td data-column="trial"><span class="trial-countdown" data-trial-end="${user.trial_end}"></span></td>
            <td data-column="created_at" style="display:none;">${createdDate}</td>
            <td data-column="last_signin" style="display:none;">${lastSignInDate}</td>
        `;
        tr.addEventListener('click', (e) => {
            onUserRowClick(e, user, idx);
        });
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

// ========== Action Handlers ========== //

// Ban a user
async function banUser(userId) {
  if (!confirm('Are you sure you want to ban this user?')) return;
  
  try {
    const { data, error } = await _supabase.functions.invoke('ban-user', {
      body: { userId }
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    
    alert('User banned successfully');
    if (currentPopup) currentPopup.remove();
    await loadUsersAndRefresh();
  } catch (error) {
    console.error('Error banning user:', error);
    alert('Failed to ban user: ' + error.message);
  }
}

// Set trial days for a user
async function setTrialDate(userId) {
  const days = prompt('Enter number of trial days:', '30');
  if (days === null) return;
  
  const daysNum = parseInt(days, 10);
  if (isNaN(daysNum) || daysNum < 0) {
    alert('Please enter a valid number');
    return;
  }
  
  try {
    // Get user email from the DOM row
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    const userEmail = row?.dataset.userEmail;
    if (!userEmail) {
      alert('User email not found');
      return;
    }
    
    const { data, error } = await _supabase.functions.invoke('set-trial-days', {
      body: { targetEmail: userEmail, days: daysNum }
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    
    alert(`Trial days set to ${daysNum} successfully`);
    if (currentPopup) currentPopup.remove();
    await loadUsersAndRefresh();
  } catch (error) {
    console.error('Error setting trial days:', error);
    alert('Failed to set trial days: ' + error.message);
  }
}

// Login as a user (impersonate)
async function loginAsUser(userId) {
  if (!confirm('Generate a magic login link for this user?')) return;
  
  try {
    // Get user email from the DOM row
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    const userEmail = row?.dataset.userEmail;
    if (!userEmail) {
      alert('User email not found');
      return;
    }
    
    const { data, error } = await _supabase.functions.invoke('impersonate-user', {
      body: { targetEmail: userEmail }
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    
    if (data.magicLink) {
      window.open(data.magicLink, '_blank');
      alert('Magic link opened in a new tab');
    } else {
      throw new Error('No magic link returned');
    }
    if (currentPopup) currentPopup.remove();
  } catch (error) {
    console.error('Error generating login link:', error);
    alert('Failed to generate login link: ' + error.message);
  }
}

// Send recovery/reset password link
async function sendRecoveryLink(userId) {
  if (!confirm('Send password recovery email to this user?')) return;
  
  try {
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    const userEmail = row?.dataset.userEmail;
    if (!userEmail) throw new Error('User email not found');
    
    const { error } = await _supabase.auth.resetPasswordForEmail(userEmail);
    if (error) throw error;
    
    alert('Recovery email sent successfully');
    if (currentPopup) currentPopup.remove();
  } catch (error) {
    console.error('Error sending recovery link:', error);
    alert('Failed to send recovery link: ' + error.message);
  }
}

// Send Gmail to user
async function sendGmail(userId) {
  const row = document.querySelector(`tr[data-user-id="${userId}"]`);
  const userEmail = row?.dataset.userEmail;
  if (!userEmail) {
    alert('User email not found');
    return;
  }
  
  // Open Gmail compose with the user's email
  const gmailUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${encodeURIComponent(userEmail)}`;
  window.open(gmailUrl, '_blank');
  if (currentPopup) currentPopup.remove();
}

// Helper: Get user email by ID
function getUserEmailById(userId) {
  const user = allUsers.find(u => u.id === userId);
  return user ? user.email : null;
}

// Helper: Reload users and refresh table
async function loadUsersAndRefresh() {
  const users = await fetchUsers();
  renderUserTable(users);
  updateTrialCountdowns();
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
let allUsers = [];

window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await _supabase.auth.getSession();
  
  // Security check
  if (!session || !DEVELOPER_EMAILS.includes(session.user.email)) {
    window.location.replace('../index.html');
    return;
  }
  
  allUsers = await fetchUsers();
  console.log('Loaded users:', allUsers);
  renderUserTable(allUsers);
  updateTrialCountdowns();
  setupSearchListener();
  loadColumnPreferences();
  
  // Setup column selection button
  const columnsBtn = document.getElementById('columnsBtn');
  if (columnsBtn) {
    columnsBtn.addEventListener('click', openColumnsDropdown);
  }
});

// Setup search functionality
function setupSearchListener() {
  const searchInput = document.getElementById('searchInput');
  const searchFilterDropdown = document.getElementById('searchFilterDropdown');
  
  if (searchInput) {
    searchInput.addEventListener('input', performSearch);
  }
  
  if (searchFilterDropdown) {
    searchFilterDropdown.addEventListener('change', () => {
      // Update placeholder based on selected filter
      const selected = searchFilterDropdown.value;
      const placeholders = {
        'email': 'Search by email',
        'uid': 'Search by user ID',
        'name': 'Search by name',
        'phone': 'Search by phone'
      };
      searchInput.placeholder = placeholders[selected] || 'Search...';
      performSearch();
    });
  }
}

async function performSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput.value.toLowerCase();
  
  // Store current search term
  currentSearch = searchTerm;
  currentPage = 1; // Reset to page 1 when searching
  
  // Fetch users with search and page 1
  const users = await fetchUsers(1, searchTerm);
  renderUserTable(users);
  updateTrialCountdowns();
  updatePaginationInfo();
}

// Column visibility management
function openColumnsDropdown() {
  document.getElementById('columnsDropdown').classList.toggle('hidden');
}

function closeColumnsDropdown() {
  document.getElementById('columnsDropdown').classList.add('hidden');
}

// Pagination functions
async function goToPage(pageNum) {
  const users = await fetchUsers(pageNum, currentSearch);
  renderUserTable(users);
  updateTrialCountdowns();
  updatePaginationInfo();
  // Scroll to top
  document.querySelector('.user-table-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}

async function nextPage() {
  if (currentPage < totalPages) {
    goToPage(currentPage + 1);
  }
}

async function prevPage() {
  if (currentPage > 1) {
    goToPage(currentPage - 1);
  }
}

function updatePaginationInfo() {
  // Update pagination display if you add pagination UI
  console.log(`Page ${currentPage} of ${totalPages}`);
}

function saveColumnsAndClose() {
  const checkboxes = document.querySelectorAll('#columnsDropdown .column-checkbox input');
  const visibleColumns = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.dataset.column);
  
  // Save to localStorage
  localStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
  
  // Update table visibility
  updateTableColumnVisibility(visibleColumns);
  closeColumnsDropdown();
}

function saveColumns() {
  saveColumnsAndClose();
}

function resetColumns() {
  const defaultColumns = ['uid', 'name', 'email', 'phone', 'providers', 'provider_type', 'created_at', 'last_signin'];
  const checkboxes = document.querySelectorAll('#columnsDropdown .column-checkbox input');
  checkboxes.forEach(cb => {
    cb.checked = defaultColumns.includes(cb.dataset.column);
  });
  
  // Clear localStorage
  localStorage.removeItem('visibleColumns');
  
  // Update table visibility immediately
  updateTableColumnVisibility(defaultColumns);
}

function updateTableColumnVisibility(visibleColumns) {
  // Only affect table cells, not dropdown elements
  const table = document.getElementById('userTableBody');
  const tableHead = document.querySelector('table thead');
  if (!table) return;
  
  // Always show avatar and trial columns, hide others
  table.querySelectorAll('[data-column]').forEach(el => {
    const col = el.getAttribute('data-column');
    if (col === 'avatar' || col === 'trial') {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
  
  // Hide/show headers as well
  if (tableHead) {
    tableHead.querySelectorAll('[data-column]').forEach(el => {
      const col = el.getAttribute('data-column');
      if (col === 'avatar' || col === 'trial') {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  }
  
  // Show selected columns
  visibleColumns.forEach(col => {
    table.querySelectorAll(`[data-column="${col}"]`).forEach(el => {
      el.style.display = '';
    });
    if (tableHead) {
      tableHead.querySelectorAll(`[data-column="${col}"]`).forEach(el => {
        el.style.display = '';
      });
    }
  });
}

function loadColumnPreferences() {
  const saved = localStorage.getItem('visibleColumns');
  if (saved) {
    const visibleColumns = JSON.parse(saved);
    updateTableColumnVisibility(visibleColumns);
    
    // Update checkboxes
    const checkboxes = document.querySelectorAll('#columnsDropdown .column-checkbox input');
    checkboxes.forEach(cb => {
      cb.checked = visibleColumns.includes(cb.dataset.column);
    });
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('columnsDropdown');
  const columnsWrapper = document.querySelector('.columns-dropdown-wrapper');
  
  if (dropdown && columnsWrapper && !columnsWrapper.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});


// ========== End User Table & Pop-up Logic ========== //

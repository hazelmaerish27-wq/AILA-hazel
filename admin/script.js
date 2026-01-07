const SUPABASE_URL = "https://woqlvcgryahmcejdlcqz.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcWx2Y2dyeWFobWNlamRsY3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDg5NTMsImV4cCI6MjA4MDMyNDk1M30.PXL0hJ-8Hv7BP21Fly3tHXonJoxfVL0GNCY7oWXDKRA";

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- START: Security Check ---
// This is the list of authorized developers who can see this page.
const DEVELOPER_EMAILS = ["narvasajoshua61@gmail.com", "levercrafter@gmail.com"];

_supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN") {
        if (!session || !DEVELOPER_EMAILS.includes(session.user.email)) {
            // If not a developer, redirect them away immediately.
            window.location.replace("../index.html");
        } else {
            // If they are a developer, load the user data.
            await loadAllUsers();
        }
    } else if (event === "SIGNED_OUT") {
        window.location.replace("../index.html");
    }
});
// --- END: Security Check ---

async function loadAllUsers() {
    const loadingMessage = document.getElementById('loading-message');
    const userTableContainer = document.getElementById('user-table-container');
    const userTableBody = document.querySelector('#user-table tbody');

    try {
        const { data, error } = await _supabase.functions.invoke('get-all-users');

        if (error) throw error;

        if (data.error) throw new Error(data.error);

        userTableBody.innerHTML = ''; // Clear existing rows

        data.users.forEach(user => {
            const trialDays = user.user_metadata.custom_trial_days !== undefined ? user.user_metadata.custom_trial_days : 30;
            const trialEndDate = new Date(new Date(user.created_at).setDate(new Date(user.created_at).getDate() + trialDays));
            const isExpired = new Date() > trialEndDate;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.email}</td>
                <td>${user.user_metadata.full_name || 'N/A'}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td class="${isExpired ? 'expired' : 'active'}">${isExpired ? 'Expired' : 'Active'} (${trialDays} days)</td>
                <td>
                    <button class="action-btn set-trial-btn" data-email="${user.email}">Set Trial</button>
                    <button class="action-btn login-as-btn" data-email="${user.email}">Login As</button>
                </td>
            `;
            userTableBody.appendChild(row);
        });

        loadingMessage.classList.add('hidden');
        userTableContainer.classList.remove('hidden');
        attachActionListeners();

    } catch (error) {
        loadingMessage.textContent = `Error loading users: ${error.message}`;
        console.error(error);
    }
}

function attachActionListeners() {
    const trialModal = document.getElementById('trialModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const setTrialForm = document.getElementById('setTrialForm');
    const modalUserEmail = document.getElementById('modalUserEmail');
    const trialDaysInput = document.getElementById('trialDaysInput');

    document.querySelectorAll('.set-trial-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const email = e.target.dataset.email;
            modalUserEmail.textContent = email;
            trialModal.classList.remove('hidden');
        });
    });

    document.querySelectorAll('.login-as-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const email = e.target.dataset.email;
            if (confirm(`Are you sure you want to log in as ${email}?`)) {
                await adminLoginAsUser(email);
            }
        });
    });
    
    modalCloseBtn.addEventListener('click', () => trialModal.classList.add('hidden'));
    
    setTrialForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = modalUserEmail.textContent;
        const days = parseInt(trialDaysInput.value, 10);

        if (!isNaN(days)) {
            await adminSetTrialDays(email, days);
            alert('Trial days updated successfully. The user table will now refresh.');
            trialModal.classList.add('hidden');
            loadAllUsers(); // Refresh table
        } else {
            alert('Please enter a valid number of days.');
        }
    });
}

async function adminSetTrialDays(targetEmail, days) {
  if (!targetEmail || typeof days !== "number") {
    console.error("ADMIN: 🛑 USAGE ERROR: Please provide a target email and the number of days.");
    return;
  }
  console.log(`ADMIN: ⏳ Invoking secure function to set trial for ${targetEmail} to ${days} days...`);
  try {
    const { data, error } = await _supabase.functions.invoke("set-trial-days", {
      body: { targetEmail, days },
    });
    if (error) throw error;
    if (data.error) {
      console.error(`ADMIN: ❌ FUNCTION FAILED: ${data.error}`);
    } else {
      console.log(`ADMIN: ✅ SUCCESS: ${data.message}`);
    }
  } catch (error) {
    console.error("ADMIN: ❌ INVOCATION FAILED: The server returned an error.", error);
  }
}

async function adminLoginAsUser(targetEmail) {
  if (!targetEmail) {
    console.error("ADMIN: 🛑 USAGE ERROR: Please provide the user's email.");
    return;
  }
  console.log(`ADMIN: ⏳ Generating secure login link for ${targetEmail}...`);
  try {
    const { data, error } = await _supabase.functions.invoke("impersonate-user", {
        body: { targetEmail },
      }
    );
    if (error) throw error;
    if (data.error) {
      console.error(`ADMIN: ❌ FUNCTION FAILED: ${data.error}`);
    } else {
      console.log("ADMIN:✅ SUCCESS! Opening login link...");
      window.open(data.magicLink, '_blank');
    }
  } catch (error) {
    console.error("ADMIN: ❌ INVOCATION FAILED: The server returned an error.", error);
  }
}

// Initial check in case the user is already signed in when the page loads
(async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session || !DEVELOPER_EMAILS.includes(session.user.email)) {
        window.location.replace("../index.html");
    } else {
        await loadAllUsers();
    }
})();

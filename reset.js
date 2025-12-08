// --- Supabase Client Initialization ---
const SUPABASE_URL = 'https://woqlvcgryahmcejdlcqz.supabase.co';
// THIS IS THE CORRECTED API KEY
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcWx2Y2dyeWFobWNlamRsY3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDg5NTMsImV4cCI6MjA4MDMyNDk1M30.PXL0hJ-8Hv7BP21Fly3tHXonJoxfVL0GNCY7oWXDKRA';
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- Get DOM Elements ---
const resetPinForm = document.getElementById('resetPinForm');
const updatePinBtn = document.getElementById('updatePinBtn');
const btnText = updatePinBtn.querySelector('.btn-text');
const pinContainer = document.getElementById('pinContainer');
const pinConfirmContainer = document.getElementById('pinConfirmContainer');
const alertBox = document.getElementById('customAlert');

// --- Helper Functions ---
function setupPinInputs(container) {
    const inputs = container.querySelectorAll('.pin-digit');
    inputs.forEach((input, index) => {
        input.addEventListener('keyup', (e) => {
            if (input.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });
}

function showAlert(message, isSuccess = false) {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
    alertBox.classList.toggle('success', isSuccess);
    alertBox.classList.toggle('error', !isSuccess);
}

function setButtonLoading(isLoading, text = "Update PIN") {
    updatePinBtn.classList.toggle('loading', isLoading);
    updatePinBtn.disabled = isLoading;
    btnText.textContent = text;
}

// --- Main Authentication Logic ---

// 1. Initially disable the form and show a "verifying" state
setButtonLoading(true, "Verifying...");
showAlert("Verifying your request...", "success");

_supabase.auth.onAuthStateChange(async (event, session) => {
    // 2. This event fires when the session is confirmed
    if (event === "PASSWORD_RECOVERY") {
        // 3. Green light! Enable the form and set the button to its normal state.
        setButtonLoading(false, "Update PIN");
        alertBox.classList.add('hidden'); // Hide the "Verifying..." message

        // 4. NOW it's safe to attach the submit listener
        resetPinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setButtonLoading(true, "Updating...");
            alertBox.classList.add('hidden');

            const newPin = Array.from(pinContainer.querySelectorAll('.pin-digit')).map(input => input.value).join('');
            const confirmPin = Array.from(pinConfirmContainer.querySelectorAll('.pin-digit')).map(input => input.value).join('');

            if (newPin.length !== 6 || confirmPin.length !== 6) {
                showAlert('Please enter a complete 6-digit PIN and confirmation.');
                setButtonLoading(false, "Update PIN");
                return;
            }

            if (newPin !== confirmPin) {
                showAlert('The PINs do not match. Please try again.');
                setButtonLoading(false, "Update PIN");
                return;
            }

            const {
                data,
                error
            } = await _supabase.auth.updateUser({
                password: newPin
            });

            if (error) {
                showAlert(`Error: ${error.message || 'An unknown error occurred.'}`);
                setButtonLoading(false, "Update PIN");
            } else {
                showAlert('Your PIN has been successfully updated! Redirecting to login...', true);
                setButtonLoading(true, "Success!");
                resetPinForm.style.display = 'none';
                setTimeout(() => {
                    window.location.href = window.location.origin;
                }, 3000);
            }
        });
    } else {
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        if (urlParams.has('error')) {
            setButtonLoading(true, "Error");
            showAlert(`Error: ${urlParams.get('error_description').replace(/\+/g, ' ')}`);
        }
    }
});


// --- Initial Page Setup ---
setupPinInputs(pinContainer);
setupPinInputs(pinConfirmContainer);
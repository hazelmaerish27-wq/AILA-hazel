const SUPABASE_URL = 'https://woqlvcgryahmcejdlcqz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcWx2Y2dyeWFobWNlamRsY3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTU2NTE1ODUsImV4cCI6MjAxMTIyNzU4NX0.s17pBCeS3Qca9C4l1mCV2O91Z2-q6a-KSM_p3B3d5lI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const resetPinForm = document.getElementById('resetPinForm');
const updatePinBtn = document.getElementById('updatePinBtn');
const pinContainer = document.getElementById('pinContainer');
const pinConfirmContainer = document.getElementById('pinConfirmContainer');
const alertBox = document.getElementById('customAlert');

// Function to handle PIN input and auto-tabbing
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

// Function to show/hide alerts
function showAlert(message, isSuccess = false) {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
    alertBox.classList.toggle('success', isSuccess);
    alertBox.classList.toggle('error', !isSuccess);
}

// Function to set button loading state
function setButtonLoading(isLoading) {
    updatePinBtn.classList.toggle('loading', isLoading);
    updatePinBtn.disabled = isLoading;
}

resetPinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setButtonLoading(true);
    alertBox.classList.add('hidden');

    const pinDigits = Array.from(pinContainer.querySelectorAll('.pin-digit')).map(input => input.value);
    const pinConfirmDigits = Array.from(pinConfirmContainer.querySelectorAll('.pin-digit')).map(input => input.value);

    const newPin = pinDigits.join('');
    const confirmPin = pinConfirmDigits.join('');

    if (newPin.length !== 6 || confirmPin.length !== 6) {
        showAlert('Please enter a complete 6-digit PIN and confirmation.');
        setButtonLoading(false);
        return;
    }

    if (newPin !== confirmPin) {
        showAlert('The PINs do not match. Please try again.');
        setButtonLoading(false);
        return;
    }

    // Supabase password update requires the user to be logged in.
    // The user gets here via a password recovery link which logs them in for one session.
    const { data, error } = await supabase.auth.updateUser({
        password: newPin
    });

    if (error) {
        showAlert(`Error: ${error.message}`);
    } else {
        showAlert('Your PIN has been successfully updated! Redirecting to login...', true);
        setTimeout(() => {
            window.location.href = 'index.html'; // Redirect to the main login page
        }, 3000);
    }

    setButtonLoading(false);
});

// Initialize PIN inputs
setupPinInputs(pinContainer);
setupPinInputs(pinConfirmContainer);

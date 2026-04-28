/**
 * Sign In Page Controller
 */
lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signin-form');
    if (form) {
        // handleLogin is defined in auth.js and is global
        form.onsubmit = async (e) => {
            // Check if handleLogin exists, fallback to simple alert if not
            if (typeof handleLogin === 'function') {
                await handleLogin(e);
            } else {
                console.error('Auth handler missing');
                e.preventDefault();
            }
        };
    }
});

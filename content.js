function detectUserLogin() {
    // Look for the user info in the Codeforces header
    const userElement = document.querySelector('a[href^="/profile/"]');

    if (userElement) {
        // User is logged in
        const handle = userElement.textContent.trim();
        console.log('Detected logged in user:', handle);

        // Send handle to background script
        chrome.runtime.sendMessage({
            type: 'USER_LOGIN_DETECTED',
            handle: handle
        });
    }
}

// Initial check when content script loads
detectUserLogin();

// Watch for DOM changes that might indicate login/logout
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            detectUserLogin();
        }
    }
});

// Start observing the header area
const headerArea = document.querySelector('div.header');
if (headerArea) {
    observer.observe(headerArea, {
        childList: true,
        subtree: true
    });
}
function injectRandomProblemButton() {
    const navbar = document.querySelector('.nav-links');
    if (!navbar) return;

    const buttonContainer = document.createElement('li');
    buttonContainer.innerHTML = `
      <a href="#" class="random-problem-button">
        Random Problem
      </a>
    `;

    const button = buttonContainer.querySelector('a');
    button.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_SUGGESTIONS',
                count: 1
            });

            if (response.success && response.suggestions.length > 0) {
                const problem = response.suggestions[0];
                window.location.href =
                    `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
            }
        } catch (error) {
            console.error('Failed to get random problem:', error);
        }
    });

    navbar.appendChild(buttonContainer);
}

// Inject the button when the page loads
injectRandomProblemButton();
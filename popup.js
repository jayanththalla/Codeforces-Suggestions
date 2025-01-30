document.addEventListener('DOMContentLoaded', async () => {
    const loginSection = document.getElementById('loginSection');
    const profileSection = document.getElementById('profileSection');
    const handleInput = document.getElementById('handleInput');
    const loginButton = document.getElementById('loginButton');
    const refreshButton = document.getElementById('refreshButton');
    const problemsList = document.getElementById('problemsList');
    const logoutButton = document.getElementById('logoutButton');

    async function checkLoginState() {
        try {
            const data = await chrome.storage.local.get(['currentHandle', 'userData']);
            console.log('Checking login state:', data);

            if (data.currentHandle && data.userData) {
                // User is logged in
                loginSection.classList.add('hidden');
                profileSection.classList.remove('hidden');
                showProfile(data.userData);
                loadSuggestions();
            } else {
                // No logged in user
                loginSection.classList.remove('hidden');
                profileSection.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error checking login state:', error);
            loginSection.classList.remove('hidden');
            profileSection.classList.add('hidden');
        }
    }

    // Check login state when popup opens
    await checkLoginState();
    try {
        const data = await chrome.storage.local.get(['currentHandle', 'userData']);
        if (data.currentHandle && data.userData) {
            // User is logged in
            showProfile(data.userData);
            loadSuggestions();
        } else {
            // Show login section
            loginSection.classList.remove('hidden');
            profileSection.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        loginSection.classList.remove('hidden');
        profileSection.classList.add('hidden');
    }
    // Add loading state
    function setLoading(isLoading) {
        loginButton.disabled = isLoading;
        loginButton.textContent = isLoading ? 'Loading...' : 'Load Profile';
        if (refreshButton) {
            refreshButton.disabled = isLoading;
            refreshButton.textContent = isLoading ? 'Loading...' : 'Get New Suggestions';
        }
    }

    loginButton.addEventListener('click', async () => {
        const handle = handleInput.value.trim();
        if (!handle) {
            alert('Please enter a Codeforces handle');
            return;
        }

        setLoading(true);
        try {
            console.log('Sending GET_SUGGESTIONS message for handle:', handle);
            const response = await chrome.runtime.sendMessage({
                type: 'GET_SUGGESTIONS',
                handle: handle
            });

            console.log('Received response:', response);

            if (response.success) {
                showProfile(response.userData);
                displayProblems(response.suggestions);
            } else {
                alert(`Failed to load profile: ${response.error}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    });

    logoutButton.addEventListener('click', async () => {
        // try {
        const response = await chrome.runtime.sendMessage({ type: 'USER_LOGOUT' });
        if (response.success) {
            loginSection.classList.remove('hidden');
            profileSection.classList.add('hidden');
            handleInput.value = '';
            problemsList.innerHTML = '';
        } else {
            throw new Error('Logout failed');
        }
        // } 
    });

    refreshButton.addEventListener('click', async () => {
        const userData = await chrome.storage.local.get(['userData']);
        if (userData.userData && userData.userData.handle) {
            setLoading(true);
            try {
                const response = await chrome.runtime.sendMessage({
                    type: 'GET_SUGGESTIONS',
                    handle: userData.userData.handle
                });

                if (response.success) {
                    displayProblems(response.suggestions);
                } else {
                    alert('Failed to get new suggestions. Please try again.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    });
    refreshButton.addEventListener('click', loadSuggestions);

    function showProfile(userData) {
        loginSection.classList.add('hidden');
        profileSection.classList.remove('hidden');

        document.getElementById('userName').textContent = userData.handle;
        document.getElementById('userRating').textContent = `Rating: ${userData.rating || 'Unrated'}`;
        document.getElementById('userAvatar').src = userData.titlePhoto;
    }

    function displayProblems(problems) {
        problemsList.innerHTML = '';

        problems.forEach(problem => {
            const problemDiv = document.createElement('div');
            problemDiv.className = 'p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow';

            const ratingClass = getRatingColorClass(problem.rating);

            problemDiv.innerHTML = `
          <a href="https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}"
             target="_blank" class="block">
            <div class="flex justify-between items-center">
              <span class="font-medium">${problem.index}. ${problem.name}</span>
              <span class="${ratingClass}">${problem.rating}</span>
            </div>
            <div class="text-sm text-gray-600 mt-1">
              ${problem.tags.join(', ')}
            </div>
          </a>
        `;

            problemsList.appendChild(problemDiv);
        });
    }

    function getRatingColorClass(rating) {
        if (rating < 1200) return 'text-gray-600';
        if (rating < 1400) return 'text-green-600';
        if (rating < 1600) return 'text-cyan-600';
        if (rating < 1900) return 'text-blue-600';
        if (rating < 2100) return 'text-purple-600';
        if (rating < 2400) return 'text-yellow-600';
        return 'text-red-600';
    }

    async function loadSuggestions() {
        const userData = await chrome.storage.local.get(['userData']);
        if (userData.handle) {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_SUGGESTIONS',
                handle: userData.handle
            });

            if (response.success) {
                displayProblems(response.suggestions);
            }
        }
    }
});
document.getElementById('logoutButton').addEventListener('click', async () => {
    // try {
    await UserStateManager.clearUserState();
    loginSection.classList.remove('hidden');
    profileSection.classList.add('hidden');
    handleInput.value = '';
    // } 
});
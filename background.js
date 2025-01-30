// background.js
class CodeforcesAPI {
    static BASE_URL = 'https://codeforces.com/api';

    static async getUserInfo(handle) {
        try {
            console.log('Fetching user info for handle:', handle);
            const response = await fetch(`${this.BASE_URL}/user.info?handles=${handle}`);
            const data = await response.json();
            console.log('User info response:', data);
            if (data.status === 'OK') {
                return data.result[0];
            }
            throw new Error('Failed to fetch user info');
        } catch (error) {
            console.error('Error in getUserInfo:', error);
            throw error;
        }
    }

    static async getUserSubmissions(handle) {
        try {
            console.log('Fetching submissions for handle:', handle);
            const response = await fetch(`${this.BASE_URL}/user.status?handle=${handle}`);
            const data = await response.json();
            console.log('Submissions response:', data);
            if (data.status === 'OK') {
                return data.result;
            }
            throw new Error('Failed to fetch submissions');
        } catch (error) {
            console.error('Error in getUserSubmissions:', error);
            throw error;
        }
    }

    static async getProblemsList() {
        try {
            console.log('Fetching problems list');
            const response = await fetch(`${this.BASE_URL}/problemset.problems`);
            const data = await response.json();
            console.log('Problems list response:', data);
            if (data.status === 'OK') {
                return data.result;
            }
            throw new Error('Failed to fetch problems');
        } catch (error) {
            console.error('Error in getProblemsList:', error);
            throw error;
        }
    }
}

class ProblemSuggester {
    constructor() {
        this.userData = null;
        this.solvedProblems = new Set();
        this.availableProblems = [];
    }

    async initialize(handle) {
        try {
            console.log('Initializing ProblemSuggester for handle:', handle);

            // Fetch user data
            this.userData = await CodeforcesAPI.getUserInfo(handle);
            console.log('User data fetched:', this.userData);

            // Get solved problems
            const submissions = await CodeforcesAPI.getUserSubmissions(handle);
            console.log('Submissions fetched:', submissions.length);

            this.solvedProblems = new Set(
                submissions
                    .filter(sub => sub.verdict === 'OK')
                    .map(sub => `${sub.problem.contestId}${sub.problem.index}`)
            );
            console.log('Solved problems count:', this.solvedProblems.size);

            // Get available problems
            const problemsData = await CodeforcesAPI.getProblemsList();
            this.availableProblems = problemsData.problems;
            console.log('Available problems fetched:', this.availableProblems.length);

            // Store in Chrome storage
            await chrome.storage.local.set({
                userData: this.userData,
                solvedProblems: Array.from(this.solvedProblems),
                lastUpdate: Date.now()
            });

            return true;
        } catch (error) {
            console.error('Initialization failed:', error);
            throw error;
        }
    }

    getSuggestions(count = 5) {
        console.log('Getting suggestions, count:', count);
        const userRating = this.userData.rating || 1200;
        const ratingRange = 300;

        console.log('User rating:', userRating);
        console.log('Available problems:', this.availableProblems.length);

        const suitableProblems = this.availableProblems.filter(problem => {
            const problemId = `${problem.contestId}${problem.index}`;
            if (this.solvedProblems.has(problemId)) return false;
            if (!problem.rating) return false;
            return Math.abs(problem.rating - userRating) <= ratingRange;
        });

        console.log('Suitable problems found:', suitableProblems.length);

        const suggestions = suitableProblems
            .sort(() => Math.random() - 0.5)
            .slice(0, count);

        console.log('Returning suggestions:', suggestions);
        return suggestions;
    }
}


class UserStateManager {
    static async setLoggedInUser(handle) {
        try {
            // First fetch user data
            const suggester = new ProblemSuggester();
            await suggester.initialize(handle);

            // Store the handle and user data
            await chrome.storage.local.set({
                currentHandle: handle,
                loginTime: Date.now()
            });

            console.log('User login state saved:', handle);
            return true;
        } catch (error) {
            console.error('Error saving user state:', error);
            return false;
        }
    }

    static async logout() {
        try {
            await chrome.storage.local.clear();
            console.log('User state cleared');
            return { success: true };
        } catch (error) {
            console.error('Error clearing user state:', error);
            return { success: false, error: error.message };
        }
    }

    // static async clearUserState() {
    //     try {
    //         await chrome.storage.local.remove([
    //             'currentHandle',
    //             'userData',
    //             'solvedProblems',
    //             'lastUpdate',
    //             'loginTime'
    //         ]);
    //         console.log('User state cleared');
    //         return true;
    //     } catch (error) {
    //         console.error('Error clearing user state:', error);
    //         return false;
    //     }
    // }
}

// Background script message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);

    if (request.type === 'USER_LOGIN_DETECTED') {
        UserStateManager.setLoggedInUser(request.handle)
            .then(success => {
                sendResponse({ success });
            });
        return true;
    }

    if (request.type === 'USER_LOGOUT') {
        UserStateManager.logout()
            .then(result => {
                sendResponse(result);
            });
        return true;
    }
    if (request.type === 'GET_SUGGESTIONS') {
        console.log('Processing GET_SUGGESTIONS request for handle:', request.handle);

        const suggester = new ProblemSuggester();

        // We need to use async/await in a different way for message handlers
        (async () => {
            try {
                await suggester.initialize(request.handle);
                const suggestions = suggester.getSuggestions();
                console.log('Sending response with suggestions:', suggestions);
                sendResponse({
                    success: true,
                    suggestions,
                    userData: suggester.userData
                });
            } catch (error) {
                console.error('Error processing request:', error);
                sendResponse({
                    success: false,
                    error: error.message
                });
            }
        })();

        return true; // This is important - it tells Chrome to wait for an async response
    }
});
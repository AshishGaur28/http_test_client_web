// HTTP Test Client - Main JavaScript Implementation
class HTTPTestClient {
    constructor() {
        this.testCases = [];
        this.cachedTestCases = new Map(); // Cache for loaded test cases
        this.globalConfig = {
            baseUrl: '',
            timeout: 5000,
            sslVerification: true,
            authType: 'none',
            bearerToken: '',
            basicUsername: '',
            basicPassword: '',
            apiKeyName: 'X-API-Key',
            apiKeyValue: '',
            defaultHeaders: {}
        };
        this.currentPage = 0;
        this.pageSize = 10;
        this.isLoading = false;
        this.hasMoreData = true;
        this.searchTerm = '';
        
        this.init();
    }

    init() {
        this.loadGlobalConfig();
        this.bindEvents();
        this.generateSampleData();
        this.loadInitialTestCases();
        this.setupInfiniteScroll();
    }

    // Global Configuration Management
    loadGlobalConfig() {
        const saved = localStorage.getItem('httpTestClient_globalConfig');
        if (saved) {
            this.globalConfig = { ...this.globalConfig, ...JSON.parse(saved) };
            this.populateConfigForm();
        }
    }

    saveGlobalConfig() {
        localStorage.setItem('httpTestClient_globalConfig', JSON.stringify(this.globalConfig));
        this.showNotification('Global configuration saved successfully!', 'success');
    }

    populateConfigForm() {
        document.getElementById('global-base-url').value = this.globalConfig.baseUrl;
        document.getElementById('global-timeout').value = this.globalConfig.timeout;
        document.getElementById('global-ssl').value = this.globalConfig.sslVerification.toString();
        document.getElementById('global-auth-type').value = this.globalConfig.authType;
        document.getElementById('global-bearer-token').value = this.globalConfig.bearerToken;
        document.getElementById('global-basic-username').value = this.globalConfig.basicUsername;
        document.getElementById('global-basic-password').value = this.globalConfig.basicPassword;
        document.getElementById('global-api-key-name').value = this.globalConfig.apiKeyName;
        document.getElementById('global-api-key-value').value = this.globalConfig.apiKeyValue;
        document.getElementById('global-headers').value = JSON.stringify(this.globalConfig.defaultHeaders, null, 2);
        
        this.toggleAuthDetails();
    }

    // Event Binding
    bindEvents() {
        // Configuration Panel
        document.getElementById('toggle-config-btn').addEventListener('click', this.toggleConfigPanel.bind(this));
        document.getElementById('save-config-btn').addEventListener('click', this.handleSaveConfig.bind(this));
        document.getElementById('reset-config-btn').addEventListener('click', this.handleResetConfig.bind(this));
        document.getElementById('global-auth-type').addEventListener('change', this.toggleAuthDetails.bind(this));

        // Toolbar
        document.getElementById('add-test-btn').addEventListener('click', this.showAddTestModal.bind(this));
        document.getElementById('import-tests-btn').addEventListener('click', this.handleImportTests.bind(this));
        document.getElementById('search-input').addEventListener('input', this.handleSearch.bind(this));

        // Modal
        document.getElementById('close-modal-btn').addEventListener('click', this.hideTestModal.bind(this));
        document.getElementById('cancel-modal-btn').addEventListener('click', this.hideTestModal.bind(this));
        document.getElementById('test-form').addEventListener('submit', this.handleTestSubmit.bind(this));

        // Load More
        document.getElementById('load-more-btn').addEventListener('click', this.loadMoreTestCases.bind(this));

        // Click outside modal to close
        document.getElementById('test-modal').addEventListener('click', (e) => {
            if (e.target.id === 'test-modal') {
                this.hideTestModal();
            }
        });
    }

    // Configuration Panel Methods
    toggleConfigPanel() {
        const panel = document.getElementById('global-config-panel');
        panel.classList.toggle('hidden');
    }

    toggleAuthDetails() {
        const authType = document.getElementById('global-auth-type').value;
        const authDetails = document.querySelectorAll('.auth-details');
        
        // Hide all auth details
        authDetails.forEach(detail => detail.classList.add('hidden'));
        
        // Show relevant auth detail
        if (authType !== 'none') {
            const targetDetail = document.getElementById(`auth-${authType}`);
            if (targetDetail) {
                targetDetail.classList.remove('hidden');
            }
        }
    }

    handleSaveConfig() {
        try {
            this.globalConfig.baseUrl = document.getElementById('global-base-url').value;
            this.globalConfig.timeout = parseInt(document.getElementById('global-timeout').value);
            this.globalConfig.sslVerification = document.getElementById('global-ssl').value === 'true';
            this.globalConfig.authType = document.getElementById('global-auth-type').value;
            this.globalConfig.bearerToken = document.getElementById('global-bearer-token').value;
            this.globalConfig.basicUsername = document.getElementById('global-basic-username').value;
            this.globalConfig.basicPassword = document.getElementById('global-basic-password').value;
            this.globalConfig.apiKeyName = document.getElementById('global-api-key-name').value;
            this.globalConfig.apiKeyValue = document.getElementById('global-api-key-value').value;
            
            const headersText = document.getElementById('global-headers').value;
            if (headersText.trim()) {
                this.globalConfig.defaultHeaders = JSON.parse(headersText);
            } else {
                this.globalConfig.defaultHeaders = {};
            }
            
            this.saveGlobalConfig();
        } catch (error) {
            this.showNotification('Error saving configuration: ' + error.message, 'error');
        }
    }

    handleResetConfig() {
        this.globalConfig = {
            baseUrl: '',
            timeout: 5000,
            sslVerification: true,
            authType: 'none',
            bearerToken: '',
            basicUsername: '',
            basicPassword: '',
            apiKeyName: 'X-API-Key',
            apiKeyValue: '',
            defaultHeaders: {}
        };
        this.populateConfigForm();
        this.saveGlobalConfig();
    }

    // Sample Data Generation
    generateSampleData() {
        const sampleTests = [
            {
                id: 1,
                name: 'Get User Profile',
                description: 'Fetch user profile information',
                method: 'GET',
                url: '/api/users/profile',
                headers: { 'Authorization': 'Bearer {{token}}' },
                body: '',
                lastRun: null,
                result: null
            },
            {
                id: 2,
                name: 'Create New Post',
                description: 'Create a new blog post',
                method: 'POST',
                url: '/api/posts',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Sample Post', content: 'This is a sample post' }),
                lastRun: null,
                result: null
            },
            {
                id: 3,
                name: 'Update User Settings',
                description: 'Update user preferences and settings',
                method: 'PUT',
                url: '/api/users/settings',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme: 'dark', notifications: true }),
                lastRun: null,
                result: null
            },
            {
                id: 4,
                name: 'Delete Post',
                description: 'Delete a specific blog post',
                method: 'DELETE',
                url: '/api/posts/123',
                headers: { 'Authorization': 'Bearer {{token}}' },
                body: '',
                lastRun: null,
                result: null
            },
            {
                id: 5,
                name: 'Get Posts List',
                description: 'Retrieve paginated list of all posts',
                method: 'GET',
                url: '/api/posts?page=1&limit=10',
                headers: {},
                body: '',
                lastRun: null,
                result: null
            }
        ];

        // Generate more sample data for testing lazy loading
        for (let i = 6; i <= 50; i++) {
            sampleTests.push({
                id: i,
                name: `Test Case ${i}`,
                description: `Sample test case number ${i}`,
                method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'][Math.floor(Math.random() * 5)],
                url: `/api/endpoint/${i}`,
                headers: { 'Content-Type': 'application/json' },
                body: i % 2 === 0 ? JSON.stringify({ data: `sample ${i}` }) : '',
                lastRun: null,
                result: null
            });
        }

        this.testCases = sampleTests;
    }

    // Lazy Loading and Caching
    loadInitialTestCases() {
        this.currentPage = 0;
        this.hasMoreData = true;
        this.clearTestCaseContainer();
        this.loadMoreTestCases();
    }

    loadMoreTestCases() {
        if (this.isLoading || !this.hasMoreData) return;

        this.isLoading = true;
        this.showLoadingIndicator();

        // Simulate API delay for demonstration
        setTimeout(() => {
            const filteredTests = this.getFilteredTestCases();
            const startIndex = this.currentPage * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const pageTests = filteredTests.slice(startIndex, endIndex);

            if (pageTests.length === 0) {
                this.hasMoreData = false;
            } else {
                pageTests.forEach(testCase => {
                    if (!this.cachedTestCases.has(testCase.id)) {
                        this.cachedTestCases.set(testCase.id, testCase);
                    }
                    this.renderTestCaseCard(testCase);
                });
                this.currentPage++;
            }

            this.isLoading = false;
            this.hideLoadingIndicator();
            this.updateLoadMoreButton();
        }, 500);
    }

    getFilteredTestCases() {
        if (!this.searchTerm) {
            return this.testCases;
        }

        return this.testCases.filter(testCase =>
            testCase.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            testCase.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            testCase.method.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
    }

    // Test Case Rendering
    renderTestCaseCard(testCase) {
        const container = document.getElementById('test-cases-container');
        const cardElement = this.createTestCaseCard(testCase);
        container.appendChild(cardElement);
    }

    createTestCaseCard(testCase) {
        const card = document.createElement('div');
        card.className = 'test-case-card';
        card.dataset.testId = testCase.id;

        const statusClass = testCase.result ? 
            (testCase.result.success ? 'success' : 'error') : '';

        card.innerHTML = `
            <div class="card-header" onclick="testClient.toggleCardExpansion(${testCase.id})">
                <div class="card-info">
                    <div class="card-title">${this.escapeHtml(testCase.name)}</div>
                    <div class="card-description">${this.escapeHtml(testCase.description || '')}</div>
                    <span class="card-method method-${testCase.method}">${testCase.method}</span>
                </div>
                <div class="card-actions">
                    <button class="run-btn" onclick="event.stopPropagation(); testClient.runTestCase(${testCase.id})">
                        ▶ Run
                    </button>
                    <button class="expand-btn">▼</button>
                </div>
            </div>
            <div class="card-content" id="card-content-${testCase.id}">
                <div class="content-tabs">
                    <button class="tab-btn active" onclick="testClient.switchTab(${testCase.id}, 'details')">Request Details</button>
                    <button class="tab-btn" onclick="testClient.switchTab(${testCase.id}, 'results')" 
                            ${!testCase.result ? 'style="display:none"' : ''}>Test Results</button>
                </div>
                <div class="tab-content active" id="tab-details-${testCase.id}">
                    ${this.renderRequestDetails(testCase)}
                </div>
                <div class="tab-content" id="tab-results-${testCase.id}">
                    ${testCase.result ? this.renderTestResults(testCase.result) : ''}
                </div>
            </div>
        `;

        return card;
    }

    renderRequestDetails(testCase) {
        const fullUrl = this.buildFullUrl(testCase.url);
        const headers = { ...this.globalConfig.defaultHeaders, ...testCase.headers };
        
        return `
            <div class="request-details">
                <div class="detail-item">
                    <div class="detail-label">Method & URL</div>
                    <div class="detail-value">${testCase.method} ${fullUrl}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Headers</div>
                    <div class="detail-value">
                        <pre>${JSON.stringify(headers, null, 2)}</pre>
                    </div>
                </div>
                ${testCase.body ? `
                    <div class="detail-item">
                        <div class="detail-label">Request Body</div>
                        <div class="detail-value">
                            <pre>${this.escapeHtml(testCase.body)}</pre>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderTestResults(result) {
        return `
            <div class="test-results">
                <div class="result-status ${result.success ? 'success' : 'error'}">
                    <span>${result.success ? '✅' : '❌'}</span>
                    <span>Status: ${result.status} ${result.statusText}</span>
                </div>
                <div class="result-timing">
                    <div class="timing-item">
                        <span class="timing-label">Response Time</span>
                        <span class="timing-value">${result.responseTime}ms</span>
                    </div>
                    <div class="timing-item">
                        <span class="timing-label">Status Code</span>
                        <span class="timing-value">${result.status}</span>
                    </div>
                    <div class="timing-item">
                        <span class="timing-label">Size</span>
                        <span class="timing-value">${this.formatBytes(result.size || 0)}</span>
                    </div>
                </div>
                ${result.error ? `
                    <div class="detail-item">
                        <div class="detail-label">Error Details</div>
                        <div class="detail-value">
                            <pre>${this.escapeHtml(result.error)}</pre>
                        </div>
                    </div>
                ` : ''}
                ${result.response ? `
                    <div class="detail-item">
                        <div class="detail-label">Response Body</div>
                        <div class="detail-value">
                            <pre>${this.escapeHtml(JSON.stringify(result.response, null, 2))}</pre>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Card Interaction Methods
    toggleCardExpansion(testId) {
        const card = document.querySelector(`[data-test-id="${testId}"]`);
        const content = document.getElementById(`card-content-${testId}`);
        const expandBtn = card.querySelector('.expand-btn');

        card.classList.toggle('expanded');
        content.classList.toggle('visible');
        expandBtn.classList.toggle('expanded');
    }

    switchTab(testId, tabName) {
        const tabBtns = document.querySelectorAll(`#card-content-${testId} .tab-btn`);
        const tabContents = document.querySelectorAll(`#card-content-${testId} .tab-content`);

        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        document.querySelector(`#card-content-${testId} .tab-btn:nth-child(${tabName === 'details' ? 1 : 2})`).classList.add('active');
        document.getElementById(`tab-${tabName}-${testId}`).classList.add('active');
    }

    // HTTP Request Execution
    async runTestCase(testId) {
        const testCase = this.cachedTestCases.get(testId) || this.testCases.find(t => t.id === testId);
        if (!testCase) return;

        const runBtn = document.querySelector(`[data-test-id="${testId}"] .run-btn`);
        const originalText = runBtn.textContent;
        
        runBtn.disabled = true;
        runBtn.textContent = '⏳ Running...';

        try {
            const result = await this.executeHttpRequest(testCase);
            testCase.result = result;
            testCase.lastRun = new Date();

            // Update cached test case
            this.cachedTestCases.set(testId, testCase);

            // Update the UI
            this.updateTestCaseResult(testId, result);
            this.showNotification(`Test "${testCase.name}" completed`, result.success ? 'success' : 'error');
        } catch (error) {
            const result = {
                success: false,
                status: 0,
                statusText: 'Request Failed',
                error: error.message,
                responseTime: 0,
                timestamp: new Date()
            };
            testCase.result = result;
            this.updateTestCaseResult(testId, result);
            this.showNotification(`Test "${testCase.name}" failed: ${error.message}`, 'error');
        } finally {
            runBtn.disabled = false;
            runBtn.textContent = originalText;
        }
    }

    async executeHttpRequest(testCase) {
        const startTime = performance.now();
        const fullUrl = this.buildFullUrl(testCase.url);
        const headers = this.buildHeaders(testCase.headers);

        const requestOptions = {
            method: testCase.method,
            headers: headers,
            signal: AbortSignal.timeout(this.globalConfig.timeout)
        };

        if (testCase.body && ['POST', 'PUT', 'PATCH'].includes(testCase.method)) {
            requestOptions.body = testCase.body;
        }

        try {
            const response = await fetch(fullUrl, requestOptions);
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            let responseBody = null;
            let size = 0;

            try {
                const text = await response.text();
                size = text.length;
                if (text) {
                    try {
                        responseBody = JSON.parse(text);
                    } catch {
                        responseBody = text;
                    }
                }
            } catch (e) {
                // Response reading failed
            }

            return {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                response: responseBody,
                responseTime: responseTime,
                size: size,
                timestamp: new Date()
            };
        } catch (error) {
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            throw new Error(`Network error: ${error.message}`);
        }
    }

    buildFullUrl(url) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        const baseUrl = this.globalConfig.baseUrl || 'https://jsonplaceholder.typicode.com';
        return baseUrl.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
    }

    buildHeaders(testHeaders = {}) {
        const headers = { ...this.globalConfig.defaultHeaders, ...testHeaders };

        // Add authentication headers based on global config
        switch (this.globalConfig.authType) {
            case 'bearer':
                if (this.globalConfig.bearerToken) {
                    headers['Authorization'] = `Bearer ${this.globalConfig.bearerToken}`;
                }
                break;
            case 'basic':
                if (this.globalConfig.basicUsername && this.globalConfig.basicPassword) {
                    const credentials = btoa(`${this.globalConfig.basicUsername}:${this.globalConfig.basicPassword}`);
                    headers['Authorization'] = `Basic ${credentials}`;
                }
                break;
            case 'api-key':
                if (this.globalConfig.apiKeyName && this.globalConfig.apiKeyValue) {
                    headers[this.globalConfig.apiKeyName] = this.globalConfig.apiKeyValue;
                }
                break;
        }

        return headers;
    }

    updateTestCaseResult(testId, result) {
        // Show results tab
        const resultsTab = document.querySelector(`#card-content-${testId} .tab-btn:nth-child(2)`);
        if (resultsTab) {
            resultsTab.style.display = 'block';
        }

        // Update results content
        const resultsContent = document.getElementById(`tab-results-${testId}`);
        if (resultsContent) {
            resultsContent.innerHTML = this.renderTestResults(result);
        }

        // Switch to results tab
        this.switchTab(testId, 'results');
    }

    // Search Functionality
    handleSearch(e) {
        this.searchTerm = e.target.value;
        this.currentPage = 0;
        this.hasMoreData = true;
        this.cachedTestCases.clear();
        this.clearTestCaseContainer();
        this.loadMoreTestCases();
    }

    // Modal Methods
    showAddTestModal() {
        document.getElementById('modal-title').textContent = 'Add Test Case';
        document.getElementById('test-form').reset();
        document.getElementById('test-modal').classList.remove('hidden');
    }

    hideTestModal() {
        document.getElementById('test-modal').classList.add('hidden');
    }

    handleTestSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const testCase = {
            id: Date.now(), // Simple ID generation
            name: document.getElementById('test-name').value,
            description: document.getElementById('test-description').value,
            method: document.getElementById('test-method').value,
            url: document.getElementById('test-url').value,
            headers: {},
            body: document.getElementById('test-body').value,
            lastRun: null,
            result: null
        };

        // Parse headers
        const headersText = document.getElementById('test-headers').value;
        if (headersText.trim()) {
            try {
                testCase.headers = JSON.parse(headersText);
            } catch (error) {
                this.showNotification('Invalid JSON in headers field', 'error');
                return;
            }
        }

        this.testCases.unshift(testCase);
        this.hideTestModal();
        
        // Refresh the display
        this.currentPage = 0;
        this.hasMoreData = true;
        this.cachedTestCases.clear();
        this.clearTestCaseContainer();
        this.loadMoreTestCases();
        
        this.showNotification('Test case added successfully!', 'success');
    }

    // Import Tests
    handleImportTests() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedTests = JSON.parse(e.target.result);
                        if (Array.isArray(importedTests)) {
                            importedTests.forEach(test => {
                                test.id = Date.now() + Math.random(); // Ensure unique IDs
                                test.lastRun = null;
                                test.result = null;
                            });
                            this.testCases.unshift(...importedTests);
                            
                            // Refresh display
                            this.currentPage = 0;
                            this.hasMoreData = true;
                            this.cachedTestCases.clear();
                            this.clearTestCaseContainer();
                            this.loadMoreTestCases();
                            
                            this.showNotification(`Imported ${importedTests.length} test cases successfully!`, 'success');
                        } else {
                            this.showNotification('Invalid file format. Expected JSON array.', 'error');
                        }
                    } catch (error) {
                        this.showNotification('Error parsing JSON file: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    // Infinite Scroll Setup
    setupInfiniteScroll() {
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollPosition = window.innerHeight + window.scrollY;
                const threshold = document.body.offsetHeight - 1000; // Load more when 1000px from bottom
                
                if (scrollPosition >= threshold && !this.isLoading && this.hasMoreData) {
                    this.loadMoreTestCases();
                }
            }, 100);
        });
    }

    // Utility Methods
    clearTestCaseContainer() {
        const container = document.getElementById('test-cases-container');
        const loadingIndicator = document.getElementById('loading-indicator');
        container.innerHTML = '';
        container.appendChild(loadingIndicator);
    }

    showLoadingIndicator() {
        document.getElementById('loading-indicator').classList.remove('hidden');
    }

    hideLoadingIndicator() {
        document.getElementById('loading-indicator').classList.add('hidden');
    }

    updateLoadMoreButton() {
        const container = document.getElementById('load-more-container');
        if (this.hasMoreData) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#27ae60';
                break;
            case 'error':
                notification.style.backgroundColor = '#e74c3c';
                break;
            default:
                notification.style.backgroundColor = '#3498db';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// CSS for notifications animation
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Initialize the application
let testClient;
document.addEventListener('DOMContentLoaded', () => {
    testClient = new HTTPTestClient();
});
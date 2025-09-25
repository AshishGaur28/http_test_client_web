// HTTP API Test Client - Main JavaScript
class HttpTestClient {
    constructor() {
        this.testCases = [];
        this.displayedCases = [];
        this.globalConfig = this.loadGlobalConfig();
        this.currentEditingIndex = -1;
        this.itemsPerPage = 20;
        this.currentPage = 0;
        this.searchQuery = '';
        this.isLoading = false;
        
        this.initializeEventListeners();
        this.loadTestCases();
        this.renderTestCases();
    }

    // Global Configuration Management
    loadGlobalConfig() {
        const defaultConfig = {
            baseUrl: '',
            timeout: 30,
            sslEnabled: true,
            authType: 'none',
            authValue: '',
            commonHeaders: {}
        };

        const saved = localStorage.getItem('httpTestClient_globalConfig');
        return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    }

    saveGlobalConfig(config) {
        this.globalConfig = { ...this.globalConfig, ...config };
        localStorage.setItem('httpTestClient_globalConfig', JSON.stringify(this.globalConfig));
    }

    // Test Cases Management
    loadTestCases() {
        const saved = localStorage.getItem('httpTestClient_testCases');
        this.testCases = saved ? JSON.parse(saved) : this.getDefaultTestCases();
    }

    saveTestCases() {
        localStorage.setItem('httpTestClient_testCases', JSON.stringify(this.testCases));
    }

    getDefaultTestCases() {
        return [
            {
                id: 'test-1',
                name: 'Get Users',
                description: 'Fetch all users from API',
                method: 'GET',
                url: 'https://jsonplaceholder.typicode.com/users',
                headers: { 'Accept': 'application/json' },
                body: '',
                expectedStatus: 200,
                expectedResponse: '',
                status: 'pending',
                result: null
            },
            {
                id: 'test-2',
                name: 'Create User',
                description: 'Create a new user',
                method: 'POST',
                url: 'https://jsonplaceholder.typicode.com/users',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }, null, 2),
                expectedStatus: 201,
                expectedResponse: '',
                status: 'pending',
                result: null
            },
            {
                id: 'test-3',
                name: 'Get Single User',
                description: 'Fetch user by ID',
                method: 'GET',
                url: 'https://jsonplaceholder.typicode.com/users/1',
                headers: { 'Accept': 'application/json' },
                body: '',
                expectedStatus: 200,
                expectedResponse: '',
                status: 'pending',
                result: null
            }
        ];
    }

    // Event Listeners Setup
    initializeEventListeners() {
        // Global Config Modal
        document.getElementById('globalConfigBtn').addEventListener('click', () => {
            this.showGlobalConfigModal();
        });

        document.getElementById('globalConfigForm').addEventListener('submit', (e) => {
            this.handleGlobalConfigSubmit(e);
        });

        document.getElementById('resetConfig').addEventListener('click', () => {
            this.resetGlobalConfig();
        });

        // Test Case Management
        document.getElementById('addTestBtn').addEventListener('click', () => {
            this.showAddTestCaseModal();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.handleFileImport(e);
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportTestSuite();
        });

        document.getElementById('runAllBtn').addEventListener('click', () => {
            this.runAllTests();
        });

        document.getElementById('clearResultsBtn').addEventListener('click', () => {
            this.clearAllResults();
        });

        // Test Case Form
        document.getElementById('testCaseForm').addEventListener('submit', (e) => {
            this.handleTestCaseSubmit(e);
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Modal close handlers
        document.querySelectorAll('.modal .close, .modal .cancel').forEach(el => {
            el.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });

        // Infinite scroll
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }

    // Modal Management
    showGlobalConfigModal() {
        const modal = document.getElementById('globalConfigModal');
        const form = document.getElementById('globalConfigForm');
        
        // Populate form with current config
        form.baseUrl.value = this.globalConfig.baseUrl;
        form.timeout.value = this.globalConfig.timeout;
        form.sslEnabled.checked = this.globalConfig.sslEnabled;
        form.authType.value = this.globalConfig.authType;
        form.authValue.value = this.globalConfig.authValue;
        form.commonHeaders.value = JSON.stringify(this.globalConfig.commonHeaders, null, 2);
        
        modal.style.display = 'block';
    }

    showAddTestCaseModal(testCase = null, index = -1) {
        const modal = document.getElementById('testCaseModal');
        const form = document.getElementById('testCaseForm');
        const title = document.getElementById('testCaseModalTitle');
        
        this.currentEditingIndex = index;
        
        if (testCase) {
            title.textContent = 'Edit Test Case';
            form.testName.value = testCase.name;
            form.testDescription.value = testCase.description;
            form.testMethod.value = testCase.method;
            form.testUrl.value = testCase.url;
            form.testHeaders.value = JSON.stringify(testCase.headers, null, 2);
            form.testBody.value = testCase.body;
            form.expectedStatus.value = testCase.expectedStatus;
            form.expectedResponse.value = testCase.expectedResponse;
        } else {
            title.textContent = 'Add Test Case';
            form.reset();
            // Apply global defaults
            const baseUrl = this.globalConfig.baseUrl;
            if (baseUrl) {
                form.testUrl.value = baseUrl;
            }
            const commonHeaders = { ...this.globalConfig.commonHeaders };
            this.applyAuthToHeaders(commonHeaders);
            form.testHeaders.value = JSON.stringify(commonHeaders, null, 2);
        }
        
        modal.style.display = 'block';
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Form Handlers
    handleGlobalConfigSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const commonHeaders = JSON.parse(formData.get('commonHeaders') || '{}');
            
            const config = {
                baseUrl: formData.get('baseUrl'),
                timeout: parseInt(formData.get('timeout')),
                sslEnabled: formData.has('sslEnabled'),
                authType: formData.get('authType'),
                authValue: formData.get('authValue'),
                commonHeaders
            };
            
            this.saveGlobalConfig(config);
            this.closeModals();
            this.showNotification('Global configuration saved successfully!', 'success');
        } catch (error) {
            this.showNotification('Invalid JSON in common headers', 'error');
        }
    }

    resetGlobalConfig() {
        const defaultConfig = {
            baseUrl: '',
            timeout: 30,
            sslEnabled: true,
            authType: 'none',
            authValue: '',
            commonHeaders: {}
        };
        
        this.saveGlobalConfig(defaultConfig);
        this.showGlobalConfigModal(); // Refresh the modal
        this.showNotification('Configuration reset to defaults', 'success');
    }

    handleTestCaseSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const headers = JSON.parse(formData.get('testHeaders') || '{}');
            
            const testCase = {
                id: this.currentEditingIndex >= 0 ? this.testCases[this.currentEditingIndex].id : 'test-' + Date.now(),
                name: formData.get('testName'),
                description: formData.get('testDescription'),
                method: formData.get('testMethod'),
                url: formData.get('testUrl'),
                headers,
                body: formData.get('testBody'),
                expectedStatus: parseInt(formData.get('expectedStatus')),
                expectedResponse: formData.get('expectedResponse'),
                status: 'pending',
                result: null
            };
            
            if (this.currentEditingIndex >= 0) {
                this.testCases[this.currentEditingIndex] = testCase;
                this.showNotification('Test case updated successfully!', 'success');
            } else {
                this.testCases.push(testCase);
                this.showNotification('Test case added successfully!', 'success');
            }
            
            this.saveTestCases();
            this.renderTestCases();
            this.closeModals();
        } catch (error) {
            this.showNotification('Invalid JSON in headers', 'error');
        }
    }

    // Test Case Rendering
    renderTestCases() {
        const container = document.getElementById('testCasesList');
        const filteredCases = this.getFilteredTestCases();
        
        if (filteredCases.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Test Cases Found</h3>
                    <p>Add your first test case to get started, or import an existing test suite.</p>
                    <button onclick="httpTestClient.showAddTestCaseModal()" class="primary-btn">Add Test Case</button>
                </div>
            `;
            return;
        }

        // Lazy loading: render only visible items
        const startIndex = 0;
        const endIndex = Math.min((this.currentPage + 1) * this.itemsPerPage, filteredCases.length);
        this.displayedCases = filteredCases.slice(startIndex, endIndex);
        
        container.innerHTML = this.displayedCases.map((testCase, index) => 
            this.renderTestCaseCard(testCase, filteredCases.indexOf(testCase))
        ).join('');
        
        // Show loading indicator if there are more items
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (endIndex < filteredCases.length) {
            loadingIndicator.style.display = 'flex';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }

    renderTestCaseCard(testCase, index) {
        const statusClass = `status-${testCase.status}`;
        const methodClass = `method-${testCase.method}`;
        
        return `
            <div class="test-case-card" data-index="${index}">
                <div class="test-case-header" onclick="httpTestClient.toggleTestCase(${index})">
                    <div class="test-case-info">
                        <span class="test-case-method ${methodClass}">${testCase.method}</span>
                        <div>
                            <div class="test-case-name">${this.escapeHtml(testCase.name)}</div>
                            ${testCase.description ? `<div class="test-case-description">${this.escapeHtml(testCase.description)}</div>` : ''}
                        </div>
                    </div>
                    <div class="test-case-actions">
                        <span class="test-case-status ${statusClass}"></span>
                        <button class="run-btn" onclick="event.stopPropagation(); httpTestClient.runTest(${index})">
                            ${testCase.status === 'running' ? 'Running...' : 'Run'}
                        </button>
                        <button class="expand-btn">▼</button>
                    </div>
                </div>
                <div class="test-case-details">
                    ${this.renderTestCaseDetails(testCase, index)}
                </div>
            </div>
        `;
    }

    renderTestCaseDetails(testCase, index) {
        return `
            <div class="details-tabs">
                <button class="tab-button active" onclick="httpTestClient.switchTab(event, 'request-${index}')">Request</button>
                ${testCase.result ? `<button class="tab-button" onclick="httpTestClient.switchTab(event, 'response-${index}')">Response</button>` : ''}
                <button class="tab-button" onclick="httpTestClient.switchTab(event, 'config-${index}')">Config</button>
            </div>
            
            <div id="request-${index}" class="tab-content active">
                <div class="details-section">
                    <h4>URL</h4>
                    <div class="url">${this.escapeHtml(testCase.url)}</div>
                </div>
                <div class="details-section">
                    <h4>Headers</h4>
                    <pre>${this.escapeHtml(JSON.stringify(testCase.headers, null, 2))}</pre>
                </div>
                ${testCase.body ? `
                <div class="details-section">
                    <h4>Request Body</h4>
                    <pre>${this.escapeHtml(testCase.body)}</pre>
                </div>
                ` : ''}
            </div>
            
            ${testCase.result ? `
            <div id="response-${index}" class="tab-content">
                ${this.renderTestResults(testCase.result)}
            </div>
            ` : ''}
            
            <div id="config-${index}" class="tab-content">
                <div class="details-section">
                    <h4>Expected Status</h4>
                    <div class="url">${testCase.expectedStatus}</div>
                </div>
                ${testCase.expectedResponse ? `
                <div class="details-section">
                    <h4>Expected Response</h4>
                    <pre>${this.escapeHtml(testCase.expectedResponse)}</pre>
                </div>
                ` : ''}
                <div class="details-section">
                    <button onclick="httpTestClient.showAddTestCaseModal(httpTestClient.testCases[${index}], ${index})" class="secondary-btn">Edit</button>
                    <button onclick="httpTestClient.deleteTestCase(${index})" class="secondary-btn" style="background: #e74c3c;">Delete</button>
                </div>
            </div>
        `;
    }

    renderTestResults(result) {
        const statusClass = result.success ? 'success' : 'failure';
        const statusText = result.success ? 'PASSED' : 'FAILED';
        const statusCodeClass = this.getStatusCodeClass(result.status);
        
        return `
            <div class="test-results ${statusClass}">
                <div class="results-header">
                    <span class="results-status ${statusClass}">${statusText}</span>
                    <span class="results-timing">${result.duration}ms</span>
                </div>
                <div class="results-details">
                    <div class="result-item">
                        <h5>Status Code</h5>
                        <span class="status-code ${statusCodeClass}">${result.status}</span>
                    </div>
                    <div class="result-item">
                        <h5>Response Time</h5>
                        <div>${result.duration}ms</div>
                    </div>
                </div>
                ${result.responseHeaders ? `
                <div class="details-section">
                    <h4>Response Headers</h4>
                    <pre>${this.escapeHtml(JSON.stringify(result.responseHeaders, null, 2))}</pre>
                </div>
                ` : ''}
                ${result.responseBody ? `
                <div class="details-section">
                    <h4>Response Body</h4>
                    <pre>${this.escapeHtml(typeof result.responseBody === 'string' ? result.responseBody : JSON.stringify(result.responseBody, null, 2))}</pre>
                </div>
                ` : ''}
                ${result.error ? `
                <div class="details-section">
                    <h4>Error</h4>
                    <pre class="error">${this.escapeHtml(result.error)}</pre>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Test Execution
    async runTest(index) {
        const testCase = this.testCases[index];
        
        // Update status to running
        testCase.status = 'running';
        testCase.result = null;
        this.saveTestCases();
        this.renderTestCases();
        
        const startTime = Date.now();
        
        try {
            // Prepare request
            const url = testCase.url;
            const options = {
                method: testCase.method,
                headers: { ...testCase.headers }
            };
            
            // Add authentication headers if configured globally
            this.applyAuthToHeaders(options.headers);
            
            // Add request body if present
            if (testCase.body && ['POST', 'PUT', 'PATCH'].includes(testCase.method)) {
                options.body = testCase.body;
            }
            
            // Set timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.globalConfig.timeout * 1000);
            options.signal = controller.signal;
            
            // Make request
            const response = await fetch(url, options);
            clearTimeout(timeout);
            
            const duration = Date.now() - startTime;
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            
            let responseBody = '';
            try {
                const text = await response.text();
                if (text) {
                    try {
                        responseBody = JSON.parse(text);
                    } catch {
                        responseBody = text;
                    }
                }
            } catch (error) {
                responseBody = 'Could not read response body';
            }
            
            // Check if test passed
            const expectedStatus = testCase.expectedStatus;
            const actualStatus = response.status;
            let success = actualStatus === expectedStatus;
            
            // Additional response validation if expected response is provided
            if (success && testCase.expectedResponse) {
                try {
                    const expectedData = JSON.parse(testCase.expectedResponse);
                    success = this.validateResponse(responseBody, expectedData);
                } catch {
                    // If expected response is not JSON, do string comparison
                    success = responseBody === testCase.expectedResponse;
                }
            }
            
            testCase.result = {
                success,
                status: actualStatus,
                duration,
                responseHeaders,
                responseBody,
                error: null
            };
            
            testCase.status = success ? 'success' : 'failure';
            
        } catch (error) {
            const duration = Date.now() - startTime;
            testCase.result = {
                success: false,
                status: 0,
                duration,
                responseHeaders: null,
                responseBody: null,
                error: error.message
            };
            testCase.status = 'failure';
        }
        
        this.saveTestCases();
        this.renderTestCases();
    }

    async runAllTests() {
        for (let i = 0; i < this.testCases.length; i++) {
            if (this.getFilteredTestCases().includes(this.testCases[i])) {
                await this.runTest(i);
                // Add small delay between tests to prevent overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        this.showNotification('All tests completed!', 'success');
    }

    // Utility Functions
    applyAuthToHeaders(headers) {
        if (this.globalConfig.authType !== 'none' && this.globalConfig.authValue) {
            switch (this.globalConfig.authType) {
                case 'bearer':
                    headers['Authorization'] = `Bearer ${this.globalConfig.authValue}`;
                    break;
                case 'basic':
                    headers['Authorization'] = `Basic ${btoa(this.globalConfig.authValue)}`;
                    break;
                case 'apikey':
                    headers['X-API-Key'] = this.globalConfig.authValue;
                    break;
            }
        }
    }

    validateResponse(actual, expected) {
        // Simple deep comparison for objects
        if (typeof expected === 'object' && typeof actual === 'object') {
            return JSON.stringify(actual) === JSON.stringify(expected);
        }
        return actual === expected;
    }

    getStatusCodeClass(status) {
        if (status >= 200 && status < 300) return 'status-2xx';
        if (status >= 300 && status < 400) return 'status-3xx';
        if (status >= 400 && status < 500) return 'status-4xx';
        if (status >= 500) return 'status-5xx';
        return 'status-unknown';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Search and Filtering
    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.currentPage = 0;
        this.renderTestCases();
    }

    getFilteredTestCases() {
        if (!this.searchQuery) return this.testCases;
        
        return this.testCases.filter(testCase => 
            testCase.name.toLowerCase().includes(this.searchQuery) ||
            testCase.description.toLowerCase().includes(this.searchQuery) ||
            testCase.method.toLowerCase().includes(this.searchQuery) ||
            testCase.url.toLowerCase().includes(this.searchQuery)
        );
    }

    // Lazy Loading / Infinite Scroll
    handleScroll() {
        if (this.isLoading) return;
        
        const scrollTop = window.pageYOffset;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= documentHeight - 1000) {
            this.loadMoreTestCases();
        }
    }

    loadMoreTestCases() {
        const filteredCases = this.getFilteredTestCases();
        const nextPageEnd = (this.currentPage + 2) * this.itemsPerPage;
        
        if (nextPageEnd > filteredCases.length) return;
        
        this.isLoading = true;
        document.getElementById('loadingIndicator').style.display = 'flex';
        
        setTimeout(() => {
            this.currentPage++;
            this.renderTestCases();
            this.isLoading = false;
        }, 500); // Simulate loading delay
    }

    // UI Interactions
    toggleTestCase(index) {
        const card = document.querySelector(`[data-index="${index}"]`);
        card.classList.toggle('expanded');
    }

    switchTab(event, tabId) {
        const tabButton = event.target;
        const tabContainer = tabButton.closest('.test-case-details');
        
        // Remove active class from all tabs
        tabContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        tabContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab
        tabButton.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }

    deleteTestCase(index) {
        if (confirm('Are you sure you want to delete this test case?')) {
            this.testCases.splice(index, 1);
            this.saveTestCases();
            this.renderTestCases();
            this.showNotification('Test case deleted', 'success');
        }
    }

    clearAllResults() {
        this.testCases.forEach(testCase => {
            testCase.status = 'pending';
            testCase.result = null;
        });
        this.saveTestCases();
        this.renderTestCases();
        this.showNotification('All results cleared', 'success');
    }

    // Import/Export
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    this.testCases = importedData.map(testCase => ({
                        id: testCase.id || 'test-' + Date.now() + Math.random(),
                        name: testCase.name || 'Imported Test',
                        description: testCase.description || '',
                        method: testCase.method || 'GET',
                        url: testCase.url || '',
                        headers: testCase.headers || {},
                        body: testCase.body || '',
                        expectedStatus: testCase.expectedStatus || 200,
                        expectedResponse: testCase.expectedResponse || '',
                        status: 'pending',
                        result: null
                    }));
                    this.saveTestCases();
                    this.renderTestCases();
                    this.showNotification('Test suite imported successfully!', 'success');
                } else {
                    throw new Error('Invalid format');
                }
            } catch (error) {
                this.showNotification('Error importing file: Invalid format', 'error');
            }
        };
        reader.readAsText(file);
        
        // Clear the file input
        event.target.value = '';
    }

    exportTestSuite() {
        const exportData = this.testCases.map(testCase => ({
            id: testCase.id,
            name: testCase.name,
            description: testCase.description,
            method: testCase.method,
            url: testCase.url,
            headers: testCase.headers,
            body: testCase.body,
            expectedStatus: testCase.expectedStatus,
            expectedResponse: testCase.expectedResponse
        }));
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test-suite.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Test suite exported successfully!', 'success');
    }

    // Notifications
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the application
let httpTestClient;
document.addEventListener('DOMContentLoaded', () => {
    httpTestClient = new HttpTestClient();
});
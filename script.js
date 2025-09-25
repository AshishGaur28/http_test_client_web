// HTTP API Test Client
class HTTPTestClient {
    constructor() {
        this.testCases = [];
        this.globalConfig = this.loadGlobalConfig();
        this.filteredTestCases = [];
        this.visibleTestCases = [];
        this.loadedCount = 0;
        this.batchSize = 20;
        this.testResultsCache = new Map();
        
        this.initializeEventListeners();
        this.loadInitialTestCases();
    }

    // Global Configuration Management
    loadGlobalConfig() {
        const saved = localStorage.getItem('httpTestClient_globalConfig');
        return saved ? JSON.parse(saved) : {
            baseUrl: '',
            timeout: 5000,
            sslEnabled: true,
            authType: 'none',
            commonHeaders: {}
        };
    }

    saveGlobalConfig() {
        localStorage.setItem('httpTestClient_globalConfig', JSON.stringify(this.globalConfig));
    }

    // Test Cases Storage
    saveTestCases() {
        localStorage.setItem('httpTestClient_testCases', JSON.stringify(this.testCases));
    }

    loadTestCases() {
        const saved = localStorage.getItem('httpTestClient_testCases');
        return saved ? JSON.parse(saved) : this.getDefaultTestCases();
    }

    getDefaultTestCases() {
        return [
            {
                id: '1',
                name: 'Get Users',
                description: 'Fetch all users from the API',
                method: 'GET',
                url: 'https://jsonplaceholder.typicode.com/users',
                headers: { 'Content-Type': 'application/json' },
                body: '',
                expectedStatus: 200,
                expectedResponse: ''
            },
            {
                id: '2',
                name: 'Create User',
                description: 'Create a new user via POST request',
                method: 'POST',
                url: 'https://jsonplaceholder.typicode.com/users',
                headers: { 'Content-Type': 'application/json' },
                body: '{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "phone": "123-456-7890"\n}',
                expectedStatus: 201,
                expectedResponse: ''
            },
            {
                id: '3',
                name: 'Update User',
                description: 'Update user information via PUT request',
                method: 'PUT',
                url: 'https://jsonplaceholder.typicode.com/users/1',
                headers: { 'Content-Type': 'application/json' },
                body: '{\n  "id": 1,\n  "name": "Jane Doe",\n  "email": "jane@example.com"\n}',
                expectedStatus: 200,
                expectedResponse: ''
            },
            {
                id: '4',
                name: 'Delete User',
                description: 'Delete a user via DELETE request',
                method: 'DELETE',
                url: 'https://jsonplaceholder.typicode.com/users/1',
                headers: {},
                body: '',
                expectedStatus: 200,
                expectedResponse: ''
            }
        ];
    }

    // Initialize Event Listeners
    initializeEventListeners() {
        // Global Config Modal
        document.getElementById('globalConfigBtn').addEventListener('click', () => this.openGlobalConfigModal());
        document.getElementById('saveGlobalConfigBtn').addEventListener('click', () => this.saveGlobalConfigFromModal());
        
        // Test Modal
        document.getElementById('addTestBtn').addEventListener('click', () => this.openTestModal());
        document.getElementById('saveTestBtn').addEventListener('click', () => this.saveTestFromModal());
        
        // Import/Export
        document.getElementById('importBtn').addEventListener('click', () => this.importTests());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportTests());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileImport(e));
        
        // Test Actions
        document.getElementById('runAllBtn').addEventListener('click', () => this.runAllTests());
        document.getElementById('clearResultsBtn').addEventListener('click', () => this.clearAllResults());
        
        // Search and Filter
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('methodFilter').addEventListener('change', (e) => this.handleMethodFilter(e.target.value));
        document.getElementById('statusFilter').addEventListener('change', (e) => this.handleStatusFilter(e.target.value));
        
        // Modal close handlers
        document.querySelectorAll('.close-btn, .close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });
        
        // Close modal on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModals();
            });
        });
        
        // Infinite scrolling
        document.getElementById('testCasesContainer').addEventListener('scroll', (e) => this.handleScroll(e));
    }

    // Initialize Application
    loadInitialTestCases() {
        this.testCases = this.loadTestCases();
        this.applyFilters();
        this.loadMoreTestCases();
    }

    // Global Configuration Modal
    openGlobalConfigModal() {
        document.getElementById('globalBaseUrl').value = this.globalConfig.baseUrl;
        document.getElementById('globalTimeout').value = this.globalConfig.timeout;
        document.getElementById('globalSslEnabled').checked = this.globalConfig.sslEnabled;
        document.getElementById('globalAuthType').value = this.globalConfig.authType;
        document.getElementById('globalHeaders').value = JSON.stringify(this.globalConfig.commonHeaders, null, 2);
        
        document.getElementById('globalConfigModal').style.display = 'block';
    }

    saveGlobalConfigFromModal() {
        try {
            this.globalConfig = {
                baseUrl: document.getElementById('globalBaseUrl').value,
                timeout: parseInt(document.getElementById('globalTimeout').value),
                sslEnabled: document.getElementById('globalSslEnabled').checked,
                authType: document.getElementById('globalAuthType').value,
                commonHeaders: JSON.parse(document.getElementById('globalHeaders').value || '{}')
            };
            
            this.saveGlobalConfig();
            this.closeModals();
            this.showNotification('Global configuration saved successfully!', 'success');
        } catch (error) {
            this.showNotification('Invalid JSON in headers field', 'error');
        }
    }

    // Test Modal Management
    openTestModal(testCase = null) {
        const modal = document.getElementById('testModal');
        const title = document.getElementById('testModalTitle');
        
        if (testCase) {
            title.textContent = 'Edit Test Case';
            this.populateTestModal(testCase);
            modal.dataset.editId = testCase.id;
        } else {
            title.textContent = 'Add Test Case';
            this.resetTestModal();
            delete modal.dataset.editId;
            this.applyGlobalDefaults();
        }
        
        modal.style.display = 'block';
    }

    populateTestModal(testCase) {
        document.getElementById('testName').value = testCase.name;
        document.getElementById('testDescription').value = testCase.description;
        document.getElementById('testMethod').value = testCase.method;
        document.getElementById('testUrl').value = testCase.url;
        document.getElementById('testHeaders').value = JSON.stringify(testCase.headers, null, 2);
        document.getElementById('testBody').value = testCase.body;
        document.getElementById('testExpectedStatus').value = testCase.expectedStatus;
        document.getElementById('testExpectedResponse').value = testCase.expectedResponse;
    }

    resetTestModal() {
        document.getElementById('testName').value = '';
        document.getElementById('testDescription').value = '';
        document.getElementById('testMethod').value = 'GET';
        document.getElementById('testUrl').value = '';
        document.getElementById('testHeaders').value = '';
        document.getElementById('testBody').value = '';
        document.getElementById('testExpectedStatus').value = '200';
        document.getElementById('testExpectedResponse').value = '';
    }

    applyGlobalDefaults() {
        if (this.globalConfig.baseUrl && !document.getElementById('testUrl').value) {
            document.getElementById('testUrl').value = this.globalConfig.baseUrl;
        }
        
        const mergedHeaders = { ...this.globalConfig.commonHeaders };
        if (Object.keys(mergedHeaders).length > 0) {
            document.getElementById('testHeaders').value = JSON.stringify(mergedHeaders, null, 2);
        }
    }

    saveTestFromModal() {
        try {
            const testData = {
                name: document.getElementById('testName').value,
                description: document.getElementById('testDescription').value,
                method: document.getElementById('testMethod').value,
                url: document.getElementById('testUrl').value,
                headers: JSON.parse(document.getElementById('testHeaders').value || '{}'),
                body: document.getElementById('testBody').value,
                expectedStatus: parseInt(document.getElementById('testExpectedStatus').value),
                expectedResponse: document.getElementById('testExpectedResponse').value
            };

            if (!testData.name || !testData.url) {
                this.showNotification('Name and URL are required fields', 'error');
                return;
            }

            const modal = document.getElementById('testModal');
            if (modal.dataset.editId) {
                this.updateTestCase(modal.dataset.editId, testData);
            } else {
                this.addTestCase(testData);
            }

            this.closeModals();
            this.renderTestCases();
        } catch (error) {
            this.showNotification('Invalid JSON in headers field', 'error');
        }
    }

    addTestCase(testData) {
        const testCase = {
            id: Date.now().toString(),
            ...testData
        };
        
        this.testCases.unshift(testCase);
        this.saveTestCases();
        this.applyFilters();
        this.showNotification('Test case added successfully!', 'success');
    }

    updateTestCase(id, testData) {
        const index = this.testCases.findIndex(test => test.id === id);
        if (index !== -1) {
            this.testCases[index] = { id, ...testData };
            this.saveTestCases();
            this.applyFilters();
            this.showNotification('Test case updated successfully!', 'success');
        }
    }

    deleteTestCase(id) {
        if (confirm('Are you sure you want to delete this test case?')) {
            this.testCases = this.testCases.filter(test => test.id !== id);
            this.testResultsCache.delete(id);
            this.saveTestCases();
            this.applyFilters();
            this.renderTestCases();
            this.showNotification('Test case deleted successfully!', 'success');
        }
    }

    // Import/Export Functionality
    importTests() {
        document.getElementById('fileInput').click();
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTests = JSON.parse(e.target.result);
                if (Array.isArray(importedTests)) {
                    // Apply global defaults to imported tests
                    importedTests.forEach(test => {
                        if (!test.id) test.id = Date.now().toString() + Math.random();
                        if (this.globalConfig.baseUrl && !test.url.startsWith('http')) {
                            test.url = this.globalConfig.baseUrl + test.url;
                        }
                        // Merge global headers
                        test.headers = { ...this.globalConfig.commonHeaders, ...test.headers };
                    });
                    
                    this.testCases = [...this.testCases, ...importedTests];
                    this.saveTestCases();
                    this.applyFilters();
                    this.renderTestCases();
                    this.showNotification(`Imported ${importedTests.length} test cases!`, 'success');
                } else {
                    this.showNotification('Invalid file format', 'error');
                }
            } catch (error) {
                this.showNotification('Error parsing JSON file', 'error');
            }
        };
        reader.readAsText(file);
    }

    exportTests() {
        const dataStr = JSON.stringify(this.testCases, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `http-test-cases-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Filtering and Search
    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const methodFilter = document.getElementById('methodFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        this.filteredTestCases = this.testCases.filter(test => {
            const matchesSearch = !searchTerm || 
                test.name.toLowerCase().includes(searchTerm) ||
                test.description.toLowerCase().includes(searchTerm) ||
                test.url.toLowerCase().includes(searchTerm);
            
            const matchesMethod = !methodFilter || test.method === methodFilter;
            
            const testResult = this.testResultsCache.get(test.id);
            const matchesStatus = !statusFilter || this.getTestStatus(testResult) === statusFilter;

            return matchesSearch && matchesMethod && matchesStatus;
        });

        this.loadedCount = 0;
        this.visibleTestCases = [];
        this.loadMoreTestCases();
    }

    handleSearch(searchTerm) {
        this.applyFilters();
    }

    handleMethodFilter(method) {
        this.applyFilters();
    }

    handleStatusFilter(status) {
        this.applyFilters();
    }

    getTestStatus(result) {
        if (!result) return 'not-run';
        if (result.error) return 'error';
        if (result.success) return 'passed';
        return 'failed';
    }

    // Lazy Loading and Virtual Scrolling
    loadMoreTestCases() {
        const remainingCount = this.filteredTestCases.length - this.loadedCount;
        const loadCount = Math.min(this.batchSize, remainingCount);
        
        if (loadCount > 0) {
            const newTests = this.filteredTestCases.slice(this.loadedCount, this.loadedCount + loadCount);
            this.visibleTestCases = [...this.visibleTestCases, ...newTests];
            this.loadedCount += loadCount;
            
            this.renderTestCases();
        }
        
        this.updateLoadingIndicator();
    }

    handleScroll(event) {
        const container = event.target;
        const scrollPosition = container.scrollTop + container.clientHeight;
        const scrollHeight = container.scrollHeight;
        
        if (scrollPosition >= scrollHeight - 100) {
            this.loadMoreTestCases();
        }
    }

    updateLoadingIndicator() {
        const indicator = document.getElementById('loadingIndicator');
        const hasMoreToLoad = this.loadedCount < this.filteredTestCases.length;
        
        if (hasMoreToLoad) {
            indicator.style.display = 'flex';
        } else {
            indicator.style.display = 'none';
        }
    }

    // UI Rendering
    renderTestCases() {
        const container = document.getElementById('testCasesList');
        
        if (this.visibleTestCases.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>No test cases found</h3>
                    <p>Add your first test case or import existing ones</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.visibleTestCases.map(test => this.renderTestCard(test)).join('');
        
        // Attach event listeners
        this.attachTestCardEventListeners();
    }

    renderTestCard(test) {
        const result = this.testResultsCache.get(test.id);
        const status = this.getTestStatus(result);
        const isExpanded = document.querySelector(`[data-test-id="${test.id}"]`)?.classList.contains('expanded') || false;
        
        return `
            <div class="test-case-card ${isExpanded ? 'expanded' : ''}" data-test-id="${test.id}">
                <div class="test-case-header" onclick="testClient.toggleTestCard('${test.id}')">
                    <div class="test-case-info">
                        <div class="test-case-status ${status}"></div>
                        <div class="test-case-basic">
                            <div class="test-case-name">${this.escapeHtml(test.name)}</div>
                            <div class="test-case-description">${this.escapeHtml(test.description)}</div>
                        </div>
                        <div class="test-case-method ${test.method}">${test.method}</div>
                    </div>
                    <div class="test-case-actions">
                        <button class="btn btn-success btn-small" onclick="event.stopPropagation(); testClient.runSingleTest('${test.id}')">
                            <span class="icon">▶️</span> Run
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); testClient.editTestCase('${test.id}')">
                            <span class="icon">✏️</span> Edit
                        </button>
                        <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); testClient.deleteTestCase('${test.id}')">
                            <span class="icon">🗑️</span> Delete
                        </button>
                        <span class="expand-icon">⌄</span>
                    </div>
                </div>
                <div class="test-case-details">
                    ${this.renderTestDetails(test, result)}
                </div>
            </div>
        `;
    }

    renderTestDetails(test, result) {
        const hasResult = result !== undefined;
        
        return `
            <div class="test-details-tabs">
                <div class="test-details-tab active" data-tab="request">Request</div>
                ${hasResult ? '<div class="test-details-tab" data-tab="response">Response</div>' : ''}
                ${hasResult ? '<div class="test-details-tab" data-tab="result">Result</div>' : ''}
            </div>
            <div class="test-details-content">
                <div class="test-details-section active" data-section="request">
                    ${this.renderRequestDetails(test)}
                </div>
                ${hasResult ? `<div class="test-details-section" data-section="response">${this.renderResponseDetails(result)}</div>` : ''}
                ${hasResult ? `<div class="test-details-section" data-section="result">${this.renderResultDetails(result)}</div>` : ''}
            </div>
        `;
    }

    renderRequestDetails(test) {
        return `
            <div class="details-item">
                <div class="details-label">URL</div>
                <div class="details-value url">${this.escapeHtml(test.url)}</div>
            </div>
            <div class="details-item">
                <div class="details-label">Headers</div>
                <div class="details-value">${JSON.stringify(test.headers, null, 2)}</div>
            </div>
            ${test.body ? `
                <div class="details-item">
                    <div class="details-label">Request Body</div>
                    <div class="details-value">${this.escapeHtml(test.body)}</div>
                </div>
            ` : ''}
            <div class="details-item">
                <div class="details-label">Expected Status</div>
                <div class="details-value">${test.expectedStatus}</div>
            </div>
            ${test.expectedResponse ? `
                <div class="details-item">
                    <div class="details-label">Expected Response</div>
                    <div class="details-value">${this.escapeHtml(test.expectedResponse)}</div>
                </div>
            ` : ''}
        `;
    }

    renderResponseDetails(result) {
        if (!result.response) return '<p>No response data available</p>';
        
        return `
            <div class="details-item">
                <div class="details-label">Status Code</div>
                <div class="details-value">${result.response.status}</div>
            </div>
            <div class="details-item">
                <div class="details-label">Response Headers</div>
                <div class="details-value">${JSON.stringify(result.response.headers || {}, null, 2)}</div>
            </div>
            <div class="details-item">
                <div class="details-label">Response Body</div>
                <div class="details-value">${this.escapeHtml(result.response.body || '')}</div>
            </div>
        `;
    }

    renderResultDetails(result) {
        const statusClass = result.error ? 'error' : (result.success ? 'success' : 'failure');
        
        return `
            <div class="test-result ${statusClass}">
                <div class="result-summary">
                    <div class="result-status ${statusClass}">
                        ${result.error ? 'Error' : (result.success ? 'Passed' : 'Failed')}
                    </div>
                    <div class="result-timing">
                        Duration: ${result.duration || 0}ms
                    </div>
                </div>
                <div class="result-details">
                    ${result.error ? `
                        <div class="result-item">
                            <div class="result-item-label">Error Message</div>
                            <div class="result-item-value">${this.escapeHtml(result.error)}</div>
                        </div>
                    ` : ''}
                    ${result.validationResults ? `
                        <div class="result-item">
                            <div class="result-item-label">Validation Results</div>
                            <div class="result-item-value">${JSON.stringify(result.validationResults, null, 2)}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    attachTestCardEventListeners() {
        // Tab switching
        document.querySelectorAll('.test-details-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                const card = e.target.closest('.test-case-card');
                
                // Update active tab
                card.querySelectorAll('.test-details-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update active section
                card.querySelectorAll('.test-details-section').forEach(s => s.classList.remove('active'));
                card.querySelector(`[data-section="${tabName}"]`).classList.add('active');
            });
        });
    }

    toggleTestCard(testId) {
        const card = document.querySelector(`[data-test-id="${testId}"]`);
        if (card) {
            card.classList.toggle('expanded');
        }
    }

    editTestCase(testId) {
        const test = this.testCases.find(t => t.id === testId);
        if (test) {
            this.openTestModal(test);
        }
    }

    // Test Execution
    async runSingleTest(testId) {
        const test = this.testCases.find(t => t.id === testId);
        if (!test) return;

        this.setTestStatus(testId, 'running');
        
        try {
            const result = await this.executeTest(test);
            this.testResultsCache.set(testId, result);
            this.renderTestCases();
        } catch (error) {
            this.testResultsCache.set(testId, {
                error: error.message,
                success: false,
                duration: 0
            });
            this.renderTestCases();
        }
    }

    async runAllTests() {
        const runBtn = document.getElementById('runAllBtn');
        const originalText = runBtn.innerHTML;
        runBtn.innerHTML = '<span class="icon">⏳</span> Running...';
        runBtn.disabled = true;

        try {
            for (const test of this.visibleTestCases) {
                this.setTestStatus(test.id, 'running');
                
                try {
                    const result = await this.executeTest(test);
                    this.testResultsCache.set(test.id, result);
                } catch (error) {
                    this.testResultsCache.set(test.id, {
                        error: error.message,
                        success: false,
                        duration: 0
                    });
                }
                
                // Small delay between requests to avoid overwhelming the server
                await this.sleep(100);
            }
            
            this.renderTestCases();
            this.showNotification('All tests completed!', 'success');
        } catch (error) {
            this.showNotification('Error running tests: ' + error.message, 'error');
        } finally {
            runBtn.innerHTML = originalText;
            runBtn.disabled = false;
        }
    }

    async executeTest(test) {
        const startTime = Date.now();
        
        try {
            // Prepare request options
            const requestOptions = {
                method: test.method,
                headers: { ...this.globalConfig.commonHeaders, ...test.headers }
            };

            // Add body for methods that support it
            if (['POST', 'PUT', 'PATCH'].includes(test.method) && test.body) {
                requestOptions.body = test.body;
            }

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.globalConfig.timeout);
            requestOptions.signal = controller.signal;

            // Execute request
            const response = await fetch(test.url, requestOptions);
            clearTimeout(timeoutId);

            const duration = Date.now() - startTime;
            const responseBody = await response.text();
            
            // Parse response headers
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            const result = {
                success: response.status === test.expectedStatus,
                duration,
                response: {
                    status: response.status,
                    headers: responseHeaders,
                    body: responseBody
                },
                validationResults: {}
            };

            // Validate expected response if specified
            if (test.expectedResponse) {
                try {
                    const expectedJson = JSON.parse(test.expectedResponse);
                    const actualJson = JSON.parse(responseBody);
                    result.validationResults.bodyMatch = JSON.stringify(expectedJson) === JSON.stringify(actualJson);
                } catch {
                    result.validationResults.bodyMatch = test.expectedResponse === responseBody;
                }
                
                if (!result.validationResults.bodyMatch) {
                    result.success = false;
                }
            }

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.globalConfig.timeout}ms`);
            }
            
            throw new Error(`Network error: ${error.message}`);
        }
    }

    setTestStatus(testId, status) {
        const statusElement = document.querySelector(`[data-test-id="${testId}"] .test-case-status`);
        if (statusElement) {
            statusElement.className = `test-case-status ${status}`;
        }
    }

    clearAllResults() {
        if (confirm('Are you sure you want to clear all test results?')) {
            this.testResultsCache.clear();
            this.renderTestCases();
            this.showNotification('All results cleared!', 'success');
        }
    }

    // Utility Methods
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                transform: translateX(400px);
                transition: transform 0.3s ease;
            `;
            document.body.appendChild(notification);
        }

        // Set notification style based on type
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        // Show notification
        notification.style.transform = 'translateX(0)';

        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application when DOM is loaded
let testClient;
document.addEventListener('DOMContentLoaded', () => {
    testClient = new HTTPTestClient();
});
class HTTPTestClient {
    constructor() {
        this.testCases = [];
        this.testResults = [];
        this.selectedTestId = null;
        this.collapsedFileGroups = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFromLocalStorage();
        this.updateDisplay();
    }

    bindEvents() {
        // File input handler
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Form submission
        document.getElementById('addTestCase').addEventListener('click', () => this.addTestCaseFromForm());
        
        // Form cancellation
        document.getElementById('cancelTestCase').addEventListener('click', () => this.cancelTestCaseForm());
        
        // Test execution
        document.getElementById('runAllTests').addEventListener('click', () => this.runAllTests());
        
        // Clear functions
        document.getElementById('clearTests').addEventListener('click', () => this.clearAllTests());

        // Form validation on input
        document.getElementById('testUrl').addEventListener('input', this.validateForm);
        document.getElementById('testName').addEventListener('input', this.validateForm);

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Search functionality
        document.getElementById('searchTests').addEventListener('input', (e) => this.filterTests(e.target.value));

        // Selected test actions
        document.getElementById('runSelectedTest').addEventListener('click', () => this.runSelectedTest());
        document.getElementById('deleteSelectedTest').addEventListener('click', () => this.deleteSelectedTest());

        // Event delegation for sidebar clicks
        document.getElementById('testCasesSidebar').addEventListener('click', (e) => {
            const testItem = e.target.closest('.sidebar-test-item');
            const groupHeader = e.target.closest('.sidebar-group-header');

            if (testItem) {
                this.selectTest(testItem.dataset.id);
            } else if (groupHeader) {
                this.toggleFileGroup(groupHeader.dataset.filename);
            }
        });
    }

    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files.length) return;

        let loadedCount = 0;
        let errorCount = 0;

        for (const file of files) {
            try {
                const content = await this.readFile(file);
                const data = JSON.parse(content);
                
                // Handle different JSON structures
                if (data.test_cases && Array.isArray(data.test_cases)) {
                    // JSON with config and test_cases structure
                    if (data.config) {
                        this.loadConfig(data.config);
                    }
                    data.test_cases.forEach(testCase => {
                        if (this.validateTestCase(testCase)) {
                            const configuredTestCase = this.applyConfigToTestCase(testCase);
                            this.testCases.push({
                                id: this.generateId(),
                                ...configuredTestCase,
                                source: file.name
                            });
                            loadedCount++;
                        }
                    });
                } else if (Array.isArray(data)) {
                    // Multiple test cases in array
                    data.forEach(testCase => {
                        if (this.validateTestCase(testCase)) {
                            this.testCases.push({
                                id: this.generateId(),
                                ...testCase,
                                source: file.name
                            });
                            loadedCount++;
                        }
                    });
                } else if (this.validateTestCase(data)) {
                    // Single test case
                    this.testCases.push({
                        id: this.generateId(),
                        ...data,
                        source: file.name
                    });
                    loadedCount++;
                }
            } catch (error) {
                console.error(`Error parsing ${file.name}:`, error);
                errorCount++;
            }
        }

        this.updateDisplay();
        this.saveToLocalStorage();
        
        const status = document.getElementById('fileStatus');
        if (this.testCases.length > 0) {
            status.textContent = `Total: ${this.testCases.length} Test${this.testCases.length !== 1 ? 's' : ''}`;
            status.className = 'file-status';
        } else {
            status.textContent = 'No test cases loaded.';
            status.className = 'file-status empty';
        }
        
        if (loadedCount > 0) {
            this.showNotification(`${loadedCount} test case(s) loaded successfully.`, 'success');
        }
        
        if (errorCount > 0) {
            this.showNotification(`${errorCount} file(s) could not be loaded or parsed.`, 'error');
        }

        // Reset file input
        event.target.value = '';
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    loadConfig(config) {
        // Store config for later use
        this.config = config;
        console.log('Loaded configuration:', config);
    }

    applyConfigToTestCase(testCase) {
        // Create a new test case with config applied
        const configuredTestCase = { ...testCase };
        
        // Use description as name if name is missing
        if (!configuredTestCase.name && configuredTestCase.description) {
            configuredTestCase.name = configuredTestCase.description;
        }
        
        // Convert endpoint to full URL using base_url
        if (configuredTestCase.endpoint && this.config?.base_url) {
            configuredTestCase.url = this.config.base_url + configuredTestCase.endpoint;
            delete configuredTestCase.endpoint;
        }
        
        // Convert expected_status to expectedStatus
        if (configuredTestCase.expected_status !== undefined) {
            configuredTestCase.expectedStatus = configuredTestCase.expected_status;
            delete configuredTestCase.expected_status;
        }
        
        // Convert expected_body to expectedBody
        if (configuredTestCase.expected_body !== undefined) {
            configuredTestCase.expectedBody = configuredTestCase.expected_body;
            delete configuredTestCase.expected_body;
        }
        
        // Convert headers array format to object format
        if (Array.isArray(configuredTestCase.headers)) {
            const headersObj = {};
            configuredTestCase.headers.forEach(([key, value]) => {
                headersObj[key] = value;
            });
            configuredTestCase.headers = headersObj;
        }
        
        // Apply default headers from config
        if (this.config?.default_headers) {
            configuredTestCase.headers = {
                ...this.config.default_headers,
                ...(configuredTestCase.headers || {})
            };
        }
        
        // Apply timeout from config
        if (!configuredTestCase.timeout && this.config?.timeout_ms) {
            configuredTestCase.timeout = this.config.timeout_ms;
        }
        
        // Apply auth if configured
        if (this.config?.auth && this.config.auth.type === 'bearer' && this.config.auth.token) {
            configuredTestCase.headers = configuredTestCase.headers || {};
            if (!configuredTestCase.headers['Authorization']) {
                configuredTestCase.headers['Authorization'] = `Bearer ${this.config.auth.token}`;
            }
        }
        
        // Parse JSON string body if needed
        if (typeof configuredTestCase.body === 'string' && configuredTestCase.body.trim().startsWith('{')) {
            try {
                configuredTestCase.body = JSON.parse(configuredTestCase.body);
            } catch (e) {
                // Keep as string if JSON parsing fails
                console.warn('Failed to parse body as JSON:', e);
            }
        }
        
        // Parse JSON string expectedBody if needed
        if (typeof configuredTestCase.expectedBody === 'string' && configuredTestCase.expectedBody.trim().startsWith('{')) {
            try {
                configuredTestCase.expectedBody = JSON.parse(configuredTestCase.expectedBody);
            } catch (e) {
                // Keep as string if JSON parsing fails
                console.warn('Failed to parse expectedBody as JSON:', e);
            }
        }
        
        return configuredTestCase;
    }

    validateTestCase(testCase) {
        const hasName = (typeof testCase.name === 'string' && testCase.name.trim() !== '') || 
                       (typeof testCase.description === 'string' && testCase.description.trim() !== '');
        const hasUrl = (typeof testCase.url === 'string' && testCase.url.trim() !== '') ||
                      (typeof testCase.endpoint === 'string' && testCase.endpoint.trim() !== '');
        const hasMethod = typeof testCase.method === 'string' && testCase.method.trim() !== '';
        
        return testCase && hasName && hasUrl && hasMethod;
    }

    addTestCaseFromForm() {
        const testCase = {
            id: this.generateId(),
            name: document.getElementById('testName').value.trim(),
            method: document.getElementById('httpMethod').value,
            url: document.getElementById('testUrl').value.trim(),
            headers: this.parseJSON(document.getElementById('testHeaders').value) || {},
            body: this.parseJSON(document.getElementById('testBody').value) || document.getElementById('testBody').value.trim() || null,
            expectedStatus: parseInt(document.getElementById('expectedStatus').value) || 200,
            expectedBody: this.parseJSON(document.getElementById('expectedBody').value) || null,
            timeout: parseInt(document.getElementById('timeout').value) || 5000,
            source: 'manual'
        };

        if (!testCase.name || !testCase.url) {
            this.showNotification('Please provide both test name and URL', 'error');
            return;
        }

        try {
            new URL(testCase.url); // Validate URL
        } catch {
            this.showNotification('Please provide a valid URL', 'error');
            return;
        }

        this.testCases.push(testCase);
        this.clearForm();
        this.selectTest(testCase.id); // Select the newly created test
        this.updateDisplay();
        this.saveToLocalStorage();
        this.showNotification('Test case added successfully', 'success');
    }

    parseJSON(str) {
        if (!str.trim()) return null;
        try {
            return JSON.parse(str);
        } catch {
            return null;
        }
    }

    clearForm() {
        document.getElementById('testName').value = '';
        document.getElementById('testUrl').value = '';
        document.getElementById('testHeaders').value = '';
        document.getElementById('testBody').value = '';
        document.getElementById('expectedBody').value = '';
        document.getElementById('expectedStatus').value = '';
        document.getElementById('timeout').value = '';
        document.getElementById('httpMethod').selectedIndex = 0;
    }

    cancelTestCaseForm() {
        this.clearForm();
        this.switchTab('details');
    }

    async runAllTests() {
        if (!this.testCases.length) {
            this.showNotification('No test cases to run', 'info');
            return;
        }

        this.testResults = [];
        this.updateResultsDisplay();
        
        const runButton = document.getElementById('runAllTests');
        const originalText = runButton.textContent;
        runButton.innerHTML = '<div class="loading"></div> Running Tests...';
        runButton.disabled = true;

        let successCount = 0;
        let failureCount = 0;

        for (const testCase of this.testCases) {
            try {
                const result = await this.runSingleTest(testCase);
                this.testResults.push(result);
                if (result.success) successCount++;
                else failureCount++;
                this.updateResultsDisplay();
            } catch (error) {
                const errorResult = {
                    id: testCase.id,
                    testName: testCase.name,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                this.testResults.push(errorResult);
                failureCount++;
                this.updateResultsDisplay();
            }
        }

        runButton.textContent = originalText;
        runButton.disabled = false;

        this.showNotification(
            `Tests completed: ${successCount} passed, ${failureCount} failed`,
            successCount === this.testCases.length ? 'success' : 'info'
        );
    }

    async runSingleTest(testCase) {
        const startTime = Date.now();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), testCase.timeout);

            const requestOptions = {
                method: testCase.method,
                headers: testCase.headers || {},
                signal: controller.signal
            };

            if (testCase.body && testCase.method !== 'GET' && testCase.method !== 'HEAD') {
                if (typeof testCase.body === 'string') {
                    requestOptions.body = testCase.body;
                } else {
                    requestOptions.body = JSON.stringify(testCase.body);
                    requestOptions.headers['Content-Type'] = 'application/json';
                }
            }

            const response = await fetch(testCase.url, requestOptions);
            clearTimeout(timeoutId);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            let responseBody;
            const contentType = response.headers.get('Content-Type') || '';
            
            if (contentType.includes('application/json')) {
                try {
                    responseBody = await response.json();
                } catch {
                    responseBody = await response.text();
                }
            } else {
                responseBody = await response.text();
            }

            const success = response.status === testCase.expectedStatus;

            return {
                id: testCase.id,
                testName: testCase.name,
                success,
                status: response.status,
                expectedStatus: testCase.expectedStatus,
                responseTime,
                headers: Object.fromEntries(response.headers.entries()),
                body: responseBody,
                timestamp: new Date().toISOString(),
                url: testCase.url,
                method: testCase.method
            };

        } catch (error) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            return {
                id: testCase.id,
                testName: testCase.name,
                success: false,
                error: error.name === 'AbortError' ? 'Request timeout' : error.message,
                responseTime,
                timestamp: new Date().toISOString(),
                url: testCase.url,
                method: testCase.method
            };
        }
    }

    updateDisplay() {
        this.updateSidebar();
        this.updateMainPanel();
        this.updateTestCount();
    }

    updateTestCount() {
        const fileStatus = document.getElementById('fileStatus');
        if (this.testCases && this.testCases.length > 0) {
            fileStatus.textContent = `Total: ${this.testCases.length} Test${this.testCases.length !== 1 ? 's' : ''}`;
            fileStatus.style.display = 'inline';
        } else {
            fileStatus.style.display = 'none';
        }
    }

    updateSidebar() {
        const container = document.getElementById('testCasesSidebar');
        
        if (!this.testCases || !this.testCases.length) {
            container.innerHTML = `
                <div class="sidebar-empty-state">
                    <h4>No Test Cases</h4>
                    <p>Load JSON files or create test cases manually to get started.</p>
                </div>
            `;
            return;
        }

        const groupedByFile = this.testCases.reduce((acc, testCase) => {
            if (!testCase || typeof testCase !== 'object') {
                console.error("Invalid item in testCases array:", testCase);
                return acc;
            }
            const source = testCase.source || 'manual';
            if (!acc[source]) {
                acc[source] = [];
            }
            acc[source].push(testCase);
            return acc;
        }, {});

        let html = '';
        for (const filename in groupedByFile) {
            const isCollapsed = this.collapsedFileGroups[filename];
            const tests = groupedByFile[filename];
            
            html += `
                <div class="sidebar-group">
                    <div class="sidebar-group-header" data-filename="${filename}">
                        <span class="collapse-icon">${isCollapsed ? '▶' : '▼'}</span>
                        <span class="group-filename">${this.escapeHtml(filename)}</span>
                        <span class="group-count">${tests.length}</span>
                    </div>
                    <div class="sidebar-group-content ${isCollapsed ? 'collapsed' : ''}">
            `;

            html += tests.map(testCase => {
                if (!testCase || !testCase.id) {
                    console.error('Skipping invalid test case:', testCase);
                    return ''; // Skip rendering this invalid item
                }

                const testResult = this.testResults.find(r => r.id === testCase.id);
                const isSelected = this.selectedTestId === testCase.id;

                let statusClass = '';
                if (testResult) {
                    statusClass = testResult.success ? 'status-passed' : 'status-failed';
                }

                const endpoint = (testCase.url || '').replace(/^(?:\/\/|[^/]+)*\//, "/");
                const idPart = testCase.id || 'N/A';
                const name = testCase.name || testCase.description || 'Unnamed Test';
                const method = testCase.method || 'N/A';

                return `
                    <div class="sidebar-test-item ${isSelected ? 'selected' : ''} ${statusClass}" data-id="${testCase.id}">
                        <div class="sidebar-test-info">
                            <div class="sidebar-test-name" title="${this.escapeHtml(name)}">
                                <span class="test-case-id">${idPart}:</span> ${this.escapeHtml(name)}
                            </div>
                            <div class="sidebar-test-meta">
                                <span class="test-case-method method-${method}">${method}</span>
                                <span class="sidebar-test-endpoint" title="${this.escapeHtml(testCase.url || '')}">
                                    ${this.escapeHtml(endpoint)}
                                </span>
                            </div>
                        </div>
                        <div class="sidebar-test-actions">
                            <button class="sidebar-run-btn btn-sm" onclick="event.stopPropagation(); testClient.runSingleTestById('${testCase.id}')">▶</button>
                        </div>
                    </div>
                `;
            }).join('');

            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    updateMainPanel() {
        if (this.selectedTestId) {
            this.showTestDetails();
        } else {
            this.showWelcomeMessage();
        }
    }

    showWelcomeMessage() {
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'flex';
            document.getElementById('testDetailsPanel').style.display = 'none';
        }
    }

    showTestDetails() {
        const testCase = this.testCases.find(tc => tc.id === this.selectedTestId);
        if (!testCase) return;

        const welcomeMessage = document.getElementById('welcomeMessage');
        const testDetailsPanel = document.getElementById('testDetailsPanel');
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        if (testDetailsPanel) testDetailsPanel.style.display = 'flex';

        // Update test name
        const nameElement = document.getElementById('selectedTestName');
        if (nameElement) nameElement.textContent = testCase.name;

        // Update request details
        this.updateRequestDetails(testCase);

        // Update test results if available
        const testResult = this.testResults.find(r => r.id === testCase.id);
        if (testResult) {
            this.showTestResults(testResult);
        } else {
            document.getElementById('testResultsSection').style.display = 'none';
        }
    }

    updateRequestDetails(testCase) {
        const container = document.getElementById('requestDetails');
        container.innerHTML = `
            <div class="info-item-inline">
                <span class="test-case-method method-${testCase.method}">${testCase.method}</span>
                <span class="url-display">${this.escapeHtml(testCase.url)}</span>
            </div>
            
            ${testCase.headers && Object.keys(testCase.headers).length > 0 ? `
            <div class="info-item">
                <strong>Headers:</strong>
                <div class="code-block">${this.escapeHtml(JSON.stringify(testCase.headers, null, 2))}</div>
            </div>` : ''}
            
            ${testCase.body ? `
            <div class="info-item">
                <strong>Request Body:</strong>
                <div class="code-block">${this.escapeHtml(typeof testCase.body === 'object' ? JSON.stringify(testCase.body, null, 2) : testCase.body)}</div>
            </div>` : ''}

            ${testCase.expectedBody ? `
            <div class="info-item">
                <strong>Expected Response Body:</strong>
                <div class="code-block">${this.escapeHtml(typeof testCase.expectedBody === 'object' ? JSON.stringify(testCase.expectedBody, null, 2) : testCase.expectedBody)}</div>
            </div>` : ''}
            
            <div class="config-items">
                <div class="config-item"><strong>Timeout:</strong> ${testCase.timeout || 5000}ms</div>
                <div class="config-item"><strong>Source:</strong> ${this.escapeHtml(testCase.source)}</div>
            </div>
        `;
    }

    showTestResults(result) {
        document.getElementById('testResultsSection').style.display = 'block';
        document.getElementById('testResultContent').innerHTML = this.renderTestResult(result);
    }

    selectTest(id) {
        this.selectedTestId = id;
        this.updateDisplay();
        // Switch to details tab when selecting a test
        this.switchTab('details');
    }

    toggleFileGroup(filename) {
        this.collapsedFileGroups[filename] = !this.collapsedFileGroups[filename];
        this.updateSidebar();
        this.saveToLocalStorage();
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Update main panel content based on current state
        this.updateMainPanel();
    }

    filterTests(searchTerm) {
        const items = document.querySelectorAll('.sidebar-test-item');
        items.forEach(item => {
            const testName = item.querySelector('.sidebar-test-name').textContent.toLowerCase();
            const isVisible = testName.includes(searchTerm.toLowerCase());
            item.style.display = isVisible ? 'flex' : 'none';
        });
    }

    runSelectedTest() {
        if (this.selectedTestId) {
            this.runSingleTestById(this.selectedTestId);
        }
    }

    deleteSelectedTest() {
        if (this.selectedTestId) {
            this.deleteTestCase(this.selectedTestId);
            this.selectedTestId = null;
            this.updateDisplay();
        }
    }

    renderTestResult(result) {
        const statusClass = result.success ? 'status-passed' : 'status-failed';
        const statusText = result.success ? 'PASSED' : 'FAILED';
        
        // Get the test case to show expected body
        const testCase = this.testCases.find(tc => tc.id === result.id);
        
        return `
            <div class="info-section ${statusClass}">
                <h4>Test Results</h4>
                <div class="info-content">
                    <div class="info-item-inline">
                        <span class="test-status-badge ${statusClass}">${statusText}</span>
                        <span class="url-display">Test completed ${result.timestamp ? new Date(result.timestamp).toLocaleString() : ''}</span>
                    </div>
                    
                    <div class="config-items">
                        ${result.responseTime ? `<div class="config-item"><strong>Response Time:</strong> ${result.responseTime}ms</div>` : ''}
                        ${result.status ? `<div class="config-item"><strong>Status Code:</strong> ${result.status}</div>` : ''}
                        ${result.error ? `<div class="config-item"><strong>Error:</strong> ${this.escapeHtml(result.error)}</div>` : ''}
                    </div>
                    
                    ${result.body ? `
                    <div class="info-item">
                        <strong>Response Body:</strong>
                        <div class="code-block">${this.escapeHtml(typeof result.body === 'object' ? JSON.stringify(result.body, null, 2) : result.body)}</div>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    updateResultsDisplay() {
        // Update the sidebar to show status badges
        this.updateSidebar();
        // Update main panel if a test is selected
        if (this.selectedTestId) {
            this.updateMainPanel();
        }
    }

    async runSingleTestById(id) {
        const testCase = this.testCases.find(tc => tc.id === id);
        if (!testCase) return;

        try {
            const result = await this.runSingleTest(testCase);
            
            // Update or add result
            const existingIndex = this.testResults.findIndex(r => r.id === id);
            if (existingIndex >= 0) {
                this.testResults[existingIndex] = result;
            } else {
                this.testResults.push(result);
            }
            
            // Select the test to show details and results
            this.selectTest(id);
            
            // Update displays
            this.updateResultsDisplay();
            
            this.showNotification(
                `Test "${testCase.name}" ${result.success ? 'passed' : 'failed'}`,
                result.success ? 'success' : 'error'
            );
        } catch (error) {
            this.showNotification(`Error running test: ${error.message}`, 'error');
        }
    }

    deleteTestCase(id) {
        this.testCases = this.testCases.filter(tc => tc.id !== id);
        this.testResults = this.testResults.filter(tr => tr.id !== id);
        
        // Clear selection if the selected test was deleted
        if (this.selectedTestId === id) {
            this.selectedTestId = null;
        }
        
        this.updateDisplay();
        this.saveToLocalStorage();
        this.showNotification('Test case deleted', 'info');
    }

    clearAllTests() {
        if (this.testCases.length === 0) {
            this.showNotification('No test cases to clear', 'info');
            return;
        }
        
        this.testCases = [];
        this.testResults = [];
        this.selectedTestId = null; // Clear selection
        this.updateDisplay();
        this.saveToLocalStorage();
        this.showNotification('All test cases cleared', 'info');
        document.getElementById('fileStatus').textContent = '';
    }

    clearResults() {
        if (this.testResults.length === 0) {
            this.showNotification('No results to clear', 'info');
            return;
        }
        
        this.testResults = [];
        this.updateResultsDisplay();
        this.showNotification('All results cleared', 'info');
    }

    generateId() {
        return 'test_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('httpTestClient_testCases', JSON.stringify(this.testCases));
            localStorage.setItem('httpTestClient_collapsedGroups', JSON.stringify(this.collapsedFileGroups));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('httpTestClient_testCases');
            if (saved) {
                this.testCases = JSON.parse(saved);
            }
            const savedGroups = localStorage.getItem('httpTestClient_collapsedGroups');
            if (savedGroups) {
                this.collapsedFileGroups = JSON.parse(savedGroups);
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.testCases = [];
            this.collapsedFileGroups = {};
        }
    }

    validateForm() {
        const name = document.getElementById('testName').value.trim();
        const url = document.getElementById('testUrl').value.trim();
        const addButton = document.getElementById('addTestCase');
        
        addButton.disabled = !name || !url;
    }
}

// Initialize the application
let testClient;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        testClient = new HTTPTestClient();
    });
} else {
    testClient = new HTTPTestClient();
}
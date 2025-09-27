/**
 * HTTP API Test Client - Modern web-based API testing tool
 * Supports only example_test_suite.json format (config + test_cases)
 */
class HTTPTestClientApp {
    constructor() {
        this.testSuites = [];
        this.testResults = [];
        this.selectedTestId = null;
        this.collapsedFileGroups = {};
        this.supportedFormat = 'example_test_suite';
        this.init();
    }

    init() {
        this.bindEventHandlers();
        this.loadFromLocalStorage();
        
        // Auto-select the first test case if any were loaded from cache
        if (this.testSuites.length > 0) {
            this.selectTestCase(this.testSuites[0].id);
        }
        
        this.updateAllDisplays();
    }

    bindEventHandlers() {
        // File input handler
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Form submission
        document.getElementById('addTestCase').addEventListener('click', () => this.addTestCaseFromForm());
        
        // Form cancellation
        document.getElementById('cancelTestCase').addEventListener('click', () => this.cancelTestCaseForm());
        
        // Test execution
        document.getElementById('runAllTests').addEventListener('click', () => this.runAllTestSuites());
        
        // Clear functions
        document.getElementById('clearTests').addEventListener('click', () => this.clearAllTestSuites());

        // Form validation on input
        document.getElementById('testUrl').addEventListener('input', this.validateForm);
        document.getElementById('testName').addEventListener('input', this.validateForm);

        // Tab switching
        document.querySelectorAll('button[data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchToTab(e.target.dataset.tab));
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
                this.selectTestCase(testItem.dataset.id);
            } else if (groupHeader) {
                this.toggleFileGroup(groupHeader.dataset.filename);
            }
        });
    }

    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files.length) return;

        let loadedTestSuites = 0;
        let totalTestsLoaded = 0;
        let errorCount = 0;

        for (const file of files) {
            try {
                const content = await this.readFile(file);
                const data = JSON.parse(content);

                // Enforce only example_test_suite.json format
                if (!data.config || !data.test_cases || !Array.isArray(data.test_cases)) {
                    throw new Error(`Invalid format in ${file.name}. Only example_test_suite.json format is supported (must have 'config' and 'test_cases' properties).`);
                }

                // Load configuration
                this.loadConfiguration(data.config);

                // Process and validate test cases
                let validTestsInFile = 0;
                data.test_cases.forEach(testCase => {
                    if (this.validateTestCaseStructure(testCase)) {
                        const processedTestCase = this.processConfiguredTestCase(testCase);
                        this.testSuites.push({
                            id: this.generateUniqueId(),
                            ...processedTestCase,
                            source: file.name
                        });
                        validTestsInFile++;
                        totalTestsLoaded++;
                    }
                });

                if (validTestsInFile > 0) {
                    loadedTestSuites++;
                }

            } catch (error) {
                console.error(`Error parsing ${file.name}:`, error);
                errorCount++;
            }
        }

        // Auto-select the first test case if any were loaded
        if (this.testSuites.length > 0) {
            this.selectTestCase(this.testSuites[0].id);
        }

        this.updateAllDisplays();
        this.saveToLocalStorage();

        const status = document.getElementById('fileStatus');
        if (this.testSuites.length > 0) {
            status.textContent = `Total: ${this.testSuites.length} Test${this.testSuites.length !== 1 ? 's' : ''}`;
            status.className = 'file-status';
        } else {
            status.textContent = 'No test cases loaded.';
            status.className = 'file-status empty';
        }

        if (loadedTestSuites > 0) {
            this.showNotification(`${loadedTestSuites} test suite(s) loaded successfully (${totalTestsLoaded} tests).`, 'success');
        }

        if (errorCount > 0) {
            this.showNotification(`${errorCount} file(s) failed to load. Only example_test_suite.json format with 'config' and 'test_cases' is supported.`, 'error');
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

    loadConfiguration(config) {
        // Store configuration for test case processing
        this.config = config;
    }

    processConfiguredTestCase(testCase) {
        const processedTestCase = { ...testCase };

        this.applyNamingConventions(processedTestCase);
        this.constructFullUrl(processedTestCase);
        this.normalizeStatusFields(processedTestCase);
        this.normalizeBodyFields(processedTestCase);
        this.processHeadersFormat(processedTestCase);
        this.applyConfigurationDefaults(processedTestCase);
        this.applyTimeoutConfiguration(processedTestCase);
        this.applyAuthenticationConfig(processedTestCase);
        this.parseJsonStringFields(processedTestCase);

        return processedTestCase;
    }

    applyNamingConventions(testCase) {
        // Use description as name if name is missing
        if (!testCase.name && testCase.description) {
            testCase.name = testCase.description;
        }
    }

    constructFullUrl(testCase) {
        // Convert endpoint to full URL using base_url
        if (testCase.endpoint && this.config?.base_url) {
            testCase.url = this.config.base_url + testCase.endpoint;
            delete testCase.endpoint;
        }
    }

    normalizeStatusFields(testCase) {
        // Convert expected_status to expectedStatus
        if (testCase.expected_status !== undefined) {
            testCase.expectedStatus = testCase.expected_status;
            delete testCase.expected_status;
        }
    }

    normalizeBodyFields(testCase) {
        // Convert expected_body to expectedBody
        if (testCase.expected_body !== undefined) {
            testCase.expectedBody = testCase.expected_body;
            delete testCase.expected_body;
        }
    }

    processHeadersFormat(testCase) {
        // Convert headers array format [[key, value]] to object format
        if (Array.isArray(testCase.headers)) {
            const headersObject = {};
            testCase.headers.forEach(([key, value]) => {
                headersObject[key] = value;
            });
            testCase.headers = headersObject;
        }
    }

    applyConfigurationDefaults(testCase) {
        // Apply default headers from configuration
        if (this.config?.default_headers) {
            testCase.headers = {
                ...this.config.default_headers,
                ...(testCase.headers || {})
            };
        }
    }

    applyTimeoutConfiguration(testCase) {
        // Apply timeout from configuration
        if (!testCase.timeout && this.config?.timeout_ms) {
            testCase.timeout = this.config.timeout_ms;
        }
    }

    applyAuthenticationConfig(testCase) {
        // Apply authentication if configured
        if (this.config?.auth && this.config.auth.type === 'bearer' && this.config.auth.token) {
            testCase.headers = testCase.headers || {};
            if (!testCase.headers['Authorization']) {
                testCase.headers['Authorization'] = `Bearer ${this.config.auth.token}`;
            }
        }
    }

    parseJsonStringFields(testCase) {
        // Parse JSON string body if needed
        if (typeof testCase.body === 'string' && testCase.body.trim().startsWith('{')) {
            try {
                testCase.body = JSON.parse(testCase.body);
            } catch (e) {
                // Keep as string if JSON parsing fails
                console.warn('Failed to parse body as JSON:', e);
            }
        }

        // Parse JSON string expectedBody if needed
        if (typeof testCase.expectedBody === 'string' && testCase.expectedBody.trim().startsWith('{')) {
            try {
                testCase.expectedBody = JSON.parse(testCase.expectedBody);
            } catch (e) {
                // Keep as string if JSON parsing fails
                console.warn('Failed to parse expectedBody as JSON:', e);
            }
        }
    }

    validateTestCaseStructure(testCase) {
        const hasName = (typeof testCase.name === 'string' && testCase.name.trim() !== '') || 
                       (typeof testCase.description === 'string' && testCase.description.trim() !== '');
        const hasUrl = (typeof testCase.url === 'string' && testCase.url.trim() !== '') ||
                      (typeof testCase.endpoint === 'string' && testCase.endpoint.trim() !== '');
        const hasMethod = typeof testCase.method === 'string' && testCase.method.trim() !== '';
        
        return testCase && hasName && hasUrl && hasMethod;
    }

    addTestCaseFromForm() {
        const testCase = {
            id: this.generateUniqueId(),
            name: document.getElementById('testName').value.trim(),
            method: document.getElementById('httpMethod').value,
            url: document.getElementById('testUrl').value.trim(),
            headers: this.parseJsonString(document.getElementById('testHeaders').value) || {},
            body: this.parseJsonString(document.getElementById('testBody').value) || document.getElementById('testBody').value.trim() || null,
            expectedStatus: parseInt(document.getElementById('expectedStatus').value) || 200,
            expectedBody: this.parseJsonString(document.getElementById('expectedBody').value) || null,
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

        this.testSuites.push(testCase);
        this.clearTestForm();
        this.selectTestCase(testCase.id); // Select the newly created test
        this.updateAllDisplays();
        this.saveToLocalStorage();
        this.showNotification('Test case added successfully', 'success');
    }

    parseJsonString(str) {
        if (!str.trim()) return null;
        try {
            return JSON.parse(str);
        } catch {
            return null;
        }
    }

    clearTestForm() {
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
        this.clearTestForm();
        this.switchToTab('details');
    }

    async runAllTestSuites() {
        if (!this.testSuites.length) {
            this.showNotification('No test cases to run', 'info');
            return;
        }

        this.testResults = [];
        this.updateResultsDisplay();
        
        const runButton = document.getElementById('runAllTests');
        const originalText = runButton.textContent;
        runButton.innerHTML = '<div class="loading"></div> Running Tests...';
        runButton.disabled = true;

        let passedTests = 0;
        let failedTests = 0;

        for (const testCase of this.testSuites) {
            try {
                const result = await this.runSingleTest(testCase);
                this.testResults.push(result);
                if (result.success) passedTests++;
                else failedTests++;
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
                failedTests++;
                this.updateResultsDisplay();
            }
        }

        runButton.textContent = originalText;
        runButton.disabled = false;

        this.showNotification(
            `Tests completed: ${passedTests} passed, ${failedTests} failed`,
            passedTests === this.testSuites.length ? 'success' : 'info'
        );
    }

    async executeSingleTest(testCase) {
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

    updateAllDisplays() {
        this.updateSidebarDisplay();
        this.updateMainPanelDisplay();
        this.updateTestCountDisplay();
    }

    updateTestCountDisplay() {
        const fileStatus = document.getElementById('fileStatus');
        if (this.testSuites && this.testSuites.length > 0) {
            fileStatus.textContent = `Total: ${this.testSuites.length} Test${this.testSuites.length !== 1 ? 's' : ''}`;
            fileStatus.style.display = 'inline';
        } else {
            fileStatus.style.display = 'none';
        }
    }

    updateSidebarDisplay() {
        const container = document.getElementById('testCasesSidebar');
        
        if (!this.testSuites || !this.testSuites.length) {
            container.innerHTML = `
                <div class="sidebar-empty-state">
                    <h4>No Test Cases</h4>
                    <p>Load JSON files or create test cases manually to get started.</p>
                </div>
            `;
            return;
        }

        const groupedByFile = this.testSuites.reduce((acc, testCase) => {
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
                        <span class="badge group-count">${tests.length}</span>
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
                                <span class="badge test-case-method method-${method}">${method}</span>
                                <span class="sidebar-test-endpoint" title="${this.escapeHtml(testCase.url || '')}">
                                    ${this.escapeHtml(endpoint)}
                                </span>
                            </div>
                        </div>
                        <div class="sidebar-test-actions">
                            <button class="sidebar-run-btn" onclick="event.stopPropagation(); testClientApp.runSingleTestById('${testCase.id}')">▶</button>
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

    updateMainPanelDisplay() {
        if (this.selectedTestId) {
            this.showTestCaseDetails();
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

    showTestCaseDetails() {
        const testCase = this.testSuites.find(tc => tc.id === this.selectedTestId);
        if (!testCase) return;

        const welcomeMessage = document.getElementById('welcomeMessage');
        const testDetailsPanel = document.getElementById('testDetailsPanel');
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        if (testDetailsPanel) testDetailsPanel.style.display = 'flex';

        // Update test name, ID, and description
        const nameElement = document.getElementById('selectedTestName');
        if (nameElement) {
            let displayText = testCase.name;
            if (testCase.description && testCase.description !== testCase.name) {
                displayText += `<br><span class="test-description">${this.escapeHtml(testCase.description)}</span>`;
            }
            if (testCase.id) {
                displayText += `<br><span class="test-id">ID: ${testCase.id}</span>`;
            }
            nameElement.innerHTML = displayText;
        }

        // Add action buttons to the right side of the header
        const testHeader = document.querySelector('.test-header');
        if (testHeader) {
            // Remove existing inline buttons if any
            const existingInline = testHeader.querySelector('.inline-actions');
            if (existingInline) existingInline.remove();

            // Create new inline actions container
            const inlineActions = document.createElement('div');
            inlineActions.className = 'inline-actions';
            inlineActions.innerHTML = `
                <button id="runSelectedTest" class="btn btn-success btn-sm">Run</button>
                <button id="deleteSelectedTest" class="btn btn-danger btn-sm">Delete</button>
            `;

            // Add to header
            testHeader.appendChild(inlineActions);

            // Re-bind event listeners to the new buttons
            const runButton = inlineActions.querySelector('#runSelectedTest');
            const deleteButton = inlineActions.querySelector('#deleteSelectedTest');
            
            if (runButton) {
                runButton.addEventListener('click', () => this.runSelectedTest());
            }
            if (deleteButton) {
                deleteButton.addEventListener('click', () => this.deleteSelectedTest());
            }
        }

        // Hide the separate action buttons since they're now inline
        const testActions = document.querySelector('.test-actions');
        if (testActions) {
            testActions.style.display = 'none';
        }

        // Update request details
        this.updateRequestDetailsDisplay(testCase);

        // Update test results if available
        const testResult = this.testResults.find(r => r.id === testCase.id);
        if (testResult) {
            this.showTestResults(testResult);
        } else {
            document.getElementById('testResultsSection').style.display = 'none';
        }
    }

    updateRequestDetailsDisplay(testCase) {
        const container = document.getElementById('requestDetails');
        container.innerHTML = `
            <div class="info-item-inline">
                <span class="badge test-case-method method-${testCase.method}">${testCase.method}</span>
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

    selectTestCase(id) {
        this.selectedTestId = id;
        this.updateAllDisplays();
        // Switch to details tab when selecting a test
        this.switchToTab('details');
    }

    toggleFileGroup(filename) {
        // Toggle the collapsed state
        this.collapsedFileGroups[filename] = !this.collapsedFileGroups[filename];
        this.updateSidebarDisplay();
        this.saveToLocalStorage();
    }

    switchToTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('button[data-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Update main panel content based on current state
        this.updateMainPanelDisplay();
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
            this.removeTestCase(this.selectedTestId);
        }
    }

    renderTestResult(result) {
        const statusClass = result.success ? 'status-passed' : 'status-failed';
        const statusText = result.success ? 'PASSED' : 'FAILED';
        
        // Get the test case to show expected body
        const testCase = this.testSuites.find(tc => tc.id === result.id);
        
        return `
            <div class="info-section ${statusClass}">
                <h4>Test Results</h4>
                <div class="info-content">
                    <div class="info-item-inline">
                        <span class="badge test-status-badge ${statusClass}">${statusText}</span>
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
        this.updateSidebarDisplay();
        // Update main panel if a test is selected
        if (this.selectedTestId) {
            this.updateMainPanelDisplay();
        }
    }

    async runSingleTestById(id) {
        const testCase = this.testSuites.find(tc => tc.id === id);
        if (!testCase) return;

        try {
            const result = await this.executeSingleTest(testCase);
            
            // Update or add result
            const existingIndex = this.testResults.findIndex(r => r.id === id);
            if (existingIndex >= 0) {
                this.testResults[existingIndex] = result;
            } else {
                this.testResults.push(result);
            }
            
            // Select the test to show details and results
            this.selectTestCase(id);
            
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

    removeTestCase(id) {
        // Find the index of the test case being deleted
        const deletedIndex = this.testSuites.findIndex(tc => tc.id === id);
        
        this.testSuites = this.testSuites.filter(tc => tc.id !== id);
        this.testResults = this.testResults.filter(tr => tr.id !== id);
        
        // Auto-select the next test case if the selected test was deleted
        if (this.selectedTestId === id) {
            if (this.testSuites.length > 0) {
                // Select the test case that was originally next, or the last one if it was the last
                const nextIndex = Math.min(deletedIndex, this.testSuites.length - 1);
                this.selectedTestId = this.testSuites[nextIndex].id;
            } else {
                // No test cases remaining
                this.selectedTestId = null;
            }
        }
        
        this.updateAllDisplays();
        this.saveToLocalStorage();
        this.showNotification('Test case deleted', 'info');
    }

    clearAllTestSuites() {
        if (this.testSuites.length === 0) {
            this.showNotification('No test cases to clear', 'info');
            return;
        }
        
        this.testSuites = [];
        this.testResults = [];
        this.selectedTestId = null; // Clear selection
        this.updateAllDisplays();
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

    generateUniqueId() {
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
            localStorage.setItem('httpTestClientApp_testSuites', JSON.stringify(this.testSuites));
            localStorage.setItem('httpTestClientApp_collapsedGroups', JSON.stringify(this.collapsedFileGroups));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('httpTestClientApp_testSuites');
            if (saved) {
                this.testSuites = JSON.parse(saved);
            }
            const savedGroups = localStorage.getItem('httpTestClientApp_collapsedGroups');
            if (savedGroups) {
                this.collapsedFileGroups = JSON.parse(savedGroups);
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.testSuites = [];
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

// Initialize the HTTP Test Client Application
let testClientApp;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        testClientApp = new HTTPTestClientApp();
    });
} else {
    testClientApp = new HTTPTestClientApp();
}
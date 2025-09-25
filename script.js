class HttpTestClient {
    constructor() {
        // Configuration and state management
        this.globalConfig = this.loadGlobalConfig();
        this.testCases = [];
        this.testCache = new Map();
        this.currentPage = 0;
        this.pageSize = 20;
        this.isLoading = false;
        this.currentFilter = '';
        this.editingTestId = null;
        
        // Initialize the application
        this.init();
    }
    
    init() {
        this.initEventListeners();
        this.loadTestCases();
        this.updateStats();
        this.checkEmptyState();
        this.setupInfiniteScroll();
        
        // Load sample data if no tests exist
        if (this.testCases.length === 0) {
            this.loadSampleTests();
        }
    }
    
    // Global Configuration Management
    loadGlobalConfig() {
        const defaultConfig = {
            baseUrl: 'https://jsonplaceholder.typicode.com',
            timeout: 10000,
            sslVerify: true,
            authType: 'none',
            authToken: '',
            authUsername: '',
            authPassword: '',
            authApiKey: '',
            authApiKeyHeader: 'X-API-Key',
            commonHeaders: '{"Content-Type": "application/json", "Accept": "application/json"}'
        };
        
        try {
            const saved = localStorage.getItem('httpTestClient_config');
            return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
        } catch (error) {
            console.warn('Failed to load config from localStorage:', error);
            return defaultConfig;
        }
    }
    
    saveGlobalConfig() {
        try {
            localStorage.setItem('httpTestClient_config', JSON.stringify(this.globalConfig));
            this.showToast('Configuration saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save config:', error);
            this.showToast('Failed to save configuration', 'error');
        }
    }
    
    // Test Case Management with Lazy Loading
    loadTestCases() {
        try {
            const saved = localStorage.getItem('httpTestClient_tests');
            this.testCases = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Failed to load test cases:', error);
            this.testCases = [];
        }
    }
    
    saveTestCases() {
        try {
            localStorage.setItem('httpTestClient_tests', JSON.stringify(this.testCases));
        } catch (error) {
            console.error('Failed to save test cases:', error);
            this.showToast('Failed to save test cases', 'error');
        }
    }
    
    // Infinite Scroll and Pagination
    setupInfiniteScroll() {
        let throttleTimer = null;
        
        window.addEventListener('scroll', () => {
            if (throttleTimer) return;
            
            throttleTimer = setTimeout(() => {
                const scrollTop = window.pageYOffset;
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                
                // Load more when 200px from bottom
                if (scrollTop + windowHeight >= documentHeight - 200) {
                    this.loadMoreTests();
                }
                
                throttleTimer = null;
            }, 100);
        });
    }
    
    loadMoreTests() {
        if (this.isLoading) return;
        
        const filteredTests = this.getFilteredTests();
        const displayedCount = document.querySelectorAll('.test-card').length;
        
        if (displayedCount >= filteredTests.length) {
            document.getElementById('loadMoreContainer').style.display = 'none';
            return;
        }
        
        this.renderTestCases(true);
    }
    
    getFilteredTests() {
        if (!this.currentFilter) return this.testCases;
        
        const filter = this.currentFilter.toLowerCase();
        return this.testCases.filter(test => 
            test.name.toLowerCase().includes(filter) ||
            test.description.toLowerCase().includes(filter) ||
            test.method.toLowerCase().includes(filter) ||
            test.url.toLowerCase().includes(filter)
        );
    }
    
    // Render Test Cases as Collapsed Cards
    renderTestCases(append = false) {
        const container = document.getElementById('testCasesContainer');
        const filteredTests = this.getFilteredTests();
        
        if (!append) {
            container.innerHTML = '';
            this.currentPage = 0;
        }
        
        const startIndex = this.currentPage * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, filteredTests.length);
        const testsToRender = filteredTests.slice(startIndex, endIndex);
        
        if (testsToRender.length === 0) {
            this.checkEmptyState();
            return;
        }
        
        testsToRender.forEach(test => {
            const cardElement = this.createTestCard(test);
            container.appendChild(cardElement);
        });
        
        this.currentPage++;
        
        // Show/hide load more button
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (endIndex >= filteredTests.length) {
            loadMoreContainer.style.display = 'none';
        } else {
            loadMoreContainer.style.display = 'block';
        }
        
        this.updateStats();
        this.checkEmptyState();
    }
    
    createTestCard(test) {
        const card = document.createElement('div');
        card.className = 'test-card';
        card.dataset.testId = test.id;
        
        const cachedResult = this.testCache.get(test.id);
        const status = cachedResult ? cachedResult.status : 'pending';
        
        card.innerHTML = `
            <div class="test-card-header" onclick="httpTestClient.toggleCard('${test.id}')">
                <div class="test-card-title">
                    <h3 class="test-name">${this.escapeHtml(test.name)}</h3>
                    <div class="test-actions" onclick="event.stopPropagation();">
                        <button class="btn btn-primary" onclick="httpTestClient.runSingleTest('${test.id}')">
                            <span>▶️</span> Run
                        </button>
                        <button class="btn btn-secondary" onclick="httpTestClient.editTest('${test.id}')">
                            <span>✏️</span>
                        </button>
                        <button class="btn btn-danger" onclick="httpTestClient.deleteTest('${test.id}')">
                            <span>🗑️</span>
                        </button>
                    </div>
                </div>
                ${test.description ? `<p class="test-description">${this.escapeHtml(test.description)}</p>` : ''}
                <div class="test-meta">
                    <span class="test-method method-${test.method}">${test.method}</span>
                    <div class="test-status">
                        <span class="status-icon status-${status}"></span>
                        <span class="status-text">${this.formatStatus(status)}</span>
                    </div>
                </div>
                <div class="expand-icon">▼</div>
            </div>
            <div class="test-card-details">
                <div class="test-tabs">
                    <button class="test-tab active" onclick="httpTestClient.switchTab('${test.id}', 'request')">Request</button>
                    <button class="test-tab" onclick="httpTestClient.switchTab('${test.id}', 'response')">Response</button>
                    <button class="test-tab" onclick="httpTestClient.switchTab('${test.id}', 'result')">Result</button>
                </div>
                <div class="test-tab-content">
                    <div class="test-tab-pane active" id="request-${test.id}">
                        ${this.renderRequestDetails(test)}
                    </div>
                    <div class="test-tab-pane" id="response-${test.id}">
                        ${cachedResult ? this.renderResponseDetails(cachedResult) : '<p>No response data. Run the test first.</p>'}
                    </div>
                    <div class="test-tab-pane" id="result-${test.id}">
                        ${cachedResult ? this.renderResultDetails(cachedResult) : '<p>No result data. Run the test first.</p>'}
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }
    
    renderRequestDetails(test) {
        const fullUrl = this.buildFullUrl(test.url);
        const headers = this.mergeHeaders(test.headers);
        
        return `
            <div class="request-info">
                <h4>Request URL</h4>
                <div class="request-url">${test.method} ${this.escapeHtml(fullUrl)}</div>
            </div>
            ${Object.keys(headers).length > 0 ? `
            <div class="request-info">
                <h4>Headers</h4>
                <div class="json-display">${this.escapeHtml(JSON.stringify(headers, null, 2))}</div>
            </div>
            ` : ''}
            ${test.body ? `
            <div class="request-info">
                <h4>Request Body</h4>
                <div class="json-display">${this.escapeHtml(this.formatJson(test.body))}</div>
            </div>
            ` : ''}
            ${test.expectedStatus ? `
            <div class="request-info">
                <h4>Expected Status</h4>
                <div class="json-display">${test.expectedStatus}</div>
            </div>
            ` : ''}
        `;
    }
    
    renderResponseDetails(result) {
        return `
            <div class="response-info">
                <div class="response-metric ${result.success ? 'success' : 'error'}">
                    <span class="label">Status</span>
                    <span class="value">${result.status || 'N/A'}</span>
                </div>
                <div class="response-metric">
                    <span class="label">Time</span>
                    <span class="value">${result.responseTime || 0}ms</span>
                </div>
                <div class="response-metric">
                    <span class="label">Size</span>
                    <span class="value">${result.responseSize || 0}B</span>
                </div>
            </div>
            ${result.responseHeaders ? `
            <div class="request-info">
                <h4>Response Headers</h4>
                <div class="json-display">${this.escapeHtml(JSON.stringify(result.responseHeaders, null, 2))}</div>
            </div>
            ` : ''}
            ${result.responseBody ? `
            <div class="request-info">
                <h4>Response Body</h4>
                <div class="json-display">${this.escapeHtml(this.formatJson(result.responseBody))}</div>
            </div>
            ` : ''}
        `;
    }
    
    renderResultDetails(result) {
        return `
            <div class="response-info">
                <div class="response-metric ${result.success ? 'success' : 'error'}">
                    <span class="label">Result</span>
                    <span class="value">${result.success ? 'PASS' : 'FAIL'}</span>
                </div>
                <div class="response-metric">
                    <span class="label">Executed</span>
                    <span class="value">${new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
            </div>
            ${result.error ? `
            <div class="request-info">
                <h4>Error Details</h4>
                <div class="json-display error-message">${this.escapeHtml(result.error)}</div>
            </div>
            ` : ''}
            ${result.validationResults ? `
            <div class="request-info">
                <h4>Validation Results</h4>
                <div class="json-display">${this.escapeHtml(JSON.stringify(result.validationResults, null, 2))}</div>
            </div>
            ` : ''}
        `;
    }
    
    // Card UI Management
    toggleCard(testId) {
        const card = document.querySelector(`[data-test-id="${testId}"]`);
        if (!card) return;
        
        const isExpanded = card.classList.contains('expanded');
        
        // Collapse all other cards
        document.querySelectorAll('.test-card.expanded').forEach(c => {
            if (c !== card) {
                c.classList.remove('expanded');
            }
        });
        
        // Toggle current card
        if (isExpanded) {
            card.classList.remove('expanded');
        } else {
            card.classList.add('expanded');
            // Update response and result tabs if we have cached data
            this.updateCardTabs(testId);
        }
    }
    
    switchTab(testId, tabName) {
        // Update tab buttons
        const card = document.querySelector(`[data-test-id="${testId}"]`);
        if (!card) return;
        
        card.querySelectorAll('.test-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        card.querySelector(`.test-tab:nth-child(${tabName === 'request' ? 1 : tabName === 'response' ? 2 : 3})`).classList.add('active');
        
        // Update tab content
        card.querySelectorAll('.test-tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        card.querySelector(`#${tabName}-${testId}`).classList.add('active');
    }
    
    updateCardTabs(testId) {
        const cachedResult = this.testCache.get(testId);
        if (!cachedResult) return;
        
        const responsePane = document.getElementById(`response-${testId}`);
        const resultPane = document.getElementById(`result-${testId}`);
        
        if (responsePane) {
            responsePane.innerHTML = this.renderResponseDetails(cachedResult);
        }
        if (resultPane) {
            resultPane.innerHTML = this.renderResultDetails(cachedResult);
        }
    }
    
    // HTTP Request Execution
    async runSingleTest(testId) {
        const test = this.testCases.find(t => t.id === testId);
        if (!test) return;
        
        const card = document.querySelector(`[data-test-id="${testId}"]`);
        const statusIcon = card.querySelector('.status-icon');
        const statusText = card.querySelector('.status-text');
        
        // Update UI to show running state
        statusIcon.className = 'status-icon status-running';
        statusText.textContent = 'Running...';
        
        try {
            const result = await this.executeTest(test);
            
            // Cache the result
            this.testCache.set(testId, result);
            
            // Update UI with result
            statusIcon.className = `status-icon status-${result.success ? 'passed' : 'failed'}`;
            statusText.textContent = this.formatStatus(result.success ? 'passed' : 'failed');
            
            // Update card tabs if expanded
            if (card.classList.contains('expanded')) {
                this.updateCardTabs(testId);
            }
            
            this.updateStats();
            this.showToast(
                result.success ? 'Test passed successfully' : 'Test failed', 
                result.success ? 'success' : 'error'
            );
            
        } catch (error) {
            console.error('Test execution failed:', error);
            
            const errorResult = {
                success: false,
                error: error.message,
                timestamp: Date.now(),
                status: 'error'
            };
            
            this.testCache.set(testId, errorResult);
            statusIcon.className = 'status-icon status-failed';
            statusText.textContent = 'Error';
            
            if (card.classList.contains('expanded')) {
                this.updateCardTabs(testId);
            }
            
            this.updateStats();
            this.showToast('Test execution failed', 'error');
        }
    }
    
    async executeTest(test) {
        const startTime = performance.now();
        const fullUrl = this.buildFullUrl(test.url);
        const headers = this.mergeHeaders(test.headers);
        
        const fetchOptions = {
            method: test.method,
            headers,
        };
        
        // Add body for methods that support it
        if (['POST', 'PUT', 'PATCH'].includes(test.method) && test.body) {
            fetchOptions.body = typeof test.body === 'string' ? test.body : JSON.stringify(test.body);
        }
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), this.globalConfig.timeout);
        });
        
        try {
            const response = await Promise.race([
                fetch(fullUrl, fetchOptions),
                timeoutPromise
            ]);
            
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            // Extract response headers
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            
            // Get response body
            let responseBody;
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    responseBody = await response.json();
                } else {
                    responseBody = await response.text();
                }
            } catch (e) {
                responseBody = 'Unable to parse response body';
            }
            
            const responseSize = new Blob([JSON.stringify(responseBody)]).size;
            
            // Validate response
            const success = this.validateResponse(response, test, responseBody);
            
            return {
                success,
                status: response.status,
                statusText: response.statusText,
                responseTime,
                responseSize,
                responseHeaders,
                responseBody,
                timestamp: Date.now(),
                validationResults: {
                    statusMatch: test.expectedStatus ? response.status === test.expectedStatus : null
                }
            };
            
        } catch (error) {
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            throw {
                message: error.message,
                responseTime,
                timestamp: Date.now()
            };
        }
    }
    
    validateResponse(response, test, responseBody) {
        // Basic validation - check status code if specified
        if (test.expectedStatus && response.status !== test.expectedStatus) {
            return false;
        }
        
        // Consider 2xx status codes as successful if no specific expectation
        if (!test.expectedStatus && response.status >= 200 && response.status < 300) {
            return true;
        }
        
        return response.ok;
    }
    
    buildFullUrl(endpoint) {
        const baseUrl = this.globalConfig.baseUrl.replace(/\/$/, '');
        const url = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
        return baseUrl + url;
    }
    
    mergeHeaders(testHeaders) {
        const commonHeaders = this.parseJsonSafely(this.globalConfig.commonHeaders, {});
        const testHeadersObj = this.parseJsonSafely(testHeaders, {});
        const authHeaders = this.getAuthHeaders();
        
        return { ...commonHeaders, ...authHeaders, ...testHeadersObj };
    }
    
    getAuthHeaders() {
        const headers = {};
        
        switch (this.globalConfig.authType) {
            case 'bearer':
                if (this.globalConfig.authToken) {
                    headers.Authorization = `Bearer ${this.globalConfig.authToken}`;
                }
                break;
            case 'basic':
                if (this.globalConfig.authUsername && this.globalConfig.authPassword) {
                    const credentials = btoa(`${this.globalConfig.authUsername}:${this.globalConfig.authPassword}`);
                    headers.Authorization = `Basic ${credentials}`;
                }
                break;
            case 'apikey':
                if (this.globalConfig.authApiKey) {
                    const headerName = this.globalConfig.authApiKeyHeader || 'X-API-Key';
                    headers[headerName] = this.globalConfig.authApiKey;
                }
                break;
        }
        
        return headers;
    }
    
    // Batch Operations
    async runAllTests() {
        const filteredTests = this.getFilteredTests();
        if (filteredTests.length === 0) {
            this.showToast('No tests to run', 'info');
            return;
        }
        
        const runAllBtn = document.getElementById('runAllBtn');
        runAllBtn.disabled = true;
        runAllBtn.innerHTML = '<span>⏳</span> Running...';
        
        let passed = 0;
        let failed = 0;
        
        // Run tests sequentially to avoid overwhelming the server
        for (const test of filteredTests) {
            try {
                await this.runSingleTest(test.id);
                const result = this.testCache.get(test.id);
                if (result && result.success) {
                    passed++;
                } else {
                    failed++;
                }
                
                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                failed++;
            }
        }
        
        runAllBtn.disabled = false;
        runAllBtn.innerHTML = '<span>▶️</span> Run All';
        
        this.showToast(
            `Batch execution completed: ${passed} passed, ${failed} failed`,
            passed === filteredTests.length ? 'success' : failed === filteredTests.length ? 'error' : 'info'
        );
    }
    
    clearAllResults() {
        this.testCache.clear();
        
        // Update all cards to pending state
        document.querySelectorAll('.test-card').forEach(card => {
            const statusIcon = card.querySelector('.status-icon');
            const statusText = card.querySelector('.status-text');
            statusIcon.className = 'status-icon status-pending';
            statusText.textContent = 'Pending';
            
            // Clear response and result tabs
            const testId = card.dataset.testId;
            const responsePane = document.getElementById(`response-${testId}`);
            const resultPane = document.getElementById(`result-${testId}`);
            
            if (responsePane) {
                responsePane.innerHTML = '<p>No response data. Run the test first.</p>';
            }
            if (resultPane) {
                resultPane.innerHTML = '<p>No result data. Run the test first.</p>';
            }
        });
        
        this.updateStats();
        this.showToast('All test results cleared', 'info');
    }
    
    // Test CRUD Operations
    addTest(testData) {
        const test = {
            id: this.generateId(),
            name: testData.name,
            description: testData.description || '',
            method: testData.method,
            url: testData.url,
            headers: testData.headers || '',
            body: testData.body || '',
            expectedStatus: testData.expectedStatus || null,
            createdAt: Date.now()
        };
        
        this.testCases.unshift(test);
        this.saveTestCases();
        this.renderTestCases();
        this.showToast('Test case added successfully', 'success');
    }
    
    updateTest(testId, testData) {
        const index = this.testCases.findIndex(t => t.id === testId);
        if (index === -1) return;
        
        this.testCases[index] = {
            ...this.testCases[index],
            ...testData,
            updatedAt: Date.now()
        };
        
        this.saveTestCases();
        this.renderTestCases();
        this.showToast('Test case updated successfully', 'success');
    }
    
    deleteTest(testId) {
        if (!confirm('Are you sure you want to delete this test case?')) return;
        
        this.testCases = this.testCases.filter(t => t.id !== testId);
        this.testCache.delete(testId);
        this.saveTestCases();
        this.renderTestCases();
        this.showToast('Test case deleted', 'info');
    }
    
    editTest(testId) {
        const test = this.testCases.find(t => t.id === testId);
        if (!test) return;
        
        this.editingTestId = testId;
        this.openTestModal(test);
    }
    
    // UI Event Handlers
    initEventListeners() {
        // Global Configuration
        document.getElementById('configBtn').addEventListener('click', () => this.openConfigModal());
        document.getElementById('configForm').addEventListener('submit', (e) => this.handleConfigSubmit(e));
        document.getElementById('resetConfigBtn').addEventListener('click', () => this.resetConfig());
        document.getElementById('authType').addEventListener('change', (e) => this.handleAuthTypeChange(e));
        
        // Test Management
        document.getElementById('addTestBtn').addEventListener('click', () => this.openTestModal());
        document.getElementById('emptyAddTestBtn').addEventListener('click', () => this.openTestModal());
        document.getElementById('testForm').addEventListener('submit', (e) => this.handleTestSubmit(e));
        document.getElementById('cancelTestBtn').addEventListener('click', () => this.closeTestModal());
        
        // Import/Export
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('exportBtn').addEventListener('click', () => this.exportTests());
        
        // Search and Filtering
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        
        // Batch Operations
        document.getElementById('runAllBtn').addEventListener('click', () => this.runAllTests());
        document.getElementById('clearResultsBtn').addEventListener('click', () => this.clearAllResults());
        
        // Load More
        document.getElementById('loadMoreBtn').addEventListener('click', () => this.loadMoreTests());
        
        // Modal Controls
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });
        
        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }
    
    openConfigModal() {
        const modal = document.getElementById('configModal');
        
        // Populate form with current config
        document.getElementById('baseUrl').value = this.globalConfig.baseUrl;
        document.getElementById('timeout').value = this.globalConfig.timeout;
        document.getElementById('sslVerify').checked = this.globalConfig.sslVerify;
        document.getElementById('authType').value = this.globalConfig.authType;
        document.getElementById('commonHeaders').value = this.globalConfig.commonHeaders;
        
        this.handleAuthTypeChange({ target: { value: this.globalConfig.authType } });
        this.showModal(modal);
    }
    
    handleConfigSubmit(e) {
        e.preventDefault();
        
        // Validate common headers JSON
        const commonHeaders = document.getElementById('commonHeaders').value.trim();
        if (commonHeaders && !this.isValidJson(commonHeaders)) {
            this.showToast('Invalid JSON format in common headers', 'error');
            return;
        }
        
        // Update configuration
        this.globalConfig = {
            ...this.globalConfig,
            baseUrl: document.getElementById('baseUrl').value.trim(),
            timeout: parseInt(document.getElementById('timeout').value),
            sslVerify: document.getElementById('sslVerify').checked,
            authType: document.getElementById('authType').value,
            commonHeaders: commonHeaders || '{}'
        };
        
        // Get auth-specific fields
        const authFields = document.getElementById('authFields');
        const tokenInput = authFields.querySelector('#authToken');
        const usernameInput = authFields.querySelector('#authUsername');
        const passwordInput = authFields.querySelector('#authPassword');
        const apiKeyInput = authFields.querySelector('#authApiKey');
        const apiKeyHeaderInput = authFields.querySelector('#authApiKeyHeader');
        
        if (tokenInput) this.globalConfig.authToken = tokenInput.value.trim();
        if (usernameInput) this.globalConfig.authUsername = usernameInput.value.trim();
        if (passwordInput) this.globalConfig.authPassword = passwordInput.value.trim();
        if (apiKeyInput) this.globalConfig.authApiKey = apiKeyInput.value.trim();
        if (apiKeyHeaderInput) this.globalConfig.authApiKeyHeader = apiKeyHeaderInput.value.trim();
        
        this.saveGlobalConfig();
        this.closeModal(document.getElementById('configModal'));
    }
    
    handleAuthTypeChange(e) {
        const authType = e.target.value;
        const authFields = document.getElementById('authFields');
        
        let fieldsHtml = '';
        
        switch (authType) {
            case 'bearer':
                fieldsHtml = `
                    <div class="form-group">
                        <label for="authToken">Bearer Token:</label>
                        <input type="text" id="authToken" value="${this.globalConfig.authToken || ''}" class="form-control" placeholder="Enter your bearer token">
                    </div>
                `;
                break;
            case 'basic':
                fieldsHtml = `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="authUsername">Username:</label>
                            <input type="text" id="authUsername" value="${this.globalConfig.authUsername || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="authPassword">Password:</label>
                            <input type="password" id="authPassword" value="${this.globalConfig.authPassword || ''}" class="form-control">
                        </div>
                    </div>
                `;
                break;
            case 'apikey':
                fieldsHtml = `
                    <div class="form-group">
                        <label for="authApiKey">API Key:</label>
                        <input type="text" id="authApiKey" value="${this.globalConfig.authApiKey || ''}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="authApiKeyHeader">Header Name:</label>
                        <input type="text" id="authApiKeyHeader" value="${this.globalConfig.authApiKeyHeader || 'X-API-Key'}" class="form-control" placeholder="X-API-Key">
                    </div>
                `;
                break;
        }
        
        authFields.innerHTML = fieldsHtml;
        authFields.className = fieldsHtml ? 'auth-fields show' : 'auth-fields';
    }
    
    resetConfig() {
        if (!confirm('Reset all configuration to defaults?')) return;
        
        this.globalConfig = this.loadGlobalConfig();
        localStorage.removeItem('httpTestClient_config');
        this.closeModal(document.getElementById('configModal'));
        this.showToast('Configuration reset to defaults', 'info');
    }
    
    openTestModal(test = null) {
        const modal = document.getElementById('testModal');
        const title = document.getElementById('testModalTitle');
        
        if (test) {
            title.textContent = 'Edit Test Case';
            document.getElementById('testName').value = test.name;
            document.getElementById('testDescription').value = test.description;
            document.getElementById('testMethod').value = test.method;
            document.getElementById('testUrl').value = test.url;
            document.getElementById('testHeaders').value = test.headers;
            document.getElementById('testBody').value = test.body;
            document.getElementById('expectedStatus').value = test.expectedStatus || '';
        } else {
            title.textContent = 'Add New Test Case';
            document.getElementById('testForm').reset();
            document.getElementById('expectedStatus').value = '200';
            this.editingTestId = null;
        }
        
        this.showModal(modal);
    }
    
    handleTestSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const testData = {
            name: formData.get('testName') || document.getElementById('testName').value,
            description: formData.get('testDescription') || document.getElementById('testDescription').value,
            method: formData.get('testMethod') || document.getElementById('testMethod').value,
            url: formData.get('testUrl') || document.getElementById('testUrl').value,
            headers: formData.get('testHeaders') || document.getElementById('testHeaders').value,
            body: formData.get('testBody') || document.getElementById('testBody').value,
            expectedStatus: parseInt(formData.get('expectedStatus') || document.getElementById('expectedStatus').value) || null
        };
        
        // Validate JSON fields
        if (testData.headers && !this.isValidJson(testData.headers)) {
            this.showToast('Invalid JSON format in headers', 'error');
            return;
        }
        
        if (testData.body && !this.isValidJson(testData.body)) {
            this.showToast('Invalid JSON format in request body', 'error');
            return;
        }
        
        if (this.editingTestId) {
            this.updateTest(this.editingTestId, testData);
        } else {
            this.addTest(testData);
        }
        
        this.closeTestModal();
    }
    
    closeTestModal() {
        this.closeModal(document.getElementById('testModal'));
        this.editingTestId = null;
    }
    
    handleFileImport(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.importTestCases(data);
                } catch (error) {
                    this.showToast(`Failed to parse ${file.name}: ${error.message}`, 'error');
                }
            };
            reader.readAsText(file);
        });
        
        // Reset file input
        e.target.value = '';
    }
    
    importTestCases(data) {
        let imported = 0;
        const testsArray = Array.isArray(data) ? data : [data];
        
        testsArray.forEach(testData => {
            if (this.validateTestData(testData)) {
                // Apply global defaults to imported tests
                const test = {
                    ...testData,
                    id: this.generateId(),
                    createdAt: Date.now()
                };
                
                this.testCases.unshift(test);
                imported++;
            }
        });
        
        if (imported > 0) {
            this.saveTestCases();
            this.renderTestCases();
            this.showToast(`Imported ${imported} test case(s)`, 'success');
        } else {
            this.showToast('No valid test cases found in the file', 'warning');
        }
    }
    
    validateTestData(data) {
        return data && 
               typeof data.name === 'string' && 
               typeof data.method === 'string' && 
               typeof data.url === 'string';
    }
    
    exportTests() {
        if (this.testCases.length === 0) {
            this.showToast('No test cases to export', 'info');
            return;
        }
        
        const dataStr = JSON.stringify(this.testCases, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `http-test-cases-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Test cases exported successfully', 'success');
    }
    
    handleSearch(e) {
        this.currentFilter = e.target.value.trim();
        this.currentPage = 0;
        this.renderTestCases();
    }
    
    // Sample Data
    loadSampleTests() {
        const sampleTests = [
            {
                id: this.generateId(),
                name: 'Get All Posts',
                description: 'Retrieve all blog posts from JSONPlaceholder',
                method: 'GET',
                url: '/posts',
                headers: '',
                body: '',
                expectedStatus: 200,
                createdAt: Date.now()
            },
            {
                id: this.generateId(),
                name: 'Get Single Post',
                description: 'Retrieve a specific blog post by ID',
                method: 'GET',
                url: '/posts/1',
                headers: '',
                body: '',
                expectedStatus: 200,
                createdAt: Date.now()
            },
            {
                id: this.generateId(),
                name: 'Create New Post',
                description: 'Create a new blog post with title and body',
                method: 'POST',
                url: '/posts',
                headers: '{"Content-Type": "application/json"}',
                body: '{"title": "My New Post", "body": "This is the content of my new post.", "userId": 1}',
                expectedStatus: 201,
                createdAt: Date.now()
            },
            {
                id: this.generateId(),
                name: 'Update Post',
                description: 'Update an existing blog post',
                method: 'PUT',
                url: '/posts/1',
                headers: '{"Content-Type": "application/json"}',
                body: '{"id": 1, "title": "Updated Post Title", "body": "Updated post content.", "userId": 1}',
                expectedStatus: 200,
                createdAt: Date.now()
            },
            {
                id: this.generateId(),
                name: 'Delete Post',
                description: 'Delete a blog post by ID',
                method: 'DELETE',
                url: '/posts/1',
                headers: '',
                body: '',
                expectedStatus: 200,
                createdAt: Date.now()
            }
        ];
        
        this.testCases = sampleTests;
        this.saveTestCases();
        this.renderTestCases();
    }
    
    // Utility Methods
    generateId() {
        return 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatJson(jsonString) {
        try {
            return JSON.stringify(JSON.parse(jsonString), null, 2);
        } catch (e) {
            return jsonString;
        }
    }
    
    isValidJson(jsonString) {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    parseJsonSafely(jsonString, defaultValue = {}) {
        try {
            return jsonString ? JSON.parse(jsonString) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
    
    formatStatus(status) {
        const statusMap = {
            pending: 'Pending',
            running: 'Running...',
            passed: 'Passed',
            failed: 'Failed',
            error: 'Error'
        };
        return statusMap[status] || status;
    }
    
    updateStats() {
        const total = this.testCases.length;
        const displayed = document.querySelectorAll('.test-card').length;
        
        let passed = 0;
        let failed = 0;
        
        this.testCache.forEach(result => {
            if (result.success) {
                passed++;
            } else {
                failed++;
            }
        });
        
        document.getElementById('totalTests').textContent = total;
        document.getElementById('displayedTests').textContent = displayed;
        document.getElementById('passedTests').textContent = passed;
        document.getElementById('failedTests').textContent = failed;
    }
    
    checkEmptyState() {
        const container = document.getElementById('testCasesContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (this.getFilteredTests().length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            container.style.display = 'grid';
            emptyState.style.display = 'none';
        }
    }
    
    // Modal Management
    showModal(modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal(modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
    
    // Toast Notifications
    showToast(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-title">${this.getToastTitle(type)}</div>
            <div class="toast-message">${this.escapeHtml(message)}</div>
        `;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        // Remove toast after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
        
        // Remove on click
        toast.addEventListener('click', () => toast.remove());
    }
    
    getToastTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || 'Notification';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.httpTestClient = new HttpTestClient();
});
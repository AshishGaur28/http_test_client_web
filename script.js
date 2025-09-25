class HTTPTestClient {
    constructor() {
        this.testCases = [];
        this.testResults = [];
        this.globalSettings = this.getDefaultGlobalSettings();
        this.init();
    }

    getDefaultGlobalSettings() {
        return {
            baseUrl: '',
            timeout: 5000,
            expectedStatus: 200,
            headers: {}
        };
    }

    init() {
        this.bindEvents();
        this.loadFromLocalStorage();
        this.loadGlobalSettingsFromStorage();
        this.updateGlobalSettingsDisplay();
        this.updateDisplay();
    }

    bindEvents() {
        // File input handler
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Form submission
        document.getElementById('addTestCase').addEventListener('click', () => this.addTestCaseFromForm());
        
        // Test execution
        document.getElementById('runAllTests').addEventListener('click', () => this.runAllTests());
        
        // Clear functions
        document.getElementById('clearTests').addEventListener('click', () => this.clearAllTests());
        document.getElementById('clearResults').addEventListener('click', () => this.clearResults());

        // Global settings controls
        document.getElementById('saveGlobalSettings').addEventListener('click', () => this.saveGlobalSettings());
        document.getElementById('resetGlobalSettings').addEventListener('click', () => this.resetGlobalSettings());
        document.getElementById('clearGlobalSettings').addEventListener('click', () => this.clearGlobalSettings());

        // Form validation on input
        document.getElementById('testUrl').addEventListener('input', this.validateForm);
        document.getElementById('testName').addEventListener('input', this.validateForm);
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
                
                if (Array.isArray(data)) {
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
        if (loadedCount > 0) {
            status.textContent = `✅ Loaded ${loadedCount} test case(s)`;
            status.style.color = '#28a745';
            this.showNotification(`Successfully loaded ${loadedCount} test case(s)`, 'success');
        }
        if (errorCount > 0) {
            this.showNotification(`Failed to load ${errorCount} file(s)`, 'error');
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

    validateTestCase(testCase) {
        return testCase && 
               typeof testCase.name === 'string' &&
               typeof testCase.url === 'string' &&
               typeof testCase.method === 'string' &&
               testCase.name.trim() !== '' &&
               testCase.url.trim() !== '';
    }

    addTestCaseFromForm() {
        const testCase = {
            id: this.generateId(),
            name: document.getElementById('testName').value.trim(),
            method: document.getElementById('httpMethod').value,
            url: document.getElementById('testUrl').value.trim(),
            headers: this.parseJSON(document.getElementById('testHeaders').value) || {},
            body: document.getElementById('testBody').value.trim() || null,
            expectedStatus: parseInt(document.getElementById('expectedStatus').value) || null,
            timeout: parseInt(document.getElementById('timeout').value) || null,
            source: 'manual'
        };

        if (!testCase.name || !testCase.url) {
            this.showNotification('Please provide both test name and URL', 'error');
            return;
        }

        // Merge with global settings
        const mergedTestCase = this.mergeWithGlobalSettings(testCase);

        try {
            new URL(mergedTestCase.url); // Validate the final URL
        } catch {
            this.showNotification('Please provide a valid URL or check your global base URL settings', 'error');
            return;
        }

        this.testCases.push(mergedTestCase);
        this.clearForm();
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
        document.getElementById('expectedStatus').value = '';
        document.getElementById('timeout').value = '';
        document.getElementById('httpMethod').selectedIndex = 0;
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
        this.updateTestCasesList();
        this.updateResultsDisplay();
    }

    updateTestCasesList() {
        const container = document.getElementById('testCasesList');
        
        if (!this.testCases.length) {
            container.innerHTML = '<div class="empty-state">No test cases loaded. Upload JSON files or create test cases manually.</div>';
            return;
        }

        container.innerHTML = this.testCases.map(testCase => `
            <div class="test-case-item" data-id="${testCase.id}">
                <div class="test-case-header">
                    <div class="test-case-title">${this.escapeHtml(testCase.name)}</div>
                    <span class="test-case-method method-${testCase.method}">${testCase.method}</span>
                </div>
                <div class="test-case-details">
                    <div class="test-case-url">${this.escapeHtml(testCase.url)}</div>
                    ${testCase.expectedStatus ? `<div>Expected Status: ${testCase.expectedStatus}</div>` : ''}
                    ${testCase.timeout ? `<div>Timeout: ${testCase.timeout}ms</div>` : ''}
                    <div>Source: ${this.escapeHtml(testCase.source)}</div>
                </div>
                <div class="test-case-controls">
                    <button class="btn btn-primary" onclick="testClient.runSingleTestById('${testCase.id}')">▶️ Run Test</button>
                    <button class="btn btn-danger" onclick="testClient.deleteTestCase('${testCase.id}')">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    updateResultsDisplay() {
        const container = document.getElementById('testResults');
        const summary = document.getElementById('resultsSummary');

        if (!this.testResults.length) {
            container.innerHTML = '<div class="empty-state">No test results yet. Run some tests to see results here.</div>';
            summary.textContent = '';
            return;
        }

        const successCount = this.testResults.filter(r => r.success).length;
        const failureCount = this.testResults.length - successCount;
        
        summary.innerHTML = `
            <span style="color: #28a745;">✅ ${successCount} passed</span> | 
            <span style="color: #dc3545;">❌ ${failureCount} failed</span> | 
            <span>Total: ${this.testResults.length}</span>
        `;

        container.innerHTML = this.testResults.map(result => {
            const statusClass = result.success ? 'success' : 'failure';
            const statusText = result.success ? 'PASSED' : 'FAILED';
            
            return `
                <div class="test-result ${statusClass}">
                    <div class="result-header">
                        <div class="result-title">${this.escapeHtml(result.testName)}</div>
                        <span class="result-status status-${statusClass}">${statusText}</span>
                    </div>
                    <div class="result-details">
                        <div class="result-section">
                            <h4>Request Details</h4>
                            <div><strong>Method:</strong> ${result.method}</div>
                            <div><strong>URL:</strong> ${this.escapeHtml(result.url)}</div>
                            <div><strong>Response Time:</strong> ${result.responseTime}ms</div>
                            <div><strong>Timestamp:</strong> ${new Date(result.timestamp).toLocaleString()}</div>
                        </div>
                        
                        ${result.status ? `
                            <div class="result-section">
                                <h4>Response Status</h4>
                                <div><strong>Actual:</strong> ${result.status}</div>
                                <div><strong>Expected:</strong> ${result.expectedStatus}</div>
                            </div>
                        ` : ''}
                        
                        ${result.error ? `
                            <div class="result-section">
                                <h4>Error</h4>
                                <div style="color: #dc3545; font-family: monospace;">${this.escapeHtml(result.error)}</div>
                            </div>
                        ` : ''}
                        
                        ${result.headers ? `
                            <div class="result-section">
                                <h4>Response Headers</h4>
                                <div class="response-body">
                                    <pre><code class="language-json">${this.escapeHtml(JSON.stringify(result.headers, null, 2))}</code></pre>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${result.body ? `
                            <div class="result-section">
                                <h4>Response Body</h4>
                                <div class="response-body">
                                    <pre><code class="language-json">${this.escapeHtml(typeof result.body === 'object' ? JSON.stringify(result.body, null, 2) : result.body)}</code></pre>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Highlight code syntax
        if (window.Prism) {
            Prism.highlightAll();
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
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.testCases = [];
        }
    }

    validateForm() {
        const name = document.getElementById('testName').value.trim();
        const url = document.getElementById('testUrl').value.trim();
        const addButton = document.getElementById('addTestCase');
        
        addButton.disabled = !name || !url;
    }

    // Global Settings Methods
    saveGlobalSettings() {
        const baseUrl = document.getElementById('globalBaseUrl').value.trim();
        const timeout = parseInt(document.getElementById('globalTimeout').value);
        const expectedStatus = parseInt(document.getElementById('globalExpectedStatus').value);
        const headersText = document.getElementById('globalHeaders').value.trim();
        
        let headers = {};
        if (headersText) {
            headers = this.parseJSON(headersText);
            if (!headers) {
                this.showNotification('Invalid JSON format in global headers', 'error');
                return;
            }
        }

        this.globalSettings = {
            baseUrl: baseUrl,
            timeout: timeout || 5000,
            expectedStatus: expectedStatus || 200,
            headers: headers
        };

        this.saveGlobalSettingsToStorage();
        this.showNotification('Global settings saved successfully', 'success');
    }

    resetGlobalSettings() {
        this.globalSettings = this.getDefaultGlobalSettings();
        this.updateGlobalSettingsDisplay();
        this.saveGlobalSettingsToStorage();
        this.showNotification('Global settings reset to defaults', 'info');
    }

    clearGlobalSettings() {
        this.globalSettings = {
            baseUrl: '',
            timeout: 0,
            expectedStatus: 0,
            headers: {}
        };
        this.updateGlobalSettingsDisplay();
        this.saveGlobalSettingsToStorage();
        this.showNotification('Global settings cleared', 'info');
    }

    updateGlobalSettingsDisplay() {
        document.getElementById('globalBaseUrl').value = this.globalSettings.baseUrl || '';
        document.getElementById('globalTimeout').value = this.globalSettings.timeout || '';
        document.getElementById('globalExpectedStatus').value = this.globalSettings.expectedStatus || '';
        document.getElementById('globalHeaders').value = this.globalSettings.headers && Object.keys(this.globalSettings.headers).length > 0 
            ? JSON.stringify(this.globalSettings.headers, null, 2) 
            : '';
    }

    saveGlobalSettingsToStorage() {
        try {
            localStorage.setItem('httpTestClient_globalSettings', JSON.stringify(this.globalSettings));
        } catch (error) {
            console.error('Error saving global settings to localStorage:', error);
        }
    }

    loadGlobalSettingsFromStorage() {
        try {
            const saved = localStorage.getItem('httpTestClient_globalSettings');
            if (saved) {
                this.globalSettings = { ...this.getDefaultGlobalSettings(), ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Error loading global settings from localStorage:', error);
            this.globalSettings = this.getDefaultGlobalSettings();
        }
    }

    // Helper method to merge global settings with individual test case settings
    mergeWithGlobalSettings(testCase) {
        const merged = { ...testCase };

        // Merge base URL if testCase URL is relative
        if (this.globalSettings.baseUrl && merged.url && !merged.url.startsWith('http')) {
            merged.url = this.globalSettings.baseUrl.replace(/\/$/, '') + '/' + merged.url.replace(/^\//, '');
        }

        // Use global timeout if not specified
        if (!merged.timeout && this.globalSettings.timeout) {
            merged.timeout = this.globalSettings.timeout;
        }

        // Use global expected status if not specified
        if (!merged.expectedStatus && this.globalSettings.expectedStatus) {
            merged.expectedStatus = this.globalSettings.expectedStatus;
        }

        // Merge headers - global headers first, then test-specific headers override
        if (this.globalSettings.headers && Object.keys(this.globalSettings.headers).length > 0) {
            merged.headers = { ...this.globalSettings.headers, ...merged.headers };
        }

        return merged;
    }
}

// Initialize the application
let testClient;
document.addEventListener('DOMContentLoaded', () => {
    testClient = new HTTPTestClient();
});
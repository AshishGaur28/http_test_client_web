# HTTP API Test Client Web

A modern, feature-rich web-based HTTP API test client that allows you to create, manage, and execute HTTP test cases with an intuitive user interface.

## Features

### 🔧 Global Configuration Panel
- Set global defaults for base URL, timeout, SSL settings, and authentication
- Support for multiple authentication types (Bearer Token, Basic Auth, API Key)
- Configure common headers that apply to all test cases
- Persistent configuration stored in browser's local storage
- Per-test case override capabilities

### ⚡ Efficient Loading and Caching
- Lazy loading for large test suites
- Infinite scroll with virtualized list rendering
- Intelligent caching of previously loaded test cases
- Load test cases on-demand for better performance

### 📋 Collapsed Test Case Cards
- Clean, compact view showing essential information (name, method, status)
- Expandable cards revealing full request details and test results
- Color-coded HTTP method badges for quick identification
- Real-time status indicators (pending, running, success, failure)

### 📊 Contextual Details and Test Reports
- Tabbed interface within expanded cards (Request, Response, Config)
- Comprehensive test result display with timing and status information
- Error details and response data visualization
- Inline test result viewing without separate panels

### 🔍 Advanced Features
- Real-time search and filtering across all test cases
- Import/Export test suites in JSON format
- Bulk test execution with "Run All Tests" functionality
- Individual test case management (add, edit, delete)
- Responsive design for desktop and mobile use

## Getting Started

### Prerequisites
- Modern web browser with ES6+ support
- Local web server (for development) or any HTTP server

### Installation
1. Clone or download the repository
2. Serve the files using any HTTP server:
   ```bash
   # Using Python (recommended for development)
   python3 -m http.server 8000
   
   # Using Node.js http-server
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser

### Usage

#### Setting Up Global Configuration
1. Click the "⚙️ Global Config" button in the top-right corner
2. Configure your API base URL, timeout, authentication, and common headers
3. Save the configuration - it will be applied to all new test cases

#### Creating Test Cases
1. Click "➕ Add Test Case" to create a new test
2. Fill in the test details:
   - Name and description
   - HTTP method and URL
   - Headers (JSON format)
   - Request body (for POST/PUT requests)
   - Expected status code and response
3. Save the test case

#### Running Tests
- Click "Run" on individual test cases to execute them
- Use "▶️ Run All Tests" to execute all visible test cases
- Expand test cards to view detailed results
- Switch between Request, Response, and Config tabs for different views

#### Managing Test Suites
- **Export**: Click "💾 Export Test Suite" to download your tests as JSON
- **Import**: Click "📁 Import Test Suite" to load tests from a JSON file
- **Search**: Use the search box to filter test cases by name, method, or URL

## File Structure

```
http_test_client_web/
├── index.html          # Main HTML structure
├── script.js           # JavaScript functionality
├── styles.css          # CSS styling
└── README.md           # Documentation
```

## Technical Details

### Architecture
- **Pure HTML/CSS/JavaScript** - No external dependencies
- **Local Storage Persistence** - Configuration and test cases are saved locally
- **Responsive Design** - Works on desktop and mobile devices
- **Modern ES6+ Features** - Uses async/await, classes, and modern JavaScript

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Data Storage
- Global configuration: `httpTestClient_globalConfig`
- Test cases: `httpTestClient_testCases`

All data is stored in browser's localStorage and persists between sessions.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test thoroughly across different browsers
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

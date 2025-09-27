# HTTP API Test Client Web

A modern, interactive web-based HTTP API testing tool with a clean, professional interface. Load test cases from JSON files, execute HTTP requests, view detailed responses, and manage your API tests all from your browser.

## 🚀 Features

- **Load Test Cases from JSON**: Import multiple test cases from JSON files
- **Manual Test Creation**: Create test cases using the built-in form interface
- **HTTP Methods Support**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Detailed Response Display**: View response status, headers, and body with syntax highlighting
- **Test Management**: Edit, delete, and organize your test cases
- **Batch Test Execution**: Run all tests at once or individual tests
- **Response Time Tracking**: Monitor API performance
- **Local Storage**: Automatically save your test cases locally
- **Modern UI**: Clean, professional interface with responsive design
- **Error Handling**: Comprehensive error reporting and validation

## 📁 Getting Started

1. **Open the Application**: Simply open `index.html` in your web browser
2. **Load Sample Tests**: Use the provided sample JSON files:
   - `sample-tests.json` - JSONPlaceholder API tests
   - `httpbin-tests.json` - HTTPBin service tests

## 🔧 Usage

### Loading Test Cases from JSON

1. Click the "📁 Load JSON Test Cases" button
2. Select one or more JSON files containing your test cases
3. Test cases will be automatically loaded and displayed

### Creating Test Cases Manually

1. Fill out the form in the "Create New Test Case" section:
   - **Test Name**: A descriptive name for your test
   - **HTTP Method**: Select the appropriate HTTP method
   - **URL**: The API endpoint URL
   - **Headers**: JSON object with request headers (optional)
   - **Request Body**: JSON or text body for POST/PUT requests (optional)
   - **Expected Status**: Expected HTTP status code (default: 200)
   - **Timeout**: Request timeout in milliseconds (default: 5000)
2. Click "Add Test"

### Running Tests

- **Run All Tests**: Click "🏃 Run All Tests" to execute all loaded test cases
- **Run Individual Test**: Click "▶️ Run Test" on any specific test case
- **View Results**: Detailed results appear in the "Test Results" section

### Managing Test Cases

- **Delete Test**: Click "🗑️ Delete" to remove a test case
- **Clear All**: Use "Clear All Tests" to remove all test cases
- **Clear Results**: Use "Clear Results" to clear test execution results

## 📋 JSON Test Case Format

Test cases should follow this JSON structure:

```json
{
  "name": "Test Case Name",
  "method": "GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS",
  "url": "https://api.example.com/endpoint",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer token"
  },
  "body": {
    "key": "value"
  },
  "expectedStatus": 200,
  "timeout": 5000
}
```

For multiple test cases, use an array:

```json
[
  {
    "name": "First Test",
    "method": "GET",
    "url": "https://api.example.com/users"
  },
  {
    "name": "Second Test",
    "method": "POST",
    "url": "https://api.example.com/users",
    "body": {"name": "John Doe"}
  }
]
```

## 🎯 Sample Test Cases

The repository includes sample test files:

- **`sample-tests.json`**: Tests using JSONPlaceholder API (free testing API)
- **`httpbin-tests.json`**: Tests using HTTPBin service (HTTP testing service)

## 🛠️ Technical Features

- **CORS Handling**: Works with CORS-enabled APIs
- **Request Timeout**: Configurable timeout for each request
- **Response Parsing**: Automatic JSON parsing with fallback to text
- **Syntax Highlighting**: Beautiful JSON syntax highlighting using Prism.js
- **Local Storage**: Test cases persist between sessions
- **Responsive Design**: Works on desktop and mobile devices
- **Error Validation**: Input validation and error reporting

## 🚫 Limitations

- **CORS Restrictions**: Can only test APIs that allow cross-origin requests from your domain
- **File API**: Uses browser's File API for JSON uploads
- **No Authentication**: Currently doesn't support complex authentication flows (only header-based auth)

## 💡 Tips

1. **Testing Public APIs**: Use free testing APIs like JSONPlaceholder or HTTPBin
2. **CORS Issues**: If you encounter CORS errors, the API server needs to allow your domain
3. **Large Responses**: Response bodies are limited by browser memory
4. **Persistence**: Your test cases are automatically saved in browser local storage

## 🔧 Development

The application consists of three main files:
- `index.html` - Main application structure
- `styles.css` - Modern, responsive styling
- `script.js` - Application logic and HTTP client functionality

No build process or dependencies required - just open in a web browser!

## 📜 License

MIT License - see LICENSE file for details.

# HTTP API Test Client

A modern, professional web-based HTTP API testing tool with a clean interface and comprehensive features. Optimized for performance and maintainability with a standardized design system.

## ✨ Features

### Core Functionality
- **📁 JSON Test Suite Import**: Load test cases from standardized JSON files
- **✏️ Manual Test Creation**: Create test cases using the intuitive form interface
- **🌐 HTTP Methods Support**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **📊 Detailed Response Analysis**: View status codes, headers, and formatted response bodies
- **⚡ Batch Test Execution**: Run all tests at once or execute individual tests
- **⏱️ Performance Monitoring**: Track API response times
- **💾 Persistent Storage**: Automatic local storage of test cases and results

### User Experience
- **🎨 Modern UI Design**: Professional interface with consistent design system
- **📱 Responsive Layout**: Optimized for desktop and mobile devices
- **� Smart Search**: Filter test cases by name or endpoint
- **📋 Organized Display**: Group tests by source file with collapsible sections
- **🎯 Real-time Status**: Visual indicators for test results (passed/failed)

### Technical Excellence
- **⚡ Optimized Performance**: Lightweight, fast-loading application
- **🎨 Design System**: Consolidated CSS with custom properties for consistency
- **🛡️ Error Handling**: Comprehensive validation and error reporting
- **🔧 Developer Friendly**: Clean, maintainable codebase with modern JavaScript

## 🚀 Quick Start

1. **Open Application**: Open `index.html` in your web browser
2. **Load Test Suite**: Click "Load" button and select `example_test_suite.json`
3. **Run Tests**: Click "Run All" or individual test "▶" buttons
4. **View Results**: Select any test case to see detailed request/response information

## 📋 Supported Format

The application **exclusively supports** the `example_test_suite.json` format with:
- **`config`** object: Global configuration settings
- **`test_cases`** array: Array of test case definitions

### Example Format

```json
{
  "config": {
    "base_url": "https://api.example.com",
    "timeout_ms": 30000,
    "default_headers": {
      "User-Agent": "HTTP-Test-Client/1.0",
      "Accept": "application/json"
    },
    "auth": {
      "type": "bearer",
      "token": "your-auth-token-here"
    }
  },
  "test_cases": [
    {
      "id": "TC001",
      "description": "Test GET request to retrieve data",
      "method": "GET",
      "endpoint": "/api/users/123",
      "headers": [["Authorization", "Bearer token123"]],
      "expected_status": 200,
      "expected_body": { "id": 123, "name": "John Doe" }
    }
  ]
}
```

## ⚙️ Configuration Options

### Global Config Properties
| Property | Type | Description |
|----------|------|-------------|
| `base_url` | string | Base URL for all endpoints |
| `timeout_ms` | number | Default timeout in milliseconds |
| `default_headers` | object | Headers applied to all requests |
| `auth.type` | string | Authentication type ("bearer") |
| `auth.token` | string | Bearer token for authentication |

### Test Case Properties
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique test identifier |
| `description`/`name` | string | Test case name |
| `method` | string | HTTP method |
| `endpoint`/`url` | string | API endpoint or full URL |
| `headers` | array/object | Request headers |
| `body` | string/object | Request body |
| `expected_status` | number | Expected HTTP status code |
| `expected_body` | object | Expected response body |
| `timeout` | number | Request timeout (optional) |

## � Design System

The application uses a comprehensive design system with:

### Color Palette
- **Primary**: Blue tones (`#0A84FF`, `#005BD3`, `#004299`)
- **Secondary**: Gray tones (`#6B7280`, `#4B5563`, `#9CA3AF`)
- **Status Colors**: Success (`#10B981`), Error (`#EF4444`), Warning (`#F59E0B`)
- **Text Colors**: Primary (`#111827`), Secondary (`#6B7280`), Inverse (`#FFFFFF`)

### Component Standards
- **Buttons**: Consistent 40px height, standardized padding and shadows
- **Badges**: HTTP method indicators with color coding
- **Forms**: Unified input styling with focus states
- **Layouts**: Responsive grid system with proper spacing

## 🏗️ Architecture

### File Structure
```
/
├── index.html          # Main application structure
├── styles.css          # Comprehensive design system
├── script.js           # Application logic (HTTPTestClientApp class)
├── example_test_suite.json  # Sample test suite
└── README.md          # This documentation
```

### Class Structure
```javascript
HTTPTestClientApp
├── testSuites[]        # Array of loaded test cases
├── testResults[]       # Array of execution results
├── config{}           # Global configuration
└── Methods:
    ├── loadConfiguration()
    ├── processConfiguredTestCase()
    ├── executeSingleTest()
    ├── updateAllDisplays()
    └── ...
```

## 🔧 Development

### CSS Architecture
- **CSS Custom Properties**: Centralized design tokens
- **Component-based**: Modular styling approach
- **Performance Optimized**: Minimal unused styles

### JavaScript Features
- **ES6+ Classes**: Modern object-oriented approach
- **Async/Await**: Clean asynchronous operation handling
- **Error Boundaries**: Comprehensive error handling
- **Memory Management**: Efficient data structures

### Browser Support
- Modern browsers supporting ES6+, CSS Grid, and Fetch API
- Progressive enhancement for older browsers

## 🚀 Performance Features

- **Lightweight**: No external dependencies except Prism.js for syntax highlighting
- **Fast Loading**: Optimized CSS and JavaScript
- **Memory Efficient**: Proper cleanup and memory management
- **Responsive**: Smooth interactions and animations

## 🛡️ Security & Limitations

### Security
- Client-side only application
- No server-side data storage
- Secure local storage implementation

### Limitations
- **CORS**: Can only test CORS-enabled APIs
- **Authentication**: Limited to header-based auth (Bearer tokens)
- **File Size**: Large response bodies limited by browser memory

## 🤝 Contributing

The codebase follows these standards:
- Consistent naming conventions
- Comprehensive error handling
- Modern JavaScript (ES6+)
- Semantic HTML structure
- Accessible design patterns

## 📜 License

MIT License - see LICENSE file for details.

---

**Built with modern web standards for optimal performance and maintainability.**

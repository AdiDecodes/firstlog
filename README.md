<p align="center">
  <img src="https://res.cloudinary.com/domebtgvk/image/upload/v1751872966/free-wood-log-icon-download-in-svg-png-gif-file-formats--wooden-timber-firewood-autumn-pack-nature-icons-5002823_zdbj46.png" alt="Firstlog Logo" width="180" />
</p>

<h1 align="center"><strong>Firstlog</strong></h1>

<p align="center">
  <a href="https://www.npmjs.com/package/firstlog" style="text-decoration: none;">
    <img src="https://img.shields.io/npm/v/firstlog.svg?style=for-the-badge" alt="NPM version" />
  </a>
  &nbsp;&nbsp;
  <a href="https://www.npmjs.com/package/firstlog" style="text-decoration: none;">
    <img src="https://img.shields.io/npm/dm/firstlog?style=for-the-badge" alt="NPM downloads" />
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/adidecodes/firstlog/stargazers" style="text-decoration: none;">
    <img src="https://img.shields.io/github/stars/adidecodes/firstlog.svg?style=for-the-badge" alt="GitHub stars" />
  </a>
  &nbsp;&nbsp;
  <a href="https://www.typescriptlang.org/" style="text-decoration: none;">
    <img src="https://img.shields.io/badge/built%20with-TypeScript-blue.svg?style=for-the-badge" alt="Built with TypeScript" />
  </a>
</p>


<p align="center">
  <em>Firstlog is a flexible and powerful Express.js middleware for advanced request logging with comprehensive features like geographic tracking, performance monitoring, and customizable output formats.</em>
</p>

## Features

- 🚀 **Easy Integration** - Simple Express middleware setup
- 📊 **Performance Monitoring** - Track request duration and identify slow requests
- 🌍 **Geographic Tracking** - Optional GeoIP location tracking
- 🔒 **Security** - Mask sensitive fields in logs
- 📝 **Flexible Logging** - Outputs is JSON object format
- 🎯 **Selective Logging** - Filter by paths, errors, or custom conditions
- 📦 **TypeScript Support** - Full TypeScript definitions included
- 🔧 **Highly Configurable** - Extensive customization options

## Installation

```bash
npm install firstlog
```

## Quick Start

```typescript
import express from 'express';
import { logger } from 'firstlog';

const app = express();

// Basic usage
app.use(logger({
  logFile: './logs/access.log'
}));

// Your routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(3000);
```

## Configuration Options

### Basic Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logFile` | `string` | **Required** | Path to the log file |
| `maskFields` | `string[]` | `['password', 'token']` | Fields to mask in logs |
| `captureBody` | `boolean` | `true` | Whether to capture request body |
| `prettyPrint` | `boolean` | `false` | Format JSON logs with indentation |

### Advanced Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onlyLogOnError` | `boolean` | `false` | Only log requests that result in errors (4xx, 5xx) |
| `maxBodySize` | `number` | `1024` | Maximum body size to log (in bytes) |
| `slowThresholdMs` | `number` | `1000` | Threshold for marking requests as slow |
| `excludePaths` | `string[]` | `[]` | Paths to exclude from logging |
| `requestIdHeader` | `string` | `'x-request-id'` | Header name for request ID |

### Feature Toggles

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trackQuery` | `boolean` | `false` | Include query parameters in logs |
| `trackOrigin` | `boolean` | `false` | Track the origin of the request |
| `enableGeoIP` | `boolean` | `false` | Enable geographic IP tracking |
| `logHeaders` | `boolean` | `false` | Include request headers in logs |
| `logParams` | `boolean` | `false` | Include route parameters in logs |
| `logResponseBody` | `boolean` | `false` | Include response body snippet in logs |

### Callbacks

| Option | Type | Description |
|--------|------|-------------|
| `trackUser` | `(req: Request) => string` | Custom function to identify users |
| `onLog` | `(logEntry) => void` | Callback executed for each log entry |

## Usage Examples

### Basic Logging

```typescript
import { logger } from 'firstlog';

app.use(logger({
  logFile: './logs/app.log'
}));
```

### Advanced Configuration

```typescript
app.use(logger({
  logFile: './logs/app.log',
  maskFields: ['password', 'token', 'apiKey'],
  captureBody: true,
  trackQuery: true,
  enableGeoIP: true,
  slowThresholdMs: 500,
  prettyPrint: true,
  excludePaths: ['/health', '/metrics'],
  trackUser: (req) => req.user?.id || 'anonymous',
  onLog: (logEntry) => {
    if (logEntry.slow) {
      console.warn(`Slow request detected: ${logEntry.route}`);
    }
  }
}));
```

### Error-Only Logging

```typescript
app.use(logger({
  logFile: './logs/errors.log',
  onlyLogOnError: true,
  logResponseBody: true
}));
```

### External Service Integration

```typescript
app.use(logger({
  logFile: './logs/app.log',
  onLog: (logEntry) => {
    // Send to your monitoring service
    analytics.track('request', logEntry);
  }
}));
```

## Log Format

Each log entry contains the following information:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "method": "POST",
  "route": "/api/users",
  "status": 201,
  "ip": "192.168.1.100",
  "durationMs": 234.56,
  "slow": false,
  "user": "user123",
  "body": { "name": "John Doe", "password": "****" },
  "query": { "page": "1" },
  "headers": { "user-agent": "Mozilla/5.0...", "authorization": "****" },
  "params": { "id": "123" },
  "responseSnippet": "{\"success\": true, \"id\": \"456\"}",
  "location": {
    "country": "US",
    "region": "CA",
    "city": "San Francisco"
  }
}
```

## TypeScript Support

Firstlog is built with TypeScript and includes comprehensive type definitions:

```typescript
import { LoggerOptions, logger } from 'firstlog';

const options: LoggerOptions = {
  logFile: './logs/app.log',
  maskFields: ['password'],
  captureBody: true
};

app.use(logger(options));
```

## Performance Considerations

- **Body Capture**: Disable `captureBody` for high-throughput applications
- **GeoIP**: GeoIP lookups add latency; use only when necessary
- **Memory Usage**: Set appropriate `maxBodySize` to prevent memory issues

## Security

- Sensitive fields are automatically masked using the `maskFields` option
- Request IDs are generated using UUID v4 for uniqueness
- File paths are validated to prevent directory traversal attacks

## License

This project is licensed under the Usage-Only License.

## Dependencies

- **express**: Web framework compatibility
- **uuid**: Secure request ID generation
- **geoip-lite**: Geographic IP tracking

## Authors

- [@adidecodes](https://www.github.com/adidecodes)

## Conclusion

#### If you like this package, show your support & love!

[![buy me a coffee](https://res.cloudinary.com/customzone-app/image/upload/c_pad,w_200/v1712840190/bmc-button_wl78gx.png)](https://www.buymeacoffee.com/adidecodes)


## Changelog

### v0.0.1
- Initial release
- Basic logging functionality
- TypeScript support
- GeoIP integration
- Performance monitoring
- Security features


**Made with ❤️ by Aditya**
# YARN Fair Scheduler Configuration Manager

A comprehensive web-based GUI tool for managing Hadoop YARN Fair Scheduler configurations. This application provides a user-friendly interface for creating, editing, and managing YARN queue configurations with the ability to generate and validate XML configuration files.

## Features

- **Dashboard Overview**: Visual representation of queue configurations and system statistics
- **Queue Management**: Create, edit, and delete YARN queues with comprehensive resource settings
- **XML Editor**: Direct XML editing with syntax validation and formatting
- **File Operations**: Upload, download, and manage fair-scheduler.xml files
- **Local File System Integration**: Read from and write to local Hadoop configuration directories
- **Real-time Validation**: Live XML syntax checking and schema validation
- **Responsive Design**: Mobile-friendly interface with dark mode support

## Technology Stack

- **Frontend**: React 18 with TypeScript, Vite build system
- **Backend**: Express.js with TypeScript
- **Database**: SQLite (default), PostgreSQL, or in-memory storage
- **UI Components**: Radix UI with Tailwind CSS and shadcn/ui
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **File Processing**: XML parsing and generation with xml2js

## System Requirements

### Required Software Versions

| Software | Minimum Version | Recommended | Notes |
|----------|----------------|-------------|-------|
| **Node.js** | 18.0.0 | 20.x LTS | Required for ES modules and modern JavaScript features |
| **npm** | 8.0.0 | 10.x | Package manager (comes with Node.js) |
| **Operating System** | - | Linux/macOS/Windows | Cross-platform compatible |

### Optional Dependencies

| Software | Version | Purpose |
|----------|---------|---------|
| **PostgreSQL** | 12+ | Alternative database (SQLite used by default) |
| **Hadoop** | 2.7+ / 3.x | Direct file system integration |
| **Docker** | 20+ | Containerized deployment |

### Hardware Requirements

- **RAM**: Minimum 512MB, Recommended 2GB+
- **Storage**: 100MB for application, additional space for SQLite database
- **CPU**: Any modern x64 or ARM64 processor

### Browser Compatibility

| Browser | Minimum Version |
|---------|----------------|
| **Chrome** | 90+ |
| **Firefox** | 88+ |
| **Safari** | 14+ |
| **Edge** | 90+ |

### Version Verification

Check your installed versions:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check if you have the minimum required versions
node -e "console.log(process.version >= 'v18.0.0' ? '✓ Node.js OK' : '✗ Node.js too old')"
```

## Quick Start

### 1. Prerequisites Check and Installation

```bash
# 1. Verify Node.js version (18.0.0+ required)
node --version

# 2. Clone the repository
git clone <repository-url>
cd yarn-fair-scheduler-manager

# 3. Install dependencies
npm install

# 4. Verify installation
npm ls better-sqlite3  # Should show SQLite dependency

# 5. Optional: Use Node Version Manager
# If you have nvm installed, the project includes .nvmrc
nvm use  # Uses Node.js version specified in .nvmrc
```

### Node.js Version Management

The project includes version specification files for different Node.js version managers:

- **`.nvmrc`** - For nvm (Node Version Manager)
- **`.node-version`** - For nodenv and other version managers

```bash
# Using nvm (recommended)
nvm use         # Uses version from .nvmrc
nvm install     # Installs the specified version if needed

# Using nodenv
nodenv local    # Uses version from .node-version

# Verify you're using the correct version
node --version  # Should show v20.19.3 or compatible
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Storage Configuration
STORAGE_TYPE=sqlite              # Options: sqlite, memory (defaults to sqlite)
SQLITE_DB_PATH=./data/yarn-scheduler.db  # Path for SQLite database file

# PostgreSQL Configuration (if using PostgreSQL instead)
DATABASE_URL=postgresql://username:password@localhost:5432/yarn_config

# Hadoop Configuration Directory (Optional)
HADOOP_CONF_DIR=/etc/hadoop/conf

# Server Configuration (Optional)
PORT=5000                        # Application port
HOST=0.0.0.0                     # Listen on all interfaces (use 127.0.0.1 for localhost only)
```

### 3. Start the Application

```bash
npm run dev
```

The application will be available at:
- Local access: `http://localhost:5000`
- Network access: `http://[your-ip-address]:5000` (when HOST=0.0.0.0)

## Storage Options

The application supports three storage backends:

### 1. SQLite (Default)
- **Best for**: Local deployments, single-user setups, development
- **Configuration**: Set `STORAGE_TYPE=sqlite` in your `.env` file
- **Database file**: Stored at `./data/yarn-scheduler.db` by default
- **Advantages**: 
  - No external database setup required
  - Persistent storage across restarts
  - Zero-configuration for local use
  - Ideal for Hadoop administrators

### 2. In-Memory Storage
- **Best for**: Development, testing, temporary use
- **Configuration**: Set `STORAGE_TYPE=memory` in your `.env` file
- **Advantages**: Fast performance, no persistent storage
- **Note**: All data is lost when the application restarts

### 3. PostgreSQL
- **Best for**: Multi-user production environments
- **Configuration**: Set up `DATABASE_URL` in your `.env` file
- **Requires**: Running PostgreSQL instance
- **Advantages**: Full ACID compliance, multi-user support

## Network Access Configuration

The application supports flexible network binding for different deployment scenarios:

### Local Access Only (Secure)
```env
HOST=127.0.0.1
PORT=5000
```
- Application accessible only from the local machine
- Recommended for development and single-user setups
- Access: `http://localhost:5000`

### Network Access (Production)
```env
HOST=0.0.0.0
PORT=5000
```
- Application accessible from any network interface
- Ideal for Hadoop cluster deployments
- Access from any machine: `http://[server-ip]:5000`
- **Note**: Ensure proper firewall rules and security measures

### Custom Configuration
```env
HOST=192.168.1.100  # Bind to specific interface
PORT=8080           # Custom port
```

## Troubleshooting

### Common Installation Issues

#### Node.js Version Too Old
```bash
# Error: "SyntaxError: Unexpected token 'import'"
# Solution: Upgrade to Node.js 18+ or 20+ LTS

# Using Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

#### SQLite Installation Issues
```bash
# Error: "Cannot find module 'better-sqlite3'"
# Solution: Rebuild native dependencies

npm rebuild better-sqlite3
# or on Alpine Linux/Docker
apk add python3 make g++
npm install
```

#### Permission Issues
```bash
# Error: "EACCES: permission denied"
# Solution: Fix npm permissions or use different directory

mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Platform-Specific Notes

#### Windows
- Requires Visual Studio Build Tools or Visual Studio Community
- PowerShell or Command Prompt supported
- WSL2 recommended for better compatibility
- Docker Desktop for Windows containerization

#### macOS
- Xcode Command Line Tools required: `xcode-select --install`
- Homebrew recommended for Node.js installation
- Docker Desktop for Mac for containerization

#### Linux
- Build essentials required: `apt-get install build-essential` (Ubuntu/Debian)
- Python 3 required for native module compilation
- Docker engine for containerization: `apt-get install docker.io docker-compose`

### Docker-Specific Requirements

#### Alpine Linux (Docker Image)
The Dockerfile uses `node:20-alpine` which requires additional build tools:
```bash
# Automatically handled in Dockerfile
apk add --no-cache python3 make g++
```

#### Native Module Compilation
The `better-sqlite3` dependency requires native compilation:
- **Development**: Handled automatically during `npm install`
- **Docker**: Multi-stage build ensures proper compilation
- **Production**: Pre-compiled binaries when possible

## Deployment Instructions

### Local Development Deployment

1. **System Prerequisites**:
   ```bash
   # Ensure Node.js 18+ is installed
   node --version  # Should show v18.0.0 or higher
   npm --version   # Should show 8.0.0 or higher
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   # Verify critical dependencies
   npm ls better-sqlite3 drizzle-orm
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Access the Application**:
   - Open your browser to `http://localhost:5000`
   - The application runs frontend and backend on the same port

### Production Deployment

#### Option 1: Standalone Server Deployment

1. **Build the Application**:
   ```bash
   npm run build
   ```

2. **Set Environment Variables**:
   ```bash
   export NODE_ENV=production
   export PORT=5000
   export HADOOP_CONF_DIR=/path/to/hadoop/conf
   ```

3. **Start the Production Server**:
   ```bash
   npm start
   ```

#### Option 2: Docker Deployment

The project includes a multi-stage Dockerfile that handles build dependencies correctly:

1. **Build and Run Container**:
   ```bash
   # Build the Docker image
   docker build -t yarn-scheduler-manager .
   
   # Run with SQLite storage (default)
   docker run -d \
     --name yarn-scheduler \
     -p 5000:5000 \
     -v $(pwd)/data:/app/data \
     yarn-scheduler-manager
   
   # Run with Hadoop configuration volume
   docker run -d \
     --name yarn-scheduler \
     -p 5000:5000 \
     -v /etc/hadoop/conf:/etc/hadoop/conf:ro \
     -v $(pwd)/data:/app/data \
     yarn-scheduler-manager
   ```

2. **Docker Compose (Recommended)**:
   
   The project includes a complete `docker-compose.yml` configuration:
   
   ```bash
   # Production deployment
   docker-compose up -d
   
   # Development with hot reload
   docker-compose -f docker-compose.yml -f docker-compose.override.yml up
   
   # View logs
   docker-compose logs -f yarn-scheduler
   
   # Stop services
   docker-compose down
   
   # Rebuild and start
   docker-compose up --build -d
   ```
   
   **Configuration Options:**
   
   ```bash
   # With Hadoop integration
   # Edit docker-compose.yml and uncomment:
   # - /etc/hadoop/conf:/etc/hadoop/conf:ro
   # - HADOOP_CONF_DIR=/etc/hadoop/conf
   
   # With PostgreSQL database
   # Uncomment the postgres service in docker-compose.yml
   # Update environment variables:
   # - STORAGE_TYPE=postgresql
   # - DATABASE_URL=postgresql://yarn_user:yarn_password@postgres:5432/yarn_config
   ```

3. **Troubleshooting Docker Build Issues**:
   
   If you encounter build errors:
   ```bash
   # Clean build with no cache
   docker build --no-cache -t yarn-scheduler-manager .
   
   # Build with build args for debugging
   docker build --progress=plain -t yarn-scheduler-manager .
   
   # Check build dependencies
   docker run --rm -it node:20-alpine sh -c "apk add --no-cache python3 make g++ && npm --version"
   ```

## Docker Quick Start Guide

For the fastest Docker deployment:

```bash
# 1. Clone and enter directory
git clone <repository-url>
cd yarn-fair-scheduler-manager

# 2. Start with Docker Compose (recommended)
docker-compose up -d

# 3. Check if it's running
docker-compose ps
docker-compose logs yarn-scheduler

# 4. Access the application
open http://localhost:5000

# 5. Stop when done
docker-compose down
```

### Docker Compose Files Structure

- **`docker-compose.yml`** - Production configuration with SQLite
- **`docker-compose.override.yml`** - Development overrides with hot reload
- **`Dockerfile`** - Multi-stage build with native module compilation
- **`.dockerignore`** - Optimized build context

#### Option 3: System Service Deployment

1. **Create SystemD Service** (`/etc/systemd/system/yarn-scheduler.service`):
   ```ini
   [Unit]
   Description=YARN Fair Scheduler Manager
   After=network.target

   [Service]
   Type=simple
   User=hadoop
   WorkingDirectory=/opt/yarn-scheduler-manager
   ExecStart=/usr/bin/node dist/index.js
   Restart=always
   Environment=NODE_ENV=production
   Environment=PORT=5000
   Environment=HADOOP_CONF_DIR=/etc/hadoop/conf

   [Install]
   WantedBy=multi-user.target
   ```

2. **Enable and Start Service**:
   ```bash
   sudo systemctl enable yarn-scheduler
   sudo systemctl start yarn-scheduler
   ```

### Reverse Proxy Configuration (Nginx)

For production deployments behind a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Configuration

### Hadoop Integration

The application can integrate directly with your Hadoop installation:

1. **Set Hadoop Configuration Directory**:
   ```env
   HADOOP_CONF_DIR=/etc/hadoop/conf
   ```

2. **File Permissions**: Ensure the application has read/write access to the Hadoop configuration directory:
   ```bash
   sudo chown -R hadoop:hadoop /etc/hadoop/conf
   sudo chmod 664 /etc/hadoop/conf/fair-scheduler.xml
   ```

### Database Configuration (Optional)

For persistent storage with PostgreSQL:

1. **Install PostgreSQL**:
   ```bash
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create Database**:
   ```sql
   CREATE DATABASE yarn_config;
   CREATE USER yarn_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE yarn_config TO yarn_user;
   ```

3. **Set Database URL**:
   ```env
   DATABASE_URL=postgresql://yarn_user:your_password@localhost:5432/yarn_config
   ```

4. **Run Migrations**:
   ```bash
   npm run db:push
   ```

## Usage

### Basic Operations

1. **Upload Configuration**: Use the sidebar to upload existing fair-scheduler.xml files
2. **Create Queues**: Navigate to Queue Configuration to add new queues
3. **Edit XML**: Use the XML Editor for direct configuration editing
4. **Download Configuration**: Export your configuration as XML files

### Queue Configuration

Configure queues with the following properties:
- **Basic**: Name, parent queue, weight, scheduling policy
- **Resources**: Memory and vCore limits (min/max)
- **Limits**: Maximum running applications, AM share
- **Policies**: Preemption settings and reservations

### XML Management

- **Syntax Validation**: Real-time XML syntax checking
- **Schema Validation**: YARN Fair Scheduler schema compliance
- **Auto-formatting**: Automatic XML indentation and structure
- **Error Reporting**: Detailed validation error messages

## API Endpoints

### Queue Management
- `GET /api/queues` - List all queues
- `POST /api/queues` - Create new queue
- `PUT /api/queues/:id` - Update queue
- `DELETE /api/queues/:id` - Delete queue

### Configuration Management
- `GET /api/config` - Get current configuration
- `POST /api/config` - Save configuration
- `POST /api/config/upload` - Upload configuration file
- `GET /api/config/download` - Download configuration
- `POST /api/config/validate` - Validate XML content
- `GET /api/config/generate` - Generate XML from queues

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure proper file permissions for Hadoop configuration directory
2. **Port Already in Use**: Change the PORT environment variable
3. **Database Connection**: Verify PostgreSQL is running and DATABASE_URL is correct
4. **XML Validation Errors**: Check XML syntax and Fair Scheduler schema compliance

### Logs

Application logs are available in the console when running in development mode. For production deployments, logs are written to stdout and can be redirected:

```bash
npm start > /var/log/yarn-scheduler.log 2>&1
```

### Health Check

The application provides a health check endpoint:
```bash
curl http://localhost:5000/api/health
```

## Development

### Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Application pages
│   │   ├── lib/         # Utilities and hooks
│   │   └── hooks/       # Custom React hooks
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Data storage layer
│   └── vite.ts          # Vite integration
├── shared/              # Shared TypeScript types
│   └── schema.ts        # Database schema and validation
└── migrations/          # Database migrations
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open database management studio

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

For issues, questions, or contributions:
- Create an issue on the project repository
- Check the troubleshooting section above
- Review the API documentation for integration details

---

**Note**: This application is designed to work with Hadoop YARN Fair Scheduler. Ensure your Hadoop cluster is properly configured to use Fair Scheduler before deploying this management tool.
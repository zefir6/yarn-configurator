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
- **Database**: PostgreSQL with Drizzle ORM (with in-memory fallback)
- **UI Components**: Radix UI with Tailwind CSS and shadcn/ui
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **File Processing**: XML parsing and generation with xml2js

## Prerequisites

- Node.js 20 or higher
- npm or yarn package manager
- Optional: PostgreSQL database (uses in-memory storage by default)
- Optional: Hadoop installation for direct file system integration

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd yarn-fair-scheduler-manager
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration (Optional)
DATABASE_URL=postgresql://username:password@localhost:5432/yarn_config

# Hadoop Configuration Directory (Optional)
HADOOP_CONF_DIR=/etc/hadoop/conf

# Application Port (Optional)
PORT=5000
```

### 3. Start the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Deployment Instructions

### Local Development Deployment

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
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

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. **Build and Run Container**:
   ```bash
   docker build -t yarn-scheduler-manager .
   docker run -p 5000:5000 -v /etc/hadoop/conf:/etc/hadoop/conf yarn-scheduler-manager
   ```

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
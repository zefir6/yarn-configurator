# Replit.md

## Overview

This is a full-stack web application for managing YARN Fair Scheduler configurations. The application provides a visual interface for creating, editing, and managing Hadoop YARN queue configurations, with the ability to generate and validate XML configuration files. The application uses memory-only storage with XML file persistence and supports automatic reloading from disk when files are modified externally. The application is ready for local deployment with comprehensive documentation and instructions.

## User Preferences

Preferred communication style: Simple, everyday language.
Date and time format: European (ISO) standards - 24-hour format and DD-MM-YYYY dates.

## System Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript, Vite build system
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Components**: Radix UI with Tailwind CSS and shadcn/ui
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter for client-side routing

### Project Structure
The application follows a monorepo structure with clear separation of concerns:
- `/client` - React frontend application
- `/server` - Express.js backend API
- `/shared` - Shared TypeScript schemas and types
- `/migrations` - Database migration files

## Key Components

### Storage Layer
- **Memory-Only Storage**: Pure in-memory storage using Map data structures
- **XML File Persistence**: Configuration persisted to XML files on disk (./data/fair-scheduler.xml by default)
- **File Synchronization**: Bidirectional sync between memory storage and XML files
- **Schema**: Defined in `/shared/schema.ts` with two main types:
  - `Queue` - Queue configuration data structure
  - `ConfigFile` - XML configuration file metadata
- **Validation**: Zod schemas for type-safe data validation
- **Reload Functionality**: Manual reload from disk when XML files are modified externally

### Backend Architecture
- **Storage Interface**: Abstracted storage layer with memory-only implementation:
  - `MemStorage` - Pure in-memory storage with XML file persistence
  - Pending changes tracking for apply/discard functionality
  - File reload capability for external file modifications
- **API Routes**: RESTful endpoints for queue and configuration management
- **File Handling**: XML upload/download with validation and disk synchronization
- **Middleware**: Request logging and error handling

### Frontend Architecture
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod resolvers for validation
- **Data Fetching**: TanStack Query for caching and synchronization

## Data Flow

### Queue Management
1. Client requests queue data via TanStack Query
2. Express API routes handle CRUD operations
3. Storage layer (currently in-memory) manages data persistence
4. Database operations will use Drizzle ORM when connected

### Configuration File Processing
1. XML files uploaded through multipart form data
2. Server validates XML structure and content
3. Parsed queue configurations stored in database
4. Generated XML can be downloaded or validated

### Form Validation
1. Frontend forms use Zod schemas from shared directory
2. Client-side validation provides immediate feedback
3. Server-side validation ensures data integrity
4. Type safety maintained throughout the stack

## External Dependencies

### Runtime Requirements
- **Node.js**: 18.0.0+ (recommended: 20.x LTS)
- **npm**: 8.0.0+ (package manager)
- **better-sqlite3**: Native SQLite bindings (requires compilation)

### Core Dependencies
- **@neondatabase/serverless** - Neon database client for PostgreSQL
- **drizzle-orm** - TypeScript ORM for database operations
- **@tanstack/react-query** - Server state management
- **@hookform/resolvers** - Form validation integration
- **xml2js** - XML parsing and generation
- **multer** - File upload handling
- **better-sqlite3** - SQLite database driver (default storage)

### UI Dependencies
- **@radix-ui/** - Headless UI component primitives
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** - Component variant management
- **lucide-react** - Icon library

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with HMR
- **Backend**: tsx for TypeScript execution
- **Database**: Environment variable configuration for DATABASE_URL

### Production Build
- **Frontend**: Vite build to `/dist/public`
- **Backend**: esbuild bundle to `/dist/index.js`
- **Database**: Drizzle migrations via `db:push` command

### Environment Configuration
- Uses environment variables for database connection
- Supports both development and production modes
- Docker containerization with multi-stage builds
- SQLite default storage with dedicated Docker volumes (not repository subdirectories)
- Configurable fair-scheduler.xml placement (default: /etc/hadoop/conf/fair-scheduler.xml)
- Read-write access to /etc/hadoop/conf by default in Docker

### Key Features
- YARN queue hierarchy management
- XML configuration generation and validation with decimal preservation
- Resource allocation and scheduling policy configuration
- File upload/download capabilities with bidirectional XML synchronization
- Real-time form validation and error handling
- Global configuration management with queue placement policy attributes
- **YARN Resource Manager integration** for live cluster metrics and queue utilization
- **Real-time monitoring dashboard** showing cluster capacity, memory usage, CPU utilization, and running applications
- **Queue-specific metrics** displaying utilization percentages, resource consumption, and application counts
- **Connection management** with test connectivity and configurable Resource Manager endpoints
- Responsive design with mobile support

### Recent Changes (July 25, 2025)
- **Fixed critical XML parsing bug**: Application now reads global configuration from existing XML files instead of using hardcoded defaults
- **Enhanced queue placement policy support**: Preserves create="false" attributes in queuePlacementPolicy rules during XML round-trip
- **Decimal formatting preservation**: Fixed issue where numeric values like "4.0" were being converted to "4", ensuring YARN Resource Manager compatibility
- **Removed duplicate generateXMLFromQueues function**: Eliminated function shadowing that was preventing global configuration from being used in XML generation
- **Added YARN Resource Manager integration**: Implemented real-time cluster metrics and queue utilization monitoring
- **New YARN Metrics dashboard**: Added comprehensive UI for configuring YARN connection and viewing live cluster data
- **Fixed file modification timestamps**: Application now shows actual XML file modification time instead of application startup time
- **Enhanced decimal input validation**: Form fields now properly handle decimal input with custom validation patterns
- **Updated to European date/time standards**: Application now displays dates in DD-MM-YYYY format and uses 24-hour time throughout the interface
- **Fixed YARN queue metrics parsing error**: Enhanced error handling for undefined queue properties and improved data structure validation
- **Reorganized YARN integration**: Moved YARN settings to Configuration tab and added cluster/queue summary to Overview page
- **Improved YARN data robustness**: Added better null checks and type conversion for YARN API responses
- **Removed redundant Validation & Preview tab**: Streamlined navigation by removing unnecessary section
- **Enhanced queue statistics display**: Shows YARN metrics when connected, configuration limits when disconnected
- **Improved YARN integration UX**: Clear status indicators and connection prompts when YARN is unavailable

The application is designed to be deployed locally with comprehensive deployment instructions provided in README.md. It supports both in-memory storage for development and PostgreSQL for production use. The application includes full documentation for local deployment, Docker deployment, system service setup, and Hadoop integration.
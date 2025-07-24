# Replit.md

## Overview

This is a full-stack web application for managing YARN Fair Scheduler configurations. The application provides a visual interface for creating, editing, and managing Hadoop YARN queue configurations, with the ability to generate and validate XML configuration files. The application is ready for local deployment with comprehensive documentation and instructions.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `/shared/schema.ts` with two main tables:
  - `queues` - Stores queue configuration data
  - `configFiles` - Stores XML configuration file metadata
- **Validation**: Zod schemas for type-safe data validation

### Backend Architecture
- **Storage Interface**: Abstracted storage layer with in-memory implementation (`MemStorage`)
- **API Routes**: RESTful endpoints for queue and configuration management
- **File Handling**: XML upload/download with validation
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

### Core Dependencies
- **@neondatabase/serverless** - Neon database client for PostgreSQL
- **drizzle-orm** - TypeScript ORM for database operations
- **@tanstack/react-query** - Server state management
- **@hookform/resolvers** - Form validation integration
- **xml2js** - XML parsing and generation
- **multer** - File upload handling

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
- Replit-specific configurations for cloud deployment

### Key Features
- YARN queue hierarchy management
- XML configuration generation and validation
- Resource allocation and scheduling policy configuration
- File upload/download capabilities
- Real-time form validation and error handling
- Responsive design with mobile support

The application is designed to be deployed locally with comprehensive deployment instructions provided in README.md. It supports both in-memory storage for development and PostgreSQL for production use. The application includes full documentation for local deployment, Docker deployment, system service setup, and Hadoop integration.
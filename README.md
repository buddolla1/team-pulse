# TeamPulse

A full-stack web application for managing employee information built with React.js, Node.js, Express, and MySQL.

## Documentation

- [User Guide](./USER_GUIDE.md) - role-based walkthroughs and flow charts for the application
- [Frontend Docs](./frontend/docs/README.md) - implementation-focused frontend reference
- [Backend Docs](./backend/docs/README.md) - backend flow documentation and SQL references

## Features

- **Employee CRUD Operations**: Create, Read, Update, and Delete employee records
- **Search Functionality**: Search employees by name, email, department, or position
- **Routing**: Multi-page application with React Router for seamless navigation
- **State Management**: Redux Toolkit for centralized and predictable state management
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Instant feedback on all operations
- **Form Validation**: Client-side validation for data integrity
- **Clean UI**: Modern and intuitive user interface with navigation bar

## Tech Stack

### Frontend
- React.js 18
- React Router DOM v6 for routing
- Redux Toolkit for state management
- React-Redux for React bindings
- Axios for API calls
- CSS3 for styling

### Backend
- Node.js
- Express.js
- MySQL2
- CORS
- dotenv

## Project Structure

```
TeamPulse/
├── backend/
│   ├── config/
│   │   ├── database.js       # MySQL connection configuration
│   │   └── schema.sql        # Database schema and sample data
│   ├── controllers/
│   │   └── employeeController.js  # Business logic
│   ├── routes/
│   │   └── employeeRoutes.js      # API routes
│   ├── .env.example          # Environment variables template
│   ├── .gitignore
│   ├── package.json
│   └── server.js             # Entry point
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Navigation.js      # Navigation bar
    │   │   ├── Navigation.css
    │   │   ├── EmployeeList.js
    │   │   ├── EmployeeList.css
    │   │   ├── EmployeeForm.js
    │   │   └── EmployeeForm.css
    │   ├── pages/
    │   │   ├── Home.js            # Home page
    │   │   ├── Home.css
    │   │   ├── Employees.js       # Employees list page
    │   │   ├── Employees.css
    │   │   ├── AddEmployee.js     # Add employee page
    │   │   ├── EditEmployee.js    # Edit employee page
    │   │   └── EmployeeFormPage.css
    │   ├── redux/
    │   │   ├── store.js           # Redux store configuration
    │   │   └── employeeSlice.js   # Employee slice with actions/reducers
    │   ├── services/
    │   │   └── api.js             # API service layer
    │   ├── App.js                 # Main app with routing
    │   ├── App.css
    │   ├── index.js               # Entry point with Redux Provider
    │   └── index.css
    ├── .gitignore
    └── package.json
```

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v14 or higher)
- npm or yarn
- MySQL (v5.7 or higher)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd TeamPulse
```

### 2. Database Setup

1. Start your MySQL server

2. Create the database and tables:

```bash
mysql -u root -p < backend/migrations/schema.sql
```

Original SQL source:

```sql
CREATE DATABASE IF NOT EXISTS employee_management;

USE employee_management;

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sso VARCHAR(50) UNIQUE,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100),
  role_type VARCHAR(50),
  phone VARCHAR(20),
  location VARCHAR(100),
  criticality ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  status ENUM('Active', 'Inactive', 'On Leave', 'Terminated') DEFAULT 'Active',
  skills TEXT,
  last_working_day DATE,
  possible_candidate VARCHAR(100),
  asset_id VARCHAR(50),
  asset_return_id VARCHAR(50),
  comments TEXT,
  attrition ENUM('Yes', 'No', 'At Risk') DEFAULT 'No',
  temp_offshore_manager_id INT,
  temp_onsite_manager_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

The current admin and RBAC bootstrap scripts live in:

- `backend/migrations/admin_schema.sql`
- `backend/migrations/roles_permissions_schema.sql`
- `backend/migrations/add_employee_auth.sql`

### 3. Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

4. Update the `.env` file with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=employee_management
DB_PORT=3306
PORT=5010
```

5. Start the backend server:

```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

The backend server will start on `http://localhost:5010`

### 4. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. (Optional) Create a `.env` file in the frontend directory if you need to customize the API URL:

```env
REACT_APP_API_URL=http://localhost:5010/api
```

If you want to use the merged Incident Tracker module from this frontend:

- No second frontend login is required
- The incident module uses the same `REACT_APP_API_URL` and `adminToken` as the main BSL app
- Run the merged BSL backend on `http://localhost:5010`

4. Start the React development server:

```bash
npm start
```

The frontend application will open in your browser at `http://localhost:3000`

## API Endpoints

### Employees

- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Request Body Example (POST/PUT)

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@company.com",
  "phone": "555-0101",
  "department": "Engineering",
  "position": "Software Engineer",
  "salary": 75000.00,
  "hire_date": "2024-01-15",
  "status": "active"
}
```

## Application Routes

The application uses React Router for navigation with the following routes:

- `/` - Home page with dashboard and statistics
- `/employees` - View all employees in a table
- `/employees/add` - Add a new employee
- `/employees/edit/:id` - Edit an existing employee

## State Management

The application uses Redux Toolkit for centralized state management:

- **Store**: Configured in `redux/store.js`
- **Employee Slice**: Manages employee state with async thunks for API calls
- **Selectors**: Optimized selectors for filtered data
- **Actions**: Async actions for CRUD operations (fetchEmployees, addEmployee, modifyEmployee, removeEmployee)

## Usage

1. **Home Page**: View statistics and navigate to different sections
2. **View Employees**: Navigate to /employees to see all employees in a table
3. **Search**: Use the search bar to filter employees in real-time
4. **Add Employee**: Click "Add New Employee" in the navigation or on the employees page
5. **Edit Employee**: Click the "Edit" button on any employee row
6. **Delete Employee**: Click the "Delete" button and confirm the action

## Features in Detail

### Navigation
- Sticky navigation bar with gradient design
- Active route highlighting
- Responsive mobile menu
- Quick access to all major sections

### Home Page
- Dashboard with statistics (total employees, active employees, departments, positions)
- Feature highlights
- Quick action buttons for common tasks
- Modern card-based layout

### Employee List
- Sortable table with all employee information
- Real-time search across multiple fields (Redux-powered)
- Status indicators (Active/Inactive)
- Formatted salary and dates
- Responsive design for mobile devices
- Navigate to edit page via routing

### Employee Forms (Add/Edit)
- Dedicated pages for adding and editing employees
- Form validation for required fields
- Email format validation
- Duplicate email prevention
- Date picker for hire date
- Status dropdown (Active/Inactive)
- Error handling and user feedback
- Redux integration for state management

## Development

### Backend Development

```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development

```bash
cd frontend
npm start  # React development server with hot reload
```

## Production Build

### Frontend

```bash
cd frontend
npm run build
```

The production-ready files will be in the `frontend/build` directory.

## Troubleshooting

### Backend won't start
- Check if MySQL is running
- Verify database credentials in `.env`
- Ensure the database and table exist
- Check if port 5010 is available

### Frontend can't connect to backend
- Verify backend is running on port 5010
- Check CORS settings if running on different domains
- Verify API URL in frontend configuration

### Database connection errors
- Confirm MySQL service is running
- Check username and password
- Verify database name exists
- Check MySQL port (default: 3306)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For issues, questions, or contributions, please open an issue in the repository.

## Overview 13-03-2026

TeamPulse — Workforce Management Platform                                                                                                                                                                                                                                                
  End-to-End Application Overview                                                                                                           

  ---
  1. Application Summary

  TeamPulse is a full-stack, web-based Employee & Workforce Management Portal built for . It serves as a single, centralized       
  platform for HR operations — replacing fragmented spreadsheets and disconnected tools with one integrated system.

  Built with:
  - Frontend: React.js 18 + PrimeReact UI + Redux Toolkit
  - Backend: Node.js + Express.js REST API
  - Database: MySQL
  - Security: JWT Authentication + Bcrypt password hashing
  - Branding:  colors (#323232, #FFC500, #FFFFFF)

  ---
  2. Core Modules

  Module 1 — Authentication & Security

  - Secure login page with JWT token-based authentication
  - Passwords hashed with bcrypt (never stored in plain text)
  - Automatic session expiry and logout on inactivity
  - All API endpoints are protected; unauthenticated requests are rejected

  Module 2 — Role-Based Access Control (RBAC)

  Four predefined roles with granular permissions across all modules:

  ┌─────────────┬────────────────────────────────────────────────────────────┐
  │    Role     │                        Access Level                        │
  ├─────────────┼────────────────────────────────────────────────────────────┤
  │ Super Admin │ Full system access — users, roles, permissions, audit logs │
  ├─────────────┼────────────────────────────────────────────────────────────┤
  │ Admin       │ Employee CRUD, reporting, manage regular admin users       │
  ├─────────────┼────────────────────────────────────────────────────────────┤
  │ Manager     │ View/manage employees, dashboard, audit logs               │
  ├─────────────┼────────────────────────────────────────────────────────────┤
  │ Viewer      │ Read-only access to employee data and dashboard            │
  └─────────────┴────────────────────────────────────────────────────────────┘

  - 23 specific permissions across 5 modules
  - System roles are protected — cannot be modified or deleted
  - Custom roles can be created via API for team-specific access
  - Permission caching (5-minute TTL) for performance optimization

  Module 3 — Admin Dashboard

  Real-time workforce metrics visible at a glance:
  - Total employees — Active, Inactive, On Leave, Terminated
  - Attrition tracking — identifies at-risk employees
  - Criticality levels — flags high-priority resources
  - Role distribution — visual breakdown by DEV, QA, etc.
  - Project overview — employee count per project
  - Recent activity feed — latest changes across the system

  Module 4 — Employee Management

  Complete employee lifecycle management:
  - Employee profiles include: SSO ID, name, role, phone, email, hire date, status, criticality level, skills, onsite/offshore manager      
  assignments
  - Advanced search & filter — by name, SSO, role, skills, department
  - Sortable, paginated data table for large datasets
  - Add / Edit / Delete employees with form validation and duplicate email prevention
  - Excel export — download full or filtered employee list as XLSX
  - Status indicators — Active, Inactive, On Leave, Terminated

  Module 5 — Project Management & Resource Allocation

  - Create and manage projects with statuses: Active, Planning, On Hold, Completed
  - Assign employees to projects with an allocation percentage
  - Support for multiple project assignments per employee
  - Visual project cards showing employee count and status
  - Identify resource gaps and over/under-allocation at a glance

  Module 6 — IT Asset Management

  Full asset lifecycle from procurement to retirement:
  - Asset inventory — Laptop, Desktop, Monitor, Peripherals, etc.
  - Fields: Brand, Model, Serial Number, Asset Tag, Specifications, Status
  - Asset statuses: Available, Assigned, Under Repair, Retired, Lost
  - Assign assets to employees with assignment date tracking
  - View all assets assigned to a specific employee
  - Track asset returns during offboarding

  Module 7 — Visa & Immigration Compliance

  Critical for managing the immigration status of the workforce:
  - Track visa type (H1B, L1, L2, Green Card, etc.)
  - Store visa start/end dates, I-94 expiry, passport number/expiry
  - Sponsor company details for H1B/L1 holders
  - Required fields clearly marked to ensure data completeness
  - Proactively identify upcoming visa expirations before they lapse

  Module 8 — Invoices & Purchase Orders (PO)

  - Invoices module for billing and financial tracking
  - PO (Purchase Order) management with CSV import support
  - Dedicated pages and routes for invoices and POs

  Module 9 — Audit Logs

  Full transparency and accountability:
  - Every create, update, and delete action is logged
  - Records: user, timestamp, IP address, user agent, entity type, change details
  - Searchable and filterable by entity type (employee, asset, role, etc.)
  - Excel export available to Super Admins for compliance audits

  Module 10 — Admin User Management

  - Create, update, and deactivate admin users
  - Assign or change roles (Super Admin only)
  - Users cannot modify their own account or delete themselves
  - Status: Active / Inactive

  ---
  3. Application Flow (End-to-End)

  Browser (React.js)
        |
        |  HTTPS Requests
        v
  Node.js / Express.js REST API (Port 5010)
        |
        |  JWT Auth Middleware → RBAC Permission Check
        |
        v
  Controllers (Business Logic)
        |
        v
  MySQL Database

  Frontend routes:
  - /login — Admin login
  - /dashboard — Analytics and metrics
  - /employees — Employee list with search/filter
  - /employees/add — Add employee form
  - /employees/edit/:id — Edit employee
  - /projects — Project management
  - /assets — Asset inventory
  - /invoices — Invoice management
  - /pos — Purchase orders
  - /admin/users — Admin user management
  - /admin/roles — Role management (Super Admin only)

  ---
  4. Key Technical Highlights

  ┌────────────────────────┬──────────────────────────────────────────────┐
  │        Feature         │                Implementation                │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ State Management       │ Redux Toolkit with async thunks              │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ API Layer              │ Axios with centralized service layer         │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ UI Components          │ PrimeReact enterprise-grade components       │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ Authentication         │ JWT tokens with role info embedded           │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ Password Security      │ bcrypt hashing with salt                     │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ Permission Enforcement │ Server-side middleware on every route        │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ Data Export            │ XLSX generation for employees and audit logs │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ Responsive Design      │ Works on desktop, tablet, and mobile         │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ Form Validation        │ Client-side + server-side validation         │
  ├────────────────────────┼──────────────────────────────────────────────┤
  │ Error Handling         │ Toast notifications for all user feedback    │
  └────────────────────────┴──────────────────────────────────────────────┘

  ---
  5. Business Value Delivered

  Operational:
  - Single source of truth for all employee data
  - Eliminates manual spreadsheet tracking
  - Real-time visibility into workforce metrics

  Compliance & Risk:
  - Proactive visa and immigration expiry tracking
  - Full audit trail for every action in the system
  - Role-based access prevents unauthorized data access

  Asset & Cost Management:
  - Tracks every IT asset from assignment to recovery
  - Reduces asset loss during employee departures
  - Streamlines equipment provisioning for new hires

  Workforce Planning:
  - Resource allocation across multiple projects
  - Attrition risk flagging for key employees
  - Skills and competency tracking for staffing decisions

  ---
  6. Implementation Phases

  1. Phase 1 — Setup — Install, configure, create admin accounts and roles
  2. Phase 2 — Data Migration — Import existing employee data (CSV import supported)
  3. Phase 3 — Training — Train HR team on all modules
  4. Phase 4 — Go-Live — Full deployment with ongoing support

  Estimated timeline: 4–6 weeks from start to full adoption

  ---
  This covers the complete end-to-end picture — from user login through every functional module to the database, along with the security    
  model and business impact. Let me know if you'd like me to expand on any specific module or prepare a demo script for the live portion of 
  the presentation.

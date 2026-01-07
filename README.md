# CourseHub

CourseHub is a full-stack web application built to streamline course management, TA workflows, sign-up scheduling and grading. It provides a clean, role-based system for students, teaching assistants and administrators, with a strong focus on security, usability and maintainable backend design.

## Key Features

- Course creation and management
- TA and student account management
- Assignment sign-up sheets with time slots and capacity limits
- Role-based authentication and authorization (Student, TA, Admin)
- Grading workflow with audit history and timestamps
- Student self-service sign-up and withdrawal with time constraints
- RESTful API with structured validation and error handling
- Responsive UI supporting desktop and mobile browsers

## Tech Stack

- **Frontend:** Angular, TypeScript  
- **Backend:** Node.js, Express  
- **Authentication:** JWT-based authentication  
- **API:** RESTful web services  
- **Version Control:** Git, GitHub  

## Application Roles

- **Unauthenticated Users**
  - View application overview
  - Search sign-up sheets by course code

- **Students**
  - View available and registered slots
  - Sign up for and leave slots within allowed time windows
  - View grades and feedback

- **Teaching Assistants**
  - Create and manage courses
  - Add members manually or via CSV upload
  - Create and manage sign-up sheets and slots
  - Enter and update grades with full audit tracking

- **Administrator**
  - All TA capabilities
  - Manage user roles
  - Reset passwords and enforce first-login password changes


## Setup and Run Instructions

### Prerequisites
- Node.js (v16 or later)
- npm

### Local Setup

1. Clone the repository:
- git clone <repository-url>
- cd coursehub

2. Install backend dependencies:
- cd server
- npm install

3. Start the backend server:
- npm start

4. Open the frontend:
- Navigate to the `client` directory
- npm start  

The application runs using a single backend endpoint that serves both the REST API and frontend resources.

## Security and Design Considerations

- JWT-based authentication for protected routes
- Input validation and sanitization on both client and server
- Role-based access control for sensitive actions
- Password hashing with salt
- Modular API design following REST best practices

## Future Enhancements

- Database integration (PostgreSQL or MongoDB)
- Modern frontend framework (React or Angular)
- Email notifications for sign-ups and grading
- Analytics dashboard for workload insights





<<<<<<< HEAD
# campus-fix-
=======
# CampusFix Full Stack

A deliberately simple full-stack version of the CampusFix frontend.

## Stack
- Node.js + Express
- JSON file persistence (no database setup required)
- bcryptjs password hashing
- express-session authentication
- Multer image uploads
- Plain HTML/CSS/JavaScript frontend

## What works
- Student registration and login
- Admin login
- Role-based access
- Persistent complaints
- Search/filter
- Complaint status workflow
- Admin status updates + notes
- Image uploads up to 5 MB
- Dashboard statistics
- Logout
- Data persists in `data/`
- Uploaded images persist in `uploads/`

## Run
1. Install Node.js 18+.
2. Open this folder in VS Code.
3. Open a terminal in this folder.
4. Run:
   `npm install`
5. Then:
   `npm start`
6. Open:
   `http://localhost:3000`

Do NOT double-click `index.html`. The app must be opened through the Node server.

## Demo accounts
Student:
- Email: `student@sit.edu`
- Password: `Student@123`

Admin:
- Email: `admin@sit.edu`
- Password: `Admin@123`

Change these credentials before using the project outside a demo.

## Important
This version intentionally avoids a database server to keep setup simple. `data/users.json` and `data/complaints.json` act as the local persistent data store.

For a production deployment, replace the JSON store/session setup with a real database and persistent session store, add stronger security controls, HTTPS, rate limiting, validation, backups, and environment secrets.

## Do I delete the old frontend?
No. Keep your old CampusFix frontend as a backup.

Use this project as a new folder. It already contains the adapted frontend under `public/`, so you do not need to manually merge the old files.
>>>>>>> 97309ab (Initial working CampusFix application)

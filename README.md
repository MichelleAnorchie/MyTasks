MyTasks – Full-Stack Task Management App

MyTasks is a mobile task management application built to help users organise their daily activities, manage priorities and keep track of deadlines through a simple, user-friendly interface.

The application uses React Native and Expo for the mobile frontend, Flask for the backend API, and MySQL for persistent data storage.

Features
* Create new tasks.
* Edit existing tasks.
* Mark tasks as completed or pending.
* Delete tasks.
* Assign Low, Medium or High priorities.
* Set optional due dates and times.
* Filter tasks by completion status and priority.
* Sort tasks by due date.
* Persist tasks in a MySQL database.
* Claymorphism-inspired user interface.

Technology Stack
Area	Technologies
Mobile frontend	React Native, Expo, TypeScript
Backend	Python, Flask
Database	MySQL
API communication	REST API, JSON
Styling	React Native Stylesheets


Project Structure

MyTasks/
│
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── requirements.txt
│   ├── test_db.py
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── index.tsx
│   │   └── services/
│   │       └── api.ts
│   ├── assets/
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md

Prerequisites

Before installing MyTasks, make sure you have:

* Git
* Python 3
* Node.js and npm
* MySQL Server
* MySQL Workbench (optional)
* Expo Go on your mobile device


Installation and Setup

1. Clone the repository

Open your terminal and run:

git clone https://github.com/MichelleAnorchie/MyTasks.git
cd MyTasks


2. Set up the MySQL database

Open MySQL Workbench or your MySQL command line and execute:

CREATE DATABASE mytasks_db;
USE mytasks_db;
CREATE TABLE tasks (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    is_completed TINYINT(1) DEFAULT 0,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    due_date DATE DEFAULT NULL,
    due_time TIME DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


3. Set up the Flask backend

Navigate to the backend folder:

cd backend

Create a Python virtual environment:

python3 -m venv .venv

Activate it on macOS/Linux:

source .venv/bin/activate

On Windows:

.venv\Scripts\activate

Install the dependencies:

pip install -r requirements.txt

4. Configure database credentials

Create a .env file inside the backend folder.

Copy the contents of .env.example into it and provide your own MySQL credentials:

DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=mytasks_db

Do not upload your .env file or share your database password.


5. Test the database connection

While inside the backend folder and with the virtual environment activated, run:

python test_db.py

A successful connection should display:

SUCCESS! Connected to MySQL.
Database: mytasks_db


6. Start the Flask API

Run:

python app.py

The backend runs on:

http://localhost:5001

Keep this terminal running.


7. Set up the mobile frontend

Open a second terminal window.

Navigate to the frontend folder from the project root:

cd frontend

Install dependencies:

npm install


8. Configure the frontend API address

Create a .env file inside the frontend folder.

Copy the contents of .env.example and replace the placeholder with your computer’s local network IP address:

EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:5001

For example:

EXPO_PUBLIC_API_URL=http://192.168.1.10:5001

Use your actual computer IP address, not the example above.

Important: When testing on a physical mobile device, the phone and computer should be connected to the same local network. Ensure your firewall allows connections to port 5001.

Restart Expo after changing environment variables.


9. Start the Expo application

From the frontend folder, run:

npx expo start

Scan the QR code using Expo Go on your mobile device.

You should now be able to use MyTasks on your phone.

API Endpoints

Method	Endpoint	Description
GET	/	Welcome message
GET	/tasks	Retrieve all tasks
POST	/tasks	Create a task
PUT	/tasks/<id>	Update a task
DELETE	/tasks/<id>	Delete a task

Environment Variables

The project uses environment variables to protect sensitive database credentials and configure API communication.

* DB_HOST – MySQL server address.
* DB_USER – MySQL username.
* DB_PASSWORD – MySQL password.
* DB_NAME – Database name.
* EXPO_PUBLIC_API_URL – Backend API address accessible to the mobile app.

Never commit real passwords or private credentials to GitHub.

Troubleshooting

Cannot connect to MySQL

* Ensure MySQL Server is running.
* Check your database name and credentials.
* Confirm that the tasks table has been created.

Mobile app cannot connect to the backend

* Ensure Flask is running on port 5001.
* Check the API address in the frontend .env file.
* Ensure your phone and computer are on the same network.
* Check your computer’s firewall settings.

Expo does not recognise environment changes

Stop Expo and restart it:

npx expo start --clear

Future Improvements

* Task reminders and notifications.
* User authentication.
* Cloud deployment.
* Additional productivity and task management features.

Author

Michelle Anorchie

GitHub: @MichelleAnorchie

⸻

Built with React Native, Expo, Flask and MySQL.
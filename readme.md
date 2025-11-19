# 🧠 Habit Tracker Server

This is the backend server for the Habit Tracker web application. Built with Express.js and MongoDB, it handles user habits, authentication, and secure data management.

---

## 🚀 Live Repository

🔗 GitHub: [Sakib8git/habit-tracker-server](https://github.com/Sakib8git/habit-tracker-server)

---

## 📦 Tech Stack

- **Express.js** – Fast and minimalist Node.js web framework  
- **MongoDB** – NoSQL database for storing user habits  
- **Firebase Admin SDK** – For secure token verification and user management  
- **CORS** – Cross-origin resource sharing  
- **dotenv** – Environment variable management

---
## Dependencies

```json
 "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "express": "^5.1.0",
    "firebase-admin": "^13.6.0",
    "mongodb": "^7.0.0"
  }
```

---

## 🔧 Installation & Run

###  Clone the Repository

`git clone https://github.com/Sakib8git/habit-tracker-server.git
cd habit-tracker-server`
`npm install`
`nodemon index.js`

PORT=3000
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.kyh1mx2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;





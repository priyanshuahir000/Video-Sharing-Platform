# 🎥 Video Sharing Platform

A modern, feature-rich platform for sharing and discovering videos built with Node.js and Express.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)

## ✨ Features

- 👤 User authentication with JWT
- 📹 Video upload and management
- 🔍 Search and discover videos
- 💬 User profiles
- 👁️ Video watch history
- 👍 Like and comment functionality
- ✅ Publish/unpublish controls for content creators

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **File Handling**: Multer

## 📝 API Documentation

### 🔐 Authentication Endpoints

| Method | Endpoint                      | Description          |
| ------ | ----------------------------- | -------------------- |
| POST   | `/api/v1/users/register`      | Register new user    |
| POST   | `/api/v1/users/login`         | Login user           |
| POST   | `/api/v1/users/logOut`        | Logout user          |
| POST   | `/api/v1/users/refresh-token` | Refresh access token |

### 📹 Video Endpoints

| Method | Endpoint                                 | Description           |
| ------ | ---------------------------------------- | --------------------- |
| GET    | `/api/v1/videos`                         | Get all videos        |
| POST   | `/api/v1/videos`                         | Upload new video      |
| GET    | `/api/v1/videos/:videoId`                | Get video by ID       |
| PATCH  | `/api/v1/videos/:videoId`                | Update video          |
| DELETE | `/api/v1/videos/:videoId`                | Delete video          |
| PATCH  | `/api/v1/videos/toggle/publish/:videoId` | Toggle publish status |

### 👤 User Endpoints

| Method | Endpoint                               | Description              |
| ------ | -------------------------------------- | ------------------------ |
| GET    | `/api/v1/users/get-current-user`       | Get current user details |
| PATCH  | `/api/v1/users/update-account-details` | Update user details      |
| PATCH  | `/api/v1/users/update-avatar`          | Update user avatar       |
| PATCH  | `/api/v1/users/update-cover-image`     | Update cover image       |
| GET    | `/api/v1/users/channel/:username`      | Get user channel profile |

## 🔧 Setup & Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Video-Sharing-Platform
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:

   ```
   PORT=8000
   MONGODB_URI=your_mongodb_connection_string
   CORS_ORIGIN=*

   ACCESS_TOKEN_SECRET=your_access_token_secret
   ACCESS_TOKEN_EXPIRY=1d
   REFRESH_TOKEN_SECRET=your_refresh_token_secret
   REFRESH_TOKEN_EXPIRY=10d

   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```


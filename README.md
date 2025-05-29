# Barter Trading System

A modern web application for barter trading built with Node.js, Express, and MongoDB.

## Docker Setup

### Prerequisites

- Docker installed on your system
- Git (to clone the repository)

### Building the Image

1. Clone the repository:

```bash
git clone <your-repository-url>
cd TradeSystem
```

2. Build the Docker image:

```bash
docker build -t haison/barter-trading .
```

### Running the Container

Run the container with the following command:

```bash
docker run -d \
  --name barter-trading \
  -p 3000:3000 \
  -p 27017:27017 \
  -v "$(pwd)/public/uploads:/usr/src/app/public/uploads" \
  -v mongodb_data:/data/db \
  -e MONGODB_URI=mongodb://localhost:27017/barter-trading \
  -e SESSION_SECRET=barter-trading-secret-key-2025 \
  -e NODE_ENV=development \
  haison/barter-trading
```

### Accessing the Application

- Web Application: http://localhost:3000
- MongoDB: localhost:27017

### Student Identity Endpoint

Access the student identity endpoint at:

```
http://localhost:3000/api/student
```

Expected output:

```json
{
  "name": "Hai Son Tran",
  "studentId": "224252426"
}
```

### Useful Docker Commands

```bash
# View container logs
docker logs -f barter-trading

# Stop the container
docker stop barter-trading

# Start the container
docker start barter-trading

# Remove the container
docker rm -f barter-trading

# Access MongoDB shell
docker exec -it barter-trading mongosh
```

### Environment Variables

The application uses the following environment variables:

- `MONGODB_URI`: MongoDB connection string
- `SESSION_SECRET`: Secret key for session management
- `NODE_ENV`: Application environment (development/production)

### Volumes

The container uses two volumes:

- `public/uploads`: For storing uploaded files
- `mongodb_data`: For persisting MongoDB data

### Ports

- `3000`: Web application
- `27017`: MongoDB

# Trade System

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Overview

Trade System is a modern barter trading platform that enables users to exchange items with each other in a secure and user-friendly environment. The system facilitates item listings, trade proposals, negotiations, and trade completion with a focus on user experience and security.

## ✨ Features

### 👤 User Management

- **Authentication & Security**

  - User registration and login
  - Secure password management
  - Session handling
  - Protected routes

- **Profile Management**
  - Customizable user profiles
  - User ratings and feedback system
  - Activity tracking
  - Profile picture upload

### 🎯 Item Management

- **Listing Features**

  - Create, edit, and delete item listings
  - Multiple image uploads (up to 5 images)
  - Item categorization
  - Search and filter functionality

- **Item Status**
  - Available
  - Pending
  - Traded
  - Location tracking
  - Condition and description management

### 🔄 Trade System

- **Trade Features**

  - Create trade proposals
  - Multiple items in single trade
  - Trade status management
  - Trade history tracking

- **Trade Statuses**
  - Pending
  - Accepted
  - Rejected
  - Completed
  - Cancelled

### 💬 Communication

- **Messaging System**

  - In-trade messaging
  - User-to-user messaging
  - Real-time notifications

- **Activity Notifications**
  - Trade proposals
  - Trade acceptances
  - Trade rejections
  - Trade completions
  - Trade cancellations

### 📊 Dashboard

- **User Dashboard**
  - Personalized activity feed
  - Quick action buttons
  - Trade status overview
  - Item management shortcuts

### 🛡️ Security

- **Security Features**
  - Secure authentication
  - Protected routes
  - Input validation
  - File upload security
  - Session management

## 🛠️ Technical Stack

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose ODM

### Frontend

- EJS Templates
- Material Design
- Responsive Design
- JavaScript/jQuery

### Database

- MongoDB integration
- Efficient data modeling
- Indexed queries
- Data validation

### File Management

- Secure file uploads
- Image processing
- File type validation
- Storage optimization

### API

- RESTful endpoints
- JSON responses
- Error handling
- Rate limiting

## 📋 Requirements

### System Requirements

- Node.js v14 or higher
- MongoDB v4.4 or higher
- Modern web browser
- Internet connection

### Development Requirements

- Git
- npm or yarn
- Code editor
- MongoDB Compass (optional)

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/trade-system.git
   cd trade-system
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/trade_system
   SESSION_SECRET=your_session_secret
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Database Configuration

- MongoDB connection settings in `config/db.js`
- Session store configuration in `app.js`

### File Upload Configuration

- Image upload settings in `routes/itemRoutes.js`
- File size limits and allowed types

## 📈 Future Enhancements

- [ ] Real-time notifications
- [ ] Mobile application
- [ ] Advanced search filters
- [ ] Trade analytics
- [ ] User verification system
- [ ] Payment integration
- [ ] Automated trade matching

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Material Design for UI components
- MongoDB for database
- Express.js for backend framework

## 📞 Support

For support and bug reports, please contact the development team or create an issue in the repository.

---

_Last Updated: May 28, 2025_

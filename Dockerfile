# Use MongoDB base image
FROM mongo:latest

# Install Node.js and other dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Create upload directories and MongoDB data directory
RUN mkdir -p public/uploads/items public/uploads/profiles /data/db

# Make scripts executable
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose ports
EXPOSE 3000 27017

# Start MongoDB and Node.js app
CMD ["/start.sh"] 

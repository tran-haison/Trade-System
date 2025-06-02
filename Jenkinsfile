pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'haison/barter-trading'
        DOCKER_TAG = "${BUILD_NUMBER}"
        SONAR_TOKEN = credentials('sonar-token')
        EMAIL_RECIPIENTS = 'dev.sonth2501@gmail.com'
        NEW_RELIC_LICENSE_KEY = credentials('newrelic-license-key')
        NEW_RELIC_APP_NAME = 'barter-trading'
        
        // Database credentials
        POSTGRES_USER = credentials('postgres-user')
        POSTGRES_PASSWORD = credentials('postgres-password')
        POSTGRES_DB = credentials('postgres-db')
        
        // Application environment variables
        MONGODB_URI = 'mongodb://mongodb:27017/barter-trading'
        SESSION_SECRET = credentials('session-secret')
        NODE_ENV = 'development'
    }
    
    stages {
        stage('Setup Environment') {
            steps {
                script {
                    // Create .env file from credentials
                    sh '''
                        cat > .env << EOL
                        # Database Configuration
                        POSTGRES_USER=${POSTGRES_USER}
                        POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
                        POSTGRES_DB=${POSTGRES_DB}
                        
                        # Application Configuration
                        MONGODB_URI=${MONGODB_URI}
                        SESSION_SECRET=${SESSION_SECRET}
                        NODE_ENV=${NODE_ENV}
                        EOL
                    '''
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    // Build Docker image
                    sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
                    sh "docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest"
                    
                    // Save Docker image as artifact
                    sh "docker save ${DOCKER_IMAGE}:${DOCKER_TAG} | gzip > barter-trading-${DOCKER_TAG}.tar.gz"
                    archiveArtifacts artifacts: "barter-trading-${DOCKER_TAG}.tar.gz"
                }
            }
        }
        
        stage('Test') {
            steps {
                script {
                    // Install dependencies
                    sh 'npm install'
                    
                    // Start the development server in the background
                    sh 'npm run dev &'
                    
                    // Wait for the server to be ready
                    sh 'sleep 15'

                    sh 'npm run test:unit'

                    sh 'npm run test:integration'
                    
                    sh 'npm run test:e2e'
                    
                    // try {
                    //     parallel {
                    //         stage('Unit Tests') {
                    //             steps {
                    //                 sh 'npm run test:unit'
                    //             }
                    //         }
                    //         stage('Integration Tests') {
                    //             steps {
                    //                 sh 'npm run test:integration'
                    //             }
                    //         }
                    //         stage('E2E Tests') {
                    //             steps {
                    //                 sh 'npm run test:e2e'
                    //             }
                    //         }
                    //     }
                    // } finally {
                    //     // Kill the development server
                    //     sh 'pkill -f "node.*dev" || true'
                    // }
                }
            }
        }
        
        stage('Code Quality') {
            steps {
                script {
                    // Run SonarQube analysis
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            sonar-scanner
                        '''
                    }
                }
            }
        }
        
        stage('Security') {
            steps {
                script {
                    // Run npm audit
                    sh 'npm audit'
                    
                    // Run Snyk security scan
                    sh 'snyk test'
                }
            }
        }
        
        stage('Deploy to Staging') {
            steps {
                script {
                    // Deploy to staging environment
                    sh '''
                        docker-compose -f docker-compose.staging.yml down
                        docker-compose -f docker-compose.staging.yml up -d
                    '''
                }
            }
        }
        
        stage('Release to Production') {
            when {
                branch 'main'
            }
            steps {
                script {
                    // Deploy to production
                    sh '''
                        docker-compose -f docker-compose.prod.yml down
                        docker-compose -f docker-compose.prod.yml up -d
                    '''
                }
            }
        }
        
        stage('Monitoring') {
            steps {
                script {
                    // Set up New Relic monitoring
                    sh '''
                        newrelic-admin run-program npm start
                    '''
                }
            }
        }
    }
    
    post {
        always {
            // Clean up workspace
            cleanWs()
        }
        
        success {
            // Send success email notification
            emailext (
                subject: "Pipeline Succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    <p>Pipeline <b>${env.JOB_NAME}</b> build #${env.BUILD_NUMBER} has succeeded!</p>
                    <p>Build URL: <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></p>
                    <p>Changes: ${currentBuild.changeSets}</p>
                    <p>Duration: ${currentBuild.durationString}</p>
                """,
                to: "${EMAIL_RECIPIENTS}",
                mimeType: 'text/html'
            )
        }
        
        failure {
            // Send failure email notification
            emailext (
                subject: "Pipeline Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    <p>Pipeline <b>${env.JOB_NAME}</b> build #${env.BUILD_NUMBER} has failed!</p>
                    <p>Build URL: <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></p>
                    <p>Changes: ${currentBuild.changeSets}</p>
                    <p>Duration: ${currentBuild.durationString}</p>
                    <p>Error: ${currentBuild.description ?: 'No error description available'}</p>
                """,
                to: "${EMAIL_RECIPIENTS}",
                mimeType: 'text/html'
            )
        }
    }
} 
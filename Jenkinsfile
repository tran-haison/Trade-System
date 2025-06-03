pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'haison/barter-trading'
        DOCKER_TAG = "${BUILD_NUMBER}"
        SONAR_TOKEN = credentials('sonar-token')
        EMAIL_RECIPIENTS = 'dev.sonth2501@gmail.com'
        NEW_RELIC_LICENSE_KEY = credentials('newrelic-license-key')
        NEW_RELIC_APP_NAME = 'barter-trading'        
        SESSION_SECRET = credentials('session-secret')
        SNYK_TOKEN = credentials('snyk-token')
    }
    
    stages {
        stage('Setup Environment') {
            steps {
                script {
                    // Create .env file from credentials
                    sh '''
                        cat > .env << EOL
                        # Application Configuration
                        MONGODB_URI=mongodb://mongodb:27017/barter-trading
                        SESSION_SECRET=${SESSION_SECRET}
                        NODE_ENV=development
                        EOL
                    '''
                }
            }
        }
        
        // stage('Build') {
        //     steps {
        //         script {
        //             // Build Docker image
        //             sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
        //             sh "docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest"
                    
        //             // Save Docker image as artifact
        //             sh "docker save ${DOCKER_IMAGE}:${DOCKER_TAG} | gzip > barter-trading-${DOCKER_TAG}.tar.gz"
        //             archiveArtifacts artifacts: "barter-trading-${DOCKER_TAG}.tar.gz"
        //         }
        //     }
        // }
        
        // stage('Test') {
        //     steps {
        //         script {
        //             // Install dependencies
        //             sh 'npm install'
                    
        //             // Start the development server in the background
        //             sh 'npm run dev &'
                    
        //             // Wait for the server to be ready
        //             sh 'sleep 15'
                    
        //             sh 'npm run test:unit'
        //             sh 'npm run test:integration'
                    
        //             // Start Xvfb and run Cypress tests
        //             sh '''
        //                 Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
        //                 export DISPLAY=:99
        //                 npm run test:e2e
        //             '''
        //         }
        //     }
        // }
        
        // stage('Code Quality') {
        //     steps {
        //         script {
        //             // Run SonarQube analysis
        //             sh '''
        //                 sonar-scanner \
        //                     -Dsonar.token=${SONAR_TOKEN}
        //             '''
        //         }
        //     }
        // }
        
        // stage('Security') {
        //     steps {
        //         script {
        //             // Run npm audit
        //             sh 'npm audit'
                    
        //             // Run Snyk security scan
        //             sh 'snyk test --token=${SNYK_TOKEN}'
        //         }
        //     }
        // }
        
        // stage('Deploy to Staging') {
        //     steps {
        //         script {
        //             // Deploy to staging environment
        //             sh '''
        //                 docker-compose -f docker-compose.staging.yml down
        //                 docker-compose -f docker-compose.staging.yml up -d
        //             '''
        //         }
        //     }
        // }
        
        stage('Release to Production') {
            when {
                branch 'develop'
            }
            environment {
                HEROKU_API_KEY = credentials('heroku-api-key')
                HEROKU_APP_NAME = 'barter-trading'
            }
            steps {
                script {
                    // Deploy to production
                    // Set up Heroku authentication
                    sh '''
                        echo "$HEROKU_API_KEY" | heroku auth:token > ~/.netrc
                        heroku git:remote -a $HEROKU_APP_NAME
                    '''

                    // Push to Heroku (Git-based deploy)
                    sh '''
                        git config --global user.email "ci@example.com"
                        git config --global user.name "Jenkins CI"
                        git add .
                        git commit -m "Automated deploy by Jenkins" || true
                        git push heroku HEAD:main -f
                    '''
                }
            }
        }
        
        // stage('Monitoring') {
        //     steps {
        //         script {
        //             // Set up New Relic monitoring
        //             sh '''
        //                 newrelic-admin run-program npm start
        //             '''
        //         }
        //     }
        // }
    }
    
    post {
        always {
            // Clean up containers and workspace
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
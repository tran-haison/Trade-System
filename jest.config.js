module.exports = {
    testEnvironment: 'node',
    setupFiles: ['dotenv/config'],
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    testTimeout: 10000,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '**/*.{js,jsx}',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!**/tests/**'
    ],
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: '.',
            outputName: 'test-report.xml',
            classNameTemplate: '{classname}',
            titleTemplate: '{title}',
            ancestorSeparator: ' › ',
            usePathForSuiteName: true
        }]
    ]
}; 
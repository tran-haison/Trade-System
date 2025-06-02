describe('Authentication', () => {
    beforeEach(() => {
        cy.visit('/');
        // Clear cookies and localStorage before each test
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    // Generate a unique email for each test run
    const timestamp = new Date().getTime();
    const testUser = {
        firstName: 'Test',
        lastName: 'User',
        email: `test${timestamp}@example.com`,
        password: 'Test1@test'
    };

    it('should navigate to login page', () => {
        cy.get('a[href="/users/login"]').first().click();
        cy.url().should('include', '/users/login');
        cy.get('h2').should('contain', 'Sign in to your account');
    });

    it('should navigate to register page', () => {
        cy.get('a[href="/users/register"]').first().click();
        cy.url().should('include', '/users/register');
        cy.get('h2').should('contain', 'Create your account');
    });

    it('should register a new user', () => {
        cy.visit('/users/register');
        cy.get('input[name="firstName"]').type(testUser.firstName);
        cy.get('input[name="lastName"]').type(testUser.lastName);
        cy.get('input[name="email"]').type(testUser.email);
        cy.get('input[name="password"]').type(testUser.password);
        cy.get('input[name="confirmPassword"]').type(testUser.password);
        cy.get('input[name="terms"]').check();
        cy.get('button[type="submit"]').click();
        cy.url().should('include', '/users/login');
        cy.get('.card-panel').should('contain', 'registered');
    });

    it('should login with valid credentials', () => {
        // First register a new user with unique email
        const loginEmail = `test${new Date().getTime()}@example.com`;
        cy.register(testUser.firstName, testUser.lastName, loginEmail, testUser.password);
        
        // Then login
        cy.visit('/users/login');
        cy.get('input[name="email"]').type(loginEmail);
        cy.get('input[name="password"]').type(testUser.password);
        cy.get('button[type="submit"]').click();
        
        // Verify successful login
        cy.url().should('include', '/dashboard');
        cy.get('h4').should('contain', 'Welcome');
    });

    it('should show error with invalid login credentials', () => {
        cy.visit('/users/login');
        cy.get('input[name="email"]').type('wrong@example.com');
        cy.get('input[name="password"]').type('wrongpassword');
        cy.get('button[type="submit"]').click();
        
        // Verify error message
        cy.url().should('include', '/users/login');
        cy.get('.card-panel').should('contain', 'Incorrect');
    });

    it('should logout successfully', () => {
        // First register and login with unique email
        const logoutEmail = `test${new Date().getTime()}@example.com`;
        cy.register(testUser.firstName, testUser.lastName, logoutEmail, testUser.password);
        cy.visit('/users/login');
        cy.get('input[name="email"]').type(logoutEmail);
        cy.get('input[name="password"]').type(testUser.password);
        cy.get('button[type="submit"]').click();
        
        // Verify we're logged in
        cy.url().should('include', '/dashboard');
        
        // Then logout - make selector more specific
        cy.get('nav a[href="/users/logout"]').first().click();
        
        // Verify logout success
        cy.url().should('include', '/');
        cy.get('.card-panel').should('contain', 'logged out');
    });

    it('should redirect to dashboard when accessing protected routes while logged in', () => {
        // Login first with unique email
        const protectedEmail = `test${new Date().getTime()}@example.com`;
        cy.register(testUser.firstName, testUser.lastName, protectedEmail, testUser.password);
        cy.visit('/users/login');
        cy.get('input[name="email"]').type(protectedEmail);
        cy.get('input[name="password"]').type(testUser.password);
        cy.get('button[type="submit"]').click();
        
        // Try to access login page while logged in
        cy.visit('/users/login');
        cy.url().should('include', '/dashboard');
    });

    it('should redirect to login when accessing protected routes while logged out', () => {
        cy.visit('/dashboard');
        cy.url().should('include', '/users/login');
        cy.get('.card-panel').should('contain', 'Please log in');
    });
}); 
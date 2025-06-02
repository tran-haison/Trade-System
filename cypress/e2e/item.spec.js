require('cypress-file-upload');

describe('Item Management E2E', () => {
    const timestamp = Date.now();
    const testUser = {
        firstName: 'Item',
        lastName: 'Tester',
        email: `itemtester${timestamp}@example.com`,
        password: 'Test1@test'
    };
    const itemData = {
        title: 'Cypress Test Item',
        description: 'This is a test item added by Cypress.',
        category: 'Electronics',
        condition: 'New',
        location: 'Testville'
    };

    before(() => {
        cy.register(testUser.firstName, testUser.lastName, testUser.email, testUser.password);
    });

    beforeEach(() => {
        cy.login(testUser.email, testUser.password);
    });

    it('should add a new item', () => {
        cy.visit('/items/manage');
        cy.contains('List New Item').click();
        cy.url().should('include', '/items/create');

        // Step 1: Basic Info
        cy.get('textarea[name="title"]').type(itemData.title);
        cy.get('select[name="category"]').select(itemData.category);
        cy.get('select[name="condition"]').select(itemData.condition);
        cy.get('button#to-step-2').click();

        // Step 2: Details
        cy.get('textarea[name="description"]').type(itemData.description);
        cy.get('textarea[name="location"]').type(itemData.location);
        cy.get('button#to-step-3').click();

        // Step 3: Photos
        cy.get('input[type="file"]').attachFile('test-image.png');
        cy.get('button#submit-btn').click();

        // Assert item is added
        cy.url().should('include', '/items/manage');
        cy.contains(itemData.title).should('exist');
    });

    it('should edit an item', () => {
        cy.visit('/items/manage');
        cy.contains(itemData.title).parents('.item-card').within(() => {
            cy.get('a[title="Edit"]').click();
        });
        cy.url().should('include', '/edit');

        // Update item
        cy.get('textarea[name="title"]').clear().type(itemData.title + ' Edited');
        cy.get('select[name="condition"]').select('Good');
        cy.get('textarea[name="description"]').clear().type('Updated description');
        cy.get('textarea[name="location"]').clear().type('Updated location');

        // Submit the form
        cy.get('button[type="submit"]').contains(/save|update|edit/i).click();

        // Assert changes
        cy.url().should('include', '/items/manage');
        cy.contains(itemData.title + ' Edited').should('exist');
        cy.contains('Updated location').should('exist');
    });

    it('should delete an item', () => {
        cy.visit('/items/manage');
        // Find the edited item card and click the delete button
        cy.contains(itemData.title + ' Edited').parents('.item-card').within(() => {
            cy.get('button.delete-btn').click();
        });
        // Confirm the modal appears
        cy.get('#deleteModal').should('be.visible');
        // Confirm deletion (the confirm button is #confirmDeleteBtn)
        cy.get('#confirmDeleteBtn').click();
        // Assert the item is no longer present
        cy.contains(itemData.title + ' Edited').should('not.exist');
    });
}); 
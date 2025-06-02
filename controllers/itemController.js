const itemService = require('../services/itemService');

// Get all items with pagination and filters
exports.getItems = async (req, res) => {
    if (!res || typeof res.render !== 'function') {
        console.error('Invalid response object in getItems');
        return;
    }

    try {
        const result = await itemService.getItemsService(req.query || {});
        if (!result) {
            return res.status(404).render('error', { 
                message: 'No items found',
                error: {}
            });
        }
        
        return res.render('items/browseItem', {
            title: 'Browse Items',
            items: result.items || [],
            currentPage: result.currentPage || 1,
            pages: result.pages || 1,
            query: req.query || {}
        });
    } catch (error) {
        console.error('Error in getItems:', error);
        return res.status(500).render('error', {
            message: 'Error fetching items',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Get single item
exports.getItem = async (req, res) => {
    try {
        const item = await itemService.getItemService(req.params.id);
        if (!item) {
            return res.status(404).render('error', { message: 'Item not found' });
        }
        res.render('items/show', { item });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

// Create new item
exports.createItem = async (req, res) => {
    try {
        const { title, description, category, condition, location } = req.body;
        const images = Array.isArray(req.files) ? req.files.map(file => file.filename) : [];
        const owner = req.user.id;

        // Validate required fields
        if (!title || !description || !category || !condition || !location) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide all required fields'
                });
            }
            req.flash('error_msg', 'Please provide all required fields');
            return res.redirect('/items/create');
        }

        const newItem = await itemService.createItemService({
            title,
            description,
            category,
            condition,
            location,
            images,
            owner,
            status: 'Available'
        });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(201).json({
                success: true,
                message: 'Item created successfully',
                data: newItem
            });
        }

        req.flash('success_msg', 'Item created successfully');
        res.redirect('/items/manage');
    } catch (err) {
        console.error(err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: 'Server Error',
                error: err.message
            });
        }
        res.status(500).render('error', { message: 'Server Error' });
    }
};

// Update item
exports.updateItem = async (req, res) => {
    try {
        const { title, description, category, condition, location, status } = req.body;
        const images = Array.isArray(req.files) && req.files.length > 0 ? req.files.map(file => file.filename) : undefined;
        const item = await itemService.updateItemService(
            req.params.id,
            req.user.id,
            { title, description, category, condition, location, images, status }
        );
        if (!item) {
            return res.status(404).render('error', { message: 'Item not found' });
        }
        req.flash('success_msg', 'Item updated successfully');
        res.redirect(`/items/manage`);
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

// Delete item
exports.deleteItem = async (req, res) => {
    try {
        const item = await itemService.deleteItemService(req.params.id, req.user.id);
        if (!item) {
            return res.status(404).render('error', { message: 'Item not found' });
        }
        req.flash('success_msg', 'Item deleted successfully');
        res.redirect('/items/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

// Render manage items page
exports.getManageItems = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status = 'all', search = '' } = req.query;
        const items = await itemService.getUserItemsWithFilters(userId, { status, search });
        const activeListings = await itemService.countUserItemsByStatus(userId, 'Available');
        const completedTrades = await itemService.countUserItemsByStatus(userId, 'Traded');
        // TODO: Static values for now
        const totalViews = 2400;
        const tradeRequests = 18;
        res.render('items/manageItems', {
            user: req.user,
            items,
            activeListings,
            completedTrades,
            totalViews,
            tradeRequests,
            status,
            search
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

// API: Bulk delete items
exports.bulkDeleteItemsApi = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No items selected' });
        }
        await itemService.deleteItemsByIdsAndOwner(ids, req.user._id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// API: Bulk update items
exports.bulkUpdateItemsApi = async (req, res) => {
    try {
        const { ids, update } = req.body;
        if (!Array.isArray(ids) || ids.length === 0 || typeof update !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }
        await itemService.updateItemsByIdsAndOwner(ids, req.user._id, update);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
}; 
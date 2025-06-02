const Item = require('../models/Item');

// Get all items with pagination and filters
async function getItemsService(queryParams = {}) {
    const page = parseInt(queryParams?.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    let query = {
        status: { $in: ['Available', 'Pending'] } // Only show Available and Pending items
    };

    // Category and condition filters
    if (queryParams?.category) query.category = queryParams.category;
    if (queryParams?.condition) query.condition = queryParams.condition;
    if (queryParams?.location) query.location = new RegExp(queryParams.location, 'i');

    // Search functionality
    if (queryParams?.search) {
        const searchRegex = new RegExp(queryParams.search, 'i');
        query.$or = [
            { title: searchRegex },
            { description: searchRegex }
        ];
    }

    const items = await Item.find(query)
        .populate('owner', 'firstName lastName rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await Item.countDocuments(query);
    const pages = Math.ceil(total / limit);
    return { items, currentPage: page, pages };
}

// Get single item
async function getItemService(itemId) {
    const item = await Item.findById(itemId)
        .populate('owner', 'firstName lastName rating location');
    return item;
}

// Create new item
async function createItemService({ title, description, category, condition, location, images, owner, status = 'Available' }) {
    const newItem = new Item({
        title,
        description,
        category,
        condition,
        location,
        images,
        owner,
        status
    });
    await newItem.save();
    return newItem;
}

// Update item
async function updateItemService(itemId, ownerId, { title, description, category, condition, location, images, status }) {
    const updateData = {
        title,
        description,
        category,
        condition,
        location,
        status
    };
    if (images && images.length > 0) updateData.images = images;
    const item = await Item.findOneAndUpdate(
        { _id: itemId, owner: ownerId },
        { $set: updateData },
        { new: true }
    );
    return item;
}

// Delete item
async function deleteItemService(itemId, ownerId) {
    const item = await Item.findOneAndDelete({ _id: itemId, owner: ownerId });
    return item;
}

// Get items for browsing (only available and pending items)
async function getBrowseItems(query = {}) {
    const filter = {
        status: { $in: ['Available', 'Pending'] },
        ...query
    };

    return await Item.find(filter)
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: -1 });
}

// Get items by owner
async function getItemsByOwner(ownerId) {
    return await Item.find({ owner: ownerId })
        .sort({ createdAt: -1 });
}

// Get item by ID
async function getItemById(itemId) {
    return await Item.findById(itemId)
        .populate('owner', 'firstName lastName email');
}

// Create new item
async function createItem(itemData) {
    const item = new Item(itemData);
    return await item.save();
}

// Update item
async function updateItem(itemId, updateData) {
    return await Item.findByIdAndUpdate(
        itemId,
        { $set: updateData },
        { new: true }
    );
}

// Delete item
async function deleteItem(itemId) {
    return await Item.findByIdAndDelete(itemId);
}

// Update multiple items status
async function updateItemsStatus(itemIds, status) {
    return await Item.updateMany(
        { _id: { $in: itemIds } },
        { $set: { status: status } }
    );
}

// Count items for a user by status
async function countUserItemsByStatus(userId, status) {
    return await Item.countDocuments({ owner: userId, status });
}

// Get user's items with optional status/search filters
async function getUserItemsWithFilters(userId, filters = {}) {
    const query = { owner: userId };
    if (filters.status && filters.status !== 'all') {
        query.status = filters.status.charAt(0).toUpperCase() + filters.status.slice(1);
    }
    if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        query.$or = [
            { title: searchRegex },
            { description: searchRegex }
        ];
    }
    return await Item.find(query).sort({ createdAt: -1 });
}

// Bulk delete items by IDs and owner
async function deleteItemsByIdsAndOwner(ids, ownerId) {
    return await Item.deleteMany({ _id: { $in: ids }, owner: ownerId });
}

// Bulk update items by IDs and owner
async function updateItemsByIdsAndOwner(ids, ownerId, update) {
    return await Item.updateMany({ _id: { $in: ids }, owner: ownerId }, { $set: update });
}

module.exports = {
    getItemsService,
    getItemService,
    createItemService,
    updateItemService,
    deleteItemService,
    getBrowseItems,
    getItemsByOwner,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    updateItemsStatus,
    countUserItemsByStatus,
    getUserItemsWithFilters,
    deleteItemsByIdsAndOwner,
    updateItemsByIdsAndOwner
}; 
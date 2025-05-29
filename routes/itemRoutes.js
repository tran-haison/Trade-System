const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const itemController = require('../controllers/itemController');
const Activity = require('../models/Activity');
const multer = require('multer');
const path = require('path');
const itemService = require('../services/itemService');
const Item = require('../models/Item');

// Configure multer for item images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/items');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Get all items
router.get('/', itemController.getItems);

// Manage items page
router.get('/manage', ensureAuthenticated, itemController.getManageItems);

// Get available items for trade (API endpoint)
router.get('/my/available', ensureAuthenticated, async (req, res) => {
    try {
        const items = await Item.find({
            owner: req.user._id,
            status: 'Available'
        }).select('title description images');

        res.json(items);
    } catch (error) {
        console.error('Error fetching available items:', error);
        res.status(500).json({ error: 'Failed to fetch available items' });
    }
});

// Create item
router.post('/', ensureAuthenticated, upload.array('images', 5), async (req, res) => {
    try {
        const result = await itemController.createItem(req, res);

        // Only create activity if item was created successfully
        if (result && result.data) {
            await Activity.create({
                user: req.user._id,
                type: 'ITEM_ADDED',
                description: `Added new item: ${result.data.title}`,
                relatedItem: result.data._id
            });
        }

        // The controller will handle the response
        return;
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).render('error', {
            title: 'Error',
            msg: 'Failed to create item',
            error: error
        });
    }
});

// Create item form
router.get('/create', (req, res) => {
    res.render('items/addItem', {
        title: 'Add New Item',
    });
});

// API: Bulk delete items
router.post('/api/bulk-delete', ensureAuthenticated, itemController.bulkDeleteItemsApi);
// API: Bulk update items
router.post('/api/bulk-update', ensureAuthenticated, itemController.bulkUpdateItemsApi);

// Edit item form
router.get('/:id/edit', ensureAuthenticated, async (req, res) => {
    try {
        const item = await Item.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!item) {
            return res.status(404).render('error', { message: 'Item not found' });
        }

        res.render('items/editItem', {
            title: 'Edit Item',
            item
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
});

// Get single item
router.get('/:id', itemController.getItem);

// Update item
router.put('/:id', ensureAuthenticated, upload.array('images', 5), itemController.updateItem);

// Delete item
router.delete('/:id', ensureAuthenticated, itemController.deleteItem);

module.exports = router; 

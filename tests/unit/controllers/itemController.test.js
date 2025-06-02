const itemController = require('../../../controllers/itemController');
const itemService = require('../../../services/itemService');

jest.mock('../../../services/itemService');

describe('itemController', () => {
    let req, res;
    beforeEach(() => {
        req = { params: {}, body: {}, query: {}, user: { id: 'user1', _id: 'user1' }, files: [], headers: {} };
        res = {
            render: jest.fn(),
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
            locals: {},
        };
        req.flash = jest.fn();
    });

    afterEach(() => jest.clearAllMocks());

    it('getItems should render browseItem with items', async () => {
        itemService.getItemsService.mockResolvedValue({ items: [], currentPage: 1, pages: 1 });
        await itemController.getItems(req, res);
        expect(res.render).toHaveBeenCalledWith('items/browseItem', expect.objectContaining({ items: [] }));
    });

    it('getItem should render show with item', async () => {
        itemService.getItemService.mockResolvedValue({ _id: 'item1' });
        req.params.id = 'item1';
        await itemController.getItem(req, res);
        expect(res.render).toHaveBeenCalledWith('items/show', { item: { _id: 'item1' } });
    });

    it('getItem should render error if not found', async () => {
        itemService.getItemService.mockResolvedValue(null);
        req.params.id = 'item1';
        await itemController.getItem(req, res);
        expect(res.render).toHaveBeenCalledWith('error', { message: 'Item not found' });
    });

    it('createItem should create and redirect on success', async () => {
        itemService.createItemService.mockResolvedValue({ _id: 'item1' });
        req.body = { title: 'A', description: 'B', category: 'Electronics', condition: 'New', location: 'Loc' };
        req.files = [{ filename: 'img.jpg' }];
        await itemController.createItem(req, res);
        expect(itemService.createItemService).toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('success_msg', 'Item created successfully');
        expect(res.redirect).toHaveBeenCalledWith('/items/manage');
    });

    it('createItem should handle missing fields', async () => {
        req.body = {};
        await itemController.createItem(req, res);
        expect(req.flash).toHaveBeenCalledWith('error_msg', 'Please provide all required fields');
        expect(res.redirect).toHaveBeenCalledWith('/items/create');
    });

    it('updateItem should update and redirect on success', async () => {
        itemService.updateItemService.mockResolvedValue({ _id: 'item1' });
        req.params.id = 'item1';
        req.body = { title: 'A', description: 'B', category: 'Electronics', condition: 'New', location: 'Loc', status: 'Available' };
        req.files = [{ filename: 'img.jpg' }];
        await itemController.updateItem(req, res);
        expect(itemService.updateItemService).toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('success_msg', 'Item updated successfully');
        expect(res.redirect).toHaveBeenCalledWith('/items/manage');
    });

    it('updateItem should render error if not found', async () => {
        itemService.updateItemService.mockResolvedValue(null);
        req.params.id = 'item1';
        req.body = { title: 'A', description: 'B', category: 'Electronics', condition: 'New', location: 'Loc', status: 'Available' };
        await itemController.updateItem(req, res);
        expect(res.render).toHaveBeenCalledWith('error', { message: 'Item not found' });
    });

    it('deleteItem should delete and redirect on success', async () => {
        itemService.deleteItemService.mockResolvedValue({ _id: 'item1' });
        req.params.id = 'item1';
        await itemController.deleteItem(req, res);
        expect(itemService.deleteItemService).toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('success_msg', 'Item deleted successfully');
        expect(res.redirect).toHaveBeenCalledWith('/items/manage');
    });

    it('deleteItem should render error if not found', async () => {
        itemService.deleteItemService.mockResolvedValue(null);
        req.params.id = 'item1';
        await itemController.deleteItem(req, res);
        expect(res.render).toHaveBeenCalledWith('error', { message: 'Item not found' });
    });

    it('getManageItems should render manageItems with user items', async () => {
        itemService.getUserItemsWithFilters.mockResolvedValue([]);
        itemService.countUserItemsByStatus.mockResolvedValue(1);
        req.user = { _id: 'user1' };
        await itemController.getManageItems(req, res);
        expect(res.render).toHaveBeenCalledWith('items/manageItems', expect.objectContaining({ items: [] }));
    });

    it('bulkDeleteItemsApi should return success', async () => {
        req.body.ids = ['id1', 'id2'];
        itemService.deleteItemsByIdsAndOwner.mockResolvedValue({ deletedCount: 2 });
        await itemController.bulkDeleteItemsApi(req, res);
        expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('bulkDeleteItemsApi should return error for no ids', async () => {
        req.body.ids = [];
        await itemController.bulkDeleteItemsApi(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No items selected' });
    });

    it('bulkUpdateItemsApi should return success', async () => {
        req.body.ids = ['id1'];
        req.body.update = { status: 'Traded' };
        itemService.updateItemsByIdsAndOwner.mockResolvedValue({ modifiedCount: 1 });
        await itemController.bulkUpdateItemsApi(req, res);
        expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('bulkUpdateItemsApi should return error for invalid input', async () => {
        req.body.ids = [];
        req.body.update = 'not-an-object';
        await itemController.bulkUpdateItemsApi(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid input' });
    });
}); 
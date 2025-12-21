/**
 * Protected API Routes
 * 
 * All routes here require authentication
 */

const express = require('express');
const { isAuthenticated } = require('../middleware/auth');

// Models
const User = require('../models/User');
const Checklist = require('../models/Checklist');
const Bucket = require('../models/Bucket');
const Tag = require('../models/Tag');
const Category = require('../models/Category');
const Template = require('../models/Template');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// ==================== USER ROUTES ====================

router.get('/users/profile', async (req, res) => {
    try {
        res.json(req.user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/users/profile', async (req, res) => {
    try {
        const updates = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true }
        );
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== BUCKET ROUTES ====================

router.get('/buckets', async (req, res) => {
    try {
        const buckets = await Bucket.find({ userId: req.user._id }).sort({ name: 1 });
        res.json(buckets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/buckets', async (req, res) => {
    try {
        const { bucket_name, name, is_global, color, icon } = req.body;
        const bucket = await Bucket.create({
            userId: req.user._id,
            name: bucket_name || name,
            isGlobal: is_global || false,
            color,
            icon,
        });
        res.status(201).json(bucket);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/buckets/:id', async (req, res) => {
    try {
        const { bucket_name, name, color, icon } = req.body;
        const bucket = await Bucket.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: { name: bucket_name || name, color, icon } },
            { new: true }
        );
        if (!bucket) {
            return res.status(404).json({ error: 'Bucket not found' });
        }
        res.json(bucket);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/buckets/:id', async (req, res) => {
    try {
        const bucket = await Bucket.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!bucket) {
            return res.status(404).json({ error: 'Bucket not found' });
        }

        // Remove bucket reference from checklists
        await Checklist.updateMany(
            { bucketId: req.params.id },
            { $set: { bucketId: null } }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== TAG ROUTES ====================

router.get('/tags', async (req, res) => {
    try {
        const tags = await Tag.find({ userId: req.user._id }).sort({ name: 1 });
        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/tags', async (req, res) => {
    try {
        const { name, color } = req.body;
        const tag = await Tag.create({
            userId: req.user._id,
            name,
            color,
        });
        res.status(201).json(tag);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Tag already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

router.delete('/tags/:id', async (req, res) => {
    try {
        const tag = await Tag.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        // Remove tag from checklists
        await Checklist.updateMany(
            { tags: req.params.id },
            { $pull: { tags: req.params.id } }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CATEGORY ROUTES ====================

router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CHECKLIST ROUTES ====================

router.get('/checklists', async (req, res) => {
    try {
        const { bucket_id, completed } = req.query;
        const query = { userId: req.user._id, isArchived: false };

        if (bucket_id) {
            query.bucketId = bucket_id;
        }

        const checklists = await Checklist.find(query)
            .populate('bucketId', 'name color')
            .populate('tags', 'name color')
            .sort({ createdAt: -1 });

        res.json(checklists);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/checklists/:id', async (req, res) => {
    try {
        const checklist = await Checklist.findOne({
            _id: req.params.id,
            userId: req.user._id,
        })
            .populate('bucketId', 'name color')
            .populate('tags', 'name color');

        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }

        res.json(checklist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/checklists', async (req, res) => {
    try {
        const { title, name, description, bucket_id, category_id, target_date, tag_ids, items } = req.body;

        const checklist = await Checklist.create({
            userId: req.user._id,
            name: title || name,
            description,
            bucketId: bucket_id || null,
            categoryId: category_id || null,
            dueDate: target_date || null,
            tags: tag_ids || [],
            items: items?.map((item, index) => ({
                text: item.text || item.title,
                description: item.description,
                orderIndex: index,
                isCompleted: false,
            })) || [],
        });

        const populated = await Checklist.findById(checklist._id)
            .populate('bucketId', 'name color')
            .populate('tags', 'name color');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/checklists/:id', async (req, res) => {
    try {
        const updates = req.body;

        // Map field names
        const updateData = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.title !== undefined) updateData.name = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.bucket_id !== undefined) updateData.bucketId = updates.bucket_id;
        if (updates.category_id !== undefined) updateData.categoryId = updates.category_id;
        if (updates.due_date !== undefined) updateData.dueDate = updates.due_date;
        if (updates.tag_ids !== undefined) updateData.tags = updates.tag_ids;
        if (updates.items !== undefined) updateData.items = updates.items;

        const checklist = await Checklist.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: updateData },
            { new: true }
        )
            .populate('bucketId', 'name color')
            .populate('tags', 'name color');

        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }

        res.json(checklist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/checklists/:id', async (req, res) => {
    try {
        const checklist = await Checklist.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Checklist Items
router.post('/checklists/:id/items', async (req, res) => {
    try {
        const { title, text, description, order_index } = req.body;

        const checklist = await Checklist.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            {
                $push: {
                    items: {
                        text: title || text,
                        description,
                        orderIndex: order_index || 0,
                        isCompleted: false,
                    },
                },
            },
            { new: true }
        );

        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }

        const newItem = checklist.items[checklist.items.length - 1];
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/checklists/:checklistId/items/:itemId', async (req, res) => {
    try {
        const { text, description, is_completed, order_index } = req.body;

        const updateFields = {};
        if (text !== undefined) updateFields['items.$.text'] = text;
        if (description !== undefined) updateFields['items.$.description'] = description;
        if (is_completed !== undefined) {
            updateFields['items.$.isCompleted'] = is_completed;
            updateFields['items.$.completedAt'] = is_completed ? new Date() : null;
        }
        if (order_index !== undefined) updateFields['items.$.orderIndex'] = order_index;

        const checklist = await Checklist.findOneAndUpdate(
            {
                _id: req.params.checklistId,
                userId: req.user._id,
                'items._id': req.params.itemId,
            },
            { $set: updateFields },
            { new: true }
        );

        if (!checklist) {
            return res.status(404).json({ error: 'Checklist or item not found' });
        }

        const item = checklist.items.id(req.params.itemId);
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/checklists/:checklistId/items/:itemId', async (req, res) => {
    try {
        const checklist = await Checklist.findOneAndUpdate(
            { _id: req.params.checklistId, userId: req.user._id },
            { $pull: { items: { _id: req.params.itemId } } },
            { new: true }
        );

        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== TEMPLATE ROUTES ====================

router.get('/templates', async (req, res) => {
    try {
        const { category_id } = req.query;
        const query = {
            $or: [
                { isPublic: true },
                { createdBy: req.user._id },
            ],
        };

        if (category_id) {
            query.categoryId = category_id;
        }

        const templates = await Template.find(query)
            .populate('createdBy', 'name picture')
            .populate('categoryId', 'name color')
            .sort({ usageCount: -1, createdAt: -1 });

        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/templates/:id', async (req, res) => {
    try {
        const template = await Template.findById(req.params.id)
            .populate('createdBy', 'name picture')
            .populate('categoryId', 'name color');

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Check access
        if (!template.isPublic && !template.createdBy._id.equals(req.user._id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/templates', async (req, res) => {
    try {
        const { title, name, description, category_id, is_public, items, groups } = req.body;

        const template = await Template.create({
            createdBy: req.user._id,
            name: title || name,
            description,
            categoryId: category_id || null,
            isPublic: is_public || false,
            items: items || [],
            groups: groups || [],
        });

        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/templates/:id/instantiate', async (req, res) => {
    try {
        const { bucket_id, target_date, tag_ids } = req.body;

        const template = await Template.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Create checklist from template
        const checklist = await Checklist.create({
            userId: req.user._id,
            name: template.name,
            description: template.description,
            bucketId: bucket_id || null,
            dueDate: target_date || null,
            tags: tag_ids || [],
            fromTemplateId: template._id,
            groups: template.groups,
            items: template.items.map((item, index) => ({
                text: item.text,
                description: item.description,
                orderIndex: item.orderIndex || index,
                groupId: item.groupId,
                isRequired: item.isRequired,
                isCompleted: false,
            })),
        });

        // Increment usage count
        await Template.findByIdAndUpdate(template._id, { $inc: { usageCount: 1 } });

        const populated = await Checklist.findById(checklist._id)
            .populate('bucketId', 'name color')
            .populate('tags', 'name color');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/templates/:id', async (req, res) => {
    try {
        const template = await Template.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user._id,
        });

        if (!template) {
            return res.status(404).json({ error: 'Template not found or access denied' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

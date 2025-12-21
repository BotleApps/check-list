/**
 * Checklist Model
 * 
 * MongoDB schema for checklists with items, groups, and tags
 */

const mongoose = require('mongoose');

// Schema for individual checklist items
const checklistItemSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: null,
        trim: true,
    },
    isCompleted: {
        type: Boolean,
        default: false,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    orderIndex: {
        type: Number,
        default: 0,
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskGroup',
        default: null,
    },
    isRequired: {
        type: Boolean,
        default: false,
    },
    tags: [{
        type: String,
        trim: true,
    }],
}, { timestamps: true });

// Schema for task groups within a checklist
const taskGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: null,
        trim: true,
    },
    colorCode: {
        type: String,
        default: '#3B82F6',
    },
    orderIndex: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

// Main checklist schema
const checklistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: null,
        trim: true,
    },
    bucketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bucket',
        default: null,
        index: true,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
    },
    dueDate: {
        type: Date,
        default: null,
    },
    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
    }],
    fromTemplateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
        default: null,
    },
    groups: [taskGroupSchema],
    items: [checklistItemSchema],
    isArchived: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Virtual for checklist_id compatibility
checklistSchema.virtual('checklist_id').get(function () {
    return this._id.toString();
});

// Virtual for computed stats
checklistSchema.virtual('totalItems').get(function () {
    return this.items?.length || 0;
});

checklistSchema.virtual('completedItems').get(function () {
    return this.items?.filter(item => item.isCompleted).length || 0;
});

// Indexes
checklistSchema.index({ userId: 1, createdAt: -1 });
checklistSchema.index({ userId: 1, bucketId: 1 });
checklistSchema.index({ userId: 1, isArchived: 1 });

module.exports = mongoose.model('Checklist', checklistSchema);

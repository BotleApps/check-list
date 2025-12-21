/**
 * Template Model
 */

const mongoose = require('mongoose');

const templateItemSchema = new mongoose.Schema({
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
    orderIndex: {
        type: Number,
        default: 0,
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    isRequired: {
        type: Boolean,
        default: false,
    },
});

const templateGroupSchema = new mongoose.Schema({
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
});

const templateSchema = new mongoose.Schema({
    createdBy: {
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
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
        index: true,
    },
    isPublic: {
        type: Boolean,
        default: false,
    },
    usageCount: {
        type: Number,
        default: 0,
    },
    groups: [templateGroupSchema],
    items: [templateItemSchema],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

templateSchema.virtual('template_id').get(function () {
    return this._id.toString();
});

templateSchema.index({ isPublic: 1, categoryId: 1 });
templateSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Template', templateSchema);

/**
 * Category Model
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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
    icon: {
        type: String,
        default: 'folder',
    },
    color: {
        type: String,
        default: '#3B82F6',
    },
    isSystem: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

categorySchema.virtual('category_id').get(function () {
    return this._id.toString();
});

module.exports = mongoose.model('Category', categorySchema);

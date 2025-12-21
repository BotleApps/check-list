/**
 * Bucket (Folder) Model
 */

const mongoose = require('mongoose');

const bucketSchema = new mongoose.Schema({
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
    color: {
        type: String,
        default: '#3B82F6',
    },
    icon: {
        type: String,
        default: 'folder',
    },
    isGlobal: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

bucketSchema.virtual('bucket_id').get(function () {
    return this._id.toString();
});

bucketSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Bucket', bucketSchema);

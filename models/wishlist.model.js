const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    addedAt: { type: Date, default: Date.now }
}, { _id: false });

const wishlistSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [wishlistItemSchema],
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // Copié du produit pour historique
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }, // Prix au moment de la commande
    variantInfo: { type: String } // ex: "Chêne, 120x60cm"
});

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
        phoneNumber: String
    },
    billingAddress: { // Optionnel, si différent de l'adresse de livraison
        street: String,
        city: String,
        zipCode: String,
        country: String
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default: 'pending'
    },
    paymentDetails: {
        paymentMethod: String, // ex: "carte_bancaire", "paypal"
        transactionId: String, // ID de la transaction du PSP
        paymentDate: Date,
        status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' }
    },
    shippingMethod: { type: String },
    shippingCost: { type: Number, default: 0 },
    orderNotes: { type: String }, // Notes du client
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

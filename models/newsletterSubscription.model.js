const mongoose = require('mongoose');

const newsletterSubscriptionSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/.+\@.+\..+/, 'Veuillez entrer une adresse email valide']
    },
    isSubscribed: { // Au cas où on voudrait gérer la désinscription plus tard
        type: Boolean,
        default: true
    },
    subscribedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index removed since email field already has unique: true which creates an index

const NewsletterSubscription = mongoose.model('NewsletterSubscription', newsletterSubscriptionSchema);
module.exports = NewsletterSubscription;

const mongoose = require('mongoose');

const customRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optionnel, si l'utilisateur est connecté
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/.+\@.+\..+/, 'Veuillez entrer une adresse email valide']
    },
    phoneNumber: { type: String, trim: true },
    projectDescription: { type: String, required: true },
    dimensions: { type: String }, // Description textuelle des dimensions souhaitées
    woodTypes: [String], // Essences de bois préférées
    budgetRange: { type: String }, // ex: "1000€ - 2000€"
    inspirationImages: [{
        url: String,
        caption: String
    }], // Liens ou uploads d'images d'inspiration
    status: {
        type: String,
        enum: ['pending_review', 'in_discussion', 'quote_sent', 'approved', 'in_progress', 'completed', 'rejected'],
        default: 'pending_review'
    },
    adminNotes: { type: String }, // Notes internes pour l'admin
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

customRequestSchema.index({ email: 1 });
customRequestSchema.index({ status: 1 });
customRequestSchema.index({ createdAt: -1 });

const CustomRequest = mongoose.model('CustomRequest', customRequestSchema);
module.exports = CustomRequest;

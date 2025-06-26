const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode; // Si le status code est 200, c'est une erreur serveur non gérée
    let message = err.message;

    // Gérer les erreurs spécifiques de Mongoose (CastError pour ObjectId invalide)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = 'Ressource non trouvée. ID mal formé.';
    }

    // Gérer les erreurs de validation de Mongoose
    if (err.name === 'ValidationError') {
        statusCode = 400;
        // Concaténer les messages d'erreur de validation
        const validationErrors = Object.values(err.errors).map(val => val.message);
        message = `Erreur de validation: ${validationErrors.join(', ')}`;
    }

    // Gérer les erreurs de duplicata de Mongoose (code 11000)
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue)[0];
        message = `La valeur pour le champ '${field}' existe déjà et doit être unique.`;
    }

    // En mode développement, afficher plus de détails, y compris la pile d'erreurs
    // En production, ne pas divulguer la pile d'erreurs au client
    const responseError = {
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        ...(err.errors && process.env.NODE_ENV === 'development' && { validationErrors: err.errors }) // Erreurs de validation détaillées en dev
    };

    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ERREUR: ${message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    res.status(statusCode).json(responseError);
};

// Middleware pour les routes non trouvées (404)
const notFound = (req, res, next) => {
    const error = new Error(`Route non trouvée - ${req.originalUrl}`);
    res.status(404);
    next(error); // Passe à errorHandler
};


module.exports = { errorHandler, notFound };

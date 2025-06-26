const jwt = require('jsonwebtoken');

const generateToken = (userId, userRole) => {
    return jwt.sign(
        {
            id: userId, // Conventionnellement 'id' ou 'sub' (subject)
            role: userRole
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h', // Durée de validité du token
        }
    );
};

module.exports = generateToken;

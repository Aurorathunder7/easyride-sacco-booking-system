const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    console.error('❌ Error:', err);

    // MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
        const message = 'Duplicate entry. This record already exists.';
        return res.status(400).json({ message });
    }

    // MySQL foreign key error
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        const message = 'Referenced record does not exist.';
        return res.status(400).json({ message });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
    }

    // Default error
    res.status(err.statusCode || 500).json({
        message: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
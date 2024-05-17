const authCheck = (req) => {
    if (!req.isAuth) {
        const error = new Error('Not Authenticated');
        error.code = 401;
        throw error;
    }
};

exports.authCheck = authCheck;

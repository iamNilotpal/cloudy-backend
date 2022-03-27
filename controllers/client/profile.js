async function userSettings(user, req, res, next) {
  try {
    return res.status(200).json({
      status: 'ok',
      data: {
        displayName: user.displayName,
        email: user.email,
        createdAt: user.createdAt,
        activeFiles: user.activeFiles,
        activeStorage: user.activeStorage,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = userSettings;

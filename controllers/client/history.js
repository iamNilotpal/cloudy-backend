const httpErrors = require('http-errors');
const File = require('../../models/file');
const fs = require('fs');
const path = require('path');
const fileExtensions = require('../../helpers/getExtensions');

async function getFiles(
  user,
  extension,
  res,
  { pageNumber = 1, pageSize = 10 }
) {
  try {
    const files = await File.find({
      'uploaderInfo.id': user._id,
      extension: {
        $in: extension,
      },
    })
      .sort('-createdAt')
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .select(
        'originalName fileSize extension path receiverInfo createdAt uuid -_id'
      )
      .lean()
      .exec();
    return res.status(200).json({ status: 'ok', files });
  } catch (error) {
    throw error;
  }
}

async function getRecentFiles(user, req, res, next) {
  try {
    return await File.find({
      'uploaderInfo.id': user._id,
    })
      .sort('-createdAt')
      .limit(5)
      .select(
        'originalName fileSize extension path receiverInfo createdAt uuid -_id'
      )
      .lean()
      .exec();
  } catch (error) {
    return next(error);
  }
}

async function removeFile(user, req, res, next) {
  try {
    const { uuid } = req.body;
    if (!uuid) return next(httpErrors.BadRequest('Bruh just move on.'));

    const file = await File.findOne({ uuid }).exec();
    if (!file) return next(httpErrors.BadRequest("File Doesn't Exist."));

    if (fs.existsSync(path.join(__dirname, '../../', file.path)))
      fs.unlinkSync(path.join(__dirname, '../../', file.path));

    await user.decreaseFilesCountAndStorage(file.fileSize);
    await file.remove();
    return res.status(200).json({ status: 'ok', message: 'File Deleted.' });
  } catch (error) {
    return next(error);
  }
}

function paginate(req) {
  const { pageNumber, pageSize } = req.query;

  const number = pageNumber ? pageNumber : 1;
  const size = pageSize && pageSize <= 10 ? pageSize : 10;

  return { pageNumber: number, pageSize: size };
}

async function getImages(user, req, res, next) {
  try {
    const { pageNumber, pageSize } = paginate(req);

    return await getFiles(user, fileExtensions.IMAGES_EXT, res, {
      pageNumber,
      pageSize,
    });
  } catch (error) {
    return next(error);
  }
}

async function getVideos(user, req, res, next) {
  try {
    const { pageNumber, pageSize } = paginate(req);
    return await getFiles(user, fileExtensions.VIDEOS_EXT, res, {
      pageNumber,
      pageSize,
    });
  } catch (error) {
    return next(error);
  }
}

async function getDocuments(user, req, res, next) {
  try {
    const { pageNumber, pageSize } = paginate(req);
    return await getFiles(user, fileExtensions.OTHERS_EXT, res, {
      pageNumber,
      pageSize,
    });
  } catch (error) {
    return next(error);
  }
}

async function removeHistory(user, req, res, next) {
  try {
    const filesToDelete = await File.find({
      'uploaderInfo.id': user._id,
    })
      .select('path fileSize -_id')
      .lean()
      .exec();

    if (filesToDelete?.length === 0)
      return res
        .status(200)
        .json({ status: 'ok', message: 'No History Found.' });

    let fileSize = 0;
    filesToDelete.forEach(async (file) => {
      try {
        if (fs.existsSync(path.join(__dirname, '../../', file.path)))
          fs.unlinkSync(path.join(__dirname, '../../', file.path));
        fileSize += file.fileSize;
        await file.remove();
      } catch (error) {
        return next(httpErrors.InternalServerError('Error deleting files.'));
      }
    });

    await user.decreaseFilesCountAndStorage(fileSize, filesToDelete.length);
    return res.status(200).json({
      status: 'ok',
      message: `${filesToDelete.length} ${
        filesToDelete.length === 1 ? 'file' : 'files'
      } Were Removed.`,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  removeHistory,
  getImages,
  getVideos,
  getDocuments,
  removeFile,
  getRecentFiles,
};

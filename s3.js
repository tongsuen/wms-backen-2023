const  aws = require('aws-sdk')
const dotenv = require('dotenv')
const multer = require('multer');
const multerS3 = require('multer-s3');

const AmazonS3URI = require('amazon-s3-uri')

dotenv.config()
const region = "ap-southeast-1"
const bucketName = 'wms-tslog'
const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

const s3 = new aws.S3({
    region,
    accessKeyId,
    secretAccessKey,
    Bucket:bucketName
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true)
    } else {
        cb(null, false)
    }
}

const multerS3Config_avatar = multerS3({
    s3: s3,
    bucket: bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        console.log(file)
        cb(null, 'avatar/' + new Date().toISOString() + '-' +Math.random().toString(36).slice(-8)+ file.originalname)
    }
});
const upload_avatar = multer({
    storage: multerS3Config_avatar,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // we are allowing only 5 MB files
    }
})
// upload inbox
const multerS3Config_inboxs = multerS3({
    s3: s3,
    bucket: bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        console.log(file)
        cb(null, 'inboxs/' + new Date().toISOString() + '-' +Math.random().toString(36).slice(-8)+ file.originalname)
    }
});
const upload_inbox = multer({
    storage: multerS3Config_inboxs,
    limits: {
        fileSize: 1024 * 1024 * 5 // we are allowing only 5 MB files
    }
})
// upload inventories
const multerS3Config_inventories = multerS3({
    s3: s3,
    bucket: bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        console.log(file)
        cb(null, 'inventories/' + new Date().toISOString() + '-'+Math.random().toString(36).slice(-8) + file.originalname)
    }
});
const upload_inventories = multer({
    storage: multerS3Config_inventories,
    limits: {
        fileSize: 1024 * 1024 * 5 // we are allowing only 5 MB files
    }
})
// upload invoices
const multerS3Config_invoices = multerS3({
    s3: s3,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    bucket: bucketName,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        console.log(file)
        cb(null, 'invoices/' + new Date().toISOString() + '-'+Math.random().toString(36).slice(-8) + file.originalname)
    }
});
const upload_invoices = multer({
    storage: multerS3Config_invoices,
    limits: {
        fileSize: 1024 * 1024 * 5 // we are allowing only 5 MB files
    }
})
// upload notes
const multerS3Config_notes = multerS3({
    s3: s3,
    bucket: bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        console.log(file)
        cb(null, 'notes/' + new Date().toISOString() + '-'+Math.random().toString(36).slice(-8) + file.originalname)
    }
});
const upload_notes = multer({
    storage: multerS3Config_notes,
    limits: {
        fileSize: 1024 * 1024 * 5 // we are allowing only 5 MB files
    }
})

//delete obj

const delete_obj = (obj) =>{

    try {
        const uri = obj
        const { region, bucket, key } = AmazonS3URI(uri)
        console.log(key)
        s3.deleteObject({ Bucket: bucketName, Key: key }, (err, data) => {
            console.error(err);
            console.log(data);
        });
      } catch (err) {
        console.warn(`${uri} is not a valid S3 uri`) // should not happen because `uri` is valid in that example
      }
    
}
exports.upload_avatar = upload_avatar; 
exports.upload_inboxs = upload_inbox; 
exports.upload_inventories = upload_inventories; 
exports.upload_invoices = upload_invoices; 
exports.upload_notes = upload_notes; 

exports.delete_obj = delete_obj; 
const express = require('express')
const router = express.Router();
const { ObjectId } = require('mongodb');

const auth = require('../../../middleware/auth')
const moment = require('moment')

const { upload_inboxs, upload_invoices, upload_notes, upload_inventories, delete_obj } = require('../../../s3')
const { sendMessage } = require('../../../push_noti')
const User = require('../../../models/User')
const Category = require('../../../models/Category')
const Inventory = require('../../../models/Inventory')
const Stocks = require('../../../models/Stocks')
const StocksHistory = require('../../../models/StocksHistory')
const Invoice = require('../../../models/Invoices')
const Zone = require('../../../models/Zone')
const Inbox = require('../../../models/Inbox')
const Note = require('../../../models/Notes')
const Alert = require('../../../models/Alert')
const Combine = require('../../../models/Combine')
const Move = require('../../../models/Move')

const Notification = require('../../../models/Notification')
const AdminNotification = require('../../../models/AdminNotification')
const Location = require('../../../models/Location')

const Product = require('../../../models/Product')
router.get('/list_stocks', auth, async (req, res) => {
    const { user, search, status, page = 1, limit = 10, is_expire = false } = req.query;
    try {

        var query = { is_active: true };
        if (user !== undefined) query.user = user;
        if (status !== undefined) query.status = status;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { lot_number: { $regex: searchRegex } },
                { name: { $regex: searchRegex } },
                { product_code: { $regex: searchRegex } },
            ];
        }
        if (is_expire) {

            const expiringInventory = await Inventory.find({ exp_date: { $lt: new Date() } })
            query.inventory = { $in: expiringInventory.map(item => item._id) }

        }
        //console.log(query);
     
        const list = await Stocks.find(query).populate('user','-password').populate('inventory').populate('product').populate('zone').skip((page - 1) * limit).limit(limit)
            .sort({ create_date: -1 });
        const total = await Stocks.countDocuments(query);
        ////console.log(list);
        res.json({
            page: page,
            list: list,
            total: total
        })

    } catch (err) {
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.get('/list_stocks_by_name', auth, async (req, res) => {
    const { user, search, status, page = 1, limit = 10 } = req.query;
    try {
        var query = { is_active: true, status: 'warehouse' };
        if (user !== undefined) query.user = ObjectId(user);
        if (status !== undefined) query.status = status;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { lot_number: { $regex: searchRegex } },
                { name: { $regex: searchRegex } },
                { product_code: { $regex: searchRegex } },
            ];
        }

        //console.log(req.body)
        const list = await Stocks.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: {
                        name: "$name",
                        lot_number: "$lot_number",
                        product: "$product"
                    },
                    unit: { $first: "$product.unit" },
                    sub_unit: { $first: "$product.sub_unit" },
                    prepare: { $sum: "$prepare_out" },
                    prepare_sub: { $sum: "$prepare_out_sub_amount" },
                    totalAmount: { $sum: "$current_amount" },
                    totalSubAmount: { $sum: "$current_sub_amount" }
                }
            },
            {
                $project: {
                    name: "$_id.name",
                    lot_number: "$_id.lot_number",
                    product: "$_id.product",
                    unit: 1,
                    sub_unit: 1,
                    prepare: 1,
                    prepare_sub: 1,
                    totalAmount: 1,
                    totalSubAmount: 1,
                    total: { $subtract: ["$totalAmount", "$prepare"] },
                    sub_total: { $subtract: ["$totalSubAmount", "$prepare_sub"] }

                }
            },
            { $sort: { totalAmount: -1 } },
        ]);

        res.json(list)

    } catch (err) {
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.get('/list_stocks_by_product', auth, async (req, res) => {
    const { user, search, status, page = 1, limit = 10 } = req.query;
    try {
        
        var query = { is_active: true, status: 'warehouse',user:ObjectId(req.user.id) };
        if (user !== undefined) query.user = ObjectId(user);
        if (status !== undefined) query.status = status;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { lot_number: { $regex: searchRegex } },
                { name: { $regex: searchRegex } },
                { product_code: { $regex: searchRegex } },
            ];
        }

        const total = await Stocks.countDocuments(query);
        const list = await Stocks.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: {
                        product: '$product',
                    },
                    unit: { $first: '$product.unit' },
                    sub_unit: { $first: '$product.sub_unit' },
                    prepare: { $sum: '$prepare_out' },
                    prepare_sub: { $sum: '$prepare_out_sub_amount' },
                    totalAmount: { $sum: '$current_amount' },
                    totalSubAmount: { $sum: '$current_sub_amount' },
                },
            },
            {
                $project: {
                    product: '$_id.product',
                    unit: 1,
                    sub_unit: 1,
                    prepare: 1,
                    prepare_sub: 1,
                    totalAmount: 1,
                    totalSubAmount: 1,
                    total: { $subtract: ['$totalAmount', '$prepare'] },
                    sub_total: { $subtract: ['$totalSubAmount', '$prepare_sub'] },
                },
            },
            { $sort: { totalAmount: -1 } },
            { $skip: limit * (parseInt(page) - 1) },
            { $limit: parseInt(limit) },
        ]);
        res.json({
            page: page,
            list: list,
            total: total,
        });
    } catch (err) {
        //console.log(err.message);
        res.status(500).send(err.message);
    }
});
router.get('/list', auth, async (req, res) => {

    try {
        //console.log(req.query)
        res.json({msg:'hello world'})

    } catch (err) {
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
module.exports = router; 

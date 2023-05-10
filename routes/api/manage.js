const express = require('express')
const router = express.Router();
const { ObjectId } = require('mongodb');

const auth = require('../../middleware/auth')
const moment = require('moment')

const { upload_inboxs, upload_invoices, upload_notes, upload_inventories, delete_obj } = require('../../s3')
const { sendMessage } = require('../../push_noti')
const User = require('../../models/User')
const Category = require('../../models/Category')
const Inventory = require('../../models/Inventory')
const Stocks = require('../../models/Stocks')
const StocksHistory = require('../../models/StocksHistory')
const Invoice = require('../../models/Invoices')
const Zone = require('../../models/Zone')
const Inbox = require('../../models/Inbox')
const Note = require('../../models/Notes')
const Alert = require('../../models/Alert')
const Combine = require('../../models/Combine')
const Move = require('../../models/Move')

const Sector = require('../../models/Sector')
const Notification = require('../../models/Notification')
const AdminNotification = require('../../models/AdminNotification')
const Location = require('../../models/Location')

const Product = require('../../models/Product')


router.post('/socket_io_to_admin', auth, async (req, res) => {

    try {
        const io = req.app.get('socketio');
        io.to('admin').emit('action', { type: 'new_alert', data: [] });
        return res.json({})


    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/socket_io_to_client', auth, async (req, res) => {
        const {user} = req.body
    try {
        const io = req.app.get('socketio');

        console.log(io.sockets.adapter.rooms)
        io.to(user).emit('action', { type: 'new_alert', data: [] });
        return res.json({})


    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/create_inbox', [auth, upload_inboxs.array('files')], async (req, res) => {
    const { type } = req.body
    try {
        console.log(req.files);//req.file.path
        console.log(req.body);
        const by_user = await User.findById(req.user.id)
        if (type == 1) { //user send to admin

            const inbox = await Inbox.create(req.body)
            if (req.files) {
                await Promise.all(req.files.map(async (file) => {
                    inbox.files.push(file.location)
                }))

                inbox.save();
            }

            const alert = new AdminNotification({
                inbox: inbox,
                type: 'message',
                user: by_user,
                by_user: by_user,
                title: 'ข้อความถึงผู้ดูเเล',
                detail: ('ข้อความ: ' + inbox.detail)
            })

            send_noti(1, [], 'ข้อความถึงผู้ดูเเล', inbox.detail);
            const io = req.app.get('socketio');
            io.to('admin').emit('action', { type: 'new_alert', data: alert });
            await alert.save()

            return res.json(inbox)
        }
        else if (type == 2) { // admin send to user

            const inbox = await Inbox.create(req.body)

            if (req.files) {
                await Promise.all(req.files.map(async (file) => {
                    inbox.files.push(file.location)
                }))
                inbox.save();
            }
            console.log(inbox);
            send_noti(3, inbox.tos, 'ผู้ดูเเลระบบส่งข้อความ', inbox.detail);
            await Promise.all(inbox.tos.map(async (user) => {
                const alert = new Notification({
                    inbox: inbox,
                    user: user,
                    by_user: by_user,
                    type: message,
                    title: 'ผู้ดูเเลระบบส่งข้อความ',
                    detail: ('ข้อความ: ' + inbox.detail)
                })
                await alert.save()
                console.log(alert.user)
                const io = req.app.get('socketio');
                io.to(alert.user.toString()).emit('action', { type: 'new_alert', data: alert });
            }))
            return res.json(inbox)
        }
        return res.status(500).send('need body')

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})


router.post('/list_inbox', auth, async (req, res) => {

    const { type, page = 1, limit = 10 } = req.body;
    try {

        const list = await Inbox.find({ type: type }).sort({ create_date: -1 }).populate('from', '_id email name').populate('to', '_id email name').populate('tos', '_id email name').skip((page - 1) * limit).limit(limit);
        const total = await Inbox.countDocuments({ type: type });

        return res.json({
            page: page,
            list: list,
            total: total
        })


    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_customer_inbox', auth, async (req, res) => {

    const { type, page = 1, limit = 10 } = req.body;
    try {


        const list = await Inbox.find({ tos: req.user.id }).sort({ create_date: -1 }).populate('from', '_id email name').populate('to', '_id email name').populate('tos', '_id email name').skip((page - 1) * limit).limit(limit);
        const total = await Inbox.countDocuments({ tos: req.user.id });

        return res.json({
            page: page,
            list: list,
            total: total
        })



    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_customer_send_inbox', auth, async (req, res) => {

    const { type, page = 1, limit = 10 } = req.body;
    try {


        const list = await Inbox.find({ from: req.user.id }).sort({ create_date: -1 }).populate('from', '_id email name').populate('to', '_id email name').populate('tos', '_id email name').skip((page - 1) * limit).limit(limit);
        const total = await Inbox.countDocuments({ from: req.user.id });

        return res.json({
            page: page,
            list: list,
            total: total
        })


    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/get_inbox', auth, async (req, res) => {

    try {
        const { inbox_id } = req.body

        const inbox = await Inbox.findOne({ _id: inbox_id }).populate('from', '_id email name').populate('to', '_id email name').populate('tos', '_id email name')
        return res.json(inbox)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/create_category', auth, async (req, res) => {
    const { name, user } = req.body;
    try {
        const cat = new Category({ name, user });
        await cat.save()
        res.json(cat)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/add_note_to_stock', [auth, upload_notes.array('images')], async (req, res) => {
    const { detail = '', stock_id } = req.body;
    try {

        const note = new Note({ detail });

        await Promise.all(req.files.map(async (file) => {
            note.images.push(file.location)
        }))
        console.log(note)
        note.stock = stock_id
        await note.save()
        const stock = await Stocks.findOne({ _id: stock_id })
        console.log(stock)
        if (stock.notes) {
            stock.notes.unshift(note)
        }
        else {
            stock.notes.push(note)
        }


        await stock.save()
        return res.json(note)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_notes_from_user', auth, async (req, res) => {
    const { page = 1, limit = 10 } = req.body;
    try {

        const list = await Stocks.find({ notes: { $exists: true, $ne: [] }, user: req.user.id }).populate('inventory').populate('notes').skip((page - 1) * limit).limit(limit).sort({ create_date: -1 })
        const total = await Inventory.countDocuments({ notes: { $exists: true, $ne: [] }, user: req.user.id });

        return res.json({
            page: page,
            list: list,
            total: total
        })

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_note', auth, async (req, res) => {
    const { note_id } = req.body;
    try {
        const note = await Note.findById(note_id)

        console.log(note)
        return res.json(note)
    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/update_note', [auth, upload_notes.array('images')], auth, async (req, res) => {
    const { note_id, detail, deletes } = req.body;
    try {
        console.log(req.body)
        const note = await Note.findByIdAndUpdate({ _id: note_id }, { detail: detail })

        if (deletes && deletes.length > 0) {
            let new_img = [...note.images]

            for (let i = 0; i < deletes.length; i++) {
                const del_img = deletes[i];
                let found = false
                console.log(del_img)

                for (let j = 0; j < note.images.length; j++) {
                    const img = note.images[j];
                    if (del_img == img) {
                        found = true
                    }
                }
                if (found) {
                    delete_obj(del_img)
                    new_img = new_img.filter(url => url != del_img)

                    console.log(new_img)
                }
            }
            note.images = new_img
        }
        await Promise.all(req.files.map(async (file) => {
            note.images.push(file.location)
        }))
        if (!detail && note.images.length == 0) {
            await Note.deleteOne({ _id: note._id })
            const st = await Stocks.updateMany({ notes: { _id: note._id } }, { $pull: { notes: note_id } })
            //st.notes = st.notes.filter(nt => nt != note._id)
            console.log(st)
            return res.json({})
        }
        //     note.images = [
        //         'https://wms-tslog.s3.ap-southeast-1.amazonaws.com/notes/2022-04-20T04%3A47%3A36.878Z-png-clipart-foreign-object-damage-tray-tool-boxes-aircraft-aircraft-material-transport-thumbnail.png',
        //    'https://wms-tslog.s3.ap-southeast-1.amazonaws.com/notes/2022-04-20T04%3A47%3A37.409Z-cardboard-box-isolated_125540-652.jpeg',
        //         'https://wms-tslog.s3.ap-southeast-1.amazonaws.com/notes/2022-04-20T04%3A47%3A37.633Z-OFM5004948.jpeg'
        //      ],
        await note.save()
        return res.json(note)
    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/update_note_v2', [auth, upload_notes.array('images')], auth, async (req, res) => {
    const { note_id, detail, deletes } = req.body;
    try {
        console.log(req.body)
        const note = await Note.findByIdAndUpdate({ _id: note_id }, { detail: detail })

        if (deletes && deletes.length > 0) {
            let new_img = [...note.images]

            for (let i = 0; i < deletes.length; i++) {
                const del_img = deletes[i];
                let found = false
                console.log(del_img)

                for (let j = 0; j < note.images.length; j++) {
                    const img = note.images[j];
                    if (del_img == img) {
                        found = true
                    }
                }
                if (found) {
                    delete_obj(del_img)
                    new_img = new_img.filter(url => url != del_img)

                    console.log(new_img)
                }
            }
            note.images = new_img
        }
        await Promise.all(req.files.map(async (file) => {
            note.images.push(file.location)
        }))
        if (!detail && note.images.length == 0) {
            await Note.deleteOne({ _id: note._id })
            const st = await Stocks.updateMany({ notes: { _id: note._id } }, { $pull: { notes: note_id } })
            //st.notes = st.notes.filter(nt => nt != note._id)
            console.log(st)
            return res.json({})
        }
        //     note.images = [
        //         'https://wms-tslog.s3.ap-southeast-1.amazonaws.com/notes/2022-04-20T04%3A47%3A36.878Z-png-clipart-foreign-object-damage-tray-tool-boxes-aircraft-aircraft-material-transport-thumbnail.png',
        //    'https://wms-tslog.s3.ap-southeast-1.amazonaws.com/notes/2022-04-20T04%3A47%3A37.409Z-cardboard-box-isolated_125540-652.jpeg',
        //         'https://wms-tslog.s3.ap-southeast-1.amazonaws.com/notes/2022-04-20T04%3A47%3A37.633Z-OFM5004948.jpeg'
        //      ],
        await note.save()
        return res.json(note)
    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/create_location', auth, async (req, res) => {

    try {
        console.log(req.body);
        const loc = new Location({ ...req.body, user: req.user.id })
        await loc.save()
        res.json(loc)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/list_location', auth, async (req, res) => {

    const { page = 1, limit = 10 } = req.body;
    try {
        const list = await Location.find({ user: req.user.id }).skip((page - 1) * limit).limit(limit).sort({ create_date: -1 })
        const total = await Location.countDocuments({ user: req.user.id });

        return res.json({
            page: page,
            list: list,
            total: total
        })

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/import_inventory', [auth, upload_inventories.array('images')], async (req, res) => {

    try {
        console.log(req.file);//req.file.path
        console.log(req.body);
        const inv = new Inventory(req.body);
        console.log(inv)
        await Promise.all(req.files.map(async (file) => {
            inv.images.push(file.location)
        }))
        inv.current_amount = inv.amount
        await inv.save()
        res.json(inv)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/update_inventory', [auth, upload_inventories.array('images')], async (req, res) => {

    try {
        console.log(req.files);//req.file.path
        console.log(req.body);
        var query = req.body;
        if (!query.exp_date) {
            query.exp_date = null
        }
        if (!query.mfg_date) {
            query.mfg_date = null
        }
        if (!query.product_code) {
            query.product_code = null
        }

        let inv = await Inventory.findById(query.inv_id)
        if (query.old_images) {
            let difference = inv.images.filter(x => !query.old_images.includes(x))
            for (let i = 0; i < difference.length; i++) {
                const old = difference[i];
                delete_obj(old)
            }
            inv.images = query.old_images
            inv = await inv.save()
        }
        else {
            for (let i = 0; i < inv.images.length; i++) {
                const old = inv.images[i];
                delete_obj(old)
            }
            inv.images = []
            inv = await inv.save()
        }
        if (req.files) {
            var array = inv.images
            await Promise.all(req.files.map(async (file) => {
                array.push(file.location)
            }))
            query.images = array;
        }

        Inventory.findOneAndUpdate({ _id: query.inv_id }, { $set: query }, { new: true, upsert: false }, function (err, data) {
            if (err) {
                console.log(err);
                return res.status(500).json(err);
            } else {
                console.log(data);

                return res.json(data);
            }
        });



    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/inventory_waiting', auth, async (req, res) => {
    const { user, search, is_in_stock, } = req.body;
    try {

        var query = {};
        query.is_in_stock = false;
        console.log(query)
        const list = await Inventory.find(query)

        res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_inventory', auth, async (req, res) => {
    const { inv_id } = req.body;
    try {
        const inv = await Inventory.findById(inv_id).populate('product')

        res.json(inv)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_inventory', auth, async (req, res) => {
    const { user, search, is_in_stock, page = 1, limit = 10, is_active = true } = req.body;
    try {
        var query = { is_active };
        if (user !== undefined) query.user = user;
        if (is_in_stock !== undefined) query.is_in_stock = is_in_stock;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { lot_number: { $regex: searchRegex } },
                { name: { $regex: searchRegex } },
                { product_code: { $regex: searchRegex } },
            ];
        }
        console.log(query)
        const list = await Inventory.find(query).populate('product').sort({ is_in_stock: 1, create_date: -1 }).skip((page - 1) * limit).limit(limit);
        const total = await Inventory.countDocuments(query);

        res.json({
            page: page,
            list: list,
            total: total
        })

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_stocks', auth, async (req, res) => {
    const { user, search, status, page = 1, limit = 10, is_expire = false } = req.body;
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
        console.log(query);
        // if(search) {
        //     query.inventory = {name:{$regex : search}} ;
        // }
        const list = await Stocks.find(query).populate({ path: 'inventory', populate: { path: 'user', model: 'user' } }).populate('product').populate('zone').skip((page - 1) * limit).limit(limit)
            .sort({ create_date: -1 });
        const total = await Stocks.countDocuments(query);
        //console.log(list);
        res.json({
            page: page,
            list: list,
            total: total
        })

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_stocks_by_name', auth, async (req, res) => {
    const { user, search, status, page = 1, limit = 10 } = req.body;
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

        console.log(req.body)
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
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/list_stocks_by_product', auth, async (req, res) => {
    const { user, search, status, page = 1, limit = 10 } = req.body;
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
            { $skip: limit * (page - 1) },
            { $limit: limit },
        ]);

        res.json({
            page: page,
            list: list,
            total: total,
        });
    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message);
    }
});


router.post('/list_current_stocks', auth, async (req, res) => {
    try {

        var query = { is_active: true };

        const list = await Stocks.find(query).populate({ path: 'inventory', populate: { path: 'user', model: 'user' } }).populate('product').populate('zone').sort({ create_date: -1 });
        console.log(list)
        res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/list_zone', auth, async (req, res) => {
    const { main, sort } = req.body;
    try {
        let query = {}
        let sort = {}
        if (main) query.main = main
        if (main == 'A' || main == 'B' || main == 'C' || main == 'D' || main == 'E' || main == 'F' || main == 'G' || main == 'H') {
            sort = {
                main: 1,
                y: 1,
                x: 1,

            }
        }
        else {
            sort = {
                main: 1,
                y: -1,
                x: 1,

            }
        }
        const result2 = await Zone.aggregate([
            {
                $match: query
            },
            {
                $lookup:
                {
                    from: Stocks.collection.name,
                    pipeline: [
                        {
                            $match: {
                                is_active: true
                            }

                        },
                        {
                            $lookup: {
                                from: Inventory.collection.name,
                                localField: 'inventory',
                                foreignField: '_id',
                                as: 'inventories'
                            }
                        },
                        {
                            $lookup: {
                                from: User.collection.name,
                                localField: 'user',
                                foreignField: '_id',
                                as: 'users'
                            }
                        }



                    ],
                    localField: "_id",
                    foreignField: "zone",
                    as: "stocks"
                }
            },
            {
                $sort: sort

            }
        ])

        res.json(result2)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_zone_for_choose', auth, async (req, res) => {
    const { main, sort } = req.body;
    try {
        console.log("LIST ZONE");
        let query = {}
        if (main) query.main = main

        const result2 = await Zone.aggregate([
            {
                $match: query
            },
            {
                $sort:
                {
                    main: 1,
                    x: 1,
                    y: 1,
                }
            }
        ])

        res.json(result2)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/list_zone_with_sector', auth, async (req, res) => {
    const { } = req.body;
    try {
        const list_sector = await Sector.find();

        const result2 = await Zone.aggregate([

            {
                $lookup:
                {
                    from: Stocks.collection.name,
                    pipeline: [
                        {
                            $match: {
                                is_active: true
                            }

                        }

                    ],
                    localField: "_id",
                    foreignField: "zone",
                    as: "stocks"
                }
            },
            {
                $sort:
                {
                    x: 1,
                    y: 1
                }
            }
        ])

        res.json(result2)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/zone_with_stock', auth, async (req, res) => {
    const { zone_id } = req.body;
    try {

        const zone = await Zone.findOne({ _id: zone_id })
        const list = await Stocks.find({ zone: zone, is_active: true })

        res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}
router.post('/invoice_stocks_out', auth, async (req, res) => {
    const { stocks } = req.body;
    console.log(req.body);

    try {

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/import_to_stocks_approve', auth, async (req, res) => {
    const { invoice_id, approve = 1 } = req.body;
    console.log(req.body);

    try {

        const invoice = await Invoice.findById(invoice_id)
        if (approve === 0) {
            invoice.status = 'decline'
            invoice.history = [
                {
                    status: 'decline',
                    user: req.user.id,
                },
                ...invoice.history,

            ]
            await invoice.save()

            const by_user = await User.findById(req.user.id)

            send_noti(3, [invoice.user], 'ยกเลิก นำสินค้าเข้าคลัง', 'ยกเลิกการนำเข้าคลัง');

            const alert = new Notification({
                invoice: invoice,
                user: invoice.user,
                by_user: by_user,
                type: 'import',
                action: 'decline',

                title: 'ยกเลิกนำสินค้าเข้าคลัง',
                detail: 'ยกเลิกนำสินค้าเข้าคลัง'
            })
            await alert.save()

            const io = req.app.get('socketio');
            io.to(alert.user).emit('action', { type: 'new_alert', data: alert });

            return res.json(invoice)
        }

        for (let i = 0; i < invoice.import_list.length; i++) {
            const invInfo = invoice.import_list[i]

            const inv = new Inventory()
            inv.amount = invInfo.amount
            inv.current_amount = invInfo.amount
            inv.total_sub_unit = invInfo.sub_amount

            inv.user = invoice.user
            inv.product = invInfo.product
            inv.name = invInfo.name
            inv.lot_number = invInfo.lot_number
            inv.product_code = invInfo.product_code
            inv.unit = invInfo.unit
            inv.sub_unit = invInfo.sub_unit
            inv.mfg_date = invInfo.mfg_date
            inv.exp_date = invInfo.exp_date
            await inv.save()
            invoice.import_list[i].inventory = inv
        }
        console.log(invoice.import_list)
        invoice.history = [
            {
                status: 'pending',
                user: req.user.id,
            },
            ...invoice.history,

        ]
        invoice.status = 'pending'

        await invoice.save()

        const by_user = await User.findById(req.user.id)

        send_noti(3, [invoice.user], 'นำสินค้าเข้าคลัง', 'สินค้า ถูกนำเข้าคลังสินค้าเรียบร้อยเเล้ว');

        const alert = new Notification({
            invoice: invoice,
            user: invoice.user,
            by_user: by_user,
            type: 'import',

            title: 'ยืนยันนำสินค้าเข้าคลัง',
            detail: 'ยืนยันนำสินค้าเข้าคลัง'
        })
        await alert.save()

        const io = req.app.get('socketio');
        io.to(alert.user).emit('action', { type: 'new_alert', data: alert });

        res.json(invoice)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/update_invoice_import_list_request_status', auth, async (req, res) => {
    const { list, invoice_id } = req.body;
    console.log(req.body);

    try {
        const invoice = await Invoice.findById(invoice_id)
        invoice.import_list = list


        await invoice.save()

        res.json(invoice)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/update_invoice_import_list_pending_status', auth, async (req, res) => {
    const { list, invoice_id } = req.body;
    console.log(req.body);

    try {
        const invoice = await Invoice.findById(invoice_id)

        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (item.inventory) {
                const inv = await Inventory.findById(item.inventory)
                inv.lot_number = item.lot_number
                inv.product_code = item.product_code
                inv.pallate_number = item.pallate_number
                inv.current_amount = item.amount
                inv.amount = item.amount

                inv.total_sub_amount = item.sub_amount
                await inv.save()
                console.log(inv)
            }
            else {
                const inv = new Inventory()
                inv.amount = item.amount
                inv.current_amount = item.amount
                inv.total_sub_unit = item.sub_amount

                inv.user = invoice.user
                inv.product = item.product
                inv.name = item.name
                inv.lot_number = item.lot_number
                inv.product_code = item.product_code
                inv.unit = item.unit
                inv.sub_unit = item.sub_unit
                inv.mfg_date = item.mfg_date
                inv.exp_date = item.exp_date
                await inv.save()
                list[i].inventory = inv
            }
        }
        const removeList = invoice.import_list.filter(item => !list.some(obj => obj._id === item._id))
        for (let i = 0; i < removeList.length; i++) {
            const item = removeList[i];
            const inv = await Inventory.findById(item.inventory)
            if (inv) {
                inv.is_active = false
                await inv.save()
            }
            else {
                console.log(item)
            }
        }
        invoice.import_list = list


        await invoice.save()

        res.json(invoice)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/import_to_stocks_by_invoice', auth, async (req, res) => {
    const { list, invoice_id } = req.body;
    try {
        console.log(req.body)
        const invoice = await Invoice.findById(invoice_id)

        let total_amount = 0
        let newArray = []
        for (let i = 0; i < list.length; i++) {
            const info = list[i];

            const amount = info.amount
            const sub_amount = info.sub_amount

            const inv = await Inventory.findById(info.inventory).populate('product')

            if (inv.current_amount < amount) {

                return res.status(400).json({ message: 'your number are more than exist number of inventory' })
            }

            if (amount == inv.current_amount) {
                inv.current_amount = 0;
                inv.is_in_stock = true;
            }
            else {
                inv.current_amount = inv.current_amount - amount;
                inv.is_in_stock = false;
            }

            total_amount += amount

            const z = await Zone.findOne({ _id: info.zone })

            const stock = new Stocks();
            stock.zone = z
            stock.name = inv.name
            stock.product_code = inv.product_code
            stock.lot_number = inv.lot_number
            stock.unit = inv.unit
            stock.inventory = inv
            stock.product = inv.product
            if (inv.product.sub_unit) stock.sub_unit = inv.product.sub_unit
            if (inv.product.sub_unit && sub_amount) stock.current_sub_amount = sub_amount
            stock.current_amount = amount
            stock.amount = amount
            stock.user = invoice.user
            stock.status = 'pending'
            await stock.save()
            await inv.save()

            newArray.push({
                ...info,
                stock: stock,
                product: inv.product,
            })
        }

        invoice.import_stock_list = newArray
        invoice.history = [
            {
                status: 'accept',
                user: req.user.id,
            },
            ...invoice.history,

        ]
        invoice.status = 'accept'
        await invoice.save()
        const by_user = await User.findById(req.user.id)

        send_noti(3, [invoice.user], 'นำสินค้าเข้าคลัง', 'สินค้า ถูกนำเข้าคลังสินค้าเรียบร้อยเเล้ว');

        const alert = new Notification({
            invoice: invoice,
            user: invoice.user,
            by_user: by_user,
            type: 'import',
            title: 'นำสินค้าเข้าคลัง',
            detail: 'สินค้า ถูกนำเข้าคลังสินค้าเรียบร้อยเเล้ว'
        })
        await alert.save()

        const io = req.app.get('socketio');
        io.to(alert.user).emit('action', { type: 'new_alert', data: alert });
        res.json(newArray)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/import_product_from_user', [auth, upload_invoices.array('files')], async (req, res) => {
    const { list = [], from, to, remark, driver = '', car_code = '', start_date } = req.body;
    try {
        console.log(req.body)
        let total_amount = 0
        let total_sub_amount = 0

        let newArray = []
        for (let i = 0; i < list.length; i++) {
            const stk_info = JSON.parse(list[i]);

            const amount = stk_info.amount
            const sub_amount = stk_info.sub_amount? stk_info.sub_amount:0

            newArray.push({
                product: stk_info.product,
                name: stk_info.name,
                lot_number: stk_info.lot_number,
                product_code: stk_info.product_code,
                amount: stk_info.amount,
                sub_amount: stk_info.sub_amount,
                unit: stk_info.unit,
                sub_unit: stk_info.sub_unit,
                number_pallate: stk_info.number_pallate

            })
            total_amount += amount
            total_sub_amount += sub_amount
        }

        const by_user = await User.findById(req.user.id)
        const stock_out = new Invoice();
        stock_out.type = 1;

        stock_out.amount = total_amount;
        stock_out.sub_amount = total_sub_amount;
        stock_out.create_by = by_user
        stock_out.user = by_user;
        stock_out.import_list = newArray
        if (from) stock_out.from = from
        if (to) stock_out.to = to
        stock_out.driver = driver
        stock_out.car_code = car_code
        stock_out.remark = remark,
            stock_out.start_date = start_date,

            stock_out.status = 'request'

        if (req.files) {
            var array = []
            await Promise.all(req.files.map(async (file) => {
                array.push(file.location)
            }))
            stock_out.files = array;
        }

        await stock_out.save();

        send_noti(1, [], 'นำสินค้าเข้าคลัง', 'นำสินค้าเข้าคลัง');


        const alert = await AdminNotification({
            invoice: stock_out,
            type: 'import',
            user: by_user,
            by_user: by_user,
            title: 'นำสินค้าเข้าคลัง',
            detail: by_user?.name + ' คำร้องนำสินค้าเข้าคลัง'
        })
        await alert.save()

        const io = req.app.get('socketio');
        io.to('admin').emit('action', { type: 'new_alert', data: alert });


        res.json(stock_out)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/import_to_stocks', auth, async (req, res) => {
    const { list, user, remark } = req.body;
    try {
        console.log(req.body)
        let total_amount = 0
        let newArray = []
        for (let i = 0; i < list.length; i++) {
            const info = list[i];

            const amount = info.amount
            const sub_amount = info.sub_amount

            const inv = await Inventory.findById(info.inventory).populate('product')

            if (inv.current_amount < amount) {

                return res.status(400).json({ message: 'your number are more than exist number of inventory' })
            }

            if (amount == inv.current_amount) {
                inv.current_amount = 0;
                inv.is_in_stock = true;

            }
            else {
                inv.current_amount = inv.current_amount - amount;
                inv.is_in_stock = false;

            }

            total_amount += amount

            const z = await Zone.findOne({ _id: info.zone })

            const stock = new Stocks();
            stock.zone = z
            stock.name = inv.name
            stock.product_code = inv.product_code
            stock.lot_number = inv.lot_number
            stock.unit = inv.unit
            stock.inventory = inv
            stock.product = inv.product
            if (inv.product.sub_unit) stock.sub_unit = inv.product.sub_unit
            if (inv.product.sub_unit && sub_amount) stock.current_sub_amount = sub_amount
            stock.current_amount = amount
            stock.amount = amount
            stock.user = user
            stock.status = 'accept'
            await stock.save()
            await inv.save()

            newArray.push({
                ...info,
                stock: stock,
                product: inv.product
            })
        }

        const flow_balance = {
            balance: total_amount,
            bring_forward: 0,
            receive_amount: total_amount,
            send_amount: 0,

        }

        const by_user = await User.findById(req.user.id)
        const stock_in = new Invoice();
        stock_in.type = 1;
        stock_in.flow_balance = flow_balance;
        stock_in.amount = total_amount;
        stock_in.user = user;
        stock_in.create_by = by_user
        stock_in.import_list = list
        stock_in.import_stock_list = newArray
        stock_in.remark = remark
        await stock_in.save();

        send_noti(3, [stock_in.user], 'นำสินค้าเข้าคลัง', 'สินค้า ถูกนำเข้าคลังสินค้าเรียบร้อยเเล้ว');

        const alert = new Notification({
            invoice: stock_in,
            user: stock_in.user,
            by_user: by_user,
            type: 'import',
            title: 'นำสินค้าเข้าคลัง',
            detail: 'สินค้า ถูกนำเข้าคลังสินค้าเรียบร้อยเเล้ว'
        })
        await alert.save()

        const io = req.app.get('socketio');
        io.to(alert.user).emit('action', { type: 'new_alert', data: alert });
        res.json(newArray)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
// router.post('/export_out_stock_prepare', auth,async (req,res)=> {
//     const {stock_id,amount} = req.body;
//     try {
//         const stock = await Stocks.findById(stock_id);
//         const total = stock.prepare_out + amount;
//         // if(total > stock.current_amount){

//         //     return res.status(400).send('wrong number')
//         // }

//         if(stock.current_amount == amount){
//             stock.prepare_out = amount; 

//         }
//         else{

//             stock.prepare_out = stock.current_amount - amount;

//         }
//         stock.status = 2;
//         await stock.save()
//         res.json(stock)

//     }catch(err){
//         console.log(err.message);
//         res.status(500).send(err.message)
//     }
// })

// router.post('/export_out_stock', [auth,upload_invoices.array('files')],async (req,res)=> {
//     const {stock_id,amount,from,to,remark} = req.body;
//     try {
//         const stock = await Stocks.findById(stock_id).populate('zone');
//         const b_f = stock.current_amount ;

//         if(stock.current_amount == amount){
//             stock.current_amount = 0;

//             stock.prepare_out = amount
//             stock.is_active = false;
//             await stock.save()
//         }
//         else{
//             stock.current_amount = stock.current_amount - amount;
//             stock.prepare_out = amount

//             await stock.save()
//         }
//         const flow_balance = {
//             balance : stock.current_amount,
//             bring_forward :b_f,
//             receive_amount:0,
//             send_amount:amount,

//         }
//         const stock_out = new Invoice();
//         stock_out.type = 2;
//         stock_out.flow_balance = flow_balance;
//         stock_out.amount = amount;
//         stock_out.stock = stock;
//         stock_out.inventory = stock.inventory;
//         stock_out.user = stock.user;
//         stock_out.name = stock.name;
//         stock_out.product_code = stock.product_code;
//         stock_out.lot_number = stock.lot_number;
//         stock_out.zone_out_name = stock.zone.name
//         stock_out.create_by = req.user.id;
//         stock_out.from = from
//         stock_out.to = to
//         stock_out.remark = remark

//         if(req.files){
//             var array = []
//             await Promise.all(req.files.map(async (file) => {
//                 array.push(file.location)
//             }))
//             stock_out.files = array;
//         }

//         await stock_out.save();

//         send_noti(1,[],'คำร้อง','ต้องการนำสินค้าออกจากคลัง');

//         const alert = await Alert({
//             invoice:stock_out,
//             type:4,
//             user:stock_out.user,
//             by_user:req.user.idr,
//             subject:'คำร้อง',
//             detail:'ต้องการนำสินค้าออกจากคลัง'
//         })
//         await alert.save()

//         const io = req.app.get('socketio');
//         io.to('admin').emit('action', {type:'new_alert',data:alert});

//         res.json(stock)

//     }catch(err){
//         console.log(err.message);
//         res.status(500).send(err.message)
//     }
// })
router.post('/export_out_stocks_from_user', [auth, upload_invoices.array('files')], async (req, res) => {
    const { list, from, to, remark, driver = '', car_code = '', start_date } = req.body;
    console.log(req.body)
    try {
        let total_amount = 0
        let total_sub_amount = 0

        let newArray = []
        for (let i = 0; i < list.length; i++) {
            const stk_info = JSON.parse(list[i]);

            const amount = stk_info.amount
            const sub_amount = stk_info.sub_amount

            newArray.push({
                product: stk_info.product,
                name: stk_info.name,
                lot_number: stk_info.lot_number,
                amount: stk_info.amount,
                sub_amount: stk_info.sub_amount,
                unit: stk_info.unit,
                sub_unit: stk_info.sub_unit
            })
            total_amount += amount
            total_sub_amount += sub_amount
        }

        const by_user = await User.findById(req.user.id)
        const stock_out = new Invoice();
        stock_out.type = 2;

        stock_out.amount = total_amount;
        stock_out.sub_amount = total_sub_amount;
        stock_out.create_by = by_user
        stock_out.user = by_user;
        stock_out.export_product_list = newArray
        stock_out.from = from
        stock_out.to = to
        stock_out.driver = driver
        stock_out.car_code = car_code
        stock_out.remark = remark,
            stock_out.start_date = start_date,

            stock_out.status = 'request'

        if (req.files) {
            var array = []
            await Promise.all(req.files.map(async (file) => {
                array.push(file.location)
            }))
            stock_out.files = array;
        }

        await stock_out.save();

        send_noti(1, [], 'นำสินค้าออกคลัง', 'นำสินค้าออกจากคลัง');


        const alert = await AdminNotification({
            invoice: stock_out,
            type: 'export',
            user: by_user,
            by_user: by_user,
            title: 'นำสินค้าออกคลัง',
            detail: by_user?.name + ' คำร้องนำสินค้าออกคลัง'
        })
        await alert.save()

        const io = req.app.get('socketio');
        io.to('admin').emit('action', { type: 'new_alert', data: alert });


        res.json(stock_out)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/export_out_stocks', [auth, upload_invoices.array('files')], async (req, res) => {
    const { list, from, to, remark, driver = '', car_code = '', user } = req.body;
    console.log(req.body)
    try {
        let total_amount = 0
        let total_sub_amount = 0

        let total_amount_origin = 0
        let newArray = []
        let stockObj = []
        for (let i = 0; i < list.length; i++) {
            const stk_info = JSON.parse(list[i]);

            const amount = stk_info.amount
            const sub_amount = stk_info.sub_amount

            const stock = await Stocks.findById(stk_info.stock)
            console.log(stk_info.stock)
            total_amount_origin += stock.current_amount

            stock.prepare_out_sub_amount = stock.prepare_out_sub_amount + sub_amount
            stock.prepare_out = stock.prepare_out + amount

            stockObj.push(stock)
            newArray.push(stk_info)
            total_amount += amount
            total_sub_amount += sub_amount
        }

        const flow_balance = {
            balance: total_amount_origin - total_amount,
            bring_forward: total_amount_origin,
            receive_amount: 0,
            send_amount: total_amount,

        }

        const by_user = await User.findById(req.user.id)
        const stock_out = new Invoice();
        stock_out.type = 2;
        stock_out.flow_balance = flow_balance;
        stock_out.amount = total_amount;
        stock_out.sub_amount = total_sub_amount;
        stock_out.create_by = by_user
        stock_out.user = user;
        stock_out.export_list = newArray
        stock_out.from = from
        stock_out.to = to
        stock_out.driver = driver
        stock_out.car_code = car_code
        stock_out.remark = remark
        if (req.files) {
            var array = []
            await Promise.all(req.files.map(async (file) => {
                array.push(file.location)
            }))
            stock_out.files = array;
        }
        await Promise.all(stockObj.map(async (stk) => await stk.save()));

        await stock_out.save();

        send_noti(1, [], 'นำสินค้าออกคลัง', 'นำสินค้าออกจากคลัง');

        if (by_user.admin) {
            const alert = await Notification({
                invoice: stock_out,
                type: 'export',
                user: user,
                by_user: by_user,
                title: 'นำสินค้าออกคลัง',
                detail: 'คำร้องของคุณอยู่ระหว่างประมวลผล'
            })
            await alert.save()

            const io = req.app.get('socketio');
            io.to('admin').emit('action', { type: 'new_alert', data: alert });
        }
        else {
            const alert = await AdminNotification({
                invoice: stock_out,
                type: 'export',
                user: user,
                by_user: by_user,
                title: 'นำสินค้าออกคลัง',
                detail: by_user?.name + ' คำร้องนำสินค้าออกคลัง'
            })
            await alert.save()

            const io = req.app.get('socketio');
            io.to('admin').emit('action', { type: 'new_alert', data: alert });
        }

        res.json(stock_out)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

// router.post('/export_out_stock_action', auth,async (req,res)=> {
//     const {stock_out_id,action} = req.body;
//     try {

//         const stock_out = await Invoice.findOne({_id:stock_out_id})
//         const by_user = await User.findById(req.user.id)

//         console.log('====>')
//         console.log(stock_out)
//         if(action == 1)// accept
//         {
//             stock_out.status = 3;
//             stock_out.prepare_out = 0
//             send_noti(3,[stock_out.user],'นำสินค้าออกสำเร็จ','สินค้าของคุณได้รับการอนุมัติให้ออกจากคลังสินค้าแล้ว');
//             const alert = new Notification({
//                 invoice:stock_out,
//                 type:5,
//                 by_user:by_user,
//                 user:stock_out.user,
//                 title:'นำสินค้าออกสำเร็จ',
//                 detail:'สินค้าของคุณได้รับการอนุมัติให้ออกจากคลังสินค้าแล้ว'
//             })
//             await alert.save()

//             console.log(alert)
//             const io = req.app.get('socketio');
//             io.to(alert.user._id).emit('action', {type:'new_alert',data:alert});
//         }
//         else if(action == 2)//decline
//         {
//             stock_out.status = 0;

//             if(stock_out.stock){
//                 const stock = await Stocks.findById(stock_out.stock);
//                 stock.current_amount = stock.current_amount + stock_out.amount;
//                 stock.current_sub_amount = stock.current_sub_amount + stock_out.sub_amount;

//                 stock.is_active = true;
//                 stock.status = 1;
//                 await stock.save()
//             }
//             else {
//                 for (let i = 0; i < stock_out.list.length; i++) {
//                     const stk=  stock_out.list[i]

//                     const stock = await Stocks.findById(stk._id);

//                     stock.current_amount = stock.current_amount + stk.amount;
//                     stock.current_sub_amount = stock.current_sub_amount + stk.sub_amount;

//                     stock.prepare_out = 0
//                     stock.is_active = true;
//                     stock.status = 1;
//                     await stock.save()
//                 }
//             }
//             send_noti(3,[stock.user],'ยกเลิกการนำสินค้าออกจากคลัง','ไม่สามารถเอาสินค้าออกจากคลังสินค้าได้ โปรดติดต่อเจ้าหน้าที่');

//             stock_out.prepare_out = 0
//             const alert = new Notification({
//                 invoice:stock_out,
//                 type:6,
//                 by_user:by_user,
//                 user:stock_out.user,
//                 title:'ยกเลิกการนำสินค้าออกจากคลัง',
//                 detail:'ไม่สามารถเอาสินค้าออกจากคลังสินค้าได้ โปรดติดต่อเจ้าหน้าที่'
//             })
//             await alert.save()

//             const io = req.app.get('socketio');
//             io.to(alert.user._id).emit('action', {type:'new_alert',data:alert});
//         }

//         await stock_out.save()
//         res.json(stock_out)

//     }catch(err){
//         console.log(err.message);
//         res.status(500).send(err.message)
//     }
// })
router.post('/list_customer', auth, async (req, res) => {
    try {

        const list = await User.find({ admin: false })
        console.log(list);

        res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_invoice', auth, async (req, res) => {
    const { user, search, status, start, end, type = 1, page = 1, limit = 10 } = req.body;
    try {
        console.log(req.body);

        var query = {
        };
        if (start && end) query.create_date = { $gte: start, $lte: end }
        if (user !== undefined) query.user = user;
        if (status !== undefined) {
            if (Array.isArray(status)) {
                query.status = { $in: status };
            } else {
                query.status = status;
            }
        };

        if (type !== undefined) query.type = type;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            if (parseInt(type) === 1) {
                query.$or = [
                    { 'ref_number': { $regex: searchRegex } },
                    { 'import_list.name': { $regex: searchRegex } },
                    { 'import_list.lot_number': { $regex: searchRegex } },
                    { 'import_list.product_code': { $regex: searchRegex } },
                ];
            }
            else {
                query.$or = [
                    { 'ref_number': { $regex: searchRegex } },
                    { 'export_list.name': { $regex: searchRegex } },
                    { 'export_list.lot_number': { $regex: searchRegex } },
                    { 'export_list.product_code': { $regex: searchRegex } },
                ];
            }
        }//8537
        console.log(query)
        if (parseInt(query.type) === 1) {
            const list = await Invoice.find(query).populate('inventory').populate('import_list.zone').populate('user', '-password').sort({ create_date: -1 }).skip((page - 1) * limit).limit(limit);
            const total = await Invoice.countDocuments(query);
            //console.log(list);

            res.json({
                page: page,
                list: list,
                total: total
            })
        }
        else {
            const list = await Invoice.find(query).populate('export_product_list.product').populate('export_list.stock').populate('user', '-password').populate('from').populate('to').sort({ create_date: -1 }).skip((page - 1) * limit).limit(limit);
            const total = await Invoice.countDocuments(query);
            //console.log(list);

            res.json({
                page: page,
                list: list,
                total: total
            })
        }

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_invoice_unlimit', auth, async (req, res) => {
    const { user, page = 1, limit = 10, type } = req.body;
    try {
        console.log("OUT STOCKS");

        var query = {};
        if (user !== undefined) query.user = user;
        if (type !== undefined) query.type = type;

        const list = await Invoice.find(query).populate('inventory').populate('user', '-password');

        console.log(list);

        res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_stock_by_array_id', auth, async (req, res) => {
    const { array_id } = req.body;
    try {
        console.log(req.body)
        if (!array_id) {
            return res.status(500).send({ msg: 'need array request' })

        }
        const list = await Stocks.find({ _id: { $in: array_id } }).populate('product').populate('zone')
        return res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_invoice', auth, async (req, res) => {
    const { invoice_id } = req.body;
    try {
        console.log(req.body)
        if (!invoice_id) {
            return res.status(500).send({ msg: 'need invoice id' })

        }
        const inv = await Invoice.findOne({ _id: invoice_id }).populate('import_list.inventory').populate('import_stock_list.zone').populate('import_list.product').populate('from').populate('to').populate('import_list.zone').populate('stock').populate('export_list.stock').populate('export_product_list.product').populate('export_list.zone').populate('user', '-password');
        console.log(inv);

        return res.json(inv)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/list_combine', auth, async (req, res) => {
    const { user, search, start, end, type = 1, page = 1, limit = 10 } = req.body;
    try {

        var query = {
        };
        if (start && end) query.create_date = { $gte: start, $lte: end }
        if (user !== undefined) query.user = user;
        if (type !== undefined) query.type = type;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            if (parseInt(type) === 1) {
                query.$or = [
                    { 'import_list.name': { $regex: searchRegex } },
                    { 'import_list.lot_number': { $regex: searchRegex } },
                    { 'import_list.product_code': { $regex: searchRegex } },
                ];
            }
            else {
                query.$or = [
                    { 'list.name': { $regex: searchRegex } },
                    { 'list.lot_number': { $regex: searchRegex } },
                    { 'list.product_code': { $regex: searchRegex } },
                ];
            }
        }
        console.log(query)


        const list = await Combine.find(query).populate('from.stock').populate('from.zone').populate('to.stock').populate('to.zone').populate('user', '-password').sort({ create_date: -1 }).skip((page - 1) * limit).limit(limit);
        const total = await Combine.countDocuments(query);
        //console.log(list);

        res.json({
            page: page,
            list: list,
            total: total
        })


    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/update_stock', auth, async (req, res) => {

    const { stock_id, current_amount, zone } = req.body;
    try {

        const stock = await Stocks.updateOne({ _id: stock_id }, req.body)

        res.json(stock)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_stock', auth, async (req, res) => {

    const { stock_id, search } = req.body;
    try {

        const stk = await Stocks.findOne({ _id: stock_id }).populate('inventory').populate('product').populate('zone').populate('user').populate('notes')

        res.json(stk)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/change_zone_stock', auth, async (req, res) => {

    const { stock_id, zone_id } = req.body;
    try {

        const stk = await Stocks.findOne({ _id: stock_id })
        stk.zone = zone_id;
        await stk.save()

        res.json(stk)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/remove_stock', auth, async (req, res) => {

    const { stock_id, } = req.body;
    try {

        const stk = await Stocks.findOne({ _id: stock_id })
        stk.is_active = false;
        stk.status = 'removed';//remove by user
        await stk.save()

        res.json(stk)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/get_stocks_history', auth, async (req, res) => {

    const { date } = req.body;
    try {

        const list = await StocksHistory.find({ create_date: date })

        res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_noti_customer', auth, async (req, res) => {
    try {
        const { limit } = req.body;

        const { is_read } = req.body;
        const query = { user: req.user.id };
        if (is_read !== undefined) {
            query.is_read = is_read;
        }
        const notifications = await Notification.find(query).populate('invoice').populate('user', '-password')
            .populate('by_user', 'name avatar')
            .sort({ is_read: 1, create_date: -1 })
            .limit(5)
            .lean();
        const unReadCount = await Notification.countDocuments({
            user: req.user.id,
            is_read: false,
        });
        res.json({
            notifications,
            unReadCount,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
router.post('/list_noti_customer_page', auth, async (req, res) => {
    const {user, page = 1, limit = 10 } = req.body;

    try {
        var query = {
            user:req.user.id
        };
      
        const list = await Notification.find(query).populate('invoice').populate('by_user', '-password').populate('user', '-password').sort({ create_date: -1 }).skip((page - 1) * limit).limit(limit);
        const total = await Notification.countDocuments(query);
        //console.log(list);
    
        res.json({
            page: page,
            list: list,
            total: total
        })
    } catch (error) {
        res.status(500).send('Server Error');
    }
   
});
router.post('/list_noti_staff_page', auth, async (req, res) => {
    const {user, page = 1, limit = 10 } = req.body;

    try {
        var query = {
        };
        
        const list = await AdminNotification.find(query).populate('invoice').populate('by_user', '-password').populate('user', '-password').sort({ create_date: -1 }).skip((page - 1) * limit).limit(limit);
        const total = await AdminNotification.countDocuments(query);
        //console.log(list);
    
        res.json({
            page: page,
            list: list,
            total: total
        })
    } catch (error) {
        res.status(500).send('Server Error');
    }
   
});
router.post('/list_noti_staff', auth, async (req, res) => {
    try {
        const { limit } = req.body;
        const notifications = await AdminNotification.find({}).populate('invoice').populate('user', '-password')
            .populate('by_user', 'name avatar')
            .sort({ is_read: 1, create_date: -1 })
            .limit(limit || 5)
            .lean();
        const unReadCount = await AdminNotification.countDocuments({
            is_read: false,
        });
        res.json({
            notifications,
            unReadCount,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
router.post('/set_read_customer_noti', auth, async (req, res) => {
    try {
        const { user } = req.body;
        if (!user) {
            return res.status(400).json({ message: 'Missing user property in request body' });
        }

        const result = await Notification.updateMany({ user, is_read: false }, { is_read: true });
        const { nModified } = result;

        if (nModified > 0) {
            return res.json({ success: true });
        } else {
            return res.json([]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
router.post('/set_read_admin_noti', auth, async (req, res) => {
    try {
        const { user } = req.body;


        const result = await AdminNotification.updateMany({ is_read: false }, { is_read: true });
        const { nModified } = result;

        if (nModified > 0) {
            return res.json({ success: true });
        } else {
            return res.json([]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
router.post('/list_alert', auth, async (req, res) => {
    const { admin = false, user, page = 1, limit = 10 } = req.body;
    try {

        if (admin) {
            const list = await Alert.find({ $or: [{ type: 1 }, { type: 4 }] }).populate('by_user', 'name avatar').sort({ create_date: -1 }).skip((page - 1) * limit).limit(limit);

            const total = await Alert.countDocuments({ $or: [{ type: 1 }, { type: 4 }] });
            // console.log(list);

            return res.json({
                page: page,
                list: list,
                total: total
            })
        }
        else {
            // console.log(req.user.id);
            const list = await Alert.find({ user: req.user.id, $or: [{ type: 2 }, { type: 3 }, { type: 5 }, { type: 6 }] }).populate('by_user', 'name avatar').sort({ create_date: -1 }).skip((page - 1) * limit).limit(limit);

            const total = await Alert.countDocuments({ user: req.user.id, $or: [{ type: 2 }, { type: 3 }, { type: 5 }, { type: 6 }] });
            // console.log(list);

            return res.json({
                page: page,
                list: list,
                total: total
            })
        }

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/alert_count', auth, async (req, res) => {

    const { admin } = req.body;
    try {
        if (admin) {
            const total = await Alert.countDocuments({ user: req.user.id, is_read: false });
            return res.json({ total: total })
        } else {
            const total = await Alert.countDocuments({ $or: [{ type: 1 }, { type: 4 }], is_read: false, user: req.user.id })
            return res.json({ total: total })
        }

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/set_read_alert', auth, async (req, res) => {

    const { admin } = req.body;
    try {

        if (admin) {
            const list = await Alert.find({ $or: [{ type: 1 }, { type: 4 }], is_read: false, });
            console.log(list)
            await Promise.all(list.map(async (alert) => {
                alert.is_read = true;
                await alert.save()
            }))
            return res.json(list)
        }
        else {
            // console.log(req.user.id);
            const list = await Alert.find({ user: req.user.id, is_read: false, $or: [{ type: 2 }, { type: 3 }, { type: 5 }, { type: 6 }] });
            await Promise.all(list.map(async (alert) => {
                alert.is_read = true;
                await alert.save()
            }))
            console.log(list)
            return res.json(list)
        }

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/create_zone', auth, async (req, res) => {

    const { zone_id, sector_number = 1, name, x, y } = req.body;
    try {
        if (zone_id) {
            const zone = await Zone.update({ _id: zone_id }, { name, x, y });
            return zone
        }
        var zone = new Zone();
        zone.name = y + name + ("0" + x).slice(-2);
        zone.main = name;
        zone.x = x;
        zone.y = y;
        await zone.save();
        console.log(zone)
        return res.json(zone)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/get_category', auth, async (req, res) => {

    const { user } = req.body;
    try {

        const list = await Category.find({ user })

        res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_user', auth, async (req, res) => {

    const { } = req.body;
    try {

        const list = await User.find()

        res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/save_stock_to_history', auth, async (req, res) => {
    const { date } = req.body;
    // var end_date = new Date(start_date)
    // end_date =  end_date.addDays(1)
    // console.log(end_date); 
    try {
        const current_day = moment()
        console.log(current_day);
        const history = new History()
        await history.save()
        await StocksHistory.deleteMany({ day: current_day.format('D'), month: current_day.format('M'), year: current_day.format('YYYY') })

        const list = await Stocks.find({ is_active: true, status: 'warehouse' });
        for (const index in list) {
            const stock = list[index];

            const item = new StocksHistory();
            item.inventory = stock.inventory;
            item.zone = stock.zone;
            item.stock = stock;
            item.current_amount = stock.current_amount;

            item.product = stock.product;
            if (stock.product.sub_unit) item.sub_unit = stock.product.sub_unit
            if (stock.product.sub_unit && sub_amount) item.current_sub_amount = stock.current_sub_amount
            item.user = stock.user;
            item.name = stock.name;
            if (stock.product_code) item.product_code = stock.product_code;
            item.lot_number = stock.lot_number;
            item.day = current_day.format('D');
            item.month = current_day.format('M');
            item.year = current_day.format('YYYY');
            item.create_date = current_day;
            item.history = history;
            await item.save();

        }

        const h_list = await StocksHistory.find();
        res.json(h_list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_notes', auth, async (req, res) => {
    const { date, start_date, end_date, search, page = 1, limit = 10 } = req.body;
    try {
        let query = {};

        if (date !== undefined) {
            const current_day = moment(date, 'YYYY-M-D');
            query = {
                day: current_day.format('D'),
                month: current_day.format('M'),
                year: current_day.format('YYYY'),
            };
        } else {
            if (start_date && end_date) {
                const start = moment(start_date).startOf('day');
                const end = moment(end_date).endOf('day');

                query.create_date = {
                    $gte: start.toDate(),
                    $lte: end.toDate(),
                };
            }
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.detail = { $regex: searchRegex };
        }

        const list = await Note.find(query)
            .sort({ create_date: -1 }) // sort by newest first
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await Note.countDocuments(query);

        return res.json({
            page: page,
            list: list,
            total: total,
        });
    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message);
    }
});

router.post('/list_history', auth, async (req, res) => {
    const { history, date, start_date, end_date, search, user, page = 1, limit = 10 } = req.body;
    console.log(req.body)
    try {
        let query = {};

        if (date !== undefined) {
            const current_day = moment(date, 'YYYY-M-D');
            query = {
                day: current_day.format('D'),
                month: current_day.format('M'),
                year: current_day.format('YYYY'),
            };
        }
        else {
            if (start_date && end_date) {
                const start = moment(start_date).startOf('day');
                const end = moment(end_date).endOf('day');

                query.create_date = {
                    $gte: start.toDate(),
                    $lte: end.toDate(),
                };
            }
        }
        if (user) {
            query.user = user;
        }
        if (history) {
            query.history = history;
        }
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { lot_number: { $regex: searchRegex } },
                { name: { $regex: searchRegex } },
                { product_code: { $regex: searchRegex } },
            ];
        }

        const list = await StocksHistory.find(query)
            .populate({
                path: 'inventory',
                select: 'name quantity',
            })
            .populate({
                path: 'user',
                select: 'name email',
            })
            .populate({
                path: 'zone',
                select: 'name',
            })
            .sort({ _id: -1 }) // sort by newest first
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await StocksHistory.countDocuments(query);

        console.log(req.body)
        return res.json({
            page: page,
            list: list,
            total: total,
        });
    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message);
    }


})

router.post('/remove_stocks_history', auth, async (req, res) => {
    const { date } = req.body;
    // var end_date = new Date(start_date)
    // end_date =  end_date.addDays(1)
    // console.log(end_date); 
    try {

        if (date) {
            const current_day = moment(date, 'YYYY-M-D')
            const list = await StocksHistory.deleteMany({ day: current_day.format('D'), month: current_day.format('M'), year: current_day.format('YYYY') })
            return res.json(list)
        }
        const list = await StocksHistory.deleteMany();

        res.json(list)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.get('/reset_data', async (req, res) => {
    const { date } = req.body;
    // var end_date = new Date(start_date)
    // end_date =  end_date.addDays(1)
    // console.log(end_date); 
    try {

        const sh = await StocksHistory.deleteMany();
        const iv = await Inventory.deleteMany();
        const ct = await Category.deleteMany();
        const nots = await Note.deleteMany();

        const ibx = await Inbox.deleteMany();
        const alert = await Alert.deleteMany();
        const ivo = await Invoice.deleteMany();
        const stk = await Stocks.deleteMany();
        const not = await Notification.deleteMany();
        const adminnot = await AdminNotification.deleteMany()
        const order = await Order.deleteMany()
        const prd = await Product.deleteMany()
        const mv = await Move.deleteMany()
        const cvb = await Combine.deleteMany()
        const files = await Files.deleteMany()

        //const z = await Zone.deleteMany();
        res.json('delete')

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
function randomDate(start, end) {
    return ''
}
router.get('/add_dummy_data', async (req, res) => {
    const { name } = req.query;
    console.log(name)
    try {
        let array = [];
        for (let y = 1; y <= 5; y++) {
            for (let x = 1; x <= 4; x++) {
                array.push({ name: name, x: x, y: y })
            }
        }
        await Promise.all(array.map(async (obj) => {
            var zone = new Zone();
            zone.name = obj.x + obj.name + ("0" + obj.y).slice(-2);
            zone.main = obj.name;
            zone.x = obj.x;
            zone.y = obj.y;
            await zone.save()
        }))
        res.json(name)

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

const send_noti = async (type = 1, users_id = [], title, msg = '') => {
    if (type == 1) {
        //send push to all admin
        const users = await User.find({ "expo_token": { $exists: true }, admin: true })
        console.log(users)
        sendMessage(users, title, msg)
    }
    if (type == 2) {
        //send push to all admin
        const users = await User.find({ "expo_token": { $exists: true }, admin: false })
        console.log(users)
        sendMessage(users, title, msg)
    }
    if (type == 3) {
        const users = await User.find({ "expo_token": { $exists: true }, "_id": { $in: users_id } })
        console.log(users)
        sendMessage(users, title, msg)
    }

}
router.get('/send_notifications', async (req, res) => {

    try {
        send_noti(1, [], 'tongsuen.', 'hello world');
        res.json('')

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/send_data_with_socket', async (req, res) => {
    const { user_id } = req.query;
    try {

        const io = req.app.get('socketio');
        if (user_id)
            io.to(user_id).emit('action', {
                type: 'new_alert', data: {
                    __v: 0,

                    _id: "62d79f4c8f51e2d0jy1d8d7e57",

                    by_user: { _id: "61541ba9050c89869bdc0f68", name: "มิวกี้ ไปรยา", avatar: "https://wms-tslog.s3.ap-southeast-1.amazonaws.com/…022-03-30T09%3A03%3A53.682Z-images%20%283%29.jpeg" },

                    create_date: "2022-07-20T06:23:08.696Z",

                    detail: "ข้อความ: test 3",

                    inbox: "62d79f4c8f51e2d01d8d7e55",

                    is_read: false,

                    subject: "ผู้ดูเเลระบบส่งข้อความ",

                    type: 2,

                    user: "625e74e93bfb221679d4b45a"
                }
            });
        else

            io.to('admin').emit('action', {
                type: 'new_alert', data: {
                    __v: 0,

                    _id: "62d79f4c8ffe51e2d01d8d7e57",

                    by_user: { _id: "61541ba9050c89869bdc0f68", name: "มิวกี้ ไปรยา", avatar: "https://wms-tslog.s3.ap-southeast-1.amazonaws.com/…022-03-30T09%3A03%3A53.682Z-images%20%283%29.jpeg" },

                    create_date: "2022-07-20T06:23:08.696Z",

                    detail: "ข้อความ: test 3",

                    inbox: "62d79f4c8f51e2d01d8d7e55",

                    is_read: false,

                    subject: "ผู้ดูเเลระบบส่งข้อความ",

                    type: 2,

                    user: "625e74e93bfb221679d4b45a"
                }
            });
        res.json({})

    } catch (err) {
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
module.exports = router; 

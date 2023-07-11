const User = require('../../models/User')
const Alert = require('../../models/Alert')
const Inventory = require('../../models/Inventory')
const Move = require('../../models/Move')
const Stocks = require('../../models/Stocks')
const StocksHistory = require('../../models/StocksHistory')
const Invoice = require('../../models/Invoices')
const Zone = require('../../models/Zone')
const Combine = require('../../models/Combine')
const History = require('../../models/History')
const Files = require('../../models/Files')
const StockTask = require('../../models/StockTask')
const Pallet = require('../../models/Pallet')


const getListStock = async (query) => {
    const list = await Stocks.find(query)
    return list
}
const getStock = async (query) => {
    const list = await Stocks.findOne(query)
    return list
}

const Service = {
    getListStock,
    getStock,
};
 
export default Service;

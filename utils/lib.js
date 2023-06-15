const calculate_amount_by_sub_amount = (sub_amount,item_per_unit) => {
    const result = sub_amount/item_per_unit
    return Math.ceil(result)
}
const calculate_sub_amount_by_amount = (amount,item_per_unit) => {
    const result = amount * item_per_unit
    return result
}

exports.calculate_sub_amount_by_amount = calculate_sub_amount_by_amount; 
exports.calculate_amount_by_sub_amount = calculate_amount_by_sub_amount; 

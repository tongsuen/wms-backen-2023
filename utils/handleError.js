const handleError = (err) => {
   
    const errorMessage = err.message || err.toString();
    console.log(errorMessage)
    return { message: errorMessage }
}
exports.handleError = handleError; 

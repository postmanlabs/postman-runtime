module.exports = {
    options: {},

    collection: {
        item: [{
            request: "https://echo.getpostman.com/get?testvar={{test-var}}"
        }]
    },

    environment: {
        "test-var": "test-var-value"
    }
}

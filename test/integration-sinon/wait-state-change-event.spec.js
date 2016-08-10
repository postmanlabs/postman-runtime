module.exports = {
    delay: {
        item: 200
    },

    collection: {
        item: [{
            request: "https://echo.getpostman.com/get?testvar={{test-var}}"
        }]
    },

    environment: {
        "test-var": "test-var-value"
    }
}

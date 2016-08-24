module.exports = {
    options: {},

    collection: {
        "variables": [],
        "info": {
            "name": "url-vars",
            "_postman_id": "cc88d146-720e-af9a-d530-9ee84ae2ec94",
            "description": "",
            "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
        },
        "item": [
            {
                "name": "{{url}}/:verb",
                "event": [
                    {
                        "listen": "prerequest",
                        "script": {
                            "type": "text/javascript",
                            "exec": "postman.setGlobalVariable(\"url\", \"http://httpbin.org\");"
                        }
                    }
                ],
                "request": {
                    "url": {
                        "raw": "{{url}}/:verb",
                        "auth": {},
                        "host": [
                            "{{url}}"
                        ],
                        "path": [
                            ":verb"
                        ],
                        "variable": [
                            {
                                "value": "get",
                                "id": "verb"
                            }
                        ]
                    },
                    "method": "GET",
                    "header": [],
                    "body": {
                        "mode": "formdata",
                        "formdata": []
                    },
                    "description": ""
                },
                "response": []
            }
        ]
    }
};

(function (win) {

	var xml2jsOptions = {
			explicitArray: false,
			async: false,
			trim: true,
			mergeAttrs: false
		},
		xmlToJson,
		xml2Json;

	xmlToJson = function (data) {
		return (new win.X2JS()).xml_str2json(data);
	};

	xml2Json = function (data) {
		var json = {};
		win.xml2js.parseString(data, xml2jsOptions, function (err, result) {
			// @todo - maybe raise warning with error?
			json = result;
		});
		return json;
	};

	// exports
	win.xml2Json = xml2Json;
	win.xmlToJson = xmlToJson;
}(this));
